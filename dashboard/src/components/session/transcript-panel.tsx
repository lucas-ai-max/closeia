'use client'

import { useEffect, useRef } from 'react'
import type { TranscriptChunk } from '@/hooks/use-web-session'

interface TranscriptPanelProps {
  transcript: TranscriptChunk[]
}

const NEON_PINK = '#ff007a'

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <span className="material-icons-outlined text-lg" style={{ color: NEON_PINK }}>subtitles</span>
        <h3 className="text-sm font-semibold text-white">Transcrição</h3>
        <span className="text-xs text-gray-500 ml-auto">{transcript.filter(t => t.isFinal).length} mensagens</span>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-pink"
      >
        {transcript.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <span className="material-icons-outlined text-4xl mb-2 opacity-30">mic</span>
            <p className="text-sm">Aguardando conversa...</p>
            <p className="text-xs mt-1 text-gray-600">A transcrição aparecerá aqui em tempo real</p>
          </div>
        )}
        {transcript.filter(t => t.isFinal).map((chunk) => (
          <div
            key={chunk.id}
            className={`flex gap-3 ${chunk.role === 'seller' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                backgroundColor: chunk.role === 'seller' ? `${NEON_PINK}20` : 'rgba(255,255,255,0.08)',
                color: chunk.role === 'seller' ? NEON_PINK : '#999',
              }}
            >
              {chunk.role === 'seller' ? 'V' : 'L'}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 ${
                chunk.role === 'seller'
                  ? 'bg-pink-500/10 border border-pink-500/20'
                  : 'bg-white/5 border border-white/5'
              }`}
            >
              <p className="text-xs font-semibold mb-0.5" style={{
                color: chunk.role === 'seller' ? NEON_PINK : '#888',
              }}>
                {chunk.speaker}
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">{chunk.text}</p>
            </div>
          </div>
        ))}

        {/* Non-final (streaming) indicator */}
        {transcript.some(t => !t.isFinal) && (
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Transcrevendo...</span>
          </div>
        )}
      </div>
    </div>
  )
}
