'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { MediaStreamPlayer } from '@/components/MediaStreamPlayer';

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
    };
    script?: {
        name: string;
    };
}

export default function LivePage() {
    // 1. ESTADOS
    const [isMounted, setIsMounted] = useState(false);
    const [activeCalls, setActiveCalls] = useState<Call[]>([]);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [whisperMessage, setWhisperMessage] = useState('');
    const [transcripts, setTranscripts] = useState<any[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchActiveCalls = async () => {
        const { data, error } = await supabase
            .from('calls')
            .select(`
                *,
                user:profiles!user_id(full_name, email),
                script:scripts!calls_script_relationship(name)
            `)
            .eq('status', 'ACTIVE')
            .order('started_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching active calls:', error);
        }

        if (data) setActiveCalls(data as any);
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

    // WebSocket Connection
    useEffect(() => {
        if (!isMounted || !selectedCall) return;

        const connectWS = async () => {
            // Fetch initial transcripts
            const { data: callData } = await supabase
                .from('calls')
                .select('transcript')
                .eq('id', selectedCall.id)
                .single();

            if (callData?.transcript) {
                setTranscripts(callData.transcript as any[]);
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setToken(session.access_token);

            // Close existing
            if (ws) ws.close();

            const socket = new WebSocket(
                `ws://localhost:3001/ws/manager?token=${session.access_token}`
            );

            socket.onopen = () => {
                console.log('Monitor connected');
                socket.send(JSON.stringify({
                    type: 'manager:join',
                    payload: { callId: selectedCall.id }
                }));
            };

            socket.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === 'transcript:stream') {
                    setTranscripts(prev => [...prev, msg.payload]);
                }
            };

            setWs(socket);
        };

        connectWS();
        setTranscripts([]); // Reset transcripts on change

        return () => {
            if (ws) ws.close();
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

    if (role === 'SELLER') {
        return (
            <div className="space-y-6">
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
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                        {activeCalls.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm rounded-xl border border-white/10 bg-black/20">
                                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>Nenhuma chamada ativa no momento.</p>
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
                                        <div className="min-w-0">
                                            <p className="font-semibold text-white truncate">{call.user?.full_name || 'Vendedor'}</p>
                                            <p className="text-xs text-gray-500 truncate">{call.script?.name || 'Script Geral'}</p>
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
                            {/* Media Stream Player */}
                            <div className="w-full shrink-0">
                                {isMounted && selectedCall && token && (
                                    /*<MediaStreamPlayer
                                        callId={selectedCall.id}
                                        wsUrl="ws://localhost:3001/ws/manager"
                                        token={token}
                                    />*/
                                    <div className="text-center text-gray-500 py-4">Vídeo desativado temporariamente</div>
                                )}
                            </div>

                            <Card className="flex-1 flex flex-col overflow-hidden rounded-[24px] border shadow-none" style={CARD_STYLE}>
                                <CardHeader className="py-4 border-b border-white/10">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                                            <span className="truncate">Monitorando: {selectedCall.user?.full_name}</span>
                                        </CardTitle>
                                        <span className="text-xs px-2 py-1 rounded-lg bg-white/10 text-gray-400">
                                            {selectedCall.platform}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {transcripts.length === 0 ? (
                                        <p className="text-center text-sm text-gray-500 py-8">
                                            Aguardando áudio da chamada...
                                        </p>
                                    ) : (
                                        transcripts.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'lead' ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'lead'
                                                    ? 'bg-white/10 border border-white/10 rounded-tl-none'
                                                    : 'bg-neon-pink/10 border border-neon-pink/20 rounded-tr-none'
                                                    }`}>
                                                    <p className="font-bold text-[10px] text-gray-400 mb-1 uppercase">
                                                        {msg.speaker || (msg.role === 'lead' ? 'Cliente' : 'Você')}
                                                    </p>
                                                    <span className="text-white">{msg.text}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shrink-0 rounded-[24px] border shadow-none" style={CARD_STYLE}>
                                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
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
