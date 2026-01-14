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
            // User is a team member, fetch pictures from their host's team
            targetUserId = membershipTeam.userId;
        }

        // Get all Facebook team members
        const allMembers = await prisma.teamMember.findMany({
            where: {
                userId: targetUserId,
            },
        });

        console.log('All team members:', allMembers.length, allMembers);

        const teamMembers = allMembers.filter(m => m.memberType === 'facebook' && m.facebookUserId);

        console.log('Filtered Facebook members:', teamMembers.length);

        // Select only needed fields
        const teamMembersData = teamMembers.map(m => ({
            id: m.id,
            facebookUserId: m.facebookUserId,
            facebookName: m.facebookName,
            accessToken: m.accessToken,
        }));

        console.log('Found team members:', teamMembersData.length);
        console.log('Team members data:', teamMembersData);

        // Fetch profile pictures for each member
        const membersWithPictures = await Promise.all(
            teamMembersData.map(async (member) => {
                let pictureUrl = null;

                console.log('Processing member:', member.id, 'facebookUserId:', member.facebookUserId, 'hasToken:', !!member.accessToken);

                if (member.facebookUserId && member.accessToken) {
                    try {
                        const response = await fetch(
                            `https://graph.facebook.com/${member.facebookUserId}?fields=picture.type(large)&access_token=${member.accessToken}`
                        );
                        const data = await response.json();
                        console.log('Facebook API response for', member.id, ':', data);
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

        console.log('Returning members with pictures:', membersWithPictures);

        return NextResponse.json({
            members: membersWithPictures,
        });
    } catch (error) {
        console.error('Error fetching team member pictures:', error);
        return NextResponse.json(
            { error: 'Failed to fetch team member pictures' },
            { status: 500 }
        );
    }
}
