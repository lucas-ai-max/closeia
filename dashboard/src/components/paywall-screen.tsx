'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Sparkles, Check, Loader2, Rocket, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const NEON_PINK = '#ff007a'
const NEON_GREEN = '#00ff94'

interface QuickPlan {
  readonly slug: string
  readonly name: string
  readonly price: string
  readonly trial?: string
  readonly highlight: string
  readonly isPopular?: boolean
}

const QUICK_PLANS: readonly QuickPlan[] = [
  {
    slug: 'STARTER',
    name: 'Starter',
    price: 'R$ 397/mês',
    trial: '7 dias grátis',
    highlight: '2 vendedores · 25h de calls',
  },
  {
    slug: 'PRO',
    name: 'Pro',
    price: 'R$ 897/mês',
    highlight: '5 vendedores · 70h de calls',
    isPopular: true,
  },
  {
    slug: 'TEAM',
    name: 'Team',
    price: 'R$ 1.997/mês',
    highlight: '10 vendedores · 200h de calls',
  },
] as const

export function PaywallScreen() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  async function handleCheckout(planSlug: string): Promise<void> {
    setCheckoutLoading(planSlug)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug, mode: 'subscription' }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Erro ao criar checkout')
      }
      window.location.href = data.checkoutUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar checkout')
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ backgroundColor: `${NEON_PINK}15` }}>
        <Lock className="w-10 h-10" style={{ color: NEON_PINK }} />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
        Ative seu plano para começar
      </h1>
      <p className="text-gray-400 text-lg max-w-lg mb-2">
        Para acessar o coaching IA em tempo real, análises de chamadas e todas as funcionalidades, escolha um plano.
      </p>
      <p className="text-sm mb-10" style={{ color: NEON_GREEN }}>
        <Sparkles className="w-4 h-4 inline mr-1" />
        Comece com o Starter e ganhe 7 dias grátis para testar!
      </p>

      <div className="grid gap-4 sm:grid-cols-3 w-full max-w-3xl mb-8">
        {QUICK_PLANS.map((plan) => (
          <div
            key={plan.slug}
            className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
              plan.isPopular
                ? 'border-neon-pink/50 bg-[#14151A]/80 ring-1 ring-neon-pink/30 shadow-[0_0_40px_-10px_rgba(255,0,122,0.2)]'
                : 'border-[#2A2A2A] bg-[#14151A]/60 hover:border-white/15'
            }`}
          >
            {plan.isPopular && (
              <span
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: NEON_PINK }}
              >
                Mais popular
              </span>
            )}
            {plan.trial && (
              <span
                className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ color: NEON_GREEN, backgroundColor: `${NEON_GREEN}15`, border: `1px solid ${NEON_GREEN}30` }}
              >
                {plan.trial}
              </span>
            )}

            <h3 className="text-lg font-semibold text-white mt-1">{plan.name}</h3>
            <p className="text-xl font-bold text-white mt-1">{plan.price}</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">{plan.highlight}</p>

            <button
              type="button"
              onClick={() => handleCheckout(plan.slug)}
              disabled={!!checkoutLoading}
              className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: plan.isPopular ? NEON_PINK : 'rgba(255,255,255,0.08)',
                ...(plan.isPopular ? { boxShadow: '0 0 20px -5px rgba(255,0,122,0.4)' } : {}),
              }}
            >
              {checkoutLoading === plan.slug ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              {plan.trial ? 'Testar grátis' : 'Assinar agora'}
            </button>
          </div>
        ))}
      </div>

      <Link
        href="/billing"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
      >
        Ver todos os planos e detalhes
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
