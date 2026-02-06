import Redis from 'ioredis';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';

class RedisClient {
    private client: Redis | null = null;
    private memoryCache: Map<string, string> = new Map();
    private useMemory = false;

    constructor() {
        if (!env.REDIS_URL || env.REDIS_URL.includes('undefined')) {
            logger.warn('⚠️ REDIS_URL not set. Using in-memory cache.');
            this.useMemory = true;
            return;
        }

        this.client = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 3) {
                    logger.error('❌ Redis connection lost. Switching to in-memory.');
                    return null;
                }
                return Math.min(times * 50, 2000);
            },
        });

        this.client.on('connect', () => logger.info('✅ Redis connected'));
        this.client.on('error', (err) => {
            logger.error('❌ Redis error, switching to memory:', err);
            this.useMemory = true;
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
}

export const redis = new RedisClient();
