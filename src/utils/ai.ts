import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { globalSystemStats } from "./stats";
import { fetchGroqFallback } from "./groqFallback";
import { fetchOpenRouterFallback } from "./openrouterFallback";
import crypto from "crypto";
import { getCachedResponse, setCachedResponse } from "./llmCache";

export async function generateContentWithRetry(
  ai: any,
  request: GenerateContentParameters,
  cacheConfig?: { scope: 'global' | 'user'; uid?: string; ttlDays?: number }
): Promise<any> {
  let cacheKey: string | null = null;
  let cacheUid: string | 'global' = 'global';

  if (cacheConfig) {
    const promptStr = JSON.stringify(request.contents) + (request.config?.systemInstruction ? JSON.stringify(request.config.systemInstruction) : "");
    const modelParams = `${request.model}_${request.config?.temperature || 0.7}_${request.config?.responseMimeType || 'text'}`;
    const hash = crypto.createHash('sha256').update(promptStr + modelParams).digest('hex');
    cacheKey = `llm_${hash}`;
    cacheUid = cacheConfig.scope === 'user' && cacheConfig.uid ? cacheConfig.uid : 'global';
    
    const cached = await getCachedResponse(cacheUid, cacheKey);
    if (cached && cached.text) {
      globalSystemStats.cacheHits++;
      globalSystemStats.tokensSaved += cached.usageMetadata?.totalTokenCount || 0;
      return { text: cached.text, usageMetadata: cached.usageMetadata };
    }
  }

  globalSystemStats.geminiCalls++;
  
  // Respect if the caller specifically wants pro, otherwise fallback strategy
  const requestedModel = request.model;
  const models = requestedModel === "gemini-2.5-pro" ? ["gemini-2.5-pro", "gemini-2.5-flash"] : ["gemini-2.5-flash", "gemini-2.5-pro"];
  
  for (let i = 0; i < models.length; i++) {
    try {
      request.model = models[i];
      const response = await ai.models.generateContent(request);
      
      const usage = response.usageMetadata;
      if (usage && usage.totalTokenCount) {
         globalSystemStats.tokensUsed += usage.totalTokenCount;
         
         // Assuming roughly $0.35 per 1M tokens blended avg for flash
         const cost = (usage.totalTokenCount / 1_000_000) * 0.35;
         globalSystemStats.costIncurred += cost;
         
         const err = new Error();
         let functionName = 'unknown';
         if (err.stack) {
             const callerLine = err.stack.split('\n')[2];
             if (callerLine) {
                 const match = callerLine.match(/at\s+(.*?)\s+\(/);
                 if (match && match[1]) functionName = match[1];
             }
         }
         
         if (!globalSystemStats.functionTokens[functionName]) {
             globalSystemStats.functionTokens[functionName] = { calls: 0, tokens: 0 };
         }
         globalSystemStats.functionTokens[functionName].calls++;
         globalSystemStats.functionTokens[functionName].tokens += usage.totalTokenCount;
      }
      
      if (cacheKey) {
        await setCachedResponse(cacheUid, cacheKey, { text: response.text, usageMetadata: response.usageMetadata }, cacheConfig?.ttlDays || (cacheConfig?.scope === 'user' ? 1 : 7));
      }
      return response;
    } catch (e: any) {
      if (e?.message?.includes("OpenAI API Error")) {
          throw e;
      }
      
      const isOverloaded =
        e?.message?.includes("503") ||
        e?.status === "UNAVAILABLE" ||
        e?.message?.includes("high demand") ||
        e?.message?.includes("temporarily overloaded") ||
        String(e?.status) === "503" ||
        e?.message?.includes("429") ||
        String(e?.status) === "429" ||
        e?.message?.includes("404") ||
        String(e?.status) === "NOT_FOUND" ||
        e?.status === "NOT_FOUND";
        
      if (i === models.length - 1) {
        console.warn(`Gemini API unavailable (${e?.status || "Unknown"}). Falling back to Groq...`);
        try {
            let promptStr = "";
            if (typeof request.contents === 'string') {
                promptStr = request.contents;
            } else if (Array.isArray(request.contents)) {
                for (const c of request.contents) {
                    if ((c as any).parts) {
                        for (const p of (c as any).parts) {
                            if (p.text) promptStr += p.text + "\n";
                        }
                    } else if (typeof c === 'string') {
                        promptStr += c + "\n";
                    }
                }
            } else if (request.contents && (request.contents as any).parts) {
                for (const p of (request.contents as any).parts) {
                    if (p.text) promptStr += p.text + "\n";
                }
            } else if (request.contents && typeof request.contents === 'object') {
                 promptStr = JSON.stringify(request.contents);
            }
            
            const reqAny = request as any;
            if (reqAny.systemInstruction) {
                let sysStr = "";
                if (typeof reqAny.systemInstruction === 'string') {
                    sysStr = reqAny.systemInstruction;
                } else if (reqAny.systemInstruction.parts) {
                    for (const p of reqAny.systemInstruction.parts) {
                        if (p.text) sysStr += p.text + "\n";
                    }
                }
                if (sysStr) {
                   promptStr = "SYSTEM INSTRUCTION: " + sysStr + "\n\nUSER PROMPT: " + promptStr;
                }
            }

            const isJson = reqAny.generationConfig?.responseMimeType === "application/json";
            if (isJson) {
                promptStr += "\n\nCRITICAL: YOU MUST OUTPUT VALID JSON MATCHING THE REQUESTED SCHEMA. DO NOT OUTPUT ANY OTHER TEXT OR MARKDOWN. JUST RAW JSON.";
            }
            
            let text = "";
            if (process.env.OPENROUTER_API_KEY) {
                try {
                    text = await fetchOpenRouterFallback(promptStr, isJson);
                } catch (openRouterErr) {
                    console.warn("OpenRouter fallback failed, trying Groq:", openRouterErr);
                    text = await fetchGroqFallback(promptStr, isJson);
                }
            } else {
                text = await fetchGroqFallback(promptStr, isJson);
            }
            const fallbackResponse = {
                text: text,
                functionCalls: [],
                usageMetadata: {
                    promptTokenCount: 0,
                    candidatesTokenCount: 0,
                    totalTokenCount: 0
                }
            } as any;
            if (cacheKey) {
              await setCachedResponse(cacheUid, cacheKey, { text: text, usageMetadata: fallbackResponse.usageMetadata }, cacheConfig?.ttlDays || (cacheConfig?.scope === 'user' ? 1 : 7));
            }
            return fallbackResponse;
        } catch (groqErr: any) {
            console.warn("Groq fallback failed too:", groqErr.message);
            throw new Error(e?.message || "Failed to generate content");
        }
      }
      
      if (isOverloaded) {
        console.log(`Model ${request.model} overloaded, falling back to next...`);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      // If it's a hard error, we continue the loop and it will hit the fallback on the last iteration
    }
  }
  throw new Error("unreachable");
}

const imageCache = new Map<string, string>();

export async function fetchImageFor(
  title: string,
  subtitle: string,
  category: string,
  skipSubtitleFallback = false,
  timeoutMs = 1000,
  locationContext?: string
): Promise<string> {
  if (!title) return "";
  const cacheKey = `${title.toLowerCase()}_${subtitle?.toLowerCase() || ""}_${category?.toLowerCase() || ""}_${skipSubtitleFallback}_${timeoutMs}_${locationContext || ""}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  // 1. Check globalItems Postgres table first
  try {
     const { db } = await import("../db");
     const { globalItems } = await import("../db/schema");
     const { sql, and, eq } = await import("drizzle-orm");
     const matches = await db.select({ id: globalItems.id, data: globalItems.data })
                             .from(globalItems)
                             .where(and(
                               eq(sql`lower(${globalItems.title})`, title.toLowerCase()),
                               eq(globalItems.category, category)
                             ))
                             .limit(1);
     if (matches.length > 0) {
         const existingUrl = (matches[0].data as any)?.coverUrl;
         if (existingUrl && !existingUrl.includes("unsplash.com")) {
             imageCache.set(cacheKey, existingUrl);
             return existingUrl;
         }
     }
  } catch(e) {
     console.warn("Failed to check globalItems for image cache", e);
  }

  // 2. Fetch it if not found
  const result = await fetchImageFor_Internal(title, subtitle, category, skipSubtitleFallback, timeoutMs, locationContext);
  imageCache.set(cacheKey, result);

  // 3. Save it permanently to globalItems if we found a real image
  if (result && !result.includes("unsplash.com")) {
     try {
         const { db } = await import("../db");
         const { globalItems } = await import("../db/schema");
         const { sql, and, eq } = await import("drizzle-orm");
         const matches = await db.select({ id: globalItems.id, data: globalItems.data })
                                 .from(globalItems)
                                 .where(and(
                                   eq(sql`lower(${globalItems.title})`, title.toLowerCase()),
                                   eq(globalItems.category, category)
                                 ))
                                 .limit(1);
         if (matches.length > 0) {
             const m = matches[0];
             const newData = { ...(m.data as any), coverUrl: result };
             await db.update(globalItems).set({ data: newData }).where(eq(globalItems.id, m.id));
         }
     } catch(e) {
         console.warn("Failed to save resolved image to globalItems", e);
     }
  }

  return result;
}

export async function fetchImageFor_Internal(
  title: string,
  subtitle: string,
  category: string,
  skipSubtitleFallback = false,
  timeoutMs = 1000,
  locationContext?: string
): Promise<string> {
  if (!title) return "";
  let rawQuery = title.replace(/[^\w\s]/g, "");
  let rawFullQuery = skipSubtitleFallback
    ? rawQuery
    : `${title} ${subtitle || ""}`.trim();
  let queryStr = encodeURIComponent(rawQuery);
  let fullQueryStr = encodeURIComponent(rawFullQuery);

  try {
    const cseKey =
      process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
    const cseCx = process.env.GOOGLE_CSE_CX || process.env.GOOGLE_SEARCH_CX;
    const tmdbKey = process.env.TMDB_API_KEY;
    const rawgKey = process.env.RAWG_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

    // 1. Precise API by category
    if (
      category === "watch" ||
      category === "movie" ||
      category === "tv" ||
      category === "movies"
    ) {
      if (tmdbKey) {
        try {
          const searchType = category === "movie" || category === "movies" ? "movie" : category === "tv" ? "tv" : "multi";
          const tmdbRes = await fetch(
            `https://api.themoviedb.org/3/search/${searchType}?query=${fullQueryStr}&api_key=${tmdbKey}&language=en-US&page=1&include_adult=false`,
            { signal: AbortSignal.timeout(timeoutMs) }
          );
          const tmdbData = await tmdbRes.json().catch(() => ({}));
          // Filter by exact title match if there are multiple results, otherwise take first
          const exactMatch = tmdbData.results?.find((r: any) => (r.title || r.name)?.toLowerCase() === title.toLowerCase());
          const bestResult = exactMatch || tmdbData.results?.[0];
          
          if (bestResult?.poster_path) {
            return `https://image.tmdb.org/t/p/w600_and_h900_bestv2${bestResult.poster_path}`;
          }
        } catch (e) {}
      }
      // Fallback to iTunes
      try {
        const media = (category === "tv" || category === "watch") ? "tvShow" : "movie";
        const itunesRes = await fetch(
          `https://itunes.apple.com/search?term=${fullQueryStr}&media=${media}&limit=5`,
          { signal: AbortSignal.timeout(timeoutMs) }
        );
        const itunesData = await itunesRes.json().catch(() => ({}));
        const best = itunesData.results?.find((r: any) => r.artworkUrl100 || r.artworkUrl600);
        if (best) {
          return best.artworkUrl100.replace(
            /100x100[a-zA-Z0-9]*/,
            "600x600bb",
          );
        }
      } catch (e) {}
    } else if (category === "music") {
      try {
        const itunesRes = await fetch(
          `https://itunes.apple.com/search?term=${fullQueryStr}&media=music&limit=5`,
          { signal: AbortSignal.timeout(timeoutMs) }
        );
        const itunesData = await itunesRes.json().catch(() => ({}));
        const best = itunesData.results?.find((r: any) => r.artworkUrl100 || r.artworkUrl600);
        if (best) {
          return best.artworkUrl100.replace(
            /100x100[a-zA-Z0-9]*/,
            "600x600bb",
          );
        }
      } catch (e) {}
    } else if (category === "games" || category === "game") {
      const isBoardGame = title.toLowerCase().includes("board game") || subtitle.toLowerCase().includes("board game");
      if (rawgKey && !isBoardGame) {
        try {
          const rawgRes = await fetch(
            `https://api.rawg.io/api/games?key=${rawgKey}&search=${fullQueryStr}&page_size=1`,
            { signal: AbortSignal.timeout(timeoutMs) }
          );
          const rawgData = await rawgRes.json().catch(() => ({}));
          if (rawgData.results?.[0]?.background_image) {
            return rawgData.results[0].background_image;
          }
        } catch (e) {}
      }
      // Fallback to iTunes
      if (!isBoardGame) {
         try {
           const itunesRes = await fetch(
             `https://itunes.apple.com/search?term=${fullQueryStr}&entity=software&limit=1`,
             { signal: AbortSignal.timeout(timeoutMs) }
           );
           const itunesData = await itunesRes.json().catch(() => ({}));
           if (itunesData.results?.[0]?.artworkUrl512) {
             return itunesData.results[0].artworkUrl512;
           }
         } catch (e) {}
      }
    } else if (category === "books" || category === "book") {
      try {
        const booksRes = await fetch(
          `https://openlibrary.org/search.json?q=${fullQueryStr}&limit=1`,
          { signal: AbortSignal.timeout(timeoutMs) }
        );
        const booksData = await booksRes.json().catch(() => ({}));
        if (booksData.docs?.[0]?.cover_i) {
          return `https://covers.openlibrary.org/b/id/${booksData.docs[0].cover_i}-M.jpg`;
        }
      } catch (e) {}
    } else if (category === "food" || category === "places" || category === "place") {
      if (mapsKey) {
        try {
          const res = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": mapsKey,
              "X-Goog-FieldMask": "places.displayName,places.photos"
            },
            body: JSON.stringify({ 
              textQuery: (() => {
                  let isGlobal = false;
                  if (category === "places" || category === "place") {
                      const globals = ["louvre", "yellowstone", "paris", "tokyo", "eiffel", "museum", "national park", "disney", "statue", "canyon", "london", "rome", "new york", "taj mahal", "pyramid"];
                      const lower = rawFullQuery.toLowerCase();
                      if (globals.some(g => lower.includes(g))) isGlobal = true;
                  }
                  if (locationContext && !isGlobal && (category === "food" || category === "places" || category === "place")) {
                      return `${rawFullQuery} in ${locationContext}`;
                  }
                  return rawFullQuery;
              })(), 
              maxResultCount: 1 
            })
          });
          const data = await res.json().catch(() => ({}));
          if (data.places && data.places.length > 0 && data.places[0].photos && data.places[0].photos.length > 0) {
            const photoName = data.places[0].photos[0].name;
            const photoRes = await fetch(`https://places.googleapis.com/v1/${photoName}/media?key=${mapsKey}&maxHeightPx=600&maxWidthPx=600&skipHttpRedirect=true`);
            if (photoRes.ok) {
                const photoData = await photoRes.json();
                if (photoData && photoData.photoUri) {
                    return photoData.photoUri;
                }
            }
          }
        } catch (e) {}
      }
    }

    // 2. Google Custom Search fallback (if configured)
    if (cseKey && cseCx) {
      try {
        const fetchRes = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${cseKey}&cx=${cseCx}&searchType=image&q=${fullQueryStr}&num=1`,
          { signal: AbortSignal.timeout(timeoutMs) }
        );
        const data = await fetchRes.json().catch(() => ({}));
        if (data.items && data.items.length > 0) {
          return data.items[0].link;
        }
      } catch (e) {}
    }

    // 3. Generic Wikipedia fallback
    if (category !== "food") {
      try {
        const wikiSearchQuery =
          category === "games" || category === "game"
            ? `${rawFullQuery} video game`
            : ["movie", "tv", "watch", "movies"].includes(category)
              ? `${rawFullQuery} film television`
              : rawFullQuery;
        const wikiRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(wikiSearchQuery)}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json`,
          { 
            signal: AbortSignal.timeout(timeoutMs),
            headers: {
              "User-Agent": "DilectiApp/1.0"
            }
          }
        );
        const wikiData = await wikiRes.json().catch(() => ({}));
        if (wikiData?.query?.pages) {
          const pages: any[] = Object.values(wikiData.query.pages);
          if (pages.length > 0 && pages[0].thumbnail?.source) {
            return pages[0].thumbnail.source;
          }
        }
      } catch (e) {}
    }
  } catch (error) {
    console.warn("fetchImageFor Error:", error);
  }

  // If it failed and we haven't tried without subtitle, try without subtitle
  if (!skipSubtitleFallback && subtitle) {
    return await fetchImageFor(title, "", category, true, timeoutMs);
  }

  // Fallback to a category-specific static aesthetic if nothing is found (guarantees no missing images)
  const fallbacks: Record<string, string> = {
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
  return fallbacks[category?.toLowerCase()] || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop";
}


