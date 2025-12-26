/**
 * AI Copy Generation Service
 * Uses LLM to generate ad copy variations for Thai and English
 */

import { generate } from '@genkit-ai/ai';
// import { gemini15Flash } from '@genkit-ai/google-genai';

interface AdCopyRequest {
  productContext?: string;
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
  numberOfVariations: number;
}

interface AdCopy {
  primaryTextTH: string;
  primaryTextEN: string;
  headlineTH?: string;
  headlineEN?: string;
  ctaMessagePromptTH: string;
  ctaMessagePromptEN: string;
}

const SYSTEM_PROMPT = `You are an expert Facebook Ads copywriter specializing in Messages ads for the Thai market.

Your task is to generate high-converting ad copy that encourages users to send a message to the business.

Guidelines:
1. Primary Text: 125 characters max, compelling and action-oriented
2. Headline: 40 characters max (optional but recommended)
3. CTA Message Prompt: Short greeting that appears when user clicks (20 chars max)
4. Always provide both Thai (TH) and English (EN) versions
5. Thai copy should feel natural, not translated
6. Focus on benefits and urgency
7. Use emojis sparingly but effectively
8. Encourage immediate action through messaging

Response format (JSON):
{
  "copies": [
    {
      "primaryTextTH": "Thai primary text here",
      "primaryTextEN": "English primary text here",
      "headlineTH": "Thai headline",
      "headlineEN": "English headline",
      "ctaMessagePromptTH": "สวัสดีค่ะ สนใจสินค้าใช่ไหมคะ",
      "ctaMessagePromptEN": "Hi! Interested in our product?"
    }
  ]
}`;

/**
 * Generate multiple ad copy variations using AI
 */
export async function generateAdCopies(request: AdCopyRequest): Promise<AdCopy[]> {
  const { productContext = 'general product', tone = 'friendly', numberOfVariations } = request;

  const userPrompt = `Generate ${numberOfVariations} different ad copy variations for a Facebook Messages ad campaign.

Product/Service Context: ${productContext}
Tone: ${tone}
Target Market: Thailand (Thai and English speakers)

Create diverse variations that:
- Test different angles (benefit-focused, urgency, social proof, curiosity)
- Use different emotional triggers
- Vary the messaging approach
- All encourage users to send a message

Return exactly ${numberOfVariations} unique variations in JSON format.`;

  // AI generation temporarily disabled - using fallback copies
  // TODO: Fix genkit integration when API is properly configured
  return generateFallbackCopies(numberOfVariations);
}

/**
 * Fallback copies if AI fails
 */
function generateFallbackCopies(count: number): AdCopy[] {
  const templates: AdCopy[] = [
    {
      primaryTextTH: '🎁 โปรโมชั่นพิเศษ! ส่งข้อความมาสอบถามเลยวันนี้ รับส่วนลดทันที',
      primaryTextEN: '🎁 Special Promotion! Message us today for instant discount',
      headlineTH: 'สอบถามเลย รับส่วนลด',
      headlineEN: 'Ask Now Get Discount',
      ctaMessagePromptTH: 'สวัสดีค่ะ สนใจโปรโมชั่นใช่ไหมคะ',
      ctaMessagePromptEN: 'Hi! Interested in our promo?',
    },
    {
      primaryTextTH: '💬 มีคำถาม? ทีมงานพร้อมตอบทุกข้อสงสัย ส่งข้อความมาได้เลย!',
      primaryTextEN: '💬 Questions? Our team is ready to help. Send us a message!',
      headlineTH: 'สอบถามได้ตลอด 24/7',
      headlineEN: 'Ask Anytime 24/7',
      ctaMessagePromptTH: 'สวัสดีครับ มีอะไรให้ช่วยไหมครับ',
      ctaMessagePromptEN: 'Hello! How can we help?',
    },
    {
      primaryTextTH: '⚡ จำกัดเวลา! ส่งข้อความเลยวันนี้ รับสิทธิพิเศษก่อนใคร',
      primaryTextEN: '⚡ Limited Time! Message today for exclusive benefits',
      headlineTH: 'รีบด่วน! เหลือไม่กี่ที่',
      headlineEN: 'Hurry! Limited Slots',
      ctaMessagePromptTH: 'สวัสดีค่ะ รับสิทธิพิเศษเลยคะ',
      ctaMessagePromptEN: 'Hi! Get your special offer',
    },
    {
      primaryTextTH: '✨ ค้นพบสิ่งที่คุณต้องการ! สอบถามรายละเอียดเพิ่มเติมได้ทาง Messenger',
      primaryTextEN: '✨ Discover what you need! Ask for details via Messenger',
      headlineTH: 'สอบถามฟรี ไม่มีค่าใช้จ่าย',
      headlineEN: 'Free Inquiry No Cost',
      ctaMessagePromptTH: 'สวัสดีค่ะ อยากทราบรายละเอียดคะ',
      ctaMessagePromptEN: 'Hi! Want to know more',
    },
    {
      primaryTextTH: '🔥 ของดีมีจำนวนจำกัด ส่งข้อความมาจองก่อนของหมด!',
      primaryTextEN: '🔥 Limited stock available! Message to reserve before sold out!',
      headlineTH: 'จองเลย ก่อนหมด!',
      headlineEN: 'Reserve Now!',
      ctaMessagePromptTH: 'สวัสดีค่ะ อยากจองเลยคะ',
      ctaMessagePromptEN: 'Hi! I want to reserve',
    },
  ];

  return templates.slice(0, Math.min(count, templates.length));
}

/**
 * Generate a single optimized copy based on winning patterns
 */
export async function generateOptimizedCopy(
  winnerCopies: AdCopy[],
  context: string
): Promise<AdCopy> {
  const userPrompt = `Based on these winning ad copies that performed well:

${JSON.stringify(winnerCopies, null, 2)}

Generate 1 new optimized ad copy that combines the best elements from these winners.
Context: ${context}

The new copy should:
1. Keep the winning patterns and angles
2. Introduce fresh wording to avoid ad fatigue
3. Maintain the successful tone and structure
4. Be even more compelling

Return 1 copy in JSON format.`;

  // AI generation temporarily disabled - using fallback copies
  // TODO: Fix genkit integration when API is properly configured
  return generateFallbackCopies(1)[0];
}

/**
 * Validate ad copy constraints
 */
export function validateAdCopy(copy: AdCopy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check primary text length (max 125 chars)
  if (copy.primaryTextTH.length > 125) {
    errors.push('Thai primary text exceeds 125 characters');
  }
  if (copy.primaryTextEN.length > 125) {
    errors.push('English primary text exceeds 125 characters');
  }

  // Check headline length (max 40 chars)
  if (copy.headlineTH && copy.headlineTH.length > 40) {
    errors.push('Thai headline exceeds 40 characters');
  }
  if (copy.headlineEN && copy.headlineEN.length > 40) {
    errors.push('English headline exceeds 40 characters');
  }

  // Check CTA message prompt length (max 20 chars)
  if (copy.ctaMessagePromptTH.length > 60) {
    errors.push('Thai CTA message prompt exceeds 60 characters');
  }
  if (copy.ctaMessagePromptEN.length > 60) {
    errors.push('English CTA message prompt exceeds 60 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  generateAdCopies,
  generateOptimizedCopy,
  validateAdCopy,
};
