import { UserItem, RecommendationContext, UserTasteState, FriendAffinityScore } from '../types';

export interface ScoreWeights {
  personalTasteSimilarity: number;
  themeCompatibility: number;
  behavioralEvidence: number;
  trustedFriendAffinity: number;
  crossCategoryMotifMatch: number;
  noveltySerendipity: number;
  qualitySignal: number;
  negativePreferencePenalty: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  personalTasteSimilarity: 0.25,
  themeCompatibility: 0.15,
  behavioralEvidence: 0.20,
  trustedFriendAffinity: 0.10,
  crossCategoryMotifMatch: 0.10,
  noveltySerendipity: 0.05,
  qualitySignal: 0.15,
  negativePreferencePenalty: 0.0,
};

export function scoreRecommendation(
  candidate: any,
  tasteState: any | null,
  friendAffinity: FriendAffinityScore[] | null,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  dislikedItems: any[] = [],
  likedItems: any[] = []
): any { // returning a richer object than RecommendationContext for Phase C
  
  const usedSignals: string[] = [];
  const unavailableSignals: string[] = [];
  let availableWeightTotal = 0;
  let accumulatedScore = 0;
  
  const topReasons: string[] = [];
  const evidenceItemIds: string[] = [];
  let negativePreferenceChecks: string[] = [];
  let noveltyExplanation = "";

  // 1. Quality Signal
  let qualitySignalScore = 0;
  if (candidate.criticScore) {
    qualitySignalScore = candidate.criticScore * 10; // assuming 1-10
    usedSignals.push("criticScore");
  } else if (candidate.qualitySignals?.voteAverage) {
    qualitySignalScore = candidate.qualitySignals.voteAverage * 10;
    usedSignals.push("voteAverage");
  } else if (candidate.qualitySignals?.averageRating) {
    qualitySignalScore = candidate.qualitySignals.averageRating * 20; // 5 star scale to 100
    usedSignals.push("averageRating");
  } else if (candidate.qualitySignals?.rating) {
    qualitySignalScore = candidate.qualitySignals.rating * 20; // RAWG uses 5 star scale
    usedSignals.push("rating");
  } else {
    unavailableSignals.push("qualitySignal");
  }
  
  if (usedSignals.includes("criticScore") || usedSignals.includes("voteAverage") || usedSignals.includes("averageRating") || usedSignals.includes("rating")) {
    availableWeightTotal += weights.qualitySignal;
    accumulatedScore += qualitySignalScore * weights.qualitySignal;
    if (qualitySignalScore >= 80) topReasons.push("Strong quality signal from critic/user ratings.");
  }

  // 2. Personal Taste / Category Compatibility
  let personalTasteSimilarity = 0;
  let hasTaste = false;
  if (tasteState?.categorySignatures && Object.keys(tasteState.categorySignatures).includes(candidate.itemCategory || candidate.category)) {
    personalTasteSimilarity = 80;
    hasTaste = true;
    usedSignals.push("categorySignatures");
  } else if (tasteState?.topCategories?.includes(candidate.itemCategory || candidate.category)) {
    personalTasteSimilarity = 70;
    hasTaste = true;
    usedSignals.push("topCategories");
  } else {
    unavailableSignals.push("categoryCompatibility");
  }

  if (hasTaste) {
    availableWeightTotal += weights.personalTasteSimilarity;
    accumulatedScore += personalTasteSimilarity * weights.personalTasteSimilarity;
    topReasons.push(`Fits your stronger preference for ${candidate.itemCategory || candidate.category} picks.`);
  }

  // 3. Theme/Genre Compatibility
  let themeCompatibility = 0;
  let hasTheme = false;
  const candidateGenres = candidate.genres || (candidate.data?.tags) || [];
  const candidateThemes = candidate.themes || [];
  
  if (likedItems.length > 0 && (candidateGenres.length > 0 || candidateThemes.length > 0)) {
    let overlapCount = 0;
    const allLikedTags = likedItems.flatMap(i => i.data?.tags || []);
    const overlappedThemes: string[] = [];
    
    for (const g of candidateGenres) {
       if (allLikedTags.includes(g) || tasteState?.strongestMotifs?.includes(g)) {
         overlapCount++;
         if (!overlappedThemes.includes(g)) overlappedThemes.push(g);
       }
    }
    if (overlapCount > 0) {
      themeCompatibility = Math.min(100, 50 + (overlapCount * 15));
      hasTheme = true;
      usedSignals.push("themeOverlap");
      const themeString = overlappedThemes.slice(0, 3).join(", ");
      topReasons.push(`Matches themes you repeatedly like: ${themeString}.`);
    }
  } else {
    unavailableSignals.push("themeCompatibility");
  }

  if (hasTheme) {
    availableWeightTotal += weights.themeCompatibility;
    accumulatedScore += themeCompatibility * weights.themeCompatibility;
  }

  // 4. Behavioral Evidence (Creator Overlap)
  let behavioralEvidenceScore = 0;
  let hasBehavioral = false;
  const candidateCreators = candidate.creators || (candidate.subtitle ? [candidate.subtitle] : []);
  
  if (likedItems.length > 0 && candidateCreators.length > 0) {
     const allLikedCreators = likedItems.map(i => i.subtitle).filter(Boolean);
     let overlapCount = 0;
     const overlappedCreators: string[] = [];
     for (const c of candidateCreators) {
        // Exclude strictly numeric values (years) from creator overlap
        if (!/^\d+$/.test(c) && allLikedCreators.includes(c)) {
           overlapCount++;
           if (!overlappedCreators.includes(c)) overlappedCreators.push(c);
        }
     }
     if (overlapCount > 0) {
        behavioralEvidenceScore = 90;
        hasBehavioral = true;
        usedSignals.push("creatorOverlap");
        const creatorString = overlappedCreators.slice(0, 3).join(", ");
        
        let reasonStr = `Shares creators or authors connected to your favorites (${creatorString}).`;
        if (candidate.category === 'book' || candidate.itemCategory === 'book') {
           reasonStr = `Shares authors connected to your favorites (${creatorString}).`;
        } else if (candidate.category === 'movie' || candidate.category === 'tv' || candidate.itemCategory === 'movie' || candidate.itemCategory === 'tv') {
           reasonStr = `Shares creators, cast, or studios connected to your favorites (${creatorString}).`;
        } else if (candidate.category === 'music' || candidate.itemCategory === 'music') {
           reasonStr = `Shares artists connected to your favorites (${creatorString}).`;
        } else if (candidate.category === 'game' || candidate.itemCategory === 'game') {
           reasonStr = `Shares studios, franchises, or designers connected to your favorites (${creatorString}).`;
        } else if (candidate.category === 'food' || candidate.itemCategory === 'food' || candidate.category === 'places' || candidate.itemCategory === 'places') {
           reasonStr = `Matches places connected to your favorites (${creatorString}).`;
        }
        topReasons.push(reasonStr);
     }
  } else {
     unavailableSignals.push("creatorOverlap");
  }

  if (hasBehavioral) {
     availableWeightTotal += weights.behavioralEvidence;
     accumulatedScore += behavioralEvidenceScore * weights.behavioralEvidence;
  }

  // 5. Negative Preference Penalty
  let negativePreferencePenalty = 0;
  let hasNegative = false;
  if (dislikedItems.length > 0) {
     const dislikedCreators = dislikedItems.map(i => i.subtitle).filter(Boolean);
     const dislikedTags = dislikedItems.flatMap(i => i.data?.tags || []);
     
     let penalty = 0;
     for (const c of candidateCreators) {
       if (dislikedCreators.includes(c)) {
          penalty += 40;
          negativePreferenceChecks.push(`Creator ${c} appears in your disliked items.`);
       }
     }
     for (const g of candidateGenres) {
       if (dislikedTags.includes(g)) {
          penalty += 20;
          negativePreferenceChecks.push(`Genre/theme ${g} appears frequently in your disliked items.`);
       }
     }
     if (penalty > 0) {
        negativePreferencePenalty = Math.min(100, penalty);
        hasNegative = true;
        usedSignals.push("negativePreference");
     }
  } else {
     unavailableSignals.push("negativePreference");
  }
  
  if (hasNegative) {
     availableWeightTotal += weights.negativePreferencePenalty;
     accumulatedScore -= negativePreferencePenalty * weights.negativePreferencePenalty;
  }

  // 6. Novelty/Serendipity
  let noveltyScore = 0;
  let hasNovelty = false;
  
  // Fake some novelty distance based on whether it matched strong themes or creators.
  // High overlap = low novelty. Low overlap but still fits category = high novelty.
  if (hasTaste) {
     if (!hasTheme && !hasBehavioral) {
        noveltyScore = 80;
        noveltyExplanation = "Brings a fresh angle to a category you like.";
        topReasons.push(noveltyExplanation);
     } else if (hasTheme && !hasBehavioral) {
        noveltyScore = 50;
        noveltyExplanation = "Familiar themes, but new creators.";
     } else {
        noveltyScore = 20;
        noveltyExplanation = "Very closely aligned with your core tastes.";
     }
     hasNovelty = true;
     usedSignals.push("novelty");
  } else {
     unavailableSignals.push("novelty");
  }
  
  if (hasNovelty) {
     availableWeightTotal += weights.noveltySerendipity;
     accumulatedScore += noveltyScore * weights.noveltySerendipity;
  }
  
  // 7. Location Relevance (Food/Places)
  let locationScore = 0;
  let hasLocation = false;
  if (candidate.category === "food" || candidate.itemCategory === "food") {
    const candidateCity = candidate.city || candidate.address;
    if (candidateCity && likedItems.length > 0) {
       const allLikedLocations = likedItems.map(i => extractCityFromItem(i)).filter(Boolean) as string[];
       let overlap = false;
       for (const loc of allLikedLocations) {
          if (loc.includes(candidateCity) || candidateCity.includes(loc)) {
             overlap = true;
             break;
          }
       }
       if (overlap) {
          locationScore = 100;
          hasLocation = true;
          usedSignals.push("locationRelevance");
          const locName = candidateCity.split(',')[0];
          topReasons.push(`For food, matches your location preferences (${locName}).`);
       } else {
          locationScore = 50;
          hasLocation = true;
          usedSignals.push("locationRelevance");
       }
    } else {
       unavailableSignals.push("locationRelevance");
    }
  }
  if (hasLocation) {
     availableWeightTotal += 0.15;
     accumulatedScore += locationScore * 0.15;
  }
  
  // 8. Price Preference (Food/Places)
  let priceScore = 0;
  let hasPrice = false;
  if (candidate.qualitySignals?.priceLevel !== undefined && likedItems.length > 0) {
     const likedPrices = likedItems.map(i => i.data?.qualitySignals?.priceLevel || i.qualitySignals?.priceLevel).filter(p => p !== undefined);
     if (likedPrices.length > 0) {
        const avgPrice = likedPrices.reduce((a, b) => a + b, 0) / likedPrices.length;
        const diff = Math.abs(candidate.qualitySignals.priceLevel - avgPrice);
        if (diff <= 1) {
           priceScore = 90;
           topReasons.push("Matches your typical price preference.");
        } else {
           priceScore = 30;
        }
        hasPrice = true;
        usedSignals.push("pricePreference");
     }
  }
  if (hasPrice) {
     availableWeightTotal += 0.10;
     accumulatedScore += priceScore * 0.10;
  }

  // Renormalize
  let finalScore = 50; // default baseline if no signals
  if (availableWeightTotal > 0) {
     finalScore = accumulatedScore / availableWeightTotal;
  }

  // Cap final score
  finalScore = Math.max(0, Math.min(100, finalScore));

  if (topReasons.length === 0) {
     topReasons.push("Matches baseline discovery criteria.");
  }

  let finalReasons = Array.from(new Set(topReasons)).slice(0, 3);
  if (candidate.category === "food" || candidate.itemCategory === "food") {
    finalReasons = finalReasons.map(reason => {
      let r = reason;
      r = r.replace(/gritty realism/gi, "classic");
      r = r.replace(/masterful storytelling/gi, "iconic");
      r = r.replace(/narrative/gi, "comfort-food");
      r = r.replace(/cinematic/gi, "destination");
      r = r.replace(/character-driven/gi, "neighborhood");
      return r;
    });
  }

  return {
    userId: tasteState?.userId || "-1",
    candidateId: candidate.id || candidate.existingItemId || candidate.externalId || "unknown",
    finalScore,
    topReasons: finalReasons,
    evidenceItemIds,
    usedSignals,
    unavailableSignals,
    noveltyExplanation,
    negativePreferenceChecks,
    confidence: availableWeightTotal > 0.5 ? "high" : "low"
  };
}

export function rankCandidates(
  candidates: any[], 
  tasteState: any | null, 
  friendAffinity: FriendAffinityScore[] | null,
  weights?: ScoreWeights,
  dislikedItems: any[] = [],
  likedItems: any[] = []
) {
  const scored = candidates.map(c => ({
    ...c,
    context: scoreRecommendation(c, tasteState, friendAffinity, weights, dislikedItems, likedItems)
  }));
  
  return scored.sort((a, b) => b.context.finalScore - a.context.finalScore);
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

