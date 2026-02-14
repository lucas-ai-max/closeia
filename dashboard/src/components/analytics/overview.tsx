'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

const DATA = [
  { name: 'Jan', total: 2500 },
  { name: 'Fev', total: 3200 },
  { name: 'Mar', total: 1800 },
  { name: 'Abr', total: 4100 },
  { name: 'Mai', total: 5600 },
  { name: 'Jun', total: 3800 },
]

const PRIMARY_COLOR = '#5e5ce6'

interface OverviewProps {
  height?: number
}

export function Overview({ height = 256 }: OverviewProps) {
  return (
    <div className="animate-chart-in opacity-0" style={{ animationDelay: '200ms' }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={DATA}>
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Bar
            dataKey="total"
            fill={PRIMARY_COLOR}
            radius={[4, 4, 0, 0]}
            isAnimationActive
            animationBegin={400}
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
