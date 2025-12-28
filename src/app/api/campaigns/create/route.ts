import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { invalidateUserCache } from '@/lib/cache/redis';
import { authOptions } from '@/lib/auth';
import { videoStorage } from '@/lib/video-storage';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { analyzeMediaForAd } from '@/ai/flows/analyze-media-for-ad';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

// Helper function to extract first frame from video
async function extractVideoFrame(videoPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempFramePath = videoPath.replace(/\.(mp4|mov|avi)$/i, '_frame.jpg');

    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01.000'], // Extract frame at 1 second
        filename: path.basename(tempFramePath),
        folder: path.dirname(tempFramePath),
        size: '1280x720'
      })
      .on('end', async () => {
        try {
          const frameBuffer = await fs.readFile(tempFramePath);
          // Clean up temp file
          await fs.unlink(tempFramePath).catch(() => { });
          resolve(frameBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

// Helper function to optimize image for AI analysis
async function optimizeImageForAI(imagePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(imagePath);

    // Resize and compress image for AI analysis
    // Max width: 1024px, Quality: 80, Format: JPEG
    const optimizedBuffer = await sharp(buffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = optimizedBuffer.toString('base64');
    console.log(`✓ Image optimized: ${(buffer.length / 1024).toFixed(1)}KB → ${(optimizedBuffer.length / 1024).toFixed(1)}KB`);

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Image optimization failed:', error);
    // Fallback to original
    const buffer = await fs.readFile(imagePath);
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }
}

// Helper function to get verified beneficiaries from Ad Account
async function getVerifiedBeneficiary(adAccountId: string, accessToken: string): Promise<{ id: string; name: string } | null> {
  console.log('🔍 Fetching verified beneficiaries from Ad Account...');

  try {
    // Try to get DSA beneficiaries from the ad account
    const beneficiaryResponse = await fetch(
      `https://graph.facebook.com/v22.0/act_${adAccountId}?fields=dsa_beneficiary,dsa_payor&access_token=${accessToken}`
    );
    const beneficiaryData = await beneficiaryResponse.json();

    if (beneficiaryData.dsa_beneficiary) {
      console.log(`✓ Found DSA beneficiary: ${beneficiaryData.dsa_beneficiary}`);
      return { id: beneficiaryData.dsa_beneficiary, name: beneficiaryData.dsa_beneficiary };
    }

    // Try alternative endpoint for page transparency
    const transparencyResponse = await fetch(
      `https://graph.facebook.com/v22.0/act_${adAccountId}/agencies?access_token=${accessToken}`
    );
    const transparencyData = await transparencyResponse.json();

    if (transparencyData.data && transparencyData.data.length > 0) {
      const firstAgency = transparencyData.data[0];
      console.log(`✓ Found agency/beneficiary: ${firstAgency.name} (${firstAgency.id})`);
      return { id: firstAgency.id, name: firstAgency.name };
    }
  } catch (error) {
    console.error('Error fetching verified beneficiary:', error);
  }

  console.log('⚠️ No verified beneficiary found');
  return null;
}

// Helper function to search for Facebook interest IDs
async function searchInterestId(interestName: string, accessToken: string): Promise<string | null> {
  try {
    const searchUrl = `https://graph.facebook.com/v22.0/search?type=adinterest&q=${encodeURIComponent(interestName)}&limit=1&access_token=${accessToken}`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      return data.data[0].id;
    }
    return null;
  } catch (error) {
    console.error(`Failed to search interest "${interestName}":`, error);
    return null;
  }
}

// Helper function to convert interest names to IDs
async function getInterestIds(interestNames: string[], accessToken: string): Promise<Array<{ id: string, name: string }>> {
  const interestObjects: Array<{ id: string, name: string }> = [];

  for (const name of interestNames) {
    const id = await searchInterestId(name, accessToken);
    if (id) {
      interestObjects.push({ id, name });
      console.log(`✓ Found interest ID for "${name}": ${id}`);
    } else {
      console.warn(`✗ Could not find interest ID for "${name}", skipping`);
    }
  }

  return interestObjects;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const videoFile = formData.get('file') as File;
    const thumbnailFile = formData.get('thumbnail') as File;
    const existingVideo = formData.get('existingVideo') as string;
    const adAccountId = formData.get('adAccountId') as string;
    const campaignObjective = formData.get('campaignObjective') as string;
    const pageId = formData.get('pageId') as string;
    const mediaType = formData.get('mediaType') as string; // 'video' or 'image'
    const dailyBudgetInput = formData.get('dailyBudget') as string;
    const campaignCount = parseInt(formData.get('campaignCount') as string) || 1;
    const adSetCount = parseInt(formData.get('adSetCount') as string) || 1;
    const adsCount = parseInt(formData.get('adsCount') as string) || 1;
    const beneficiaryName = formData.get('beneficiaryName') as string;

    if (!adAccountId || !campaignObjective || !pageId) {
      return NextResponse.json(
        { error: 'Missing required fields: adAccountId, campaignObjective, pageId' },
        { status: 400 }
      );
    }

    if (!videoFile && !existingVideo) {
      return NextResponse.json(
        { error: 'Either file or existingVideo must be provided' },
        { status: 400 }
      );
    }

    let mediaUrl: string;
    let mediaPath: string;
    const isVideo = mediaType === 'video' || videoFile?.type.startsWith('video/') || existingVideo?.endsWith('.mp4') || existingVideo?.endsWith('.webm');

    // Handle media upload or use existing media
    if (existingVideo) {
      // Use existing video - try both possible paths
      console.log(`Using existing media: ${existingVideo}`);

      // Try both paths (with and without "videos" subfolder)
      const possiblePaths = [
        path.join(process.cwd(), 'uploads', 'videos', session.user.id, existingVideo),
        path.join(process.cwd(), 'uploads', session.user.id, existingVideo),
      ];

      let foundPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (existsSync(testPath)) {
          foundPath = testPath;
          break;
        }
      }

      // If not found locally, try R2
      if (!foundPath && process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME) {
        console.log('File not found locally, trying R2...');
        try {
          const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
          const accountId = process.env.R2_ACCOUNT_ID;
          const accessKeyId = process.env.R2_ACCESS_KEY_ID;
          const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
          const bucketName = process.env.R2_BUCKET_NAME;

          const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
          });

          const r2Key = `videos/${session.user.id}/${existingVideo}`;
          const command = new GetObjectCommand({ Bucket: bucketName, Key: r2Key });
          const response = await s3Client.send(command);

          if (response.Body) {
            // Download to temp folder for processing
            const tempDir = path.join(process.cwd(), 'uploads', 'temp');
            if (!existsSync(tempDir)) {
              await fs.mkdir(tempDir, { recursive: true });
            }
            const tempPath = path.join(tempDir, existingVideo);

            // Stream to file
            const bodyContents = await response.Body.transformToByteArray();
            await fs.writeFile(tempPath, Buffer.from(bodyContents));

            foundPath = tempPath;
            console.log('✓ Downloaded from R2 to temp:', tempPath);
          }
        } catch (r2Error) {
          console.error('R2 download failed:', r2Error);
        }
      }

      if (!foundPath) {
        return NextResponse.json(
          { error: `File not found: ${existingVideo}` },
          { status: 404 }
        );
      }

      mediaPath = foundPath;
      // Generate URL for the file (using API route)
      const isInVideosFolder = foundPath.includes(path.join('uploads', 'videos'));
      mediaUrl = isInVideosFolder
        ? `/api/uploads/videos/${session.user.id}/${existingVideo}`
        : `/api/uploads/${session.user.id}/${existingVideo}`;
    } else {
      // Validate file size (1.5GB max)
      const maxSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB
      if (videoFile.size > maxSize) {
        return NextResponse.json(
          { error: `File too large. Maximum size is 1.5GB. Your file: ${(videoFile.size / (1024 * 1024 * 1024)).toFixed(2)}GB` },
          { status: 400 }
        );
      }

      // Upload new media to user's folder
      console.log(`Uploading ${isVideo ? 'video' : 'image'} to storage in user folder: ${session.user.id}...`);
      const uploadResult = await videoStorage.upload(videoFile, session.user.id);

      if (!uploadResult.success) {
        return NextResponse.json(
          { error: `Media upload failed: ${uploadResult.error}` },
          { status: 500 }
        );
      }

      mediaUrl = uploadResult.url!;
      mediaPath = uploadResult.filePath!; // Changed from .path to .filePath
    }

    console.log('Media processed successfully:', { mediaUrl, mediaPath });

    // Step 0: AI Analysis of Media
    console.log('🤖 Analyzing media with AI...');
    let aiAnalysis;
    let analysisLogId: string | undefined;
    let fileSizeMB: number | undefined;
    // Add context for AI based on file type or user input
    const userProductContext = formData.get('productContext') as string;
    const productContext = isVideo
      ? (userProductContext ? `${userProductContext}. นี่คือวิดีโอโฆษณาสินค้า...` : `นี่คือวิดีโอโฆษณาสินค้า...`)
      : userProductContext;

    try {
      // Convert media to data URI for AI analysis
      let mediaDataUri = mediaUrl;
      let analysisMediaType: 'video' | 'image' = isVideo ? 'video' : 'image';
      let isVideoFile = false;

      // For local files, optimize before sending to AI
      if (existsSync(mediaPath)) {
        if (isVideo) {
          // For videos: Extract frame to speed up analysis (avoid uploading 100MB+ to AI)
          try {
            console.log(`📹 Video detected. Extracting representative frame for fast AI analysis...`);
            const frameBuffer = await extractVideoFrame(mediaPath);
            const base64 = frameBuffer.toString('base64');
            mediaDataUri = `data:image/jpeg;base64,${base64}`;
            analysisMediaType = 'image'; // Treat as image for analysis
            isVideoFile = false;
            console.log(`✅ Frame extracted successfully - analyzing as image`);
          } catch (frameError) {
            console.error('⚠ Frame extraction failed, falling back to full video analysis:', frameError);
            const stats = await fs.stat(mediaPath);
            fileSizeMB = stats.size / (1024 * 1024);

            console.log(`📹 Video detected: ${fileSizeMB.toFixed(2)}MB`);
            console.log(`🎬 Sending entire video to AI for deep analysis...`);

            // Send video file path directly to Gemini (it supports video analysis)
            mediaDataUri = mediaPath;
            analysisMediaType = 'video';
            isVideoFile = true;
            console.log(`✅ Video file prepared - AI will analyze entire video content`);
          }
        } else {
          // For images: Optimize before sending
          console.log('🖼️ Image detected: Optimizing for AI analysis...');
          mediaDataUri = await optimizeImageForAI(mediaPath);
        }
      }

      console.log(`🤖 Sending to AI for analysis...`);

      console.log(`🤖 Sending to AI for analysis...`);

      // Generate random context for high entropy
      const randomSeed = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log('🤖 STARTING AI ANALYSIS (Single File)');
      console.log(`- Media Type: ${analysisMediaType}`);
      console.log(`- Product Context: "${productContext}"`);
      console.log(`- AdSet Count Requested: ${adSetCount}`);
      console.log(`- Random Seed: ${randomSeed}`);

      aiAnalysis = await analyzeMediaForAd({
        mediaUrl: mediaDataUri,
        mediaType: analysisMediaType,
        productContext,
        isVideoFile,
        adSetCount: adSetCount + 2, // Request slightly more than needed to be safe
        randomContext: randomSeed,
      });

      console.log('🤖 AI ANALYSIS RESULT:');
      console.log(JSON.stringify(aiAnalysis, null, 2));

      // Force high confidence if it seems low (debug)
      if (aiAnalysis.confidence < 0.7) {
        console.warn(`Low confidence detected: ${aiAnalysis.confidence}. Keeping raw result.`);
      }

      // Add simple fallback checking
      if (!aiAnalysis.productCategory) {
        aiAnalysis.productCategory = 'สินค้าทั่วไป';
      }

      // Ensure ageMin and ageMax are numbers
      if (!aiAnalysis.ageMin || !aiAnalysis.ageMax) {
        aiAnalysis.ageMin = 20;
        aiAnalysis.ageMax = 65;
      }

      console.log('✓ AI Analysis complete:', {
        category: aiAnalysis.productCategory,
        confidence: aiAnalysis.confidence,
        interests: aiAnalysis.interests,
        ageRange: `${aiAnalysis.ageMin}-${aiAnalysis.ageMax}`,
      });
    } catch (aiError) {
      console.error('AI Analysis failed, using smart fallback:', aiError);

      // Import services dynamically to avoid top-level issues
      const { generateSmartTargeting } = await import('@/lib/services/targetingService');
      const { generateAdCopies } = await import('@/lib/services/aiCopyService');

      // Generate Smart Targeting
      const smartTargeting = await generateSmartTargeting(productContext);

      // Generate Smart Copies (this now tries Gemini 1.5 Flash, or falls back to templates)
      const smartCopies = await generateAdCopies({
        productContext,
        numberOfVariations: Math.max(adsCount, 5)
      });

      // Create diverse interest groups from the smart targeting list
      // We have ~5-10 interests. We can slice them into groups.
      const interestList = smartTargeting.interests;
      const interestGroups = [];

      // Create at least 3 groups or as many as requested
      const groupsNeeded = Math.max(adSetCount, 3);

      for (let i = 0; i < groupsNeeded; i++) {
        // Shuffle/Rotate interests for diversity
        const shuffled = [...interestList].sort(() => Math.random() - 0.5);
        // Pick 3-5 interests per group
        const count = 3 + Math.floor(Math.random() * 3);
        interestGroups.push({
          name: `Targeting Group ${String.fromCharCode(65 + i)}`,
          interests: shuffled.slice(0, count)
        });
      }

      // Map copies to variations format
      const adCopyVariations = smartCopies.map(copy => ({
        primaryText: copy.primaryTextTH,
        headline: copy.headlineTH || '✨ คลิกเลย!'
      }));

      // Fallback object with dynamic data
      aiAnalysis = {
        primaryText: adCopyVariations[0]?.primaryText || '🔥 สินค้าคุณภาพ ราคาดี พร้อมส่งทันที! สนใจทักแชทสอบถามได้เลยครับ 💬',
        headline: adCopyVariations[0]?.headline || '✨ คลิกดูสินค้าและทักแชทเลย!',
        ctaMessage: 'ทักแชทเลย',
        interests: interestList,
        ageMin: smartTargeting.minAge || 20,
        ageMax: smartTargeting.maxAge || 65,
        productCategory: 'สินค้าแนะนำ',
        confidence: 0.8, // Fallback confidence
        interestGroups: interestGroups,
        adCopyVariations: adCopyVariations,
      };
    }

    // Get Facebook access token from user's account
    const userAccounts = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'facebook',
      },
    });

    if (!userAccounts?.access_token) {
      return NextResponse.json(
        { error: 'Facebook account not connected or access token missing' },
        { status: 401 }
      );
    }

    const accessToken = userAccounts.access_token;

    // Get Ad Account info to retrieve currency
    console.log('Fetching Ad Account info for currency...');
    const accountInfoResponse = await fetch(
      `https://graph.facebook.com/v22.0/act_${adAccountId}?fields=currency,name&access_token=${accessToken}`
    );

    const accountInfo = await accountInfoResponse.json();

    if (!accountInfoResponse.ok || accountInfo.error) {
      console.error('Failed to fetch account info:', accountInfo);
      return NextResponse.json(
        { error: `Failed to fetch account info: ${accountInfo.error?.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    const currency = accountInfo.currency || 'THB';
    console.log('Account currency:', currency);

    // Convert user input to smallest currency unit (cents/satang)
    const userBudget = dailyBudgetInput ? parseFloat(dailyBudgetInput) : null;

    let dailyBudget: number;
    if (userBudget && userBudget > 0) {
      // User provided budget - convert to cents based on currency
      dailyBudget = Math.round(userBudget * 100);
      console.log(`Using user budget: ${userBudget} ${currency} = ${dailyBudget} (smallest unit)`);
    } else {
      // Fallback to default budget based on currency
      const budgetMap: { [key: string]: number } = {
        'THB': 10000,  // 100 THB
        'USD': 500,    // 5 USD
        'EUR': 500,    // 5 EUR
        'GBP': 500,    // 5 GBP
        'PHP': 25000,  // 250 PHP
        'VND': 120000, // 120,000 VND
        'IDR': 75000,  // 75,000 IDR
        'MYR': 2000,   // 20 MYR
        'SGD': 700,    // 7 SGD
      };
      dailyBudget = budgetMap[currency] || 500;
      console.log(`Using default budget: ${dailyBudget} (${currency})`);
    }

    // Process campaign creation with Facebook Ads API
    console.log('Creating campaign on Facebook:', {
      userId: session.user.id,
      adAccountId,
      campaignObjective,
      mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
      pageId,
      structure: `${campaignCount}C / ${adSetCount}AS / ${adsCount}Ads`
    });

    // Step 1: Upload media to Facebook (Moved before Campaign Loop)
    // Get media buffer from storage
    let mediaBuffer: Buffer;
    let fileName: string;

    // Check if mediaPath is absolute path (local storage) or R2 key
    const isAbsolutePath = mediaPath && (path.isAbsolute(mediaPath) || mediaPath.includes(':\\'));

    if (videoFile) {
      // [OPTIMIZATION] Use original file buffer directly if available (avoids R2 download issues)
      console.log('Using original upload file buffer for Facebook upload...');
      const bytes = await videoFile.arrayBuffer();
      mediaBuffer = Buffer.from(bytes);
      fileName = videoFile.name;
    } else if (isAbsolutePath && existsSync(mediaPath)) {
      // Use absolute local file path directly
      console.log('Reading media from local file:', mediaPath);
      mediaBuffer = await fs.readFile(mediaPath);
      fileName = path.basename(mediaPath);
    } else if (mediaUrl.startsWith('http') && !mediaUrl.includes('localhost')) {
      // Download from real R2 URL (not localhost) - Only if videoFile is missing (e.g. existing R2 video)
      console.log('Downloading media from R2:', mediaUrl);
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) {
        return NextResponse.json(
          { error: `Failed to download media from R2 (Status: ${mediaResponse.status})` },
          { status: 500 }
        );
      }
      const arrayBuffer = await mediaResponse.arrayBuffer();
      mediaBuffer = Buffer.from(arrayBuffer);
      fileName = mediaUrl.split('/').pop() || 'media';
    } else {
      // R2 with localhost URL or local storage fallback
      let localPath: string;

      if (mediaPath.includes('uploads')) {
        localPath = path.isAbsolute(mediaPath)
          ? mediaPath
          : path.join(process.cwd(), mediaPath);
      } else {
        localPath = path.join(process.cwd(), 'uploads', mediaPath);
      }

      console.log('Trying local path:', localPath);

      if (existsSync(localPath)) {
        mediaBuffer = await fs.readFile(localPath);
        fileName = path.basename(localPath);
      } else {
        return NextResponse.json(
          { error: `Media file not found. Tried path: ${localPath}` },
          { status: 500 }
        );
      }
    }

    let fbMediaId: string;
    let thumbnailHash: string | undefined;

    if (isVideo) {
      // Upload video - show progress for large files
      const videoSizeMB = mediaBuffer.length / (1024 * 1024);
      console.log(`📤 Uploading video to Facebook (${videoSizeMB.toFixed(2)}MB)...`);
      if (videoSizeMB > 100) {
        console.log(`⏳ Large video detected - this may take several minutes...`);
      }

      const formDataVideo = new FormData();
      formDataVideo.append('file', new Blob([new Uint8Array(mediaBuffer)]), fileName);
      formDataVideo.append('access_token', accessToken);

      const videoUploadResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/advideos`,
        {
          method: 'POST',
          body: formDataVideo,
        }
      );

      const videoUploadData = await videoUploadResponse.json();

      if (!videoUploadResponse.ok || videoUploadData.error) {
        console.error('Video upload to Facebook failed:', videoUploadData);
        return NextResponse.json(
          { error: `Video upload failed: ${videoUploadData.error?.message || 'Unknown error'}` },
          { status: 400 }
        );
      }

      fbMediaId = videoUploadData.id;
      console.log(`✅ Video uploaded successfully to Facebook: ${fbMediaId}`);

      // Create and upload thumbnail for video ad
      let thumbnailBuffer: Buffer;

      if (thumbnailFile) {
        console.log('🖼️ Using custom thumbnail from user...');
        const thumbnailBytes = await thumbnailFile.arrayBuffer();
        thumbnailBuffer = await sharp(Buffer.from(thumbnailBytes))
          .resize(1200, 628, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 90 })
          .toBuffer();
      } else {
        console.log('🎨 Creating auto-generated thumbnail...');
        thumbnailBuffer = await sharp({
          create: {
            width: 1200, height: 628, channels: 4,
            background: { r: 99, g: 102, b: 241, alpha: 1 }
          }
        })
          .composite([{
            input: Buffer.from(`
            <svg width="1200" height="628">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                </linearGradient>
              </defs>
              <rect width="1200" height="628" fill="url(#grad1)"/>
              <text x="600" y="314" font-family="Arial" font-size="72" fill="#ffffff" text-anchor="middle" font-weight="bold">🎬</text>
            </svg>`),
            top: 0, left: 0
          }])
          .jpeg({ quality: 90 })
          .toBuffer();
      }

      const thumbnailFileName = `thumbnail_${Date.now()}.jpg`;
      const formDataThumbnail = new FormData();
      formDataThumbnail.append(thumbnailFileName, new Blob([new Uint8Array(thumbnailBuffer)], { type: 'image/jpeg' }), thumbnailFileName);
      formDataThumbnail.append('access_token', accessToken);

      const thumbnailUploadResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/adimages`,
        { method: 'POST', body: formDataThumbnail }
      );

      const thumbnailUploadData = await thumbnailUploadResponse.json();
      if (thumbnailUploadResponse.ok && thumbnailUploadData.images && Object.keys(thumbnailUploadData.images).length > 0) {
        const thumbnailKey = Object.keys(thumbnailUploadData.images)[0];
        thumbnailHash = thumbnailUploadData.images[thumbnailKey].hash;
        console.log('✓ Thumbnail uploaded to Facebook:', thumbnailHash);
      }
    } else {
      // Upload image
      const formDataImage = new FormData();
      formDataImage.append(fileName, new Blob([new Uint8Array(mediaBuffer)], { type: 'image/jpeg' }), fileName);
      formDataImage.append('access_token', accessToken);

      const imageUploadResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/adimages`,
        { method: 'POST', body: formDataImage }
      );

      const imageUploadData = await imageUploadResponse.json();
      if (!imageUploadResponse.ok || imageUploadData.error) {
        return NextResponse.json(
          { error: `Image upload failed: ${imageUploadData.error?.message}` },
          { status: 400 }
        );
      }
      const imageHash = Object.keys(imageUploadData.images || {})[0];
      if (!imageHash) {
        return NextResponse.json({ error: 'Image upload succeeded but no hash returned' }, { status: 400 });
      }
      fbMediaId = imageUploadData.images[imageHash].hash;
      console.log('✓ Image uploaded to Facebook:', fbMediaId);
    }

    // Step 2: Get verified beneficiary
    let beneficiaryId: string;
    if (beneficiaryName && beneficiaryName.trim() !== '') {
      beneficiaryId = beneficiaryName.trim();
      console.log(`✓ Using beneficiary from form: ${beneficiaryId}`);
    } else {
      const beneficiaryInfo = await getVerifiedBeneficiary(adAccountId, accessToken);
      if (beneficiaryInfo && beneficiaryInfo.id) {
        beneficiaryId = beneficiaryInfo.id;
        console.log(`✓ Found verified beneficiary: ${beneficiaryInfo.name} (ID: ${beneficiaryId})`);
      } else {
        return NextResponse.json(
          { error: 'ไม่พบ Beneficiary ที่ verified - กรุณากรอกชื่อผู้รับผลประโยชน์ใน Step 7' },
          { status: 400 }
        );
      }
    }

    // Prepare loops
    const validCampaignCount = Math.max(1, campaignCount);
    // Calculate split ensuring integers. Use ceil to be safe, though inputs should guarantee divisibility technically.
    // However, if manual override logic in frontend changes, we should be robust.
    // If adSetCount=5 and campaignCount=2, we get 3 and 2? No, let's keep it simple:
    // With current frontend logic, adSetCount is a multiple of campaignCount.
    const adSetsPerCampaign = Math.ceil(adSetCount / validCampaignCount);
    const adsPerCampaign = Math.ceil(adsCount / validCampaignCount); // Total ads per campaign
    const adsPerAdSet = Math.ceil(adsCount / adSetCount);

    console.log(`Structure Calculation:`);
    console.log(`- Campaigns: ${validCampaignCount}`);
    console.log(`- Ad Sets/Campaign: ${adSetsPerCampaign}`);
    console.log(`- Ads/AdSet: ${adsPerAdSet}`);

    const campaignIds: string[] = [];
    const adSetIds: string[] = [];
    const adIds: string[] = [];

    // Step 3: Campaign Loop
    for (let c = 0; c < validCampaignCount; c++) {
      console.log(`\n--- Processing Campaign ${c + 1}/${validCampaignCount} ---`);

      const campaignResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/campaigns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Auto Campaign ${c + 1} - ${new Date().toLocaleDateString('th-TH')}`, // Unique name
            objective: campaignObjective,
            status: 'ACTIVE',
            special_ad_categories: [],
            access_token: accessToken,
          }),
        }
      );

      const campaignData = await campaignResponse.json();
      if (!campaignResponse.ok || campaignData.error) {
        console.error('Campaign creation failed:', campaignData);
        // Continue or break? Break, as subsequent steps depend on it.
        throw new Error(`Facebook Campaign Error: ${campaignData.error?.message}`);
      }

      const campaignId = campaignData.id;
      campaignIds.push(campaignId);
      console.log('✓ Campaign created:', campaignId);

      // Step 4: Ad Sets Loop
      const currentCampaignAdSetIds: string[] = [];

      for (let s = 0; s < adSetsPerCampaign; s++) {
        // Global AdSet Index (for unique naming/interest rotation)
        const globalAdSetIndex = (c * adSetsPerCampaign) + s;

        // Use different interest group
        const interestGroup = aiAnalysis.interestGroups?.[globalAdSetIndex % (aiAnalysis.interestGroups?.length || 1)] || {
          name: 'General',
          interests: aiAnalysis.interests || ['Shopping and Fashion']
        };

        const loopTargeting: any = {
          geo_locations: { countries: ['TH'] },
          age_min: Math.max(Number(aiAnalysis.ageMin) || 20, 20),
          age_max: Number(aiAnalysis.ageMax) || 65,
          publisher_platforms: ['facebook', 'instagram', 'messenger'],
        };

        // Resolve interests
        if (interestGroup.interests && interestGroup.interests.length > 0) {
          const firstInterest = interestGroup.interests[0];
          let interestObjects: any[] = [];
          if (typeof firstInterest === 'string') {
            interestObjects = await getInterestIds(interestGroup.interests as string[], accessToken);
          } else {
            interestObjects = interestGroup.interests;
          }
          if (interestObjects.length > 0) {
            loopTargeting.flexible_spec = [{ interests: interestObjects }];
          }
        }

        const adSetPayload = {
          name: `AdSet ${s + 1} - ${interestGroup.name} - ${new Date().toLocaleDateString('th-TH')}`,
          campaign_id: campaignId,
          optimization_goal: 'CONVERSATIONS',
          billing_event: 'IMPRESSIONS',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          // Budget in smallest currency unit (e.g., cents for USD, satang for THB)
          // Most Thai ad accounts use THB where 1 = 1 satang, so 20 Baht = 2000
          // However, some accounts use whole units. Using direct value for now.
          daily_budget: Math.floor(Number(dailyBudget)),
          status: 'ACTIVE',
          destination_type: 'MESSENGER',
          targeting: loopTargeting,
          promoted_object: { page_id: pageId },
          regional_regulated_categories: ['THAILAND_UNIVERSAL'],
          regional_regulation_identities: {
            universal_beneficiary: beneficiaryId,
            universal_payer: beneficiaryId,
          },
        };

        const adSetResponse = await fetch(
          `https://graph.facebook.com/v22.0/act_${adAccountId}/adsets?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adSetPayload),
          }
        );

        const adSetData = await adSetResponse.json();
        if (!adSetResponse.ok || adSetData.error) {
          console.error(`AdSet creation failed:`, adSetData);
          continue; // Skip faulty adset
        }

        const adSetId = adSetData.id;
        adSetIds.push(adSetId);
        currentCampaignAdSetIds.push(adSetId);
        console.log(`✓ AdSet ${s + 1} created`);

        // Step 5: Ads Loop (Per Ad Set)
        for (let a = 0; a < adsPerAdSet; a++) {
          const globalAdIndex = (c * adsPerCampaign) + (s * adsPerAdSet) + a;

          const adCopyVariation = aiAnalysis.adCopyVariations?.[globalAdIndex % aiAnalysis.adCopyVariations.length] || {
            primaryText: aiAnalysis.primaryText,
            headline: aiAnalysis.headline,
          };

          const creativePayload: any = {
            name: `Creative - Ad ${a + 1} - ${Date.now()}`,
            object_story_spec: { page_id: pageId },
            access_token: accessToken,
          };

          if (isVideo) {
            creativePayload.object_story_spec.video_data = {
              message: adCopyVariation.primaryText,
              title: adCopyVariation.headline,
              video_id: fbMediaId,
              call_to_action: { type: 'MESSAGE_PAGE', value: { link: `https://facebook.com/${pageId}` } },
            };
            if (thumbnailHash) creativePayload.object_story_spec.video_data.image_hash = thumbnailHash;
          } else {
            creativePayload.object_story_spec.link_data = {
              image_hash: fbMediaId,
              message: adCopyVariation.primaryText,
              link: `https://facebook.com/${pageId}`,
              name: adCopyVariation.headline,
              call_to_action: { type: 'MESSAGE_PAGE', value: { link: `https://facebook.com/${pageId}` } },
            };
          }

          const creativeResponse = await fetch(
            `https://graph.facebook.com/v22.0/act_${adAccountId}/adcreatives`,
            { method: 'POST', body: JSON.stringify(creativePayload), headers: { 'Content-Type': 'application/json' } }
          );
          const creativeData = await creativeResponse.json();
          if (creativeData.error) {
            console.error('Creative failed', creativeData);
            continue;
          }

          const adResponse = await fetch(
            `https://graph.facebook.com/v22.0/act_${adAccountId}/ads`,
            {
              method: 'POST',
              body: JSON.stringify({
                name: `Ad ${a + 1} - ${aiAnalysis.productCategory}`,
                adset_id: adSetId,
                creative: { creative_id: creativeData.id },
                status: 'ACTIVE',
                access_token: accessToken
              }),
              headers: { 'Content-Type': 'application/json' }
            }
          );
          const adData = await adResponse.json();
          if (adData.id) {
            adIds.push(adData.id);
            console.log(`✓ Ad ${a + 1} created`);
          }
        }
      }
    }

    console.log('✓ Campaigns setup complete:', {
      campaignIds,
      structure: `${campaignCount}-${adSetCount}-${adsCount}`,
    });

    // Create Messenger Ice Breakers (conversation starters)
    try {
      console.log('🧊 Creating Messenger ice breakers...');
      const iceBreakerResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/facebook/ice-breakers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            pageId,
            accessToken,
            productCategory: aiAnalysis.productCategory,
          }),
        }
      );

      if (iceBreakerResponse.ok) {
        const iceBreakerData = await iceBreakerResponse.json();
        console.log('✓ Ice breakers created:', iceBreakerData.iceBreakers?.length || 0, 'starters');
      } else {
        console.log('⚠ Ice breakers creation skipped (non-critical)');
      }
    } catch (iceBreakerError) {
      console.log('⚠ Ice breakers creation failed (non-critical):', iceBreakerError);
    }

    // Invalidate all caches for this user to ensure fresh data
    await invalidateUserCache(session.user.id);

    return NextResponse.json({
      success: true,
      campaignId: campaignIds[0],
      message: `✅ สร้างแคมเปญสำเร็จ!\n📊 โครงสร้าง: ${campaignCount}-${adSetCount}-${adsCount}\n🎯 ${aiAnalysis.productCategory} | อายุ ${aiAnalysis.ageMin}-${aiAnalysis.ageMax} ปี`,
      fbCampaignId: campaignIds[0],
      structure: {
        campaigns: campaignCount,
        adSets: adSetCount,
        ads: adsCount,
      },
      mediaType: isVideo ? 'video' : 'image',
      aiInsights: {
        category: aiAnalysis.productCategory,
        headline: aiAnalysis.headline,
        primaryText: aiAnalysis.primaryText,
        interests: aiAnalysis.interests,
        ageRange: `${aiAnalysis.ageMin}-${aiAnalysis.ageMax}`,
        confidence: aiAnalysis.confidence,
      },
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
