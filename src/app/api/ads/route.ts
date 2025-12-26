/**
 * GET /api/ads
 * Fetch ads from Meta API for selected ad accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withCache, withCacheSWR, generateCacheKey, CacheTTL, deleteCache } from '@/lib/cache/redis';

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
        { error: 'Facebook not connected', ads: [] },
        { status: 400 }
      );
    }

    const forceRefresh = searchParams.get('refresh') === 'true';
    const cacheKey = generateCacheKey('meta:ads', session.user.id!, adAccountIds.sort().join(','));

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
        return await fetchAdsFromMeta(adAccountIds, accessToken);
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

async function fetchAdsFromMeta(adAccountIds: string[], accessToken: string) {
  const allAds: any[] = [];

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
          `https://graph.facebook.com/v22.0/${accountId}/ads?fields=id,name,status,adset_id,campaign_id,adset{targeting},creative{id,name,title,body,image_url,thumbnail_url,object_story_spec,effective_object_story_id,object_story_id},effective_status,created_time,insights{spend,actions,reach,impressions,clicks}&limit=100&access_token=${accessToken}`
        );

        if (response.ok) {
          const data = await response.json();

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

    // Add small delay between chunks to respect rate limits
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
            try {
              const pageResponse = await fetch(
                `https://graph.facebook.com/v22.0/${pageId}?fields=name&access_token=${accessToken}`
              );
              if (pageResponse.ok) {
                const pageData = await pageResponse.json();
                names[pageId] = pageData.name;
              }
            } catch (err) {
              console.error(`Error fetching page ${pageId}:`, err);
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
      // Try thumbnail_url first (most reliable)
      imageUrl = ad.creative.thumbnail_url || ad.creative.image_url;

      // If still no image, try to extract from object_story_spec
      if (!imageUrl && ad.creative.object_story_spec) {
        const spec = ad.creative.object_story_spec;
        if (spec.link_data?.picture) {
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

    return {
      id: ad.id,
      name: ad.name,
      status: ad.status,
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

  return formattedAds;
}
