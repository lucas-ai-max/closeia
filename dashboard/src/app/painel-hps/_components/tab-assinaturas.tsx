'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    NEON_PINK, KpiCard, LoadingSpinner, SectionCard, fmtDateShort, fmtCurrency, shouldIncludeOrg,
    type EnvMode,
} from './shared'

interface Subscription {
    id: string
    organization_id: string | null
    plan_id: string | null
    status: string | null
    stripe_subscription_id: string | null
    current_period_start: string | null
    current_period_end: string | null
    created_at: string
    organization?: { name: string } | null
}

interface Order {
    id: string
    organization_id: string | null
    amount_cents: number | null
    status: string | null
    paid_at: string | null
    created_at: string
    organization?: { name: string } | null
}

interface ExtraHour {
    id: string
    organization_id: string | null
    hours: number | null
    amount_cents: number | null
    status: string | null
    created_at: string
    organization?: { name: string } | null
}

export default function TabAssinaturas({ envMode }: { envMode: EnvMode }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [orders, setOrders] = useState<Order[]>([])
    const [extraHours, setExtraHours] = useState<ExtraHour[]>([])
    const [activeSubs, setActiveSubs] = useState(0)
    const [paidOrders, setPaidOrders] = useState(0)
    const [totalRevenue, setTotalRevenue] = useState(0)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            const [
                { data: subsData },
                { data: ordersData },
                { data: extraData },
            ] = await Promise.all([
                supabase
                    .from('billing_subscriptions')
                    .select('id, organization_id, plan_id, status, stripe_subscription_id, current_period_start, current_period_end, created_at, organization:organizations!organization_id(name)')
                    .order('created_at', { ascending: false })
                    .limit(100),
                supabase
                    .from('billing_orders')
                    .select('id, organization_id, amount_cents, status, paid_at, created_at, organization:organizations!organization_id(name)')
                    .order('created_at', { ascending: false })
                    .limit(100),
                supabase
                    .from('extra_hours_purchases')
                    .select('id, organization_id, hours, amount_cents, status, created_at, organization:organizations!organization_id(name)')
                    .order('created_at', { ascending: false })
                    .limit(100),
            ])

            const subs = (subsData as any[] ?? []).map((s: any) => ({
                ...s,
                organization: Array.isArray(s.organization) ? s.organization[0] : s.organization,
            })) as Subscription[]

            const ordersList = (ordersData as any[] ?? []).map((o: any) => ({
                ...o,
                organization: Array.isArray(o.organization) ? o.organization[0] : o.organization,
            })) as Order[]

            const extras = (extraData as any[] ?? []).map((e: any) => ({
                ...e,
                organization: Array.isArray(e.organization) ? e.organization[0] : e.organization,
            })) as ExtraHour[]

            // Filter by env mode
            const filteredSubs = subs.filter(s => shouldIncludeOrg(s.organization?.name, envMode))
            const filteredOrders = ordersList.filter(o => shouldIncludeOrg(o.organization?.name, envMode))
            const filteredExtras = extras.filter(e => shouldIncludeOrg(e.organization?.name, envMode))

            setSubscriptions(filteredSubs)
            setOrders(filteredOrders)
            setExtraHours(filteredExtras)
            setActiveSubs(filteredSubs.filter(s => s.status === 'active').length)
            setPaidOrders(filteredOrders.filter(o => o.status === 'paid').length)
            setTotalRevenue(filteredOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + (Number(o.amount_cents) || 0), 0))

            setLoading(false)
        }
        fetchData()
    }, [])

    const statusColor = (s: string | null) => {
        if (s === 'active' || s === 'paid') return 'bg-green-500/10 text-green-400'
        if (s === 'canceled' || s === 'failed' || s === 'refunded') return 'bg-red-500/10 text-red-400'
        if (s === 'pending' || s === 'draft') return 'bg-yellow-500/10 text-yellow-400'
        return 'bg-gray-500/10 text-gray-400'
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Assinaturas Ativas" value={`${activeSubs}`} sub={`${subscriptions.length} total`} color={NEON_PINK} icon="check_circle" />
                <KpiCard label="Pedidos Pagos" value={`${paidOrders}`} sub={`${orders.length} total`} color="#22c55e" icon="receipt_long" />
                <KpiCard label="Receita Total" value={fmtCurrency(totalRevenue)} sub="pedidos pagos" color="#3b82f6" icon="attach_money" />
                <KpiCard label="Horas Extras" value={`${extraHours.length}`} sub="compras realizadas" color="#f59e0b" icon="more_time" />
            </div>

            {/* Subscriptions Table */}
            <SectionCard title={`Assinaturas (${subscriptions.length})`}>
                <div className="overflow-x-auto scrollbar-dark">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 text-left text-xs uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-3 font-medium">Organizacao</th>
                                <th className="px-6 py-3 font-medium">Plano</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Periodo</th>
                                <th className="px-6 py-3 font-medium text-right">Criado em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscriptions.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhuma assinatura encontrada</td></tr>
                            ) : (
                                subscriptions.map(s => (
                                    <tr key={s.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                        <td className="px-6 py-3 text-white font-medium">{s.organization?.name || '—'}</td>
                                        <td className="px-6 py-3 text-gray-300 capitalize">{s.plan_id || '—'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(s.status)}`}>
                                                {s.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-400 text-xs">
                                            {s.current_period_start && s.current_period_end
                                                ? `${fmtDateShort(s.current_period_start)} — ${fmtDateShort(s.current_period_end)}`
                                                : '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-400 text-right">{fmtDateShort(s.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* Orders Table */}
            <SectionCard title={`Pedidos (${orders.length})`}>
                <div className="overflow-x-auto scrollbar-dark">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 text-left text-xs uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-3 font-medium">Organizacao</th>
                                <th className="px-6 py-3 font-medium">Valor</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Nenhum pedido encontrado</td></tr>
                            ) : (
                                orders.map(o => (
                                    <tr key={o.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                        <td className="px-6 py-3 text-white font-medium">{o.organization?.name || '—'}</td>
                                        <td className="px-6 py-3 font-mono" style={{ color: NEON_PINK }}>{o.amount_cents ? fmtCurrency(o.amount_cents) : '—'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(o.status)}`}>
                                                {o.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-400 text-right">{o.paid_at ? fmtDateShort(o.paid_at) : fmtDateShort(o.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* Extra Hours Table */}
            {extraHours.length > 0 && (
                <SectionCard title={`Horas Extras (${extraHours.length})`}>
                    <div className="overflow-x-auto scrollbar-dark">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-left text-xs uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th className="px-6 py-3 font-medium">Organizacao</th>
                                    <th className="px-6 py-3 font-medium">Horas</th>
                                    <th className="px-6 py-3 font-medium">Valor</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {extraHours.map(e => (
                                    <tr key={e.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                        <td className="px-6 py-3 text-white font-medium">{e.organization?.name || '—'}</td>
                                        <td className="px-6 py-3 text-gray-300">{e.hours ?? '—'}h</td>
                                        <td className="px-6 py-3 font-mono" style={{ color: NEON_PINK }}>{e.amount_cents ? fmtCurrency(e.amount_cents) : '—'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(e.status)}`}>
                                                {e.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-400 text-right">{fmtDateShort(e.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    )
}
