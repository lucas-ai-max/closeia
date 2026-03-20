'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import type { WebSessionState, CoachMessage, CallResult } from '@/hooks/use-web-session'

const NEON_PINK = '#ff007a'

const SPIN_PHASES: Record<string, { label: string }> = {
  S: { label: 'Situação' },
  P: { label: 'Problema' },
  I: { label: 'Implicação' },
  N: { label: 'Necessidade' },
}

type Tab = 'coach' | 'transcript'

interface Props {
  state: WebSessionState
  onDismiss: (id: string) => void
  onStop: (result: CallResult) => void
}

export function PipPopupContent({ state, onDismiss, onStop }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('coach')
  const coachEndRef = useRef<HTMLDivElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const activeCoach = useMemo(() => (state.coachMessages || []).filter(m => !m.isDismissed), [state.coachMessages])
  const finalTranscript = useMemo(() => (state.transcript || []).filter(t => t.isFinal), [state.transcript])

  useEffect(() => {
    if (activeTab === 'coach') coachEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.coachMessages, activeTab])
  useEffect(() => {
    if (activeTab === 'transcript') transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.transcript, activeTab])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60); const ss = s % 60
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  if (state.status === 'idle') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: NEON_PINK, animation: 'spin 1s linear infinite', marginBottom: 16 }} />
        <p style={{ fontSize: 14, color: '#9ca3af' }}>Aguardando sessão...</p>
      </div>
    )
  }

  if (state.status === 'configuring' || state.status === 'connecting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: NEON_PINK, animation: 'spin 1s linear infinite', marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: '#9ca3af' }}>
          {state.status === 'configuring' ? 'Capturando áudio...' : 'Conectando...'}
        </p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 24, textAlign: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
        <p style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>Erro</p>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>{state.error}</p>
      </div>
    )
  }

  if (state.status === 'ending') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#22c55e', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: '#9ca3af' }}>Finalizando...</p>
      </div>
    )
  }

  if (state.status === 'ended') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 24, textAlign: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
        <p style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>Sessão Finalizada</p>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
          <span>{fmt(state.duration)}</span>
          <span>{finalTranscript.length} msgs</span>
          <span>{activeCoach.length} dicas</span>
        </div>
      </div>
    )
  }

  // ── ACTIVE SESSION ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'white' }}>{fmt(state.duration)}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={state.micAvailable ? '#22c55e' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {state.micAvailable ? (
              <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></>
            ) : (
              <><line x1="2" x2="22" y1="2" y2="22" /><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" /><path d="M5 10v2a7 7 0 0 0 12 5" /><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><line x1="12" x2="12" y1="19" y2="22" /></>
            )}
          </svg>
        </div>
        <span style={{ fontSize: 11, color: '#444', fontWeight: 600 }}>HelpSeller</span>
      </div>

      {/* SPIN */}
      {state.currentSpinPhase && SPIN_PHASES[state.currentSpinPhase] && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#4b5563' }}>SPIN:{state.currentSpinPhase}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{SPIN_PHASES[state.currentSpinPhase].label}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['S', 'P', 'I', 'N'].map(p => (
              <div key={p} style={{ width: 6, height: 6, borderRadius: '50%', background: p === state.currentSpinPhase ? NEON_PINK : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => setActiveTab('coach')}
          style={{
            flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: 'transparent',
            color: activeTab === 'coach' ? 'white' : '#4b5563',
            borderBottom: activeTab === 'coach' ? `2px solid ${NEON_PINK}` : '2px solid transparent',
          }}
        >
          Coach IA ({activeCoach.length})
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          style={{
            flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: 'transparent',
            color: activeTab === 'transcript' ? 'white' : '#4b5563',
            borderBottom: activeTab === 'transcript' ? `2px solid ${NEON_PINK}` : '2px solid transparent',
          }}
        >
          Transcrição ({finalTranscript.length})
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activeTab === 'coach' ? (
          <>
            {activeCoach.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: '#4b5563' }}>
                {state.currentSpinPhase ? (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: NEON_PINK, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8, opacity: 0.3 }}><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z" /><path d="M10 20v2h4v-2" /></svg>
                    <p style={{ fontSize: 12 }}>Sugestões aparecerão aqui</p>
                  </>
                )}
              </div>
            )}
            {activeCoach.map(msg => (
              <PipCoachCard key={msg.id} msg={msg} onDismiss={onDismiss} />
            ))}
            <div ref={coachEndRef} />
          </>
        ) : (
          <>
            {finalTranscript.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: '#4b5563' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8, opacity: 0.3 }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                <p style={{ fontSize: 12 }}>Aguardando conversa...</p>
              </div>
            )}
            {finalTranscript.map(chunk => (
              <div key={chunk.id} style={{ display: 'flex', gap: 8, flexDirection: chunk.role === 'seller' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, flexShrink: 0,
                  background: chunk.role === 'seller' ? `${NEON_PINK}20` : 'rgba(255,255,255,0.06)',
                  color: chunk.role === 'seller' ? NEON_PINK : '#666',
                }}>
                  {chunk.role === 'seller' ? 'V' : 'L'}
                </div>
                <div style={{
                  maxWidth: '85%', borderRadius: 8, padding: '6px 10px',
                  background: chunk.role === 'seller' ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${chunk.role === 'seller' ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.05)'}`,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 600, marginBottom: 2, color: chunk.role === 'seller' ? NEON_PINK : '#555' }}>
                    {chunk.speaker}
                  </p>
                  <p style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.5 }}>{chunk.text}</p>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </>
        )}
      </div>

      {/* End bar */}
      <PipEndBar onStop={onStop} />
    </div>
  )
}