export function buildQuantitativeTasteStats(items: any[], userContext?: any, friendContext?: any, previousProfileMeta?: any) {
  const totalSaved = items.length;
  const completed = items.filter(i => ['completed', 'read', 'watched', 'listened', 'tried'].includes(i.status));
  const favorites = items.filter(i => i.reaction === 'love');
  const aspirational = items.filter(i => ['up-next', 'planning', 'want-to-try', 'saved'].includes(i.status));

  // Count categories
  const catCount = items.reduce((acc, i) => {
    const cat = i.category || 'unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const categoryDistribution = Object.entries(catCount).map(([cat, count]) => ({
    label: cat,
    count: count as number,
    total: totalSaved,
    percentage: Math.round(((count as number) / totalSaved) * 100),
    category: cat
  }));

  // Generic counter helper
  const getTop = (arr: any[], list: string[], item: any, sourceLimit = 5) => {
    list.slice(0, sourceLimit).forEach(g => {
        if (!g) return;
        const exists = arr.find(x => x.label === g);
        if (exists) {
            exists.count++;
            if (!exists.evidence.includes(item.title) && exists.evidence.length < 5) exists.evidence.push(item.title);
        } else {
            arr.push({ label: g, count: 1, evidence: [item.title], total: 0, percentage: 0 });
        }
    });
  };

  const topGenres: any[] = [];
  const topPeople: any[] = [];
  const topPlatforms: any[] = [];
  const topAspirationalGenres: any[] = [];
  const releaseDecades: Record<string, number> = {};
  let totalReviewWords = 0;
  let reviewsCount = 0;

  items.forEach(i => {
      // Decades
      if (i.releaseYear && !isNaN(i.releaseYear)) {
          const decade = Math.floor(i.releaseYear / 10) * 10;
          if (decade > 1900 && decade <= new Date().getFullYear()) {
             releaseDecades[`${decade}s`] = (releaseDecades[`${decade}s`] || 0) + 1;
          }
      }
      // Review length
      if (i.review) {
          totalReviewWords += i.review.split(' ').length;
          reviewsCount++;
      }
      
      // Aspirational Genres
      if (aspirational.includes(i) && i.metadata?.genres) {
          getTop(topAspirationalGenres, i.metadata.genres, i);
      }
  });

  favorites.forEach(i => {
      if (i.metadata?.genres) getTop(topGenres, i.metadata.genres, i);
      if (i.metadata?.people || i.metadata?.cast || i.metadata?.director || i.author || i.subtitle) {
          const p = [...(i.metadata?.people || []), ...(i.metadata?.cast || []), i.metadata?.director, i.author, i.subtitle].filter(Boolean);
          getTop(topPeople, p, i);
      }
      if (i.metadata?.platforms || i.format || i.platform) {
          const p = [...(i.metadata?.platforms || []), i.format, i.platform].filter(Boolean);
          getTop(topPlatforms, p, i);
      }
  });

  const sortAndFormat = (arr: any[], total: number) => {
      return arr.sort((a,b) => b.count - a.count).slice(0, 10).map(x => ({
          ...x,
          total,
          percentage: total > 0 ? Math.round((x.count / total) * 100) : 0,
          lowConfidence: total < 3
      }));
  };

  const topDecades = Object.entries(releaseDecades)
      .sort((a, b) => b[1] - a[1])
      .map(([decade, count]) => ({ decade, count, percentage: Math.round((count / totalSaved) * 100) }))
      .slice(0, 3);

  const averageReviewLength = reviewsCount > 0 ? Math.round(totalReviewWords / reviewsCount) : 0;
  const completionRatio = totalSaved > 0 ? Math.round((completed.length / totalSaved) * 100) : 0;
  const positivityRatio = completed.length > 0 ? Math.round((favorites.length / completed.length) * 100) : 0;

  return {
    libraryComposition: {
      totalSaved,
      totalFavorites: favorites.length,
      totalWantToTry: aspirational.length,
      totalCompleted: completed.length,
      categoryDistribution,
      completionRatio,
      positivityRatio
    },
    favorites: {
      topGenres: sortAndFormat(topGenres, favorites.length),
      topActors: sortAndFormat(topPeople, favorites.length),
      topPlatformsOrFormats: sortAndFormat(topPlatforms, favorites.length)
    },
    aspirational: {
      topWantToTryGenres: sortAndFormat(topAspirationalGenres, aspirational.length),
      backlogSize: aspirational.length
    },
    engagement: {
      averageReviewLengthWords: averageReviewLength,
      itemsWithReviews: reviewsCount
    },
    timeline: {
      topReleaseDecades: topDecades
    }
  };
}

