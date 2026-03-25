'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NEON_PINK, CARD_BG, CARD_BORDER, LoadingSpinner, SectionCard, KpiCard, fmtDateShort } from './shared'

interface Affiliate {
    id: string
    name: string
    email: string
    phone: string | null
    code: string
    commission_percent: number
    status: string
    pix_key: string | null
    pix_type: string | null
    how_promote: string | null
    total_earned_cents: number
    total_paid_cents: number
    created_at: string
    referral_count?: number
    active_referrals?: number
}

interface Payout {
    id: string
    amount_cents: number
    pix_key: string
    pix_type: string
    status: string
    admin_notes: string | null
    requested_at: string
    paid_at: string | null
    affiliate?: { name: string; code: string }
}

const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Pendente' },
        active: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Ativo' },
        suspended: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Suspenso' },
        rejected: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Rejeitado' },
        banned: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Banido' },
        requested: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Solicitado' },
        processing: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Processando' },
        paid: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Pago' },
    }
    const s = map[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status }
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg} ${s.text}`}>{s.label}</span>
}

const fmtBrl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function TabAfiliados() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [affiliates, setAffiliates] = useState<Affiliate[]>([])
    const [payouts, setPayouts] = useState<Payout[]>([])
    const [tab, setTab] = useState<'lista' | 'saques'>('lista')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [affRes, payRes] = await Promise.all([
                supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
                supabase.from('affiliate_payouts').select('*, affiliate:affiliates(name, code)').order('requested_at', { ascending: false }),
            ])

            const affs = (affRes.data || []) as Affiliate[]

            // Get referral counts
            const { data: referrals } = await supabase
                .from('affiliate_referrals')
                .select('affiliate_id, status')

            const refMap = new Map<string, { total: number; active: number }>()
            for (const r of (referrals as any[] || [])) {
                const entry = refMap.get(r.affiliate_id) || { total: 0, active: 0 }
                entry.total++
                if (r.status === 'active') entry.active++
                refMap.set(r.affiliate_id, entry)
            }

            for (const a of affs) {
                const ref = refMap.get(a.id)
                a.referral_count = ref?.total || 0
                a.active_referrals = ref?.active || 0
            }

            setAffiliates(affs)
            setPayouts((payRes.data || []).map((p: any) => ({
                ...p,
                affiliate: Array.isArray(p.affiliate) ? p.affiliate[0] : p.affiliate,
            })))
        } catch (err) {
            console.error('Error fetching affiliates:', err)
        }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [])

    const handleAction = async (affiliateId: string, action: 'approve' | 'reject') => {
        setActionLoading(affiliateId)
        try {
            const res = await fetch('/api/admin/affiliates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ affiliate_id: affiliateId, action }),
            })
            if (res.ok) await fetchData()
            else console.error('Action failed:', await res.text())
        } catch (err) {
            console.error('Action error:', err)
        }
        setActionLoading(null)
    }

    const handlePayoutAction = async (payoutId: string, action: 'approve' | 'reject') => {
        setActionLoading(payoutId)
        try {
            const res = await fetch('/api/admin/affiliates/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payout_id: payoutId, action }),
            })
            if (res.ok) await fetchData()
            else console.error('Payout action failed:', await res.text())
        } catch (err) {
            console.error('Payout action error:', err)
        }
        setActionLoading(null)
    }

    if (loading) return <LoadingSpinner />

    const pendingCount = affiliates.filter(a => a.status === 'pending').length
    const activeCount = affiliates.filter(a => a.status === 'active').length
    const totalEarned = affiliates.reduce((sum, a) => sum + a.total_earned_cents, 0)
    const totalPaid = affiliates.reduce((sum, a) => sum + a.total_paid_cents, 0)
    const pendingPayouts = payouts.filter(p => p.status === 'requested')

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Afiliados Ativos" value={String(activeCount)} sub={`${affiliates.length} total`} color={NEON_PINK} icon="handshake" />
                <KpiCard label="Pendentes" value={String(pendingCount)} sub="aguardando aprovacao" color="#f59e0b" icon="hourglass_empty" />
                <KpiCard label="Total Comissoes" value={fmtBrl(totalEarned)} sub="acumulado" color="#22c55e" icon="payments" />
                <KpiCard label="Total Pago" value={fmtBrl(totalPaid)} sub="ja transferido" color="#3b82f6" icon="account_balance" />
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setTab('lista')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'lista' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                    style={tab === 'lista' ? { backgroundColor: `${NEON_PINK}20`, color: NEON_PINK } : {}}
                >
                    Afiliados ({affiliates.length})
                </button>
                <button
                    onClick={() => setTab('saques')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'saques' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                    style={tab === 'saques' ? { backgroundColor: `${NEON_PINK}20`, color: NEON_PINK } : {}}
                >
                    Saques {pendingPayouts.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">{pendingPayouts.length}</span>
                    )}
                </button>
            </div>

            {tab === 'lista' && (
                <SectionCard title="Afiliados">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-left text-xs">
                                    <th className="pb-3 font-medium">Nome</th>
                                    <th className="pb-3 font-medium">Codigo</th>
                                    <th className="pb-3 font-medium">Comissao</th>
                                    <th className="pb-3 font-medium">Indicacoes</th>
                                    <th className="pb-3 font-medium">Receita</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Data</th>
                                    <th className="pb-3 font-medium">Acoes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {affiliates.map(a => (
                                    <tr key={a.id} className="hover:bg-white/5">
                                        <td className="py-3">
                                            <div className="text-white font-medium">{a.name}</div>
                                            <div className="text-gray-500 text-xs">{a.email}</div>
                                        </td>
                                        <td className="py-3 text-gray-300 font-mono text-xs">{a.code}</td>
                                        <td className="py-3 text-gray-300">{a.commission_percent}%</td>
                                        <td className="py-3">
                                            <span className="text-white">{a.referral_count}</span>
                                            <span className="text-gray-500 text-xs ml-1">({a.active_referrals} ativas)</span>
                                        </td>
                                        <td className="py-3 text-emerald-300">{fmtBrl(a.total_earned_cents)}</td>
                                        <td className="py-3">{statusBadge(a.status)}</td>
                                        <td className="py-3 text-gray-500 text-xs">{fmtDateShort(a.created_at)}</td>
                                        <td className="py-3">
                                            {a.status === 'pending' && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleAction(a.id, 'approve')}
                                                        disabled={actionLoading === a.id}
                                                        className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                                                    >
                                                        Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(a.id, 'reject')}
                                                        disabled={actionLoading === a.id}
                                                        className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                                                    >
                                                        Rejeitar
                                                    </button>
                                                </div>
                                            )}
                                            {a.status === 'active' && (
                                                <span className="text-xs text-gray-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {affiliates.length === 0 && (
                                    <tr><td colSpan={8} className="py-8 text-center text-gray-600">Nenhum afiliado cadastrado</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {tab === 'saques' && (
                <SectionCard title="Solicitacoes de Saque">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-left text-xs">
                                    <th className="pb-3 font-medium">Afiliado</th>
                                    <th className="pb-3 font-medium">Valor</th>
                                    <th className="pb-3 font-medium">PIX</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Solicitado</th>
                                    <th className="pb-3 font-medium">Pago em</th>
                                    <th className="pb-3 font-medium">Acoes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payouts.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5">
                                        <td className="py-3">
                                            <div className="text-white font-medium">{p.affiliate?.name || '—'}</div>
                                            <div className="text-gray-500 text-xs font-mono">{p.affiliate?.code || ''}</div>
                                        </td>
                                        <td className="py-3 text-white font-medium">{fmtBrl(p.amount_cents)}</td>
                                        <td className="py-3">
                                            <div className="text-gray-300 text-xs">{p.pix_key}</div>
                                            <div className="text-gray-600 text-[10px]">{p.pix_type}</div>
                                        </td>
                                        <td className="py-3">{statusBadge(p.status)}</td>
                                        <td className="py-3 text-gray-500 text-xs">{fmtDateShort(p.requested_at)}</td>
                                        <td className="py-3 text-gray-500 text-xs">{p.paid_at ? fmtDateShort(p.paid_at) : '—'}</td>
                                        <td className="py-3">
                                            {p.status === 'requested' && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handlePayoutAction(p.id, 'approve')}
                                                        disabled={actionLoading === p.id}
                                                        className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                                                    >
                                                        Pagar
                                                    </button>
                                                    <button
                                                        onClick={() => handlePayoutAction(p.id, 'reject')}
                                                        disabled={actionLoading === p.id}
                                                        className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                                                    >
                                                        Rejeitar
                                                    </button>
                                                </div>
                                            )}
                                            {p.status !== 'requested' && (
                                                <span className="text-xs text-gray-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {payouts.length === 0 && (
                                    <tr><td colSpan={7} className="py-8 text-center text-gray-600">Nenhuma solicitacao de saque</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    )
}
