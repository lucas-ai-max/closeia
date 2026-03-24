'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid,
} from 'recharts'
import {
    NEON_PINK, CARD_BG, CARD_BORDER, BRL_RATE,
    KpiCard, LoadingSpinner, SectionCard, fmtDateShort, fmtDuration, fmtCurrency,
    shouldIncludeUser, shouldIncludeOrg, type EnvMode,
} from './shared'

interface OverviewData {
    totalUsers: number
    totalOrgs: number
    totalCalls: number
    totalScripts: number
    activeSubscriptions: number
    totalRevenueCents: number
    avgCallDuration: number
    newUsersLast30d: number
    planDistribution: { plan: string; count: number }[]
    recentUsers: { id: string; full_name: string | null; role: string | null; created_at: string }[]
    usersPerDay: { date: string; count: number }[]
    callsPerDay: { date: string; count: number }[]
}

export default function TabVisaoGeral({ envMode }: { envMode: EnvMode }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<OverviewData | null>(null)

    useEffect(() => {
        async function fetchAll() {
            setLoading(true)

            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

            const [
                { data: totalUsers },
                { data: allOrgs },
                { data: totalCalls },
                { data: allScripts },
                { data: subsData },
                { data: ordersData },
                { data: callsDuration },
                { data: newUsersLast30d },
                { data: recentUsersData },
                { data: profilesForChart },
                { data: callsForChart },
            ] = await Promise.all([
                supabase.from('profiles').select('full_name'),
                supabase.from('organizations').select('name, plan'),
                supabase.from('calls').select('user:profiles!user_id(full_name)'),
                supabase.from('scripts').select('organization_id, organization:organizations!organization_id(name)'),
                supabase.from('billing_subscriptions').select('status, organization:organizations!organization_id(name)'),
                supabase.from('billing_orders').select('amount_cents, status, organization:organizations!organization_id(name)'),
                supabase.from('calls').select('duration_seconds, user:profiles!user_id(full_name)').not('duration_seconds', 'is', null),
                supabase.from('profiles').select('full_name').gte('created_at', thirtyDaysAgo),
                supabase.from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false }).limit(20),
                supabase.from('profiles').select('full_name, created_at').gte('created_at', thirtyDaysAgo),
                supabase.from('calls').select('started_at, user:profiles!user_id(full_name)').gte('started_at', thirtyDaysAgo),
            ])

            // Helpers
            const getOrgName = (row: any) => {
                const org = Array.isArray(row.organization) ? row.organization[0] : row.organization
                return org?.name ?? null
            }
            const getUserName = (row: any) => {
                const user = Array.isArray(row.user) ? row.user[0] : row.user
                return user?.full_name ?? null
            }
            // Total users
            const realUsers = (totalUsers ?? []).filter((p: any) => shouldIncludeUser(p.full_name, envMode))
            const realUserCount = realUsers.length

            // Total orgs (filtered by env mode)
            const realOrgs = (allOrgs ?? []).filter((o: any) => shouldIncludeOrg(o.name, envMode))
            const realOrgCount = realOrgs.length

            // Total calls
            const realCalls = (totalCalls ?? []).filter((c: any) => shouldIncludeUser(getUserName(c), envMode))
            const realCallCount = realCalls.length

            // Total scripts (filtered by org env mode)
            const realScripts = (allScripts ?? []).filter((s: any) => shouldIncludeOrg(getOrgName(s), envMode))
            const realScriptCount = realScripts.length

            // Active subscriptions
            const activeSubscriptions = (subsData ?? []).filter((s: any) => s.status === 'active' && shouldIncludeOrg(getOrgName(s), envMode)).length

            // Total revenue from paid orders
            const totalRevenueCents = (ordersData ?? [])
                .filter((o: any) => o.status === 'paid' && shouldIncludeOrg(getOrgName(o), envMode))
                .reduce((sum: number, o: any) => sum + (Number(o.amount_cents) || 0), 0)

            // Avg call duration
            const durations = (callsDuration ?? [])
                .filter((c: any) => shouldIncludeUser(getUserName(c), envMode))
                .map((c: any) => Number(c.duration_seconds)).filter((d: number) => d > 0)
            const avgCallDuration = durations.length > 0 ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : 0

            // Plan distribution (filtered by env mode)
            const planMap: Record<string, number> = {}
            for (const o of realOrgs as any[]) {
                const plan = o.plan || 'free'
                planMap[plan] = (planMap[plan] || 0) + 1
            }
            const planDistribution = Object.entries(planMap).map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count)

            // New users last 30d
            const realNewUsers = (newUsersLast30d as any ?? []).filter((p: any) => shouldIncludeUser(p.full_name, envMode))
            const realNewUserCount = realNewUsers.length

            // Users per day (last 30d)
            const usersPerDayMap: Record<string, number> = {}
            for (const p of (profilesForChart ?? []) as any[]) {
                if (!shouldIncludeUser(p.full_name, envMode)) continue
                const day = p.created_at?.slice(0, 10)
                if (day) usersPerDayMap[day] = (usersPerDayMap[day] || 0) + 1
            }
            const usersPerDay = Object.entries(usersPerDayMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, count]) => ({ date: date.slice(5), count }))

            // Calls per day (last 30d)
            const callsPerDayMap: Record<string, number> = {}
            for (const c of (callsForChart ?? []) as any[]) {
                if (!shouldIncludeUser(getUserName(c), envMode)) continue
                const day = c.started_at?.slice(0, 10)
                if (day) callsPerDayMap[day] = (callsPerDayMap[day] || 0) + 1
            }
            const callsPerDay = Object.entries(callsPerDayMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, count]) => ({ date: date.slice(5), count }))

            // Filter recent users
            const filteredRecentUsers = ((recentUsersData ?? []) as any[]).filter((u: any) => shouldIncludeUser(u.full_name, envMode)).slice(0, 10)

            setData({
                totalUsers: realUserCount,
                totalOrgs: realOrgCount,
                totalCalls: realCallCount,
                totalScripts: realScriptCount,
                activeSubscriptions,
                totalRevenueCents,
                avgCallDuration,
                newUsersLast30d: realNewUserCount,
                planDistribution,
                recentUsers: filteredRecentUsers,
                usersPerDay,
                callsPerDay,
            })
            setLoading(false)
        }
        fetchAll()
    }, [])

    if (loading || !data) return <LoadingSpinner />

    return (
        <div className="space-y-8">
            {/* KPI Cards - Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total de Usuarios" value={`${data.totalUsers}`} sub={`+${data.newUsersLast30d} este mes`} color={NEON_PINK} icon="people" />
                <KpiCard label="Organizacoes" value={`${data.totalOrgs}`} sub="cadastradas" color="#3b82f6" icon="business" />
                <KpiCard label="Total de Chamadas" value={`${data.totalCalls}`} sub="desde o inicio" color="#f59e0b" icon="call" />
                <KpiCard label="Total de Scripts" value={`${data.totalScripts}`} sub="criados" color="#22c55e" icon="description" />
            </div>

            {/* KPI Cards - Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Assinaturas Ativas" value={`${data.activeSubscriptions}`} sub="subscriptions" color="#a855f7" icon="check_circle" />
                <KpiCard label="Receita Total" value={fmtCurrency(data.totalRevenueCents)} sub="pedidos pagos" color="#22c55e" icon="attach_money" />
                <KpiCard label="Duracao Media" value={fmtDuration(data.avgCallDuration)} sub="por chamada" color="#06b6d4" icon="timer" />
                <KpiCard label="Novos Usuarios" value={`${data.newUsersLast30d}`} sub="ultimos 30 dias" color="#ec4899" icon="person_add" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Users per day */}
                <div className="rounded-2xl p-6 border" style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Novos Usuarios / Dia (30d)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={data.usersPerDay}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" stroke="#666" fontSize={11} />
                            <YAxis stroke="#666" fontSize={11} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 }} />
                            <Line type="monotone" dataKey="count" stroke={NEON_PINK} strokeWidth={2.5} dot={{ r: 3, fill: NEON_PINK }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Calls per day */}
                <div className="rounded-2xl p-6 border" style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Chamadas / Dia (30d)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.callsPerDay} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" stroke="#666" fontSize={11} />
                            <YAxis stroke="#666" fontSize={11} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan Distribution */}
                <SectionCard title="Distribuicao de Planos">
                    <div className="px-6 py-3">
                        {data.planDistribution.length === 0 ? (
                            <p className="text-sm text-gray-500 py-4 text-center">Nenhuma organizacao encontrada</p>
                        ) : (
                            <div className="space-y-2">
                                {data.planDistribution.map(row => (
                                    <div key={row.plan} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <span className="text-sm text-gray-300 capitalize">{row.plan}</span>
                                        <span className="text-sm font-bold" style={{ color: NEON_PINK }}>{row.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* Recent Users */}
                <SectionCard title="Ultimos Cadastros">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-left text-xs uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th className="px-6 py-2 font-medium">Nome</th>
                                    <th className="px-6 py-2 font-medium">Cargo</th>
                                    <th className="px-6 py-2 font-medium text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentUsers.map(u => (
                                    <tr key={u.id} className="border-t border-white/5">
                                        <td className="px-6 py-2.5 text-white font-medium">{u.full_name || '—'}</td>
                                        <td className="px-6 py-2.5 text-gray-400 capitalize">{u.role?.toLowerCase() || '—'}</td>
                                        <td className="px-6 py-2.5 text-gray-400 text-right">{fmtDateShort(u.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>
        </div>
    )
}
