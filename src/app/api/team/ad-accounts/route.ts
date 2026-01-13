import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromBasicUnits } from '@/lib/currency-utils';

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
            select: {
                id: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Find ALL team members that belong to the same team
        // This includes finding the host and all members
        let teamMembers = await prisma.teamMember.findMany({
            where: {
                userId: user.id,
                memberType: 'facebook',
                facebookUserId: { not: null },
                accessToken: { not: null },
            },
        });

        // If current user is not the host, find the host's team members
        if (teamMembers.length === 0) {
            // Try to find if this user is a team member themselves
            const memberRecord = await prisma.teamMember.findFirst({
                where: {
                    memberEmail: session.user.email,
                },
                select: {
                    userId: true, // This is the host's user ID
                },
            });

            if (memberRecord) {
                // Get all team members under this host
                teamMembers = await prisma.teamMember.findMany({
                    where: {
                        userId: memberRecord.userId,
                        memberType: 'facebook',
                        facebookUserId: { not: null },
                        accessToken: { not: null },
                    },
                });
            }
        }

        console.log('[team/ad-accounts] Found team members:', teamMembers.length);

        // If no team members, return empty
        if (teamMembers.length === 0) {
            return NextResponse.json({ accounts: [] });
        }

        // Fetch ad accounts from all team members
        const allAccounts: any[] = [];

        for (const member of teamMembers) {
            try {
                // Skip if no access token
                if (!member.accessToken) {
                    console.warn(`[team/ad-accounts] No access token for: ${member.facebookName || member.id}`);
                    continue;
                }

                // Check if token is still valid (if expiry date exists)
                if (member.accessTokenExpires && new Date(member.accessTokenExpires) < new Date()) {
                    console.warn(`[team/ad-accounts] Token expired for: ${member.facebookName || member.id}`);
                    // Note: Should implement token refresh or prompt user to reconnect
                    continue;
                }

                console.log(`[team/ad-accounts] Fetching ad accounts for: ${member.facebookName || member.id}`);

                // Fetch ad accounts from this team member's Facebook account
                const url = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency,account_status,disable_reason,spend_cap,amount_spent,timezone_name,timezone_offset,business_country_code,funding_source_details,ads.filtering([{'field':'effective_status','operator':'IN','value':['ACTIVE']}]).limit(0).summary(true)&access_token=${member.accessToken}`;
                const response = await fetch(url);

                if (!response.ok) {
                    console.error(`Failed to fetch ad accounts for ${member.facebookName}`);
                    continue;
                }

                const data = await response.json();

                if (data.data && Array.isArray(data.data)) {
                    // Add source info to each account and convert from basic units
                    const accountsWithSource = data.data.map((account: any) => {
                        const currency = account.currency || 'USD';
                        const spendCapInMainUnits = fromBasicUnits(account.spend_cap, currency);
                        const amountSpentInMainUnits = fromBasicUnits(account.amount_spent, currency);
                        
                        console.log(`[team/ad-accounts] Account ${account.name} (${currency}): spend_cap=${account.spend_cap} -> ${spendCapInMainUnits}`);
                        
                        return {
                            ...account,
                            // Convert from basic units (cents/satang/yen) to main units (dollars/baht/yen)
                            spend_cap: spendCapInMainUnits,
                            amount_spent: amountSpentInMainUnits,
                            _source: {
                                teamMemberId: member.id,
                                facebookName: member.facebookName,
                                facebookUserId: member.facebookUserId,
                            },
                        };
                    });

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
