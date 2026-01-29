import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Cache to reduce Meta API calls (gr:get:User per member - heavily used)
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
declare global {
  var _facebookPicturesCache: Record<string, { data: any; timestamp: number }> | undefined;
}
const cache = globalThis._facebookPicturesCache ?? {};
if (process.env.NODE_ENV !== 'production') globalThis._facebookPicturesCache = cache;

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get team members with Facebook accounts
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user is a team member of another team
        const membershipTeam = await prisma.teamMember.findFirst({
            where: {
                memberEmail: session.user.email,
                memberType: 'email',
            },
        });

        let targetUserId = user.id;
        if (membershipTeam) {
            targetUserId = membershipTeam.userId;
        }

        const cacheKey = `pictures_${targetUserId}`;
        const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';
        const cached = !forceRefresh && cache[cacheKey];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        // Get all Facebook team members
        const allMembers = await prisma.teamMember.findMany({
            where: {
                userId: targetUserId,
            },
        });

        console.log('All team members:', allMembers.length, allMembers);

        const teamMembers = allMembers.filter(m => m.memberType === 'facebook' && m.facebookUserId);

        // Select only needed fields
        const teamMembersData = teamMembers.map(m => ({
            id: m.id,
            facebookUserId: m.facebookUserId,
            facebookName: m.facebookName,
            accessToken: m.accessToken,
        }));

        // Fetch profile pictures for each member
        const membersWithPictures = await Promise.all(
            teamMembersData.map(async (member) => {
                let pictureUrl = null;

                if (member.facebookUserId && member.accessToken) {
                    try {
                        const response = await fetch(
                            `https://graph.facebook.com/${member.facebookUserId}?fields=picture.type(large)&access_token=${member.accessToken}`
                        );
                        const data = await response.json();
                        pictureUrl = data.picture?.data?.url || null;
                    } catch (error) {
                        console.error(`Error fetching picture for member ${member.id}:`, error);
                    }
                }

                return {
                    id: member.id,
                    userId: member.facebookUserId,
                    name: member.facebookName,
                    pictureUrl,
                };
            })
        );

        const result = { members: membersWithPictures };
        cache[cacheKey] = { data: result, timestamp: Date.now() };
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching team member pictures:', error);
        return NextResponse.json(
            { error: 'Failed to fetch team member pictures' },
            { status: 500 }
        );
    }
}
