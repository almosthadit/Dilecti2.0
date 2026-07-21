import { db } from "../db";
import { globalItems, userItems } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";

export type CandidateQueryPlan = {
  category: "movie" | "tv" | "book" | "game" | "music" | "podcast" | "food" | "places";
  strategy: string;
  seedExternalIds?: string[];
  seedTitles?: string[];
  genres?: string[];
  themes?: string[];
  creators?: string[];
  keywords?: string[];
  locationContext?: string;
  priceLevel?: string;
  releaseYearRange?: [number, number];
  noveltyTarget?: "high" | "low" | "medium";
  excludeItemIds?: string[];
  reason: string;
};

export type NormalizedRecommendationCandidate = {
  externalSource: string;
  externalId: string;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  genres?: string[];
  themes?: string[];
  creators?: string[];
  releaseYear?: string;
  city?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  imageUrl?: string;
  popularity?: number;
  qualitySignals?: Record<string, number>;
  sourceUrl?: string;
  alreadyInDilecti?: boolean;
  existingItemId?: string;
};

export async function buildCandidateQueryPlans(userLibrary: any[], category: "movie" | "tv" | "book" | "game" | "music" | "podcast" | "food", locationContext?: string): Promise<CandidateQueryPlan[]> {
  const plans: CandidateQueryPlan[] = [];
  
  const items = userLibrary.filter(i => (i.itemCategory || i.category) === category);
  const likedItems = items.filter(i => i.reaction === 'heart' || i.reaction === 'thumbs-up' || (i.rating && i.rating >= 8));
  
  if (category === "movie" || category === "tv") {
    if (likedItems.length > 0) {
      const seedTitles = likedItems.slice(0, 3).map(i => i.title);
      plans.push({
        category,
        strategy: "similar_to_loved",
        seedTitles,
        reason: `Based on your favorites like ${seedTitles.join(", ")}`
      });
    }
    plans.push({
      category,
      strategy: "popular_discovery",
      reason: "Popular and trending right now"
    });
  } else if (category === "book") {
    if (likedItems.length > 0) {
      const seedTitles = likedItems.slice(0, 3).map(i => i.title);
      const authors = likedItems.map(i => i.subtitle).filter(Boolean) as string[];
      const uniqueAuthors = Array.from(new Set(authors)).slice(0, 2);
      plans.push({
        category,
        strategy: "similar_to_loved",
        seedTitles,
        creators: uniqueAuthors.length > 0 ? uniqueAuthors : undefined,
        reason: `Because you enjoyed books like ${seedTitles[0]}`
      });
    }
    plans.push({
      category,
      strategy: "popular_discovery",
      reason: "Popular books"
    });
  } else if (category === "game") {
    if (likedItems.length > 0) {
      const seedTitles = likedItems.slice(0, 3).map(i => i.title);
      const devs = likedItems.map(i => i.subtitle).filter(Boolean) as string[];
      const uniqueDevs = Array.from(new Set(devs)).slice(0, 2);
      plans.push({
        category,
        strategy: "similar_to_loved",
        seedTitles,
        creators: uniqueDevs.length > 0 ? uniqueDevs : undefined,
        reason: `Because you enjoyed games like ${seedTitles[0]}`
      });
    }
    plans.push({
      category,
      strategy: "popular_discovery",
      reason: "Popular and trending games"
    });
  } else if (category === "music") {
    if (likedItems.length > 0) {
      const seedTitles = likedItems.slice(0, 3).map(i => i.title);
      const creators = likedItems.map(i => i.subtitle).filter(Boolean) as string[];
      const uniqueCreators = Array.from(new Set(creators)).slice(0, 2);
      plans.push({
        category,
        strategy: "similar_to_loved",
        seedTitles,
        creators: uniqueCreators.length > 0 ? uniqueCreators : undefined,
        reason: `Because you enjoy music by ${uniqueCreators.join(', ') || seedTitles[0]}`
      });
      if (uniqueCreators.length > 0) {
        plans.push({
          category,
          strategy: "artist_based",
          creators: uniqueCreators,
          reason: `More from artists you like`
        });
      }
    }
    plans.push({
      category,
      strategy: "popular_discovery",
      reason: "Popular and trending music"
    });
  } else if (category === "food") {
    const locationSet = Array.from(new Set(items.map(i => extractCityFromItem(i)))).filter(Boolean) as string[];
    const innerLoc = locationSet.length > 0 ? locationSet[0] : undefined;

    if (likedItems.length > 0) {
      const seedTitles = likedItems.slice(0, 3).map(i => i.title);
      const cuisines = likedItems.flatMap(i => i.data?.tags || []).filter(Boolean);
      const uniqueCuisines = Array.from(new Set(cuisines)).slice(0, 3);
      plans.push({
        category,
        strategy: "similar_to_loved",
        seedTitles,
        genres: uniqueCuisines.length > 0 ? uniqueCuisines : undefined,
        locationContext: locationContext || innerLoc,
        reason: `Because you enjoyed places like ${seedTitles[0]}`
      });
    }
    plans.push({
      category,
      strategy: "popular_discovery",
      locationContext: locationContext || innerLoc,
      reason: "Popular restaurants and places near your saved locations"
    });
  } else if (category === "podcast") {
    if (likedItems.length > 0) {
      const seedTitles = likedItems.slice(0, 3).map(i => i.title);
      const creators = likedItems.map(i => i.subtitle).filter(Boolean) as string[];
      const uniqueCreators = Array.from(new Set(creators)).slice(0, 2);
      plans.push({
        category,
        strategy: "similar_to_loved",
        seedTitles,
        creators: uniqueCreators.length > 0 ? uniqueCreators : undefined,
        reason: `Because you listen to ${seedTitles[0]}`
      });
    }
    plans.push({
      category,
      strategy: "popular_discovery",
      reason: "Popular podcasts"
    });
  } else if (category === "places") {
    const locationSet = Array.from(new Set(items.map(i => extractCityFromItem(i)))).filter(Boolean) as string[];
    const innerLoc = locationSet.length > 0 ? locationSet[0] : undefined;

    if (likedItems.length > 0) {
      const seedTitles = likedItems.slice(0, 3).map(i => i.title);
      const subcategories = likedItems.map(i => i.subcategory || i.metadata?.type).filter(Boolean) as string[];
      const uniqueSubcategories = Array.from(new Set(subcategories)).slice(0, 3);
      const themes = likedItems.flatMap(i => i.data?.tags || []).filter(Boolean);
      const uniqueThemes = Array.from(new Set(themes)).slice(0, 3);

      plans.push({
        category,
        strategy: "similar_to_loved",
        seedTitles,
        reason: `Based on your favorite places like ${seedTitles[0]}`
      });
      if (uniqueSubcategories.length > 0) {
        plans.push({
          category,
          strategy: "destination_type_based",
          genres: uniqueSubcategories,
          reason: `Because you enjoy visiting ${uniqueSubcategories[0]}s`
        });
      }
      if (uniqueThemes.length > 0) {
         plans.push({
          category,
          strategy: "theme_based",
          themes: uniqueThemes,
          reason: `Because you like places with themes like ${uniqueThemes[0]}`
         });
      }
      if (locationContext) {
         plans.push({
          category,
          strategy: "geographic_affinity",
          locationContext,
          reason: `More to explore around ${locationContext}`
         });
         plans.push({
          category,
          strategy: "adjacent_discovery",
          locationContext,
          reason: `Explore areas near ${locationContext}`
         });
      }
    }
    plans.push({
      category,
      strategy: "popular_discovery",
      reason: "Popular destinations and attractions globally"
    });
  }

  return plans;
}

