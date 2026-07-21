import { adminDb } from './src/utils/firebaseAdmin.ts';
import { getAIClient } from './src/utils/aiClient.ts';
import { generateContentWithRetry } from './src/utils/ai.ts';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function main() {
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const ai = getAIClient(apiKey);
  
  const users = await adminDb.collection('users').get();
  
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).where('category', 'in', ['places', 'events', 'event']).get();
    
    for (const itemDoc of itemsSnap.docs) {
      const data = itemDoc.data();
      const meta = data.metadata || {};
      const genres = meta.genres || [];
      const keywords = meta.keywords || [];
      
      const systemPrompt = `You are a cultural data enrichment engine. Extract meaningful metadata for this ${data.category}.
Title: ${data.title}
Subtitle/Creator: ${data.subtitle || ''}

Return a STRICT JSON object with these exactly 2 arrays:
- "genres": (MAX 5 strings). High-level genres/categories. 
  IMPORTANT STRICT RULES:
  - For "places", DO NOT use book/movie genres like "Non-Fiction", "Fiction", "Drama", or "Romance". Instead use geographic or architectural types (e.g., "National Park", "Museum", "City", "Landmark", "Outdoors", "Travel", "Nature").
  - For "events", DO NOT use "Non-Fiction" or "Drama". Instead use event types (e.g., "Sports Event", "Music Festival", "Live Performance", "Conference", "Comedy Show").
- "keywords": (MAX 10 strings). For places, use descriptive travel vibes or aesthetics (e.g., "Tropical", "Historical Architecture", "Wilderness"). For events, use atmosphere or cultural impact (e.g., "High-energy", "Tailgating", "Acoustic").

Only return the raw JSON object. Do not wrap in markdown blocks.`;

      console.log(`Processing: ${data.title} (${data.category})`);
      
      try {
        const response = await generateContentWithRetry(ai, {
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        }, { scope: 'global', ttlDays: 0 });
        
        const textResponse = response.text || "{}";
        const match = textResponse.match(/\{[\s\S]*\}/);
        const cleanJson = match ? match[0] : "{}";
        const newMeta = JSON.parse(cleanJson);
        
        console.log(`  -> New genres: ${newMeta.genres}`);
        console.log(`  -> New keywords: ${newMeta.keywords}`);
        
        await itemDoc.ref.set({
          metadata: {
            ...meta,
            genres: newMeta.genres || [],
            keywords: newMeta.keywords || []
          }
        }, { merge: true });
      } catch (e) {
        console.error(`Failed to process ${data.title}:`, e);
      }
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
