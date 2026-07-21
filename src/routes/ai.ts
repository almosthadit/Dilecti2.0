import { db } from "../db";
import { globalItems, userItems } from "../db/schema";
import { sql, eq } from "drizzle-orm";
import express from "express";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRetry, fetchImageFor, buildQuantitativeTasteStats, buildTasteSignals, buildCuratedTasteEvidence } from "../utils/ai";
import { getEmbedding, cosineSimilarity } from "../utils/embeddings";
import { adminDb } from "../utils/firebaseAdmin";
import { getCachedResponse, setCachedResponse } from "../utils/llmCache";

import { globalSystemStats } from "../utils/stats";
import { fetchGroqFallback } from "../utils/groqFallback";
import { getAIClient } from "../utils/aiClient";

import { generateFingerprint, getCachedRecommendations, setCachedRecommendations, buildUserTasteSummary } from "../services/recommendationCache";
import { buildCandidateQueryPlans, fetchCandidatesForPlan, deduplicateAndNormalize } from "../services/recommendationCandidates";
import { rankCandidates } from "../services/recommendationEngine";

export const aiRouter = express.Router();

aiRouter.post("/api/recommendation-candidates", async (req, res) => {
    try {
      const { category, context, userId, locationContext } = req.body;
      if (!category) {
        return res.status(400).json({ error: "Missing category" });
      }
      
      const uid = userId || "guest";

      // Fetch user profile securely
      let profile: any = {};
      try {
        const userDoc = await adminDb.collection("users").doc(uid).get();
        profile = userDoc.exists ? userDoc.data() : {};
      } catch (e) {}
      const tasteProfile = profile?.tasteState || { topCategories: [category] };

      // Fetch user library securely
      let userLib: any[] = [];
      try {
        const legacySnap = await adminDb.collection(`users/${uid}/items`).get();
        legacySnap.docs.forEach(doc => userLib.push({ id: doc.id, ...doc.data() }));
        const chunkSnap = await adminDb.collection(`users/${uid}/item_lists`).get();
        chunkSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.items) userLib.push(...data.items);
        });
      } catch(e) {}

      const fingerprint = generateFingerprint(userLib, profile, category);
      const cached = await getCachedRecommendations(uid, category, fingerprint);
      if (cached) {
          return res.json({ rankedCandidates: cached });
      }
      
      const tasteSummary = buildUserTasteSummary(uid, userLib, profile, category);


      const likedItems = userLib.filter((i: any) => i.reaction === 'heart' || i.reaction === 'thumbs-up' || (i.rating && i.rating >= 8));
      const dislikedItems = userLib.filter((i: any) => i.reaction === 'skull' || i.reaction === 'thumbs-down' || (i.rating && i.rating <= 3));

      // 1. External Candidates
      const plans = await buildCandidateQueryPlans(userLib, category, locationContext);
      let externalCandidates: any[] = [];
      for (const plan of plans) {
         const planCandidates = await fetchCandidatesForPlan(plan);
         externalCandidates = externalCandidates.concat(planCandidates);
      }

      // 2. Internal (pgvector) Candidates
      const searchContext = context || `popular ${category} recommendations`;
      const userVector = await getEmbedding(searchContext);

      const similarity = sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(userVector)}::vector)`;
      const internalMatches = await db.select({
          id: globalItems.id,
          title: globalItems.title,
          subtitle: globalItems.subtitle,
          description: globalItems.description,
          category: globalItems.category,
          data: globalItems.data,
          similarity
      })
      .from(globalItems)
      .where(sql`${globalItems.category} = ${category === "movie" || category === "tv" ? "watch" : category === "game" ? "games" : category === "event" ? "events" : category}`)
      .orderBy(sql`${similarity} DESC`)
      .limit(15);

      const internalCandidates = internalMatches.map(m => ({
          externalSource: "internal",
          externalId: m.id,
          existingItemId: m.id,
          alreadyInDilecti: true,
          category: m.category,
          title: m.title,
          subtitle: m.subtitle || "",
          description: m.description || "",
          imageUrl: (m.data as any)?.coverUrl || "",
          genres: (m.data as any)?.tags || [],
          criticScore: (m.data as any)?.criticScore || undefined
      }));

      // Combine
      let allCandidates = [...internalCandidates, ...externalCandidates];

      // 3. Deduplicate
      const deduped = await deduplicateAndNormalize(allCandidates, userLib);

      // 4. Deterministic Pre-Ranking
      const tasteState = tasteProfile || { topCategories: [category] };
      const ranked = rankCandidates(deduped, tasteState as any, null, undefined, dislikedItems, likedItems);
      await setCachedRecommendations(uid, category, fingerprint, ranked);


      return res.json({
         plans,
         candidatesCount: ranked.length,
         rankedCandidates: ranked
      });
    } catch (e) {
      console.error(e);
      return res.json({ plans: [], candidatesCount: POPULAR_FALLBACK.length, rankedCandidates: POPULAR_FALLBACK });
    }
});

aiRouter.post("/api/universal-recommend", async (req, res) => {
    try {
      const { category, context, items } = req.body;
      const searchContext = context || "popular recommendations";
      
      const userVector = await getEmbedding(searchContext);
      
      let topMatches: any[] = [];
      try {
        const similarity = sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(userVector)}::vector)`;
        topMatches = await db.select({
            id: globalItems.id,
            title: globalItems.title,
            subtitle: globalItems.subtitle,
            description: globalItems.description,
            category: globalItems.category,
            data: globalItems.data,
            similarity
        })
        .from(globalItems)
        .where(sql`${globalItems.category} = ${category === "movie" || category === "tv" ? "watch" : category === "game" ? "games" : category === "event" ? "events" : category}`)
        .orderBy(sql`${similarity} DESC`)
        .limit(20);
      } catch (e) {
        console.error("universal-recommend db.select failed:", e);
      }
      
      let filtered = topMatches;
      if (items && items.length > 0) {
          const prevLower = items.map((t: any) => (t.title || "").toLowerCase());
          filtered = topMatches.filter(m => !prevLower.includes((m.title || "").toLowerCase()));
      }
      
      let results = [];
      if (filtered.length === 0) {
          const fallback = getLocalCatalogFallbackFor(category);
          results = fallback.slice(0, 8);
      } else {
          results = filtered.slice(0, 8).map(m => ({
              id: m.id || Math.random().toString(),
              title: m.title,
              subtitle: m.subtitle || "",
              description: m.description || "",
              coverUrl: (m.data as any)?.coverUrl || (m.data as any)?.imageUrl || (m.data as any)?.artworkUrl600 || (m.data as any)?.artworkUrl100 || "",
              category: m.category,
              tags: (m.data as any)?.tags || [],
              reason: (m.data as any)?.reason || "Recommended based on your taste profile."
          }));
      }

      return res.json(results);
    } catch (error: any) {
      console.error("Universal recommend error:", error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
});

