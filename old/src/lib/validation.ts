import { z } from "zod"

/**
 * Common validation schemas
 */
export const emailSchema = z.string().email().max(255)
export const passwordSchema = z.string().min(8).max(100)
export const nameSchema = z.string().min(1).max(100)

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .trim()
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    return emailSchema.safeParse(email).success
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
    return passwordSchema.safeParse(password).success
}

/**
 * Check for SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
        /(--|;|\/\*|\*\/|xp_|sp_)/i,
        /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i
    ]
    return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * Validate and sanitize user input
 */
export function validateInput(input: string, maxLength: number = 1000): {
    valid: boolean
    sanitized: string
    error?: string
} {
    if (typeof input !== 'string') {
        return { valid: false, sanitized: '', error: 'Invalid input type' }
    }

    if (input.length > maxLength) {
        return { valid: false, sanitized: '', error: `Input too long (max ${maxLength} characters)` }
    }

    if (containsSQLInjection(input)) {
        return { valid: false, sanitized: '', error: 'Invalid characters detected' }
    }

    return {
        valid: true,
        sanitized: sanitizeInput(input)
    }
}

/**
 * Rate limit key generator
 */
export function generateRateLimitKey(ip: string, action: string): string {
    return `rate_limit:${action}:${ip}`
}
