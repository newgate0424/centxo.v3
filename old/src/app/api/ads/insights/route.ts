import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { initFacebookSdk } from "@/lib/facebook"
import { AdAccount } from "facebook-nodejs-business-sdk"
import { getCachedData } from "@/lib/cache"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    const type = searchParams.get("type")

    const accountIdsParam = searchParams.get("accountIds")
    const accountIds = accountIdsParam ? accountIdsParam.split(",") : (accountId ? [accountId] : [])

    const campaignIdsParam = searchParams.get("campaignIds")
    const campaignIds = campaignIdsParam ? campaignIdsParam.split(",") : []

    const adSetIdsParam = searchParams.get("adSetIds")
    const adSetIds = adSetIdsParam ? adSetIdsParam.split(",") : []

    const itemId = searchParams.get("itemId") // For fetching single item update
    const since = searchParams.get("since")
    const until = searchParams.get("until")
    
    const noCache = searchParams.get("noCache") === "true" // Check if bypass cache is requested

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

        initFacebookSdk(account.access_token)

        // Try to get from Redis cache first
        const cacheKey = `ads:insights:${session.user.id}:${type}:${accountIds.join(',')}:${campaignIds.join(',')}:${adSetIds.join(',')}:${since || 'default'}:${until || 'default'}`
        const { getCached, setCache } = await import('@/lib/redis-cache')

        // Skip cache if noCache is true (for real-time updates after toggle)
        if (!noCache) {
            const cached = await getCached<any[]>(cacheKey)
            if (cached) {
                console.log(`[Cache HIT] ${cacheKey}`)
                return NextResponse.json({ data: cached, cached: true })
            }
        } else {
            console.log(`[Cache BYPASS] Real-time insights fetch requested`)
        }

        console.log(`[Cache MISS] ${cacheKey}`)

        let results: any[] = []
        
        // If itemId is specified, fetch only that specific item
        if (itemId && accountIds.length > 0) {
            console.log(`[Single Item Insights] Fetching insights for ${type} with ID: ${itemId}`)
            const adAccount = new AdAccount(`act_${accountIds[0]}`)
            let level: 'account' | 'campaign' | 'adset' | 'ad' = 'account'

            if (type === 'campaigns' || type === 'campaign') level = 'campaign'
            if (type === 'adsets' || type === 'adset') level = 'adset'
            if (type === 'ads' || type === 'ad') level = 'ad'

            const params: any = { 
                level, 
                date_preset: 'maximum',
                filtering: [{ field: `${level}.id`, operator: 'EQUAL', value: itemId }]
            }
            
            if (since && until) {
                params.time_range = { since, until }
                delete params.date_preset
            }

            try {
                const insights: any = await adAccount.getInsights(
                    [
                        'account_id',
                        'campaign_id',
                        'adset_id',
                        'ad_id',
                        'spend',
                        'impressions',
                        'clicks',
                        'cpc',
                        'cpm',
                        'reach',
                        'actions',
                        'cost_per_action_type',
                        'cost_per_unique_click',
                        'cost_per_inline_link_click',
                        'cost_per_inline_post_engagement',
                        'cost_per_outbound_click',
                        'cost_per_thruplay',
                        'video_play_actions',
                        'video_avg_time_watched_actions',
                        'video_p25_watched_actions',
                        'video_p50_watched_actions',
                        'video_p75_watched_actions',
                        'video_p95_watched_actions',
                        'video_p100_watched_actions'
                    ],
                    params
                )

                if (insights && insights.length > 0) {
                    const i = insights[0]
                    const mappedId = i[level + '_id'] || i.account_id
                    
                    // Calculate results and cost per result
                    let resultsCount = 0
                    let costPerResult = 0
                    
                    // Try to find results from actions (usually 'link_click' or objective specific)
                    // This is a simplified logic, ideally we should check objective
                    if (i.actions) {
                        const resultAction = i.actions.find((a: any) => a.action_type === 'link_click' || a.action_type === 'post_engagement' || a.action_type === 'page_engagement')
                        if (resultAction) {
                            resultsCount = parseInt(resultAction.value)
                        }
                    }
                    
                    if (resultsCount > 0 && i.spend) {
                        costPerResult = parseFloat(i.spend) / resultsCount
                    }

                    results = [{
                        id: mappedId,
                        spend: i.spend,
                        impressions: i.impressions,
                        clicks: i.clicks,
                        reach: i.reach,
                        actions: i.actions,
                        costPerActionType: i.cost_per_action_type,
                        results: resultsCount.toString(),
                        costPerResult: costPerResult.toFixed(2),
                        cpm: i.cpm,
                        videoAvgTimeWatched: i.video_avg_time_watched_actions?.[0]?.value,
                        videoPlays: i.video_play_actions?.[0]?.value,
                        videoP25Watched: i.video_p25_watched_actions?.[0]?.value,
                        videoP50Watched: i.video_p50_watched_actions?.[0]?.value,
                        videoP75Watched: i.video_p75_watched_actions?.[0]?.value,
                        videoP95Watched: i.video_p95_watched_actions?.[0]?.value,
                        videoP100Watched: i.video_p100_watched_actions?.[0]?.value,
                    }]
                }
            } catch (err) {
                console.error('Error fetching single item insights:', err)
            }
        } else if (accountIds.length > 0) {
            // Normal fetch for multiple items
            const promises = accountIds.map(async (id) => {
                const adAccount = new AdAccount(`act_${id}`)
                let level: 'account' | 'campaign' | 'adset' | 'ad' = 'account'

                if (type === 'campaigns') level = 'campaign'
                if (type === 'adsets') level = 'adset'
                if (type === 'ads') level = 'ad'

                const params: any = { level, date_preset: 'maximum' }
                if (since && until) {
                    params.time_range = { since, until }
                    delete params.date_preset
                }

                // Add filtering
                if (type === 'adsets' && campaignIds.length > 0) {
                    params.filtering = [{ field: 'campaign.id', operator: 'IN', value: campaignIds }]
                } else if (type === 'ads' && adSetIds.length > 0) {
                    params.filtering = [{ field: 'adset.id', operator: 'IN', value: adSetIds }]
                }

                let allInsights: any[] = []
                let currentInsights: any = await adAccount.getInsights(
                    [
                        'account_id',
                        'campaign_id',
                        'adset_id',
                        'ad_id',
                        'spend',
                        'impressions',
                        'clicks',
                        'cpc',
                        'cpm',
                        'reach',
                        'actions',
                        'cost_per_action_type',
                        'cost_per_unique_click',
                        'cost_per_inline_link_click',
                        'cost_per_inline_post_engagement',
                        'cost_per_outbound_click',
                        'cost_per_thruplay',
                        'video_play_actions',
                        'video_avg_time_watched_actions',
                        'video_p25_watched_actions',
                        'video_p50_watched_actions',
                        'video_p75_watched_actions',
                        'video_p95_watched_actions',
                        'video_p100_watched_actions'
                    ],
                    params
                )

                allInsights = [...currentInsights]
                while (currentInsights.hasNext()) {
                    currentInsights = await currentInsights.next()
                    allInsights = [...allInsights, ...currentInsights]
                }

                console.log(`Insights for ${id} (${level}): Found ${allInsights.length} records`)

                return allInsights.map((i: any) => {
                    const mappedId = i[level + '_id'] || i.account_id

                    // Calculate results and cost per result
                    let resultsCount = 0
                    let costPerResult = 0
                    
                    // Try to find results from actions (usually 'link_click' or objective specific)
                    // This is a simplified logic, ideally we should check objective
                    if (i.actions) {
                        // Prioritize different action types based on common objectives
                        const resultAction = i.actions.find((a: any) => 
                            a.action_type === 'link_click' || 
                            a.action_type === 'post_engagement' || 
                            a.action_type === 'page_engagement' ||
                            a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
                            a.action_type === 'lead'
                        )
                        if (resultAction) {
                            resultsCount = parseInt(resultAction.value)
                        }
                    }
                    
                    if (resultsCount > 0 && i.spend) {
                        costPerResult = parseFloat(i.spend) / resultsCount
                    }

                    return {
                        id: mappedId,
                        spend: i.spend,
                        impressions: i.impressions,
                        clicks: i.clicks,
                        reach: i.reach,
                        actions: i.actions,
                        costPerActionType: i.cost_per_action_type,
                        results: resultsCount.toString(),
                        costPerResult: costPerResult.toFixed(2),
                        cpm: i.cpm,
                        videoAvgTimeWatched: i.video_avg_time_watched_actions?.[0]?.value,
                        videoPlays: i.video_play_actions?.[0]?.value,
                        videoP25Watched: i.video_p25_watched_actions?.[0]?.value,
                        videoP50Watched: i.video_p50_watched_actions?.[0]?.value,
                        videoP75Watched: i.video_p75_watched_actions?.[0]?.value,
                        videoP95Watched: i.video_p95_watched_actions?.[0]?.value,
                        videoP100Watched: i.video_p100_watched_actions?.[0]?.value,
                    }
                })
            })

            const promiseResults = await Promise.all(promises)
            results = promiseResults.flat()
        }

        // Cache insights for 5 minutes (but NOT when noCache is true)
        if (!noCache) {
            await setCache(cacheKey, results, 300)
        }

        return NextResponse.json({ data: results, cached: false })
    } catch (error) {
        console.error("Error fetching Facebook insights:", error)
        return NextResponse.json({ error: "Failed to fetch Facebook insights" }, { status: 500 })
    }
}
