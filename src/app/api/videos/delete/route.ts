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