export function buildTasteSignals(items: any[], stats: any) {
    return {
        dominantCategories: stats.libraryComposition.categoryDistribution.slice(0, 2),
        dominantGenres: stats.favorites.topGenres.slice(0, 3)
    };
}

export function buildCuratedTasteEvidence(items: any[], options: any = {}) {
    const maxItems = options.maxItems || 60;
    const targetCategory = options.targetCategory?.toLowerCase() || 'overall';
    const explicitTargetItems = options.explicitTargetItems;
    
    // 1. Taste Fingerprint Scoring
    // We score every item so we can pull the mathematically most significant items,
    // rather than just the most recently added.
    const scoredItems = items.map(i => {
        let score = 0;
        
        // Explicit high signals
        if (i.reaction === 'love') score += 50;
        if (i.reaction === 'dislike' || i.reaction === 'hate') score -= 20; // Usually omit, but good for context if needed
        
        // Rating (assuming 1-10 scale)
        if (typeof i.rating === 'number' && i.rating > 0) {
            score += i.rating * 4;
        }

        // Completion status implies investment
        if (['completed', 'read', 'watched', 'listened'].includes(i.status)) {
            score += 15;
        }

        // Deep engagement via reviews/notes
        if (i.review || i.note || i.favoriteQuote) {
            const textLen = (i.review || i.note || i.favoriteQuote || "").length;
            score += Math.min(30, 10 + (textLen / 20)); // Up to 30 points for thoughtful notes
        }

        // Recency decay (slight preference for recent items to keep the profile fresh)
        // Assume dateAdded is a Unix timestamp in ms
        if (i.dateAdded) {
            const ageInDays = (Date.now() - i.dateAdded) / (1000 * 60 * 60 * 24);
            const recencyBonus = Math.max(0, 20 - (ageInDays / 30)); // Bonus fades over ~600 days
            score += recencyBonus;
        }

        return { ...i, _tasteScore: score };
    });

    // 2. Stratified Sampling
    let selectedItems: any[] = [];
    
    // Group by normalized category
    const byCategory: Record<string, any[]> = {};
    scoredItems.forEach(i => {
        const cat = (i.category || 'unknown').toLowerCase();
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(i);
    });

    // Sort each category bucket by score descending
    for (const cat in byCategory) {
        byCategory[cat].sort((a, b) => b._tasteScore - a._tasteScore);
    }

    if (targetCategory !== 'overall') {
        // Lateral Context Strategy: 
        // 70% of token budget goes to the target category.
        // 30% goes to the absolute highest-scoring items from OTHER categories.
        const targetBudget = Math.floor(maxItems * 0.7);
        const lateralBudget = maxItems - targetBudget;

        let targetCatItems: any[] = [];
        let otherItems: any[] = [];

        if (explicitTargetItems && explicitTargetItems.length > 0) {
            const targetIds = new Set(explicitTargetItems.map((i: any) => i.id || i.title));
            targetCatItems = scoredItems.filter(i => targetIds.has(i.id || i.title));
            otherItems = scoredItems.filter(i => !targetIds.has(i.id || i.title));
        } else {
            targetCatItems = scoredItems.filter(i => (i.category || 'unknown').toLowerCase() === targetCategory);
            otherItems = scoredItems.filter(i => (i.category || 'unknown').toLowerCase() !== targetCategory);
        }

        targetCatItems.sort((a, b) => b._tasteScore - a._tasteScore);
        selectedItems.push(...targetCatItems.slice(0, targetBudget));

        // Sort remaining globally by score
        otherItems.sort((a, b) => b._tasteScore - a._tasteScore);
        
        // In case the target category didn't fill its budget, we can use the remainder for lateral
        const remainingBudget = maxItems - selectedItems.length;
        selectedItems.push(...otherItems.slice(0, remainingBudget));

    } else {
        // Overall Strategy: Proportional Stratification
        // Distribute the maxItems budget proportionally across categories based on their size,
        // but ensure a minimum representation for smaller, highly-rated categories.
        const totalValidItems = scoredItems.length;
        
        if (totalValidItems <= maxItems) {
            selectedItems = [...scoredItems].sort((a, b) => b._tasteScore - a._tasteScore);
        } else {
            // First pass: Proportional allocation
            const allocations: Record<string, number> = {};
            for (const cat in byCategory) {
                const proportion = byCategory[cat].length / totalValidItems;
                // Give at least 1 slot if it exists, otherwise proportional
                let slots = Math.max(1, Math.floor(proportion * maxItems));
                allocations[cat] = slots;
            }

            // Adjust if we over/under allocated due to rounding
            let allocatedSum = Object.values(allocations).reduce((a, b) => a + b, 0);
            
            // If over-allocated, trim from the largest category
            while (allocatedSum > maxItems) {
                const validKeys = Object.keys(allocations).filter(k => allocations[k] > 0);
                if (validKeys.length === 0) break;
                const largestCat = validKeys.reduce((a, b) => allocations[a] > allocations[b] ? a : b);
                allocations[largestCat]--;
                allocatedSum--;
            }

            // Pull items based on allocation
            let leftovers: any[] = [];
            for (const cat in allocations) {
                const count = allocations[cat];
                const catItems = byCategory[cat];
                selectedItems.push(...catItems.slice(0, count));
                leftovers.push(...catItems.slice(count));
            }
            
            // If under-allocated (e.g. from Math.floor rounding down), fill with absolute highest scores from leftovers
            if (selectedItems.length < maxItems) {
                leftovers.sort((a, b) => b._tasteScore - a._tasteScore);
                selectedItems.push(...leftovers.slice(0, maxItems - selectedItems.length));
            }
        }
    }

    // Sort final selection by score so the most important items are at the top of the context window
    selectedItems.sort((a, b) => b._tasteScore - a._tasteScore);

    // 3. Format Output cleanly for the LLM
    return selectedItems.map(i => ({
        title: i.title,
        category: i.category,
        subcategory: i.subCategory,
        status: i.status,
        reaction: i.reaction,
        rating: i.rating,
        genres: Array.isArray(i.metadata?.genres) ? i.metadata.genres.slice(0, 5) : [],
        tags: Array.isArray(i.metadata?.keywords) ? i.metadata.keywords.slice(0, 5) : [],
        people: [i.author, i.subtitle, ...(i.metadata?.people || [])].filter(Boolean).slice(0, 5),
        releaseYear: i.releaseYear,
        note: i.review || i.favoriteQuote
    }));
}