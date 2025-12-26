import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Load user settings
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
                language: true,
                timezone: true,
                currency: true,
                theme: true,
                primaryColor: true,
                compactMode: true,
                showAnimations: true,
                emailNotifications: true,
                campaignAlerts: true,
                weeklyReports: true,
                budgetAlerts: true,
                twoFactorEnabled: true,
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error("Error loading settings:", error)
        return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
    }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        
        // Only allow updating specific fields
        const allowedFields = [
            'language', 'timezone', 'currency', 'theme', 'primaryColor',
            'compactMode', 'showAnimations', 'emailNotifications',
            'campaignAlerts', 'weeklyReports', 'budgetAlerts', 'twoFactorEnabled'
        ]
        
        const updateData: Record<string, any> = {}
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field]
            }
        }

        const user = await db.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
                language: true,
                timezone: true,
                currency: true,
                theme: true,
                primaryColor: true,
                compactMode: true,
                showAnimations: true,
                emailNotifications: true,
                campaignAlerts: true,
                weeklyReports: true,
                budgetAlerts: true,
                twoFactorEnabled: true,
            }
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error("Error updating settings:", error)
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }
}
