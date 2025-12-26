'use server';

/**
 * @fileOverview A flow to automate ad optimization with AI suggestions.
 *
 * - automateAdOptimization - A function that orchestrates the ad optimization process.
 * - AdOptimizationInput - The input type for the automateAdOptimization function.
 * - AdOptimizationOutput - The return type for the automateAdOptimization function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdPerformanceDataSchema = z.object({
  adId: z.string().describe('The ID of the ad.'),
  spend: z.number().describe('The amount spent on the ad.'),
  messages: z.number().describe('The number of messages received from the ad.'),
  costPerMessage: z.number().describe('The cost per message for the ad.'),
  audience: z.string().optional().describe('The audience targeting used for this ad (e.g., "Broad", "Interests: Tech").'),
});

const AdOptimizationInputSchema = z.object({
  campaignId: z.string().describe('The ID of the campaign.'),
  adPerformanceData: z
    .array(AdPerformanceDataSchema)
    .describe('Performance data for each ad in the campaign.'),
  medianCostPerMessage: z.number().describe('Median cost per message for all ads in the campaign'),
  xSpendThreshold: z.number().describe('The spend threshold for pausing ads'),
  costPerMessageMultiplier: z.number().default(1.5).describe('Multiplier for cost per message threshold (default: 1.5)'),
  minMessagesForWinner: z.number().default(3).describe('Minimum messages to consider an ad a winner (default: 3)'),
});

export type AdOptimizationInput = z.infer<typeof AdOptimizationInputSchema>;

const AdOptimizationOutputSchema = z.object({
  adsToPause: z.array(z.string()).describe('The IDs of the ads to pause.'),
  winningAds: z.array(z.string()).describe('The IDs of the winning ads.'),
  aiSuggestions: z
    .string()
    .describe(
      'AI suggestions for optimizing ad performance, including changes to rules, bid strategies, or audiences.'
    ),
  decisionLog: z.array(z.string()).describe('Log of decisions made during the optimization process.'),
});

export type AdOptimizationOutput = z.infer<typeof AdOptimizationOutputSchema>;

export async function automateAdOptimization(input: AdOptimizationInput): Promise<AdOptimizationOutput> {
  return automateAdOptimizationFlow(input);
}

const adOptimizationPrompt = ai.definePrompt({
  name: 'adOptimizationPrompt',
  input: { schema: AdOptimizationInputSchema },
  output: { schema: AdOptimizationOutputSchema },
  prompt: `You are an AI-powered ad optimization expert.

You will analyze the performance data of ads in a Facebook campaign and identify underperforming ads based on predefined rules, such as cost per message and spend thresholds. You will also suggest actions for optimizing ad performance, including changes to rules, bid strategies, or audiences.

The following is performance data for each ad in the campaign (including audience targeting if available):

Ad Performance Data: {{JSON.stringify adPerformanceData}}

Median cost per message: {{medianCostPerMessage}}
Spend threshold for pausing ads: {{xSpendThreshold}}
Multiplier for cost/message: {{costPerMessageMultiplier}}
Min messages for winner: {{minMessagesForWinner}}

Pause ad if spend is greater than or equal to X and messages are 0.
Pause ad if cost/message is greater than median(cost/message) * {{costPerMessageMultiplier}}.
Mark winners: messages >= {{minMessagesForWinner}} and cost/message below average.

Based on this data, please provide the following:

- adsToPause: An array of ad IDs that should be paused based on the rules described above.
- winningAds: An array of ad IDs that are considered winning ads based on the rules described above.
- aiSuggestions: AI suggestions for optimizing ad performance, including changes to rules, bid strategies, or audiences. Always suggest something.
- decisionLog: A log of decisions made during the optimization process.

Ensure the output is valid JSON.`,
});

const automateAdOptimizationFlow = ai.defineFlow(
  {
    name: 'automateAdOptimizationFlow',
    inputSchema: AdOptimizationInputSchema,
    outputSchema: AdOptimizationOutputSchema,
  },
  async input => {
    const adsToPause: string[] = [];
    const winningAds: string[] = [];
    const decisionLog: string[] = [];

    // Apply defaults if somehow not applied by schema (zod defaults apply on parse usually)
    const multiplier = input.costPerMessageMultiplier ?? 1.5;
    const minMessages = input.minMessagesForWinner ?? 3;

    input.adPerformanceData.forEach(ad => {
      if (ad.spend >= input.xSpendThreshold && ad.messages === 0) {
        adsToPause.push(ad.adId);
        decisionLog.push(`Ad ${ad.adId} paused due to spend >= ${input.xSpendThreshold} and 0 messages.`);
      }

      if (ad.costPerMessage > input.medianCostPerMessage * multiplier) {
        adsToPause.push(ad.adId);
        decisionLog.push(
          `Ad ${ad.adId} paused due to cost per message (${ad.costPerMessage}) > median * ${multiplier} (${input.medianCostPerMessage * multiplier}).`
        );
      }

      if (ad.messages >= minMessages && ad.costPerMessage < input.medianCostPerMessage) {
        winningAds.push(ad.adId);
        decisionLog.push(
          `Ad ${ad.adId} marked as a winner due to messages >= ${minMessages} and cost per message < average.`
        );
      }
    });

    const { output } = await adOptimizationPrompt({
      ...input,
      adPerformanceData: input.adPerformanceData,
    });

    // Ensure that the LLM generated suggestions are always included in the output, even if rules were enough.
    return {
      adsToPause: adsToPause,
      winningAds: winningAds,
      aiSuggestions: output?.aiSuggestions ?? 'No suggestions provided.',
      decisionLog: [...decisionLog, ...(output?.decisionLog ?? [])],
    };
  }
);