aiRouter.post("/api/batch-universal-recommend", async (req, res) => {
    try {
      const { categories, context, previousRecs } = req.body;
      const searchContext = context || "popular recommendations";
      
      const userVector = await getEmbedding(searchContext);
      
      const results = {};
      
      await Promise.all(categories.map(async (category) => {
          let topMatches: any[] = [];
          try {
            const similarity = sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(userVector)}::vector)`;
            topMatches = await db.select({
                id: globalItems.id,
                title: globalItems.title,
                subtitle: globalItems.subtitle,
                description: globalItems.description,
                category: globalItems.category,
                
                data: globalItems.data,
                similarity
            })
            .from(globalItems)
            .where(sql`${globalItems.category} = ${category === "movie" || category === "tv" ? "watch" : category === "game" ? "games" : category === "event" ? "events" : category}`)
            .orderBy(sql`${similarity} DESC`)
            .limit(20);
          } catch (e) {
            console.error("batch-universal-recommend db.select failed:", e);
          }
          
          let filtered = topMatches;
          if (previousRecs && previousRecs.length > 0) {
              const prevLower = previousRecs.map(t => (t || "").toLowerCase());
              filtered = topMatches.filter(m => !prevLower.includes((m.title || "").toLowerCase()));
          }
          
          
          if (filtered.length === 0) {
              const fallback = getLocalCatalogFallbackFor(category);
              results[category] = fallback.slice(0, 8);
          } else {
              results[category] = filtered.slice(0, 8).map(m => ({
                  id: m.id || Math.random().toString(),
                  title: m.title,
                  subtitle: m.subtitle || "",
                  description: m.description || "",
                  coverUrl: (m.data as any)?.coverUrl || (m.data as any)?.imageUrl || (m.data as any)?.artworkUrl600 || (m.data as any)?.artworkUrl100 || "",
                  category: m.category,
                  tags: (m.data as any)?.tags || [],
                  reason: (m.data as any)?.reason || "Recommended based on your taste profile."
              }));
          }

      
      }));
      return res.json(results);
    } catch (error) {
      console.error("Batch recommend error:", error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
});

const aiCache = new Map<string, any>();
import YouTube from "youtube-sr";

const POPULAR_FALLBACK = [
  { id: "fallback_1", title: "Dune", category: "book", subtitle: "Frank Herbert", description: "A science fiction masterpiece.", coverUrl: "" },
  { id: "fallback_2", title: "Inception", category: "movie", subtitle: "Christopher Nolan", description: "A mind-bending thriller.", coverUrl: "" },
  { id: "fallback_3", title: "The Bear", category: "tv", subtitle: "FX", description: "Intense kitchen drama.", coverUrl: "" },
  { id: "fallback_4", title: "Abbey Road", category: "music", subtitle: "The Beatles", description: "Classic album.", coverUrl: "" },
];


let _cachedCatalog: any[] = [];
let _catalogLastFetched = 0;
const CATALOG_TTL = 1000 * 60 * 30; // 30 minutes

async function getCachedCatalog() {
    if (Date.now() - _catalogLastFetched < CATALOG_TTL && _cachedCatalog.length > 0) {
        return _cachedCatalog;
    }
    try {
        const snapshot = await adminDb.collectionGroup("items").where("isPrivate", "==", false).limit(800).get();
        globalSystemStats.firestoreReads += snapshot.size;
        
        let newCatalog: any[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data();
            if (data && data.title) {
                newCatalog.push({ id: doc.id, ...data });
            }
        });
        _cachedCatalog = newCatalog;
        _catalogLastFetched = Date.now();
        return _cachedCatalog;
    } catch (e: any) {
        if (e.code === 7 || String(e).includes("PERMISSION_DENIED")) {
            console.log("Using local vector catalog (Firestore collectionGroup not available in this sandbox environment)");
        } else {
            console.warn("Failed to fetch public catalog for cache:", e.message || e);
        }
        // Fallback to whatever we had
        return _cachedCatalog;
    }
}

async function enrichReasonsWithGroq(context: string, items: any[]): Promise<void> {
  if (!context || !process.env.GROQ_API_KEY || items.length === 0) return;
  
  try {
     // To avoid huge prompts, we only enrich the top 15 items if there are many.
     const itemsToEnrich = items.slice(0, 15);
     const itemsSummary = itemsToEnrich.map(i => `${i.title} (${i.category})`).join(", ");
     const prompt = `You are a taste profiler AI. A user has this taste context: "${context}".
I have selected these items for them: ${itemsSummary}.
For each item, generate EXACTLY 1 sentence explaining why this specific user will love it, based on their context.
Return a strictly formatted JSON object where keys are the exact item titles, and values are strings containing the 1-sentence reasons. Example: {"Item Name": "This user will love this because..."}. No markdown blocks.`;
     const groqResponse = await fetchGroqFallback(prompt, true);
     const match = groqResponse.match(/\{[\s\S]*\}/);
     if (match) {
         const reasonMap = JSON.parse(match[0]);
         itemsToEnrich.forEach(item => {
             if (reasonMap[item.title]) {
                 item.reason = reasonMap[item.title];
                 item.sourceSignal = (item.sourceSignal || "Vector Similarity Match") + " (AI Enriched)";
             }
         });
     }
  } catch (err: any) {
     console.warn("Groq enrich failed on vector fallback:", err?.message || err);
  }
}

aiRouter.post("/api/search-music", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }
    
    let searchFn = YouTube.search;
    if (typeof searchFn !== "function" && (YouTube as any).default) {
       searchFn = (YouTube as any).default.search;
    }
    
    if (typeof searchFn !== "function") {
       throw new Error("Could not find search function. YouTube keys: " + Object.keys(YouTube).join(", "));
    }

    const results: any = await searchFn(query, { type: "video", limit: 1 });
    if (results && results.length > 0) {
      res.json({ videoId: results[0].id });
    } else {
      res.json({ videoId: null, message: "No results", results });
    }
  } catch (e: any) {
    console.error("Music search error:", e);
    res.json({ videoId: null, error: e.message, stack: e.stack });
  }
});

const genericFallbacks: Record<string, string> = {
  book: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
  movie: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop",
  tv: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=600&auto=format&fit=crop",
  music: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop",
  games: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop",
  game: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop",
  products: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
  product: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
  events: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop",
  places: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600&auto=format&fit=crop",
  place: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600&auto=format&fit=crop",
};

async function fetchImageForWithTimeout(title: string, subtitle: string, category: string, timeoutMs = 1200): Promise<string> {
  const normCategory = category?.toLowerCase() || "";
  const finalFallbackBook = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop";
  const fallbackUrl = genericFallbacks[normCategory] || genericFallbacks[normCategory.replace(/s$/, "")] || finalFallbackBook;

  try {
    return await Promise.race([
      fetchImageFor(title, subtitle, category),
      new Promise<string>((resolve) => setTimeout(() => resolve(fallbackUrl), timeoutMs))
    ]);
  } catch (error) {
    return fallbackUrl;
  }
}

function getLocalCatalogFallbackFor(category: string): any[] {
  const normCategory = category ? category.toLowerCase().trim().replace(/s$/, "") : "all";
  
  const books = [
    { title: "The Midnight Library", subtitle: "Matt Haig", category: "book", description: "Between life and death there is a library, and within that library, the shelves go on forever.", coverUrl: "https://m.media-amazon.com/images/I/71R2NwKVceL._AC_UF1000,1000_QL80_.jpg" },
    { title: "Tomorrow, and Tomorrow, and Tomorrow", subtitle: "Gabrielle Zevin", category: "book", description: "Two friends who find modern celebrity in video game design.", coverUrl: "https://m.media-amazon.com/images/I/81f185A7mZL._AC_UF1000,1000_QL80_.jpg" },
    { title: "Project Hail Mary", subtitle: "Andy Weir", category: "book", description: "A lone astronaut must save the earth from an extinction-level event.", coverUrl: "https://m.media-amazon.com/images/I/81a4kCNuH+L._AC_UF1000,1000_QL80_.jpg" },
    { title: "Dune", subtitle: "Frank Herbert", category: "book", description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides.", coverUrl: "https://covers.openlibrary.org/b/id/10515152-L.jpg" },
    { title: "Atomic Habits", subtitle: "James Clear", category: "book", description: "An easy and proven way to build good habits and break bad ones.", coverUrl: "https://m.media-amazon.com/images/I/81YkqklCOvL._AC_UF1000,1000_QL80_.jpg" },
    { title: "The Silent Patient", subtitle: "Alex Michaelides", category: "book", description: "A shocking psychological thriller about a woman's act of violence against her husband.", coverUrl: "https://m.media-amazon.com/images/I/61K2B6-pP9L._AC_UF1000,1000_QL80_.jpg" }
  ];

  const movies = [
    { title: "Dune: Part Two", subtitle: "Denis Villeneuve", category: "movie", description: "Paul Atreides unites with Chani and the Fremen while seeking revenge.", coverUrl: "https://m.media-amazon.com/images/M/MV5BN2QyZGU4ZDctOWMzMy00NTc5LThlOGQtODhmNDI1NmYyNjA3XkEyXkFqcGc@._V1_.jpg" },
    { title: "Everything Everywhere All at Once", subtitle: "Daniel Kwan, Daniel Scheinert", category: "movie", description: "An aging Chinese immigrant is swept up in an insane adventure in the multiverse.", coverUrl: "https://m.media-amazon.com/images/M/MV5BYTdiOTIyMzBiZWFjMTE1ZGQxNGI3N2QwMzU1Mzg5NTdiNDcwXkEyXkFqcGc@._V1_.jpg" },
    { title: "Interstellar", subtitle: "Christopher Nolan", category: "movie", description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.", coverUrl: "https://m.media-amazon.com/images/M/MV5BYzdjMDAxODAtMjVjYS00MzYxLWIxYmItWVQyOWY1NDVkZDBiXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
    { title: "Parasite", subtitle: "Bong Joon Ho", category: "movie", description: "Greed and class discrimination threaten the newly formed symbiotic relationship.", coverUrl: "https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTVkXkEyXkFqcGc@._V1_.jpg" },
    { title: "Spider-Man: Across the Spider-Verse", subtitle: "Joaquim Dos Santos", category: "movie", description: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People.", coverUrl: "https://m.media-amazon.com/images/M/MV5BMzI0NmVkMjEtYmY4MS00ZWMxLTkxMTEtYWM3NDRkM2YtMDg2XkEyXkFqcGc@._V1_.jpg" }
  ];

  const music = [
    { title: "To Pimp a Butterfly", subtitle: "Kendrick Lamar", category: "music", description: "A landmark hip-hop album exploring identity, culture, and social issues.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/b/b3/Kendrick_Lamar_-_To_Pimp_a_Butterfly.png" },
    { title: "Brat", subtitle: "Charli XCX", category: "music", description: "A club-infused pop masterpiece exploring vulnerability and party culture.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/2/23/Charli_XCX_-_Brat.png" },
    { title: "Random Access Memories", subtitle: "Daft Punk", category: "music", description: "A tribute to late 1970s and early 1980s American music.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/a/a7/Random_Access_Memories.png" },
    { title: "Midnights", subtitle: "Taylor Swift", category: "music", description: "A journey through 13 sleepless nights scattered throughout Taylor's life.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/9/9f/Taylor_Swift_-_Midnights.png" },
    { title: "Abbey Road", subtitle: "The Beatles", category: "music", description: "The eleventh studio album by the English rock band the Beatles.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/4/42/Beatles_-_Abbey_Road.jpg" }
  ];

  const food = [
    { title: "Sushi Omakase at Uchi", subtitle: "Fine Dining", category: "food", description: "A chef-curated dining experience featuring premium seasonal sushi.", coverUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c" },
    { title: "Neapolitan Pizza", subtitle: "Italian Cuisine", category: "food", description: "Classic wood-fired sourdough pizza with fresh mozzarella and basil.", coverUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002" },
    { title: "Dim Sum Feast", subtitle: "Yank Sing", category: "food", description: "A delicious selection of dumplings, buns, and traditional small plates.", coverUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c" },
    { title: "Tacos Al Pastor", subtitle: "Street Food", category: "food", description: "Sizzling pork spit-roasted with pineapple, onions, and cilantro.", coverUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38" }
  ];

  const places = [
    { title: "Kyoto", subtitle: "Japan", category: "place", description: "Famous for classical Buddhist temples, gardens, and Shinto shrines.", coverUrl: "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4" },
    { title: "Reykjavik", subtitle: "Iceland", category: "place", description: "A coastal capital known for natural wonders, geothermal spas, and northern lights.", coverUrl: "https://images.unsplash.com/photo-1504825595955-46fd4efbba95" },
    { title: "Oaxaca", subtitle: "Mexico", category: "place", description: "A historic city renowned for rich culture, indigenous crafts, and culinary scene.", coverUrl: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a" },
    { title: "Amalfi Coast", subtitle: "Italy", category: "place", description: "A scenic stretch of mountainous coastline dotted with pastel-colored towns.", coverUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077" },
    { title: "Bali", subtitle: "Indonesia", category: "place", description: "An Indonesian island known for its forested volcanic mountains, iconic rice paddies, beaches and coral reefs.", coverUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4" },
    { title: "Banff National Park", subtitle: "Canada", category: "place", description: "Canada's oldest national park, known for its glacier-fed lakes and majestic peaks.", coverUrl: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce" },
    { title: "Sedona", subtitle: "Arizona", category: "place", description: "An Arizona desert town famous for its striking red rock formations and vibrant arts scene.", coverUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800" },
    { title: "Cinque Terre", subtitle: "Italy", category: "place", description: "A string of centuries-old seaside villages on the rugged Italian Riviera coastline.", coverUrl: "https://images.unsplash.com/photo-1499678329028-101435549a4e" },
    { title: "Tulum", subtitle: "Mexico", category: "place", description: "A town on the Caribbean coastline of Mexico's Yucatán Peninsula, known for its beaches and ruins.", coverUrl: "https://images.unsplash.com/photo-1518638150340-f706e86654de" },
    { title: "Santorini", subtitle: "Greece", category: "place", description: "One of the Cyclades islands in the Aegean Sea, devastated by a volcanic eruption in the 16th century BC.", coverUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077" },
    { title: "Yellowstone", subtitle: "Wyoming", category: "place", description: "A vast national park atop a volcanic hot spot, featuring dramatic canyons, alpine rivers, and geysers.", coverUrl: "https://images.unsplash.com/photo-1504825595955-46fd4efbba95" },
    { title: "Machu Picchu", subtitle: "Peru", category: "place", description: "An Incan citadel set high in the Andes Mountains in Peru.", coverUrl: "https://images.unsplash.com/photo-1587595431973-160d0d94add1" },
    { title: "Maui", subtitle: "Hawaii", category: "place", description: "An island in the Central Pacific, part of the Hawaiian archipelago.", coverUrl: "https://images.unsplash.com/photo-1542259009477-d625272157b7" },
    { title: "Zion National Park", subtitle: "Utah", category: "place", description: "A southwest Utah nature preserve distinguished by Zion Canyon's steep red cliffs.", coverUrl: "https://images.unsplash.com/photo-1505778276668-26b3ff7af103" },
    { title: "Patagonia", subtitle: "Argentina/Chile", category: "place", description: "A sparsely populated region located at the southern end of South America.", coverUrl: "https://images.unsplash.com/photo-1494783367193-149034c05e8f" }
  ];

  const games = [
    { title: "Hades II", subtitle: "Supergiant Games", category: "game", description: "A rogue-like dungeon crawler set in the mythological Greek Underworld.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/f/f6/Hades_II_cover_art.jpg" },
    { title: "Elden Ring", subtitle: "FromSoftware", category: "game", description: "An epic open-world action RPG crafted in collaboration with George R.R. Martin.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg" },
    { title: "The Legend of Zelda: Tears of the Kingdom", subtitle: "Nintendo", category: "game", description: "A massive sandbox adventure across the skies and depths of Hyrule.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/a/a3/The_Legend_of_Zelda_Tears_of_the_Kingdom_cover.jpg" },
    { title: "Baldur's Gate 3", subtitle: "Larian Studios", category: "game", description: "A rich, story-driven RPG set in the universe of Dungeons & Dragons.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/1/12/Baldur%27s_Gate_3_cover_art.jpg" }
  ];

  const tv = [
    { title: "Succession", subtitle: "HBO", category: "tv", description: "A drama following the power struggles of a dysfunctional media family.", coverUrl: "https://m.media-amazon.com/images/M/MV5BYTU4MDM1MmUtZjExMC00NjM3LWEyOTEtNWMyOGUwNDlmY2JkXkEyXkFqcGc@._V1_.jpg" },
    { title: "The Bear", subtitle: "FX", category: "tv", description: "An intense, fast-paced comedy-drama following a fine-dining chef.", coverUrl: "https://m.media-amazon.com/images/M/MV5BMjY5ZTU5YWItYWZkNi00MTVmLWIyYTItZmUzMDFiNWY5NGVjXkEyXkFqcGc@._V1_.jpg" },
    { title: "Severance", subtitle: "Apple TV+", category: "tv", description: "A workplace thriller about split work and personal memories.", coverUrl: "https://m.media-amazon.com/images/M/MV5BZWMyYzJjMzUtNmUzYi00OWM0LWIwNmEtZmViOTc4ZTYyNGY3XkEyXkFqcGc@._V1_.jpg" }
  ];

  const products = [
    { title: "Sony WH-1000XM5", subtitle: "Noise Cancelling Headphones", category: "product", description: "Industry-leading wireless active noise-cancelling headphones.", coverUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e" },
    { title: "Mechanical Keyboard", subtitle: "Keychron Q1", category: "product", description: "A premium custom mechanical keyboard built for typing perfection.", coverUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3" },
    { title: "Herman Miller Aeron", subtitle: "Ergonomic Chair", category: "product", description: "The iconic ergonomic office chair for ultimate comfort.", coverUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e" },
    { title: "Apple MacBook Pro M3", subtitle: "Laptop", category: "product", description: "A powerful laptop with the new M3 chip for professionals.", coverUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8" },
    { title: "Dyson V15 Detect", subtitle: "Vacuum Cleaner", category: "product", description: "A highly intelligent cordless vacuum with laser illumination.", coverUrl: "https://images.unsplash.com/photo-1558317374-067fb5f30001" },
    { title: "Oura Ring Gen 3", subtitle: "Smart Ring", category: "product", description: "A sleek smart ring for tracking sleep and wellness.", coverUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff" },
    { title: "Fujifilm X100V", subtitle: "Digital Camera", category: "product", description: "A premium compact camera beloved by street photographers.", coverUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32" },
    { title: "Aer City Pack", subtitle: "Backpack", category: "product", description: "A minimal, everyday backpack for the modern commuter.", coverUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62" },
    { title: "Bose QuietComfort 45", subtitle: "Headphones", category: "product", description: "Iconic noise cancelling headphones with supreme comfort.", coverUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e" },
    { title: "Nintendo Switch OLED", subtitle: "Gaming Console", category: "product", description: "A versatile gaming console with a vibrant OLED screen.", coverUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f" },
    { title: "Kindle Paperwhite", subtitle: "E-Reader", category: "product", description: "A waterproof e-reader with a high-resolution display.", coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c" },
    { title: "Yeti Rambler", subtitle: "Tumbler", category: "product", description: "A rugged, insulated tumbler that keeps drinks hot or cold for hours.", coverUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e" },
    { title: "Peak Design Everyday Backpack", subtitle: "Camera Bag", category: "product", description: "A versatile, durable backpack for photographers and travelers.", coverUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62" },
    { title: "Logitech MX Master 3S", subtitle: "Wireless Mouse", category: "product", description: "An advanced, ergonomic wireless mouse for productivity.", coverUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46" },
    { title: "Breville Barista Express", subtitle: "Espresso Machine", category: "product", description: "Create third wave specialty coffee at home.", coverUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4" }
  ];

  const events = [
    { title: "Eras Tour", subtitle: "Taylor Swift Concert", category: "event", description: "The definitive pop stadium spectacle spanning her career.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/e/eb/The_Eras_Tour_poster.jpg" },
    { title: "Hamilton", subtitle: "Broadway Musical", category: "event", description: "The legendary hip-hop musical following Alexander Hamilton's life.", coverUrl: "https://upload.wikimedia.org/wikipedia/en/8/83/Hamilton-poster.jpg" }
  ];

  let rawList: any[] = [];
  if (normCategory === "book") rawList = books;
  else if (normCategory === "movie") rawList = movies;
  else if (normCategory === "music") rawList = music;
  else if (normCategory === "food") rawList = food;
  else if (normCategory === "place") rawList = places;
  else if (normCategory === "game") rawList = games;
  else if (normCategory === "tv" || normCategory === "watch") rawList = tv;
  else if (normCategory === "product") rawList = products;
  else if (normCategory === "event") rawList = events;
  else {
    rawList = [...books, ...movies, ...music, ...food, ...places, ...games, ...tv, ...products, ...events];
  }

  return JSON.parse(JSON.stringify(rawList)).map((item: any) => ({
    ...item,
    id: 'fallback-' + Math.random().toString(36).substring(2, 9)
  }));
}

async function getEmbeddedFallbackCatalog(category: string): Promise<any[]> {
  const list = getLocalCatalogFallbackFor(category);
  try {
    await Promise.all(list.map(async (item) => {
      const embeddingText = `${item.title} ${item.subtitle || ""} ${item.description || ""}`;
      item.embedding = await getEmbedding(embeddingText);
    }));
  } catch (err) {
    console.warn("Failed to generate embedding for fallbacks", err);
  }
  return list;
}


aiRouter.post("/api/generate-metadata", async (req, res) => {
    try {
      const { title, subtitle, inCategory, currentDescription } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || !title) {
        return res.json({ description: "", category: inCategory || "book", subtitle: subtitle || "", collections: [] });
      }

      const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);
      const prompt = `Provide metadata for an item titled "${title}" ${subtitle ? `by/related to "${subtitle}"` : ''}. 
If a category is provided ("${inCategory}"), stick to it if it makes sense. 
Return strictly a JSON object with: 
- "category" (must be one of: 'food', 'movie', 'tv', 'music', 'product', 'places', 'book', 'events', 'game', 'podcast', 'creator', 'custom'),
- "description" (a 1-2 sentence engaging summary, no placeholder text),
- "subtitle" (creator, author, director, brand, etc., if known),
- "tags" (an array of 3-5 relevant category tags/genres. IMPORTANT: For 'places', do NOT use 'Non-Fiction' or 'Drama'; use travel/nature terms. For 'events', use event types, not book genres).
No markdown formatting or backticks.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }, { scope: 'global', ttlDays: 30 });

      const textResponse = (response.text || "").trim();
      const match = textResponse.match(/\{[\s\S]*\}/);
      const cleanJson = match ? match[0] : "{}";
      let metadata: any = {};
      try {
          metadata = JSON.parse(cleanJson);
      } catch(e) {}
      
      const coverUrl = await fetchImageFor(title, metadata.subtitle || subtitle || "", metadata.category || inCategory || "");

      res.json({
        description: metadata.description || currentDescription || "",
        category: metadata.category || inCategory || "book",
        subtitle: metadata.subtitle || subtitle || "",
        tags: metadata.tags || [],
        coverUrl: coverUrl || ""
      });
    } catch (e: any) {
      res.json({ description: "", category: req.body.inCategory || "book", subtitle: req.body.subtitle || "", tags: [], coverUrl: "" });
    }
});

