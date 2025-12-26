import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import DashboardLayout from "@/components/DashboardLayout"
import { prisma } from "@/lib/db"
import { Role } from "@/lib/permissions"
import { headers } from "next/headers"
import { logActivity } from "@/lib/activity-log"

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        redirect("/login")
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
        where: { email: session.user.email || '' },
        select: { id: true, email: true, name: true, image: true, role: true }
    })

    const userRole = (user?.role as Role) || 'staff'

    // Log login activity (only if no login in last 30 minutes)
    if (user) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
        const recentLogin = await prisma.activityLog.findFirst({
            where: {
                userId: user.id,
                action: 'login',
                createdAt: { gte: thirtyMinutesAgo }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!recentLogin) {
            // Get IP address
            const headersList = await headers()
            const forwardedFor = headersList.get('x-forwarded-for')
            const realIp = headersList.get('x-real-ip')
            const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
            const userAgent = headersList.get('user-agent') || 'unknown'

            // Log the login
            await logActivity({
                userId: user.id,
                userEmail: user.email || '',
                userName: user.name,
                action: 'login',
                details: {
                    provider: 'session',
                    timestamp: new Date().toISOString()
                },
                ipAddress,
                userAgent
            })
        }
    }

    return (
        <DashboardLayout user={session.user as any} userRole={userRole}>
            {children}
        </DashboardLayout>
    )
}
