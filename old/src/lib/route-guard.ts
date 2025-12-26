import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canAccessRoute, getFirstAccessibleRoute, type Role } from '@/lib/permissions'
import { redirect } from 'next/navigation'

/**
 * Check if current user can access the given route
 * If not, redirect to first accessible route
 * Use this in Server Components
 */
export async function checkRouteAccess(path: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Get user role
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  })

  if (!user) {
    redirect('/login')
  }

  const userRole = (user.role as Role) || 'staff'

  // Check if user can access this route
  if (!canAccessRoute(userRole, path)) {
    // Redirect to first accessible route
    const firstRoute = getFirstAccessibleRoute(userRole)
    redirect(firstRoute)
  }

  return userRole
}

/**
 * Get current user's role
 * Returns null if not authenticated
 */
export async function getUserRole(): Promise<Role | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  })

  if (!user) {
    return null
  }

  return (user.role as Role) || 'staff'
}
