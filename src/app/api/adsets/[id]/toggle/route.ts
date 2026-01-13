/**
 * POST /api/adsets/[id]/toggle
 * Toggle ad set status (ACTIVE <-> PAUSED)
 * Automatically clears cache after update
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invalidateUserCache } from '@/lib/cache/redis';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/services/metaClient';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: adSetId } = await params;

    // Fetch user with team members to collect all available tokens
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        metaAccount: {
          select: { accessToken: true },
        },
        accounts: {
          where: { provider: 'facebook' },
          select: { access_token: true },
        },
        teamMembers: {
          select: { accessToken: true },
        },
      },
    });

    // Collect all available tokens
    const tokens: string[] = [];

    // 1. MetaAccount token
    if (user?.metaAccount?.accessToken) {
      try {
        tokens.push(decryptToken(user.metaAccount.accessToken));
      } catch (e) {
        console.error('Failed to decrypt MetaAccount token:', e);
      }
    }

    // 2. NextAuth Facebook account tokens
    if (user?.accounts) {
      user.accounts.forEach(acc => {
        if (acc.access_token) tokens.push(acc.access_token);
      });
    }

    // 3. Team members tokens
    if (user?.teamMembers) {
      user.teamMembers.forEach(member => {
        if (member.accessToken) tokens.push(member.accessToken);
      });
    }

    // 4. Session token
    const sessionToken = (session as any).accessToken;
    if (sessionToken) tokens.push(sessionToken);

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      );
    }

    // Try each token until one works
    let accessToken: string | null = null;

    for (const token of tokens) {
      try {
        const testResponse = await fetch(
          `https://graph.facebook.com/v22.0/${adSetId}?fields=id&access_token=${token}`
        );
        if (testResponse.ok) {
          accessToken = token;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No valid Facebook token found for this ad set' },
        { status: 400 }
      );
    }

    // Get current status
    const currentResponse = await fetch(
      `https://graph.facebook.com/v22.0/${adSetId}?fields=status&access_token=${accessToken}`
    );

    if (!currentResponse.ok) {
      const error = await currentResponse.json();
      return NextResponse.json(
        { error: error.error?.message || 'Failed to get ad set status' },
        { status: currentResponse.status }
      );
    }

    const currentData = await currentResponse.json();
    const currentStatus = currentData.status;

    // Toggle status
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    // Update status in Meta
    const updateResponse = await fetch(
      `https://graph.facebook.com/v22.0/${adSetId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          access_token: accessToken,
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      return NextResponse.json(
        { error: error.error?.message || 'Failed to update ad set status' },
        { status: updateResponse.status }
      );
    }

    // Clear ALL caches for this user to ensure fresh data
    await invalidateUserCache(session.user.id);

    console.log(`[AdSet Toggle] ${adSetId}: ${currentStatus} -> ${newStatus}, cache cleared`);

    return NextResponse.json({
      success: true,
      adSetId,
      oldStatus: currentStatus,
      newStatus: newStatus,
      message: `Ad set ${newStatus === 'ACTIVE' ? 'activated' : 'paused'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling ad set status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle ad set status' },
      { status: 500 }
    );
  }
}
