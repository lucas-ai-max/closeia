import { authService } from '../services/auth';
import { connect, send, onWsConnect, onWsMessage, onWsClose, onWsPlanRequired } from '../services/websocket';
import { edgeCoach } from '../services/edge-coach';
import type { CachedObjection } from '../stores/coaching-store';
import { dashboardUrl, apiBaseUrl } from '../config/env';

// State
console.log('Background Service Worker Starting...');

// Initialize Edge Coach
edgeCoach.initialize().then(() => {
    console.log('✅ Edge coach initialized');
}).catch(err => {
    console.error('❌ Edge coach initialization failed:', err);
});

let currentLeadName = '';
let micIsMuted = false; // Track mic mute state
let lastCallStartParams: { platform: string; scriptId: string | null; coachId?: string | null; leadName?: string; externalId?: string | null } | null = null;
let selectedCoachId: string | null = null;
let cachedObjections: CachedObjection[] = [];

let isCallConfirmed = false;
let lastLiveKitCallId: string | null = null;
let audioSegmentBuffer: any[] = [];
let callStartRetryIntervalId: ReturnType<typeof setInterval> | null = null;

// Re-enviar dados iniciais quando o WebSocket reconectar (delay para backend estar pronto)
onWsConnect(() => {
    if (callStartRetryIntervalId) {
        clearInterval(callStartRetryIntervalId);
        callStartRetryIntervalId = null;
    }
    const delayMs = 1500;
    setTimeout(() => {
        if (lastCallStartParams) {
            console.log('🔄 Re-sending call:start on reconnect (after', delayMs, 'ms):', lastCallStartParams);
            send('call:start', lastCallStartParams);
        }
        if (currentLeadName) {
            console.log('👤 Re-sending lead name on reconnect:', currentLeadName);
            send('call:participants', {
                leadName: currentLeadName,
                allParticipants: []
            });
        }
    }, delayMs);
});

onWsClose(() => {
    isCallConfirmed = false;
});

onWsPlanRequired(async () => {
    const state = await getState();
    if (state.currentTabId) {
        chrome.tabs.sendMessage(state.currentTabId, {
            type: 'PLAN_REQUIRED',
        }).catch(() => { });
    }
    chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'PLAN_REQUIRED' }).catch(() => { });
});

