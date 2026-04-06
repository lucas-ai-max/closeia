'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { SellerDashboard } from '@/components/analytics/seller-dashboard'
import { Overview } from '@/components/analytics/overview'
import { PeriodFilter } from '@/components/analytics/period-filter'
import { PipelineFunnelCard } from '@/components/analytics/pipeline-funnel'
import { TemperatureGauge } from '@/components/analytics/temperature-gauge'
import { SellerPerformanceMatrix } from '@/components/analytics/seller-performance-matrix'
import { CoachingAlerts } from '@/components/analytics/coaching-alerts'
import { SentimentOverview } from '@/components/analytics/sentiment-overview'
import { AdherenceOverview } from '@/components/analytics/adherence-overview'
import { PainPointsCloud } from '@/components/analytics/pain-points-cloud'
import { FinancialImpactCard } from '@/components/analytics/financial-impact'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useManagerAnalytics } from '@/hooks/use-manager-analytics'
import type { AnalyticsPeriod } from '@/types/analytics'

const NEON_PINK = '#ff007a'
const NEON_GREEN = '#00ff94'
const NEON_ORANGE = '#ff8a00'
const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }

function metricColor(value: number, thresholds: [number, number]) {
  if (value >= thresholds[1]) return NEON_GREEN
  if (value >= thresholds[0]) return NEON_ORANGE
  return NEON_PINK
}

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setRoleLoading(false); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single()
      if (profile) {
        setRole((profile as any).role ?? 'SELLER')
        setOrgId((profile as any).organization_id ?? null)
      }
      setRoleLoading(false)
    }
    fetchRole()
  }, [])

  const { data, loading: dataLoading } = useManagerAnalytics(
    role !== 'SELLER' ? orgId : null,
    period
  )
  const loading = roleLoading || (role !== 'SELLER' && dataLoading)

  // ── Skeleton ──
  if (!mounted || roleLoading) {
    return (
      <div className="space-y-6" suppressHydrationWarning>
        <DashboardHeader title="Analytics" />
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl" style={CARD_STYLE} />)}
          </div>
          <div className="grid gap-4 md:grid-cols-7">
            <div className="col-span-4 h-48 rounded-2xl" style={CARD_STYLE} />
            <div className="col-span-3 h-48 rounded-2xl" style={CARD_STYLE} />
          </div>
          <div className="h-64 rounded-2xl" style={CARD_STYLE} />
        </div>
      </div>
    )
  }

  // ── SELLER VIEW (unchanged) ──
  if (role === 'SELLER') {
    return (
      <div suppressHydrationWarning>
        <DashboardHeader title="Analytics" />
        <SellerDashboard />
      </div>
    )
  }

  // ── MANAGER / ADMIN VIEW ──
  const { kpis, pipeline, temperature, sentiment, sellers, coachingAlerts, painPoints, adherence, monthlyData, weeklyData, financial, coachingAlertDetails, temperatureDetails, pipelineDetails, sellerDetails, painPointDetails } = data

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Row 0: Header + Period Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DashboardHeader title="Analytics" />
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl" style={CARD_STYLE} />)}
          </div>
          <div className="h-64 rounded-2xl" style={CARD_STYLE} />
        </div>
      ) : (
        <>
          {/* Row 1: KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border shadow-none animate-chart-in opacity-0" style={CARD_STYLE}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total de Chamadas</CardTitle>
                <span className="material-icons-outlined text-gray-500 text-[20px]">call</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{kpis.totalCalls.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-gray-500 mt-1">Concluídas no período</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-none animate-chart-in opacity-0" style={{ ...CARD_STYLE, animationDelay: '80ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Conversão Real</CardTitle>
                <span className="material-icons-outlined text-gray-500 text-[20px]">trending_up</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: kpis.realConversionRate > 0 ? metricColor(kpis.realConversionRate, [30, 60]) : '#555' }}>
                  {kpis.realConversionRate > 0 ? `${kpis.realConversionRate}%` : '—'}
                </div>
                <p className="text-xs text-gray-500 mt-1">De calls com resultado definido</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-none animate-chart-in opacity-0" style={{ ...CARD_STYLE, animationDelay: '160ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Aderência Média</CardTitle>
                <span className="material-icons-outlined text-gray-500 text-[20px]">checklist</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: kpis.avgAdherenceScore > 0 ? metricColor(kpis.avgAdherenceScore, [40, 70]) : '#555' }}>
                  {kpis.avgAdherenceScore > 0 ? `${kpis.avgAdherenceScore}%` : '—'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Score médio de aderência ao script</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-none animate-chart-in opacity-0" style={{ ...CARD_STYLE, animationDelay: '240ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Tempo Médio</CardTitle>
                <span className="material-icons-outlined text-gray-500 text-[20px]">schedule</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{kpis.avgDurationMin > 0 ? `${kpis.avgDurationMin}m` : '—'}</div>
                <p className="text-xs text-gray-500 mt-1">Duração média · {kpis.totalHours} total</p>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Pipeline + Temperature */}
          <div className="grid gap-4 md:grid-cols-7">
            <div className="col-span-4">
              <PipelineFunnelCard data={pipeline} details={pipelineDetails} />
            </div>
            <div className="col-span-3">
              <TemperatureGauge data={temperature} details={temperatureDetails} />
            </div>
          </div>

          {/* Row 2.5: Financial Impact (only shows if data exists) */}
          <FinancialImpactCard data={financial} />

          {/* Row 3: Coaching Alerts */}
          <CoachingAlerts alerts={coachingAlertDetails} />

          {/* Row 4: Seller Performance Matrix */}
          <SellerPerformanceMatrix sellers={sellerDetails} />

          {/* Row 5: Monthly Chart + Sentiment */}
          <div className="grid gap-4 md:grid-cols-7 items-stretch">
            <Card className="col-span-4 rounded-2xl border shadow-none" style={CARD_STYLE}>
              <CardHeader>
                <CardTitle className="text-base font-bold text-white">Chamadas por Mês</CardTitle>
              </CardHeader>
              <CardContent className="pl-2" suppressHydrationWarning>
                <Overview monthlyData={monthlyData} />
              </CardContent>
            </Card>
            <div className="col-span-3 flex flex-col">
              <SentimentOverview data={sentiment} />
            </div>
          </div>

          {/* Row 6: Pain Points + Adherence */}
          <div className="grid gap-4 md:grid-cols-7 items-stretch">
            <div className="col-span-4 flex flex-col">
              <PainPointsCloud data={painPointDetails} />
            </div>
            <div className="col-span-3 flex flex-col">
              <AdherenceOverview data={adherence} />
            </div>
          </div>

        </>
      )}
    </div>
  )
}
