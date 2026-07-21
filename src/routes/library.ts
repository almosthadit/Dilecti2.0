import express from "express";
import { GoogleGenAI } from "@google/genai";
import { getAIClient } from "../utils/aiClient";
import { generateContentWithRetry, fetchImageFor } from "../utils/ai";

export const libraryRouter = express.Router();

const safeTimeout = (ms: number) => {
    try {
        return typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;
    } catch (e) {
        return undefined;
    }
};

libraryRouter.post("/api/image-search", async (req, res) => {
  try {
    const { query, category } = req.body;
    if (!query) return res.json([]);

    let cat = (category || "").toLowerCase();
    
    // Map UI categories to API categories
    if (cat === "tv & movies") cat = "watch";
    if (cat === "books") cat = "book";
    if (cat === "games/sports" || cat === "games") cat = "game";
    if (cat === "music") cat = "music";
    if (cat === "food") cat = "food";
    
    const cleanQuery = query.replace(/\s*\([^)]*\)/g, "").trim();
    const fetchOpts = { signal: safeTimeout(6000) };

    // Separate lists per source to control priority sorting
    const tmdbImages: string[] = [];
    const itunesImages: string[] = [];
    const googleBooksImages: string[] = [];
    const openLibraryImages: string[] = [];
    const rawgImages: string[] = [];
    const googleCseImages: string[] = [];
    const wikipediaImages: string[] = [];
    const googlePlacesImages: string[] = [];

    const promises: Promise<any>[] = [];

    // 1. Google Custom Search Engine (CSE) image search (if configured)
    const cseKey = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
    const cseCx = process.env.GOOGLE_CSE_CX || process.env.GOOGLE_SEARCH_CX;
    if (cseKey && cseCx && cat !== "food" && cat !== "places" && cat !== "place") {
      promises.push(
        fetch(
          `https://www.googleapis.com/customsearch/v1?key=${cseKey}&cx=${cseCx}&searchType=image&q=${encodeURIComponent(cleanQuery)}&num=15`,
          fetchOpts
        )
          .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
          .then((data) => {
            if (data.items) {
              data.items.forEach((item: any) => {
                if (item.link) {
                  googleCseImages.push(item.link);
                }
              });
            }
          })
          .catch(() => {})
      );
    }

    // 1.5 Google Places
    if (cat === "food" || cat === "places" || cat === "place") {
        const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
        
        if (mapsKey) {
           promises.push(
               fetch(`https://places.googleapis.com/v1/places:searchText`, {
                 method: "POST",
                 headers: {
                   "Content-Type": "application/json",
                   "X-Goog-Api-Key": mapsKey,
                   "X-Goog-FieldMask": "places.photos"
                 },
                 body: JSON.stringify({ 
                   textQuery: cleanQuery,
                   maxResultCount: 5
                 }),
                 ...fetchOpts
               })
               .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
               .then(async (data) => {
                  if (data.places) {
                      const placePromises = data.places.map(async (place: any) => {
                          if (place.photos && place.photos.length > 0) {
                              const photoPromises = place.photos.map(async (photo: any) => {
                                  if (photo.name) {
                                      try {
                                          const r = await fetch(`https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=800&skipHttpRedirect=true&key=${mapsKey}`);
                                          if (r.ok) {
                                              const photoData = await r.json();
                                              if (photoData && photoData.photoUri) {
                                                  googlePlacesImages.push(photoData.photoUri);
                                              }
                                          }
                                      } catch (e) {}
                                  }
                              });
                              await Promise.all(photoPromises);
                          }
                      });
                      await Promise.all(placePromises);
                  }
               })
           );
        }
    }

    // 2. TMDB (Movies / TV Shows)
    const tmdbKey = process.env.TMDB_API_KEY;
    if (tmdbKey && ["movie", "tv", "watch", "movies"].includes(cat)) {
      const searchType = cat === "tv" ? "tv" : cat === "movie" || cat === "movies" ? "movie" : "multi";
      promises.push(
        fetch(
          `https://api.themoviedb.org/3/search/${searchType}?query=${encodeURIComponent(cleanQuery)}&api_key=${tmdbKey}&language=en-US&page=1&include_adult=false`,
          fetchOpts
        )
          .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
          .then((data) => {
            if (data.results) {
              data.results.forEach((item: any) => {
                if (item.poster_path) {
                  tmdbImages.push(`https://image.tmdb.org/t/p/w600_and_h900_bestv2${item.poster_path}`);
                }
              });
            }
          })
          .catch(() => {})
      );
    }

    // 3. iTunes (Great for Music, Movies, TV, Games/Software, Audiobooks, Podcasts)
    let itunesEntity = "";
    let itunesMedia = "";
    if (["movie", "movies", "watch"].includes(cat)) {
      itunesMedia = "movie";
    } else if (cat === "tv") {
      itunesMedia = "tvShow";
    } else if (cat === "music") {
      itunesMedia = "music";
    } else if (["game", "games"].includes(cat)) {
      itunesEntity = "software";
    } else if (["book", "books"].includes(cat)) {
      itunesEntity = "ebook";
    }

    const itunesUrl = itunesMedia 
      ? `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=${itunesMedia}&limit=20`
      : itunesEntity
        ? `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=${itunesEntity}&limit=20`
        : `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&limit=25`;

    promises.push(
      fetch(itunesUrl, fetchOpts)
        .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
        .then((data) => {
          if (data.results) {
            data.results.forEach((item: any) => {
              const url = item.artworkUrl100 || item.artworkUrl600 || item.artworkUrl512;
              if (url) {
                const highRes = url.replace(/100x100[a-zA-Z0-9]*/, "600x600bb").replace(/512x512[a-zA-Z0-9]*/, "600x600bb");
                itunesImages.push(highRes);
              }
            });
          }
        })
        .catch(() => {})
    );

    // 4. Google Books API (Free, high coverage, no auth required)
    if (["book", "books"].includes(cat)) {
      promises.push(
        fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanQuery)}&maxResults=20`,
          fetchOpts
        )
          .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
          .then((data) => {
            if (data.items) {
              data.items.forEach((item: any) => {
                const imgLinks = item.volumeInfo?.imageLinks;
                if (imgLinks) {
                  const url = imgLinks.medium || imgLinks.large || imgLinks.thumbnail || imgLinks.smallThumbnail;
                  if (url) {
                    const upgraded = url.replace("http://", "https://").replace("&edge=curl", "");
                    googleBooksImages.push(upgraded);
                  }
                }
              });
            }
          })
          .catch(() => {})
      );
    }

    // 5. OpenLibrary (Books)
    if (["book", "books"].includes(cat)) {
      promises.push(
        fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=15`,
          fetchOpts
        )
          .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
          .then((data) => {
            if (data.docs) {
              data.docs.forEach((item: any) => {
                if (item.cover_i) {
                  openLibraryImages.push(`https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`);
                }
              });
            }
          })
          .catch(() => {})
      );
    }

    // 6. RAWG Game Search (Games)
    const rawgKey = process.env.RAWG_API_KEY;
    if (rawgKey && ["game", "games"].includes(cat)) {
      promises.push(
        fetch(
          `https://api.rawg.io/api/games?key=${rawgKey}&search=${encodeURIComponent(cleanQuery)}&page_size=15`,
          fetchOpts
        )
          .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
          .then((data) => {
            if (data.results) {
              data.results.forEach((item: any) => {
                if (item.background_image) {
                  rawgImages.push(item.background_image);
                }
              });
            }
          })
          .catch(() => {})
      );
    }

    // 7. Wikipedia with Category Suffixes to ensure precise relevance matching
    if (cat === "food") { /* skip wiki for food */ }
    else { 
    let wikiQuerySuffix = "";
    if (["movie", "movies", "watch"].includes(cat)) {
      wikiQuerySuffix = " film poster";
    } else if (cat === "tv") {
      wikiQuerySuffix = " tv series poster";
    } else if (["book", "books"].includes(cat)) {
      wikiQuerySuffix = " book cover";
    } else if (["game", "games"].includes(cat)) {
      wikiQuerySuffix = " video game cover";
    } else if (cat === "music") {
      wikiQuerySuffix = " album cover";
    }

    promises.push(
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery + wikiQuerySuffix)}&gsrlimit=15&prop=pageimages&pithumbsize=600&format=json&origin=*`,
        { ...fetchOpts, headers: { "User-Agent": "DilectiApp/1.0 (https://dilecti.example.com)" } }
      )
        .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
        .then((data) => {
          if (data?.query?.pages) {
            Object.values(data.query.pages).forEach((page: any) => {
              if (page.thumbnail?.source) {
                wikipediaImages.push(page.thumbnail.source);
              }
            });
          }
        })
        .catch(() => {})
    );

    // If it's a generic query, also try wikipedia general query as fallback
    if (wikiQuerySuffix) {
      promises.push(
        fetch(
          `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=10&prop=pageimages&pithumbsize=600&format=json&origin=*`,
          { ...fetchOpts, headers: { "User-Agent": "DilectiApp/1.0 (https://dilecti.example.com)" } }
        )
          .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
          .then((data) => {
            if (data?.query?.pages) {
              Object.values(data.query.pages).forEach((page: any) => {
                if (page.thumbnail?.source) {
                  wikipediaImages.push(page.thumbnail.source);
                }
              });
            }
          })
          .catch(() => {})
      );
    }
    } // End of wiki else block

    await Promise.allSettled(promises);

    // Strictly sort merged results by category relevance priority
    let orderedImages: string[] = [];

    if (["movie", "movies", "watch", "tv"].includes(cat)) {
      // Priority: 1. TMDB, 2. iTunes Movie/TV, 3. Google CSE, 4. Wikipedia Poster, 5. iTunes General
      orderedImages = [
        ...tmdbImages,
        ...itunesImages,
        ...googleCseImages,
        ...wikipediaImages,
      ];
    } else if (["book", "books"].includes(cat)) {
      // Priority: 1. Google Books (extremely high precision), 2. OpenLibrary, 3. iTunes Ebook, 4. Google CSE, 5. Wikipedia Cover
      orderedImages = [
        ...googleBooksImages,
        ...openLibraryImages,
        ...itunesImages,
        ...googleCseImages,
        ...wikipediaImages,
      ];
    } else if (cat === "music") {
      // Priority: 1. iTunes Music, 2. Google CSE, 3. Wikipedia Album
      orderedImages = [
        ...itunesImages,
        ...googleCseImages,
        ...wikipediaImages,
      ];
    } else if (["game", "games"].includes(cat)) {
      // Priority: 1. RAWG, 2. iTunes Software, 3. Google CSE, 4. Wikipedia Game Cover
      orderedImages = [
        ...rawgImages,
        ...itunesImages,
        ...googleCseImages,
        ...wikipediaImages,
      ];
    } else if (["place", "places", "food", "products", "product", "events", "event"].includes(cat)) {
      // Priority: 1. Google Places, 2. Google CSE, 3. Wikipedia, 4. iTunes
      orderedImages = [
        ...googlePlacesImages,
        ...googleCseImages,
        ...wikipediaImages,
        ...itunesImages,
      ];
    } else {
      // Generic
      orderedImages = [
        ...googleCseImages,
        ...wikipediaImages,
        ...itunesImages,
      ];
    }

    // Clean, deduplicate and filter out empty strings
    const uniqueImages = Array.from(new Set(orderedImages.filter(Boolean)));
    return res.json(uniqueImages);
  } catch (error) {
    console.error("Image search failed:", error);
    return res.status(500).json([]);
  }
});


libraryRouter.post("/api/wikipedia-summary", async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });
    
    // Add context to help Wikipedia find the right entity
    let query = title;
    if (category === 'movie' || category === 'watch') query += " film";
    else if (category === 'tv') query += " tv series";
    else if (category === 'book') query += " book";
    else if (category === 'game') query += " video game";
    else if (category === 'music') query += " album";

    const fetchOpts = {
      signal: safeTimeout(5000),
      headers: {
        "User-Agent": "DilectiApp/1.0 (https://dilecti.example.com)",
      },
    };

    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=extracts&exintro=1&explaintext=1&exsentences=3&format=json&origin=*`,
      fetchOpts
    );
    
    const data = await wikiRes.json();
    if (data.query && data.query.pages) {
      const pages = Object.values(data.query.pages) as any[];
      if (pages.length > 0 && pages[0].extract) {
         let extract = pages[0].extract.trim();
         // Basic clean up of common Wikipedia artifacts like "() " if they start the sentence
         extract = extract.replace(/\(.*?\)/g, '').replace(/\s{2,}/g, ' ');
         return res.json({ description: extract });
      }
    }
    return res.json({ description: null });
  } catch (error) {
    console.error("Wikipedia summary error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

libraryRouter.post("/api/repair-image", async (req, res) => {
  try {
    const { title, subtitle, category } = req.body;
    const url = await fetchImageFor(title, subtitle, category);
    res.json({ coverUrl: url });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

libraryRouter.post("/api/universal-search", async (req, res) => {
    try {
      const { query: rawQuery, category } = req.body;
      if (!rawQuery) return res.json([]);
      const query = rawQuery.trim();

      const { db } = await import("../db/index.js");
      const { globalItems } = await import("../db/schema.js");
      const { sql, ilike, or } = await import("drizzle-orm");

      let results: any[] = [];
      const fetchOpts = { signal: safeTimeout(5000) };

      // 1. FAST OWNED CATALOG SEARCH
      try {
        let baseQuery: any = db.select().from(globalItems);
        
        if (category && category !== "any" && category !== "custom" && category !== "creator") {
            const cleanCategory = category === "movie" || category === "tv" ? "watch" : category === "games" ? "game" : category === "events" ? "event" : category;
            baseQuery = baseQuery.where(sql`${globalItems.category} = ${cleanCategory} AND (${globalItems.title} ILIKE ${'%' + query + '%'} OR ${globalItems.subtitle} ILIKE ${'%' + query + '%'})`);
        } else {
            baseQuery = baseQuery.where(sql`${globalItems.title} ILIKE ${'%' + query + '%'} OR ${globalItems.subtitle} ILIKE ${'%' + query + '%'}`);
        }
        
        const matches = await baseQuery.limit(8);
        matches.forEach((m: any) => {
            results.push({
                id: m.id,
                title: m.title,
                subtitle: m.subtitle || "",
                description: m.description || "",
                category: m.category,
                coverUrl: m.data?.coverUrl || m.data?.imageUrl || m.data?.background_image || m.data?.artworkUrl600 || m.data?.artworkUrl100 || "",
                sourceAttribution: "Owned Catalog Match"
            });
        });
      } catch(e) {
        console.error("Owned catalog search failed", e);
      }

      // If we found enough results locally, return immediately!
      if (results.length >= 3) {
          return res.json(results);
      }

      // 2. FALLBACK TO EXTERNAL APIs
      const promises: Promise<void>[] = [];
      const sanitizedQuery = query.replace(/\b(movie|tv show|tv series)\b/gi, "").trim();
      const sanitizedFuzzy = sanitizedQuery.split(" ").map((w: string) => w + "*").join(" ");
      const fuzzyQuery = query.split(" ").map((w: string) => w + "*").join(" ");

      if (query.startsWith("http")) {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            promises.push((async () => {
               try {
                   const { getAIClient } = await import("../utils/aiClient.js");
                   const { generateContentWithRetry } = await import("../utils/ai.js");
                   const ai = getAIClient(geminiKey, typeof req !== 'undefined' ? (req.headers as any)['x-user-ai-provider'] : undefined);
                   const response = await generateContentWithRetry(ai, {
                       model: "gemini-2.5-flash",
                       contents: `Parse this URL into a library item: "${query}". Use Google Search to look up the exact URL if you cannot deduce it from the URL string itself. Return EXACTLY one JSON object with: { "title": "Name of item", "category": "movie|tv|music|book|food|place|product|game|event|podcast|creator|custom", "subtitle": "Author/Creator/Artist", "description": "Short explanation", "coverUrl": "Extract high quality image URL from the page if possible or leave empty" }`,
                       config: {
                           tools: [{ googleSearch: {} }],
                           responseMimeType: "application/json"
                       }
                   });
                   const item = JSON.parse(response.text || "{}");
                   if (item.title) {
                       results.push({ ...item, sourceAttribution: "URL Parsing via Gemini", url: query });
                   }
               } catch (e) {
                  console.error("URL Parsing failed:", e);
               }
            })());
        }
      }

      // Books - Google Books API / OpenLibrary API
      if (!category || category === "books" || category === "book") {
        promises.push(
          fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(sanitizedFuzzy || fuzzyQuery)}&maxResults=8`,
            fetchOpts
          )
            .then((r) => {
               if (!r.ok) throw new Error("Google Books failed");
               return r.json();
            })
            .then((data) => {
              if (data.items && data.items.length > 0) {
                data.items.forEach((item: any) => {
                  let coverUrl = item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || "";
                  if (coverUrl) {
                    coverUrl = coverUrl.replace(/&zoom=[0-9]/g, '').replace(/&edge=curl/g, '');
                  }
                  results.push({
                    title: item.volumeInfo.title,
                    category: "book",
                    subCategory: "Books",
                    subtitle: item.volumeInfo.authors?.[0] || "",
                    description: item.volumeInfo.description || "",
                    releaseYear: item.volumeInfo.publishedDate ? item.volumeInfo.publishedDate.substring(0, 4) : undefined,
                    coverUrl,
                    sourceAttribution: "Google Books",
                  });
                });
              } else {
                 throw new Error("No items found on Google Books");
              }
            })
            .catch(() => {
               return fetch(
                 `https://openlibrary.org/search.json?q=${encodeURIComponent(fuzzyQuery)}&limit=10`,
                 fetchOpts
               )
                 .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
                 .then((data) => {
                   if (data.docs) {
                     data.docs.forEach((item: any) => {
                        results.push({
                          title: item.title,
                          category: "book",
                          subCategory: "Books",
                          subtitle: item.author_name?.[0] || "",
                          description: "Book",
                          releaseYear: item.first_publish_year || undefined,
                          coverUrl: item.cover_i
                            ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
                            : "",
                          sourceAttribution: "OpenLibrary",
                        });
                      });
                    } else {
                       throw new Error("No items found on OpenLibrary");
                    }
                 });
             })
             .catch((e) => console.error("Book APIs failed:", e))
        );
      }
      
      // Movies / TV
      if (!category || category === "movie" || category === "tv" || category === "watch" || category === "any") {
        const tmdbKey = process.env.TMDB_API_KEY;
        if (tmdbKey) {
          let tmdbEndpoint = "search/multi";
          if (category === "movie" || category === "watch") tmdbEndpoint = "search/movie";
          else if (category === "tv") tmdbEndpoint = "search/tv";
          
          promises.push(
            (async () => {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const r = await fetch(
                  `https://api.themoviedb.org/3/${tmdbEndpoint}?query=${encodeURIComponent(sanitizedQuery || query)}&api_key=${tmdbKey}&language=en-US&page=1&include_adult=false`,
                  {
                    method: "GET",
                    headers: {
                      "accept": "application/json",
                      "User-Agent": "Dilecti/1.0"
                    },
                    signal: controller.signal
                  }
                );
                clearTimeout(timeoutId);
                
                if (r.ok) {
                  const data = await r.json();
                  if (data.results) {
                    data.results.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
                    data.results.forEach((item: any) => {
                      const mediaType = item.media_type || (tmdbEndpoint === "search/movie" ? "movie" : "tv");
                      if (mediaType === "movie" || mediaType === "tv" || mediaType === "person") {
                        const isMovie = mediaType === "movie";
                        const isPerson = mediaType === "person";
                        
                        results.push({
                          id: String(item.id),
                          title: isMovie ? (item.title || item.name) : (item.name || item.title),
                          category: isPerson ? "movie" : (isMovie ? "movie" : "tv"),
                          subCategory: isPerson ? "Actors" : (isMovie ? "Movies" : "TV Shows"),
                          subtitle: isPerson ? (item.known_for_department || "Actor") : ((isMovie ? item.release_date : item.first_air_date)?.substring(0, 4) || ""),
                          description: isPerson 
                             ? (item.known_for ? item.known_for.map((kf: any) => kf.title || kf.name).filter(Boolean).join(", ") : "Person")
                             : (item.overview || ""),
                          releaseYear: isPerson ? undefined : (isMovie ? item.release_date : item.first_air_date)?.substring(0, 4),
                          coverUrl: isPerson 
                            ? (item.profile_path ? `https://image.tmdb.org/t/p/w500${item.profile_path}` : "")
                            : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : ""),
                          sourceAttribution: "TMDB",
                        });
                      }
                    });
                  }
                }
              } catch (e) {
                console.error("TMDB fetch error:", e);
              }
            })()
          );
        } else {
          // Fallback to iTunes API
          if (!category || category === "movie" || category === "watch") {
            promises.push(
              fetch(
                `https://itunes.apple.com/search?term=${encodeURIComponent(sanitizedQuery || query)}&entity=movie&limit=15`,
                fetchOpts,
              )
                .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
                .then((data) => {
                  if (data.results) {
                    data.results.forEach((item: any) => {
                      results.push({
                        id: String(item.trackId || item.collectionId || Math.random()),
                        title: item.trackName || item.collectionName,
                        category: "movie",
                        subCategory: "Movies",
                        subtitle: item.directorName || item.artistName || "",
                        description: item.longDescription || item.shortDescription || item.description || item.primaryGenreName,
                        releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
                        coverUrl: item.artworkUrl100?.replace(/100x100[a-zA-Z0-9]*/, "600x600bb") || item.artworkUrl100 || "",
                        sourceAttribution: "iTunes",
                      });
                    });
                  }
                }).catch(() => {})
            );
          }
        }
      }

      // Games - RAWG API
      if (!category || category === "games" || category === "game") {
        const rawgKey = process.env.RAWG_API_KEY;
        if (rawgKey) {
          promises.push(
            fetch(
              `https://api.rawg.io/api/games?key=${rawgKey}&search=${encodeURIComponent(sanitizedQuery || query)}&page_size=8`,
              fetchOpts,
            )
              .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
              .then((data) => {
                if (data.results) {
                  data.results.forEach((item: any) => {
                    results.push({
                      id: String(item.id),
                      title: item.name,
                      category: "game",
                      subCategory: "Games",
                      subtitle: item.released ? item.released.substring(0, 4) : "",
                      description: item.genres?.map((g: any) => g.name).join(", ") || "",
                      releaseYear: item.released ? item.released.substring(0, 4) : undefined,
                      coverUrl: item.background_image || "",
                      sourceAttribution: "RAWG",
                    });
                  });
                }
              })
              .catch(() => {}),
          );
        }
      }
      
      // Music - Spotify (if integrated, otherwise fallback)
      if (!category || category === "music") {
          promises.push(
            fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(sanitizedQuery || query)}&entity=album&limit=8`,
              fetchOpts,
            )
              .then((r) => r.ok ? r.json() : {} as any).catch(() => ({}))
              .then((data) => {
                if (data.results) {
                  data.results.forEach((item: any) => {
                    results.push({
                      id: String(item.collectionId || Math.random()),
                      title: item.collectionName,
                      category: "music",
                      subCategory: "Albums",
                      subtitle: item.artistName || "",
                      description: item.primaryGenreName || "Music",
                      releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
                      coverUrl: item.artworkUrl100?.replace(/100x100[a-zA-Z0-9]*/, "600x600bb") || item.artworkUrl100 || "",
                      sourceAttribution: "iTunes",
                    });
                  });
                }
              }).catch(() => {})
          );
      }

      await Promise.allSettled(promises);
      
      // Deduplicate by title
      const uniqueResults = [];
      const seen = new Set();
      for (const res of results) {
          const key = (res.title || "").toLowerCase();
          if (!seen.has(key)) {
              seen.add(key);
              uniqueResults.push(res);
          }
      }

      // ASYNCHRONOUSLY CACHE NEW RESULTS TO GLOBAL_ITEMS
      if (uniqueResults.length > 0) {
          setTimeout(async () => {
              try {
                  const { db } = await import("../db/index.js");
                  const { globalItems } = await import("../db/schema.js");
                  
                  // Don't import getEmbedding here if we want to save costs completely on search
                  // Or just store without embedding for now, or embed asynchronously.
                  // Wait, if it has no embedding, it won't show in Discover. Let's do it asynchronously.
                  const { getEmbedding } = await import("../utils/embeddings.js");
                  
                  for (const res of uniqueResults) {
                      if (res.sourceAttribution === "Owned Catalog Match") continue;
                      if (!res.title) continue;
                      
                      const cleanCategory = res.category === "watch" ? "movie" : res.category === "games" ? "game" : (res.category || "custom");
                      
                      const existing = await db.select().from(globalItems).where(sql`${globalItems.title} = ${res.title} AND ${globalItems.category} = ${cleanCategory}`).limit(1);
                      if (existing.length === 0) {
                          const textToEmbed = `${res.title} ${res.subtitle || ""} ${res.description || ""}`.trim();
                          const embedding = await getEmbedding(textToEmbed);
                          
                          await db.insert(globalItems).values({
                              id: res.id || 'ext_' + Math.random().toString(36).substr(2, 9),
                              title: res.title,
                              subtitle: res.subtitle || null,
                              description: res.description || null,
                              category: cleanCategory,
                              embedding,
                              data: {
                                  coverUrl: res.coverUrl,
                                  source: res.sourceAttribution
                              }
                          }).onConflictDoNothing();
                      }
                  }
              } catch (e) {
                  console.error("Async caching to global_items failed:", e);
              }
          }, 0);
      }

      return res.json(uniqueResults.slice(0, 20));
    } catch (error: any) {
      console.error("Universal Search API Error:", error);
      return res.status(500).json({ error: error.message });
    }
});


libraryRouter.post("/api/search-tags", async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.json([]);
        
        const { db } = await import("../db/index.js");
        const { sql } = await import("drizzle-orm");

        // Raw SQL to get distinct tags that match the query
        const matches = await db.execute(sql`
            SELECT DISTINCT tag 
            FROM (
                SELECT jsonb_array_elements_text(data->'tags') as tag 
                FROM global_items 
                WHERE data->'tags' IS NOT NULL
            ) t 
            WHERE tag ILIKE ${'%' + query + '%'}
            LIMIT 10;
        `);
        
        const tags = matches.rows.map((r: any) => ({
            id: r.tag,
            label: r.tag
        }));
        
        // Always include the raw query as an option to create a new tag
        if (!tags.find(t => t.label.toLowerCase() === query.toLowerCase())) {
            tags.push({ id: query, label: query });
        }
        
        return res.json(tags);
    } catch (error) {
        console.error("Search tags error:", error);
        return res.json([{ id: req.body.query, label: req.body.query }]);
    }
});


libraryRouter.post("/api/taste-match", async (req, res) => {
    try {
        const { myTitles, theirTitles } = req.body;
        
        if (!myTitles || !theirTitles || myTitles.length === 0 || theirTitles.length === 0) {
            return res.json({ matchPercentage: 0 });
        }

        const { db } = await import("../db/index.js");
        const { sql } = await import("drizzle-orm");

        // Compute average embedding for user 1
        const matches1 = await db.execute(sql`
            SELECT embedding 
            FROM global_items 
            WHERE title IN (${sql.join(myTitles.map((t: string) => sql`${t}`), sql`, `)}) 
            AND embedding IS NOT NULL
        `);
        const emb1 = matches1.rows.map((r: any) => {
            if (typeof r.embedding === 'string') return JSON.parse(r.embedding);
            return r.embedding;
        }).filter((e: any) => e && e.length === 384);

        // Compute average embedding for user 2
        const matches2 = await db.execute(sql`
            SELECT embedding 
            FROM global_items 
            WHERE title IN (${sql.join(theirTitles.map((t: string) => sql`${t}`), sql`, `)}) 
            AND embedding IS NOT NULL
        `);
        const emb2 = matches2.rows.map((r: any) => {
            if (typeof r.embedding === 'string') return JSON.parse(r.embedding);
            return r.embedding;
        }).filter((e: any) => e && e.length === 384);

        if (emb1.length === 0 || emb2.length === 0) {
             return res.json({ matchPercentage: 0 });
        }

        let centroid1: number[] = new Array(384).fill(0);
        for (const emb of emb1) {
            for (let i = 0; i < 384; i++) centroid1[i] += emb[i];
        }
        for (let i = 0; i < 384; i++) centroid1[i] /= emb1.length;

        let centroid2: number[] = new Array(384).fill(0);
        for (const emb of emb2) {
            for (let i = 0; i < 384; i++) centroid2[i] += emb[i];
        }
        for (let i = 0; i < 384; i++) centroid2[i] /= emb2.length;

        // Compute cosine similarity between centroid1 and centroid2
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < 384; i++) {
            dotProduct += centroid1[i] * centroid2[i];
            normA += centroid1[i] * centroid1[i];
            normB += centroid2[i] * centroid2[i];
        }
        let similarity = 0;
        if (normA > 0 && normB > 0) {
            similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        }

        // Convert similarity [-1, 1] to percentage [0, 100]
        // Usually, text embeddings are mostly positive, so min similarity might be around 0.3.
        // Let's stretch the range [0.4, 1.0] to [0, 100] for better UX, cap at 0/100.
        const normalized = Math.max(0, Math.min(100, (similarity - 0.4) / 0.6 * 100));
        
        return res.json({ matchPercentage: Math.round(normalized) });

    } catch (error: any) {
        console.error("Taste match API Error:", error);
        return res.status(500).json({ error: error.message });
    }
});


libraryRouter.post("/api/vector-discover", async (req, res) => {
    try {
        const { categories, userTitles } = req.body;
        const { db } = await import("../db/index.js");
        const { sql } = await import("drizzle-orm");

        // 1. Get embeddings for the user's titles
        let userEmbeddings = [];
        if (userTitles && userTitles.length > 0) {
            const matches = await db.execute(sql`
                SELECT embedding 
                FROM global_items 
                WHERE title IN (${sql.join(userTitles.map((t: string) => sql`${t}`), sql`, `)}) 
                AND embedding IS NOT NULL
            `);
            userEmbeddings = matches.rows.map((r: any) => {
                if (typeof r.embedding === 'string') return JSON.parse(r.embedding);
                return r.embedding;
            }).filter((e: any) => e && e.length > 0);
        }

        let centroid: number[] = [];
        if (userEmbeddings.length > 0) {
            const dim = userEmbeddings[0].length;
            centroid = new Array(dim).fill(0);
            for (const emb of userEmbeddings) {
                for (let i = 0; i < dim; i++) {
                    centroid[i] += emb[i];
                }
            }
            for (let i = 0; i < dim; i++) {
                centroid[i] /= userEmbeddings.length;
            }
        }

        const results = [];
        const cleanCategories = categories && categories.length > 0 
           ? categories.map(c => c === "watch" ? "movie" : c === "games" ? "game" : c) 
           : ["movie", "book", "music", "food", "game", "podcast", "events", "places", "products", "creators", "custom"];

        const hasCentroid = centroid.length > 0;
        const centroidStr = hasCentroid ? `[${centroid.join(',')}]` : "";

        let finalSql;
        let excludeFilter = sql``;
        if (userTitles && userTitles.length > 0) {
            excludeFilter = sql`AND title NOT IN (${sql.join(userTitles.map((t: string) => sql`${t}`), sql`, `)})`;
        }

        if (hasCentroid) {
            finalSql = sql`
                SELECT * FROM (
                    SELECT id, title, subtitle, description, category, data, 
                           1 - (embedding <=> ${centroidStr}::vector) as similarity,
                           ROW_NUMBER() OVER(PARTITION BY category ORDER BY embedding <=> ${centroidStr}::vector ASC) as rn
                    FROM global_items
                    WHERE category IN (${sql.join(cleanCategories.map((c: string) => sql`${c}`), sql`, `)})
                    AND embedding IS NOT NULL
                    ${excludeFilter}
                ) t
                WHERE rn <= 20
            `;
        } else {
            finalSql = sql`
                SELECT * FROM (
                    SELECT id, title, subtitle, description, category, data,
                           0 as similarity,
                           ROW_NUMBER() OVER(PARTITION BY category ORDER BY RANDOM()) as rn
                    FROM global_items
                    WHERE category IN (${sql.join(cleanCategories.map((c: string) => sql`${c}`), sql`, `)})
                    ${excludeFilter}
                ) t
                WHERE rn <= 20
            `;
        }

        const matches = await db.execute(finalSql);
        for (const row of matches.rows) {
            const r: any = row;
            const itemData = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
            results.push({
                id: r.id,
                title: r.title,
                subtitle: r.subtitle,
                description: r.description,
                category: r.category,
                coverUrl: itemData.coverUrl || itemData.cover_url || itemData.imageUrl || itemData.artworkUrl600 || itemData.artworkUrl100 || itemData.background_image || "",
                genres: itemData.tags || [],
                creators: r.subtitle ? [r.subtitle] : [],
                data: itemData,
                context: {
                   finalScore: hasCentroid ? Math.round(Number(r.similarity || 0) * 100) : (85 + Math.floor(Math.random() * 10)),
                   noveltyExplanation: itemData.reason || (hasCentroid ? "Based on your taste profile" : "Community Favorite")
                }
            });
        }
        
        return res.json({
            isSeedPack: !hasCentroid,
            results
        });

    } catch (error: any) {
        console.error("Vector discover API Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

