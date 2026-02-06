export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string = 'ws://localhost:3001/ws/call';
    private token: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnect = 5;
    private messageQueue: any[] = [];
    private listeners = new Map<string, Set<Function>>();

    connect(accessToken: string) {
        this.token = accessToken;
        if (this.ws) {
            console.log('WS already connected');
            return;
        }

        // Auth Query Param
        const wsUrl = `${this.url}?token=${this.token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('✅ WS Connected');
            this.reconnectAttempts = 0;
            this.flushQueue();
            this.notify('open', null);
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📩 WS Message:', data.type);
                this.notify(data.type, data);
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        this.ws.onclose = () => {
            console.log('❌ WS Closed');
            this.ws = null;
            this.retryConnection();
            this.notify('close', null);
        };

        this.ws.onerror = (err) => {
            console.error('WS Error', err);
        };
    }

    send(type: string, payload: any) {
        const message = JSON.stringify({ type, payload });
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else {
            console.warn('WS not open, queuing message', type);
            this.messageQueue.push(message);
        }
    }

    on(event: string, cb: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(cb);
    }

    off(event: string, cb: Function) {
        this.listeners.get(event)?.delete(cb);
    }

    private notify(event: string, data: any) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }

    private flushQueue() {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const msg = this.messageQueue.shift();
            this.ws.send(msg);
        }
    }

    private retryConnection() {
        if (this.reconnectAttempts < this.maxReconnect) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`Retrying WS in ${delay}ms...`);
            setTimeout(() => {
                if (this.token) this.connect(this.token);
            }, delay);
        }
    }
}

export const wsClient = new WebSocketClient();
