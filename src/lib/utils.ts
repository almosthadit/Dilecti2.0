import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeTheme(w: string): string {
    let word = w.trim();
    if (!word) return '';
    const lower = word.toLowerCase();

    // Plural/Singular normalizations & Aliasing
    if (lower === 'game' || lower === 'games' || lower === 'video game' || lower === 'video games') return 'Video Games';
    if (lower === 'book' || lower === 'books' || lower === 'literature' || lower === 'reading') return 'Books';
    if (lower === 'movie' || lower === 'movies' || lower === 'film' || lower === 'films' || lower === 'cinema') return 'Movies';
    if (lower === 'song' || lower === 'songs' || lower === 'track' || lower === 'tracks') return 'Music';
    if (lower === 'artist' || lower === 'artists' || lower === 'band' || lower === 'bands') return 'Artists';
    if (lower === 'album' || lower === 'albums') return 'Albums';
    if (lower === 'place' || lower === 'places' || lower === 'location' || lower === 'locations' || lower === 'destination' || lower === 'destinations' || lower === 'travel') return 'Places';
    if (lower === 'restaurant' || lower === 'restaurants' || lower === 'dining' || lower === 'food' || lower === 'eat') return 'Dining';
    if (lower === 'tv show' || lower === 'tv shows' || lower === 'television' || lower === 'tv' || lower === 'shows' || lower === 'show') return 'TV Shows';

    // Cuisine aggregation
    if (lower.includes('american') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'american')) return 'American Cuisine';
    if (lower.includes('mexican') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'mexican')) return 'Mexican Cuisine';
    if (lower.includes('italian') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'italian')) return 'Italian Cuisine';
    if (lower.includes('japanese') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'japanese')) return 'Japanese Cuisine';
    if (lower.includes('chinese') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'chinese')) return 'Chinese Cuisine';
    if (lower.includes('indian') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'indian')) return 'Indian Cuisine';
    if (lower.includes('french') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'french')) return 'French Cuisine';
    if (lower.includes('thai') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'thai')) return 'Thai Cuisine';
    if (lower.includes('korean') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'korean')) return 'Korean Cuisine';
    if (lower.includes('vietnamese') && (lower.includes('cuisine') || lower.includes('food') || lower.includes('restaurant') || lower === 'vietnamese')) return 'Vietnamese Cuisine';

    // Remove decades
    if (/^\d{2,4}s?$/.test(lower)) return ''; 

    // General cleanup
    if (lower === 'entity / wiki' || lower === 'entity' || lower === 'wiki') return '';
    
    return word.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
}

export const getNormalizedCat = (cat: string) => {
    let norm = cat.toLowerCase();
    if (norm === 'overall') return 'overall';
    if (['books', 'book'].includes(norm)) return 'book';
    if (['games', 'game', 'sports', 'games/sports'].includes(norm)) return 'game';
    if (['places', 'place'].includes(norm)) return 'place';
    if (['events', 'event'].includes(norm)) return 'event';
    if (['products', 'product'].includes(norm)) return 'product';
    if (['music'].includes(norm)) return 'music';
    if (['food', 'restaurants', 'restaurant'].includes(norm)) return 'food';
    if (['tvs', 'tv', 'movie', 'movies', 'watch', 'tv series', 'tv show', 'tv shows', 'tv & movies'].includes(norm)) return 'watch';
    return null;
};

export function formatIdentityText(text: string | undefined | null): string {
    if (!text) return "";
    let fixed = text.replace(/\*([^*]+)\*/g, (match, inner) => {
        let items = inner.split(",").map((i: string) => i.trim());
        if (items.length >= 3) {
            let last = items.pop();
            return items.join(", ") + ", and " + last;
        } else if (items.length === 2) {
            return items.join(" and ");
        }
        return inner;
    });
    return fixed.replace(/\*/g, "");
}

export function sanitizeReason(reason: string | undefined | null, category?: string | null): string {
    if (!reason) return "";
    let clean = reason.replace(/\*/g, '');
    clean = clean.replace(/perfect match/gi, 'may fit');
    clean = clean.replace(/will love/gi, 'could appeal');
    clean = clean.replace(/deeply rewarding/gi, 'is connected to');
    
    if (category === 'food' || category === 'restaurants' || category === 'dining') {
        clean = clean.replace(/gritty realism/gi, 'adventurous');
        clean = clean.replace(/masterful storytelling/gi, 'classic');
        clean = clean.replace(/narrative/gi, 'neighborhood');
        clean = clean.replace(/cinematic/gi, 'upscale');
        clean = clean.replace(/character-driven/gi, 'ingredient-driven');
    }
    return clean;
}

export const getMockFriendsForTitle = (title: string) => {
   const length = title.length;
   if (length % 3 === 0) return ['Sarah Jenkins', 'Mike Chen'];
   if (length % 3 === 1) return ['Alex Costa'];
   if (length % 5 === 0) return ['David K', 'Emma Wilson', 'James T'];
   return null;
}
