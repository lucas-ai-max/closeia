'use client'

import { DashboardHeader } from '@/components/layout/dashboard-header'
import { SellerDashboard } from '@/components/analytics/seller-dashboard'
import { ObjectionAnalytics } from '@/components/analytics/objection-analytics'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { linePathFromData, areaPathFromData } from '@/lib/chart-utils'

const NEON_PINK = '#ff007a'
const NEON_BLUE = '#00d1ff'
const NEON_GREEN = '#00ff94'
const NEON_ORANGE = '#ff8a00'

/** Dados para o gráfico de estatística de chamadas (meses Jan–Ago) */
const LINE_CHART_PREVIOUS = [120, 80, 140, 40, 100, 85, 130, 60]
const LINE_CHART_CURRENT = [150, 100, 120, 90, 140, 110, 95, 105]

const METRICS = [
  {
    change: '2.65%',
    positive: true,
    value: '1.450',
    label: 'Total de Chamadas',
    color: NEON_PINK,
    path: 'M0 25 Q 10 5, 20 20 T 40 10 T 60 15',
  },
  {
    change: '1.12%',
    positive: true,
    value: '412',
    label: 'Por Script',
    color: NEON_BLUE,
    path: 'M0 15 Q 15 25, 30 10 T 60 20',
  },
  {
    change: '0.45%',
    positive: false,
    value: '198',
    label: 'Convertidas',
    color: NEON_GREEN,
    path: 'M0 10 Q 15 5, 30 20 T 60 15',
  },
  {
    change: '2.12%',
    positive: true,
    value: '335',
    label: 'Em follow-up',
    color: NEON_ORANGE,
    path: 'M0 20 Q 15 10, 30 25 T 60 15',
  },
]

const TOP_LEADERS = [
  { name: 'Maria Silva', role: 'Vendas', target: 'R$ 124.500', conversion: '12%', performance: 75, color: NEON_PINK },
  { name: 'João Santos', role: 'SDR', target: 'R$ 98.200', conversion: '18%', performance: 100, color: NEON_BLUE },
  { name: 'Ana Oliveira', role: 'Vendas', target: 'R$ 87.000', conversion: '9%', performance: 60, color: NEON_GREEN },
]

const CHART_WIDTH = 960
const CHART_HEIGHT = 240
const CHART_VIEW_HEIGHT = 262
const CHART_PADDING = 20
const CHART_MARGIN_LEFT = -10
const PLOT_WIDTH = CHART_WIDTH - CHART_MARGIN_LEFT
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']