// Listen for messages from WebSocket
onWsMessage(async (data: any) => {
        if (data.type === 'call:started') {
        const callId = data.payload?.callId as string | undefined;
        console.log('✅ Call started confirmed by backend. CallId:', callId);
        console.log('🎬 Requesting LiveKit token for room:', callId);
        isCallConfirmed = true;
        if (callStartRetryIntervalId) {
            clearInterval(callStartRetryIntervalId);
            callStartRetryIntervalId = null;
        }

        // Flush buffered audio segments
        if (audioSegmentBuffer.length > 0) {
            console.log(`Open floodgates: Sending ${audioSegmentBuffer.length} buffered audio segments...`);
            for (const segment of audioSegmentBuffer) {
                send('audio:segment', segment);
            }
            audioSegmentBuffer = [];
        }

        // Start LiveKit publish in offscreen (roomName = callId) so manager can watch via dashboard (only once per callId to avoid disconnect/reconnect)
        if (callId && callId !== lastLiveKitCallId) {
            lastLiveKitCallId = callId;
            try {
                const tokenUrl = `${dashboardUrl}/api/livekit/token`;
                console.log('🎬 Requesting LiveKit token for room:', callId, 'url:', tokenUrl);
                const accessToken = await authService.getFreshToken();
                const session = await authService.getSession();
                const userId = session?.user?.id ?? 'unknown';
                const res = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        roomName: callId,
                        identity: `seller_${userId}`,
                        role: 'publisher',
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    console.warn('⚠️ LiveKit token failed:', (err as { error?: string }).error ?? res.statusText);
                } else {
                    const data = await res.json() as { token?: string; serverUrl?: string };
                    const { token, serverUrl } = data;
                    if (token && serverUrl) {
                        console.log('✅ LiveKit token received');
                        console.log('✅ Sending START_LIVEKIT_PUBLISH to offscreen (video will appear in dashboard when published)');
                        chrome.runtime.sendMessage({
                            type: 'START_LIVEKIT_PUBLISH',
                            token,
                            serverUrl,
                        }).catch((e) => console.warn('⚠️ Send START_LIVEKIT_PUBLISH failed:', e));
                    } else {
                        console.warn('⚠️ LiveKit token missing token or serverUrl. No video in dashboard until fixed.');
                        console.warn('   → Set NEXT_PUBLIC_LIVEKIT_URL in the dashboard (Vercel) and redeploy.');
                    }
                }
            } catch (error) {
                console.error('❌ LiveKit token/publish setup:', error);
            }
        }

        // When call starts, fetch and cache objections for edge processing
        const { scriptId } = lastCallStartParams || {};
        if (scriptId) {
            try {
                const token = await authService.getFreshToken();
                const response = await fetch(`${apiBaseUrl}/api/scripts/${scriptId}/objections`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const objections = await response.json();
                    cachedObjections = objections;
                    console.log(`📦 Cached ${objections.length} objections for edge processing`);
                }
            } catch {
                // Script or API may not exist; objections optional for edge coach
            }
        }
    }

    if (data.type === 'transcript:chunk' || data.type === 'transcript:interim') {
        const payload = data.payload || {};
        const text = payload.text || '';
        const speaker = payload.speaker || payload.role;
        const isFinal = data.type === 'transcript:chunk' ? (payload.isFinal ?? true) : false;

        console.log(`📝 Received ${data.type}:`, text.substring(0, 50), 'speaker:', speaker, 'isFinal:', isFinal);

        if (isFinal && (speaker === 'lead' || speaker === 'Cliente') && cachedObjections.length > 0) {
            try {
                const localResult = await edgeCoach.processTranscript(text, speaker, cachedObjections);

                if (localResult) {
                    const state = await getState();
                    if (state.currentTabId) {
                        chrome.tabs.sendMessage(state.currentTabId, {
                            type: 'COACHING_MESSAGE',
                            data: {
                                type: 'objection',
                                title: 'OBJEÇÃO DETECTADA',
                                description: localResult.coachingTip,
                                metadata: localResult
                            }
                        }).catch(() => { });
                    }
                    console.log('⚡ LOCAL COACHING DELIVERED');
                }
            } catch (error) {
                console.error('❌ Edge processing error:', error);
            }
        }

        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'TRANSCRIPT_RESULT',
                data: {
                    text,
                    isFinal,
                    timestamp: Date.now(),
                    speaker: payload.speaker ?? (payload.role === 'seller' ? 'Você' : 'Cliente'),
                    role: payload.role
                }
            }).catch((err) => {
                console.warn('Failed to send transcript to content script:', err.message);
            });
        }
    }

    // Handle coaching messages from backend (SPIN Coach sends 'COACHING_MESSAGE', legacy sends 'coach:message')
    if (data.type === 'coach:message' || data.type === 'COACHING_MESSAGE') {
        console.log('📡 BACKEND COACHING:', JSON.stringify(data.payload)?.substring(0, 80));
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'COACHING_MESSAGE',
                data: data.payload
            }).catch(() => { });
        }
    }

    // Handle manager whispers
    if (data.type === 'coach:whisper') {
        console.log('👔 MANAGER WHISPER:', data.payload?.content?.substring(0, 50));
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'MANAGER_WHISPER',
                data: {
                    type: 'manager-whisper',
                    source: 'manager',
                    content: data.payload.content,
                    urgency: data.payload.urgency || 'normal',
                    timestamp: data.payload.timestamp
                }
            }).catch(() => { });
        }
    }

    // Handle streaming coach tokens from backend
    if (data.type === 'coach:token') {
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'COACH_TOKEN',
                data: { token: data.payload?.token, timestamp: data.payload?.timestamp }
            }).catch(() => { });
        }
    }

    if (data.type === 'coach:done') {
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'COACH_DONE',
                data: { timestamp: data.payload?.timestamp }
            }).catch(() => { });
        }
    }

    if (data.type === 'coach:thinking') {
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'COACH_THINKING',
                data: { timestamp: data.payload?.timestamp }
            }).catch(() => { });
        }
    }

    if (data.type === 'coach:idle') {
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'COACH_IDLE',
                data: { timestamp: data.payload?.timestamp }
            }).catch(() => { });
        }
    }

    // Handle transcription errors from backend (Deepgram connection failure etc.)
    if (data.type === 'transcription:error') {
        console.error('❌ TRANSCRIPTION ERROR:', data.payload?.message);
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'TRANSCRIPTION_ERROR',
                data: { message: data.payload?.message || 'Transcription service unavailable' }
            }).catch(() => { });
        }
    }

    // Handle objection:detected from backend SPIN coach
    if (data.type === 'objection:detected') {
        console.log('⚡ OBJECTION DETECTED:', data.payload?.objection?.substring(0, 50));
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'OBJECTION_DETECTED',
                data: {
                    objection: data.payload.objection,
                    phase: data.payload.phase,
                    tip: data.payload.tip
                }
            }).catch(() => { });
        }
    }

    // Handle errors from backend
    if (data.type === 'error') {
        console.error('❌ BACKEND ERROR:', data.payload);
        const state = await getState();
        const errorCode = data.payload?.code;

        // Handle specific plan limit errors
        if (errorCode === 'LIMIT_REACHED' || errorCode === 'CALL_HOURS_LIMIT_REACHED') {
            console.warn('🚫 Call hours limit reached');
            if (state.currentTabId) {
                chrome.tabs.sendMessage(state.currentTabId, {
                    type: 'PLAN_LIMIT_REACHED',
                    limitType: 'hours',
                    message: data.payload.message,
                    plan: data.payload.plan,
                    currentUsage: data.payload.currentUsage,
                    maxAllowed: data.payload.maxAllowed,
                }).catch(() => { });
            }
            chrome.runtime.sendMessage({
                type: 'STATUS_UPDATE',
                status: 'LIMIT_REACHED',
                error: data.payload.message,
            }).catch(() => { });
            return;
        }

        if (errorCode === 'NO_PLAN' || errorCode === 'NO_ACTIVE_PLAN') {
            console.warn('🚫 No active plan');
            if (state.currentTabId) {
                chrome.tabs.sendMessage(state.currentTabId, {
                    type: 'PLAN_REQUIRED',
                    message: data.payload.message,
                }).catch(() => { });
            }
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'PLAN_REQUIRED' }).catch(() => { });
            return;
        }

        if (errorCode === 'FEATURE_NOT_AVAILABLE') {
            console.warn('🚫 Feature not available:', data.payload.feature);
            if (state.currentTabId) {
                chrome.tabs.sendMessage(state.currentTabId, {
                    type: 'FEATURE_BLOCKED',
                    feature: data.payload.feature,
                    message: data.payload.message,
                    requiredPlan: data.payload.requiredPlan,
                }).catch(() => { });
            }
            return;
        }

        // Generic error notification
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'STATUS_UPDATE',
                status: 'ERROR',
                error: data.payload.message || 'Erro no servidor'
            }).catch(() => { });
        }
    }
});

