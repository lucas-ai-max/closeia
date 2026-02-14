import { authService } from '../services/auth';
import { connect, send, onWsConnect, onWsMessage } from '../services/websocket';
import { edgeCoach } from '../services/edge-coach';
import type { CachedObjection } from '../stores/coaching-store';

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
let lastCallStartParams: { platform: string, scriptId: string } | null = null;
let cachedObjections: CachedObjection[] = [];

let isCallConfirmed = false;
let audioSegmentBuffer: any[] = [];

// Re-enviar dados iniciais quando o WebSocket reconectar
onWsConnect(() => {
    // 1. Re-send call:start if we were recording
    if (lastCallStartParams) {
        console.log('🔄 Re-sending call:start on reconnect:', lastCallStartParams);
        send('call:start', lastCallStartParams);
    }

    // 2. Re-send participants
    if (currentLeadName) {
        console.log('👤 Re-sending lead name on reconnect:', currentLeadName);
        send('call:participants', {
            leadName: currentLeadName,
            allParticipants: []
        });
    }
});

// Listen for messages from WebSocket
onWsMessage(async (data: any) => {
    if (data.type === 'call:started') {
        console.log('✅ Call started confirmed by backend. CallId:', data.payload?.callId);
        isCallConfirmed = true;

        // Flush buffered audio segments
        if (audioSegmentBuffer.length > 0) {
            console.log(`Open floodgates: Sending ${audioSegmentBuffer.length} buffered audio segments...`);
            for (const segment of audioSegmentBuffer) {
                send('audio:segment', segment);
            }
            audioSegmentBuffer = [];
        }

        // When call starts, fetch and cache objections for edge processing
        const { scriptId } = lastCallStartParams || {};
        if (scriptId) {
            try {
                const token = await authService.getFreshToken();
                const response = await fetch(`http://localhost:3001/api/scripts/${scriptId}/objections`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const objections = await response.json();
                    cachedObjections = objections;
                    console.log(`📦 Cached ${objections.length} objections for edge processing`);
                } else {
                    console.warn('⚠️ Failed to fetch objections for caching');
                }
            } catch (error) {
                console.error('❌ Error caching objections:', error);
            }
        }
    }

    if (data.type === 'transcript:chunk') {
        const payload = data.payload || {};
        const text = payload.text || '';
        const speaker = payload.speaker || payload.role;

        console.log('📝 Received transcript:', text.substring(0, 50), 'speaker:', speaker);

        // NEW: Try edge processing first for lead objections
        if ((speaker === 'lead' || speaker === 'Cliente') && cachedObjections.length > 0) {
            try {
                const localResult = await edgeCoach.processTranscript(text, speaker, cachedObjections);

                if (localResult) {
                    // Local match successful! Send card directly to sidebar
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

        // Forward transcript to sidebar (for display)
        const state = await getState();
        if (state.currentTabId) {
            chrome.tabs.sendMessage(state.currentTabId, {
                type: 'TRANSCRIPT_RESULT',
                data: {
                    text,
                    isFinal: payload.isFinal ?? true,
                    timestamp: Date.now(),
                    speaker: payload.speaker ?? (payload.role === 'seller' ? 'Você' : 'Cliente'),
                    role: payload.role
                }
            }).catch((err) => {
                console.warn('Failed to send transcript to content script:', err.message);
            });
        }
    }

    // Handle coaching messages from backend (fallback or non-objection coaching)
    if (data.type === 'coach:message') {
        console.log('📡 BACKEND COACHING:', data.payload?.message?.substring(0, 50));
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

    // Handle errors from backend
    if (data.type === 'error') {
        console.error('❌ BACKEND ERROR:', data.payload);
        // Optionally notify sidebar
        const state = await getState();
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
    const data = await chrome.storage.session.get(['streamId', 'currentTabId', 'isRecording']);
    return {
        streamId: data.streamId as string | null,
        currentTabId: data.currentTabId as number | null,
        isRecording: !!data.isRecording
    };
}

async function setState(updates: { streamId?: string | null, currentTabId?: number | null, isRecording?: boolean }) {
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

    if (message.type === 'START_CAPTURE') {
        startCapture(message.tabId || sender.tab?.id);
    } else if (message.type === 'STOP_CAPTURE') {
        stopCapture();
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
            role
        };

        if (isCallConfirmed) {
            send('audio:segment', segmentPayload);
        } else {
            console.log('⏳ Buffering audio segment (call not confirmed yet)...');
            audioSegmentBuffer.push(segmentPayload);
        }

    } else if (message.type === 'MEDIA_STREAM_CHUNK') {
        // NEW: Relay video + audio chunks to backend for manager streaming
        console.log(`📹 Sending media chunk: ${message.size} bytes`);
        send('media:stream', {
            chunk: message.data,
            size: message.size,
            timestamp: message.timestamp
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
    }

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

        // 1. Update Status
        await setState({ isRecording: true });
        broadcastStatus('RECORDING');

        // RESET STATE
        isCallConfirmed = false;
        audioSegmentBuffer = [];

        // 2. Connect WebSocket FIRST (Bug 3 Fix)
        const session = await authService.getSession() as any;

        // 🔍 DEBUG: Token Info
        console.log('🔑 Token Debug:', {
            sessionPresent: !!session,
            accessTokenPresent: !!session?.access_token,
            accessTokenLength: session?.access_token?.length,
            accessTokenPrefix: session?.access_token?.substring(0, 30) + '...',
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
        });

        if (!session?.access_token) {
            console.error('❌ No access token available! User may need to log in.');
            broadcastStatus('ERROR');
            await setState({ isRecording: false });
            isProcessing = false;
            return;
        }

        console.log('🔌 Connecting WebSocket...');
        console.log('🔌 Connecting WebSocket...');
        await connect();

        // 3. Ensure Offscreen Document Exists & Wait for Ready
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
        });

        if (existingContexts.length === 0) {
            console.log('Creating offscreen document...');
            try {
                await chrome.offscreen.createDocument({
                    url: 'src/offscreen/index.html',
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

            // Wait for OFFSCREEN_READY signal
            console.log('⏳ Waiting for OFFSCREEN_READY...');
            await new Promise<void>((resolve, reject) => {
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
        } else {
            console.log('✅ Offscreen document already exists');
        }
        offscreenDocument = 'src/offscreen/index.html';

        // 4. Generate StreamID (Single Source of Truth - Bug 2 Fix)
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

        // 6. Send Call Start Metadata
        if (session?.access_token) {
            lastCallStartParams = {
                platform: urlToPlatform(tab.url),
                scriptId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Script Padrão criado no banco
                leadName: currentLeadName
            } as any;

            console.log('📤 Sending call:start:', lastCallStartParams);
            send('call:start', lastCallStartParams);

            // Retry mechanisms for call:start
            let attempts = 0;
            const retryInterval = setInterval(() => {
                // Fix: Check isRecording from state, not isProcessing (which is false after setup)
                getState().then(currentState => {
                    if (isCallConfirmed || !currentState.isRecording) {
                        clearInterval(retryInterval);
                        return;
                    }
                });
                attempts++;
                if (attempts > 5) {
                    console.error('❌ Call start failed after 5 attempts (backend timeout)');
                    clearInterval(retryInterval);
                    broadcastStatus('ERROR');
                    return; // Don't stop capture, just notify error
                }
                console.log(`🔄 Retrying call:start (attempt ${attempts})...`);
                if (lastCallStartParams) send('call:start', lastCallStartParams);
            }, 3000); // Retry every 3s
        }

    } catch (err: any) {
        console.error('❌ startCapture failed:', err);

        if (err.message && err.message.includes('Extension has not been invoked')) {
            broadcastStatus('PERMISSION_REQUIRED');
        } else {
            broadcastStatus('ERROR');
        }

        await setState({ isRecording: false });

        // Clean up if failed
        if (offscreenDocument) {
            await stopCapture(); // Ensure cleanup
        }
    } finally {
        isProcessing = false;
    }
}

async function stopCapture() {
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
    console.log('⏹️ Stopping capture...');
    try {
        chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {
            console.log('Offscreen not reachable (already closed?)');
        });

        if (offscreenDocument) {
            await chrome.offscreen.closeDocument();
            offscreenDocument = null;
        }

        await setState({ isRecording: false });
        broadcastStatus('PROGRAMMED');
        send('call:end', {});
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
