import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../../infrastructure/supabase/client.js';
import { redis } from '../../infrastructure/cache/redis.js';
import { logger } from '../../shared/utils/logger.js';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

// DEBUG LOGGING
const LOG_FILE = path.join(process.cwd(), 'backend-websocket-debug-v2.log');
function debugLog(msg: string) {
    try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {
        console.error('Failed to write to log file', e);
    }
}

// AI Imports
import { CoachEngine } from '../ai/coach-engine.js';
import { OpenAIClient } from '../ai/openai-client.js';
import { ObjectionMatcher } from '../ai/objection-matcher.js';
import { TriggerDetector } from '../ai/trigger-detector.js';
import { PromptBuilder } from '../ai/prompt-builder.js';
import { ResponseParser } from '../ai/response-parser.js';
import { PostCallAnalyzer } from '../ai/post-call-analyzer.js';
import { WhisperClient } from '../ai/whisper-client.js';
import { ObjectionSuccessTracker } from '../ai/objection-success-tracker.js';
import { SummaryAgent } from '../ai/summary-agent.js';

// Types
export interface CallSession {
    callId: string;
    userId: string;
    scriptId: string;
    transcript: TranscriptChunk[];
    currentStep: number;
    // AI State
    lastCoachingAt?: number;
    lastSummaryAt?: number; // NEW: Timer for summary
    leadProfile?: any;
    lastCoaching?: string;
    startupTime?: number;
    lastTranscription?: string; // legacy; prefer lastLeadTranscription / lastSellerTranscription
    lastLeadTranscription?: string;
    lastSellerTranscription?: string;
    leadName?: string;
    recentTranscriptions?: Array<{ text: string; role: string; timestamp: number }>;
    webmHeader?: Buffer[];
}

export interface TranscriptChunk {
    text: string;
    speaker: 'seller' | 'lead';
    timestamp: number;
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

/** Lead tem prioridade: se seller diz o mesmo que o lead = eco → descartar seller. */
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
        if (!textsAreSimilar(text, r.text)) continue;

        // SAME ROLE DUPLICATION (Whisper transcribing same audio multiple times)
        if (r.role === role) {
            logger.info(
                `🔇 Duplicate filtered [${role}]: "${text.slice(0, 50)}..." (same text from same role)`
            );
            return true;
        }

        // CROSS-CHANNEL ECHO/LEAKAGE

        // Case 1: Active Role is Seller (Mic), matched with recent Lead (Tab).
        // Lead said it first, now Seller matches = Leakage (Lead's voice in Mic)
        if (role === 'seller') {
            logger.info(
                `🔇 Leakage filtered [seller]: "${text.slice(0, 50)}..." (matches lead)`
            );
            return true;
        }

