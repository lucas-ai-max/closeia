'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Check, Loader2, ExternalLink, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

const NEON_PINK = '#ff007a'
const NEON_GREEN = '#00ff94'
const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.08)' }

interface PlanDefinition {
  slug: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  extra?: string
  trial?: string
  popular?: boolean
  isContact?: boolean
  contactUrl?: string
}

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    slug: 'STARTER',
    name: 'Starter',
    price: 'R$ 397',
    period: '/mês',
    description: 'Para vendedores que querem vender mais.',
    trial: '7 dias grátis',
    features: [
      '2 vendedores',
      '15h de calls/mês',
      'Coaching IA em tempo real',
      'Detecção de objeções',
      'Indicador SPIN',
      'Histórico de chamadas',
      'Resumo pós-call',
      'Dashboard básico',
    ],
    extra: 'R$ 8/h adicional',
  },
  {
    slug: 'PRO',
    name: 'Pro',
    price: 'R$ 897',
    period: '/mês',
    description: 'Para equipes de vendas estruturadas.',
    popular: true,
    features: [
      '5 vendedores',
      '60h de calls/mês',
      'Coaching IA em tempo real',
      'Detecção de objeções',
      'Indicador SPIN',
      'Análise completa da chamada',
      'Analytics avançado',
      'Ranking de vendedores',
      'Dashboard manager',
      'Reprocessamento de análise',
    ],
    extra: 'R$ 7/h adicional',
  },
  {
    slug: 'TEAM',
    name: 'Team',
    price: 'R$ 1.797',
    period: '/mês',
    description: 'Para times maiores com visibilidade completa.',
    features: [
      '10 vendedores',
      '150h de calls/mês',
      'Torre de comando ao vivo',
      'Manager Whisper',
      'Coaching IA em tempo real',
      'Análise avançada',
      'KPIs avançados',
      'Histórico completo',
      'Gestão de equipe',
    ],
  },
  {
    slug: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'R$ 3.997',
    period: '/mês',
    description: 'Para operações de vendas grandes.',
    isContact: true,
    contactUrl: 'https://wa.me/5511999999999?text=Quero%20conhecer%20o%20plano%20Enterprise',
    features: [
      '50 vendedores',
      '400h de calls/mês',
      'Suporte prioritário',
      'Onboarding dedicado',
      'Integrações personalizadas',
      'Relatórios avançados',
      'SLA dedicado',
    ],
  },
]

export default function BillingPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState('FREE')
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const supabase = createClient()

  const loadBillingData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      const orgId = (profile as { organization_id: string | null } | null)?.organization_id
      if (!orgId) return
      const { data: org } = await supabase
        .from('organizations')
        .select('plan, stripe_customer_id')
        .eq('id', orgId)
        .single()
      if (org) {
        const orgRow = org as { plan?: string; stripe_customer_id?: string }
        setCurrentPlan(orgRow.plan ?? 'FREE')
        setHasStripeCustomer(!!orgRow.stripe_customer_id)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    setMounted(true)
    loadBillingData()
  }, [loadBillingData])

  async function handleCheckout(planSlug: string) {
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

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Erro ao abrir portal')
      }
      window.location.href = data.portalUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir portal')
      setPortalLoading(false)
    }
  }

  function getPlanOrder(slug: string): number {
    const order: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2, TEAM: 3, ENTERPRISE: 4 }
    return order[slug] ?? 0
  }

  if (!mounted || loading) {
    return (
      <>
        <DashboardHeader title="Planos e Billing" />
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </>
    )
  }

  const currentPlanOrder = getPlanOrder(currentPlan)

  return (
    <>
      <DashboardHeader title="Planos e Billing" />
      <div className="space-y-8 w-full">
        {hasStripeCustomer && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePortal}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Gerenciar assinatura
            </button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_DEFINITIONS.map((plan) => {
            const planOrder = getPlanOrder(plan.slug)
            const isCurrentPlan = currentPlan === plan.slug
            const isUpgrade = planOrder > currentPlanOrder
            const isDowngrade = planOrder < currentPlanOrder && planOrder > 0

            return (
              <div
                key={plan.slug}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                  isCurrentPlan
                    ? 'border-neon-green/50 bg-[#14151A]/80 ring-1 ring-neon-green/20'
                    : plan.popular
                      ? 'border-neon-pink/50 bg-[#14151A]/80 ring-1 ring-neon-pink/30 shadow-[0_0_40px_-10px_rgba(255,0,122,0.15)]'
                      : 'border-[#2A2A2A] bg-[#14151A]/60 hover:border-white/10'
                }`}
                style={!isCurrentPlan && !plan.popular ? CARD_STYLE : undefined}
              >
                {isCurrentPlan && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: NEON_GREEN, color: '#000' }}>
                    Plano atual
                  </span>
                )}
                {!isCurrentPlan && plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: NEON_PINK }}>
                    Mais popular
                  </span>
                )}

                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                {plan.trial && !isCurrentPlan && (
                  <div className="mt-3 px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 text-xs font-semibold text-center" style={{ color: NEON_GREEN, borderColor: `${NEON_GREEN}30`, backgroundColor: `${NEON_GREEN}10` }}>
                    {plan.trial}
                  </div>
                )}

                <ul className="mt-5 space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: NEON_GREEN }} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.extra && (
                  <p className="mt-3 text-xs text-gray-500 border-t border-white/5 pt-3">
                    + {plan.extra}
                  </p>
                )}

                {isCurrentPlan ? (
                  <div className="mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold border border-neon-green/30 text-neon-green bg-neon-green/5">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Plano ativo
                  </div>
                ) : plan.isContact ? (
                  <a
                    href={plan.contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold border border-[#2A2A2A] bg-white/5 text-white hover:bg-white/10 transition-all"
                  >
                    Falar com vendas
                  </a>
                ) : isUpgrade ? (
                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.slug)}
                    disabled={!!checkoutLoading}
                    className="mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 20px -5px rgba(255,0,122,0.4)' }}
                  >
                    {checkoutLoading === plan.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {plan.trial ? 'Testar 7 dias grátis' : 'Fazer upgrade'}
                  </button>
                ) : isDowngrade ? (
                  <button
                    type="button"
                    onClick={handlePortal}
                    disabled={portalLoading || !hasStripeCustomer}
                    className="mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold border border-[#2A2A2A] bg-white/5 text-gray-400 hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    Alterar plano
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.slug)}
                    disabled={!!checkoutLoading}
                    className="mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold border border-[#2A2A2A] bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {checkoutLoading === plan.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Assinar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
