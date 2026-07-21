import { useState } from "react";
import { BookOpen, Star, Plus, Clock, Bookmark, CheckCircle2, Filter, Library as LibraryIcon, Search, MapIcon, ArrowUpDown, SlidersHorizontal, LayoutGrid, List, Headphones } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserBook } from "../types";
import { cn } from "../lib/utils";
import Fuse from "fuse.js";
import { ImageWithFallback } from "./ImageWithFallback";


export default function LibraryTab({ 
  books, 
  onEditBook,
  onAddBook,
  onSyncLibraries
}: { 
  books: UserBook[]; 
  onEditBook: (book: UserBook) => void;
  onAddBook?: () => void;
  onSyncLibraries?: () => void;
}) {
  const [activeFilter, setActiveFilter] = useState<'read' | 'up-next' | 'currently-reading'>('read');
  const [readSubFilter, setReadSubFilter] = useState<'all' | 'liked' | '5-star' | '4-plus' | 'reviewed'>('liked');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedLength, setSelectedLength] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortOption, setSortOption] = useState<'recency'>('recency');

  const allGenres = Array.from(new Set(books.flatMap(b => b.collections || []))).sort();
  const genres = ['All', ...allGenres];

  let filteredBooks = books;

  if (searchQuery.trim()) {
      const fuse = new Fuse(filteredBooks, {
         keys: ['title', 'author', 'collections', 'description', 'metadata.tags'],
         threshold: 0.2,
         ignoreLocation: false,
      });
      filteredBooks = fuse.search(searchQuery).map(res => res.item);
  }

  filteredBooks = filteredBooks.filter(b => {
    // Genre check
    if (selectedGenre !== 'All' && !(b.collections || []).includes(selectedGenre)) return false;
    
    // Length check
    if (selectedLength !== 'all') {
       const pages = b.pageCount || 0;
       if (selectedLength === 'short' && (pages === 0 || pages >= 250)) return false;
       if (selectedLength === 'medium' && (pages < 250 || pages >= 450)) return false;
       if (selectedLength === 'long' && pages < 450) return false;
    }

    if (activeFilter === 'up-next') return b.status === 'up-next' || b.status === 'planning' || b.rating === 0;
    if (activeFilter === 'read' && (b.status === 'read' || b.status === 'completed')) {
        if (readSubFilter === 'liked') {
            const ratingNum = b.criticScore || b.rating || 0;
            const isDisliked = b.reaction === 'dislike' || b.reaction === 'hate' || (ratingNum > 0 && ratingNum < 5);
            return !isDisliked;
        }
        if (readSubFilter === '5-star') return (b.criticScore || b.rating) >= 9;
        if (readSubFilter === '4-plus') return (b.criticScore || b.rating) >= 8;
        if (readSubFilter === 'reviewed') return b.review && b.review.length > 0;
        return true;
    }
    return b.status === activeFilter || (activeFilter === 'read' && b.status === 'completed');
  }).sort((a, b) => {
    if (sortOption === 'recency') {
       return (b.dateAdded || 0) - (a.dateAdded || 0);
    }
    // alphabetical or something
    return 0; // Default fallback for now
  });

  return (
    <div id="tutorial-library" className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="sticky top-0 z-40 bg-neutral-50/95 dark:bg-[#09090b]/95 backdrop-blur-md pt-2 pb-4 mb-6 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-neutral-100 dark:border-white/10">
           <div className="w-full mb-4 sm:mb-6">
               <div className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/10 hover:border-emerald-500/50 rounded-full p-2.5 sm:p-3 pl-5 pr-5 flex items-center gap-3 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-transparent group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-purple-500/10 to-orange-500/10 hidden dark:block opacity-50"></div>
                  <Search className="w-5 h-5 text-emerald-500 dark:text-teal-400 shrink-0 relative z-10" />
                  <input
                     type="text"
                     placeholder="Search your library..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                     }}
                     className="flex-1 bg-transparent text-[15px] sm:text-base font-medium text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none relative z-10"
                  />
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
                   title="Sort items"
                 >
                   <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5" />
                 </button>
                 {isSortOpen && (
                   <div className="absolute top-full left-0 mt-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-2 w-[220px] z-50 flex flex-col items-start text-left text-sm text-black/70 dark:text-white/70 animate-in fade-in duration-200">
                     <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Sort By</div>
                     <button onClick={() => { setSortOption('recency'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'recency' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Recently Added {sortOption === 'recency' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
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
                   <div className="absolute top-full left-0 mt-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-2 w-[250px] max-h-[400px] overflow-y-auto z-50 flex flex-col items-start text-left text-sm text-black/70 dark:text-white/70 animate-in fade-in duration-200 hide-scrollbar">
                     <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Status</div>
                     <button onClick={() => { setActiveFilter('read'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${activeFilter === 'read' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Completed {activeFilter === 'read' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button onClick={() => { setActiveFilter('currently-reading'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${activeFilter === 'currently-reading' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Reading {activeFilter === 'currently-reading' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button onClick={() => { setActiveFilter('up-next'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${activeFilter === 'up-next' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                        Up Next {activeFilter === 'up-next' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     
                     <div className="w-full h-px bg-black/5 dark:bg-white/5 my-2"></div>
                     <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Genre</div>
                     <select 
                       value={selectedGenre}
                       onChange={e => setSelectedGenre(e.target.value)}
                       className="w-[calc(100%-16px)] mx-2 mb-2 bg-neutral-100 dark:bg-white/5 border-none p-2 text-sm outline-none cursor-pointer rounded-lg text-black dark:text-white"
                     >
                       {genres.map(g => <option key={g} value={g}>{g}</option>)}
                     </select>
                   </div>
                 )}
               </div>
             </div>
             
             <button
                 onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                 className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg sm:rounded-xl hover:bg-neutral-50 transition-colors dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800 ml-auto shrink-0"
                 title="Toggle view"
               >
                 {viewMode === 'list' ? (
                     <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                 ) : (
                     <List className="w-4 h-4 sm:w-5 sm:h-5" />
                 )}
             </button>
           </div>
       </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-24 px-6 border border-dashed border-black/10 rounded-3xl dark:border-white/10">
          <BookOpen className="w-12 h-12 text-black/20 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-lg font-medium text-black/60 mb-2 dark:text-white/60">
             No books in this category
          </h3>
          <p className="text-black/40 mb-6">
             Your shelf is looking a little empty.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm font-semibold">
              <button onClick={onAddBook} className="bg-black text-white px-6 py-3 rounded-full hover:bg-black/80 transition-all shadow-sm dark:bg-white">
                  Add Manually
              </button>
              <button onClick={onSyncLibraries} className="bg-white border border-black/10 text-black px-6 py-3 rounded-full hover:bg-black/5 transition-all shadow-sm dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white">
                  Import Books
              </button>
          </div>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 gap-y-12" : "flex flex-col gap-4"}>
          {/* Add Book Cover Card */}
          <motion.div 
             whileHover={{ y: -4 }}
             className={viewMode === 'grid' ? "cursor-pointer group flex flex-col" : "cursor-pointer group flex items-center justify-center bg-black/5 p-4 rounded-2xl border-2 border-dashed border-black/20 dark:bg-white/5 dark:border-white/20 mb-2 min-h-[120px]"}
             onClick={onAddBook}
          >
             {viewMode === 'grid' ? (
                 <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border-2 border-dashed border-black/20 bg-black/5 flex flex-col items-center justify-center p-3 relative mb-4 dark:border-white/20 dark:bg-white/5">
                    <Plus className="w-8 h-8 text-black/40 group-hover:text-black/60 group-hover:scale-110 transition-all mb-2" />
                    <span className="text-xs font-medium text-center text-black/50 group-hover:text-black/70 leading-tight px-1 dark:text-white/50">
                       Save or share your favorite books
                    </span>
                 </div>
             ) : (
                 <div className="flex items-center gap-3">
                     <Plus className="w-6 h-6 text-black/40 group-hover:text-black/60 group-hover:scale-110 transition-all" />
                     <span className="text-sm font-medium text-black/50 group-hover:text-black/70 dark:text-white/50">
                        Save or share your favorite books
                     </span>
                 </div>
             )}
          </motion.div>

          {filteredBooks.map((book) => (
            <motion.div
              key={book.id}
              layoutId={`book-card-${book.id}`}
              className={viewMode === 'grid' ? "group cursor-pointer flex flex-col" : "group cursor-pointer flex items-center gap-4 bg-white dark:bg-[#1a1a1a] p-3 rounded-2xl border border-black/5 dark:border-white/5"}
              onClick={() => onEditBook(book)}
              onContextMenu={(e) => {
                 e.preventDefault();
                 onEditBook(book);
              }}
            >
              <div className={viewMode === 'grid' ? "relative aspect-[2/3] mb-4 bg-black/5 rounded-lg overflow-hidden shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 dark:bg-white/5" : "relative w-16 h-24 shrink-0 bg-black/5 rounded-lg overflow-hidden shadow-sm dark:bg-white/5"}>
                {book.coverUrl ? (
                  <ImageWithFallback
                     category={book.category} src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center border border-black/10 dark:border-white/10">
                    <span className="font-serif italic text-black/40 text-[10px]">{book.title}</span>
                  </div>
                )}
                {book.rating > 0 && viewMode === 'grid' && (
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                    {book.rating}
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                )}
              </div>
              
              <div className={viewMode === 'grid' ? "flex flex-col flex-1" : "flex flex-col flex-1 min-w-0"}>
                  <h3 className="font-semibold text-[15px] leading-tight mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-[13px] text-black/60 line-clamp-1 mb-2 dark:text-white/60">{book.author}</p>
                  
                  {book.collections && book.collections.length > 0 && (
                     <div className="flex flex-wrap gap-1 mb-2">
                        {book.collections.slice(0, 2).map((col) => (
                           <span key={col} className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-sm border border-purple-100 font-medium">
                              {col}
                           </span>
                        ))}
                        {book.collections.length > 2 && (
                           <span className="text-[10px] text-black/40 font-medium">+{book.collections.length - 2}</span>
                        )}
                     </div>
                  )}
                  
                  {book.favoriteQuote && (
                    <div className="mt-auto pt-2 text-xs text-yellow-700 bg-yellow-50/50 italic line-clamp-2 pl-2 border-l-2 border-yellow-300">
                      {book.favoriteQuote}
                    </div>
                  )}
                  {!book.favoriteQuote && book.review && (
                    <div className="mt-auto pt-2 text-xs text-black/40 italic line-clamp-2 pl-2 border-l-2 border-black/10 dark:border-white/10">
                      "{book.review}"
                    </div>
                  )}
              </div>
              {book.rating > 0 && viewMode === 'list' && (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold ml-auto shrink-0 px-3">
                  {book.rating} <Star className="w-4 h-4 fill-current" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
