import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { withCacheSWR, generateCacheKey, CacheTTL, deleteCache } from '@/lib/cache/redis';
import { TokenInfo, getValidTokenForAdAccount } from '@/lib/facebook/token-helper';

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

    // Fetch user with team members to get all tokens
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        teamMembers: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Collect all tokens
    const tokens: TokenInfo[] = [];
    const mainAccessToken = (session as any).accessToken;
    if (mainAccessToken) {
      tokens.push({ token: mainAccessToken, name: 'Main' });
    }
    if ((user as any).teamMembers) {
      (user as any).teamMembers.forEach((m: any) => {
        if (m.accessToken) {
          tokens.push({ token: m.accessToken, name: m.facebookName || 'Member' });
        }
      });
    }

    if (tokens.length === 0) {
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
        return await fetchAdSetsFromMeta(adAccountIds, tokens, dateFrom, dateTo);
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

async function fetchAdSetsFromMeta(adAccountIds: string[], tokens: TokenInfo[], dateFrom?: string | null, dateTo?: string | null) {
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
  const CHUNK_SIZE = 10;

  for (let i = 0; i < adAccountIds.length; i += CHUNK_SIZE) {
    const chunk = adAccountIds.slice(i, i + CHUNK_SIZE);

    await Promise.all(chunk.map(async (accountId) => {
      // Use helper to find correct token (uses Redis cache)
      const token = await getValidTokenForAdAccount(accountId, tokens);

      if (!token) {
        errors.push(`No valid access token found for account ${accountId}`);
        return;
      }

      try {
        const accountResponse = await fetch(
          `https://graph.facebook.com/v22.0/${accountId}?fields=currency&access_token=${token}`
        );

        // accountResponse check omitted as token helper confirms access, but we need fields
        if (!accountResponse.ok) {
          // Should potentially retry token here? Helper should have returned a valid one.
        }

        const accountData = await accountResponse.json();
        const accountCurrency = accountData.currency || 'USD';

        const adSetsResponse = await fetch(
          `https://graph.facebook.com/v22.0/${accountId}/adsets?fields=id,name,status,effective_status,configured_status,issues_info,ads{effective_status},campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,targeting,created_time,insights.${insightsTimeRange}{spend,actions,reach,impressions,clicks}&limit=500&access_token=${token}`
        );

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
          errors.push(`Failed to fetch for account ${accountId}: ${errorData.error?.message || adSetsResponse.statusText}`);
        }

      } catch (err: any) {
        errors.push(`Error for account ${accountId}: ${err.message}`);
      }
    }));

    if (i + CHUNK_SIZE < adAccountIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return { adsets: allAdSets, errors };
}
