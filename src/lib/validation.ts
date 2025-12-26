/**
 * Input Validation Schemas
 * Zod schemas for validating API request inputs
 */

import { z } from 'zod';

// Launch Campaign Schema
export const launchCampaignSchema = z.object({
    videoPath: z.string().min(1, 'Video path is required'),
    pageId: z.string().min(1, 'Page ID is required'),
    numberOfAds: z.number().int().min(1, 'At least 1 ad required').max(10, 'Maximum 10 ads allowed'),
    campaignName: z.string().optional(),
    dailyBudget: z.number().min(1, 'Daily budget must be at least $1').max(1000, 'Daily budget cannot exceed $1000').default(20),
    productContext: z.string().optional(),
});

// Update Campaign Status Schema
export const updateCampaignStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED'], {
        errorMap: () => ({ message: 'Status must be ACTIVE, PAUSED, or ARCHIVED' }),
    }),
});

// Update Ad Status Schema
export const updateAdStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED'], {
        errorMap: () => ({ message: 'Status must be ACTIVE, PAUSED, or ARCHIVED' }),
    }),
});

// Meta Account Selection Schema
export const metaAccountSelectionSchema = z.object({
    adAccountId: z.string().min(1, 'Ad account ID is required'),
    adAccountName: z.string().min(1, 'Ad account name is required'),
    pageId: z.string().min(1, 'Page ID is required'),
    pageName: z.string().min(1, 'Page name is required'),
});

// Query Parameters Schema
export const campaignsQuerySchema = z.object({
    adAccountId: z.string().min(1, 'Ad account ID is required'),
});

// Ad Account Details Query Schema
export const adAccountDetailsQuerySchema = z.object({
    adAccountId: z.string().min(1, 'Ad account ID is required'),
});

/**
 * Helper function to validate request body
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateRequestBody<T>(schema: z.ZodSchema<T>, data: unknown) {
    return schema.safeParse(data);
}

/**
 * Helper function to validate query parameters
 * @param schema - Zod schema to validate against
 * @param searchParams - URLSearchParams object
 * @returns Validation result
 */
export function validateQueryParams<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams) {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return schema.safeParse(params);
}
