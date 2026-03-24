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
    role: string | null
    organization_id: string | null
    is_active: boolean
    created_at: string
    organization?: { name: string } | null
}

export default function TabUsuarios({ envMode }: { envMode: EnvMode }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<UserRow[]>([])
    const [totalUsers, setTotalUsers] = useState(0)
    const [usersWithCalls, setUsersWithCalls] = useState(0)
    const [usersWithoutOrg, setUsersWithoutOrg] = useState(0)
    const [search, setSearch] = useState('')

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            const [
                { data: usersData, count },
                { count: noOrgCount },
            ] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, full_name, role, organization_id, is_active, created_at, organization:organizations!organization_id(name)', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .is('organization_id', null),
            ])

            const normalized = (usersData as any[] ?? []).map((u: any) => ({
                ...u,
                organization: Array.isArray(u.organization) ? u.organization[0] : u.organization,
            })) as UserRow[]

            setUsers(normalized)

            // Filter users by env mode for KPI counts
            const realUsers = normalized.filter(u => shouldIncludeUser(u.full_name, envMode))
            setTotalUsers(realUsers.length)
            setUsersWithoutOrg(realUsers.filter(u => !u.organization_id).length)

            // Count users who made at least one call
            const excludedUserIds = new Set(normalized.filter(u => !shouldIncludeUser(u.full_name, envMode)).map(u => u.id))
            const { data: callUsers } = await supabase
                .from('calls')
                .select('user_id')
            const uniqueCallers = new Set((callUsers ?? []).map((c: any) => c.user_id).filter((id: string) => id && !excludedUserIds.has(id)))
            setUsersWithCalls(uniqueCallers.size)

            setLoading(false)
        }
        fetchData()
    }, [])

    const envFiltered = users.filter(u => shouldIncludeUser(u.full_name, envMode))
    const filtered = search
        ? envFiltered.filter(u =>
            (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.role || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.organization?.name || '').toLowerCase().includes(search.toLowerCase())
        )
        : envFiltered

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard label="Total de Usuarios" value={`${totalUsers}`} sub="cadastrados" color={NEON_PINK} icon="people" />
                <KpiCard label="Usuarios Ativos" value={`${usersWithCalls}`} sub="com chamadas realizadas" color="#22c55e" icon="record_voice_over" />
                <KpiCard label="Sem Organizacao" value={`${usersWithoutOrg}`} sub="sem vinculo" color="#f59e0b" icon="person_off" />
            </div>

            {/* Search */}
            <div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome, cargo ou organizacao..."
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
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Criado em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhum usuario encontrado</td>
                                </tr>
                            ) : (
                                filtered.map(u => (
                                    <tr key={u.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                        <td className="px-6 py-3 text-white font-medium">
                                            {u.full_name || '—'}
                                            {isExcludedUser(u.full_name) && (
                                                <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400">TESTE</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-gray-400 capitalize">{u.role?.toLowerCase() || '—'}</td>
                                        <td className="px-6 py-3 text-gray-400">{u.organization?.name || '—'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.is_active !== false ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${u.is_active !== false ? 'bg-green-400' : 'bg-red-400'}`} />
                                                {u.is_active !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-400 text-right">{fmtDateShort(u.created_at)}</td>
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
