import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../../infrastructure/supabase/client.js';
import { redis } from '../../infrastructure/cache/redis.js';
import { logger } from '../../shared/utils/logger.js';
import { WebSocket } from 'ws';

const WEBM_EBML = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
const MIN_INIT_SEGMENT_BYTES = 100;

function isValidWebMInit(chunkBuf: Buffer): boolean {
    return chunkBuf.length >= MIN_INIT_SEGMENT_BYTES
        && chunkBuf[0] === WEBM_EBML[0]
        && chunkBuf[1] === WEBM_EBML[1]
        && chunkBuf[2] === WEBM_EBML[2]
        && chunkBuf[3] === WEBM_EBML[3];
}

/** Encode media payload to binary frame: 1 byte (0x01=header, 0x00=data) + chunk bytes. Returns null if base64 decode fails. */
function encodeMediaChunkToBinary(payload: { chunk: string; isHeader?: boolean }): Buffer | null {
    try {
        const chunkBuf = Buffer.from(payload.chunk, 'base64');
        const flag = payload.isHeader ? 0x01 : 0x00;
        return Buffer.concat([Buffer.from([flag]), chunkBuf]);
    } catch {
        return null;
    }
}

/** Gestores inscritos por callId (broadcast direto quando Redis está em memory mode). */
const managerSocketsByCallId = new Map<string, Set<WebSocket>>();

// DEBUG LOGGING (uses structured logger instead of sync file I/O)
function debugLog(msg: string) {
    logger.debug(msg);
}

// AI Imports
import { CoachEngine } from '../ai/coach-engine.js';
import { OpenAIClient } from '../ai/openai-client.js';
import { PostCallAnalyzer } from '../ai/post-call-analyzer.js';
import { WhisperClient } from '../ai/whisper-client.js';
import { DeepgramRealtimeClient } from '../ai/deepgram-realtime-client.js';
import { SummaryAgent } from '../ai/summary-agent.js';
import { UsageTracker } from '../ai/usage-tracker.js';
import { env } from '../../shared/config/env.js';

// Billing/Plan Limits
import { checkCallHoursLimit, canUseManagerWhisper } from '../billing/plan-limits.js';

// Types
export interface CoachData {
    name: string;
    persona?: string;
    methodology?: string;
    tone: string;
    intervention_level: string;
    product_name?: string;
    product_description?: string;
    product_differentials?: string;
    product_pricing_info?: string;
    product_target_audience?: string;
    script_name?: string;
    script_steps?: any[];
    script_objections?: any[];
    script_content?: string;
}

export interface CallSession {
    callId: string;
    userId: string;
    scriptId: string;
    coachId?: string;
    coachData?: CoachData;
    transcript: TranscriptChunk[];
    currentStep: number;
    startedAt?: number;
    platform?: string;
    chunksSinceLastCoach: number;
    lastCoachingAt?: number;
    lastSummaryAt?: number;
    lastPersistedAt?: number;
    leadProfile?: any;
    lastCoaching?: string;
    startupTime?: number;
    lastTranscription?: string;
    lastLeadTranscription?: string;
    lastSellerTranscription?: string;
    leadName?: string;
    sellerName?: string;
    allParticipants?: string[];
    participantCount?: number;
    recentTranscriptions?: Array<{ text: string; role: string; timestamp: number }>;
    webmHeader?: Buffer[];
    sentQuestions?: string[];
    /** Buffered audio chunks for recording (lead=0, seller=1) */
    recordingChunks?: { lead: Buffer[]; seller: Buffer[] };
}

export interface TranscriptChunk {
    text: string;
    /** Display name (e.g. seller name, lead name) for identifying who is speaking */
    speaker: string;
    role?: 'seller' | 'lead';
    timestamp: number;
    isFinal?: boolean;
}

// Hallucination Patterns (Whisper known issues)
const HALLUCINATION_PATTERNS = [
    /legendas?\s+(pela|por)\s+comunidade/i,
    /amara\.org/i,
    /obrigad[oa]\s+por\s+assistir/i,
    /acesse\s+o\s+site/i,
    /rádio\s+onu/i,
    /www\.\w+\.org/i,
    /inscreva-se/i,
    /subscribe/i,
    /like\s+and\s+subscribe/i,
    /thanks?\s+for\s+watching/i,
    /subtitles?\s+by/i,
    /translated\s+by/i,
    /♪|♫|🎵/,                    // Notes
    /^\s*\.+\s*$/,               // Just dots
    /^\s*,+\s*$/,                // Just commas
    /^(tchau[,.\s]*)+$/i,        // Repeated 'tchau'
    /^(.{1,15}[,.\s]+)\1{2,}$/i, // Short repeated phrases
];

function isHallucination(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.replace(/[^a-zA-ZÀ-ú]/g, '').length < 5) return true; // Too short (User requested filter 5)
    for (const pattern of HALLUCINATION_PATTERNS) {
        if (pattern.test(trimmed)) return true;
    }
    return false;
}

const DEDUP_WINDOW_MS = 8000; // 8s (segmentos 3s + latência Whisper)
/** Janela curta para eco/leakage: só descartar se o outro canal falou há pouco (evita esconder fala legítima do vendedor). */
const LEAKAGE_ECHO_WINDOW_MS = 3500;

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:""'']/g, '')
        .replace(/\s+/g, ' ');
}

function textsAreSimilar(a: string, b: string): boolean {
    const normA = normalizeText(a);
    const normB = normalizeText(b);
    if (normA === normB) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;
    const wordsA = new Set(normA.split(' ').filter((w) => w.length > 1));
    const wordsB = new Set(normB.split(' ').filter((w) => w.length > 1));
    if (wordsA.size === 0 || wordsB.size === 0) return false;
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return intersection / union > 0.5;
}

