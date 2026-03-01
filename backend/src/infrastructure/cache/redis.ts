import Redis from 'ioredis';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';
import fs from 'fs';
import path from 'path';

const DUMP_FILE = path.join(process.cwd(), 'redis-dump.json');

class RedisClient {
    private client: Redis | null = null;
    private memoryCache: Map<string, string> = new Map();
    private useMemory = false;
    private ttlTimers: Map<string, NodeJS.Timeout> = new Map();
    private saveDumpTimer: NodeJS.Timeout | null = null;

    constructor() {
        if (!env.REDIS_URL || env.REDIS_URL === 'memory' || env.REDIS_URL.includes('undefined') || env.REDIS_URL.startsWith('memory:')) {
            logger.warn('⚠️ REDIS_URL set to memory mode. Using in-memory cache (No Pub/Sub).');
            this.useMemory = true;
            this.loadDump();
            return;
        }

        this.client = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn('⚠️ Redis connection failed after retries. Using in-memory cache.');
                    this.useMemory = true;
                    this.loadDump(); // Load dump if falling back
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
                this.loadDump(); // Load dump if falling back
            }
        });
    }

    private loadDump() {
        try {
            if (fs.existsSync(DUMP_FILE)) {
                const data = fs.readFileSync(DUMP_FILE, 'utf-8');
                const json = JSON.parse(data);
                for (const [key, value] of Object.entries(json)) {
                    this.memoryCache.set(key, value as string);
                }
                logger.info(`💾 Loaded ${this.memoryCache.size} keys from redis-dump.json`);
            }
        } catch (e) {
            logger.error({ err: e }, 'Failed to load redis dump');
        }
    }

    private saveDump() {
        if (!this.useMemory) return;
        // Debounce: only write at most once per second
        if (this.saveDumpTimer) return;
        this.saveDumpTimer = setTimeout(() => {
            this.saveDumpTimer = null;
            try {
                const obj = Object.fromEntries(this.memoryCache);
                fs.writeFile(DUMP_FILE, JSON.stringify(obj, null, 2), (err) => {
                    if (err) logger.error({ err }, 'Failed to save redis dump');
                });
            } catch (e) {
                logger.error({ err: e }, 'Failed to save redis dump');
            }
        }, 1000);
    }

    public getClient() {
        return this.client;
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        const serialized = JSON.stringify(value);
        if (this.useMemory || !this.client) {
            // Clear existing TTL timer to prevent leaks
            const existingTimer = this.ttlTimers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
                this.ttlTimers.delete(key);
            }
            this.memoryCache.set(key, serialized);
            this.saveDump();
            if (ttlSeconds) {
                const timer = setTimeout(() => {
                    this.memoryCache.delete(key);
                    this.ttlTimers.delete(key);
                    this.saveDump();
                }, ttlSeconds * 1000);
                this.ttlTimers.set(key, timer);
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
                this.saveDump();
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
            const existingTimer = this.ttlTimers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
                this.ttlTimers.delete(key);
            }
            this.memoryCache.delete(key);
            this.saveDump();
        } else {
            try {
                await this.client.del(key);
            } catch (e) {
                this.memoryCache.delete(key);
                this.saveDump();
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

    /** Single shared subscriber connection (instead of one per channel) */
    private subscriberClient: Redis | null = null;
    private subscribedChannels: Set<string> = new Set();
    private subscriptionHandlers: Map<string, Set<(message: string) => void>> = new Map();

    private getOrCreateSubscriber(): Redis {
        if (this.subscriberClient) return this.subscriberClient;

        this.subscriberClient = new Redis(env.REDIS_URL, {
            retryStrategy: (times) => Math.min(times * 100, 3000),
            maxRetriesPerRequest: 3
        });

        this.subscriberClient.on('error', (err) => {
            logger.error({ err }, '❌ Redis Subscriber Error');
        });

        this.subscriberClient.on('message', (channel, msg) => {
            try {
                const parsed = JSON.parse(msg);
                const handlers = this.subscriptionHandlers.get(channel);
                if (handlers) {
                    handlers.forEach(h => h(parsed));
                }
            } catch (error) {
                logger.error({ error }, `Failed to parse message from ${channel}`);
            }
        });

        return this.subscriberClient;
    }

    /**
     * Publishes a message to a Redis channel
     */
    async publish(channel: string, message: any): Promise<void> {
        if (this.useMemory || !this.client) {
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
     * Subscribes to a Redis channel using a single shared subscriber connection
     */
    async subscribe(channel: string, handler: (message: any) => void): Promise<void> {
        if (this.useMemory || !this.client) {
            return;
        }

        try {
            const subscriber = this.getOrCreateSubscriber();

            if (!this.subscribedChannels.has(channel)) {
                await subscriber.subscribe(channel);
                this.subscribedChannels.add(channel);
                this.subscriptionHandlers.set(channel, new Set());
                logger.info(`✅ Subscribed to ${channel}`);
            }

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

            // If no more handlers for this channel, unsubscribe
            if (handlers.size === 0) {
                this.subscriptionHandlers.delete(channel);
                this.subscribedChannels.delete(channel);
                if (this.subscriberClient) {
                    await this.subscriberClient.unsubscribe(channel);
                    logger.info(`🔌 Unsubscribed from ${channel}`);

                    // Disconnect subscriber if no channels left
                    if (this.subscribedChannels.size === 0) {
                        this.subscriberClient.disconnect();
                        this.subscriberClient = null;
                        logger.info('🔌 Subscriber client disconnected (no active channels)');
                    }
                }
            }
        }
    }

    /**
     * Cleanup all subscriptions (useful on shutdown)
     */
    async cleanupSubscriptions(): Promise<void> {
        if (this.subscriberClient) {
            for (const channel of this.subscribedChannels) {
                await this.subscriberClient.unsubscribe(channel);
            }
            this.subscriberClient.disconnect();
            this.subscriberClient = null;
        }
        this.subscribedChannels.clear();
        this.subscriptionHandlers.clear();
        logger.info('🧹 All Redis subscriptions cleaned up');
    }
}

export const redis = new RedisClient();
