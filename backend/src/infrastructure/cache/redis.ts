import Redis from 'ioredis';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';

class RedisClient {
    private client: Redis | null = null;
    private memoryCache: Map<string, string> = new Map();
    private useMemory = false;

    constructor() {
        if (!env.REDIS_URL || env.REDIS_URL.includes('undefined') || env.REDIS_URL.startsWith('memory:')) {
            logger.warn('⚠️ REDIS_URL set to memory mode. Using in-memory cache (No Pub/Sub).');
            this.useMemory = true;
            return;
        }

        this.client = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn('⚠️ Redis connection failed after retries. Using in-memory cache.');
                    return null;
                }
                return Math.min(times * 50, 2000);
            },
        });

        this.client.on('connect', () => logger.info('✅ Redis connected'));
        this.client.on('error', (err) => {
            // Silence repeated errors
            if (!this.useMemory) {
                logger.warn('⚠️ Redis unreachable, switching to temporary in-memory storage.');
                this.useMemory = true;
            }
        });
    }

    public getClient() {
        return this.client;
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        const serialized = JSON.stringify(value);
        if (this.useMemory || !this.client) {
            this.memoryCache.set(key, serialized);
            if (ttlSeconds) {
                setTimeout(() => this.memoryCache.delete(key), ttlSeconds * 1000);
            }
        } else {
            try {
                if (ttlSeconds) {
                    await this.client.setex(key, ttlSeconds, serialized);
                } else {
                    await this.client.set(key, serialized);
                }
            } catch (e) {
                this.useMemory = true;
                this.memoryCache.set(key, serialized);
            }
        }
    }

    async get<T>(key: string): Promise<T | null> {
        let data: string | null = null;

        if (this.useMemory || !this.client) {
            data = this.memoryCache.get(key) || null;
        } else {
            try {
                data = await this.client.get(key);
            } catch (e) {
                this.useMemory = true;
                data = this.memoryCache.get(key) || null;
            }
        }

        if (!data) return null;
        return JSON.parse(data) as T;
    }

    async del(key: string): Promise<void> {
        if (this.useMemory || !this.client) {
            this.memoryCache.delete(key);
        } else {
            try {
                await this.client.del(key);
            } catch (e) {
                this.memoryCache.delete(key);
            }
        }
    }

    async exists(key: string): Promise<boolean> {
        if (this.useMemory || !this.client) {
            return this.memoryCache.has(key);
        }
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (e) {
            return this.memoryCache.has(key);
        }
    }

    // ========================================
    // PUB/SUB METHODS FOR MANAGER WHISPER
    // ========================================

    private subscribers: Map<string, Redis> = new Map();
    private subscriptionHandlers: Map<string, Set<(message: string) => void>> = new Map();

    /**
     * Publishes a message to a Redis channel
     * Used for broadcasting transcripts and commands
     */
    async publish(channel: string, message: any): Promise<void> {
        if (this.useMemory || !this.client) {
            logger.warn('⚠️ Pub/Sub not available in memory mode');
            return;
        }

        try {
            const serialized = JSON.stringify(message);
            await this.client.publish(channel, serialized);
            logger.info(`📡 Published to ${channel}`);
        } catch (error) {
            logger.error({ error }, `Failed to publish to ${channel}`);
        }
    }

    /**
     * Subscribes to a Redis channel
     * Creates a dedicated subscriber client for each unique channel
     */
    async subscribe(channel: string, handler: (message: any) => void): Promise<void> {
        if (this.useMemory || !this.client) {
            logger.warn('⚠️ Pub/Sub not available in memory mode');
            return;
        }

        try {
            // Create dedicated subscriber client if doesn't exist
            if (!this.subscribers.has(channel)) {
                const subscriberClient = new Redis(env.REDIS_URL, {
                    // Prevent auto-reconnect spam if Redis is down
                    retryStrategy: (times) => Math.min(times * 100, 3000),
                    maxRetriesPerRequest: 3
                });

                // CRITICAL: Handle errors to prevent crash
                subscriberClient.on('error', (err) => {
                    logger.error({ err, channel }, '❌ Redis Subscriber Error');
                    // Should we disconnect? For now, just log to keep process alive
                });

                subscriberClient.on('message', (ch, msg) => {
                    if (ch === channel) {
                        try {
                            const parsed = JSON.parse(msg);
                            const handlers = this.subscriptionHandlers.get(channel);
                            if (handlers) {
                                handlers.forEach(h => h(parsed));
                            }
                        } catch (error) {
                            logger.error({ error }, `Failed to parse message from ${channel}`);
                        }
                    }
                });

                await subscriberClient.subscribe(channel);
                this.subscribers.set(channel, subscriberClient);
                this.subscriptionHandlers.set(channel, new Set());

                logger.info(`✅ Subscribed to ${channel}`);
            }

            // Add handler to set
            const handlers = this.subscriptionHandlers.get(channel)!;
            handlers.add(handler);
        } catch (error) {
            logger.error({ error }, `Failed to subscribe to ${channel}`);
        }
    }

    /**
     * Unsubscribes a specific handler from a channel
     */
    async unsubscribe(channel: string, handler: (message: any) => void): Promise<void> {
        const handlers = this.subscriptionHandlers.get(channel);
        if (handlers) {
            handlers.delete(handler);

            // If no more handlers, close the subscriber client
            if (handlers.size === 0) {
                const subscriber = this.subscribers.get(channel);
                if (subscriber) {
                    await subscriber.unsubscribe(channel);
                    subscriber.disconnect();
                    this.subscribers.delete(channel);
                    this.subscriptionHandlers.delete(channel);
                    logger.info(`🔌 Unsubscribed from ${channel}`);
                }
            }
        }
    }

    /**
     * Cleanup all subscriptions (useful on shutdown)
     */
    async cleanupSubscriptions(): Promise<void> {
        for (const [channel, subscriber] of this.subscribers.entries()) {
            await subscriber.unsubscribe(channel);
            subscriber.disconnect();
        }
        this.subscribers.clear();
        this.subscriptionHandlers.clear();
        logger.info('🧹 All Redis subscriptions cleaned up');
    }
}

export const redis = new RedisClient();
