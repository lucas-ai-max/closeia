'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { CallRaioXPanel, type CallForRaioX, type ObjectionForRaioX } from '@/components/call-raio-x-panel';
import { Phone, Clock, Filter, Maximize2, X } from 'lucide-react';

const NEON_PINK = '#ff007a';
const CARD_STYLE = { backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.05)' };

interface Call {
    id: string;
    user_id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    platform: string;
    started_at: string;
    ended_at?: string;
    transcript?: Array<{ speaker?: string; role?: string; text?: string }>;
    user?: {
        full_name: string;
        avatar_url?: string;
    };
    script?: {
        name: string;
    };
    summary?: {
        lead_sentiment?: string;
        result?: string;
    };
    objectionCount?: number;
}

interface TeamMember {
    id: string;
    full_name: string;
}

export default function CallsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const [calls, setCalls] = useState<Call[]>([]);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [selectedCallDetail, setSelectedCallDetail] = useState<CallForRaioX | null>(null);
    const [selectedCallObjections, setSelectedCallObjections] = useState<ObjectionForRaioX[]>([]);
    const [selectedCallLoading, setSelectedCallLoading] = useState(false);
    const [selectedCallError, setSelectedCallError] = useState<string | null>(null);
    const reprocessTriggeredForCallId = useRef<string | null>(null);
    const [isRaioXExpanded, setIsRaioXExpanded] = useState(false);

    // Close expanded modal on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsRaioXExpanded(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Filters
    const [userRole, setUserRole] = useState<string>('SELLER');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [selectedSeller, setSelectedSeller] = useState<string>('all');
    const [callsLoadError, setCallsLoadError] = useState<boolean>(false);
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [page, setPage] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const PAGE_SIZE = 50;

    const supabase = createClient();

    // Fetch user role, org, team members
    useEffect(() => {
        setMounted(true);

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setCurrentUserId(user.id);

            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role, organization_id')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    setUserRole('SELLER');
                    setOrgId(null);
                    return;
                }

                const role = (profile as any)?.role || 'SELLER';
                const org = (profile as any)?.organization_id || null;
                setUserRole(role);
                setOrgId(org);

                if (role !== 'SELLER' && org) {
                    const { data: members } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .eq('organization_id', org)
                        .order('full_name');
                    setTeamMembers(((members as any[]) || []).map((m) => ({ id: m.id, full_name: (m as any).full_name ?? 'Sem nome' })));
                }
            } catch {
                setUserRole('SELLER');
                setOrgId(null);
            }
        };

        init();
    }, []);

    // Fetch calls whenever filter changes; poll more often when a live call is selected (transcript updates)
    useEffect(() => {
        if (!mounted) return;
        fetchCalls();
        const interval = setInterval(fetchCalls, 8000);
        return () => clearInterval(interval);
    }, [mounted, selectedSeller, currentUserId, orgId, userRole, dateFilter]);

    const callIdFromUrl = searchParams.get('callId');
    useEffect(() => {
        if (!callIdFromUrl || calls.length === 0) return;
        const found = calls.find((c) => c.id === callIdFromUrl);
        if (found) setSelectedCall(found);
    }, [callIdFromUrl, calls]);

    const fetchCallDetail = useCallback(async (callId: string) => {
        setSelectedCallLoading(true);
        setSelectedCallError(null);
        try {
            const { data: callData, error: callError } = await supabase
                .from('calls')
                .select(`
                    *,
                    user:profiles!user_id(full_name),
                    script:scripts!calls_script_relationship(name),
                    coach:coaches(name),
                    summary:call_summaries(*)
                `)
                .eq('id', callId)
                .single();

            if (callError) throw callError;
            if (!callData) throw new Error('Chamada não encontrada');

            const row = callData as any;
            if (!row.duration_seconds && row.started_at && row.ended_at) {
                const start = new Date(row.started_at).getTime();
                const end = new Date(row.ended_at).getTime();
                row.duration_seconds = Math.round((end - start) / 1000);
            }
            const summary = Array.isArray(row.summary) ? row.summary[0] : row.summary;
            setSelectedCallDetail({ ...row, summary });

            const objectionsFaced = (summary?.objections_faced as any[] | undefined) ?? [];
            setSelectedCallObjections(
                objectionsFaced.map((o: any, i: number) => ({
                    id: o.id ?? `obj-${i}`,
                    trigger_phrase: typeof o.objection === 'string' ? o.objection : (o.objection?.objection ?? o.trigger_phrase ?? 'Objeção'),
                    coaching_tip: o.recommended_response ?? o.coaching_tip ?? '',
                    detected_at: o.detected_at,
                }))
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Não foi possível carregar o Raio X.';
            setSelectedCallError(msg);
            setSelectedCallDetail(null);
            setSelectedCallObjections([]);
        } finally {
            setSelectedCallLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (!selectedCall?.id) {
            setSelectedCallDetail(null);
            setSelectedCallObjections([]);
            setSelectedCallError(null);
            reprocessTriggeredForCallId.current = null;
            return;
        }
        fetchCallDetail(selectedCall.id);
    }, [selectedCall?.id, fetchCallDetail]);

    // Trigger reprocess once when COMPLETED and no summary (backend job also catches these)
    useEffect(() => {
        if (!selectedCall?.id || !selectedCallDetail) return;
        const needsReprocess = selectedCallDetail.status === 'COMPLETED' && !selectedCallDetail.summary;
        if (!needsReprocess || reprocessTriggeredForCallId.current === selectedCall.id) return;
        reprocessTriggeredForCallId.current = selectedCall.id;
        api.post(`/api/calls/${selectedCall.id}/reprocess-summary`, {}).catch(() => { });
    }, [selectedCall?.id, selectedCallDetail?.status, selectedCallDetail?.summary]);

    // Poll for summary when call is COMPLETED but summary not yet available (backend may still be generating)
    useEffect(() => {
        if (!selectedCall?.id || !selectedCallDetail) return;
        const isProcessing = selectedCallDetail.status === 'COMPLETED' && !selectedCallDetail.summary;
        if (!isProcessing) return;
        const POLL_INTERVAL_MS = 5000;
        const MAX_POLLS = 24; // ~2 minutes
        let pollCount = 0;
        const intervalId = setInterval(() => {
            pollCount += 1;
            if (pollCount > MAX_POLLS) return;
            fetchCallDetail(selectedCall.id);
        }, POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [selectedCall?.id, selectedCallDetail?.id, selectedCallDetail?.status, selectedCallDetail?.summary, fetchCallDetail]);

    const getDateRange = (filter: string): { from: string; to: string } | null => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (filter) {
            case 'today': return { from: todayStart.toISOString(), to: now.toISOString() };
            case '7d': return { from: new Date(now.getTime() - 7 * 86400000).toISOString(), to: now.toISOString() };
            case '30d': return { from: new Date(now.getTime() - 30 * 86400000).toISOString(), to: now.toISOString() };
            case '90d': return { from: new Date(now.getTime() - 90 * 86400000).toISOString(), to: now.toISOString() };
            default: return null;
        }
    };

    const fetchCalls = async (loadMore = false) => {
        if (!currentUserId) return;

        const fullSelect = `
            *,
            user:profiles!user_id(full_name, avatar_url),
            script:scripts!calls_script_relationship(name),
            coach:coaches(name),
            summary:call_summaries(lead_sentiment, result)
        `;

        const currentPage = loadMore ? page + 1 : 0;
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        try {
            let q = supabase
                .from('calls')
                .select(fullSelect)
                .neq('status', 'ACTIVE')
                .order('started_at', { ascending: false })
                .range(from, to);

            if (userRole === 'SELLER') {
                q = q.eq('user_id', currentUserId);
            } else {
                if (orgId) q = q.eq('organization_id', orgId);
                if (selectedSeller !== 'all') q = q.eq('user_id', selectedSeller);
            }

            const dateRange = getDateRange(dateFilter);
            if (dateRange) {
                q = q.gte('started_at', dateRange.from).lte('started_at', dateRange.to);
            }

            const { data, error } = await q;

            if (error) throw error;

            const mapped = (data as any[] || []).map((c: any) => ({
                ...c,
                user: c.user,
                summary: Array.isArray(c.summary) ? c.summary[0] : c.summary,
            }));

            setCallsLoadError(false);
            setCalls(loadMore ? [...calls, ...mapped] : mapped);
            setPage(currentPage);
            setHasMore(mapped.length === PAGE_SIZE);
        } catch (error) {
            console.error('Error fetching calls:', error);
            try {
                let q = supabase
                    .from('calls')
                    .select('*')
                    .neq('status', 'ACTIVE')
                    .order('started_at', { ascending: false })
                    .range(from, to);

                if (userRole === 'SELLER') {
                    q = q.eq('user_id', currentUserId);
                } else {
                    if (orgId) q = q.eq('organization_id', orgId);
                    if (selectedSeller !== 'all') q = q.eq('user_id', selectedSeller);
                }

                const dateRange = getDateRange(dateFilter);
                if (dateRange) {
                    q = q.gte('started_at', dateRange.from).lte('started_at', dateRange.to);
                }

                const { data: fallbackData, error: fallbackError } = await q;
                if (fallbackError) throw fallbackError;

                const mapped = (fallbackData as any[] || []).map((c: any) => ({
                    ...c,
                    user: c.user ?? undefined,
                    summary: c.summary,
                }));

                setCallsLoadError(false);
                setCalls(loadMore ? [...calls, ...mapped] : mapped);
                setPage(currentPage);
                setHasMore(mapped.length === PAGE_SIZE);
            } catch (finalError) {
                console.error('Final error fetching calls:', finalError);
                setCalls([]);
                setCallsLoadError(true);
            }
        }
    };

    const formatDuration = (startedAt: string, endedAt?: string) => {
        const start = new Date(startedAt).getTime();
        const end = endedAt ? new Date(endedAt).getTime() : Date.now();
        const diff = Math.floor((end - start) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!mounted) return null;

    return (
        <div className="space-y-6" suppressHydrationWarning={true}>
            <DashboardHeader title="Chamadas" />

            {callsLoadError && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    <strong>Não foi possível carregar as chamadas.</strong>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 px-1">
                <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                <select
                    value={dateFilter}
                    onChange={e => { setDateFilter(e.target.value); setPage(0); }}
                    className="bg-[#1e1e1e] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neon-pink/50 appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                >
                    <option value="all">Todas as datas</option>
                    <option value="today">Hoje</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 90 dias</option>
                </select>
                {userRole !== 'SELLER' && teamMembers.length > 0 && (
                    <select
                        value={selectedSeller}
                        onChange={e => { setSelectedSeller(e.target.value); setPage(0); }}
                        className="bg-[#1e1e1e] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neon-pink/50 appearance-none cursor-pointer w-full sm:w-auto sm:min-w-[200px]"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                    >
                        <option value="all">Todos os vendedores</option>
                        {teamMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.full_name || 'Sem nome'}</option>
                        ))}
                    </select>
                )}
                <span className="text-xs text-gray-500">{calls.length} chamada{calls.length !== 1 ? 's' : ''}{hasMore ? '+' : ''}</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 min-h-0 lg:min-h-[calc(100vh-12rem)]">
                {/* Calls List Sidebar */}
                <div
                    className="w-full lg:w-80 shrink-0 rounded-2xl sm:rounded-[24px] border flex flex-col overflow-hidden max-h-[50vh] lg:max-h-none lg:h-[490px]"
                    style={{ ...CARD_STYLE, borderColor: 'rgba(255,255,255,0.05)' }}
                >
                    <div className="p-3 sm:p-4 border-b border-white/10 shrink-0">
                        <h2 className="text-base sm:text-lg font-bold text-white">Chamadas ({calls.length})</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-dark min-h-0">
                        {calls.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 text-sm" suppressHydrationWarning={true}>
                                {callsLoadError ? 'Erro ao carregar.' : 'Nenhuma chamada encontrada'}
                            </div>
                        ) : (
                            calls.map((call) => (
                                <div
                                    key={call.id}
                                    className={`rounded-xl border p-4 cursor-pointer transition-colors ${selectedCall?.id === call.id ? 'ring-2 ring-neon-pink bg-neon-pink/10 border-neon-pink/50' : 'border-white/10 hover:bg-white/5 hover:border-neon-pink/30 bg-black/20'}`}
                                    onClick={() => {
                                        setSelectedCall(call);
                                        router.replace(`/calls?callId=${call.id}`, { scroll: false });
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedCall(call);
                                            router.replace(`/calls?callId=${call.id}`, { scroll: false });
                                        }
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
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
                                                <div className="font-medium text-white truncate">
                                                    {call.user?.full_name ?? 'Vendedor'}
                                                </div>
                                            </div>
                                        </div>
                                        {call.status === 'ACTIVE' ? (
                                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon-pink/20 text-neon-pink animate-pulse flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                AO VIVO
                                            </span>
                                        ) : (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${call.summary?.result === 'CONVERTED' ? 'text-neon-green bg-neon-green/20' : 'text-gray-500 bg-white/10'}`}>
                                                {formatDuration(call.started_at, call.ended_at)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center text-xs text-gray-500" suppressHydrationWarning={true}>
                                        <Clock className="w-3 h-3 mr-1 shrink-0" />
                                        <span suppressHydrationWarning={true}>
                                            {new Date(call.started_at).toLocaleTimeString()} - {new Date(call.started_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                </div>
                            ))
                        )}
                        {hasMore && calls.length > 0 && (
                            <button
                                onClick={() => fetchCalls(true)}
                                className="w-full py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Carregar mais...
                            </button>
                        )}
                    </div>
                </div>

                {/* Painel Raio X ao lado da lista */}
                <div className="relative flex-1 flex flex-col min-h-[280px] sm:min-h-[400px] rounded-2xl sm:rounded-[24px] border overflow-y-auto min-w-0 max-h-[75vh] scrollbar-dark" style={CARD_STYLE}>
                    {/* Expand button */}
                    {selectedCallDetail && (
                        <button
                            onClick={() => setIsRaioXExpanded(true)}
                            title="Expandir Raio X"
                            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    )}
                    <CallRaioXPanel
                        call={selectedCall ? selectedCallDetail : null}
                        objections={selectedCallObjections}
                        loading={selectedCall != null && selectedCallLoading}
                        error={selectedCallError}
                    />
                </div>

                {/* Expanded modal overlay */}
                {isRaioXExpanded && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
                        onClick={() => setIsRaioXExpanded(false)}
                    >
                        <div
                            className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border overflow-hidden flex flex-col shadow-2xl"
                            style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.1)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setIsRaioXExpanded(false)}
                                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="overflow-y-auto flex-1 scrollbar-dark">
                                <CallRaioXPanel
                                    call={selectedCall ? selectedCallDetail : null}
                                    objections={selectedCallObjections}
                                    loading={selectedCall != null && selectedCallLoading}
                                    error={selectedCallError}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
