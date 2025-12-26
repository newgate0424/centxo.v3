
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { analyzeMediaForAd } from './src/ai/flows/analyze-media-for-ad';
import { ai } from './src/ai/genkit';

const DUMMY_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==";

async function testAI() {
    console.log('🧪 Testing AI functionality...');

    try {
        console.log('Sending dummy image (1x1 red pixel) to AI...');
        const result = await analyzeMediaForAd({
            mediaUrl: DUMMY_IMAGE_BASE64,
            mediaType: 'image',
            productContext: 'Test input'
        });

        console.log('✅ AI Response:', JSON.stringify(result, null, 2));

        if (result.productCategory.includes('สินค้าทั่วไป') || result.productCategory.includes('General')) {
            console.log('👍 Result seems neutral/correct for dummy input.');
        } else {
            console.log('⚠️ Result is suspicious/specific for dummy input!');
        }

    } catch (error) {
        console.error('❌ AI Failed:', error);
    }
}

testAI();
