import { useEffect, useState, useRef } from 'react';
import { authService } from '../services/auth';
import { GripVertical, Mic, Minus, X, Cpu, MessageCircle, HelpCircle, AlertTriangle, Copy, Check, Lock, ChevronsDown } from 'lucide-react';
import { BG, BG_ELEVATED, BORDER, TEXT, TEXT_SECONDARY, TEXT_MUTED, INPUT_BG, ACCENT_ACTIVE, ACCENT_DANGER, NEON_PINK, RADIUS } from '../lib/theme';
import { dashboardUrl } from '../config/env';

interface TranscriptEntry {
    text: string;
    speaker: string;
    role: string;
    isFinal: boolean;
    timestamp: number;
}

interface CoachingData {
    phase: string;
    tip: string;
    objection: string | null;
    suggestedResponse: string | null;
    suggestedQuestion: string | null;
    urgency: string;
    timestamp: number;
}

const TYPING_SPEED_MS = 18;
const ACCENT_GREEN = '#22c55e';
const ACCENT_BLUE = '#3b82f6';

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

function TypingText({ text, animate, cursorColor }: { text: string; animate: boolean; cursorColor: string }) {
    const [displayLen, setDisplayLen] = useState(animate ? 0 : text.length);
    const prevTextRef = useRef(text);
    useEffect(() => {
        if (!animate) { setDisplayLen(text.length); return; }
        const prevText = prevTextRef.current;
        prevTextRef.current = text;
        if (text.startsWith(prevText)) {
            setDisplayLen(prev => Math.min(prev, prevText.length));
        } else {
            setDisplayLen(0);
        }
    }, [text, animate]);
    useEffect(() => {
        if (!animate || displayLen >= text.length) return;
        const timer = setTimeout(() => setDisplayLen(prev => prev + 1), TYPING_SPEED_MS);
        return () => clearTimeout(timer);
    }, [displayLen, text, animate]);
    const isTyping = animate && displayLen < text.length;
    return (
        <>
            <span>{text.slice(0, displayLen)}</span>
            {isTyping && (
                <span style={{ display: 'inline-block', width: 2, height: 13, backgroundColor: cursorColor, marginLeft: 1, verticalAlign: 'text-bottom', animation: 'cursorBlink 0.6s step-end infinite' }} />
            )}
        </>
    );
}


function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };
    return (
        <button onClick={handleCopy} title="Copiar" style={{ padding: 4, background: 'transparent', border: 'none', color: copied ? ACCENT_GREEN : TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, flexShrink: 0 }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
        </button>
    );
}

const logoUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('logo.svg') : '';
const SIDEBAR_W = 360;
const SIDEBAR_H = '80vh';
const MIN_W = 48;
const MIN_H = 56;

function getHostFromEvent(e: React.MouseEvent): HTMLDivElement | null {
    const root = (e.target as HTMLElement).getRootNode();
    if (root && 'host' in root) return (root as ShadowRoot).host as HTMLDivElement;
    return document.getElementById('sales-copilot-root') as HTMLDivElement | null;
}

function getHost(): HTMLDivElement | null {
    return document.getElementById('sales-copilot-root') as HTMLDivElement | null;
}

