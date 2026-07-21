import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Utensils, Tv, Music, BookOpen, Plus, Loader2, ChevronDown, Compass, BookmarkPlus } from 'lucide-react';
import { useUserProfile, useUserItems } from '../hooks';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn, sanitizeReason } from '../lib/utils';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import { ImageWithFallback } from "./ImageWithFallback";


const categories = [
  { name: 'Food', id: 'food', icon: Utensils },
  { name: 'TV/Movies', id: 'watch', icon: Tv },
  { name: 'Music', id: 'music', icon: Music },
  { name: 'Books', id: 'books', path: '/zone/books', icon: BookOpen },
];

export default function CuratedForYouSection({ setSelectedRec, handleRejectCategoryAction, saveItemAction }: any) {
  const { profile, loadingProfile, updateProfile } = useUserProfile();
  const { userItems, saveItem } = useUserItems();
  const navigate = useNavigate();

  const cardWidthClass = profile?.cardSize === 'small' ? 'w-[160px] sm:w-[200px]' : profile?.cardSize === 'large' ? 'w-[240px] sm:w-[320px]' : 'w-[200px] sm:w-[280px]';

  const [recommendations, setRecommendations] = useState<any[]>(() => {
     try {
        const cached = localStorage.getItem('dilecti_home_recs');
        if (cached) return JSON.parse(cached);
     } catch(e) {}
     return [];
  });
  const [loadingRecs, setLoadingRecs] = useState(() => {
     try {
        return !localStorage.getItem('dilecti_home_recs');
     } catch(e) { return false; }
  });
  const fetchedContextRef = React.useRef<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchMoreRecommendations = () => {
    setLoadingRecs(true);
    fetch('/api/universal-recommend', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-api-key': localStorage.getItem('user_gemini_api_key') || '', 'x-user-ai-provider': localStorage.getItem('user_ai_provider') || 'gemini'
      },
      body: JSON.stringify({ 
        context: fetchedContextRef.current,
        previousRecs: profile?.cachedRecommendations || [],
        items: userItems
      })
    })
      .then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any))
      .then(async (aiRecs) => {
         if(!Array.isArray(aiRecs) || aiRecs.length === 0) {
            setLoadingRecs(false);
            try { 
               localStorage.setItem('dilecti_home_recs_time', Date.now().toString());
            } catch(e) {}
            return;
         }
         const newRecs = [...recommendations, ...aiRecs];
         setRecommendations(newRecs);
         try { 
            localStorage.setItem('dilecti_home_recs', JSON.stringify(newRecs)); 
            localStorage.setItem('dilecti_home_recs_time', Date.now().toString());
         } catch(e) {}
         setLoadingRecs(false);
         if (updateProfile) {
           updateProfile({
             cachedRecommendations: newRecs,
             cachedRecommendationsContext: fetchedContextRef.current,
             cachedRecommendationsAt: Date.now()
           });
         }
      })
      .catch((e) => {
         console.error("Recs load error", e);
         setLoadingRecs(false);
      });
  };

   useEffect(() => {
    if (loadingProfile || !profile) return;
    
    // Only fetch if they have some preference or items
    if ((!profile?.preferences || profile?.preferences.length === 0) && (!userItems || userItems.length === 0)) {
       return;
    }

    let contextArr = [];
    if (profile.preferences) contextArr.push(`Stated preferences: ${profile.preferences}`);
    
    if (userItems && userItems.length > 0) {
       const likes = userItems.filter(i => (i.criticScore || i.rating) >= 8 || i.reaction === 'love').slice(0, 10).map(i => i.title);
       if (likes.length > 0) contextArr.push(`Favs: ${likes.join(',')}`);
       
       const dislikes = userItems.filter(i => (i.criticScore || i.rating) > 0 && (i.criticScore || i.rating) <= 4 || i.reaction === 'dislike' || i.reaction === 'hate').slice(0, 10).map(i => i.title);
       if (dislikes.length > 0) contextArr.push(`Dislikes: ${dislikes.join(',')}`);
    }
    
    const context = contextArr.join(' | ');

    if (fetchedContextRef.current === context) return;

    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    let localCacheTime = parseInt(localStorage.getItem('dilecti_home_recs_time') || '0', 10);
    const isCacheValid = (profile.cachedRecommendationsAt && (now - profile.cachedRecommendationsAt < oneDay)) || (now - localCacheTime < oneDay);

    if (isCacheValid) {
      fetchedContextRef.current = context;
      if (recommendations.length === 0 && profile.cachedRecommendations && profile.cachedRecommendations.length > 0) {
         setRecommendations(profile.cachedRecommendations);
      }
      return;
    }
    
    fetchedContextRef.current = context;
    if (recommendations.length === 0) setLoadingRecs(true);

    fetch('/api/universal-recommend', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-api-key': localStorage.getItem('user_gemini_api_key') || '', 'x-user-ai-provider': localStorage.getItem('user_ai_provider') || 'gemini'
      },
      body: JSON.stringify({ 
        context,
        previousRecs: profile.cachedRecommendations || [],
        items: userItems
      })
    })
      .then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any))
      .then(async (aiRecs) => {
         if(!Array.isArray(aiRecs) || aiRecs.length === 0) {
            setLoadingRecs(false);
            try { 
               localStorage.setItem('dilecti_home_recs_time', Date.now().toString());
            } catch(e) {}
            return;
         }
         setRecommendations(aiRecs);
         try { 
            localStorage.setItem('dilecti_home_recs', JSON.stringify(aiRecs)); 
            localStorage.setItem('dilecti_home_recs_time', Date.now().toString());
         } catch(e) {}
         setLoadingRecs(false);
         if (updateProfile) {
           updateProfile({
             cachedRecommendations: aiRecs,
             cachedRecommendationsContext: context,
             cachedRecommendationsAt: Date.now()
           });
         }
      })
      .catch(e => {
         console.error(e);
         setLoadingRecs(false);
         fetchedContextRef.current = null;
      });
  }, [profile, loadingProfile]);

  const activeRecs = recommendations.filter(r => {
    if (profile?.rejectedRecommendations?.includes(r.title)) return false;
    if (userItems?.some(i => i.title.toLowerCase() === r.title.toLowerCase())) return false;
    if (selectedCategory && r.category !== selectedCategory) return false;
    return true;
  });

  const getCategoryIcon = (catId: string) => {
     const found = categories.find(c => c.id === catId || c.name.toLowerCase() === catId);
     return found ? found.icon : Sparkles;
  };

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

  return (
    <div className="w-full mt-2 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-emerald-50/20 rounded-[2rem] border border-emerald-100/50 p-4 pt-6 relative z-20">
       <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between w-full text-left px-2 mb-4 group"
       >
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:text-emerald-400 dark:bg-emerald-900">
                <Sparkles className="w-4 h-4" />
             </div>
             <h3 className="font-serif text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight dark:text-white">Curated For You</h3>
          </div>
          <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''} dark:text-neutral-500`} />
       </button>
       
       <AnimatePresence>
          {!isCollapsed && (
             <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
             >
                <div className="w-full mt-4">
                   {(!profile?.preferences || profile?.preferences.length === 0) && (!userItems || userItems.length === 0) ? (
                      <div className="bg-white border text-center border-black/5 rounded-[2rem] p-6 md:p-8 flex flex-col items-center justify-center shadow-sm mx-2 dark:bg-[#1a1a1a] dark:border-white/5">
                         <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-8 sm:mb-10 pointer-events-none">
                            <div className="absolute inset-0 m-auto w-20 h-20 sm:w-28 sm:h-28 bg-rose-500 rounded-full flex items-center justify-center shadow-2xl shadow-rose-200 animate-pulse z-20">
                               <Heart className="w-10 h-10 sm:w-14 sm:h-14 text-white fill-white" />
                            </div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-neutral-100 z-10 animate-bounce dark:bg-[#1a1a1a] dark:border-white/5" style={{animationDelay: '0s', animationDuration: '3s'}}><Utensils className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-500"/></div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-neutral-100 z-10 animate-bounce dark:bg-[#1a1a1a] dark:border-white/5" style={{animationDelay: '0.5s', animationDuration: '3.5s'}}><Tv className="w-4 h-4 sm:w-6 sm:h-6 text-rose-500"/></div>
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-neutral-100 z-10 animate-bounce dark:bg-[#1a1a1a] dark:border-white/5" style={{animationDelay: '1s', animationDuration: '4s'}}><Music className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-500"/></div>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-neutral-100 z-10 animate-bounce dark:bg-[#1a1a1a] dark:border-white/5" style={{animationDelay: '1.5s', animationDuration: '3.2s'}}><BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500"/></div>
                         </div>
                         <h4 className="font-serif text-xl md:text-2xl font-medium mb-2 tracking-tight">You haven't saved any preferences yet</h4>
                         <button 
                            onClick={() => window.dispatchEvent(new Event('open-taste-profile'))}
                            className="bg-neutral-900 hover:bg-black text-white rounded-full px-6 py-2.5 font-medium flex items-center gap-2 mt-6"
                         >
                            <Plus className="w-4 h-4" /> Add your preferences
                         </button>
                      </div>
                   ) : loadingRecs ? (
                      <div className="flex flex-col items-center justify-center py-20">
                         <Loader2 className="w-8 h-8 animate-spin text-emerald-600/50 mb-4" />
                         <p className="text-neutral-500 font-medium text-sm dark:text-neutral-400">Curating your personalized feed...</p>
                      </div>
                    ) : activeRecs.length > 0 ? (
                      <div>
                         <div className="px-2 mb-4">
                            <select 
                               value={selectedCategory || ""}
                               onChange={(e) => setSelectedCategory(e.target.value || null)}
                               className="pl-4 pr-10 py-1.5 rounded-full text-sm font-medium border bg-white border-black/10 text-neutral-800 shadow-sm outline-none dark:bg-[#1a1a1a] dark:text-neutral-200 dark:border-white/10"
                            >
                               <option value="">All Categories</option>
                               {categories.map(cat => (
                                   <option key={cat.id} value={cat.id}>{cat.name}</option>
                               ))}
                            </select>
                         </div>
                         <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 px-2 custom-scrollbar snap-x relative">
                             {activeRecs.map((rec) => {
                              const CatIcon = getCategoryIcon(rec.category);
                              return (
                                 <motion.div 
                                    whileHover={{ y: -4 }}
                                    key={rec.title} 
                                    className={`${cardWidthClass} flex-shrink-0 snap-start cursor-pointer group h-full`}
                                    onClick={() => setSelectedRec(rec)}
                                 >
                                    <div className="w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full dark:bg-[#1a1a1a] dark:border-white/10">
                                       <div className={`w-full aspect-video sm:aspect-[4/3] flex items-center justify-center relative overflow-hidden ${!rec.coverUrl ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-neutral-100'}`}>
                                          {rec.coverUrl ? (
                                             <>
                                                <ImageWithFallback 
                                                    category={rec.category} src={rec.coverUrl} 
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
                                                <div className="absolute inset-0 items-center justify-center bg-neutral-100 dark:bg-neutral-800 z-0" style={{ display: 'none' }}>
                                                   <CatIcon className="w-12 h-12 opacity-50 text-neutral-400" />
                                                </div>
                                             </>
                                          ) : (
                                             <CatIcon className="w-12 h-12 opacity-50 text-neutral-400" />
                                          )}
                                          
                                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1.5 shadow-sm">
                                             <CatIcon className="w-3 h-3 text-white/90" />
                                             <span className="text-[9px] text-white font-bold uppercase tracking-wider">{rec.category}</span>
                                          </div>
                                          <button
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                saveItem({ ...rec, category: rec.category, status: 'want to try' });
                                             }}
                                             className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white p-1.5 rounded-full hover:bg-emerald-600 transition-colors shadow-sm active:scale-95"
                                          >
                                             <BookmarkPlus className="w-4 h-4" />
                                          </button>
                                       </div>
                                       
                                       <div className="p-4 flex-1 flex flex-col">
                                          <h4 className="font-bold text-sm leading-tight text-neutral-900 group-hover:text-emerald-700 line-clamp-2 md:line-clamp-1 mb-1 dark:text-white">{rec.title}</h4>
                                          <p className="text-xs text-neutral-500 line-clamp-1 mb-1 dark:text-neutral-400">{rec.subtitle || rec.category}</p>
                                          {rec.description && (
                                             <p className="text-xs text-neutral-600 line-clamp-2 mb-2 leading-relaxed dark:text-neutral-400">{rec.description}</p>
                                          )}
                                          <p className="text-[11px] text-emerald-800/80 font-medium italic leading-snug line-clamp-3 mt-auto">"{sanitizeReason(rec.reason, rec.category)}"</p>
                                       </div>
                                    </div>
                                 </motion.div>
                              );
                           })}
                           
                           {/* See More Card */}
                           <div className={`${cardWidthClass} flex-shrink-0 snap-start flex items-stretch h-full`}>
                              <button 
                                 onClick={fetchMoreRecommendations}
                                 disabled={loadingRecs}
                                 className="w-full flex-1 min-h-[300px] border-2 border-dashed border-emerald-200 dark:border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-500"
                              >
                                 {loadingRecs ? (
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                 ) : (
                                    <>
                                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center shadow-sm">
                                         <Plus className="w-6 h-6" />
                                      </div>
                                      <span className="font-bold">Get more recommendations</span>
                                    </>
                                 )}
                              </button>
                           </div>

                         </div>
                      </div>
                   ) : (
                      <div className="px-2">
                         <div className="bg-white border border-emerald-100 rounded-[2rem] p-10 flex flex-col items-center justify-center shadow-sm text-center dark:bg-[#1a1a1a] dark:border-emerald-900">
                            <h4 className="font-serif text-2xl font-medium mb-3 text-neutral-900 dark:text-white">Your profile is active</h4>
                         </div>
                      </div>
                   )}
                </div>
             </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
