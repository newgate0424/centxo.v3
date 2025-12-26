/**
 * GET /api/campaigns
 * List all campaigns for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { campaignsQuerySchema, validateQueryParams } from '@/lib/validation';
import { withCache, withCacheSWR, generateCacheKey, CacheTTL, deleteCache } from '@/lib/cache/redis';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = rateLimit(request, RateLimitPresets.standard);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const adAccountIdsParam = searchParams.get('adAccountId');

    if (!adAccountIdsParam) {
      return NextResponse.json({ error: 'Ad account ID required' }, { status: 400 });
    }

    const adAccountIds = adAccountIdsParam.split(',').filter(Boolean);

    // Get date range parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get Facebook access token
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected', campaigns: [] },
        { status: 400 }
      );
    }

    // Check for force refresh
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Create cache key with version to invalidate old cache when API structure changes
    const CACHE_VERSION = 'v2'; // Increment this when API response structure changes
    const dateRangeKey = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'all';
    const cacheKey = generateCacheKey(
      `meta:campaigns:${CACHE_VERSION}`,
      session.user.id!,
      `${adAccountIds.sort().join(',')}:${dateRangeKey}`
    );

    // Delete cache if force refresh
    if (forceRefresh) {
      await deleteCache(cacheKey);
      await deleteCache(`${cacheKey}:meta`);
    }

    // Fetch campaigns with SWR caching (stale-while-revalidate)
    // Fresh for 5 minutes, stale data available for 1 hour
    const STALE_TTL = 3600; // 1 hour - how long to keep stale data
    const result = await withCacheSWR(
      cacheKey,
      CacheTTL.CAMPAIGNS_LIST,  // 5 minutes fresh
      STALE_TTL,
      async () => {
        return await fetchCampaignsFromMeta(adAccountIds, accessToken, dateFrom, dateTo);
      }
    );

    return NextResponse.json({
      campaigns: result.data.campaigns,
      total: result.data.campaigns.length,
      errors: result.data.errors,
      isStale: result.isStale,
      revalidating: result.revalidating,
    });
  } catch (error) {
    console.error('Error in GET /api/campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fetchCampaignsFromMeta(adAccountIds: string[], accessToken: string, dateFrom?: string | null, dateTo?: string | null) {
  const allCampaigns: any[] = [];
  const errors: string[] = [];

  // Build insights time range parameter
  let insightsTimeRange = 'date_preset(last_30d)';
  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const since = fromDate.toISOString().split('T')[0];
    const until = toDate.toISOString().split('T')[0];
    insightsTimeRange = `time_range({'since':'${since}','until':'${until}'})`;
  }

  // Chunk requests to avoid rate limiting - reduced to 3 to be more conservative
  // Facebook Graph API has rate limits, and insights queries count more heavily
  const CHUNK_SIZE = 3;

  for (let i = 0; i < adAccountIds.length; i += CHUNK_SIZE) {
    const chunk = adAccountIds.slice(i, i + CHUNK_SIZE);

    await Promise.all(chunk.map(async (adAccountId) => {
      try {
        // First, fetch account currency
        const accountResponse = await fetch(
          `https://graph.facebook.com/v22.0/${adAccountId}?fields=currency&access_token=${accessToken}`
        );

        let accountCurrency = 'USD';
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          accountCurrency = accountData.currency || 'USD';
        }

        const response = await fetch(
          `https://graph.facebook.com/v22.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,insights.${insightsTimeRange}{spend,actions,cost_per_action_type,reach,impressions,clicks}&access_token=${accessToken}`
        );

        if (response.ok) {
          const data = await response.json();
          const campaigns = data.data || [];

          // Transform to our format
          const formatted = campaigns.map((campaign: any) => {
            const insights = campaign.insights?.data?.[0];
            const messageAction = insights?.actions?.find((a: any) =>
              a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
            );
            const messages = parseInt(messageAction?.value || '0');
            const spend = parseFloat(insights?.spend || '0');

            // Get post engagements
            const postEngagementAction = insights?.actions?.find((a: any) =>
              a.action_type === 'post_engagement'
            );
            const postEngagements = parseInt(postEngagementAction?.value || '0');

            // Get messaging contacts
            const messagingContactsAction = insights?.actions?.find((a: any) =>
              a.action_type === 'onsite_conversion.messaging_first_reply'
            );
            const messagingContacts = parseInt(messagingContactsAction?.value || '0');

            // Get cost per result (messages in this case)
            const costPerResult = messages > 0 ? spend / messages : 0;

            const reach = parseInt(insights?.reach || '0');
            const impressions = parseInt(insights?.impressions || '0');
            const clicks = parseInt(insights?.clicks || '0');

            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              dailyBudget: parseFloat(campaign.daily_budget || '0') / 100,
              lifetimeBudget: parseFloat(campaign.lifetime_budget || '0') / 100,
              createdAt: new Date(campaign.created_time),
              metrics: {
                spend: spend,
                messages: messages,
                costPerMessage: messages > 0 ? spend / messages : 0,
                results: messages,
                costPerResult: costPerResult,
                budget: parseFloat(campaign.daily_budget || campaign.lifetime_budget || '0') / 100,
                reach: reach,
                impressions: impressions,
                postEngagements: postEngagements,
                clicks: clicks,
                messagingContacts: messagingContacts,
                amountSpent: spend,
              },
              adsCount: {
                total: 0,
                active: 0,
              },
              adAccountId: adAccountId,
              currency: accountCurrency
            };
          });

          allCampaigns.push(...formatted);
        } else {
          const errorData = await response.json();
          errors.push(`Failed to fetch for account ${adAccountId}: ${errorData.error?.message || response.statusText}`);
        }
      } catch (err) {
        console.error(`Error fetching campaigns for account ${adAccountId}:`, err);
        errors.push(`Network or parsing error for account ${adAccountId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }));

    // Add small delay between chunks to respect rate limits
    if (i + CHUNK_SIZE < adAccountIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Sort by latest created
  allCampaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { campaigns: allCampaigns, errors };
}