function PipEndBar({ onStop }: { onStop: (r: CallResult) => void }) {
  const [picking, setPicking] = useState(false)
  if (picking) {
    return (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)' }}>
        <span style={{ fontSize: 10, color: '#6b7280', marginRight: 4 }}>Resultado:</span>
        <button onClick={() => { setPicking(false); onStop('CONVERTED') }} style={{ flex: 1, padding: '6px 0', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer' }}>Convertido</button>
        <button onClick={() => { setPicking(false); onStop('LOST') }} style={{ flex: 1, padding: '6px 0', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer' }}>Perdido</button>
        <button onClick={() => { setPicking(false); onStop('FOLLOW_UP') }} style={{ flex: 1, padding: '6px 0', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#ca8a04', color: 'white', border: 'none', cursor: 'pointer' }}>Follow-up</button>
      </div>
    )
  }
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px' }}>
      <button
        onClick={() => setPicking(true)}
        style={{
          width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <IconPhone /> Encerrar
      </button>
    </div>
  )
}

// SVG icons for PiP (no emoji dependency)
const SvgIcon = ({ d, color, size = 12 }: { d: string; color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const IconZap = ({ color = '#facc15' }: { color?: string }) => <SvgIcon d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" color={color} />
const IconBulb = ({ color = '#9ca3af' }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" /><path d="M10 22h4" />
  </svg>
)
const IconCart = ({ color = '#4ade80' }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
)
const IconAlert = ({ color = '#f87171' }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
)
const IconMsg = ({ color = '#60a5fa' }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IconTarget = ({ color = '#facc15' }: { color?: string }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
)
const IconX = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
)
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

function PipCoachCard({ msg, onDismiss }: { msg: CoachMessage; onDismiss: (id: string) => void }) {
  const getIcon = () => {
    if (msg.type === 'manager-whisper' || msg.metadata?.source === 'manager') return <IconMsg />
    switch (msg.type) {
      case 'signal': return <IconCart />
      case 'objection': return <IconZap />
      case 'alert': return <IconAlert />
      case 'reinforcement': return <IconBulb color="#a78bfa" />
      default: return <IconBulb />
    }
  }
  const label = msg.type === 'manager-whisper' || msg.metadata?.source === 'manager' ? 'Gestor' : msg.type.replace('-', ' ')

  return (
    <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', padding: 10, background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          {getIcon()}
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#4b5563' }}>{label}</span>
        </div>
        <button onClick={() => onDismiss(msg.id)} style={{ background: 'none', border: 'none', padding: 2, color: '#374151', cursor: 'pointer' }}><IconX /></button>
      </div>
      <h4 style={{ fontWeight: 500, fontSize: 12, color: 'white', lineHeight: 1.3 }}>{msg.title}</h4>
      {msg.description && (
        <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, marginTop: 2 }}>{msg.description}</p>
      )}
      {msg.type === 'objection' && msg.metadata?.objection ? (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#9ca3af', background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '4px 8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <IconTarget />
          <span style={{ color: '#6b7280' }}>Objeção:</span> {String(msg.metadata.objection)}
        </div>
      ) : null}
      {msg.metadata?.suggested_response ? (
        <div style={{ marginTop: 6, fontSize: 10, background: 'rgba(34,197,94,0.08)', borderRadius: 4, padding: '4px 8px', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, fontWeight: 600, color: '#4ade80' }}><IconMsg color="#4ade80" /> Resposta</div>
          <p style={{ color: '#d1d5db', lineHeight: 1.5 }}>{String(msg.metadata.suggested_response)}</p>
        </div>
      ) : null}
      {msg.metadata?.suggested_question ? (
        <div style={{ marginTop: 6, fontSize: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 4, padding: '4px 8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, fontWeight: 600, color: '#6b7280' }}><IconBulb color="#6b7280" /> Pergunta</div>
          <p style={{ color: '#d1d5db', lineHeight: 1.5, fontWeight: 500 }}>{String(msg.metadata.suggested_question)}</p>
        </div>
      ) : null}
    </div>
  )
}
