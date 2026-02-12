'use client'

import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Overview } from '@/components/analytics/overview'
import { RecentCalls } from '@/components/analytics/recent-calls'
import { SellerDashboard } from '@/components/analytics/seller-dashboard'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const HERO_STATS = [
  { value: '1.234', label: 'Total de Chamadas', sub: null },
  { value: '412', label: 'Por Script', sub: '(33%)' },
  { value: '289', label: 'Por Agente', sub: '(23%)' },
  { value: '198', label: 'Convertidas', sub: '(16%)' },
  { value: '335', label: 'Em follow-up', sub: '(27%)' },
]

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) setUserRole((profile as any).role)
      }
      setLoading(false)
    }
    checkRole()
  }, [])

  if (loading) return <div className="p-8">Carregando...</div>

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
      <DashboardHeader title="Dashboard (Visão Gestor)" />
      <section
        className="mb-8 p-8 rounded-3xl overflow-hidden relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg2.jpg)' }}
      >
        <div className="absolute inset-0 bg-white/40 pointer-events-none" aria-hidden />
        <div className="relative z-10 text-slate-900 mb-8">
          <h2 className="text-2xl font-bold mb-1">Distribuição de Chamadas</h2>
          <p className="text-slate-700 text-sm">
            Visão geral das chamadas no período
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-4">
          {HERO_STATS.map((stat) => (
            <div
              key={stat.label}
              className="glass-card p-6 rounded-2xl border border-slate-200/80"
            >
              <div className="flex items-center gap-2">
                <p className="text-2xl md:text-3xl font-bold text-slate-900">
                  {stat.value}
                </p>
                {stat.sub && (
                  <span className="text-xs text-slate-600 font-medium">
                    {stat.sub}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-8">
        <ObjectionAnalytics />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold">Visão de Chamadas</h3>
            <button type="button" className="text-slate-400" aria-label="Mais">
              <span className="material-icons-outlined">more_horiz</span>
            </button>
          </div>
          <div className="flex items-center justify-around py-4">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <circle
                  className="dark:stroke-slate-800"
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="70"
                  stroke="#e2e8f0"
                  strokeWidth="20"
                />
                <circle
                  className="transition-all duration-500"
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="70"
                  stroke="#5e5ce6"
                  strokeDasharray="440"
                  strokeDashoffset="110"
                  strokeWidth="20"
                />
                <circle
                  className="transition-all duration-500"
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="70"
                  stroke="#00d2ff"
                  strokeDasharray="440"
                  strokeDashoffset="380"
                  strokeWidth="20"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">75%</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <div>
                  <p className="text-xs text-slate-500">Objetivo atingido</p>
                  <p className="text-sm font-bold">924</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <div>
                  <p className="text-xs text-slate-500">Em andamento</p>
                  <p className="text-sm font-bold">310</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold">Chamadas por Semana</h3>
            <button type="button" className="text-slate-400" aria-label="Mais">
              <span className="material-icons-outlined">more_horiz</span>
            </button>
          </div>
          <div className="flex items-end justify-between h-40 gap-2 px-2">
            {[40, 60, 50, 85, 45, 65, 30].map((h, i) => (
              <div
                key={i}
                className={`w-full rounded-t-lg chart-bar flex-1 ${i === 3 ? 'bg-primary' : 'bg-indigo-100 dark:bg-indigo-900/30'
                  }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-medium">
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold">Chamadas Mensais</h3>
            <button type="button" className="text-slate-400" aria-label="Mais">
              <span className="material-icons-outlined">more_horiz</span>
            </button>
          </div>
          <div className="h-40 relative flex items-end">
            <svg className="w-full overflow-visible" viewBox="0 0 400 100">
              <defs>
                <linearGradient
                  id="grad1"
                  x1="0%"
                  x2="0%"
                  y1="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    style={{ stopColor: 'rgba(94, 92, 230, 0.4)' }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: 'rgba(94, 92, 230, 0)' }}
                  />
                </linearGradient>
              </defs>
              <path
                d="M0,80 C50,80 100,20 150,50 C200,80 250,10 300,40 C350,70 400,50 400,100 L0,100 Z"
                fill="url(#grad1)"
              />
              <path
                d="M0,80 C50,80 100,20 150,50 C200,80 250,10 300,40 C350,70 400,50"
                fill="none"
                stroke="#5e5ce6"
                strokeWidth="3"
              />
              <circle cx="270" cy="20" fill="#5e5ce6" r="4" />
            </svg>
          </div>
          <div className="flex justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs font-bold">
                Este mês <span className="text-slate-400 font-normal">312</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-bold">
                Mês anterior <span className="text-slate-400 font-normal">289</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div >

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="font-bold text-xl mb-1">Overview</h3>
              <p className="text-xs text-indigo-500 font-medium">
                +8,06% <span className="text-slate-400">vs. mês anterior</span>
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-icons-outlined text-sm">ios_share</span>
              Exportar
            </button>
          </div>
          <div className="h-64 pl-0 mb-6">
            <Overview />
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-bold">1.234</p>
            <p className="text-xs text-slate-500 font-medium">
              Total de chamadas no período
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold">Chamadas Recentes</h3>
            <button type="button" className="text-slate-400" aria-label="Mais">
              <span className="material-icons-outlined">more_horiz</span>
            </button>
          </div>
          <RecentCalls />
          <a
            href="/calls"
            className="w-full mt-8 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-primary rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2"
          >
            Ver todas as chamadas
            <span className="material-icons-outlined text-[18px]">
              arrow_forward
            </span>
          </a>
        </div>
      </div>
    </>
  )
}
