'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    Phone,
    ThumbsUp,
    ThumbsDown,
    Activity,
    FileText,
    CheckCircle2,
    AlertCircle,
    BrainCircuit,
    ChevronDown,
    ChevronUp,
    Play
} from 'lucide-react';

// Interfaces based on database schema
interface Call {
    id: string;
    user_id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    platform: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
    transcript?: any[]; // JSONB
    lead_profile?: any; // JSONB
    user?: {
        name: string;
        email: string;
    };
    script?: {
        name: string;
    };
    summary?: CallSummary;
}

interface CallSummary {
    id: string;
    script_adherence_score?: number;
    strengths?: string[];
    improvements?: string[];
    objections_faced?: any[];
    buying_signals?: string[];
    lead_sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED';
    result?: 'CONVERTED' | 'FOLLOW_UP' | 'LOST' | 'UNKNOWN';
    next_steps?: string[];
    ai_notes?: string;
}

interface UserProfile {
    id: string;
    role: 'ADMIN' | 'MANAGER' | 'SELLER';
    organization_id: string;
}

export default function CallDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [call, setCall] = useState<Call | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

    const supabase = createClient();
    const callId = params.id as string;

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);

                // 1. Get current user
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
                if (authError || !authUser) throw new Error('Not authenticated');

                // 2. Get user profile for RBAC
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();

                if (profileError) throw new Error('Failed to fetch profile');
                const profileData = profile as { role?: string } | null;
                setCurrentUser(profile);

                // 3. Get Call Data with Relations
                const { data: callData, error: callError } = await supabase
                    .from('calls')
                    .select(`
                        *,
                        user:profiles!user_id(name, email),
                        script:scripts!calls_script_relationship(name),
                        summary:call_summaries(*)
                    `)
                    .eq('id', callId)
                    .single();

                if (callError) throw callError;
                if (!callData) throw new Error('Call not found');

                // 4. Apply RBAC
                const call = callData as Call;
                const isOwner = call.user_id === authUser.id;
                const isManager = profileData ? ['ADMIN', 'MANAGER'].includes(profileData.role ?? '') : false;

                if (!isOwner && !isManager) {
                    throw new Error('Unauthorized access');
                }

                // Transform summary array to object if necessary (Supabase might return single object if 1:1, but verify)
                // The query `summary:call_summaries(*)` with a unique constraint returns an array or single object depending on client setup. 
                // Usually `single()` on the main query helps, but relations can be arrays.
                // Assuming summary is a single object or we take the first text.
                const summary = Array.isArray(call.summary) ? call.summary[0] : call.summary;

                setCall({ ...call, summary });

            } catch (err: any) {
                console.error('Error loading call:', err);
                setError(err.message || 'Failed to load call details');
            } finally {
                setLoading(false);
            }
        }

        if (callId) {
            loadData();
        }
    }, [callId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Carregando inteligência da call...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Erro: </strong>
                    <span className="block sm:inline">{error}</span>
                    <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                </div>
            </div>
        );
    }

    if (!call) return null;

    const isProcessing = call.status === 'COMPLETED' && !call.summary;

    const handleUpdateOutcome = async (outcome: 'CONVERTED' | 'LOST') => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/api/calls/${callId}/outcome`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({ outcome })
            });

            if (!response.ok) throw new Error('Failed to update outcome');

            // Refresh data
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Erro ao atualizar resultado da chamada');
        } finally {
            setLoading(false);
        }
    };

    // Helper to format duration
    const formatDuration = (seconds?: number) => {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    // Helper for Sentiment
    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'POSITIVE': return 'text-green-500 bg-green-50 border-green-200';
            case 'NEGATIVE': return 'text-red-500 bg-red-50 border-red-200';
            case 'MIXED': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
            default: return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

    const getSentimentIcon = (sentiment?: string) => {
        switch (sentiment) {
            case 'POSITIVE': return <ThumbsUp className="w-6 h-6" />;
            case 'NEGATIVE': return <ThumbsDown className="w-6 h-6" />;
            case 'MIXED': return <Activity className="w-6 h-6" />;
            default: return <Activity className="w-6 h-6" />;
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Button variant="ghost" className="mb-2 pl-0 hover:bg-transparent" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Calls
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Raio-X da Venda</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                            <User className="w-4 h-4" /> {call.lead_profile?.name || 'Lead Desconhecido'}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {formatDuration(call.duration_seconds)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> {new Date(call.started_at).toLocaleDateString()}
                        </span>
                        <Badge variant="outline">{call.script?.name || 'Sem Script'}</Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Outcome Buttons */}
                    {(!call.summary?.result || call.summary.result === 'UNKNOWN' || call.summary.result === 'FOLLOW_UP') && (
                        <>
                            <Button
                                variant="outline"
                                className="border-green-600 text-green-700 hover:bg-green-50"
                                onClick={() => handleUpdateOutcome('CONVERTED')}
                                disabled={loading}
                            >
                                <ThumbsUp className="w-4 h-4 mr-2" /> Venda Realizada
                            </Button>
                            <Button
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => handleUpdateOutcome('LOST')}
                                disabled={loading}
                            >
                                <ThumbsDown className="w-4 h-4 mr-2" /> Venda Perdida
                            </Button>
                        </>
                    )}

                    {/* Only show raw recording/transcript download to Admins/Managers */}
                    {currentUser && ['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                        <Button variant="outline" disabled>
                            <Play className="w-4 h-4 mr-2" /> Gravação (Manager Only)
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Intelligence Grid */}
            {isProcessing ? (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-blue-700">
                        <BrainCircuit className="w-12 h-12 mb-4 animate-pulse" />
                        <h3 className="text-lg font-semibold">Processando Inteligência...</h3>
                        <p className="mt-2 text-blue-600">Nossa IA está analisando a conversa para gerar seus insights.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Context & Sentiment (1/3 width on large screens) */}
                    <div className="space-y-6">
                        {/* Thermometer / Score */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                                    Termômetro da Lead
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`flex items-center justify-between p-4 rounded-lg border ${getSentimentColor(call.summary?.lead_sentiment)}`}>
                                    <div className="flex items-center gap-3">
                                        {getSentimentIcon(call.summary?.lead_sentiment)}
                                        <span className="font-bold text-lg">{call.summary?.lead_sentiment || 'NEUTRAL'}</span>
                                    </div>
                                    {call.summary?.script_adherence_score !== undefined && (
                                        <div className="text-right">
                                            <div className="text-xs text-gray-600 uppercase">Aderência</div>
                                            <div className="font-bold text-xl">{call.summary.script_adherence_score}%</div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* AI Notes / Context */}
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-500" />
                                    O Contexto
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {call.summary?.ai_notes || "Nenhum resumo gerado ainda."}
                            </CardContent>
                        </Card>

                        {/* Next Steps (Derived from AI Notes or static for now) */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    Próximos Passos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {call.summary?.next_steps?.length ? (
                                        call.summary.next_steps.map((step, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                {step}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-400 text-sm italic">Nenhum próximo passo detectado.</li>
                                    )}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Gold Points (2/3 width on large screens) */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-amber-500" />
                                    Pontos de Ouro
                                </CardTitle>
                                <CardDescription>O que funcionou e onde podemos melhorar</CardDescription>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-8">
                                {/* Strengths */}
                                <div>
                                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                                        <ThumbsUp className="w-4 h-4" /> Desejos & Acertos
                                    </h4>
                                    <ul className="space-y-3">
                                        {call.summary?.strengths?.length ? (
                                            call.summary.strengths.map((str, i) => (
                                                <li key={i} className="flex gap-3 text-sm bg-green-50 p-3 rounded-md text-green-800 border border-green-100">
                                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                                    {str}
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-gray-400 text-sm italic">Nenhum ponto forte detectado.</p>
                                        )}
                                    </ul>
                                </div>

                                {/* Improvements */}
                                <div>
                                    <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Dores & Melhorias
                                    </h4>
                                    <ul className="space-y-3">
                                        {call.summary?.improvements?.length ? (
                                            call.summary.improvements.map((imp, i) => (
                                                <li key={i} className="flex gap-3 text-sm bg-red-50 p-3 rounded-md text-red-800 border border-red-100">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                                    {imp}
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-gray-400 text-sm italic">Nenhum ponto de melhoria detectado.</p>
                                        )}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Transcript Section (Collapsible) */}
            <Card>
                <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b"
                    onClick={() => setShowTranscript(!showTranscript)}
                >
                    <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Transcrição Completa
                    </h3>
                    <Button variant="ghost" size="sm">
                        {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>

                {showTranscript && (
                    <CardContent className="p-0">
                        <div className="max-h-96 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                            {call.transcript && Array.isArray(call.transcript) ? (
                                call.transcript.map((entry: any, idx: number) => (
                                    <div key={idx} className={`flex gap-4 ${entry.role === 'seller' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`flex-1 p-3 rounded-lg text-sm ${entry.role === 'seller'
                                            ? 'bg-blue-100 text-blue-900 rounded-tr-none'
                                            : 'bg-white border text-gray-800 rounded-tl-none'
                                            }`}>
                                            <div className="font-xs font-semibold mb-1 opacity-70">
                                                {entry.speaker || (entry.role === 'seller' ? 'Vendedor' : 'Lead')}
                                            </div>
                                            {entry.text}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-8">Transcrição não disponível.</p>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
