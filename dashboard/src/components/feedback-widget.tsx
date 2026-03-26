'use client'

import { useState } from 'react'

const NEON_PINK = '#ff007a'

const TYPES = [
  { value: 'bug', label: 'Bug', icon: 'bug_report', color: '#ef4444', desc: 'Algo quebrado' },
  { value: 'suggestion', label: 'Sugestão', icon: 'lightbulb', color: '#f59e0b', desc: 'Ideia de melhoria' },
  { value: 'praise', label: 'Elogio', icon: 'favorite', color: '#22c55e', desc: 'Feedback positivo' },
] as const

type FeedbackType = typeof TYPES[number]['value']

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const reset = () => {
    setType(null)
    setTitle('')
    setDescription('')
    setSent(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type || !title.trim() || !description.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          page_url: window.location.href,
        }),
      })
      if (res.ok) {
        setSent(true)
        setTimeout(() => {
          setOpen(false)
          reset()
        }, 2000)
      }
    } catch {}
    setSending(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); reset() }}
        className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
        style={{ backgroundColor: NEON_PINK }}
        title="Enviar feedback"
      >
        <span className="material-icons-outlined text-white text-xl">chat</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ backgroundColor: '#141414' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-base font-bold text-white">Enviar Feedback</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <span className="material-icons-outlined text-xl">close</span>
              </button>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-emerald-500/20">
                  <span className="material-icons-outlined text-3xl text-emerald-400">check_circle</span>
                </div>
                <p className="text-white font-semibold">Obrigado pelo feedback!</p>
                <p className="text-gray-500 text-sm mt-1">Vamos analisar e usar para melhorar o HelpCloser.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Type selector */}
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        type === t.value
                          ? 'border-white/20 bg-white/10'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                      }`}
                    >
                      <span className="material-icons-outlined text-xl" style={{ color: t.color }}>{t.icon}</span>
                      <span className="text-xs font-medium text-white">{t.label}</span>
                      <span className="text-[10px] text-gray-600">{t.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Title */}
                <div>
                  <input
                    type="text"
                    placeholder="Título (resumo curto)"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={200}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 bg-white/5 border border-white/10 focus:outline-none focus:border-pink-500 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <textarea
                    placeholder={type === 'bug'
                      ? 'Descreva o que aconteceu, o que esperava e como reproduzir...'
                      : type === 'suggestion'
                      ? 'Descreva sua ideia de melhoria...'
                      : 'Conte o que está gostando...'
                    }
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    maxLength={5000}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 bg-white/5 border border-white/10 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!type || !title.trim() || description.trim().length < 10 || sending}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: NEON_PINK }}
                >
                  {sending ? 'Enviando...' : 'Enviar Feedback'}
                </button>

                <p className="text-[10px] text-gray-600 text-center">
                  A página atual é enviada automaticamente para contexto.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
