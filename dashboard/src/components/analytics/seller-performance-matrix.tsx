'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SellerDetail } from '@/types/analytics'

const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }
const NEON_GREEN = '#00ff94'
const NEON_PINK = '#ff007a'
const NEON_ORANGE = '#ff8a00'

type SortKey = 'totalCalls' | 'conversionRate' | 'avgAdherence' | 'hotLeads' | 'avgDurationMin'

function sentimentLabel(score: number) {
  if (score === 0) return { label: '—', color: '#555' }
  if (score >= 2.5) return { label: 'Positivo', color: NEON_GREEN }
  if (score >= 1.8) return { label: 'Neutro', color: '#888' }
  return { label: 'Negativo', color: NEON_PINK }
}

function metricColor(value: number, thresholds: [number, number]) {
  if (value >= thresholds[1]) return NEON_GREEN
  if (value >= thresholds[0]) return NEON_ORANGE
  return NEON_PINK
}

export function SellerPerformanceMatrix({ sellers }: { sellers: SellerDetail[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('totalCalls')
  const [asc, setAsc] = useState(false)
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null)

  const sorted = [...sellers].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return asc ? diff : -diff
  })

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setAsc(v => !v)
    else { setSortKey(key); setAsc(false) }
  }

  const SortTh = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="text-right text-gray-500 font-medium pb-3 cursor-pointer hover:text-gray-300 transition-colors select-none"
      onClick={() => handleSort(k)}
    >
      {label}
      {sortKey === k && (
        <span className="ml-1 text-[10px]" style={{ color: '#ff007a' }}>{asc ? '↑' : '↓'}</span>
      )}
    </th>
  )

  return (
    <Card className="rounded-2xl border shadow-none" style={CARD_STYLE}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-white">Desempenho dos Vendedores</CardTitle>
        <p className="text-xs text-gray-500">Clique nas colunas para ordenar</p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">Nenhum vendedor com chamadas no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-500 font-medium pb-3 pl-1 w-8">#</th>
                  <th className="text-left text-gray-500 font-medium pb-3">Vendedor</th>
                  <SortTh k="totalCalls" label="Calls" />
                  <SortTh k="conversionRate" label="Conversão" />
                  <SortTh k="avgAdherence" label="Aderência" />
                  <th className="text-right text-gray-500 font-medium pb-3">Sentimento</th>
                  <SortTh k="hotLeads" label="Leads Quentes" />
                  <SortTh k="avgDurationMin" label="Duração" />
                  <th className="text-right text-gray-500 font-medium pb-3 pr-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const sent = sentimentLabel(s.avgSentimentScore)
                  const isExpanded = expandedSeller === s.userId
                  return (
                    <><tr
                      key={s.userId}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setExpandedSeller(isExpanded ? null : s.userId)}
                    >
                      {/* Rank */}
                      <td className="py-3 pl-1">
                        <span className={`text-xs font-bold w-5 h-5 inline-flex items-center justify-center rounded-full ${
                          i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          i === 1 ? 'bg-gray-400/20 text-gray-300' :
                          i === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-white/5 text-gray-500'
                        }`}>{i + 1}</span>
                      </td>

                      {/* Name + coaching flag + trend */}
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{s.fullName}</span>
                          {s.trendUp !== null && (
                            <span className="text-[10px]" style={{ color: s.trendUp ? NEON_GREEN : NEON_PINK }}>
                              {s.trendUp ? '↑' : '↓'}
                            </span>
                          )}
                          {s.needsCoaching && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                              style={{ backgroundColor: 'rgba(255,138,0,0.15)', color: NEON_ORANGE }}>
                              atenção
                            </span>
                          )}
                          <span className="text-[9px] text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </td>

                      {/* Calls */}
                      <td className="py-3 text-right text-white tabular-nums">{s.totalCalls}</td>

                      {/* Conversion */}
                      <td className="py-3 text-right tabular-nums font-semibold"
                        style={{ color: s.conversionRate > 0 ? metricColor(s.conversionRate, [30, 60]) : '#555' }}>
                        {s.conversionRate > 0 ? `${s.conversionRate}%` : '—'}
                      </td>

                      {/* Adherence */}
                      <td className="py-3 text-right tabular-nums font-semibold"
                        style={{ color: s.avgAdherence > 0 ? metricColor(s.avgAdherence, [40, 70]) : '#555' }}>
                        {s.avgAdherence > 0 ? `${s.avgAdherence}%` : '—'}
                      </td>

                      {/* Sentiment */}
                      <td className="py-3 text-right">
                        <span className="text-xs font-medium" style={{ color: sent.color }}>{sent.label}</span>
                      </td>

                      {/* Hot leads */}
                      <td className="py-3 text-right tabular-nums">
                        {s.hotLeads > 0 ? (
                          <span className="font-semibold" style={{ color: NEON_ORANGE }}>{s.hotLeads}</span>
                        ) : (
                          <span className="text-gray-600">0</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 text-right text-gray-400 tabular-nums">{s.avgDurationMin > 0 ? `${s.avgDurationMin}m` : '—'}</td>

                      {/* Status */}
                      <td className="py-3 text-right pr-1">
                        {s.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Ativo
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-600">Offline</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && s.recentCalls && s.recentCalls.length > 0 && (
                      <tr key={`${s.userId}-detail`} className="border-b border-white/5">
                        <td colSpan={9} className="px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Últimas calls</p>
                          <div className="flex gap-2">
                            {s.recentCalls.map((call, ci) => (
                              <div key={ci} className="flex-1 rounded-lg border border-white/5 p-2 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <p className="text-[10px] text-gray-600">{call.date}</p>
                                <p className="text-sm font-bold mt-0.5" style={{
                                  color: call.adherence != null ? metricColor(call.adherence, [40, 70]) : '#555'
                                }}>
                                  {call.adherence != null ? `${call.adherence}%` : '—'}
                                </p>
                                <p className="text-[9px] mt-0.5" style={{
                                  color: call.result === 'CONVERTED' ? NEON_GREEN : call.result === 'LOST' ? NEON_PINK : '#666'
                                }}>
                                  {call.result === 'CONVERTED' ? 'Convertido' : call.result === 'LOST' ? 'Perdido' : call.result === 'FOLLOW_UP' ? 'Follow-up' : '—'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}</>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
