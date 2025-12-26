import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// DELETE - Delete user account
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = session.user.id

        // Delete ActivityLog first (no cascade relation)
        await db.activityLog.deleteMany({
            where: { userId }
        })

        // Delete user and all related data (cascades due to onDelete: Cascade)
        await db.user.delete({
            where: { id: userId }
        })

        return NextResponse.json({ success: true, message: "Account deleted successfully" })
    } catch (error) {
        console.error("Error deleting account:", error)
        return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }
}
