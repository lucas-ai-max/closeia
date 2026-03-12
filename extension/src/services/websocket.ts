import { authService } from './auth';
import { wsBaseUrl } from '@/config/env';

const WS_BASE_URL = `${wsBaseUrl}/ws/call`;

let ws: WebSocket | null = null;
let messageQueue: string[] = [];
const MAX_QUEUE_SIZE = 100;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Callbacks that background can register
let onMessageCallback: ((data: any) => void) | null = null;
let onConnectCallback: (() => void) | null = null;
let onCloseCallback: (() => void) | null = null;
let onPlanRequiredCallback: (() => void) | null = null;

export function onWsMessage(cb: (data: any) => void) {
    onMessageCallback = cb;
}

export function onWsConnect(cb: () => void) {
    onConnectCallback = cb;
}

export function onWsClose(cb: () => void) {
    onCloseCallback = cb;
}

export function onWsPlanRequired(cb: () => void) {
    onPlanRequiredCallback = cb;
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
        // Auth challenge: connect without token in URL, send via first message
        console.log('🔌 Connecting WS:', WS_BASE_URL);
        ws = new WebSocket(WS_BASE_URL);

        ws.onopen = () => {
            console.log('🔐 WS Connected, sending auth challenge...');
            // Send auth token as first message (not in URL for security)
            ws!.send(JSON.stringify({ type: 'auth', payload: { token } }));
        };

        // Wait for auth:ok before flushing queue
        let authResolved = false;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle auth challenge response
                if (data.type === 'auth:ok' && !authResolved) {
                    authResolved = true;
                    console.log('✅ WS Authenticated');
                    reconnectAttempts = 0;

                    // Flush queue after auth
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

                    if (onConnectCallback) onConnectCallback();
                    return;
                }

                if (data.type === 'auth:error') {
                    console.error('❌ WS Auth failed:', data.payload?.reason);
                    if (data.payload?.reason === 'Active plan required' && onPlanRequiredCallback) {
                        onPlanRequiredCallback();
                    }
                    return;
                }

                console.log('📩 WS Message:', data.type);
                if (onMessageCallback) onMessageCallback(data);
            } catch (err) {
                console.error('❌ WS parse error:', err);
            }
        };

        ws.onclose = (event) => {
            console.error('❌ WS Closed', { code: event.code, reason: event.reason || '(no reason)', clean: event.wasClean });
            ws = null;
            if (onCloseCallback) onCloseCallback();

            if (event.code === 4403) {
                console.warn('🚫 Active plan required. Not reconnecting.');
                if (onPlanRequiredCallback) onPlanRequiredCallback();
                return;
            }

            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.error('❌ Max reconnect attempts reached, stopping.');
                return;
            }

            const delay = event.code === 1008
                ? Math.min(5000 * Math.pow(1.5, reconnectAttempts), 30000)
                : 2000;

            reconnectAttempts++;
            console.log(`Retrying WS in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => connect(), delay);
        };

        ws.onerror = () => {
            console.error('❌ WS Error (check WS Closed above for code/reason)');
        };

    } catch (err: any) {
        console.error('❌ Failed to get token or connect:', err.message);

        const isNoSession = err?.message?.includes('No session found') || err?.message?.includes('Auth session');
        if (isNoSession && reconnectAttempts >= 2) {
            console.error('Stopping WS reconnect: faça login no popup da extensão.');
            return;
        }

        reconnectAttempts++;
        const delay = 5000;
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log(`Retrying in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
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
        if (messageQueue.length >= MAX_QUEUE_SIZE) {
            messageQueue.shift();
        }
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
