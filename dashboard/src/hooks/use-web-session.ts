'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws/call'

// --- Types ---

export interface TranscriptChunk {
  id: string
  text: string
  speaker: string
  role: 'lead' | 'seller'
  isFinal: boolean
  timestamp: number
}

export interface CoachMessage {
  id: string
  type: 'tip' | 'objection' | 'signal' | 'reinforcement' | 'alert' | 'manager-whisper'
  title: string
  description: string
  metadata?: Record<string, unknown>
  timestamp: number
  isDismissed?: boolean
}

export type SessionStatus = 'idle' | 'configuring' | 'connecting' | 'active' | 'ending' | 'ended' | 'error'
export type CallResult = 'CONVERTED' | 'LOST' | 'FOLLOW_UP'

export interface SessionConfig {
  leadName: string
  scriptId?: string
  coachId?: string
}

export interface WebSessionState {
  status: SessionStatus
  callId: string | null
  transcript: TranscriptChunk[]
  coachMessages: CoachMessage[]
  currentSpinPhase: string | null
  duration: number
  error: string | null
  micAvailable: boolean
  isStreaming: boolean
}

const RECORDING_TIMESLICE_MS = 500
const MAX_RECORDING_CHUNKS = 3600

// --- Hook ---

const BROADCAST_CHANNEL = 'helpseller-session'

