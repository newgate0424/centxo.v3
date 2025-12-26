import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ isConnected: false }, { status: 401 })
        }

        const facebookAccount = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "facebook"
            },
            select: {
                providerAccountId: true,
                scope: true,
                expires_at: true
            }
        })

        if (!facebookAccount) {
            return NextResponse.json({ isConnected: false })
        }

        return NextResponse.json({
            isConnected: true,
            providerAccountId: facebookAccount.providerAccountId,
            scope: facebookAccount.scope,
            tokenExpires: facebookAccount.expires_at 
                ? new Date(facebookAccount.expires_at * 1000) 
                : null
        })
    } catch (error) {
        console.error("Failed to fetch Facebook account:", error)
        return NextResponse.json({ isConnected: false }, { status: 500 })
    }
}