async function fetchTmdbRecommendationCandidates(plan: CandidateQueryPlan): Promise<NormalizedRecommendationCandidate[]> {
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return [];
  
  const candidates: NormalizedRecommendationCandidate[] = [];
  const fetchOpts = { signal: AbortSignal.timeout(5000) };

  if (plan.strategy === "similar_to_loved" && plan.seedTitles && plan.seedTitles.length > 0) {
    for (const title of plan.seedTitles) {
      try {
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&api_key=${tmdbKey}&language=en-US&page=1&include_adult=false`, fetchOpts).then(r => r.ok ? r.json() : {} as any);
        const topResult = searchRes.results?.find((r: any) => r.media_type === "movie" || r.media_type === "tv");
        if (topResult) {
          const mediaType = topResult.media_type;
          const similarRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${topResult.id}/similar?api_key=${tmdbKey}&language=en-US&page=1`, fetchOpts).then(r => r.ok ? r.json() : {} as any);
          if (similarRes.results) {
             for (const item of similarRes.results.slice(0, 5)) {
                const isMovie = mediaType === "movie";
                candidates.push({
                  externalSource: "TMDB",
                  externalId: String(item.id),
                  category: isMovie ? "movie" : "tv",
                  title: isMovie ? item.title : item.name,
                  subtitle: ((isMovie ? item.release_date : item.first_air_date)?.substring(0, 4)) || "",
                  description: item.overview || "",
                  releaseYear: (isMovie ? item.release_date : item.first_air_date)?.substring(0, 4),
                  imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
                  popularity: item.popularity,
                  qualitySignals: { voteAverage: item.vote_average, voteCount: item.vote_count }
                });
             }
          }
        }
      } catch (e) {
        console.error("TMDB similar fetch failed", e);
      }
    }
  } else if (plan.strategy === "popular_discovery") {
    try {
      const type = plan.category === "movie" ? "movie" : "tv";
      const discoverRes = await fetch(`https://api.themoviedb.org/3/discover/${type}?api_key=${tmdbKey}&language=en-US&sort_by=popularity.desc&page=1`, fetchOpts).then(r => r.ok ? r.json() : {} as any);
      if (discoverRes.results) {
         for (const item of discoverRes.results.slice(0, 5)) {
            const isMovie = type === "movie";
            candidates.push({
              externalSource: "TMDB",
              externalId: String(item.id),
              category: isMovie ? "movie" : "tv",
              title: isMovie ? item.title : item.name,
              subtitle: ((isMovie ? item.release_date : item.first_air_date)?.substring(0, 4)) || "",
              description: item.overview || "",
              releaseYear: (isMovie ? item.release_date : item.first_air_date)?.substring(0, 4),
              imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
              popularity: item.popularity,
              qualitySignals: { voteAverage: item.vote_average, voteCount: item.vote_count }
            });
         }
      }
    } catch (e) {
       console.error("TMDB discover fetch failed", e);
    }
  }

  return candidates;
}

