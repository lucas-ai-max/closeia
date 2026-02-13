import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../../infrastructure/supabase/client.js';
import { redis } from '../../infrastructure/cache/redis.js';
import { logger } from '../../shared/utils/logger.js';
import { WebSocket } from 'ws';

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

// Types
export interface CallSession {
    callId: string;
    userId: string;
    scriptId: string;
    transcript: TranscriptChunk[];
    currentStep: number;
    // AI State
    lastCoachingAt?: number;
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
    if (trimmed.replace(/[^a-zA-ZÀ-ú]/g, '').length < 3) return true; // Too short
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
// Initialize Services (Singleton pattern to avoid memory leaks)
const openaiClient = new OpenAIClient();
const objectionMatcher = new ObjectionMatcher();
const successTracker = new ObjectionSuccessTracker(supabaseAdmin); // Initialize first
const coachEngine = new CoachEngine(
    new TriggerDetector(),
    objectionMatcher,
    new PromptBuilder(),
    openaiClient,
    new ResponseParser(),
    successTracker // Injected
);
const postCallAnalyzer = new PostCallAnalyzer(openaiClient);
const whisperClient = new WhisperClient();

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
                const event = JSON.parse(message.toString());

                switch (event.type) {
                    case 'call:start':
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
                                isHeader: event.payload.isHeader
                            };

                            // Cache header if present
                            if (event.payload.isHeader) {
                                await redis.set(
                                    `call:${callId}:media_header`,
                                    payload,
                                    14400 // 4 hours TTL
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

        // --- Handlers ---

        async function handleCallStart(event: any, userId: string, ws: WebSocket) {
            logger.info({ payload: event.payload }, '📞 handleCallStart initiated');
            const { scriptId, platform } = event.payload;

            const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('organization_id').eq('id', userId).single();

            if (profileError || !profile) {
                logger.error({ profileError, userId }, '❌ Profile not found or error');
                return ws.close(1011, 'Profile not found');
            }

            logger.info({ organizationId: profile.organization_id }, '✅ Profile found');

            const { data: call, error: insertError } = await supabaseAdmin.from('calls')
                .insert({
                    user_id: userId,
                    organization_id: profile.organization_id,
                    script_id: scriptId,
                    platform: platform || 'OTHER',
                    status: 'ACTIVE',
                    started_at: new Date().toISOString(),
                })
                .select().single();

            if (insertError) {
                logger.error({ insertError }, '❌ ERRO AO CRIAR CHAMADA NO DB:');
                // Enviar erro de volta para a extensão para sabermos o que houve
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {
                        message: 'Failed to create call in DB',
                        details: insertError
                    }
                }));
                return;
            }

            if (!call) {
                logger.error('❌ Call created but returned null data');
                return;
            }

            logger.info(`✅ Call created in DB: ${call.id}`);
            callId = call.id;

            const session: CallSession = {
                callId: call.id,
                userId: userId,
                scriptId: scriptId,
                transcript: [],
                currentStep: 1,
                lastCoachingAt: 0,
                startupTime: Date.now()
            };

            await redis.set(`call:${call.id}`, session, 3600 * 4);
            sessionData = session;

            // Apply buffered leadName if it arrived before session was created
            if (bufferedLeadName) {
                sessionData.leadName = bufferedLeadName;
                logger.info(`👤 Applying buffered lead name: ${bufferedLeadName}`);
                await redis.set(`call:${call.id}`, sessionData, 3600 * 4);
                bufferedLeadName = null;
            }

            ws.send(JSON.stringify({ type: 'call:started', payload: { callId: call.id } }));

            // Subscribe to manager whisper commands
            commandHandler = (command: any) => {
                if (command.type === 'whisper') {
                    // Forward whisper to extension
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
            };

            await redis.subscribe(`call:${call.id}:commands`, commandHandler);
            logger.info(`🎧 Subscribed to commands for call ${call.id}`);
        }