aiRouter.post("/api/generate-description", async (req, res) => {
    try {
      const { title, category } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || !title) {
        return res.json({ description: "" });
      }

      const cacheKey = `desc_${title}_${category}`;
      const cachedDesc = await getCachedResponse('global', cacheKey);
      if (cachedDesc) {
          globalSystemStats.cacheHits++;
          globalSystemStats.tokensSaved += 250;
          return res.json({ description: cachedDesc.data });
      }

      const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);
      const prompt = `Write a short, engaging, 2-3 sentence summary or description for the ${category || 'item'} titled "${title}". Focus only on the summary, do not include any other text, prefaces, or formatting.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }, { scope: 'global', ttlDays: 30 });

      const textResponse = (response.text || "").trim();
      await setCachedResponse('global', cacheKey, { data: textResponse }, 30);
      res.json({ description: textResponse });
    } catch (e: any) {
      res.json({ description: "" });
    }
});

aiRouter.get("/api/system-stats", async (req, res) => {
    try {
        let totalItems = 0;
        let embeddedItems = 0;
        let missingImages = 0;

        res.json({
            apiKeyPresent: !!process.env.GEMINI_API_KEY,
            totalItems,
            embeddedItems,
            missingImages,
            cacheHits: globalSystemStats.cacheHits,
            tokensSaved: globalSystemStats.tokensSaved,
            geminiCalls: globalSystemStats.geminiCalls,
            vectorSearches: globalSystemStats.vectorSearches,
            tokensUsed: globalSystemStats.tokensUsed,
            costIncurred: globalSystemStats.costIncurred,
            firestoreReads: globalSystemStats.firestoreReads,
            functionTokens: globalSystemStats.functionTokens
        });
    } catch (e) {
        res.status(500).json({ error: "Failed to load stats" });
    }
});

aiRouter.get("/api/trending", async (req, res) => {
    try {
      const category = req.query.category || "global";
      const cacheKey = `trending_v2_${category}`;
      const cachedTrending = await getCachedResponse('global', cacheKey);
      if (cachedTrending) {
        return res.json(cachedTrending.data);
      }

      // Vector Search for trending
      const { getEmbedding } = await import("../utils/embeddings");
      const { db } = await import("../db");
      const { globalItems } = await import("../db/schema");
      const { sql } = await import("drizzle-orm");

      let searchCategory = category as string;
      if (searchCategory === 'global_bestsellers_booktok') searchCategory = 'book';
      
      const searchContext = `popular best highly-rated trending ${searchCategory}`;
      const queryVector = await getEmbedding(searchContext);

      const similarity = sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(queryVector)}::vector)`;
      
      const topMatches = await db.select({
        id: globalItems.id,
        title: globalItems.title,
        subtitle: globalItems.subtitle,
        description: globalItems.description,
        category: globalItems.category,
        data: globalItems.data,
        similarity
      })
      .from(globalItems)
      .where(sql`${globalItems.category} = ${searchCategory === "movie" || searchCategory === "tv" ? "watch" : searchCategory === "game" ? "games" : searchCategory === "event" ? "events" : searchCategory}`)
      .orderBy(sql`${similarity} DESC`)
      .limit(30);

      const shuffled = topMatches.sort(() => 0.5 - Math.random()).slice(0, 20);
      
      if (shuffled.length === 0) {
          return res.json([]);
      }

      const finalRecs = shuffled.map((m: any) => ({
          id: m.id || Math.random().toString(),
          title: m.title,
          subtitle: m.subtitle || "",
          description: m.description || "",
          category: m.category,
          tags: (m.data as any)?.tags || ["🔥 Trending"],
          reason: `A highly popular ${m.category}.`,
          coverUrl: (m.data as any)?.coverUrl || (m.data as any)?.cover_url || (m.data as any)?.imageUrl || (m.data as any)?.artworkUrl600 || (m.data as any)?.artworkUrl100 || "",
          criticScore: (m.data as any)?.criticScore || (m.data as any)?.rating || null,
          sourceSignal: "Vector DB Match"
      }));

      await setCachedResponse('global', cacheKey, { data: finalRecs }, 1);
      return res.json(finalRecs);
    } catch(e: any) {
      console.error(e);
      res.json(POPULAR_FALLBACK);
    }
});

