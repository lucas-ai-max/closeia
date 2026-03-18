'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrgNullForm } from '@/components/org-null-form'
import { OrgCompleteBanner } from '@/components/org-complete-banner'
import { PaywallScreen } from '@/components/paywall-screen'
import { PlanProvider, FeatureGate, LimitWarning, useLimitWarnings, usePlanContext } from '@/components/feature-gate'
import { getRequiredFeature, type FeatureKey } from '@/lib/plan-limits'
import { Loader2 } from 'lucide-react'

const FREE_ALLOWED_ROUTES = ['/billing', '/billing/success', '/billing/cancel', '/settings'] as const

function isRouteAllowedForFree(pathname: string): boolean {
  return FREE_ALLOWED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

interface DashboardContentGuardProps {
  children: React.ReactNode
}

function LimitWarnings() {
  const warnings = useLimitWarnings()

  return (
    <>
      {(warnings.sellers.isAtLimit || warnings.sellers.isNearLimit) && (
        <LimitWarning
          type="sellers"
          current={warnings.sellers.current}
          max={warnings.sellers.max}
        />
      )}
      {(warnings.hours.isAtLimit || warnings.hours.isNearLimit) && (
        <LimitWarning
          type="hours"
          current={warnings.hours.current}
          max={warnings.hours.max}
        />
      )}
    </>
  )
}

function RouteFeatureGuard({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const requiredFeature = getRequiredFeature(pathname)

  // No feature required for this route
  if (!requiredFeature) {
    return <>{children}</>
  }

  return (
    <FeatureGate feature={requiredFeature}>
      {children}
    </FeatureGate>
  )
}

export function DashboardContentGuard({ children }: DashboardContentGuardProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null | undefined>(undefined)
  const [organizationPlan, setOrganizationPlan] = useState<string | null>(null) // null = not loaded yet
  const [isDeactivated, setIsDeactivated] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()
  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter() : null

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setOrganizationId(null)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, is_active')
        .eq('id', user.id)
        .single()

      // Block deactivated users
      const isActive = (profile as any)?.is_active
      if (isActive === false) {
        setIsDeactivated(true)
        await supabase.auth.signOut()
        return
      }

      const orgId = (profile as { organization_id: string | null } | null)?.organization_id ?? null
      setOrganizationId(orgId)
      if (orgId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('plan')
          .eq('id', orgId)
          .single()
        setOrganizationPlan((org as { plan?: string } | null)?.plan ?? 'FREE')
      } else {
        setOrganizationPlan('FREE')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    loadProfile()
  }, [loadProfile])

  // Show loading while mounting, loading data, or plan not yet determined
  if (!mounted || loading || organizationId === undefined || organizationPlan === null) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" suppressHydrationWarning={true}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (isDeactivated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Conta desativada</h2>
        <p className="text-gray-400 max-w-md">
          Sua conta foi desativada pelo administrador da sua equipe. Entre em contato com o gestor para mais informações.
        </p>
      </div>
    )
  }

  if (organizationId === null) {
    return <OrgNullForm onSuccess={loadProfile} />
  }

  const isFreePlan = organizationPlan === 'FREE' || !organizationPlan
  if (isFreePlan && !isRouteAllowedForFree(pathname)) {
    return <PaywallScreen />
  }

  return (
    <PlanProvider>
      <div className="mb-4">
        <OrgCompleteBanner />
      </div>
      <LimitWarnings />
      <RouteFeatureGuard pathname={pathname}>
        {children}
      </RouteFeatureGuard>
    </PlanProvider>
  )
}
