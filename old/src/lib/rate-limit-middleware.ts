import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from './rate-limit'

/**
 * Rate limiting middleware wrapper for API routes
 * Usage: wrap your API handler with this function
 */
export async function withRateLimit(
    request: NextRequest,
    handler: () => Promise<NextResponse>,
    options: {
        limit: number
        window: number // in seconds
    }
): Promise<NextResponse> {
    // Get IP address from request headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'

    // Check rate limit
    const result = await rateLimit({
        ip,
        limit: options.limit,
        window: options.window
    })

    // Add rate limit headers to response
    const response = result.success
        ? await handler()
        : NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
        )

    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString())

    return response
}

/**
 * Get IP address from NextRequest
 */
export function getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'
}