aiRouter.post("/api/recommend", async (req, res) => {
    try {
      const { category } = req.body;
      
      let userApiKey = req.headers['x-user-api-key'] as string;
      if (userApiKey === "null" || userApiKey === "undefined") userApiKey = "";
      const apiKey = userApiKey || null;

      const cacheKey = `trending_${category}`;
      const cachedRecommend = await getCachedResponse('global', cacheKey);
      if (cachedRecommend) {
        return res.json(cachedRecommend.data);
      }

      // 1. Vector Search for popular items in category
      
      
      
      

      const searchContext = `popular best highly-rated trending ${category}`;
      const queryVector = await getEmbedding(searchContext);

      const similarity = sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(queryVector)}::vector)`;
      
      const topMatches = await db.select({
        id: globalItems.id,
        title: globalItems.title,
        subtitle: globalItems.subtitle,
        description: globalItems.description,
        category: globalItems.category,
        data: globalItems.data,
        similarity
      })
      .from(globalItems)
      .where(sql`${globalItems.category} = ${category === "movie" || category === "tv" ? "watch" : category === "game" ? "games" : category === "event" ? "events" : category}`)
      .orderBy(sql`${similarity} DESC`)
      .limit(30);

      // We only need 20
      const shuffled = topMatches.sort(() => 0.5 - Math.random()).slice(0, 20);
      
      if (shuffled.length === 0) {
          return res.json([]);
      }

      const finalRecs = shuffled.map((m: any) => ({
          id: m.id || Math.random().toString(),
          title: m.title,
          subtitle: m.subtitle || "",
          description: m.description || "",
          category: m.category,
          tags: (m.data as any)?.tags || ["🔥 Trending"],
          reason: `A highly popular ${m.category}.`,
          coverUrl: (m.data as any)?.coverUrl || (m.data as any)?.cover_url || (m.data as any)?.imageUrl || (m.data as any)?.artworkUrl600 || (m.data as any)?.artworkUrl100 || "",
          criticScore: (m.data as any)?.criticScore || (m.data as any)?.rating || null,
          sourceSignal: "Vector DB Match"
      }));

      // No need to call LLM for trending/home because it doesn't have a personal taste profile!
      // This saves 100% of LLM cost for the Home tab!
      
      await setCachedResponse('global', cacheKey, { data: finalRecs }, 1);
      return res.json(finalRecs);
    } catch(e: any) {
      console.error(e);
      res.json(POPULAR_FALLBACK);
    }
});

aiRouter.post("/api/item-embeddings", async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) return res.json({});
        
        // Items might have an ID that matches global_items.id, or we might just use title.
        // Let's try matching by title since user_items IDs might not match global_items directly.
        const titles = items.map(i => i.title).filter(Boolean);
        if (titles.length === 0) return res.json({});

        const { db } = await import("../db");
        const { globalItems } = await import("../db/schema");
        const { inArray } = await import("drizzle-orm");

        const matches = await db.select({
            id: globalItems.id,
            title: globalItems.title,
            embedding: globalItems.embedding
        }).from(globalItems).where(inArray(globalItems.title, titles));

        // Create a map from title -> embedding
        const embeddingsMap: Record<string, number[]> = {};
        for (const match of matches) {
            if (match.embedding) {
                embeddingsMap[match.title.toLowerCase()] = (match.embedding as any);
            }
        }
        
        return res.json(embeddingsMap);
    } catch(e) {
        console.error("Item embeddings error:", e);
        return res.json({});
    }
});

aiRouter.post("/api/discover-category", async (req, res) => {
    try {
      const { category, context } = req.body;
      
      let userApiKey = req.headers['x-user-api-key'] as string;
      if (userApiKey === "null" || userApiKey === "undefined") userApiKey = "";
      const apiKey = userApiKey || null;

      const cacheKey = `discover_${category}_${context}`;
      const cachedDiscover = await getCachedResponse('global', cacheKey);
      if (cachedDiscover) {
        return res.json(cachedDiscover.data);
      }

      // Generate embedding for user's taste context
      const searchContext = context || `popular ${category} recommendations`;
      
      const userVector = await getEmbedding(searchContext);

      // Vector Search in Postgres
      
      
      
      
      const similarity = sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(userVector)}::vector)`;
      
      const topMatches = await db.select({
        id: globalItems.id,
        title: globalItems.title,
        subtitle: globalItems.subtitle,
        description: globalItems.description,
        category: globalItems.category,
        data: globalItems.data,
        similarity
      })
      .from(globalItems)
      .where(sql`${globalItems.category} = ${category === "movie" || category === "tv" ? "watch" : category === "game" ? "games" : category === "event" ? "events" : category}`)
      .orderBy(sql`${similarity} DESC`)
      .limit(10);

      // We only need 6 to show
      const bestMatches = topMatches.slice(0, 6);
      
      if (bestMatches.length === 0) {
          // Fallback if db is empty
          return res.json([]);
      }

      const finalRecs = bestMatches.map((m: any) => ({
          id: m.id || Math.random().toString(),
          title: m.title,
          subtitle: m.subtitle || "",
          description: m.description || "",
          category: m.category,
          tags: (m.data as any)?.tags || ["🌟 Recommended"],
          reason: `A great ${m.category} based on your tastes.`,
          coverUrl: (m.data as any)?.coverUrl || (m.data as any)?.cover_url || (m.data as any)?.imageUrl || (m.data as any)?.artworkUrl600 || (m.data as any)?.artworkUrl100 || "",
          criticScore: (m.data as any)?.criticScore || (m.data as any)?.rating || null,
          sourceSignal: "Vector DB Match"
      }));

      // Justification-Only LLM: Pass the matches and ask for reasons
      if (apiKey && context) {
        try {
            const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);
            
            const prompt = `You are a recommendation expert for Dilecti.
The user has this taste profile: ${context}
I have already retrieved the best matches from our vector database.
Write a personalized 1-sentence 'reason' (max 20 words) explaining WHY each item fits their taste.
Here are the items:
${JSON.stringify(finalRecs.map((r:any) => ({ id: r.id, title: r.title, desc: r.description })))}

Return strictly as a JSON array of objects with format: [{"id": "item_id", "reason": "Your reason here"}]. No markdown.`;
            
            const response = await generateContentWithRetry(ai, {
                model: "gemini-2.5-flash",
                contents: prompt,
            }, { scope: 'global', ttlDays: 1 });
            
            const match = (response.text || "").match(/\[[\s\S]*\]/);
            if (match) {
                const reasons = JSON.parse(match[0]);
                for (const rec of finalRecs) {
                    const r = reasons.find((x: any) => x.id === rec.id);
                    if (r && r.reason) {
                        rec.reason = r.reason;
                        rec.sourceSignal = "Hybrid RAG (Vector + LLM)";
                    }
                }
            }
        } catch (llmErr) {
            console.error("LLM Justification failed, returning pure vector results", llmErr);
        }
      }

      await setCachedResponse('global', cacheKey, { data: finalRecs }, 1);
      return res.json(finalRecs);
    } catch(e: any) {
      console.error(e);
      res.json(POPULAR_FALLBACK);
    }
});


