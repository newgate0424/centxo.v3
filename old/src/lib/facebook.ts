/* eslint-disable @typescript-eslint/no-explicit-any */
import { FacebookAdsApi, AdAccount, User } from "facebook-nodejs-business-sdk"
import { getCached, setCache } from './redis-cache'

export const initFacebookSdk = (accessToken: string) => {
    FacebookAdsApi.init(accessToken)
}

export const getAdAccounts = async (accessToken: string) => {
    initFacebookSdk(accessToken)
    const user = new User("me")
    const accounts = await user.getAdAccounts([
        "account_id",
        "name",
        "account_status",
        "currency",
        "timezone_name",
        "timezone_offset_hours_utc",
        "business_country_code",
        "funding_source_details",
        "spend_cap",
        "amount_spent",
        "disable_reason",
    ], { limit: 1000 })

    // Get active ads count for each account
    const accountsWithAdsCount = await Promise.all(
        accounts.map(async (account: any) => {
            try {
                const offset = account.timezone_offset_hours_utc || 0
                const formattedOffset = offset >= 0 ? `+${offset}` : `${offset}`

                // Calculate delivery status for accounts first
                let deliveryStatus = account.account_status === 1 ? "ACTIVE" : "INACTIVE"

                // Check disable reasons - this should be checked first
                if (account.disable_reason && account.disable_reason !== 0) {
                    deliveryStatus = "DISABLED"
                }
                // Check account_status for disabled accounts (status 2 = DISABLED)
                else if (account.account_status === 2) {
                    deliveryStatus = "DISABLED"
                }
                // Check if spend limit reached (spend_cap is in cents, amount_spent is also in cents)
                else if (account.spend_cap && account.amount_spent) {
                    const spendCap = parseFloat(account.spend_cap)
                    const amountSpent = parseFloat(account.amount_spent)
                    if (spendCap > 0 && amountSpent >= spendCap) {
                        deliveryStatus = "SPEND_LIMIT_REACHED"
                    }
                }

                // Only count active ads if account is active
                let activeAdsCount = 0
                if (account.account_status === 1 && deliveryStatus !== "DISABLED") {
                    try {
                        const adAccount = new AdAccount(`act_${account.account_id}`)
                        const ads = await adAccount.getAds(["id", "effective_status"], {
                            limit: 1000,
                            filtering: [{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]
                        })
                        activeAdsCount = ads.length
                    } catch (error) {
                        console.error(`Error fetching ads for account ${account.account_id}:`, error)
                    }
                }

                return {
                    id: account.account_id,
                    name: account.name,
                    status: account.account_status === 1 ? "ACTIVE" : "INACTIVE",
                    deliveryStatus: deliveryStatus,
                    activeAdsCount: activeAdsCount,
                    currency: account.currency,
                    timezone: `${account.timezone_name || 'Unknown'} | ${formattedOffset}`,
                    country: account.business_country_code || 'Unknown',
                    paymentMethod: account.funding_source_details?.display_string || "N/A",
                    spendCap: account.spend_cap,
                    amountSpent: account.amount_spent,
                }
            } catch (error) {
                console.error(`Error processing account ${account.account_id}:`, error)
                // Return a minimal account object on error
                return {
                    id: account.account_id,
                    name: account.name || 'Unknown',
                    status: "INACTIVE",
                    deliveryStatus: "ERROR",
                    activeAdsCount: 0,
                    currency: account.currency || 'USD',
                    timezone: 'Unknown',
                    country: 'Unknown',
                    paymentMethod: "N/A",
                    spendCap: null,
                    amountSpent: null,
                }
            }
        })
    )

    return accountsWithAdsCount
}

export const getCampaigns = async (accessToken: string, accountId: string) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)
    const campaigns = await account.getCampaigns(["id", "name", "status", "objective", "daily_budget", "lifetime_budget", "effective_status"], { limit: 1000 })
    return campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        effectiveStatus: campaign.effective_status,
        objective: campaign.objective,
        dailyBudget: campaign.daily_budget,
        lifetimeBudget: campaign.lifetime_budget,
    }))
}

