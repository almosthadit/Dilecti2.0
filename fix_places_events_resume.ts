import { adminDb } from './src/utils/firebaseAdmin.ts';
import { db } from './src/db/index.js';
import { globalItems } from './src/db/schema.js';
import { eq, or } from 'drizzle-orm';
import { getAIClient } from './src/utils/aiClient.ts';
import { generateContentWithRetry } from './src/utils/ai.ts';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function processBatch(batch, ai) {
  const promises = batch.map(async (item) => {
    const data = item.data;
    const isGlobal = item.isGlobal;
    
    // Check if we need to skip? The prompt says to fix them, so we just overwrite.
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

    try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      }, { scope: 'global', ttlDays: 0 });
      
      const textResponse = response.text || "{}";
      const match = textResponse.match(/\{[\s\S]*\}/);
      const cleanJson = match ? match[0] : "{}";
      const newMeta = JSON.parse(cleanJson);
      
      if (isGlobal) {
        const newData = {
          ...data,
          metadata: {
            ...(data.metadata || {}),
            genres: newMeta.genres || [],
            keywords: newMeta.keywords || []
          }
        };
        await db.update(globalItems).set({ data: newData }).where(eq(globalItems.id, item.id));
        console.log(`[Global] Updated ${data.title}`);
      } else {
        await item.docRef.set({
          metadata: {
            ...(data.metadata || {}),
            genres: newMeta.genres || [],
            keywords: newMeta.keywords || []
          }
        }, { merge: true });
        console.log(`[User] Updated ${data.title}`);
      }
    } catch (e) {
      console.error(`Failed ${data.title}:`, e.message);
    }
  });
  await Promise.all(promises);
}

async function main() {
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const ai = getAIClient(apiKey);
  
  const allItems = [];
  
  // 1. Get Global Items
  const global = await db.select().from(globalItems).where(
    or(eq(globalItems.category, 'places'), eq(globalItems.category, 'events'), eq(globalItems.category, 'event'))
  );
  
  for (const row of global) {
    const genres = row.data?.metadata?.genres || row.data?.genres || [];
    if (genres.length === 0 || genres.includes('Drama') || genres.includes('Fiction') || genres.includes('Non-Fiction')) {
      allItems.push({
        id: row.id,
        isGlobal: true,
        data: row.data || {}
      });
    }
  }
  
  // 2. Get User Items
  const users = await adminDb.collection('users').get();
  for (const userDoc of users.docs) {
    const itemsSnap = await adminDb.collection(`users/${userDoc.id}/items`).get();
    for (const itemDoc of itemsSnap.docs) {
      const data = itemDoc.data();
      if (['places', 'events', 'event'].includes(data.category)) {
        const genres = data.metadata?.genres || data.genres || [];
        if (genres.length === 0 || genres.includes('Drama') || genres.includes('Fiction') || genres.includes('Non-Fiction')) {
           allItems.push({
             id: itemDoc.id,
             isGlobal: false,
             docRef: itemDoc.ref,
             data: data
           });
        }
      }
    }
  }
  
  console.log(`Found ${allItems.length} total items left to fix.`);
  
  // Batch size 10 to avoid rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(allItems.length / BATCH_SIZE)}`);
    await processBatch(batch, ai);
    // Sleep a bit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('Done!');
}
main().catch(console.error).finally(() => process.exit(0));
