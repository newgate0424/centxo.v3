import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

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

    // Sort by upload date (newest first)
    mediaFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ videos: mediaFiles });
  } catch (error) {
    console.error('Error listing videos:', error);
    return NextResponse.json(
      { error: 'Failed to list videos' },
      { status: 500 }
    );
  }
}
