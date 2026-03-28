'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { MediaStreamPlayer } from '@/components/MediaStreamPlayer';
import { LiveKitViewer } from '@/components/LiveKitViewer';

const NEON_PINK = '#ff007a';
const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' };

interface Call {
    id: string;
    user_id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    platform: string;
    started_at: string;
    user?: {
        full_name: string;
        email: string;
        avatar_url?: string;
    };
    script?: {
        name: string;
    };
}

export interface LiveSummary {
    status: string;
    summary_points: string[];
    sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Tense';
    spin_phase?: string;
}

export default function LivePage() {
    // 1. ESTADOS
    const [isMounted, setIsMounted] = useState(false);
    const [activeCalls, setActiveCalls] = useState<Call[]>([]);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [whisperMessage, setWhisperMessage] = useState('');
    const [transcripts, setTranscripts] = useState<any[]>([]);
    const [liveSummary, setLiveSummary] = useState<LiveSummary | null>(null);
    const [lastSummaryUpdate, setLastSummaryUpdate] = useState<number | null>(null);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [managerUserId, setManagerUserId] = useState<string | null>(null);
    const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') : 'http://localhost:3001';
    const WS_URL = apiBase.replace(/^http/, 'ws') + (apiBase.endsWith('/') ? '' : '/') + 'ws/manager';
    const useLiveKit = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchActiveCalls = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .single();

        const orgId = (profile as { organization_id?: string | null } | null)?.organization_id ?? null;

        let query = supabase
            .from('calls')
            .select(`
                *,
                user:profiles!user_id(full_name, avatar_url),
                script:scripts!calls_script_relationship(name)
            `)
            .eq('status', 'ACTIVE')
            .order('started_at', { ascending: false });

        if (orgId) {
            query = query.eq('organization_id', orgId);
        } else {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
            const fallbackSelect = orgId
                ? supabase.from('calls').select('*, user:profiles!user_id(full_name, avatar_url)').eq('status', 'ACTIVE').eq('organization_id', orgId).order('started_at', { ascending: false })
                : supabase.from('calls').select('*, user:profiles!user_id(full_name, avatar_url)').eq('status', 'ACTIVE').eq('user_id', user.id).order('started_at', { ascending: false });
            const fallback = await fallbackSelect;
            if (!fallback.error && fallback.data) {
                setActiveCalls(fallback.data as any);
                setSelectedCall((current) => {
                    if (!current) return current;
                    const fresh = (fallback.data as Call[]).find((c) => c.id === current.id);
                    return fresh ?? current;
                });
                return;
            }
            const minimalSelect = orgId
                ? supabase.from('calls').select('*').eq('status', 'ACTIVE').eq('organization_id', orgId).order('started_at', { ascending: false })
                : supabase.from('calls').select('*').eq('status', 'ACTIVE').eq('user_id', user.id).order('started_at', { ascending: false });
            const minimal = await minimalSelect;
            if (!minimal.error && minimal.data) setActiveCalls(minimal.data as any);
            return;
        }

        if (data) {
            setActiveCalls(data as any);
            setSelectedCall((current) => {
                if (!current) return current;
                const fresh = (data as Call[]).find((c) => c.id === current.id);
                return fresh ?? current;
            });
        }
    };

    // 2. EFEITOS
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Check Role & Fetch Calls
    useEffect(() => {
        // hydration check inside effect is fine as it doesn't change hook count
        if (!isMounted) return;

        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile) setRole((profile as any).role);
            }
            fetchActiveCalls();
            setLoading(false);
        }
        init();

        const interval = setInterval(fetchActiveCalls, 5000);
        return () => clearInterval(interval);
    }, [isMounted]);

    // WebSocket: transcript + live summary (vídeo usa MediaStreamPlayer com sua própria conexão)
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

    useEffect(() => {
        if (!isMounted || !selectedCall) return;

        setTranscripts([]);
        setLiveSummary(null);
        setWsStatus('connecting');

        let socket: WebSocket | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let reconnectAttempt = 0;
        let destroyed = false;
        let sessionToken: string | null = null;
        const MAX_RECONNECT_DELAY = 15000;
        const callId = selectedCall.id;

        const connectWS = async () => {
            if (destroyed) return;

            // Fetch existing transcript on first connect
            if (reconnectAttempt === 0) {
                const { data: callData } = await supabase
                    .from('calls')
                    .select('transcript')
                    .eq('id', callId)
                    .single();

                if ((callData as any)?.transcript) {
                    setTranscripts((callData as any).transcript as any[]);
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session || destroyed) return;
            sessionToken = session.access_token;
            setToken(sessionToken);
            if (session.user?.id) setManagerUserId(session.user.id);

            setWsStatus('connecting');
            socket = new WebSocket(WS_URL);

            socket.onopen = () => {
                if (destroyed) { socket?.close(); return; }
                reconnectAttempt = 0;
                socket!.send(JSON.stringify({ type: 'auth', payload: { token: sessionToken } }));
            };

            let wsAuthenticated = false;

            socket.onmessage = (event) => {
                if (event.data instanceof Blob || event.data instanceof ArrayBuffer) return;
                const msg = JSON.parse(event.data as string);

                if (msg.type === 'auth:ok' && !wsAuthenticated) {
                    wsAuthenticated = true;
                    setWsStatus('connected');
                    socket!.send(JSON.stringify({
                        type: 'manager:join',
                        payload: { callId }
                    }));
                    return;
                }

                if (msg.type === 'error') {
                    console.warn('[LIVE] Server error:', msg.payload);
                    if (msg.payload?.code === 'CALL_NOT_ACTIVE') {
                        setWsStatus('disconnected');
                        return;
                    }
                }

                if (msg.type === 'transcript:stream') {
                    setTranscripts(prev => [...prev, msg.payload]);
                }
                if (msg.type === 'call:live_summary') {
                    setLiveSummary(msg.payload);
                    setLastSummaryUpdate(Date.now());
                }
            };

            socket.onerror = () => {
                console.warn('[LIVE] WebSocket error');
            };

            socket.onclose = () => {
                setWsStatus('disconnected');
                if (destroyed) return;
                // Exponential backoff reconnect
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
                reconnectAttempt++;
                console.log(`[LIVE] WebSocket closed, reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
                reconnectTimeout = setTimeout(connectWS, delay);
            };

            setWs(socket);
        };

        connectWS();

        return () => {
            destroyed = true;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (socket) socket.close();
            setWs(null);
            setWsStatus('disconnected');
        };
    }, [selectedCall, isMounted]);

    // 3. RETORNOS ANTECIPADOS (Apenas após TODOS os hooks)
    if (!isMounted) return null;

    const sendWhisper = () => {
        if (!ws || !whisperMessage.trim()) return;
        ws.send(JSON.stringify({
            type: 'manager:whisper',
            payload: { content: whisperMessage, urgency: 'high' }
        }));
        setWhisperMessage('');
    };

    const formatDuration = (startedAt: string) => {
        const start = new Date(startedAt).getTime();
        const diff = Math.floor((Date.now() - start) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <DashboardHeader title="Ao Vivo" />
                <div className="rounded-[24px] border p-8" style={CARD_STYLE}>
                    <p className="text-gray-500 text-sm">Carregando Torre de Comando...</p>
                </div>
            </div>
        );
    }

    if (isMounted && role === 'SELLER') {
        return (
            <div className="space-y-6" suppressHydrationWarning={true}>
                <DashboardHeader title="Ao Vivo" />
                <div className="rounded-[24px] border flex flex-col items-center justify-center p-12 text-center" style={CARD_STYLE}>
                    <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                    <h2 className="text-xl font-bold text-white">Acesso Restrito</h2>
                    <p className="text-gray-500 mt-1">Esta área é exclusiva para gestores.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" suppressHydrationWarning={true}>
            <DashboardHeader title="Torre de Comando (Ao Vivo)" />

            <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-12rem)]">
                {/* Available Calls List */}
                <div
                    className="w-full lg:w-80 shrink-0 rounded-[24px] border overflow-hidden flex flex-col"
                    style={CARD_STYLE}
                >
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white">Chamadas ativas</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide" suppressHydrationWarning={true}>
                        {activeCalls.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm rounded-xl border border-white/10 bg-black/20">
                                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>{isMounted ? 'Nenhuma chamada ativa no momento.' : ''}</p>
                            </div>
                        ) : (
                            activeCalls.map(call => (
                                <div
                                    key={call.id}
                                    className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedCall?.id === call.id
                                        ? 'ring-2 ring-neon-pink bg-neon-pink/10 border-neon-pink/50'
                                        : 'border-white/10 hover:bg-white/5 bg-black/20'
                                        }`}
                                    onClick={() => setSelectedCall(call)}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                {call.user?.avatar_url ? (
                                                    <img
                                                        src={call.user.avatar_url}
                                                        alt={call.user.full_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-400">
                                                        {call.user?.full_name?.charAt(0).toUpperCase() || 'V'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white truncate">{call.user?.full_name ?? 'Vendedor'}</p>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon-pink/20 text-neon-pink animate-pulse flex items-center gap-1">
                                            AO VIVO
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(call.started_at)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Monitor Area */}
                <div className="flex-1 flex flex-col gap-4 min-h-[400px]">
                    {!selectedCall ? (
                        <div
                            className="flex-1 flex items-center justify-center rounded-[24px] border p-8"
                            style={CARD_STYLE}
                        >
                            <div className="text-center text-gray-500">
                                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                                    <Phone className="w-8 h-8 text-gray-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-1">Selecione uma chamada</h3>
                                <p className="text-sm">Clique em uma chamada ativa ao lado para iniciar o monitoramento.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Tela compartilhada do vendedor (vídeo ao vivo): LiveKit WebRTC ou fallback WebM/WS */}
                            <div className="w-full shrink-0 rounded-[24px] border overflow-hidden" style={CARD_STYLE}>
                                {useLiveKit && selectedCall.platform !== 'web' ? (
                                    <LiveKitViewer
                                        roomName={selectedCall.id}
                                        identity={managerUserId ? `manager_${managerUserId}` : 'manager'}
                                    />
                                ) : token ? (
                                    <MediaStreamPlayer
                                        callId={selectedCall.id}
                                        wsUrl={WS_URL}
                                        token={token}
                                    />
                                ) : (
                                    <div className="aspect-video flex items-center justify-center bg-black/40 text-gray-500 text-sm">
                                        Conectando...
                                    </div>
                                )}
                            </div>

                            <Card className="flex-1 flex flex-col overflow-hidden rounded-[24px] border shadow-none" style={CARD_STYLE}>
                                <CardHeader className="py-4 border-b border-white/10">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                wsStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                                                wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                                'bg-red-500'
                                            }`} />
                                            <span className="truncate">Monitorando: {selectedCall.user?.full_name}</span>
                                            {wsStatus === 'disconnected' && (
                                                <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                                    Reconectando...
                                                </span>
                                            )}
                                        </CardTitle>
                                        <span className="text-xs px-2 py-1 rounded-lg bg-white/10 text-gray-400">
                                            {selectedCall.platform}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {/* MANAGER VIEW: Only Live Summaries */}
                                    {liveSummary ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Insights IA</span>
                                                {lastSummaryUpdate && (
                                                    <span className="text-[10px] text-green-400 bg-green-900/30 border border-green-500/20 px-2 py-0.5 rounded-full animate-pulse">
                                                        ✓ Atualizado agora
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 mb-2">
                                                <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg px-3 py-1 text-xs text-purple-200">
                                                    Status: {liveSummary.status}
                                                </div>
                                                <div className="bg-blue-900/40 border border-blue-500/30 rounded-lg px-3 py-1 text-xs text-blue-200">
                                                    SPIN: {liveSummary.spin_phase || 'Analisando...'}
                                                </div>
                                                <div className={`border rounded-lg px-3 py-1 text-xs ${liveSummary.sentiment === 'Positive' ? 'bg-green-900/40 border-green-500/30 text-green-200' :
                                                    liveSummary.sentiment === 'Negative' ? 'bg-red-900/40 border-red-500/30 text-red-200' :
                                                        'bg-gray-800 border-gray-600 text-gray-300'
                                                    }`}>
                                                    {liveSummary.sentiment}
                                                </div>
                                            </div>

                                            <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                                                <ul className="space-y-2">
                                                    {liveSummary.summary_points?.map((point, i) => (
                                                        <li key={i} className="text-sm text-gray-300 flex gap-2">
                                                            <span className="text-neon-pink mt-1">•</span>
                                                            {point}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                            <div className="w-16 h-16 rounded-full bg-neon-pink/10 flex items-center justify-center">
                                                <Clock className="w-8 h-8 text-neon-pink animate-spin" style={{ animationDuration: '3s' }} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-semibold text-lg">IA Analisando em Tempo Real</h4>
                                                <p className="text-sm text-gray-400 mt-2 max-w-xs">
                                                    O resumo estratégico será gerado a cada <strong className="text-neon-pink">30 segundos</strong> com os insights mais relevantes da chamada.
                                                </p>
                                                <div className="mt-4 flex items-center justify-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
                                                    <span className="text-xs text-gray-500">Monitorando áudio...</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>


                            <Card className="shrink-0 rounded-[24px] border shadow-none" style={CARD_STYLE}>
                                <CardContent className="">
                                    <Textarea
                                        placeholder="Digite uma dica secreta para o vendedor (Whisper)..."
                                        className="resize-none flex-1 rounded-xl border-white/10 bg-black/30 text-white placeholder:text-gray-600 focus-visible:ring-neon-pink min-h-[80px]"
                                        rows={2}
                                        value={whisperMessage}
                                        onChange={e => setWhisperMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && e.ctrlKey && sendWhisper()}
                                    />
                                    <Button
                                        className="h-auto px-6 font-semibold shrink-0 rounded-xl"
                                        style={{
                                            backgroundColor: NEON_PINK,
                                            boxShadow: '0 0 16px rgba(255,0,122,0.3)',
                                        }}
                                        onClick={sendWhisper}
                                        disabled={!whisperMessage.trim()}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Enviar
                                    </Button>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
