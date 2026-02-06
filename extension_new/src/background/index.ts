import { authService } from '../services/auth';
import { wsClient } from '../services/websocket';

// State
let isRecording = false;
let offscreenDocument: string | null = null;
let streamId: string | null = null;
let currentTabId: number | null = null;

// Listeners
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'START_CAPTURE') {
        await startCapture();
    } else if (message.type === 'STOP_CAPTURE') {
        await stopCapture();
    } else if (message.type === 'TRANSCRIPT_RESULT') {
        // Forward to backend via WS
        wsClient.send('transcript:chunk', message.data);

        // Forward to Content Script for Sidebar
        if (currentTabId) {
            chrome.tabs.sendMessage(currentTabId, {
                type: 'TRANSCRIPT_UPDATE',
                data: message.data
            }).catch(() => { }); // Ignore if tab closed
        }
    }
});

async function startCapture() {
    if (isRecording) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;
    currentTabId = tab.id;

    try {
        // 1. Get Stream ID (must be done in background/popup context)
        streamId = await new Promise<string>((resolve, reject) => {
            chrome.tabCapture.getMediaStreamId({ consumerTabId: tab.id }, (id) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(id);
            });
        });

        // 2. Create Offscreen Document
        if (!offscreenDocument) {
            await chrome.offscreen.createDocument({
                url: 'src/offscreen/index.html',
                reasons: [chrome.offscreen.Reason.USER_MEDIA],
                justification: 'Transcription',
            });
            offscreenDocument = 'src/offscreen/index.html';
        }

        // 3. Send Stream ID to Offscreen
        // Wait a bit for offscreen to be ready
        setTimeout(() => {
            chrome.runtime.sendMessage({
                type: 'INIT_RECORDING',
                streamId: streamId
            });
        }, 500);

        // 4. Update Status
        isRecording = true;
        broadcastStatus('RECORDING');

        // 5. Connect WS
        const session = await authService.getSession() as any;
        if (session?.access_token) {
            wsClient.connect(session.access_token);
        }

        // 6. Inject Sidebar (if not already there - logic inside content script)
        chrome.tabs.sendMessage(currentTabId, { type: 'OPEN_SIDEBAR' });

        // 7. Send Start Call event
        wsClient.send('call:start', {
            platform: getPlatform(tab.url),
            scriptId: 'default-script-id' // Should come from UI selection
        });

    } catch (err) {
        console.error('Capture failed', err);
        broadcastStatus('ERROR');
    }
}

async function stopCapture() {
    if (!isRecording) return;

    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }); // To offscreen

    if (offscreenDocument) {
        await chrome.offscreen.closeDocument();
        offscreenDocument = null;
    }

    isRecording = false;
    broadcastStatus('PROGRAMMED');
    wsClient.send('call:end', {});
}

function broadcastStatus(status: string) {
    chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status }).catch(() => { });
}

function getPlatform(url?: string): string {
    if (!url) return 'OTHER';
    if (url.includes('meet.google.com')) return 'GOOGLE_MEET';
    if (url.includes('zoom.us')) return 'ZOOM_WEB';
    return 'OTHER';
}
