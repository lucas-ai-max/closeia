'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const NEON_PINK = '#ff007a'
const NEON_GREEN = '#00ff94'
const NEON_PURPLE = '#9d00ff'
const NEON_BLUE = '#00d1ff'
const NEON_ORANGE = '#ff8a00'

interface RecentCall {
  id: string
  started_at: string
  ended_at: string | null
  user?: {
    full_name: string
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '...'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'agora'
  if (diffMinutes < 60) return `${diffMinutes}m`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

export function RightSidebar() {
  const [mounted, setMounted] = useState(false)
  const [totalCalls, setTotalCalls] = useState<number>(0)
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])
  const [todayCompleted, setTodayCompleted] = useState<number>(0)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Get user profile for data isolation
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
      const orgId = (prof as any)?.organization_id
      const isSeller = (prof as any)?.role === 'SELLER'

      const addScope = (query: any) => {
        if (isSeller) return query.eq('user_id', user.id)
        if (orgId) return query.eq('organization_id', orgId)
        return query
      }

      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count: monthCount } = await addScope(supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'COMPLETED')
        .gte('started_at', firstOfMonth))
      setTotalCalls(monthCount ?? 0)

      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const { count: todayCount } = await addScope(supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'COMPLETED')
        .gte('started_at', startOfDay))
      setTodayCompleted(todayCount ?? 0)

      const { data: recent } = await addScope(supabase
        .from('calls')
        .select(`
          id,
          started_at,
          ended_at,
          user:profiles!user_id(full_name)
        `)
        .eq('status', 'COMPLETED')
        .order('ended_at', { ascending: false })
        .limit(5))

      if (recent) {
        const mapped: RecentCall[] = (recent as any[]).map((r) => ({
          ...r,
          user: r.user ? { full_name: (r.user as any).full_name } : undefined
        }))
        setRecentCalls(mapped)
      }
    } catch {
      setTotalCalls(0)
      setTodayCompleted(0)
      setRecentCalls([])
    }
  }

  return (
    <aside
      suppressHydrationWarning={true}
      className="w-80 shrink-0 bg-black border-l border-white/5 p-6 overflow-y-auto scrollbar-hide"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
    >
      {/* Icons — static, safe for hydration */}
      <div className="flex items-center justify-end gap-4 mb-8">
        <div className="relative">
          <span className="material-icons-outlined text-gray-400">
            notifications
          </span>
          <span
            className="absolute top-0 right-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: NEON_PINK }}
          />
        </div>
        <span className="material-icons-outlined text-gray-400">mail</span>
      </div>

      {/* ALL dynamic content wrapped in mounted check */}
      {!mounted ? (
        /* SKELETON — matches on server and client's first render */
        <div className="space-y-8 animate-pulse">
          <div
            className="relative p-5 rounded-2xl border-l-4 overflow-hidden"
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              borderColor: NEON_PINK,
            }}
          >
            <div className="h-3 w-16 bg-white/5 rounded mb-3" />
            <div className="h-8 w-24 bg-white/5 rounded mb-1" />
            <div className="h-3 w-32 bg-white/5 rounded" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-12 bg-white/5 rounded" />
              <div className="h-3 w-16 bg-white/5 rounded" />
            </div>
            <div className="space-y-4">
              <div className="h-16 w-full bg-white/5 rounded-xl" />
              <div className="h-16 w-full bg-white/5 rounded-xl" />
            </div>
          </div>
          <div>
            <div className="h-4 w-32 bg-white/5 rounded mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 bg-white/5 rounded" />
                    <div className="h-2 w-1/2 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* REAL CONTENT — only after mount, with real Supabase data */
        <>
          {/* Card Resumo — real count */}
          <div
            className="relative p-5 rounded-2xl mb-8 border-l-4 overflow-hidden"
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              borderColor: NEON_PINK,
              boxShadow: '0 0 24px rgba(255, 0, 122, 0.08)',
            }}
          >
            <div className="mb-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Resumo do Mês
              </span>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight mb-1" suppressHydrationWarning={true}>
              {totalCalls.toLocaleString('pt-BR')}
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              Chamadas concluídas
            </p>
          </div>

          {/* Hoje — real stats */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white">Hoje</h3>
              <Link href="/calls" className="text-gray-500 text-xs hover:text-white">
                Ver tudo
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between glass-card-dark p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${NEON_GREEN}20` }}
                  >
                    <span className="material-icons-outlined text-lg" style={{ color: NEON_GREEN }}>
                      call
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Chamadas concluídas</div>
                    <div className="text-[10px] text-gray-500">Hoje</div>
                  </div>
                </div>
                <div className="text-xs font-bold" style={{ color: NEON_GREEN }}>
                  {todayCompleted}
                </div>
              </div>
              <div className="flex items-center justify-between glass-card-dark p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${NEON_BLUE}20` }}
                  >
                    <span className="material-icons-outlined text-lg" style={{ color: NEON_BLUE }}>
                      trending_up
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Total do mês</div>
                    <div className="text-[10px] text-gray-500">Chamadas</div>
                  </div>
                </div>
                <div className="text-xs font-bold" style={{ color: NEON_BLUE }}>
                  {totalCalls}
                </div>
              </div>
            </div>
          </div>

          {/* Chamadas recentes — real data from Supabase */}
          <div>
            <h3 className="font-bold text-sm text-white mb-4">Chamadas recentes</h3>
            <div className="space-y-4">
              {recentCalls.length === 0 ? (
                <div className="text-center text-gray-600 text-xs py-4">
                  Nenhuma chamada recente
                </div>
              ) : (
                recentCalls.map((call) => {
                  const displayName = call.user?.full_name || 'Vendedor'
                  const initial = displayName.charAt(0).toUpperCase()
                  const relativeTime = formatRelativeTime(call.ended_at)

                  return (
                    <div key={call.id} className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-700 border border-white/10 flex items-center justify-center text-white text-sm font-bold">
                          {initial}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white truncate">
                            {displayName}
                          </span>
                          <span className="text-[10px] text-gray-600 shrink-0 ml-2">
                            {relativeTime}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          Chamada finalizada
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