// State Management Helpers
async function getState() {
    const data = await chrome.storage.session.get(['streamId', 'currentTabId', 'isRecording', 'recordingStartedAt']);
    return {
        streamId: data.streamId as string | null,
        currentTabId: data.currentTabId as number | null,
        isRecording: !!data.isRecording,
        recordingStartedAt: (data.recordingStartedAt as number) || null
    };
}

async function setState(updates: { streamId?: string | null, currentTabId?: number | null, isRecording?: boolean; recordingStartedAt?: number | null }) {
    await chrome.storage.session.set(updates);
}

let offscreenDocument: string | null = null;

// Icon Click Handler
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;

    console.log('Extension icon clicked (v2 - lazy capture)...');
    // We only save the tab ID. validation and capture will happen flow starts.
    await setState({ currentTabId: tab.id });

    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch((err) => {
        console.log('Content script not injected yet:', err);
    });
});

let isProcessing = false;

// Listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`📩 Background received message: ${message.type}`, { senderId: sender.id, senderUrl: sender.url });

    // Handle async operations
    const handleAsync = async () => {
        if (message.type === 'START_CAPTURE') {
            selectedCoachId = message.coachId || null;
            startCapture(message.tabId || sender.tab?.id);
        } else if (message.type === 'STOP_CAPTURE') {
            const result = message.result as 'CONVERTED' | 'LOST' | 'FOLLOW_UP' | 'UNKNOWN' | undefined;
            stopCapture(result);
        } else if (message.type === 'TRY_END_CALL') {
            send('call:end', { callId: lastLiveKitCallId ?? undefined });
        } else if (message.type === 'OFFSCREEN_READY') {
            console.log('✅ [Event]: OFFSCREEN_READY - Generating fresh StreamID...');
            handleOffscreenReady();
        } else if (message.type === 'OFFSCREEN_LOG') {
            console.log('🖥️ [Offscreen]:', message.message);
        } else if (message.type === 'RECORDING_STARTED') {
            const micAvailable = !!message.micAvailable;
            console.log('🎙️ Recording started, microfone:', micAvailable ? 'permitido' : 'não disponível');
            getState().then(state => {
                if (state.currentTabId) {
                    chrome.tabs.sendMessage(state.currentTabId, {
                        type: 'STATUS_UPDATE',
                        status: 'RECORDING',
                        micAvailable
                    }).catch(() => { });
                }
            });
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: 'RECORDING', micAvailable }).catch(() => { });
        } else if (message.type === 'AUDIO_CHUNK') {
            // Legacy handler - kept for compatibility
            send('audio:chunk', { audio: message.data });
        } else if (message.type === 'AUDIO_SEGMENT') {
            const role = message.role || message.speaker || 'unknown';
            console.log(`📤 Sending audio segment: ${message.size} bytes, role: ${role}`);

            const segmentPayload = {
                audio: message.data,
                size: message.size,
                role,
                speakerName: message.speakerName // PASS THROUGH DYNAMIC SPEAKER NAME
            };

            if (isCallConfirmed) {
                send('audio:segment', segmentPayload);
            } else {
                console.log('⏳ Buffering audio segment (call not confirmed yet)...');
                audioSegmentBuffer.push(segmentPayload);
            }

        } else if (message.type === 'MEDIA_STREAM_CHUNK') {
            send('media:stream', {
                chunk: message.data,
                size: message.size,
                timestamp: message.timestamp,
                isHeader: !!message.isHeader
            });
        } else if (message.type === 'PARTICIPANT_INFO') {
            currentLeadName = message.leadName || '';
            console.log('👤 Lead name:', currentLeadName);
            send('call:participants', {
                leadName: message.leadName || 'Lead',
                selfName: message.selfName,
                allParticipants: message.allParticipants || []
            });
        } else if (message.type === 'MIC_STATE') {
            micIsMuted = message.muted;
            console.log('🎤 Mic state:', message.muted ? 'MUTED' : 'ACTIVE');

            // Use storage for robust communication with offscreen
            chrome.storage.local.set({ micMuted: message.muted }).catch(() => { });

            // Fallback: still try to send message just in case, but storage is primary
            chrome.runtime.sendMessage({ type: 'MIC_MUTE_STATE', muted: message.muted }).catch(() => { });
        } else if (message.type === 'TRANSCRIPT_RESULT') {
            send('transcript:chunk', message.data);
            getState().then(state => {
                if (state.currentTabId) {
                    chrome.tabs.sendMessage(state.currentTabId, {
                        type: 'TRANSCRIPT_RESULT',
                        data: message.data
                    }).catch((err) => {
                        console.error('❌ Failed to send transcript to sidebar:', err);
                    });
                }
            });
        } else if (message.type === 'QUERY_ACTIVE_SPEAKER') {
            let responded = false;
            const safeSend = (r: { speakerName: string | null }) => {
                if (responded) return;
                responded = true;
                try { sendResponse(r); } catch (_) { /* channel may be closed */ }
            };
            const timeout = setTimeout(() => safeSend({ speakerName: null }), 2000);
            try {
                const state = await getState();
                if (state.currentTabId) {
                    const response = await chrome.tabs.sendMessage(state.currentTabId, { type: 'GET_ACTIVE_SPEAKER' });
                    clearTimeout(timeout);
                    safeSend({ speakerName: response?.activeSpeaker ?? null });
                } else {
                    clearTimeout(timeout);
                    safeSend({ speakerName: null });
                }
            } catch (err: unknown) {
                clearTimeout(timeout);
                const msg = err instanceof Error ? err.message : String(err);
                if (!msg.includes('Receiving end does not exist') && !msg.includes('Could not establish connection')) {
                    console.warn('Failed to query active speaker from content script:', err);
                }
                safeSend({ speakerName: null });
            }
        }
    };

    // For QUERY_ACTIVE_SPEAKER, we actually return a response, so we must return true
    if (message.type === 'QUERY_ACTIVE_SPEAKER') {
        handleAsync();
        return true;
    }

    if (message.type === 'GET_STATUS') {
        getState().then(state => {
            const status = state.isRecording ? 'RECORDING' : 'PROGRAMMED';
            try { sendResponse({ status, recordingStartedAt: state.recordingStartedAt ?? null }); } catch (_) { /* channel may be closed */ }
        }).catch(() => {
            try { sendResponse({ status: 'PROGRAMMED', recordingStartedAt: null }); } catch (_) { }
        });
        return true;
    }

    if (message.type === 'GET_SESSION') {
        const reply = (session: any) => {
            try { sendResponse({ session }); } catch (_) { /* channel may be closed */ }
            chrome.runtime.sendMessage({ type: 'SESSION_RESULT', session }).catch(() => {});
        };
        authService.getSession().then(reply).catch(() => reply(null));
        return true;
    }

    if (message.type === 'TOGGLE_SUGGESTIONS_PANEL') {
        authService.getSession().then(session => {
            if (!session) return;
            const meetZoomPatterns = ['*://meet.google.com/*', 'https://*.zoom.us/*', 'https://app.zoom.us/*'];
            chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                const url = activeTab?.url ?? '';
                const isMeetOrZoom = url.includes('meet.google.com') || url.includes('zoom.us');
                if (activeTab?.id && isMeetOrZoom) {
                    chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SIDEBAR_TRUSTED' }).catch(() => {});
                    return;
                }
                chrome.tabs.query({ url: meetZoomPatterns }, (tabs) => {
                    if (tabs.length === 0) return;
                    const tab = tabs.find(t => t.id === activeTab?.id) ?? tabs[0];
                    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR_TRUSTED' }).catch(() => {});
                });
            });
        }).catch(() => {});
        return false;
    }

    // For all other messages, we just process them without keeping the channel open
    handleAsync();
    return false;
});