// Get campaigns with calculated delivery status based on child ad sets and ads
export const getCampaignsWithDeliveryStatus = async (accessToken: string, accountId: string) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)

    // First check if account is disabled
    const accountInfo = await account.read(['account_status', 'disable_reason'])
    const isAccountDisabled = accountInfo.account_status !== 1 || (accountInfo.disable_reason && accountInfo.disable_reason !== 0)

    // Get campaigns, adsets, and ads in parallel
    const [campaigns, adsets, ads] = await Promise.all([
        account.getCampaigns(["id", "name", "status", "objective", "daily_budget", "lifetime_budget", "effective_status"], { limit: 1000 }),
        account.getAdSets(["id", "name", "status", "campaign_id", "effective_status"], { limit: 1000 }),
        account.getAds(["id", "name", "status", "adset_id", "effective_status"], { limit: 1000 })
    ])

    // Create lookup maps
    const adsByAdSetId = new Map<string, any[]>()
    ads.forEach((ad: any) => {
        const adsetId = ad.adset_id
        if (!adsByAdSetId.has(adsetId)) {
            adsByAdSetId.set(adsetId, [])
        }
        adsByAdSetId.get(adsetId)!.push(ad)
    })

    const adsetsByCampaignId = new Map<string, any[]>()
    adsets.forEach((adset: any) => {
        const campaignId = adset.campaign_id
        if (!adsetsByCampaignId.has(campaignId)) {
            adsetsByCampaignId.set(campaignId, [])
        }
        adsetsByCampaignId.get(campaignId)!.push(adset)
    })

    return campaigns.map((campaign: any) => {
        // If account is disabled, all campaigns show as account disabled
        if (isAccountDisabled) {
            return {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                effectiveStatus: campaign.effective_status,
                deliveryStatus: 'ACCOUNT_DISABLED',
                objective: campaign.objective,
                dailyBudget: campaign.daily_budget,
                lifetimeBudget: campaign.lifetime_budget,
            }
        }

        const campaignAdSets = adsetsByCampaignId.get(campaign.id) || []
        const campaignAds: any[] = []
        campaignAdSets.forEach((adset: any) => {
            const adsForAdSet = adsByAdSetId.get(adset.id) || []
            campaignAds.push(...adsForAdSet)
        })

        // Calculate delivery status based on ads
        let deliveryStatus = campaign.effective_status

        if (campaign.status === 'PAUSED') {
            deliveryStatus = 'CAMPAIGN_OFF'
        } else if (campaignAdSets.length === 0) {
            deliveryStatus = 'NO_ADSETS'
        } else if (campaignAds.length === 0) {
            deliveryStatus = 'NO_ADS'
        } else {
            const activeAdSets = campaignAdSets.filter((as: any) => as.effective_status === 'ACTIVE')
            const activeAds = campaignAds.filter((a: any) => a.effective_status === 'ACTIVE')
            const pausedAds = campaignAds.filter((a: any) => a.status === 'PAUSED')
            const pausedAdSets = campaignAdSets.filter((as: any) => as.status === 'PAUSED')

            if (activeAds.length > 0) {
                deliveryStatus = 'ACTIVE'
            } else if (pausedAds.length === campaignAds.length && campaignAds.length > 0) {
                deliveryStatus = pausedAds.length === 1 ? 'AD_OFF' : 'ADS_OFF'
            } else if (pausedAdSets.length === campaignAdSets.length && campaignAdSets.length > 0) {
                deliveryStatus = pausedAdSets.length === 1 ? 'ADSET_OFF' : 'ADSETS_INACTIVE'
            } else if (activeAdSets.length === 0) {
                deliveryStatus = 'ADSETS_INACTIVE'
            }
        }

        return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            effectiveStatus: campaign.effective_status,
            deliveryStatus: deliveryStatus,
            objective: campaign.objective,
            dailyBudget: campaign.daily_budget,
            lifetimeBudget: campaign.lifetime_budget,
        }
    })
}

