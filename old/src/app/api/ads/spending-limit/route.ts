import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { initFacebookSdk } from "@/lib/facebook"
import { AdAccount, FacebookAdsApi } from "facebook-nodejs-business-sdk"
import { z } from "zod"

// Input validation schema
const spendingLimitSchema = z.object({
    accountId: z.string().min(1, "Account ID is required").regex(/^\d+$/, "Invalid account ID format"),
    action: z.enum(['change', 'reset', 'delete']),
    newLimit: z.string().optional(),
})

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        
        // Validate input
        const validationResult = spendingLimitSchema.safeParse(body)
        if (!validationResult.success) {
            return NextResponse.json({ 
                error: "Invalid input", 
                details: validationResult.error.issues 
            }, { status: 400 })
        }
        
        const { accountId, action, newLimit } = validationResult.data

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
        
        const updateData: any = {}
        const apiUrl = `https://graph.facebook.com/v18.0/act_${accountId}`

        switch (action) {
            case 'change':
                if (!newLimit || parseFloat(newLimit) <= 0) {
                    return NextResponse.json({ error: "Invalid spending limit" }, { status: 400 })
                }
                // Facebook API: spend_cap value is in the currency's smallest unit
                // BUT testing shows it may not need cents conversion
                // Try sending the raw value first (e.g., 50 = $50)
                updateData.spend_cap = newLimit.toString()
                break
            
            case 'reset':
                // Reset means setting spend_cap_action to RESET
                // This resets the amount_spent counter back to 0, keeping the limit
                updateData.spend_cap_action = 'reset'
                break
            
            case 'delete':
                // To REMOVE the spending limit completely
                // According to Facebook API docs: "A value of 0 means no spending-cap"
                try {
                    const deleteResponse = await fetch(`https://graph.facebook.com/v18.0/act_${accountId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            access_token: account.access_token,
                            spend_cap: '0',  // 0 means no spending-cap
                        }).toString()
                    })
                    
                    const deleteResult = await deleteResponse.json()
                    console.log("Delete spend_cap result:", deleteResult)
                    
                    if (deleteResult.error) {
                        return NextResponse.json({ 
                            error: deleteResult.error.message || "Failed to delete spending limit",
                            code: deleteResult.error.code
                        }, { status: 400 })
                    }
                    
                    return NextResponse.json({ 
                        success: true, 
                        message: "Spending limit removed successfully",
                        data: deleteResult
                    })
                } catch (deleteError: any) {
                    console.error("Error deleting spend_cap:", deleteError)
                    return NextResponse.json({ 
                        error: "Failed to remove spending limit",
                    }, { status: 500 })
                }
                break
            
            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        // Update the ad account using fetch to Facebook Graph API
        const params = new URLSearchParams({
            access_token: account.access_token,
            ...updateData
        })

        const response = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'POST',
        })

        const result = await response.json()

        if (result.error) {
            console.error("Facebook API Error:", result.error)
            return NextResponse.json({ 
                error: result.error.message || "Facebook API error",
                code: result.error.code
            }, { status: 400 })
        }

        return NextResponse.json({ 
            success: true, 
            message: `Spending limit ${action}d successfully`,
            data: result
        })

    } catch (error: any) {
        console.error("Error updating spending limit:", error)
        
        // Handle Facebook API errors
        if (error.response?.error) {
            return NextResponse.json({ 
                error: error.response.error.message || "Facebook API error",
                code: error.response.error.code
            }, { status: 400 })
        }
        
        return NextResponse.json({ error: "Failed to update spending limit" }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")

    if (!accountId) {
        return NextResponse.json({ error: "Account ID required" }, { status: 400 })
    }

    try {
        const account = await db.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "facebook",
            },
        })

        if (!account || !account.access_token) {
            return NextResponse.json({ error: "Facebook account not connected" }, { status: 400 })
        }

        // Use fetch to get account data from Facebook Graph API
        const apiUrl = `https://graph.facebook.com/v18.0/act_${accountId}`
        const params = new URLSearchParams({
            access_token: account.access_token,
            fields: 'spend_cap,amount_spent,currency,name'
        })

        const response = await fetch(`${apiUrl}?${params.toString()}`)
        const accountData = await response.json()

        if (accountData.error) {
            return NextResponse.json({ 
                error: accountData.error.message || "Facebook API error" 
            }, { status: 400 })
        }

        return NextResponse.json({ 
            success: true,
            data: {
                id: accountId,
                name: accountData.name,
                spendCap: accountData.spend_cap,
                amountSpent: accountData.amount_spent,
                currency: accountData.currency,
            }
        })

    } catch (error: any) {
        console.error("Error fetching spending limit:", error)
        return NextResponse.json({ error: "Failed to fetch spending limit" }, { status: 500 })
    }
}
