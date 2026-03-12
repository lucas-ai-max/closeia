'use client'

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import Link from 'next/link'
import { Lock, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type PlanSlug,
  type FeatureKey,
  getPlanLimits,
  hasFeature,
  getMinimumPlanForFeature,
  FEATURE_NAMES,
} from '@/lib/plan-limits'

const NEON_PINK = '#ff007a'
const NEON_GREEN = '#00ff94'

// Cache plan data to avoid refetching on every component mount
let _planCache: { data: any; fetchedAt: number } | null = null
const PLAN_CACHE_TTL = 60_000 // 1 minute

// Plan context for caching plan data across components
interface PlanContextValue {
  plan: PlanSlug
  loading: boolean
  usage: {
    currentSellers: number
    currentCallHoursThisMonth: number
  }
  limits: {
    maxSellers: number
    maxCallHoursPerMonth: number
  }
  canStartCall: boolean
  canAddSeller: boolean
  refresh: () => Promise<void>
}

const PlanContext = createContext<PlanContextValue | null>(null)

export function usePlanContext() {
  const ctx = useContext(PlanContext)
  if (!ctx) {
    throw new Error('usePlanContext must be used within PlanProvider')
  }
  return ctx
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanSlug>('FREE')
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState({ currentSellers: 0, currentCallHoursThisMonth: 0 })
  const [limits, setLimits] = useState({ maxSellers: 0, maxCallHoursPerMonth: 0 })
  const [canStartCall, setCanStartCall] = useState(false)
  const [canAddSeller, setCanAddSeller] = useState(false)

  const refresh = useCallback(async () => {
    try {
      // Use cached data if fresh enough
      if (_planCache && Date.now() - _planCache.fetchedAt < PLAN_CACHE_TTL) {
        const data = _planCache.data
        setPlan(data.plan)
        setUsage(data.usage)
        setLimits(data.limits)
        setCanStartCall(data.canStartCall)
        setCanAddSeller(data.canAddSeller)
        setLoading(false)
        return
      }

      const response = await fetch('/api/billing/limits')
      if (response.ok) {
        const data = await response.json()
        _planCache = { data, fetchedAt: Date.now() }
        setPlan(data.plan)
        setUsage(data.usage)
        setLimits(data.limits)
        setCanStartCall(data.canStartCall)
        setCanAddSeller(data.canAddSeller)
      }
    } catch (err) {
      console.error('Failed to fetch plan limits:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <PlanContext.Provider
      value={{ plan, loading, usage, limits, canStartCall, canAddSeller, refresh }}
    >
      {children}
    </PlanContext.Provider>
  )
}

// Hook to check if current plan has a feature
export function useHasFeature(feature: FeatureKey): boolean {
  const { plan, loading } = usePlanContext()
  if (loading) return false
  return hasFeature(plan, feature)
}

// Hook to check plan limits
export function usePlanLimits() {
  const { plan, loading, usage, limits, canStartCall, canAddSeller } = usePlanContext()
  return {
    plan,
    loading,
    usage,
    limits,
    canStartCall,
    canAddSeller,
    planLimits: getPlanLimits(plan),
  }
}

interface FeatureGateProps {
  feature: FeatureKey
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Conditionally renders children based on plan feature access.
 * Shows upgrade prompt if feature is not available.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { plan, loading } = usePlanContext()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  const hasAccess = hasFeature(plan, feature)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return <UpgradePrompt feature={feature} currentPlan={plan} />
}

interface UpgradePromptProps {
  feature: FeatureKey
  currentPlan: PlanSlug
}

/**
 * Shows an upgrade prompt for a locked feature.
 */
export function UpgradePrompt({ feature, currentPlan }: UpgradePromptProps) {
  const minimumPlan = getMinimumPlanForFeature(feature)
  const featureName = FEATURE_NAMES[feature]

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ backgroundColor: `${NEON_PINK}15` }}
      >
        <Lock className="w-10 h-10" style={{ color: NEON_PINK }} />
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
        {featureName}
      </h2>

      <p className="text-gray-400 text-lg max-w-md mb-6">
        Esta funcionalidade requer o plano <span className="font-semibold text-white">{minimumPlan}</span> ou superior.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/billing"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: NEON_PINK, boxShadow: '0 0 20px -5px rgba(255,0,122,0.4)' }}
        >
          <Sparkles className="w-4 h-4" />
          Fazer upgrade
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Seu plano atual: <span className="text-gray-400">{currentPlan}</span>
      </p>
    </div>
  )
}

interface LimitWarningProps {
  type: 'sellers' | 'hours'
  current: number
  max: number
}

/**
 * Shows a warning banner when approaching or at limits.
 * Does NOT show for FREE plan (max = 0) since PaywallScreen handles that.
 */
export function LimitWarning({ type, current, max }: LimitWarningProps) {
  // Don't show for unlimited plans
  if (max === -1) return null

  // Don't show for FREE plan (max = 0) - PaywallScreen handles this
  if (max === 0) return null

  const percentage = max > 0 ? (current / max) * 100 : 0
  const isAtLimit = current >= max
  const isNearLimit = percentage >= 80

  if (!isAtLimit && !isNearLimit) return null

  const typeLabel = type === 'sellers' ? 'vendedores' : 'horas de calls'
  const remainingLabel = type === 'sellers' ? 'vagas' : 'horas'

  return (
    <div
      className={`rounded-xl px-4 py-3 mb-4 border ${
        isAtLimit
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
      }`}
    >
      <div className="flex items-center gap-3">
        <Lock className="w-5 h-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {isAtLimit
              ? `Limite de ${typeLabel} atingido`
              : `Quase no limite de ${typeLabel}`}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {current} de {max} {remainingLabel} utilizadas
            {!isAtLimit && ` (${Math.round(max - current)} restantes)`}
          </p>
        </div>
        <Link
          href="/billing"
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
        >
          Upgrade
        </Link>
      </div>
    </div>
  )
}

/**
 * Hook to get limit warning data
 */
export function useLimitWarnings() {
  const { usage, limits } = usePlanContext()

  return {
    sellers: {
      current: usage.currentSellers,
      max: limits.maxSellers,
      isAtLimit: limits.maxSellers !== -1 && usage.currentSellers >= limits.maxSellers,
      isNearLimit:
        limits.maxSellers !== -1 && (usage.currentSellers / limits.maxSellers) * 100 >= 80,
    },
    hours: {
      current: usage.currentCallHoursThisMonth,
      max: limits.maxCallHoursPerMonth,
      isAtLimit:
        limits.maxCallHoursPerMonth !== -1 &&
        usage.currentCallHoursThisMonth >= limits.maxCallHoursPerMonth,
      isNearLimit:
        limits.maxCallHoursPerMonth !== -1 &&
        (usage.currentCallHoursThisMonth / limits.maxCallHoursPerMonth) * 100 >= 80,
    },
  }
}
