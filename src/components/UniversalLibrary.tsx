import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useUserProfile, useUserItems } from '../hooks';
import { BookOpen, Tv, Headphones, ShoppingBag, Globe, PartyPopper, Gamepad, Utensils, Compass, Plus, Loader2, ImagePlus, SlidersHorizontal, Users, MapPin, Star, Clock, Sparkles, ChevronRight, ChevronUp, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal, GripVertical, Library, Pencil, Search, Heart, Bookmark, LayoutGrid, List, EyeOff, ThumbsUp, ThumbsDown, Skull, Map as MapIcon, AlertTriangle, Wrench, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Reorder, useDragControls } from 'motion/react';
import { useLongPress } from '../lib/useLongPress';
import { CATEGORY_SUB_FILTERS_DISPLAY_NAMES } from '../lib/constants';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import { getMockFriendsForTitle } from '../lib/utils';
import Fuse from 'fuse.js';
import { ResultList } from "./ResultList";

import CategoryIconFilter from './CategoryIconFilter';
import { SearchController } from './SearchController';
import { ImageWithFallback } from "./ImageWithFallback";
import LibraryManagementMode from './LibraryManagementMode';


export const CATEGORY_META: Record<string, any> = {
  'Food': { icon: Utensils, bgColor: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-100', path: '/zone/food', subtitle: 'Restaurants, snacks, and more' },
  'TV & Movies': { icon: Tv, bgColor: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-100', path: '/zone/watch', subtitle: 'Movies, tv series, and shows' },
  'Music': { icon: Headphones, bgColor: 'bg-purple-50', textColor: 'text-purple-600', borderColor: 'border-purple-100', path: '/zone/music', subtitle: 'Songs, albums, artists, and playlists' },
  'Products': { icon: ShoppingBag, bgColor: 'bg-pink-50', textColor: 'text-pink-600', borderColor: 'border-pink-100', path: '/zone/products', subtitle: 'Physical goods, software, and gadgets' },
  'Places': { icon: Globe, bgColor: 'bg-teal-50', textColor: 'text-teal-600', borderColor: 'border-teal-100', path: '/zone/places', subtitle: 'Countries, cities, and landmarks' },
  'Books': { icon: BookOpen, bgColor: 'bg-indigo-50', textColor: 'text-indigo-600', borderColor: 'border-indigo-100', path: '/zone/books', subtitle: 'Fiction, non-fiction, and audiobooks' },
  'Events': { icon: PartyPopper, bgColor: 'bg-yellow-50', textColor: 'text-yellow-600', borderColor: 'border-yellow-100', path: '/zone/events', subtitle: 'Concerts, festivals, and meetups' },
  'Games/Sports': { icon: Gamepad, bgColor: 'bg-red-50', textColor: 'text-red-600', borderColor: 'border-red-100', path: '/zone/games', subtitle: 'Video games, board games, and sports' },
  'Podcasts': { icon: Headphones, bgColor: 'bg-purple-50', textColor: 'text-purple-600', borderColor: 'border-purple-100', path: '/zone/podcasts', subtitle: 'Episodes, series, and creators' },
  'Creators': { icon: Star, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-200', path: '/zone/creators', subtitle: 'YouTuber, influencers, writers, etc.' },
  'Custom': { icon: Compass, bgColor: 'bg-neutral-100', textColor: 'text-neutral-600', borderColor: 'border-neutral-200', path: '/zone/custom', subtitle: 'Everything else' },
};

export default function UniversalLibrary() {
  const { user, signIn } = useUser();
  const { profile } = useUserProfile();
  const { userItems, saveItem } = useUserItems();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [initialSearchTerm] = useState(() => {
    return location.state?.query || '';
  });

  React.useEffect(() => {
    const handleSetSearch = (e: Event) => {
      // Event handled by SearchController now
    };
    window.addEventListener('set-library-search', handleSetSearch);
    return () => window.removeEventListener('set-library-search', handleSetSearch);
  }, []);
  
  const [filterOption, setFilterOption] = useState<'default' | 'all' | 'favorites' | 'liked' | 'disliked' | 'added-7' | 'added-30' | 'added-custom' | 'released-this-year' | 'released-last-5-years' | 'released-classic'>(() => {
    if (location.state?.filterOption) return location.state.filterOption;
    return 'all';
  });
  const [showLibraryOnly, setShowLibraryOnly] = useState(() => {
    if (location.state?.showLibraryOnly !== undefined) return location.state.showLibraryOnly;
    return true;
  });
  const [activeCategoryFilter, setActiveCategoryFilter] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(() => {
    if (location.state?.statusFilter) return location.state.statusFilter;
    return 'rated';
  });
  const [sortOption, setSortOption] = useState<'recency' | 'alphabetical' | 'rating' | 'year' | 'taste'>('recency');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [minYear, setMinYear] = useState<string>('');
  const [maxYear, setMaxYear] = useState<string>('');
  const [minDateAdded, setMinDateAdded] = useState<string>('');
  const [maxDateAdded, setMaxDateAdded] = useState<string>('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isFixingImages, setIsFixingImages] = useState(false);
  const [managementMode, setManagementMode] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'row' | 'grid'>('grid');

  React.useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem('dilecti_library_collapsed');
      if (storedCollapsed) setCollapsedCategories(JSON.parse(storedCollapsed));
      const storedHidden = localStorage.getItem('dilecti_library_hidden');
      if (storedHidden) setHiddenCategories(JSON.parse(storedHidden));
    } catch (e) {}
  }, []);

  const toggleHide = (key: string) => {
    setHiddenCategories(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try {
        localStorage.setItem('dilecti_library_hidden', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  React.useEffect(() => {
    setCategoryOrder(prev => {
      const stored = localStorage.getItem('dilecti_library_order');
      let newOrder = [...prev];
      if (stored) {
         try {
           const parsed = JSON.parse(stored);
           if (Array.isArray(parsed) && parsed.length > 0) {
             newOrder = parsed;
           }
         } catch(e){}
      }
      const curKeys = Object.keys(CATEGORY_META);
      curKeys.forEach(k => {
        if (!newOrder.includes(k)) newOrder.push(k);
      });
      return newOrder.filter(k => curKeys.includes(k));
    });
  }, []);

  const handleReorder = (newOrder: string[]) => {
    setCategoryOrder(newOrder);
    try {
      localStorage.setItem('dilecti_library_order', JSON.stringify(newOrder));
    } catch(e){}
  };

  const moveCategory = (key: string, direction: 'up' | 'down') => {
    setCategoryOrder(prev => {
      const index = prev.indexOf(key);
      if (index < 0) return prev;
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      } else if (direction === 'down' && index < prev.length - 1) {
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
      }
      try {
        localStorage.setItem('dilecti_library_order', JSON.stringify(next));
      } catch(e){}
      return next;
    });
  };

  const toggleCollapse = (key: string) => {
    setCollapsedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fixMissingImages = async () => {
    if (!userItems) return;
    const missing = userItems.filter(item => !item.coverUrl || item.coverUrl.includes('places.googleapis.com') || item.coverUrl.includes('unsplash.com'));
    if (missing.length === 0) {
      alert("All your library items already have images!");
      return;
    }
    
    setIsFixingImages(true);
    try {
       let processed = 0;
       
       for (let i = 0; i < missing.length; i += 10) {
         const batch = missing.slice(i, i + 10).map(m => ({ 
            id: m.id, 
            title: m.title, 
            subtitle: m.subtitle || (m as any).author || '', 
            category: m.category 
         }));
         
         const res = await fetch('/api/fill-missing-images', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ items: batch, locationContext: profile?.location || 'Austin, Texas' })
         });
         const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
         
         if (data.updatedItems && data.updatedItems.length > 0) {
           for (const update of data.updatedItems) {
             const original = userItems.find(u => u.id === update.id);
             if (original) {
               await saveItem({ ...original, coverUrl: update.coverUrl });
               processed++;
             }
           }
         }
       }
       
       if (processed > 0) {
         alert(`Found and saved images for ${processed} items!`);
       } else {
         alert("Could not find missing images for these items.");
       }
    } catch(e) {
       console.error("Failed to fix images", e);
       alert("Failed to fix images.");
    } finally {
       setIsFixingImages(false);
    }
  };

  const categories = React.useMemo(() => {
    const defaultCategories: Record<string, any[]> = {
      'Food': [],
      'TV & Movies': [],
      'Music': [],
      'Products': [],
      'Places': [],
      'Books': [],
      'Events': [],
      'Games/Sports': []
    };

    if (profile?.preferences) {
      const lines = profile.preferences.split('\n');
      lines.forEach((line, lineIdx) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const cat = match[1].trim();
          const items = match[2].split(',').map(i => i.trim());
          if (!defaultCategories[cat]) defaultCategories[cat] = [];
          items.forEach((i, idx) => {
             // Create mock minimal items for preference strings
             defaultCategories[cat].push({ id: `pref-${lineIdx}-${idx}`, title: i, isMinimal: true });
          });
        }
      });
    }
    
    // Add items from Firestore
    if (userItems && userItems.length > 0) {
       let itemsToProcess = userItems;

       itemsToProcess.forEach((item: any) => {
          let catName = 'Other';
          const cat = (item.category || '').toLowerCase();
          switch(cat) {
             case 'food': catName = 'Food'; break;
             case 'movie':
             case 'movies':
             case 'tv':
             case 'tv show':
             case 'tv shows':
             case 'tv series':
             case 'watch':
                catName = 'TV & Movies'; break;
             case 'music': catName = 'Music'; break;
             case 'product':
             case 'products':
                catName = 'Products'; break;
             case 'place':
             case 'places':
                catName = 'Places'; break;
             case 'book': 
             case 'books': 
                catName = 'Books'; break;
             case 'event': 
             case 'events': 
                catName = 'Events'; break;
             case 'game':
             case 'games':
             case 'video game':
             case 'video games':
             case 'sports':
             case 'board game':
             case 'board games':
                catName = 'Games/Sports'; break;
             case 'podcast':
             case 'podcasts':
                catName = 'Podcasts'; break;
             case 'creator':
             case 'creators':
                catName = 'Creators'; break;
             case 'custom':
             default:
                catName = 'Custom'; break;
          }
          
          if (statusFilter === 'rated') {
             const hasRatingOrReaction = item.rating || item.reaction;
             const isCompleted = ['completed', 'read', 'abandoned', 'not-for-me'].includes(item.status);
             if (!hasRatingOrReaction && !isCompleted) return;
          }
          if (statusFilter === 'up-next' && item.status !== 'up-next' && item.status !== 'planning') return;
          if (statusFilter === 'in-progress' && item.status !== 'in-progress' && item.status !== 'currently-reading' && item.status !== 'watching' && item.status !== 'reading') return;

          const ratingNum = item.rating ? Number(item.rating) : 0;
          const isLegacyGoogleRating = item.metadata?.googlePlacesRating === undefined && item.sourceAttribution === 'Google Places API' && Number(item.criticScore) > 0 && Number(item.criticScore) <= 5.0;
          const criticScoreNum = item.criticScore && !isLegacyGoogleRating ? Number(item.criticScore) : 0;
          const googlePlacesRating = Number(item.metadata?.googlePlacesRating !== undefined ? item.metadata?.googlePlacesRating : (isLegacyGoogleRating ? item.criticScore : 0));
          const isNotForMe = item.status === 'not-for-me' || item.status === 'abandoned' || item.reaction === 'hate' || item.reaction === 'skull' || item.reaction === 'dislike' || item.reaction === 'thumbs-down' || (ratingNum > 0 && ratingNum < 3) || (criticScoreNum > 0 && criticScoreNum < 5) || (googlePlacesRating > 0 && googlePlacesRating < 3);
          const isHighRated = ratingNum >= 4 || criticScoreNum >= 7 || googlePlacesRating >= 4 || item.reaction === 'love' || item.reaction === 'heart' || item.reaction === 'like' || item.reaction === 'thumbs-up';
          const isFavorite = item.reaction === 'love' || item.reaction === 'heart';

          if (filterOption === 'default' && isNotForMe) return;
          if (filterOption === 'favorites' && !isFavorite) return;
          if (filterOption === 'liked' && !isHighRated) return;
          if (filterOption === 'disliked' && !isNotForMe) return;
          if (filterOption === 'added-7' && (Date.now() - (item.dateAdded || 0)) > 7 * 24 * 60 * 60 * 1000) return;
          if (filterOption === 'added-30' && (Date.now() - (item.dateAdded || 0)) > 30 * 24 * 60 * 60 * 1000) return;
          if (filterOption === 'added-custom') {
            const addedDate = new Date(item.dateAdded || 0);
            if (minDateAdded && addedDate < new Date(minDateAdded)) return;
            if (maxDateAdded && addedDate > new Date(maxDateAdded)) return;
          }
          
          if (showLibraryOnly && item.inLibrary === false && item.status !== 'up-next' && item.status !== 'planning') return;

          const itemYear = item.metadata?.year || parseInt((item.title.match(/\b(19|20)\d{2}\b/) || [])[0] || '0') || Number(item.releaseYear) || 0;
          if (minYear && itemYear > 0 && itemYear < parseInt(minYear)) return;
          if (maxYear && itemYear > 0 && itemYear > parseInt(maxYear)) return;

          if (filterOption === 'released-this-year' && itemYear !== new Date().getFullYear()) return;
          if (filterOption === 'released-last-5-years' && itemYear < new Date().getFullYear() - 5) return;
          if (filterOption === 'released-classic' && itemYear > new Date().getFullYear() - 10) return;

          if (!defaultCategories[catName]) {
             defaultCategories[catName] = [];
          }
          defaultCategories[catName].unshift(item);
       });
    }

    // Always show all categories
    // Sort items based on sortOption
    for (const key of Object.keys(defaultCategories)) {
       const hasOrder = defaultCategories[key].some(i => i.isMinimal); // keep mock items at top ? No, let's just sort the others as well. Or we can separate mock items.
       defaultCategories[key].sort((a, b) => {
         // mock minimal items stay at the top or ignore them
         if (a.isMinimal && !b.isMinimal) return -1;
         if (!a.isMinimal && b.isMinimal) return 1;

         let result = 0;
         if (sortOption === 'alphabetical') {
            result = (a.title || '').localeCompare(b.title || ''); 
         } else if (sortOption === 'rating') {
            const rA = Number(a.rating) || 0;
            const rB = Number(b.rating) || 0;
            result = rA - rB; 
         } else if (sortOption === 'year') {
            const yearA = a.metadata?.year || parseInt((a.title.match(/\b(19|20)\d{2}\b/) || [])[0] || '0') || Number(a.releaseYear) || 0;
            const yearB = b.metadata?.year || parseInt((b.title.match(/\b(19|20)\d{2}\b/) || [])[0] || '0') || Number(b.releaseYear) || 0;
            if (yearA !== yearB) result = yearA - yearB; 
            else result = (a.dateAdded || 0) - (b.dateAdded || 0);
         } else if (sortOption === 'taste') {
            const tA = Number(a.criticScore || a.rating || 0);
            const tB = Number(b.criticScore || b.rating || 0);
            result = tA - tB;
         } else {
            result = (a.dateAdded || 0) - (b.dateAdded || 0);
         }
         return sortDirection === 'desc' ? -result : result;
       });
    }

    return defaultCategories;
  }, [profile?.preferences, userItems, statusFilter, sortOption, sortDirection, minYear, maxYear, minDateAdded, maxDateAdded, filterOption, showLibraryOnly]);

  const categoryKeys = Object.keys(CATEGORY_META);

  const displayKeys = (categoryOrder.length > 0 ? categoryOrder : categoryKeys).filter(key => {
    if (hiddenCategories.includes(key)) return false;
    if (activeCategoryFilter && activeCategoryFilter !== 'All') {
       if (key !== activeCategoryFilter) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      
      {/* Search and filter bar (Sticky) */}
      <div className="sticky top-0 z-30 bg-neutral-50/95 dark:bg-[#09090b]/95 backdrop-blur-md pt-2 pb-2 mb-4 sm:pt-4 sm:pb-4 sm:mb-6 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-neutral-100 dark:border-white/10">
        <div className="w-full mb-3 sm:mb-6">
            
            <SearchController
               userItems={userItems || []}
               initialQuery={initialSearchTerm}
               placeholder="Search your library..."
               onLocalSelect={(item) => {
                 window.dispatchEvent(new CustomEvent('open-item', { detail: item }));
               }}
               onGlobalSelect={(item) => {
                 window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { initialItem: item, initialCategory: null } }));
               }}
            />

        </div>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="relative shrink-0 flex gap-2">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-playlist-modal'))}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white border border-purple-200 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-colors text-purple-600 dark:text-purple-400 dark:bg-[#1a1a1a] dark:border-purple-500/30 dark:hover:bg-purple-900/20"
                title="Friend Mix"
              >
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-map-modal'))}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white border border-emerald-200 rounded-lg sm:rounded-xl hover:bg-emerald-50 transition-colors text-emerald-600 dark:text-emerald-400 dark:bg-[#1a1a1a] dark:border-emerald-500/30 dark:hover:bg-emerald-900/20"
                title="Discovery Map"
              >
                <MapIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => { setIsSortOpen(!isSortOpen); setIsFiltersOpen(false); }}
                className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border rounded-lg sm:rounded-xl transition-colors ${isSortOpen ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800'}`}
                title="Sort items"
              >
                <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {isSortOpen && (
                <div className="absolute top-full left-0 mt-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-2 w-[220px] z-50 flex flex-col items-start text-left text-sm text-black/70 dark:text-white/70 animate-in fade-in duration-200">
                  <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Sort By</div>
                  
                  <button onClick={() => { setSortOption('recency'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'recency' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                     Recently Saved {sortOption === 'recency' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setSortOption('alphabetical'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'alphabetical' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                     Alphabetical {sortOption === 'alphabetical' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setSortOption('rating'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'rating' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                     Rating {sortOption === 'rating' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setSortOption('year'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'year' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                     Release Year {sortOption === 'year' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setSortOption('taste'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'taste' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                     Taste Match <Sparkles className="w-3.5 h-3.5 ml-1 text-emerald-500 inline" /> {sortOption === 'taste' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  
                  <div className="w-full h-px bg-black/10 dark:bg-white/10 my-1"></div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Order</div>
                  
                  <button onClick={() => { setSortDirection('desc'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortDirection === 'desc' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Descending {sortDirection === 'desc' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setSortDirection('asc'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortDirection === 'asc' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Ascending {sortDirection === 'asc' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                </div>
              )}
              <button 
                onClick={() => { setIsFiltersOpen(!isFiltersOpen); setIsSortOpen(false); }}
                className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border rounded-lg sm:rounded-xl transition-colors ${isFiltersOpen ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800'}`}
                title="Filter items"
              >
                <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {isFiltersOpen && (
                <div className="absolute top-full left-0 mt-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-2 w-[220px] max-h-[300px] overflow-y-auto z-50 flex flex-col items-start text-left text-sm text-black/70 dark:text-white/70 animate-in fade-in duration-200 hide-scrollbar">
                  <button onClick={() => { setFilterOption('all'); setStatusFilter('rated'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${statusFilter === 'rated' && filterOption === 'all' ? 'font-bold text-black dark:text-white' : ''}`}>
                     All Ratings {statusFilter === 'rated' && filterOption === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setFilterOption('favorites'); setStatusFilter('rated'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'favorites' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Favorites {filterOption === 'favorites' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setFilterOption('liked'); setStatusFilter('rated'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'liked' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Positive Ratings {filterOption === 'liked' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setFilterOption('disliked'); setStatusFilter('rated'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'disliked' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Disliked Items {filterOption === 'disliked' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setFilterOption('all'); setStatusFilter('up-next'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${statusFilter === 'up-next' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Want to Try {statusFilter === 'up-next' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  
                  <div className="w-full h-px bg-black/10 dark:bg-white/10 my-1"></div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Date Added</div>
                  <button onClick={() => { setFilterOption('added-7'); setStatusFilter(null); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'added-7' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Last 7 Days {filterOption === 'added-7' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setFilterOption('added-30'); setStatusFilter(null); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'added-30' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Last 30 Days {filterOption === 'added-30' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setFilterOption('added-custom'); setStatusFilter(null); }} className={`w-full flex flex-col p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'added-custom' ? 'font-bold text-black dark:text-white' : ''}`}>
                    <div className="flex items-center justify-between w-full">
                      Custom Range {filterOption === 'added-custom' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                    </div>
                    {filterOption === 'added-custom' && (
                      <div className="flex flex-col gap-2 mt-2 w-full text-xs font-normal" onClick={(e) => e.stopPropagation()}>
                        <input type="date" value={minDateAdded} onChange={e => setMinDateAdded(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded px-2 py-1 outline-none focus:border-emerald-500" placeholder="Start Date" />
                        <input type="date" value={maxDateAdded} onChange={e => setMaxDateAdded(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded px-2 py-1 outline-none focus:border-emerald-500" placeholder="End Date" />
                      </div>
                    )}
                  </button>
                  
                  <div className="w-full h-px bg-black/10 dark:bg-white/10 my-1"></div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Release Date</div>
                  <button onClick={() => { setFilterOption('released-this-year'); setStatusFilter(null); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'released-this-year' ? 'font-bold text-black dark:text-white' : ''}`}>
                     This Year {filterOption === 'released-this-year' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setFilterOption('released-last-5-years'); setStatusFilter(null); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'released-last-5-years' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Last 5 Years {filterOption === 'released-last-5-years' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                  <button onClick={() => { setFilterOption('released-classic'); setStatusFilter(null); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'released-classic' ? 'font-bold text-black dark:text-white' : ''}`}>
                     Classics (10+ Years) {filterOption === 'released-classic' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
                onClick={() => setViewMode(viewMode === 'row' ? 'grid' : 'row')}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg sm:rounded-xl hover:bg-neutral-50 transition-colors dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800"
                title="Toggle view"
              >
                {viewMode === 'row' ? (
                    <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                    <List className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
            </button>
            <button
                onClick={() => setManagementMode(!managementMode)}
                className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border rounded-lg sm:rounded-xl transition-colors ${managementMode ? 'bg-emerald-900 border-emerald-900 text-white dark:bg-emerald-500 dark:border-emerald-500' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800'}`}
                title="Library Management Mode"
              >
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {userItems && (
      <div className="bg-white rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 shadow-sm border border-black/5 dark:bg-[#1a1a1a] dark:border-white/10 mb-6 flex flex-col gap-3 sm:gap-6">
          <div className="grid grid-cols-3 divide-x divide-black/5 dark:divide-white/5">
             <div 
               onClick={() => { setFilterOption('all'); setStatusFilter('rated'); }}
               className={`flex flex-col items-center justify-center space-y-1 sm:space-y-2 cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl py-2 ${filterOption === 'all' && statusFilter === 'rated' ? 'bg-neutral-50 dark:bg-white/5' : ''}`}
             >
                <Bookmark className={`w-4 h-4 sm:w-6 sm:h-6 ${filterOption === 'all' && statusFilter === 'rated' ? 'text-emerald-600 fill-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'}`} />
                <span className="font-bold text-lg sm:text-3xl text-neutral-900 dark:text-white">{userItems.filter(i => (i.rating || i.reaction || ['completed', 'read', 'abandoned', 'not-for-me'].includes(i.status))).length}</span>
                <div className="flex items-center gap-1 text-[10px] sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                   All Ratings <ChevronRight className="w-3 h-3 hidden sm:block" />
                </div>
             </div>
             <div 
               onClick={() => { setFilterOption('favorites'); setStatusFilter('rated'); }}
               className={`flex flex-col items-center justify-center space-y-1 sm:space-y-2 cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl py-2 ${filterOption === 'favorites' ? 'bg-neutral-50 dark:bg-white/5' : ''}`}
             >
                <Heart className={`w-4 h-4 sm:w-6 sm:h-6 ${filterOption === 'favorites' ? 'text-emerald-600 fill-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'}`} />
                <span className="font-bold text-lg sm:text-3xl text-neutral-900 dark:text-white">{userItems.filter(i => i.reaction === 'love').length}</span>
                <div className="flex items-center gap-1 text-[10px] sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                   Favorites <ChevronRight className="w-3 h-3 hidden sm:block" />
                </div>
             </div>
             <div 
               onClick={() => { setStatusFilter('up-next'); setFilterOption('all'); }}
               className={`flex flex-col items-center justify-center space-y-1 sm:space-y-2 cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl py-2 ${statusFilter === 'up-next' ? 'bg-neutral-50 dark:bg-white/5' : ''}`}
             >
                <Clock className={`w-4 h-4 sm:w-6 sm:h-6 ${statusFilter === 'up-next' ? 'text-emerald-600 fill-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'}`} />
                <span className="font-bold text-lg sm:text-3xl text-neutral-900 dark:text-white">{userItems.filter(i => i.status === 'up-next' || i.status === 'planning').length}</span>
                <div className="flex items-center gap-1 text-[10px] sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                   Want to Try <ChevronRight className="w-3 h-3 hidden sm:block" />
                </div>
             </div>
          </div>
          {(() => {
              if (!userItems || userItems.length < 3) return null;
              
              const decades: Record<string, number> = {};
              const genres: Record<string, number> = {};
              
              userItems.forEach(i => {
                 const year = i.metadata?.year || parseInt((i.title.match(/\b(19|20)\d{2}\b/) || [])[0] || '0') || Number(i.releaseYear) || 0;
                 if (year > 1900 && year < 2100) {
                    const decade = Math.floor(year / 10) * 10;
                    decades[`${decade}s`] = (decades[`${decade}s`] || 0) + 1;
                 }
                 
                 if (i.metadata?.genres) {
                    i.metadata.genres.forEach((g: string) => genres[g] = (genres[g] || 0) + 1);
                 } else if ((i as any).genres) {
                    (i as any).genres.forEach((g: string) => genres[g] = (genres[g] || 0) + 1);
                 } else if ((i as any).tags) {
                    (i as any).tags.forEach((t: string) => genres[t] = (genres[t] || 0) + 1);
                 } else if (i.subCategory) {
                    genres[i.subCategory] = (genres[i.subCategory] || 0) + 1;
                 }
              });
              
              let topDecade = '';
              let maxD = 0;
              Object.entries(decades).forEach(([d, c]) => { if (c > maxD) { maxD = c; topDecade = d; } });
              
              let topGenre = '';
              let maxG = 0;
              Object.entries(genres).forEach(([g, c]) => { if (c > maxG) { maxG = c; topGenre = g; } });
              
              let insight = "Your taste is evenly distributed across many styles and eras.";
              if (topGenre && topDecade) {
                  insight = `You lean heavily towards ${topDecade} ${topGenre} across mediums.`;
              } else if (topGenre) {
                  insight = `You have a strong affinity for ${topGenre} across all categories.`;
              } else if (topDecade) {
                  insight = `Your collection has a noticeable focus on ${topDecade} content.`;
              }

              return (
                  <div className="border-t border-black/5 dark:border-white/5 pt-3 sm:pt-4 px-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500" />
                          </div>
                          <div>
                              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500 mb-0.5">At a Glance</div>
                              <div className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">{insight}</div>
                          </div>
                      </div>
                      <button onClick={() => navigate('/profile')} className="text-[10px] sm:text-xs shrink-0 ml-2 font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity whitespace-nowrap">
                          View Profile
                      </button>
                  </div>
              );
          })()}
      </div>
      )}

      
      {!user ? (
        <div className="bg-white border text-center border-black/5 rounded-[2rem] p-10 flex flex-col items-center justify-center shadow-sm dark:bg-[#1a1a1a] dark:border-white/5">
           <h4 className="font-serif text-2xl md:text-3xl font-medium mb-3 tracking-tight">Sign in to view your library</h4>
           <p className="text-neutral-500 max-w-md mx-auto mb-8 font-medium dark:text-neutral-400">
              Create an account securely sync all your categories and favorites.
           </p>
           <button 
              onClick={signIn}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-3 font-medium transition-all shadow-sm active:scale-95"
           >
              Sign in with Google
           </button>
        </div>
      ) : categoryKeys.length === 0 ? (
        <div className="text-center py-24 px-6 border border-dashed border-black/10 rounded-3xl dark:border-white/10">
          <Compass className="w-12 h-12 text-black/20 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-lg font-medium text-black/60 mb-2 dark:text-white/60">
             Your Library is empty
          </h3>
          <p className="text-black/40 mb-6">
             Start saving movies, places, books and more to build your collection.
          </p>
          <button 
             onClick={() => window.dispatchEvent(new Event('create-new-item'))} 
             className="bg-black text-white px-6 py-3 rounded-full hover:bg-black/80 transition-all shadow-sm font-semibold dark:bg-white"
          >
             Add to Library
          </button>
        </div>
      ) : managementMode ? (
         <LibraryManagementMode />
      ) : (
        <>
          <Reorder.Group axis="y" values={displayKeys} onReorder={handleReorder} className="flex flex-col gap-12">
            {displayKeys.length === 0 ? (
               <div className="py-12 mt-6 text-center text-neutral-500 font-medium bg-white rounded-[2rem] border border-black/5 dark:bg-[#1a1a1a] dark:text-neutral-400 dark:border-white/5">
                  {initialSearchTerm.trim() !== '' ? 'No items match your search.' : 'No items in your library yet.'}
               </div>
            ) : displayKeys.map((key, idx) => {
              const meta = CATEGORY_META[key] || { icon: Compass, bgColor: 'bg-black/5', textColor: 'text-black/60', borderColor: 'border-black/10' };
              const items = categories[key] || [];
              const isCollapsed = collapsedCategories[key];
              
              return (
                <ResultList 
                   key={key} 
                   keyName={key} 
                   idx={idx} 
                   meta={meta} 
                   items={items} 
                   isCollapsed={isCollapsed} 
                   toggleCollapse={toggleCollapse} toggleHide={toggleHide} 
                   moveCategory={moveCategory} 
                   displayKeysLength={displayKeys.length} 
                   navigate={navigate} 
                   activeMenu={activeMenu} 
                   setActiveMenu={setActiveMenu} 
                   userItems={userItems} 
                   viewMode={viewMode}
                 />
              );
            })}
          </Reorder.Group>
          
          {displayKeys.length > 0 && (
            <div className="mt-12">
              <Reorder.Group axis="y" values={["All Ratings"]} onReorder={() => {}}>
                <ResultList 
                   keyName="All Ratings"
                   idx={0}
                   meta={{ icon: Star, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-200' }}
                   items={(userItems || []).filter((item: any) => {
                      const ratingNum = item.rating ? Number(item.rating) : 0;
                      const hasRatingOrReaction = ratingNum > 0 || item.reaction || item.criticScore;
                      const isCompleted = ['completed', 'read', 'abandoned', 'not-for-me'].includes(item.status);
                      return hasRatingOrReaction || isCompleted;
                   })}
                   isCollapsed={false}
                   toggleCollapse={() => {}}
                   moveCategory={() => {}}
                   displayKeysLength={1}
                   navigate={navigate}
                   activeMenu={activeMenu}
                   setActiveMenu={setActiveMenu}
                   userItems={userItems}
                   viewMode={viewMode}
                 />
              </Reorder.Group>
            </div>
          )}
          {hiddenCategories.length > 0 && (
             <div className="flex justify-center mt-8">
               <button 
                 onClick={() => {
                   setHiddenCategories([]);
                   localStorage.removeItem('dilecti_library_hidden');
                 }}
                 className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-[#1a1a1a] text-neutral-600 dark:text-neutral-400 rounded-full text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
               >
                 <EyeOff className="w-4 h-4" />
                 Restore {hiddenCategories.length} hidden {hiddenCategories.length === 1 ? 'category' : 'categories'}
               </button>
             </div>
          )}
        </>
      )}

      <CategoryIconFilter 
        value={activeCategoryFilter} 
        onChange={(val) => {
            if (!val || val === 'All') {
                setActiveCategoryFilter(null);
            } else {
                let targetPath = '/library';
                if (val === 'Books') targetPath = '/zone/books';
                else if (val === 'TV & Movies') targetPath = '/zone/watch';
                else if (val === 'Music') targetPath = '/zone/music';
                else if (val === 'Podcasts') targetPath = '/zone/podcasts';
                else if (val === 'Food') targetPath = '/zone/food';
                else if (val === 'Places') targetPath = '/zone/places';
                else if (val === 'Games/Sports') targetPath = '/zone/games';
                navigate(targetPath);
            }
        }} 
      />
    </div>
  );
}
