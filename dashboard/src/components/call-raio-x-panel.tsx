'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Calendar,
    Clock,
    User,
    ThumbsUp,
    ThumbsDown,
    Activity,
    CheckCircle2,
    AlertCircle,
    BrainCircuit,
    Zap,
    Target,
    MessageSquare,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CallRaioXTabs, FlatAnalysis } from './call-raio-x-tabs';

const NEON_PINK = '#ff007a';
const NEON_GREEN = '#00ff94';
const NEON_ORANGE = '#ff8a00';
const CARD_BG = '#1e1e1e';
const CARD_BORDER = 'rgba(255,255,255,0.08)';

export interface CallSummaryForRaioX {
    id?: string;
    script_adherence_score?: number;
    strengths?: string[];
    improvements?: string[];
    objections_faced?: unknown[];
    buying_signals?: string[];
    lead_sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED';
    result?: 'CONVERTED' | 'FOLLOW_UP' | 'LOST' | 'UNKNOWN';
    next_steps?: string[];
    ai_notes?: string;
    raw_analysis?: FlatAnalysis;
}

export interface CallForRaioX {
    id: string;
    user_id: string;
    status: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
    user?: { full_name?: string };
    lead_profile?: { name?: string };
    script?: { name?: string };
    coach?: { name?: string };
    summary?: CallSummaryForRaioX;
    transcript?: Array<{ speaker?: string; role?: string; text?: string }>;
    recording_url_lead?: string;
    recording_url_seller?: string;
    recording_url_video?: string;
}

export interface ObjectionForRaioX {
    id: string;
    trigger_phrase: string;
    coaching_tip: string;
    detected_at?: string;
}

interface CallRaioXPanelProps {
    call: CallForRaioX | null;
    objections: ObjectionForRaioX[];
    loading: boolean;
    error: string | null;
}

function formatDuration(seconds?: number, startedAt?: string, endedAt?: string): string {
    if (seconds != null) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }
    if (startedAt && endedAt) {
        const diff = Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        return `${mins}m ${secs}s`;
    }
    return 'N/A';
}

function getSentimentColor(sentiment?: string): string {
    switch (sentiment) {
        case 'POSITIVE': return 'text-green-400 bg-green-900/30 border-green-500/30';
        case 'NEGATIVE': return 'text-red-400 bg-red-900/30 border-red-500/30';
        case 'MIXED': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
        default: return 'text-gray-400 bg-gray-900/30 border-gray-500/30';
    }
}

function getSentimentIcon(sentiment?: string) {
    switch (sentiment) {
        case 'POSITIVE': return <ThumbsUp className="w-6 h-6" />;
        case 'NEGATIVE': return <ThumbsDown className="w-6 h-6" />;
        case 'MIXED': return <Activity className="w-6 h-6" />;
        default: return <Activity className="w-6 h-6" />;
    }
}

function formatTimestamp(ts?: string | number): string {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ''; }
}



