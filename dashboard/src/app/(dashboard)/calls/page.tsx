'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MediaStreamPlayer } from '@/components/MediaStreamPlayer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageSquare, Clock } from 'lucide-react';

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
                script:scripts!script_id(name)
            `)
            .eq('status', 'ACTIVE')
            .order('started_at', { ascending: false });

        if (!error && data) {
            setCalls(data as any);
        }
    };

    const [managerToken, setManagerToken] = useState<string>('');

    // Fetch token for manager WebSocket
    useEffect(() => {
        const fetchToken = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                setManagerToken(session.access_token);
            }
        };
        fetchToken();
    }, []);

    // Connect to manager WebSocket when call is selected
    useEffect(() => {
        if (!selectedCall || !managerToken) return;

        const websocket = new WebSocket(
            `ws://localhost:3001/ws/manager?token=${managerToken}`
        );

        websocket.onopen = () => {
            console.log('Manager WebSocket connected');
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

        return () => {
            websocket.close();
        };
    }, [selectedCall, managerToken]);

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
        <div className="flex h-full">
            {/* Calls List Sidebar */}
            <div className="w-80 border-r bg-gray-50 flex flex-col">
                <div className="p-4 border-b bg-white">
                    <h2 className="text-lg font-semibold mb-2">Chamadas</h2>
                    <div className="flex gap-2">
                        <Button
                            variant={!showHistory ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowHistory(false)}
                            className="flex-1"
                        >
                            Ativas ({calls.length})
                        </Button>
                        <Button
                            variant={showHistory ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowHistory(true)}
                            className="flex-1"
                        >
                            Histórico
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {showHistory ? (
                        // HISTORY LIST
                        historyCalls.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 text-sm">Nenhuma chamada recente</div>
                        ) : (
                            historyCalls.map((call) => (
                                <Card
                                    key={call.id}
                                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => window.location.href = `/calls/${call.id}`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="font-medium truncate">
                                                {call.user?.name || 'Vendedor'}
                                            </div>
                                            <Badge variant="outline" className={call.summary?.result === 'CONVERTED' ? 'text-green-600 bg-green-50' : 'text-gray-500'}>
                                                {formatDuration(call.started_at)}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {new Date(call.started_at).toLocaleDateString()}
                                        </div>
                                        {call.summary?.lead_sentiment && (
                                            <div className="mt-2 text-xs flex items-center gap-1">
                                                <Badge variant="secondary" className="text-[10px] px-1 h-5">
                                                    {call.summary.lead_sentiment}
                                                </Badge>
                                                {call.summary.result && (
                                                    <Badge variant="secondary" className="text-[10px] px-1 h-5">
                                                        {call.summary.result}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )
                    ) : (
                        // ACTIVE CALLS LIST
                        calls.length === 0 ? (
                            <Card>
                                <CardContent className="p-4 text-center text-gray-500">
                                    Nenhuma chamada ativa
                                </CardContent>
                            </Card>
                        ) : (
                            calls.map((call) => (
                                <Card
                                    key={call.id}
                                    className={`cursor-pointer transition-colors ${selectedCall?.id === call.id
                                        ? 'ring-2 ring-blue-500'
                                        : 'hover:bg-gray-100'
                                        }`}
                                    onClick={() => {
                                        setSelectedCall(call);
                                        setTranscripts([]);
                                    }}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium">
                                                    {call.user?.name || 'Unknown User'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {call.user?.email}
                                                </div>
                                            </div>
                                            <Badge variant="default" className="ml-2 animate-pulse">
                                                <Phone className="w-3 h-3 mr-1" />
                                                LIVE
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex items-center text-xs text-gray-600">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {formatDuration(call.started_at)}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            Platform: {call.platform}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Main Monitoring Area */}
            <div className="flex-1 flex flex-col">
                {!selectedCall ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <Phone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p>Select a call to start monitoring</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Video Stream */}
                        <div className="p-4 bg-black">
                            <MediaStreamPlayer
                                callId={selectedCall.id}
                                wsUrl="ws://localhost:3001/ws/manager"
                                token={managerToken}
                            />
                        </div>

                        {/* Transcript and Whisper */}
                        <div className="flex-1 grid grid-cols-2 gap-4 p-4">
                            {/* Live Transcript */}
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>Live Transcript</CardTitle>
                                    <CardDescription>
                                        Real-time conversation
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto">
                                    {transcripts.length === 0 ? (
                                        <p className="text-gray-500 text-sm">
                                            Waiting for audio...
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {transcripts.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-2 rounded ${item.role === 'seller'
                                                        ? 'bg-blue-50'
                                                        : 'bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="text-xs font-medium text-gray-600">
                                                        {item.speaker}
                                                    </div>
                                                    <div className="text-sm">{item.text}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Whisper Control */}
                            {/* Whisper Control - Only for Managers */}
                            {(userRole === 'MANAGER' || userRole === 'ADMIN') && (
                                <Card className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle>Send Whisper</CardTitle>
                                        <CardDescription>
                                            Coach the seller in real-time
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col">
                                        <Textarea
                                            placeholder="Type coaching tip here..."
                                            value={whisperMessage}
                                            onChange={(e) => setWhisperMessage(e.target.value)}
                                            className="flex-1 mb-4"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.ctrlKey) {
                                                    sendWhisper();
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={sendWhisper}
                                            disabled={!whisperMessage.trim()}
                                            className="w-full bg-amber-600 hover:bg-amber-700"
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Send Whisper (Ctrl+Enter)
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
