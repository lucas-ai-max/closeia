'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    NEON_PINK, KpiCard, LoadingSpinner, SectionCard, fmtDateShort, shouldIncludeOrg,
    type EnvMode,
} from './shared'

interface OrgRow {
    id: string
    name: string | null
    slug: string | null
    plan: string | null
    stripe_customer_id: string | null
    created_at: string
}

export default function TabOrganizacoes({ envMode }: { envMode: EnvMode }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [orgs, setOrgs] = useState<OrgRow[]>([])
    const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
    const [totalOrgs, setTotalOrgs] = useState(0)
    const [orgsWithSub, setOrgsWithSub] = useState(0)
    const [avgTeamSize, setAvgTeamSize] = useState(0)
    const [planDistribution, setPlanDistribution] = useState<{ plan: string; count: number }[]>([])
    const [search, setSearch] = useState('')

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            const [
                { data: orgsData, count },
                { data: subsData },
                { data: profilesData },
            ] = await Promise.all([
                supabase.from('organizations').select('id, name, slug, plan, stripe_customer_id, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
                supabase.from('billing_subscriptions').select('organization_id, status'),
                supabase.from('profiles').select('organization_id'),
            ])

            const orgsList = (orgsData ?? []) as OrgRow[]
            setOrgs(orgsList)
            const realOrgs = orgsList.filter(o => shouldIncludeOrg(o.name, envMode))
            setTotalOrgs(realOrgs.length)

            // Orgs with active subscription
            // Filter orgs by env mode for active sub count
            const includedOrgIds = new Set(orgsList.filter(o => shouldIncludeOrg(o.name, envMode)).map(o => o.id))
            const activeOrgIds = new Set(
                (subsData as any[] ?? []).filter((s: any) => s.status === 'active' && includedOrgIds.has(s.organization_id)).map((s: any) => s.organization_id)
            )
            setOrgsWithSub(activeOrgIds.size)

            // Member counts
            const counts: Record<string, number> = {}
            for (const p of (profilesData ?? []) as any[]) {
                if (p.organization_id) {
                    counts[p.organization_id] = (counts[p.organization_id] || 0) + 1
                }
            }
            setMemberCounts(counts)

            // Avg team size only for included orgs
            const includedMemberValues = realOrgs.map(o => counts[o.id] || 0)
            setAvgTeamSize(includedMemberValues.length > 0 ? includedMemberValues.reduce((a, b) => a + b, 0) / includedMemberValues.length : 0)

            // Plan distribution (only included orgs)
            const planMap: Record<string, number> = {}
            for (const o of realOrgs) {
                const plan = o.plan || 'free'
                planMap[plan] = (planMap[plan] || 0) + 1
            }
            setPlanDistribution(Object.entries(planMap).map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count))

            setLoading(false)
        }
        fetchData()
    }, [])

    const envFiltered = orgs.filter(o => shouldIncludeOrg(o.name, envMode))
    const filtered = search
        ? envFiltered.filter(o =>
            (o.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.slug || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.plan || '').toLowerCase().includes(search.toLowerCase())
        )
        : envFiltered

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard label="Total Organizacoes" value={`${totalOrgs}`} sub="cadastradas" color={NEON_PINK} icon="business" />
                <KpiCard label="Com Assinatura Ativa" value={`${orgsWithSub}`} sub="subscriptions ativas" color="#22c55e" icon="verified" />
                <KpiCard label="Tamanho Medio" value={avgTeamSize.toFixed(1)} sub="membros por org" color="#3b82f6" icon="groups" />
            </div>

            {/* Search */}
            <div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome, slug ou plano..."
                    className="w-full max-w-md px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Orgs Table */}
                <div className="lg:col-span-2">
                    <SectionCard title={`Organizacoes (${filtered.length})`}>
                        <div className="overflow-x-auto scrollbar-dark">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-left text-xs uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th className="px-6 py-3 font-medium">Nome</th>
                                        <th className="px-6 py-3 font-medium">Plano</th>
                                        <th className="px-6 py-3 font-medium text-center">Membros</th>
                                        <th className="px-6 py-3 font-medium text-center">Stripe</th>
                                        <th className="px-6 py-3 font-medium text-right">Criado em</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhuma organizacao encontrada</td>
                                        </tr>
                                    ) : (
                                        filtered.map(o => (
                                            <tr key={o.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                <td className="px-6 py-3">
                                                    <span className="text-white font-medium">{o.name || '—'}</span>
                                                    {o.slug && <span className="text-gray-600 text-xs ml-2">/{o.slug}</span>}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 capitalize">
                                                        {o.plan || 'free'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-center text-gray-300 font-medium">{memberCounts[o.id] || 0}</td>
                                                <td className="px-6 py-3 text-center">
                                                    {o.stripe_customer_id ? (
                                                        <span className="text-green-400 text-xs">Vinculado</span>
                                                    ) : (
                                                        <span className="text-gray-600 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-gray-400 text-right">{fmtDateShort(o.created_at)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                </div>

                {/* Plan Distribution */}
                <SectionCard title="Distribuicao de Planos">
                    <div className="px-6 py-3">
                        {planDistribution.map(row => (
                            <div key={row.plan} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                                <span className="text-sm text-gray-300 capitalize">{row.plan}</span>
                                <span className="text-sm font-bold" style={{ color: NEON_PINK }}>{row.count}</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    )
}
