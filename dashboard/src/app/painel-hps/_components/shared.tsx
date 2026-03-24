'use client'

// ─── Constants ──────────────────────────────────────────────
export const NEON_PINK = '#ff007a'
export const COLORS: Record<string, string> = {
    openai: '#a855f7',
    deepgram: '#3b82f6',
    livekit: '#22c55e',
}
export const BRL_RATE = 5.80

export const ADMIN_EMAILS = [
    'felipeoliveiraa1@hotmail.com',
    'lucastria01@gmail.com',
]

export const CARD_BG = '#1a1a1a'
export const CARD_BORDER = 'rgba(255,255,255,0.06)'

// Organizacoes de teste a serem excluidas das metricas de billing
export const EXCLUDED_ORG_NAMES = [
    'NeuroNex',
    'NeuroX',
    'Minha Empresa',
    'Felipe',
    'RD',
    'axiom',
    'Minha Organizacao',
    'Minha Organização',
]
export const isExcludedOrg = (name: string | null | undefined) =>
    EXCLUDED_ORG_NAMES.some(n => n.toLowerCase() === (name || '').toLowerCase())

// Usuarios de teste a serem excluidos das metricas
export const EXCLUDED_USER_NAMES = [
    'Yan Marques Sapucaia dos Santos',
    'LUCAS MANOEL DA SILVA',
    'Felipe Porto',
    'Milena Porto',
]
export const isExcludedUser = (name: string | null | undefined) =>
    EXCLUDED_USER_NAMES.some(n => n.toLowerCase() === (name || '').toLowerCase())

// Env mode — production filtra testes, test mostra APENAS testes
export type EnvMode = 'production' | 'test'

// Helpers que recebem envMode para decidir filtro
export const shouldIncludeUser = (name: string | null | undefined, mode: EnvMode) =>
    mode === 'production' ? !isExcludedUser(name) : isExcludedUser(name)

export const shouldIncludeOrg = (name: string | null | undefined, mode: EnvMode) =>
    mode === 'production' ? !isExcludedOrg(name) : isExcludedOrg(name)

// ─── Types ──────────────────────────────────────────────────
export interface UsageLog {
    id: string
    call_id: string
    user_id: string | null
    service: string
    method: string
    model: string | null
    prompt_tokens: number
    completion_tokens: number
    cached_tokens: number
    total_tokens: number
    duration_seconds: number | null
    participants: number
    cost_usd: number
    created_at: string
}

export interface CallInfo {
    id: string
    started_at: string
    duration_seconds: number | null
    user?: { full_name?: string }
}

// ─── Tabs ───────────────────────────────────────────────────
export type AdminTab = 'visao-geral' | 'custos' | 'usuarios' | 'organizacoes' | 'chamadas' | 'assinaturas'

export const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'visao-geral', label: 'Visao Geral', icon: 'dashboard' },
    { id: 'custos', label: 'Custos', icon: 'payments' },
    { id: 'usuarios', label: 'Usuarios', icon: 'people' },
    { id: 'organizacoes', label: 'Organizacoes', icon: 'business' },
    { id: 'chamadas', label: 'Chamadas', icon: 'call' },
    { id: 'assinaturas', label: 'Assinaturas', icon: 'credit_card' },
]

// ─── Formatters ─────────────────────────────────────────────
export const fmtUsd = (n: number) => `$${n.toFixed(4)}`
export const fmtBrl = (n: number) => `R$ ${(n * BRL_RATE).toFixed(2)}`
export const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return `${m}m ${sec}s`
}
export const fmtTokens = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`
export const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
export const fmtDateShort = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
export const fmtCurrency = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`

// ─── Tab Bar Component ─────────────────────────────────────
export function AdminTabBar({ active, onChange }: { active: AdminTab; onChange: (tab: AdminTab) => void }) {
    return (
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        active === tab.id
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    style={active === tab.id ? { backgroundColor: NEON_PINK } : undefined}
                >
                    <span className="material-icons-outlined text-[18px]">{tab.icon}</span>
                    {tab.label}
                </button>
            ))}
        </div>
    )
}

// ─── KPI Card ───────────────────────────────────────────────
export function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: string }) {
    return (
        <div
            className="rounded-2xl p-6 border transition-all hover:scale-[1.02]"
            style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <span className="material-icons-outlined text-[20px]" style={{ color }}>{icon}</span>
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
    )
}

// ─── Token Card ─────────────────────────────────────────────
export function TokenCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
    return (
        <div
            className="rounded-2xl px-5 py-4 border flex items-center gap-4"
            style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
        >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <span className="material-icons-outlined text-[18px]" style={{ color }}>{icon}</span>
            </div>
            <div>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-[11px] text-gray-500">{label}</p>
            </div>
        </div>
    )
}

// ─── Period Filter ──────────────────────────────────────────
export type Period = '7d' | '30d' | 'all'

export function PeriodFilter({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
    return (
        <div className="flex gap-2">
            {(['7d', '30d', 'all'] as const).map(p => (
                <button
                    key={p}
                    onClick={() => onChange(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        period === p
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
                    }`}
                    style={period === p ? { backgroundColor: NEON_PINK } : undefined}
                >
                    {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Tudo'}
                </button>
            ))}
        </div>
    )
}

// ─── Loading Spinner ────────────────────────────────────────
export function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: `${NEON_PINK} transparent transparent transparent` }} />
        </div>
    )
}

// ─── Section Card ───────────────────────────────────────────
export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
                <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
            {children}
        </div>
    )
}

// ─── Date filter helper ─────────────────────────────────────
export function getDateFilter(period: Period): string | null {
    if (period === '7d') return new Date(Date.now() - 7 * 86400000).toISOString()
    if (period === '30d') return new Date(Date.now() - 30 * 86400000).toISOString()
    return null
}
