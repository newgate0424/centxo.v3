
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error('❌ No API KEY found in environment variables!');
        return;
    }

    console.log('🔑 Using API Key starting with:', apiKey.substring(0, 8) + '...');

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // List available models to see what we CAN use
        // Note: The high-level SDK doesn't expose listModels directly on the main class easily in some versions,
        // but we can try to use the model manager if available, or just fetch via REST if needed.
        // Actually, checking documentation, it's not straightforward in the helper.
        // Let's rely on a known safe model: 'gemini-2.0-flash-001'

        console.log('--- Testing model: gemini-2.0-flash-001 ---');
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
        const resultFlash = await modelFlash.generateContent("Hello via gemini-2.0-flash-001");
        console.log('✅ gemini-2.0-flash-001 Success:', resultFlash.response.text());

    } catch (error) {
        console.error('❌ Standard SDK Failed:', error);

        // Fallback: Try to list models via REST fetch to see what is going on
        try {
            console.log('--- Attempting to LIST MODELS via REST ---');
            const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResp.json();
            if (listData.models) {
                console.log('📋 Available Models:', listData.models.map((m: any) => m.name));
            } else {
                console.log('⚠️ No models returned or error:', listData);
            }
        } catch (fetchErr) {
            console.error('REST List Models Failed:', fetchErr);
        }
    }
}

listModels();
