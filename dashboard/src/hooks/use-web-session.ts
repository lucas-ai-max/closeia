'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws/call'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

const MAX_RECORDING_CHUNKS = 3600
const BROADCAST_CHANNEL = 'helpcloser-session'

// --- Hook ---

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

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'state', payload: state })
  }, [state])

  // Refs
  const wsRef = useRef<WebSocket | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const fullRecorderRef = useRef<MediaRecorder | null>(null)
  const fullChunksRef = useRef<Blob[]>([])
  const mediaStreamRecorderRef = useRef<MediaRecorder | null>(null)
  const isStreamingMediaRef = useRef(false)
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
  const audioContextsRef = useRef<AudioContext[]>([])
  const pendingMediaStartRef = useRef<{ display: MediaStream; mic: MediaStream | null } | null>(null)
  const startMediaStreamingRef = useRef<(s: MediaStream) => void>(() => {})
  const startFullCallRecordingRef = useRef<(d: MediaStream, m: MediaStream | null) => void>(() => {})

  // Get supabase token (with refresh fallback)
  const getToken = useCallback(async (): Promise<string> => {
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      // Check if token expires in less than 60 seconds
      const expiresAt = session.expires_at ?? 0
      if (expiresAt * 1000 > Date.now() + 60_000) {
        return session.access_token
      }
    }
    // Token expired or missing — try refresh
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    if (!refreshed) throw new Error('Sem sessão ativa. Faça login novamente.')
    return refreshed.access_token
  }, [])

  // Send WS message
  const wsSend = useCallback((type: string, payload: Record<string, unknown>) => {
    const message = JSON.stringify({ type, payload })
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN && authResolvedRef.current) {
      try { ws.send(message) } catch { messageQueueRef.current.push(message) }
    } else {
      if (messageQueueRef.current.length >= 100) messageQueueRef.current.shift()
      messageQueueRef.current.push(message)
    }
  }, [])

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
        try { localStorage.setItem('helpcloser_session_active', '1') } catch {}
        flushQueue()
        // Start video streaming + recording now that callId is confirmed
        if (pendingMediaStartRef.current) {
          const { display, mic } = pendingMediaStartRef.current
          pendingMediaStartRef.current = null
          startMediaStreamingRef.current(display)
          startFullCallRecordingRef.current(display, mic)
        }
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
          const filtered = prev.transcript.filter(t => t.isFinal || t.role !== chunk.role)
          return { ...prev, transcript: [...filtered, chunk] }
        })
        break
      }
      case 'coach:message':
      case 'COACHING_MESSAGE': {
        const p = data.payload || {}
        const meta = p.metadata as Record<string, unknown> | undefined
        const content = (p.content as string) || (p.description as string) || ''
        const msg: CoachMessage = {
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: (p.type as CoachMessage['type']) || 'tip',
          title: (p.title as string) || '',
          description: content,
          metadata: meta,
          timestamp: Date.now(),
        }
        const phase = meta?.phase as string | undefined
        setState(prev => ({
          ...prev,
          coachMessages: [...prev.coachMessages, msg],
          currentSpinPhase: phase || prev.currentSpinPhase,
        }))
        break
      }
      case 'coach:token': {
        // Tokens are streamed JSON — don't show raw text to user.
        // The final parsed result arrives via COACHING_MESSAGE.
        break
      }
      case 'coach:thinking': {
        // Don't create visible card — just set a "thinking" flag via SPIN phase
        break
      }
      case 'coach:done': break
      case 'objection:detected': {
        const p = data.payload || {}
        setState(prev => ({ ...prev, coachMessages: [...prev.coachMessages, {
          id: `obj-${Date.now()}`, type: 'objection', title: 'Objeção detectada',
          description: (p.tip as string) || '',
          metadata: { objection: p.objection, phase: p.phase, suggested_response: p.suggested_response },
          timestamp: Date.now(),
        }] }))
        break
      }
      case 'coach:whisper': {
        const p = data.payload || {}
        setState(prev => ({ ...prev, coachMessages: [...prev.coachMessages, {
          id: `w-${Date.now()}`, type: 'manager-whisper', title: 'Mensagem do Gestor',
          description: (p.content as string) || '',
          metadata: { urgency: p.urgency, source: 'manager' }, timestamp: Date.now(),
        }] }))
        break
      }
      case 'error': {
        setState(prev => ({ ...prev, error: (data.payload?.message as string) || 'Erro desconhecido' }))
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
            setState(prev => ({ ...prev, status: 'error', error: data.payload?.reason || 'Falha na autenticação' }))
            return
          }
          handleWsMessage(data)
        } catch { /* parse error */ }
      }
      ws.onclose = (event) => {
        if (!isActiveRef.current) return
        if (event.code === 4403) { setState(prev => ({ ...prev, status: 'error', error: 'Plano ativo necessário.' })); return }
        if (reconnectAttemptsRef.current >= 10) { setState(prev => ({ ...prev, status: 'error', error: 'Conexão perdida.' })); return }
        const delay = Math.min(2000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = setTimeout(() => connectWs(), delay)
      }
    } catch (err: unknown) {
      setState(prev => ({ ...prev, status: 'error', error: err instanceof Error ? err.message : 'Erro ao conectar' }))
    }
  }, [getToken, wsSend, flushQueue, handleWsMessage])

  // Start raw PCM audio streaming for a role
  const startPcmStreaming = useCallback((stream: MediaStream, role: 'lead' | 'seller') => {
    const audioCtx = new AudioContext({ sampleRate: 16000 })
    audioContextsRef.current.push(audioCtx)
    const source = audioCtx.createMediaStreamSource(stream)
    const processor = audioCtx.createScriptProcessor(4096, 1, 1)
    source.connect(processor)
    processor.connect(audioCtx.destination)

    processor.onaudioprocess = (e) => {
      if (!isActiveRef.current) return
      const inputData = e.inputBuffer.getChannelData(0)
      const pcm16 = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]))
        pcm16[i] = s < 0 ? s * 32768 : s * 32767
      }
      const bytes = new Uint8Array(pcm16.buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])

      wsSend('audio:segment', {
        audio: btoa(binary),
        size: bytes.length,
        role,
        encoding: 'linear16',
        sampleRate: 16000,
        speakerName: role === 'seller' ? 'Vendedor' : (configRef.current?.leadName || 'Lead'),
      })
    }
  }, [wsSend])

  // Start video streaming for Ao Vivo (media:stream)
  const startMediaStreaming = useCallback((displayStream: MediaStream) => {
    const videoMime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'

    isStreamingMediaRef.current = true

    const startCycle = () => {
      if (!isStreamingMediaRef.current) return

      const recorder = new MediaRecorder(displayStream, {
        mimeType: videoMime,
        videoBitsPerSecond: 800000,
        audioBitsPerSecond: 64000,
      })
      mediaStreamRecorderRef.current = recorder
      let isFirstChunk = true

      recorder.ondataavailable = async (event) => {
        if (!event.data?.size) return
        const buffer = await event.data.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])

        wsSend('media:stream', {
          chunk: btoa(binary),
          size: event.data.size,
          timestamp: Date.now(),
          isHeader: isFirstChunk,
        })
        isFirstChunk = false
      }

      recorder.start(500)

      // Restart every 5s to force new keyframe/header
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop()
        if (isStreamingMediaRef.current) startCycle()
      }, 5000)
    }

    startCycle()
  }, [wsSend])

  // Start full call recording (video + mixed audio)
  const startFullCallRecording = useCallback((displayStream: MediaStream, micStream: MediaStream | null) => {
    fullChunksRef.current = []

    // Mix tab audio + mic audio
    const mixerCtx = new AudioContext()
    audioContextsRef.current.push(mixerCtx)
    const mixerDest = mixerCtx.createMediaStreamDestination()

    const tabAudio = displayStream.getAudioTracks()
    if (tabAudio.length > 0) {
      mixerCtx.createMediaStreamSource(new MediaStream(tabAudio)).connect(mixerDest)
    }
    if (micStream && micStream.getAudioTracks().length > 0) {
      mixerCtx.createMediaStreamSource(micStream).connect(mixerDest)
    }

    // Build recording stream: video + mixed audio
    const recordingStream = new MediaStream()
    const videoTrack = displayStream.getVideoTracks()[0]
    const mixedAudioTrack = mixerDest.stream.getAudioTracks()[0]
    if (videoTrack) recordingStream.addTrack(videoTrack)
    if (mixedAudioTrack) recordingStream.addTrack(mixedAudioTrack)

    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'

    const recorder = new MediaRecorder(recordingStream, {
      mimeType,
      videoBitsPerSecond: 500000,
      audioBitsPerSecond: 64000,
    })
    fullRecorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0 && fullChunksRef.current.length < MAX_RECORDING_CHUNKS) {
        fullChunksRef.current.push(event.data)
      }
    }
    recorder.start(2000)
  }, [])

  // Keep refs in sync for use in handleWsMessage
  startMediaStreamingRef.current = startMediaStreaming
  startFullCallRecordingRef.current = startFullCallRecording

  // Upload recording to Supabase Storage
  const uploadRecording = useCallback(async (callId: string): Promise<string | null> => {
    const recorder = fullRecorderRef.current
    const chunks = fullChunksRef.current
    if (!recorder || chunks.length === 0) return null

    return new Promise((resolve) => {
      const doUpload = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
        fullChunksRef.current = []
        fullRecorderRef.current = null

        if (blob.size < 10000) { resolve(null); return }

        try {
          const token = await getToken()
          const dateStr = new Date().toISOString().split('T')[0]
          const filePath = `${dateStr}/${callId}_video.webm`
          const uploadUrl = `${SUPABASE_URL}/storage/v1/object/call-recordings/${filePath}`

          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': blob.type || 'video/webm',
            },
            body: blob,
          })

          if (!response.ok) { resolve(null); return }
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/call-recordings/${filePath}`
          resolve(publicUrl)
        } catch {
          resolve(null)
        }
      }

      if (recorder.state !== 'inactive') {
        recorder.onstop = () => doUpload()
        recorder.stop()
      } else {
        doUpload()
      }
    })
  }, [getToken])

  // --- START SESSION ---
  const start = useCallback(async (config: SessionConfig) => {
    configRef.current = config
    isActiveRef.current = true
    reconnectAttemptsRef.current = 0
    messageQueueRef.current = []
    fullChunksRef.current = []
    audioContextsRef.current = []

    setState(prev => ({
      ...prev, status: 'configuring', error: null, transcript: [], coachMessages: [],
      callId: null, currentSpinPhase: null, duration: 0, micAvailable: false, isStreaming: false,
    }))

    try {
      // 1. Capture display (video + audio) — keep video for Ao Vivo + recording
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 },
        },
      })
      displayStreamRef.current = displayStream

      const audioTracks = displayStream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error('Nenhum áudio capturado. Marque "Compartilhar áudio" ao selecionar a aba.')
      }

      // Listen for user stopping share
      audioTracks[0].onended = () => {
        if (isActiveRef.current) stopRef.current('FOLLOW_UP')
      }

      // 2. Capture microphone (seller)
      let micStream: MediaStream | null = null
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        })
        micStreamRef.current = micStream
        setState(prev => ({ ...prev, micAvailable: true }))
      } catch { /* no mic */ }

      // 3. Connect WebSocket
      setState(prev => ({ ...prev, status: 'connecting' }))
      await connectWs()

      // 4. Start PCM audio streaming (for Deepgram transcription) — starts immediately
      const leadAudioStream = new MediaStream(audioTracks)
      startPcmStreaming(leadAudioStream, 'lead')
      if (micStream) startPcmStreaming(micStream, 'seller')

      // 5. Video streaming + recording start AFTER call:started (need callId on backend)
      pendingMediaStartRef.current = { display: displayStream, mic: micStream }

      // 6. Start duration timer
      startTimeRef.current = Date.now()
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: Math.floor((Date.now() - startTimeRef.current) / 1000) }))
      }, 1000)

      setState(prev => ({ ...prev, isStreaming: true }))

    } catch (err: unknown) {
      isActiveRef.current = false
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setState(prev => ({ ...prev, status: 'idle', error: null }))
        return
      }
      // Cleanup any partial state from failed start
      displayStreamRef.current?.getTracks().forEach(t => t.stop())
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      displayStreamRef.current = null
      micStreamRef.current = null
      audioContextsRef.current.forEach(ctx => ctx.close().catch(() => {}))
      audioContextsRef.current = []
      if (wsRef.current) { try { wsRef.current.close() } catch {} wsRef.current = null }
      if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null }

      // Friendly error messages
      let message = 'Erro ao iniciar sessão. Tente novamente.'
      if (err instanceof Error) {
        if (err.message === 'Invalid state' || err.name === 'InvalidStateError') {
          message = 'Conexão falhou. Clique em "Iniciar" novamente.'
        } else if (err.message.includes('sessão ativa') || err.message.includes('login')) {
          message = err.message
        } else if (err.message.includes('áudio')) {
          message = err.message
        } else if (err.message.includes('WebSocket') || err.message.includes('connect')) {
          message = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        }
      }
      setState(prev => ({ ...prev, status: 'error', error: message }))
    }
  }, [connectWs, startPcmStreaming, startMediaStreaming, startFullCallRecording])

  // --- STOP SESSION ---
  const stop = useCallback(async (result: CallResult = 'FOLLOW_UP') => {
    isActiveRef.current = false
    isStreamingMediaRef.current = false

    setState(prev => ({ ...prev, status: 'ending' }))

    // Stop timer
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null }

    // Stop media stream recorder
    if (mediaStreamRecorderRef.current?.state !== 'inactive') mediaStreamRecorderRef.current?.stop()

    // Upload recording before stopping streams
    const callId = callIdRef.current
    let videoUrl: string | null = null
    if (callId) {
      videoUrl = await uploadRecording(callId)
    }

    // Stop media streams
    displayStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    displayStreamRef.current = null
    micStreamRef.current = null

    // Close audio contexts
    audioContextsRef.current.forEach(ctx => ctx.close().catch(() => {}))
    audioContextsRef.current = []

    // Send call:end with video URL
    if (callId) {
      wsSend('call:end', {
        callId,
        result,
        videoRecordingUrl: videoUrl || undefined,
      })
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    // Close WebSocket
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(1000, 'Session ended'); wsRef.current = null }

    setState(prev => ({ ...prev, status: 'ended', isStreaming: false }))
    try { localStorage.removeItem('helpcloser_session_active') } catch {}
  }, [wsSend, uploadRecording])

  stopRef.current = stop

  // Dismiss a coach message
  const dismissCoachMessage = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      coachMessages: prev.coachMessages.map(m => m.id === id ? { ...m, isDismissed: true } : m),
    }))
  }, [])

  // Reset
  const reset = useCallback(() => {
    setState({
      status: 'idle', callId: null, transcript: [], coachMessages: [], currentSpinPhase: null,
      duration: 0, error: null, micAvailable: false, isStreaming: false,
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      isStreamingMediaRef.current = false
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (fullRecorderRef.current?.state !== 'inactive') fullRecorderRef.current?.stop()
      if (mediaStreamRecorderRef.current?.state !== 'inactive') mediaStreamRecorderRef.current?.stop()
      displayStreamRef.current?.getTracks().forEach(t => t.stop())
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      audioContextsRef.current.forEach(ctx => ctx.close().catch(() => {}))
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(1000, 'Unmount') }
    }
  }, [])

  // Prevent closing tab/browser during active session
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isActiveRef.current) {
        e.preventDefault()
        e.returnValue = 'Sessão ativa! Se sair, a transcrição será interrompida.'
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      try { localStorage.removeItem('helpcloser_session_active') } catch {}
    }
  }, [])

  return { state, start, stop, dismissCoachMessage, reset }
}
