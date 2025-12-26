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
    let fileSizeMB: number | undefined;
    try {
      // Convert media to data URI for AI analysis
      let mediaDataUri = mediaUrl;
      let analysisMediaType: 'video' | 'image' = isVideo ? 'video' : 'image';
      let isVideoFile = false;

      // For local files, optimize before sending to AI
      if (existsSync(mediaPath)) {
        if (isVideo) {
          // For videos: Send actual video file to Gemini for detailed analysis
          const stats = await fs.stat(mediaPath);
          fileSizeMB = stats.size / (1024 * 1024);

          console.log(`📹 Video detected: ${fileSizeMB.toFixed(2)}MB`);
          console.log(`🎬 Sending entire video to AI for deep analysis...`);

          // Send video file path directly to Gemini (it supports video analysis)
          mediaDataUri = mediaPath;
          analysisMediaType = 'video';
          isVideoFile = true;
          console.log(`✅ Video file prepared - AI will analyze entire video content`);
        } else {
          // For images: Optimize before sending
          console.log('🖼️ Image detected: Optimizing for AI analysis...');
          mediaDataUri = await optimizeImageForAI(mediaPath);
        }
      }

      console.log(`🤖 Sending to AI for analysis...`);

      // Add context for AI based on file type or user input
      const userProductContext = formData.get('productContext') as string;
      const productContext = isVideo
        ? (userProductContext ? `${userProductContext}. นี่คือวิดีโอโฆษณาสินค้า...` : `นี่คือวิดีโอโฆษณาสินค้า...`)
        : userProductContext;

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
      console.error('AI Analysis failed, using defaults:', aiError);
      // Fallback to default values with variations
      aiAnalysis = {
        primaryText: '🔥 สินค้าคุณภาพ ราคาดี พร้อมส่งทันที! สนใจทักแชทสอบถามได้เลยครับ 💬',
        headline: '✨ คลิกดูสินค้าและทักแชทเลย!',
        ctaMessage: 'ทักแชทเลย',
        interests: ['Shopping and Fashion', 'Online Shopping'],
        ageMin: 20,
        ageMax: 65,
        productCategory: 'สินค้าทั่วไป',
        confidence: 0.5,
        interestGroups: [
          { name: 'กลุ่มทั่วไป', interests: ['Shopping and Fashion', 'Online Shopping'] },
          { name: 'มนุษย์เงินเดือน', interests: ['Shopping', 'E-commerce'] },
          { name: 'วัยรุ่น', interests: ['Fashion', 'Beauty'] },
        ],
        adCopyVariations: [
          {
            primaryText: '🔥 สินค้าคุณภาพ ราคาดี พร้อมส่งทันที! สนใจทักแชทสอบถามได้เลยครับ 💬',
            headline: '✨ คลิกดูสินค้าและทักแชทเลย!'
          },
          {
            primaryText: '💥 โปรโมชั่นพิเศษวันนี้! ลดราคาสุดคุ้ม ทักแชทเลยครับ 🎉',
            headline: '🎁 โปรโมชั่นพิเศษวันนี้!'
          },
          {
            primaryText: '⭐ ของดีมีคุณภาพ ราคาถูกกว่าใคร สอบถามได้เลยครับ ✨',
            headline: '💎 สินค้าคุณภาพราคาพิเศษ'
          },
          {
            primaryText: '📦 มีของพร้อมส่งทันที! จัดส่งฟรีทั่วไทย ทักมาเลยครับ 🚚',
            headline: '🚀 พร้อมส่ง จัดส่งฟรี!'
          },
          {
            primaryText: '💰 ลดราคาพิเศษ! คุ้มสุดๆ สั่งเลยวันนี้ อย่าพลาดโอกาสดีๆ 🎯',
            headline: '🔥 ลดราคาพิเศษ คุ้มสุดๆ!'
          },
          {
            primaryText: '🌟 สินค้าใหม่มาแล้ว! ดีไซน์สวย คุณภาพดี ทักมาดูเลยครับ 👀',
            headline: '✨ สินค้าใหม่! ต้องดู!'
          },
          {
            primaryText: '🎊 ของขวัญสุดพิเศษ! เหมาะสำหรับคนสำคัญของคุณ ทักแชทเลยครับ 💝',
            headline: '🎁 ของขวัญสุดพิเศษ'
          },
          {
            primaryText: '⚡ สต็อกมีจำกัด! รีบสั่งก่อนของหมด ทักแชทสอบถามเลยครับ 🔥',
            headline: '⚠️ สต็อกมีจำกัด รีบด่วน!'
          },
        ],
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
    });

    // Step 1: Create Campaign
    const campaignResponse = await fetch(
      `https://graph.facebook.com/v22.0/act_${adAccountId}/campaigns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Auto Campaign - ${new Date().toLocaleDateString('th-TH')}`,
          objective: campaignObjective,
          status: 'ACTIVE', // Auto-activate campaign
          special_ad_categories: [],
          access_token: accessToken,
        }),
      }
    );

    const campaignData = await campaignResponse.json();

    if (!campaignResponse.ok || campaignData.error) {
      console.error('Campaign creation failed:', campaignData);
      return NextResponse.json(
        { error: `Facebook API Error: ${campaignData.error?.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    const campaignId = campaignData.id;
    console.log('✓ Campaign created:', campaignId);

    // Step 2: Upload media to Facebook
    // Get media buffer from storage
    let mediaBuffer: Buffer;
    let fileName: string;

    // Check if mediaPath is absolute path (local storage) or R2 key
    const isAbsolutePath = mediaPath && (path.isAbsolute(mediaPath) || mediaPath.includes(':\\'));

    if (isAbsolutePath && existsSync(mediaPath)) {
      // Use absolute local file path directly
      console.log('Reading media from local file:', mediaPath);
      mediaBuffer = await fs.readFile(mediaPath);
      fileName = path.basename(mediaPath);
    } else if (mediaUrl.startsWith('http') && !mediaUrl.includes('localhost')) {
      // Download from real R2 URL (not localhost)
      console.log('Downloading media from R2:', mediaUrl);
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to download media from R2' },
          { status: 500 }
        );
      }
      const arrayBuffer = await mediaResponse.arrayBuffer();
      mediaBuffer = Buffer.from(arrayBuffer);
      fileName = mediaUrl.split('/').pop() || 'media';
    } else {
      // R2 with localhost URL or local storage fallback
      // mediaPath could be:
      // - Absolute path: C:\...\uploads\videos\userId\file.jpg (from uploadToLocal)
      // - Relative path: uploads/videos/userId/file.jpg
      // - R2 key: videos/userId/file.jpg

      let localPath: string;

      if (mediaPath.includes('uploads')) {
        // Already has uploads in path, use it directly or make absolute
        localPath = path.isAbsolute(mediaPath)
          ? mediaPath
          : path.join(process.cwd(), mediaPath);
      } else {
        // R2 key format: videos/userId/file.jpg
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
      // Facebook requires thumbnail for video ads
      let thumbnailBuffer: Buffer;

      if (thumbnailFile) {
        // Use user-uploaded thumbnail
        console.log('🖼️ Using custom thumbnail from user...');
        const thumbnailBytes = await thumbnailFile.arrayBuffer();
        // Optimize and resize thumbnail
        thumbnailBuffer = await sharp(Buffer.from(thumbnailBytes))
          .resize(1200, 628, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 90 })
          .toBuffer();
        console.log('✅ Custom thumbnail optimized');
      } else {
        // Create auto-generated gradient thumbnail
        console.log('🎨 Creating auto-generated thumbnail...');
        thumbnailBuffer = await sharp({
          create: {
            width: 1200,
            height: 628,
            channels: 4,
            background: { r: 99, g: 102, b: 241, alpha: 1 } // indigo-500
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
              <text x="600" y="314" font-family="Arial" font-size="72" fill="#ffffff" text-anchor="middle" font-weight="bold">
                🎬
              </text>
            </svg>
          `),
            top: 0,
            left: 0
          }])
          .jpeg({ quality: 90 })
          .toBuffer();
        console.log('✅ Auto thumbnail created');
      }

      const thumbnailFileName = `thumbnail_${Date.now()}.jpg`;
      const formDataThumbnail = new FormData();
      formDataThumbnail.append(thumbnailFileName, new Blob([new Uint8Array(thumbnailBuffer)], { type: 'image/jpeg' }), thumbnailFileName);
      formDataThumbnail.append('access_token', accessToken);

      const thumbnailUploadResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/adimages`,
        {
          method: 'POST',
          body: formDataThumbnail,
        }
      );

      const thumbnailUploadData = await thumbnailUploadResponse.json();

      if (!thumbnailUploadResponse.ok || thumbnailUploadData.error) {
        console.error('Thumbnail upload failed:', thumbnailUploadData);
        return NextResponse.json(
          { error: `Thumbnail upload failed: ${thumbnailUploadData.error?.message || 'Unknown error'}` },
          { status: 400 }
        );
      }

      const thumbnailKey = Object.keys(thumbnailUploadData.images || {})[0];
      if (thumbnailKey) {
        thumbnailHash = thumbnailUploadData.images[thumbnailKey].hash;
        console.log('✓ Thumbnail uploaded to Facebook:', thumbnailHash);
      }
    } else {
      // Upload image
      const formDataImage = new FormData();
      // Facebook adimages API expects the file with filename as key
      formDataImage.append(fileName, new Blob([new Uint8Array(mediaBuffer)], { type: 'image/jpeg' }), fileName);
      formDataImage.append('access_token', accessToken);

      const imageUploadResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/adimages`,
        {
          method: 'POST',
          body: formDataImage,
        }
      );

      const imageUploadData = await imageUploadResponse.json();

      if (!imageUploadResponse.ok || imageUploadData.error) {
        console.error('Image upload to Facebook failed:', imageUploadData);
        return NextResponse.json(
          { error: `Image upload failed: ${imageUploadData.error?.message || JSON.stringify(imageUploadData)}` },
          { status: 400 }
        );
      }

      // Image upload returns hash in images object
      const imageHash = Object.keys(imageUploadData.images || {})[0];
      if (!imageHash) {
        return NextResponse.json(
          { error: 'Image upload succeeded but no hash returned' },
          { status: 400 }
        );
      }
      fbMediaId = imageUploadData.images[imageHash].hash;
      console.log('✓ Image uploaded to Facebook:', fbMediaId);
    }

    // Step 2.5: Get verified beneficiary for ad transparency
    // Thailand requires beneficiary (person/entity name who verified the business)
    let beneficiaryId: string;

    if (beneficiaryName && beneficiaryName.trim() !== '') {
      // User provided beneficiary - accept both name and numeric ID
      beneficiaryId = beneficiaryName.trim();
      console.log(`✓ Using beneficiary from form: ${beneficiaryId}`);
    } else {
      // Try to fetch from ad account
      const beneficiaryInfo = await getVerifiedBeneficiary(adAccountId, accessToken);
      if (beneficiaryInfo && beneficiaryInfo.id) {
        beneficiaryId = beneficiaryInfo.id;
        console.log(`✓ Found verified beneficiary: ${beneficiaryInfo.name} (ID: ${beneficiaryId})`);
      } else {
        // No beneficiary found and none provided
        return NextResponse.json(
          { error: 'ไม่พบ Beneficiary ที่ verified - กรุณากรอกชื่อผู้รับผลประโยชน์ใน Step 7 (ชื่อที่ยื่น verify ตรงพาสปอร์ต)' },
          { status: 400 }
        );
      }
    }

    // Step 3: Create Ad Set for the page
    // Configured for "Messaging Apps" -> "Maximize number of conversations"
    // Use AI-generated targeting with validation
    const baseTargeting: any = {
      geo_locations: { countries: ['TH'] },
      age_min: Math.max(Number(aiAnalysis.ageMin) || 20, 20), // Enforce minimum 20 for Thailand
      age_max: Number(aiAnalysis.ageMax) || 65,
      publisher_platforms: ['facebook', 'instagram', 'messenger'],
    };

    const adSetPayload: any = {
      name: `AdSet - ${aiAnalysis.productCategory} - ${new Date().toLocaleDateString('th-TH')}`,
      campaign_id: campaignId,
      optimization_goal: 'CONVERSATIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      daily_budget: Number(dailyBudget),
      status: 'ACTIVE',
      destination_type: 'MESSENGER',
      targeting: baseTargeting,
      promoted_object: { page_id: pageId },
      // Thailand transparency requirements
      regional_regulated_categories: ['THAILAND_UNIVERSAL'],
      regional_regulation_identities: {
        universal_beneficiary: beneficiaryId, // Page ID as numeric identifier
        universal_payer: beneficiaryId, // Page ID as numeric identifier
      },
    };


    // Step 3: Create multiple AdSets with different interest targeting
    const adSetIds: string[] = [];
    for (let i = 0; i < adSetCount; i++) {
      // Use different interest group for each AdSet with validation
      const interestGroup = aiAnalysis.interestGroups?.[i % (aiAnalysis.interestGroups?.length || 1)] || {
        name: 'General',
        interests: aiAnalysis.interests || ['Shopping and Fashion', 'Online Shopping']
      };

      // Build targeting object without undefined values
      const loopTargeting: any = {
        geo_locations: { countries: ['TH'] },
        age_min: Math.max(Number(aiAnalysis.ageMin) || 20, 20), // Enforce minimum 20 for Thailand
        age_max: Number(aiAnalysis.ageMax) || 65,
        publisher_platforms: ['facebook', 'instagram', 'messenger'],
      };

      // Convert interest names to IDs using Facebook Targeting Search API
      if (interestGroup.interests && interestGroup.interests.length > 0) {
        console.log(`🔍 Searching interest IDs for AdSet ${i + 1}:`, interestGroup.interests);
        const interestObjects = await getInterestIds(interestGroup.interests, accessToken);

        if (interestObjects.length > 0) {
          loopTargeting.flexible_spec = [
            {
              interests: interestObjects,
            },
          ];
          console.log(`✓ Using ${interestObjects.length} interests with IDs for AdSet ${i + 1}`);
        } else {
          console.warn(`⚠ No valid interest IDs found for AdSet ${i + 1}, proceeding without targeting`);
        }
      }

      const adSetPayloadForLoop = {
        name: `${adSetPayload.name} - ${interestGroup.name} #${i + 1}`,
        campaign_id: adSetPayload.campaign_id,
        optimization_goal: adSetPayload.optimization_goal,
        billing_event: adSetPayload.billing_event,
        bid_strategy: adSetPayload.bid_strategy,
        daily_budget: Number(adSetPayload.daily_budget),
        status: adSetPayload.status,
        destination_type: adSetPayload.destination_type,
        targeting: loopTargeting,
        promoted_object: adSetPayload.promoted_object,
        // Thailand transparency requirements
        regional_regulated_categories: ['THAILAND_UNIVERSAL'],
        regional_regulation_identities: {
          universal_beneficiary: beneficiaryId, // Page ID as numeric identifier
          universal_payer: beneficiaryId, // Page ID as numeric identifier
        },
      };

      // Validate required fields before sending
      console.log('Creating AdSet with payload:', {
        name: adSetPayloadForLoop.name,
        campaign_id: adSetPayloadForLoop.campaign_id,
        daily_budget: adSetPayloadForLoop.daily_budget,
        age_min: adSetPayloadForLoop.targeting.age_min,
        age_max: adSetPayloadForLoop.targeting.age_max,
        fullPayload: JSON.stringify(adSetPayloadForLoop, null, 2),
      });

      const adSetResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/adsets?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adSetPayloadForLoop),
        }
      );

      const adSetData = await adSetResponse.json();

      if (!adSetResponse.ok || adSetData.error) {
        console.error(`AdSet ${i + 1} creation failed:`, JSON.stringify(adSetData, null, 2));
        console.error('Full payload that failed:', JSON.stringify(adSetPayloadForLoop, null, 2));
        return NextResponse.json(
          { error: `AdSet ${i + 1} creation failed: ${adSetData.error?.message || ''}\nDetails: ${JSON.stringify(adSetData.error?.error_user_msg || adSetData.error?.error_user_title || {})}` },
          { status: 400 }
        );
      }

      adSetIds.push(adSetData.id);
      console.log(`✓ AdSet ${i + 1} (${interestGroup.name}) created with interests:`, interestGroup.interests);
    }

    // Step 4: Create multiple Ads with different copy variations (distributed across AdSets)
    const adIds: string[] = [];
    const adsPerAdSet = Math.ceil(adsCount / adSetCount);

    for (let i = 0; i < adsCount; i++) {
      // Determine which AdSet this ad belongs to
      const adSetIndex = Math.floor(i / adsPerAdSet);
      const adSetId = adSetIds[Math.min(adSetIndex, adSetIds.length - 1)];

      // Use different ad copy variation for each ad
      const adCopyVariation = aiAnalysis.adCopyVariations?.[i % aiAnalysis.adCopyVariations.length] || {
        primaryText: aiAnalysis.primaryText,
        headline: aiAnalysis.headline,
      };

      // Create ad creative based on media type with AI-generated content
      const creativePayload: any = {
        name: `Creative - ${aiAnalysis.productCategory} - Ad ${i + 1} - ${Date.now()}`,
        object_story_spec: {
          page_id: pageId,
        },
        access_token: accessToken,
      };

      if (isVideo) {
        // Video creative - Meta API requires video_data (not link_data) for videos
        creativePayload.object_story_spec.video_data = {
          message: adCopyVariation.primaryText, // AI-generated primary text
          title: adCopyVariation.headline, // AI-generated headline
          video_id: fbMediaId,
          call_to_action: {
            type: 'MESSAGE_PAGE',
            value: {
              link: `https://facebook.com/${pageId}`,
            },
          },
        };

        // Add thumbnail if available
        if (thumbnailHash) {
          creativePayload.object_story_spec.video_data.image_hash = thumbnailHash;
        }
      } else {
        // Image creative - link_data works fine for images
        creativePayload.object_story_spec.link_data = {
          image_hash: fbMediaId,
          message: adCopyVariation.primaryText, // AI-generated primary text variation
          link: `https://facebook.com/${pageId}`,
          name: adCopyVariation.headline, // AI-generated headline variation (Required for link_data)
          call_to_action: {
            type: 'MESSAGE_PAGE',
            value: {
              link: `https://facebook.com/${pageId}`,
            },
          },
        };
      }

      const creativeResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/adcreatives`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creativePayload),
        }
      );

      const creativeData = await creativeResponse.json();

      if (!creativeResponse.ok || creativeData.error) {
        console.error(`Creative ${i + 1} creation failed:`, JSON.stringify(creativeData, null, 2));
        return NextResponse.json(
          { error: `Creative ${i + 1} creation failed: ${creativeData.error?.message || ''}\nDetails: ${JSON.stringify(creativeData.error?.error_user_msg || creativeData.error?.error_user_title || {})}` },
          { status: 400 }
        );
      }

      console.log(`✓ Creative ${i + 1} created:`, creativeData.id);

      // Create ad
      const adResponse = await fetch(
        `https://graph.facebook.com/v22.0/act_${adAccountId}/ads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Ad ${i + 1} - ${aiAnalysis.productCategory} - ${Date.now()}`,
            adset_id: adSetId,
            creative: { creative_id: creativeData.id },
            status: 'ACTIVE', // Auto-activate ad
            access_token: accessToken,
          }),
        }
      );

      const adData = await adResponse.json();

      if (!adResponse.ok || adData.error) {
        console.error(`Ad ${i + 1} creation failed:`, adData);
        return NextResponse.json(
          { error: `Ad ${i + 1} creation failed: ${adData.error?.message || 'Unknown error'}` },
          { status: 400 }
        );
      }

      adIds.push(adData.id);
      console.log(`✓ Ad ${i + 1} created in AdSet ${adSetIndex + 1} with copy:`, {
        headline: adCopyVariation.headline,
        primaryText: adCopyVariation.primaryText.substring(0, 50) + '...',
      });
    }

    console.log('✓ Campaign setup complete:', {
      campaignId,
      structure: `${campaignCount}-${adSetCount}-${adsCount}`,
      adSetIds,
      adIds,
      mediaType: isVideo ? 'video' : 'image',
      aiAnalysis: {
        category: aiAnalysis.productCategory,
        interests: aiAnalysis.interests,
        ageRange: `${aiAnalysis.ageMin}-${aiAnalysis.ageMax}`,
      },
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
      campaignId: campaignId,
      message: `✅ สร้างแคมเปญสำเร็จ!\n📊 โครงสร้าง: ${campaignCount}-${adSetCount}-${adsCount}\n🎯 ${aiAnalysis.productCategory} | อายุ ${aiAnalysis.ageMin}-${aiAnalysis.ageMax} ปี`,
      fbCampaignId: campaignId,
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