async function fetchBookRecommendationCandidates(plan: CandidateQueryPlan): Promise<NormalizedRecommendationCandidate[]> {
  const candidates: NormalizedRecommendationCandidate[] = [];
  const fetchOpts = { signal: AbortSignal.timeout(5000) };

  try {
    let query = "";
    if (plan.strategy === "similar_to_loved") {
      if (plan.creators && plan.creators.length > 0) {
        query = `inauthor:"${plan.creators[0]}"`;
      } else if (plan.seedTitles && plan.seedTitles.length > 0) {
        query = `intitle:"${plan.seedTitles[0]}"`;
      } else {
        query = "subject:fiction";
      }
    } else {
       query = "subject:bestsellers";
    }

    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`, fetchOpts);
    if (r.ok) {
       const data = await r.json() as any;
       if (data.items) {
         data.items.forEach((item: any) => {
            let coverUrl = item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || "";
            if (coverUrl) {
              coverUrl = coverUrl.replace(/&zoom=[0-9]/g, '').replace(/&edge=curl/g, '');
            }
            candidates.push({
              externalSource: "Google Books",
              externalId: item.id,
              category: "book",
              title: item.volumeInfo.title,
              subtitle: item.volumeInfo.authors?.[0] || "",
              description: item.volumeInfo.description || "",
              releaseYear: item.volumeInfo.publishedDate ? item.volumeInfo.publishedDate.substring(0, 4) : undefined,
              imageUrl: coverUrl,
              qualitySignals: { ratingsCount: item.volumeInfo.ratingsCount, averageRating: item.volumeInfo.averageRating }
            });
         });
       }
    }
  } catch (e) {
    console.error("Google Books fetch failed", e);
  }

  return candidates;
}

async function fetchGameRecommendationCandidates(plan: CandidateQueryPlan): Promise<NormalizedRecommendationCandidate[]> {
  const rawgKey = process.env.RAWG_API_KEY;
  if (!rawgKey) return [];

  const candidates: NormalizedRecommendationCandidate[] = [];
  const fetchOpts = { signal: AbortSignal.timeout(5000) };

  try {
    if (plan.strategy === "similar_to_loved" && plan.seedTitles && plan.seedTitles.length > 0) {
      for (const title of plan.seedTitles) {
        try {
          const searchRes = await fetch(`https://api.rawg.io/api/games?key=${rawgKey}&search=${encodeURIComponent(title)}&page_size=1`, fetchOpts).then(r => r.ok ? r.json() : {} as any);
          const topResult = searchRes.results?.[0];
          if (topResult) {
            const similarRes = await fetch(`https://api.rawg.io/api/games/${topResult.id}/suggested?key=${rawgKey}&page_size=5`, fetchOpts).then(r => r.ok ? r.json() : {} as any);
            if (similarRes.results && similarRes.results.length > 0) {
              for (const item of similarRes.results.slice(0, 5)) {
                candidates.push({
                  externalSource: "RAWG",
                  externalId: String(item.id),
                  category: "game",
                  title: item.name,
                  subtitle: item.released?.substring(0, 4) || "",
                  description: item.genres?.map((g: any) => g.name).join(", ") || "",
                  genres: item.genres?.map((g: any) => g.slug),
                  themes: item.tags?.map((t: any) => t.slug),
                  releaseYear: item.released?.substring(0, 4),
                  imageUrl: item.background_image || "",
                  popularity: item.added,
                  qualitySignals: { rating: item.rating, ratingsCount: item.ratings_count }
                });
              }
            } else {
               const genres = topResult.genres?.map((g: any) => g.slug).join(',');
               if (genres) {
                  const genreRes = await fetch(`https://api.rawg.io/api/games?key=${rawgKey}&genres=${genres}&ordering=-rating&page_size=5`, fetchOpts).then(r => r.ok ? r.json() : {} as any);
                  if (genreRes.results) {
                      for (const item of genreRes.results.slice(0, 5)) {
                        candidates.push({
                          externalSource: "RAWG",
                          externalId: String(item.id),
                          category: "game",
                          title: item.name,
                          subtitle: item.released?.substring(0, 4) || "",
                          description: item.genres?.map((g: any) => g.name).join(", ") || "",
                          genres: item.genres?.map((g: any) => g.slug),
                          themes: item.tags?.map((t: any) => t.slug),
                          releaseYear: item.released?.substring(0, 4),
                          imageUrl: item.background_image || "",
                          popularity: item.added,
                          qualitySignals: { rating: item.rating, ratingsCount: item.ratings_count }
                        });
                      }
                  }
               }
            }
          }
        } catch (e) {
          console.error("RAWG similar fetch failed", e);
        }
      }
    } else if (plan.strategy === "popular_discovery") {
       const discoverRes = await fetch(`https://api.rawg.io/api/games?key=${rawgKey}&ordering=-added&page_size=5`, fetchOpts).then(r => r.ok ? r.json() : {} as any);
       if (discoverRes.results) {
          for (const item of discoverRes.results.slice(0, 5)) {
             candidates.push({
               externalSource: "RAWG",
               externalId: String(item.id),
               category: "game",
               title: item.name,
               subtitle: item.released?.substring(0, 4) || "",
               description: item.genres?.map((g: any) => g.name).join(", ") || "",
               genres: item.genres?.map((g: any) => g.slug),
               themes: item.tags?.map((t: any) => t.slug),
               releaseYear: item.released?.substring(0, 4),
               imageUrl: item.background_image || "",
               popularity: item.added,
               qualitySignals: { rating: item.rating, ratingsCount: item.ratings_count }
             });
          }
       }
    }
  } catch (e) {
    console.error("RAWG fetch failed", e);
  }

  return candidates;
}

