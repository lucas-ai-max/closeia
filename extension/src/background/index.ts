import { authService } from '../services/auth';
import { wsClient } from '../services/websocket';

// State
console.log('Background Service Worker Starting...');

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

    console.log('Extension icon clicked, requesting capture permission...');

    try {
        const id = await new Promise<string>((resolve, reject) => {
            chrome.tabCapture.getMediaStreamId({ consumerTabId: tab.id }, (id) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Failed to get capture permission:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('✅ Capture permission granted, streamId:', id);
                    resolve(id);
                }
            });
        });

        await setState({ streamId: id, currentTabId: tab.id });
    } catch (err) {
        console.error('Failed to get capture permission on icon click:', err);
    }

    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch((err) => {
        console.log('Content script not injected yet:', err);
    });
});

let isProcessing = false;

// Listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`📩 Background received message: ${message.type}`, { senderId: sender.id, senderUrl: sender.url });

    if (message.type === 'START_CAPTURE') {
        startCapture();
    } else if (message.type === 'STOP_CAPTURE') {
        stopCapture();
    } else if (message.type === 'OFFSCREEN_READY') {
        console.log('✅ [Event]: OFFSCREEN_READY');
        getState().then(state => {
            if (state.streamId && state.isRecording) {
                console.log('📤 Sending INIT_RECORDING to offscreen (from listener)');
                chrome.runtime.sendMessage({
                    type: 'INIT_RECORDING',
                    streamId: state.streamId
                }).catch((err) => {
                    console.error('Failed to send INIT_RECORDING to offscreen:', err);
                });
            }
        });
    } else if (message.type === 'OFFSCREEN_LOG') {
        console.log('🖥️ [Offscreen]:', message.message);
    } else if (message.type === 'AUDIO_CHUNK') {
        if (message.data.length > 100) {
            // console.log(`📦 Received audio chunk: ${message.data.length} chars`);
        }
        wsClient.send('audio:chunk', { audio: message.data });
    } else if (message.type === 'TRANSCRIPT_RESULT') {
        wsClient.send('transcript:chunk', message.data);
        getState().then(state => {
            if (state.currentTabId) {
                chrome.tabs.sendMessage(state.currentTabId, {
                    type: 'TRANSCRIPT_RESULT',
                    data: message.data
                }).catch(() => { });
            }
        });
    }

    return false;
});

async function startCapture() {
    if (isProcessing) {
        console.warn('⚠️ startCapture ignored: already processing a capture request');
        return;
    }

    const state = await getState();
    if (state.isRecording) {
        console.log('⚠️ startCapture ignored: already recording');
        return;
    }

    if (!state.streamId || !state.currentTabId) {
        console.error('❌ No streamId available. Icon must be clicked first.');
        broadcastStatus('ERROR');
        return;
    }

    isProcessing = true;
    try {
        const tab = await chrome.tabs.get(state.currentTabId);
        console.log('🚀 Initiating capture for tab:', tab.url);

        // 1. Update Status
        await setState({ isRecording: true });
        broadcastStatus('RECORDING');

        // 2. Create Offscreen Document
        if (!offscreenDocument) {
            console.log('Creating offscreen document...');
            await chrome.offscreen.createDocument({
                url: 'offscreen/index.html',
                reasons: [chrome.offscreen.Reason.USER_MEDIA],
                justification: 'Transcription',
            });
            offscreenDocument = 'offscreen/index.html';
        }

        // 3. Send INIT_RECORDING
        console.log('📤 Sending INIT_RECORDING (direct)');
        chrome.runtime.sendMessage({
            type: 'INIT_RECORDING',
            streamId: state.streamId
        }).catch((err) => {
            console.log('Direct INIT_RECORDING failed (listening for READY instead):', err.message);
        });

        // 4. Connect WebSockets
        const session = await authService.getSession() as any;
        if (session?.access_token) {
            console.log('Connecting WebSocket...');
            wsClient.connect(session.access_token);

            // Clean up existing listeners if any
            wsClient.on('transcript:result', (data: any) => {
                getState().then(currentState => {
                    if (currentState.currentTabId) {
                        chrome.tabs.sendMessage(currentState.currentTabId, {
                            type: 'TRANSCRIPT_RESULT',
                            data: data.payload
                        }).catch(() => { });
                    }
                });
            });
        }

        wsClient.send('call:start', {
            platform: urlToPlatform(tab.url),
            scriptId: 'default-script-id'
        });

    } catch (err) {
        console.error('❌ startCapture failed:', err);
        broadcastStatus('ERROR');
        await setState({ isRecording: false });
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
        wsClient.send('call:end', {});
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
