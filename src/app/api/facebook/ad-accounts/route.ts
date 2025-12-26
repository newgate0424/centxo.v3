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

    // Get Facebook access token from session
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected', accounts: [] },
        { status: 400 }
      );
    }

    // Fetch ad accounts from Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/v22.0/me/adaccounts?fields=id,name,account_id,account_status,currency&access_token=${accessToken}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Facebook API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to fetch ad accounts from Facebook: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const accounts = data.data || [];

    return NextResponse.json({
      accounts: accounts.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        account_id: acc.account_id,
        status: acc.account_status,
        currency: acc.currency,
      })),
      total: accounts.length,
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
