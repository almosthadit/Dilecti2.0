import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { cn, getNormalizedCat, getMockFriendsForTitle, formatIdentityText } from "../lib/utils";
import { useUser } from "../context/UserContext";
import {
  Utensils, Tv, Headphones, ShoppingBag, Globe, BookOpen, PartyPopper, Gamepad,
  ChevronLeft, Sparkles, Heart, Plus, Compass, ArrowRight, ChevronDown, ListFilter, BookmarkPlus, Loader2, SlidersHorizontal, LayoutGrid, List, ArrowUpDown, ThumbsUp, ThumbsDown, Skull, Search, Edit2
} from "lucide-react";
import { useUserItems, useUserProfile } from "../hooks";
import { CATEGORY_SUB_FILTERS, GLOBAL_DYNAMIC_FILTERS } from "../lib/constants";
import { useDraggableScroll } from "../hooks/useDraggableScroll";
import FeedTab from "./FeedTab";
import CategoryIconFilter from "./CategoryIconFilter";
import { RecommendationModal } from "./RecommendationModal";
import { MapIcon } from "lucide-react";
import Fuse from "fuse.js";
import { ImageWithFallback } from "./ImageWithFallback";
import { SmartSearchBar } from "./SmartSearchBar";
import LibraryManagementMode from "./LibraryManagementMode";


const getDynamicFilters = GLOBAL_DYNAMIC_FILTERS;

const CATEGORY_MAP: Record<string, any> = {
  food: { name: "Food", icon: Utensils, identityTitle: "The Cultural Explorer", color: "text-orange-500", border: "border-orange-500/20", glow: "from-orange-500/20" },
  watch: { name: "TV & Movies", icon: Tv, identityTitle: "The Story Seeker", color: "text-blue-500", border: "border-blue-500/20", glow: "from-blue-500/20" },
  music: { name: "Music", icon: Headphones, identityTitle: "The Sonic Voyager", color: "text-purple-500", border: "border-purple-500/20", glow: "from-purple-500/20" },
  products: { name: "Products", icon: ShoppingBag, identityTitle: "The Curator", color: "text-pink-500", border: "border-pink-500/20", glow: "from-pink-500/20" },
  places: { name: "Places", icon: Globe, identityTitle: "The Wanderer", color: "text-teal-500", border: "border-teal-500/20", glow: "from-teal-500/20" },
  books: { name: "Books", icon: BookOpen, identityTitle: "The Bibliophile", color: "text-indigo-500", border: "border-indigo-500/20", glow: "from-indigo-500/20" },
  events: { name: "Events", icon: PartyPopper, identityTitle: "The Socialite", color: "text-yellow-500", border: "border-yellow-500/20", glow: "from-yellow-500/20" },
  games: { name: "Games/Sports", icon: Gamepad, identityTitle: "The Competitor", color: "text-red-500", border: "border-red-500/20", glow: "from-red-500/20" },
};

const categorySubFilters = CATEGORY_SUB_FILTERS;


const getInProgressLabel = (cid: string) => {
  if (!cid) return 'In Progress';
  const c = cid.toLowerCase();
  if (c === 'books' || c === 'book') return 'Currently Reading';
  if (c === 'watch' || c === 'movies' || c === 'tv') return 'Currently Watching';
  if (c === 'games' || c === 'game') return 'Currently Playing';
  if (c === 'music') return 'Currently Listening';
  return 'In Progress';
};

