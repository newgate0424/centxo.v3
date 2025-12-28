import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string[] }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { key } = await params;
        const fileKey = key.join('/');

        // Security: ensure user can only access their own files
        if (!fileKey.includes(session.user.id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
            return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
        }

        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        });

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Determine content type from file extension
        const ext = fileKey.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'mp4') contentType = 'video/mp4';
        else if (ext === 'mov') contentType = 'video/quicktime';
        else if (ext === 'webm') contentType = 'video/webm';
        else if (['jpg', 'jpeg'].includes(ext || '')) contentType = 'image/jpeg';
        else if (ext === 'png') contentType = 'image/png';

        // Stream the response
        const stream = response.Body as ReadableStream;

        return new NextResponse(stream, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': response.ContentLength?.toString() || '',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('R2 proxy error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch file' },
            { status: 500 }
        );
    }
}
