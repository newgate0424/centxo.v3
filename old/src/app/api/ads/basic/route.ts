import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAdAccounts, getCampaignsWithDeliveryStatus, getAdSetsWithDeliveryStatus, getAds } from "@/lib/facebook"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "accounts"
    const accountId = searchParams.get("accountId")
    const accountIdsParam = searchParams.get("accountIds")
    const accountIds = accountIdsParam ? accountIdsParam.split(",") : (accountId ? [accountId] : [])

    const campaignIdsParam = searchParams.get("campaignIds")
    const campaignIds = campaignIdsParam ? campaignIdsParam.split(",") : []

    const adSetIdsParam = searchParams.get("adSetIds")
    const adSetIds = adSetIdsParam ? adSetIdsParam.split(",") : []

    const itemId = searchParams.get("itemId") // For fetching single item update
    const noCache = searchParams.get("noCache") === "true" // Check if bypass cache is requested
    const statusFilter = searchParams.get("status") // Status filter for ads (active, paused, etc.)

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

        // Try to get from Redis cache first - include status in cache key
        const cacheKey = `ads:basic:${session.user.id}:${type}:${accountIds.join(',')}:${campaignIds.join(',')}:${adSetIds.join(',')}:${statusFilter || 'all'}`
        const { getCached, setCache } = await import('@/lib/redis-cache')

        console.log(`[API /ads/basic] type=${type}, accountIds=${accountIds.join(',')}, status=${statusFilter}, noCache=${noCache}`)

        // Skip cache if noCache is true (for real-time updates after toggle)
        if (!noCache) {
            const cached = await getCached<any[]>(cacheKey)
            if (cached) {
                console.log(`[Cache HIT] ${cacheKey}`)
                return NextResponse.json({ data: cached, cached: true })
            }
        } else {
            console.log(`[Cache BYPASS] Real-time fetch requested`)
        }

        console.log(`[Cache MISS] ${cacheKey}`)

        let result: any[] = []

        // If itemId is specified, fetch only that specific item
        if (itemId) {
            console.log(`[Single Item Fetch] Fetching ${type} with ID: ${itemId}`)
            if (type === "campaigns") {
                const campaignData = await fetch(
                    `https://graph.facebook.com/v21.0/${itemId}?fields=id,name,status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,effective_status,configured_status&access_token=${account.access_token}`
                )
                if (campaignData.ok) {
                    result = [await campaignData.json()]
                }
            } else if (type === "adsets" || type === "adset") {
                const adsetData = await fetch(
                    `https://graph.facebook.com/v21.0/${itemId}?fields=id,name,status,effective_status,configured_status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,campaign_id&access_token=${account.access_token}`
                )
                if (adsetData.ok) {
                    result = [await adsetData.json()]
                }
            } else if (type === "ads" || type === "ad") {
                const adData = await fetch(
                    `https://graph.facebook.com/v21.0/${itemId}?fields=id,name,status,effective_status,configured_status,adset_id,campaign_id,creative{title,body,image_url,thumbnail_url,object_story_spec}&access_token=${account.access_token}`
                )
                if (adData.ok) {
                    result = [await adData.json()]
                }
            }
        } else {
            // Normal fetch for multiple items
            if (type === "accounts") {
                result = await getAdAccounts(account.access_token!)
            } else if (type === "campaigns" && accountIds.length > 0) {
                const promises = accountIds.map(id => getCampaignsWithDeliveryStatus(account.access_token!, `act_${id}`))
                const results = await Promise.all(promises)
                result = results.flat()
            } else if (type === "adsets" && accountIds.length > 0) {
                const promises = accountIds.map(id => getAdSetsWithDeliveryStatus(account.access_token!, `act_${id}`, campaignIds.length > 0 ? campaignIds : undefined))
                const results = await Promise.all(promises)
                result = results.flat()
            } else if (type === "ads" && accountIds.length > 0) {
                // First fetch all accounts to get names
                const allAccounts = await getAdAccounts(account.access_token!)
                const accountNameMap = new Map<string, string>()
                allAccounts.forEach((acc: any) => {
                    // acc.id is already without 'act_' prefix (e.g. "1390512161346243")
                    // Store with multiple key formats for flexible matching
                    const cleanId = String(acc.id).replace('act_', '')
                    accountNameMap.set(cleanId, acc.name)
                    accountNameMap.set(`act_${cleanId}`, acc.name)
                    console.log(`[AccountMap] ${cleanId} => ${acc.name}`)
                })

                const promises = accountIds.map(id => getAds(
                    account.access_token!,
                    `act_${id}`,
                    adSetIds.length > 0 ? adSetIds : undefined,
                    campaignIds.length > 0 ? campaignIds : undefined,
                    statusFilter || undefined
                ))
                const results = await Promise.all(promises)

                // Attach account names to each ad
                result = results.flat().map((ad: any) => {
                    const accId = ad.account_id?.replace('act_', '')
                    return {
                        ...ad,
                        accountName: accountNameMap.get(accId) || accountNameMap.get(ad.account_id) || accId
                    }
                })
            }
        }

        // Cache the result with different TTLs based on type (but NOT when noCache is true)
        if (!noCache) {
            const ttl = type === 'accounts' ? 900 : type === 'campaigns' ? 600 : 300 // 15min, 10min, 5min
            await setCache(cacheKey, result, ttl)
        }

        return NextResponse.json({ data: result, cached: false })
    } catch (error: any) {
        console.error("Facebook API Error:", error?.message || error)
        console.error("Error stack:", error?.stack)
        console.error("Error response:", JSON.stringify(error?.response?.data || error?.response || {}, null, 2))

        // Extract meaningful error message
        let errorMessage = "Failed to fetch data"
        if (error?.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message
        } else if (error?.message) {
            errorMessage = error.message
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