// Get ad sets with calculated delivery status based on child ads
export const getAdSetsWithDeliveryStatus = async (accessToken: string, accountId: string, campaignIds?: string[]) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)

    // First check if account is disabled
    const accountInfo = await account.read(['account_status', 'disable_reason'])
    const isAccountDisabled = accountInfo.account_status !== 1 || (accountInfo.disable_reason && accountInfo.disable_reason !== 0)

    const adsetParams: any = { limit: 1000 }
    if (campaignIds && campaignIds.length > 0) {
        adsetParams.filtering = [{
            field: 'campaign.id',
            operator: 'IN',
            value: campaignIds
        }]
    }

    const [adsets, ads, campaigns] = await Promise.all([
        account.getAdSets(["id", "name", "status", "campaign_id", "daily_budget", "lifetime_budget", "effective_status"], adsetParams),
        account.getAds(["id", "name", "status", "adset_id", "effective_status"], { limit: 1000 }),
        account.getCampaigns(["id", "objective"], { limit: 1000 })
    ])

    // Create lookup map for campaign objectives
    const campaignObjectiveMap = new Map<string, string>()
    campaigns.forEach((campaign: any) => {
        campaignObjectiveMap.set(campaign.id, campaign.objective)
    })

    // Create lookup map for ads by adset
    const adsByAdSetId = new Map<string, any[]>()
    ads.forEach((ad: any) => {
        const adsetId = ad.adset_id
        if (!adsByAdSetId.has(adsetId)) {
            adsByAdSetId.set(adsetId, [])
        }
        adsByAdSetId.get(adsetId)!.push(ad)
    })

    return adsets.map((adset: any) => {
        // If account is disabled, all adsets show as account disabled
        if (isAccountDisabled) {
            return {
                id: adset.id,
                name: adset.name,
                status: adset.status,
                effectiveStatus: adset.effective_status,
                deliveryStatus: 'ACCOUNT_DISABLED',
                campaignId: adset.campaign_id,
                dailyBudget: adset.daily_budget,
                lifetimeBudget: adset.lifetime_budget,
            }
        }

        const adsetAds = adsByAdSetId.get(adset.id) || []

        // Calculate delivery status based on ads
        let deliveryStatus = adset.effective_status

        if (adset.status === 'PAUSED') {
            deliveryStatus = 'ADSET_OFF'
        } else if (adsetAds.length === 0) {
            deliveryStatus = 'NO_ADS'
        } else {
            const activeAds = adsetAds.filter((a: any) => a.effective_status === 'ACTIVE')
            const pausedAds = adsetAds.filter((a: any) => a.status === 'PAUSED')

            if (activeAds.length > 0) {
                deliveryStatus = 'ACTIVE'
            } else if (pausedAds.length === adsetAds.length && adsetAds.length > 0) {
                deliveryStatus = pausedAds.length === 1 ? 'AD_OFF' : 'ADS_INACTIVE'
            }
        }

        return {
            id: adset.id,
            name: adset.name,
            status: adset.status,
            effectiveStatus: adset.effective_status,
            deliveryStatus: deliveryStatus,
            campaignId: adset.campaign_id,
            objective: campaignObjectiveMap.get(adset.campaign_id) || null,
            dailyBudget: adset.daily_budget,
            lifetimeBudget: adset.lifetime_budget,
        }
    })
}

export const getAdSets = async (accessToken: string, accountId: string, campaignIds?: string[]) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)
    const params: any = {
        fields: ["id", "name", "status", "campaign_id"],
        limit: 1000
    }

    if (campaignIds && campaignIds.length > 0) {
        params.filtering = [{
            field: 'campaign.id',
            operator: 'IN',
            value: campaignIds
        }]
    }

    const adsets = await account.getAdSets(["id", "name", "status", "campaign_id", "daily_budget", "lifetime_budget", "effective_status"], params)
    return adsets.map((adset: any) => ({
        id: adset.id,
        name: adset.name,
        status: adset.status,
        effectiveStatus: adset.effective_status,
        campaignId: adset.campaign_id,
        dailyBudget: adset.daily_budget,
        lifetimeBudget: adset.lifetime_budget,
    }))
}

