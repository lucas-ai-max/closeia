'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Zap, Lightbulb, ShoppingCart, AlertTriangle, Sparkles, X, MessageSquare, Target, MessageCircle } from 'lucide-react'
import type { CoachMessage, TranscriptChunk, WebSessionState, CallResult } from '@/hooks/use-web-session'

const NEON_PINK = '#ff007a'
const BROADCAST_CHANNEL = 'helpcloser-session'

const SPIN_PHASES: Record<string, { label: string }> = {
  S: { label: 'Situação' },
  P: { label: 'Problema' },
  I: { label: 'Implicação' },
  N: { label: 'Necessidade' },
}

type Tab = 'coach' | 'transcript'

export default function SessionLivePopup() {
  const [state, setState] = useState<WebSessionState | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('coach')
  const channelRef = useRef<BroadcastChannel | null>(null)
  const coachEndRef = useRef<HTMLDivElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL)
    channelRef.current = ch
    ch.onmessage = (e) => {
      if (e.data?.type === 'state') setState(e.data.payload)
    }
    return () => ch.close()
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (activeTab === 'coach') coachEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state?.coachMessages, activeTab])
  useEffect(() => {
    if (activeTab === 'transcript') transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state?.transcript, activeTab])

  const sendCmd = (type: string, data?: Record<string, unknown>) => {
    channelRef.current?.postMessage({ type, ...data })
  }

  const dismiss = (id: string) => sendCmd('dismiss', { id })
  const stopSession = (result: CallResult) => sendCmd('stop', { result })

  const activeCoach = useMemo(() => (state?.coachMessages || []).filter(m => !m.isDismissed), [state?.coachMessages])
  const finalTranscript = useMemo(() => (state?.transcript || []).filter(t => t.isFinal), [state?.transcript])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60); const ss = s % 60
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  // ── Waiting for connection ──
  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-pink-500 animate-spin mb-4" />
        <p className="text-sm text-gray-400">Aguardando sessão...</p>
        <p className="text-xs text-gray-600 mt-1">Inicie a sessão na aba do HelpCloser</p>
      </div>
    )
  }

  if (state.status === 'configuring' || state.status === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-pink-500 animate-spin mb-3" />
        <p className="text-sm text-gray-400">
          {state.status === 'configuring' ? 'Capturando áudio...' : 'Conectando...'}
        </p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <span className="material-icons-outlined text-3xl text-red-400 mb-3">error</span>
        <p className="text-white font-medium mb-1">Erro</p>
        <p className="text-xs text-gray-400 mb-4">{state.error}</p>
        <button onClick={() => window.close()} className="text-xs text-gray-500 hover:text-white transition">Fechar</button>
      </div>
    )
  }

  if (state.status === 'ending') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-green-500 animate-spin mb-3" />
        <p className="text-sm text-gray-400">Finalizando...</p>
      </div>
    )
  }

  if (state.status === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <span className="material-icons-outlined text-3xl text-green-400 mb-3">check_circle</span>
        <p className="text-white font-semibold mb-1">Sessão Finalizada</p>
        <div className="flex gap-4 text-xs text-gray-500 mb-4">
          <span>{fmt(state.duration)}</span>
          <span>{finalTranscript.length} msgs</span>
          <span>{activeCoach.length} dicas</span>
        </div>
        <button onClick={() => window.close()} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: NEON_PINK }}>
          Fechar
        </button>
      </div>
    )
  }

  // ── ACTIVE SESSION ──
  return (
    <div className="flex flex-col h-screen select-none" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-white">{fmt(state.duration)}</span>
          <span className="material-icons-outlined text-[14px]" style={{ color: state.micAvailable ? '#22c55e' : '#666' }}>
            {state.micAvailable ? 'mic' : 'mic_off'}
          </span>
        </div>
        <img src="/logo-closer-white.png" alt="" className="h-4 opacity-50" />
      </div>

      {/* SPIN */}
      {state.currentSpinPhase && SPIN_PHASES[state.currentSpinPhase] && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600">SPIN:{state.currentSpinPhase}</span>
            <span className="text-[11px] text-gray-400">{SPIN_PHASES[state.currentSpinPhase].label}</span>
          </div>
          <div className="flex gap-1">
            {['S', 'P', 'I', 'N'].map(p => (
              <div key={p} className="w-1.5 h-1.5 rounded-full" style={{ background: p === state.currentSpinPhase ? NEON_PINK : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('coach')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === 'coach' ? 'text-white border-b-2' : 'text-gray-600'}`}
          style={activeTab === 'coach' ? { borderColor: NEON_PINK } : {}}
        >
          Coach IA ({activeCoach.length})
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === 'transcript' ? 'text-white border-b-2' : 'text-gray-600'}`}
          style={activeTab === 'transcript' ? { borderColor: NEON_PINK } : {}}
        >
          Transcrição ({finalTranscript.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: `${NEON_PINK}40 transparent` }}>
        {activeTab === 'coach' ? (
          <>
            {activeCoach.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                <span className="material-icons-outlined text-3xl mb-2 opacity-30">psychology</span>
                <p className="text-xs">{state.currentSpinPhase ? 'Analisando...' : 'Aguardando conversa...'}</p>
              </div>
            )}
            {activeCoach.map(msg => <PopupCoachCard key={msg.id} msg={msg} onDismiss={dismiss} />)}
            <div ref={coachEndRef} />
          </>
        ) : (
          <>
            {finalTranscript.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                <span className="material-icons-outlined text-3xl mb-2 opacity-30">mic</span>
                <p className="text-xs">Aguardando conversa...</p>
              </div>
            )}
            {finalTranscript.map(chunk => (
              <div key={chunk.id} className={`flex gap-2 ${chunk.role === 'seller' ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    background: chunk.role === 'seller' ? `${NEON_PINK}20` : 'rgba(255,255,255,0.06)',
                    color: chunk.role === 'seller' ? NEON_PINK : '#666',
                  }}
                >
                  {chunk.role === 'seller' ? 'V' : 'L'}
                </div>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                  chunk.role === 'seller' ? 'bg-pink-500/10 border border-pink-500/15' : 'bg-white/[0.04] border border-white/5'
                }`}>
                  <p className="text-[10px] font-semibold mb-0.5" style={{ color: chunk.role === 'seller' ? NEON_PINK : '#555' }}>
                    {chunk.speaker}
                  </p>
                  <p className="text-[12px] text-gray-300 leading-relaxed">{chunk.text}</p>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </>
        )}
      </div>

      {/* End bar */}
      <PopupEndBar onStop={stopSession} />
    </div>
  )
}

// ─── End bar ─────────────────────────────────────────
function PopupEndBar({ onStop }: { onStop: (r: CallResult) => void }) {
  const [picking, setPicking] = useState(false)
  if (picking) {
    return (
      <div className="border-t border-white/5 px-2.5 py-2 flex items-center gap-1.5 bg-black/60">
        <span className="text-[10px] text-gray-500 mr-1">Resultado:</span>
        <button onClick={() => { setPicking(false); onStop('CONVERTED') }} className="flex-1 py-1.5 rounded text-[10px] font-semibold bg-green-600 text-white">Convertido</button>
        <button onClick={() => { setPicking(false); onStop('LOST') }} className="flex-1 py-1.5 rounded text-[10px] font-semibold bg-red-600 text-white">Perdido</button>
        <button onClick={() => { setPicking(false); onStop('FOLLOW_UP') }} className="flex-1 py-1.5 rounded text-[10px] font-semibold bg-yellow-600 text-white">Follow-up</button>
      </div>
    )
  }
  return (
    <div className="border-t border-white/5 px-3 py-2">
      <button
        onClick={() => setPicking(true)}
        className="w-full py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 transition-colors"
      >
        <span className="material-icons-outlined text-sm">call_end</span>
        Encerrar
      </button>
    </div>
  )
}

// ─── Coach Card (compact) ────────────────────────────
function PopupCoachCard({ msg, onDismiss }: { msg: CoachMessage; onDismiss: (id: string) => void }) {
  const getIcon = () => {
    if (msg.type === 'manager-whisper' || msg.metadata?.source === 'manager') return <MessageSquare size={12} className="text-blue-400" />
    switch (msg.type) {
      case 'signal': return <ShoppingCart size={12} className="text-green-400" />
      case 'objection': return <Zap size={12} className="text-yellow-400" />
      case 'alert': return <AlertTriangle size={12} className="text-red-400" />
      case 'reinforcement': return <Sparkles size={12} className="text-purple-400" />
      default: return <Lightbulb size={12} className="text-gray-500" />
    }
  }
  const label = msg.type === 'manager-whisper' || msg.metadata?.source === 'manager' ? 'Gestor' : msg.type.replace('-', ' ')

  return (
    <div className="rounded-lg border border-white/5 p-2.5 bg-white/[0.03] animate-in slide-in-from-right-2 duration-200">
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {getIcon()}
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-600 truncate">{label}</span>
          {msg.metadata?.phase ? <span className="text-[8px] font-bold text-gray-600 bg-white/5 px-1 py-0.5 rounded">{String(msg.metadata.phase)}</span> : null}
        </div>
        <button onClick={() => onDismiss(msg.id)} className="p-0.5 text-gray-700 hover:text-gray-400"><X size={10} /></button>
      </div>
      <h4 className="font-medium text-[12px] text-white leading-tight">{msg.title}</h4>
      {msg.description && (
        <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
          {msg.description.split(/(\*\*.*?\*\*)/).map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
              : <span key={i}>{part}</span>
          )}
        </p>
      )}
      {msg.type === 'objection' && msg.metadata?.objection ? (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400 bg-black/30 rounded px-2 py-1 border border-white/5">
          <Target size={9} className="shrink-0 text-yellow-400" />
          <span className="text-gray-600">Objeção:</span> {String(msg.metadata.objection)}
        </div>
      ) : null}
      {msg.metadata?.suggested_response ? (
        <div className="mt-1.5 text-[10px] bg-green-500/[0.08] rounded px-2 py-1 border border-green-500/20">
          <div className="flex items-center gap-1 mb-0.5 font-semibold text-green-400"><MessageCircle size={9} />Resposta</div>
          <p className="text-gray-300 leading-relaxed">{String(msg.metadata.suggested_response)}</p>
        </div>
      ) : null}
      {msg.metadata?.suggested_question ? (
        <div className="mt-1.5 text-[10px] bg-white/[0.03] rounded px-2 py-1 border border-white/5">
          <div className="flex items-center gap-1 mb-0.5 font-semibold text-gray-500"><Lightbulb size={9} />Pergunta</div>
          <p className="text-gray-300 leading-relaxed font-medium">{String(msg.metadata.suggested_question)}</p>
        </div>
      ) : null}
    </div>
  )
}
