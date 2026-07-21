import React, { useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { ChevronRight, ChevronUp, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal, GripVertical, Pencil, Star, Sparkles, AlertTriangle, Compass, EyeOff, ThumbsUp, ThumbsDown, Trash2, Plus, Heart, Skull } from 'lucide-react';
import { useLongPress } from '../lib/useLongPress';
import { useUserProfile } from '../hooks';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import { ImageWithFallback } from "./ImageWithFallback";
import { getMockFriendsForTitle } from '../lib/utils';
import { CATEGORY_SUB_FILTERS_DISPLAY_NAMES } from '../lib/constants';

export function ResultList({ keyName, idx, meta, items = [], isCollapsed, toggleCollapse, toggleHide, moveCategory, displayKeysLength, navigate, activeMenu, setActiveMenu, userItems, viewMode }: any) {
  const { profile } = useUserProfile();
  const Icon = meta.icon;
  const controls = useDragControls();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const observerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!observerRef.current || isCollapsed) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => Math.min(prev + 20, items.length));
      }
    }, { rootMargin: '0px 200px 0px 0px' });
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [items.length, isCollapsed]);

  const cardWidthClass = profile?.cardSize === 'small' ? 'w-[160px] sm:w-[200px]' : profile?.cardSize === 'large' ? 'w-[240px] sm:w-[320px]' : 'w-[200px] sm:w-[280px]';
  const cardAspectClass = 'aspect-[2/3]';

  const longPressHandlers = useLongPress(
    (e) => {
      controls.start(e as any);
    },
    undefined,
    { delay: 350, shouldPreventDefault: false }
  );

  const scrollProps = useDraggableScroll<HTMLDivElement>();
  const { ref: scrollRef, onMouseDown, onMouseLeave, onMouseUp, onMouseMove } = scrollProps;

  const availableFilters = CATEGORY_SUB_FILTERS_DISPLAY_NAMES[keyName] || [];

  const filterCounts = React.useMemo(() => {
    const counts = {};
    if (!items) return counts;
    availableFilters.forEach(f => counts[f] = 0);
    
    const processedItems = items.map(item => {
        const searchStr = `${item.title} ${item.subtitle} ${item.category} ${item.metadata?.tags || ''} ${item.description || ''} ${item.collections ? item.collections.join(' ') : ''}`.toLowerCase();
        const subtitleLower = (item.subtitle || '').toLowerCase();
        const titleLower = (item.title || '').toLowerCase();
        const isActor = subtitleLower.includes('actor') || subtitleLower.includes('actress') || subtitleLower.includes('director') || subtitleLower.includes('comedian') || subtitleLower.includes('filmmaker') || subtitleLower.includes('writer');
        return { item, searchStr, titleLower, isActor };
    });

    processedItems.forEach(({ item, searchStr, titleLower, isActor }) => {
        availableFilters.forEach(fItem => {
            let matches = false;
            if (item.subCategory && item.subCategory.trim() !== "") {
                matches = (item.subCategory === fItem);
            } else {
                if (fItem === 'Actors') matches = isActor;
                else if (fItem === 'Artists') matches = searchStr.includes('artist') || searchStr.includes('band') || searchStr.includes('musician') || searchStr.includes('singer') || searchStr.includes('songwriter') || (item.category === 'music' && !/\bsong(s)?\b/.test(searchStr) && !searchStr.includes('album') && !searchStr.includes('track'));
                else if (fItem === 'Songs') matches = /\bsong(s)?\b/.test(searchStr) || /\btrack(s)?\b/.test(searchStr) || (item.category === 'music' && titleLower.includes('feat'));
                else if (fItem === 'Movies') matches = (item.category === 'movie' || item.category === 'movies' || item.category === 'watch') && !isActor;
                else if (fItem === 'TV Shows') matches = (item.category === 'tv' || item.category === 'tv series' || item.category === 'tv show' || item.category === 'tv shows') && !isActor;
                else if (fItem === 'Restaurants') matches = searchStr.includes('restaurant') || searchStr.includes('place') || searchStr.includes('dining') || (item.category === 'food' && !searchStr.includes('recipe') && !searchStr.includes('snack'));
                else if (fItem === 'Board & Card Games') matches = searchStr.includes('board game') || searchStr.includes('tabletop') || searchStr.includes('card game');
                else if (fItem === 'Video Games') matches = searchStr.includes('video game') || searchStr.includes('console') || searchStr.includes('pc game') || ((item.category === 'game' || item.category === 'games') && !searchStr.includes('board') && !searchStr.includes('sport'));
                else if (fItem === 'Sports') matches = searchStr.includes('sport') || searchStr.includes('football') || searchStr.includes('basketball') || searchStr.includes('play') || searchStr.includes('team');
                else if (fItem === 'Hobbies') matches = searchStr.includes('hobby') || searchStr.includes('craft') || searchStr.includes('art') || searchStr.includes('activity');
                else matches = searchStr.includes(fItem.toLowerCase());
            }
            if (matches) counts[fItem] = (counts[fItem] || 0) + 1;
        });
    });
    return counts;
  }, [items, availableFilters]);

  const filteredItems = React.useMemo(() => {
    if (!activeFilter || !items) return items;
    return items.filter((item: any) => {
      if (item.subCategory && item.subCategory.trim() !== "") {
          return item.subCategory === activeFilter;
      }
      
      const searchStr = `${item.title} ${item.subtitle} ${item.category} ${item.metadata?.tags || ''} ${item.description || ''} ${item.collections ? item.collections.join(' ') : ''}`.toLowerCase();
      const subtitleLower = (item.subtitle || '').toLowerCase();
      const titleLower = (item.title || '').toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      
      const isActor = subtitleLower.includes('actor') || subtitleLower.includes('actress') || subtitleLower.includes('director') || subtitleLower.includes('comedian') || subtitleLower.includes('filmmaker') || subtitleLower.includes('writer');
      
      if (activeFilter === 'Actors') return isActor;
      if (activeFilter === 'Artists') return searchStr.includes('artist') || searchStr.includes('band') || searchStr.includes('musician') || searchStr.includes('singer') || searchStr.includes('songwriter') || (item.category === 'music' && !/\bsong(s)?\b/.test(searchStr) && !searchStr.includes('album') && !searchStr.includes('track'));
      if (activeFilter === 'Songs') return /\bsong(s)?\b/.test(searchStr) || /\btrack(s)?\b/.test(searchStr) || (item.category === 'music' && titleLower.includes('feat'));
      if (activeFilter === 'Movies') return (item.category === 'movie' || item.category === 'movies' || item.category === 'watch') && !isActor;
      if (activeFilter === 'TV Shows') return (item.category === 'tv' || item.category === 'tv series' || item.category === 'tv show' || item.category === 'tv shows') && !isActor;
      if (activeFilter === 'Restaurants') return searchStr.includes('restaurant') || searchStr.includes('place') || searchStr.includes('dining') || (item.category === 'food' && !searchStr.includes('recipe') && !searchStr.includes('snack'));
      if (activeFilter === 'Board & Card Games') return searchStr.includes('board game') || searchStr.includes('tabletop') || searchStr.includes('card game');
      if (activeFilter === 'Video Games') return searchStr.includes('video game') || searchStr.includes('console') || searchStr.includes('pc game') || ((item.category === 'game' || item.category === 'games') && !searchStr.includes('board') && !searchStr.includes('sport'));
      if (activeFilter === 'Sports') return searchStr.includes('sport') || searchStr.includes('football') || searchStr.includes('basketball') || searchStr.includes('play') || searchStr.includes('team');
      if (activeFilter === 'Hobbies') return searchStr.includes('hobby') || searchStr.includes('craft') || searchStr.includes('art') || searchStr.includes('activity');
      return searchStr.includes(activeFilter.toLowerCase());
    });
  }, [items, activeFilter]);

  const isDuplicate = (item: any) => {
    if (!item.title || !userItems) return false;
    const lowerTitle = item.title.toLowerCase();
    const matches = userItems.filter((ui: any) => ui.title && ui.title.toLowerCase() === lowerTitle);
    return matches.length > 1;
  };

  return (
    <Reorder.Item 
      key={keyName} 
      value={keyName} 
      dragListener={false} 
      dragControls={controls} 
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      className={`w-full mb-12 ${isDragging ? 'ring-2 ring-emerald-500/20 scale-[1.02] z-50 shadow-xl bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-4' : ''}`}
    >
      <div {...longPressHandlers} className="group flex flex-col mb-4 select-none cursor-default relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="absolute -left-6 top-1.5 sm:top-2 flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onPointerDown={(e) => controls.start(e)}
                className="p-1 cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                title="Reorder category"
              >
                <GripVertical className="w-5 h-5" />
              </button>
            </div>
            <div 
              className="flex items-center cursor-pointer group/title min-w-0"
              onClick={() => meta.path ? navigate(meta.path) : null}
            >
              <div className={`mr-3 shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400`}>
                <Icon className="w-8 h-8 md:w-10 md:h-10 shrink-0 stroke-1" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                   <h3 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900 group-hover/title:text-black transition-colors dark:text-white">{keyName}</h3>
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
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button 
               onClick={() => {
                  if (meta.path) {
                     window.scrollTo(0,0);
                     navigate(meta.path);
                  }
               }} 
               className="text-emerald-600 font-semibold text-xs sm:text-sm hover:text-emerald-700 transition-colors flex items-center gap-1 shrink-0"
            >
               View all {(items || []).length} items <ChevronRight className="w-3 h-3 md:w-4 md:h-4" strokeWidth={3} />
            </button>
          </div>
        </div>
        
        {!(isCollapsed || isDragging) && (
          <div className="flex items-center w-full mb-4">
            <div className="flex gap-2 items-center overflow-x-auto hide-scrollbar flex-1 min-w-0">
              {availableFilters.map(f => {
                const count = filterCounts[f] || 0;
                if (count === 0 && !(keyName === 'Food' && (f === 'Snacks' || f === 'Meals'))) return null;
                return (
                <button 
                  key={f}
                  onClick={() => setActiveFilter(activeFilter === f ? null : f)} 
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${activeFilter === f ? 'border-emerald-500 text-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/30 dark:text-emerald-400' : 'border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:text-neutral-400 dark:border-white/10 dark:hover:bg-white/5'}`}
                >
                  <span>{f}</span>
                </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {!(isCollapsed || isDragging) && (
         <div 
          ref={viewMode === 'grid' ? scrollRef : undefined}
          onMouseDown={viewMode === 'grid' ? onMouseDown : undefined}
          onMouseLeave={viewMode === 'grid' ? onMouseLeave : undefined}
          onMouseUp={viewMode === 'grid' ? onMouseUp : undefined}
          onMouseMove={viewMode === 'grid' ? onMouseMove : undefined}
          className={viewMode === 'grid' ? `flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x` : "flex flex-col gap-3 pb-4"}
        >
          {/* Add New Card (Always First) */}
          <button 
            onClick={() => {
               let catKey = 'movies';
               if (keyName === 'TV & Movies') catKey = 'watch';
               else if (keyName === 'Food') catKey = 'food';
               else if (keyName === 'Music') catKey = 'music';
               else if (keyName === 'Products') catKey = 'products';
               else if (keyName === 'Places') catKey = 'places';
               else if (keyName === 'Books') catKey = 'books';
               else if (keyName === 'Events') catKey = 'events';
               else if (keyName === 'Games/Sports') catKey = 'games';
               window.dispatchEvent(new CustomEvent('create-new-item', { detail: { category: catKey } }));
             }}
            className={viewMode === 'grid' ? `w-[80px] sm:w-[100px] shrink-0 snap-start bg-neutral-50 border-2 border-dashed border-neutral-200 dark:bg-white/5 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-[1.5rem] flex flex-col items-center justify-center transition-colors group relative self-stretch aspect-[2/3]` : "w-full h-20 sm:h-24 bg-neutral-50 border-2 border-dashed border-neutral-200 dark:bg-white/5 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-[1.5rem] flex flex-row items-center justify-center transition-colors group relative"}
          >
             <div className={`${viewMode === 'grid' ? 'w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-3' : 'w-8 h-8 sm:w-10 sm:h-10 sm:mr-3'} bg-emerald-100/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
               <Plus className={`${viewMode === 'grid' ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-5 h-5 sm:w-5 sm:h-5'} text-emerald-600`} />
             </div>
             <div className={`text-emerald-700 font-bold ${viewMode === 'grid' ? 'text-xs sm:text-sm' : 'text-sm'} dark:text-emerald-400 px-1 truncate leading-none`}>{viewMode === 'grid' ? 'Add' : 'Add New Item'}</div>
        </button>

        {filteredItems && filteredItems.length > 0 && filteredItems.slice(0, visibleCount).map((item: any, i2: number) => (
          <div key={`${item.id ?? 'idx'}-${i2}`} className={viewMode === 'grid' ? `w-[140px] sm:w-[160px] lg:w-[180px] shrink-0 snap-start h-auto flex flex-col` : "w-full"}>
            <div 
              className={`w-full flex bg-white border border-neutral-200 rounded-[1.5rem] overflow-hidden shadow-sm relative group cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-300 dark:bg-[#1a1a1a] dark:border-white/10 ${viewMode === 'grid' ? 'flex-col h-full' : 'flex-row items-stretch h-24 sm:h-32'}`} 
              onClick={() => window.dispatchEvent(new CustomEvent('open-item', { detail: item }))}
              onContextMenu={(e) => {
                 e.preventDefault();
                 window.dispatchEvent(new CustomEvent('open-item', { detail: item }));
              }}
            >
              {isDuplicate(item) && (
                 <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm z-10" title="Possible Duplicate">
                    <AlertTriangle className="w-3 h-3" /> Duplicate
                 </div>
              )}
              {item.isMinimal ? (
                <div className={`${viewMode === 'grid' ? 'w-full aspect-[4/5]' : 'w-24 sm:w-32 h-full'} flex flex-col items-center justify-center p-4 text-center shrink-0 ${meta.bgColor} ${meta.textColor}`}>
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 opacity-50 mb-2 sm:mb-3" />
                  {viewMode === 'grid' && <span className="font-bold text-xs sm:text-sm md:text-base leading-tight line-clamp-2 sm:line-clamp-3">{item.title}</span>}
                </div>
              ) : (item.coverUrl || item.imageUrl || item.background_image) ? (
                <div className={`${viewMode === 'grid' ? 'w-full aspect-[4/5]' : 'w-24 sm:w-32 h-full'} relative bg-neutral-100 dark:bg-neutral-800 shrink-0 overflow-hidden`}>
                  <ImageWithFallback 
                     category={item.category} src={item.coverUrl || item.imageUrl || item.background_image} 
                    alt={item.title} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className={`absolute inset-0 flex-col items-center justify-center p-4 text-center hidden ${meta.bgColor} ${meta.textColor}`}>
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 opacity-50 mb-2 sm:mb-3" />
                    {viewMode === 'grid' && <span className="font-bold text-xs sm:text-sm md:text-base leading-tight line-clamp-2 sm:line-clamp-3">{item.title}</span>}
                  </div>
                </div>
              ) : (
                <div className={`${viewMode === 'grid' ? 'w-full aspect-[4/5]' : 'w-24 sm:w-32 h-full'} flex flex-col items-center justify-center p-4 text-center shrink-0 ${meta.bgColor} ${meta.textColor}`}>
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 opacity-50 mb-2 sm:mb-3" />
                  {viewMode === 'grid' && <span className="font-bold text-xs sm:text-sm md:text-base leading-tight line-clamp-2 sm:line-clamp-3">{item.title}</span>}
                </div>
              )}
              
              <div className={`p-3 sm:p-4 flex flex-col flex-1 relative bg-white dark:bg-[#1a1a1a] ${viewMode === 'row' ? 'justify-center py-2 pr-3' : ''}`}>
                 <h4 className={`font-bold text-neutral-900 mb-0.5 sm:mb-1 leading-tight line-clamp-1 dark:text-white ${viewMode === 'row' ? 'text-sm sm:text-base md:text-lg line-clamp-2' : 'text-sm sm:text-lg'}`}>{item.title}</h4>
                 <p className="text-xs sm:text-sm font-medium text-neutral-500 line-clamp-1 mb-0.5 sm:mb-1 dark:text-neutral-400">{item.subtitle || item.description || ''}</p>
                 {item.runtime ? (
                    <p className="text-[10px] sm:text-xs font-semibold text-neutral-400 dark:text-neutral-500 truncate mb-1">Runtime: {item.runtime} mins</p>
                 ) : (item.pages || item.pageCount) ? (
                    <p className="text-[10px] sm:text-xs font-semibold text-neutral-400 dark:text-neutral-500 truncate mb-1">{item.pages || item.pageCount} pages</p>
                 ) : null}
                 {viewMode === 'grid' && item.metadata?.location && <p className="text-[10px] sm:text-xs font-semibold text-neutral-400 dark:text-neutral-500 truncate mt-1 w-5/6">{item.metadata.location}</p>}
                 
                 {/* Grid View Specific Details */}
                 {viewMode === 'grid' && (
                 <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                     {/* Rating/Reaction for grid view */}
                     {(item.status !== "up-next" && item.status !== "planning" && (item.reaction || item.rating > 0)) && (
                         <div 
                           className="flex items-center gap-1 shrink-0 cursor-pointer hover:scale-110 transition-transform p-1 -m-1"
                           title="Edit Rating"
                           onClick={(e) => {
                             e.stopPropagation();
                             window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { item } }));
                           }}
                         >
                             {(() => {
                               const reaction = item.reaction || ((item.criticScore || item.rating) >= 8 ? 'love' : (item.criticScore || item.rating) >= 5 && (item.criticScore || item.rating) <= 7 ? 'like' : (item.criticScore || item.rating) > 0 && (item.criticScore || item.rating) <= 4 ? 'dislike' : null);
                               if (reaction === 'love' || reaction === 'heart' || reaction === 'favorite') return <Heart className="w-4 h-4 text-emerald-500 fill-emerald-500" />;
                               if (reaction === 'like' || reaction === 'thumbs-up') return <ThumbsUp className="w-4 h-4 text-emerald-500 fill-emerald-500" />;
                               if (reaction === 'dislike' || reaction === 'thumbs-down') return <ThumbsDown className="w-4 h-4 text-orange-500 fill-orange-500" />;
                               if (reaction === 'hate' || reaction === 'skull') return <Skull className="w-4 h-4 text-red-500 fill-red-500 dark:text-red-400 dark:fill-red-400" />;
                               return null;
                             })()}
                         </div>
                     )}

                     {/* Friends Badge for grid view */}
                     {profile?.showSocialIndicators !== false && getMockFriendsForTitle(item.title) && (
                       <div 
                         className="flex items-center gap-2 z-10 cursor-pointer hover:opacity-80 transition-opacity ml-auto"
                         onClick={(e) => {
                           e.stopPropagation();
                           window.dispatchEvent(new CustomEvent('open-social-modal', { detail: { itemId: item.id, title: item.title } }));
                         }}
                       >
                           <div className="flex -space-x-1.5">
                               {getMockFriendsForTitle(item.title)!.slice(0, 3).map((friendName, idx) => (
                                   <img 
                                      key={idx}
                                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${friendName}`} 
                                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white dark:border-[#1a1a1a] shadow-sm relative" 
                                      style={{ zIndex: 3 - idx }}
                                      alt="Friend" 
                                      title={`${friendName} saved this`} 
                                   />
                               ))}
                           </div>
                           <span className="text-[10px] sm:text-xs font-medium text-neutral-500">
                               +{getMockFriendsForTitle(item.title)!.length} friends
                           </span>
                       </div>
                     )}
                 </div>
                 )}

                 {/* Row View Specific Details */}
                 {viewMode === 'row' && (
                   <div className="mt-auto pt-2 flex items-center justify-between">
                       {/* Rating/Reaction for row view */}
                       {(item.status !== "up-next" && item.status !== "planning" && (item.reaction || item.rating > 0)) && (
                           <div 
                             className="flex items-center gap-1 shrink-0 cursor-pointer hover:scale-110 transition-transform p-1 -m-1"
                             title="Edit Rating"
                             onClick={(e) => {
                               e.stopPropagation();
                               window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { item } }));
                             }}
                           >
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
                       
                       {/* Friends Badge for row view */}
                       {profile?.showSocialIndicators !== false && getMockFriendsForTitle(item.title) && (
                         <div 
                           className="flex items-center gap-2 z-10 cursor-pointer hover:opacity-80 transition-opacity ml-auto"
                           onClick={(e) => {
                             e.stopPropagation();
                             window.dispatchEvent(new CustomEvent('open-social-modal', { detail: { itemId: item.id, title: item.title } }));
                           }}
                         >
                             <div className="flex -space-x-1.5">
                                 {getMockFriendsForTitle(item.title)!.slice(0, 3).map((friendName, idx) => (
                                     <img 
                                        key={idx}
                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${friendName}`} 
                                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white dark:border-[#1a1a1a] shadow-sm relative" 
                                        style={{ zIndex: 3 - idx }}
                                        alt="Friend" 
                                        title={`${friendName} saved this`} 
                                     />
                                 ))}
                             </div>
                             <span className="text-[10px] sm:text-xs font-medium text-neutral-500">
                                 +{getMockFriendsForTitle(item.title)!.length}
                             </span>
                         </div>
                       )}
                   </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredItems.length > visibleCount && (
          <div ref={observerRef} className="w-4 h-full shrink-0 flex items-center justify-center">
             <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
        )}
      </div>
      )}
    </Reorder.Item>
  );
}



