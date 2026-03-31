'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Loader2, Users, CreditCard, DollarSign, Wallet, Copy, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const NEON_PINK = '#ff007a'
const NEON_GREEN = '#00ff94'
const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.08)' }

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

interface DashboardData {
  affiliate: {
    id: string
    code: string
    pix_key: string
    pix_type: string
  }
  stats: {
    total_referrals: number
    active_subscriptions: number
    total_revenue_cents: number
    available_balance_cents: number
  }
}

interface Referral {
  id: string
  name: string
  plan: string
  status: string
  created_at: string
  commission_cents: number
}

interface Commission {
  id: string
  amount_cents: number
  origin: string
  status: string
  available_at: string
  created_at: string
}

interface Payout {
  id: string
  amount_cents: number
  pix_key: string
  status: string
  requested_at: string
  paid_at: string | null
}

const STATUS_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  registered: { label: 'Registrado', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  trial: { label: 'Trial', color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  active: { label: 'Ativa', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  cancelled: { label: 'Cancelada', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

const COMMISSION_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  available: { label: 'Disponivel', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  withdrawn: { label: 'Sacado', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  cancelled: { label: 'Cancelada', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

const PAYOUT_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  processing: { label: 'Processando', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  paid: { label: 'Pago', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  rejected: { label: 'Rejeitado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

function Badge({ badge }: { badge: { label: string; color: string; bg: string } | undefined }) {
  if (!badge) return <span className="text-xs text-gray-500">-</span>
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ color: badge.color, backgroundColor: badge.bg }}
    >
      {badge.label}
    </span>
  )
}

export default function AffiliateDashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isAffiliate, setIsAffiliate] = useState(true)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [copied, setCopied] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutPixKey, setPayoutPixKey] = useState('')
  const [payoutPixType, setPayoutPixType] = useState('')

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/affiliate/dashboard')
      if (res.status === 404 || res.status === 403) {
        setIsAffiliate(false)
        return
      }
      if (!res.ok) throw new Error('Erro ao carregar dados')
      const data: DashboardData = await res.json()
      setDashboardData(data)
      setPayoutPixKey(data.affiliate.pix_key || '')
      setPayoutPixType(data.affiliate.pix_type || '')

      // Load referrals, commissions, payouts in parallel
      const [refRes, comRes, payRes] = await Promise.all([
        fetch('/api/affiliate/referrals'),
        fetch('/api/affiliate/commissions'),
        fetch('/api/affiliate/payout'),
      ])

      if (refRes.ok) {
        const refData = await refRes.json()
        setReferrals(refData.referrals || [])
      }
      if (comRes.ok) {
        const comData = await comRes.json()
        setCommissions(comData.commissions || [])
      }
      if (payRes.ok) {
        const payData = await payRes.json()
        setPayouts(payData.payouts || [])
      }
    } catch {
      toast.error('Erro ao carregar painel de afiliado')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  async function handleCopyLink() {
    if (!dashboardData) return
    const link = `https://helpcloser.app/register?ref=${dashboardData.affiliate.code}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handlePayout() {
    if (!dashboardData) return
    setPayoutLoading(true)
    try {
      const res = await fetch('/api/affiliate/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pix_key: payoutPixKey,
          pix_type: payoutPixType,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao solicitar saque')
      }
      toast.success('Saque solicitado com sucesso!')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao solicitar saque')
    } finally {
      setPayoutLoading(false)
    }
  }

  if (!mounted || loading) {
    return (
      <>
        <DashboardHeader title="Painel de Afiliado" />
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </>
    )
  }

  if (!isAffiliate) {
    return (
      <>
        <DashboardHeader title="Painel de Afiliado" />
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <AlertCircle className="w-16 h-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Voce nao e um afiliado</h2>
          <p className="text-gray-400 max-w-md">
            Voce ainda nao faz parte do programa de afiliados. Cadastre-se para comecar a ganhar comissoes.
          </p>
          <a
            href="/afiliado/cadastro"
            className="mt-6 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: NEON_PINK }}
          >
            Quero ser Afiliado
          </a>
        </div>
      </>
    )
  }

  const stats = dashboardData!.stats
  const affiliate = dashboardData!.affiliate

  const metrics = [
    { label: 'Indicacoes', value: stats.total_referrals.toString(), icon: Users, color: NEON_PINK },
    { label: 'Assinaturas Ativas', value: stats.active_subscriptions.toString(), icon: CreditCard, color: '#3b82f6' },
    { label: 'Receita Total', value: formatCurrency(stats.total_revenue_cents), icon: DollarSign, color: NEON_PINK },
    { label: 'Saldo Disponivel', value: formatCurrency(stats.available_balance_cents), icon: Wallet, color: NEON_GREEN },
  ]

  const referralLink = `https://helpcloser.app/register?ref=${affiliate.code}`
  const canPayout = stats.available_balance_cents >= 5000

  return (
    <>
      <DashboardHeader title="Painel de Afiliado" />
      <div className="space-y-8 w-full">
        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border p-5"
              style={CARD_STYLE}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${m.color}15` }}
                >
                  <m.icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <span className="text-sm text-gray-400">{m.label}</span>
              </div>
              <p
                className="text-2xl font-bold"
                style={{ color: m.color === NEON_GREEN ? NEON_GREEN : '#fff' }}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Referral Link */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h3 className="text-lg font-semibold text-white mb-4">Seu Link de Indicacao</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-gray-300 overflow-x-auto whitespace-nowrap">
              {referralLink}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shrink-0"
              style={{ backgroundColor: NEON_PINK }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">Seu codigo:</span>
            <span
              className="text-sm font-bold px-3 py-1 rounded-lg"
              style={{ color: NEON_PINK, backgroundColor: `${NEON_PINK}15` }}
            >
              {affiliate.code}
            </span>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h3 className="text-lg font-semibold text-white mb-4">Indicacoes</h3>
          {referrals.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma indicacao ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Nome</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Plano</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Data</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium">Comissao</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-2 text-white">{r.name}</td>
                      <td className="py-3 px-2 text-gray-400">{r.plan || '-'}</td>
                      <td className="py-3 px-2">
                        <Badge badge={STATUS_BADGES[r.status]} />
                      </td>
                      <td className="py-3 px-2 text-gray-400">{formatDate(r.created_at)}</td>
                      <td className="py-3 px-2 text-right text-white">
                        {r.commission_cents ? formatCurrency(r.commission_cents) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Commissions Table */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h3 className="text-lg font-semibold text-white mb-4">Comissoes</h3>
          {commissions.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma comissao ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Valor</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Origem</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Disponivel em</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-2 text-white font-medium">{formatCurrency(c.amount_cents)}</td>
                      <td className="py-3 px-2 text-gray-400">{c.origin}</td>
                      <td className="py-3 px-2">
                        <Badge badge={COMMISSION_BADGES[c.status]} />
                      </td>
                      <td className="py-3 px-2 text-gray-400">{c.available_at ? formatDate(c.available_at) : '-'}</td>
                      <td className="py-3 px-2 text-gray-400">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout Request */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h3 className="text-lg font-semibold text-white mb-4">Solicitar Saque</h3>
          <div className="mb-5">
            <span className="text-sm text-gray-400">Saldo disponivel:</span>
            <p className="text-3xl font-bold mt-1" style={{ color: NEON_GREEN }}>
              {formatCurrency(stats.available_balance_cents)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mb-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Chave PIX</label>
              <input
                type="text"
                value={payoutPixKey}
                onChange={(e) => setPayoutPixKey(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-[#ff007a] focus:border-[#ff007a] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Tipo da chave</label>
              <select
                value={payoutPixType}
                onChange={(e) => setPayoutPixType(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-[#ff007a] focus:border-[#ff007a] focus:outline-none transition-colors appearance-none"
              >
                <option value="CPF">CPF</option>
                <option value="Email">Email</option>
                <option value="Telefone">Telefone</option>
                <option value="Aleatoria">Aleatoria</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePayout}
            disabled={!canPayout || payoutLoading}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: NEON_PINK }}
          >
            {payoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Solicitar Saque
          </button>
          <p className="mt-3 text-xs text-gray-500">
            Minimo para saque: R$ 50,00
          </p>
        </div>

        {/* Payout History */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h3 className="text-lg font-semibold text-white mb-4">Historico de Saques</h3>
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum saque solicitado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Valor</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Chave PIX</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Data solicitacao</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Data pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-2 text-white font-medium">{formatCurrency(p.amount_cents)}</td>
                      <td className="py-3 px-2 text-gray-400">{p.pix_key}</td>
                      <td className="py-3 px-2">
                        <Badge badge={PAYOUT_BADGES[p.status]} />
                      </td>
                      <td className="py-3 px-2 text-gray-400">{formatDate(p.requested_at)}</td>
                      <td className="py-3 px-2 text-gray-400">{p.paid_at ? formatDate(p.paid_at) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
