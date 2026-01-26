import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Try both possible paths (with and without "videos" subfolder)
    const possiblePaths = [
      path.join(process.cwd(), 'uploads', 'videos', userId),
      path.join(process.cwd(), 'uploads', userId),
    ];

    let userMediaPath: string | null = null;
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        userMediaPath = testPath;
        break;
      } catch {
        continue;
      }
    }

    // Check if user's media folder exists
    // Check if user's media folder exists
    // if (!userMediaPath) {
    //   // No folder found, return empty array
    //   return NextResponse.json({ videos: [] });
    // }

    // Read all files in user's folder
    let mediaFiles: any[] = [];
    if (userMediaPath) {
      const files = await fs.readdir(userMediaPath);
      const localFiles = await Promise.all(
        files.filter(file => /\.(mp4|webm|mov|avi|jpg|jpeg|png|gif|bmp)$/i.test(file))
          .map(async (file) => {
            const filePath = path.join(userMediaPath!, file);
            const stats = await fs.stat(filePath);
            const apiPath = userMediaPath!.includes('uploads\\videos\\') || userMediaPath!.includes('uploads/videos/')
              ? `/api/uploads/videos/${userId}/${file}`
              : `/api/uploads/${userId}/${file}`;
            return { name: file, path: apiPath, size: stats.size, uploadedAt: stats.birthtime.toISOString() };
          })
      );
      mediaFiles = [...localFiles];
    }
    // (Old dangling block removed)

    // 2. Fetch from R2
    const debugLogs: string[] = [];
    debugLogs.push(`Env Check: AccountID=${!!process.env.R2_ACCOUNT_ID}, Bucket=${!!process.env.R2_BUCKET_NAME}`);

    if (process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME) {
      try {
        const userId = session.user.id;
        const prefix = `videos/${userId}/`;

        debugLogs.push(`R2 Config: Prefix=${prefix}, User=${userId}`);

        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;

        const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');

        const s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
        });

        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
        });

        const data = await s3Client.send(command);
        console.log(`R2: Found ${data.Contents?.length || 0} videos`);

        if (data.Contents) {
          // OPTIMIZATION: Fetch ALL thumbnails for this user in ONE request
          // Instead of N request per video
          const thumbnailPrefix = `thumbnails/${userId}/`;
          let allUserThumbnails: Record<string, string[]> = {};

          try {
            console.log('R2: Bulk fetching thumbnails...');
            const thumbCommand = new ListObjectsV2Command({
              Bucket: bucketName,
              Prefix: thumbnailPrefix,
            });
            const thumbData = await s3Client.send(thumbCommand);

            if (thumbData.Contents) {
              console.log(`R2: Found ${thumbData.Contents.length} total thumbnails for user`);
              // DEBUG: Log first 3 keys to verify structure
              thumbData.Contents.slice(0, 3).forEach(t => console.log('DEBUG Key:', t.Key));

              thumbData.Contents.forEach(item => {
                if (!item.Key) return;

                // Handle potential leading slash
                const key = item.Key.startsWith('/') ? item.Key.slice(1) : item.Key;

                // Key format: thumbnails/userId/videoId/thumb_X.jpg
                const parts = key.split('/');
                // parts[0]=thumbnails, parts[1]=userId, parts[2]=videoId, parts[3]=filename

                if (parts.length >= 4 && parts[0] === 'thumbnails') {
                  const vId = parts[2];
                  if (!allUserThumbnails[vId]) allUserThumbnails[vId] = [];
                  allUserThumbnails[vId].push(`/api/r2/${item.Key}`); // Use original key for URL
                } else {
                  // DEBUG: Log skipped keys
                  console.log('Skipped Key (Format mismatch):', key, 'Parts:', parts);
                }
              });
            }
            console.log(`R2: Mapped thumbnails for ${Object.keys(allUserThumbnails).length} videos. Sample specific videoId: ${Object.keys(allUserThumbnails)[0] || 'none'}`);
          } catch (e) {
            console.warn('R2: Failed to bulk list thumbnails', e);
          }

          for (const item of data.Contents) {
            if (item.Key && item.Size && item.LastModified) {

              // Only include files that look like media
              const ext = item.Key.split('.').pop()?.toLowerCase();
              if (!['mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png'].includes(ext || '')) continue;

              try {
                // Use proxy URL instead of presigned URL to avoid CORS issues
                const fileName = item.Key.split('/').pop() || item.Key;
                const proxyUrl = `/api/r2/${item.Key}`;

                // Check for thumbnails from memory map
                const videoId = fileName.split('.')[0]; // e.g., "video_123" from "video_123.mp4"
                let thumbnailUrls = allUserThumbnails[videoId] || [];

                // Sort thumbnails naturally
                thumbnailUrls.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                mediaFiles.push({
                  name: fileName,
                  path: proxyUrl, // This will route through /api/r2/[...path]
                  size: item.Size,
                  uploadedAt: item.LastModified.toISOString(),
                  thumbnailUrls: thumbnailUrls.length > 0 ? thumbnailUrls : undefined,
                });
              } catch (urlError) {
                console.error('❌ Failed to process R2 item:', item.Key, urlError);
              }
            }
          }
        }
      } catch (r2Error: any) {
        console.error('Failed to list R2 files:', r2Error);
        debugLogs.push(`R2 Error: ${r2Error.message}`);
        // Don't crash entire list if R2 fails
      }
    } else {
      debugLogs.push('R2 not configured');
    }

    // Sort by upload date (newest first)
    mediaFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ videos: mediaFiles, debug: debugLogs });
  } catch (error: any) {
    console.error('Error listing videos:', error);
    return NextResponse.json(
      { error: 'Failed to list videos', details: error.message },
      { status: 500 }
    );
  }
}
