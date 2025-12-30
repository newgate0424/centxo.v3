import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { analyzeMediaForAd } from '@/ai/flows/analyze-media-for-ad';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const section = formData.get('section') as string; // 'captions' | 'targeting' | 'icebreakers'
        const productContext = formData.get('productContext') as string || '';
        const adSetCount = parseInt(formData.get('adSetCount') as string) || 3;
        const file = formData.get('file') as File;
        const analysisImage = formData.get('analysisImage') as File;

        if (!section || !['captions', 'targeting', 'icebreakers'].includes(section)) {
            return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
        }

        // Prepare media for AI
        let mediaDataUri = '';
        let mediaType: 'video' | 'image' = 'image';

        if (analysisImage) {
            const buffer = Buffer.from(await analysisImage.arrayBuffer());
            const optimizedBuffer = await sharp(buffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();
            mediaDataUri = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
        } else if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            if (file.type.startsWith('image')) {
                const optimizedBuffer = await sharp(buffer)
                    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toBuffer();
                mediaDataUri = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
            } else {
                return NextResponse.json({ error: 'Video regeneration requires thumbnail' }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: 'No media provided' }, { status: 400 });
        }

        // Generate unique random seed for different results
        const randomSeed = `${section}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Run AI Analysis with different seed for variation
        const aiResult = await analyzeMediaForAd({
            mediaUrl: mediaDataUri,
            mediaType,
            productContext,
            isVideoFile: false,
            adSetCount,
            randomContext: randomSeed,
        });

        // Return only the requested section
        let responseData: any = {};

        if (section === 'captions') {
            responseData = {
                adCopyVariations: aiResult.adCopyVariations
            };
        } else if (section === 'targeting') {
            responseData = {
                interestGroups: aiResult.interestGroups
            };
        } else if (section === 'icebreakers') {
            responseData = {
                iceBreakers: aiResult.iceBreakers
            };
        }

        return NextResponse.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Regenerate Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Regeneration failed' },
            { status: 500 }
        );
    }
}