export default function CategoryZone() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const { userItems, saveItem } = useUserItems();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [activeSubFilter, setActiveSubFilter] = useState('');
  const [activeSort, setActiveSort] = useState<'recency'|'rating'>('recency');
  const [activeDynamicFilter, setActiveDynamicFilter] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/universal-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, category: categoryId })
        });
        const data = await res.json();
        setGlobalSearchResults(data || []);
      } catch (e) {
        console.error(e);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryId]);

  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedRec, setSelectedRec] = useState<any | null>(null);

  const [viewMode, setViewMode] = useState<'row'|'grid'>('grid');
  const [managementMode, setManagementMode] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showLibraryOnly, setShowLibraryOnly] = useState(true);

  const dragPropsRatings = useDraggableScroll<HTMLDivElement>();
  const dragPropsWant = useDraggableScroll<HTMLDivElement>();
  const dragPropsRecs = useDraggableScroll<HTMLDivElement>();

  const cardWidthClass = profile?.cardSize === 'small' ? 'w-[160px] sm:w-[200px]' : profile?.cardSize === 'large' ? 'w-[240px] sm:w-[320px]' : 'w-[200px] sm:w-[280px]';

  const activeRecs = recommendations.filter((r) => {
    if (profile?.rejectedRecommendations?.includes(r.title)) return false;
    if (userItems?.some((i) => (i.title || "").toLowerCase() === (r.title || "").toLowerCase()))
      return false;
    return true;
  });

  useEffect(() => {
    if (location.hash === '#curated-for-you') {
        setTimeout(() => {
            const el = document.getElementById('curated-for-you');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300); // small delay to allow render
    } else {
        window.scrollTo(0, 0);
    }
  }, [location.hash, categoryId]);

  useEffect(() => {
    if (!categoryId) return;
    
    // Clear sub filter on category change
    setActiveSubFilter('');
    
    const fetchRecs = async () => {
       setLoadingRecs(true);
       try {
           const cachedRecsStr = localStorage.getItem(`dilecti_cat_recs_v3_${categoryId}`);
           if (cachedRecsStr) {
               setRecommendations(JSON.parse(cachedRecsStr));
               setLoadingRecs(false);
               return; // Don't re-fetch immediately for cost saving
           }
           
           let reqContext = profile?.preferences ? `Stated preferences: ${profile.preferences}. ` : '';
           
           const res = await fetch(`/api/universal-recommend`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-api-key": localStorage.getItem("user_gemini_api_key") || "", "x-user-ai-provider": localStorage.getItem("user_ai_provider") || "gemini" },
              body: JSON.stringify({ category: categoryId, context: reqContext, items: userItems })
           });
           const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
           if (Array.isArray(data)) {
               setRecommendations(data);
               localStorage.setItem(`dilecti_cat_recs_v3_${categoryId}`, JSON.stringify(data));
           }
       } catch (err) { }
       setLoadingRecs(false);
    };
    
    fetchRecs();
  }, [categoryId, profile?.preferences]);
  
  const getFallbackTags = (item: any) => {
      if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) return item.tags;
      const len = item.title.length;
      if (item.category === 'movie' || item.category === 'watch' || item.category === 'tv') {
         if (len % 3 === 0) return ['🎥 Spectacle', '🍿 Popcorn Fun'];
         if (len % 3 === 1) return ['🧠 Mind-Bending', '🏆 Award Winning'];
         return ['🔥 Fan Favorite', '⚡️ Fast Paced'];
      }
      if (item.category === 'book') {
         if (len % 3 === 0) return ['📚 Page Turner', '🧠 Deep Dive'];
         if (len % 3 === 1) return ['🌍 World Building', '💡 Insightful'];
         return ['📝 Great Prose', '🚀 Highlight'];
      }
      if (item.category === 'food' || item.category === 'drink') {
         if (len % 2 === 0) return ['🌶️ Flavorful', '🤤 Must Try'];
         return ['🍽️ Top Rated', '🍷 Great Vibe'];
      }
      if (item.category === 'music' || item.category === 'podcast') {
         if (len % 2 === 0) return ['🎧 Great Hooks', '🔁 On Repeat'];
         return ['✨ Masterpiece', '🎵 Catchy'];
      }
      return ['✨ Top Pick', '🔥 Trending'];
  };

  if (!categoryId || !CATEGORY_MAP[categoryId]) {
    return <div className="p-8 text-center pt-24 text-neutral-900 dark:text-white transition-colors">Category not found.</div>;
  }

  const meta = CATEGORY_MAP[categoryId];
  
  const getProfileContent = () => {
    const normId = getNormalizedCat(categoryId || '') || 'overall';
    let content = profile?.miniProfiles?.[normId]?.content || profile?.miniProfiles?.[meta?.name]?.content || profile?.miniProfiles?.[categoryId || 'overall']?.content;
    if (!content && categoryId === 'watch') {
      content = profile?.miniProfiles?.['movie']?.content || profile?.miniProfiles?.['tv']?.content || profile?.miniProfiles?.['movies']?.content;
    }
    return content;
  };

  const Icon = meta.icon;
  const availableSubFilters = categorySubFilters[categoryId] || [];

  const checkIsCat = React.useCallback((catStr: string) => {
      const cat = getNormalizedCat(catStr);
      if (categoryId === "watch") return ['movie', 'tv show', 'tv', 'watch', 'movies', 'tv shows', 'tv series'].includes(cat);
      if (categoryId === "food") return ['food', 'restaurant', 'dining', 'recipe', 'meal'].includes(cat);
      if (categoryId === "music") return ['music', 'song', 'album', 'podcast', 'artist'].includes(cat);
      if (categoryId === "products") return ['products', 'product'].includes(cat);
      if (categoryId === "places") return ['places', 'place'].includes(cat);
      if (categoryId === "books") return ['books', 'book'].includes(cat);
      if (categoryId === "events") return ['events', 'event'].includes(cat);
      if (categoryId === "games") return ['games', 'game'].includes(cat);
      return cat === categoryId;
  }, [categoryId]);

  const localSearchResults = React.useMemo(() => {
    if (!searchQuery.trim() || !userItems) return undefined;
    const fuse = new Fuse(userItems, {
      keys: ['title', 'subtitle', 'category', 'description', 'collections', 'metadata.tags'],
      threshold: 0.2,
      ignoreLocation: false,
    });
    const matches = fuse.search(searchQuery).map(result => result.item);

    return matches.sort((a: any, b: any) => {
       const isACat = checkIsCat(a.category || '');
       const isBCat = checkIsCat(b.category || '');
       if (isACat && !isBCat) return -1;
       if (!isACat && isBCat) return 1;
       return 0;
    });
  }, [searchQuery, userItems, checkIsCat]);

  const categoryItems = React.useMemo(() => {
    let items = (userItems || []).filter((b: any) => {
      if (showLibraryOnly && b.inLibrary === false && b.status !== 'up-next' && b.status !== 'planning') return false;
      
      let matchesCat = false;
      const cat = (b.category || '').toLowerCase();
      if (categoryId === "watch") matchesCat = ['watch', 'movie', 'movies', 'tv', 'tv series', 'tv show', 'tv shows'].includes(cat);
      else if (categoryId === "products") matchesCat = ['products', 'product'].includes(cat);
      else if (categoryId === "places") matchesCat = ['places', 'place'].includes(cat);
      else if (categoryId === "books") matchesCat = ['books', 'book'].includes(cat);
      else if (categoryId === "events") matchesCat = ['events', 'event'].includes(cat);
      else if (categoryId === "games") matchesCat = ['games', 'game'].includes(cat);
      else matchesCat = cat === categoryId;
      
      return matchesCat;
    });
    
    return items.filter((b: any) => {
      if (activeSubFilter) {
         // Support exact subtype/tags
         if (b.subtype?.toLowerCase() === activeSubFilter.toLowerCase() || b.tags?.includes(activeSubFilter.toLowerCase())) return true;
         if (b.subCategory && b.subCategory === activeSubFilter) return true;
         
         const searchStr = `${b.title} ${b.subtitle} ${b.category} ${b.metadata?.tags || ''} ${b.description || ''} ${b.collections ? b.collections.join(' ') : ''}`.toLowerCase();
         const subtitleLower = (b.subtitle || '').toLowerCase();
         const isActor = subtitleLower.includes('actor') || subtitleLower.includes('actress');
         
         if (activeSubFilter === 'Actors') return isActor;
         if (activeSubFilter === 'Movies') return (b.category === 'movie' || b.category === 'movies' || b.category === 'watch') && !isActor;
         if (activeSubFilter === 'TV Shows') return (b.category === 'tv' || b.category === 'tv series' || b.category === 'tv show' || b.category === 'tv shows') && !isActor;
         if (activeSubFilter === 'Artists') return searchStr.includes('artist') || (b.category === 'music' && !searchStr.includes('song') && !searchStr.includes('album'));
         if (activeSubFilter === 'Songs') return searchStr.includes('song') || searchStr.includes('track');
         if (activeSubFilter === 'Restaurants') return searchStr.includes('restaurant') || searchStr.includes('place') || searchStr.includes('dining') || (b.category === 'food' && !searchStr.includes('recipe') && !searchStr.includes('snack'));
         if (activeSubFilter === 'Board & Card Games') return searchStr.includes('board game') || searchStr.includes('tabletop') || searchStr.includes('card game');
         if (activeSubFilter === 'Video Games') return searchStr.includes('video game') || searchStr.includes('console') || searchStr.includes('pc game') || ((b.category === 'game' || b.category === 'games') && !searchStr.includes('board') && !searchStr.includes('sport'));
         if (activeSubFilter === 'Sports') return searchStr.includes('sport') || searchStr.includes('play') || searchStr.includes('team');
         
         if (!searchStr.includes(activeSubFilter.toLowerCase())) return false;
      }
      if (activeDynamicFilter) {
         const searchStr = `${b.title} ${b.subtitle} ${b.category} ${b.metadata?.tags || ''} ${b.description || ''} ${b.collections ? b.collections.join(' ') : ''} ${b.genres ? b.genres.join(' ') : ''} ${b.metadata?.genres ? b.metadata.genres.join(' ') : ''}`.toLowerCase();
         return searchStr.includes(activeDynamicFilter.toLowerCase());
      }
      return true;
    }).sort((a: any, b: any) => {
      if (activeSort === 'rating') {
          const ra = Number(a.rating) || 0;
          const rb = Number(b.rating) || 0;
          if (ra !== rb) return rb - ra;
      }
      const da = a.dateAdded || a.timestamp?.seconds * 1000 || 0;
      const db = b.dateAdded || b.timestamp?.seconds * 1000 || 0;
      return db - da; 
    });
  }, [userItems, showLibraryOnly, categoryId, activeSubFilter, activeDynamicFilter, activeSort]);

  const ratings = categoryItems.filter((i: any) => {
     const isUpNext = i.status === 'up-next' || i.status === 'planning';
     const isCompleted = i.status === 'completed' || i.status === 'read' || i.status === 'abandoned' || i.status === 'not-for-me';
     const ratingNum = i.rating ? Number(i.rating) : 0;
     return !isUpNext && (isCompleted || ratingNum > 0 || i.reaction);
  });

  const wantToTry = categoryItems.filter((i: any) => {
     return i.status === "up-next" || i.status === "planning";
  });

  const inProgress = categoryItems.filter((i: any) => {
     return i.status === "in-progress" || i.status === "currently-reading";
  });


  const handleQuickAdd = (status: "completed" | "planning" | "in-progress" = "completed") => {
    window.dispatchEvent(
      new CustomEvent("open-universal-add-item", { detail: { defaultCategory: categoryId, defaultStatus: status } }),
    );

  };

  return (
    <div className="min-h-screen pb-24 bg-white dark:bg-[#09090b] transition-colors relative selection:bg-emerald-500/30">
      <div className="px-4 py-4 md:py-6 max-w-5xl lg:max-w-7xl mx-auto">
        
        {/* Header with Dropdown */}
        <div className="flex justify-between items-center mb-8 pr-1 mt-4">
           <div className="flex items-center gap-1">
               <button onClick={() => navigate(-1)} className="p-2 -ml-3 mr-2 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-white/5 dark:hover:text-white transition-colors cursor-pointer z-10 relative dark:text-neutral-400">
                 <ChevronLeft className="w-6 h-6" />
               </button>
           <div className="relative">
               <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 py-2 px-3 -ml-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
               >
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm bg-neutral-50 dark:bg-transparent ${meta.color} group-hover:scale-105 transition-transform`}>
                       <Icon className="w-5 h-5" />
                   </div>
                   <div className="flex items-center gap-2">
                       <h1 className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 dark:text-white tracking-tight">{meta.name}</h1>
                       <ChevronDown className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                   </div>
               </button>
               
               {isDropdownOpen && (
                   <>
                       <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                       <div className="absolute top-16 left-0 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-2 py-3 origin-top-left animate-in fade-in zoom-in-95 duration-200">
                           {Object.entries(CATEGORY_MAP).map(([id, info]) => {
                               const DIcon = info.icon;
                               return (
                                   <button 
                                      key={id} 
                                      onClick={() => { setIsDropdownOpen(false); navigate(`/zone/${id}`); }}
                                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left font-serif font-medium ${categoryId === id ? 'bg-neutral-50 dark:bg-white/5 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                                   >
                                       <DIcon className="w-4 h-4 opacity-70" />
                                       {info.name}
                                   </button>
                               );
                           })}
                       </div>
                   </>
               )}
           </div>
           </div>
        </div>

        {/* Global Toolbar Header */}
      <div className="sticky top-0 z-30 bg-neutral-50/95 dark:bg-[#09090b]/95 backdrop-blur-md pt-2 pb-4 mb-6 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-neutral-100 dark:border-white/10">
           <div className="w-full mb-4 sm:mb-6">
              
              <SmartSearchBar 
                 placeholder={`Search ${meta.name}...`}
                 value={searchQuery}
                 onChange={(val) => setSearchQuery(val)}
                 localResults={localSearchResults}
                 onLocalResultSelect={(item) => {
                   window.dispatchEvent(new CustomEvent('open-item', { detail: item }));
                   setSearchQuery('');
                 }}
                 globalResults={globalSearchResults}
                 onGlobalResultSelect={(item) => {
                   window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { initialItem: item, initialCategory: categoryId } }));
                   setSearchQuery('');
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
                     
                     <button onClick={() => { setActiveSort('recency'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${activeSort === 'recency' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Recently Saved {activeSort === 'recency' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button onClick={() => { setActiveSort('rating'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${activeSort === 'rating' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Rating {activeSort === 'rating' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
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
                     <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Visibility</div>
                     
                     <button onClick={() => { setShowLibraryOnly(true); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${showLibraryOnly ? 'font-bold text-black dark:text-white' : ''}`}>
                        Library Items Only {showLibraryOnly && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button onClick={() => { setShowLibraryOnly(false); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${!showLibraryOnly ? 'font-bold text-black dark:text-white' : ''}`}>
                        All Rated Items {!showLibraryOnly && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>

                     <div className="my-1.5 border-t border-black/5 dark:border-white/5 w-full" />
                     <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">{meta.name} Filters</div>
                     
                     <button onClick={() => { setActiveSubFilter(''); setActiveDynamicFilter(''); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${!activeSubFilter && !activeDynamicFilter ? 'font-bold text-black dark:text-white' : ''}`}>
                        All {!activeSubFilter && !activeDynamicFilter && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     {availableSubFilters.map(f => (
                         <button key={f} onClick={() => { setActiveSubFilter(f); setActiveDynamicFilter(''); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${activeSubFilter === f ? 'font-bold text-black dark:text-white' : ''}`}>
                            {f} {activeSubFilter === f && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                         </button>
                     ))}
                     {getDynamicFilters(categoryId || '').map(f => (
                         <button key={f} onClick={() => { setActiveDynamicFilter(f); setActiveSubFilter(''); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${activeDynamicFilter === f ? 'font-bold text-black dark:text-white' : ''}`}>
                            {f} {activeDynamicFilter === f && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                         </button>
                     ))}
                   </div>
                 )}
               </div>
             </div>
             
             <button
                 onClick={() => setManagementMode(!managementMode)}
                 className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border rounded-lg sm:rounded-xl transition-colors ${managementMode ? 'bg-emerald-900 border-emerald-900 text-white dark:bg-emerald-500 dark:border-emerald-500' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800'}`}
                 title="Toggle bulk edit"
               >
                 <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
             </button>
             <button
                 onClick={() => setViewMode(viewMode === 'row' ? 'grid' : 'row')}
                 className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg sm:rounded-xl hover:bg-neutral-50 transition-colors dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800 ml-auto shrink-0"
                 title="Toggle view"
               >
                 {viewMode === 'row' ? (
                     <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                 ) : (
                     <List className="w-4 h-4 sm:w-5 sm:h-5" />
                 )}
             </button>
           </div>
       </div>

        {managementMode ? (
           <LibraryManagementMode initialCategory={categoryId} />
        ) : (
          <>
            {/* Subcategory Pills */}
        {availableSubFilters.length > 0 && (
           <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mb-6 min-w-0 pb-1">
              {availableSubFilters.map(f => (
                <button 
                  key={f}
                  onClick={() => { setActiveSubFilter(activeSubFilter === f ? '' : f); setActiveDynamicFilter(''); }} 
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${activeSubFilter === f ? 'border-emerald-500 text-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/30 dark:text-emerald-400' : 'border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:text-neutral-400 dark:border-white/10 dark:hover:bg-white/5'}`}
                >
                  <span>{f}</span>
                </button>
              ))}
              {getDynamicFilters(categoryId || '').map(f => (
                <button 
                  key={f}
                  onClick={() => { setActiveDynamicFilter(activeDynamicFilter === f ? '' : f); setActiveSubFilter(''); }} 
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${activeDynamicFilter === f ? 'border-emerald-500 text-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/30 dark:text-emerald-400' : 'border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:text-neutral-400 dark:border-white/10 dark:hover:bg-white/5'}`}
                >
                  <span>{f}</span>
                </button>
              ))}
           </div>
        )}

        
        {/* In Progress Section */}
        {inProgress.length > 0 && (
        <div className="mb-10">
           <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">{getInProgressLabel(categoryId)}</h2>
           </div>
           
           <div {...(viewMode === 'grid' ? dragPropsWant : {})} className={viewMode === 'grid' ? `flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 hide-scrollbar snap-x ${dragPropsWant.className}` : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4 pt-1"}>
               {inProgress.map((item: any, i: number) => (
                  <div key={i} className={viewMode === 'grid' ? `${cardWidthClass} shrink-0 snap-start group cursor-pointer relative` : "w-full group cursor-pointer relative"} onClick={() => window.dispatchEvent(new CustomEvent("open-item", { detail: item }))}>
                      <div className="w-full aspect-[2/3] bg-neutral-100 dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5 relative">
                          {item.coverUrl ? (
                             <ImageWithFallback src={item.coverUrl} className="w-full h-full object-cover" alt={item.title} />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600"><Compass className="w-8 h-8" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 pt-6 flex flex-col justify-end pointer-events-none">
                              <h4 className="font-bold text-[13px] leading-tight text-white drop-shadow-md line-clamp-2 mb-1">{item.title}</h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-white/80 font-medium whitespace-nowrap overflow-hidden">
                                 {item.rating > 0 && (<><span className="text-[#fbbf24]">★</span><span>{item.rating}</span><span className="text-white/40 mb-1">.</span></>)}<span className="truncate">{item.subtype || item.category}</span>
                              </div>
                          </div>
                      </div>
                  </div>
               ))}
           </div>
        </div>
        )}

        {/* Your Ratings Section */}

        <div className="mb-10">
           <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
               <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">Your Ratings</h2>
               {/* Category Stats */}
               {(() => {
                  const completedItems = categoryItems.filter((i: any) => ['completed', 'read', 'watched'].includes(i.status));
                  if (completedItems.length === 0) return null;

                  let statLabel = '';
                  let statValue = '';

                  if (categoryId === 'movie' || categoryId === 'tv' || categoryId === 'watch') {
                      const minutes = completedItems.reduce((acc, curr: any) => acc + (curr.runtime || 0), 0);
                      if (minutes > 0) {
                          statLabel = 'Hours Watched';
                          statValue = Math.round(minutes / 60).toLocaleString();
                      }
                  } else if (categoryId === 'book' || categoryId === 'read') {
                      const pages = completedItems.reduce((acc, curr: any) => acc + (curr.pages || curr.pageCount || 0), 0);
                      if (pages > 0) {
                          statLabel = 'Pages Read';
                          statValue = pages.toLocaleString();
                      }
                  } else {
                      statLabel = 'Items Completed';
                      statValue = completedItems.length.toLocaleString();
                  }

                  if (!statLabel) return null;

                  // Determine Top Genre
                  const genreCounts: Record<string, number> = {};
                  completedItems.forEach((it: any) => {
                      if (it.metadata?.genres) {
                          it.metadata.genres.forEach((g: string) => {
                              genreCounts[g] = (genreCounts[g] || 0) + 1;
                          });
                      } else if (it.genres) {
                          it.genres.forEach((g: string) => {
                              genreCounts[g] = (genreCounts[g] || 0) + 1;
                          });
                      } else if (it.subCategory) {
                          genreCounts[it.subCategory] = (genreCounts[it.subCategory] || 0) + 1;
                      } else if (it.tags) {
                          it.tags.forEach((t: string) => {
                              genreCounts[t] = (genreCounts[t] || 0) + 1;
                          });
                      }
                  });
                  
                  let topGenre = '';
                  let maxCount = 0;
                  Object.entries(genreCounts).forEach(([g, count]) => {
                      if (count > maxCount) {
                          maxCount = count;
                          topGenre = g;
                      }
                  });

                  return (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                              <span className="font-serif font-bold text-neutral-900 dark:text-white">{statValue}</span> {statLabel}
                          </div>
                          {topGenre && (
                              <div className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                                  Top Area: <span className="font-serif font-bold text-neutral-900 dark:text-white">{topGenre}</span>
                              </div>
                          )}
                      </div>
                  );
               })()}
           </div>
           
           <div {...(viewMode === 'grid' ? dragPropsRatings : {})} className={viewMode === 'grid' ? `flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 hide-scrollbar snap-x ${dragPropsRatings.className}` : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4 pt-1"}>
               <button
                  onClick={() => handleQuickAdd("completed")}
                  className={viewMode === 'grid' ? `w-[80px] sm:w-[100px] flex-shrink-0 snap-start bg-neutral-50 border-2 border-dashed border-neutral-200 dark:bg-white/5 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-[1.5rem] flex flex-col items-center justify-center transition-colors group relative self-stretch aspect-[2/3]` : "w-full h-full min-h-[200px] bg-neutral-50 border-2 border-dashed border-neutral-200 dark:bg-white/5 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-[1.5rem] flex flex-col items-center justify-center transition-colors group relative aspect-[2/3]"}
               >
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-100/50 rounded-full flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <div className="text-emerald-700 font-bold text-xs sm:text-sm dark:text-emerald-400 px-1 truncate leading-none">Add</div>
               </button>

               {ratings.map((item: any, i: number) => (
                  <div key={i} className={viewMode === 'grid' ? `${cardWidthClass} shrink-0 snap-start group cursor-pointer relative` : "w-full group cursor-pointer relative"} onClick={() => window.dispatchEvent(new CustomEvent("open-item", { detail: item }))}>
                      <div className="w-full aspect-[2/3] bg-neutral-100 dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5 relative">
                          {item.coverUrl ? (
                             <ImageWithFallback src={item.coverUrl} className="w-full h-full object-cover" alt={item.title} />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600"><Icon className="w-8 h-8" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 pt-6 flex flex-col justify-end pointer-events-none">
                              <h4 className="font-bold text-[13px] leading-tight text-white drop-shadow-md line-clamp-2 mb-1">{item.title}</h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-white/80 font-medium whitespace-nowrap overflow-hidden">
                                 
                                 

                                 {item.status !== "up-next" && item.status !== "planning" && item.rating > 0 && (<><span className="text-[#fbbf24]">★</span><span>{item.rating}</span><span className="text-white/40 mb-1">.</span></>)}<span className="truncate">{item.subtype || item.category}</span>
                                 {item.runtime ? (
                                    <>

                                       <span>{item.runtime}m</span>
                                    </>
                                 ) : (item.pages || item.pageCount) ? (
                                    <>

                                       <span>{item.pages || item.pageCount}p</span>
                                    </>
                                 ) : null}
                              </div>
                          </div>
                      </div>
                      
                      {(item.status !== "up-next" && item.status !== "planning" && (item.reaction || item.rating > 0)) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-white/10 backdrop-blur-md rounded-full shadow-sm flex items-center justify-center z-10">
                              {(() => {
                                const reaction = item.reaction || ((item.criticScore || item.rating) >= 8 ? 'love' : (item.criticScore || item.rating) >= 5 && (item.criticScore || item.rating) <= 7 ? 'like' : (item.criticScore || item.rating) > 0 && (item.criticScore || item.rating) <= 4 ? 'dislike' : null);
                                if (reaction === 'love' || reaction === 'heart' || reaction === 'favorite') return <Heart className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />;
                                if (reaction === 'like' || reaction === 'thumbs-up') return <ThumbsUp className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />;
                                if (reaction === 'dislike' || reaction === 'thumbs-down') return <ThumbsDown className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />;
                                if (reaction === 'hate' || reaction === 'skull') return <Skull className="w-3.5 h-3.5 text-red-500 fill-red-500 dark:text-red-400 dark:fill-red-400" />;
                                return null;
                              })()}
                          </div>
                      )}
                      {profile?.showSocialIndicators !== false && getMockFriendsForTitle(item.title) && (
                         <div onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-social-modal', { detail: { itemId: item.id, title: item.title } })); }} className="absolute top-2 left-2 z-10 flex -space-x-2 cursor-pointer hover:scale-105 transition-transform">
                             {getMockFriendsForTitle(item.title)!.map((friendName, idx) => (
                                 <img 
                                    key={idx}
                                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${friendName}`} 
                                    className="w-6 h-6 rounded-full border border-white shadow-sm" 
                                    alt="Friend" 
                                    title={`${friendName} likes this`} 
                                 />
                             ))}
                         </div>
                      )}
                  </div>
               ))}
           </div>
        </div>

        {/* Want to Try Section */}
        <div className="mb-10">
           <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">Want to Try</h2>
           </div>
           
           <div {...(viewMode === 'grid' ? dragPropsWant : {})} className={viewMode === 'grid' ? `flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 hide-scrollbar snap-x ${dragPropsWant.className}` : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4 pt-1"}>
               <button
                  onClick={() => handleQuickAdd("planning")}
                  className={viewMode === 'grid' ? `w-[80px] sm:w-[100px] flex-shrink-0 snap-start bg-neutral-50 border-2 border-dashed border-neutral-200 dark:bg-white/5 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-[1.5rem] flex flex-col items-center justify-center transition-colors group relative self-stretch aspect-[2/3]` : "w-full h-full min-h-[200px] bg-neutral-50 border-2 border-dashed border-neutral-200 dark:bg-white/5 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-[1.5rem] flex flex-col items-center justify-center transition-colors group relative aspect-[2/3]"}
               >
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-100/50 rounded-full flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <div className="text-emerald-700 font-bold text-xs sm:text-sm dark:text-emerald-400 px-1 truncate leading-none">Add</div>
               </button>

               {wantToTry.map((item: any, i: number) => (
                  <div key={i} className={viewMode === 'grid' ? `${cardWidthClass} shrink-0 snap-start group cursor-pointer relative` : "w-full group cursor-pointer relative"} onClick={() => window.dispatchEvent(new CustomEvent("open-item", { detail: item }))}>
                      <div className="w-full aspect-[2/3] bg-neutral-100 dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5 relative">
                          {item.coverUrl ? (
                             <ImageWithFallback src={item.coverUrl} className="w-full h-full object-cover" alt={item.title} />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600"><Icon className="w-8 h-8" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 pt-6 flex flex-col justify-end pointer-events-none">
                              <h4 className="font-bold text-[13px] leading-tight text-white drop-shadow-md line-clamp-2 mb-1">{item.title}</h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-white/80 font-medium whitespace-nowrap overflow-hidden">
                                 <Compass className="w-3 h-3 text-emerald-400" />
                                 {item.status !== "up-next" && item.status !== "planning" && item.rating > 0 && (<><span className="text-[#fbbf24]">★</span><span>{item.rating}</span><span className="text-white/40 mb-1">.</span></>)}<span className="truncate">{item.subtype || item.category}</span>
                                 {item.runtime ? (
                                    <>

                                       <span>{item.runtime}m</span>
                                    </>
                                 ) : (item.pages || item.pageCount) ? (
                                    <>

                                       <span>{item.pages || item.pageCount}p</span>
                                    </>
                                 ) : null}
                              </div>
                          </div>
                      </div>
                      
                      <div className="absolute top-2 right-2 w-6 h-6 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-sm flex items-center justify-center hover:bg-black/60 transition-colors z-10">
                          <Heart className="w-3.5 h-3.5 text-white/70" />
                      </div>
                      {profile?.showSocialIndicators !== false && getMockFriendsForTitle(item.title) && (
                         <div className="absolute top-2 left-2 z-10 flex -space-x-2">
                             {getMockFriendsForTitle(item.title)!.map((friendName, idx) => (
                                 <img 
                                    key={idx}
                                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${friendName}`} 
                                    className="w-6 h-6 rounded-full border border-white shadow-sm" 
                                    alt="Friend" 
                                    title={`${friendName} likes this`} 
                                 />
                             ))}
                         </div>
                      )}
                  </div>
               ))}
               {wantToTry.length === 0 && (
                   <div className={viewMode === 'grid' ? `${cardWidthClass} shrink-0 snap-start bg-neutral-50 dark:bg-white/5 border border-dashed border-neutral-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 text-center aspect-[2/3]` : "w-full bg-neutral-50 dark:bg-white/5 border border-dashed border-neutral-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 text-center aspect-[2/3]"}>
                       <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">No items saved yet</span>
                   </div>
               )}
           </div>
        </div>
        
        {/* Recommendations Area */}
        <div id="curated-for-you" className="mb-12 scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">Curated For You</h2>
                </div>
            </div>
            
            {loadingRecs ? (
               <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600/50 mb-4" />
                  <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">Discovering things you'll love...</p>
               </div>
            ) : activeRecs.length > 0 ? (
               <div {...(viewMode === 'grid' ? dragPropsRecs : {})} className={viewMode === 'grid' ? `flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 hide-scrollbar snap-x ${dragPropsRecs.className}` : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4 pt-1"}>
                   {activeRecs.map((rec: any, idx) => (
                       <div key={idx} onClick={() => setSelectedRec(rec)} className={viewMode === 'grid' ? `${cardWidthClass} flex-shrink-0 snap-start cursor-pointer group h-full` : "w-full cursor-pointer group h-full"}>
                           <div className="w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full dark:bg-[#1a1a1a] dark:border-white/10">
                              <div className={`w-full aspect-[2/3] flex items-center justify-center relative overflow-hidden ${!rec.coverUrl ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-neutral-100'}`}>
                                 {rec.coverUrl ? (
                                     <ImageWithFallback src={rec.coverUrl} alt={rec.title} className="w-full h-full object-cover" />
                                 ) : (
                                     <Icon className="w-12 h-12 mb-3 opacity-50 text-neutral-400" />
                                 )}
                                 
                                 <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1.5 shadow-sm">
                                    <Icon className="w-3 h-3 text-white/90" />
                                    <span className="text-[9px] text-white font-bold uppercase tracking-wider">{rec.category || categoryId}</span>
                                 </div>
                                 <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        saveItem({ ...rec, category: categoryId, status: 'planning' });
                                    }}
                                    className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white p-1.5 rounded-full hover:bg-emerald-600 transition-colors shadow-sm active:scale-95 z-20"
                                 >
                                    <BookmarkPlus className="w-4 h-4" />
                                 </button>
                                 {profile?.showSocialIndicators !== false && rec.friendMatch && (
                                    <div className="absolute top-2 left-2 z-20">
                                       <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${rec.friendMatch}`} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="Friend" title={`${rec.friendMatch} likes this`} />
                                    </div>
                                 )}
                              </div>
                              <div className="p-4 flex-1 flex flex-col">
                                 <h4 className="font-bold text-sm leading-tight text-neutral-900 group-hover:text-emerald-700 line-clamp-2 md:line-clamp-1 mb-1 dark:text-white">{rec.title}</h4>
                                 <p className="text-xs text-neutral-500 line-clamp-1 mb-1 dark:text-neutral-400">{rec.subtitle || rec.category || categoryId}</p>
                                 {rec.description && (
                                    <p className="text-xs text-neutral-600 line-clamp-2 mb-2 leading-relaxed dark:text-neutral-400">{rec.description}</p>
                                 )}
                                 <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 font-medium italic mt-auto leading-snug line-clamp-3">"{rec.reason}"</p>
                              </div>
                           </div>
                       </div>
                   ))}
               </div>
            ) : (
               <div className="bg-neutral-50 dark:bg-white/5 border border-dashed border-neutral-200 dark:border-white/10 rounded-3xl p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <p className="text-sm">Save more items or update your preferences to generate personalized recommendations.</p>
               </div>
            )}
        </div>
        
        {/* Identity Card */}
        {!activeSubFilter && (
        <div 
            onClick={() => {
                navigate('/profile', { state: { activeNarrativeTab: categoryId } });
            }}
            className={`bg-neutral-50 dark:bg-neutral-900 rounded-[2rem] p-6 mb-10 border border-neutral-200 dark:border-white/5 relative overflow-hidden group cursor-pointer hover:border-neutral-300 dark:hover:border-white/10 transition-colors shadow-lg`}
        >
            <div className={`absolute right-[-10%] top-1/2 -translate-y-1/2 w-[70%] h-[150%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${meta.glow} via-transparent to-transparent pointer-events-none opacity-30 dark:opacity-20`} />
            
            <div className="relative z-10 w-full pr-12">
               <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">
                   Your {meta.name} Identity
               </div>
               <h3 className="text-xl md:text-2xl font-serif font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
                   {(() => {
                       const c = getProfileContent();
                       if (c) {
                           try {
                               const parsed = JSON.parse(c);
                               if (parsed.title) return parsed.title;
                           } catch (e) {
                               if (c.includes('## Title')) {
                                   const m = c.match(/## Title\n+([^\n]+)/);
                                   if (m && m[1]) return m[1].trim();
                               }
                               if (c.includes('## The Hook')) {
                                   const m = c.match(/## The Hook\n+([^\n]+)/);
                                   if (m && m[1]) return m[1].trim();
                               }
                           }
                       }
                       return meta.identityTitle;
                   })()}
               </h3>
               <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed max-w-[280px]">
                   {(() => {
                       const c = getProfileContent();
                       if (c) {
                           try {
                               const parsed = JSON.parse(c);
                               if (parsed.core_read) {
                                   const txt = formatIdentityText(parsed.core_read);
                                   return txt.length > 150 ? txt.substring(0, 147) + '...' : txt;
                               }
                           } catch (e) {
                               if (c.includes('## Summary')) {
                                   const m = c.match(/## Summary\n+([\s\S]*?)(?=\n##|$)/);
                                   if (m && m[1]) {
                                       const txt = formatIdentityText(m[1].trim().replace(/\n/g, ' '));
                                       return txt;
                                   }
                               }
                               if (c.includes('## TLDR')) {
                                   const m = c.match(/## TLDR\n+([\s\S]*?)(?=\n##|$)/);
                                   if (m && m[1]) {
                                       const txt = formatIdentityText(m[1].trim().replace(/\n/g, ' '));
                                       return txt;
                                   }
                               }
                               if (c.includes('## The Insight')) {
                                   const m = c.match(/## The Insight\n+([\s\S]*?)(?=\n##|$)/);
                                   if (m && m[1]) {
                                       const txt = formatIdentityText(m[1].trim().replace(/\n/g, ' '));
                                       return txt.length > 150 ? txt.substring(0, 147) + '...' : txt;
                                   }
                               }
                           }
                       }
                       return `A reflection of how your ${categoryId} tastes shape you. Based on data science and metadata clustering.`;
                   })()}
               </p>
               
               <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                   <Sparkles className="w-3.5 h-3.5" /> View Taste Constellation
               </div>
            </div>

            {/* Radar graphic mock */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-40 h-40 hidden sm:flex items-center justify-center pointer-events-none opacity-80 dark:opacity-40 translate-x-4">
                 <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-500/50">
                     <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" />
                     <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" />
                     <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.2" />
                     <Globe className="w-6 h-6 absolute text-emerald-600 dark:text-emerald-400" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
                     <circle cx="80" cy="20" r="2" fill="#fbbf24" />
                     <circle cx="20" cy="70" r="2" fill="#fbbf24" />
                     <circle cx="90" cy="50" r="2" fill="#fbbf24" />
                 </svg>
            </div>
            
            <div className="absolute right-5 bottom-5 w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors transform group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4" />
            </div>
        </div>
        )}

        {/* Social Feed - Specific to this category */}
        <div className="border-t border-neutral-200 dark:border-white/5 pt-10 mt-10">
            <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white mb-6">Recommended by Others</h2>
            <div className="bg-neutral-50 dark:bg-white/5 rounded-3xl p-6 md:p-8 min-h-[400px]">
                <FeedTab 
                   hideHeader={true} 
                   categoryFilter={categoryId} 
                />
            </div>
        </div>

      </>
      )}
      </div>
      <RecommendationModal
         selectedRec={selectedRec} 
         setSelectedRec={setSelectedRec} 
         onReject={(rec) => {
             const newRecs = recommendations.filter(r => r.title !== rec.title);
             setRecommendations(newRecs);
             localStorage.setItem(`dilecti_cat_recs_v3_${categoryId}`, JSON.stringify(newRecs));
             setSelectedRec(null);
         }} 
         saveItem={(item) => {
             saveItem(item);
             const newRecs = recommendations.filter(r => r.title !== item.title);
             setRecommendations(newRecs);
             localStorage.setItem(`dilecti_cat_recs_v3_${categoryId}`, JSON.stringify(newRecs));
         }}
       />
       <CategoryIconFilter 
         value={meta.name}
         onChange={(val) => {
             if (!val || val === 'All') {
                 navigate('/library');
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

