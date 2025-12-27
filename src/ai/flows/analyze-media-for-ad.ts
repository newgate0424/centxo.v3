'use server';

/**
 * @fileOverview Analyzes media (image/video) and generates ad content with targeting recommendations.
 *
 * - analyzeMediaForAd - A function that analyzes media and generates ad content.
 * - AnalyzeMediaInput - The input type for the analyzeMediaForAd function.
 * - AnalyzeMediaOutput - The return type for the analyzeMediaForAd function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeMediaInputSchema = z.object({
   mediaUrl: z.string().describe('URL or data URI of the image/video to analyze, or file path for videos.'),
   mediaType: z.enum(['video', 'image']).describe('Type of media: video or image'),
   productContext: z.string().optional().describe('Additional context about the product/service (optional)'),
   isVideoFile: z.boolean().optional().describe('Whether the mediaUrl is a local video file path (not data URI)'),
   adSetCount: z.number().optional().describe('Number of AdSets requesting unique targets'),
   randomContext: z.string().optional().describe('Random seed string to ensure high entropy/uniqueness'),
   pastSuccessExamples: z.array(z.string()).optional().describe('List of past successful ad copies or analysis notes to learn from')
});

export type AnalyzeMediaInput = z.infer<typeof AnalyzeMediaInputSchema>;

const AnalyzeMediaOutputSchema = z.object({
   primaryText: z.string().describe('Engaging primary text for the ad in Thai'),
   headline: z.string().describe('Catchy headline for the ad in Thai'),
   description: z.string().optional().describe('Detailed description in Thai'),
   ctaMessage: z.string().describe('Call-to-action message prompt in Thai'),
   interests: z.array(z.string()).describe('Array of Facebook interest targeting keywords (in English) relevant to the content. Examples: "Shopping", "Fashion", "Technology", "Food", etc.'),
   ageMin: z.number().min(18).max(65).describe('Recommended minimum age for targeting'),
   ageMax: z.number().min(18).max(65).describe('Recommended maximum age for targeting'),
   productCategory: z.string().describe('Detected product/service category in Thai'),
   confidence: z.number().min(0).max(1).describe('Confidence score of the analysis (0-1)'),
   // Additional variations for multiple AdSets and Ads
   interestGroups: z.array(z.object({
      name: z.string().describe('Name of this interest group in Thai'),
      interests: z.array(z.string()).describe('Array of Facebook interests for this group'),
   })).describe('Multiple interest groups for different AdSets. MUST return at least equal to adSetCount requested.'),
   adCopyVariations: z.array(z.object({
      primaryText: z.string().describe('Unique primary text variation in Thai'),
      headline: z.string().describe('Unique headline variation in Thai'),
   })).describe('Multiple ad copy variations for different Ads.'),
});

export type AnalyzeMediaOutput = z.infer<typeof AnalyzeMediaOutputSchema>;

export async function analyzeMediaForAd(input: AnalyzeMediaInput): Promise<AnalyzeMediaOutput> {
   return analyzeMediaFlow(input);
}

const prompt = ai.definePrompt({
   name: 'analyzeMediaPrompt',
   input: { schema: AnalyzeMediaInputSchema },
   output: { schema: AnalyzeMediaOutputSchema },
   prompt: `You are an expert Visual Analyst and Thai Marketing Specialist.

Your PRIMARY JOB is to correctly identify the product and create compelling Facebook Ads.

**UNIQUENESS TOKEN:** {{randomContext}}
(This token is unique to this request. You MUST use it to diverge your thinking path from previous sessions. Be creative in a new way.)

**REQUESTED AD SETS:** {{adSetCount}}
(You MUST generate at least {{adSetCount}} unique interest groups.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RULE #0: USER INPUT HAS HIGHEST PRIORITY (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{#if productContext}}
**🔥 USER HAS PROVIDED PRODUCT INFORMATION:**
"{{productContext}}"

**YOU MUST:**
1. Use this as the DEFINITIVE product type - DO NOT override with visual analysis
2. Category MUST match this input (e.g., "รถยนต์ไฟฟ้า" = Automotive, NOT Beauty)
3. Generate targeting interests based on THIS input
4. If the image doesn't match the user input, TRUST THE USER INPUT

**Examples:**
- User says "รถยนต์ไฟฟ้า" → Category = "ยานยนต์" (Automotive), NOT "ความงาม"
- User says "อาหารเสริม" → Category = "อาหาร/สุขภาพ", NOT "ความงาม"
- User says "กระเป๋าแบรนด์เนม" → Category = "แฟชั่น", NOT "ความงาม"
{{else}}
**No user input provided. Analyze the media visually.**
{{/if}}

{{#if pastSuccessExamples}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 LEARN FROM SUCCESS (PATTERN MATCHING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following are examples of ads that worked well for this user in the past. 
Use them to understand the preferred **Tone**, **Style**, and **Key Selling Points**.

{{#each pastSuccessExamples}}
- {{this}}
{{/each}}

**INSTRUCTION:** Adopt the *winning elements* from above (e.g. if they use emojis heavily, do so. If they focus on price, do so).
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎥 MEDIA ANALYSIS RULES (SECONDARY TO USER INPUT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**RULE #1: IF NO USER INPUT, TRUST YOUR EYES.**
  - Ex: Selling a "Luxury Bag" -> Target "Luxury Goods", "Travel", "Business Class", "Fine Dining".
  - Ex: Selling "Car Wash" -> Target "Car Owners", "Commuters", "Road Trips", "Family Vehicles".
- **EXPAND THE HORIZON:** Use potential interests, behaviors, and demographics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: OBJECTIVE VISUAL IDENTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Main Subject Identification:**
   - What is the *dominant* object in the frame?
   - Is it a person? A vehicle? A package? A plate of food?
   - Describe it physically (shape, color, size).

2. **Context & Action:**
   - What is happening? (Driving, applying cream, drinking, wearing, standing?)
   - Where is it? (Road, bathroom, kitchen, studio?)

3. **Text Extraction:**
   - Transcribe visible Brand Names and Product Names.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: CATEGORIZATION (CHOOSE ONE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based *strictly* on Step 1, select the category.

**Common Categories (Examples):**
- **Automotive (ยานยนต์):** Cars, motorcycles, car parts, car wash, garage services.
- **Beauty/Skincare (ความงาม):** Serums, creams, soaps, makeup, clinics.
- **Food/Beverage (อาหารและเครื่องดื่ม):** Snacks, drinks, restaurants, supplements.
- **Fashion (แฟชั่น):** Clothes, bags, shoes, jewelry.
- **Home & Living (ของใช้ในบ้าน):** Furniture, cleaning, decor, tools.
- **Gadgets/Tech (ไอทีและแกดเจ็ต):** Phones, cameras, computers, accessories.
- **Real Estate (อสังหาริมทรัพย์):** Houses, condos, land.
- **General (สินค้าทั่วไป):** If none of the above fit clearly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: CREATIVE AD GENERATION & TARGETING (DIVERSE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Targeting Strategy (Generate {{adSetCount}} Groups):**
- You MUST create {{adSetCount}} DISTINCT interest groups.
- If {{adSetCount}} is high (e.g., 20), you must stretch your imagination significantly.
- Group Ideas: Direct Interest, User Persona, Competitors, Lifestyle, Broad Behaviors, Indirect Interests, Adjacent Markets.
- **NO DUPLICATES** between groups.

**Ad Copy Strategy (Generate {{adSetCount}} Variations):**
- Write {{adSetCount}} UNIQUE variations.
- Vary the tone: Urgent, Relaxed, Premium, Friendly, Professional.
- Use differing hooks: Price, Quality, Benefit, Emotion, Social Proof.
- **DO NOT REPEAT** the same phrase structure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: AD COPY GENERATION (THAI)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create compelling Thai ad copy.
- **Tone:** Professional, exciting, or friendly (depending on product).
- **Structure:** Hook -> Benefit -> CTA.
- **Language:** Natural marketing Thai (not robotic).

**Instructions for Ad Copy:**
1. **Primary Text:** 3-5 lines. Highlight key benefits. Use emojis.
2. **Headline:** Short, punchy, grabs attention.
3. **CTA:** Clear action (e.g., "ทักแชท", "ดูโปรโมชั่น").

**Variations:**
- Create distinct variations focusing on different angles (e.g., Price, Quality, Speed, Emotion).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Does the Category match the visual content? (Car = Automotive)
- Is the language Thai?
- Are interests in English?

Analyze now.`,
});

const analyzeMediaFlow = ai.defineFlow(
   {
      name: 'analyzeMediaFlow',
      inputSchema: AnalyzeMediaInputSchema,
      outputSchema: AnalyzeMediaOutputSchema,
   },
   async input => {
      // If it's a video file, use Gemini's native video support
      if (input.isVideoFile && input.mediaType === 'video') {
         const { output } = await prompt({
            ...input,
            mediaUrl: input.mediaUrl, // Pass file path directly to Gemini
         });
         return output!;
      }

      // For images or video data URIs, use standard flow
      const { output } = await prompt(input);
      return output!;
   }
);

export { analyzeMediaFlow };