function getChartScale(valuesPrev: number[], valuesCurr: number[]) {
  const all = [...valuesPrev, ...valuesCurr]
  const dataMin = Math.min(...all)
  const dataMax = Math.max(...all)
  const range = dataMax - dataMin || 1
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2
  const valueToY = (v: number) =>
    CHART_PADDING + innerHeight - ((v - dataMin) / range) * innerHeight
  const ticks = 5
  const step = (dataMax - dataMin) / (ticks - 1)
  const yTickValues = Array.from({ length: ticks }, (_, i) =>
    Math.round(dataMin + step * i)
  )
  return { dataMin, dataMax, valueToY, yTickValues }
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [progressReady, setProgressReady] = useState(false)
  const [chartTooltip, setChartTooltip] = useState<{
    index: number
    x: number
    y: number
  } | null>(null)
  const chartRef = useRef<SVGSVGElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const t = setTimeout(() => setProgressReady(true), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    async function checkRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) setUserRole((profile as { role?: string }).role ?? null)
      }
      setLoading(false)
    }
    checkRole()
  }, [])

  if (loading) {
    return (
      <div className="p-8 text-gray-400">Carregando...</div>
    )
  }

  if (userRole === 'SELLER') {
    return (
      <>
        <DashboardHeader title="Dashboard" />
        <SellerDashboard stats={{}} />
      </>
    )
  }

  return (
    <>
      <DashboardHeader title="Dashboard" />

      {/* Card de métricas (4 colunas) */}
      <div
        className="rounded-[24px] border mb-8 flex flex-col md:flex-row items-stretch"
        style={{
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {METRICS.map((m, i) => (
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
              <div className="flex items-center gap-1 mb-2">
                <span
                  className={`material-icons-outlined text-lg ${
                    m.positive ? '' : 'rotate-180'
                  }`}
                  style={{ color: m.positive ? NEON_GREEN : '#ef4444' }}
                >
                  arrow_drop_up
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: m.positive ? NEON_GREEN : '#ef4444' }}
                >
                  {m.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{m.value}</h3>
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
        className="p-6 rounded-[24px] border mb-8 animate-chart-in opacity-0"
        style={{
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.05)',
          animationDelay: '320ms',
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-white">
            Estatística de Chamadas
          </h2>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: NEON_PINK }}
              />
              <span className="text-xs text-gray-400">Anterior</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: NEON_BLUE }}
              />
              <span className="text-xs text-gray-400">Atual</span>
            </div>
            <select
              className="bg-black/20 border-none rounded-lg text-xs py-1.5 px-3 text-gray-400 focus:ring-0 focus:outline-none"
              defaultValue="monthly"
            >
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
            </select>
          </div>
        </div>
        <div
          className="w-full aspect-[4/1] min-h-[200px] max-h-[320px] relative cursor-crosshair"
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
              7,
              Math.max(0, Math.round((plotX / PLOT_WIDTH) * 7))
            )
            setChartTooltip({
              index,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            })
          }}
          onMouseLeave={() => setChartTooltip(null)}
        >
          <svg
            ref={chartRef}
            className="w-full h-full"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_VIEW_HEIGHT}`}
          >
            <defs>
              <linearGradient id="grad-pink" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={NEON_PINK} stopOpacity="0.2" />
                <stop offset="100%" stopColor={NEON_PINK} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="grad-blue" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={NEON_BLUE} stopOpacity="0.2" />
                <stop offset="100%" stopColor={NEON_BLUE} stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const { valueToY, yTickValues } = getChartScale(
                LINE_CHART_PREVIOUS,
                LINE_CHART_CURRENT
              )
              return (
                <>
                  {/* Eixo Y: linha, ticks e labels */}
                  <line
                    x1={CHART_MARGIN_LEFT - 2}
                    y1={CHART_PADDING}
                    x2={CHART_MARGIN_LEFT - 2}
                    y2={CHART_HEIGHT - CHART_PADDING}
                    stroke="rgba(148, 163, 184, 0.4)"
                    strokeWidth="1"
                  />
                  {yTickValues.map((v) => {
                    const y = valueToY(v)
                    return (
                      <g key={v}>
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
                  {/* Eixo X: linha e ticks */}
                  <line
                    x1={CHART_MARGIN_LEFT}
                    y1={CHART_HEIGHT - CHART_PADDING}
                    x2={CHART_WIDTH}
                    y2={CHART_HEIGHT - CHART_PADDING}
                    stroke="rgba(148, 163, 184, 0.4)"
                    strokeWidth="1"
                  />
                  {MONTH_LABELS.map((label, i) => {
                    const tickX =
                      CHART_MARGIN_LEFT + (PLOT_WIDTH * i) / (MONTH_LABELS.length - 1)
                    return (
                      <g key={label}>
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
                  LINE_CHART_PREVIOUS,
                  PLOT_WIDTH,
                  CHART_HEIGHT,
                  CHART_PADDING
                )}
                fill="url(#grad-pink)"
              />
              <path
                className="chart-path animate-chart-path"
                d={linePathFromData(
                  LINE_CHART_PREVIOUS,
                  PLOT_WIDTH,
                  CHART_HEIGHT,
                  CHART_PADDING
                )}
                fill="none"
                stroke={NEON_PINK}
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={100}
                style={{
                  filter: `drop-shadow(0 0 4px ${NEON_PINK})`,
                  animationDelay: '0.4s',
                }}
              />
              <path
                className="chart-path animate-chart-path"
                d={linePathFromData(
                  LINE_CHART_CURRENT,
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
                  animationDelay: '0.55s',
                }}
              />
            </g>
          </svg>
          {chartTooltip !== null && (
            <div
              className="absolute z-10 pointer-events-none rounded-xl border p-4 shadow-xl backdrop-blur-sm"
              style={{
                left: chartTooltip.x + 12,
                top: chartTooltip.y - 8,
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                minWidth: 200,
              }}
            >
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {MONTH_LABELS[chartTooltip.index]}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Anterior</span>
                  <span className="font-bold text-white">
                    {LINE_CHART_PREVIOUS[chartTooltip.index]} chamadas
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Atual</span>
                  <span className="font-bold text-white">
                    {LINE_CHART_CURRENT[chartTooltip.index]} chamadas
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2 flex justify-between gap-4">
                  <span className="text-gray-400">Meta do mês</span>
                  <span className="font-semibold text-white">150</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Taxa conversão</span>
                  <span className="font-semibold text-neon-green">
                    {Math.round(
                      (LINE_CHART_CURRENT[chartTooltip.index] / 150) * 100
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Leader / Performance */}
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
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-500 text-xs font-bold uppercase tracking-widest border-b border-white/5">
              <th className="pb-4 font-bold">Usuário</th>
              <th className="pb-4 font-bold">Meta</th>
              <th className="pb-4 font-bold">Conversão</th>
              <th className="pb-4 font-bold">Performance</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {TOP_LEADERS.map((row, idx) => (
              <tr
                key={row.name}
                className="border-b border-white/5 last:border-0 animate-chart-in opacity-0"
                style={{ animationDelay: `${560 + idx * 80}ms` }}
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
                      {row.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white">{row.name}</div>
                      <div className="text-[10px] text-gray-500">{row.role}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 font-medium text-white">{row.target}</td>
                <td
                  className="py-4 font-bold"
                  style={{ color: NEON_GREEN }}
                >
                  {row.conversion}
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
      </div>

      <div className="mb-8 animate-chart-in opacity-0" style={{ animationDelay: '640ms' }}>
        <ObjectionAnalytics />
      </div>
    </>
  )
}
