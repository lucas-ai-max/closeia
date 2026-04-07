'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    NEON_PINK, KpiCard, LoadingSpinner, SectionCard, fmtDateShort, isExcludedUser, shouldIncludeUser,
    type EnvMode,
} from './shared'

interface UserRow {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
    organization_id: string | null
    is_active: boolean
    created_at: string
    organization?: {
        name: string
        plan: string | null
        phone: string | null
        email: string | null
        document: string | null
        address: string | null
    } | null
    // computed
    totalCallSeconds: number
    callCount: number
}

// Plan hour limits
const PLAN_HOURS: Record<string, number> = {
    FREE: 0,
    TRIAL: 2,
    STARTER: 25,
    PRO: 70,
    TEAM: 160,
    ENTERPRISE: -1, // unlimited
}

function fmtHours(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function TabUsuarios({ envMode }: { envMode: EnvMode }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<UserRow[]>([])
    const [totalUsers, setTotalUsers] = useState(0)
    const [usersWithCalls, setUsersWithCalls] = useState(0)
    const [totalHoursUsed, setTotalHoursUsed] = useState(0)
    const [search, setSearch] = useState('')
    const [expandedUser, setExpandedUser] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            const [
                { data: usersData },
                { data: callsData },
            ] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, full_name, email, role, organization_id, is_active, created_at, organization:organizations!organization_id(name, plan, phone, email, document, address)')
                    .order('created_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('calls')
                    .select('user_id, duration_seconds')
                    .not('duration_seconds', 'is', null),
            ])

            // Build call stats per user
            const callStats: Record<string, { seconds: number; count: number }> = {}
            for (const c of (callsData ?? []) as any[]) {
                if (!c.user_id) continue
                if (!callStats[c.user_id]) callStats[c.user_id] = { seconds: 0, count: 0 }
                callStats[c.user_id].seconds += (c.duration_seconds || 0)
                callStats[c.user_id].count += 1
            }

            const normalized = (usersData as any[] ?? []).map((u: any) => ({
                ...u,
                organization: Array.isArray(u.organization) ? u.organization[0] : u.organization,
                totalCallSeconds: callStats[u.id]?.seconds || 0,
                callCount: callStats[u.id]?.count || 0,
            })) as UserRow[]

            setUsers(normalized)

            const realUsers = normalized.filter(u => shouldIncludeUser(u.full_name, envMode))
            setTotalUsers(realUsers.length)
            setUsersWithCalls(realUsers.filter(u => u.callCount > 0).length)
            setTotalHoursUsed(realUsers.reduce((sum, u) => sum + u.totalCallSeconds, 0))

            setLoading(false)
        }
        fetchData()
    }, [])

    const envFiltered = users.filter(u => shouldIncludeUser(u.full_name, envMode))
    const filtered = search
        ? envFiltered.filter(u =>
            (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.role || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.organization?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.organization?.phone || '').toLowerCase().includes(search.toLowerCase())
        )
        : envFiltered

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard label="Total de Usuarios" value={`${totalUsers}`} sub="cadastrados" color={NEON_PINK} icon="people" />
                <KpiCard label="Usuarios Ativos" value={`${usersWithCalls}`} sub="com chamadas realizadas" color="#22c55e" icon="record_voice_over" />
                <KpiCard label="Horas Totais Usadas" value={fmtHours(totalHoursUsed)} sub="todas as orgs" color="#3b82f6" icon="timer" />
                <KpiCard label="Media por Usuario" value={usersWithCalls > 0 ? fmtHours(Math.round(totalHoursUsed / usersWithCalls)) : '0m'} sub="por usuario ativo" color="#a855f7" icon="avg_pace" />
            </div>

            {/* Search */}
            <div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome, email, cargo, organizacao ou telefone..."
                    className="w-full max-w-md px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
                />
            </div>

            {/* Users Table */}
            <SectionCard title={`Usuarios (${filtered.length})`}>
                <div className="overflow-x-auto scrollbar-dark">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 text-left text-xs uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-3 font-medium">Nome</th>
                                <th className="px-6 py-3 font-medium">Cargo</th>
                                <th className="px-6 py-3 font-medium">Organizacao</th>
                                <th className="px-6 py-3 font-medium">Plano</th>
                                <th className="px-6 py-3 font-medium text-center">Calls</th>
                                <th className="px-6 py-3 font-medium">Horas Usadas</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Criado em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">Nenhum usuario encontrado</td>
                                </tr>
                            ) : (
                                filtered.map(u => {
                                    const plan = (u.organization?.plan || 'FREE').toUpperCase()
                                    const maxHours = PLAN_HOURS[plan] ?? 0
                                    const usedHours = u.totalCallSeconds / 3600
                                    const pct = maxHours > 0 ? Math.min(100, (usedHours / maxHours) * 100) : 0
                                    const isExpanded = expandedUser === u.id

                                    return (
                                        <>
                                            <tr
                                                key={u.id}
                                                className="border-t hover:bg-white/[0.02] transition-colors cursor-pointer"
                                                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                                onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                            >
                                                <td className="px-6 py-3 text-white font-medium">
                                                    <div>{u.full_name || '—'}</div>
                                                    <div className="text-[11px] text-gray-600">{u.email || ''}</div>
                                                    {isExcludedUser(u.full_name) && (
                                                        <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400">TESTE</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-gray-400 capitalize">{u.role?.toLowerCase() || '—'}</td>
                                                <td className="px-6 py-3 text-gray-400">{u.organization?.name || '—'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        plan === 'TEAM' ? 'bg-blue-500/15 text-blue-400' :
                                                        plan === 'PRO' ? 'bg-purple-500/15 text-purple-400' :
                                                        plan === 'STARTER' ? 'bg-yellow-500/15 text-yellow-400' :
                                                        plan === 'TRIAL' ? 'bg-emerald-500/15 text-emerald-400' :
                                                        plan === 'ENTERPRISE' ? 'bg-pink-500/15 text-pink-400' :
                                                        'bg-gray-500/15 text-gray-400'
                                                    }`}>
                                                        {plan}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-center text-gray-300 font-medium">{u.callCount}</td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-300 text-xs font-medium whitespace-nowrap">
                                                            {fmtHours(u.totalCallSeconds)}
                                                        </span>
                                                        {maxHours > 0 && (
                                                            <div className="flex items-center gap-1.5 flex-1 min-w-[60px]">
                                                                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                                    <div
                                                                        className="h-full rounded-full transition-all"
                                                                        style={{
                                                                            width: `${pct}%`,
                                                                            backgroundColor: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e',
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] text-gray-600 whitespace-nowrap">/{maxHours}h</span>
                                                            </div>
                                                        )}
                                                        {maxHours === -1 && (
                                                            <span className="text-[10px] text-gray-600">∞</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.is_active !== false ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active !== false ? 'bg-green-400' : 'bg-red-400'}`} />
                                                        {u.is_active !== false ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-400 text-right">{fmtDateShort(u.created_at)}</td>
                                            </tr>
                                            {/* Expanded details */}
                                            {isExpanded && u.organization && (
                                                <tr key={`${u.id}-details`} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                    <td colSpan={8} className="px-6 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                            <div>
                                                                <span className="text-gray-600 block mb-0.5">Telefone</span>
                                                                <span className="text-gray-300 font-medium">{u.organization.phone || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600 block mb-0.5">Email da Org</span>
                                                                <span className="text-gray-300 font-medium">{u.organization.email || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600 block mb-0.5">CNPJ/CPF</span>
                                                                <span className="text-gray-300 font-medium">{u.organization.document || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600 block mb-0.5">Endereco</span>
                                                                <span className="text-gray-300 font-medium">{u.organization.address || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    )
}
