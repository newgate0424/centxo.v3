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

    // Get params
    const { searchParams } = new URL(request.url);
    const adAccountIdsParam = searchParams.get('adAccountId');
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD

    if (!adAccountIdsParam) {
      return NextResponse.json({ error: 'Ad account ID required' }, { status: 400 });
    }

    const adAccountIds = adAccountIdsParam.split(',').filter(Boolean);
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      );
    }

    // Initialize aggregated stats for Current Period
    let totalSpend = 0;
    let totalMessages = 0;
    let totalRevenue = 0;
    let totalActiveCampaigns = 0;

    // Initialize aggregated stats for Previous Period
    let prevTotalSpend = 0;
    let prevTotalMessages = 0;
    let prevTotalRevenue = 0;

    // Map for daily aggregation: "YYYY-MM-DD" -> { spend, revenue, messages }
    const dailyMap = new Map<string, { spend: number; revenue: number; messages: number }>();

    // Date Calculation Logic
    let currentStart: Date;
    let currentEnd: Date;

    if (startDate && endDate) {
      currentStart = new Date(startDate);
      currentEnd = new Date(endDate);
    } else {
      // Default: Last 30 days
      currentEnd = new Date();
      currentStart = new Date();
      currentStart.setDate(currentEnd.getDate() - 29); // 30 days total
    }

    // Calculate Previous Period
    const duration = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime() - 86400000); // 1 day before current start
    const prevStart = new Date(prevEnd.getTime() - duration);

    // Format for API (YYYY-MM-DD)
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const apiStartDate = formatDate(prevStart); // Fetch from start of PREVIOUS period
    const apiEndDate = formatDate(currentEnd);  // To end of CURRENT period
    const currentStartStr = formatDate(currentStart);

    // Construct common query params with EXTENDED range
    const timeRangeParams = `&time_range={'since':'${apiStartDate}','until':'${apiEndDate}'}`;

    // Fetch data in chunks
    const CHUNK_SIZE = 5;
    for (let i = 0; i < adAccountIds.length; i += CHUNK_SIZE) {
      const chunk = adAccountIds.slice(i, i + CHUNK_SIZE);

      await Promise.all(chunk.map(async (adAccountId) => {
        try {
          // 1. Fetch Daily Insights
          const insightsUrl = `https://graph.facebook.com/v22.0/${adAccountId}/insights?fields=spend,actions,action_values,date_start${timeRangeParams}&time_increment=1&access_token=${accessToken}`;
          const insightsResponse = await fetch(insightsUrl);

          // 2. Fetch Active Campaigns (Current Snapshot only)
          const campaignsResponse = await fetch(
            `https://graph.facebook.com/v22.0/${adAccountId}/campaigns?fields=status&access_token=${accessToken}`
          );

          if (insightsResponse.ok) {
            const data = await insightsResponse.json();
            const days = data.data || [];

            days.forEach((day: any) => {
              const date = day.date_start; // YYYY-MM-DD
              const spend = parseFloat(day.spend || '0');

              // Messages
              const msgAction = day.actions?.find((a: any) =>
                a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
              );
              const messages = parseInt(msgAction?.value || '0');

              // Revenue
              const purchaseValueAction = day.action_values?.find((a: any) =>
                a.action_type === 'purchase' || a.action_type === 'omni_purchase'
              );
              const revenue = parseFloat(purchaseValueAction?.value || '0');

              // Check if date belongs to Current or Previous period
              if (date >= currentStartStr) {
                // Current Period
                totalSpend += spend;
                totalMessages += messages;
                totalRevenue += revenue;

                // Add to Daily Map (only for Current Period Chart)
                const existing = dailyMap.get(date) || { spend: 0, revenue: 0, messages: 0 };
                dailyMap.set(date, {
                  spend: existing.spend + spend,
                  revenue: existing.revenue + revenue,
                  messages: existing.messages + messages
                });
              } else {
                // Previous Period
                prevTotalSpend += spend;
                prevTotalMessages += messages;
                prevTotalRevenue += revenue;
              }
            });
          }

          if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json();
            const activeCount = campaignsData.data?.filter((c: any) => c.status === 'ACTIVE').length || 0;
            totalActiveCampaigns += activeCount;
          }

        } catch (err) {
          console.error(`Error fetching stats for account ${adAccountId}:`, err);
        }
      }));
    }

    // Calculate ROAS
    const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const prevTotalRoas = prevTotalSpend > 0 ? prevTotalRevenue / prevTotalSpend : 0;
    const avgCostPerMessage = totalMessages > 0 ? totalSpend / totalMessages : 0;

    // Calculate Percentage Changes vs Previous Period
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const changes = {
      spend: calculateChange(totalSpend, prevTotalSpend),
      revenue: calculateChange(totalRevenue, prevTotalRevenue),
      messages: calculateChange(totalMessages, prevTotalMessages),
      roas: calculateChange(totalRoas, prevTotalRoas)
    };

    // Convert dailyMap to sorted array (Current Period Only)
    const chartData = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        spend: stats.spend,
        revenue: stats.revenue,
        messages: stats.messages,
        roas: stats.spend > 0 ? stats.revenue / stats.spend : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalSpend,
      totalMessages,
      totalRevenue,
      totalRoas,
      avgCostPerMessage,
      activeCampaigns: totalActiveCampaigns,
      chartData,
      changes // Return comparison data
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
