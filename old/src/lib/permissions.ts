// Role-based Access Control System
export type Role = 'host' | 'admin' | 'staff'

// Route to role mapping
const routeRoles: Record<string, Role[]> = {
  '/dashboard': ['host', 'admin', 'staff'],
  '/admanager': ['host', 'admin'],
  '/google-sheets': ['host', 'admin'],
  '/payments': ['host', 'admin'],
  '/settings': ['host', 'admin', 'staff'], // Everyone can access
  '/admin': ['host'], // Only host can access admin panel
}

/**
 * Check if user role can access a specific route
 */
export function canAccessRoute(userRole: Role | null | undefined, route: string): boolean {
  if (!userRole) return false

  const allowedRoles = routeRoles[route]
  if (!allowedRoles) return false

  return allowedRoles.includes(userRole)
}

/**
 * Get first accessible route for user based on role
 */
export function getFirstAccessibleRoute(userRole: Role | null | undefined): string {
  const routesInOrder = [
    '/dashboard',
    '/admanager',
    '/google-sheets',
    '/payments',
    '/admin',
    '/settings', // Settings เป็นตัวสุดท้าย (fallback)
  ]

  console.log('[getFirstAccessibleRoute] User role:', userRole)

  for (const route of routesInOrder) {
    if (canAccessRoute(userRole, route)) {
      console.log('[getFirstAccessibleRoute] First accessible route:', route)
      return route
    }
  }

  return '/settings' // Default fallback
}
