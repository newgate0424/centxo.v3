import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

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
    
    // Try both possible paths
    const possiblePaths = [
      path.join(process.cwd(), 'uploads', 'videos', userId, fileName),
      path.join(process.cwd(), 'uploads', userId, fileName),
    ];
    
    let fileToDelete: string | null = null;
    for (const testPath of possiblePaths) {
      if (existsSync(testPath)) {
        fileToDelete = testPath;
        break;
      }
    }

    if (!fileToDelete) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Security check: Ensure the file path is within user's folder
    const normalizedPath = path.normalize(fileToDelete);
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!normalizedPath.startsWith(uploadsDir) || !normalizedPath.includes(userId)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Delete the file
    await fs.unlink(fileToDelete);
    console.log(`✅ File deleted: ${fileToDelete}`);

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
