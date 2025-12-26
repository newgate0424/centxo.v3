/**
 * GET /api/adsets
 * Fetch ad sets from Meta API for selected ad accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withCacheSWR, generateCacheKey, CacheTTL, deleteCache } from '@/lib/cache/redis';

export async function GET(request: NextRequest) {
  try {
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

    // Get Facebook access token
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected', adSets: [] },
        { status: 400 }
      );
    }

    const forceRefresh = searchParams.get('refresh') === 'true';
    const cacheKey = generateCacheKey('meta:adsets', session.user.id!, adAccountIds.sort().join(','));

    if (forceRefresh) {
      await deleteCache(cacheKey);
      await deleteCache(`${cacheKey}:meta`);
    }

    // SWR caching: 5 min fresh, 1 hour stale
    const STALE_TTL = 3600;
    const result = await withCacheSWR(
      cacheKey,
      CacheTTL.ADSETS_LIST,
      STALE_TTL,
      async () => {
        return await fetchAdSetsFromMeta(adAccountIds, accessToken);
      }
    );

    return NextResponse.json({
      adSets: result.data,
      count: result.data.length,
      isStale: result.isStale,
    });
  } catch (error) {
    console.error('Error in GET /api/adsets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad sets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fetchAdSetsFromMeta(adAccountIds: string[], accessToken: string) {
  const allAdSets: any[] = [];

  // Chunk requests to avoid rate limiting
  const CHUNK_SIZE = 3;

  for (let i = 0; i < adAccountIds.length; i += CHUNK_SIZE) {
    const chunk = adAccountIds.slice(i, i + CHUNK_SIZE);

    await Promise.all(chunk.map(async (accountId) => {
      try {
        // First, fetch account currency
        const accountResponse = await fetch(
          `https://graph.facebook.com/v22.0/${accountId}?fields=currency&access_token=${accessToken}`
        );

        let accountCurrency = 'USD';
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          accountCurrency = accountData.currency || 'USD';
        }

        const response = await fetch(
          `https://graph.facebook.com/v22.0/${accountId}/adsets?fields=id,name,status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,targeting,created_time,insights{spend,actions,reach,impressions,clicks}&limit=100&access_token=${accessToken}`
        );

        if (response.ok) {
          const data = await response.json();

          // Add account ID and currency to each ad set
          const adSetsWithAccount = data.data.map((adSet: any) => ({
            ...adSet,
            adAccountId: accountId,
            currency: accountCurrency,
          }));

          allAdSets.push(...adSetsWithAccount);
        }
      } catch (err) {
        console.error(`Error fetching ad sets for account ${accountId}:`, err);
      }
    }));

    // Add small delay between chunks to respect rate limits
    if (i + CHUNK_SIZE < adAccountIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Format ad sets for display
  return allAdSets.map((adSet) => {
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
      campaignId: adSet.campaign_id,
      dailyBudget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : 0,
      lifetimeBudget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : 0,
      optimizationGoal: adSet.optimization_goal || '-',
      billingEvent: adSet.billing_event || '-',
      bidAmount: adSet.bid_amount ? parseFloat(adSet.bid_amount) / 100 : 0,
      targeting: adSet.targeting || null,
      createdAt: adSet.created_time,
      adAccountId: adSet.adAccountId,
      currency: adSet.currency,
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
}
