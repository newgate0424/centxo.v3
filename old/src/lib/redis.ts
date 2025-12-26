import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isConnected = false;

function initRedis(): Redis | null {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.log('[Redis] No REDIS_URL configured, caching disabled');
        return null;
    }
    try {
        const client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
            connectTimeout: 5000,
        });
        client.on('connect', () => { isConnected = true; });
        client.on('error', () => { isConnected = false; });
        client.on('close', () => { isConnected = false; });
        client.connect().catch(() => { redisClient = null; });
        return client;
    } catch {
        return null;
    }
}

function getRedis(): Redis | null {
    if (!redisClient) redisClient = initRedis();
    return redisClient;
}

const DEFAULT_TTL = 300;

export const cache = {
    get: async <T>(key: string): Promise<T | null> => {
        try {
            const redis = getRedis();
            if (!redis || !isConnected) return null;
            const data = await redis.get(key);
            return data ? JSON.parse(data) as T : null;
        } catch { return null; }
    },
    set: async (key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL): Promise<boolean> => {
        try {
            const redis = getRedis();
            if (!redis || !isConnected) return false;
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
            return true;
        } catch { return false; }
    },
    delete: async (key: string): Promise<boolean> => {
        try {
            const redis = getRedis();
            if (!redis || !isConnected) return false;
            await redis.del(key);
            return true;
        } catch { return false; }
    },
    invalidatePattern: async (pattern: string): Promise<number> => {
        try {
            const redis = getRedis();
            if (!redis || !isConnected) return 0;
            const keys = await redis.keys(pattern);
            if (keys.length === 0) return 0;
            await redis.del(...keys);
            return keys.length;
        } catch { return 0; }
    },
    publish: async (channel: string, message: unknown): Promise<boolean> => {
        try {
            const redis = getRedis();
            if (!redis || !isConnected) return false;
            await redis.publish(channel, JSON.stringify(message));
            return true;
        } catch { return false; }
    },
    isAvailable: (): boolean => isConnected,
    getOrSet: async <T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = DEFAULT_TTL): Promise<T> => {
        const cached = await cache.get<T>(key);
        if (cached !== null) return cached;
        const data = await fetcher();
        cache.set(key, data, ttlSeconds);
        return data;
    },
};

export { getRedis, isConnected };
export default redisClient;