export default function SimpleSidebar() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [coachFeed, setCoachFeed] = useState<CoachingData[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [streamingCoachJson, setStreamingCoachJson] = useState<string>('');
    const [managerWhisper, setManagerWhisper] = useState<{ content: string; urgency: string; timestamp: number } | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
    const [isPlanRequired, setIsPlanRequired] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [userScrolledUp, setUserScrolledUp] = useState(false);
    const [transcriptPct, setTranscriptPct] = useState(30); // % of height for transcripts
    const [fontSizeOffset, setFontSizeOffset] = useState(0);
    const fs = (base: number) => base + fontSizeOffset;
    const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0, panelW: SIDEBAR_W, panelH: 300 });
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const coachFeedRef = useRef<HTMLDivElement>(null);
    const coachFeedEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = getHost();
        if (!host) return;
        chrome.storage.local.get(['sidebarPosition', 'sidebarMinimized', 'sidebarOpen'], (r: { sidebarPosition?: { left: number; top: number }; sidebarMinimized?: boolean; sidebarOpen?: boolean }) => {
            const pos = r.sidebarPosition;
            const defaultLeft = Math.max(0, window.innerWidth - SIDEBAR_W - 16);
            host.style.left = (pos?.left ?? defaultLeft) + 'px';
            host.style.top = (pos?.top ?? 16) + 'px';
            const min = r.sidebarMinimized ?? false;
            const open = r.sidebarOpen === true;
            setIsMinimized(min);
            if (!open) {
                host.style.width = '0';
                host.style.height = '0';
                host.style.visibility = 'hidden';
                host.style.pointerEvents = 'none';
            }
        });
    }, []);

    useEffect(() => {
        const host = getHost();
        if (!host) return;
        host.style.width = isMinimized ? MIN_W + 'px' : SIDEBAR_W + 'px';
        host.style.height = isMinimized ? MIN_H + 'px' : SIDEBAR_H;
        chrome.storage.local.set({ sidebarMinimized: isMinimized });
    }, [isMinimized]);

    useEffect(() => {
        if (loading || session) return;
        chrome.storage.local.set({ sidebarOpen: false }).catch(() => {});
        const host = getHost();
        if (host) {
            host.style.width = '0';
            host.style.height = '0';
            host.style.visibility = 'hidden';
            host.style.pointerEvents = 'none';
        }
    }, [loading, session]);

    const handleDragStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        const host = getHostFromEvent(e);
        if (!host) return;
        e.preventDefault();
        const w = isMinimized ? MIN_W : SIDEBAR_W;
        const leftStr = host.style.left || '';
        const topStr = host.style.top || '';
        const left = leftStr ? parseFloat(leftStr) : window.innerWidth - w - 16;
        const top = topStr ? parseFloat(topStr) : 16;
        const startLeft = Number.isNaN(left) ? 0 : Math.max(0, left);
        const startTop = Number.isNaN(top) ? 0 : Math.max(0, top);
        dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft, startTop, panelW: w, panelH: isMinimized ? MIN_H : 200 };
        const onMove = (e2: MouseEvent) => {
            const dx = e2.clientX - dragRef.current.startX;
            const dy = e2.clientY - dragRef.current.startY;
            const h = getHost();
            if (h) {
                const maxLeft = window.innerWidth - dragRef.current.panelW - 8;
                const maxTop = window.innerHeight - dragRef.current.panelH - 8;
                const newLeft = Math.max(0, Math.min(maxLeft, dragRef.current.startLeft + dx));
                const newTop = Math.max(0, Math.min(maxTop, dragRef.current.startTop + dy));
                h.style.left = newLeft + 'px';
                h.style.top = newTop + 'px';
            }
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            const h = getHost();
            if (h) {
                chrome.storage.local.set({
                    sidebarPosition: {
                        left: parseFloat(h.style.left || '0') || 0,
                        top: parseFloat(h.style.top || '0') || 0
                    }
                });
            }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const toggleMinimize = () => setIsMinimized((p) => !p);

    useEffect(() => { checkSession(); }, []);

    const checkSession = async () => {
        try {
            const sess = await authService.getSession();
            setSession(sess);
            if (!sess) {
                setLoading(false);
                return;
            }

            // Restore session in Supabase client memory before fetching plan
            await authService.restoreSessionInMemory(sess);

            // Fetch plan BEFORE ending loading state
            let orgData = await authService.fetchOrganizationPlan();

            // If first attempt fails, wait and retry once (session may still be initializing)
            if (!orgData && sess.refresh_token) {
                await new Promise(r => setTimeout(r, 1500));
                orgData = await authService.fetchOrganizationPlan();
            }

            if (orgData) {
                setCurrentPlan(orgData.plan);
                if (orgData.plan === 'FREE') setIsPlanRequired(true);
            }
        } catch (err) {
            console.error('checkSession failed:', err);
            setSession(null);
        } finally {
            // Always end loading state
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        setSession(null);
        setIsRecording(false);
    };

    // Re-check session when storage changes (e.g. login from popup, or background sets access level)
    useEffect(() => {
        const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'session' && changes.supabase_session) {
                checkSession();
            }
        };
        chrome.storage.onChanged.addListener(storageListener);

        // Retry if no session found (background may not have set access level yet)
        if (!session && !loading) {
            const retryTimer = setTimeout(() => checkSession(), 2000);
            return () => {
                clearTimeout(retryTimer);
                chrome.storage.onChanged.removeListener(storageListener);
            };
        }

        return () => chrome.storage.onChanged.removeListener(storageListener);
    }, [session, loading]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    // Auto-scroll coach feed only if user is NOT scrolled up reading
    useEffect(() => {
        if (!userScrolledUp) {
            coachFeedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [coachFeed, userScrolledUp]);

    const handleCoachFeedScroll = () => {
        const el = coachFeedRef.current;
        if (!el) return;
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
        setUserScrolledUp(!isAtBottom);
    };

    const handleDividerDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;
        const startY = e.clientY;
        const containerRect = container.getBoundingClientRect();
        const startPct = transcriptPct;
        const onMove = (e2: MouseEvent) => {
            const dy = startY - e2.clientY;
            const deltaP = (dy / containerRect.height) * 100;
            setTranscriptPct(Math.max(10, Math.min(70, startPct + deltaP)));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    useEffect(() => {
        const listener = (msg: any) => {
            if (msg.type === 'TRANSCRIPT_RESULT') {
                const { text, isFinal, timestamp, speaker, role } = msg.data || {};
                if (!text) return;
                const entry: TranscriptEntry = { text, speaker: speaker || 'unknown', role: role || 'unknown', isFinal: isFinal ?? true, timestamp: timestamp || Date.now() };
                setTranscripts(prev => {
                    if (!isFinal) {
                        const lastIdx = prev.length - 1;
                        const last = lastIdx >= 0 ? prev[lastIdx] : null;
                        if (last && !last.isFinal && last.role === entry.role) {
                            const updated = [...prev];
                            updated[lastIdx] = entry;
                            return updated;
                        }
                        return [...prev, entry];
                    }
                    const lastIdx = prev.length - 1;
                    const last = lastIdx >= 0 ? prev[lastIdx] : null;
                    if (last && !last.isFinal && last.role === entry.role) {
                        const updated = [...prev];
                        updated[lastIdx] = entry;
                        return updated;
                    }
                    return [...prev, entry];
                });
            } else if (msg.type === 'STATUS_UPDATE') {
                setIsRecording(msg.status === 'RECORDING');
                if (msg.status === 'RECORDING' && typeof msg.micAvailable === 'boolean') {
                    setMicAvailable(msg.micAvailable);
                }
                if (msg.status !== 'RECORDING') setMicAvailable(null);
                if (msg.status === 'PERMISSION_REQUIRED') {
                    alert('Permissão necessária. Clique no ícone da extensão na barra do navegador para autorizar a captura da aba.');
                }
                if (msg.status === 'PLAN_REQUIRED') {
                    setIsPlanRequired(true);
                }
            } else if (msg.type === 'MANAGER_WHISPER') {
                setManagerWhisper({ content: msg.data.content, urgency: msg.data.urgency, timestamp: msg.data.timestamp });
            } else if (msg.type === 'COACH_THINKING') {
                setIsThinking(true);
                setStreamingCoachJson('');
            } else if (msg.type === 'COACH_TOKEN') {
                setStreamingCoachJson(prev => prev + (msg.data?.token || ''));
            } else if (msg.type === 'COACH_IDLE' || msg.type === 'COACH_DONE') {
                setIsThinking(false);
                setStreamingCoachJson('');
            } else if (msg.type === 'COACHING_MESSAGE') {
                setIsThinking(false);
                setStreamingCoachJson('');
                const payload = msg.data;
                const newCoaching: CoachingData = {
                    phase: payload.metadata?.phase || 'S',
                    tip: payload.content || '',
                    objection: payload.metadata?.objection || null,
                    suggestedResponse: payload.metadata?.suggested_response || null,
                    suggestedQuestion: payload.metadata?.suggested_question || null,
                    urgency: payload.urgency || 'medium',
                    timestamp: Date.now(),
                };
                setCoachFeed(prev => [...prev, newCoaching]);
            } else if (msg.type === 'PLAN_REQUIRED') {
                setIsPlanRequired(true);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    const baseContainer: React.CSSProperties = {
        width: '100%',
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: BG,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: TEXT,
    };

    if (loading) {
        return (
            <div style={{ ...baseContainer, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: TEXT_SECONDARY, fontSize: 13 }}>Carregando...</span>
            </div>
        );
    }

    if (!session) {
        return (
            <div style={{ ...baseContainer, height: '100%', padding: 24, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8 }}>Este painel só funciona quando você está logado.</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Faça login no ícone da extensão na barra de ferramentas do navegador.</p>
            </div>
        );
    }

    if (isMinimized) {
        return (
            <div onMouseDown={handleDragStart} style={{ width: '100%', height: '100%', backgroundColor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', borderRight: `1px solid ${BORDER}`, cursor: 'move', userSelect: 'none' }}>
                <button onClick={toggleMinimize} title="Expandir" style={{ width: 32, height: 32, borderRadius: RADIUS, border: `1px solid ${BORDER}`, background: BG_ELEVATED, color: TEXT_SECONDARY, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GripVertical size={16} style={{ transform: 'rotate(-90deg)' }} />
                </button>
            </div>
        );
    }

    if (isPlanRequired) {
        const planLabel = currentPlan ? (PLAN_LABELS[currentPlan] || currentPlan) : 'Grátis';
        const planColor = currentPlan ? (PLAN_COLORS[currentPlan] || PLAN_COLORS.FREE) : PLAN_COLORS.FREE;
        return (
            <div style={{ ...baseContainer, height: '100%', padding: 24, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <Lock size={40} style={{ color: NEON_PINK, marginBottom: 16 }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Plano necessário</p>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>Seu plano atual:</span>
                    <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                        backgroundColor: `${planColor}22`, color: planColor,
                        border: `1px solid ${planColor}44`, textTransform: 'uppercase',
                    }}>
                        {planLabel}
                    </span>
                </div>
                <p style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 20, lineHeight: 1.5 }}>
                    Para usar o coaching IA em tempo real, ative um plano. Comece com 7 dias grátis!
                </p>
                <a
                    href={`${dashboardUrl}/billing`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px 24px', borderRadius: RADIUS, backgroundColor: NEON_PINK,
                        color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
                        cursor: 'pointer', border: 'none',
                    }}
                >
                    Escolher plano
                </a>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ ...baseContainer, height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <div onMouseDown={handleDragStart} style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move', userSelect: 'none', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GripVertical size={14} style={{ color: TEXT_MUTED }} />
                    {logoUrl ? <img src={logoUrl} alt="HelpSeller" style={{ height: 18, width: 'auto' }} /> : <Mic size={14} style={{ color: isRecording ? ACCENT_DANGER : TEXT_MUTED }} />}
                    <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_SECONDARY }}>
                        {isRecording ? 'Ao Vivo' : 'Parado'}
                    </div>
                    {currentPlan && (
                        <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: `${PLAN_COLORS[currentPlan] || PLAN_COLORS.FREE}22`,
                            color: PLAN_COLORS[currentPlan] || PLAN_COLORS.FREE,
                            border: `1px solid ${PLAN_COLORS[currentPlan] || PLAN_COLORS.FREE}44`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                        }}>
                            {PLAN_LABELS[currentPlan] || currentPlan}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 1, padding: '2px 4px', borderRadius: RADIUS, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.03)' }}>
                        <button
                            onClick={() => setFontSizeOffset(Math.max(-2, fontSizeOffset - 1))}
                            disabled={fontSizeOffset <= -2}
                            style={{ padding: 2, background: 'transparent', border: 'none', color: fontSizeOffset <= -2 ? TEXT_MUTED + '40' : TEXT_MUTED, cursor: fontSizeOffset <= -2 ? 'default' : 'pointer', display: 'flex' }}
                            title="Diminuir fonte"
                        >
                            <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>A-</span>
                        </button>
                        <button
                            onClick={() => setFontSizeOffset(Math.min(4, fontSizeOffset + 1))}
                            disabled={fontSizeOffset >= 4}
                            style={{ padding: 2, background: 'transparent', border: 'none', color: fontSizeOffset >= 4 ? TEXT_MUTED + '40' : TEXT_MUTED, cursor: fontSizeOffset >= 4 ? 'default' : 'pointer', display: 'flex' }}
                            title="Aumentar fonte"
                        >
                            <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>A+</span>
                        </button>
                    </div>
                    <button onClick={toggleMinimize} title="Minimizar" style={{ padding: 4, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: RADIUS, color: TEXT_SECONDARY, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={12} />
                    </button>
                    <button onClick={handleLogout} style={{ padding: 4, fontSize: 10, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: RADIUS, color: TEXT_SECONDARY, cursor: 'pointer' }}>Sair</button>
                </div>
            </div>

            {/* Manager Whisper */}
            {managerWhisper && (
                <div style={{ padding: '8px 12px', background: '#1a1a2e', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: ACCENT_BLUE, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Gestor diz:</span>
                        <button onClick={() => setManagerWhisper(null)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12} /></button>
                    </div>
                    <div style={{ fontSize: fs(12), lineHeight: 1.5, color: TEXT }}>{managerWhisper.content}</div>
                </div>
            )}

            {/* Coach thinking indicator */}
            {isThinking && (
                <div style={{ padding: '6px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, background: 'rgba(255,0,122,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Cpu size={12} style={{ color: NEON_PINK, animation: 'spin 1.5s linear infinite' }} />
                        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>Coach analisando...</span>
                    </div>
                </div>
            )}

            {/* Coach Feed — scrollable chat-like feed */}
            <div
                ref={coachFeedRef}
                onScroll={handleCoachFeedScroll}
                style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}
            >
                {coachFeed.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 }}>
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>As sugestões do coach aparecerão aqui</span>
                    </div>
                ) : (
                    coachFeed.map((item, idx) => {
                        const isLatest = idx === coachFeed.length - 1;
                        return (
                            <div key={`cf-${item.timestamp}-${idx}`} style={{ borderBottom: `1px solid ${BORDER}`, opacity: isLatest ? 1 : 0.7, animation: isLatest ? 'coachPop 0.4s ease' : 'none' }}>
                                {item.objection && (
                                    <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.3)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                                            <span style={{ fontSize: fs(11), fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                                                Objeção: {item.objection}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {item.suggestedResponse && (
                                    <div style={{ padding: '10px 12px', background: isLatest ? 'rgba(34,197,94,0.10)' : 'transparent', borderLeft: isLatest ? `3px solid ${ACCENT_GREEN}` : `3px solid transparent` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <MessageCircle size={13} style={{ color: ACCENT_GREEN, animation: isLatest ? 'pulse 1.5s ease-in-out 3' : 'none' }} />
                                                <span style={{ fontSize: fs(11), fontWeight: 800, color: ACCENT_GREEN, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diga Agora</span>
                                            </div>
                                            <CopyButton text={item.suggestedResponse} />
                                        </div>
                                        <div style={{ fontSize: isLatest ? fs(14) : fs(12), fontWeight: 600, lineHeight: 1.5, color: TEXT, wordBreak: 'break-word' }}>
                                            "{item.suggestedResponse}"
                                        </div>
                                    </div>
                                )}
                                {item.suggestedQuestion && (
                                    <div style={{ padding: '8px 12px', background: isLatest ? 'rgba(59,130,246,0.08)' : 'transparent', borderLeft: isLatest ? `3px solid ${ACCENT_BLUE}` : `3px solid transparent` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <HelpCircle size={12} style={{ color: ACCENT_BLUE }} />
                                                <span style={{ fontSize: fs(10), fontWeight: 700, color: ACCENT_BLUE, textTransform: 'uppercase' }}>Pergunte</span>
                                            </div>
                                            <CopyButton text={item.suggestedQuestion} />
                                        </div>
                                        <div style={{ fontSize: isLatest ? fs(13) : fs(12), fontWeight: 500, lineHeight: 1.4, color: TEXT, wordBreak: 'break-word' }}>
                                            "{item.suggestedQuestion}"
                                        </div>
                                    </div>
                                )}
                                {!item.suggestedResponse && !item.suggestedQuestion && !item.objection && (
                                    <div style={{ padding: '6px 12px', background: isLatest ? BG_ELEVATED : 'transparent' }}>
                                        <div style={{ fontSize: fs(10), fontWeight: 600, marginBottom: 3, color: NEON_PINK, textTransform: 'uppercase' }}>Dica</div>
                                        <div style={{ fontSize: fs(11), lineHeight: 1.4, color: TEXT_SECONDARY }}>
                                            {item.tip.split(/(\*\*.*?\*\*)/).map((part, pi) =>
                                                part.startsWith('**') && part.endsWith('**') ? (
                                                    <strong key={pi} style={{ color: TEXT, fontWeight: 600 }}>{part.slice(2, -2)}</strong>
                                                ) : part
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={coachFeedEndRef} />

                {/* "Scroll to latest" button when user scrolled up */}
                {userScrolledUp && coachFeed.length > 0 && (
                    <button
                        onClick={() => {
                            coachFeedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            setUserScrolledUp(false);
                        }}
                        style={{
                            position: 'sticky',
                            bottom: 8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 12px',
                            borderRadius: 20,
                            border: `1px solid ${NEON_PINK}44`,
                            background: `${BG}ee`,
                            color: NEON_PINK,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                            boxShadow: `0 2px 12px rgba(0,0,0,0.5)`,
                        }}
                    >
                        <ChevronsDown size={12} />
                        Nova sugestão
                    </button>
                )}
            </div>

            {/* Resizable divider */}
            <div
                onMouseDown={handleDividerDrag}
                style={{ flexShrink: 0, height: 6, cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: BG_ELEVATED, userSelect: 'none' }}
            >
                <div style={{ width: 32, height: 2, borderRadius: 1, background: TEXT_MUTED }} />
            </div>

            {/* Realtime Transcripts — Chat Bubble Layout */}
            <div style={{ flexShrink: 0, height: `${transcriptPct}%`, minHeight: 40, overflowY: 'auto', overflowX: 'hidden', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, backgroundColor: BG }}>
                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: ACCENT_BLUE }}>Cliente</span>
                    <span>Transcrição</span>
                    <span style={{ color: NEON_PINK }}>Você</span>
                </div>
                {transcripts.length === 0 ? (
                    <div style={{ fontSize: 12, color: TEXT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 }}>
                        <span>Aguardando áudio</span>
                        <span style={{ display: 'inline-flex', gap: 3 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: TEXT_MUTED, animation: 'aiPulse 1.4s infinite 0s' }} />
                            <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: TEXT_MUTED, animation: 'aiPulse 1.4s infinite 0.3s' }} />
                            <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: TEXT_MUTED, animation: 'aiPulse 1.4s infinite 0.6s' }} />
                        </span>
                    </div>
                ) : (
                    transcripts.map((t, i) => {
                        const isLast = i === transcripts.length - 1;
                        const shouldAnimate = isLast;
                        const isLead = t.role === 'lead';
                        const bubbleBg = isLead ? 'rgba(59,130,246,0.12)' : 'rgba(255,0,122,0.10)';
                        const bubbleBorder = isLead ? 'rgba(59,130,246,0.25)' : 'rgba(255,0,122,0.25)';
                        const labelColor = isLead ? ACCENT_BLUE : NEON_PINK;
                        return (
                            <div key={`${t.timestamp}-${i}`} style={{ display: 'flex', justifyContent: isLead ? 'flex-start' : 'flex-end', animation: isLast && t.isFinal ? 'slideIn 0.2s ease' : 'none' }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '5px 10px',
                                    borderRadius: isLead ? '10px 10px 10px 2px' : '10px 10px 2px 10px',
                                    backgroundColor: bubbleBg,
                                    border: `1px solid ${bubbleBorder}`,
                                    opacity: t.isFinal ? 1 : 0.7,
                                    transition: 'opacity 0.2s ease',
                                }}>
                                    <div style={{ fontSize: fs(8), fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>
                                        {isLead ? 'CLIENTE' : 'VOCÊ'}
                                    </div>
                                    <div style={{ fontSize: fs(11), lineHeight: 1.45, color: TEXT }}>
                                        <TypingText text={t.text} animate={shouldAnimate} cursorColor={labelColor} />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={transcriptEndRef} />
            </div>

            {/* Status Bar */}
            <div style={{ padding: '6px 12px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', backgroundColor: BG_ELEVATED, border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 10, color: TEXT_MUTED }}>
                    <Cpu size={10} style={isRecording ? { animation: 'spin 2s linear infinite', color: NEON_PINK } : {}} />
                    {isRecording
                        ? isThinking ? 'Analisando...' : 'Escutando ao vivo'
                        : 'Aguardando gravação'}
                </div>
            </div>

            <style>{`
                :host *, :host *::before, :host *::after { box-sizing: border-box; }
                :host ::-webkit-scrollbar { width: 5px; }
                :host ::-webkit-scrollbar-track { background: transparent; }
                :host ::-webkit-scrollbar-thumb { background: ${NEON_PINK}40; border-radius: 4px; }
                :host ::-webkit-scrollbar-thumb:hover { background: ${NEON_PINK}70; }
                * { scrollbar-width: thin; scrollbar-color: ${NEON_PINK}40 transparent; }
                div[style*="overflowY"] { word-break: break-word; }
                @keyframes cursorBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                @keyframes aiPulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes coachPop {
                    0% { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    60% { transform: translateY(1px) scale(1.01); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.25); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
