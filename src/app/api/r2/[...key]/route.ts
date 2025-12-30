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
        let isImage = false;
        if (ext === 'mp4') contentType = 'video/mp4';
        else if (ext === 'mov') contentType = 'video/quicktime';
        else if (ext === 'webm') contentType = 'video/webm';
        else if (['jpg', 'jpeg'].includes(ext || '')) { contentType = 'image/jpeg'; isImage = true; }
        else if (ext === 'png') { contentType = 'image/png'; isImage = true; }

        // Stability Fix: For images (thumbnails), read to buffer to avoid stream issues
        if (isImage) {
            const bytes = await response.Body.transformToByteArray();
            const buffer = Buffer.from(bytes); // Convert to Node Buffer for compatibility
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': buffer.length.toString(),
                    'Cache-Control': 'public, max-age=31536000, immutable', // Long cache for thumbnails
                },
            });
        }

        // Stream the response
        // Convert Node.js Readable to Web ReadableStream
        let stream: ReadableStream;

        if (response.Body && typeof (response.Body as any).transformToWebStream === 'function') {
            stream = (response.Body as any).transformToWebStream();
        } else {
            // Fallback for older SDK or different environment
            const nodeStream = response.Body as any;
            stream = new ReadableStream({
                start(controller) {
                    nodeStream.on('data', (chunk: any) => controller.enqueue(chunk));
                    nodeStream.on('end', () => controller.close());
                    nodeStream.on('error', (err: any) => controller.error(err));
                },
            });
        }

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
