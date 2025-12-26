/**
 * Meta Account Selection API
 * GET /api/meta/accounts - Get available ad accounts
 * GET /api/meta/pages - Get available pages
 * POST /api/meta/select - Save selected ad account and page
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import MetaAPIClient from '@/lib/services/metaClient';

const prisma = new PrismaClient();

// Get available ad accounts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'accounts' or 'pages'

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { metaAccount: true },
    });

    if (!user?.metaAccount) {
      return NextResponse.json(
        { error: 'Meta account not connected' },
        { status: 400 }
      );
    }

    const metaClient = new MetaAPIClient(user.metaAccount.accessToken);

    if (type === 'accounts') {
      const accounts = await metaClient.getAdAccounts(user.metaAccount.metaUserId);
      return NextResponse.json({ accounts: accounts.data || [] });
    } else if (type === 'pages') {
      const pages = await metaClient.getPages(user.metaAccount.metaUserId);
      return NextResponse.json({ pages: pages.data || [] });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching Meta data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Meta' },
      { status: 500 }
    );
  }
}

// Save selected ad account and page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { adAccountId, adAccountName, pageId, pageName, pageAccessToken } = body;

    if (!adAccountId || !pageId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { metaAccount: true },
    });

    if (!user?.metaAccount) {
      return NextResponse.json(
        { error: 'Meta account not connected' },
        { status: 400 }
      );
    }

    // Update Meta account with selected data
    await prisma.metaAccount.update({
      where: { id: user.metaAccount.id },
      data: {
        adAccountId,
        adAccountName,
        pageId,
        pageName,
        pageAccessToken,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving Meta selection:', error);
    return NextResponse.json(
      { error: 'Failed to save selection' },
      { status: 500 }
    );
  }
}