aiRouter.post("/api/generate-mini-profile", async (req, res) => {
    try {
        const { category, items, metrics, demographicsContext, previousNarrative, userName } = req.body;
        
        let userApiKey = req.headers['x-user-api-key'];
        if (userApiKey === "null" || userApiKey === "undefined") userApiKey = "";
        const apiKey = (userApiKey as string) || process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return res.status(401).json({ error: "Missing API key" });
        }
        
        const { getAIClient } = await import("../utils/aiClient");
        const { generateContentWithRetry } = await import("../utils/ai");
        const ai = getAIClient(apiKey, req.headers['x-user-ai-provider'] as string);
        
        const itemsList = (items || []).slice(0, 30).map((i) => `${i.title} (${i.category}) - Rating: ${i.rating} - Status: ${i.status}`).join('\n');
        
        const prompt = `You are Dilecti, an AI maintaining a user's taste profile. The user (${userName}) wants a mini-profile for the "${category}" category.
        
Based on these items in their library:
${itemsList}

And their general metrics:
${JSON.stringify(metrics || {})}

Please output a JSON object describing their taste in ${category}.
Return strictly this JSON format:
{
  "title": "A punchy, relatable headline summarizing their core vibe for this category.",
  "core_read": "A 2-3 sentence analytical breakdown explaining the exact crossover of their tastes and what it says about them.",
  "keywords": ["tag1", "tag2", "tag3"]
}

No markdown blocks. Just the raw JSON object.`;

        const response = await generateContentWithRetry(ai, {
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        }, { scope: 'global', ttlDays: 1 });
        
        let text = response.text || "{}";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) text = match[0];
        
        res.json({ narrative: text });
    } catch (e) {
        console.error("generate-mini-profile error", e);
        res.status(500).json({ error: "Failed to generate mini profile" });
    }
});