/** Similaridade forte: quase idêntico ou um contém o outro (para eco/leakage sem descartar fala do vendedor). */
function textsAreStronglySimilar(a: string, b: string): boolean {
    const normA = normalizeText(a);
    const normB = normalizeText(b);
    if (normA === normB) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;
    const wordsA = normA.split(' ').filter((w) => w.length > 1);
    const wordsB = normB.split(' ').filter((w) => w.length > 1);
    if (wordsA.length === 0 || wordsB.length === 0) return false;
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    const intersection = wordsA.filter((w) => setB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 && intersection / union >= 0.85;
}

/** Lead tem prioridade: duplicatas do mesmo canal descartam; eco/leakage só se texto muito parecido e canal oposto falou há pouco. */
function shouldDiscard(
    text: string,
    role: string,
    session: CallSession | null
): boolean {
    if (!session) return false;
    const recent = session.recentTranscriptions ?? [];
    const now = Date.now();

    session.recentTranscriptions = recent.filter(
        (t) => now - t.timestamp < DEDUP_WINDOW_MS
    );

    for (const r of session.recentTranscriptions) {
        const sameRole = r.role === role;
        const otherRoleRecent = (now - r.timestamp) <= LEAKAGE_ECHO_WINDOW_MS;

        // SAME ROLE DUPLICATION (Whisper/Deepgram transcrevendo o mesmo áudio várias vezes)
        if (sameRole && textsAreSimilar(text, r.text)) {
            logger.info(
                `🔇 Duplicate filtered [${role}]: "${text.slice(0, 50)}..." (same text from same role)`
            );
            return true;
        }

        // CROSS-CHANNEL ECHO/LEAKAGE: só descartar se for MUITO parecido e o outro canal falou há poucos segundos
        if (sameRole || !otherRoleRecent) continue;
        if (!textsAreStronglySimilar(text, r.text)) continue;

        // Case 1: Seller (mic) = leakage (voz do cliente no microfone)
        if (role === 'seller') {
            logger.info(
                `🔇 Leakage filtered [seller]: "${text.slice(0, 50)}..." (matches lead, recent)`
            );
            return true;
        }

        // Case 2: Lead (tab) = echo (voz do vendedor na aba)
        if (role === 'lead') {
            logger.info(`🔇 Echo filtered [lead]: "${text.slice(0, 50)}..." (matches seller, recent)`);
            return true;
        }
    }

    session.recentTranscriptions.push({
        text,
        role: role as 'lead' | 'seller',
        timestamp: now,
    });
    return false;
}

// Initialize Services (Singleton pattern to avoid memory leaks)
const openaiClient = new OpenAIClient();
const coachEngine = new CoachEngine(openaiClient);
const postCallAnalyzer = new PostCallAnalyzer(openaiClient);
const whisperClient = new WhisperClient();
const summaryAgent = new SummaryAgent(openaiClient);
const useDeepgram = env.TRANSCRIPTION_PROVIDER === 'deepgram';
logger.info(`🎤 Transcription provider: ${env.TRANSCRIPTION_PROVIDER} (useDeepgram=${useDeepgram})`);

export async function websocketRoutes(fastify: FastifyInstance) {
    fastify.get('/ws/call', { websocket: true }, async (socket, req) => {
        logger.info('🔌 New WebSocket connection attempt');

        // Support both query-param token (legacy) and auth-challenge (new)
        const queryToken = (req.query as any).token;

        let user: { id: string } | null = null;
        let orgId: string | null = null;
        let authenticated = false;

        async function authenticateWithToken(token: string): Promise<boolean> {
            const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !authUser) {
                return false;
            }
            user = authUser;

            const { data: profileRow } = await supabaseAdmin
                .from('profiles')
                .select('organization_id')
                .eq('id', authUser.id)
                .single();
            const userOrgId = (profileRow as { organization_id: string | null } | null)?.organization_id;
            if (userOrgId) {
                const { data: orgRow } = await supabaseAdmin
                    .from('organizations')
                    .select('plan')
                    .eq('id', userOrgId)
                    .single();
                const plan = (orgRow as { plan?: string } | null)?.plan ?? 'FREE';
                if (plan === 'FREE') {
                    logger.warn(`🚫 User ${authUser.id} rejected: FREE plan`);
                    socket.send(JSON.stringify({ type: 'auth:error', payload: { reason: 'Active plan required' } }));
                    socket.close(4403, 'Active plan required');
                    return false;
                }
            } else {
                logger.warn(`🚫 User ${authUser.id} rejected: no organization`);
                socket.send(JSON.stringify({ type: 'auth:error', payload: { reason: 'Active plan required' } }));
                socket.close(4403, 'Active plan required');
                return false;
            }
            orgId = userOrgId;
            authenticated = true;
            logger.info(`✅ User authenticated: ${authUser.id}`);
            socket.send(JSON.stringify({ type: 'auth:ok' }));
            return true;
        }

        // If token provided via query param (legacy), authenticate immediately
        if (queryToken) {
            const ok = await authenticateWithToken(queryToken);
            if (!ok && !user) {
                socket.close(1008, 'Invalid token');
                return;
            }
            if (!ok) return;
        } else {
            // Auth challenge mode: wait for first message with type "auth"
            const authTimeout = setTimeout(() => {
                if (!authenticated) {
                    logger.warn('⏰ Auth timeout: no auth message received within 5s');
                    socket.close(1008, 'Auth timeout');
                }
            }, 5000);

            // Wait for auth message before proceeding
            await new Promise<void>((resolve) => {
                const authHandler = async (raw: string | Buffer) => {
                    try {
                        const msg = JSON.parse(raw.toString());
                        if (msg.type === 'auth' && msg.payload?.token) {
                            clearTimeout(authTimeout);
                            socket.off('message', authHandler);
                            const ok = await authenticateWithToken(msg.payload.token);
                            if (!ok && !user) {
                                socket.close(1008, 'Invalid token');
                            }
                            resolve();
                        }
                    } catch {
                        // Ignore non-JSON or non-auth messages during auth phase
                    }
                };
                socket.on('message', authHandler);
            });

            if (!authenticated) return;
        }

        // At this point user is guaranteed non-null (auth succeeded)
        const authenticatedUser = user!;
        let callId: string | null = null;
        let sessionData: CallSession | null = null;
        let bufferedLeadName: string | null = null; // Buffer leadName if it arrives before session
        let bufferedSellerName: string | null = null; // Buffer sellerName (selfName) if it arrives before session
        let audioBuffer: Buffer[] = [];
        let transcriptionTimer: NodeJS.Timeout | null = null;
        let commandHandler: ((message: any) => void) | null = null; // For manager whispers
        let pendingTranscriptions = 0;
        let isAlive = true;
        let callEnded = false;
        let dgLeadClient: DeepgramRealtimeClient | null = null;
        let dgSellerClient: DeepgramRealtimeClient | null = null;
        let callPlatform: string = 'extension'; // 'web' = getDisplayMedia (stereo), 'extension' = chrome.tabCapture (mono)

        // HEARTBEAT
        const pingInterval = setInterval(() => {
            if (!isAlive) {
                logger.warn(`💓 Client inactive, terminating connection for user ${authenticatedUser.id}`);
                socket.terminate();
                return;
            }
            isAlive = false;
            if (socket.readyState === WebSocket.OPEN) {
                socket.ping();
            }
        }, 30000);

        socket.on('pong', () => {
            isAlive = true;
            // debugLog(`[PONG] Heartbeat received from ${user.id}`);
        });

        socket.on('message', async (message: string) => {
            try {
                const msgString = message.toString();
                // console.log('👀 RAW SOCKET MESSAGE SERVER-SIDE:', msgString.substring(0, 100));

                if (!msgString.includes('media:stream') && !msgString.includes('audio:segment')) {
                    logger.info(`RAW MSG RECEIVED: ${msgString.slice(0, 500)}`);
                }
                const event = JSON.parse(msgString);

                // IGNORE media:stream logs to avoid noise, but log everything else
                if (event.type !== 'media:stream' && event.type !== 'audio:segment') {
                    logger.info(`📨 WS EVENT RECEIVED: ${event.type}`);
                }

                if (!callId && event.type !== 'call:start') {
                    if (event.type === 'media:stream') {
                        // Silent ignore or debug log
                        // logger.debug('⚠️ media:stream received before call:start (Ignored)');
                    } else {
                        // logger.warn(`⚠️ Received ${event.type} before call:start (callId is null)`);
                    }
                }

                switch (event.type) {
                    case 'call:start':
                        logger.info({ payload: event.payload }, '🚀 Processing call:start payload');
                        await handleCallStart(event, authenticatedUser.id, socket);
                        break;
                    case 'audio:chunk':
                        // Legacy handler - kept for compatibility
                        await handleAudioChunk(event, socket);
                        break;
                    case 'audio:segment':
                        // New handler - complete WebM segment
                        await handleAudioSegment(event, socket);
                        break;
                    case 'transcript:chunk':
                        await handleTranscript(event, callId, socket);
                        break;
                    case 'call:participants':
                        await handleCallParticipants(event, callId, sessionData);
                        break;
                    case 'call:end':
                        await handleCallEnd(callId, authenticatedUser.id, socket, event.payload);
                        break;
                    case 'media:stream': {
                        // [LIVE_DEBUG] Log every N chunks to avoid spam; always log header
                        const hasChunk = !!event.payload?.chunk;
                        const isHeader = !!event.payload?.isHeader;
                        if (!callId) {
                            logger.warn('[LIVE_DEBUG] media:stream received but callId is null (call:start not sent yet?)');
                        } else if (!hasChunk) {
                            logger.warn('[LIVE_DEBUG] media:stream received but payload.chunk is missing');
                        } else if (isHeader) {
                            const managerCount = managerSocketsByCallId.get(callId)?.size ?? 0;
                            logger.info(`[LIVE_DEBUG] media:stream HEADER callId=${callId} managerSockets=${managerCount}`);
                        }

                        // Relay video + audio chunks to managers via Redis pub/sub + direct broadcast
                        if (callId && event.payload?.chunk) {
                            const payload = {
                                chunk: event.payload.chunk,
                                size: event.payload.size,
                                timestamp: event.payload.timestamp,
                                isHeader: !!event.payload.isHeader
                            };

                            if (event.payload.isHeader) {
                                await redis.set(
                                    `call:${callId}:media_header`,
                                    payload,
                                    14400
                                );
                                logger.info(`📼 Video Header cached for call ${callId}`);
                            }

                            await redis.publish(`call:${callId}:media_raw`, payload);

                            const managerSockets = managerSocketsByCallId.get(callId);
                            if (managerSockets) {
                                const binaryMsg = encodeMediaChunkToBinary(payload);
                                if (binaryMsg) {
                                    let sent = 0;
                                    managerSockets.forEach((s) => {
                                        if (s.readyState === WebSocket.OPEN) {
                                            s.send(binaryMsg);
                                            sent++;
                                        }
                                    });
                                    if (isHeader) {
                                        logger.info(`[LIVE_DEBUG] media:stream broadcast to ${sent} manager(s) for callId=${callId}`);
                                    }
                                }
                            } else if (isHeader) {
                                logger.warn(`[LIVE_DEBUG] media:stream no manager sockets for callId=${callId} (gestor ainda não fez manager:join?)`);
                            }
                        }
                        break;
                    }
                }
            } catch (err: any) {
                logger.error({
                    message: err?.message,
                    name: err?.name,
                    stack: err?.stack,
                    code: err?.code
                }, '❌ Error handling message');
            }
        });


        socket.on('close', async (code, reason) => {
            clearInterval(pingInterval);
            closeDeepgramClients();
            logger.info({ code, reason: reason?.toString(), callId }, '🔌 WS Disconnected');

            // Cleanup command subscription
            if (callId && commandHandler) {
                await redis.unsubscribe(`call:${callId}:commands`, commandHandler);
                commandHandler = null;
            }

            // Skip auto-finalization if call:end already handled it
            if (callEnded) return;

            // Finalize call if not explicitly ended (refresh, troca de conta, crash)
            let finalCallId = callId;
            let finalSession = sessionData;
            if (!finalCallId) {
                const fromRedis = await redis.get<string>(`user:${authenticatedUser.id}:current_call`);
                if (fromRedis) {
                    finalCallId = fromRedis;
                    finalSession = await redis.get<CallSession>(`call:${finalCallId}:session`) ?? null;
                    logger.info(`🔗 Recovered callId from Redis for user ${authenticatedUser.id}: ${finalCallId}`);
                }
            }
            if (finalCallId && finalSession) {
                try {
                    const { data: callRow } = await supabaseAdmin
                        .from('calls')
                        .select('status')
                        .eq('id', finalCallId)
                        .single();

                    if (callRow && (callRow as any).status === 'ACTIVE') {
                        const endedAt = new Date();
                        let durationSeconds: number | undefined;
                        if (finalSession.startedAt) {
                            durationSeconds = Math.round((endedAt.getTime() - finalSession.startedAt) / 1000);
                        }
                        const { error: discErr } = await supabaseAdmin.from('calls').update({
                            status: 'COMPLETED',
                            ended_at: endedAt.toISOString(),
                            duration_seconds: durationSeconds ?? null,
                            transcript: finalSession.transcript ?? [],
                        }).eq('id', finalCallId);
                        if (discErr) {
                            logger.error({ err: discErr, callId: finalCallId }, '❌ Failed to auto-finalize call on disconnect');
                        } else {
                            logger.info(`🔒 Auto-finalized call ${finalCallId} on disconnect (${durationSeconds}s)`);
                        }
                        await redis.del(`call:${finalCallId}:session`);
                        await redis.del(`user:${authenticatedUser.id}:current_call`);
                    }
                } catch (e: any) {
                    logger.error({ message: e?.message }, '❌ Failed to auto-finalize call on disconnect');
                }
            }
        });

        socket.on('error', (err) => {
            logger.error({ err, callId }, '🔌 WS Error');
        });

        // Helper to setup command subscription
        const setupCommandSubscription = async (targetCallId: string, socket: WebSocket) => {
            // Cleanup previous if any
            if (commandHandler) {
                await redis.unsubscribe(`call:${callId}:commands`, commandHandler);
            }

            commandHandler = (command: any) => {
                if (command.type === 'whisper') {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'coach:whisper',
                            payload: {
                                source: 'manager',
                                content: command.content,
                                urgency: command.urgency,
                                timestamp: command.timestamp
                            }
                        }));
                    }
                }
            };
            await redis.subscribe(`call:${targetCallId}:commands`, commandHandler);
        };

        // --- Handlers ---

        async function handleCallStart(event: any, userId: string, ws: WebSocket) {
            debugLog(`[START] handleCallStart Payload: ${JSON.stringify(event.payload)}`);
            logger.info({ payload: event.payload }, '📞 handleCallStart initiated');

            try {
                const { scriptId, platform, leadName, coachId: payloadCoachId } = event.payload;
                callPlatform = platform || 'extension';
                logger.info(`📱 Call platform: ${callPlatform} (channels=${callPlatform === 'web' ? 2 : 1})`);
                const externalIdRaw = event.payload?.externalId ?? event.payload?.external_id;
                const externalId = typeof externalIdRaw === 'string' ? externalIdRaw.trim() || null : null;

                // Fetch coach data if coachId provided
                let coachData: CoachData | undefined;
                if (payloadCoachId) {
                    const { data: coach } = await supabaseAdmin
                        .from('coaches')
                        .select('name, persona, methodology, tone, intervention_level, product_name, product_description, product_differentials, product_pricing_info, product_target_audience, script_name, script_steps, script_objections, script_content')
                        .eq('id', payloadCoachId)
                        .maybeSingle();
                    if (coach) {
                        coachData = coach as CoachData;
                    }
                }
                logger.info({ externalIdReceived: externalId, payloadKeys: Object.keys(event.payload || {}) }, '📞 call:start payload (externalId for re-record)');

                // Get current user org first (needed for reactivation so call stays in correct org)
                const { data: profile, error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', userId)
                    .single();

                if (profileError || !profile) {
                    debugLog(`[ERROR] Profile not found: ${JSON.stringify(profileError)}`);
                    logger.error({ profileError, userId }, '❌ Profile not found or error');
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'USER_PROFILE_NOT_FOUND' } }));
                    return;
                }

                const NULL_ORG_UUID = '00000000-0000-0000-0000-000000000000';
                const rawOrgId = profile.organization_id;
                const orgId = rawOrgId && rawOrgId !== NULL_ORG_UUID ? rawOrgId : null;
                const safeOrgId = orgId === NULL_ORG_UUID ? null : (orgId ?? null);

                // Check plan limits before starting call
                const usageCheck = await checkCallHoursLimit(safeOrgId);
                if (!usageCheck.allowed) {
                    logger.warn({
                        userId,
                        organizationId: safeOrgId,
                        reason: usageCheck.reason,
                        plan: usageCheck.plan,
                        currentUsage: usageCheck.currentUsage,
                        maxAllowed: usageCheck.maxAllowed,
                    }, '🚫 Call blocked due to plan limits');

                    const errorMessage = usageCheck.reason === 'LIMIT_REACHED'
                        ? `CALL_HOURS_LIMIT_REACHED: Você atingiu o limite de ${usageCheck.maxAllowed}h de calls do seu plano ${usageCheck.plan}. Faça upgrade para continuar.`
                        : `NO_ACTIVE_PLAN: Você precisa de um plano ativo para iniciar chamadas. Acesse /billing para assinar.`;

                    ws.send(JSON.stringify({
                        type: 'error',
                        payload: {
                            code: usageCheck.reason,
                            message: errorMessage,
                            plan: usageCheck.plan,
                            currentUsage: usageCheck.currentUsage,
                            maxAllowed: usageCheck.maxAllowed,
                        }
                    }));
                    return;
                }

                logger.info({
                    userId,
                    plan: usageCheck.plan,
                    currentUsage: usageCheck.currentUsage,
                    remainingHours: usageCheck.remainingHours,
                }, '✅ Plan limits check passed');

                // 0. Check if call already exists for this connection (Idempotency / Re-record same call)
                if (callId) {
                    const { data: existingCallById, error: fetchErr } = await supabaseAdmin
                        .from('calls')
                        .select('id, status, script_id, transcript')
                        .eq('id', callId)
                        .maybeSingle();

                    if (fetchErr) {
                        logger.warn({ err: fetchErr, callId }, '⚠️ Failed to fetch call by id (re-record path)');
                    }
                    const isCompleted = existingCallById?.status === 'COMPLETED';
                    logger.info({ callId, status: existingCallById?.status, isCompleted }, '📞 call:start same-connection check');

                    if (isCompleted) {
                        logger.info(`🔄 Re-activating COMPLETED call ${callId} for same connection (re-record).`);
                        const updatePayload: { status: string; ended_at: null; organization_id: string | null } = { status: 'ACTIVE', ended_at: null, organization_id: safeOrgId };
                        const { error: updateErr } = await supabaseAdmin.from('calls')
                            .update(updatePayload)
                            .eq('id', callId);
                        if (updateErr) {
                            logger.error({ err: updateErr, callId }, '❌ Failed to reactivate call (same-connection)');
                        } else {
                            logger.info(`✅ Call ${callId} reactivated to ACTIVE`);
                        }
                        const dbTranscript = Array.isArray(existingCallById?.transcript) ? existingCallById.transcript : [];
                        if (sessionData) {
                            sessionData.startedAt = Date.now();
                        } else {
                            sessionData = {
                                callId: callId ?? '',
                                userId: userId ?? '',
                                scriptId: (existingCallById?.script_id ?? scriptId ?? null) as string,
                                transcript: dbTranscript,
                                currentStep: 0,
                                chunksSinceLastCoach: 0,
                                sentQuestions: [],
                                startedAt: Date.now(),
                                startupTime: Date.now(),
                                leadName: leadName || 'Cliente'
                            };
                        }
                        await redis.set(`call:${callId}:session`, sessionData, 3600);
                        await redis.set(`user:${userId}:current_call`, callId, 14400);
                        if (callId) await setupCommandSubscription(callId, ws);
                        if (useDeepgram) await initDeepgramClients(ws);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'call:started', payload: { callId: callId } }));
                        }
                        return;
                    }

                    logger.warn(`⚠️ Call already initialized for this connection. ID: ${callId}. Re-sending call:started.`);
                    // Reinitialize Deepgram if clients were closed (silence watcher, error, etc.)
                    if (useDeepgram && (!dgLeadClient || !dgSellerClient)) {
                        logger.info(`🔄 Deepgram clients missing for active call ${callId}, reinitializing...`);
                        await initDeepgramClients(ws);
                    }
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'call:started', payload: { callId: callId } }));
                    }
                    return;
                }

                // 1.1. Check for external_id match (Meet ID Reuse) — main path when extension reconnects each time
                logger.info({ externalId, userId }, '📞 call:start external_id check');
                if (externalId) {
                    const { data: existingExternalCall, error: extFetchErr } = await supabaseAdmin
                        .from('calls')
                        .select('id, script_id, platform, transcript, started_at, status')
                        .eq('user_id', userId)
                        .eq('external_id', externalId)
                        .order('started_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (extFetchErr) {
                        logger.warn({ err: extFetchErr, externalId, userId }, '⚠️ Failed to fetch call by external_id');
                    }
                    if (!existingExternalCall && externalId) {
                        logger.warn({ userId, externalId }, '📞 No existing call for user+external_id — will create new call');
                    }
                    if (existingExternalCall) {
                        logger.info(`🔗 Found existing call by External ID (${externalId}): ${existingExternalCall.id} status=${existingExternalCall.status}`);

                        // Reactivate and set org (overwrite with safeOrgId so wrong org is cleared)
                        const updatePayload: { status: string; ended_at: null; organization_id: string | null } = { status: 'ACTIVE', ended_at: null, organization_id: safeOrgId };
                        const { error: extUpdateErr } = await supabaseAdmin.from('calls')
                            .update(updatePayload)
                            .eq('id', existingExternalCall.id);
                        if (extUpdateErr) {
                            logger.error({ err: extUpdateErr, callId: existingExternalCall.id }, '❌ Failed to reactivate call (external_id path)');
                        } else {
                            logger.info(`✅ Call ${existingExternalCall.id} reactivated to ACTIVE (external_id=${externalId})`);
                        }

                        callId = existingExternalCall.id;
                        await redis.set(`user:${userId}:current_call`, callId, 14400);

                        // Reconstruct Session Data
                        // Try Redis first
                        let currentSession = await redis.get<CallSession>(`call:${callId}:session`);
                        if (!currentSession) {
                            // Reconstruct from DB
                            logger.info(`♻️ Reconstructing session from DB for call ${callId}`);
                            const dbTranscript = existingExternalCall.transcript || [];

                            sessionData = {
                                callId: callId ?? '',
                                userId: userId ?? '',
                                scriptId: (existingExternalCall.script_id ?? scriptId ?? null) as string,
                                transcript: Array.isArray(dbTranscript) ? dbTranscript : [],
                                currentStep: 0,
                                chunksSinceLastCoach: 0,
                                sentQuestions: [],
                                startupTime: Date.now(),
                                leadName: leadName || 'Cliente'
                            };
                            await redis.set(`call:${callId}:session`, sessionData, 3600);
                        } else {
                            sessionData = currentSession;
                        }

                        // Subscribe to commands
                        if (callId) await setupCommandSubscription(callId, ws);
                        if (useDeepgram) await initDeepgramClients(ws);

                        // Confirm
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'call:started', payload: { callId: callId } }));
                        }
                        return;
                    }
                }

                // 1.5. Check for EXISTING ACTIVE CALL (Resume Logic - Fallback if no externalId)
                // Look for a call started in the last hour that is still ACTIVE
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const { data: existingCall } = await supabaseAdmin
                    .from('calls')
                    .select('id, script_id, platform, started_at')
                    .eq('user_id', userId)
                    .eq('status', 'ACTIVE')
                    .gte('started_at', oneHourAgo)
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingCall) {
                    logger.info(`🔄 Found existing ACTIVE call: ${existingCall.id}. Attempting to resume...`);

                    // Check if session data exists in Redis
                    const existingSession = await redis.get<CallSession>(`call:${existingCall.id}:session`);

                    if (existingSession) {
                        logger.info(`✅ Resumed session for call ${existingCall.id}`);
                        callId = existingCall.id;
                        sessionData = existingSession;
                        await redis.set(`user:${userId}:current_call`, callId, 14400);
                        logger.info(`[LIVE_DEBUG] call:start (resume) done callId=${callId}`);

                        // Check if we have a lead name to apply (Payload > Buffered > Redis)
                        const resumeLeadName = leadName || bufferedLeadName;

                        if (resumeLeadName) {
                            sessionData.leadName = resumeLeadName;
                            logger.info(`👤 Applied lead name to resumed session: ${resumeLeadName}`);
                            await redis.set(`call:${callId}:session`, sessionData, 3600);
                        } else if (!sessionData.leadName) {
                            // Try to see if it was saved in Redis while we were processing
                            const refreshedSession = await redis.get<CallSession>(`call:${callId}:session`);
                            if (refreshedSession?.leadName) {
                                sessionData.leadName = refreshedSession.leadName;
                                logger.info(`👤 Recovered lead name from Redis race condition: ${sessionData.leadName}`);
                            }
                        }

                        // Re-subscribe to commands
                        if (callId) await setupCommandSubscription(callId, ws);
                        if (useDeepgram) await initDeepgramClients(ws);

                        // Confirm to client
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'call:started', payload: { callId: callId } }));
                        }
                        return; // EXIT HERE - RESUME COMPLETE
                    } else {
                        logger.warn(`⚠️ Active call found (${existingCall.id}) but Redis session missing. Closing it and starting new.`);
                        // Close the stale call
                        await supabaseAdmin.from('calls').update({
                            status: 'COMPLETED',
                            ended_at: new Date().toISOString()
                        }).eq('id', existingCall.id);
                    }
                }

                // 2. Resolve Script ID (New Call)
                let finalScriptId = scriptId;
                if (orgId && !scriptId) {
                    const { data: defaultScript } = await supabaseAdmin
                        .from('scripts')
                        .select('id')
                        .eq('organization_id', orgId)
                        .limit(1)
                        .maybeSingle();

                    if (defaultScript) {
                        finalScriptId = defaultScript.id;
                    }
                }

                // 3. Insert Call into DB (omit organization_id when invalid so DB stores NULL)
                const insertPayload = {
                    user_id: userId,
                    script_id: finalScriptId,
                    platform: platform || 'OTHER',
                    status: 'ACTIVE',
                    started_at: new Date().toISOString(),
                    external_id: externalId,
                    ...(safeOrgId != null && safeOrgId !== '' && { organization_id: safeOrgId }),
                    ...(payloadCoachId && { coach_id: payloadCoachId })
                };
                logger.info({ rawOrgId, safeOrgId, userId, hasOrgInPayload: 'organization_id' in insertPayload }, '📞 call:insert payload org');
                const { data: call, error: insertError } = await supabaseAdmin
                    .from('calls')
                    .insert(insertPayload)
                    .select()
                    .single();

                if (insertError) {
                    logger.error({ insertError, finalScriptId }, '❌ DB INSERT FAILED: calls table');
                    ws.send(JSON.stringify({
                        type: 'error',
                        payload: {
                            message: 'DB_INSERT_FAILED',
                            details: insertError.message,
                            code: insertError.code
                        }
                    }));
                    return;
                }

                callId = call.id ?? '';
                logger.info(`✅ Call created in DB. ID: ${callId}`);
                logger.info(`[LIVE_DEBUG] call:start done callId=${callId} (seller can now send media:stream)`);

                // 4. Initialize Session (seller name from profile as fallback until call:participants sends selfName)
                const { data: sellerProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('full_name')
                    .eq('id', userId)
                    .single();
                const sellerNameFromProfile = (sellerProfile as { full_name?: string } | null)?.full_name?.trim() || undefined;

                sessionData = {
                    callId: call.id ?? '',
                    userId: userId ?? '',
                    scriptId: finalScriptId ?? '',
                    coachId: payloadCoachId || undefined,
                    coachData: coachData || undefined,
                    platform: platform ?? undefined,
                    startedAt: new Date().getTime(),
                    transcript: [],
                    currentStep: 1,
                    chunksSinceLastCoach: 0,
                    sentQuestions: [],
                    lastCoachingAt: 0,
                    lastSummaryAt: 0,
                    leadName: leadName || bufferedLeadName || undefined,
                    sellerName: bufferedSellerName || sellerNameFromProfile
                };

                // 5. Cache Session + current call by user (para finalizar ao desconectar mesmo se closure perder callId)
                await redis.set(`call:${callId}:session`, sessionData, 3600);
                await redis.set(`user:${userId}:current_call`, callId, 14400);

                // 6. Subscribe to Manager Commands
                commandHandler = (command: any) => {
                    if (command.type === 'whisper') {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'coach:whisper',
                                payload: {
                                    source: 'manager',
                                    content: command.content,
                                    urgency: command.urgency,
                                    timestamp: command.timestamp
                                }
                            }));
                            logger.info(`💬 Forwarded manager whisper to seller`);
                        }
                    }
                };
                await redis.subscribe(`call:${callId}:commands`, commandHandler);

                if (useDeepgram) await initDeepgramClients(ws);

                // 7. Confirm to Client
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'call:started', payload: { callId: callId } }));
                }

            } catch (err: any) {
                logger.error({ err }, '🔥 CRITICAL ERROR in handleCallStart');
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'INTERNAL_ERROR' } }));
                }
            }
        }

        async function handleTranscript(event: any, currentCallId: string | null, ws: WebSocket) {
            if (!currentCallId || !sessionData) {
                // Try reload from redis if local var missing (reconnection scenario)
                if (currentCallId) {
                    sessionData = await redis.get(`call:${currentCallId}:session`);
                }
                if (!sessionData) return;
            }

            const chunk: TranscriptChunk = event.payload;

            // 1. Update Session
            sessionData.transcript.push(chunk);

            // 2. Persist State
            await redis.set(`call:${currentCallId}:session`, sessionData, 3600 * 4);
        }

        async function handleCallEnd(
            currentCallId: string | null,
            userId: string,
            ws: WebSocket,
            payload?: { callId?: string; result?: string; videoRecordingUrl?: string }
        ) {
            // Prevent duplicate executions (extension may send call:end multiple times + disconnect handler)
            if (callEnded) {
                logger.info('⚠️ handleCallEnd already executed for this connection, skipping duplicate');
                return;
            }
            callEnded = true;
            const callEndReceivedAt = new Date(); // Capture end time NOW, before any async processing
            let resolvedCallId = currentCallId ?? (payload?.callId && payload.callId.trim() ? payload.callId.trim() : null);
            if (!resolvedCallId && userId) {
                const fromRedis = await redis.get<string>(`user:${userId}:current_call`);
                if (fromRedis) {
                    resolvedCallId = fromRedis;
                    logger.info(`🔗 Recovered callId from Redis for call:end (user ${userId}): ${resolvedCallId}`);
                }
            }
            if (!resolvedCallId) {
                logger.warn('call:end ignored: no callId (connection, payload, or Redis)');
                return;
            }
            const sellerResultFromPayload = payload?.result && ['CONVERTED', 'LOST', 'FOLLOW_UP', 'UNKNOWN'].includes(payload.result)
                ? payload.result
                : null;
            let resolvedSession = sessionData;
            if (!resolvedSession) {
                resolvedSession = await redis.get<CallSession>(`call:${resolvedCallId}:session`) ?? null;
                if (resolvedSession) {
                    logger.info(`🔗 Recovered session from Redis for call:end: ${resolvedCallId}`);
                }
            }
            if (!resolvedSession) {
                logger.warn(`call:end: no session for call ${resolvedCallId}, marking COMPLETED and saving result only`);
                const endedAt = new Date();
                await supabaseAdmin.from('calls').update({
                    status: 'COMPLETED',
                    ended_at: endedAt.toISOString(),
                }).eq('id', resolvedCallId);
                if (sellerResultFromPayload) {
                    await supabaseAdmin.from('call_summaries').upsert(
                        { call_id: resolvedCallId, result: sellerResultFromPayload },
                        { onConflict: 'call_id' }
                    );
                }
                await redis.del(`call:${resolvedCallId}:session`);
                await redis.del(`user:${userId}:current_call`);
                return;
            }

            const currentCallIdForRest = resolvedCallId;
            sessionData = resolvedSession;
            const sellerResult = sellerResultFromPayload ?? undefined;

            // Flush remaining Deepgram audio and close streams
            if (dgLeadClient) dgLeadClient.close();
            if (dgSellerClient) dgSellerClient.close();

            // Wait for pending transcriptions to finish (race condition fix)
            if (pendingTranscriptions > 0) {
                logger.info(`⏳ Waiting for ${pendingTranscriptions} pending transcriptions to finish before Raio X...`);
                let waitMs = 0;
                while (pendingTranscriptions > 0 && waitMs < 15000) {
                    await new Promise(r => setTimeout(r, 500));
                    waitMs += 500;
                }
                if (pendingTranscriptions > 0) {
                    logger.warn(`⚠️ Timeout waiting for transcriptions. Proceeding with pending=${pendingTranscriptions}`);
                } else {
                    logger.info(`✅ All transcriptions finished. Proceeding with Raio X.`);
                }
                // Re-fetch session data from Redis to ensure we have the absolute latest transcript edits
                const refreshedSession = await redis.get<CallSession>(`call:${resolvedCallId}:session`);
                if (refreshedSession) {
                    sessionData = refreshedSession;
                }
            }

            // 1. Fetch script details for analysis
            const { data: scriptData } = await supabaseAdmin
                .from('scripts')
                .select('name, id')
                .eq('id', sessionData.scriptId)
                .single();

            const scriptName = scriptData?.name || "Standard Script";

            // Fetch objections for this script (needed for correlation)
            const { data: objections } = await supabaseAdmin
                .from('objections')
                .select('id, trigger_phrases, suggested_response, mental_trigger, coaching_tip')
                .eq('script_id', sessionData.scriptId);

            // 2. Generate Summary (AI may fail, timeout or return null; we still save seller result)
            const POST_CALL_ANALYSIS_TIMEOUT_MS = 90_000;
            let summary: any = null;
            try {
                summary = await Promise.race([
                    postCallAnalyzer.generate(sessionData, scriptName, ["Intro", "Discovery", "Close"], resolvedCallId, sessionData.coachData),
                    new Promise<null>((_, reject) =>
                        setTimeout(() => reject(new Error('Post-call analysis timeout')), POST_CALL_ANALYSIS_TIMEOUT_MS)
                    ),
                ]);
            } catch (err: any) {
                logger.warn({ err: err?.message }, '⚠️ Post-call summary generation failed; saving seller result only');
            }

            // Prefer seller-reported result for call_summaries.result
            const resultForDb = sellerResult ?? summary?.result ?? null;

            // 4. Send Summary to Client
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'call:summary',
                    payload: summary ? { ...summary, result: resultForDb ?? summary.result } : { result: resultForDb }
                }));
            }

            // 5. Update DB — compute duration_seconds (use callEndReceivedAt, not now())
            const endedAt = callEndReceivedAt;
            let durationSeconds: number | undefined;
            if (sessionData.startedAt) {
                durationSeconds = Math.round((endedAt.getTime() - sessionData.startedAt) / 1000);
            }

            // 5.1 Upload call recordings to Supabase Storage
            let recordingUrlLead: string | null = null;
            let recordingUrlSeller: string | null = null;
            if (sessionData.recordingChunks) {
                const uploadRecording = async (role: 'lead' | 'seller', chunks: Buffer[], header?: Buffer): Promise<string | null> => {
                    if (chunks.length === 0) return null;
                    try {
                        const parts: Buffer[] = [];
                        if (header) parts.push(header);
                        for (const chunk of chunks) {
                            // Skip header chunks that were already added
                            if (header && chunk === header) continue;
                            parts.push(chunk);
                        }
                        const fullAudio = Buffer.concat(parts);
                        if (fullAudio.length < 1000) return null; // Too small, skip

                        const dateStr = endedAt.toISOString().split('T')[0];
                        const filePath = `${dateStr}/${currentCallIdForRest}_${role}.webm`;

                        const { error } = await supabaseAdmin.storage
                            .from('call-recordings')
                            .upload(filePath, fullAudio, {
                                contentType: 'audio/webm;codecs=opus',
                                upsert: true,
                            });
                        if (error) {
                            logger.error({ error: error.message, role }, '❌ Failed to upload recording');
                            return null;
                        }
                        const { data: urlData } = supabaseAdmin.storage
                            .from('call-recordings')
                            .getPublicUrl(filePath);
                        logger.info(`✅ Recording uploaded: ${role} (${(fullAudio.length / 1024).toFixed(0)} KB)`);
                        return urlData.publicUrl;
                    } catch (err: any) {
                        logger.error({ err: err?.message, role }, '❌ Recording upload error');
                        return null;
                    }
                };
                const headerLead = sessionData.webmHeader?.[0];
                const headerSeller = sessionData.webmHeader?.[1];
                [recordingUrlLead, recordingUrlSeller] = await Promise.all([
                    uploadRecording('lead', sessionData.recordingChunks.lead, headerLead),
                    uploadRecording('seller', sessionData.recordingChunks.seller, headerSeller),
                ]);
                // Free memory
                sessionData.recordingChunks = { lead: [], seller: [] };
            }

            // Video recording URL from extension (uploaded directly to Supabase Storage)
            const videoRecordingUrl = payload?.videoRecordingUrl || null;
            if (videoRecordingUrl) {
                logger.info(`🎬 Video recording URL received: ${videoRecordingUrl}`);
            }

            const { error: updateErr } = await supabaseAdmin.from('calls').update({
                status: 'COMPLETED',
                ended_at: endedAt.toISOString(),
                duration_seconds: durationSeconds ?? null,
                transcript: sessionData.transcript,
                recording_url_lead: recordingUrlLead,
                recording_url_seller: recordingUrlSeller,
                recording_url_video: videoRecordingUrl,
            }).eq('id', currentCallIdForRest);
            if (updateErr) {
                logger.error({ err: updateErr, callId: currentCallIdForRest }, '❌ Failed to update call to COMPLETED');
            } else {
                logger.info({ callId: currentCallIdForRest, durationSeconds }, '✅ Call marked as COMPLETED');
            }

            // 6. Save Summary to specific table (only columns that exist in call_summaries)
            const { pickSummaryRowForDb } = await import('../../shared/call-summary-db.js');
            const summaryRow = summary
                ? pickSummaryRowForDb(summary as Record<string, unknown>, currentCallIdForRest, resultForDb ?? undefined)
                : { call_id: currentCallIdForRest, result: resultForDb };
            const { error: summaryErr } = await supabaseAdmin.from('call_summaries').upsert(summaryRow, { onConflict: 'call_id' });
            if (summaryErr) {
                logger.error({ err: summaryErr, callId: currentCallIdForRest }, '❌ Failed to upsert call summary');
            }
            // 7. Clear Redis (permite ao disconnect saber que a call já foi finalizada)
            await redis.del(`call:${currentCallIdForRest}:session`);
            if (sessionData?.userId) await redis.del(`user:${sessionData.userId}:current_call`);
            closeDeepgramClients();

            // 8. Log infrastructure costs (Deepgram + LiveKit) to Supabase
            if (durationSeconds && durationSeconds > 0) {
                const usageCtx = { callId: currentCallIdForRest, userId };
                // Deepgram: 2 audio streams (lead mix + seller mic) — log combined duration
                UsageTracker.logDeepgram(usageCtx, durationSeconds * 2).catch(() => { });
                // LiveKit: actual participant count (leads + seller)
                const participants = sessionData?.participantCount || 2;
                UsageTracker.logLiveKit(usageCtx, durationSeconds, participants).catch(() => { });
            }
        }

        async function handleAudioChunk(event: any, ws: WebSocket) {
            const audioData = Buffer.from(event.payload.audio, 'base64');
            audioBuffer.push(audioData);

            logger.debug(`📦 Received audio chunk: ${audioData.length} bytes, buffer size: ${audioBuffer.length}`);

            // Logic: Transcribe every ~3 seconds of audio (3 chunks of 1s)
            const CHUNKS_TO_PROCESS = 3;

            if (audioBuffer.length >= CHUNKS_TO_PROCESS) {
                const finalBuffer = Buffer.concat(audioBuffer);
                audioBuffer = []; // Clear buffer immediately

                const headerHex = finalBuffer.length >= 4 ? finalBuffer.slice(0, 4).toString('hex') : '';
                if (headerHex !== '1a45dfa3') {
                    logger.debug(`audio:chunk (legacy) invalid WebM header (${headerHex}); skipping Whisper.`);
                    return;
                }

                logger.info(`🎤 Transcribing ${finalBuffer.length} bytes of audio...`);

                try {
                    const prompt = "Transcreva o áudio. Identifique como 'Vendedor:' e 'Cliente:' se possível.";
                    const text = await whisperClient.transcribe(finalBuffer, prompt);

                    if (text && text.trim().length > 0) {
                        logger.info(`✨ Transcription result: ${text}`);

                        ws.send(JSON.stringify({
                            type: 'transcript:chunk',
                            payload: {
                                text: text,
                                isFinal: true
                            }
                        }));
                    }
                } catch (error: any) {
                    logger.error({ err: error }, '❌ Whisper transcription failed');
                }
            }
        }

        async function handleCallParticipants(event: any, currentCallId: string | null, session: CallSession | null) {
            logger.info(`📨 Handling call:participants event. Payload: ${JSON.stringify(event.payload)}`);
            const leadName = event.payload?.leadName;
            const selfName = event.payload?.selfName && String(event.payload.selfName).trim() ? String(event.payload.selfName).trim() : null;
            const allParticipants: string[] = Array.isArray(event.payload?.allParticipants) ? event.payload.allParticipants : [];

            if (selfName) {
                bufferedSellerName = selfName;
                if (session) {
                    session.sellerName = selfName;
                    if (sessionData && sessionData.callId === session.callId) {
                        sessionData.sellerName = selfName;
                    }
                    logger.info(`👤 Seller name set in session: ${selfName}`);
                } else {
                    logger.info(`👤 Buffering seller name (session not ready): ${selfName}`);
                }
            }

            if (!leadName && !selfName) {
                logger.warn('⚠️ Received call:participants but both leadName and selfName are missing or empty');
                if (session && currentCallId) await redis.set(`call:${currentCallId}:session`, session, 3600 * 4);
                return;
            }

            if (leadName) {
                if (!session || !currentCallId) {
                    bufferedLeadName = leadName;
                    logger.info(`👤 Buffering lead name (session not ready): ${leadName}`);
                    return;
                }
                session.leadName = leadName;
                if (sessionData && sessionData.callId === session.callId) {
                    sessionData.leadName = leadName;
                }
                logger.info(`👤 Lead identified and set in session: ${leadName}`);
            }

            // Track all participants and count (leads + 1 seller)
            if (session) {
                session.allParticipants = allParticipants;
                session.participantCount = allParticipants.length + 1; // +1 for seller
                if (sessionData && sessionData.callId === session.callId) {
                    sessionData.allParticipants = allParticipants;
                    sessionData.participantCount = session.participantCount;
                }
                logger.info(`👥 Participants: ${allParticipants.length} lead(s) + 1 seller = ${session.participantCount} total`);
            }

            if (session && currentCallId) {
                await redis.set(`call:${currentCallId}:session`, session, 3600 * 4);
            }
        }

        /**
         * Shared post-transcription logic: filter, persist, coach, publish.
         * Called by both Whisper (sync) and Deepgram (streaming callback).
         */
        const PERSIST_BATCH_INTERVAL = env.PERSIST_BATCH_INTERVAL_MS;
        const MIN_COACH_GAP = 15000; // 15s between coaching calls to reduce OpenAI costs
        let isCoaching = false;

        async function processTranscriptionResult(text: string, role: 'seller' | 'lead', ws: WebSocket): Promise<void> {
            if (!text || !text.trim()) return;
            if (isHallucination(text)) {
                debugLog(`[FILTER] Hallucination: ${text}`);
                return;
            }
            if (shouldDiscard(text.trim(), role, sessionData ?? null)) return;
            const currentLeadName = sessionData?.leadName || bufferedLeadName || 'Cliente';
            const currentSellerName = sessionData?.sellerName || bufferedSellerName || 'Vendedor';
            const speakerLabel = role === 'seller' ? currentSellerName : currentLeadName;
            logger.info(`✨ [${speakerLabel}]: "${text}"`);
            if (sessionData) {
                if (role === 'lead') {
                    sessionData.lastLeadTranscription = text.slice(-200);
                } else {
                    sessionData.lastSellerTranscription = text.slice(-200);
                }
                const transcriptChunk = {
                    text,
                    speaker: speakerLabel,
                    role,
                    timestamp: Date.now(),
                    isFinal: true
                };
                if (!sessionData.transcript) sessionData.transcript = [];
                sessionData.transcript.push(transcriptChunk);
                if (callId) {
                    await redis.set(`call:${callId}:session`, sessionData, 3600);
                }
                const now = Date.now();
                if (!sessionData.lastPersistedAt || (now - sessionData.lastPersistedAt) >= PERSIST_BATCH_INTERVAL) {
                    sessionData.lastPersistedAt = now;
                    supabaseAdmin.from('calls').update({
                        transcript: sessionData.transcript
                    }).eq('id', callId).then(({ error }) => {
                        if (error) logger.error({ error, callId }, '❌ DB batch persist failed');
                    });
                }
            }
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'transcript:chunk',
                    payload: { text, isFinal: true, speaker: speakerLabel, role }
                }));
            }
            if (callId) {
                await redis.publish(`call:${callId}:stream`, {
                    text,
                    speaker: speakerLabel,
                    role,
                    timestamp: Date.now()
                });
            }
        }

        async function triggerStreamingCoach(ws: WebSocket): Promise<void> {
            if (!callId || !sessionData || isCoaching) return;
            const now = Date.now();
            if (sessionData.lastCoachingAt && (now - sessionData.lastCoachingAt) < MIN_COACH_GAP) return;
            isCoaching = true;
            sessionData.lastCoachingAt = now;
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'coach:thinking', payload: { timestamp: now } }));
                }
                const recentTranscript = (sessionData.transcript || []).slice(-15);
                const fullContext = recentTranscript
                    .map((t: any) => `${t.role === 'seller' ? 'VENDEDOR' : 'LEAD'}: ${t.text}`)
                    .join('\n');
                if (fullContext.trim().length < 10) { isCoaching = false; return; }
                const sentQuestions = sessionData.sentQuestions ?? [];
                const sentBlock = sentQuestions.length > 0
                    ? `\n## PERGUNTAS JÁ ENVIADAS AO VENDEDOR(NÃO REPITA NENHUMA DESTAS)\n${sentQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}\n`
                    : '';
                const userPrompt = `Transcrição completa da conversa até agora:\n${fullContext}${sentBlock}\nAnalise e retorne o JSON.Se o lead fez pergunta ou objeção, preencha suggested_response(resposta pronta para o vendedor dizer).Sugira uma pergunta NOVA em suggested_question(não repita as listadas).`;
                logger.info(`🧠 Coach streaming (${fullContext.length} chars) for call ${callId}`);
                let fullJson = '';
                const systemPrompt = sessionData.coachData
                    ? coachEngine.getSystemPromptForCoach(sessionData.coachData)
                    : coachEngine.getSystemPrompt();
                for await (const token of openaiClient.streamCoachingTokens(systemPrompt, userPrompt, callId ?? undefined)) {
                    fullJson += token;
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'coach:token', payload: { token, timestamp: Date.now() } }));
                    }
                }
                const parsed = JSON.parse(fullJson);
                if (parsed && parsed.phase && parsed.tip && ws.readyState === WebSocket.OPEN) {
                    if (parsed.suggested_question) {
                        sessionData.sentQuestions = [...sentQuestions, parsed.suggested_question];
                        await redis.set(`call:${callId}:session`, sessionData, 3600 * 4);
                    }
                    ws.send(JSON.stringify({
                        type: 'COACHING_MESSAGE',
                        payload: {
                            type: parsed.objection ? 'objection' : 'tip',
                            content: parsed.tip,
                            urgency: parsed.objection ? 'high' : 'medium',
                            metadata: {
                                phase: parsed.phase,
                                objection: parsed.objection || null,
                                suggested_question: parsed.suggested_question ?? undefined,
                                suggested_response: parsed.suggested_response ?? undefined
                            }
                        }
                    }));
                    if (parsed.objection) {
                        ws.send(JSON.stringify({
                            type: 'objection:detected',
                            payload: { objection: parsed.objection, phase: parsed.phase, tip: parsed.tip }
                        }));
                        logger.info(`⚡ Objection detected: ${parsed.objection}`);
                    }
                    ws.send(JSON.stringify({ type: 'coach:done', payload: { timestamp: Date.now() } }));
                }
            } catch (coachError: any) {
                logger.error({ message: coachError?.message, stack: coachError?.stack }, '❌ Streaming Coach failed (non-fatal)');
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'coach:idle', payload: { timestamp: Date.now() } }));
                }
            } finally {
                isCoaching = false;
            }
        }

        async function initDeepgramClients(ws: WebSocket): Promise<void> {
            // Close existing clients to prevent resource leaks (timers, WebSocket connections)
            closeDeepgramClients();
            const isWeb = callPlatform === 'web';
            const dgOpts = {
                encoding: isWeb ? 'linear16' : 'opus',
                channels: 1,
                sampleRate: isWeb ? 16000 : 48000,
            };
            dgLeadClient = new DeepgramRealtimeClient({ role: 'lead', ...dgOpts });
            dgSellerClient = new DeepgramRealtimeClient({ role: 'seller', ...dgOpts });
            const setupCallbacks = (client: DeepgramRealtimeClient, role: 'seller' | 'lead'): void => {
                client.onFinal = (text: string) => {
                    pendingTranscriptions++;
                    processTranscriptionResult(text, role, ws)
                        .catch(err => logger.error({ err }, `❌ Deepgram [${role}] processTranscriptionResult failed`))
                        .finally(() => { pendingTranscriptions--; });
                };
                client.onInterim = (text: string) => {
                    if (ws.readyState !== WebSocket.OPEN) return;
                    const speakerLabel = role === 'seller'
                        ? (sessionData?.sellerName || bufferedSellerName || 'Vendedor')
                        : (sessionData?.leadName || bufferedLeadName || 'Cliente');
                    ws.send(JSON.stringify({
                        type: 'transcript:interim',
                        payload: { text, speaker: speakerLabel, role }
                    }));
                };
                client.onError = (err: Error) => {
                    logger.error({ err }, `❌ Deepgram [${role}] stream error`);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'transcription:error', payload: { message: `Deepgram [${role}]: ${err.message}` } }));
                    }
                };
            };
            setupCallbacks(dgLeadClient, 'lead');
            setupCallbacks(dgSellerClient, 'seller');
            dgLeadClient.onUtteranceEnd = () => {
                logger.info(`🎯 Lead utterance end — triggering coach`);
                triggerStreamingCoach(ws).catch(err =>
                    logger.error({ err }, '❌ triggerStreamingCoach failed')
                );
            };
            if (sessionData?.webmHeader) {
                if (sessionData.webmHeader[0]) dgLeadClient.setWebmHeader(sessionData.webmHeader[0]);
                if (sessionData.webmHeader[1]) dgSellerClient.setWebmHeader(sessionData.webmHeader[1]);
            }

            const results = await Promise.allSettled([
                dgLeadClient.connect(),
                dgSellerClient.connect()
            ]);
            const leadOk = results[0].status === 'fulfilled';
            const sellerOk = results[1].status === 'fulfilled';
            if (!leadOk && !sellerOk) {
                const leadErr = results[0].status === 'rejected' ? results[0].reason : 'unknown';
                const sellerErr = results[1].status === 'rejected' ? results[1].reason : 'unknown';
                logger.error({ leadErr, sellerErr }, '❌ Both Deepgram clients failed to connect');
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'transcription:error', payload: { message: 'Deepgram connection failed for both channels' } }));
                }
            } else if (!leadOk) {
                logger.warn({ err: results[0].status === 'rejected' ? results[0].reason : null }, '⚠️ Deepgram [lead] connect failed, [seller] OK');
            } else if (!sellerOk) {
                logger.warn({ err: results[1].status === 'rejected' ? results[1].reason : null }, '⚠️ Deepgram [seller] connect failed, [lead] OK');
            }
            logger.info(`🔌 Deepgram clients initialized for call ${callId} (lead=${leadOk}, seller=${sellerOk})`);
        }

        /** Close Deepgram clients gracefully. */
        function closeDeepgramClients(): void {
            if (dgLeadClient) { dgLeadClient.close(); dgLeadClient = null; }
            if (dgSellerClient) { dgSellerClient.close(); dgSellerClient = null; }
        }

        let dgAudioChunkCount = 0;

        const MAX_AUDIO_CHUNK_BYTES = 1024 * 1024; // 1 MB

        async function handleAudioSegment(event: any, ws: WebSocket) {
            const audioBuf = Buffer.from(event.payload.audio, 'base64');
            if (audioBuf.length > MAX_AUDIO_CHUNK_BYTES) {
                logger.warn({ bytes: audioBuf.length }, 'Audio chunk exceeds max size, dropping');
                return;
            }
            const rawRole = event.payload.role || event.payload.speaker || 'lead';
            const role: 'seller' | 'lead' = rawRole === 'seller' ? 'seller' : 'lead';
            const isHeader = !!event.payload.isHeader;
            if (isHeader && sessionData) {
                if (!sessionData.webmHeader) sessionData.webmHeader = [];
                const idx = role === 'lead' ? 0 : 1;
                sessionData.webmHeader[idx] = audioBuf;
                logger.info(`📦 Cached WebM header for ${role} (${audioBuf.length} bytes)`);
            }
            // Buffer audio chunks for recording (only WebM/Opus from extension, not raw PCM)
            if (sessionData && callPlatform !== 'web') {
                if (!sessionData.recordingChunks) sessionData.recordingChunks = { lead: [], seller: [] };
                sessionData.recordingChunks[role].push(audioBuf);
            }
            if (useDeepgram) {
                dgAudioChunkCount++;
                const client = role === 'seller' ? dgSellerClient : dgLeadClient;
                if (!client) {
                    logger.warn(`⚠️ Deepgram [${role}] client not initialized; dropping audio chunk`);
                    return;
                }
                if (isHeader && callPlatform !== 'web') {
                    client.setWebmHeader(audioBuf);
                }
                if (dgAudioChunkCount <= 3 || dgAudioChunkCount % 100 === 0) {
                    const headerHex = audioBuf.length >= 4 ? audioBuf.slice(0, 4).toString('hex') : 'short';
                    const wsState = client.getReadyState();
                    logger.info(`🔊 [DG] audio:segment #${dgAudioChunkCount} role=${role} bytes=${audioBuf.length} header=${headerHex} wsState=${wsState} isHeader=${isHeader}`);
                }
                client.sendAudio(audioBuf);
                return;
            }
            const headerHex = audioBuf.slice(0, 4).toString('hex');
            if (headerHex !== '1a45dfa3') {
                debugLog(`[WARNING] Unexpected header: ${headerHex}`);
            }
            try {
                const previousText = role === 'lead'
                    ? (sessionData?.lastLeadTranscription || "Transcreva o áudio.")
                    : (sessionData?.lastSellerTranscription || "Transcreva o áudio.");
                pendingTranscriptions++;
                let text = '';
                try {
                    debugLog(`[WHISPER START] Transcribing ${audioBuf.length} bytes...`);
                    text = await whisperClient.transcribe(audioBuf, previousText);
                    debugLog(`[WHISPER END] Result: '${text}'`);
                } finally {
                    pendingTranscriptions--;
                }
                await processTranscriptionResult(text, role, ws);
            } catch (err: any) {
                debugLog(`[WHISPER ERROR] ${err.message}\n${err.stack}`);
                logger.error({ message: err?.message, stack: err?.stack }, `❌ [${role}] Whisper transcription failed`);
            }
        }

    }); // END OF /ws/call handler

    // ========================================
    // MANAGER WEBSOCKET ROUTE - WHISPER SYSTEM
    // ========================================

    fastify.get('/ws/manager', { websocket: true }, async (socket, req) => {
        logger.info('👔 Manager WebSocket connection attempt');

        // Support both query-param token (legacy) and auth-challenge (new)
        const queryToken = (req.query as any).token;

        let subscribedCallId: string | null = null;
        let streamHandler: ((message: any) => void) | null = null;
        let mediaHandler: ((message: any) => void) | null = null;
        let liveSummaryHandler: ((message: any) => void) | null = null;

        let authUser: { id: string } | null = null;
        let managerOrgId: string | null = null;
        let managerPlan: string = 'FREE';

        async function authenticateManager(token: string): Promise<boolean> {
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return false;
            const { data: mgrProfile } = await supabaseAdmin
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();
            const mgrOrgId = (mgrProfile as { organization_id: string | null } | null)?.organization_id;
            if (mgrOrgId) {
                managerOrgId = mgrOrgId;
                const { data: mgrOrg } = await supabaseAdmin
                    .from('organizations')
                    .select('plan')
                    .eq('id', mgrOrgId)
                    .single();
                const mgrPlan = (mgrOrg as { plan?: string } | null)?.plan ?? 'FREE';
                managerPlan = mgrPlan;
                if (mgrPlan === 'FREE') {
                    logger.warn(`🚫 Manager ${user.id} rejected: FREE plan`);
                    try { socket.close(4403, 'Active plan required'); } catch { /* already closed */ }
                    return false;
                }
            } else {
                logger.warn(`🚫 Manager ${user.id} rejected: no organization`);
                try { socket.close(4403, 'Active plan required'); } catch { /* already closed */ }
                return false;
            }
            authUser = user;
            logger.info(`✅ Manager authenticated: ${user.id} (plan=${managerPlan})`);
            socket.send(JSON.stringify({ type: 'auth:ok' }));
            return true;
        }

        // Legacy: query param token
        if (queryToken) {
            const ok = await authenticateManager(queryToken);
            if (!ok) return;
        } else {
            // Auth challenge: wait for auth message
            const authTimeout = setTimeout(() => {
                if (!authUser) {
                    logger.warn('⏰ Manager auth timeout');
                    socket.close(1008, 'Auth timeout');
                }
            }, 5000);

            await new Promise<void>((resolve) => {
                const handler = async (raw: string | Buffer) => {
                    try {
                        const msg = JSON.parse(raw.toString());
                        if (msg.type === 'auth' && msg.payload?.token) {
                            clearTimeout(authTimeout);
                            socket.off('message', handler);
                            await authenticateManager(msg.payload.token);
                            resolve();
                        }
                    } catch { /* ignore */ }
                };
                socket.on('message', handler);
            });

            if (!authUser) return;
        }

        socket.on('message', async (message: string | Buffer) => {
            if (!authUser) return;
            try {
                const event = JSON.parse(message.toString());
                logger.info(`[LIVE_DEBUG] manager WS message type=${event?.type ?? 'unknown'}`);

                switch (event.type) {
                    case 'manager:join': {
                        // Manager wants to join/monitor a specific call
                        const { callId } = event.payload || {};
                        logger.info(`[LIVE_DEBUG] manager:join received callId=${callId ?? 'undefined'}`);

                        if (!callId) {
                            socket.send(JSON.stringify({
                                type: 'error',
                                payload: { message: 'callId is required' }
                            }));
                            return;
                        }

                        // Unsubscribe from previous call if any
                        if (subscribedCallId && streamHandler) {
                            await redis.unsubscribe(`call:${subscribedCallId}:stream`, streamHandler);
                        }
                        if (subscribedCallId && mediaHandler) {
                            await redis.unsubscribe(`call:${subscribedCallId}:media_raw`, mediaHandler);
                        }
                        if (subscribedCallId && liveSummaryHandler) {
                            await redis.unsubscribe(`call:${subscribedCallId}:live_summary`, liveSummaryHandler);
                        }
                        if (subscribedCallId) {
                            const prevSet = managerSocketsByCallId.get(subscribedCallId);
                            if (prevSet) {
                                prevSet.delete(socket);
                                if (prevSet.size === 0) managerSocketsByCallId.delete(subscribedCallId);
                            }
                        }

                        // Verify call exists and is active
                        const { data: callCheck } = await supabaseAdmin
                            .from('calls')
                            .select('status')
                            .eq('id', callId)
                            .single();

                        if (!callCheck || callCheck.status !== 'ACTIVE') {
                            socket.send(JSON.stringify({
                                type: 'error',
                                payload: { code: 'CALL_NOT_ACTIVE', message: 'Call is not active' }
                            }));
                            break;
                        }

                        // Subscribe to new call's transcript stream
                        subscribedCallId = callId;
                        let set = managerSocketsByCallId.get(callId);
                        if (!set) {
                            set = new Set();
                            managerSocketsByCallId.set(callId, set);
                        }
                        set.add(socket);
                        logger.info(`[LIVE_DEBUG] manager subscribed to callId=${callId} totalManagersForCall=${set.size}`);

                        streamHandler = (transcriptData: any) => {
                            if (socket.readyState !== WebSocket.OPEN) return;
                            // Forward transcript to manager
                            socket.send(JSON.stringify({
                                type: 'transcript:stream',
                                payload: transcriptData
                            }));
                        };

                        try {
                            await redis.subscribe(`call:${subscribedCallId}:stream`, streamHandler);
                        } catch (subErr) {
                            logger.error({ error: subErr }, '[LIVE_DEBUG] Failed to subscribe to stream');
                            socket.send(JSON.stringify({ type: 'error', payload: { code: 'SUBSCRIPTION_FAILED', message: 'Failed to subscribe to call stream' } }));
                        }

                        // Subscribe to media stream (video + audio) — send binary to avoid base64 encoding issues
                        mediaHandler = (mediaData: any) => {
                            if (socket.readyState !== WebSocket.OPEN) return;
                            const binaryMsg = encodeMediaChunkToBinary(mediaData);
                            if (binaryMsg) socket.send(binaryMsg);
                        };

                        try {
                            await redis.subscribe(`call:${subscribedCallId}:media_raw`, mediaHandler);
                        } catch (subErr) {
                            logger.error({ error: subErr }, '[LIVE_DEBUG] Failed to subscribe to media');
                            socket.send(JSON.stringify({ type: 'error', payload: { code: 'SUBSCRIPTION_FAILED', message: 'Failed to subscribe to media stream' } }));
                        }

                        // Subscribe to live summary
                        liveSummaryHandler = async (summaryData: any) => {
                            if (socket.readyState !== WebSocket.OPEN) return;
                            if (summaryData) {
                                logger.info({ summary: summaryData }, '📊 Broadcasting Live Summary');
                                socket.send(JSON.stringify({
                                    type: 'call:live_summary',
                                    payload: summaryData
                                }));
                            }
                        };
                        try {
                            await redis.subscribe(`call:${subscribedCallId}:live_summary`, liveSummaryHandler);
                        } catch (subErr) {
                            logger.error({ error: subErr }, '[LIVE_DEBUG] Failed to subscribe to live_summary');
                        }

                        // Do NOT send cached media header on manager:join — it can be stale or from a different
                        // codec (vp8 vs vp9), causing intermittent SourceBuffer/Playback errors when mixed with
                        // live chunks. Client waits for the next init segment from the live stream (within ~5s).
                        logger.info(`👔 Manager ${authUser.id} joined call ${callId} (transcript + media)`);

                        if (socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: 'manager:joined',
                                payload: { callId }
                            }));
                        }
                        break;
                    }

                    case 'manager:whisper': {
                        // Manager sends a coaching tip/whisper to the seller
                        if (!subscribedCallId) {
                            socket.send(JSON.stringify({
                                type: 'error',
                                payload: { message: 'Not subscribed to any call' }
                            }));
                            return;
                        }

                        // Check if plan has manager_whisper feature
                        const canWhisper = await canUseManagerWhisper(managerOrgId);
                        if (!canWhisper) {
                            logger.warn(`🚫 Manager ${authUser.id} whisper blocked: plan ${managerPlan} does not include manager_whisper feature`);
                            socket.send(JSON.stringify({
                                type: 'error',
                                payload: {
                                    code: 'FEATURE_NOT_AVAILABLE',
                                    message: 'O recurso Manager Whisper requer o plano TEAM ou superior. Faça upgrade para usar este recurso.',
                                    feature: 'manager_whisper',
                                    requiredPlan: 'TEAM'
                                }
                            }));
                            return;
                        }

                        const { content, urgency = 'normal' } = event.payload || {};
                        if (!content) {
                            socket.send(JSON.stringify({
                                type: 'error',
                                payload: { message: 'content is required' }
                            }));
                            return;
                        }

                        // Publish whisper to the command channel
                        await redis.publish(`call:${subscribedCallId}:commands`, {
                            type: 'whisper',
                            content,
                            urgency,
                            managerId: authUser.id,
                            timestamp: Date.now()
                        });

                        logger.info(`💬 Manager ${authUser.id} sent whisper to call ${subscribedCallId}`);

                        socket.send(JSON.stringify({
                            type: 'whisper:sent',
                            payload: { callId: subscribedCallId }
                        }));
                        break;
                    }

                    default:
                        logger.warn(`Unknown event type from manager: ${event.type}`);
                }
            } catch (err: any) {
                logger.error({ error: err }, '❌ Error handling manager message');
            }
        });

        // Heartbeat: ping every 30s, terminate if no pong within 30s
        let isAlive = true;
        const pingInterval = setInterval(() => {
            if (!isAlive) {
                logger.warn('💓 Manager inactive, terminating connection');
                socket.terminate();
                return;
            }
            isAlive = false;
            if (socket.readyState === WebSocket.OPEN) {
                socket.ping();
            }
        }, 30000);

        socket.on('pong', () => {
            isAlive = true;
        });

        socket.on('close', async (code, reason) => {
            logger.info({ code, reason: reason?.toString() }, '👔 Manager WS Disconnected');
            clearInterval(pingInterval);

            if (subscribedCallId) {
                const set = managerSocketsByCallId.get(subscribedCallId);
                if (set) {
                    set.delete(socket);
                    if (set.size === 0) managerSocketsByCallId.delete(subscribedCallId);
                }
            }

            // Cleanup subscriptions
            if (subscribedCallId && streamHandler) {
                await redis.unsubscribe(`call:${subscribedCallId}:stream`, streamHandler);
            }
            if (subscribedCallId && mediaHandler) {
                await redis.unsubscribe(`call:${subscribedCallId}:media_raw`, mediaHandler);
            }
            if (subscribedCallId && liveSummaryHandler) {
                await redis.unsubscribe(`call:${subscribedCallId}:live_summary`, liveSummaryHandler);
            }
        });

        socket.on('error', (err) => {
            logger.error({ err }, '👔 Manager WS Error');
            clearInterval(pingInterval);
        });
    });
}
