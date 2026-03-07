import { useState, useEffect, useRef, useCallback } from 'react';
import { authService } from '../services/auth';
import { Loader2, Mic, Square, LogOut, Monitor, PanelRightOpen, PanelRightClose, Lock } from 'lucide-react';
import { TEXT, TEXT_SECONDARY, TEXT_MUTED, INPUT_BG, INPUT_BORDER, ACCENT_ACTIVE, ACCENT_DANGER, NEON_PINK, NEON_PINK_LIGHT, RADIUS } from '../lib/theme';
import { dashboardUrl } from '../config/env';

const BG_CARD = 'rgba(255,255,255,0.04)';
const BORDER_PINK = 'rgba(255, 0, 122, 0.25)';
const logoUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('logo.svg') : '/logo.svg';

const PLAN_LABELS: Record<string, string> = {
    FREE: 'Grátis',
    STARTER: 'Starter',
    PRO: 'Pro',
    TEAM: 'Team',
    ENTERPRISE: 'Enterprise',
};

const PLAN_COLORS: Record<string, string> = {
    FREE: '#6b7280',
    STARTER: '#f59e0b',
    PRO: '#8b5cf6',
    TEAM: '#3b82f6',
    ENTERPRISE: '#ec4899',
};

interface TabOption {
    id: number;
    title: string;
    url: string;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Popup() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sessionCheckDone, setSessionCheckDone] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState<'PROGRAMMED' | 'RECORDING' | 'PAUSED'>('PROGRAMMED');
    const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [tabs, setTabs] = useState<TabOption[]>([]);
    const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
    const [suggestionsPanelOpen, setSuggestionsPanelOpen] = useState(false);
    const [isMeetOrZoomTab, setIsMeetOrZoomTab] = useState(false);
    const [activeTabId, setActiveTabId] = useState<number | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const CALL_RESULTS = [
        { value: 'CONVERTED' as const, label: 'Venda realizada' },
        { value: 'LOST' as const, label: 'Venda perdida' },
        { value: 'FOLLOW_UP' as const, label: 'Em negociação' },
        { value: 'UNKNOWN' as const, label: 'A definir' },
    ] as const;

    useEffect(() => {
        let resolved = false;
        const applySession = (sess: any) => {
            if (resolved) return;
            if (sess) {
                resolved = true;
                setSessionCheckDone(true);
                setLoading(false);
                setSession(sess);
                authService.restoreSessionInMemory(sess).catch(() => {});
                authService.fetchOrganizationPlan().then((orgData) => {
                    if (orgData) setCurrentPlan(orgData.plan);
                }).catch(() => {});
            }
        };
        const setNoSession = () => {
            if (resolved) return;
            resolved = true;
            setSessionCheckDone(true);
            setSession(null);
            setLoading(false);
        };
        const onSessionResult = (msg: { type?: string; session?: any }) => {
            if (msg?.type === 'SESSION_RESULT') applySession(msg.session ?? null);
        };
        chrome.runtime.onMessage.addListener(onSessionResult);
        checkSession();
        authService.getSession().then((sess) => {
            if (sess) applySession(sess);
        }).catch(() => {});
        const fallbackId = setTimeout(setNoSession, 3000);
        return () => {
            clearTimeout(fallbackId);
            chrome.runtime.onMessage.removeListener(onSessionResult);
        };
    }, []);

    useEffect(() => {
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && changes.sidebarOpen != null) {
                setSuggestionsPanelOpen(!!changes.sidebarOpen.newValue);
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (!tab?.id || !tab.url) {
                setIsMeetOrZoomTab(false);
                setActiveTabId(null);
                return;
            }
            setActiveTabId(tab.id);
            const url = tab.url.toLowerCase();
            const isMeetZoom = url.includes('meet.google.com') || url.includes('zoom.us');
            setIsMeetOrZoomTab(isMeetZoom);
            if (isMeetZoom) {
                chrome.tabs.sendMessage(tab.id, { type: 'GET_SIDEBAR_OPEN' }, (response: { open?: boolean } | undefined) => {
                    if (chrome.runtime.lastError) return;
                    if (response && typeof response.open === 'boolean') {
                        setSuggestionsPanelOpen(response.open);
                    }
                });
            }
        });
    }, []);

    const refreshStatus = useCallback(() => {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response: { status?: string; recordingStartedAt?: number | null } | undefined) => {
            if (response?.status === 'RECORDING' || response?.status === 'PROGRAMMED' || response?.status === 'PAUSED') {
                setStatus(response.status);
            }
            if (response?.recordingStartedAt != null) {
                setRecordingStartedAt(response.recordingStartedAt);
            } else {
                setRecordingStartedAt(null);
            }
        });
    }, []);

    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshStatus();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [refreshStatus]);

    useEffect(() => {
        if (status === 'RECORDING' && recordingStartedAt != null) {
            const tick = () => {
                setElapsedSeconds(Math.floor((Date.now() - recordingStartedAt) / 1000));
            };
            tick();
            timerRef.current = setInterval(tick, 1000);
            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = null;
            };
        } else {
            setElapsedSeconds(0);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [status, recordingStartedAt]);

    useEffect(() => {
        if (!session || status === 'RECORDING') return;
        chrome.tabs.query({ currentWindow: true }, (list) => {
            const options: TabOption[] = list
                .filter((t) => t.id != null && t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')))
                .map((t) => ({
                    id: t.id!,
                    title: t.title || t.url || 'Aba',
                    url: t.url || ''
                }));
            setTabs(options);
            if (options.length > 0 && selectedTabId === null) {
                chrome.tabs.query({ active: true, currentWindow: true }, ([active]) => {
                    const activeInList = options.find((o) => o.id === active?.id);
                    setSelectedTabId(activeInList ? activeInList.id : options[0].id);
                });
            }
        });
    }, [session, status]);

    const checkSession = () => {
        chrome.runtime.sendMessage({ type: 'GET_SESSION' }).catch(() => {});
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authService.login(email, password);
            const sess = await authService.getSession();
            setSession(sess);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        setSession(null);
    };

    const isFreePlan = currentPlan === 'FREE' || currentPlan === null;

    const toggleCapture = async (result?: 'CONVERTED' | 'LOST' | 'FOLLOW_UP' | 'UNKNOWN') => {
        const tabId = status === 'RECORDING' ? undefined : (selectedTabId ?? tabs[0]?.id ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id);
        if (status === 'RECORDING') {
            if (result === undefined) {
                setShowResultModal(true);
                return;
            }
            setShowResultModal(false);
            setStatus('PROGRAMMED');
            setRecordingStartedAt(null);
            chrome.runtime.sendMessage({ type: 'STOP_CAPTURE', result });
        } else {
            if (isFreePlan) {
                setError('Ative um plano para usar o coaching IA. Comece com 7 dias grátis!');
                return;
            }
            setLoading(true);
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                micStream.getTracks().forEach((t) => t.stop());
            } catch (micErr: unknown) {
                const msg = micErr instanceof Error ? micErr.message : String(micErr);
                setError('Permita o uso do microfone para transcrever suas falas.');
                setLoading(false);
                return;
            }
            setError('');
            setStatus('RECORDING');
            setRecordingStartedAt(Date.now());
            chrome.runtime.sendMessage({
                type: 'START_CAPTURE',
                tabId: tabId ?? undefined
            });
            setLoading(false);
        }
    };

    const handleStopClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'RECORDING') {
            setShowResultModal(true);
        } else {
            toggleCapture();
        }
    };

    const confirmResultAndStop = (result: 'CONVERTED' | 'LOST' | 'FOLLOW_UP' | 'UNKNOWN') => {
        toggleCapture(result);
    };

    const toggleSuggestionsPanel = () => {
        chrome.runtime.sendMessage({ type: 'TOGGLE_SUGGESTIONS_PANEL' }, () => {
            if (chrome.runtime.lastError) return;
            setSuggestionsPanelOpen((prev) => !prev);
        });
    };

    useEffect(() => {
        const listener = (msg: any) => {
            if (msg.type === 'STATUS_UPDATE') {
                setStatus(msg.status);
                if (msg.status !== 'RECORDING') {
                    setRecordingStartedAt(null);
                } else {
                    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (r: { recordingStartedAt?: number | null } | undefined) => {
                        if (r?.recordingStartedAt != null) setRecordingStartedAt(r.recordingStartedAt);
                    });
                }
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    const base: React.CSSProperties = {
        width: '100%',
        height: '100%',
        minHeight: 0,
        color: TEXT,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        zIndex: 1,
        padding: '12px 10px',
        boxSizing: 'border-box',
        overflow: showResultModal ? 'visible' : 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    if (!sessionCheckDone || loading) {
        return (
            <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <Loader2 size={28} style={{ color: NEON_PINK }} className="animate-spin" />
            </div>
        );
    }

    if (!session) {
        return (
            <div style={{ ...base, padding: 24, alignItems: 'center', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    <img src={logoUrl} alt="HelpSeller" style={{ height: 48, width: 'auto' }} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: TEXT, letterSpacing: '-0.02em', textAlign: 'center' }}>Bem-vindo ao HelpSeller</h2>
                <p style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 20, textAlign: 'center', lineHeight: 1.4 }}>Faça login para usar o coach de vendas em tempo real nas suas reuniões.</p>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, marginBottom: 4, color: TEXT_SECONDARY }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: RADIUS, border: `1px solid ${INPUT_BORDER}`, background: INPUT_BG, color: TEXT, fontSize: 13, boxSizing: 'border-box' }}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, marginBottom: 4, color: TEXT_SECONDARY }}>Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: RADIUS, border: `1px solid ${INPUT_BORDER}`, background: INPUT_BG, color: TEXT, fontSize: 13, boxSizing: 'border-box' }}
                            required
                        />
                    </div>
                    {error && <p style={{ color: ACCENT_DANGER, fontSize: 12 }}>{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', padding: 12, borderRadius: RADIUS, border: 'none', background: `linear-gradient(135deg, ${NEON_PINK}, ${NEON_PINK_LIGHT})`, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        );
    }

    const isRecording = status === 'RECORDING';

    if (isFreePlan && !isRecording) {
        return (
            <div style={{ ...base, justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
                    <img src={logoUrl} alt="HelpSeller" style={{ height: 20, width: 'auto' }} />
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: 2 }} aria-label="Sair">
                        <LogOut size={14} />
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <p style={{ fontSize: 10, color: TEXT_SECONDARY, margin: 0 }}>{session.user?.email}</p>
                    <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        backgroundColor: `${PLAN_COLORS.FREE}22`, color: PLAN_COLORS.FREE,
                        border: `1px solid ${PLAN_COLORS.FREE}44`, textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                        {PLAN_LABELS[currentPlan || 'FREE'] || 'Grátis'}
                    </span>
                </div>
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                    padding: '0 12px',
                }}>
                    <Lock size={36} style={{ color: NEON_PINK, marginBottom: 14 }} />
                    <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6, margin: '0 0 6px 0' }}>Plano ativo necessário</p>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: '0 0 20px 0', lineHeight: 1.5 }}>
                        Ative um plano para usar o coaching IA em tempo real. Comece com <strong style={{ color: TEXT }}>7 dias grátis!</strong>
                    </p>
                    <a
                        href={`${dashboardUrl}/billing`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '10px 28px', borderRadius: RADIUS,
                            background: `linear-gradient(135deg, ${NEON_PINK}, ${NEON_PINK_LIGHT})`,
                            color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
                            cursor: 'pointer', border: 'none',
                            boxShadow: `0 0 20px ${NEON_PINK}40`,
                        }}
                    >
                        Escolher plano
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div style={base}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
                <img src={logoUrl} alt="HelpSeller" style={{ height: 20, width: 'auto' }} />
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: 2 }} aria-label="Sair">
                    <LogOut size={14} />
                </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <p style={{ fontSize: 10, color: TEXT_SECONDARY, margin: 0 }}>{session.user?.email}</p>
                {currentPlan && (() => {
                    const planColor = PLAN_COLORS[currentPlan] || PLAN_COLORS.FREE;
                    return (
                        <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: `${planColor}22`,
                            color: planColor,
                            border: `1px solid ${planColor}44`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                        }}>
                            {PLAN_LABELS[currentPlan] || currentPlan}
                        </span>
                    );
                })()}
            </div>

            {isMeetOrZoomTab && (
                <div style={{ marginBottom: 10 }}>
                    <button
                        type="button"
                        onClick={toggleSuggestionsPanel}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: RADIUS,
                            border: `1px solid ${BORDER_PINK}`,
                            background: BG_CARD,
                            color: TEXT,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        {suggestionsPanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                        {suggestionsPanelOpen ? 'Ocultar painel de sugestões' : 'Mostrar painel de sugestões'}
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '6px 10px', borderRadius: 16, background: BG_CARD, border: `1px solid ${BORDER_PINK}`, width: 'fit-content', flexShrink: 0 }}>
                <div
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isRecording ? NEON_PINK : TEXT_MUTED,
                        animation: isRecording ? 'record-dot 1.2s ease-in-out infinite' : undefined,
                    }}
                />
                <span style={{ fontSize: 10, fontWeight: 600, color: isRecording ? NEON_PINK : TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isRecording ? 'Gravando' : 'Parado'}
                </span>
            </div>

            <div
                style={{
                    textAlign: 'center',
                    marginBottom: 14,
                    padding: '12px 10px',
                    borderRadius: 12,
                    background: BG_CARD,
                    border: `1px solid ${BORDER_PINK}`,
                    flexShrink: 0,
                }}
            >
                <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tempo de gravação</div>
                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: isRecording ? '#fff' : TEXT_MUTED,
                        textShadow: isRecording ? `0 0 20px ${NEON_PINK}40` : undefined,
                        letterSpacing: '0.02em',
                    }}
                >
                    {isRecording ? formatDuration(elapsedSeconds) : '00:00'}
                </div>
            </div>

            {!isRecording && tabs.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, marginBottom: 4, color: TEXT_SECONDARY }}>
                        <Monitor size={12} />
                        Aba
                    </label>
                    <select
                        value={selectedTabId ?? tabs[0]?.id ?? ''}
                        onChange={(e) => setSelectedTabId(Number(e.target.value) || null)}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: RADIUS,
                            border: `1px solid ${BORDER_PINK}`,
                            background: BG_CARD,
                            color: TEXT,
                            fontSize: 11,
                            boxSizing: 'border-box',
                        }}
                    >
                        {tabs.map((tab) => (
                            <option key={tab.id} value={tab.id}>
                                {tab.title.length > 32 ? tab.title.slice(0, 32) + '…' : tab.title}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {error && (
                <p style={{ color: ACCENT_DANGER, fontSize: 11, textAlign: 'center', marginBottom: 8 }}>{error}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <button
                    type="button"
                    onClick={isRecording ? handleStopClick : () => toggleCapture()}
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: isRecording
                            ? `linear-gradient(135deg, ${ACCENT_DANGER}, #b91c1c)`
                            : `linear-gradient(135deg, ${NEON_PINK}, ${NEON_PINK_LIGHT})`,
                        color: 'white',
                        boxShadow: isRecording
                            ? '0 0 20px rgba(220, 38, 62, 0.5), 0 0 40px rgba(220, 38, 62, 0.2)'
                            : `0 0 24px ${NEON_PINK}50, 0 0 48px ${NEON_PINK_LIGHT}30`,
                        animation: isRecording ? 'neon-pulse-stop 2s ease-in-out infinite' : 'neon-pulse 2s ease-in-out infinite',
                        transition: 'transform 0.15s ease',
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                    onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 10, color: TEXT_MUTED, marginTop: 8 }}>
                {isRecording ? 'Clique para parar' : 'Clique para iniciar'}
            </p>

            {showResultModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="result-modal-title"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        minHeight: '100%',
                        background: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: 16,
                        boxSizing: 'border-box',
                    }}
                    onClick={() => setShowResultModal(false)}
                >
                    <div
                        style={{
                            background: 'rgba(30,30,30,0.98)',
                            border: `1px solid ${BORDER_PINK}`,
                            borderRadius: 16,
                            padding: 20,
                            width: '100%',
                            maxWidth: 320,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p id="result-modal-title" style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 16, textAlign: 'center' }}>
                            Qual foi o resultado desta chamada?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {CALL_RESULTS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => confirmResultAndStop(opt.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: RADIUS,
                                        border: `1px solid ${INPUT_BORDER}`,
                                        background: BG_CARD,
                                        color: TEXT,
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowResultModal(false)}
                            style={{
                                marginTop: 12,
                                width: '100%',
                                padding: 10,
                                borderRadius: RADIUS,
                                border: 'none',
                                background: 'transparent',
                                color: TEXT_MUTED,
                                fontSize: 11,
                                cursor: 'pointer',
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