aiRouter.post("/api/update-understanding", async (req, res) => {
    try {
      console.log("UPDATE UNDERSTANDING BODY:", req.body);
      const {
        currentUnderstanding,
        userInput,
        itemsContext,
        rawItems,
        demographicsContext,
        userId,
      } = req.body;
      let userApiKey = req.headers['x-user-api-key'] as string;
      if (userApiKey === "null" || userApiKey === "undefined") userApiKey = "";
      const apiKey = (userApiKey as string) || process.env.GEMINI_API_KEY;

      let evidencePacketText = "";

      let serverSideLibrary: any[] = [];
      if (userId) {
          try {
              const legacySnap = await adminDb.collection(`users/${userId}/items`).get();
              legacySnap.docs.forEach(doc => serverSideLibrary.push({ id: doc.id, ...doc.data() }));
              const chunkSnap = await adminDb.collection(`users/${userId}/item_lists`).get();
              chunkSnap.docs.forEach(doc => {
                  const data = doc.data();
                  if (data.items) serverSideLibrary.push(...data.items);
              });
          } catch(e) {
              console.warn("Server-side library fetch failed, falling back to rawItems if present.", e);
          }
      }

      const libraryToUse = serverSideLibrary.length > 0 ? serverSideLibrary : (rawItems && Array.isArray(rawItems) ? rawItems : []);

      if (libraryToUse.length > 0) {
        try {
          const { buildNarrativeEvidencePacket } = await import("../services/tasteIntelligence");
          const packet = buildNarrativeEvidencePacket(demographicsContext || {}, libraryToUse, "temp_id");
          
          evidencePacketText = `\n[Taste Intelligence Evidence Packet (Deterministic)]\n`;
          evidencePacketText += `Overall Library Confidence: ${packet.overallConfidence}\n`;
          evidencePacketText += `- Total Items Analyzed: ${packet.quantitativeProfile.totalItems}\n`;
          evidencePacketText += `- Top Genres Across All Mediums: ${packet.quantitativeProfile.topGenres.join(", ")}\n`;
          evidencePacketText += `- Top Creators: ${packet.quantitativeProfile.topCreators.join(", ")}\n`;
          evidencePacketText += `- Category Breakdown: ${Object.entries(packet.quantitativeProfile.categoryCounts).map(([k,v]) => `${k} (${v})`).join(", ")}\n`;
          evidencePacketText += `- Rating Distribution: ${Object.entries(packet.quantitativeProfile.ratingDistribution).map(([k,v]) => `${k} stars: ${v}`).join(", ")}\n`;
          
          if (packet.categoryProfiles.length > 0) {
            evidencePacketText += `\n[Category-Specific Profiles]\n`;
            packet.categoryProfiles.forEach((cp: any) => {
              evidencePacketText += `- ${cp.category} (${cp.itemCount} items, ${cp.favoriteCount} loved): Dominant genres are ${cp.topGenres.join(", ")}. Signal confidence is ${cp.confidence}.\n`;
            });
          }

          if (packet.contradictions.length > 0) {
            evidencePacketText += `\n[Identified Aesthetic Contradictions]\n`;
            packet.contradictions.forEach((c: any) => {
              evidencePacketText += `- ${c.title} (${c.confidence} confidence): ${c.description}\n`;
            });
          }

          if (packet.representativeFavorites.length > 0) {
            const cappedFavorites = packet.representativeFavorites.slice(0, 10);
            evidencePacketText += `\n[Representative Favorites (Sample)]\n- ${cappedFavorites.join("\n- ")}\n`;
          }
        } catch(e) {
          console.warn("Failed to build deterministic profile", e);
        }
      }

      const defaultFallback = `## Identity\nThe Quiet Observer\n\n## Dominant Index\nYour selections transcend standard algorithms, forming a cohesive, deeply personal web of aesthetics and narrative interests. You show a highly distinctive, intentional approach to the media you consume.\n\n## Takeaway\nYour taste spans multiple rich dimensions. Continue to follow your curiosity without worrying about the boundaries of conventional genres.\n\n## Deep Dive\nYou appreciate high-quality craftsmanship, varied emotional textures, and experiences that challenge the status quo. Your collection acts as a mirror to a highly curious mind. You are not just consuming content; you are archiving parts of your identity. You recognize the throughlines between the quiet acoustics of a certain album and the expansive cinematography of a favorite film. This reflection of your taste is beautifully yours.\n\n## Keywords\n- Curator\n- Resilient\n- Boundless\n- Aesthetic\n- Thoughtful`;

      let prompt = `You are Dilecti, an AI maintaining a user's taste profile. Your goal is to provide a highly stylized, structured markdown analysis of their tastes. Speak DIRECTLY to the user in the second person (like an incredibly perceptive friend).

CRITICAL RULES:
1. Speak DIRECTLY to the user.
2. Provide a true NARRATIVE about who they are as a person across all their interests. Do NOT make it sound like a PhD thesis in psychology. Avoid academic jargon, sterile psychological phrasing, and flowery word salad. Do not invent details about their personal life, daily routine, or stressors. Instead, deliver true narrative insights, drawing specific connections between their favorite items and genres, focusing purely on what their media tastes imply about their intellectual or aesthetic preferences. Make it eloquent, down-to-earth, and undeniably accurate.
3. NORMALIZED CROSS-DOMAIN MATH (TF-IDF STYLE): Do NOT let a large quantity of items in one category drown out smaller categories. Treat interests logically. If they have 100 pop songs but 5 historical epic movies, the "Historical Epic" thread gets a massive multiplier because it's specific. Find the hidden throughlines connecting their items.
4. ACTIONABLE & DIGESTIBLE VALUE: Every insight MUST be grounded in reality and come with an actionable takeaway.
5. Structure the output in Markdown with EXACTLY these H2 headings:
   ## Identity
   A punchy, relatable headline summarizing their core vibe.
   ## Dominant Index
   A 2-3 sentence analytical breakdown explaining the exact crossover of their tastes based on finding cross-category connections.
   ## Takeaway
   A 2-sentence actionable takeaway based on their insights.
   ## Deep Dive
   A deep, multi-paragraph narrative (3-4 paragraphs) describing their core aesthetic, personality threads, and hidden connections across their collection.
   ## Keywords
   A bulleted list of 5 precise, beautiful keywords that describe them.
6. If you have NO data, just output plain text: "You haven't added any favorites yet! Start rating items and I'll learn exactly what you love."`;

      // Ignore previous garbage state
      const isBadState = currentUnderstanding && (currentUnderstanding.includes("Dilecti notes") || currentUnderstanding.includes("no saved items") || currentUnderstanding.includes("Dilecti requires access"));
      
      if (currentUnderstanding && !isBadState) {
        prompt += `\nCurrent Profile Base: "${currentUnderstanding}"\n`;
      }

      if (evidencePacketText && evidencePacketText.length > 0) {
        prompt += `\nUser's Taste Evidence Packet (CRITICAL: You MUST use these pre-calculated deterministic signals to infer their taste):\n${evidencePacketText}\n`;
      } else {
        prompt += `\nUser's Saved Items & Ratings: None yet, but assume they are an explorer eager to discover new tastes. Welcome them warmly.\n`;
      }

      if (demographicsContext && Object.keys(demographicsContext).length > 0) {
        prompt += `\nADDITIONAL CONTEXT: The user's demographics are roughly: ${JSON.stringify(demographicsContext)}. STRICT REQUIREMENT: You must NEVER explicitly reference their age, location, gender, work from home status, family life, or any other demographic data points directly in the text (e.g., NEVER say "As someone living in the suburbs" or "Given your family responsibilities"). Do NOT make sweeping assumptions or psychological leaps about their daily life, routine, or personal stressors based on this data. Instead, use this strictly in the background to subtly inform your tone and cultural references.\n`;
      }

      if (userInput) {
        if (userInput.toLowerCase().includes("generate my first taste profile")) {
          prompt += `\n(Ignore this specific conversational text, just generate the profile based on their items. Ensure it's freshly written.)`;
        } else {
          prompt += `\nThe user just provided this conversational feedback to update their profile: "${userInput}". You MUST deeply rewrite and update the profile summary from its current state to uniquely incorporate this new information. CRITICAL: Do NOT simply repeat or quote the user's feedback back to them. Internalize their notes (e.g., if they say they haven't seen a movie, don't mention it as a favorite) and adjust your analysis accordingly without ever explicitly saying that they told you so. Ensure it reads as an updated, cohesive analysis.`;
        }
      }

      let profileData: any = {};
      if (userId) {
          try {
              const doc = await adminDb.collection("users").doc(userId).get();
              if (doc.exists) {
                  profileData = doc.data();
              }
          } catch(e) {}
      }

      // If library size hasn't changed much and user hasn't explicitly chatted, return cached profile
      if (!userInput && profileData.cachedTasteNarrative && Math.abs(libraryToUse.length - (profileData.narrativeItemCount || 0)) < 5) {
          return res.json({ newUnderstanding: profileData.cachedTasteNarrative });
      }

      try {
        if (!apiKey) throw new Error("No Gemini API key available.");
        const { routeModelTask } = await import("../services/ai/modelRouter");
        const responseText = await routeModelTask({
            taskType: 'premium_writer',
            inputPayload: { prompt },
            cacheKey: userId
        });
        
        const finalNarrative = responseText?.trim() || currentUnderstanding;

        if (userId) {
            try {
                await adminDb.collection("users").doc(userId).set({
                    cachedTasteNarrative: finalNarrative,
                    narrativeItemCount: libraryToUse.length
                }, { merge: true });
            } catch(e) {}
        }

        res.json({
          newUnderstanding: finalNarrative,
        });
      } catch (e: any) {
        console.warn("Update Understanding Error, trying Groq:", e?.message || e);
        try {
          const groqResponse = await fetchGroqFallback(prompt, false);
          res.json({
            newUnderstanding: groqResponse?.trim() || currentUnderstanding || defaultFallback,
          });
        } catch (groqErr: any) {
          console.warn("Groq fallback failed:", groqErr?.message || groqErr);
          return res.json({
            newUnderstanding: defaultFallback
          });
        }
      }
    } catch (e: any) {
      console.warn("Update Understanding Fatal Error:", e?.message || e);
      // fallback to mock data in case of complete failure
      const fallback = `## Identity\nThe Quiet Observer\n\n## Dominant Index\nYour selections transcend standard algorithms, forming a cohesive, deeply personal web of aesthetics and narrative interests. You show a highly distinctive, intentional approach to the media you consume.\n\n## Takeaway\nYour taste spans multiple rich dimensions. Continue to follow your curiosity without worrying about the boundaries of conventional genres.\n\n## Deep Dive\nYou appreciate high-quality craftsmanship, varied emotional textures, and experiences that challenge the status quo. Your collection acts as a mirror to a highly curious mind. You are not just consuming content; you are archiving parts of your identity. You recognize the throughlines between the quiet acoustics of a certain album and the expansive cinematography of a favorite film. This reflection of your taste is beautifully yours.\n\n## Keywords\n- Curator\n- Resilient\n- Boundless\n- Aesthetic\n- Thoughtful`;
      return res.json({
        newUnderstanding: fallback
      });
    }
  });

