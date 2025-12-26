
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testAI() {
    console.log("Initializing Genkit...");

    try {
        const ai = genkit({
            plugins: [googleAI()],
            model: 'googleai/gemini-3-pro-preview',
        });

        console.log("Sending prompt to AI...");
        const { text } = await ai.generate('Hello, are you working? Respond with "Yes I am working" if you receive this.');

        console.log("Response:", text);
    } catch (error) {
        console.error("AI Generation Failed:", error);
    }
}

testAI();
