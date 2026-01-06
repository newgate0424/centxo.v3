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

        // Get user and their team members
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                teamMembers: true,
            } as any,
        }) as any;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // If no team members, return empty
        const teamMembers = user?.teamMembers || [];
        if (teamMembers.length === 0) {
            return NextResponse.json({ accounts: [] });
        }

        // Fetch ad accounts from all team members
        const allAccounts: any[] = [];

        for (const member of teamMembers) {
            try {
                // Check if token is still valid
                if (new Date(member.accessTokenExpires) < new Date()) {
                    console.warn(`Token expired for team member: ${member.facebookName}`);
                    continue;
                }

                // Fetch ad accounts from this team member's Facebook account
                const response = await fetch(
                    `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency,account_status,disable_reason,spend_cap,amount_spent&access_token=${member.accessToken}`
                );

                if (!response.ok) {
                    console.error(`Failed to fetch ad accounts for ${member.facebookName}`);
                    continue;
                }

                const data = await response.json();

                if (data.data && Array.isArray(data.data)) {
                    // Add source info to each account
                    const accountsWithSource = data.data.map((account: any) => ({
                        ...account,
                        _source: {
                            teamMemberId: member.id,
                            facebookName: member.facebookName,
                            facebookUserId: member.facebookUserId,
                        },
                    }));

                    allAccounts.push(...accountsWithSource);
                }
            } catch (error) {
                console.error(`Error fetching ad accounts for team member ${member.facebookName}:`, error);
            }
        }

        return NextResponse.json({
            accounts: allAccounts,
            teamMembersCount: teamMembers.length,
        });
    } catch (error) {
        console.error('Error fetching team ad accounts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ad accounts' },
            { status: 500 }
        );
    }
}