aiRouter.post("/api/fill-missing-images", async (req, res) => {
    try {
      const { items, locationContext } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.json({ updatedItems: [] });
      }

      const promises = items.map(async (item: any) => {
        const coverUrl = await fetchImageFor(
          item.title,
          item.subtitle || "",
          item.category || "",
          false,
          5000,
          locationContext || undefined
        );
        return { id: item.id, coverUrl: coverUrl || "" };
      });

      const updatedItems = await Promise.all(promises);
      res.json({ updatedItems: updatedItems.filter((u) => u.coverUrl !== "") });
    } catch (error: any) {
      console.warn("Fill Missing Images Error:", error?.message || error);
      res.status(500).json({ error: "Failed to fill images" });
    }
  });

  aiRouter.post("/api/enrich-item", async (req, res) => {
    try {
      const { items } = req.body;
      let userApiKey = req.headers['x-user-api-key'] as string;
      if (userApiKey === "null" || userApiKey === "undefined") userApiKey = "";
      const apiKey = (userApiKey as string) || process.env.GEMINI_API_KEY;
  
      if (!apiKey || !items || !Array.isArray(items)) {
        return res.json({ enrichedItems: [] });
      }
      
      const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);
  
      const promises = items.map(async (item: any) => {
        const systemPrompt = `You are a cultural data enrichment engine. Extract meaningful metadata for this ${item.category}.
Title: ${item.title}
Subtitle/Creator: ${item.subtitle || ''}

Return a STRICT JSON object with these exactly 2 arrays:
- "genres": (MAX 5 strings). High-level genres/categories. For media (movies, books, tv), choose from a normalized list like Comedy, Action, Drama, Horror, Romance, Sci-Fi, Fantasy, Thriller, Documentary, Non-Fiction, Biographies, History, Mystery.
  IMPORTANT STRICT RULES:
  - For "games", DO NOT use "Non-Fiction" or "Drama"; use actual game genres (e.g. "Strategy", "RPG", "Board Game").
  - For "places", DO NOT use book/movie genres like "Non-Fiction", "Fiction", "Drama", or "Romance". Instead use geographic or architectural types (e.g., "National Park", "Museum", "City", "Landmark", "Outdoors", "Travel", "Nature").
  - For "events", DO NOT use "Non-Fiction" or "Drama". Instead use event types (e.g., "Sports Event", "Music Festival", "Live Performance", "Conference", "Comedy Show").
  - For "products" and "food", DO NOT use "Non-Fiction" or "Fiction".
- "keywords": (MAX 10 strings). Extract specific tropes, notable cast/creators, decades (e.g., "1990s"), broad themes, subgenres, or aesthetics. Focus on highly recognizable, common tags (e.g., "Coming of Age", "Cyberpunk", "Tom Hardy", "Heist"). For places, use descriptive travel vibes or aesthetics (e.g., "Tropical", "Historical Architecture", "Wilderness"). For events, use atmosphere or cultural impact (e.g., "High-energy", "Tailgating", "Acoustic"). For food/restaurants, avoid "Dining" on its own; use "Fine Dining", "Casual", "Street Food", "Cozy", or specific cuisines. For games, use specific mechanics (e.g. "Deckbuilder", "Co-op", "Open World").

Only return the raw JSON object. Do not wrap in markdown blocks.`;
  
        try {
          const response = await generateContentWithRetry(ai, {
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          }, { scope: 'global', ttlDays: 30 });
          
          const textResponse = response.text || "{}";
          const match = textResponse.match(/\{[\s\S]*\}/);
          const cleanJson = match ? match[0] : "{}";
          
          return { id: item.id, metadata: JSON.parse(cleanJson) };
        } catch (e) {
          return { id: item.id, metadata: { genres: [], keywords: [] } };
        }
      });
  
      const enrichedItems = await Promise.all(promises);
      res.json({ enrichedItems });
    } catch (error: any) {
      console.warn("Enrich Items Error:", error?.message || error);
      res.status(500).json({ error: "Failed to enrich items" });
    }
  });

  
aiRouter.post("/api/backfill-release-years", async (req, res) => {
    try {
      const { items } = req.body;
      let userApiKey = req.headers['x-user-api-key'] as string;
      if (userApiKey === "null" || userApiKey === "undefined") userApiKey = "";
      const apiKey = (userApiKey as string) || process.env.GEMINI_API_KEY;

      if (!apiKey || !items || !Array.isArray(items)) {
        return res.json({ backfilledItems: [] });
      }

      const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);

      const itemsListStr = items.map((item: any) => 
        `ID: ${item.id} | Title: ${item.title} | Subtitle: ${item.subtitle || ''} | Category: ${item.category}`
      ).join("\n");

      const systemPrompt = `You are a media database. Provide the original release year for the following list of items.

Items:
${itemsListStr}

Return a STRICT JSON array of objects. Do NOT return anything else. Each object must have these exactly 2 keys:
- "id": (String) The exact ID provided.
- "releaseYear": (Number or null). The 4-digit original release year of the item (e.g. 1999). Return null if it cannot be found or is not applicable.

Only return the raw JSON array. Do not wrap in markdown blocks.`;

      try {
        const response = await generateContentWithRetry(ai, {
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          config: {
            responseMimeType: "application/json"
          }
        }, { scope: 'global', ttlDays: 30 });

        const textResponse = response.text || "[]";
        
        let parsedArr = [];
        try {
            parsedArr = JSON.parse(textResponse);
        } catch(e) {
            const match = textResponse.match(/\[[\s\S]*\]/);
            const cleanJson = match ? match[0] : "[]";
            parsedArr = JSON.parse(cleanJson);
        }

        const backfilledItems = parsedArr.map((p: any) => ({
          id: p.id,
          releaseYear: p.releaseYear
        }));
        
        res.json({ backfilledItems });
      } catch (e) {
        console.warn("Batch release year parsing failed, returning empty", e);
        res.json({ backfilledItems: [] });
      }
    } catch (error: any) {
      console.warn("Backfill release year Error:", error?.message || error);
      res.json({ backfilledItems: [] });
    }
});

  aiRouter.post("/api/backfill-metrics", async (req, res) => {
    try {
      const { items } = req.body;
      let userApiKey = req.headers['x-user-api-key'] as string;
      if (userApiKey === "null" || userApiKey === "undefined") userApiKey = "";
      const apiKey = (userApiKey as string) || process.env.GEMINI_API_KEY;

      if (!apiKey || !items || !Array.isArray(items)) {
        return res.json({ backfilledItems: [] });
      }

      const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);

      const itemsListStr = items.map((item: any) => 
        `ID: ${item.id} | Title: ${item.title} | Subtitle: ${item.subtitle || ''} | Category: ${item.category}`
      ).join("\n");

      const systemPrompt = `You are a media database. Provide the approximate runtime (in minutes) and/or page count for the following list of items.

Items:
${itemsListStr}

Return a STRICT JSON array of objects. Do NOT return anything else. Each object must have these exactly 3 keys:
- "id": (String) The exact ID provided.
- "runtime": (Number or null). The approximate length in minutes if it is a movie or TV show.
- "pages": (Number or null). The approximate page count if it is a book.

Only return the raw JSON array. Do not wrap in markdown blocks.`;

      try {
        const response = await generateContentWithRetry(ai, {
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        }, { scope: 'global', ttlDays: 30 });

        const textResponse = response.text || "[]";
        const match = textResponse.match(/\[[\s\S]*\]/);
        const cleanJson = match ? match[0] : "[]";
        const parsedArr = JSON.parse(cleanJson);

        const backfilledItems = parsedArr.map((p: any) => ({
          id: p.id,
          metrics: { runtime: p.runtime, pages: p.pages }
        }));
        
        res.json({ backfilledItems });
      } catch (e) {
        console.warn("Batch metrics parsing failed, returning empty", e);
        res.json({ backfilledItems: [] });
      }

    } catch (error: any) {
      console.warn("Backfill Metrics Error:", error?.message || error);
      res.status(500).json({ error: "Failed to backfill metrics" });
    }
  });

