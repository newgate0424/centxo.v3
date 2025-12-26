/**
 * POST /api/adsets/[id]/toggle
 * Toggle ad set status (ACTIVE <-> PAUSED)
 * Automatically clears cache after update
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invalidateUserCache } from '@/lib/cache/redis';

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
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
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
