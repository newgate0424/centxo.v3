'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ClientRouteGuardProps {
  children: React.ReactNode
  requiredRoute: string
}

/**
 * Client-side route guard
 * Checks permissions via API and redirects if needed
 */
export default function ClientRouteGuard({ children, requiredRoute }: ClientRouteGuardProps) {
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch(`/api/auth/check-access?route=${encodeURIComponent(requiredRoute)}`)
        const data = await response.json()
        
        if (!data.hasAccess && data.redirectTo) {
          router.replace(data.redirectTo)
        }
      } catch (error) {
        console.error('Failed to check route access:', error)
      }
    }

    checkAccess()
  }, [requiredRoute, router])

  return <>{children}</>
}
