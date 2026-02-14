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
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Erro ao fazer login. Verifique suas credenciais.')
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: '#121212' }}
    >
      {/* Form side */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div
              className="p-8 rounded-[24px] border bg-card-dark"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: NEON_PINK,
                    boxShadow: '0 0 15px rgba(255,0,122,0.4)',
                  }}
                >
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">
                  CloseIA
                </span>
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
                    className="w-full px-4 py-3 rounded-xl text-white placeholder:text-gray-600 border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent transition-colors"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder:text-gray-600 border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white border-0 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:ring-offset-2 focus:ring-offset-card-dark disabled:opacity-50 transition-opacity"
                  style={{
                    backgroundColor: NEON_PINK,
                    boxShadow: '0 0 20px rgba(255,0,122,0.3)',
                  }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-card-dark text-gray-500">
                      Ou continue com
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="mt-6 w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 focus:outline-none transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </div>
              <p className="mt-8 text-center text-sm text-gray-500">
                Não tem uma conta?{' '}
                <Link
                  href="/register"
                  className="font-semibold transition-opacity hover:opacity-90"
                  style={{ color: NEON_PINK }}
                >
                  Criar conta
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
        <div className="relative z-10 flex flex-col items-start justify-center text-left p-12 w-full max-w-lg">
          <h2
            className="text-4xl font-bold text-white mb-4 md:text-5xl"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
          >
            Potencialize suas vendas
          </h2>
          <p
            className="text-white text-xl font-medium max-w-md md:text-2xl leading-relaxed"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
          >
            Coaching em tempo real powered by IA. Scripts, métricas e equipe em um só lugar.
          </p>
        </div>
      </div>
    </div>
  )
}
