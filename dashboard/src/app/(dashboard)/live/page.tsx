'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@/components/layout/dashboard-header';

interface Call {
    id: string;
    user_id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    platform: string;
    started_at: string;
    user?: {
        name: string;
        email: string;
    };
    script?: {
        name: string;
    };
}

export default function LivePage() {
    const [activeCalls, setActiveCalls] = useState<Call[]>([]);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [whisperMessage, setWhisperMessage] = useState('');
    const [transcripts, setTranscripts] = useState<any[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // 1. Check Role & Fetch Calls
    useEffect(() => {
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
    }, []);

    const fetchActiveCalls = async () => {
        const { data, error } = await supabase
            .from('calls')
            .select(`
                *,
                user:profiles!user_id(name, email),
                script:scripts!script_id(name)
            `)
            .eq('status', 'ACTIVE')
            .order('started_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch active calls:', error);
            return;
        }
        if (data) setActiveCalls(data as any);
    };

    // 2. WebSocket Connection for Monitoring
    useEffect(() => {
        if (!selectedCall) return;

        const connectWS = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

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
    }, [selectedCall]);

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

    if (loading) return <div className="p-8">Carregando Torre de Comando...</div>;

    if (role === 'SELLER') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-xl font-bold">Acesso Restrito</h2>
                <p className="text-muted-foreground">Esta área é exclusiva para gestores.</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            <DashboardHeader title="Torre de Comando (Ao Vivo)" />

            <div className="flex-1 flex gap-6 overflow-hidden pb-6">
                {/* Available Calls List */}
                <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
                    {activeCalls.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>Nenhuma chamada ativa no momento.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        activeCalls.map(call => (
                            <Card
                                key={call.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${selectedCall?.id === call.id ? 'border-primary ring-1 ring-primary' : ''}`}
                                onClick={() => setSelectedCall(call)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">{call.user?.name || 'Vendedor'}</p>
                                            <p className="text-xs text-muted-foreground">{call.script?.name || 'Script Geral'}</p>
                                        </div>
                                        <Badge variant="destructive" className="animate-pulse">AO VIVO</Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(call.started_at)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Main Monitor Area */}
                <div className="flex-1 flex flex-col gap-4">
                    {!selectedCall ? (
                        <Card className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                            <CardContent className="text-center text-muted-foreground">
                                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Phone className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium mb-1">Selecione uma chamada</h3>
                                <p>Clique em uma chamada ativa ao lado para iniciar o monitoramento.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Live Transcript */}
                            <Card className="flex-1 flex flex-col overflow-hidden">
                                <CardHeader className="py-4 border-b">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            Monitorando: {selectedCall.user?.name}
                                        </CardTitle>
                                        <Badge variant="outline">{selectedCall.platform}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/30">
                                    {transcripts.length === 0 ? (
                                        <p className="text-center text-sm text-muted-foreground py-8">
                                            Aguardando áudio da chamada...
                                        </p>
                                    ) : (
                                        transcripts.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'lead' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'lead'
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-slate-800 border rounded-tl-none'
                                                    }`}>
                                                    <p className="font-bold text-[10px] opacity-70 mb-1 uppercase">
                                                        {msg.speaker || (msg.role === 'lead' ? 'Cliente' : 'Vendedor')}
                                                    </p>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            {/* Whisper Control */}
                            <Card className="shrink-0">
                                <CardContent className="p-4 flex gap-4">
                                    <Textarea
                                        placeholder="Digite uma dica secreta para o vendedor (Whisper)..."
                                        className="resize-none"
                                        rows={2}
                                        value={whisperMessage}
                                        onChange={e => setWhisperMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && e.ctrlKey && sendWhisper()}
                                    />
                                    <Button
                                        className="h-auto px-6 bg-amber-500 hover:bg-amber-600 text-white"
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
