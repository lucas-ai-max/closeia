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
}

export default function CallsPage() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [whisperMessage, setWhisperMessage] = useState('');
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [transcripts, setTranscripts] = useState<any[]>([]);
    const supabase = createClient();

    // Fetch active calls
    useEffect(() => {
        fetchActiveCalls();

        // Poll for updates every 5 seconds
        const interval = setInterval(fetchActiveCalls, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchActiveCalls = async () => {
        console.log('Fetching active calls...');
        console.log('Supabase client:', supabase);
        console.log('Env vars:', {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });

        // Try simple query first
        const { data: testData, error: testError } = await supabase
            .from('calls')
            .select('*')
            .limit(1);

        console.log('Simple query test:', { testData, testError });

        // Now try the full query
        const { data, error } = await supabase
            .from('calls')
            .select(`
                *,
                user:profiles!user_id(name),
                script:scripts!calls_script_relationship(name)
            `)
            .eq('status', 'ACTIVE')
            .order('started_at', { ascending: false });

        console.log('Full query result:', { hasData: !!data, dataLength: data?.length, error });

        if (!error && data) {
            console.log('Active calls found:', data);
            setCalls(data as any);
        } else if (error) {
            console.error('❌ Error fetching calls object:', error);
            console.error('❌ Error details (JSON):', JSON.stringify(error, null, 2));
            console.error('❌ Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
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
        <div className="flex h-full">
            {/* Calls List Sidebar */}
            <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">Active Calls</h2>
                    <p className="text-sm text-gray-500">{calls.length} ongoing</p>
                </div>

                <div className="space-y-2">
                    {calls.length === 0 ? (
                        <Card>
                            <CardContent className="p-4 text-center text-gray-500">
                                No active calls
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
                                                {call.profiles?.name || 'Unknown User'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {call.profiles?.email}
                                            </div>
                                        </div>
                                        <Badge variant="default" className="ml-2">
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
                                token=""
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
                                        className="w-full"
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Send Whisper (Ctrl+Enter)
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
