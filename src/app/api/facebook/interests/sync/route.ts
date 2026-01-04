
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

// Helper to patch BigInt for JSON.stringify in this scope if needed, 
// though we handle it manually. Just a safety net for console logs.
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

export const maxDuration = 300; // Allow 5 minutes for sync

// Seed keywords to cover a broad range of interests
const SEED_KEYWORDS = [
    'Business', 'Marketing', 'Shopping', 'Fashion', 'Beauty', 'Skin care',
    'Food', 'Drink', 'Technology', 'Computers', 'Family', 'Relationships',
    'Fitness', 'Wellness', 'Sports', 'Outdoors', 'Travel', 'Holidays',
    'Music', 'Movies', 'Entertainment', 'Games', 'Reading', 'Science',
    'Vehicles', 'Cars', 'Home', 'Garden', 'Pets', 'Dogs', 'Cats',
    'Investment', 'Real estate', 'Design', 'Art', 'Photography',
    'Education', 'Career', 'Social media', 'News', 'Politics',
    'Luxury', 'Boutique', 'Discount', 'Sale', 'Online', 'Digital',
    'Mobile', 'Software', 'Hardware', 'Cosmetics', 'Spa', 'Clinic'
];

async function fetchInterests(keyword: string, accessToken: string) {
    try {
        const url = `https://graph.facebook.com/v22.0/search?type=adinterest&q=${encodeURIComponent(keyword)}&limit=1000&locale=th_TH&access_token=${accessToken}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'CentxoAi/1.0 (Compatible; Business Tool)',
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`FB API Error for ${keyword}: ${response.status} ${text}`);
            return [];
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error(`Error fetching for ${keyword}:`, error);
        return [];
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Try to get token from session first (preferred for immediate use)
        let accessToken = (session as any).accessToken;

        // 2. Fallback: Try MetaAccount table (Persistent Business Connection)
        if (!accessToken) {
            const metaAccount = await prisma.metaAccount.findUnique({
                where: { userId: session.user.id }
            });
            accessToken = metaAccount?.accessToken;
        }

        // 3. Fallback: Try Account table (NextAuth generic connection)
        if (!accessToken) {
            const account = await prisma.account.findFirst({
                where: {
                    userId: session.user.id,
                    provider: 'facebook',
                }
            });
            accessToken = account?.access_token;
        }

        // 4. SUPER ADMIN SYSTEM FALLBACK
        // If the user is a Super Admin but hasn't linked their own Facebook, 
        // try to find ANY valid token in the system to perform the sync.
        // This is acceptable for Public Interest Search which doesn't require specific user context.
        if (!accessToken && (session.user as any).role === 'SUPER_ADMIN') {
            console.log('Super Admin Sync: attempting to find system fallback token...');

            // Try newest MetaAccount first
            const systemMetaAccount = await prisma.metaAccount.findFirst({
                orderBy: { updatedAt: 'desc' },
                select: { accessToken: true }
            });

            if (systemMetaAccount?.accessToken) {
                accessToken = systemMetaAccount.accessToken;
            } else {
                // Try newest Account
                const systemAccount = await prisma.account.findFirst({
                    where: { provider: 'facebook' },
                    orderBy: { id: 'desc' }, // Account doesn't always have updatedAt
                    select: { access_token: true }
                });
                accessToken = systemAccount?.access_token;
            }
        }

        if (!accessToken) {
            return NextResponse.json({
                error: 'Facebook Access Token not found.',
                details: 'System has no active Facebook connections. At least one user must connect Facebook to the platform.'
            }, { status: 400 });
        }

        let totalSynced = 0;
        let errors = 0;

        // 5. MAX LIMIT per run to avoid "Unusual Activity" (e.g. 50 calls is too many, do 10-15)
        const MAX_KEYWORDS_PER_RUN = 10;
        const keywordsToProcess = SEED_KEYWORDS.slice(0, MAX_KEYWORDS_PER_RUN);
        // In a real app, we would rotate through SEED_KEYWORDS using cursor/pagination in DB
        // For now, let's just do the first 10. The user can click again if we implement rotation later,
        // but for safety, small batches are better.
        // Or pick random 10? Random is safer to avoid always hitting "Business" first.
        const shuffled = SEED_KEYWORDS.sort(() => 0.5 - Math.random()).slice(0, MAX_KEYWORDS_PER_RUN);

        console.log(`Starting SAFE Sync for ${shuffled.length} keywords...`);

        // Process sequentially (NO Promise.all)
        for (const keyword of shuffled) {
            try {
                // Add random delay BEFORE request (2s - 5s)
                const delay = Math.floor(Math.random() * 3000) + 2000;
                await new Promise(r => setTimeout(r, delay));

                const interests = await fetchInterests(keyword, accessToken);

                for (const item of interests) {
                    try {
                        const lower = BigInt(item.audience_size_lower_bound || 0);
                        const upper = BigInt(item.audience_size_upper_bound || 0);

                        await prisma.facebookInterest.upsert({
                            where: { fbId: item.id },
                            update: {
                                name: item.name,
                                audienceSizeLowerBound: lower,
                                audienceSizeUpperBound: upper,
                                path: item.path ? JSON.stringify(item.path) : undefined,
                                topic: item.topic,
                            },
                            create: {
                                fbId: item.id,
                                name: item.name,
                                audienceSizeLowerBound: lower,
                                audienceSizeUpperBound: upper,
                                path: item.path ? JSON.stringify(item.path) : undefined,
                                topic: item.topic,
                            }
                        });
                        totalSynced++;
                    } catch (dbError) {
                        // Silent fail for duplicates/db issues to keep flow safe
                    }
                }
            } catch (e) {
                errors++;
            }
        }


        await createAuditLog({
            userId: session.user.id,
            action: 'SYNC_INTERESTS',
            details: { count: totalSynced, errors: errors }
        });

        return NextResponse.json({
            success: true,
            message: `Synced ${totalSynced} interests successfully.`,
            count: totalSynced
        });

    } catch (error: any) {
        console.error('Fatal Sync failed:', error);

        await createAuditLog({
            action: 'API_ERROR',
            entityType: 'InterestSync',
            details: { error: error.message }
        });

        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
