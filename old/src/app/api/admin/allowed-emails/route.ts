import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'

// Helper to check if user is authenticated as admin
async function isAdminAuthenticated(): Promise<boolean> {
    // Check NextAuth session first
    const session = await getServerSession(authOptions)
    if (session?.user) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })
        if (user?.role === 'admin') return true
    }

    // Check admin cookie (used by /admin dashboard)
    const cookieStore = await cookies()
    const adminAuth = cookieStore.get('admin_auth')
    if (adminAuth?.value === process.env.ADMIN_SECRET) {
        return true
    }

    return false
}

// GET - List all allowed emails
export async function GET() {
    try {
        const isAdmin = await isAdminAuthenticated()
        if (!isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const allowedEmails = await (prisma as any).allowedEmail.findMany({
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: allowedEmails })
    } catch (error) {
        console.error('Error fetching allowed emails:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - Add new allowed email
export async function POST(request: NextRequest) {
    try {
        const isAdmin = await isAdminAuthenticated()
        if (!isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { email, note } = body

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Check if email already exists
        const existing = await (prisma as any).allowedEmail.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (existing) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }

        const allowedEmail = await (prisma as any).allowedEmail.create({
            data: {
                email: email.toLowerCase(),
                note: note || null,
                createdBy: 'admin'
            }
        })

        return NextResponse.json({ success: true, data: allowedEmail })
    } catch (error) {
        console.error('Error adding allowed email:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE - Remove allowed email
export async function DELETE(request: NextRequest) {
    try {
        const isAdmin = await isAdminAuthenticated()
        if (!isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        await (prisma as any).allowedEmail.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting allowed email:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