export function useWebSession() {
  const [state, setState] = useState<WebSessionState>({
    status: 'idle',
    callId: null,
    transcript: [],
    coachMessages: [],
    currentSpinPhase: null,
    duration: 0,
    error: null,
    micAvailable: false,
    isStreaming: false,
  })

  // BroadcastChannel to sync with popup
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL)
    channelRef.current = ch
    // Listen for commands from popup (dismiss, stop)
    ch.onmessage = (e) => {
      const msg = e.data
      if (msg?.type === 'dismiss' && msg.id) {
        setState(prev => ({
          ...prev,
          coachMessages: prev.coachMessages.map(m =>
            m.id === msg.id ? { ...m, isDismissed: true } : m
          ),
        }))
      }
      if (msg?.type === 'stop' && msg.result) {
        stopRef.current(msg.result)
      }
    }
    return () => { ch.close() }
  }, [])

  // Broadcast state to popup whenever it changes
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'state', payload: state })
  }, [state])

  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const leadRecorderRef = useRef<MediaRecorder | null>(null)
  const sellerRecorderRef = useRef<MediaRecorder | null>(null)
  const leadChunksRef = useRef<Blob[]>([])
  const sellerChunksRef = useRef<Blob[]>([])
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const callIdRef = useRef<string | null>(null)
  const configRef = useRef<SessionConfig | null>(null)
  const messageQueueRef = useRef<string[]>([])
  const authResolvedRef = useRef(false)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isActiveRef = useRef(false)
  const stopRef = useRef<(result: CallResult) => Promise<void>>(async () => {})

  // Get supabase token
  const getToken = useCallback(async (): Promise<string> => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sem sessão ativa. Faça login novamente.')
    return session.access_token
  }, [])

  // Send WS message (with queue fallback)
  const wsSend = useCallback((type: string, payload: Record<string, unknown>) => {
    const message = JSON.stringify({ type, payload })
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN && authResolvedRef.current) {
      try {
        ws.send(message)
      } catch {
        messageQueueRef.current.push(message)
      }
    } else {
      if (messageQueueRef.current.length >= 100) messageQueueRef.current.shift()
      messageQueueRef.current.push(message)
    }
  }, [])

  // Flush message queue
  const flushQueue = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    while (messageQueueRef.current.length > 0) {
      const msg = messageQueueRef.current.shift()!
      try { ws.send(msg) } catch { break }
    }
  }, [])

  // Process incoming WS message
  const handleWsMessage = useCallback((data: { type: string; payload?: Record<string, unknown> }) => {
    switch (data.type) {
      case 'call:started': {
        const callId = data.payload?.callId as string
        callIdRef.current = callId
        setState(prev => ({ ...prev, callId, status: 'active' }))
        // Flush queued audio segments
        flushQueue()
        break
      }

      case 'transcript:chunk': {
        const p = data.payload || {}
        const chunk: TranscriptChunk = {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: (p.text as string) || '',
          speaker: (p.speaker as string) || (p.role === 'seller' ? 'Vendedor' : 'Lead'),
          role: (p.role as 'lead' | 'seller') || 'lead',
          isFinal: (p.isFinal as boolean) ?? true,
          timestamp: (p.timestamp as number) || Date.now(),
        }
        if (!chunk.text.trim()) break
        setState(prev => {
          // Replace non-final with final for same role
          if (chunk.isFinal) {
            const filtered = prev.transcript.filter(t => t.isFinal || t.role !== chunk.role)
            return { ...prev, transcript: [...filtered, chunk] }
          }
          // Non-final: replace previous non-final for same role
          const filtered = prev.transcript.filter(t => t.isFinal || t.role !== chunk.role)
          return { ...prev, transcript: [...filtered, chunk] }
        })
        break
      }

      case 'coach:message':
      case 'COACHING_MESSAGE': {
        const p = data.payload || {}
        const msg: CoachMessage = {
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: (p.type as CoachMessage['type']) || 'tip',
          title: (p.title as string) || '',
          description: (p.description as string) || '',
          metadata: p.metadata as Record<string, unknown> | undefined,
          timestamp: Date.now(),
        }
        // Update SPIN phase if present
        const phase = (p.metadata as Record<string, unknown>)?.phase as string | undefined
        setState(prev => ({
          ...prev,
          coachMessages: [...prev.coachMessages, msg],
          currentSpinPhase: phase || prev.currentSpinPhase,
        }))
        break
      }

      case 'coach:token': {
        // Streaming token — append to last coach message description
        const token = (data.payload?.token as string) || ''
        if (!token) break
        setState(prev => {
          const msgs = [...prev.coachMessages]
          if (msgs.length > 0) {
            const last = { ...msgs[msgs.length - 1] }
            last.description += token
            msgs[msgs.length - 1] = last
          }
          return { ...prev, coachMessages: msgs }
        })
        break
      }

      case 'coach:thinking': {
        // Add a placeholder message that will be filled by tokens
        const thinkingMsg: CoachMessage = {
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'tip',
          title: 'Analisando...',
          description: '',
          timestamp: Date.now(),
        }
        setState(prev => ({ ...prev, coachMessages: [...prev.coachMessages, thinkingMsg] }))
        break
      }

      case 'coach:done': {
        // Coach finished streaming — nothing to do, message is complete
        break
      }

      case 'objection:detected': {
        const p = data.payload || {}
        const msg: CoachMessage = {
          id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'objection',
          title: 'Objeção detectada',
          description: (p.tip as string) || '',
          metadata: {
            objection: p.objection,
            phase: p.phase,
            suggested_response: p.suggested_response,
          },
          timestamp: Date.now(),
        }
        setState(prev => ({ ...prev, coachMessages: [...prev.coachMessages, msg] }))
        break
      }

      case 'coach:whisper': {
        const p = data.payload || {}
        const msg: CoachMessage = {
          id: `w-${Date.now()}`,
          type: 'manager-whisper',
          title: 'Mensagem do Gestor',
          description: (p.content as string) || '',
          metadata: { urgency: p.urgency, source: 'manager' },
          timestamp: Date.now(),
        }
        setState(prev => ({ ...prev, coachMessages: [...prev.coachMessages, msg] }))
        break
      }

      case 'error': {
        const p = data.payload || {}
        const errorMsg = (p.message as string) || 'Erro desconhecido'
        setState(prev => ({ ...prev, error: errorMsg }))
        break
      }
    }
  }, [flushQueue])

  // Connect WebSocket
  const connectWs = useCallback(async () => {
    try {
      const token = await getToken()
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      authResolvedRef.current = false

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', payload: { token } }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'auth:ok' && !authResolvedRef.current) {
            authResolvedRef.current = true
            reconnectAttemptsRef.current = 0

            // Send call:start
            const config = configRef.current
            if (config) {
              wsSend('call:start', {
                platform: 'web',
                leadName: config.leadName,
                scriptId: config.scriptId || undefined,
                coachId: config.coachId || undefined,
              })
            }

            flushQueue()
            return
          }

          if (data.type === 'auth:error') {
            setState(prev => ({
              ...prev,
              status: 'error',
              error: data.payload?.reason || 'Falha na autenticação',
            }))
            return
          }

          handleWsMessage(data)
        } catch {
          // Parse error — ignore
        }
      }

      ws.onclose = (event) => {
        if (!isActiveRef.current) return

        if (event.code === 4403) {
          setState(prev => ({ ...prev, status: 'error', error: 'Plano ativo necessário.' }))
          return
        }

        if (reconnectAttemptsRef.current >= 10) {
          setState(prev => ({ ...prev, status: 'error', error: 'Conexão perdida. Tente novamente.' }))
          return
        }

        const delay = Math.min(2000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++

        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = setTimeout(() => connectWs(), delay)
      }

      ws.onerror = () => {
        // Error details come in onclose
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar'
      setState(prev => ({ ...prev, status: 'error', error: message }))
    }
  }, [getToken, wsSend, flushQueue, handleWsMessage])

  // Start streaming raw PCM audio to backend via ScriptProcessorNode
  // Also starts MediaRecorder for full-call recording (WebM for storage)
  const startRecording = useCallback((
    stream: MediaStream,
    role: 'lead' | 'seller',
    chunksRef: React.MutableRefObject<Blob[]>,
    recorderRef: React.MutableRefObject<MediaRecorder | null>
  ) => {
    // --- 1. Raw PCM streaming to Deepgram (via ScriptProcessorNode) ---
    const audioCtx = new AudioContext({ sampleRate: 16000 })
    const source = audioCtx.createMediaStreamSource(stream)
    // 4096 samples buffer, 1 input channel, 1 output channel
    const processor = audioCtx.createScriptProcessor(4096, 1, 1)

    source.connect(processor)
    // Connect to destination to keep the processor alive (required by Chrome)
    processor.connect(audioCtx.destination)

    processor.onaudioprocess = (e) => {
      if (!isActiveRef.current) return
      const inputData = e.inputBuffer.getChannelData(0)

      // Convert float32 [-1, 1] to int16 PCM [-32768, 32767]
      const pcm16 = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]))
        pcm16[i] = s < 0 ? s * 32768 : s * 32767
      }

      // Convert to base64
      const bytes = new Uint8Array(pcm16.buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }

      wsSend('audio:segment', {
        audio: btoa(binary),
        size: bytes.length,
        role,
        encoding: 'linear16',
        sampleRate: 16000,
        speakerName: role === 'seller' ? 'Vendedor' : (configRef.current?.leadName || 'Lead'),
      })
    }

    // --- 2. MediaRecorder for full-call recording (WebM for storage only) ---
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm']
      .find(type => MediaRecorder.isTypeSupported(type)) || ''
    const recorder = new MediaRecorder(stream, { mimeType: mimeType || undefined })
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0 && chunksRef.current.length < MAX_RECORDING_CHUNKS) {
        chunksRef.current.push(event.data)
      }
    }
    recorder.start(RECORDING_TIMESLICE_MS)
  }, [wsSend])

  // --- START SESSION ---
  const start = useCallback(async (config: SessionConfig) => {
    configRef.current = config
    isActiveRef.current = true
    reconnectAttemptsRef.current = 0
    messageQueueRef.current = []
    leadChunksRef.current = []
    sellerChunksRef.current = []

    setState(prev => ({
      ...prev,
      status: 'configuring',
      error: null,
      transcript: [],
      coachMessages: [],
      callId: null,
      currentSpinPhase: null,
      duration: 0,
      micAvailable: false,
      isStreaming: false,
    }))

    try {
      // 1. Capture display audio (lead/participant)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: { width: { ideal: 1 }, height: { ideal: 1 } },
      })
      displayStreamRef.current = displayStream

      // Extract audio-only stream
      const audioTracks = displayStream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error('Nenhum áudio capturado. Certifique-se de marcar "Compartilhar áudio" ao selecionar a aba.')
      }

      // Stop video tracks (we only need audio)
      displayStream.getVideoTracks().forEach(t => t.stop())

      // Listen for user stopping share
      audioTracks[0].onended = () => {
        if (isActiveRef.current) {
          stopRef.current('FOLLOW_UP')
        }
      }

      // Downmix stereo → mono via AudioContext (Deepgram expects mono opus)
      const audioCtx = new AudioContext({ sampleRate: 48000 })
      const source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks))
      const dest = audioCtx.createMediaStreamDestination()
      dest.channelCount = 1
      dest.channelCountMode = 'explicit'
      source.connect(dest)
      const leadStream = dest.stream

      // 2. Capture microphone (seller) — already mono by default
      let micStream: MediaStream | null = null
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        })
        micStreamRef.current = micStream
        setState(prev => ({ ...prev, micAvailable: true }))
      } catch {
        // Mic not available — continue without seller audio
      }

      // 3. Connect WebSocket
      setState(prev => ({ ...prev, status: 'connecting' }))
      await connectWs()

      // 4. Start recording cycles
      startRecording(leadStream, 'lead', leadChunksRef, leadRecorderRef)
      if (micStream) {
        startRecording(micStream, 'seller', sellerChunksRef, sellerRecorderRef)
      }

      // 5. Start duration timer
      startTimeRef.current = Date.now()
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }))
      }, 1000)

      setState(prev => ({ ...prev, isStreaming: true }))

    } catch (err: unknown) {
      isActiveRef.current = false
      const message = err instanceof Error ? err.message : 'Erro ao iniciar sessão'

      // If user cancelled the share dialog
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setState(prev => ({ ...prev, status: 'idle', error: null }))
        return
      }

      setState(prev => ({ ...prev, status: 'error', error: message }))
    }
  }, [connectWs, startRecording])

  // --- STOP SESSION ---
  const stop = useCallback(async (result: CallResult = 'FOLLOW_UP') => {
    isActiveRef.current = false

    setState(prev => ({ ...prev, status: 'ending' }))

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Stop recorders
    if (leadRecorderRef.current && leadRecorderRef.current.state !== 'inactive') {
      leadRecorderRef.current.stop()
    }
    if (sellerRecorderRef.current && sellerRecorderRef.current.state !== 'inactive') {
      sellerRecorderRef.current.stop()
    }

    // Stop media streams
    displayStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    displayStreamRef.current = null
    micStreamRef.current = null

    // Send call:end
    if (callIdRef.current) {
      wsSend('call:end', {
        callId: callIdRef.current,
        result,
      })
    }

    // Wait a bit for the call:end to be sent
    await new Promise(resolve => setTimeout(resolve, 500))

    // Close WebSocket
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close(1000, 'Session ended')
      wsRef.current = null
    }

    setState(prev => ({ ...prev, status: 'ended', isStreaming: false }))
  }, [wsSend])

  // Keep stopRef in sync
  stopRef.current = stop

  // Dismiss a coach message
  const dismissCoachMessage = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      coachMessages: prev.coachMessages.map(m =>
        m.id === id ? { ...m, isDismissed: true } : m
      ),
    }))
  }, [])

  // Reset to idle
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      callId: null,
      transcript: [],
      coachMessages: [],
      currentSpinPhase: null,
      duration: 0,
      error: null,
      micAvailable: false,
      isStreaming: false,
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)

      // Stop recorders
      if (leadRecorderRef.current?.state !== 'inactive') leadRecorderRef.current?.stop()
      if (sellerRecorderRef.current?.state !== 'inactive') sellerRecorderRef.current?.stop()

      // Stop streams
      displayStreamRef.current?.getTracks().forEach(t => t.stop())
      micStreamRef.current?.getTracks().forEach(t => t.stop())

      // Close WS
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close(1000, 'Unmount')
      }
    }
  }, [])

  return {
    state,
    start,
    stop,
    dismissCoachMessage,
    reset,
  }
}
