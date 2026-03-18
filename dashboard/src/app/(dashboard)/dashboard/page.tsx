'use client'

import { DashboardHeader } from '@/components/layout/dashboard-header'
import { SellerDashboard } from '@/components/analytics/seller-dashboard'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { linePathFromData, areaPathFromData } from '@/lib/chart-utils'
import { usePlanLimits } from '@/components/feature-gate'
import { Clock, TrendingUp } from 'lucide-react'

const NEON_PINK = '#ff007a'
const NEON_BLUE = '#00d1ff'
const NEON_GREEN = '#00ff94'
const NEON_ORANGE = '#ff8a00'

const CHART_WIDTH = 960
const CHART_HEIGHT = 240
const CHART_VIEW_HEIGHT = 262
const CHART_PADDING = 20
const CHART_MARGIN_LEFT = -10
const PLOT_WIDTH = CHART_WIDTH - CHART_MARGIN_LEFT
const RECENT_CALLS_LIMIT = 3
const CHART_MONTHS_COUNT = 8
const CHART_WEEKS_COUNT = 8
const CHART_DAYS_COUNT = 14

type Period = 'daily' | 'weekly' | 'monthly'

function getStartOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? 6 : day - 1
  x.setDate(x.getDate() - diff)
  x.setHours(0, 0, 0, 0)
  return x
}

interface ProfileInfo {
  role: string | null
  organizationId: string | null
}

interface RecentCallRow {
  id: string
  started_at: string
  ended_at: string | null
  user?: { full_name: string }
}

interface TopPerfRow {
  userId: string
  name: string
  role: string
  totalCalls: number
  converted: number
  conversionRate: number
  performance: number
  color: string
}

interface ChartMonth {
  label: string
  count: number
}

