import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { withCache, withCacheSWR, generateCacheKey, CacheTTL, deleteCache } from '@/lib/cache/redis';
import { TokenInfo, getValidTokenForAdAccount, getValidTokenForPage } from '@/lib/facebook/token-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Rate limiting (User ID priority)
    const rateLimitResponse = rateLimit(request, RateLimitPresets.standard, session?.user?.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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
        { error: 'Facebook not connected', ads: [] },
        { status: 400 }
      );
    }

    const forceRefresh = searchParams.get('refresh') === 'true';
    const CACHE_VERSION = 'v1';
    const dateRangeKey = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'all';
    const cacheKey = generateCacheKey(`meta:ads:${CACHE_VERSION}`, session.user.id!, `${adAccountIds.sort().join(',')}:${dateRangeKey}`);

    if (forceRefresh) {
      await deleteCache(cacheKey);
      await deleteCache(`${cacheKey}:meta`);
    }

    // SWR caching: 5 min fresh, 1 hour stale
    const STALE_TTL = 3600;
    const result = await withCacheSWR(
      cacheKey,
      CacheTTL.ADS_LIST,
      STALE_TTL,
      async () => {
        return await fetchAdsFromMeta(adAccountIds, tokens, dateFrom, dateTo);
      }
    );

    return NextResponse.json({
      ads: result.data,
      count: result.data.length,
      isStale: result.isStale,
    });
  } catch (error) {
    console.error('Error in GET /api/ads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ads', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fetchAdsFromMeta(adAccountIds: string[], tokens: TokenInfo[], dateFrom?: string | null, dateTo?: string | null) {
  const allAds: any[] = [];

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
        // console.warn(`No valid token for account ${accountId}`);
        return;
      }

      try {
        const accountResponse = await fetch(
          `https://graph.facebook.com/v22.0/${accountId}?fields=currency&access_token=${token}`
        );

        if (!accountResponse.ok) {
          // If token helper returned a working token, this might be a specific error
          // but we can skip
        }

        const accountData = await accountResponse.json();
        const accountCurrency = accountData.currency || 'USD';

        const adsResponse = await fetch(
          `https://graph.facebook.com/v22.0/${accountId}/ads?fields=id,name,status,adset_id,campaign_id,adset{targeting,daily_budget,lifetime_budget},creative{id,name,title,body,image_url,thumbnail_url,object_story_spec,asset_feed_spec,effective_object_story_id,object_story_id},effective_status,configured_status,issues_info,created_time,insights.${insightsTimeRange}{spend,actions,reach,impressions,clicks}&limit=500&access_token=${token}`
        );

        if (adsResponse.ok) {
          const data = await adsResponse.json();

          // Add account ID and currency to each ad
          const adsWithAccount = data.data.map((ad: any) => ({
            ...ad,
            adAccountId: accountId,
            currency: accountCurrency,
          }));

          allAds.push(...adsWithAccount);
        }

      } catch (err) {
        console.error(`Error fetching ads for account ${accountId}:`, err);
      }
    }));

    if (i + CHUNK_SIZE < adAccountIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Collect unique page IDs first to batch fetch page names
  const pageIds = new Set<string>();
  allAds.forEach(ad => {
    const storyId = ad.creative?.object_story_id || ad.creative?.effective_object_story_id;
    if (storyId) {
      const parts = storyId.split('_');
      if (parts.length > 0 && parts[0]) {
        pageIds.add(parts[0]);
      }
    }
  });

  // Batch fetch all page names with caching
  const pageNamesCache: Record<string, string> = {};
  if (pageIds.size > 0) {
    const pageIdsArray = Array.from(pageIds);

    // Try to get all page names from cache first
    const pageNamesCacheKey = generateCacheKey('meta:pages', pageIdsArray.sort().join(','));
    const cachedPageNames = await withCache(
      pageNamesCacheKey,
      CacheTTL.PAGE_NAMES,
      async () => {
        const names: Record<string, string> = {};
        const PAGE_BATCH_SIZE = 10;

        for (let i = 0; i < pageIdsArray.length; i += PAGE_BATCH_SIZE) {
          const batch = pageIdsArray.slice(i, i + PAGE_BATCH_SIZE);

          await Promise.all(batch.map(async (pageId) => {
            // Use helper for Page token (uses Redis cache)
            const token = await getValidTokenForPage(pageId, tokens);

            if (token) {
              try {
                const pageResponse = await fetch(
                  `https://graph.facebook.com/v22.0/${pageId}?fields=name&access_token=${token}`
                );
                if (pageResponse.ok) {
                  const pageData = await pageResponse.json();
                  names[pageId] = pageData.name;
                }
              } catch (err) {
                // Ignore
              }
            }
          }));

          if (i + PAGE_BATCH_SIZE < pageIdsArray.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        return names;
      }
    );

    Object.assign(pageNamesCache, cachedPageNames);
  }

  // Format ads for display - now using cached page names
  const formattedAds = allAds.map((ad) => {
    // Try to get image URL from multiple sources
    let imageUrl = null;

    if (ad.creative) {
      // 1. Try thumbnail_url first (most reliable)
      imageUrl = ad.creative.thumbnail_url || ad.creative.image_url;

      // 2. Try asset_feed_spec (Dynamic Creative)
      if (!imageUrl && ad.creative.asset_feed_spec) {
        const spec = ad.creative.asset_feed_spec;
        if (spec.images && spec.images.length > 0) {
          imageUrl = spec.images[0].url;
        } else if (spec.videos && spec.videos.length > 0) {
          imageUrl = spec.videos[0].thumbnail_url;
        }
      }

      // 3. Try object_story_spec
      if (!imageUrl && ad.creative.object_story_spec) {
        const spec = ad.creative.object_story_spec;

        // Carousel ads (child_attachments)
        if (spec.link_data?.child_attachments && spec.link_data.child_attachments.length > 0) {
          imageUrl = spec.link_data.child_attachments[0].picture;
        }
        // Standards ads
        else if (spec.link_data?.picture) {
          imageUrl = spec.link_data.picture;
        } else if (spec.photo_data?.url) {
          imageUrl = spec.photo_data.url;
        } else if (spec.video_data?.image_url) {
          imageUrl = spec.video_data.image_url;
        }
      }
    }

    // Extract page info from creative object_story_id (format: {page-id}_{post-id})
    let pageId = null;
    let pageName = null;

    // Try to get page ID from creative
    const storyId = ad.creative?.object_story_id || ad.creative?.effective_object_story_id;

    if (storyId) {
      const parts = storyId.split('_');
      if (parts.length > 0 && parts[0]) {
        pageId = parts[0];
        // Get page name from cache instead of making individual API calls
        pageName = pageNamesCache[pageId] || null;
      }
    }

    // Extract metrics from insights
    const insights = ad.insights?.data?.[0];
    const spend = parseFloat(insights?.spend || '0');

    // Extract messaging contacts from actions
    const actions = insights?.actions || [];
    const messagingContactsAction = actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
    const messagingContacts = parseInt(messagingContactsAction?.value || '0');

    const postEngagementAction = actions.find((a: any) => a.action_type === 'post_engagement');
    const postEngagements = parseInt(postEngagementAction?.value || '0');

    // Get Budget from Ad Set
    let budget = 0;
    if (ad.adset) {
      if (ad.adset.daily_budget) {
        budget = parseFloat(ad.adset.daily_budget) / 100;
      } else if (ad.adset.lifetime_budget) {
        budget = parseFloat(ad.adset.lifetime_budget) / 100;
      }
    }

    return {
      id: ad.id,
      name: ad.name,
      status: ad.status,
      effectiveStatus: ad.effective_status,
      configuredStatus: ad.configured_status,
      issuesInfo: ad.issuesInfo || [],
      adsetId: ad.adset_id,
      campaignId: ad.campaign_id,
      creativeId: ad.creative?.id || '-',
      creativeName: ad.creative?.name || '-',
      title: ad.creative?.title || '-',
      body: ad.creative?.body || '-',
      imageUrl: imageUrl,
      targeting: ad.adset?.targeting || null,
      createdAt: ad.created_time,
      adAccountId: ad.adAccountId,
      currency: ad.currency,
      pageId: pageId,
      pageName: pageName || (pageId ? `Page ${pageId}` : null),
      budget: budget,
      metrics: {
        spend: spend,
        reach: parseInt(insights?.reach || '0'),
        impressions: parseInt(insights?.impressions || '0'),
        clicks: parseInt(insights?.clicks || '0'),
        messagingContacts: messagingContacts,
        results: messagingContacts,
        costPerResult: messagingContacts > 0 ? spend / messagingContacts : 0,
        postEngagements: postEngagements,
        amountSpent: spend
      },
      postLink: storyId ? `https://www.facebook.com/${storyId}` : null,
    };
  });

  return formattedAds;
}
