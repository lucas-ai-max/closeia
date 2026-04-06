export type AnalyticsPeriod = '7d' | '30d' | '90d'

export interface AnalyticsKPIs {
  totalCalls: number
  realConversionRate: number
  avgAdherenceScore: number
  avgDurationMin: number
  totalHours: string
  callsToday: number
}

export interface PipelineFunnel {
  converted: number
  followUp: number
  lost: number
  unknown: number
}

export interface TemperatureDistribution {
  frio: number
  morno: number
  quente: number
  fechando: number
}

export interface SentimentDistribution {
  positive: number
  neutral: number
  negative: number
  mixed: number
}

export interface SellerPerformanceRow {
  userId: string
  fullName: string
  totalCalls: number
  conversionRate: number
  avgAdherence: number
  avgSentimentScore: number
  hotLeads: number
  avgDurationMin: number
  isActive: boolean
  needsCoaching: boolean
}

export interface CoachingAlert {
  userId: string
  fullName: string
  reason: string
  metric: string
  severity: 'high' | 'medium'
}

export interface FinancialImpact {
  totalMonthlyLoss: number
  totalAnnualLoss: number
  callsWithFinancialData: number
}

export interface PainPointAggregate {
  pain: string
  count: number
}

export interface ScriptAdherenceData {
  teamAverage: number
  sellers: { fullName: string; avgAdherence: number; callCount: number }[]
}

// Drill-down detail for individual calls
export interface CallDetail {
  callId: string
  sellerName: string
  leadName: string
  date: string
  durationMin: number
  adherenceScore: number | null
  sentiment: string | null
  result: string | null
  temperature: string | null
  scriptName: string | null
  lossReason: string | null
  painPoints: string[]
}

// Extended coaching alert with call details
export interface CoachingAlertDetail extends CoachingAlert {
  scriptName: string | null
  recentCalls: { date: string; score: number; callId: string }[]
}

// Temperature with lead details
export interface TemperatureDetail {
  level: 'frio' | 'morno' | 'quente' | 'fechando'
  leads: { leadName: string; sellerName: string; date: string; callId: string }[]
}

// Pipeline with call details
export interface PipelineDetail {
  stage: 'converted' | 'followUp' | 'lost' | 'unknown'
  calls: { leadName: string; sellerName: string; date: string; callId: string; daysSince: number; lossReason: string | null }[]
}

// Pain point with conversion correlation
export interface PainPointDetail {
  pain: string
  count: number
  converted: number
  lost: number
}

// Seller with recent calls for drill-down
export interface SellerDetail extends SellerPerformanceRow {
  recentCalls: { date: string; adherence: number | null; result: string | null; callId: string }[]
  trendUp: boolean | null
}

export interface ManagerAnalyticsData {
  kpis: AnalyticsKPIs
  pipeline: PipelineFunnel
  temperature: TemperatureDistribution
  sentiment: SentimentDistribution
  sellers: SellerPerformanceRow[]
  coachingAlerts: CoachingAlert[]
  financial: FinancialImpact
  painPoints: PainPointAggregate[]
  adherence: ScriptAdherenceData
  monthlyData: { name: string; total: number }[]
  weeklyData: { day: string; total: number }[]
  // Drill-down data
  coachingAlertDetails: CoachingAlertDetail[]
  temperatureDetails: TemperatureDetail[]
  pipelineDetails: PipelineDetail[]
  sellerDetails: SellerDetail[]
  painPointDetails: PainPointDetail[]
}
