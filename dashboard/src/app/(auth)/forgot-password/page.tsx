'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { toast } from 'sonner'

const NEON_PINK = '#ff007a'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast.error('Erro ao enviar email. Verifique o endereço informado.')
    } else {
      setSent(true)
      toast.success('Email enviado! Verifique sua caixa de entrada.')
    }
    setLoading(false)
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl text-white placeholder:text-gray-600 border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent transition-colors text-sm'

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#0B0C10' }}
    >
      {/* Glow decorations */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${NEON_PINK}15 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      <div className="w-full max-w-md p-6 relative z-10">
        <div
          className="p-8 rounded-[24px] border"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            boxShadow: `0 0 60px ${NEON_PINK}08, 0 4px 30px rgba(0,0,0,0.3)`,
          }}
        >
          <div className="flex items-center mb-8">
            <img src="/logo-closer-white.png" alt="HelpCloser" className="h-10 w-auto" />
          </div>

          {sent ? (
            <>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-6 mx-auto"
                style={{
                  background: `linear-gradient(135deg, ${NEON_PINK}20, ${NEON_PINK}10)`,
                  border: `1px solid ${NEON_PINK}30`,
                }}
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke={NEON_PINK} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2 text-center">
                Verifique seu email
              </h1>
              <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
                Enviamos um link de recuperação para <span className="text-white font-medium">{email}</span>. Clique no link para criar uma nova senha.
              </p>
              <p className="text-gray-500 text-xs text-center mb-6">
                Não recebeu? Verifique sua pasta de spam ou tente novamente.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-gray-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                Enviar novamente
              </button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">
                Recuperar senha
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                Informe seu email e enviaremos um link para redefinir sua senha
              </p>
              <form className="space-y-5" onSubmit={handleReset}>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="seu@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white border-0 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${NEON_PINK}, #ff3d9a)`,
                    boxShadow: `0 0 24px ${NEON_PINK}40, 0 0 48px ${NEON_PINK}15`,
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            Lembrou a senha?{' '}
            <Link
              href="/login"
              className="font-semibold transition-opacity hover:opacity-90"
              style={{ color: NEON_PINK }}
            >
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
