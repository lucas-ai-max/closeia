'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

const NEON_PINK = '#ff007a'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Erro ao atualizar senha. Tente novamente.')
    } else {
      toast.success('Senha atualizada com sucesso!')
      router.push('/dashboard')
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
      {/* Glow decoration */}
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
          <h1 className="text-2xl font-bold text-white mb-1">
            Nova senha
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Crie uma nova senha para sua conta
          </p>
          <form className="space-y-5" onSubmit={handleReset}>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Nova senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Confirmar senha
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                minLength={6}
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
              {loading ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-gray-500">
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
