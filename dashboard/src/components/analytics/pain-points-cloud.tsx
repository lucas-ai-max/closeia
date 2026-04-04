'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PainPointAggregate } from '@/types/analytics'

const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }
const NEON_PINK = '#ff007a'
const MAX_ITEMS = 7
const LABEL_MAX = 38

export function PainPointsCloud({ data }: { data: PainPointAggregate[] }) {
  const top = data.slice(0, MAX_ITEMS)
  const chartData = top.map(d => ({
    name: d.pain.length > LABEL_MAX ? d.pain.slice(0, LABEL_MAX) + '…' : d.pain,
    fullName: d.pain,
    count: d.count,
  }))

  return (
    <Card className="rounded-2xl border shadow-none" style={CARD_STYLE}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-white">Principais Dores dos Clientes</CardTitle>
        <p className="text-xs text-gray-500">Extraídas da análise de IA das chamadas</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            Sem dados — realize chamadas com análise de IA para ver as dores dos clientes
          </p>
        ) : (
          <div suppressHydrationWarning>
            <ResponsiveContainer width="100%" height={top.length * 40 + 8}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ left: 4, right: 20, top: 2, bottom: 2 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={210}
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                  formatter={(v: number | undefined) => [v ?? 0, 'ocorrências']}
                />
                <Bar
                  dataKey="count"
                  fill={NEON_PINK}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive
                  animationBegin={300}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