        async function handleTranscript(event: any, currentCallId: string | null, ws: WebSocket) {
            if (!currentCallId || !sessionData) {
                // Try reload from redis if local var missing (reconnection scenario)
                if (currentCallId) {
                    sessionData = await redis.get(`call:${currentCallId}`);
                }
                if (!sessionData) return;
            }

            const chunk: TranscriptChunk = event.payload;

            // 1. Update Session
            sessionData.transcript.push(chunk);

            // 2. Process with AI Engine
            const events = await coachEngine.processTranscriptChunk(chunk, sessionData);

            // 3. Send AI Events to Client
            for (const aiEvent of events) {
                ws.send(JSON.stringify({
                    type: 'coach:message',
                    payload: aiEvent
                }));

                // Update session based on event (e.g. lastCoachingAt)
                sessionData.lastCoachingAt = Date.now();
                if (aiEvent.type === 'stage_change' && aiEvent.currentStep) {
                    sessionData.currentStep = aiEvent.currentStep;
                }
            }

            // 4. Persist State
            await redis.set(`call:${currentCallId}`, sessionData, 3600 * 4);
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
            await redis.del(`call:${currentCallId}`);
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
            await redis.set(`call:${currentCallId}`, session, 3600 * 4);
        }

        async function handleAudioSegment(event: any, ws: WebSocket) {
            const audioBuffer = Buffer.from(event.payload.audio, 'base64');
            const role = event.payload.role || event.payload.speaker || 'unknown'; // 'lead' | 'seller'

            logger.info(`📦 [${role}] Audio segment: ${audioBuffer.length} bytes`);

            const headerHex = audioBuffer.slice(0, 4).toString('hex');
            if (headerHex !== '1a45dfa3') {
                logger.warn(`⚠️ Unexpected header: ${headerHex}`);
            }

            try {
                const previousText = role === 'lead'
                    ? (sessionData?.lastLeadTranscription || "Transcreva o áudio.")
                    : (sessionData?.lastSellerTranscription || "Transcreva o áudio.");

                const text = await whisperClient.transcribe(audioBuffer, previousText);

                if (text && text.trim().length > 0) {
                    if (isHallucination(text)) {
                        logger.warn(`🚫 Hallucination filtered: "${text}"`);
                        return;
                    }
                    if (shouldDiscard(text.trim(), role, sessionData ?? null)) {
                        return;
                    }

                    if (sessionData) {
                        if (role === 'lead') {
                            sessionData.lastLeadTranscription = text.slice(-200);
                        } else {
                            sessionData.lastSellerTranscription = text.slice(-200);
                        }
                    }

                    const speakerLabel = role === 'seller'
                        ? 'Você'
                        : (sessionData?.leadName || 'Cliente');

                    if (role === 'lead' && speakerLabel === 'Cliente') {
                        logger.debug(`🔍 Speaker is 'Cliente'. sessionData.leadName is: ${sessionData?.leadName}. Buffered was: ${bufferedLeadName}`);
                    }

                    logger.info(`✨ [${speakerLabel}]: "${text}"`);

                    // Store transcript chunk in session for post-call analysis
                    const transcriptChunk: TranscriptChunk = {
                        text,
                        speaker: role as 'seller' | 'lead',
                        timestamp: Date.now()
                    };

                    if (sessionData) {
                        sessionData.transcript.push(transcriptChunk);

                        // Trigger AI coaching engine
                        try {
                            const coachEvents = await coachEngine.processTranscriptChunk(transcriptChunk, sessionData);
                            for (const aiEvent of coachEvents) {
                                ws.send(JSON.stringify({
                                    type: 'coach:message',
                                    payload: aiEvent
                                }));
                                sessionData.lastCoachingAt = Date.now();
                                if (aiEvent.type === 'stage_change' && aiEvent.currentStep) {
                                    sessionData.currentStep = aiEvent.currentStep;
                                }
                            }
                        } catch (coachErr: any) {
                            logger.error({ message: coachErr?.message }, 'Coaching engine error');
                        }

                        // Persist updated session
                        await redis.set(`call:${callId}`, sessionData, 3600 * 4);
                    }

                    // Publish transcript to Redis for manager monitoring
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
                    logger.debug('⏭️ Empty transcription (silence)');
                }
            } catch (err: any) {
                logger.error({ message: err?.message, stack: err?.stack }, `❌ [${role}] Transcription failed`);
            }
        }
    });

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

                        // Check for cached media header and send immediately
                        const cachedHeader = await redis.get(`call:${callId}:media_header`);
                        if (cachedHeader) {
                            logger.info(`📼 Sending cached media header to manager for call ${callId}`);
                            socket.send(JSON.stringify({
                                type: 'media:chunk',
                                payload: cachedHeader
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
        });

        socket.on('error', (err) => {
            logger.error({ err }, '👔 Manager WS Error');
        });
    });
}
