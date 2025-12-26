
import fs from 'fs';
import path from 'path';

async function listModels() {
    try {
        // Read .env.local manually to avoid dotenv dependency issues
        const envPath = path.join(process.cwd(), '.env.local');
        let apiKey = '';

        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(/GOOGLE_GENAI_API_KEY=(.*)/) || content.match(/GOOGLE_API_KEY=(.*)/);
            if (match) {
                apiKey = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
            }
        }

        if (!apiKey) {
            console.error("No API KEY found in .env.local");
            return;
        }

        console.log("Using API Key starting with:", apiKey.substring(0, 5) + "...");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();

        if (data.models) {
            console.log("\n✅ Available Models:");
            data.models.forEach(m => {
                // Filter for gemini models
                if (m.name.includes("gemini")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("Error listing models:", data);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
