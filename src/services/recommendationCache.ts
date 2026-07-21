import crypto from "crypto";

export interface UserTasteSummary {
    userId: string;
    fingerprint: string;
    topCategories: string[];
    likedGenres: string[];
    dislikedGenres: string[];
    likedCreators: string[];
    dislikedCreators: string[];
    favoriteSeedItems: string[];
    negativeSeedItems: string[];
    categoryProfiles: Record<string, any>;
    updatedAt: number;
}

export function generateFingerprint(userItems: any[], profile: any, category: string): string {
    const relevantItems = userItems.filter(i => 
        i.category === category || 
        (category === 'watch' && ['movie', 'tv'].includes(i.category)) || 
        (category === 'books' && i.category === 'book') ||
        (category === 'game' && ['game', 'games'].includes(i.category)) ||
        (category === 'music' && ['music'].includes(i.category)) ||
        (category === 'podcast' && ['podcast'].includes(i.category)) ||
        (category === 'places' && ['places', 'travel'].includes(i.category))
    );

    const fingerprintData = relevantItems.map(i => ({
        id: i.id,
        reaction: i.reaction,
        rating: i.rating,
        status: i.status,
        updatedAt: i.updatedAt,
        savedAt: i.savedAt
    })).sort((a, b) => (a.id > b.id ? 1 : -1));

    const prefs = profile?.preferences || "";
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({ fingerprintData, prefs, category }));
    return hash.digest('hex');
}

export function buildUserTasteSummary(userId: string, userItems: any[], profile: any, category: string): UserTasteSummary {
    const fingerprint = generateFingerprint(userItems, profile, category);
    
    const relevantItems = userItems.filter(i => 
        i.category === category || 
        (category === 'watch' && ['movie', 'tv'].includes(i.category)) || 
        (category === 'books' && i.category === 'book') ||
        (category === 'game' && ['game', 'games'].includes(i.category)) ||
        (category === 'music' && ['music'].includes(i.category)) ||
        (category === 'podcast' && ['podcast'].includes(i.category)) ||
        (category === 'places' && ['places', 'travel'].includes(i.category))
    );

    const likedItems = relevantItems.filter((i: any) => i.reaction === 'heart' || i.reaction === 'thumbs-up' || (i.rating && i.rating >= 8));
    const dislikedItems = relevantItems.filter((i: any) => i.reaction === 'skull' || i.reaction === 'thumbs-down' || (i.rating && i.rating <= 3));

    const getGenres = (items: any[]) => {
        const counts: Record<string, number> = {};
        items.forEach(i => {
            if (i.genres && Array.isArray(i.genres)) {
                i.genres.forEach((g: string) => counts[g] = (counts[g] || 0) + 1);
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    };

    const getCreators = (items: any[]) => {
        const counts: Record<string, number> = {};
        items.forEach(i => {
            if (i.creator) counts[i.creator] = (counts[i.creator] || 0) + 1;
            if (i.subtitle) counts[i.subtitle] = (counts[i.subtitle] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    };

    return {
        userId,
        fingerprint,

        topCategories: [category],
        likedGenres: getGenres(likedItems),
        dislikedGenres: getGenres(dislikedItems),
        likedCreators: getCreators(likedItems),
        dislikedCreators: getCreators(dislikedItems),
        favoriteSeedItems: likedItems.map(i => i.title),
        negativeSeedItems: dislikedItems.map(i => i.title),
        categoryProfiles: profile?.tasteState?.categoryProfiles || {},
        updatedAt: Date.now()
    };
}

import { adminDb } from "../utils/firebaseAdmin";

export async function getCachedRecommendations(userId: string, category: string, fingerprint: string, version: string = "v1") {
    try {
        const docRef = adminDb.collection("users").doc(userId).collection("recommendation_cache").doc(category);
        const snap = await docRef.get();
        
        if (!snap.exists) return null;
        
        const data = snap.data();
        if (!data) return null;
        
        if (data.fingerprint !== fingerprint || data.version !== version) return null;
        
        if (data.expiresAt && data.expiresAt < Date.now()) return null;
        
        return data.rankedCandidates;
    } catch (e) {
        console.warn("Error getting cached recommendations:", e);
        return null;
    }
}

export async function setCachedRecommendations(userId: string, category: string, fingerprint: string, rankedCandidates: any[], version: string = "v1") {
    try {
        const docRef = adminDb.collection("users").doc(userId).collection("recommendation_cache").doc(category);
        
        const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 1 day
        
        await docRef.set({
            fingerprint,
            version,
            rankedCandidates,
            createdAt: Date.now(),
            expiresAt
        });
    } catch (e) {
        console.warn("Error setting cached recommendations:", e);
    }
}
