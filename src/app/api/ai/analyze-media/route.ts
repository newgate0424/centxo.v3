import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { analyzeMediaForAd } from '@/ai/flows/analyze-media-for-ad';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

export const dynamic = 'force-dynamic';

// Helper: Extract Multiple Video Frames for Better Analysis
async function extractVideoFrames(videoPath: string, count: number = 3): Promise<Buffer[]> {
    return new Promise((resolve, reject) => {
        // Get video duration first
        ffmpeg.ffprobe(videoPath, async (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const duration = metadata.format.duration || 10;
            const frames: Buffer[] = [];
            const timestamps: string[] = [];

            // Extract frames at different points (beginning, middle, end)
            for (let i = 0; i < count; i++) {
                const time = (duration / (count + 1)) * (i + 1);
                timestamps.push(`00:00:${time.toFixed(3)}`);
            }

            const tempDir = path.dirname(videoPath);
            const baseName = path.basename(videoPath, path.extname(videoPath));

            try {
                // Extract all frames
                await new Promise<void>((resolveScreenshots, rejectScreenshots) => {
                    ffmpeg(videoPath)
                        .screenshots({
                            timestamps,
                            filename: `${baseName}_frame_%i.jpg`,
                            folder: tempDir,
                            size: '1280x720'
                        })
                        .on('end', () => resolveScreenshots())
                        .on('error', rejectScreenshots);
                });

                // Read all frame files
                for (let i = 0; i < count; i++) {
                    const framePath = path.join(tempDir, `${baseName}_frame_${i + 1}.jpg`);
                    const frameBuffer = await fs.readFile(framePath);
                    frames.push(frameBuffer);
                    await fs.unlink(framePath).catch(() => { });
                }

                resolve(frames);
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Helper: Optimize Image
async function optimizeImageForAI(imagePath: string): Promise<string> {
    try {
        const buffer = await fs.readFile(imagePath);
        const optimizedBuffer = await sharp(buffer)
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
    } catch (error) {
        console.error('Image optimization failed:', error);
        const buffer = await fs.readFile(imagePath);
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();

        // Inputs: New File OR Existing Path/URL
        const file = formData.get('file') as File;
        const existingMediaPath = formData.get('existingMediaPath') as string;
        const existingMediaUrl = formData.get('existingMediaUrl') as string;
        const analysisImage = formData.get('analysisImage') as File; // New input

        const productContext = formData.get('productContext') as string || '';
        const adSetCount = parseInt(formData.get('adSetCount') as string) || 3;

        if (!file && !existingMediaPath) {
            return NextResponse.json({ error: 'No file or existing media path provided' }, { status: 400 });
        }

        let filePath = '';
        let mediaUrl = '';
        let isVideo = false;

        // 1. Handle Source (New Upload vs Existing)
        if (existingMediaPath && existingMediaPath.length > 0) {
            console.log('Using existing media path:', existingMediaPath);
            filePath = existingMediaPath;
            mediaUrl = existingMediaUrl || existingMediaPath;

            // Check extension to determine type
            const ext = path.extname(filePath).toLowerCase();
            isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
        } else if (file) {
            // 1. Save file temporarily
            const tempDir = path.join(process.cwd(), 'uploads', 'temp');
            if (!existsSync(tempDir)) await fs.mkdir(tempDir, { recursive: true });

            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            filePath = path.join(tempDir, fileName);
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.writeFile(filePath, buffer);

            isVideo = file.type.startsWith('video/');
            mediaUrl = filePath; // Temp URL
        }

        // 2. Prepare Media for AI
        let mediaDataUri = '';
        let analysisMediaType: 'video' | 'image' = isVideo ? 'video' : 'image';
        let isVideoFile = false;
        let allThumbnailsDataUris: string[] = [];

        // PRIORITY 1: Use ALL Client-Provided Thumbnails if available (Best for comprehensive analysis)
        const thumbnailFiles = formData.getAll('thumbnails') as File[];
        if (thumbnailFiles && thumbnailFiles.length > 0) {
            console.log(`📸 Using ${thumbnailFiles.length} client-provided thumbnails for comprehensive analysis`);

            // Process all thumbnails
            for (const thumbFile of thumbnailFiles) {
                const buffer = Buffer.from(await thumbFile.arrayBuffer());
                const optimizedBuffer = await sharp(buffer)
                    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toBuffer();
                allThumbnailsDataUris.push(`data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`);
            }

            // Use middle thumbnail as primary
            mediaDataUri = allThumbnailsDataUris[Math.floor(allThumbnailsDataUris.length / 2)];
            analysisMediaType = 'image';
            isVideoFile = false;

            console.log(`✅ Processed ${allThumbnailsDataUris.length} thumbnails for AI analysis`);
        }
        // PRIORITY 2: Use single selected thumbnail (backward compatibility)
        else if (analysisImage) {
            console.log('Using single client-provided thumbnail for analysis');
            const buffer = Buffer.from(await analysisImage.arrayBuffer());
            const optimizedBuffer = await sharp(buffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();
            mediaDataUri = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
            analysisMediaType = 'image';
            isVideoFile = false;
        }
        else if (isVideo) {
            try {
                // Extract 3 frames for comprehensive analysis
                console.log('📹 Extracting 3 frames from video for detailed analysis...');
                const frameBuffers = await extractVideoFrames(filePath, 3);

                // Convert all frames to base64 and combine them
                const frameDataUris = frameBuffers.map(buffer =>
                    `data:image/jpeg;base64,${buffer.toString('base64')}`
                );

                // Use the middle frame as primary, but we'll send all frames in the prompt
                mediaDataUri = frameDataUris[1]; // Middle frame as primary
                analysisMediaType = 'image';
                isVideoFile = false;

                console.log(`✅ Extracted ${frameBuffers.length} frames for AI analysis`);
            } catch (e) {
                console.warn('Frame extraction failed, using single frame fallback');
                try {
                    // Fallback to single frame
                    const singleFrame = await extractVideoFrames(filePath, 1);
                    mediaDataUri = `data:image/jpeg;base64,${singleFrame[0].toString('base64')}`;
                    analysisMediaType = 'image';
                    isVideoFile = false;
                } catch (e2) {
                    console.warn('All frame extraction failed, using full video path for AI');
                    mediaDataUri = filePath;
                    analysisMediaType = 'video';
                    isVideoFile = true;
                }
            }
        } else {
            mediaDataUri = await optimizeImageForAI(filePath);
        }

        // 3. Fetch Past Interests (Database Knowledge)
        let pastInterests: string[] = [];
        try {
            const recentAdSets = await prisma.adSet.findMany({
                where: {
                    campaign: { metaAccount: { userId: session.user.id } },
                    status: 'ACTIVE'
                },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { targeting: true }
            });

            const interestSet = new Set<string>();
            recentAdSets.forEach((adSet: any) => {
                const targeting = adSet.targeting as any;
                if (targeting?.interests && Array.isArray(targeting.interests)) {
                    targeting.interests.forEach((i: any) => interestSet.add(i.name));
                }
                if (targeting?.flexible_spec) {
                    targeting.flexible_spec.forEach((spec: any) => {
                        if (spec.interests) {
                            spec.interests.forEach((i: any) => interestSet.add(i.name));
                        }
                    });
                }
            });
            pastInterests = Array.from(interestSet).slice(0, 20);
        } catch (dbError) {
            console.warn('Failed to fetch past interests:', dbError);
        }

        // 4. Run AI Analysis
        const randomSeed = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const aiResult = await analyzeMediaForAd({
            mediaUrl: mediaDataUri,
            mediaType: analysisMediaType,
            additionalFrames: allThumbnailsDataUris.length > 0 ? allThumbnailsDataUris : undefined,
            productContext,
            isVideoFile,
            adSetCount: adSetCount,
            randomContext: randomSeed,
            pastSuccessExamples: pastInterests.length > 0 ? pastInterests : undefined,
        });

        // Cleanup temp file immediately to save space
        // await fs.unlink(filePath).catch(() => {}); 

        // Return Result
        return NextResponse.json({
            success: true,
            data: aiResult,
            tempFilePath: isVideo ? filePath : undefined // Return path if needed for thumbnail extraction on client, else cleanup
        });

    } catch (error) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}
