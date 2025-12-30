import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { videoStorage } from '@/lib/video-storage';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: 'Missing fileName' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Use centralized storage deletion (handles Local + R2)
    const result = await videoStorage.delete(fileName, session.user.id);

    if (!result.success) {
      console.warn('Deletion warning:', result.error);
      // Return 404 only if completely missing, otherwise 500? 
      // Actually, if it fails to delete, we should probably tell the user why or just succeed if it's already gone.
      if (result.error?.includes('not found')) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log(`✅ File deleted successfully: ${fileName}`);

    // Also delete thumbnails from R2
    if (process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME) {
      try {
        const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;

        const s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
        });

        // Get video ID from filename
        const videoId = fileName.split('.')[0];
        const thumbnailPrefix = `thumbnails/${userId}/${videoId}/`;

        // List all thumbnails
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: thumbnailPrefix,
        });

        const listData = await s3Client.send(listCommand);

        if (listData.Contents && listData.Contents.length > 0) {
          // Delete all thumbnails
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: listData.Contents.map(item => ({ Key: item.Key! })),
            },
          });

          await s3Client.send(deleteCommand);
          console.log(`✅ Deleted ${listData.Contents.length} thumbnails from R2`);
        }
      } catch (thumbError) {
        console.error('Failed to delete thumbnails:', thumbError);
        // Don't fail the whole operation if thumbnail deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file' },
      { status: 500 }
    );
  }
}
