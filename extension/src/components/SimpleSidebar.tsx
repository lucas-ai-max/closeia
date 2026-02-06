import { useEffect, useState } from 'react';
import { authService } from '../services/auth';

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
    const [leadTemp, setLeadTemp] = useState<'hot' | 'warm' | 'cold'>('warm');
    const [isRecording, setIsRecording] = useState(false);

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
                    timestamp: msg.data.timestamp
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

    // Main sidebar (logged in)
    return (
        <div style={{
            width: '100%',
            height: '100vh',
            backgroundColor: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#e2e8f0'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px' }}>{getTempIcon(leadTemp)}</span>
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
            </div>

            {/* Coach Suggestion */}
            <div style={{ padding: '16px', borderBottom: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    💡 Sugestão do Coach
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
                        transcripts.map((t, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: t.isFinal ? '#334155' : '#1e293b',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    lineHeight: '1.5',
                                    borderLeft: t.isFinal ? '3px solid #3b82f6' : '3px solid #64748b'
                                }}
                            >
                                {t.text}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
