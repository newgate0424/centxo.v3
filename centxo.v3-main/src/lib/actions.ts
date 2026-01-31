'use server';

import { z } from 'zod';

const launchSchema = z.object({
  pageId: z.string(),
  adCount: z.coerce.number().min(1).max(5),
});

export type LaunchCampaignResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
  campaignName?: string;
  campaignId?: string;
};

/**
 * Legacy launch action. Prefer using /create-ads (Automated Ad Creator) which
 * calls the real /api/campaigns/create API.
 * Returns redirectTo: '/create-ads' so callers can redirect users there.
 */
export async function launchCampaign(formData: FormData): Promise<LaunchCampaignResult> {
  const validatedFields = launchSchema.safeParse({
    pageId: formData.get('pageId'),
    adCount: formData.get('adCount'),
  });

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid form data.', redirectTo: '/create-ads' };
  }

  const videoFile = formData.get('videoFile') as File;
  if (!videoFile || videoFile.size === 0) {
    return { success: false, error: 'Video file is required.', redirectTo: '/create-ads' };
  }

  return {
    success: false,
    error: 'Use the Automated Ad Creator for real campaign creation.',
    redirectTo: '/create-ads',
  };
}
