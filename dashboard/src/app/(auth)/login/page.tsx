'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

const NEON_PINK = '#ff007a'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const [resending, setResending] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setShowResendConfirmation(false)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message === 'Email not confirmed') {
        setShowResendConfirmation(true)
        toast.error('E-mail ainda não confirmado. Verifique sua caixa de entrada.')
      } else if (error.message === 'Invalid login credentials') {
        toast.error('E-mail ou senha incorretos.')
      } else {
        toast.error('Erro ao fazer login. Tente novamente.')
      }
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error('Digite seu e-mail acima primeiro.')
      return
    }
    setResending(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      toast.error('Erro ao reenviar. Tente novamente em alguns minutos.')
    } else {
      toast.success('E-mail de confirmação reenviado! Verifique sua caixa de entrada.')
    }
    setResending(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl text-white placeholder:text-gray-600 border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent transition-colors text-sm'

  return (
    <div
      className="flex min-h-screen"
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
      <div
        className="fixed bottom-0 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, rgba(0,209,255,0.06) 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      {/* Form side */}
      <div className="w-full lg:w-1/2 flex flex-col relative z-10">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
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
              <h1 className="text-2xl font-bold text-white mb-1">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                Entre com suas credenciais para acessar o dashboard
              </p>
              <form className="space-y-5" onSubmit={handleLogin}>
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
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-400">
                      Senha
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ color: NEON_PINK }}
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
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
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
              {showResendConfirmation && (
                <div className="mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
                  <p className="text-xs text-amber-200 mb-2">Seu e-mail ainda não foi confirmado.</p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending}
                    className="text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ color: NEON_PINK }}
                  >
                    {resending ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
                  </button>
                </div>
              )}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/8" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span
                      className="px-3 text-gray-500"
                      style={{ backgroundColor: '#0B0C10' }}
                    >
                      Ou continue com
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="mt-6 w-full flex justify-center items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium text-gray-300 border border-white/10 hover:border-white/20 focus:outline-none transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continuar com Google
                </button>
              </div>
              <p className="mt-8 text-center text-sm text-gray-500">
                Não tem uma conta?{' '}
                <Link
                  href="/register"
                  className="font-semibold transition-opacity hover:opacity-90"
                  style={{ color: NEON_PINK }}
                >
                  Criar conta grátis
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - branding */}
      <div
        className="hidden lg:flex lg:w-1/2 rounded-l-3xl overflow-hidden relative bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: 'url(/bg2.jpg)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,0,0,0.75) 0%, transparent 70%)',
          }}
          aria-hidden
        />
        {/* Neon glow accent */}
        <div
          className="absolute bottom-0 left-0 w-full h-1/2 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${NEON_PINK}10 0%, transparent 60%)`,
          }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-start justify-center text-left p-12 w-full max-w-lg">
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6"
            style={{
              color: '#fff',
              background: `linear-gradient(135deg, ${NEON_PINK}, #ff3d9a)`,
              boxShadow: `0 0 20px ${NEON_PINK}50, 0 0 40px ${NEON_PINK}20`,
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse bg-white" />
            Coach IA
          </div>
          <h2
            className="text-4xl font-bold text-white mb-4 md:text-5xl leading-tight"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
          >
            Potencialize suas{' '}
            <span
              style={{
                background: `linear-gradient(135deg, ${NEON_PINK}, #ff3d9a)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              vendas
            </span>
          </h2>
          <p
            className="text-gray-300 text-lg max-w-md md:text-xl leading-relaxed"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
          >
            A IA escuta a chamada e sugere o que falar na hora. Scripts, métricas e equipe em um só lugar.
          </p>
          {/* Stats */}
          <div className="flex gap-8 mt-10">
            {[
              { value: '2 min', label: 'para configurar' },
              { value: '100%', label: 'em tempo real' },
              { value: '0', label: 'integrações necessárias' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-2xl font-bold mb-1"
                  style={{
                    background: `linear-gradient(135deg, #fff, ${NEON_PINK})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
