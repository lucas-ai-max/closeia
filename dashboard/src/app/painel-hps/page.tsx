'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NEON_PINK, AdminTabBar, type AdminTab, type EnvMode } from './_components/shared'
import TabVisaoGeral from './_components/tab-visao-geral'
import TabCustos from './_components/tab-custos'
import TabUsuarios from './_components/tab-usuarios'
import TabOrganizacoes from './_components/tab-organizacoes'
import TabChamadas from './_components/tab-chamadas'
import TabAssinaturas from './_components/tab-assinaturas'
import TabAfiliados from './_components/tab-afiliados'
import TabFeedback from './_components/tab-feedback'

export default function AdminPage() {
    const supabase = createClient()
    const [mounted, setMounted] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [authChecking, setAuthChecking] = useState(true)
    const [loginUser, setLoginUser] = useState('')
    const [loginPass, setLoginPass] = useState('')
    const [loginError, setLoginError] = useState(false)
    const [shaking, setShaking] = useState(false)
    const [activeTab, setActiveTab] = useState<AdminTab>('visao-geral')
    const [envMode, setEnvMode] = useState<EnvMode>('production')

    useEffect(() => {
        setMounted(true)
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Check admin_users table (RLS policy allows self-check)
                const { data: adminRow } = await supabase
                    .from('admin_users')
                    .select('id')
                    .eq('email', user.email ?? '')
                    .maybeSingle()
                if (adminRow) {
                    setIsAuthenticated(true)
                }
            }
            setAuthChecking(false)
        }
        checkAdmin()
    }, [])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        const doLogin = async () => {
            const { error } = await supabase.auth.signInWithPassword({ email: loginUser, password: loginPass })
            // After login, check admin_users table
            const { data: adminCheck } = !error
                ? await supabase.from('admin_users').select('id').eq('email', loginUser.toLowerCase()).maybeSingle()
                : { data: null }
            if (error || !adminCheck) {
                if (!error) await supabase.auth.signOut()
                setLoginError(true)
                setShaking(true)
                setTimeout(() => setShaking(false), 500)
            } else {
                setIsAuthenticated(true)
                setLoginError(false)
            }
        }
        doLogin()
    }

    if (!mounted || authChecking) return null

    // ─── Login Screen ────────────────────────────────────────────
    if (!isAuthenticated) {
        return (
            <div suppressHydrationWarning className="flex-1 flex items-center justify-center min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
                <form
                    onSubmit={handleLogin}
                    className={`w-full max-w-sm rounded-2xl p-8 border space-y-6 ${shaking ? 'animate-shake' : ''}`}
                    style={{ backgroundColor: '#1a1a1a', borderColor: loginError ? '#ff4444' : 'rgba(255,255,255,0.08)' }}
                >
                    <div className="text-center space-y-2">
                        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${NEON_PINK}15` }}>
                            <span className="material-icons-outlined text-[28px]" style={{ color: NEON_PINK }}>admin_panel_settings</span>
                        </div>
                        <h1 className="text-xl font-bold text-white">Admin Access</h1>
                        <p className="text-xs text-gray-500">Area restrita — apenas administradores</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email</label>
                            <input
                                type="email"
                                value={loginUser}
                                onChange={e => { setLoginUser(e.target.value); setLoginError(false) }}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors"
                                style={{ backgroundColor: '#111', border: `1px solid ${loginError ? '#ff4444' : 'rgba(255,255,255,0.08)'}` }}
                                placeholder="admin@helpcloser.app"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Senha</label>
                            <input
                                type="password"
                                value={loginPass}
                                onChange={e => { setLoginPass(e.target.value); setLoginError(false) }}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors"
                                style={{ backgroundColor: '#111', border: `1px solid ${loginError ? '#ff4444' : 'rgba(255,255,255,0.08)'}` }}
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    {loginError && (
                        <p className="text-xs text-red-400 text-center">Credenciais invalidas</p>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: NEON_PINK }}
                    >
                        Entrar
                    </button>
                </form>

                <style jsx>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20% { transform: translateX(-8px); }
                        40% { transform: translateX(8px); }
                        60% { transform: translateX(-5px); }
                        80% { transform: translateX(5px); }
                    }
                    .animate-shake { animation: shake 0.4s ease-in-out; }
                `}</style>
            </div>
        )
    }

    // ─── Admin Dashboard ─────────────────────────────────────────
    const isProd = envMode === 'production'

    return (
        <div className="flex-1 p-8 space-y-6 min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white">Administracao</h1>
                        {!isProd && (
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/20">
                                AMBIENTE DE TESTE
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Gerenciamento avancado do sistema</p>
                </div>

                {/* Env Toggle */}
                <button
                    onClick={() => setEnvMode(prev => prev === 'production' ? 'test' : 'production')}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        backgroundColor: isProd ? 'rgba(34,197,94,0.08)' : 'rgba(249,115,22,0.08)',
                        borderColor: isProd ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.2)',
                    }}
                >
                    <div
                        className="w-8 h-[18px] rounded-full relative transition-all"
                        style={{ backgroundColor: isProd ? '#22c55e' : '#f97316' }}
                    >
                        <div
                            className="w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-all"
                            style={{ left: isProd ? '2px' : '14px' }}
                        />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: isProd ? '#22c55e' : '#f97316' }}>
                        {isProd ? 'Producao' : 'Teste'}
                    </span>
                </button>
            </div>

            {/* Tab Bar */}
            <AdminTabBar active={activeTab} onChange={setActiveTab} />

            {/* Tab Content — key forces re-mount when envMode changes */}
            {activeTab === 'visao-geral' && <TabVisaoGeral key={`vg-${envMode}`} envMode={envMode} />}
            {activeTab === 'custos' && <TabCustos key={`ct-${envMode}`} envMode={envMode} />}
            {activeTab === 'usuarios' && <TabUsuarios key={`us-${envMode}`} envMode={envMode} />}
            {activeTab === 'organizacoes' && <TabOrganizacoes key={`or-${envMode}`} envMode={envMode} />}
            {activeTab === 'chamadas' && <TabChamadas key={`ch-${envMode}`} envMode={envMode} />}
            {activeTab === 'assinaturas' && <TabAssinaturas key={`as-${envMode}`} envMode={envMode} />}
            {activeTab === 'afiliados' && <TabAfiliados key="af" />}
            {activeTab === 'feedback' && <TabFeedback key="fb" />}
        </div>
    )
}
