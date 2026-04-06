'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  AnalyticsPeriod,
  ManagerAnalyticsData,
  SellerPerformanceRow,
  CoachingAlert,
  CoachingAlertDetail,
  PainPointAggregate,
  PainPointDetail,
  TemperatureDetail,
  PipelineDetail,
  SellerDetail,
} from '@/types/analytics'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function parseBRL(value?: string): number {
  if (!value || typeof value !== 'string') return 0
  // Handle ranges like "R$ 10.000 a R$ 15.000" — take the average
  const matches = value.match(/[\d.,]+/g)
  if (!matches || matches.length === 0) return 0
  const nums = matches.map(m => parseFloat(m.replace(/\./g, '').replace(',', '.')))
  const valid = nums.filter(n => !isNaN(n) && n > 0)
  if (valid.length === 0) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function periodToStartDate(period: AnalyticsPeriod): string {
  const now = new Date()
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 86400000).toISOString()
  }
  if (period === '90d') {
    return new Date(now.getTime() - 90 * 86400000).toISOString()
  }
  // 30d default
  return new Date(now.getTime() - 30 * 86400000).toISOString()
}

const EMPTY: ManagerAnalyticsData = {
  kpis: { totalCalls: 0, realConversionRate: 0, avgAdherenceScore: 0, avgDurationMin: 0, totalHours: '0m', callsToday: 0 },
  pipeline: { converted: 0, followUp: 0, lost: 0, unknown: 0 },
  temperature: { frio: 0, morno: 0, quente: 0, fechando: 0 },
  sentiment: { positive: 0, neutral: 0, negative: 0, mixed: 0 },
  sellers: [],
  coachingAlerts: [],
  financial: { totalMonthlyLoss: 0, totalAnnualLoss: 0, callsWithFinancialData: 0 },
  painPoints: [],
  adherence: { teamAverage: 0, sellers: [] },
  monthlyData: [],
  weeklyData: [],
  coachingAlertDetails: [],
  temperatureDetails: [],
  pipelineDetails: [],
  sellerDetails: [],
  painPointDetails: [],
}

