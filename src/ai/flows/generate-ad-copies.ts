'use server';

/**
 * @fileOverview Generates multiple ad copy variations in Thai and English for Facebook Message Ads.
 *
 * - generateAdCopies - A function that generates ad copies.
 * - GenerateAdCopiesInput - The input type for the generateAdCopies function.
 * - GenerateAdCopiesOutput - The return type for the generateAdCopies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAdCopiesInputSchema = z.object({
  videoDescription: z
    .string()
    .describe('Description of the video to be used in the ad.'),
  numberOfAds: z.number().describe('The number of ad copies to generate.'),
});

export type GenerateAdCopiesInput = z.infer<typeof GenerateAdCopiesInputSchema>;

const AdCopySchema = z.object({
  primaryTextTH: z.string().describe('Ad primary text in Thai.'),
  primaryTextEN: z.string().describe('Ad primary text in English.'),
  headlineTH: z.string().optional().describe('Ad headline in Thai.'),
  headlineEN: z.string().optional().describe('Ad headline in English.'),
  ctaMessagePromptTH: z.string().describe('CTA message prompt in Thai.'),
  ctaMessagePromptEN: z.string().describe('CTA message prompt in English.'),
});

const GenerateAdCopiesOutputSchema = z.array(AdCopySchema).describe('Array of generated ad copies.');

export type GenerateAdCopiesOutput = z.infer<typeof GenerateAdCopiesOutputSchema>;

export async function generateAdCopies(input: GenerateAdCopiesInput): Promise<GenerateAdCopiesOutput> {
  return generateAdCopiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdCopiesPrompt',
  input: {schema: GenerateAdCopiesInputSchema},
  output: {schema: GenerateAdCopiesOutputSchema},
  prompt: `You are an expert advertising copywriter specializing in creating engaging ad copy for Facebook Message Ads.

You will generate {{numberOfAds}} variations of ad copy in both Thai and English, based on the following video description:

Video Description: {{{videoDescription}}}

Each ad copy should include:
- primary text (Thai and English)
- optional headline (Thai and English)
- call to action message prompt (Thai and English)

Return a JSON array of ad copies. Make the Thai and English versions say the same thing, just in different languages.

{{#each (range numberOfAds)}}
Ad Copy {{@index}}:
- primary text (Thai): 
- primary text (English):
- headline (Thai):
- headline (English):
- call to action message prompt (Thai):
- call to action message prompt (English):
{{/each}}`,
});

const generateAdCopiesFlow = ai.defineFlow(
  {
    name: 'generateAdCopiesFlow',
    inputSchema: GenerateAdCopiesInputSchema,
    outputSchema: GenerateAdCopiesOutputSchema,
  },
  async input => {
    const numberOfAds = input.numberOfAds;
    //If the number of ads exceeds 5, limit the LLM call to only 5 to save tokens
    if (numberOfAds > 5) {
      input = {...input, numberOfAds: 5};
    }
    const {output} = await prompt(input);
    return output!;
  }
);