async function handleOffscreenReady() {
    // This handler stays empty or just logs.
    // The main flow in startCapture waits for the 'OFFSCREEN_READY' message via Promise.
    console.log('✅ [Event]: OFFSCREEN_READY signal received.');
}

async function startCapture(explicitTabId?: number) {
    if (isProcessing) {
        console.warn('⚠️ startCapture ignored: already processing');
        return;
    }

    // Capture tab ID from sender if provided (fixes issue when background loses state but sidebar is active)
    if (explicitTabId) {
        console.log(`📌 Using explicit tab ID from sender: ${explicitTabId}`);
        await setState({ currentTabId: explicitTabId });
    }

    const state = await getState();
    if (state.isRecording) {
        console.log('⚠️ startCapture ignored: already recording');
        return;
    }

    // Validation
    if (!state.currentTabId) {
        console.error('❌ No currentTabId available. Icon must be clicked first.');
        broadcastStatus('ERROR');
        return;
    }

    isProcessing = true;
    try {
        const tab = await chrome.tabs.get(state.currentTabId);
        console.log('🚀 Initiating capture flow for:', tab.url);

        // 1. Generate StreamID IMMEDIATELY (must happen close to user gesture before it expires)
        console.log('🎥 Requesting MediaStreamId for tab:', state.currentTabId);
        const streamId = await new Promise<string>((resolve, reject) => {
            chrome.tabCapture.getMediaStreamId({ targetTabId: state.currentTabId! }, (id) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (!id) {
                    reject(new Error('Got empty streamId'));
                } else {
                    resolve(id);
                }
            });
        });
        console.log('✅ Fresh StreamID generated:', streamId);

        // 2. Update Status and recording start time for popup timer
        await setState({ isRecording: true, recordingStartedAt: Date.now() });
        broadcastStatus('RECORDING');

        // RESET STATE
        isCallConfirmed = false;
        audioSegmentBuffer = [];

        // 3. Connect WebSocket
        const session = await authService.getSession() as any;

        if (!session?.access_token) {
            console.error('❌ No access token available! User may need to log in.');
            broadcastStatus('ERROR');
            await setState({ isRecording: false });
            isProcessing = false;
            return;
        }

        console.log('🔌 Connecting WebSocket...');
        await connect();

        // 4. Ensure Offscreen Document Exists & Wait for Ready
        const offscreenPath = 'offscreen/index.html';
        const offscreenUrl = chrome.runtime.getURL(offscreenPath);
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
            documentUrls: [offscreenUrl]
        });

        if (existingContexts.length === 0) {
            // Register listener BEFORE createDocument so we don't miss OFFSCREEN_READY (race)
            const readyPromise = new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    chrome.runtime.onMessage.removeListener(listener);
                    reject(new Error('Timeout waiting for OFFSCREEN_READY'));
                }, 10000);
                const listener = (msg: any) => {
                    if (msg.type === 'OFFSCREEN_READY') {
                        console.log('✅ OFFSCREEN_READY received (Promise resolved)');
                        chrome.runtime.onMessage.removeListener(listener);
                        clearTimeout(timeout);
                        resolve();
                    }
                };
                chrome.runtime.onMessage.addListener(listener);
            });

            console.log('Creating offscreen document...', offscreenUrl);
            try {
                await chrome.offscreen.createDocument({
                    url: offscreenUrl,
                    reasons: ['USER_MEDIA' as chrome.offscreen.Reason, 'AUDIO_PLAYBACK' as chrome.offscreen.Reason],
                    justification: 'Recording tab audio for real-time transcription'
                });
            } catch (err: any) {
                if (err.message.includes('Only a single offscreen')) {
                    console.log('✅ Offscreen document already exists (caught error)');
                } else {
                    throw err;
                }
            }

            console.log('⏳ Waiting for OFFSCREEN_READY...');
            await readyPromise;
        } else {
            console.log('✅ Offscreen document already exists');
        }
        offscreenDocument = offscreenPath;

        // 5. Send INIT_RECORDING Immediately
        console.log('📤 Sending INIT_RECORDING to offscreen...');
        await chrome.runtime.sendMessage({
            type: 'INIT_RECORDING',
            streamId: streamId
        });

        // Send initial mic mute state to offscreen
        console.log('📤 Sending initial mic state to offscreen:', micIsMuted ? 'MUTED' : 'ACTIVE');
        await chrome.runtime.sendMessage({
            type: 'MIC_MUTE_STATE',
            muted: micIsMuted
        });

        // 6. Send Call Start Metadata (re-fetch tab so URL is current for external_id / re-record)
        if (session?.access_token) {
            const freshTab = await chrome.tabs.get(state.currentTabId!).catch(() => tab);
            const url = freshTab?.url ?? tab?.url ?? '';
            const meetIdMatch = url.match(/meet\.google\.com\/([a-z0-9-]+)/);
            const externalId = meetIdMatch ? meetIdMatch[1] : null;
            if (!externalId && (url?.includes('meet.google.com') || tab?.url?.includes('meet.google.com'))) {
                console.warn('⚠️ externalId is null but tab has Meet URL — re-record may create new call. url=', url?.slice(0, 80));
            }

            lastCallStartParams = {
                platform: urlToPlatform(url),
                scriptId: null, // Backend resolves to first org script when null
                coachId: selectedCoachId || null,
                leadName: currentLeadName,
                externalId: externalId
            };

            console.log('📤 Sending call:start (externalId for re-record):', lastCallStartParams);
            send('call:start', lastCallStartParams);

            const maxAttempts = 10;
            const retryIntervalMs = 5000;
            let attempts = 0;
            if (callStartRetryIntervalId) clearInterval(callStartRetryIntervalId);
            callStartRetryIntervalId = setInterval(() => {
                if (isCallConfirmed) {
                    if (callStartRetryIntervalId) {
                        clearInterval(callStartRetryIntervalId);
                        callStartRetryIntervalId = null;
                    }
                    return;
                }
                getState().then(currentState => {
                    if (!currentState.isRecording) {
                        if (callStartRetryIntervalId) {
                            clearInterval(callStartRetryIntervalId);
                            callStartRetryIntervalId = null;
                        }
                        return;
                    }
                });
                attempts++;
                if (attempts >= maxAttempts) {
                    console.error('❌ Call start failed after', maxAttempts, 'attempts (backend timeout)');
                    if (callStartRetryIntervalId) {
                        clearInterval(callStartRetryIntervalId);
                        callStartRetryIntervalId = null;
                    }
                    broadcastStatus('ERROR');
                    return;
                }
                console.log(`🔄 Retrying call:start (attempt ${attempts}/${maxAttempts})...`);
                if (lastCallStartParams) send('call:start', lastCallStartParams);
            }, retryIntervalMs);
        }

    } catch (err: any) {
        console.error('❌ startCapture failed:', err);

        if (err.message && err.message.includes('Extension has not been invoked')) {
            broadcastStatus('PERMISSION_REQUIRED');
        } else {
            broadcastStatus('ERROR');
        }

        await setState({ isRecording: false, recordingStartedAt: null });

        // Clean up offscreen document directly (cannot call stopCapture because isProcessing is true)
        if (offscreenDocument) {
            try {
                chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {});
                await chrome.offscreen.closeDocument();
            } catch (_) { /* may already be closed */ }
            offscreenDocument = null;
        }
    } finally {
        isProcessing = false;
    }
}

