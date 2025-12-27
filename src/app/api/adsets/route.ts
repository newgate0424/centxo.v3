/**
 * GET /api/adsets
 * Fetch ad sets from Meta API for selected ad accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { withCacheSWR, generateCacheKey, CacheTTL, deleteCache } from '@/lib/cache/redis';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = rateLimit(request, RateLimitPresets.standard);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const adAccountId = searchParams.get('adAccountId');

    if (!adAccountId) {
      return NextResponse.json({ error: 'adAccountId is required' }, { status: 400 });
    }

    // Split comma-separated IDs
    const adAccountIds = adAccountId.split(',').filter(Boolean);

    // Get date range parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get Facebook access token
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected', adSets: [] },
        { status: 400 }
      );
    }

    const forceRefresh = searchParams.get('refresh') === 'true';
    const CACHE_VERSION = 'v1';
    const dateRangeKey = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'all';
    const cacheKey = generateCacheKey(
      `meta:adsets:${CACHE_VERSION}`,
      session.user.id!,
      `${adAccountIds.sort().join(',')}:${dateRangeKey}`
    );

    if (forceRefresh) {
      await deleteCache(cacheKey);
      await deleteCache(`${cacheKey}:meta`);
    }

    const STALE_TTL = 3600;
    const result = await withCacheSWR(
      cacheKey,
      CacheTTL.ADSETS_LIST,
      STALE_TTL,
      async () => {
        return await fetchAdSetsFromMeta(adAccountIds, accessToken, dateFrom, dateTo);
      }
    );

    // Ensure we have valid data
    const adsets = result.data?.adsets || [];
    const errors = result.data?.errors || [];

    return NextResponse.json({
      adsets: adsets,
      count: adsets.length,
      errors: errors,
      isStale: result.isStale,
    });
  } catch (error) {
    console.error('Error in GET /api/adsets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad sets', details: error instanceof Error ? error.message : 'Unknown error', adsets: [], errors: [] },
      { status: 500 }
    );
  }
}

async function fetchAdSetsFromMeta(adAccountIds: string[], accessToken: string, dateFrom?: string | null, dateTo?: string | null) {
  const allAdSets: any[] = [];
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

  // Chunk requests to avoid rate limiting
  // Increased from 3 to 10 for better performance while respecting limits
  const CHUNK_SIZE = 10;

  for (let i = 0; i < adAccountIds.length; i += CHUNK_SIZE) {
    const chunk = adAccountIds.slice(i, i + CHUNK_SIZE);

    await Promise.all(chunk.map(async (accountId) => {
      try {
        // Run requests in parallel
        const [accountResponse, adSetsResponse] = await Promise.all([
          fetch(
            `https://graph.facebook.com/v22.0/${accountId}?fields=currency&access_token=${accessToken}`
          ),
          fetch(
            `https://graph.facebook.com/v22.0/${accountId}/adsets?fields=id,name,status,effective_status,configured_status,issues_info,ads{effective_status},campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,targeting,created_time,insights.${insightsTimeRange}{spend,actions,reach,impressions,clicks}&limit=500&access_token=${accessToken}`
          )
        ]);

        let accountCurrency = 'USD';
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          accountCurrency = accountData.currency || 'USD';
        }

        if (adSetsResponse.ok) {
          const data = await adSetsResponse.json();
          const adSets = data.data || [];

          // Add account ID and currency to each ad set
          const adSetsWithAccount = adSets.map((adSet: any) => {
            const insights = adSet.insights?.data?.[0];
            const spend = parseFloat(insights?.spend || '0');

            // Extract messaging contacts from actions
            const actions = insights?.actions || [];
            const messagingContactsAction = actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
            const messagingContacts = parseInt(messagingContactsAction?.value || '0');

            return {
              id: adSet.id,
              name: adSet.name,
              status: adSet.status,
              ads: adSet.ads?.data?.map((a: any) => ({ effectiveStatus: a.effective_status })) || [],
              effectiveStatus: adSet.effective_status,
              configuredStatus: adSet.configured_status,
              issuesInfo: adSet.issues_info || [],
              campaignId: adSet.campaign_id,
              dailyBudget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : 0,
              lifetimeBudget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : 0,
              optimizationGoal: adSet.optimization_goal || '-',
              billingEvent: adSet.billing_event || '-',
              bidAmount: adSet.bid_amount ? parseFloat(adSet.bid_amount) / 100 : 0,
              targeting: adSet.targeting || null,
              createdAt: adSet.created_time,
              adAccountId: accountId,
              currency: accountCurrency,
              metrics: {
                spend: spend,
                reach: parseInt(insights?.reach || '0'),
                impressions: parseInt(insights?.impressions || '0'),
                clicks: parseInt(insights?.clicks || '0'),
                messagingContacts: messagingContacts,
                results: messagingContacts,
                costPerResult: messagingContacts > 0 ? spend / messagingContacts : 0,
              },
            };
          });

          allAdSets.push(...adSetsWithAccount);
        } else {
          const errorData = await adSetsResponse.json();
          console.error(`Meta API Error for account ${accountId}:`, errorData);
          errors.push(`Failed to fetch for account ${accountId}: ${errorData.error?.message || adSetsResponse.statusText}`);
        }
      } catch (err) {
        console.error(`Error fetching ad sets for account ${accountId}:`, err);
        errors.push(`Network or parsing error for account ${accountId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }));

    // Add small delay between chunks to respect rate limits
    if (i + CHUNK_SIZE < adAccountIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return { adsets: allAdSets, errors };
}
