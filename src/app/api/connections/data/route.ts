import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Combined Connections API - fetches launch, team members, facebook profile,
 * and facebook pictures in one round-trip. Reduces client-side API calls from 4 to 1.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';
    const suffix = refresh ? '?refresh=true' : '';

    const base =
      process.env.NEXTAUTH_URL ||
      (typeof process.env.VERCEL_URL === 'string' ? `https://${process.env.VERCEL_URL}` : null) ||
      'http://localhost:4000';

    const cookie = request.headers.get('cookie') || '';

    const [launchRes, membersRes, profileRes, picturesRes] = await Promise.all([
      fetch(`${base}/api/launch`, { headers: { cookie }, cache: 'no-store' }),
      fetch(`${base}/api/team/members`, { headers: { cookie }, cache: 'no-store' }),
      fetch(`${base}/api/user/facebook-profile${suffix}`, { headers: { cookie }, cache: 'no-store' }),
      fetch(`${base}/api/team/facebook-pictures${suffix}`, { headers: { cookie }, cache: 'no-store' }),
    ]);

    const launchData = await launchRes.json().catch(() => ({}));
    const membersData = await membersRes.json().catch(() => ({ host: null, members: [] }));
    const profileData = await profileRes.json().catch(() => null);
    const picturesData = await picturesRes.json().catch(() => ({ members: [] }));

    return NextResponse.json({
      launch: launchData,
      team: membersData.host ? membersData : { host: null, members: [] },
      facebookProfile: profileRes.ok ? profileData : null,
      facebookPictures: picturesData.members || [],
    });
  } catch (err) {
    console.error('Error in /api/connections/data:', err);
    return NextResponse.json(
      { error: 'Failed to fetch connections data' },
      { status: 500 }
    );
  }
}
