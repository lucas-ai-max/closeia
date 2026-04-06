'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TemperatureDistribution, TemperatureDetail } from '@/types/analytics'

const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }

const LEVELS = [
  { key: 'frio' as const, label: 'Frio', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { key: 'morno' as const, label: 'Morno', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { key: 'quente' as const, label: 'Quente', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { key: 'fechando' as const, label: 'Fechando', color: '#00ff94', bg: 'rgba(0,255,148,0.12)' },
]

interface Props {
  data: TemperatureDistribution
  details?: TemperatureDetail[]
}

export function TemperatureGauge({ data, details }: Props) {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null)
  const total = data.frio + data.morno + data.quente + data.fechando
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const hotPct = total > 0 ? Math.round(((data.quente + data.fechando) / total) * 100) : 0

  return (
    <Card className="rounded-2xl border shadow-none" style={CARD_STYLE}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-white">Temperatura dos Leads</CardTitle>
        <p className="text-xs text-gray-500">
          {hotPct}% dos leads estão quentes ou fechando
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {LEVELS.map((lvl, i) => {
          const count = data[lvl.key]
          const p = pct(count)
          const isExpanded = expandedLevel === lvl.key
          const levelDetail = details?.find(d => d.level === lvl.key)
          const hasLeads = levelDetail && levelDetail.leads.length > 0

          return (
            <div key={lvl.key}>
              <div
                className={`flex items-center gap-3 animate-chart-in opacity-0 ${hasLeads ? 'cursor-pointer hover:bg-white/[0.02] rounded-lg px-1 -mx-1 py-0.5' : ''}`}
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => hasLeads && setExpandedLevel(isExpanded ? null : lvl.key)}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lvl.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: lvl.color }}>
                      {lvl.label}
                      {hasLeads && <span className="text-[9px] text-gray-600">{isExpanded ? '▲' : '▼'}</span>}
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums">{count} ({p}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${p}%`, backgroundColor: lvl.color }}
                    />
                  </div>
                </div>
              </div>

              {isExpanded && levelDetail && levelDetail.leads.length > 0 && (
                <div className="ml-6 mt-2 mb-1 rounded-lg border p-2 space-y-1" style={{ borderColor: `${lvl.color}20`, backgroundColor: `${lvl.color}05` }}>
                  {levelDetail.leads.map((lead, li) => (
                    <div key={li} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white font-medium truncate">{lead.leadName}</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-500 truncate">{lead.sellerName}</span>
                      </div>
                      <span className="text-gray-600 shrink-0 ml-2">{lead.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {total === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">Sem dados de temperatura no período</p>
        )}
      </CardContent>
    </Card>
  )
}
