'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CoachingAlertDetail } from '@/types/analytics'

const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' }
const NEON_GREEN = '#00ff94'
const NEON_ORANGE = '#ff8a00'
const NEON_PINK = '#ff007a'

export function CoachingAlerts({ alerts }: { alerts: CoachingAlertDetail[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (alerts.length === 0) {
    return (
      <Card className="rounded-2xl border shadow-none" style={CARD_STYLE}>
        <CardContent className="py-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full shrink-0"
              style={{ backgroundColor: `${NEON_GREEN}15`, border: `1px solid ${NEON_GREEN}30` }}
            />
            <div>
              <p className="text-sm font-semibold text-white">Equipe dentro dos parâmetros</p>
              <p className="text-xs text-gray-500">Nenhum vendedor requer atenção imediata</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border shadow-none" style={{ ...CARD_STYLE, borderColor: 'rgba(255,138,0,0.2)' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-bold text-white">
            Alertas de Coaching
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: 'rgba(255,138,0,0.15)', color: NEON_ORANGE }}>
              {alerts.length}
            </span>
          </CardTitle>
        </div>
        <p className="text-xs text-gray-500">Vendedores que precisam de atenção do gestor</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((alert, i) => {
            const color = alert.severity === 'high' ? NEON_PINK : NEON_ORANGE
            const isExpanded = expandedId === alert.userId
            return (
              <div
                key={alert.userId}
                className="rounded-xl border animate-chart-in opacity-0 cursor-pointer transition-all hover:brightness-110"
                style={{
                  backgroundColor: `${color}08`,
                  borderColor: `${color}25`,
                  animationDelay: `${i * 60}ms`,
                }}
                onClick={() => setExpandedId(isExpanded ? null : alert.userId)}
              >
                <div className="flex items-start gap-3 p-3">
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{alert.fullName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{alert.reason}</p>
                    {alert.scriptName && (
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Script: <span className="text-gray-400">{alert.scriptName}</span>
                      </p>
                    )}
                    <p className="text-xs font-bold mt-1" style={{ color }}>{alert.metric}</p>
                  </div>
                  <span className="text-gray-600 text-xs mt-1">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && alert.recentCalls.length > 0 && (
                  <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: `${color}15` }}>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-2 mb-1.5">Últimas calls com baixa aderência</p>
                    {alert.recentCalls.map((call, ci) => (
                      <div key={ci} className="flex items-center justify-between py-1">
                        <span className="text-[11px] text-gray-500">{call.date}</span>
                        <span className="text-[11px] font-bold" style={{ color: call.score < 25 ? NEON_PINK : NEON_ORANGE }}>
                          {call.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
