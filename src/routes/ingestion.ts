import express from "express";
import { getEmbedding } from "../utils/embeddings";
import { GoogleGenAI } from "@google/genai";
import { getAIClient } from "../utils/aiClient";
import { generateContentWithRetry } from "../utils/ai";

export const ingestionRouter = express.Router();

ingestionRouter.post("/api/ingest-item", async (req, res) => {
  try {
    const { item } = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ error: "Missing item" });
    }

    // 1. Generate text representation for embedding
    const title = item.title || "";
    const subtitle = item.subtitle || "";
    const description = item.description || "";
    const category = item.category || "";
    const combinedText = `${title} ${subtitle} ${description} ${category}`.trim();

    // 2. Compute Embedding locally
    const embedding = await getEmbedding(combinedText);

    // 3. Extract lightweight themes and metadata
    let themes: string[] = [];
    let genres: string[] = [];
    let runtime: number | null = null;
    let pages: number | null = null;
    const apiKey = process.env.GEMINI_API_KEY;
    
    const prompt = `Extract up to 5 lightweight themes (e.g. "cyberpunk", "minimalism", "cozy", "gothic", "adventure") and up to 3 genres for the ${category} "${title}" ${subtitle ? `by ${subtitle}` : ""}. 
Avoid overly generic tags like "history" or "culture" for places unless it is the single most defining characteristic.
For food/restaurants, avoid "dining" on its own; prefer specific cuisines or atmospheres (e.g. "fine dining", "street food", "casual").
For games, avoid tagging board games or card games as "non-fiction" or generic terms; use specific game mechanics.
For places, avoid tagging them as "non-fiction", "fiction", or "documentary". Use specific travel or cultural themes.
For music/songs, provide accurate musical genres (e.g., "Pop", "Rock", "Hip Hop", "Jazz", "Electronic", "R&B", "Country").
Also, estimate the 'runtime' in minutes if it is a movie or TV show, or 'pages' if it's a book. 
Return strictly as a JSON object with format: { "themes": ["theme1", "theme2"], "genres": ["genre1", "genre2"], "runtime": 120, "pages": 300 }. If not applicable, set to null. No markdown blocks.`;
    
    try {
      if (!apiKey) throw new Error("No Gemini API key");
      const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const textResponse = response.text || "{}";
      const match = textResponse.match(/\{[\s\S]*\}/);
      const cleanJson = match ? match[0] : "{}";
      const parsed = JSON.parse(cleanJson);
      themes = parsed.themes || [];
      genres = parsed.genres || [];
      runtime = parsed.runtime || null;
      pages = parsed.pages || null;
    } catch (e: any) {
      console.warn("Failed to extract themes via Gemini, falling back to Groq.", e?.message);
      try {
        const { fetchGroqFallback } = await import("../utils/groqFallback");
        const textResponse = await fetchGroqFallback(prompt, false);
        const match = textResponse.match(/\{[\s\S]*\}/);
        const cleanJson = match ? match[0] : "{}";
        const parsed = JSON.parse(cleanJson);
        themes = parsed.themes || [];
        genres = parsed.genres || [];
        runtime = parsed.runtime || null;
        pages = parsed.pages || null;
      } catch (groqErr: any) {
          console.warn("Failed to extract themes via Groq", groqErr?.message);
      }
    }

    // Return the data so the client can save it
    res.json({ success: true, embedding, themes, genres, runtime, pages });
  } catch(e: any) {
    console.warn("Ingestion error (rate limits likely):", e?.message);
    res.status(500).json({ error: e.message });
  }
});

ingestionRouter.post("/api/generate-embeddings-batch", async (req, res) => {
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: "Missing texts array" });
    }

    const embeddings = [];
    for (const text of texts) {
      const e = await getEmbedding(text);
      embeddings.push(e);
    }

    res.json({ success: true, embeddings });
  } catch (e: any) {
    console.error("Batch embedding error:", e);
    res.status(500).json({ error: e.message });
  }
});


ingestionRouter.post("/api/ingest-seeds", async (req, res) => {
  const fs = await import("fs");
  const path = await import("path");
  const { adminDb } = await import("../utils/firebaseAdmin");

  try {
    const seedDir = path.join(process.cwd(), 'dilecti_seed_pack');
    const files = fs.readdirSync(seedDir).filter((f: string) => f.endsWith('.json') && !f.includes('manifest') && f !== "all_dilecti_seed_items.json");
    console.log(`Found ${files.length} seed files.`);
    let totalImported = 0;

    // To prevent timeout, we might run this asynchronously and return immediately.
    res.json({ message: "Started", files: files.length });

    for (const file of files) {
      console.log(`Processing ${file}...`);
      const content = fs.readFileSync(path.join(seedDir, file), 'utf-8');
      let items;
      try {
          items = JSON.parse(content);
      } catch(e) {
          continue;
      }
      if (!Array.isArray(items)) {
         if (items.items && Array.isArray(items.items)) {
             items = items.items;
         } else {
             items = [items];
         }
      }
      const batch = adminDb.batch();
      let batchCount = 0;
      for (const item of items) {
        if (!item.id) continue;
        const docRef = adminDb.collection('items').doc(item.id);
        batch.set(docRef, item, { merge: true });
        batchCount++;
        totalImported++;
        if (batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      }
      if (batchCount > 0) {
        await batch.commit();
      }
      console.log(`Finished ${file}.`);
    }
    console.log(`Done! Total items imported: ${totalImported}`);
  } catch(e: any) {
    console.error(e);
  }
});

ingestionRouter.get("/api/test-db-write", async (req, res) => {
  const { adminDb } = await import("../utils/firebaseAdmin");
  try {
    await adminDb.collection('items').doc('test').set({ name: 'test' });
    res.json({ success: true });
  } catch (e: any) {
    res.json({ success: false, error: e.message, code: e.code });
  }
});

ingestionRouter.post("/api/import-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing url" });

    // HTML Parsing Fallback: standard DOM parsing first
    const cheerio = await import("cheerio");
    let title = "";
    let description = "";
    let coverUrl = "";
    let html = "";
    
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DilectiBot/1.0)' }
      });
      html = await response.text();
      const $ = cheerio.load(html);
      
      // OpenGraph tags
      title = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
      description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";
      coverUrl = $('meta[property="og:image"]').attr('content') || "";
      
    } catch (e) {
      console.warn("Failed to fetch/parse HTML", e);
    }
    
    // Fallback to Gemini if messy data (e.g., if title/description are generic or missing)
    if (!title || title.includes("Access Denied") || title.includes("Just a moment")) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const { getAIClient } = await import("../utils/aiClient");
        const { generateContentWithRetry } = await import("../utils/ai");
        const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);
        const prompt = `Extract metadata for the url: ${url}. Return strictly JSON: { "title": "string", "description": "string", "coverUrl": "string", "category": "other" }`;
        try {
          const resp = await generateContentWithRetry(ai, {
            model: "gemini-2.5-flash",
            contents: prompt,
          });
          const text = resp.text || "{}";
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            title = parsed.title || title;
            description = parsed.description || description;
            coverUrl = parsed.coverUrl || coverUrl;
          }
        } catch(e) {
          console.warn("Gemini fallback failed", e);
        }
      }
    }

    if (!title) {
        title = url.split("/").pop() || "Unknown Link";
    }

    res.json([{
      title,
      description,
      coverUrl,
      category: "other",
      url,
      tags: [],
    }]);

  } catch(e: any) {
    console.error("Import error:", e);
    res.status(500).json({ error: e.message });
  }
});
