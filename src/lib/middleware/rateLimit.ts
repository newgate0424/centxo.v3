/**
 * Rate Limiting Middleware
 * Protects API routes from abuse using in-memory storage
 * For production, consider using Redis for distributed rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

class RateLimiter {
    private requests: Map<string, number[]> = new Map();

    /**
     * Check if request is within rate limit
     * @param key - Unique identifier (e.g., user ID, IP address)
     * @param config - Rate limit configuration
     * @returns true if within limit, false if exceeded
     */
    check(key: string, config: RateLimitConfig): boolean {
        const now = Date.now();
        const requests = this.requests.get(key) || [];

        // Remove requests outside the time window
        const validRequests = requests.filter((timestamp) => now - timestamp < config.windowMs);

        if (validRequests.length >= config.maxRequests) {
            return false; // Rate limit exceeded
        }

        // Add current request
        validRequests.push(now);
        this.requests.set(key, validRequests);

        // Cleanup old entries periodically
        if (Math.random() < 0.01) {
            this.cleanup(config.windowMs);
        }

        return true;
    }

    /**
     * Clean up old entries to prevent memory leaks
     */
    private cleanup(windowMs: number) {
        const now = Date.now();
        for (const [key, timestamps] of this.requests.entries()) {
            const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);
            if (validTimestamps.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, validTimestamps);
            }
        }
    }

    /**
     * Reset rate limit for a specific key
     */
    reset(key: string) {
        this.requests.delete(key);
    }
}

// Global rate limiter instance
const globalLimiter = new RateLimiter();

/**
 * Rate limit middleware for API routes
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Response if rate limited, null otherwise
 */
export function rateLimit(
    request: NextRequest,
    config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 },
    identifier?: string // Optional custom identifier (e.g., session.user.id)
): NextResponse | null {
    // Get identifier (prefer custom identifier, then header, fallback to IP)
    const headerUserId = request.headers.get('x-user-id');
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const key = identifier || headerUserId || ip;

    const isAllowed = globalLimiter.check(key, config);

    if (!isAllowed) {
        return NextResponse.json(
            {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(config.windowMs / 1000),
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil(config.windowMs / 1000)),
                    'X-RateLimit-Limit': String(config.maxRequests),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Date.now() + config.windowMs),
                },
            }
        );
    }

    return null;
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
    // Strict limits for sensitive operations
    strict: { maxRequests: 10, windowMs: 60000 }, // 10 per minute

    // Standard limits for general API routes
    standard: { maxRequests: 100, windowMs: 60000 }, // 100 per minute

    // Relaxed limits for read-only operations
    relaxed: { maxRequests: 300, windowMs: 60000 }, // 300 per minute

    // Very strict for authentication
    auth: { maxRequests: 5, windowMs: 300000 }, // 5 per 5 minutes
};

export { globalLimiter };
