import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { campaignsQuerySchema, validateQueryParams } from '@/lib/validation';
import { withCache, withCacheSWR, generateCacheKey, CacheTTL, deleteCache } from '@/lib/cache/redis';
import { TokenInfo, getValidTokenForAdAccount } from '@/lib/facebook/token-helper';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);

    // Rate limiting (User ID priority)
    const rateLimitResponse = rateLimit(request, RateLimitPresets.standard, session?.user?.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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
        { error: 'Facebook not connected', campaigns: [] },
        { status: 400 }
      );
    }

    // Check for force refresh
    const forceRefresh = searchParams.get('refresh') === 'true';
    const mode = searchParams.get('mode'); // 'lite' or undefined

    // Create cache key
    const CACHE_VERSION = 'v2';
    const dateRangeKey = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'all';
    const cacheKey = generateCacheKey(
      `meta:campaigns:${CACHE_VERSION}`,
      session.user.id!,
      `${adAccountIds.sort().join(',')}:${dateRangeKey}:${mode || 'full'}`
    );

    // Delete cache if force refresh
    if (forceRefresh) {
      await deleteCache(cacheKey);
      await deleteCache(`${cacheKey}:meta`);
    }

    // Fetch campaigns with SWR
    const STALE_TTL = 3600;
    const result = await withCacheSWR(
      cacheKey,
      CacheTTL.CAMPAIGNS_LIST,
      STALE_TTL,
      async () => {
        return await fetchCampaignsFromMeta(adAccountIds, tokens, dateFrom, dateTo, mode);
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

async function fetchCampaignsFromMeta(adAccountIds: string[], tokens: TokenInfo[], dateFrom?: string | null, dateTo?: string | null, mode?: string | null) {
  const allCampaigns: any[] = [];
  const errors: string[] = [];

  // Build insights time range parameter
  let insightsTimeRange = 'date_preset(last_30d)';
  if (dateFrom && dateTo && mode !== 'lite') {
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

    await Promise.all(chunk.map(async (adAccountId) => {
      try {
        // Use helper to find correct token (uses Redis cache)
        const token = await getValidTokenForAdAccount(adAccountId, tokens);

        if (!token) {
          errors.push(`No valid access token found for account ${adAccountId}`);
          return;
        }

        // Fetch Data using the found token
        // Lite Mode: Skip Insights, Skip AdSets, Minimal Fields
        if (mode === 'lite') {
          const campaignsResponse = await fetch(
            `https://graph.facebook.com/v22.0/${adAccountId}/campaigns?fields=id,name,status,effective_status,configured_status,created_time&limit=5&access_token=${token}`
          );

          if (campaignsResponse.ok) {
            const data = await campaignsResponse.json();
            const campaigns = data.data || [];
            const formatted = campaigns.map((campaign: any) => ({
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              effectiveStatus: campaign.effective_status,
              createdAt: new Date(campaign.created_time),
              // Minimal stats (placeholders)
              metrics: { spend: 0, messages: 0, results: 0, costPerResult: 0 },
              adAccountId: adAccountId,
              currency: 'USD'
            }));
            allCampaigns.push(...formatted);
          } else {
            const errorData = await campaignsResponse.json();
            errors.push(`Failed to fetch (lite) for account ${adAccountId}: ${errorData.error?.message}`);
          }
          return; // Done for this account in lite mode
        }

        // Standard Mode (Full)
        // Run requests in parallel
        const [accountResponse, campaignsResponse] = await Promise.all([
          fetch(
            `https://graph.facebook.com/v22.0/${adAccountId}?fields=currency&access_token=${token}`
          ),
          fetch(
            `https://graph.facebook.com/v22.0/${adAccountId}/campaigns?fields=id,name,status,effective_status,configured_status,objective,daily_budget,lifetime_budget,spend_cap,issues_info,adsets{effective_status,ads{effective_status}},created_time,insights.${insightsTimeRange}{spend,actions,cost_per_action_type,reach,impressions,clicks}&limit=500&access_token=${token}`
          )
        ]);

        let accountCurrency = 'USD';
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          accountCurrency = accountData.currency || 'USD';
        }

        if (campaignsResponse.ok) {
          const data = await campaignsResponse.json();
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

            // Get cost per result
            const costPerResult = messages > 0 ? spend / messages : 0;
            const reach = parseInt(insights?.reach || '0');
            const impressions = parseInt(insights?.impressions || '0');
            const clicks = parseInt(insights?.clicks || '0');

            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              effectiveStatus: campaign.effective_status,
              configuredStatus: campaign.configured_status,
              objective: campaign.objective,
              adSets: campaign.adsets?.data?.map((a: any) => ({
                effectiveStatus: a.effective_status,
                ads: a.ads?.data?.map((ad: any) => ({ effectiveStatus: ad.effective_status })) || []
              })) || [],
              dailyBudget: parseFloat(campaign.daily_budget || '0') / 100,
              lifetimeBudget: parseFloat(campaign.lifetime_budget || '0') / 100,
              spendCap: parseFloat(campaign.spend_cap || '0') / 100,
              issuesInfo: campaign.issues_info || [],
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
              adsCount: { total: 0, active: 0 },
              adAccountId: adAccountId,
              currency: accountCurrency
            };
          });

          allCampaigns.push(...formatted);
        } else {
          const errorData = await campaignsResponse.json();
          errors.push(`Failed to fetch for account ${adAccountId}: ${errorData.error?.message || campaignsResponse.statusText}`);
        }
      } catch (err: any) {
        errors.push(`Error for account ${adAccountId}: ${err.message}`);
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
