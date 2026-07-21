import { useState, useEffect } from "react";
import { ArrowRight, Clock, Target, Flame, Sparkles, Library, CheckCircle2, Bookmark, Star as StarIcon, Plus, Loader2 } from "lucide-react";
import { UserBook, ViewState } from "../types";
import { motion } from "motion/react";
import { cn, sanitizeReason } from "../lib/utils";
import AITasteQuizModal from "./AITasteQuizModal";
import { useDraggableScroll } from "../hooks/useDraggableScroll";
import { ImageWithFallback } from "./ImageWithFallback";


export default function HomeTab({ 
  books, 
  onEditBook,
  onNavigate,
  onAddBook,
  onPreviewBook,
  onOpenOnboarding
}: { 
  books: UserBook[],
  onEditBook: (b: UserBook) => void,
  onNavigate: (view: ViewState) => void,
  onAddBook?: () => void,
  onPreviewBook?: (book: any) => void,
  onOpenOnboarding?: () => void
}) {
  const [activeFilter, setActiveFilter] = useState<'read' | 'up-next' | 'currently-reading'>('currently-reading');

  const dragPropsShelf = useDraggableScroll<HTMLDivElement>();
  const dragPropsDiscover = useDraggableScroll<HTMLDivElement>();

  const upNextBooks = books.filter(b => b.status === "up-next" || b.status === "planning" || b.rating === 0).slice(0, 5);
  const readBooksThisYear = books.filter(b => (b.status === 'read' || b.status === 'completed') && new Date(b.dateAdded).getFullYear() === new Date().getFullYear());
  const GOAL = 24;
  
  // Mock recent friends activity
  const recentActivity: any[] = [];

  const filteredBooks = books.filter(b => {
     if (activeFilter === 'read') {
        return b.status === 'read' || b.status === 'completed';
     }
     return b.status === activeFilter;
  });

  const [showTasteQuiz, setShowTasteQuiz] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
   const [recError, setRecError] = useState(false);
  const [trendingPreview, setTrendingPreview] = useState<any[]>([]);
  const [loadingTrendingPreview, setLoadingTrendingPreview] = useState(true);

  const activeRecs = recommendations.filter((r) => {
    if (books.some((b) => (b.title || "").toLowerCase() === (r.title || "").toLowerCase()))
      return false;
    return true;
  });

  useEffect(() => {
    if (books.filter(b => b.status === 'read' || b.status === 'completed').length === 0) {
      setLoadingRecs(false);
      return;
    }
    
    // Only fetch once or when major library changes happen to limit api calls
    const context = books.filter(b => b.status === 'read' || b.status === 'completed').slice(0, 10).map(b => `${b.title} by ${b.author} (${b.rating || 'unrated'} stars)`).join(', ');
    
    const cacheKey = `home_recs_${context}`;
    const cachedStr = localStorage.getItem(cacheKey);

    if (cachedStr) {
       try {
          const cached = JSON.parse(cachedStr);
          if (Array.isArray(cached) && cached.length > 0) {
             setRecommendations(cached);
             setLoadingRecs(false);
          }
       } catch(e) {}
    } else {
        // Fetch Recommendations
        setRecError(false);
        fetch('/api/recommend', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Recommend exactly 3 books to read next. Limit to one sentence reason per book.", context, items: books })
        }).then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any))
          .then(async (aiBooks) => {
             if(!Array.isArray(aiBooks) || aiBooks.length === 0) {
                try { localStorage.setItem(cacheKey, JSON.stringify([])); } catch(e){}
                setLoadingRecs(false);
                return;
             }
             
             const withCovers = await Promise.all(aiBooks.map(async (b: any) => {
                try {
                   const query = encodeURIComponent(`${b.title} ${b.author}`);
                   const r = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=1`);
                   const d = await r.json().catch(() => ({}));
                   if (d.docs?.[0]?.cover_i) {
                      b.coverUrl = `https://covers.openlibrary.org/b/id/${d.docs[0].cover_i}-M.jpg`;
                   }
                } catch(e){}
                return b;
             }));
             setRecommendations(withCovers);
             try { localStorage.setItem(cacheKey, JSON.stringify(withCovers)); } catch(e){}
             setLoadingRecs(false);
          })
          .catch(() => { try { localStorage.setItem(cacheKey, JSON.stringify([])); } catch(e){} setRecError(true); setLoadingRecs(false); });
    }
      
    // Fetch Discover Preview (Trending)
    const trendCacheKey = 'home_trending_books';
    const cachedTrendStr = localStorage.getItem(trendCacheKey);

    if (cachedTrendStr) {
       try {
          const cachedTrend = JSON.parse(cachedTrendStr);
          if (Array.isArray(cachedTrend) && cachedTrend.length > 0) {
             setTrendingPreview(cachedTrend);
             setLoadingTrendingPreview(false);
             return;
          }
       } catch(e) {}
    }

    fetch('/api/trending?category=global_bestsellers_booktok')
      .then(res => res.json().catch(() => ({})))
      .then(async (aiBooks) => {
        if (!aiBooks || aiBooks.length === 0) throw new Error("Fallback");
        const top2 = aiBooks.slice(0, 2);
        const withCovers = await Promise.all(top2.map(async (b: any) => {
           try {
              const r = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(b.title)}&author=${encodeURIComponent(b.author)}&limit=1`);
              const d = await r.json().catch(() => ({}));
              if (d.docs?.[0]) {
                 b.cover = d.docs[0].cover_i ? `https://covers.openlibrary.org/b/id/${d.docs[0].cover_i}-M.jpg` : undefined;
                 b.id = d.docs[0].key;
              }
           } catch(e) {}
           return b;
        }));
        setTrendingPreview(withCovers);
        try { localStorage.setItem(trendCacheKey, JSON.stringify(withCovers)); } catch(e){}
        setLoadingTrendingPreview(false);
      }).catch(e => {
        // Fallback to open library if no AI trending
        fetch('https://openlibrary.org/search.json?q=first_publish_year:[2023 TO 2025]&sort=editions&limit=2')
          .then(res => res.json().catch(() => ({})))
          .then(data => {
            const results = data.docs || [];
            const formattedBooks = results.slice(0, 2).map((item: any) => ({
              title: item.title,
              author: item.author_name?.[0] || "Unknown",
              cover: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
              id: item.key
            }));
            setTrendingPreview(formattedBooks);
            try { localStorage.setItem(trendCacheKey, JSON.stringify(formattedBooks)); } catch(e){}
            setLoadingTrendingPreview(false);
          }).catch((err) => {
             console.error(err);
             setLoadingTrendingPreview(false);
          });
      });
  // eslint-disable-next-line
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-12">
      
      {/* Filters for your shelf */}
      <section id="tutorial-add-book">
         <h2 className="font-serif text-2xl md:text-3xl font-medium px-2 mb-4">My Shelf</h2>
         <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-4 px-2 tracking-tight">
            {[
               { id: 'currently-reading', label: 'Reading', icon: Clock },
               { id: 'up-next', label: 'Up Next', icon: Bookmark },
               { id: 'read', label: 'Completed', icon: CheckCircle2 }
            ].map((filter) => (
               <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id as any)}
                  className={cn(
                     "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap border shadow-sm",
                     activeFilter === filter.id
                        ? "bg-feyble-ink text-white border-transparent"
                        : "bg-white dark:bg-neutral-900 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 border-black/10 dark:border-white/10"
                  )}
               >
                  <filter.icon className="w-3.5 h-3.5" /> {filter.label}
               </button>
            ))}
         </div>

         <div {...dragPropsShelf} className={`flex gap-4 md:gap-6 overflow-x-auto pb-6 px-2 hide-scrollbar snap-x relative min-h-[160px] ${dragPropsShelf.className}`}>
            {/* Add Book Cover Card */}
            <div className="flex-shrink-0 snap-start">
               <motion.div 
                  whileHover={{ y: -4 }}
                  className="w-[120px] md:w-[140px] cursor-pointer group"
                  onClick={onAddBook}
               >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border-2 border-dashed border-black/20 bg-black/5 flex flex-col items-center justify-center p-3 relative mb-3 dark:border-white/20 dark:bg-white/5">
                     <Plus className="w-8 h-8 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:group-hover:text-white/60 group-hover:scale-110 transition-all mb-2" />
                     <span className="text-[11px] font-medium text-center text-black/50 group-hover:text-black/70 leading-tight px-1 dark:text-white/50">
                        Save or share your favorite books
                     </span>
                  </div>
               </motion.div>
            </div>

            {filteredBooks.map((book) => (
                  <motion.div 
                     whileHover={{ y: -4 }}
                     key={book.id} 
                     className="w-[120px] md:w-[140px] flex-shrink-0 snap-start cursor-pointer group"
                     onClick={() => onEditBook(book)}
                     onContextMenu={(e) => {
                        e.preventDefault();
                        onEditBook(book);
                     }}
                  >
                     <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-sm group-hover:shadow-xl transition-all border border-black/5 relative mb-3 dark:border-white/5">
                        {book.coverUrl ? (
                           <ImageWithFallback src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                           <div className="w-full h-full bg-black/5 flex justify-center items-center p-4 text-center dark:bg-white/5">
                              <span className="text-xs font-serif text-black/40 dark:text-white/40 group-hover:text-black/60 dark:group-hover:text-white/60 transition-colors">{book.title}</span>
                           </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                        {book.status === 'read' && book.rating > 0 && (
                           <div className="absolute bottom-2 left-2 flex gap-1 items-center bg-black/60 backdrop-blur-md px-1.5 py-1 rounded-md">
                              <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-[10px] text-white font-medium leading-none">{book.rating}</span>
                           </div>
                        )}
                     </div>
                     <h3 className="font-bold text-sm leading-tight mb-1 group-hover:text-feyble-ink line-clamp-2 md:line-clamp-1">{book.title}</h3>
                     <p className="text-xs text-black/50 line-clamp-1 dark:text-white/50">{book.author}</p>
                  </motion.div>
               ))}
         </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
         {/* Activity Feed */}
         <section 
            id="tutorial-activity"
            onClick={() => onNavigate('feed')}
            className="bg-white rounded-[2.5rem] p-6 lg:p-8 border border-black/5 shadow-sm relative overflow-hidden flex flex-col cursor-pointer hover:bg-black/5 transition-all group/activity dark:bg-[#1a1a1a] dark:border-white/5"
         >
            <div className="flex items-center justify-between mb-6 md:mb-8 relative z-10">
               <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-black/40 dark:text-white/40 group-hover/activity:text-black/60 dark:group-hover/activity:text-white/60 transition-colors" />
                  <h2 className="font-serif text-xl md:text-2xl font-medium">Friend Activity</h2>
               </div>
               <button 
                 className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 group-hover/activity:text-black dark:group-hover/activity:text-white transition-all bg-white px-3 py-1.5 rounded-full shadow-sm dark:bg-[#1a1a1a]"
               >
                 See all
               </button>
            </div>

            <div className="space-y-6 relative z-10 flex-1 flex flex-col justify-center min-h-[120px]">
               {recentActivity.length === 0 ? (
                 <div className="text-center w-full px-4">
                    <p className="text-black/40 dark:text-white/40 text-sm font-medium mb-3">Community activity appears here. Set up your profile!</p>
                    <button 
                       onClick={(e) => { e.stopPropagation(); onOpenOnboarding?.(); }}
                       className="bg-black/5 hover:bg-black/10 text-black/70 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors inline-block dark:bg-white/5 dark:text-white/70"
                    >
                       Find Friends
                    </button>
                 </div>
               ) : (
                  recentActivity.map((activity, i) => (
                     <div key={i} className="flex gap-4 items-start group cursor-pointer hover:bg-black/5 p-2 -m-2 rounded-xl transition-colors" onClick={(e) => { e.stopPropagation(); onPreviewBook?.(activity.book); }}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-feyble-accent to-purple-800 text-white flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-inner">
                           {activity.user.avatar}
                        </div>
                        <div className="flex-1 pb-4 border-b border-black/5 group-last:border-0 group-last:pb-0 dark:border-white/5">
                           <p className="text-sm">
                              <span className="font-semibold">{activity.user.name}</span>{' '}
                              <span className="text-black/60 dark:text-white/60">{activity.action}</span>{' '}
                              <span className="font-serif italic font-medium text-black group-hover:text-feyble-ink transition-colors dark:text-white">"{activity.book.title}"</span>
                           </p>
                           {activity.rating && (
                              <div className="flex gap-0.5 mt-2">
                                 {Array.from({ length: 5 }).map((_, j) => (
                                    <StarIcon key={j} className={`w-3.5 h-3.5 ${j < activity.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                                 ))}
                              </div>
                           )}
                           <span className="text-[11px] font-semibold text-black/40 dark:text-white/40 block mt-2 uppercase tracking-wide">{activity.timeAgo}</span>
                        </div>
                     </div>
                  ))
               )}
             </div>
         </section>

         {/* Recommended For You */}
         <section className="bg-feyble-bg/50 rounded-[2.5rem] p-6 lg:p-8 border border-black/5 shadow-sm flex flex-col dark:border-white/5">
            <div className="flex justify-between items-center mb-6 md:mb-8">
               <div className="flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-feyble-accent" />
                 <h2 className="font-serif text-xl md:text-2xl font-medium">Just for You</h2>
               </div>
               <button 
                 onClick={() => setShowTasteQuiz(true)}
                 className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-feyble-accent bg-feyble-accent/10 hover:bg-feyble-accent/20 transition-all px-3 py-1.5 rounded-full shadow-sm"
               >
                 Taste Quiz
               </button>
            </div>
            
            <div className="space-y-4 flex-1">
               {loadingRecs ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                     <Loader2 className="w-6 h-6 animate-spin text-black/20 dark:text-white/20" />
                     <p className="text-black/40 dark:text-white/40 text-sm font-medium">Finding perfect books for you...</p>
                  </div>
               ) : recError ? (
                  <div className="text-center w-full bg-white/60 border border-black/5 rounded-3xl p-10 h-full flex flex-col justify-center items-center dark:border-white/5">
                     <p className="text-black/60 dark:text-white/60 text-sm font-medium">Our recommendation engine is taking a quick breather. Please try again later.</p>
                  </div>
               ) : activeRecs.length === 0 ? (
                  <div className="text-center w-full bg-white/60 border border-black/5 border-dashed rounded-3xl p-10 h-full flex flex-col justify-center items-center dark:border-white/5">
                     <p className="text-black/40 dark:text-white/40 text-sm font-medium mb-3">Rate some books to get personalized AI picks.</p>
                     <button
                        onClick={(e) => { e.stopPropagation(); onNavigate('discover'); }}
                        className="bg-black/5 hover:bg-black/10 text-black/70 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors inline-block dark:bg-white/5 dark:text-white/70"
                     >
                        Discover Books
                     </button>
                  </div>
               ) : (
                  activeRecs.map((book, i) => (
                     <div 
                        key={i} 
                        onClick={() => onPreviewBook?.(book)}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex items-start gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group relative overflow-hidden dark:bg-[#1a1a1a] dark:border-white/5"
                     >
                        <div className="w-12 h-16 bg-black/5 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center break-words p-1 relative border border-black/5 dark:border-white/5 dark:bg-white/5">
                           {book.coverUrl ? (
                              <ImageWithFallback src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           ) : (
                              <span className="text-[8px] leading-tight font-serif text-black/40 dark:text-white/40 text-center">{book.title}</span>
                           )}
                           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                        </div>
                        <div className="flex-1 mt-1 z-10">
                           <h4 className="font-bold text-sm leading-tight text-black/90 group-hover:text-feyble-ink line-clamp-2 md:line-clamp-1 mb-1 dark:text-white/90">{book.title}</h4>
                           <p className="text-[11px] text-black/50 tracking-wide mb-1.5 dark:text-white/50">{book.author}</p>
                           {book.reason && (
                              <p className="text-[10px] text-feyble-ink/70 font-medium italic leading-snug line-clamp-2 pr-2">"{sanitizeReason(book.reason, "books")}"</p>
                           )}
                        </div>
                     </div>
                  ))
               )}
            </div>
         </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-12 pt-8 border-t border-black/5 dark:border-white/5">
         {/* Discover Preview */}
         <section 
            onClick={() => onNavigate('discover')}
            className="bg-black/5 p-6 lg:p-8 rounded-[2.5rem] border border-black/5 flex flex-col cursor-pointer hover:bg-black/10 transition-all group/discover dark:border-white/5 dark:bg-white/5"
         >
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-feyble-accent" />
                  <h2 className="font-serif text-xl md:text-2xl font-medium group-hover/discover:text-feyble-ink transition-colors">Discover</h2>
               </div>
               <button 
                 className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 group-hover/discover:text-black dark:group-hover/discover:text-white transition-all bg-white px-3 py-1.5 rounded-full shadow-sm dark:bg-[#1a1a1a]"
               >
                 Explore all
               </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 flex-1">
               {loadingTrendingPreview ? (
                 <div className="col-span-2 flex flex-col items-center justify-center space-y-3 opacity-50 py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">Loading trends...</span>
                 </div>
               ) : trendingPreview.length > 0 ? (
                 trendingPreview.map((book, i) => (
                    <div key={i} className="group cursor-pointer" onClick={(e) => { e.stopPropagation(); onPreviewBook?.(book); }}>
                       <div className="aspect-[2/3] mb-3 bg-white rounded-lg overflow-hidden shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 relative border border-black/5 dark:bg-[#1a1a1a] dark:border-white/5">
                          {book.cover ? (
                            <ImageWithFallback src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] absolute inset-0 flex items-center justify-center p-2 text-center">{book.title}</span>
                          )}
                       </div>
                       <h4 className="font-semibold text-sm line-clamp-1">{book.title}</h4>
                       <p className="text-xs text-black/60 line-clamp-1 dark:text-white/60">{book.author}</p>
                    </div>
                 ))
               ) : (
                 <div className="col-span-2 flex flex-col items-center justify-center space-y-3 opacity-50 py-4 text-center">
                    <span className="text-xs">Trending is temporarily unavailable. Check back later.</span>
                 </div>
               )}
            </div>
         </section>

         {/* Stats Preview */}
         <section id="tutorial-stats" className="bg-orange-50 p-6 lg:p-8 rounded-[2.5rem] border border-orange-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  <h2 className="font-serif text-xl md:text-2xl font-medium text-orange-950">Your Progress</h2>
               </div>
               <button 
                 onClick={() => onNavigate('stats')}
                 className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-orange-700/60 hover:text-orange-900 transition-all bg-white px-3 py-1.5 rounded-full shadow-sm dark:bg-[#1a1a1a]"
               >
                 View stats
               </button>
            </div>
            
            <div className="flex flex-col items-center justify-center flex-1 bg-white/60 p-6 rounded-3xl border border-orange-200/50">
               <div className="text-5xl font-serif text-orange-600 font-medium mb-2">{readBooksThisYear.length}</div>
               <div className="text-sm font-semibold text-orange-900/60 uppercase tracking-widest mb-4">Books Read</div>
               
               <div className="w-full max-w-[200px] bg-white h-3 rounded-full overflow-hidden shadow-inner relative border border-orange-100 dark:bg-[#1a1a1a]">
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, (readBooksThisYear.length / GOAL) * 100)}%` }}
                     transition={{ duration: 1, ease: "easeOut" }}
                     className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                  />
               </div>
               <div className="flex w-full max-w-[200px] justify-between text-xs text-orange-800/50 mt-2 font-medium">
                  <span>{readBooksThisYear.length} read</span>
                  <span>{GOAL} goal</span>
               </div>
            </div>
         </section>
      </div>

      {showTasteQuiz && <AITasteQuizModal onClose={() => setShowTasteQuiz(false)} />}
    </div>
  );
}
