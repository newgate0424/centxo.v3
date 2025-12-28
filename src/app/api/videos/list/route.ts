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
    if (!userMediaPath) {
      // No folder found, return empty array
      return NextResponse.json({ videos: [] });
    }

    // Read all files in user's folder
    const files = await fs.readdir(userMediaPath);

    // Filter video AND image files and get file info
    const mediaFiles = await Promise.all(
      files
        .filter(file => /\.(mp4|webm|mov|avi|jpg|jpeg|png|gif|bmp)$/i.test(file))
        .map(async (file) => {
          const filePath = path.join(userMediaPath!, file);
          const stats = await fs.stat(filePath);

          // Generate API path for serving files
          const apiPath = userMediaPath!.includes('uploads\\videos\\') || userMediaPath!.includes('uploads/videos/')
            ? `/api/uploads/videos/${userId}/${file}`
            : `/api/uploads/${userId}/${file}`;

          return {
            name: file,
            path: apiPath,
            size: stats.size,
            uploadedAt: stats.birthtime.toISOString(),
          };
        })
    );

    // 2. Fetch from R2
    if (process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME) {
      try {
        const userId = session.user.id;
        const prefix = `videos/${userId}/`;

        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;
        const publicUrl = process.env.R2_PUBLIC_URL;

        console.log('🔐 R2 Config:', {
          hasAccountId: !!accountId,
          hasAccessKey: !!accessKeyId,
          hasSecretKey: !!secretAccessKey,
          bucketName
        });

        const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

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
        console.log('📦 R2 Objects found:', data.Contents?.length || 0);

        if (data.Contents) {
          for (const item of data.Contents) {
            if (item.Key && item.Size && item.LastModified) {
              // Determine MIME type for browser preview
              const ext = item.Key.split('.').pop()?.toLowerCase();
              let contentType = 'application/octet-stream';
              if (ext === 'mp4') contentType = 'video/mp4';
              else if (ext === 'mov') contentType = 'video/quicktime';
              else if (ext === 'webm') contentType = 'video/webm';
              else if (['jpg', 'jpeg'].includes(ext || '')) contentType = 'image/jpeg';
              else if (ext === 'png') contentType = 'image/png';

              try {
                // Use proxy URL instead of presigned URL to avoid CORS issues
                const fileName = item.Key.split('/').pop() || item.Key;
                const proxyUrl = `/api/r2/${item.Key}`;

                console.log('✅ Created proxy URL for:', fileName);

                mediaFiles.push({
                  name: fileName,
                  path: proxyUrl,
                  size: item.Size,
                  uploadedAt: item.LastModified.toISOString(),
                });
              } catch (urlError) {
                console.error('❌ Failed to create URL for:', item.Key, urlError);
              }
            }
          }
        }
      } catch (r2Error) {
        console.error('Failed to list R2 files:', r2Error);
        // Don't crash entire list if R2 fails
      }
    } else {
      console.log('⚠️ R2 not configured - skipping cloud storage');
    }

    // Sort by upload date (newest first)
    mediaFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    console.log('📹 Returning media files:', mediaFiles.length, 'files');
    if (mediaFiles.length > 0) {
      console.log('First file:', { name: mediaFiles[0].name, pathLength: mediaFiles[0].path.length, pathStart: mediaFiles[0].path.substring(0, 150) });
    }

    return NextResponse.json({ videos: mediaFiles });
  } catch (error) {
    console.error('Error listing videos:', error);
    return NextResponse.json(
      { error: 'Failed to list videos' },
      { status: 500 }
    );
  }
}