async function fetchMusicRecommendationCandidates(plan: CandidateQueryPlan): Promise<NormalizedRecommendationCandidate[]> {
  const candidates: NormalizedRecommendationCandidate[] = [];
  const fetchOpts = { signal: AbortSignal.timeout(5000) };

  try {
    if (plan.strategy === "similar_to_loved" || plan.strategy === "artist_based") {
      const searchTerms = plan.creators && plan.creators.length > 0 ? plan.creators : plan.seedTitles || ["hits"];
      for (const term of searchTerms) {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=10`;
        const res = await fetch(url, fetchOpts);
        if (!res.ok) continue;
        const data = await res.json() as any;
        if (data.results) {
          for (const item of data.results) {
            candidates.push({
              externalSource: "iTunes",
              externalId: String(item.collectionId || item.trackId),
              category: "music",
              title: item.collectionName || item.trackName,
              subtitle: item.artistName || "",
              description: "",
              genres: [item.primaryGenreName].filter(Boolean),
              releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
              imageUrl: item.artworkUrl600 || item.artworkUrl100?.replace('100x100', '600x600'),
              sourceUrl: item.collectionViewUrl || item.trackViewUrl,
              qualitySignals: {}
            });
          }
        }
      }
    } else {
      const url = `https://itunes.apple.com/search?term=hits&entity=album&limit=10`;
      const res = await fetch(url, fetchOpts);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.results) {
          for (const item of data.results) {
            candidates.push({
              externalSource: "iTunes",
              externalId: String(item.collectionId || item.trackId),
              category: "music",
              title: item.collectionName || item.trackName,
              subtitle: item.artistName || "",
              description: "",
              genres: [item.primaryGenreName].filter(Boolean),
              releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
              imageUrl: item.artworkUrl600 || item.artworkUrl100?.replace('100x100', '600x600'),
              sourceUrl: item.collectionViewUrl || item.trackViewUrl,
              qualitySignals: {}
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("iTunes music fetch failed", e);
  }
  return candidates;
}

async function fetchPodcastRecommendationCandidates(plan: CandidateQueryPlan): Promise<NormalizedRecommendationCandidate[]> {
  const candidates: NormalizedRecommendationCandidate[] = [];
  const fetchOpts = { signal: AbortSignal.timeout(5000) };

  try {
    if (plan.strategy === "similar_to_loved") {
      const searchTerms = plan.creators && plan.creators.length > 0 ? plan.creators : plan.seedTitles || ["podcast"];
      for (const term of searchTerms) {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=podcast&limit=10`;
        const res = await fetch(url, fetchOpts);
        if (!res.ok) continue;
        const data = await res.json() as any;
        if (data.results) {
          for (const item of data.results) {
            candidates.push({
              externalSource: "iTunes",
              externalId: String(item.collectionId),
              category: "podcast",
              title: item.collectionName || item.trackName,
              subtitle: item.artistName || "",
              description: "",
              genres: item.genres || [item.primaryGenreName].filter(Boolean),
              releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
              imageUrl: item.artworkUrl600 || item.artworkUrl100?.replace('100x100', '600x600'),
              sourceUrl: item.collectionViewUrl || item.trackViewUrl,
              qualitySignals: {}
            });
          }
        }
      }
    } else {
      const url = `https://itunes.apple.com/search?term=podcast&entity=podcast&limit=10`;
      const res = await fetch(url, fetchOpts);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.results) {
          for (const item of data.results) {
            candidates.push({
              externalSource: "iTunes",
              externalId: String(item.collectionId),
              category: "podcast",
              title: item.collectionName || item.trackName,
              subtitle: item.artistName || "",
              description: "",
              genres: item.genres || [item.primaryGenreName].filter(Boolean),
              releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
              imageUrl: item.artworkUrl600 || item.artworkUrl100?.replace('100x100', '600x600'),
              sourceUrl: item.collectionViewUrl || item.trackViewUrl,
              qualitySignals: {}
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("iTunes podcast fetch failed", e);
  }
  return candidates;
}

async function fetchFoodRecommendationCandidates(plan: CandidateQueryPlan): Promise<NormalizedRecommendationCandidate[]> {
  const candidates: NormalizedRecommendationCandidate[] = [];
  if (!plan.locationContext) {
    // If city/location is missing, do not return random national restaurants.
    // Use graceful fallback.
    console.warn("Location required for good restaurant recommendations. No food candidates fetched.");
    return candidates;
  }
  
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return candidates;

  const fetchOpts = { signal: AbortSignal.timeout(5000) };
  try {
    const terms = [];
    if (plan.strategy === "similar_to_loved") {
       if (plan.genres && plan.genres.length > 0) {
          terms.push(`${plan.genres[0]} restaurants in ${plan.locationContext}`);
       } else if (plan.seedTitles && plan.seedTitles.length > 0) {
          terms.push(`restaurants similar to ${plan.seedTitles[0]} in ${plan.locationContext}`);
       } else {
          terms.push(`restaurants in ${plan.locationContext}`);
       }
    } else {
       terms.push(`best restaurants in ${plan.locationContext}`);
    }

    for (const term of terms) {
      const requestBody = {
        textQuery: term,
        maxResultCount: 10
      };
      const res = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": mapsKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.types,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.editorialSummary"
        },
        body: JSON.stringify(requestBody),
        ...fetchOpts
      });
      if (!res.ok) continue;
      const data = await res.json() as any;
      if (data.places) {
        for (const place of data.places) {
          candidates.push({
            externalSource: "GooglePlaces",
            externalId: place.id || place.name || place.displayName?.text,
            category: "food",
            title: place.displayName?.text,
            subtitle: place.types && place.types.length > 0 ? place.types[0].replace(/_/g, ' ') : "Restaurant",
            description: place.editorialSummary?.text || "Restaurant",
            genres: place.types || [],
            address: place.formattedAddress,
            city: plan.locationContext,
            imageUrl: place.photos && place.photos.length > 0 ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=800&maxWidthPx=800&key=${mapsKey}` : undefined,
            sourceUrl: place.googleMapsUri,
            qualitySignals: {
               rating: place.rating,
               ratingsCount: place.userRatingCount,
               priceLevel: place.priceLevel === "PRICE_LEVEL_INEXPENSIVE" ? 1 : place.priceLevel === "PRICE_LEVEL_MODERATE" ? 2 : place.priceLevel === "PRICE_LEVEL_EXPENSIVE" ? 3 : place.priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE" ? 4 : undefined
            }
          });
        }
      }
    }
  } catch (e) {
    console.error("Google Places food fetch failed", e);
  }
  return candidates;
}

async function fetchPlacesRecommendationCandidates(plan: CandidateQueryPlan): Promise<NormalizedRecommendationCandidate[]> {
  const candidates: NormalizedRecommendationCandidate[] = [];
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return candidates;

  const fetchOpts = { signal: AbortSignal.timeout(5000) };
  try {
    const terms = [];
    if (plan.strategy === "similar_to_loved") {
       if (plan.seedTitles && plan.seedTitles.length > 0) {
          terms.push(`destinations similar to ${plan.seedTitles[0]}`);
       } else {
          terms.push(`top travel destinations`);
       }
    } else if (plan.strategy === "destination_type_based" && plan.genres && plan.genres.length > 0) {
       terms.push(`best ${plan.genres[0]}s to visit`);
    } else if (plan.strategy === "theme_based" && plan.themes && plan.themes.length > 0) {
       terms.push(`best places for ${plan.themes[0]}`);
    } else if (plan.strategy === "geographic_affinity" && plan.locationContext) {
       terms.push(`top attractions in ${plan.locationContext}`);
    } else if (plan.strategy === "adjacent_discovery" && plan.locationContext) {
       terms.push(`destinations near ${plan.locationContext}`);
    } else {
       terms.push(`world famous landmarks and destinations`);
    }

    for (const term of terms) {
      const requestBody = {
        textQuery: term,
        maxResultCount: 10
      };
      const res = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": mapsKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.types,places.photos,places.rating,places.userRatingCount,places.googleMapsUri,places.editorialSummary,places.location"
        },
        body: JSON.stringify(requestBody),
        ...fetchOpts
      });
      if (!res.ok) continue;
      const data = await res.json() as any;
      if (data.places) {
        for (const place of data.places) {
          const isRestaurant = place.types?.includes('restaurant') || place.types?.includes('food');
          if (isRestaurant) continue; // Skip restaurants for places category
          candidates.push({
            externalSource: "GooglePlaces",
            externalId: place.id || place.name || place.displayName?.text,
            category: "places",
            title: place.displayName?.text,
            subtitle: place.types && place.types.length > 0 ? place.types[0].replace(/_/g, ' ') : "Destination",
            description: place.editorialSummary?.text || "Destination",
            genres: place.types || [],
            address: place.formattedAddress,
            city: plan.locationContext,
            coordinates: place.location ? { lat: place.location.latitude, lng: place.location.longitude } : undefined,
            imageUrl: place.photos && place.photos.length > 0 ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=800&maxWidthPx=800&key=${mapsKey}` : undefined,
            sourceUrl: place.googleMapsUri,
            qualitySignals: {
               rating: place.rating,
               ratingsCount: place.userRatingCount
            }
          });
        }
      }
    }
  } catch (e) {
    console.error("Google Places fetch failed for places", e);
  }
  return candidates;
}

export async function fetchCandidatesForPlan(plan: CandidateQueryPlan): Promise<NormalizedRecommendationCandidate[]> {
  if (plan.category === "movie" || plan.category === "tv") {
     return fetchTmdbRecommendationCandidates(plan);
  } else if (plan.category === "book") {
     return fetchBookRecommendationCandidates(plan);
  } else if (plan.category === "game") {
     return fetchGameRecommendationCandidates(plan);
  } else if (plan.category === "music") {
     return fetchMusicRecommendationCandidates(plan);
  } else if (plan.category === "food") {
     return fetchFoodRecommendationCandidates(plan);
  } else if (plan.category === "podcast") {
     return fetchPodcastRecommendationCandidates(plan);
  } else if (plan.category === "places") {
     return fetchPlacesRecommendationCandidates(plan);
  }
  return [];
}

export async function deduplicateAndNormalize(
  candidates: NormalizedRecommendationCandidate[], 
  userLibrary: any[]
): Promise<NormalizedRecommendationCandidate[]> {
  const dedupedByExternalId = new Map<string, NormalizedRecommendationCandidate>();
  const dedupedByTitleYear = new Map<string, NormalizedRecommendationCandidate>();
  
  const userExistingTitles = new Set(userLibrary.map(i => `${i.itemCategory || i.category}:${(i.title || "").toLowerCase().trim()}`));

  const candidateTitles = candidates.map(c => c.title || "").filter(Boolean);
  
  let existingGlobals: any[] = [];
  if (candidateTitles.length > 0) {
     existingGlobals = await db.select({ id: globalItems.id, title: globalItems.title, category: globalItems.category }).from(globalItems).where(inArray(globalItems.title, candidateTitles));
  }
  const globalsMap = new Map<string, string>();
  for (const g of existingGlobals) {
     globalsMap.set(`${g.category}:${(g.title || "").toLowerCase().trim()}`, g.id);
  }

  const finalCandidates: NormalizedRecommendationCandidate[] = [];

  for (const c of candidates) {
    if (!c.title) continue;
    const titleKey = `${c.category}:${(c.title || "").toLowerCase().trim()}`;
    const externalKey = `${c.externalSource}:${c.externalId}`;
    let titleYearKey = c.releaseYear ? `${titleKey}:${c.releaseYear}` : titleKey;
    if (c.category === "food" && c.city) titleYearKey = `${titleKey}:${c.city.toLowerCase()}`;
    
    if (userExistingTitles.has(titleKey)) {
      continue;
    }

    if (globalsMap.has(titleKey)) {
      c.existingItemId = globalsMap.get(titleKey);
      c.alreadyInDilecti = true;
    } else {
      c.alreadyInDilecti = false;
    }

    if (dedupedByExternalId.has(externalKey)) {
       continue;
    }
    
    if (dedupedByTitleYear.has(titleYearKey)) {
       continue;
    }

    dedupedByExternalId.set(externalKey, c);
    dedupedByTitleYear.set(titleYearKey, c);
    finalCandidates.push(c);
  }

  return finalCandidates;
}


function extractCityFromItem(item: any): string | undefined {
  const city = item?.data?.metadata?.city || item?.metadata?.city;
  if (city && typeof city === 'string' && city.trim().length > 0) return city.trim();
  
  const address = item?.data?.metadata?.address || item?.metadata?.address;
  if (!address || typeof address !== 'string') return undefined;
  
  const parts = address.split(',').map((p: string) => p.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  
  for (let i = 1; i < parts.length; i++) {
     if (/(^|\s)([A-Z]{2}\s+)?\d{5}(-\d{4})?$/.test(parts[i])) {
        const cityPart = parts[i - 1];
        if (!/^\d/.test(cityPart)) return cityPart;
     }
  }
  
  if (parts.length === 2 && !/^\d/.test(parts[0])) return parts[0];
  if (parts.length === 1 && !/^\d/.test(parts[0])) return parts[0];
  
  return undefined;
}

