import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

// FFmpeg will use system binaries (ffmpeg and ffprobe must be installed on the system)

export interface ThumbnailGenerationResult {
    success: boolean;
    thumbnailUrls?: string[];
    error?: string;
}

/**
 * Generate thumbnails from a video file and upload to R2
 * @param videoPath - Local path to the video file
 * @param userId - User ID for organizing thumbnails in R2
 * @param videoId - Unique video identifier
 * @param count - Number of thumbnails to generate (default: 18)
 * @returns Array of thumbnail URLs in R2
 */
export async function generateAndUploadThumbnails(
    videoPath: string,
    userId: string,
    videoId: string,
    count: number = 18
): Promise<ThumbnailGenerationResult> {
    try {
        console.log(`🎬 Generating ${count} thumbnails for video: ${videoPath}`);

        // Check if R2 is configured
        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
            return {
                success: false,
                error: 'Cloudflare R2 not configured',
            };
        }

        // Get video duration
        const duration = await getVideoDuration(videoPath);
        if (!duration || duration <= 0) {
            return {
                success: false,
                error: 'Could not determine video duration',
            };
        }

        console.log(`📹 Video duration: ${duration.toFixed(2)}s`);

        // Calculate intervals for thumbnail extraction
        const interval = duration / (count + 1);
        const timestamps: number[] = [];
        for (let i = 1; i <= count; i++) {
            timestamps.push(interval * i);
        }

        // Create temp directory for thumbnails
        const tempDir = path.join(process.cwd(), 'uploads', 'temp', 'thumbnails');
        if (!existsSync(tempDir)) {
            await mkdir(tempDir, { recursive: true });
        }

        // Extract thumbnails
        const thumbnailPaths: string[] = [];
        for (let i = 0; i < timestamps.length; i++) {
            const timestamp = timestamps[i];
            const tempPath = path.join(tempDir, `thumb_${i}.jpg`);

            await extractFrameAtTime(videoPath, timestamp, tempPath);
            thumbnailPaths.push(tempPath);
        }

        console.log(`✅ Extracted ${thumbnailPaths.length} thumbnails`);

        // Upload thumbnails to R2
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        });

        const thumbnailUrls: string[] = [];
        for (let i = 0; i < thumbnailPaths.length; i++) {
            const thumbnailPath = thumbnailPaths[i];
            const r2Key = `thumbnails/${userId}/${videoId}/thumb-${i}.jpg`;

            // Optimize thumbnail before upload
            // Resize with fixed height 180px, width auto to maintain aspect ratio
            const buffer = await sharp(thumbnailPath)
                .resize({ height: 180 })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Upload to R2
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: r2Key,
                Body: buffer,
                ContentType: 'image/jpeg',
            }));

            // Generate URL (using proxy API route)
            const thumbnailUrl = `/api/r2/${r2Key}`;
            thumbnailUrls.push(thumbnailUrl);

            // Clean up temp file
            await unlink(thumbnailPath).catch(() => { });
        }

        console.log(`✅ Uploaded ${thumbnailUrls.length} thumbnails to R2`);

        return {
            success: true,
            thumbnailUrls,
        };
    } catch (error) {
        console.error('Error generating thumbnails:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Thumbnail generation failed',
        };
    }
}

/**
 * Get video duration in seconds
 */
function getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration || 0);
            }
        });
    });
}

/**
 * Extract a single frame from video at specific timestamp
 */
function extractFrameAtTime(
    videoPath: string,
    timestamp: number,
    outputPath: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .screenshots({
                timestamps: [timestamp],
                filename: path.basename(outputPath),
                folder: path.dirname(outputPath),
                size: '?x360', // Height 360, width auto
            })
            .on('end', () => resolve())
            .on('error', reject);
    });
}
