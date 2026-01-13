import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        console.log('[facebook-profile] User:', user?.id);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Try to get Facebook data from MetaAccount first
        const metaAccount = await prisma.metaAccount.findUnique({
            where: { userId: user.id },
            select: {
                metaUserId: true,
                accessToken: true,
            },
        });

        console.log('[facebook-profile] MetaAccount:', metaAccount ? 'found' : 'not found');

        if (metaAccount?.metaUserId && metaAccount?.accessToken) {
            try {
                // Fetch Facebook profile name and picture from Graph API
                const response = await fetch(
                    `https://graph.facebook.com/${metaAccount.metaUserId}?fields=name,picture.type(large)&access_token=${metaAccount.accessToken}`
                );
                const fbData = await response.json();
                
                if (fbData.name) {
                    return NextResponse.json({
                        name: fbData.name,
                        userId: metaAccount.metaUserId,
                        pictureUrl: fbData.picture?.data?.url || null,
                    });
                }
            } catch (error) {
                console.error('Error fetching from Facebook API:', error);
            }
        }

        // Fallback to Account table (NextAuth)
        const account = await prisma.account.findFirst({
            where: {
                userId: user.id,
                provider: 'facebook',
            },
            select: {
                providerAccountId: true,
                access_token: true,
            },
        });

        console.log('[facebook-profile] Account (NextAuth):', account ? 'found' : 'not found');

        if (account?.providerAccountId) {
            // Try to get name from Facebook Graph API
            if (account.access_token) {
                try {
                    const response = await fetch(
                        `https://graph.facebook.com/${account.providerAccountId}?fields=name,picture.type(large)&access_token=${account.access_token}`
                    );
                    const fbData = await response.json();
                    
                    if (fbData.name) {
                        return NextResponse.json({
                            name: fbData.name,
                            userId: account.providerAccountId,
                            pictureUrl: fbData.picture?.data?.url || null,
                        });
                    }
                } catch (error) {
                    console.error('Error fetching from Facebook API:', error);
                }
            }
            
            // Final fallback to session name
            const userName = session.user.name || 'Facebook User';
            return NextResponse.json({
                name: userName,
                userId: account.providerAccountId,
                pictureUrl: null,
            });
        }

        // Last resort: Check TeamMember table for user's own Facebook account
        const teamMember = await prisma.teamMember.findFirst({
            where: {
                userId: user.id,
                memberType: 'facebook',
                facebookUserId: { not: null },
            },
            select: {
                facebookUserId: true,
                facebookName: true,
                accessToken: true,
            },
        });

        console.log('[facebook-profile] TeamMember:', teamMember ? 'found' : 'not found');

        if (teamMember?.facebookUserId) {
            // Try to fetch picture if we have access token
            let pictureUrl = null;
            if (teamMember.accessToken) {
                try {
                    const response = await fetch(
                        `https://graph.facebook.com/${teamMember.facebookUserId}?fields=picture.type(large)&access_token=${teamMember.accessToken}`
                    );
                    const fbData = await response.json();
                    pictureUrl = fbData.picture?.data?.url || null;
                } catch (error) {
                    console.error('Error fetching picture from TeamMember:', error);
                }
            }

            return NextResponse.json({
                name: teamMember.facebookName || session.user.name || 'Facebook User',
                userId: teamMember.facebookUserId,
                pictureUrl,
            });
        }

        console.log('[facebook-profile] No Facebook account found anywhere');

        return NextResponse.json(
            { error: 'No Facebook account found' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Error fetching Facebook profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Facebook profile' },
            { status: 500 }
        );
    }
}