export const getAds = async (accessToken: string, accountId: string, adSetIds?: string[], campaignIds?: string[], statusFilter?: string) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)

    // First check if account is disabled
    const accountInfo = await account.read(['account_status', 'disable_reason'])
    const isAccountDisabled = accountInfo.account_status !== 1 || (accountInfo.disable_reason && accountInfo.disable_reason !== 0)

    const params: any = {
        fields: ["id", "name", "status", "adset_id"],
        limit: 1000
    }

    // Build filtering array
    const filters: any[] = []

    // Filter by status at API level (most efficient - reduces data by 70-90%)
    if (statusFilter) {
        let statusValues: string[] = []
        switch (statusFilter) {
            case 'active':
                statusValues = ['ACTIVE']
                break
            case 'paused':
                statusValues = ['PAUSED']
                break
            case 'pending':
                statusValues = ['IN_PROCESS', 'PENDING_REVIEW', 'WITH_ISSUES']
                break
            case 'disapproved':
                statusValues = ['DISAPPROVED']
                break
            case 'not_delivering':
                statusValues = ['CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'NOT_DELIVERING']
                break
            default:
                // 'all' or unknown - don't filter by status
                break
        }
        if (statusValues.length > 0) {
            filters.push({
                field: 'effective_status',
                operator: 'IN',
                value: statusValues
            })
        }
    }

    // Filter by adSetIds if provided
    if (adSetIds && adSetIds.length > 0) {
        filters.push({
            field: 'adset.id',
            operator: 'IN',
            value: adSetIds
        })
    }

    // Apply all filters
    if (filters.length > 0) {
        params.filtering = filters
    }


    // Fetch ads, adsets, and campaigns in parallel to get budget info
    const [ads, adsets, campaigns] = await Promise.all([
        account.getAds(["id", "name", "status", "adset_id", "effective_status", "creative{thumbnail_url,image_url,object_story_spec,actor_id,effective_object_story_id}"], params),
        account.getAdSets(["id", "campaign_id", "daily_budget", "lifetime_budget", "targeting"], { limit: 1000 }),
        account.getCampaigns(["id", "daily_budget", "lifetime_budget", "objective"], { limit: 1000 })
    ])

    // Create a map of campaign budgets and objectives
    const campaignBudgetMap = new Map<string, { dailyBudget?: string, lifetimeBudget?: string, objective?: string }>()
    campaigns.forEach((campaign: any) => {
        campaignBudgetMap.set(campaign.id, {
            dailyBudget: campaign.daily_budget,
            lifetimeBudget: campaign.lifetime_budget,
            objective: campaign.objective
        })
    })

    // Create a map of adset budgets (with campaign fallback info) and targeting
    const adsetBudgetMap = new Map<string, { dailyBudget?: string, lifetimeBudget?: string, campaignId?: string, targeting?: any }>()
    adsets.forEach((adset: any) => {
        adsetBudgetMap.set(adset.id, {
            dailyBudget: adset.daily_budget,
            lifetimeBudget: adset.lifetime_budget,
            campaignId: adset.campaign_id,
            targeting: adset.targeting
        })
    })

    // Filter ads by campaign if campaignIds provided (server-side filtering)
    let filteredAds = ads
    if (campaignIds && campaignIds.length > 0 && !adSetIds) {
        // Create a set of campaign IDs for faster lookup
        const campaignIdSet = new Set(campaignIds)

        // Filter ads whose adset belongs to one of the selected campaigns
        filteredAds = ads.filter((ad: any) => {
            const adsetInfo = adsetBudgetMap.get(ad.adset_id)
            return adsetInfo && adsetInfo.campaignId && campaignIdSet.has(adsetInfo.campaignId)
        })

        console.log(`[getAds] Filtered ${ads.length} ads to ${filteredAds.length} ads for campaigns: ${campaignIds.join(',')}`)
    }


    // Collect unique page IDs to fetch page info
    const pageIds = new Set<string>()
    filteredAds.forEach((ad: any) => {
        // SDK returns data in _data property or direct access
        const adData = ad._data || ad
        const creative = adData.creative

        const pageId = creative?.actor_id || creative?.object_story_spec?.page_id
        if (pageId) pageIds.add(String(pageId))

        // Also try to get page ID from effective_object_story_id (format: pageId_postId)
        if (creative?.effective_object_story_id) {
            const parts = creative.effective_object_story_id.split('_')
            if (parts.length > 0) {
                pageIds.add(parts[0])
            }
        }
    })

    // Fetch page info with Redis caching (24 hour TTL - pages rarely change)
    const pageInfoMap = new Map<string, { name: string, username?: string }>()
    if (pageIds.size > 0) {
        const pageIdsArray = Array.from(pageIds)

        // Check cache for each page ID first
        const uncachedPageIds: string[] = []

        for (const pageId of pageIdsArray) {
            const cacheKey = `page:info:${pageId}`
            const cached = await getCached<{ name: string, username?: string }>(cacheKey)
            if (cached) {
                pageInfoMap.set(pageId, cached)
            } else {
                uncachedPageIds.push(pageId)
            }
        }

        // Only fetch pages that are not in cache
        if (uncachedPageIds.length > 0) {
            console.log(`[getAds] Fetching ${uncachedPageIds.length} uncached pages (${pageIdsArray.length - uncachedPageIds.length} from cache)`)

            // Fetch uncached pages in parallel
            const pagePromises = uncachedPageIds.map(async (pageId) => {
                try {
                    const response = await fetch(
                        `https://graph.facebook.com/v18.0/${pageId}?fields=name,username,link&access_token=${accessToken}`
                    )
                    const data = await response.json()

                    if (data && !data.error) {
                        const pageInfo = {
                            name: data.name,
                            username: data.username
                        }
                        // Cache for 24 hours (86400 seconds)
                        await setCache(`page:info:${pageId}`, pageInfo, 86400)
                        return { id: pageId, ...pageInfo }
                    }
                } catch (error) {
                    console.error(`Error fetching page ${pageId}:`, error)
                }
                return null
            })

            const results = await Promise.all(pagePromises)
            results.forEach((result) => {
                if (result) {
                    pageInfoMap.set(result.id, {
                        name: result.name,
                        username: result.username
                    })
                }
            })
        } else {
            console.log(`[getAds] All ${pageIdsArray.length} pages loaded from cache`)
        }
    }

    return filteredAds.map((ad: any) => {
        let imageUrl = ad.creative?.thumbnail_url || ad.creative?.image_url

        // Try to extract from object_story_spec if not found
        if (!imageUrl && ad.creative?.object_story_spec) {
            const spec = ad.creative.object_story_spec
            imageUrl = spec.link_data?.picture || spec.video_data?.image_url || spec.photo_data?.url
        }

        // Extract page info from creative
        const pageId = ad.creative?.actor_id || ad.creative?.object_story_spec?.page_id || null
        const pageInfo = pageId ? pageInfoMap.get(pageId) : null
        const pageName = pageInfo?.username || pageInfo?.name || null

        // Get budget from parent AdSet, or fall back to Campaign budget (CBO)
        const adsetInfo = adsetBudgetMap.get(ad.adset_id)
        let dailyBudget = adsetInfo?.dailyBudget
        let lifetimeBudget = adsetInfo?.lifetimeBudget
        let budgetSource: 'adset' | 'campaign' | null = null
        let objective: string | null = null

        // Check if AdSet has its own budget
        if (dailyBudget || lifetimeBudget) {
            budgetSource = 'adset'
        }
        // If AdSet has no budget, use Campaign budget (Campaign Budget Optimization)
        if (adsetInfo?.campaignId) {
            const campaignInfo = campaignBudgetMap.get(adsetInfo.campaignId)
            if (!dailyBudget && !lifetimeBudget) {
                dailyBudget = campaignInfo?.dailyBudget
                lifetimeBudget = campaignInfo?.lifetimeBudget
                if (dailyBudget || lifetimeBudget) {
                    budgetSource = 'campaign'
                }
            }
            objective = campaignInfo?.objective || null
        }

        // Get targeting info from adset
        const targeting = adsetInfo?.targeting
        let targetingData = null

        if (targeting) {
            // Age range
            const ageRange = (targeting.age_min || targeting.age_max)
                ? `${targeting.age_min || 18}-${targeting.age_max || 65}`
                : null

            // Countries
            let countries: string[] = []
            if (targeting.geo_locations) {
                if (targeting.geo_locations.countries) {
                    countries = targeting.geo_locations.countries
                }
                if (targeting.geo_locations.regions && targeting.geo_locations.regions.length > 0) {
                    countries.push(`+${targeting.geo_locations.regions.length} regions`)
                }
                if (targeting.geo_locations.cities && targeting.geo_locations.cities.length > 0) {
                    countries.push(`+${targeting.geo_locations.cities.length} cities`)
                }
            }

            // Interests - get all interests
            const interests: string[] = []
            if (targeting.flexible_spec && targeting.flexible_spec.length > 0) {
                targeting.flexible_spec.forEach((spec: any) => {
                    if (spec.interests) {
                        interests.push(...spec.interests.map((i: any) => i.name || i.id))
                    }
                })
            }
            if (targeting.interests && targeting.interests.length > 0) {
                interests.push(...targeting.interests.map((i: any) => i.name || i.id))
            }

            targetingData = {
                age: ageRange,
                countries: countries.length > 0 ? countries : null,
                interests: interests.length > 0 ? interests : null
            }
        }

        return {
            id: ad.id,
            name: ad.name,
            status: ad.status,
            effectiveStatus: ad.effective_status,
            deliveryStatus: isAccountDisabled ? 'ACCOUNT_DISABLED' : ad.effective_status,
            adsetId: ad.adset_id,
            account_id: accountId,
            objective,
            pageId,
            pageName,
            dailyBudget,
            lifetimeBudget,
            budgetSource,
            targeting: targetingData,
            creative: ad.creative ? {
                thumbnailUrl: imageUrl,
                imageUrl: imageUrl // Use same URL for both for now
            } : null
        }
    })
}

