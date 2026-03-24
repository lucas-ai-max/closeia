'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
    NEON_PINK, CARD_BG, CARD_BORDER,
    KpiCard, LoadingSpinner, SectionCard, PeriodFilter, fmtDate, fmtDuration, shouldIncludeUser,
    type Period, type EnvMode,
} from './shared'

interface CallRow {
    id: string
    status: string | null
    platform: string | null
    started_at: string
    duration_seconds: number | null
    user?: { full_name?: string } | null
}

export default function TabChamadas({ envMode }: { envMode: EnvMode }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [calls, setCalls] = useState<CallRow[]>([])
    const [period, setPeriod] = useState<Period>('30d')
    const [totalAll, setTotalAll] = useState(0)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            let dateFilter: string | null = null
            if (period === '7d') dateFilter = new Date(Date.now() - 7 * 86400000).toISOString()
            else if (period === '30d') dateFilter = new Date(Date.now() - 30 * 86400000).toISOString()

            let query = supabase
                .from('calls')
                .select('id, status, platform, started_at, duration_seconds, user:profiles!user_id(full_name)')
                .order('started_at', { ascending: false })
                .limit(200)
            if (dateFilter) query = query.gte('started_at', dateFilter)

            const [{ data: callsData }, { count: total }] = await Promise.all([
                query,
                supabase.from('calls').select('*', { count: 'exact', head: true }),
            ])

            const normalized = (callsData as any[] ?? []).map((c: any) => ({
                ...c,
                user: Array.isArray(c.user) ? c.user[0] : c.user,
            })) as CallRow[]

            // Filter by env mode
            const filtered = normalized.filter(c => shouldIncludeUser(c.user?.full_name, envMode))
            setCalls(filtered)
            setTotalAll(total ?? 0)
            setLoading(false)
        }
        fetchData()
    }, [period])

    const completed = useMemo(() => calls.filter(c => c.status === 'COMPLETED').length, [calls])
    const avgDuration = useMemo(() => {
        const durations = calls.filter(c => c.duration_seconds && c.duration_seconds > 0).map(c => c.duration_seconds!)
        return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
    }, [calls])

    const callsPerDay = useMemo(() => {
        const map: Record<string, number> = {}
        for (const c of calls) {
            const day = c.started_at?.slice(0, 10)
            if (day) map[day] = (map[day] || 0) + 1
        }
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date: date.slice(5), count }))
    }, [calls])

    const statusColor = (s: string | null) => {
        if (s === 'COMPLETED') return 'bg-green-500/10 text-green-400'
        if (s === 'ACTIVE') return 'bg-blue-500/10 text-blue-400'
        if (s === 'ABANDONED') return 'bg-red-500/10 text-red-400'
        return 'bg-gray-500/10 text-gray-400'
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-8">
            {/* Header with filter */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Mostrando {calls.length} chamadas ({totalAll} total)</p>
                <PeriodFilter period={period} onChange={setPeriod} />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard label="Chamadas no Periodo" value={`${calls.length}`} sub={`${totalAll} total`} color={NEON_PINK} icon="call" />
                <KpiCard label="Concluidas" value={`${completed}`} sub={`${calls.length > 0 ? ((completed / calls.length) * 100).toFixed(0) : 0}% do periodo`} color="#22c55e" icon="call_end" />
                <KpiCard label="Duracao Media" value={fmtDuration(avgDuration)} sub="por chamada" color="#3b82f6" icon="timer" />
            </div>

            {/* Chart */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Chamadas / Dia</h3>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={callsPerDay} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="#666" fontSize={11} />
                        <YAxis stroke="#666" fontSize={11} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 }} />
                        <Bar dataKey="count" fill={NEON_PINK} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Calls Table */}
            <SectionCard title="Chamadas Recentes">
                <div className="overflow-x-auto scrollbar-dark">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 text-left text-xs uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-3 font-medium">Data</th>
                                <th className="px-6 py-3 font-medium">Vendedor</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Plataforma</th>
                                <th className="px-6 py-3 font-medium text-right">Duracao</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calls.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhuma chamada encontrada</td>
                                </tr>
                            ) : (
                                calls.map(c => (
                                    <tr key={c.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                        <td className="px-6 py-3 text-gray-300">{fmtDate(c.started_at)}</td>
                                        <td className="px-6 py-3 text-white font-medium">{c.user?.full_name || '—'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
                                                {c.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-400">{c.platform || '—'}</td>
                                        <td className="px-6 py-3 text-gray-300 text-right font-mono">
                                            {c.duration_seconds != null ? fmtDuration(c.duration_seconds) : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    )
}
