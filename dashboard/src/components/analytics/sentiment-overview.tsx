'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SentimentDistribution } from '@/types/analytics'

const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }

const SEGMENTS = [
  { key: 'positive' as const, label: 'Positivo', color: '#00ff94' },
  { key: 'neutral' as const, label: 'Neutro', color: '#888' },
  { key: 'mixed' as const, label: 'Misto', color: '#f59e0b' },
  { key: 'negative' as const, label: 'Negativo', color: '#ff007a' },
]

export function SentimentOverview({ data }: { data: SentimentDistribution }) {
  const total = data.positive + data.neutral + data.negative + data.mixed
  const chartData = SEGMENTS
    .map(s => ({ name: s.label, value: data[s.key], color: s.color }))
    .filter(d => d.value > 0)

  const dominantSentiment = SEGMENTS.reduce((best, s) => {
    return data[s.key] > data[best.key] ? s : best
  }, SEGMENTS[0])

  return (
    <Card className="rounded-2xl border shadow-none h-full" style={CARD_STYLE}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-white">Sentimento dos Leads</CardTitle>
        <p className="text-xs text-gray-500">
          {total > 0
            ? `Predominante: ${dominantSentiment.label}`
            : 'Sem dados de sentimento no período'}
        </p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            Realize chamadas com análise de IA para ver o sentimento
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="shrink-0" suppressHydrationWarning>
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v: number | undefined) => [`${v ?? 0} (${Math.round((v ?? 0) / total * 100)}%)`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {SEGMENTS.map(s => {
                const count = data[s.key]
                const p = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-400 flex-1">{s.label}</span>
                    <span className="text-xs font-semibold text-white tabular-nums">{count}</span>
                    <span className="text-xs text-gray-600 tabular-nums w-8 text-right">{p}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
