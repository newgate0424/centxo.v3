import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFirstAccessibleRoute, type Role } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      // Not authenticated, redirect to login
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user) {
      // User not found, redirect to login
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const userRole = (user.role as Role) || 'staff'
    const firstRoute = getFirstAccessibleRoute(userRole)

    console.log('[first-route API] User:', session.user.email)
    console.log('[first-route API] Role:', userRole)
    console.log('[first-route API] First route:', firstRoute)

    // Redirect to first accessible route
    return NextResponse.redirect(new URL(firstRoute, req.url))
  } catch (error) {
    console.error('[first-route API] Error:', error)
    // Fallback to settings on error
    return NextResponse.redirect(new URL('/settings', req.url))
  }
}
