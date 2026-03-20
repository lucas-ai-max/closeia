'use client'

import { useEffect, useRef } from 'react'
import { Zap, Lightbulb, ShoppingCart, AlertTriangle, Sparkles, X, MessageSquare, Target, MessageCircle } from 'lucide-react'
import type { CoachMessage } from '@/hooks/use-web-session'
import { SpinIndicator } from './spin-indicator'

interface CoachingPanelProps {
  messages: CoachMessage[]
  currentSpinPhase: string | null
  onDismiss: (id: string) => void
}

const NEON_PINK = '#ff007a'

function getIcon(type: string, metadata?: Record<string, unknown>) {
  if (type === 'manager-whisper' || metadata?.source === 'manager') return <MessageSquare size={14} className="text-blue-400" />
  switch (type) {
    case 'signal': return <ShoppingCart size={14} className="text-green-400" />
    case 'objection': return <Zap size={14} className="text-yellow-400" />
    case 'tip': return <Lightbulb size={14} className="text-gray-400" />
    case 'alert': return <AlertTriangle size={14} className="text-red-400" />
    case 'reinforcement': return <Sparkles size={14} className="text-purple-400" />
    default: return <Lightbulb size={14} className="text-gray-500" />
  }
}

function CoachCard({ message, onDismiss }: { message: CoachMessage; onDismiss: (id: string) => void }) {
  const typeLabel = message.type === 'manager-whisper' || message.metadata?.source === 'manager'
    ? 'Gestor'
    : message.type.replace('-', ' ')
  const isUrgent = message.metadata?.urgency === 'high' || message.metadata?.urgency === 'urgent'

  return (
    <div className="relative w-full rounded-lg border border-white/5 p-3 bg-white/[0.03] animate-in slide-in-from-right-2 duration-200">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getIcon(message.type, message.metadata)}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate">
            {typeLabel}
          </span>
          {isUrgent && (
            <span className="text-[9px] font-semibold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded shrink-0">
              Urgente
            </span>
          )}
          {message.metadata?.phase ? (
            <span className="text-[9px] font-semibold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
              SPIN:{String(message.metadata.phase)}
            </span>
          ) : null}
        </div>
        <button
          onClick={() => onDismiss(message.id)}
          className="shrink-0 p-1 rounded text-gray-600 hover:text-gray-400 transition-colors"
          aria-label="Fechar"
        >
          <X size={12} />
        </button>
      </div>

      {message.title && (
        <h4 className="font-medium text-[13px] text-white mb-0.5 leading-tight">{message.title}</h4>
      )}

      {message.description && (
        <p className="text-xs text-gray-400 leading-relaxed">
          {message.description.split(/(\*\*.*?\*\*)/).map((part, i) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      )}

      {message.type === 'objection' && message.metadata?.objection ? (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400 bg-black/30 rounded px-2 py-1.5 border border-white/5">
          <Target size={10} className="shrink-0 text-yellow-400" />
          <span className="font-medium text-gray-500">Objeção:</span>
          <span>{String(message.metadata.objection)}</span>
        </div>
      ) : null}

      {message.metadata?.suggested_response ? (
        <div className="mt-2 text-[11px] bg-green-500/[0.08] rounded px-2 py-1.5 border border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1 font-semibold text-green-400">
            <MessageCircle size={10} className="shrink-0" />
            Resposta ao cliente
          </div>
          <p className="text-gray-300 leading-relaxed">{String(message.metadata.suggested_response)}</p>
        </div>
      ) : null}

      {message.metadata?.suggested_question ? (
        <div className="mt-2 text-[11px] bg-white/[0.03] rounded px-2 py-1.5 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1 font-semibold text-gray-500">
            <Lightbulb size={10} className="shrink-0" />
            Pergunta sugerida
          </div>
          <p className="text-gray-300 leading-relaxed font-medium">{String(message.metadata.suggested_question)}</p>
        </div>
      ) : null}
    </div>
  )
}

export function CoachingPanel({ messages, currentSpinPhase, onDismiss }: CoachingPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeMessages = messages.filter(m => !m.isDismissed)

  // Auto-scroll to latest card
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeMessages.length])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <span className="material-icons-outlined text-lg" style={{ color: NEON_PINK }}>psychology</span>
        <h3 className="text-sm font-semibold text-white">Coach IA</h3>
        <span className="text-xs text-gray-500 ml-auto">{activeMessages.length} sugestões</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-pink">
        <SpinIndicator currentPhase={currentSpinPhase} />

        {activeMessages.map(msg => (
          <CoachCard key={msg.id} message={msg} onDismiss={onDismiss} />
        ))}

        {activeMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
            {currentSpinPhase ? (
              <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-pink-500 animate-spin" />
            ) : (
              <>
                <span className="material-icons-outlined text-4xl mb-2 opacity-30">psychology</span>
                <p className="text-xs text-gray-600">Sugestões aparecerão aqui</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
