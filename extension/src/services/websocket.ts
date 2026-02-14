import { authService } from './auth';

const WS_BASE_URL = 'ws://localhost:3001/ws/call'; // Match the existing URL from previous file

let ws: WebSocket | null = null;
let messageQueue: string[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Callbacks that background can register
let onMessageCallback: ((data: any) => void) | null = null;
let onConnectCallback: (() => void) | null = null;

export function onWsMessage(cb: (data: any) => void) {
    onMessageCallback = cb;
}

export function onWsConnect(cb: () => void) {
    onConnectCallback = cb;
}

export async function connect() {
    // Clear previous connection
    if (ws) {
        ws.onclose = null; // Prevent close handler from triggering reconnect
        ws.close();
        ws = null;
    }

    try {
        // ★★★ OBTAIN FRESH TOKEN BEFORE EACH CONNECTION ★★★
        console.log('🔄 Getting fresh token for WS connection...');
        const token = await authService.getFreshToken();
        console.log('🔌 Connecting WS with fresh token...');

        ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);

        ws.onopen = () => {
            console.log('✅ WS Connected');
            reconnectAttempts = 0; // Reset counter on success

            // Flush queue
            console.log(`🚀 Flushing ${messageQueue.length} messages from queue...`);
            while (messageQueue.length > 0) {
                const msg = messageQueue.shift()!;
                try {
                    ws!.send(msg);
                    console.log('📤 Flushed message:', JSON.parse(msg).type);
                } catch (e) {
                    console.error('❌ Failed to flush message:', e);
                }
            }

            // Notify background
            if (onConnectCallback) onConnectCallback();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📩 WS Message:', data.type);
                if (onMessageCallback) onMessageCallback(data);
            } catch (err) {
                console.error('❌ WS parse error:', err);
            }
        };

        ws.onclose = (event) => {
            console.error('❌ WS Closed', { code: event.code, reason: event.reason });
            ws = null;

            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.error('❌ Max reconnect attempts reached, stopping.');
                return;
            }

            // Exponential backoff for invalid token (1008)
            const delay = event.code === 1008
                ? Math.min(5000 * Math.pow(1.5, reconnectAttempts), 30000) // 5s -> 7.5s -> 11s -> ...
                : 2000;

            reconnectAttempts++;
            console.log(`Retrying WS in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => connect(), delay);
        };

        ws.onerror = (error) => {
            console.error('❌ WS Error:', error);
        };

    } catch (err: any) {
        console.error('❌ Failed to get token or connect:', err.message);

        reconnectAttempts++;
        const delay = 5000;
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log(`Retrying in ${delay}ms...`);
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => connect(), delay);
        }
    }
}

export function send(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    // Check if ws exists and is OPEN (1)
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(message);
        } catch (err) {
            console.error(`❌ WS Send failed for ${type}:`, err);
            // Push to queue as fallback if send fails
            messageQueue.push(message);
        }
    } else {
        console.log(`⏳ WS queuing message: ${type} (State: ${ws ? ws.readyState : 'null'})`, payload);
        messageQueue.push(message);
    }
}

export function isConnected(): boolean {
    return ws !== null && ws.readyState === WebSocket.OPEN;
}

export function close() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
        ws.onclose = null;
        ws.close(1000, 'Client closing');
        ws = null;
    }
}