        // Case 2: Active Role is Lead (Tab), matched with recent Seller (Mic).
        // Seller said it first, now Lead matches = Echo (Seller's voice in Tab)
        if (role === 'lead') {
            logger.info(`🔇 Echo filtered [lead]: "${text.slice(0, 50)}..." (matches seller)`);
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
const objectionMatcher = new ObjectionMatcher();
// Initialize successTracker first so it's available for injection
const successTracker = new ObjectionSuccessTracker(supabaseAdmin);

const coachEngine = new CoachEngine(
    new TriggerDetector(),
    objectionMatcher,
    new PromptBuilder(),
    openaiClient,
    new ResponseParser(),
    successTracker
);

const postCallAnalyzer = new PostCallAnalyzer(openaiClient);
const whisperClient = new WhisperClient();
const summaryAgent = new SummaryAgent(openaiClient);

export async function websocketRoutes(fastify: FastifyInstance) {
    fastify.get('/ws/call', { websocket: true }, async (socket, req) => {
        logger.info('🔌 New WebSocket connection attempt');

        const token = (req.query as any).token;
        if (!token) {
            socket.close(1008, 'Token required');
            return;
        }

        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            socket.close(1008, 'Invalid token');
            return;
        }

        logger.info(`✅ User authenticated: ${user.id}`);
        let callId: string | null = null;
        let sessionData: CallSession | null = null;
        let bufferedLeadName: string | null = null; // Buffer leadName if it arrives before session
        let audioBuffer: Buffer[] = [];
        let transcriptionTimer: NodeJS.Timeout | null = null;
        let commandHandler: ((message: any) => void) | null = null; // For manager whispers

        socket.on('message', async (message: string) => {
            try {
                const msgString = message.toString();
                // console.log('👀 RAW SOCKET MESSAGE SERVER-SIDE:', msgString.substring(0, 100));

                if (!msgString.includes('media:stream') && !msgString.includes('audio:segment')) {
                    // console.log('RAW MSG RECEIVED:', msgString);
                }
                const event = JSON.parse(msgString);

                // IGNORE media:stream logs to avoid noise, but log everything else
                if (event.type !== 'media:stream' && event.type !== 'audio:segment') {
                    // logger.info(`📨 WS EVENT RECEIVED: ${event.type}`);
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
                        logger.info('🚀 Processing call:start payload:', JSON.stringify(event.payload));
                        await handleCallStart(event, user.id, socket);
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
                        await handleCallEnd(callId, socket);
                        break;
                    case 'media:stream':
                        // NEW: Relay video + audio chunks to managers via Redis pub/sub
                        if (callId && event.payload?.chunk) {
                            const payload = {
                                chunk: event.payload.chunk,
                                size: event.payload.size,
                                timestamp: event.payload.timestamp,
                                isHeader: !!event.payload.isHeader // Ensure boolean
                            };

                            // Cache header if present
                            if (event.payload.isHeader) {
                                await redis.set(
                                    `call:${callId}:media_header`,
                                    JSON.stringify(payload),
                                    'EX',
                                    14400 // 4 hours
                                );
                                logger.info(`📼 Video Header cached for call ${callId}`);
                            }

                            await redis.publish(`call:${callId}:media_raw`, payload);
                        }
                        break;
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
            logger.info({ code, reason: reason?.toString() }, '🔌 WS Disconnected');

            // Cleanup command subscription
            if (callId && commandHandler) {
                await redis.unsubscribe(`call:${callId}:commands`, commandHandler);
                commandHandler = null;
            }
        });

        socket.on('error', (err) => {
            logger.error({ err }, '🔌 WS Error');
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
                const { scriptId, platform, leadName, externalId } = event.payload;

                // 0. Check if call already exists for this connection (Idempotency)
                if (callId) {
                    logger.warn(`⚠️ Call already initialized for this connection. ID: ${callId}. Ignoring duplicate call:start.`);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'call:started', payload: { callId: callId } }));
                    }
                    return;
                }

                // 1. Get User Profile & Org
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

                const orgId = profile.organization_id;

                // 1.1. Check for external_id match (Meet ID Reuse)
                if (externalId) {
                    const { data: existingExternalCall } = await supabaseAdmin
                        .from('calls')
                        .select('id, script_id, platform, transcript, started_at, status')
                        .eq('user_id', userId)
                        .eq('external_id', externalId)
                        .order('started_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (existingExternalCall) {
                        logger.info(`🔗 Found existing call by External ID (${externalId}): ${existingExternalCall.id}`);

                        // Reactivate if needed
                        if (existingExternalCall.status !== 'ACTIVE') {
                            await supabaseAdmin.from('calls')
                                .update({ status: 'ACTIVE', ended_at: null })
                                .eq('id', existingExternalCall.id);
                        }

                        callId = existingExternalCall.id;

                        // Reconstruct Session Data
                        // Try Redis first
                        let currentSession = await redis.get<CallSession>(`call:${callId}:session`);
                        if (!currentSession) {
                            // Reconstruct from DB
                            logger.info(`♻️ Reconstructing session from DB for call ${callId}`);
                            const dbTranscript = existingExternalCall.transcript || [];

                            sessionData = {
                                callId: callId,
                                userId: userId,
                                scriptId: existingExternalCall.script_id || scriptId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                                transcript: Array.isArray(dbTranscript) ? dbTranscript : [],
                                currentStep: 0,
                                startupTime: Date.now(),
                                leadName: leadName || 'Cliente'
                            };
                            await redis.set(`call:${callId}:session`, sessionData, 3600);
                        } else {
                            sessionData = currentSession;
                        }

                        // Subscribe to commands
                        await setupCommandSubscription(callId, ws);

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
                        await setupCommandSubscription(callId, ws);

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
                if (!scriptId || scriptId === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') {
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

                // 3. Insert Call into DB
                const { data: call, error: insertError } = await supabaseAdmin
                    .from('calls')
                    .insert({
                        user_id: userId,
                        organization_id: orgId,
                        script_id: finalScriptId,
                        platform: platform || 'OTHER',
                        status: 'ACTIVE',
                        started_at: new Date().toISOString(),
                        external_id: externalId
                    })
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

                callId = call.id;
                logger.info(`✅ Call created in DB. ID: ${callId}`);

                // 4. Initialize Session
                sessionData = {
                    callId: callId,
                    userId: userId,
                    scriptId: finalScriptId,
                    platform: platform,
                    startedAt: new Date().getTime(),
                    transcript: [],
                    currentStep: 1,
                    lastCoachingAt: 0,
                    lastSummaryAt: 0,
                    leadName: leadName || bufferedLeadName || undefined
                };

                // 5. Cache Session
                await redis.set(`call:${callId}:session`, sessionData, 3600);

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

        async function handleCallEnd(currentCallId: string | null, ws: WebSocket) {
            if (!currentCallId || !sessionData) return;

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

            // 2. Generate Summary
            const summary = await postCallAnalyzer.generate(sessionData, scriptName, ["Intro", "Discovery", "Close"]);

            // 3. NEW: Track conversion feedback if call was successful
            if (summary && summary.result === 'CONVERTED' && objections && objections.length > 0) {
                try {
                    // Extract which objections were faced
                    const objectionIds = postCallAnalyzer.extractObjectionIds(
                        summary,
                        objectionMatcher,
                        objections
                    );

                    if (objectionIds.length > 0) {
                        logger.info(`🎯 Tracking ${objectionIds.length} successful objections for script ${sessionData.scriptId}`);
                        await successTracker.trackCallResult(
                            sessionData.scriptId,
                            objectionIds,
                            true // wasConverted = true
                        );
                    }
                } catch (trackingError) {
                    logger.error({ error: trackingError }, 'Failed to track objection success');
                    // Don't fail the entire call end flow if tracking fails
                }
            } else if (summary && summary.result === 'LOST' && objections && objections.length > 0) {
                // Also track losses to get accurate success rates
                try {
                    const objectionIds = postCallAnalyzer.extractObjectionIds(
                        summary,
                        objectionMatcher,
                        objections
                    );

                    if (objectionIds.length > 0) {
                        logger.info(`📉 Tracking ${objectionIds.length} unsuccessful objections for script ${sessionData.scriptId}`);
                        await successTracker.trackCallResult(
                            sessionData.scriptId,
                            objectionIds,
                            false // wasConverted = false
                        );
                    }
                } catch (trackingError) {
                    logger.error({ error: trackingError }, 'Failed to track objection failure');
                }
            }

            // 4. Send Summary to Client
            ws.send(JSON.stringify({
                type: 'call:summary',
                payload: summary
            }));

            // 5. Update DB
            await supabaseAdmin.from('calls').update({
                status: 'COMPLETED',
                ended_at: new Date().toISOString(),
                transcript: sessionData.transcript, // Save full transcript
                // summary: summary // If column exists
            }).eq('id', currentCallId);

            // 6. Save Summary to specific table
            if (summary) {
                await supabaseAdmin.from('call_summaries').insert({
                    call_id: currentCallId,
                    ...summary
                });
            }
            // 7. Clear Redis
            await redis.del(`call:${currentCallId}:session`);
        }

        async function handleAudioChunk(event: any, ws: WebSocket) {
            const audioData = Buffer.from(event.payload.audio, 'base64');
            audioBuffer.push(audioData);

            logger.info(`📦 Received audio chunk: ${audioData.length} bytes, buffer size: ${audioBuffer.length}`);

            // Logic: Transcribe every ~3 seconds of audio (3 chunks of 1s)
            const CHUNKS_TO_PROCESS = 3;

            if (audioBuffer.length >= CHUNKS_TO_PROCESS) {
                // Concatenate all binary buffers (MediaRecorder chunks form valid WebM when concatenated)
                const finalBuffer = Buffer.concat(audioBuffer);
                audioBuffer = []; // Clear buffer immediately

                logger.info(`🎤 Transcribing ${finalBuffer.length} bytes of audio...`);

                try {
                    const prompt = "Transcreva o áudio. Identifique como 'Vendedor:' e 'Cliente:' se possível.";
                    const text = await whisperClient.transcribe(finalBuffer, prompt);

                    if (text && text.trim().length > 0) {
                        logger.info(`✨ Transcription result: ${text}`);

                        // Send transcription result to socket
                        ws.send(JSON.stringify({
                            type: 'transcript:chunk',
                            payload: {
                                text: text,
                                isFinal: true
                            }
                        }));
                    }
                } catch (err) {
                    logger.error('❌ Whisper transcription failed', err);
                }
            }
        }

        async function handleCallParticipants(event: any, currentCallId: string | null, session: CallSession | null) {
            logger.info(`📨 Handling call:participants event. Payload: ${JSON.stringify(event.payload)}`);
            const leadName = event.payload?.leadName;

            if (!leadName) {
                logger.warn('⚠️ Received call:participants but leadName is missing or empty');
                return;
            }

            // If session doesn't exist yet, buffer the leadName
            if (!session || !currentCallId) {
                bufferedLeadName = leadName;
                logger.info(`👤 Buffering lead name (session not ready): ${leadName}`);
                return;
            }

            session.leadName = leadName;
            // Also update local variable reference if it matches
            if (sessionData && sessionData.callId === session.callId) {
                sessionData.leadName = leadName;
            }

            logger.info(`👤 Lead identified and set in session: ${leadName}`);
            await redis.set(`call:${currentCallId}:session`, session, 3600 * 4);
        }

        async function handleAudioSegment(event: any, ws: WebSocket) {
            const audioBuffer = Buffer.from(event.payload.audio, 'base64');
            const role = event.payload.role || event.payload.speaker || 'unknown'; // 'lead' | 'seller'

            debugLog(`[AUDIO] Received ${audioBuffer.length} bytes for role: ${role}`);

            const headerHex = audioBuffer.slice(0, 4).toString('hex');
            if (headerHex !== '1a45dfa3') {
                debugLog(`[WARNING] Unexpected header: ${headerHex}`);
            }

            try {
                const previousText = role === 'lead'
                    ? (sessionData?.lastLeadTranscription || "Transcreva o áudio.")
                    : (sessionData?.lastSellerTranscription || "Transcreva o áudio.");

                debugLog(`[WHISPER START] Transcribing ${audioBuffer.length} bytes...`);
                const text = await whisperClient.transcribe(audioBuffer, previousText);
                debugLog(`[WHISPER END] Result: '${text}'`);

                if (text && text.trim().length > 0) {
                    if (isHallucination(text)) {
                        debugLog(`[FILTER] Hallucination: ${text}`);
                        return;
                    }
                    if (shouldDiscard(text.trim(), role, sessionData ?? null)) {
                        return;
                    }

                    // 1. Dynamic Speaker Label Resolution
                    const dynamicSpeaker = event.payload.speakerName;
                    const currentLeadName = dynamicSpeaker || sessionData?.leadName || bufferedLeadName || 'Cliente';
                    const speakerLabel = role === 'seller' ? 'Você' : currentLeadName;

                    logger.info(`✨ [${speakerLabel}]: "${text}"`);
                    debugLog(`[SUCCESS] Transcription: ${text}`);

                    if (sessionData) {
                        if (role === 'lead') {
                            sessionData.lastLeadTranscription = text.slice(-200);
                        } else {
                            sessionData.lastSellerTranscription = text.slice(-200);
                        }

                        // 2. Update Session Data
                        const transcriptChunk = {
                            text,
                            speaker: speakerLabel,
                            role,
                            timestamp: Date.now(),
                            isFinal: true
                        };

                        if (!sessionData.transcript) sessionData.transcript = [];
                        sessionData.transcript.push(transcriptChunk);

                        // 3. Persist to Redis (Session)
                        if (callId) {
                            await redis.set(`call:${callId}:session`, sessionData, 3600);
                        }

                        // 4. Update DB
                        const { error: updateError } = await supabaseAdmin.from('calls').update({
                            transcript: sessionData.transcript
                        }).eq('id', callId);

                        if (updateError) {
                            logger.error({ updateError, callId }, '❌ DB UPDATE ERROR: Failed to save transcript');
                        }

                        // ============================================
                        // NEW AI LOGIC (MOVED FROM handleTranscript)
                        // Triggered by audio segment processing
                        // ============================================

                        // 2. TIMING CONTROLLERS
                        const now = Date.now();
                        const COACH_INTERVAL = 10000; // 10s
                        const SUMMARY_INTERVAL = 20000; // 20s

                        // A. SPIN Coach (Every 10s)
                        if (!sessionData.lastCoachingAt || (now - sessionData.lastCoachingAt) >= COACH_INTERVAL) {
                            // Always update timer FIRST to prevent retry storms on failure
                            sessionData.lastCoachingAt = now;
                            try {
                                logger.info(`🧠 Triggering SPIN Coach for call ${callId}`);
                                const events = await coachEngine.processTranscriptChunk(transcriptChunk, sessionData);

                                for (const aiEvent of events) {
                                    if (ws.readyState === WebSocket.OPEN) {
                                        ws.send(JSON.stringify({
                                            type: 'COACHING_MESSAGE',
                                            payload: aiEvent
                                        }));
                                    }

                                    if (aiEvent.type === 'stage_change' && aiEvent.currentStep) {
                                        sessionData.currentStep = aiEvent.currentStep;
                                    }
                                }
                            } catch (coachError: any) {
                                logger.error({ message: coachError?.message, stack: coachError?.stack }, '❌ SPIN Coach failed (non-fatal, socket stays alive)');
                                // Socket stays alive — coaching will retry on the next interval
                            }
                        }

                        // B. Live Summary (Every 20s)
                        if (!sessionData.lastSummaryAt || (now - sessionData.lastSummaryAt) >= SUMMARY_INTERVAL) {
                            // Always update timer FIRST to prevent retry storms on failure
                            sessionData.lastSummaryAt = now;
                            try {
                                logger.info(`📊 Generating Live Summary for call ${callId}`);
                                const liveSummary = await summaryAgent.generateLiveSummary(sessionData.transcript);

                                if (liveSummary) {
                                    await redis.publish(`call:${callId}:live_summary`, JSON.stringify(liveSummary));
                                }
                            } catch (summaryError: any) {
                                logger.error({ message: summaryError?.message, stack: summaryError?.stack }, '❌ Summary Agent failed (non-fatal, socket stays alive)');
                                // Socket stays alive — summary will retry on the next interval
                            }
                        }
                    }

                    // 5. Publish to Redis (Real-time Manager)
                    if (callId) {
                        await redis.publish(`call:${callId}:stream`, {
                            text,
                            speaker: speakerLabel,
                            role,
                            timestamp: Date.now()
                        });
                    }

                    ws.send(JSON.stringify({
                        type: 'transcript:chunk',
                        payload: {
                            text,
                            isFinal: true,
                            speaker: speakerLabel,
                            role
                        }
                    }));
                } else {
                    debugLog(`[SILENCE] Empty transcription`);
                }
            } catch (err: any) {
                debugLog(`[WHISPER ERROR] ${err.message}\n${err.stack}`);
                logger.error({ message: err?.message, stack: err?.stack }, `❌ [${role}] Transcription failed`);
            }
        }

        // ========================================
        // MANAGER WEBSOCKET ROUTE - WHISPER SYSTEM
        // ========================================

        fastify.get('/ws/manager', { websocket: true }, async (socket, req) => {
            logger.info('👔 Manager WebSocket connection attempt');

            const token = (req.query as any).token;
            if (!token) {
                socket.close(1008, 'Token required');
                return;
            }

            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                socket.close(1008, 'Invalid token');
                return;
            }

            // TODO: Verify user is actually a manager/has manager permissions
            // For now, all authenticated users can access

            logger.info(`✅ Manager authenticated: ${user.id}`);

            let subscribedCallId: string | null = null;
            let streamHandler: ((message: any) => void) | null = null;
            let mediaHandler: ((message: any) => void) | null = null; // NEW: For video streaming
            let liveSummaryHandler: ((message: any) => void) | null = null; // NEW: For live summaries

            socket.on('message', async (message: string) => {
                try {
                    const event = JSON.parse(message.toString());

                    switch (event.type) {
                        case 'manager:join':
                            // Manager wants to join/monitor a specific call
                            const { callId } = event.payload || {};
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

                            // Subscribe to new call's transcript stream
                            subscribedCallId = callId;
                            streamHandler = (transcriptData: any) => {
                                // Forward transcript to manager
                                socket.send(JSON.stringify({
                                    type: 'transcript:stream',
                                    payload: transcriptData
                                }));
                            };

                            await redis.subscribe(`call:${subscribedCallId}:stream`, streamHandler);

                            // NEW: Subscribe to media stream (video + audio)
                            mediaHandler = (mediaData: any) => {
                                // Forward media chunk to manager
                                socket.send(JSON.stringify({
                                    type: 'media:chunk',
                                    payload: mediaData
                                }));
                            };

                            await redis.subscribe(`call:${subscribedCallId}:media_raw`, mediaHandler);

                            // NEW: Subscribe to live summary
                            liveSummaryHandler = (summaryData: any) => {
                                socket.send(JSON.stringify({
                                    type: 'call:live_summary',
                                    payload: summaryData
                                }));
                            };
                            await redis.subscribe(`call:${subscribedCallId}:live_summary`, liveSummaryHandler);

                            // Check for cached media header and send immediately
                            const cachedHeader = await redis.get(`call:${callId}:media_header`);
                            if (cachedHeader) {
                                logger.info(`📼 Sending cached media header to manager for call ${callId}`);
                                socket.send(JSON.stringify({
                                    type: 'media:chunk', // Critical for MediaStreamPlayer
                                    payload: JSON.parse(cachedHeader)
                                }));
                            } else {
                                logger.warn(`⚠️ No media header cached for call ${callId}`);
                            }

                            logger.info(`👔 Manager ${user.id} joined call ${callId} (transcript + media)`);

                            socket.send(JSON.stringify({
                                type: 'manager:joined',
                                payload: { callId }
                            }));
                            break;

                        case 'manager:whisper':
                            // Manager sends a coaching tip/whisper to the seller
                            if (!subscribedCallId) {
                                socket.send(JSON.stringify({
                                    type: 'error',
                                    payload: { message: 'Not subscribed to any call' }
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
                                managerId: user.id,
                                timestamp: Date.now()
                            });

                            logger.info(`💬 Manager ${user.id} sent whisper to call ${subscribedCallId}`);

                            socket.send(JSON.stringify({
                                type: 'whisper:sent',
                                payload: { callId: subscribedCallId }
                            }));
                            break;

                        default:
                            logger.warn(`Unknown event type from manager: ${event.type}`);
                    }
                } catch (err: any) {
                    logger.error({ error: err }, '❌ Error handling manager message');
                }
            });

            socket.on('close', async (code, reason) => {
                logger.info({ code, reason: reason?.toString() }, '👔 Manager WS Disconnected');

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
            });
        });
    });
}
