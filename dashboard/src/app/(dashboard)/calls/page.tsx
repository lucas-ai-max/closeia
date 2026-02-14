'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { MediaStreamPlayer } from '@/components/MediaStreamPlayer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MessageSquare, Clock } from 'lucide-react';

const NEON_PINK = '#ff007a';
const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' };

interface Call {
    id: string;
    user_id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    platform: string;
    started_at: string;
    ended_at?: string;
    user?: {
        name: string;
        email: string;
    };
    script?: {
        name: string;
    };
    summary?: {
        lead_sentiment?: string;
        result?: string;
    };
}

export default function CallsPage() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [historyCalls, setHistoryCalls] = useState<Call[]>([]); // New state
    const [showHistory, setShowHistory] = useState(false); // New state toggle
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [whisperMessage, setWhisperMessage] = useState('');
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [transcripts, setTranscripts] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string>('SELLER'); // Default to safe role
    const supabase = createClient();

    // Fetch active calls and user role
    useEffect(() => {
        const getUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) setUserRole(profile.role);
            }
        };
        getUserRole();
        fetchActiveCalls();
        if (showHistory) fetchHistoryCalls();

        // Poll for updates every 5 seconds
        const interval = setInterval(() => {
            fetchActiveCalls();
            if (showHistory) fetchHistoryCalls();
        }, 5000);

        return () => clearInterval(interval);
    }, [showHistory]);

    const fetchHistoryCalls = async () => {
        const { data, error } = await supabase
            .from('calls')
            .select(`
                *,
                user:profiles!user_id(name),
                summary:call_summaries(lead_sentiment, result)
            `)
            .eq('status', 'COMPLETED')
            .order('started_at', { ascending: false })
            .limit(20);

        if (data) {
            // Transform summary array if needed
            const formatted = (data as any[]).map(c => ({
                ...c,
                summary: Array.isArray(c.summary) ? c.summary[0] : c.summary
            }));
            setHistoryCalls(formatted as Call[]);
        }
    };

    const fetchActiveCalls = async () => {
        // ... (existing logs removed for brevity)
        const { data, error } = await supabase
            .from('calls')
            .select(`
                *,
                user:profiles!user_id(name),
                script:scripts!calls_script_relationship(name)
            `)
            .eq('status', 'ACTIVE')
            .order('started_at', { ascending: false });

        if (!error && data) {
            setCalls(data as any);
        }
    };

    // Connect to manager WebSocket when call is selected
    useEffect(() => {
        if (!selectedCall) return;

        const connectWebSocket = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const websocket = new WebSocket(
                `ws://localhost:3001/ws/manager?token=${session.access_token}`
            );

            websocket.onopen = () => {
                console.log('Manager WebSocket connected');
                // Join the call
                websocket.send(JSON.stringify({
                    type: 'manager:join',
                    payload: { callId: selectedCall.id }
                }));
            };

            websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);

                if (message.type === 'transcript:stream') {
                    setTranscripts(prev => [...prev, message.payload]);
                }

                if (message.type === 'manager:joined') {
                    console.log('Joined call:', message.payload.callId);
                }
            };

            websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            websocket.onclose = () => {
                console.log('Manager WebSocket disconnected');
            };

            setWs(websocket);
        };

        connectWebSocket();

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [selectedCall]);

    const sendWhisper = () => {
        if (!ws || !whisperMessage.trim()) return;

        ws.send(JSON.stringify({
            type: 'manager:whisper',
            payload: {
                content: whisperMessage,
                urgency: 'normal'
            }
        }));

        setWhisperMessage('');
    };

    const formatDuration = (startedAt: string) => {
        const start = new Date(startedAt).getTime();
        const now = Date.now();
        const diff = Math.floor((now - start) / 1000);

        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6">
            <DashboardHeader title="Chamadas" />
            <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-12rem)]">
                {/* Calls List Sidebar */}
                <div
                    className="w-full lg:w-80 shrink-0 rounded-[24px] border flex flex-col overflow-hidden"
                    style={{ ...CARD_STYLE, borderColor: 'rgba(255,255,255,0.05)' }}
                >
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white mb-3">Chamadas</h2>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => setShowHistory(false)}
                                className={`flex-1 rounded-xl font-medium ${
                                    !showHistory
                                        ? 'text-white'
                                        : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-gray-300'
                                }`}
                                style={!showHistory ? { backgroundColor: NEON_PINK, boxShadow: '0 0 16px rgba(255,0,122,0.3)' } : undefined}
                            >
                                Ativas ({calls.length})
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setShowHistory(true)}
                                className={`flex-1 rounded-xl font-medium ${
                                    showHistory
                                        ? 'text-white'
                                        : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-gray-300'
                                }`}
                                style={showHistory ? { backgroundColor: NEON_PINK, boxShadow: '0 0 16px rgba(255,0,122,0.3)' } : undefined}
                            >
                                Histórico
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                        {showHistory ? (
                            historyCalls.length === 0 ? (
                                <div className="text-center text-gray-500 py-8 text-sm">Nenhuma chamada recente</div>
                            ) : (
                                historyCalls.map((call) => (
                                    <div
                                        key={call.id}
                                        className="rounded-xl border border-white/10 p-4 cursor-pointer transition-colors hover:bg-white/5 bg-black/20"
                                        onClick={() => window.location.href = `/calls/${call.id}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-medium truncate text-white">
                                                {call.user?.name || 'Vendedor'}
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${call.summary?.result === 'CONVERTED' ? 'text-neon-green bg-neon-green/20' : 'text-gray-500 bg-white/10'}`}>
                                                {formatDuration(call.started_at)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {new Date(call.started_at).toLocaleDateString()}
                                        </div>
                                        {call.summary?.lead_sentiment && (
                                            <div className="mt-2 text-xs flex items-center gap-1 flex-wrap">
                                                <span className="px-2 py-0.5 rounded bg-white/10 text-gray-400">
                                                    {call.summary.lead_sentiment}
                                                </span>
                                                {call.summary.result && (
                                                    <span className="px-2 py-0.5 rounded bg-white/10 text-gray-400">
                                                        {call.summary.result}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )
                        ) : (
                            calls.length === 0 ? (
                                <div className="rounded-xl border border-white/10 p-4 text-center text-gray-500 text-sm">
                                    Nenhuma chamada ativa
                                </div>
                            ) : (
                                calls.map((call) => (
                                    <div
                                        key={call.id}
                                        className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                                            selectedCall?.id === call.id
                                                ? 'ring-2 ring-neon-pink bg-neon-pink/10 border-neon-pink/50'
                                                : 'border-white/10 hover:bg-white/5 bg-black/20'
                                        }`}
                                        onClick={() => {
                                            setSelectedCall(call);
                                            setTranscripts([]);
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-white truncate">
                                                    {call.user?.name || 'Vendedor'}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    {call.user?.email}
                                                </div>
                                            </div>
                                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon-pink/20 text-neon-pink animate-pulse flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                LIVE
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center text-xs text-gray-500">
                                            <Clock className="w-3 h-3 mr-1 shrink-0" />
                                            {formatDuration(call.started_at)}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {call.platform}
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>

                {/* Main Monitoring Area */}
                <div className="flex-1 flex flex-col min-h-[400px] rounded-[24px] border overflow-hidden" style={CARD_STYLE}>
                    {!selectedCall ? (
                        <div className="flex items-center justify-center flex-1 text-gray-500 p-8">
                            <div className="text-center">
                                <Phone className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                                <p className="text-sm">Selecione uma chamada para monitorar</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="p-4 bg-black">
                                <MediaStreamPlayer
                                    callId={selectedCall.id}
                                    wsUrl="ws://localhost:3001/ws/manager"
                                    token=""
                                />
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                <Card className="flex flex-col rounded-2xl border shadow-none" style={CARD_STYLE}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base font-bold text-white">Live Transcript</CardTitle>
                                        <CardDescription className="text-gray-500 text-sm">
                                            Conversa em tempo real
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-y-auto min-h-[120px]">
                                        {transcripts.length === 0 ? (
                                            <p className="text-gray-500 text-sm">Aguardando áudio...</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {transcripts.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3 rounded-xl text-sm ${
                                                            item.role === 'seller'
                                                                ? 'bg-neon-pink/10 border border-neon-pink/20'
                                                                : 'bg-white/5 border border-white/10'
                                                        }`}
                                                    >
                                                        <div className="text-xs font-semibold text-gray-400 mb-0.5">
                                                            {item.speaker}
                                                        </div>
                                                        <div className="text-white">{item.text}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {(userRole === 'MANAGER' || userRole === 'ADMIN') && (
                                    <Card className="flex flex-col rounded-2xl border shadow-none" style={CARD_STYLE}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base font-bold text-white">Enviar Whisper</CardTitle>
                                            <CardDescription className="text-gray-500 text-sm">
                                                Oriente o vendedor em tempo real
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col min-h-[120px]">
                                            <Textarea
                                                placeholder="Digite uma dica de coaching..."
                                                value={whisperMessage}
                                                onChange={(e) => setWhisperMessage(e.target.value)}
                                                className="flex-1 min-h-[80px] mb-4 rounded-xl border-white/10 bg-black/30 text-white placeholder:text-gray-600 focus-visible:ring-neon-pink"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && e.ctrlKey) {
                                                        sendWhisper();
                                                    }
                                                }}
                                            />
                                            <Button
                                                onClick={sendWhisper}
                                                disabled={!whisperMessage.trim()}
                                                className="w-full rounded-xl font-semibold"
                                                style={{
                                                    backgroundColor: NEON_PINK,
                                                    boxShadow: '0 0 16px rgba(255,0,122,0.3)',
                                                }}
                                            >
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Enviar Whisper (Ctrl+Enter)
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