export const getInsights = async (
    accessToken: string,
    accountId: string,
    level: 'campaign' | 'adset' | 'ad',
    dateRange?: { from: string, to: string }
) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)
    try {
        const fields = [
            'spend', 'impressions', 'clicks', 'cpc', 'ctr', 'reach', 'frequency', 'actions',
            'video_avg_time_watched_actions',
            'video_play_actions',
            'video_p25_watched_actions',
            'video_p50_watched_actions',
            'video_p75_watched_actions',
            'video_p95_watched_actions',
            'video_p100_watched_actions',
            'cost_per_action_type'
        ]
        if (level === 'campaign') fields.push('campaign_id')
        if (level === 'adset') fields.push('adset_id')
        if (level === 'ad') fields.push('ad_id')

        const params: any = {
            level,
            limit: 1000
        }

        if (dateRange) {
            params.time_range = {
                since: dateRange.from,
                until: dateRange.to
            }
        } else {
            params.date_preset = 'maximum'
        }

        const insights = await account.getInsights(fields, params)

        return insights.map((i: any) => {
            const getActionValue = (actions: any[], type: string) => {
                const action = actions?.find((a: any) => a.action_type === type)
                return action ? parseFloat(action.value) : 0
            }

            const getCostValue = (costs: any[], type: string) => {
                const cost = costs?.find((c: any) => c.action_type === type)
                return cost ? parseFloat(cost.value) : 0
            }

            return {
                id: i.campaign_id || i.adset_id || i.ad_id,
                spend: i.spend,
                impressions: i.impressions,
                clicks: i.clicks,
                cpc: i.cpc,
                ctr: i.ctr,
                reach: i.reach,
                frequency: i.frequency,
                postEngagements: getActionValue(i.actions, 'post_engagement'),
                newMessagingContacts: getActionValue(i.actions, 'onsite_conversion.messaging_conversation_started_7d'),
                costPerNewMessagingContact: getCostValue(i.cost_per_action_type, 'onsite_conversion.messaging_conversation_started_7d'),
                videoAvgTimeWatched: i.video_avg_time_watched_actions?.[0]?.value,
                videoPlays: i.video_play_actions?.[0]?.value,
                video3SecWatched: getActionValue(i.actions, 'video_view'), // 'video_view' is often 3-second views
                videoP25Watched: i.video_p25_watched_actions?.[0]?.value,
                videoP50Watched: i.video_p50_watched_actions?.[0]?.value,
                videoP75Watched: i.video_p75_watched_actions?.[0]?.value,
                videoP95Watched: i.video_p95_watched_actions?.[0]?.value,
                videoP100Watched: i.video_p100_watched_actions?.[0]?.value,
                actions: i.actions,
                costPerActionType: i.cost_per_action_type
            }
        })
    } catch (error) {
        console.error(`Error fetching insights for ${accountId} at level ${level}:`, error)
        return []
    }
}
