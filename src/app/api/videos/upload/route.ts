import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { videoStorage } from '@/lib/video-storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const userId = session.user.id;

        console.log(`📤 Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) for user: ${userId}`);

        // Upload to R2 (or local if R2 not configured)
        const result = await videoStorage.upload(file, userId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Upload failed' },
                { status: 500 }
            );
        }

        console.log(`✅ Upload successful: ${result.url}`);
        console.log(`📸 Thumbnails: ${result.thumbnailUrls?.length || 0} generated`);

        return NextResponse.json({
            success: true,
            url: result.url,
            filePath: result.filePath,
            thumbnailUrls: result.thumbnailUrls || [],
        });
    } catch (error: any) {
        console.error('Error uploading file:', error);
        return NextResponse.json(
            { error: 'Failed to upload file', details: error.message },
            { status: 500 }
        );
    }
}
