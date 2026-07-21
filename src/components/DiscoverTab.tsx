import React, { useState, useEffect, useRef } from "react";
import { useUserProfile, useUserItems } from "../hooks";
import { Loader2, Plus, ChevronRight, ChevronDown, EyeOff, GripVertical, BookmarkPlus, Sparkles, ArrowUpDown, SlidersHorizontal, List, LayoutGrid, Headphones, Map as MapIcon, Heart, Utensils, Tv, Music, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { CATEGORY_META } from "./UniversalLibrary";
import { RecommendationModal } from "./RecommendationModal";
import { Reorder, useDragControls } from "motion/react";
import { useLongPress } from "../lib/useLongPress";
import { CATEGORY_SUB_FILTERS_DISPLAY_NAMES } from "../lib/constants";
import { sanitizeReason, getMockFriendsForTitle } from '../lib/utils';
import { useDraggableScroll } from "../hooks/useDraggableScroll";
import CategoryIconFilter from "./CategoryIconFilter";
import { collectionGroup, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ImageWithFallback } from "./ImageWithFallback";
import { rankCandidates } from '../services/recommendationEngine';

const categoryToApiCat: Record<string, string> = {
  'Food': 'food',
  'TV & Movies': 'movie',
  'Music': 'music',
  'Products': 'products',
  'Places': 'places',
  'Books': 'book',
  'Events': 'events',
  'Games/Sports': 'game',
  'Podcasts': 'podcast',
  'Creators': 'creators',
  'Custom': 'custom'
};

const categoryKeys = Object.keys(categoryToApiCat).filter(k => k !== 'Custom' && k !== 'Creators');

function DiscoverSection({ keyName, meta, items, isLoading, navigate, setSelectedRec, categoryToApiCat, saveItem, viewMode, sortOption, filterOption, fetchMore, isCollapsed, toggleCollapse, toggleHide, foodLocation, setFoodLocation, foodGlobalMode, setFoodGlobalMode }: any) {
  const { profile } = useUserProfile();
  const Icon = meta.icon;
  const controls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const [typeFilters, setTypeFilters] = useState<Record<string, 'include' | 'exclude'>>({});
  const dragPropsCat = useDraggableScroll<HTMLDivElement>();
  
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasTriggeredFetch, setHasTriggeredFetch] = useState(false);

  useEffect(() => {
    // Removed intersection observer auto-fetching.
    // We now rely on the single bulk fetch in DiscoverTab on mount.
    if (!isLoading || hasTriggeredFetch || isCollapsed) return;
  }, [isLoading, hasTriggeredFetch, fetchMore, keyName, isCollapsed]);

  const cardWidthClass = profile?.cardSize === 'small' ? 'w-[160px] sm:w-[200px]' : profile?.cardSize === 'large' ? 'w-[240px] sm:w-[320px]' : 'w-[200px] sm:w-[280px]';

  const longPressHandlers = useLongPress(
    (e) => {
      controls.start(e as any);
    },
    undefined,
    { delay: 350, shouldPreventDefault: false }
  );

  const availableFilters = CATEGORY_SUB_FILTERS_DISPLAY_NAMES[keyName] || [];

  const filteredItems = React.useMemo(() => {
    if (!items) return items;
    const activeIncludes = Object.entries(typeFilters).filter(([_, v]) => v === 'include').map(([k]) => k);
    const activeExcludes = Object.entries(typeFilters).filter(([_, v]) => v === 'exclude').map(([k]) => k);
    
    if (activeIncludes.length === 0 && activeExcludes.length === 0) return items;
    
    return items.filter((item: any) => {
      const searchStr = `${item.title} ${item.subtitle} ${item.category} ${item.metadata?.tags || ''} ${item.description || ''} ${item.subCategory || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      const subtitleLower = (item.subtitle || '').toLowerCase();
      
      const isActor = subtitleLower.includes('actor') || subtitleLower.includes('actress') || subtitleLower.includes('director') || subtitleLower.includes('comedian');
      
      const matchType = (t: string) => {
         const tLower = t.toLowerCase();
         if (item.subCategory && item.subCategory.toLowerCase() === tLower) return true;
         if (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(tLower))) return true;

         const cat = (item.category || '').toLowerCase();
         if (t === 'Actors') return isActor;
         if (t === 'Artists') return searchStr.includes('artist') || searchStr.includes('band');
         if (t === 'Songs') return searchStr.includes('song') || searchStr.includes('track');
         if (t === 'Albums') return searchStr.includes('album');
         if (t === 'Movies') return cat === 'movie' || cat === 'movies' || (cat === 'watch' && !searchStr.includes(' tv') && !searchStr.includes('series') && !searchStr.includes('show'));
         if (t === 'TV Shows') return cat === 'tv' || cat === 'tv series' || searchStr.includes('tv') || searchStr.includes('series') || searchStr.includes('show');
         if (t === 'Restaurants') return cat === 'restaurant' || (cat === 'food' && !searchStr.includes('snack') && !searchStr.includes('recipe') && !searchStr.includes('meal') && !item.genres?.some((g: string) => g.toLowerCase() === 'meal') && !item.metadata?.genre?.some((g: string) => g.toLowerCase() === 'meal'));
         if (t === 'Snacks') return searchStr.includes('snack');
         if (t === 'Meals') return searchStr.includes('meal') || searchStr.includes('recipe') || item.genres?.some((g: string) => g.toLowerCase() === 'meal') || item.metadata?.genre?.some((g: string) => g.toLowerCase() === 'meal');
         if (t === 'Video Games') return searchStr.includes('game') || searchStr.includes('playstation') || searchStr.includes('xbox') || searchStr.includes('nintendo') || searchStr.includes('pc') || (cat === 'game' && !searchStr.includes('sport'));
         if (t === 'Board & Card Games') return searchStr.includes('board') || searchStr.includes('card');
         if (t === 'Sports') return searchStr.includes('sport') || searchStr.includes('basketball') || searchStr.includes('football') || searchStr.includes('soccer');
         if (t === 'Fiction') return (cat === 'book' || cat === 'books') && !searchStr.includes('non-fiction') && !searchStr.includes('biography');
         if (t === 'Non-Fiction') return (cat === 'book' || cat === 'books') && (searchStr.includes('non-fiction') || searchStr.includes('biography'));
         
         return searchStr.includes(tLower);
      };

      if (activeExcludes.length > 0 && activeExcludes.some(matchType)) return false;
      if (activeIncludes.length > 0 && !activeIncludes.some(matchType)) return false;
      
      if (filterOption === 'curated') {
         // mock curation disabled to ensure all items are shown
         // if ((item.title.length + (item.rating || 0)) % 5 === 0) return false;
      }
      
      return true;
    }).sort((a: any, b: any) => {
       if (sortOption === 'rating') {
          return (b.rating || Math.random() * 10) - (a.rating || Math.random() * 10);
       }
       return 0; // recency/relevance mock
    });
  }, [items, typeFilters, sortOption, filterOption]);

  return (
    <Reorder.Item 
      key={keyName} 
      value={keyName} 
      dragListener={false} 
      dragControls={controls} 
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      className={`w-full bg-white rounded-3xl ${isDragging ? 'shadow-lg ring-2 ring-black/5 scale-[1.02] z-50' : ''} dark:bg-[#1a1a1a]`}
    >
      <div ref={sectionRef} {...longPressHandlers} className="group flex flex-col mb-4 select-none bg-white p-4 -m-4 rounded-xl cursor-default dark:bg-[#1a1a1a] relative">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
               <div 
                 className="absolute -left-6 top-3 cursor-grab hover:bg-black/5 p-1 rounded-md text-black/30 hover:text-black/60 transition-colors touch-none active:scale-95 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                 onPointerDown={(e) => controls.start(e)}
                 style={{ touchAction: 'none' }}
                 title="Drag to reorder"
               >
                 <GripVertical className="w-5 h-5" />
               </div>
               <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 duration-300 ${meta.bgColor} ${meta.textColor} ${meta.borderColor}`}>
                  <Icon className="w-6 h-6" />
               </div>
               <div className="flex items-center cursor-pointer group/title min-w-0" onClick={() => meta.path ? navigate(meta.path) : null}>
                  <h3 className="font-serif text-2xl font-bold text-neutral-900 group-hover/title:text-black transition-colors dark:text-white truncate">{keyName}</h3>
                  <ChevronRight className="w-5 h-5 shrink-0 ml-1 mt-1 text-black/20 group-hover/title:text-black/50 group-hover/title:translate-x-0.5 transition-all" strokeWidth={2.5} />
               </div>
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     toggleCollapse(keyName);
                  }}
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ml-1"
                  title={isCollapsed ? "Expand category" : "Collapse category"}
               >
                  <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
               </button>
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     toggleHide(keyName);
                  }}
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ml-1 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Hide category"
               >
                  <EyeOff className="w-4 h-4 text-neutral-400" />
               </button>
            </div>
         </div>
         {!(isCollapsed || isDragging) && keyName === 'Food' && (
           <div className="mt-4 ml-2 sm:ml-12 flex flex-col gap-3">
             <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                <div className="relative flex-1">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <MapIcon className="h-4 w-4 text-neutral-400" />
                   </div>
                   <input
                     type="text"
                     value={foodLocation}
                     onChange={(e) => {
                         setFoodLocation(e.target.value);
                         localStorage.setItem("food_location", e.target.value);
                         if (e.target.value.trim() === '') {
                             fetchMore([keyName]);
                         }
                     }}
                     onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                             fetchMore([keyName]);
                         }
                     }}
                     placeholder="Enter location (e.g. San Francisco) or leave empty for global"
                     className="block w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md leading-5 bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                   />
                </div>
             </div>
             {availableFilters.length > 0 && (
               <div className="flex gap-2 items-center overflow-x-auto hide-scrollbar pb-1">
                 {availableFilters.map(f => {
               const state = typeFilters[f];
               return (
                 <button 
                   key={f}
                   onClick={() => {
                     setTypeFilters(prev => {
                       const next = { ...prev };
                       if (!state) next[f] = 'include';
                       else if (state === 'include') next[f] = 'exclude';
                       else delete next[f];
                       return next;
                     });
                   }} 
                   className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                     state === 'include' ? `bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm ring-1 ring-emerald-200` : 
                     state === 'exclude' ? `bg-red-50 text-red-600 border-red-200 shadow-sm line-through decoration-red-400` : 
                     "bg-black/5 border-transparent text-neutral-600 hover:bg-black/10"
                   }`}
                 >
                   {state === 'exclude' && <span className="mr-1 inline-block no-underline">×</span>}
                   {state === 'include' && <span className="mr-1 inline-block">+</span>}
                   {f}
                 </button>
               );
             })}
           </div>
         )}
         </div>
         )}
         {!(isCollapsed || isDragging) && keyName !== 'Food' && availableFilters.length > 0 && (
           <div className="flex gap-2 mt-4 ml-2 sm:ml-12 items-center overflow-x-auto hide-scrollbar pb-1">
             {availableFilters.map(f => {
               const state = typeFilters[f];
               return (
                 <button 
                   key={f}
                   onClick={() => {
                     setTypeFilters(prev => {
                       const next = { ...prev };
                       if (!state) next[f] = 'include';
                       else if (state === 'include') next[f] = 'exclude';
                       else delete next[f];
                       return next;
                     });
                   }} 
                   className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                     state === 'include' ? `bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm ring-1 ring-emerald-200` : 
                     state === 'exclude' ? `bg-red-50 text-red-600 border-red-200 shadow-sm line-through decoration-red-400` : 
                     "bg-black/5 border-transparent text-neutral-600 hover:bg-black/10"
                   }`}
                 >
                   {state === 'exclude' && <span className="mr-1 inline-block no-underline">×</span>}
                   {state === 'include' && <span className="mr-1 inline-block">+</span>}
                   {f}
                 </button>
               );
             })}
           </div>
         )}
      </div>
      
      {!(isCollapsed || isDragging) && (
        <>
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-300 mb-3" />
                <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Curating selections...</p>
             </div>
          ) : filteredItems && filteredItems.length > 0 ? (
             <div {...(viewMode === 'grid' ? dragPropsCat : {})} className={viewMode === 'grid' ? `flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x ${dragPropsCat.className}` : `flex flex-col gap-3 pb-4`}>
                {filteredItems.map((rec: any) => (
                   <div key={rec.title} className={viewMode === 'grid' ? `${cardWidthClass} flex-shrink-0 snap-start` : `w-full`}>
                      <div 
                        className={`w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex group cursor-pointer dark:bg-[#1a1a1a] dark:border-white/10 ${viewMode === 'grid' ? 'flex-col h-full' : 'flex-row items-stretch'}`}
                        onClick={() => setSelectedRec({...rec, category: categoryToApiCat[keyName]})}
                      >
                         <div className={`${viewMode === 'grid' ? 'w-full aspect-video sm:aspect-[4/3]' : 'w-24 sm:w-32 h-auto flex-shrink-0'} flex items-center justify-center relative overflow-hidden ${!(rec.coverUrl || rec.imageUrl || rec.background_image) ? meta.bgColor : 'bg-neutral-100'}`}>
                            {(rec.coverUrl || rec.imageUrl || rec.background_image) ? (
                               <>
                                  <ImageWithFallback 
                                      category={rec.category} src={rec.coverUrl || rec.imageUrl || rec.background_image} 
                                     alt={rec.title} 
                                     className="w-full h-full object-cover relative z-10" 
                                     referrerPolicy="no-referrer"
                                     onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        if (target.nextElementSibling) {
                                           (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                        }
                                     }}
                                  />
                                  <div className={`absolute inset-0 items-center justify-center ${meta.bgColor} z-0`} style={{ display: 'none' }}>
                                     <Icon className={`w-8 h-8 sm:w-12 sm:h-12 opacity-50 ${meta.iconColor}`} />
                                  </div>
                               </>
                            ) : (
                               <Icon className={`w-8 h-8 sm:w-12 sm:h-12 opacity-50 ${meta.textColor}`} />
                            )}
                            
                            {viewMode === 'grid' && (
                              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1.5 shadow-sm">
                                 <Icon className="w-3 h-3 text-white/90" />
                                 <span className="text-[9px] text-white font-bold uppercase tracking-wider">{rec.category || categoryToApiCat[keyName]}</span>
                              </div>
                            )}
                            <button
                               onClick={(e) => {
                                  e.stopPropagation();
                                  saveItem({ ...rec, category: categoryToApiCat[keyName], status: 'want to try', coverUrl: rec.coverUrl || rec.imageUrl || rec.background_image || "" });
                               }}
                               className={`${viewMode === 'grid' ? 'absolute bottom-2 right-2' : 'absolute bottom-2 right-2'} bg-black/60 backdrop-blur-md text-white p-1.5 rounded-full hover:bg-emerald-600 transition-colors shadow-sm active:scale-95`}
                            >
                               <BookmarkPlus className="w-4 h-4" />
                            </button>

                            {profile?.showSocialIndicators !== false && getMockFriendsForTitle(rec.title) && (
                               <div 
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     window.dispatchEvent(new CustomEvent('open-social-modal', { detail: { itemId: rec.id || rec.title, title: rec.title } }));
                                  }}
                                  className="absolute top-2 left-2 z-10 flex -space-x-2 cursor-pointer hover:scale-105 transition-transform"
                               >
                                   {getMockFriendsForTitle(rec.title)!.map((friendName, idx) => (
                                       <img 
                                          key={idx}
                                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${friendName}`} 
                                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-sm" 
                                          alt="Friend" 
                                          title={`${friendName} likes this`} 
                                       />
                                   ))}
                               </div>
                            )}
                         </div>
                         
                         <div className={`p-4 flex-1 flex flex-col ${viewMode === 'row' ? 'justify-center' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                               <div>
                                 <h4 className={`font-bold leading-tight text-neutral-900 group-hover:text-emerald-700 dark:text-white ${viewMode === 'grid' ? 'text-sm line-clamp-2 md:line-clamp-1 mb-1' : 'text-base mb-1'}`}>{rec.title}</h4>
                                 <p className={`text-neutral-500 dark:text-neutral-400 ${viewMode === 'grid' ? 'text-xs line-clamp-1 mb-1' : 'text-sm mb-1'}`}>{rec.subtitle || rec.category || categoryToApiCat[keyName]}</p>
                               </div>
                               {viewMode === 'row' && (
                                  <div className="bg-black/5 dark:bg-white/10 rounded-full px-2 py-1 flex items-center gap-1.5 shrink-0">
                                     <Icon className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                                     <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">{rec.category || categoryToApiCat[keyName]}</span>
                                  </div>
                               )}
                            </div>
                            
                            {rec.description && (
                               <p className={`text-neutral-600 dark:text-neutral-400 leading-relaxed ${viewMode === 'grid' ? 'text-xs line-clamp-2 mb-2' : 'text-sm line-clamp-2 mb-2'}`}>{rec.description}</p>
                            )}
                            <p className={`text-emerald-800/80 font-medium italic leading-snug line-clamp-3 ${viewMode === 'grid' ? 'text-[11px] mt-auto' : 'text-xs'}`}>"{sanitizeReason(rec.context?.topReasons?.[0] || rec.context?.noveltyExplanation || rec.reason || "Recommended for your tastes.", rec.category)}"</p>
                            
                            {rec.context?.finalScore !== undefined && (
                               <div className="flex items-center gap-1.5 mt-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                     {rec.context.finalScore >= 80 ? "Strong match" : rec.context.finalScore >= 60 ? "Good match" : "Worth exploring"}
                                  </span>
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                ))}
                {fetchMore && (
                   <div className={viewMode === 'grid' ? `${cardWidthClass} flex-shrink-0 snap-start h-[100%] flex items-stretch min-h-[250px]` : `w-full mt-4`}>
                       <button 
                           onClick={() => fetchMore([keyName])}
                           disabled={isLoading}
                           className={`w-full h-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-200 dark:border-emerald-500/30 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-500 ${viewMode === 'row' ? 'py-8' : 'min-h-[200px]'}`}
                       >
                           {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                               <>
                                   <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center shadow-sm">
                                       <Plus className="w-6 h-6" />
                                   </div>
                                   <span className="font-bold text-sm">Get more recommendations</span>
                               </>
                           )}
                       </button>
                   </div>
                )}
             </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-6 px-4">
                 <div className="text-sm text-neutral-400 italic mb-4 dark:text-neutral-500">Nothing new right now.</div>
                 {fetchMore && (
                     <button 
                         onClick={() => fetchMore([keyName])}
                         disabled={isLoading}
                         className="px-6 py-2 border border-emerald-200 dark:border-emerald-500/30 rounded-full hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-500 font-medium text-sm"
                     >
                         Get more recommendations
                     </button>
                 )}
             </div>
          )}
        </>
      )}
    </Reorder.Item>
  );
}



export default function DiscoverTab() {
  const { user } = useUser();
  const { profile, updateProfile } = useUserProfile();
  const { userItems, saveItem } = useUserItems();
  const navigate = useNavigate();
  
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [foodLocation, setFoodLocation] = useState<string>(localStorage.getItem("food_location") || "");
  
  const [discoveries, setDiscoveries] = useState<Record<string, any[]>>({});
  const [selectedRec, setSelectedRec] = useState<any | null>(null);
  const [isSeedPack, setIsSeedPack] = useState<boolean>(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const [sourceFilters, setSourceFilters] = useState({
    global: true,
    personal: false,
    friends: false
  });
  const hasFetchedMissing = useRef(false);
  const [friendItems, setFriendItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchFriends = async () => {
       try {
         const q = query(collectionGroup(db, 'items'), where('isPrivate', '==', false), limit(200));
         const snap = await getDocs(q);
         const docs = snap.docs.map(d => d.data());
         setFriendItems(docs.filter(d => d.userId && d.userId !== user.uid));
       } catch(e) {}
    };
    fetchFriends();
  }, [user]);

  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem('dilecti_discover_collapsed');
      if (storedCollapsed) setCollapsedCategories(JSON.parse(storedCollapsed));
      const storedHidden = localStorage.getItem('dilecti_discover_hidden');
      if (storedHidden) setHiddenCategories(JSON.parse(storedHidden));
    } catch (e) {}
  }, []);

  const toggleCollapse = (key: string) => {
    setCollapsedCategories(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('dilecti_discover_collapsed', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleHide = (key: string) => {
    setHiddenCategories(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try {
        localStorage.setItem('dilecti_discover_hidden', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };
  
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortOption, setSortOption] = useState<'recency' | 'rating'>('recency');
  const [filterOption, setFilterOption] = useState<'curated' | 'all'>('curated');
  const [viewMode, setViewMode] = useState<'row' | 'grid'>('grid');

  useEffect(() => {
    setCategoryOrder(prev => {
      const stored = localStorage.getItem('dilecti_discover_order');
      let newOrder = [...prev];
      if (stored) {
         try {
           const parsed = JSON.parse(stored);
           if (Array.isArray(parsed) && parsed.length > 0) {
             newOrder = parsed;
           }
         } catch(e){}
      }
      categoryKeys.forEach(k => {
        if (!newOrder.includes(k)) newOrder.push(k);
      });
      return newOrder.filter(k => categoryKeys.includes(k));
    });
  }, []);

  const handleReorder = (newOrder: string[]) => {
    if (activeFilter) return; // don't save reorder if filtered
    setCategoryOrder(newOrder);
    try {
      localStorage.setItem('dilecti_discover_order', JSON.stringify(newOrder));
    } catch(e){}
  };

  const handleReject = (keyName: string, rec: any, e?: React.MouseEvent) => {
     if (e) e.stopPropagation();
     if (!updateProfile || !profile) return;
     
     const currentItems = discoveries[keyName] || [];
     const newRecs = currentItems.filter((r: any) => r.title !== rec.title);
     
     setDiscoveries(prev => ({ ...prev, [keyName]: newRecs }));
     
     const rejected = profile.rejectedRecommendations || [];
     if (!rejected.includes(rec.title)) rejected.push(rec.title);

     updateProfile({
       rejectedRecommendations: rejected
     });
     
     try {
       const cached = JSON.parse(localStorage.getItem('dilecti_discover_cache') || '{}');
       cached[keyName] = newRecs;
       localStorage.setItem('dilecti_discover_cache', JSON.stringify(cached));
     } catch(e) {}
     
     setSelectedRec(null);
  };

  const handleFetchMore = async (catsChunk: string[]) => {
      const apiCats = catsChunk.map(c => categoryToApiCat[c]);
      
      
      try {
        let fullContextStr = '';
        if (profile) {
           const buildContexts = () => {
             let fullArr = [];
             if (profile.preferences) fullArr.push(`Stated preferences: ${profile.preferences}`);
             if (profile.interests && profile.interests.length > 0) fullArr.push(`Specific Interests: ${profile.interests.join(', ')}`);
             if (userItems && userItems.length > 0) {
               const likes = userItems.filter(i => (i.criticScore || i.rating) >= 8 || i.reaction === 'love').slice(0, 10);
               if (likes.length > 0) fullArr.push(`Favs: ${likes.map(i => i.title).join(',')}`);
               const dislikes = userItems.filter(i => ((i.criticScore || i.rating) > 0 && (i.criticScore || i.rating) <= 4) || i.reaction === 'dislike' || i.reaction === 'hate' || i.status === 'not-for-me').slice(0, 20);
               if (dislikes.length > 0) fullArr.push(`Dislikes: ${dislikes.map(i => i.title).join(',')}`);
             }
             return fullArr.join('|');
           };
           fullContextStr = buildContexts();
        }

        const batchResults: Record<string, any[]> = {};
        
        // Collect user titles to use as the base for the pgvector centroid
        const userTitles = (userItems || []).map(i => i.title);

        const apiCats = catsChunk.map(cat => categoryToApiCat[cat]);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch("/api/vector-discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categories: apiCats,
            userTitles
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
           throw new Error(`Vector discover API failed with status ${res.status}`);
        }
        if (res.ok) {
           const responseData = await res.json().catch(() => ({ results: [] }));
           const vectorData = Array.isArray(responseData) ? responseData : (responseData.results || []);
           if (responseData.isSeedPack) {
               setIsSeedPack(true);
           }
           
           // Group the results back into their respective categories
           vectorData.forEach((item: any) => {
               const cat = item.category === 'movie' || item.category === 'watch' ? 'TV & Movies' :
                           item.category === 'book' ? 'Books' :
                           item.category === 'game' ? 'Games/Sports' :
                           item.category === 'food' ? 'Food' :
                           item.category === 'music' ? 'Music' :
                           item.category === 'places' ? 'Places' :
                           item.category === 'podcast' ? 'Podcasts' :
                           item.category === 'events' ? 'Events' :
                           item.category === 'products' ? 'Products' : 'Custom';
               
               if (!batchResults[categoryToApiCat[cat]]) batchResults[categoryToApiCat[cat]] = [];
               batchResults[categoryToApiCat[cat]].push(item);
           });
        }
        
        const mergedDiscoveries = { ...(profile.cachedDiscoveries || {}) };
        setDiscoveries(prev => {
            const updated = { ...prev };
            catsChunk.forEach(cat => {
               const apiCat = categoryToApiCat[cat];
               const existingItems = updated[cat] || [];
               
               if (batchResults[apiCat] && Array.isArray(batchResults[apiCat])) {
                  let aiRecs = batchResults[apiCat];
                  aiRecs.forEach((r: any) => r.category = apiCat);
                  
                  const userTitles = new Set(userItems?.map(i => (i.title || "").toLowerCase()) || []);
                  const rejected = new Set(profile?.rejectedRecommendations?.map((t: string) => t.toLowerCase()) || []);
                  
                  // Put aiRecs first so fresh data (with images) overwrites cached data
                  let combined = [...aiRecs, ...existingItems].filter((item, index, self) =>
                      index === self.findIndex((t) => t.title === item.title) &&
                      item.title && !userTitles.has(item.title.toLowerCase()) && !rejected.has(item.title.toLowerCase())
                  );
                  
                  const likedItems = userItems?.filter(i => (i.criticScore || i.rating || 0) >= 8 || i.reaction === 'love') || [];
                  const dislikedItems = userItems?.filter(i => ((i.criticScore || i.rating || 0) > 0 && (i.criticScore || i.rating || 0) <= 4) || i.reaction === 'dislike' || i.reaction === 'hate' || i.status === 'not-for-me') || [];
                  
                  updated[cat] = rankCandidates(combined, profile?.tasteState || { topCategories: [apiCat] }, null, undefined, dislikedItems, likedItems);
               } else {
                  const likedItems = userItems?.filter(i => (i.criticScore || i.rating || 0) >= 8 || i.reaction === 'love') || [];
                  const dislikedItems = userItems?.filter(i => ((i.criticScore || i.rating || 0) > 0 && (i.criticScore || i.rating || 0) <= 4) || i.reaction === 'dislike' || i.reaction === 'hate' || i.status === 'not-for-me') || [];
                  updated[cat] = rankCandidates(existingItems, profile?.tasteState || { topCategories: [apiCat] }, null, undefined, dislikedItems, likedItems);
               }
               mergedDiscoveries[cat] = updated[cat];
            });
            
            updateProfile({
               cachedDiscoveries: mergedDiscoveries,
               cachedDiscoveriesAt: Date.now(),
               cachedDiscoveriesContext: JSON.stringify({ prefs: profile.preferences || {}, interests: profile.interests || [] }) + "_v2"
            });
            
            return updated;
        });
      } catch (e: any) {
        console.warn("Failed to fetch more discoveries chunk", e?.message || e);
        // Fallback: populate empty arrays for categories that were requested so they stop loading
        setDiscoveries(prev => {
           const updated = { ...prev };
           catsChunk.forEach(cat => {
              if (updated[cat] === undefined) {
                 const apiCat = categoryToApiCat[cat];
                 const likedItems = userItems?.filter((i: any) => (i.criticScore || i.rating || 0) >= 8 || i.reaction === 'love') || [];
                 const dislikedItems = userItems?.filter((i: any) => ((i.criticScore || i.rating || 0) > 0 && (i.criticScore || i.rating || 0) <= 4) || i.reaction === 'dislike' || i.reaction === 'hate' || i.status === 'not-for-me') || [];
                 updated[cat] = rankCandidates([], profile?.tasteState || { topCategories: [apiCat] }, null, undefined, dislikedItems, likedItems);
              }
           });
           return updated;
        });
      } finally {
      }
  };

  useEffect(() => {
    let active = true;

    if (!profile) return;
    
    if ((!profile?.preferences || profile?.preferences.length === 0) && (!userItems || userItems.length === 0)) {
       return;
    }

    const currentPrefs = JSON.stringify({ prefs: profile.preferences || {}, interests: profile.interests || [] }) + "_v2";
    const isContextIdentical = profile.cachedDiscoveriesContext === currentPrefs;
    const now = Date.now();
    let isCacheValid = profile.cachedDiscoveriesAt && (now - profile.cachedDiscoveriesAt < 24 * 60 * 60 * 1000);
    
    let discoveriesToUse = profile.cachedDiscoveries || {};
    
    // Invalidate cache if items are missing coverUrls (migrating to new image extraction logic)
    if (isCacheValid && isContextIdentical) {
        for (const k of Object.keys(discoveriesToUse)) {
            if (discoveriesToUse[k] && Array.isArray(discoveriesToUse[k])) {
                const hasMissingImages = discoveriesToUse[k].some((item: any) => !item.coverUrl);
                if (hasMissingImages) {
                    isCacheValid = false;
                    break;
                }
            }
        }
    }
    
    if (!isCacheValid || !isContextIdentical) {
       discoveriesToUse = {};
    }

    const preFiltered: Record<string, any[]> = {};
    for (const k of Object.keys(discoveriesToUse)) {
       if (discoveriesToUse[k] && Array.isArray(discoveriesToUse[k])) {
          preFiltered[k] = discoveriesToUse[k].filter(item => {
             if (profile?.rejectedRecommendations?.includes(item.title)) return false;
             if (userItems?.some(ui => (ui.title || "").toLowerCase() === (item.title || "").toLowerCase())) return false;
             return true;
          });
       }
    }

    if (active) {
       setDiscoveries(preFiltered);
    }
    
    // Auto-fetch missing categories immediately if not cached
    const missingCats = categoryKeys.filter(k => !preFiltered[k] || preFiltered[k].length === 0);
    if (active && missingCats.length > 0 && !hasFetchedMissing.current) {
        hasFetchedMissing.current = true;
        handleFetchMore(missingCats);
    }
    
    return () => {
      active = false;
    };
  }, [profile?.cachedDiscoveries, profile?.cachedDiscoveriesContext, profile?.cachedDiscoveriesAt, profile?.rejectedRecommendations, userItems, activeFilter]);

  const orderedKeys = categoryOrder.length > 0 ? categoryOrder : categoryKeys;
  const displayKeys = (activeFilter ? [activeFilter] : orderedKeys).filter(key => !hiddenCategories.includes(key));

  return (
    <div className="max-w-5xl lg:max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-24 animate-in fade-in duration-500">
       <div className="sticky top-0 z-40 bg-neutral-50/95 dark:bg-[#09090b]/95 backdrop-blur-md pt-2 pb-4 mb-6 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-neutral-100 dark:border-white/10">
           {isSeedPack && (
               <div className="w-full mb-4 sm:mb-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm relative overflow-hidden group">
                   <div className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10 w-[200%] animate-[shimmer_3s_linear_infinite] group-hover:bg-emerald-500/10 transition-colors pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, transparent, rgba(16, 185, 129, 0.1) 20%, rgba(16, 185, 129, 0.2) 50%, rgba(16, 185, 129, 0.1) 80%, transparent)'}}></div>
                   <div className="flex items-center gap-3 relative z-10">
                       <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg shrink-0">
                           <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                       </div>
                       <div>
                           <h4 className="text-emerald-800 dark:text-emerald-300 font-bold text-sm sm:text-base">Dilecti Seed Pack Active</h4>
                           <p className="text-emerald-600/80 dark:text-emerald-400/80 text-xs sm:text-sm">Not enough items rated for custom recommendations. Defaulting to the Dilecti seed pack!</p>
                       </div>
                   </div>
                   <button onClick={() => setIsSeedPack(false)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 p-1 shrink-0 relative z-10 hidden sm:block">
                       <span className="sr-only">Dismiss</span>
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
               </div>
           )}
           <div className="w-full mb-4 sm:mb-6">
               <div 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-ask-for-ideas'))}
                  className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/10 hover:border-emerald-500/50 rounded-full p-3.5 sm:p-4 pl-6 pr-6 flex items-center gap-4 shadow-sm transition-all cursor-pointer group relative overflow-hidden"
               >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-purple-500/10 to-orange-500/10 hidden dark:block opacity-50"></div>
                  
                  <Sparkles className="w-5 h-5 text-emerald-500 dark:text-teal-400 shrink-0 group-hover:scale-110 transition-transform relative z-10" />
                  <span className="flex-1 bg-transparent text-[15px] sm:text-base font-medium text-neutral-500 dark:text-neutral-400 text-left relative z-10 whitespace-nowrap overflow-hidden text-ellipsis">
                     Ask for recommendations...
                  </span>
               </div>
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
                   title="Sort recommendations"
                 >
                   <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5" />
                 </button>
                 {isSortOpen && (
                   <div className="absolute top-full left-0 mt-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-2 w-[220px] z-50 flex flex-col items-start text-left text-sm text-black/70 dark:text-white/70 animate-in fade-in duration-200">
                     <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Sort By</div>
                     
                     <button onClick={() => { setSortOption('recency'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'recency' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Relevance {sortOption === 'recency' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button onClick={() => { setSortOption('rating'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'rating' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Rating {sortOption === 'rating' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
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
                   <div className="absolute top-full left-0 mt-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-2 w-[220px] max-h-[400px] overflow-y-auto z-50 flex flex-col items-start text-left text-sm text-black/70 dark:text-white/70 animate-in fade-in duration-200 hide-scrollbar">
                     <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Visibility</div>
                     
                     <button onClick={() => { setFilterOption('curated'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'curated' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Curated For You {filterOption === 'curated' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button onClick={() => { setFilterOption('all'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'all' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        All Recommendations {filterOption === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     
                     <div className="w-full h-px bg-black/10 dark:bg-white/10 my-1"></div>
                     <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Sources</div>
                     
                     <button onClick={() => setSourceFilters(p => ({...p, global: !p.global}))} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sourceFilters.global ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Global Discoveries {sourceFilters.global && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button onClick={() => setSourceFilters(p => ({...p, personal: !p.personal}))} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sourceFilters.personal ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        My Saved Items {sourceFilters.personal && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button onClick={() => setSourceFilters(p => ({...p, friends: !p.friends}))} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sourceFilters.friends ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Friends' Favorites {sourceFilters.friends && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                   </div>
                 )}
               </div>
             </div>
             
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

       <RecommendationModal 
         selectedRec={selectedRec} 
         setSelectedRec={setSelectedRec} 
         onReject={(rec) => {
            const catKey = Object.keys(categoryToApiCat).find(k => categoryToApiCat[k] === rec.category) || "Books";
            handleReject(catKey, rec);
         }} 
         saveItem={(item) => {
             saveItem(item);
             if (item.title) {
                 const catKey = Object.keys(categoryToApiCat).find(k => categoryToApiCat[k] === item.category) || "Books";
                 setDiscoveries(prev => {
                    const currentItems = prev[catKey] || [];
                    const newRecs = currentItems.filter((r: any) => r.title !== item.title);
                    return { ...prev, [catKey]: newRecs };
                 });
             }
         }} 
       />
       
       

       {(!profile?.preferences || profile?.preferences.length === 0) && (!userItems || userItems.length === 0) ? (
          <div className="mt-8 bg-white border text-center border-black/5 rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center shadow-sm dark:bg-[#1a1a1a] dark:border-white/5">
             <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-8 sm:mb-10 pointer-events-none">
                <div className="absolute inset-0 m-auto w-20 h-20 sm:w-28 sm:h-28 bg-rose-500 rounded-full flex items-center justify-center shadow-2xl shadow-rose-200 animate-pulse z-20">
                   <Heart className="w-10 h-10 sm:w-14 sm:h-14 text-white fill-white" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-neutral-100 z-10 animate-bounce dark:bg-[#1a1a1a] dark:border-white/5" style={{animationDelay: '0s', animationDuration: '3s'}}><Utensils className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-500"/></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-neutral-100 z-10 animate-bounce dark:bg-[#1a1a1a] dark:border-white/5" style={{animationDelay: '0.5s', animationDuration: '3.5s'}}><Tv className="w-4 h-4 sm:w-6 sm:h-6 text-rose-500"/></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-neutral-100 z-10 animate-bounce dark:bg-[#1a1a1a] dark:border-white/5" style={{animationDelay: '1s', animationDuration: '4s'}}><Music className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-500"/></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-neutral-100 z-10 animate-bounce dark:bg-[#1a1a1a] dark:border-white/5" style={{animationDelay: '1.5s', animationDuration: '3.2s'}}><BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500"/></div>
             </div>
             <h4 className="font-serif text-2xl md:text-3xl font-medium mb-3 tracking-tight">You haven't saved any preferences yet</h4>
             <p className="text-neutral-500 max-w-md mx-auto mb-8 text-base font-medium dark:text-neutral-400">
                Tell us what you like to get highly relevant recommendations across all categories from dilecti.
             </p>
             <button 
                onClick={() => window.dispatchEvent(new Event('open-taste-profile'))}
                className="group relative inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-black text-white rounded-full px-8 py-3.5 font-medium transition-all shadow-sm active:scale-95"
             >
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                <span className="tracking-wide text-base">Add your preferences</span>
             </button>
          </div>
       ) : (
          <Reorder.Group axis="y" values={displayKeys} onReorder={handleReorder} className="flex flex-col gap-8 w-full mt-8 relative z-10 pb-20">
             {displayKeys.map((key) => {
                const meta = CATEGORY_META[key];
                if (!meta) return null;
                
                const apiCat = categoryToApiCat[key];
                let mixed: any[] = [];
                
                if (sourceFilters.global) {
                   mixed = [...(discoveries[key] || [])];
                }
                
                if (sourceFilters.personal && userItems) {
                   const personal = userItems.filter(i => (i.category === apiCat || (key === 'TV & Movies' && (i.category === 'tv' || i.category === 'movie' || (i.category as string) === 'watch')) || (key === 'Games/Sports' && (i.category === 'game' || (i.category as string) === 'sports' || (i.category as string) === 'games')) || (key === 'Books' && (i.category === 'book' || (i.category as string) === 'books')))).map(i => ({...i, sourceSignal: "Personal", tags: ["📌 Saved"]}));
                   mixed = [...mixed, ...personal];
                }
             
                if (sourceFilters.friends && friendItems) {
                   const friends = friendItems.filter(i => (i.category === apiCat || (key === 'TV & Movies' && (i.category === 'tv' || i.category === 'movie' || (i.category as string) === 'watch')) || (key === 'Games/Sports' && (i.category === 'game' || (i.category as string) === 'sports' || (i.category as string) === 'games')) || (key === 'Books' && (i.category === 'book' || (i.category as string) === 'books')))).map(i => ({...i, sourceSignal: `Friend: ${i.displayName || 'Someone'}`, tags: ["👥 Friend's Choice"]}));
                   mixed = [...mixed, ...friends];
                }
                
                // Deduplicate by title
                const seen = new Set();
                const items = mixed.filter(item => {
                   if (!item.title) return false;
                   const titleLower = (item.title || "").toLowerCase();
                   if (seen.has(titleLower)) return false;
                   seen.add(titleLower);
                   return true;
                });

                const isLoading = discoveries[key] === undefined;

                return (
                   <DiscoverSection 
                     key={key} 
                     keyName={key} 
                     meta={meta} 
                     items={items} 
                     isLoading={isLoading} 
                     navigate={navigate} 
                     setSelectedRec={setSelectedRec} 
                     categoryToApiCat={categoryToApiCat} 
                     saveItem={saveItem}
                     viewMode={viewMode}
                     sortOption={sortOption}
                     filterOption={filterOption}
                     fetchMore={handleFetchMore}
                     isCollapsed={collapsedCategories[key]}
                     toggleCollapse={() => toggleCollapse(key)}
                     toggleHide={() => toggleHide(key)}
                     foodLocation={foodLocation}
                     setFoodLocation={setFoodLocation}
                     
                     
                   />
                );
             })}
          </Reorder.Group>
       )}
       {hiddenCategories.length > 0 && (
          <div className="flex justify-center mt-8 pb-12">
            <button 
              onClick={() => {
                setHiddenCategories([]);
                localStorage.removeItem('dilecti_discover_hidden');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-[#1a1a1a] text-neutral-600 dark:text-neutral-400 rounded-full text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              Restore {hiddenCategories.length} hidden {hiddenCategories.length === 1 ? 'category' : 'categories'}
            </button>
          </div>
       )}
       <CategoryIconFilter 
         value={activeFilter} 
         onChange={(val) => {
             if (!val || val === 'All') {
                 setActiveFilter('');
             } else {
                 let targetPath = '/library';
                 if (val === 'Books') targetPath = '/zone/books#curated-for-you';
                 else if (val === 'TV & Movies') targetPath = '/zone/watch#curated-for-you';
                 else if (val === 'Music') targetPath = '/zone/music#curated-for-you';
                 else if (val === 'Podcasts') targetPath = '/zone/podcasts#curated-for-you';
                 else if (val === 'Food') targetPath = '/zone/food#curated-for-you';
                 else if (val === 'Places') targetPath = '/zone/places#curated-for-you';
                 else if (val === 'Games/Sports') targetPath = '/zone/games#curated-for-you';
                 navigate(targetPath);
             }
         }} 
       />
    </div>
  );
}

