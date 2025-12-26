import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        await db.account.deleteMany({
            where: {
                userId: session.user.id,
                provider: "facebook",
            },
        })

        return NextResponse.json({ message: "Disconnected successfully" })
    } catch (error) {
        return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
    }
}