export function CallRaioXPanel({ call, objections, loading, error }: CallRaioXPanelProps) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff007a]" />
                <span className="ml-2 mt-3 text-sm text-gray-400">Carregando Raio X...</span>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 p-6">
                <p className="text-sm text-red-300 text-center">{error}</p>
            </div>
        );
    }
    if (!call) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-gray-500">
                <Zap className="w-16 h-16 mx-auto mb-4 text-gray-600" style={{ color: NEON_PINK }} />
                <p className="text-sm font-medium text-white mb-1">Raio X da Venda</p>
                <p className="text-sm">Clique em uma chamada na lista para ver o Raio X</p>
            </div>
        );
    }


    const isProcessing = call.status === 'COMPLETED' && !call.summary;

    // Extract lead names dynamically from transcription based on role (for older calls where AI didn't do this)
    let transcriptLeadName: string | null = null;
    if (call.transcript && Array.isArray(call.transcript)) {
        const leadNamesSet = new Set<string>();
        call.transcript.forEach((t: { speaker?: string; role?: string; text?: string }) => {
            if (t.role && t.role.toLowerCase() === 'lead' && t.speaker && t.speaker.toLowerCase() !== 'unknown') {
                leadNamesSet.add(t.speaker);
            }
        });
        const leadNames = Array.from(leadNamesSet);
        if (leadNames.length === 1) {
            transcriptLeadName = leadNames[0];
        } else if (leadNames.length === 2) {
            transcriptLeadName = `${leadNames[0]} & ${leadNames[1]}`;
        } else if (leadNames.length > 2) {
            const butLast = leadNames.slice(0, -1).join(', ');
            const last = leadNames[leadNames.length - 1];
            transcriptLeadName = `${butLast} & ${last}`;
        }
    }

    // Build a FlatAnalysis from legacy fields when raw_analysis is missing, OR merge native properties if raw_analysis exists but lacks them (for older calls)
    let analysisData: FlatAnalysis | null = null;
    if (call.summary) {
        if (call.summary.raw_analysis) {
            analysisData = {
                ...call.summary.raw_analysis,
                // Ensure native table values ALWAYS override the AI's hallucinated dates for older calls
                // Also filter out UUIDs that were wrongly stored as lead names in older calls
                lead_nome: (() => {
                    const aiName = call.summary?.raw_analysis?.lead_nome as string | undefined;
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(aiName || '');
                    const isPlaceholder = !aiName || aiName === 'Lead Desconhecido' || aiName === 'string — nome do lead';
                    if (!isUUID && !isPlaceholder) return aiName!;
                    return transcriptLeadName || call.user?.full_name || call.lead_profile?.name || 'Lead';
                })(),

                // Native DB overrides AI JSON (since older AI runs generated dummy dates like 30/09/2023 without context)
                lead_data_call: call.started_at || call.summary.raw_analysis.lead_data_call,
                lead_duracao_segundos: call.duration_seconds || call.summary.raw_analysis.lead_duracao_segundos || 0,
            };
        } else {
            // Legacy mapping
            analysisData = {
                lead_nome: transcriptLeadName || call.user?.full_name || call.lead_profile?.name || 'Lead',
                lead_duracao_segundos: call.duration_seconds ?? 0,
                lead_data_call: call.started_at,
                sentimento: call.summary.lead_sentiment ?? 'NEUTRAL',
                aderencia_percentual: call.summary.script_adherence_score ?? 0,
                pontos_acertos: call.summary.strengths ?? [],
                pontos_melhorias: call.summary.improvements ?? [],
                resumo_ia: call.summary.ai_notes ?? '',
                resultado: call.summary.result === 'CONVERTED' ? 'Venda realizada'
                    : call.summary.result === 'FOLLOW_UP' ? 'Em negociação'
                        : call.summary.result === 'LOST' ? 'Venda não realizada'
                            : 'A definir',
            };
        }
    }

    console.log('Rendering RaioX Panel for call:', call.id, 'Data:', analysisData);

    const coachName = call.coach?.name || (call.summary?.raw_analysis as any)?.coach_name;

    return (
        <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-dark">

            {/* Coach Badge */}
            {(coachName || true) && (
                <div className="flex items-center gap-2 text-xs">
                    <span className="material-icons-outlined text-[14px] text-gray-500">psychology</span>
                    <span className="text-gray-400">Coach:</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{
                        backgroundColor: coachName ? 'rgba(255,0,122,0.1)' : 'rgba(255,255,255,0.05)',
                        color: coachName ? NEON_PINK : '#9ca3af',
                        border: `1px solid ${coachName ? 'rgba(255,0,122,0.2)' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                        {coachName || 'SPIN Selling (Padrão)'}
                    </span>
                </div>
            )}

            {/* Recording Player - unified video with mixed audio */}
            {call.recording_url_video && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Gravação da chamada</p>
                    <video
                        controls
                        preload="metadata"
                        className="w-full rounded-lg bg-black"
                        style={{ maxHeight: '300px' }}
                    >
                        <source src={call.recording_url_video} type="video/webm" />
                    </video>
                </div>
            )}

            {isProcessing ? (
                <div className="rounded-xl border-2 border-blue-500/30 p-8 text-center shrink-0" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }}>
                    <BrainCircuit className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-pulse" />
                    <h3 className="text-base font-bold text-white">Processando Inteligência...</h3>
                    <p className="mt-2 text-blue-300 text-sm">A IA está analisando a conversa.</p>
                    <p className="mt-2 text-gray-500 text-xs">Pode levar até 1 minuto. A página atualiza sozinha.</p>
                </div>
            ) : analysisData ? (
                <CallRaioXTabs data={analysisData} />
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-gray-500">
                    <p className="text-sm">Nenhuma análise disponível para esta chamada.</p>
                </div>
            )}
        </div>
    );
}