const MONTH_LABELS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getChartScale(values: number[]) {
  const dataMin = Math.min(...values, 0)
  const dataMax = Math.max(...values, 1)
  const range = dataMax - dataMin || 1
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2
  const valueToY = (v: number) =>
    CHART_PADDING + innerHeight - ((v - dataMin) / range) * innerHeight
  const ticks = 5
  const step = (dataMax - dataMin) / (ticks - 1) || 1
  const yTickValues = Array.from({ length: ticks }, (_, i) =>
    Math.round(dataMin + step * i)
  )
  return { dataMin, dataMax, valueToY, yTickValues }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '...'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'agora'
  if (diffMinutes < 60) return `${diffMinutes}m`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

const METRIC_COLORS = [NEON_PINK, NEON_BLUE, NEON_GREEN, NEON_ORANGE]
const METRIC_PATHS = [
  'M0 25 Q 10 5, 20 20 T 40 10 T 60 15',
  'M0 15 Q 15 25, 30 10 T 60 20',
  'M0 10 Q 15 5, 30 20 T 60 15',
  'M0 20 Q 15 10, 30 25 T 60 15',
]

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [totalMonth, setTotalMonth] = useState(0)
  const [todayCompleted, setTodayCompleted] = useState(0)
  const [convertedCount, setConvertedCount] = useState(0)
  const [followUpCount, setFollowUpCount] = useState(0)
  const [recentCalls, setRecentCalls] = useState<RecentCallRow[]>([])
  const [chartData, setChartData] = useState<ChartMonth[]>([])
  const [topLeaders, setTopLeaders] = useState<TopPerfRow[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [progressReady, setProgressReady] = useState(false)
  const [chartTooltip, setChartTooltip] = useState<{
    index: number
    x: number
    y: number
  } | null>(null)
  const [period, setPeriod] = useState<Period>('monthly')
  const chartRef = useRef<SVGSVGElement>(null)
  const supabase = createClient()

  // Plan limits for call hours KPI - must be called before any conditional returns
  const { plan, limits, usage, remaining, extraHoursPurchased, loading: planLoading } = usePlanLimits()
  const hasCallLimit = limits.maxCallHoursPerMonth > 0
  const usedHours = usage.currentCallHoursThisMonth
  const totalMaxHours = limits.maxCallHoursPerMonth === -1 ? -1 : limits.maxCallHoursPerMonth + extraHoursPurchased
  const maxHours = totalMaxHours
  const remainingHours = remaining.callHours === -1 ? Infinity : remaining.callHours
  const usagePercent = maxHours > 0 ? Math.min(100, (usedHours / maxHours) * 100) : 0
  const isNearLimit = usagePercent >= 80
  const isAtLimit = usagePercent >= 100

  useEffect(() => {
    const t = setTimeout(() => setProgressReady(true), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoadingProfile(false)
        return
      }
      const { data: row } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single()
      if (row) {
        setProfile({
          role: (row as { role?: string }).role ?? null,
          organizationId: (row as { organization_id?: string }).organization_id ?? null,
        })
      }
      setLoadingProfile(false)
    }
    loadProfile()
  }, [supabase])

  useEffect(() => {
    if (profile === null && !loadingProfile) return
    if (loadingProfile) return

    async function loadDashboardData() {
      setLoadingData(true)
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      startOfDay.setHours(0, 0, 0, 0)
      const startOfDayIso = startOfDay.toISOString()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfWeek = getStartOfWeek(now)
      const startOfWeekIso = startOfWeek.toISOString()

      let rangeStart: string
      let rangeEnd: string
      let chartStart: Date
      let chartBucketCount: number
      if (period === 'monthly') {
        rangeStart = firstOfMonth
        rangeEnd = now.toISOString()
        chartStart = new Date(now.getFullYear(), now.getMonth() - (CHART_MONTHS_COUNT - 1), 1)
        chartBucketCount = CHART_MONTHS_COUNT
      } else if (period === 'weekly') {
        rangeStart = startOfWeekIso
        rangeEnd = now.toISOString()
        chartStart = new Date(startOfWeek)
        chartStart.setDate(chartStart.getDate() - 7 * (CHART_WEEKS_COUNT - 1))
        chartBucketCount = CHART_WEEKS_COUNT
      } else {
        rangeStart = startOfDayIso
        rangeEnd = now.toISOString()
        chartStart = new Date(startOfDay)
        chartStart.setDate(chartStart.getDate() - (CHART_DAYS_COUNT - 1))
        chartBucketCount = CHART_DAYS_COUNT
      }
      const chartStartIso = chartStart.toISOString()

      try {
        const orgFilter = profile?.organizationId ?? ''
        const userFilter = profile?.role === 'SELLER' ? (await supabase.auth.getUser()).data.user?.id ?? '' : ''

        const addScope = (query: any) => {
          if (orgFilter) query = query.eq('organization_id', orgFilter)
          if (userFilter) query = query.eq('user_id', userFilter)
          return query
        }

        const [resumoPeriod, resumoToday, callsInRangeRes, recentRes, chartCalls, topPerfData] =
          await Promise.all([
            addScope(supabase
              .from('calls')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'COMPLETED')
              .gte('ended_at', rangeStart)
              .lte('ended_at', rangeEnd))
              .then((r: any) => r, () => ({ count: 0, data: null, error: true })),
            addScope(supabase
              .from('calls')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'COMPLETED')
              .gte('started_at', startOfDayIso))
              .then((r: any) => r, () => ({ count: 0, data: null, error: true })),
            addScope(supabase
              .from('calls')
              .select('id')
              .eq('status', 'COMPLETED')
              .gte('ended_at', rangeStart)
              .lte('ended_at', rangeEnd))
              .then((r: any) => r, () => ({ data: [], error: true })),
            addScope(supabase
              .from('calls')
              .select(`
                id,
                started_at,
                ended_at,
                user:profiles!user_id(full_name)
              `)
              .eq('status', 'COMPLETED')
              .order('ended_at', { ascending: false })
              .limit(RECENT_CALLS_LIMIT))
              .then((r: any) => r, () => ({ data: [], error: true })),
            addScope(supabase
              .from('calls')
              .select('started_at, ended_at')
              .eq('status', 'COMPLETED')
              .gte('ended_at', chartStartIso))
              .then((r: any) => r, () => ({ data: [], error: true })),
            profile?.role === 'MANAGER' && profile?.organizationId
              ? Promise.all([
                supabase
                  .from('profiles')
                  .select('id, full_name, role')
                  .eq('organization_id', profile.organizationId),
                supabase
                  .from('calls')
                  .select('user_id, ended_at')
                  .eq('status', 'COMPLETED')
                  .eq('organization_id', profile.organizationId)
                  .gte('ended_at', rangeStart)
                  .lte('ended_at', rangeEnd),
                supabase
                  .from('calls')
                  .select('id, user_id')
                  .eq('status', 'COMPLETED')
                  .eq('organization_id', profile.organizationId)
                  .gte('ended_at', rangeStart)
                  .lte('ended_at', rangeEnd)
                  .then(async (callsRes: any) => {
                    if (!callsRes.data?.length) return { data: [] }
                    const callIds = callsRes.data.map((c: any) => c.id)
                    return supabase
                      .from('call_summaries')
                      .select('call_id, result, calls!call_id(user_id)')
                      .eq('result', 'CONVERTED')
                      .in('call_id', callIds)
                  }),
              ]).then((r: any) => r, () => [null, null, null])
              : Promise.resolve([null, null, null]),
          ])

        const periodTotal = resumoPeriod.count ?? 0
        setTotalMonth(periodTotal)
        setTodayCompleted(resumoToday.count ?? 0)

        const callIdsInRange = (callsInRangeRes.data as { id: string }[] | null)?.map((c) => c.id) ?? []
        let convertedCount = 0
        let followUpCount = 0
        if (callIdsInRange.length > 0) {
          const [convRes, followRes] = await Promise.all([
            supabase
              .from('call_summaries')
              .select('call_id', { count: 'exact', head: true })
              .eq('result', 'CONVERTED')
              .in('call_id', callIdsInRange),
            supabase
              .from('call_summaries')
              .select('call_id', { count: 'exact', head: true })
              .eq('result', 'FOLLOW_UP')
              .in('call_id', callIdsInRange),
          ])
          convertedCount = convRes.count ?? 0
          followUpCount = followRes.count ?? 0
        }
        setConvertedCount(convertedCount)
        setFollowUpCount(followUpCount)

        if (recentRes.data) {
          const mapped: RecentCallRow[] = (recentRes.data as unknown[]).map((r: unknown) => {
            const row = r as Record<string, unknown>
            return {
              id: row.id as string,
              started_at: row.started_at as string,
              ended_at: row.ended_at as string | null,
              user: row.user
                ? { full_name: (row.user as { full_name?: string }).full_name ?? '' }
                : undefined,
            }
          })
          setRecentCalls(mapped)
        } else {
          setRecentCalls([])
        }

        const chartRows = (chartCalls.data as { started_at: string; ended_at: string | null }[] | null) ?? []
        const labels: ChartMonth[] = []
        if (period === 'monthly') {
          const byMonth: Record<string, number> = {}
          for (let i = 0; i < CHART_MONTHS_COUNT; i++) {
            const d = new Date(chartStart.getFullYear(), chartStart.getMonth() + i, 1)
            byMonth[`${d.getFullYear()}-${d.getMonth()}`] = 0
          }
          chartRows.forEach((c) => {
            const endAt = c.ended_at ?? c.started_at
            const d = new Date(endAt)
            const key = `${d.getFullYear()}-${d.getMonth()}`
            if (key in byMonth) byMonth[key] += 1
          })
          for (let i = 0; i < CHART_MONTHS_COUNT; i++) {
            const d = new Date(chartStart.getFullYear(), chartStart.getMonth() + i, 1)
            const key = `${d.getFullYear()}-${d.getMonth()}`
            labels.push({ label: MONTH_LABELS_PT[d.getMonth()], count: byMonth[key] ?? 0 })
          }
          setChartData(labels)
        } else if (period === 'weekly') {
          const toWeekKey = (d: Date) => {
            const m = getStartOfWeek(d)
            return `${m.getFullYear()}-${(m.getMonth() + 1).toString().padStart(2, '0')}-${m.getDate().toString().padStart(2, '0')}`
          }
          const byWeek: Record<string, number> = {}
          for (let i = 0; i < CHART_WEEKS_COUNT; i++) {
            const w = new Date(chartStart)
            w.setDate(w.getDate() + i * 7)
            const key = toWeekKey(w)
            byWeek[key] = 0
          }
          chartRows.forEach((c) => {
            const endAt = c.ended_at ?? c.started_at
            const d = new Date(endAt)
            const key = toWeekKey(d)
            if (key in byWeek) byWeek[key] += 1
          })
          for (let i = 0; i < CHART_WEEKS_COUNT; i++) {
            const w = new Date(chartStart)
            w.setDate(w.getDate() + i * 7)
            const weekStart = getStartOfWeek(w)
            const key = toWeekKey(weekStart)
            const label = `${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}`
            labels.push({ label, count: byWeek[key] ?? 0 })
          }
          setChartData(labels)
        } else {
          const toDayKey = (d: Date) =>
            `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
          const byDay: Record<string, number> = {}
          for (let i = 0; i < CHART_DAYS_COUNT; i++) {
            const d = new Date(chartStart)
            d.setDate(d.getDate() + i)
            byDay[toDayKey(d)] = 0
          }
          chartRows.forEach((c) => {
            const endAt = c.ended_at ?? c.started_at
            const d = new Date(endAt)
            const key = toDayKey(d)
            if (key in byDay) byDay[key] += 1
          })
          const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
          for (let i = 0; i < CHART_DAYS_COUNT; i++) {
            const d = new Date(chartStart)
            d.setDate(d.getDate() + i)
            const key = toDayKey(d)
            labels.push({
              label: `${dayLabels[d.getDay()]} ${d.getDate().toString().padStart(2, '0')}`,
              count: byDay[key] ?? 0,
            })
          }
          setChartData(labels)
        }

        if (profile?.role === 'MANAGER' && topPerfData[0]?.data && topPerfData[1]?.data && topPerfData[2]?.data) {
          const profilesList = topPerfData[0].data as { id: string; full_name: string; role: string }[]
          const callsList = topPerfData[1].data as { user_id: string }[]
          const summariesList = topPerfData[2].data as { call_id: string; calls: { user_id: string } | null }[]
          const callIdsSet = new Set(callIdsInRange)
          const callsByUser: Record<string, number> = {}
          const convertedByUser: Record<string, number> = {}
          profilesList.forEach((p) => {
            callsByUser[p.id] = 0
            convertedByUser[p.id] = 0
          })
          callsList.forEach((c) => {
            if (callsByUser[c.user_id] !== undefined) callsByUser[c.user_id] += 1
          })
          summariesList.forEach((s) => {
            if (!callIdsSet.has(s.call_id)) return
            const uid = s.calls?.user_id
            if (uid && convertedByUser[uid] !== undefined) convertedByUser[uid] += 1
          })
          const maxCalls = Math.max(...Object.values(callsByUser), 1)
          const rows: TopPerfRow[] = profilesList.map((p, idx) => {
            const total = callsByUser[p.id] ?? 0
            const converted = convertedByUser[p.id] ?? 0
            const rate = total > 0 ? Math.round((converted / total) * 100) : 0
            const performance = maxCalls > 0 ? Math.round((total / maxCalls) * 100) : 0
            return {
              userId: p.id,
              name: p.full_name ?? 'Sem nome',
              role: p.role ?? 'Vendas',
              totalCalls: total,
              converted,
              conversionRate: rate,
              performance,
              color: METRIC_COLORS[idx % METRIC_COLORS.length],
            }
          })
          rows.sort((a, b) => b.totalCalls - a.totalCalls)
          setTopLeaders(rows)
        } else {
          setTopLeaders([])
        }
      } catch {
        setTotalMonth(0)
        setTodayCompleted(0)
        setConvertedCount(0)
        setFollowUpCount(0)
        setRecentCalls([])
        setChartData([])
        setTopLeaders([])
      } finally {
        setLoadingData(false)
      }
    }

    loadDashboardData()
  }, [profile, loadingProfile, period, supabase])

  if (loadingProfile) {
    return (
      <>
        <DashboardHeader title="Dashboard" />
        <div className="space-y-8 animate-pulse">
          <div className="rounded-[24px] border p-6 flex gap-6" style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 space-y-3">
                <div className="h-7 w-16 bg-white/10 rounded-lg" />
                <div className="h-4 w-24 bg-white/5 rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-[24px] border p-6" style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="h-5 w-48 bg-white/10 rounded-lg mb-6" />
            <div className="h-48 w-full bg-white/5 rounded-xl" />
          </div>
        </div>
      </>
    )
  }

  if (profile?.role === 'SELLER') {
    return (
      <>
        <DashboardHeader title="Dashboard" />
        <SellerDashboard />
      </>
    )
  }

  const totalLabel = period === 'monthly' ? 'Total no mês' : period === 'weekly' ? 'Total na semana' : 'Total hoje'
  const metrics = [
    { value: String(totalMonth), label: totalLabel, color: NEON_PINK, path: METRIC_PATHS[0] },
    { value: String(todayCompleted), label: 'Chamadas hoje', color: NEON_BLUE, path: METRIC_PATHS[1] },
    { value: String(convertedCount), label: 'Convertidas', color: NEON_GREEN, path: METRIC_PATHS[2] },
    { value: String(followUpCount), label: 'Em negociação', color: NEON_ORANGE, path: METRIC_PATHS[3] },
  ]
  const chartValues = chartData.map((d) => d.count)
  const chartLabels = chartData.map((d) => d.label)
  const hasChartData = chartValues.some((v) => v > 0)

  return (
    <>
      <DashboardHeader title="Dashboard" />

      {/* KPI de Uso de Horas de Calls */}
      {!planLoading && hasCallLimit && (
        <div
          className="rounded-[24px] border mb-8 p-6 animate-chart-in opacity-0"
          style={{
            backgroundColor: '#1e1e1e',
            borderColor: isAtLimit ? 'rgba(239, 68, 68, 0.3)' : isNearLimit ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255,255,255,0.05)',
            animationDelay: '0ms',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Info */}
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-2xl shrink-0"
                style={{
                  backgroundColor: isAtLimit ? 'rgba(239, 68, 68, 0.1)' : isNearLimit ? 'rgba(234, 179, 8, 0.1)' : `${NEON_GREEN}15`,
                }}
              >
                <Clock
                  className="w-6 h-6"
                  style={{ color: isAtLimit ? '#ef4444' : isNearLimit ? '#eab308' : NEON_GREEN }}
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Uso de Calls do Mês</h3>
                <p className="text-sm text-gray-400">
                  Plano {plan} · {maxHours === -1 ? 'Ilimitado' : `${maxHours}h/mês`}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 md:gap-8">
              {/* Horas usadas */}
              <div className="text-center">
                <p className="text-3xl font-bold text-white">
                  {usedHours.toFixed(1)}
                  <span className="text-lg text-gray-500">h</span>
                </p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Usadas</p>
              </div>

              {/* Separador */}
              <div className="hidden md:block w-px h-12 bg-white/10" />

              {/* Horas restantes */}
              <div className="text-center">
                <p
                  className="text-3xl font-bold"
                  style={{ color: isAtLimit ? '#ef4444' : isNearLimit ? '#eab308' : NEON_GREEN }}
                >
                  {maxHours === -1 ? '∞' : remainingHours.toFixed(1)}
                  {maxHours !== -1 && <span className="text-lg text-gray-500">h</span>}
                </p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Restantes</p>
              </div>

              {/* Separador */}
              <div className="hidden md:block w-px h-12 bg-white/10" />

              {/* Barra de progresso */}
              <div className="w-full md:w-48">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{Math.round(usagePercent)}% usado</span>
                  {isAtLimit && (
                    <Link
                      href="/billing"
                      className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                      style={{ backgroundColor: NEON_PINK, color: 'white' }}
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${progressReady ? usagePercent : 0}%`,
                      backgroundColor: isAtLimit ? '#ef4444' : isNearLimit ? '#eab308' : NEON_GREEN,
                      boxShadow: `0 0 8px ${isAtLimit ? '#ef4444' : isNearLimit ? '#eab308' : NEON_GREEN}`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards de métricas (4 colunas) */}
      <div
        className="rounded-[24px] border mb-8 flex flex-col md:flex-row items-stretch"
        style={{
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {metrics.map((m, i) => (
          <div key={m.label} className="flex flex-1 flex-col md:flex-row min-w-0">
            {i > 0 && (
              <div
                className="hidden md:flex shrink-0 w-px self-stretch items-center justify-center py-4"
                aria-hidden
              >
                <svg
                  className="w-px"
                  style={{ height: '70%' }}
                  viewBox="0 0 1 100"
                  preserveAspectRatio="none"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="100"
                    stroke="rgba(148, 163, 184, 0.5)"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            )}
            {i > 0 && (
              <div className="md:hidden w-full h-px shrink-0 bg-slate-500/50" aria-hidden />
            )}
            <div
              className="flex-1 p-6 flex flex-col justify-center min-w-0 animate-chart-in opacity-0"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <h3 className="text-2xl font-bold text-white mb-1">
                {loadingData ? '—' : m.value}
              </h3>
              <div className="flex items-center justify-between gap-2">
                <p className="text-gray-500 text-sm">{m.label}</p>
                <svg
                  className="w-16 h-8 shrink-0 overflow-visible"
                  viewBox="-2 2 64 26"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ filter: `drop-shadow(0 0 4px ${m.color})` }}
                >
                  <path
                    className="chart-path animate-chart-path"
                    d={m.path}
                    fill="none"
                    stroke={m.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    pathLength={100}
                    style={{ animationDelay: `${200 + i * 80}ms` }}
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estatística de Chamadas (gráfico linha) */}
      <div
        className="p-4 sm:p-6 rounded-2xl sm:rounded-[24px] border mb-8 animate-chart-in opacity-0 overflow-hidden"
        style={{
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.05)',
          animationDelay: '320ms',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-bold text-white shrink-0">
            Estatística de Chamadas
          </h2>
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: NEON_BLUE }}
              />
              <span className="text-xs text-gray-400">
                {period === 'monthly' ? 'Chamadas por mês' : period === 'weekly' ? 'Chamadas por semana' : 'Chamadas por dia'}
              </span>
            </div>
            <select
              className="bg-black/20 border border-white/10 rounded-lg text-xs py-1.5 px-3 text-gray-400 focus:ring-0 focus:outline-none focus:border-white/20"
              value={period}
              onChange={(e) => setPeriod((e.target.value as Period))}
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
        </div>
        <div className="w-full overflow-hidden">
          <div
            className="w-full aspect-4/1 min-h-[180px] sm:min-h-[200px] max-h-[280px] sm:max-h-[320px] lg:max-h-[400px] relative cursor-crosshair"
            onMouseMove={(e) => {
              const svg = chartRef.current
              if (!svg) return
              const rect = svg.getBoundingClientRect()
              const x = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH
              const plotX = x - CHART_MARGIN_LEFT
              if (plotX < 0 || plotX > PLOT_WIDTH) {
                setChartTooltip(null)
                return
              }
              const index = Math.min(
                chartLabels.length - 1,
                Math.max(0, Math.round((plotX / PLOT_WIDTH) * (chartLabels.length - 1)))
              )
              const cursorX = e.clientX - rect.left
              const cursorY = e.clientY - rect.top
              const tooltipWidth = 220
              const padding = 12
              const tooltipLeft = Math.max(
                padding,
                Math.min(cursorX + padding, rect.width - tooltipWidth - padding)
              )
              const tooltipTop = Math.max(padding, cursorY - 8)
              setChartTooltip({
                index,
                x: tooltipLeft,
                y: tooltipTop,
              })
            }}
            onMouseLeave={() => setChartTooltip(null)}
          >
            {loadingData ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Carregando gráfico...
              </div>
            ) : !hasChartData ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Nenhuma chamada no período
              </div>
            ) : (
              <svg
                ref={chartRef}
                className="w-full h-full"
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_VIEW_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="grad-blue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={NEON_BLUE} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={NEON_BLUE} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const { valueToY, yTickValues } = getChartScale(chartValues)
                  return (
                    <>
                      <line
                        x1={CHART_MARGIN_LEFT - 2}
                        y1={CHART_PADDING}
                        x2={CHART_MARGIN_LEFT - 2}
                        y2={CHART_HEIGHT - CHART_PADDING}
                        stroke="rgba(148, 163, 184, 0.4)"
                        strokeWidth="1"
                      />
                      {yTickValues.map((v, vi) => {
                        const y = valueToY(v)
                        return (
                          <g key={`ytick-${vi}`}>
                            <line
                              x1={CHART_MARGIN_LEFT - 2}
                              y1={y}
                              x2={CHART_WIDTH}
                              y2={y}
                              stroke="rgba(148, 163, 184, 0.12)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={CHART_MARGIN_LEFT - 8}
                              y={y}
                              textAnchor="end"
                              dominantBaseline="middle"
                              className="fill-gray-500 text-[10px] font-semibold"
                            >
                              {v}
                            </text>
                          </g>
                        )
                      })}
                      <line
                        x1={CHART_MARGIN_LEFT}
                        y1={CHART_HEIGHT - CHART_PADDING}
                        x2={CHART_WIDTH}
                        y2={CHART_HEIGHT - CHART_PADDING}
                        stroke="rgba(148, 163, 184, 0.4)"
                        strokeWidth="1"
                      />
                      {chartLabels.map((label, i) => {
                        const tickX =
                          CHART_MARGIN_LEFT +
                          (PLOT_WIDTH * i) / Math.max(chartLabels.length - 1, 1)
                        return (
                          <g key={label + i}>
                            <line
                              x1={tickX}
                              y1={CHART_HEIGHT - CHART_PADDING}
                              x2={tickX}
                              y2={CHART_HEIGHT}
                              stroke="rgba(148, 163, 184, 0.25)"
                              strokeWidth="1"
                            />
                            <text
                              x={tickX}
                              y={CHART_VIEW_HEIGHT - 6}
                              textAnchor="middle"
                              dominantBaseline="auto"
                              className="fill-gray-500 text-[10px] font-bold uppercase tracking-widest"
                            >
                              {label}
                            </text>
                          </g>
                        )
                      })}
                    </>
                  )
                })()}
                <g transform={`translate(${CHART_MARGIN_LEFT}, 0)`}>
                  <path
                    className="animate-chart-area"
                    d={areaPathFromData(
                      chartValues,
                      PLOT_WIDTH,
                      CHART_HEIGHT,
                      CHART_PADDING
                    )}
                    fill="url(#grad-blue)"
                  />
                  <path
                    className="chart-path animate-chart-path"
                    d={linePathFromData(
                      chartValues,
                      PLOT_WIDTH,
                      CHART_HEIGHT,
                      CHART_PADDING
                    )}
                    fill="none"
                    stroke={NEON_BLUE}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    pathLength={100}
                    style={{
                      filter: `drop-shadow(0 0 4px ${NEON_BLUE})`,
                      animationDelay: '0.4s',
                    }}
                  />
                </g>
              </svg>
            )}
            {chartTooltip !== null && chartLabels[chartTooltip.index] !== undefined && (
              <div
                className="absolute z-10 pointer-events-none rounded-xl border p-4 shadow-xl backdrop-blur-sm"
                style={{
                  left: chartTooltip.x,
                  top: chartTooltip.y,
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  width: 220,
                  maxWidth: 'calc(100% - 24px)',
                }}
              >
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  {chartLabels[chartTooltip.index]}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Chamadas</span>
                    <span className="font-bold text-white">
                      {chartValues[chartTooltip.index]} concluídas
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chamadas recentes */}
      <div
        className="p-6 rounded-[24px] border mb-8 animate-chart-in opacity-0"
        style={{
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.05)',
          animationDelay: '400ms',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Chamadas recentes</h2>
          <Link
            href="/calls"
            className="text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            style={{ color: NEON_PINK }}
          >
            Ver tudo
          </Link>
        </div>
        {loadingData ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : recentCalls.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma chamada recente.</p>
        ) : (
          <ul className="space-y-3">
            {recentCalls.map((call) => (
              <li key={call.id}>
                <Link
                  href={`/calls/${call.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const name = call.user?.full_name ?? '?'
                      const avatarColor = METRIC_COLORS[name.charCodeAt(0) % METRIC_COLORS.length]
                      return (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: `${avatarColor}20`, border: `1px solid ${avatarColor}40`, color: avatarColor }}
                        >
                          {name.charAt(0)}
                        </div>
                      )
                    })()}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {call.user?.full_name ?? 'Desconhecido'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(call.ended_at ?? call.started_at)}
                      </p>
                    </div>
                  </div>
                  <span className="material-icons-outlined text-gray-500 text-lg shrink-0">
                    arrow_forward
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top Performance */}
      <div
        className="p-6 rounded-[24px] border mb-8 animate-chart-in opacity-0"
        style={{
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.05)',
          animationDelay: '480ms',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Top Performance</h2>
          <Link
            href="/calls"
            className="text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            style={{ color: NEON_PINK }}
          >
            Ver tudo
          </Link>
        </div>
        {loadingData ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : topLeaders.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum dado de performance no período.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 text-xs font-bold uppercase tracking-widest border-b border-white/5">
                <th className="pb-4 font-bold">Usuário</th>
                <th className="pb-4 font-bold">Total</th>
                <th className="pb-4 font-bold">Conversão</th>
                <th className="pb-4 font-bold">Performance</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {topLeaders.map((row, idx) => (
                <tr
                  key={row.userId}
                  className="border-b border-white/5 last:border-0 animate-chart-in opacity-0"
                  style={{ animationDelay: `${560 + idx * 80}ms` }}
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: `${row.color}20`, border: `1px solid ${row.color}40`, color: row.color }}
                      >
                        {row.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white">{row.name}</div>
                        <div className="text-[10px] text-gray-500">{row.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 font-medium text-white">{row.totalCalls}</td>
                  <td
                    className="py-4 font-bold"
                    style={{ color: NEON_GREEN }}
                  >
                    {row.conversionRate}%
                  </td>
                  <td className="py-4">
                    <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${progressReady ? row.performance : 0}%`,
                          backgroundColor: row.color,
                          boxShadow: `0 0 8px ${row.color}`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
