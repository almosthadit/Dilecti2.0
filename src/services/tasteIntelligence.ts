import { UserItem, UserProfile, QuantitativeProfile, CategoryProfile, TasteContradiction, CrossCategoryMotif, TemporalTasteChange, UserTasteState, FriendAffinityScore, RecommendationContext, Category, LatentPersona } from '../types';

/**
 * Builds a deterministic QuantitativeProfile from a user's library items.
 */
export function buildQuantitativeProfile(user: UserProfile, libraryItems: UserItem[], userId: string): QuantitativeProfile {
  const categoryCounts: Record<string, number> = {};
  const favoriteCategoryCounts: Record<string, number> = {};
  const wantToTryCategoryCounts: Record<string, number> = {};
  const ratingDistribution: Record<string, number> = {};
  const symbolicRatingDistribution: Record<string, number> = {};
  
  const genreCounts: Record<string, number> = {};
  const creatorCounts: Record<string, number> = {};
  const eraCounts: Record<string, number> = {};

  libraryItems.forEach(item => {
    // Basic category counts
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    
    // Status-based counts
    if (item.status === 'planning' || item.status === 'up-next') {
      wantToTryCategoryCounts[item.category] = (wantToTryCategoryCounts[item.category] || 0) + 1;
    }
    
    // Reaction/Favorites counts
    if (item.reaction === 'love') {
      favoriteCategoryCounts[item.category] = (favoriteCategoryCounts[item.category] || 0) + 1;
    }
    
    if (item.reaction) {
      symbolicRatingDistribution[item.reaction] = (symbolicRatingDistribution[item.reaction] || 0) + 1;
    }
    
    if (item.rating) {
      const bucket = Math.round(item.rating).toString();
      ratingDistribution[bucket] = (ratingDistribution[bucket] || 0) + 1;
    }
    
    // Genres / Metadata
    if (item.metadata?.genre) {
      const genres = Array.isArray(item.metadata.genre) ? item.metadata.genre : [item.metadata.genre];
      genres.forEach((g: string) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    }

    if (item.author) {
      creatorCounts[item.author] = (creatorCounts[item.author] || 0) + 1;
    }
    if (item.subtitle) {
      creatorCounts[item.subtitle] = (creatorCounts[item.subtitle] || 0) + 1;
    }
    
    if (item.releaseYear) {
      const year = parseInt(item.releaseYear.toString(), 10);
      if (!isNaN(year)) {
        const decade = Math.floor(year / 10) * 10;
        eraCounts[`${decade}s`] = (eraCounts[`${decade}s`] || 0) + 1;
      }
    }
  });

  const getTop = (counts: Record<string, number>, limit: number = 5) => {
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
  };

  return {
    userId,
    totalItems: libraryItems.length,
    categoryCounts,
    favoriteCategoryCounts,
    wantToTryCategoryCounts,
    ratingDistribution,
    symbolicRatingDistribution,
    topGenres: getTop(genreCounts, 5),
    topThemes: [], // Needs NLP or tagging
    topCreators: getTop(creatorCounts, 5),
    topActors: [],
    topAuthors: [],
    topArtists: [],
    topPlaces: [],
    eraDistribution: eraCounts,
    mainstreamPrestigeBalance: 50, // Stub
    noveltyScore: 50, // Stub
    comfortScore: 50, // Stub
    intensityScore: 50, // Stub
    socialScore: 50, // Stub
    craftScore: 50, // Stub
    escapismScore: 50, // Stub
  };
}

export function buildCategoryProfiles(user: UserProfile, libraryItems: UserItem[]): CategoryProfile[] {
  const byCategory: Record<string, UserItem[]> = {};
  
  libraryItems.forEach(item => {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  });

  return Object.entries(byCategory).map(([category, items]) => {
    const favorites = items.filter(i => i.reaction === 'love');
    const wantToTry = items.filter(i => i.status === 'planning' || i.status === 'up-next');
    
    const genreCounts: Record<string, number> = {};
    items.forEach(i => {
      if (i.metadata?.genre) {
        const genres = Array.isArray(i.metadata.genre) ? i.metadata.genre : [i.metadata.genre];
        genres.forEach((g: string) => genreCounts[g] = (genreCounts[g] || 0) + 1);
      }
    });

    return {
      category,
      itemCount: items.length,
      favoriteCount: favorites.length,
      wantToTryCount: wantToTry.length,
      topGenres: Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
      topThemes: [],
      topCreators: [],
      representativeItems: favorites.slice(0, 3).map(i => i.id),
      avoidedPatterns: [],
      strongestSignals: [],
      confidence: items.length > 10 ? 'high' : items.length > 3 ? 'medium' : 'low'
    };
  });
}

export function detectTasteContradictions(user: UserProfile, libraryItems: UserItem[], quantitativeProfile: QuantitativeProfile): TasteContradiction[] {
  const contradictions: TasteContradiction[] = [];
  
  // Rule 1: High want-to-try, but low completion/favorites
  const wantToTryTotal = Object.values(quantitativeProfile.wantToTryCategoryCounts).reduce((sum, count) => sum + count, 0);
  if (quantitativeProfile.totalItems > 20 && wantToTryTotal > (quantitativeProfile.totalItems * 0.5)) {
     contradictions.push({
       id: 'high_aspiration_low_action',
       title: 'The Ambitious Planner',
       description: 'You save a huge amount of items to try later, but your library shows you rarely circle back to actually experience and rate them.',
       confidence: wantToTryTotal > (quantitativeProfile.totalItems * 0.7) ? 'high' : 'medium',
       evidenceItemIds: libraryItems.filter(i => i.status === 'planning' || i.status === 'up-next').slice(0, 5).map(i => i.id),
       metricIds: ['wantToTryCategoryCounts', 'totalItems'],
       categoryScope: Object.keys(quantitativeProfile.wantToTryCategoryCounts).slice(0, 3),
       createdAt: Date.now(),
       invalidationKeys: ['library_item_added', 'status_changed']
     });
  }

  // Rule 2: High favorites in specific categories vs broad library
  const favoriteTotal = Object.values(quantitativeProfile.favoriteCategoryCounts).reduce((sum, count) => sum + count, 0);
  const totalCategories = Object.keys(quantitativeProfile.categoryCounts).length;
  const favoriteCategories = Object.keys(quantitativeProfile.favoriteCategoryCounts).length;
  
  if (totalCategories > 4 && favoriteCategories <= 2 && favoriteTotal > 5) {
     contradictions.push({
       id: 'broad_explorer_narrow_loyalist',
       title: 'Broad Explorer, Narrow Loyalist',
       description: `You experiment across ${totalCategories} different categories, but you only truly fall in love with items in ${favoriteCategories} of them.`,
       confidence: 'high',
       evidenceItemIds: libraryItems.filter(i => i.reaction === 'love').slice(0, 5).map(i => i.id),
       metricIds: ['favoriteCategoryCounts', 'categoryCounts'],
       categoryScope: Object.keys(quantitativeProfile.favoriteCategoryCounts),
       createdAt: Date.now(),
       invalidationKeys: ['reaction_changed']
     });
  }

  return contradictions;
}

export function detectCrossCategoryMotifs(user: UserProfile, libraryItems: UserItem[]): CrossCategoryMotif[] {
  // E.g., user loves Sci-Fi books AND Sci-Fi movies
  return [];
}

export function detectTemporalTasteChanges(user: UserProfile, libraryItems: UserItem[]): TemporalTasteChange[] {
  // Compare recent vs old additions
  return [];
}

export function detectLatentPersonas(user: UserProfile, libraryItems: UserItem[], qp: QuantitativeProfile): LatentPersona[] {
  const personas: LatentPersona[] = [];
  
  // Rule 1: The Galactic Explorer (Sci-Fi)
  const sciFiItems = libraryItems.filter(i => {
    const genres = Array.isArray(i.metadata?.genre) ? i.metadata.genre : [i.metadata?.genre];
    return genres.some((g: string) => g?.toLowerCase().includes('sci-fi') || g?.toLowerCase().includes('science fiction'));
  });
  if (sciFiItems.length >= 3 && (sciFiItems.length / libraryItems.length) > 0.15) {
    personas.push({
      id: 'persona_scifi_explorer',
      name: 'The Galactic Explorer',
      summary: `A strong gravitational pull towards science fiction, exploring futuristic concepts across ${sciFiItems.length} items.`,
      categories: Array.from(new Set(sciFiItems.map(i => i.category))),
      motifs: ['Futurism', 'Space', 'Technology'],
      representativeItems: sciFiItems.slice(0, 3).map(i => i.title),
      confidence: sciFiItems.length > 8 ? 'high' : 'medium',
      evidenceItemIds: sciFiItems.map(i => i.id),
      generatedAt: Date.now(),
      invalidationKeys: ['library_item_added']
    });
  }

  // Rule 2: The Fantasy Escapist
  const fantasyItems = libraryItems.filter(i => {
    const genres = Array.isArray(i.metadata?.genre) ? i.metadata.genre : [i.metadata?.genre];
    return genres.some((g: string) => g?.toLowerCase().includes('fantasy') || g?.toLowerCase().includes('magic'));
  });
  if (fantasyItems.length >= 3 && (fantasyItems.length / libraryItems.length) > 0.15) {
    personas.push({
      id: 'persona_fantasy_escapist',
      name: 'The Myth Weaver',
      summary: `Drawn to magical realms and high fantasy, with a noticeable presence of fantastical world-building in your library.`,
      categories: Array.from(new Set(fantasyItems.map(i => i.category))),
      motifs: ['Magic', 'Mythology', 'World-building'],
      representativeItems: fantasyItems.slice(0, 3).map(i => i.title),
      confidence: fantasyItems.length > 8 ? 'high' : 'medium',
      evidenceItemIds: fantasyItems.map(i => i.id),
      generatedAt: Date.now(),
      invalidationKeys: ['library_item_added']
    });
  }

  // Rule 3: The Culinary Explorer
  const foodItems = libraryItems.filter(i => i.category === 'food' && (i.reaction === 'love' || (i.rating && i.rating >= 4)));
  if (foodItems.length >= 4) {
    personas.push({
      id: 'persona_culinary_explorer',
      name: 'The Culinary Connoisseur',
      summary: `Highly appreciative of good food and dining experiences, logging highly-rated culinary spots.`,
      categories: ['food'],
      motifs: ['Gastronomy', 'Dining', 'Flavor'],
      representativeItems: foodItems.slice(0, 3).map(i => i.title),
      confidence: foodItems.length > 10 ? 'high' : 'medium',
      evidenceItemIds: foodItems.map(i => i.id),
      generatedAt: Date.now(),
      invalidationKeys: ['library_item_added']
    });
  }

  // Rule 4: The Critical Voice (Tough Grader)
  const ratedItems = libraryItems.filter(i => i.rating !== undefined && i.rating !== null);
  const lowRatings = ratedItems.filter(i => i.rating !== undefined && i.rating <= 2.5);
  if (ratedItems.length >= 10 && (lowRatings.length / ratedItems.length) > 0.3) {
    personas.push({
      id: 'persona_tough_critic',
      name: 'The Discerning Critic',
      summary: `Hard to impress. You aren't afraid to give critical ratings when items don't meet your high standards.`,
      categories: Array.from(new Set(lowRatings.map(i => i.category))),
      motifs: ['Critical Analysis', 'High Standards'],
      representativeItems: lowRatings.slice(0, 3).map(i => i.title),
      confidence: ratedItems.length > 20 ? 'high' : 'medium',
      evidenceItemIds: lowRatings.map(i => i.id),
      generatedAt: Date.now(),
      invalidationKeys: ['library_item_added']
    });
  }

  // Rule 5: The Omnivore (Eclectic)
  const categoriesPresent = Object.keys(qp.categoryCounts);
  if (categoriesPresent.length >= 5 && libraryItems.length >= 15) {
    const maxCount = Math.max(...Object.values(qp.categoryCounts));
    if (maxCount / libraryItems.length < 0.4) {
      personas.push({
        id: 'persona_eclectic_omnivore',
        name: 'The Cultural Omnivore',
        summary: `A highly diverse palette spanning ${categoriesPresent.length} different mediums without being pigeonholed into just one.`,
        categories: categoriesPresent,
        motifs: ['Diversity', 'Exploration', 'Cross-Medium'],
        representativeItems: libraryItems.slice(0, 3).map(i => i.title),
        confidence: libraryItems.length > 30 ? 'high' : 'medium',
        evidenceItemIds: libraryItems.slice(0, 10).map(i => i.id),
        generatedAt: Date.now(),
        invalidationKeys: ['library_item_added']
      });
    }
  }

  // Rule 6: Audio/Music Devotee
  const musicItems = libraryItems.filter(i => i.category === 'music');
  if (musicItems.length >= 5 && (musicItems.length / libraryItems.length) > 0.4) {
    personas.push({
      id: 'persona_audiophile',
      name: 'The Sonic Voyager',
      summary: `Music and audio experiences form the core of your cultural library.`,
      categories: ['music'],
      motifs: ['Audio', 'Rhythm', 'Soundscapes'],
      representativeItems: musicItems.slice(0, 3).map(i => i.title),
      confidence: musicItems.length > 15 ? 'high' : 'medium',
      evidenceItemIds: musicItems.map(i => i.id),
      generatedAt: Date.now(),
      invalidationKeys: ['library_item_added']
    });
  }
  
  return personas.sort((a, b) => b.evidenceItemIds.length - a.evidenceItemIds.length).slice(0, 3);
}

export function buildUserTasteState(user: UserProfile, libraryItems: UserItem[], previousTasteState?: UserTasteState): UserTasteState {
  const qp = buildQuantitativeProfile(user, libraryItems, user.handle || 'unknown');
  const contradictions = detectTasteContradictions(user, libraryItems, qp);
  const categories = buildCategoryProfiles(user, libraryItems);
  const personas = detectLatentPersonas(user, libraryItems, qp);
  
  // Aggregate traits
  const coreTraits: string[] = [];
  if (qp.totalItems > 100) coreTraits.push("Avid Collector");
  else if (qp.totalItems > 30) coreTraits.push("Selective Curator");
  else coreTraits.push("New Explorer");
  
  const favoriteTotal = Object.values(qp.favoriteCategoryCounts).reduce((sum, count) => sum + count, 0);
  if (favoriteTotal > 20) coreTraits.push("High Enthusiasm");
  
  return {
    userId: user.handle || 'unknown',
    lastUpdated: Date.now(),
    version: '1.1',
    coreTraits,
    strongestMotifs: [],
    categorySignatures: Object.fromEntries(categories.map(c => [c.category, c.topGenres.join(", ")])),
    contradictions,
    recentChanges: [],
    personas,
    confidence: libraryItems.length > 20 ? 'high' : libraryItems.length > 5 ? 'medium' : 'low',
    evidenceIds: libraryItems.slice(0, 10).map(i => i.id)
  };
}

export function buildNarrativeEvidencePacket(user: UserProfile, libraryItems: UserItem[], userId: string) {
  const qp = buildQuantitativeProfile(user, libraryItems, userId);
  const cp = buildCategoryProfiles(user, libraryItems);
  const contradictions = detectTasteContradictions(user, libraryItems, qp).filter(c => c.confidence === 'high' || c.confidence === 'medium');
  const personas = detectLatentPersonas(user, libraryItems, qp);

  const favorites = libraryItems.filter(i => i.reaction === 'love' || (i.rating && i.rating >= 4));
  const representativeFavorites = favorites.slice(0, 10).map(i => `[${i.category}] ${i.title || i.id}`);
  
  const confidence = libraryItems.length > 20 ? 'high' : libraryItems.length > 5 ? 'medium' : 'low';

  return {
    quantitativeProfile: {
      totalItems: qp.totalItems,
      topGenres: qp.topGenres,
      topCreators: qp.topCreators,
      categoryCounts: qp.categoryCounts,
      ratingDistribution: qp.ratingDistribution,
      eraDistribution: qp.eraDistribution,
    },
    categoryProfiles: cp.map(c => ({
      category: c.category,
      itemCount: c.itemCount,
      favoriteCount: c.favoriteCount,
      wantToTryCount: c.wantToTryCount,
      topGenres: c.topGenres,
      confidence: c.confidence
    })),
    contradictions: contradictions.map(c => ({
      title: c.title,
      description: c.description,
      confidence: c.confidence
    })),
    personas,
    representativeFavorites,
    overallConfidence: confidence
  };
}

export function buildFriendAffinityMatrix(user: UserProfile, friends: string[], libraryItems: UserItem[], friendLibraries: Record<string, UserItem[]>): FriendAffinityScore[] {
  return friends.map(friendId => {
    return {
      friendUserId: friendId,
      category: 'all',
      agreementScore: 0,
      discoveryScore: 0,
      trustWeight: 0,
      overlapCount: 0,
      disagreementPatterns: []
    };
  });
}

export function buildRecommendationContext(user: UserProfile, candidateItems: UserItem[], tasteState: UserTasteState, friendAffinity: FriendAffinityScore[]): RecommendationContext[] {
  return candidateItems.map(candidate => {
    return {
      userId: tasteState.userId,
      candidateId: candidate.id,
      personalTasteSimilarity: 0,
      themeCompatibility: 0,
      behavioralEvidenceScore: 0,
      friendAffinityScore: 0,
      crossCategoryMotifScore: 0,
      noveltyScore: 0,
      qualitySignalScore: 0,
      negativePreferencePenalty: 0,
      finalScore: 0,
      explanationEvidence: 'stub'
    };
  });
}
