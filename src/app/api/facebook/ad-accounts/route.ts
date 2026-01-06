import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Rate limiting (User ID priority)
    const rateLimitResponse = rateLimit(request, RateLimitPresets.standard, session?.user?.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user with team members from database to get all tokens
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

    // Collect all tokens: Main User + Team Members
    const tokens = [];

    // 1. Main User Token
    const mainAccessToken = (session as any).accessToken;
    if (mainAccessToken) {
      tokens.push({
        token: mainAccessToken,
        name: user.name || 'Main Account',
        isTeamMember: false
      });
    }

    // 2. Team Members Tokens
    if ((user as any).teamMembers && (user as any).teamMembers.length > 0) {
      (user as any).teamMembers.forEach((member: any) => {
        // Check if token is expired/valid if possible (simple check exists in other route)
        // For now, push all, handle errors in fetch
        if (member.accessToken) {
          tokens.push({
            token: member.accessToken,
            name: member.facebookName || 'Team Member',
            isTeamMember: true
          });
        }
      });
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'Facebook not connected', accounts: [] },
        { status: 400 }
      );
    }

    const allAccounts: any[] = [];

    // Fetch accounts for all tokens in parallel
    await Promise.all(tokens.map(async (tokenData) => {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v22.0/me/adaccounts?fields=id,name,account_id,account_status,disable_reason,currency,spend_cap,amount_spent,business_name,business_country_code,timezone_name,timezone_offset_hours_utc,funding_source_details&limit=500&access_token=${tokenData.token}`
        );

        if (!response.ok) {
          console.warn(`Failed to fetch ad accounts for ${tokenData.name}: ${response.status}`);
          return;
        }

        const data = await response.json();
        const accounts = data.data || [];

        // Map and add source info if needed
        const accountsWithSource = accounts.map((acc: any) => ({
          ...acc,
          owner_name: tokenData.name
        }));
        allAccounts.push(...accountsWithSource);

      } catch (err) {
        console.error(`Error fetching for ${tokenData.name}:`, err);
      }
    }));

    // Remove duplicates (prefer ones where we found them first, or maybe merge?)
    // If duplicated, it means multiple users have access. We pick one owner to show, or join them?
    // Simple approach: First one wins (usually Main user if pushed first).
    // Actually, distinct by account_id.
    const uniqueAccounts = Array.from(new Map(allAccounts.map(item => [item.account_id, item])).values());

    return NextResponse.json({
      accounts: uniqueAccounts.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        account_id: acc.account_id,
        account_status: acc.account_status,
        disable_reason: acc.disable_reason,
        currency: acc.currency,
        spend_cap: acc.spend_cap ? parseFloat(acc.spend_cap) / 100 : null,
        amount_spent: acc.amount_spent ? parseFloat(acc.amount_spent) / 100 : 0,
        business_name: acc.business_name,
        business_country_code: acc.business_country_code,
        timezone_name: acc.timezone_name,
        timezone_offset: acc.timezone_offset_hours_utc,
        funding_source: acc.funding_source_details?.display_string || null,
        owner: acc.owner_name, // Add Owner Name
      })),
      total: uniqueAccounts.length,
    });
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage, accounts: [] },
      { status: 500 }
    );
  }
}
