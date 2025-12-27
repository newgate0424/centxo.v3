
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        const response = await fetch(
            `https://graph.facebook.com/v22.0/search?type=adinterest&q=${encodeURIComponent(keyword)}&limit=1000&locale=th_TH&access_token=${accessToken}`
        );
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

        // Get FB token
        const metaAccount = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                provider: 'facebook',
            },
        });

        if (!metaAccount?.access_token) {
            return NextResponse.json({ error: 'Facebook not connected' }, { status: 400 });
        }

        const accessToken = metaAccount.access_token;
        let totalSynced = 0;
        let errors = 0;

        // Process keywords concurrently (in batches to avoid rate limits)
        const BATCH_SIZE = 5;
        for (let i = 0; i < SEED_KEYWORDS.length; i += BATCH_SIZE) {
            const batch = SEED_KEYWORDS.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (keyword) => {
                try {
                    const interests = await fetchInterests(keyword, accessToken);

                    for (const item of interests) {
                        // Upsert to DB
                        await prisma.facebookInterest.upsert({
                            where: { fbId: item.id },
                            update: {
                                name: item.name,
                                audienceSizeLowerBound: BigInt(item.audience_size_lower_bound || 0),
                                audienceSizeUpperBound: BigInt(item.audience_size_upper_bound || 0),
                                path: item.path ? JSON.stringify(item.path) : undefined,
                                topic: item.topic,
                            },
                            create: {
                                fbId: item.id,
                                name: item.name,
                                audienceSizeLowerBound: BigInt(item.audience_size_lower_bound || 0),
                                audienceSizeUpperBound: BigInt(item.audience_size_upper_bound || 0),
                                path: item.path ? JSON.stringify(item.path) : undefined,
                                topic: item.topic,
                            }
                        });
                        totalSynced++;
                    }
                } catch (e) {
                    console.error(`Sync error for batch ${i}:`, e);
                    errors++;
                }
            }));

            // Small delay to be nice to API
            await new Promise(r => setTimeout(r, 500));
        }

        // Also get ALL generic interests if possible? No, search is the only way.
        // Return success
        return NextResponse.json({
            success: true,
            message: `Synced ${totalSynced} interests across ${SEED_KEYWORDS.length} categories.`,
            count: totalSynced
        });

    } catch (error) {
        console.error('Sync failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
