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

        // Get user (Google account = Team Owner)
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                isTeamHost: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get team members (Facebook accounts)
        const teamMembers = await prisma.teamMember.findMany({
            where: { userId: user.id },
            orderBy: { addedAt: 'asc' },
        });

        return NextResponse.json({
            host: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: 'OWNER',
            },
            members: teamMembers.map((member: any) => ({
                id: member.id,
                facebookUserId: member.facebookUserId,
                facebookName: member.facebookName,
                facebookEmail: member.facebookEmail,
                role: member.role,
                addedAt: member.addedAt,
                lastUsedAt: member.lastUsedAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching team members:', error);
        return NextResponse.json(
            { error: 'Failed to fetch team members' },
            { status: 500 }
        );
    }
}
