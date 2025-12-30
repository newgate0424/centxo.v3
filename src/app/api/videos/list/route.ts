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
        debugLogs.push(`R2 Objects found: ${data.Contents?.length || 0}`);

        if (data.Contents) {
          for (const item of data.Contents) {
            if (item.Key && item.Size && item.LastModified) {

              // Only include files that look like media
              const ext = item.Key.split('.').pop()?.toLowerCase();
              if (!['mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png'].includes(ext || '')) continue;

              try {
                // Use proxy URL instead of presigned URL to avoid CORS issues
                const fileName = item.Key.split('/').pop() || item.Key;
                const proxyUrl = `/api/r2/${item.Key}`;

                // Check for thumbnails
                const videoId = fileName.split('.')[0]; // e.g., "video_123" from "video_123.mp4"
                const thumbnailPrefix = `thumbnails/${userId}/${videoId}/`;

                let thumbnailUrls: string[] = [];
                try {
                  const thumbCommand = new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: thumbnailPrefix,
                  });
                  const thumbData = await s3Client.send(thumbCommand);

                  if (thumbData.Contents && thumbData.Contents.length > 0) {
                    thumbnailUrls = thumbData.Contents
                      .filter(thumb => thumb.Key)
                      .map(thumb => `/api/r2/${thumb.Key}`)
                      .sort(); // Sort to maintain order (thumb-0, thumb-1, etc.)
                  }
                } catch (thumbError) {
                  console.error('Failed to fetch thumbnails for:', fileName, thumbError);
                }

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
