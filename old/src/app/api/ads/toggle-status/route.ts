import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { initFacebookSdk } from "@/lib/facebook"
import { z } from "zod"
import { getRedisClient } from "@/lib/redis-cache"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bizSdk = require("facebook-nodejs-business-sdk")
const Campaign = bizSdk.Campaign
const AdSet = bizSdk.AdSet
const Ad = bizSdk.Ad

// Input validation schema
const toggleStatusSchema = z.object({
    id: z.string().min(1, "ID is required").regex(/^\d+$/, "Invalid ID format"),
    type: z.enum(['campaign', 'adset', 'ad']),
    status: z.enum(['ACTIVE', 'PAUSED']),
})

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        
        // Validate input
        const validationResult = toggleStatusSchema.safeParse(body)
        if (!validationResult.success) {
            return NextResponse.json({ 
                error: "Invalid input", 
                details: validationResult.error.issues 
            }, { status: 400 })
        }
        
        const { id, type, status } = validationResult.data

        const account = await db.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "facebook",
            },
        })

        if (!account || !account.access_token) {
            return NextResponse.json({ error: "Facebook account not connected" }, { status: 400 })
        }

        initFacebookSdk(account.access_token)

        let result: any

        switch (type) {
            case 'campaign':
                const campaign = new Campaign(id)
                result = await campaign.update([], { status })
                break
            
            case 'adset':
                const adset = new AdSet(id)
                result = await adset.update([], { status })
                break
            
            case 'ad':
                const ad = new Ad(id)
                result = await ad.update([], { status })
                break
            
            default:
                return NextResponse.json({ error: "Invalid type" }, { status: 400 })
        }

        // Clear cache after successful toggle
        try {
            const redis = await getRedisClient()
            if (redis) {
                // ล้าง cache ทั้งหมดที่เกี่ยวข้องกับ ads
                const keys = await redis.keys('ads:*')
                if (keys.length > 0) {
                    await redis.del(...keys)
                    console.log(`✅ Cleared ${keys.length} cache keys after toggle`)
                } else {
                    console.log('⚠️ No cache keys found to clear')
                }
            } else {
                console.log('⚠️ Redis client not available')
            }
        } catch (cacheError) {
            console.error('Failed to clear cache:', cacheError)
            // Don't fail the request if cache clear fails
        }

        return NextResponse.json({ 
            success: true, 
            message: `${type} ${status === 'ACTIVE' ? 'activated' : 'paused'} successfully`,
            data: result
        })

    } catch (error: any) {
        console.error("Error toggling status:", error)
        
        if (error.response?.error) {
            return NextResponse.json({ 
                error: error.response.error.message || "Facebook API error",
                code: error.response.error.code
            }, { status: 400 })
        }
        
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
    }
}
