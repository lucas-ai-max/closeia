import { useEffect, useState, useRef } from 'react';
import { authService } from '../services/auth';

const SIDEBAR_W = 360;
const SIDEBAR_H = '80vh';
const MIN_W = 48;
const MIN_H = 56;

/** Pega o elemento host do painel (dentro do Shadow DOM usa rootNode.host) */
function getHostFromEvent(e: React.MouseEvent): HTMLDivElement | null {
    const root = (e.target as HTMLElement).getRootNode();
    if (root && 'host' in root) return (root as ShadowRoot).host as HTMLDivElement;
    return document.getElementById('sales-copilot-root') as HTMLDivElement | null;
}

function getHost(): HTMLDivElement | null {
    return document.getElementById('sales-copilot-root') as HTMLDivElement | null;
}

export default function SimpleSidebar() {
    // Auth state
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Recording state
    const [transcripts, setTranscripts] = useState<any[]>([]);
    const [coachSuggestion, setCoachSuggestion] = useState('Aguardando transcrição...');
    const [managerWhisper, setManagerWhisper] = useState<{ content: string; urgency: string; timestamp: number } | null>(null);
    const [leadTemp, setLeadTemp] = useState<'hot' | 'warm' | 'cold'>('warm');
    const [isRecording, setIsRecording] = useState(false);
    const [micAvailable, setMicAvailable] = useState<boolean | null>(null);

    // Janela: minimizada + arrastar
    const [isMinimized, setIsMinimized] = useState(false);
    const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0, panelW: SIDEBAR_W, panelH: 300 });

    useEffect(() => {
        const host = getHost();
        if (!host) return;
        chrome.storage.local.get(['sidebarPosition', 'sidebarMinimized'], (r: { sidebarPosition?: { left: number; top: number }; sidebarMinimized?: boolean }) => {
            const pos = r.sidebarPosition;
            const defaultLeft = Math.max(0, window.innerWidth - SIDEBAR_W - 16);
            host.style.left = (pos?.left ?? defaultLeft) + 'px';
            host.style.top = (pos?.top ?? 16) + 'px';
            const min = r.sidebarMinimized ?? false;
            setIsMinimized(min);
            host.style.width = min ? MIN_W + 'px' : SIDEBAR_W + 'px';
            host.style.height = min ? MIN_H + 'px' : SIDEBAR_H;
        });
    }, []);

    useEffect(() => {
        const host = getHost();
        if (!host) return;
        host.style.width = isMinimized ? MIN_W + 'px' : SIDEBAR_W + 'px';
        host.style.height = isMinimized ? MIN_H + 'px' : SIDEBAR_H;
        chrome.storage.local.set({ sidebarMinimized: isMinimized });
    }, [isMinimized]);

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

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const sess = await authService.getSession();
        setSession(sess);
        setLoading(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authService.login(email, password);
            await checkSession();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        setSession(null);
        setIsRecording(false);
    };

    const toggleRecording = () => {
        chrome.runtime.sendMessage({
            type: isRecording ? 'STOP_CAPTURE' : 'START_CAPTURE'
        });
    };

    // Listen for messages
    useEffect(() => {
        const listener = (msg: any) => {
            if (msg.type === 'TRANSCRIPT_RESULT') {
                const newTranscript = {
                    text: msg.data.text,
                    isFinal: msg.data.isFinal,
                    timestamp: msg.data.timestamp,
                    speaker: msg.data.speaker || 'unknown' // Add speaker property
                };
                setTranscripts(prev => [...prev, newTranscript]);

                // Mock: Update coach suggestion based on transcript
                if (msg.data.text.toLowerCase().includes('preço')) {
                    setCoachSuggestion('💡 Foque no valor, não no preço. Destaque os benefícios.');
                    setLeadTemp('warm');
                } else if (msg.data.text.toLowerCase().includes('interessante')) {
                    setCoachSuggestion('🔥 Lead engajado! Pergunte sobre o timeline de decisão.');
                    setLeadTemp('hot');
                } else if (msg.data.text.toLowerCase().includes('não')) {
                    setCoachSuggestion('⚠️ Possível objeção. Faça perguntas abertas para entender.');
                    setLeadTemp('cold');
                }
            } else if (msg.type === 'STATUS_UPDATE') {
                setIsRecording(msg.status === 'RECORDING');
                if (msg.status === 'RECORDING' && typeof msg.micAvailable === 'boolean') {
                    setMicAvailable(msg.micAvailable);
                }
                if (msg.status !== 'RECORDING') setMicAvailable(null);

                if (msg.status === 'PERMISSION_REQUIRED') {
                    alert('⚠️ Permissão necessária!\n\nPor favor, clique no ícone da extensão "Sales Copilot" na barra do navegador para autorizar a captura da aba.');
                }
            } else if (msg.type === 'MANAGER_WHISPER') {
                // Handle new whisper
                setManagerWhisper({
                    content: msg.data.content,
                    urgency: msg.data.urgency,
                    timestamp: msg.data.timestamp
                });
            } else if (msg.type === 'COACHING_MESSAGE') {
                const event = msg.data;
                if (!event) return;

                // Edge coaching format: { type, title, description, metadata }
                if (event.title && event.description) {
                    setCoachSuggestion(`${event.title}: ${event.description}`);
                    if (event.type === 'objection') setLeadTemp('hot');
                    return;
                }

                // Backend coaching format: { type, content, urgency, isTopRecommendation }
                if (event.content) {
                    const prefix = event.isTopRecommendation ? '🏆 ' : '';
                    setCoachSuggestion(prefix + event.content);
                    if (event.urgency === 'high') setLeadTemp('hot');
                }
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    const getTempIcon = (temp: 'hot' | 'warm' | 'cold') => {
        if (temp === 'hot') return '🔥';
        if (temp === 'warm') return '🌡️';
        return '❄️';
    };

    // Loading state
    if (loading) {
        return (
            <div style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1e293b',
                color: '#e2e8f0'
            }}>
                <div>Carregando...</div>
            </div>
        );
    }

    // Login screen
    if (!session) {
        return (
            <div style={{
                width: '100%',
                height: '100vh',
                backgroundColor: '#1e293b',
                padding: '24px',
                color: '#e2e8f0',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px', color: '#f1f5f9' }}>
                    Sales Copilot AI
                </h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #475569',
                                backgroundColor: '#334155',
                                color: '#e2e8f0',
                                fontSize: '14px'
                            }}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #475569',
                                backgroundColor: '#334155',
                                color: '#e2e8f0',
                                fontSize: '14px'
                            }}
                            required
                        />
                    </div>
                    {error && <p style={{ color: '#ef4444', fontSize: '14px' }}>{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        );
    }

    if (isMinimized) {
        return (
            <div
                onMouseDown={handleDragStart}
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    borderRight: '1px solid #334155',
                    cursor: 'move',
                    userSelect: 'none'
                }}
            >
                <button
                    onClick={toggleMinimize}
                    title="Expandir"
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#334155',
                        color: '#e2e8f0',
                        fontSize: '18px',
                        cursor: 'pointer'
                    }}
                >
                    ◀
                </button>
            </div>
        );
    }

    // Main sidebar (logged in)
    return (
        <div style={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            backgroundColor: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#e2e8f0'
        }}>
            {/* Header = arrastar por aqui + minimizar / sair */}
            <div
                onMouseDown={handleDragStart}
                style={{
                    padding: '16px',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'move',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ opacity: 0.7, marginRight: '4px' }} title="Arraste aqui para mover">⋮⋮</span>
                    <span style={{ fontSize: '24px' }}>{isRecording ? '🎙️' : '⏸️'}</span>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isRecording ? 'GRAVANDO' : 'PAUSADO'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {session.user.email}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={toggleMinimize}
                        title="Minimizar"
                        style={{
                            padding: '4px 8px',
                            fontSize: '14px',
                            backgroundColor: 'transparent',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            color: '#94a3b8',
                            cursor: 'pointer'
                        }}
                    >
                        −
                    </button>
                    <span style={{ fontSize: '18px' }}>{getTempIcon(leadTemp)}</span>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: 'transparent',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            color: '#94a3b8',
                            cursor: 'pointer'
                        }}
                    >
                        Sair
                    </button>
                </div>
            </div>

            {/* Recording Control */}
            <div style={{ padding: '16px', borderBottom: '1px solid #334155' }}>
                <button
                    onClick={toggleRecording}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isRecording ? '#dc2626' : '#10b981',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    {isRecording ? '⏹️ Parar Gravação' : '▶️ Iniciar Gravação'}
                </button>
                {isRecording && micAvailable !== null && (
                    <div style={{ fontSize: '11px', color: micAvailable ? '#22c55e' : '#f59e0b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {micAvailable ? '🎙️ Microfone permitido (sua voz = Você)' : '⚠️ Microfone não permitido – sua voz pode aparecer como Cliente'}
                    </div>
                )}
            </div>

            {/* MANAGER WHISPER AREA */}
            {managerWhisper && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)', // Yellow tint
                    borderBottom: '1px solid #eab308',
                    borderTop: '1px solid #eab308'
                }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        marginBottom: '8px',
                        color: '#eab308', // Gold
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>👑 Dica do Gestor</span>
                        <button
                            onClick={() => setManagerWhisper(null)}
                            style={{ background: 'none', border: 'none', color: '#eab308', cursor: 'pointer', fontSize: '14px' }}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '500', lineHeight: '1.5', color: '#fef08a' }}>
                        {managerWhisper.content}
                    </div>
                </div>
            )}

            {/* Coach Suggestion */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #334155',
                background: coachSuggestion.includes('🏆') ? 'linear-gradient(to right, rgba(234, 179, 8, 0.1), transparent)' : 'transparent'
            }}>
                <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: coachSuggestion.includes('🏆') ? '#fbbf24' : '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    {coachSuggestion.includes('🏆') ? '🏆 Melhor Recomendação' : '💡 Sugestão do Coach'}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#e2e8f0' }}>
                    {coachSuggestion}
                </div>
            </div>

            {/* Transcription */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📝 Transcrição
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {transcripts.length === 0 ? (
                        <div style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                            Aguardando áudio...
                        </div>
                    ) : (
                        transcripts.map((t, i) => {
                            const isSeller = t.role === 'seller' || t.speaker === 'Você';
                            const label = t.speaker ?? (isSeller ? 'Você' : 'Cliente');
                            return (
                                <div
                                    key={i}
                                    style={{
                                        alignSelf: isSeller ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isSeller ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <span style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', marginLeft: '4px', marginRight: '4px' }}>
                                        {label}
                                    </span>
                                    <div
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: isSeller ? '#3b82f6' : '#334155',
                                            borderRadius: isSeller ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                            fontSize: '13px',
                                            lineHeight: '1.5',
                                            color: '#f1f5f9'
                                        }}
                                    >
                                        {t.text}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
