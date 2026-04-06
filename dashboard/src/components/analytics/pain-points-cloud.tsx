'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PainPointDetail } from '@/types/analytics'

const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }
const NEON_PINK = '#ff007a'
const NEON_GREEN = '#00ff94'
const MAX_ITEMS = 7

export function PainPointsCloud({ data }: { data: PainPointDetail[] }) {
  const top = data.slice(0, MAX_ITEMS)
  const maxCount = top.length > 0 ? Math.max(...top.map(d => d.count)) : 1

  return (
    <Card className="rounded-2xl border shadow-none h-full" style={CARD_STYLE}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-white">Principais Dores dos Clientes</CardTitle>
        <p className="text-xs text-gray-500">Extraídas da análise de IA — com correlação de conversão</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            Sem dados — realize chamadas com análise de IA para ver as dores dos clientes
          </p>
        ) : (
          <div className="space-y-2.5">
            {top.map((item, i) => {
              const barPct = Math.max(5, (item.count / maxCount) * 100)
              const totalOutcomes = item.converted + item.lost
              const convPct = totalOutcomes > 0 ? Math.round((item.converted / totalOutcomes) * 100) : null
              const barColor = convPct !== null
                ? (convPct >= 50 ? NEON_GREEN : NEON_PINK)
                : '#555'

              return (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-300 truncate flex-1 mr-2" title={item.pain}>
                      {item.pain}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {totalOutcomes > 0 && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <span style={{ color: NEON_GREEN }}>{item.converted}✓</span>
                          <span className="text-gray-600">/</span>
                          <span style={{ color: NEON_PINK }}>{item.lost}✗</span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500 tabular-nums w-6 text-right">{item.count}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barPct}%`, backgroundColor: barColor, opacity: 0.7 }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-4 pt-2 text-[10px] text-gray-600">
              <span className="flex items-center gap-1"><span style={{ color: NEON_GREEN }}>●</span> Mais conversões</span>
              <span className="flex items-center gap-1"><span style={{ color: NEON_PINK }}>●</span> Mais perdas</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
