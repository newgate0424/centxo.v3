import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'

// Log login activity with IP address
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get IP address from headers
        const headersList = await headers()
        const forwardedFor = headersList.get('x-forwarded-for')
        const realIp = headersList.get('x-real-ip')
        const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'

        // Get user agent
        const userAgent = headersList.get('user-agent') || 'unknown'

        // Get provider from body if provided
        const body = await request.json().catch(() => ({}))
        const provider = body.provider || 'unknown'

        await logActivity({
            userId: session.user.id,
            userEmail: session.user.email || '',
            userName: session.user.name,
            action: 'login',
            details: { provider, timestamp: new Date().toISOString() },
            ipAddress,
            userAgent
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error logging activity:', error)
        return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
    }
}
