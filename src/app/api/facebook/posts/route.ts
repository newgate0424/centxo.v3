
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const pageId = searchParams.get('pageId');

        if (!pageId) {
            return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
        }

        // Get access token from database (same pattern as campaigns API)
        const userAccount = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                provider: 'facebook',
            },
        });

        if (!userAccount?.access_token) {
            return NextResponse.json(
                { error: 'Facebook account not connected or access token missing' },
                { status: 401 }
            );
        }

        const accessToken = userAccount.access_token;

        // Fetch posts from the Page
        const url = `https://graph.facebook.com/v22.0/${pageId}/posts?fields=id,message,full_picture,created_time,permalink_url,status_type&limit=20&access_token=${accessToken}`;
        console.log(`[Facebook API] Fetching posts for Page: ${pageId}`);

        const response = await fetch(url);

        if (!response.ok) {
            const errorRaw = await response.text();
            console.error('[Facebook API] Error:', errorRaw);
            try {
                const errorData = JSON.parse(errorRaw);
                throw new Error(errorData.error?.message || 'Failed to fetch posts');
            } catch (e) {
                throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
            }
        }

        const data = await response.json();
        console.log(`[Facebook API] Posts raw count: ${data.data?.length}`);

        // Filter out posts that might not be suitable for ads (optional, but good practice)
        const validPosts = data.data?.filter((p: any) => p.message || p.full_picture) || [];
        console.log(`[Facebook API] Valid posts after filter: ${validPosts.length}`);

        return NextResponse.json({ posts: validPosts });

    } catch (error: any) {
        console.error('Error fetching posts:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch posts' },
            { status: 500 }
        );
    }
}
