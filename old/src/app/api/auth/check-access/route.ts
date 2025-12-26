import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canAccessRoute, getFirstAccessibleRoute, type Role } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const route = searchParams.get('route')

    if (!route) {
      return NextResponse.json({ error: 'Route parameter required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ 
        hasAccess: false, 
        redirectTo: '/login' 
      })
    }

    // Get user role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json({ 
        hasAccess: false, 
        redirectTo: '/login' 
      })
    }

    const userRole = (user.role as Role) || 'staff'
    const hasAccess = canAccessRoute(userRole, route)

    if (!hasAccess) {
      const firstRoute = getFirstAccessibleRoute(userRole)
      return NextResponse.json({ 
        hasAccess: false, 
        redirectTo: firstRoute 
      })
    }

    return NextResponse.json({ hasAccess: true })
  } catch (error) {
    console.error('[check-access API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
