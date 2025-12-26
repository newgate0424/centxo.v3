import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get ad account IDs from query params (comma separated)
    const { searchParams } = new URL(request.url);
    const adAccountIdsParam = searchParams.get('adAccountId');

    if (!adAccountIdsParam) {
      return NextResponse.json({ error: 'Ad account ID required' }, { status: 400 });
    }

    const adAccountIds = adAccountIdsParam.split(',').filter(Boolean);

    // Get Facebook access token
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      );
    }

    // Initialize aggregated stats
    let totalSpend = 0;
    let totalMessages = 0;
    let totalActiveCampaigns = 0;

    // Fetch data for all accounts in chunks to avoid Rate Limits
    const CHUNK_SIZE = 5;
    for (let i = 0; i < adAccountIds.length; i += CHUNK_SIZE) {
      const chunk = adAccountIds.slice(i, i + CHUNK_SIZE);

      await Promise.all(chunk.map(async (adAccountId) => {
        try {
          // Fetch account insights
          const insightsResponse = await fetch(
            `https://graph.facebook.com/v22.0/${adAccountId}/insights?fields=spend,actions&date_preset=last_30d&access_token=${accessToken}`
          );

          // Fetch active campaigns count
          // Note: We could optimize this by including it in the same call if flexible, 
          // but kept separate for clarity as per Graph API structure availability.
          const campaignsResponse = await fetch(
            `https://graph.facebook.com/v22.0/${adAccountId}/campaigns?fields=status&access_token=${accessToken}`
          );

          if (insightsResponse.ok) {
            const data = await insightsResponse.json();
            const insights = data.data?.[0];
            if (insights) {
              totalSpend += parseFloat(insights.spend || '0');
              const messageAction = insights.actions?.find((a: any) =>
                a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
              );
              totalMessages += parseInt(messageAction?.value || '0');
            }
          }

          if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json();
            const activeCount = campaignsData.data?.filter((c: any) => c.status === 'ACTIVE').length || 0;
            totalActiveCampaigns += activeCount;
          }

        } catch (err) {
          console.error(`Error fetching stats for account ${adAccountId}:`, err);
          // Continue with other accounts even if one fails
        }
      }));
    }

    return NextResponse.json({
      totalSpend,
      totalMessages,
      avgCostPerMessage: totalMessages > 0 ? totalSpend / totalMessages : 0,
      activeCampaigns: totalActiveCampaigns,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
