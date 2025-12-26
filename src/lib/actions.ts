'use server';

import { generateAdCopies } from '@/ai/flows/generate-ad-copies';
import { z } from 'zod';

const launchSchema = z.object({
  // videoFile is handled separately as it's a file
  pageId: z.string(),
  adCount: z.coerce.number().min(1).max(5),
});

export async function launchCampaign(formData: FormData) {
  // In a real app, you would have authentication here to get the user
  
  const validatedFields = launchSchema.safeParse({
    pageId: formData.get('pageId'),
    adCount: formData.get('adCount'),
  });

  if (!validatedFields.success) {
    return { success: false, error: "Invalid form data." };
  }
  
  const videoFile = formData.get('videoFile') as File;
  if (!videoFile || videoFile.size === 0) {
    return { success: false, error: "Video file is required." };
  }

  try {
    // 1. Upload video to a temporary storage or directly to Meta
    // This is a placeholder for the actual upload logic
    console.log(`Uploading video: ${videoFile.name}`);
    const videoAssetId = `video_asset_${Date.now()}`;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload time
    console.log(`Video uploaded, asset ID: ${videoAssetId}`);
    
    // 2. Generate Ad Copies using Genkit AI Flow
    console.log(`Generating ${validatedFields.data.adCount} ad copies...`);
    const adCopies = await generateAdCopies({
        // In a real app, you might get this from the video, or another user input
        videoDescription: 'A dynamic and engaging video showcasing our latest product.',
        numberOfAds: validatedFields.data.adCount,
    });
    console.log("Generated ad copies:", adCopies);

    // 3. Create Campaign on Meta
    console.log("Creating campaign on Meta...");
    const campaignName = `AdPilot Campaign - ${new Date().toISOString()}`;
    const metaCampaignId = `campaign_${Date.now()}`;
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Campaign created: ${campaignName} (ID: ${metaCampaignId})`);

    // 4. Create AdSet on Meta
    console.log("Creating AdSet on Meta...");
    const metaAdSetId = `adset_${Date.now()}`;
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`AdSet created: ${metaAdSetId}`);
    
    // 5. Create N Ads on Meta
    console.log(`Creating ${adCopies.length} ads...`);
    for (const copy of adCopies) {
        // Create creative, then create ad
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log(`Created ad with headline: ${copy.headlineEN}`);
    }

    // 6. Save all IDs to your database
    console.log("Saving campaign details to database...");
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return { success: true, campaignName: campaignName, campaignId: metaCampaignId };

  } catch (error) {
    console.error("Launch campaign failed:", error);
    return { success: false, error: "Failed to launch campaign. Please check the logs." };
  }
}
