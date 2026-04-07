'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Check, Loader2, ExternalLink, Sparkles, Clock, Plus, Minus } from 'lucide-react'
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
      '25h de calls/mês',
      'Coaching IA em tempo real',
      'Detecção de objeções',
      'Indicador SPIN',
      'Dashboard básico',
    ],
    extra: 'R$ 10/h adicional',
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
      '70h de calls/mês',
      'Coaching IA em tempo real',
      'Histórico de chamadas',
      'Resumo pós-call',
      'Análise completa da chamada',
      'Analytics avançado',
      'Ranking de vendedores',
      'Dashboard manager',
      'Reprocessamento de análise',
    ],
    extra: 'R$ 9/h adicional',
  },
  {
    slug: 'TEAM',
    name: 'Team',
    price: 'R$ 1.997',
    period: '/mês',
    description: 'Para times maiores com visibilidade completa.',
    features: [
      '10 vendedores',
      '200h de calls/mês',
      'Torre de comando ao vivo',
      'Manager Whisper',
      'Coaching IA em tempo real',
      'Análise avançada',
      'KPIs avançados',
      'Histórico completo',
      'Gestão de equipe',
    ],
    extra: 'R$ 8/h adicional',
  },
  {
    slug: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Personalizado',
    period: '',
    description: 'Plano 100% adaptado à sua operação.',
    isContact: true,
    contactUrl: 'https://wa.me/5511999999999?text=Quero%20conhecer%20o%20plano%20Enterprise%20do%20HelpCloser',
    features: [
      'Vendedores ilimitados',
      'Horas de calls sob demanda',
      'Todas as funcionalidades inclusas',
      'Onboarding dedicado',
      'Integrações personalizadas',
      'Suporte prioritário',
      'SLA dedicado',
      'Gerente de conta exclusivo',
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
  const [extraHours, setExtraHours] = useState(5)
  const [extraHoursLoading, setExtraHoursLoading] = useState(false)
  const [usageData, setUsageData] = useState<{
    planHours: number
    extraHoursPurchased: number
    usedHours: number
    remainingHours: number
    purchases: Array<{ id: string; hours: number; amount_cents: number; status: string; paid_at: string | null }>
  } | null>(null)
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

      // Load usage data
      try {
        const res = await fetch('/api/billing/limits')
        if (res.ok) {
          const data = await res.json()
          setUsageData({
            planHours: data.limits?.maxCallHoursPerMonth ?? 0,
            extraHoursPurchased: data.extraHours?.purchased ?? 0,
            usedHours: data.usage?.currentCallHoursThisMonth ?? 0,
            remainingHours: data.remaining?.callHours ?? 0,
            purchases: (data.extraHours?.purchases ?? []).filter((p: { status: string }) => p.status === 'paid'),
          })
        }
      } catch { /* ignore */ }
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

  const extraHourPrices: Record<string, number> = { STARTER: 10, PRO: 9, TEAM: 8 }
  const extraHourPrice = extraHourPrices[currentPlan] || 0
  const extraHoursTotal = extraHourPrice * extraHours

  async function handleExtraHoursCheckout() {
    setExtraHoursLoading(true)
    try {
      const response = await fetch('/api/billing/extra-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: extraHours }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erro ao criar checkout')
      window.location.href = data.checkoutUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao comprar horas extras')
      setExtraHoursLoading(false)
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

        {/* Usage Overview */}
        {usageData && currentPlan !== 'FREE' && (
          <div className="rounded-2xl border p-6" style={CARD_STYLE}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${NEON_GREEN}15` }}>
                <Clock className="w-5 h-5" style={{ color: NEON_GREEN }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Uso de Horas do Mês</h3>
                <p className="text-sm text-gray-500">Plano {currentPlan} · {usageData.planHours}h/mês</p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-4">
              {/* Plan hours */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-400">Horas do Plano</span>
                  <span className="text-sm text-white font-medium">
                    {Math.min(usageData.usedHours, usageData.planHours).toFixed(1)}h / {usageData.planHours}h
                  </span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (usageData.usedHours / usageData.planHours) * 100)}%`,
                      backgroundColor: usageData.usedHours >= usageData.planHours ? '#ef4444' : NEON_GREEN,
                      boxShadow: `0 0 8px ${usageData.usedHours >= usageData.planHours ? '#ef4444' : NEON_GREEN}`,
                    }}
                  />
                </div>
              </div>

              {/* Extra hours (if purchased) */}
              {usageData.extraHoursPurchased > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-400">Horas Extras Compradas</span>
                    <span className="text-sm text-white font-medium">
                      {Math.max(0, usageData.usedHours - usageData.planHours).toFixed(1)}h / {usageData.extraHoursPurchased}h
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (Math.max(0, usageData.usedHours - usageData.planHours) / usageData.extraHoursPurchased) * 100)}%`,
                        backgroundColor: NEON_PINK,
                        boxShadow: `0 0 8px ${NEON_PINK}`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                <div>
                  <p className="text-2xl font-bold text-white">{usageData.usedHours.toFixed(1)}<span className="text-sm text-gray-500">h</span></p>
                  <p className="text-xs text-gray-500">Usadas</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <p className="text-2xl font-bold" style={{ color: NEON_GREEN }}>{usageData.remainingHours.toFixed(1)}<span className="text-sm text-gray-500">h</span></p>
                  <p className="text-xs text-gray-500">Restantes</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <p className="text-2xl font-bold text-white">{usageData.planHours + usageData.extraHoursPurchased}<span className="text-sm text-gray-500">h</span></p>
                  <p className="text-xs text-gray-500">Total disponível</p>
                </div>
                {usageData.extraHoursPurchased > 0 && (
                  <>
                    <div className="w-px h-10 bg-white/10" />
                    <div>
                      <p className="text-2xl font-bold" style={{ color: NEON_PINK }}>{usageData.extraHoursPurchased}<span className="text-sm text-gray-500">h</span></p>
                      <p className="text-xs text-gray-500">Extras compradas</p>
                    </div>
                  </>
                )}
              </div>

              {/* Purchase history */}
              {usageData.purchases.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Compras deste mês</p>
                  <div className="space-y-1">
                    {usageData.purchases.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs text-gray-400">
                        <span>{p.hours}h extras</span>
                        <span>R$ {(p.amount_cents / 100).toFixed(0)}</span>
                        <span className="text-green-400">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('pt-BR') : 'Pago'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Extra Hours Purchase */}
        {currentPlan !== 'FREE' && currentPlan !== 'ENTERPRISE' && extraHourPrice > 0 && (
          <div className="rounded-2xl border p-6" style={CARD_STYLE}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${NEON_PINK}15` }}>
                <Clock className="w-5 h-5" style={{ color: NEON_PINK }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Horas Extras</h3>
                <p className="text-sm text-gray-500">Compre horas adicionais de coaching quando precisar</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Quantity selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">Quantidade:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtraHours(Math.max(5, extraHours - 5))}
                    disabled={extraHours <= 5}
                    className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-16 text-center text-xl font-bold text-white">{extraHours}h</span>
                  <button
                    type="button"
                    onClick={() => setExtraHours(extraHours + 5)}
                    className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price info */}
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  <span className="text-white font-medium">R$ {extraHourPrice}</span>/hora ({currentPlan})
                </div>
                <div className="text-xs text-gray-600">|</div>
                <div className="text-lg font-bold text-white">
                  R$ {extraHoursTotal.toFixed(0)}
                </div>
              </div>

              {/* Buy button */}
              <button
                type="button"
                onClick={handleExtraHoursCheckout}
                disabled={extraHoursLoading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                style={{ backgroundColor: NEON_PINK }}
              >
                {extraHoursLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `Comprar ${extraHours} horas`
                )}
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-600">
              Mínimo de 5 horas. As horas extras são válidas para o mês atual e somam ao limite do seu plano.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