async function stopCapture(result?: 'CONVERTED' | 'LOST' | 'FOLLOW_UP' | 'UNKNOWN') {
    if (isProcessing) {
        console.warn('⚠️ stopCapture ignored: already processing');
        return;
    }

    const state = await getState();
    if (!state.isRecording) {
        console.log('⚠️ stopCapture ignored: not currently recording');
        return;
    }

    isProcessing = true;
    console.log('⏹️ Stopping capture...', result ? `result: ${result}` : '');

    // Clear retry interval and buffered state to prevent phantom call:start
    if (callStartRetryIntervalId) {
        clearInterval(callStartRetryIntervalId);
        callStartRetryIntervalId = null;
    }
    lastCallStartParams = null;
    selectedCoachId = null;
    audioSegmentBuffer = [];
    isCallConfirmed = false;

    try {
        chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {
            console.log('Offscreen not reachable (already closed?)');
        });

        if (offscreenDocument) {
            await chrome.offscreen.closeDocument();
            offscreenDocument = null;
        }

        await setState({ isRecording: false, recordingStartedAt: null });
        const callIdToEnd = lastLiveKitCallId;
        lastLiveKitCallId = null;
        broadcastStatus('PROGRAMMED');
        send('call:end', { callId: callIdToEnd ?? undefined, result: result ?? undefined });
    } catch (err) {
        console.error('❌ stopCapture failed:', err);
    } finally {
        isProcessing = false;
    }
}

async function broadcastStatus(status: string) {
    const state = await getState();
    console.log('Broadcasting status:', status);

    if (state.currentTabId) {
        chrome.tabs.sendMessage(state.currentTabId, {
            type: 'STATUS_UPDATE',
            status
        }).catch(() => { });
    }
    chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status }).catch(() => { });
}

function urlToPlatform(url?: string): string {
    if (!url) return 'OTHER';
    if (url.includes('meet.google.com')) return 'GOOGLE_MEET';
    if (url.includes('zoom.us')) return 'ZOOM_WEB';
    return 'OTHER';
}