export function useManagerAnalytics(orgId: string | null, period: AnalyticsPeriod) {
  const [data, setData] = useState<ManagerAnalyticsData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)

    async function fetchAll() {
      const now = new Date()
      const periodStart = periodToStartDate(period)
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

      const [bulkRes, activeRes, todayRes, monthlyRes, weeklyRes] = await Promise.all([
        // 1. Main bulk query: calls + summaries
        supabase
          .from('calls')
          .select(`
            id, user_id, started_at, ended_at, duration_seconds, script_id,
            user:profiles!user_id(full_name),
            script:scripts!calls_script_relationship(name),
            summary:call_summaries(
              script_adherence_score, lead_sentiment, result, raw_analysis
            )
          `)
          .eq('organization_id', orgId!)
          .eq('status', 'COMPLETED')
          .gte('started_at', periodStart)
          .limit(1000),

        // 2. Active calls for isActive status
        supabase
          .from('calls')
          .select('user_id')
          .eq('status', 'ACTIVE')
          .eq('organization_id', orgId!),

        // 3. Today's completed calls count
        supabase
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('status', 'COMPLETED')
          .gte('started_at', startOfDay),

        // 4. Monthly data (6 months) - fetch & bucket client-side
        supabase
          .from('calls')
          .select('started_at')
          .eq('organization_id', orgId!)
          .eq('status', 'COMPLETED')
          .gte('started_at', sixMonthsAgo),

        // 5. Weekly data (7 days) - fetch & bucket client-side
        supabase
          .from('calls')
          .select('started_at')
          .eq('organization_id', orgId!)
          .eq('status', 'COMPLETED')
          .gte('started_at', sevenDaysAgo),
      ])

      const calls = (bulkRes.data ?? []) as any[]
      const activeUserIds = new Set((activeRes.data ?? []).map((c: any) => c.user_id))
      const callsToday = todayRes.count ?? 0

      // ── Monthly chart (6 months, fixed regardless of period) ──
      const monthlyData: { name: string; total: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        monthlyData.push({ name: MONTH_NAMES[d.getMonth()], total: 0 })
      }
      for (const row of (monthlyRes.data ?? []) as any[]) {
        const d = new Date(row.started_at)
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
        const idx = 5 - monthsAgo
        if (idx >= 0 && idx < 6) monthlyData[idx].total++
      }

      // ── Weekly chart (last 7 days, fixed) ──
      const weeklyData: { day: string; total: number }[] = []
      const weekBase = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekBase)
        d.setDate(d.getDate() + i)
        weeklyData.push({ day: DAY_NAMES[d.getDay()], total: 0 })
      }
      for (const row of (weeklyRes.data ?? []) as any[]) {
        const d = new Date(row.started_at)
        const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000)
        const idx = 6 - daysAgo
        if (idx >= 0 && idx < 7) weeklyData[idx].total++
      }

      // ── Aggregate from bulk query ──
      let totalDurSec = 0
      let durCount = 0
      let adherenceSum = 0
      let adherenceCount = 0
      const pipeline = { converted: 0, followUp: 0, lost: 0, unknown: 0 }
      const temperature = { frio: 0, morno: 0, quente: 0, fechando: 0 }
      const sentiment = { positive: 0, neutral: 0, negative: 0, mixed: 0 }
      let financialMonthly = 0
      let financialAnnual = 0
      let financialDataCount = 0
      const painFreq: Record<string, number> = {}
      // Drill-down collections
      const tempDetails: Record<string, { leadName: string; sellerName: string; date: string; callId: string }[]> = {
        frio: [], morno: [], quente: [], fechando: [],
      }
      const pipeDetails: Record<string, { leadName: string; sellerName: string; date: string; callId: string; daysSince: number; lossReason: string | null }[]> = {
        converted: [], followUp: [], lost: [], unknown: [],
      }
      const painConversion: Record<string, { converted: number; lost: number }> = {}
      const sellerCalls: Record<string, { date: string; adherence: number | null; result: string | null; callId: string }[]> = {}

      // Per-seller aggregation
      const byUser: Record<string, {
        fullName: string
        calls: number
        converted: number
        followUp: number
        lost: number
        adherenceSum: number
        adherenceCount: number
        sentimentSum: number
        sentimentCount: number
        hotLeads: number
        durSec: number
        durCount: number
      }> = {}

      for (const call of calls) {
        const summary = Array.isArray(call.summary) ? call.summary[0] : call.summary
        const raw = summary?.raw_analysis as Record<string, any> | null | undefined

        // Duration
        if (call.ended_at && call.started_at) {
          const dur = Math.max(0, (new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000)
          totalDurSec += dur
          durCount++
        }

        // Pipeline
        if (summary?.result === 'CONVERTED') pipeline.converted++
        else if (summary?.result === 'FOLLOW_UP') pipeline.followUp++
        else if (summary?.result === 'LOST') pipeline.lost++
        else pipeline.unknown++

        // Adherence
        if (summary?.script_adherence_score != null) {
          adherenceSum += summary.script_adherence_score
          adherenceCount++
        }

        // Sentiment
        const sent = summary?.lead_sentiment
        if (sent === 'POSITIVE') sentiment.positive++
        else if (sent === 'NEUTRAL') sentiment.neutral++
        else if (sent === 'NEGATIVE') sentiment.negative++
        else if (sent === 'MIXED') sentiment.mixed++

        // Temperature (from raw_analysis)
        const termo = raw?.termometro_classificacao as string | undefined
        if (termo === 'FRIO') temperature.frio++
        else if (termo === 'MORNO') temperature.morno++
        else if (termo === 'QUENTE') temperature.quente++
        else if (termo === 'FECHANDO') temperature.fechando++

        // Financial
        const monthlyLoss = parseBRL(raw?.financeiro_perda_mensal)
        const annualLoss = parseBRL(raw?.financeiro_perda_anual)
        if (monthlyLoss > 0 || annualLoss > 0) {
          financialMonthly += monthlyLoss
          financialAnnual += annualLoss
          financialDataCount++
        }

        // Pain points (dores_top3)
        const dores = raw?.dores_top3 as string[] | undefined
        if (Array.isArray(dores)) {
          for (const dor of dores) {
            if (dor && typeof dor === 'string') {
              const key = dor.trim()
              if (key) painFreq[key] = (painFreq[key] ?? 0) + 1
            }
          }
        }

        // Per-seller
        const uid = call.user_id
        if (!byUser[uid]) {
          byUser[uid] = {
            fullName: (call.user as any)?.full_name ?? 'Vendedor',
            calls: 0, converted: 0, followUp: 0, lost: 0,
            adherenceSum: 0, adherenceCount: 0,
            sentimentSum: 0, sentimentCount: 0,
            hotLeads: 0, durSec: 0, durCount: 0,
          }
        }
        const u = byUser[uid]
        u.calls++
        if (summary?.result === 'CONVERTED') u.converted++
        else if (summary?.result === 'FOLLOW_UP') u.followUp++
        else if (summary?.result === 'LOST') u.lost++
        if (summary?.script_adherence_score != null) {
          u.adherenceSum += summary.script_adherence_score
          u.adherenceCount++
        }
        const sentScore = sent === 'POSITIVE' ? 3 : sent === 'NEUTRAL' ? 2 : sent === 'MIXED' ? 1.5 : sent === 'NEGATIVE' ? 1 : 0
        if (sentScore > 0) { u.sentimentSum += sentScore; u.sentimentCount++ }
        if (termo === 'QUENTE' || termo === 'FECHANDO') u.hotLeads++
        if (call.ended_at && call.started_at) {
          u.durSec += Math.max(0, (new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000)
          u.durCount++
        }

        // ── Drill-down data collection ──
        const sellerName = (call.user as any)?.full_name ?? 'Vendedor'
        const scriptName = Array.isArray(call.script) ? call.script[0]?.name : (call.script as any)?.name ?? null
        const leadName = raw?.lead_nome ?? raw?.lead_name ?? 'Lead'
        const callDate = call.started_at ? new Date(call.started_at).toLocaleDateString('pt-BR') : ''
        const daysSinceCall = call.started_at ? Math.floor((now.getTime() - new Date(call.started_at).getTime()) / 86400000) : 0

        // Temperature drill-down
        const termoKey = termo?.toLowerCase() as keyof typeof tempDetails
        if (termoKey && tempDetails[termoKey]) {
          tempDetails[termoKey].push({ leadName: String(leadName), sellerName, date: callDate, callId: call.id })
        }

        // Pipeline drill-down
        const resultKey = summary?.result === 'CONVERTED' ? 'converted' : summary?.result === 'FOLLOW_UP' ? 'followUp' : summary?.result === 'LOST' ? 'lost' : 'unknown'
        pipeDetails[resultKey].push({
          leadName: String(leadName), sellerName, date: callDate, callId: call.id,
          daysSince: daysSinceCall,
          lossReason: resultKey === 'lost' ? (raw?.motivo_perda ?? raw?.loss_reason ?? null) : null,
        })

        // Pain point conversion correlation
        if (Array.isArray(dores)) {
          for (const dor of dores) {
            const key = typeof dor === 'string' ? dor.trim() : ''
            if (!key) continue
            if (!painConversion[key]) painConversion[key] = { converted: 0, lost: 0 }
            if (summary?.result === 'CONVERTED') painConversion[key].converted++
            else if (summary?.result === 'LOST') painConversion[key].lost++
          }
        }

        // Seller recent calls (keep last 5)
        if (!sellerCalls[uid]) sellerCalls[uid] = []
        sellerCalls[uid].push({
          date: callDate, adherence: summary?.script_adherence_score ?? null,
          result: summary?.result ?? null, callId: call.id,
        })
      }

      // Build seller rows
      const sellers: SellerPerformanceRow[] = Object.entries(byUser).map(([uid, u]) => {
        const decided = u.converted + u.followUp + u.lost
        const conv = decided > 0 ? Math.round((u.converted / decided) * 100) : 0
        const adh = u.adherenceCount > 0 ? Math.round(u.adherenceSum / u.adherenceCount) : 0
        const sentAvg = u.sentimentCount > 0 ? u.sentimentSum / u.sentimentCount : 0
        const negativeRate = u.sentimentCount > 0 ? (u.sentimentCount - Math.round(u.sentimentSum / 3 * u.sentimentCount)) / u.sentimentCount : 0
        const avgDur = u.durCount > 0 ? Math.round(u.durSec / u.durCount / 60 * 10) / 10 : 0

        return {
          userId: uid,
          fullName: u.fullName,
          totalCalls: u.calls,
          conversionRate: conv,
          avgAdherence: adh,
          avgSentimentScore: Math.round(sentAvg * 10) / 10,
          hotLeads: u.hotLeads,
          avgDurationMin: avgDur,
          isActive: activeUserIds.has(uid),
          needsCoaching: (adh > 0 && adh < 40) || negativeRate > 0.5,
        }
      })

      // Coaching alerts
      const coachingAlerts: CoachingAlert[] = []
      for (const s of sellers) {
        if (s.avgAdherence > 0 && s.avgAdherence < 40) {
          coachingAlerts.push({
            userId: s.userId,
            fullName: s.fullName,
            reason: 'Aderência ao script muito baixa',
            metric: `${s.avgAdherence}%`,
            severity: s.avgAdherence < 25 ? 'high' : 'medium',
          })
        } else if (s.avgSentimentScore > 0 && s.avgSentimentScore < 1.5 && s.totalCalls >= 3) {
          coachingAlerts.push({
            userId: s.userId,
            fullName: s.fullName,
            reason: 'Maioria dos leads com sentimento negativo',
            metric: `${s.totalCalls} calls`,
            severity: 'medium',
          })
        }
      }

      // Pain points top 10
      const painPoints: PainPointAggregate[] = Object.entries(painFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pain, count]) => ({ pain, count }))

      // Adherence overview
      const adherenceSellers = sellers
        .filter(s => s.avgAdherence > 0)
        .sort((a, b) => a.avgAdherence - b.avgAdherence)
        .map(s => ({ fullName: s.fullName, avgAdherence: s.avgAdherence, callCount: s.totalCalls }))
      const teamAdherence = adherenceCount > 0 ? Math.round(adherenceSum / adherenceCount) : 0

      // KPIs
      const avgDurMin = durCount > 0 ? Math.round(totalDurSec / durCount / 60 * 10) / 10 : 0
      const totalMinutes = Math.floor(totalDurSec / 60)
      const hours = Math.floor(totalMinutes / 60)
      const mins = totalMinutes % 60
      const totalHours = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      const decidedTotal = pipeline.converted + pipeline.followUp + pipeline.lost
      const realConversion = decidedTotal > 0 ? Math.round((pipeline.converted / decidedTotal) * 100) : 0

      // ── Build drill-down data ──

      // Coaching alert details with script name + recent low-adherence calls
      const coachingAlertDetails: CoachingAlertDetail[] = coachingAlerts.map(alert => {
        const userCalls = sellerCalls[alert.userId] ?? []
        const lowCalls = userCalls
          .filter(c => c.adherence !== null && c.adherence < 40)
          .slice(-3)
          .map(c => ({ date: c.date, score: c.adherence!, callId: c.callId }))
        // Find most used script for this seller from calls
        const sellerCallsData = calls.filter((c: any) => c.user_id === alert.userId)
        const scriptNames = sellerCallsData
          .map((c: any) => Array.isArray(c.script) ? c.script[0]?.name : (c.script as any)?.name)
          .filter(Boolean)
        const scriptName = scriptNames.length > 0 ? scriptNames[0] : null
        return { ...alert, scriptName, recentCalls: lowCalls }
      })

      // Temperature details
      const temperatureDetails: TemperatureDetail[] = (['frio', 'morno', 'quente', 'fechando'] as const).map(level => ({
        level,
        leads: tempDetails[level].slice(0, 10),
      }))

      // Pipeline details
      const pipelineDetails: PipelineDetail[] = (['converted', 'followUp', 'lost', 'unknown'] as const).map(stage => ({
        stage,
        calls: pipeDetails[stage].sort((a, b) => a.daysSince - b.daysSince).slice(0, 15),
      }))

      // Seller details with recent calls + trend
      const sellerDetails: SellerDetail[] = sellers.map(s => {
        const recentCalls = (sellerCalls[s.userId] ?? []).slice(-5)
        const half = Math.floor(recentCalls.length / 2)
        let trendUp: boolean | null = null
        if (recentCalls.length >= 4) {
          const firstHalf = recentCalls.slice(0, half).filter(c => c.adherence != null)
          const secondHalf = recentCalls.slice(half).filter(c => c.adherence != null)
          if (firstHalf.length > 0 && secondHalf.length > 0) {
            const avgFirst = firstHalf.reduce((s, c) => s + (c.adherence ?? 0), 0) / firstHalf.length
            const avgSecond = secondHalf.reduce((s, c) => s + (c.adherence ?? 0), 0) / secondHalf.length
            trendUp = avgSecond > avgFirst
          }
        }
        return { ...s, recentCalls, trendUp }
      })

      // Pain point details with conversion correlation
      const painPointDetails: PainPointDetail[] = Object.entries(painFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pain, count]) => ({
          pain,
          count,
          converted: painConversion[pain]?.converted ?? 0,
          lost: painConversion[pain]?.lost ?? 0,
        }))

      setData({
        kpis: {
          totalCalls: calls.length,
          realConversionRate: realConversion,
          avgAdherenceScore: teamAdherence,
          avgDurationMin: avgDurMin,
          totalHours,
          callsToday,
        },
        pipeline,
        temperature,
        sentiment,
        sellers,
        coachingAlerts,
        financial: {
          totalMonthlyLoss: Math.round(financialMonthly),
          totalAnnualLoss: Math.round(financialAnnual),
          callsWithFinancialData: financialDataCount,
        },
        painPoints,
        adherence: { teamAverage: teamAdherence, sellers: adherenceSellers },
        monthlyData,
        weeklyData,
        coachingAlertDetails,
        temperatureDetails,
        pipelineDetails,
        sellerDetails,
        painPointDetails,
      })
      setLoading(false)
    }

    fetchAll()
  }, [orgId, period])

  return { data, loading }
}
