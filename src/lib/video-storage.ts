import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface UploadResult {
  success: boolean;
  filePath?: string;
  url?: string;
  error?: string;
}

export class VideoStorage {
  private uploadDir: string;

  constructor() {
    // Use UPLOAD_DIR from env or default to ./uploads
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'videos');
  }

  /**
   * Upload video file to local storage
   */
  async uploadToLocal(file: File, folderName?: string): Promise<UploadResult> {
    try {
      // Log file size for tracking
      const fileSizeMB = file.size / (1024 * 1024);
      console.log(`📤 Uploading file to local storage: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
      
      // Create folder structure: uploads/videos/{folderName}/
      const targetDir = folderName 
        ? path.join(this.uploadDir, folderName)
        : this.uploadDir;

      // Ensure upload directory exists
      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileExtension = file.name.split('.').pop();
      const fileName = `video_${timestamp}_${randomStr}.${fileExtension}`;
      const filePath = path.join(targetDir, fileName);

      // Convert File to Buffer
      console.log(`⏳ Converting file to buffer...`);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Write file to disk
      console.log(`💾 Writing file to disk: ${filePath}`);
      await writeFile(filePath, buffer);

      console.log(`✅ Video uploaded successfully (${fileSizeMB.toFixed(2)}MB): ${filePath}`);

      // Generate URL path
      const urlPath = folderName 
        ? `/uploads/videos/${folderName}/${fileName}`
        : `/uploads/videos/${fileName}`;

      return {
        success: true,
        filePath,
        url: urlPath,
      };
    } catch (error) {
      console.error('Error uploading video to local storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload video file to Cloudflare R2 or AWS S3
   */
  async uploadToR2(file: File, folderName?: string): Promise<UploadResult> {
    try {
      // Log file size for tracking
      const fileSizeMB = file.size / (1024 * 1024);
      console.log(`📤 Uploading file to R2: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
      
      // Check if R2 is configured
      const accountId = process.env.R2_ACCOUNT_ID;
      const accessKeyId = process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
      const bucketName = process.env.R2_BUCKET_NAME;
      const publicUrl = process.env.R2_PUBLIC_URL; // Optional: custom domain

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        return {
          success: false,
          error: 'Cloudflare R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in .env',
        };
      }

      // Dynamic import of AWS SDK (only when needed)
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

      // Create S3 client configured for R2
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Generate unique filename with folder structure
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileExtension = file.name.split('.').pop();
      const fileName = folderName
        ? `videos/${folderName}/video_${timestamp}_${randomStr}.${fileExtension}`
        : `videos/video_${timestamp}_${randomStr}.${fileExtension}`;

      // Convert File to Buffer
      console.log(`⏳ Converting file to buffer...`);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to R2
      console.log(`☁️ Uploading to R2 bucket: ${bucketName}`);
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      });

      await s3Client.send(command);
      
      const uploadedSizeMB = file.size / (1024 * 1024);
      console.log(`✅ Video uploaded successfully to R2 (${uploadedSizeMB.toFixed(2)}MB)`);

      // Generate public URL
      // Don't use localhost URLs for R2 - use R2 dev URL instead
      const shouldUsePublicUrl = publicUrl && !publicUrl.includes('localhost');
      const fileUrl = shouldUsePublicUrl
        ? `${publicUrl}/${fileName}`
        : `https://pub-${accountId}.r2.dev/${fileName}`; // R2 dev URL

      console.log(`Video uploaded to R2: ${fileUrl}`);

      return {
        success: true,
        filePath: fileName, // R2 key
        url: fileUrl,
      };
    } catch (error) {
      console.error('Error uploading video to R2:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'R2 upload failed',
      };
    }
  }

  /**
   * Upload video - automatically chooses between local and R2
   */
  async upload(file: File, folderName?: string): Promise<UploadResult> {
    // Try R2 first if configured, fallback to local
    if (process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME) {
      const r2Result = await this.uploadToR2(file, folderName);
      if (r2Result.success) {
        return r2Result;
      }
      console.warn('R2 upload failed, falling back to local storage:', r2Result.error);
    }

    return this.uploadToLocal(file, folderName);
  }
}

export const videoStorage = new VideoStorage();