aiRouter.post("/api/taste-analysis", async (req, res) => {
    try {
      const { items, type } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ text: "Unable to analyze taste without an API key." });
      }
      const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);
      
      const limitedItems = (items || []).slice(0, 100).map((i: any) => `${i.title} (${i.category}) - Rating: ${i.rating} - Status: ${i.status}`).join('\n');
      
      let prompt = '';
      if (type === 'roast') {
          prompt = `You are a sarcastic, slightly mean but funny cultural critic. Roast the following user's taste based on this list of items in their library:\n\n${limitedItems}\n\nKeep it to 2-3 sentences max. Be punchy and humorous. Do not use markdown.`;
      } else {
          prompt = `You are a cultural analyst. Provide an "Era Shift Analysis" based on the following items in a user's library, looking at the release years (if apparent) or the types of media, and how their taste might be evolving or what eras they are fixated on:\n\n${limitedItems}\n\nKeep it to 2-3 sentences. Be insightful. Do not use markdown.`;
      }
      
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }, { scope: 'global', ttlDays: 1 });
      
      res.json({ text: response.text || "I couldn't analyze this right now." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to analyze' });
    }
});

aiRouter.post("/api/ask-for-ideas", async (req, res) => {
  try {
    const { prompt, context, items } = req.body;
    let userApiKey = req.headers['x-user-api-key'] as string;
    if (userApiKey === "null" || userApiKey === "undefined") userApiKey = "";
    const apiKey = (userApiKey as string) || process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(401).json({ error: "Missing API Key" });
    const ai = getAIClient(apiKey, typeof req !== 'undefined' ? req.headers['x-user-ai-provider'] : undefined);

    let itemsSummary = "";
    if (items && Array.isArray(items)) {
        // Group by category to save tokens
        const counts: Record<string, number> = {};
        const favorites: string[] = [];
        const hated: string[] = [];

        items.forEach((i: any) => {
            counts[i.category] = (counts[i.category] || 0) + 1;
            if (i.rating >= 4 || i.reaction === "loved") favorites.push(`${i.title} (${i.category})`);
            if (i.rating > 0 && i.rating <= 2 || i.reaction === "hated") hated.push(`${i.title} (${i.category})`);
        });

        itemsSummary = `User's library counts: ${Object.entries(counts).map(([k, v]) => `${v} ${k}s`).join(", ")}.\n`;
        if (favorites.length > 0) itemsSummary += `Loved items: ${favorites.slice(0, 10).join(", ")}.\n`;
        if (hated.length > 0) itemsSummary += `Disliked items: ${hated.slice(0, 10).join(", ")}.\n`;
    }

    const { getEmbedding } = await import("../utils/embeddings");
    const { db } = await import("../db");
    const { globalItems } = await import("../db/schema");
    const { sql } = await import("drizzle-orm");

    const queryVector = await getEmbedding(prompt);
    if (!queryVector || queryVector.length === 0) return res.json({ plans: [], candidatesCount: POPULAR_FALLBACK.length, rankedCandidates: POPULAR_FALLBACK });
    const similarity = sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(queryVector)}::vector)`;
    
    const candidateMatches = await db.select({
        id: globalItems.id,
        title: globalItems.title,
        subtitle: globalItems.subtitle,
        description: globalItems.description,
        category: globalItems.category,
        data: globalItems.data,
        similarity
    })
    .from(globalItems)
    .orderBy(sql`${similarity} DESC`)
    .limit(20);

    const candidatesJson = JSON.stringify(candidateMatches.map(m => ({
        id: m.id,
        title: m.title,
        subtitle: m.subtitle,
        category: m.category,
        description: m.description,
        coverUrl: (m.data as any)?.coverUrl || (m.data as any)?.imageUrl || (m.data as any)?.background_image || ""
    })));

    const aiPrompt = `You are Dilecti, a highly intelligent taste curator.
User Request: "${prompt}"
Context about the User:
${context || "No context provided."}
${itemsSummary}

Here is a list of candidate items from our database that match the semantic meaning of the user's request:
${candidatesJson}

Pick exactly 3 items from the candidates list that best fit the user's request and taste profile.
Do NOT invent new items. You MUST pick from the candidates list provided.
Return strictly a JSON array of objects: [{ "id": "string", "title": "string", "subtitle": "creator/brand", "category": "book/movie/tv/game/food/music/places/product/other", "tags": ["tag1", "tag2"], "reason": "A 2-sentence highly specific reason why this fits their exact request and taste profile." }]`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: aiPrompt,
    }, { scope: 'global', ttlDays: 1 });

    const text = response.text || "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Invalid format");
    
    let parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) parsed = [];
    
    // Attach covers from DB
    parsed = parsed.map((p: any) => {
       const dbMatch = candidateMatches.find(m => m.id === p.id || m.title === p.title);
       return {
           ...p,
           coverUrl: (dbMatch?.data as any)?.coverUrl || (dbMatch?.data as any)?.imageUrl || (dbMatch?.data as any)?.background_image || ""
       };
    });

    res.json(parsed);
  } catch (e: any) {
    console.error("Ask for ideas error:", e);
    res.json(POPULAR_FALLBACK);
  }
});

aiRouter.post("/api/universal-search-ai", async (req, res) => {
  try {
    const { query, category } = req.body;
    if (!query) return res.json([]);
    
    const { db } = await import("../db");
    const { globalItems } = await import("../db/schema");
    const { sql } = await import("drizzle-orm");
    const { getEmbedding } = await import("../utils/embeddings");
    
    // Lightning-fast vector search for "AI-driven search" replacement
    const queryVector = await getEmbedding(query);
    if (!queryVector || queryVector.length === 0) return res.json([]);
    let baseQuery: any = db.select({
        id: globalItems.id,
        title: globalItems.title,
        subtitle: globalItems.subtitle,
        description: globalItems.description,
        category: globalItems.category,
        data: globalItems.data,
        similarity: sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(queryVector)}::vector)`
    }).from(globalItems);
    
    if (category && category !== "any" && category !== "custom" && category !== "creator") {
        baseQuery = baseQuery.where(sql`${globalItems.category} = ${category === "movie" || category === "tv" ? "watch" : category === "game" ? "games" : category === "event" ? "events" : category}`);
    }
    
    const matches = await baseQuery.orderBy(sql`1 - (${globalItems.embedding} <=> ${JSON.stringify(queryVector)}::vector) DESC`).limit(5);
    
    const finalMatches = matches.map((m: any) => ({
        id: m.id,
        title: m.title,
        subtitle: m.subtitle,
        description: m.description,
        category: m.category,
        coverUrl: (m.data as any)?.coverUrl || (m.data as any)?.imageUrl || (m.data as any)?.background_image || "",
        sourceAttribution: "Owned Catalog Match"
    }));
    
    res.json(finalMatches.length > 0 ? finalMatches : []);
  } catch (err) {
    console.error("Universal search AI (Owned Catalog) failed", err);
    res.json([]);
  }
});
