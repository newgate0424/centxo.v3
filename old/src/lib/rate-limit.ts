import Redis from 'ioredis'

export interface RateLimitContext {
    ip: string
    limit: number
    window: number // in seconds
}

interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    reset: number
}

// Redis-based rate limiter (production-ready)
class RedisStore {
    private redis: Redis | null = null
    private isConnecting = false

    constructor() {
        const redisUrl = process.env.REDIS_URL
        if (redisUrl && redisUrl.trim() !== '') {
            try {
                this.isConnecting = true
                this.redis = new Redis(redisUrl, {
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: false,
                    lazyConnect: true,
                    connectTimeout: 5000,
                    retryStrategy: () => null, // Don't retry, just fail
                })
                
                this.redis.on('error', () => {
                    this.redis = null
                    this.isConnecting = false
                })
                
                this.redis.connect().catch(() => {
                    this.redis = null
                    this.isConnecting = false
                })
            } catch {
                this.redis = null
                this.isConnecting = false
            }
        }
    }

    async increment(key: string, window: number): Promise<{ count: number; reset: number }> {
        const now = Date.now()
        const reset = now + window * 1000

        // Validate key
        if (!key || typeof key !== 'string' || key.trim() === '') {
            return memoryStore.increment('fallback', window)
        }

        // Use Redis if available and connected
        if (this.redis && !this.isConnecting) {
            try {
                const multi = this.redis.multi()
                multi.incr(key)
                multi.expire(key, window)
                const results = await multi.exec()
                const count = results?.[0]?.[1] as number || 1
                return { count, reset }
            } catch (error) {
                // Redis failed, fallback to memory
                console.warn('[Rate Limit] Redis error, using memory fallback:', error)
            }
        }

        // Fallback to memory store
        return memoryStore.increment(key, window)
    }
}

// Memory store fallback
class MemoryStore {
    private hits = new Map<string, { count: number; reset: number }>()

    constructor() {
        // Cleanup expired entries every minute
        if (typeof setInterval !== 'undefined') {
            setInterval(() => this.cleanup(), 60000)
        }
    }

    private cleanup() {
        const now = Date.now()
        for (const [key, value] of this.hits.entries()) {
            if (value.reset < now) {
                this.hits.delete(key)
            }
        }
    }

    async increment(key: string, window: number): Promise<{ count: number; reset: number }> {
        const now = Date.now()
        const record = this.hits.get(key)

        if (!record || record.reset < now) {
            const reset = now + window * 1000
            const newRecord = { count: 1, reset }
            this.hits.set(key, newRecord)
            return newRecord
        }

        record.count += 1
        return record
    }
}

const memoryStore = new MemoryStore()
const redisStore = new RedisStore()

export async function rateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    const { ip, limit, window } = context
    
    // Validate IP address
    if (!ip || typeof ip !== 'string' || ip.trim() === '') {
        console.warn('[Rate Limit] Invalid IP provided, using default')
        return {
            success: true,
            limit,
            remaining: limit,
            reset: Date.now() + window * 1000
        }
    }
    
    const key = `rate_limit:${ip.trim()}`

    const { count, reset } = await redisStore.increment(key, window)

    return {
        success: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        reset
    }
}
