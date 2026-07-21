import React, { useState, useEffect } from "react";
import {
  X,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Skull,
  Trash2,
  Play,
  Share,
  Loader2,
  ShoppingBag,
  Star,
  Pencil,
  Image as ImageIcon,
  Upload,
  Utensils,
  MapPin,
  Sparkles,
  Book,
  BookOpen,
  Eye,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserItem } from "../types";
import { useUserItems, useUserProfile } from "../hooks";
import { getMockFriendsForTitle } from "../lib/utils";
import { useAudioPlayer } from '../lib/audioPlayerStore';
import { ImageWithFallback } from "./ImageWithFallback";

function EnrichmentSection({ item }: { item: UserItem }) {
  const { saveItem, userItems } = useUserItems();
  const [description, setDescription] = useState(item.description || "");
  const [similarItems, setSimilarItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [hasScannedSimilar, setHasScannedSimilar] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Check if description is "junk" (like "Book" or "Published 1985")
    const descLower = (item.description || "").trim().toLowerCase();
    const isJunkDescription = !descLower ||
        descLower === "book" ||
        descLower === "movie" ||
        descLower === "tv show" ||
       descLower === "podcast" ||
       descLower === "album" ||
       descLower === "video game" ||
       descLower === "general preference" ||
       descLower === "location" ||
       descLower === "restaurant" ||
       descLower === "restaurant chain" ||
       descLower === "brand location" ||
       descLower.startsWith("published ") ||
       descLower.includes("you will love this") ||
       descLower.includes("you'll love this") ||
       descLower.includes("you might like this") ||
       descLower.includes("you might love this");

    const needsMetadata = (item.category === "food" || item.category === "place") && !item.metadata?.address;

    if (!isJunkDescription && !needsMetadata) {
      setDescription(item.description || "");
      return;
    }

    let isMounted = true;
    const fetchEnrichment = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
         let newDesc = "";
         let newMetadata = item.metadata;
         let newCoverUrl = item.coverUrl;
         let newScore = (item as any).criticScore;
         let newSubtitle = item.subtitle;

         if (item.category === "food" || item.category === "place" || isJunkDescription || !item.subtitle) {
            const searchData = await fetch("/api/universal-search", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ query: item.title, category: item.category })
            }).then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any));
            
            if (searchData && searchData.length > 0) {
               const match = searchData[0];
               if (match.description && match.description !== "Location" && match.description !== "General preference" && match.description !== "Restaurant") {
                  newDesc = match.description;
               }
               if (match.metadata) newMetadata = { ...(item.metadata || {}), ...match.metadata };
               if (match.coverUrl && !item.coverUrl) newCoverUrl = match.coverUrl;
               if (match.criticScore && !(item as any).criticScore) newScore = match.criticScore;
               if (match.subtitle && !item.subtitle) newSubtitle = match.subtitle;
            }
         }

         const isJunk = (desc: string) => {
                  if (!desc) return true;
                  const d = desc.trim().toLowerCase();
                  return d === "book" || d === "movie" || d === "tv show" || d === "podcast" || d === "album" || d === "video game" || d === "general preference" || d === "location" || d === "restaurant" || d === "restaurant chain" || d === "brand location" || d.startsWith("published ") || d.includes("you will love this") || d.includes("you'll love this") || d.includes("you might like this") || d.includes("you might love this");
         };
         
         // If we still don't have a good description, try Wikipedia summary
         if (isJunk(newDesc || item.description)) {
             const descData = await fetch("/api/wikipedia-summary", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ title: item.title, category: item.category })
                }).then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any));
             
             if (descData && descData.description) {
                newDesc = descData.description;
             }
         }
         
         if (!isMounted) return;
         
         const updates: any = {};
         if (newDesc) {
            setDescription(newDesc);
            updates.description = newDesc;
         }
         if (JSON.stringify(newMetadata) !== JSON.stringify(item.metadata)) updates.metadata = newMetadata;
         if (newCoverUrl !== item.coverUrl) updates.coverUrl = newCoverUrl;
         if (newScore !== (item as any).criticScore) updates.criticScore = newScore;
         if (newSubtitle !== item.subtitle) updates.subtitle = newSubtitle;

         if (Object.keys(updates).length > 0) {
             updates.enrichmentAttempted = true;
             updates.enrichmentVersion = 3;
         }
         
         if (item.id && Object.keys(updates).length > 0) {
             saveItem({ ...item, ...updates });
         }
      } catch(e) {
        console.error(e);
      } finally {
        if(isMounted) setLoading(false);
      }
    };

    // Automatic enrichment has been disabled per user request
    fetchEnrichment();
    return () => { isMounted = false; };
  }, [item.id, item.title, item.category]);

  const handleFetchSimilar = async () => {
     setLoadingSimilar(true);
     setHasScannedSimilar(true);
     try {
         const simData = await fetch("/api/universal-recommend", {
             method: "POST",
             headers: { "Content-Type": "application/json", "x-user-api-key": localStorage.getItem("user_gemini_api_key") || "", "x-user-ai-provider": localStorage.getItem("user_ai_provider") || "gemini" },
             body: JSON.stringify({ 
               context: `${item.title} ${item.description || ''}`,
               category: item.category,
               title: item.title,
               isSimilarMode: true
             })
          }).then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any));
          
         if (Array.isArray(simData)) {
            setSimilarItems(simData.slice(0, 5));
         }
     } catch(e) {
         console.error(e);
     } finally {
         setLoadingSimilar(false);
     }
  };

  const displayDescription = description || item.description;

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Description Section */}
      {(item as any).recommendationReason && (
         <div className="mb-2">
           <h4 className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
             <Sparkles className="w-3 h-3" /> Why we recommend this
           </h4>
           <p className="text-emerald-900 text-base leading-relaxed font-serif dark:text-emerald-100 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
             {(item as any).recommendationReason}
           </p>
         </div>
      )}
      {(displayDescription || loading) && (
        <div>
          <h4 className="text-[10px] font-semibold text-black/40 uppercase tracking-widest mb-2 dark:text-white/40">
            Description / Summary
          </h4>
          {displayDescription ? (
            <div className="relative">
              <p className={`text-neutral-800 text-base leading-relaxed font-serif transition-opacity animate-in fade-in ${!isExpanded ? 'line-clamp-4' : ''} dark:text-neutral-200`}>
                {String(displayDescription)}
              </p>
              {String(displayDescription).length > 200 && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 mt-2 hover:underline dark:text-emerald-400"
                >
                  {isExpanded ? "Show Less" : "Read More"}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
               <div className="h-4 bg-neutral-100 rounded-md w-full animate-pulse dark:bg-neutral-800" />
               <div className="h-4 bg-neutral-100 rounded-md w-5/6 animate-pulse dark:bg-neutral-800" />
               <div className="h-4 bg-neutral-100 rounded-md w-4/6 animate-pulse dark:bg-neutral-800" />
            </div>
          )}
        </div>
      )}

      {/* Similar Items Section */}
      <div className="border-t border-neutral-100 pt-6 mt-2 dark:border-white/5">
         <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-xs text-neutral-400 uppercase tracking-wider dark:text-neutral-500">
               {hasScannedSimilar && !loadingSimilar ? "Similar Items" : ""}
            </h3>
            {(!hasScannedSimilar || loadingSimilar) && (
               <button
                  onClick={handleFetchSimilar}
                  disabled={loadingSimilar}
                 className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed dark:text-emerald-300 dark:bg-emerald-950 dark:border-emerald-800"
               >
                 {loadingSimilar ? (
                   <>
                     <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin dark:border-emerald-400/30 dark:border-t-emerald-400" />
                     Finding Similar Items...
                   </>
                 ) : "Discover Similar Items"}
               </button>
            )}
         </div>
         
         {loadingSimilar && similarItems.length === 0 ? (
           <div className="flex gap-4 overflow-hidden opacity-50">
             {[1, 2, 3].map((i) => (
               <div key={i} className="w-[100px] h-[150px] bg-neutral-100 animate-pulse rounded-xl shrink-0 dark:bg-neutral-800" />
             ))}
           </div>
         ) : hasScannedSimilar && similarItems.length === 0 ? (
            <div className="text-xs text-neutral-400 italic dark:text-neutral-500">No similar items found right now.</div>
         ) : hasScannedSimilar && similarItems.length > 0 ? (
           <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x -mx-6 px-6">
             {similarItems.map((rec: any, idx: number) => (
               <div 
                 key={idx} 
                 onClick={() => {
                   window.dispatchEvent(
                     new CustomEvent("open-universal-add-item", {
                       detail: { item: { category: rec.category, title: rec.title, recommendationReason: rec.reason, coverUrl: rec.coverUrl, subtitle: rec.subtitle, description: rec.description, sourceAttribution: "Similar Item Recommendation" } },
                     }),
                   );
                 }}
                 className="w-[100px] min-w-[100px] snap-start shrink-0 cursor-pointer group"
               >
                 <div className="w-[100px] h-[150px] bg-neutral-100 rounded-xl overflow-hidden mb-2 flex flex-col items-center justify-center p-2 text-center transition-all group-hover:shadow-md border border-neutral-200 dark:bg-neutral-800 dark:border-white/10">
                    {rec.coverUrl ? (
                      <ImageWithFallback src={rec.coverUrl} category={rec.category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-bold text-[10px] text-neutral-800 line-clamp-3 dark:text-neutral-200">{rec.title}</span>
                    )}
                 </div>
                 <p className="font-bold text-[11px] text-neutral-900 truncate px-1 dark:text-white">{rec.title}</p>
                 <p className="text-[10px] text-neutral-500 truncate px-1 dark:text-neutral-400">{rec.category}</p>
               </div>
             ))}
           </div>
         ) : null}
      </div>
    </div>
  );
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  initialItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialItem: UserItem | null;
}) {
  const { profile } = useUserProfile();
  const { userItems, removeItem, saveItem } = useUserItems();
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [isEditingImage, setIsEditingImage] = React.useState(false);
  const [imageAlts, setImageAlts] = React.useState<string[]>([]);
  const [loadingImages, setLoadingImages] = React.useState(false);
  const { setPlaylist } = useAudioPlayer();

  const liveItem = React.useMemo(() => {
      if (!initialItem) return null;
      return userItems.find(i => i.id === initialItem.id) || initialItem;
  }, [initialItem, userItems]);

  const handleEditImage = async () => {
    setIsEditingImage(true);
    if (imageAlts.length > 0) return;
    setLoadingImages(true);
    try {
      const res = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: liveItem?.title, 
          category: liveItem?.category,
          subtitle: liveItem?.subtitle,
          address: liveItem?.metadata?.address,
          placeId: liveItem?.metadata?.googlePlaceId 
        }),
      });
      if (res.ok) {
        const urls = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        setImageAlts(urls || []);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingImages(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setIsConfirmingDelete(false);
      setIsEditingImage(false);
      setImageAlts([]);
    }
  }, [isOpen]);

  if (!isOpen || !initialItem) return null;

  const getReactionIcon = (r?: "love" | "like" | "dislike" | "hate", customColor?: string) => {
    const defaultEmerald = "fill-emerald-500 text-emerald-500";
    const defaultOrange = "fill-orange-500 text-orange-500";
    const defaultBlack = "fill-black text-black dark:text-white";
    
    switch (r) {
      case "love":
        return <Heart className={`w-5 h-5 ${customColor || defaultEmerald}`} />;
      case "like":
        return (
          <ThumbsUp className={`w-5 h-5 ${customColor || defaultEmerald}`} />
        );
      case "dislike":
        return (
          <ThumbsDown className={`w-5 h-5 ${customColor || defaultOrange}`} />
        );
      case "hate":
        return <Skull className={`w-5 h-5 ${customColor || defaultBlack}`} />;
      default:
        return null;
    }
  };

  const statusName =
    liveItem.status === "completed"
      ? liveItem.category === "book"
        ? "Read"
        : "Completed"
      : liveItem.status === "in-progress"
        ? liveItem.category === "book"
          ? "Reading"
          : "In Progress"
        : "Up Next";

  const hasCoverUrl =
    typeof liveItem.coverUrl === "string" &&
    liveItem.coverUrl.trim().length > 0;
  const ratingNum = Number(liveItem.rating || 0);
  const criticNum = Number(liveItem.criticScore || 0);
  // Migrate legacy critic scores that were erroneously used for < 5.0 places ratings
  const googlePlacesRating = Number(liveItem.metadata?.googlePlacesRating !== undefined ? liveItem.metadata.googlePlacesRating : (liveItem.sourceAttribution === 'Google Places API' && criticNum > 0 && criticNum <= 5.0 ? criticNum : 0));
  // Determine if the user has an actual 10-point scale review score vs a legacy place rating
  const userCriticScore = criticNum > 5.0 ? criticNum : (liveItem.metadata?.googlePlacesRating === undefined && liveItem.sourceAttribution === 'Google Places API' && criticNum <= 5.0 ? 0 : criticNum);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9990]"
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md max-h-[90vh] bg-white rounded-[32px] overflow-y-auto hide-scrollbar shadow-2xl z-[9999] flex flex-col dark:bg-[#1a1a1a]"
      >
        
        <div className="sticky top-4 z-[100] flex justify-end w-full px-4 pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            
            {isEditingImage ? (
              <div className="bg-black/60 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white/10 flex flex-col gap-2 w-64 max-w-[85vw] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                   <span className="text-white text-xs font-bold uppercase tracking-wider">Update Image</span>
                   <button onClick={(e) => { e.stopPropagation(); setIsEditingImage(false); }} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-1 pb-1 max-h-60 overflow-y-auto pr-1">
                   {loadingImages ? (
                      <div className="col-span-4 flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-white/80" /></div>
                   ) : imageAlts.length > 0 ? (
                      imageAlts.map((altUrl, i) => (
                         <div
                            key={i}
                            onClick={async (e) => {
                               e.stopPropagation();
                               try {
                                  await saveItem({ ...liveItem, coverUrl: altUrl });
                               } catch (err) { }
                               setIsEditingImage(false);
                            }}
                            className="h-20 w-full rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-emerald-400 opacity-80 hover:opacity-100 transition-all bg-neutral-800"
                         >
                            <ImageWithFallback src={altUrl} category={liveItem.category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         </div>
                      ))
                   ) : (
                      <span className="col-span-4 text-center text-white/50 text-xs py-4 font-medium italic">No matches found.</span>
                   )}
                </div>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const formData = new FormData(e.currentTarget);
                    const url = formData.get('imageUrl') as string;
                    if (url && url.length > 5) {
                        try {
                           await saveItem({ ...liveItem, coverUrl: url });
                        } catch (err) {}
                        setIsEditingImage(false);
                    }
                }} className="flex gap-2 w-full pt-2 border-t border-white/10">
                   <input type="url" name="imageUrl" placeholder="Paste Image URL..." onClick={(e) => e.stopPropagation()} className="flex-1 bg-black/50 border border-white/10 text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-white/30" />
                   <button type="submit" onClick={(e) => e.stopPropagation()} className="bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg px-3 py-2 text-xs font-bold transition-colors">
                      <Upload className="w-4 h-4" />
                   </button>
                </form>
              </div>
            ) : isConfirmingDelete ? (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 shadow-sm pointer-events-auto">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest pl-2 pr-1">
                  Delete?
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingDelete(false);
                  }}
                  className="px-2.5 py-1.5 text-[10px] font-bold rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      if (liveItem.id) {
                        removeItem(liveItem.id);
                        onClose();
                      }
                    } catch (error) {
                      console.error("Error deleting item:", error);
                    }
                  }}
                  className="px-2.5 py-1.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  Confirm
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-neutral-200">
                <button title="Edit Item" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { item: liveItem } })); onClose(); }} className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors">
                    <Pencil className="w-4 h-4" />
                </button>
                <button title="Update Image" onClick={(e) => { e.stopPropagation(); handleEditImage(); }} className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors">
                    <ImageIcon className="w-4 h-4" />
                </button>
                <button title="Share" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-social-modal', { detail: { itemId: liveItem.id || liveItem.title, title: liveItem.title } })); }} className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors">
                    <Share className="w-4 h-4" />
                </button>
                <button title="Delete" onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }} className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
                <button title="Close" onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors">
                    <X className="w-4 h-4" />
                </button>
             </div>
            )}
          
          </div>
        </div>
        <div className="relative w-full overflow-hidden shrink-0 bg-[#F5F2EA] group h-[40vh] sm:h-[45vh] max-h-[450px]">
          {hasCoverUrl ? (
            <ImageWithFallback category={liveItem.category}
                src={liveItem.coverUrl}
                className="relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[#A38A65] font-medium opacity-60">No Image Provided</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
        </div>
        <div className="px-6 py-4 pb-2 shrink-0 bg-white relative z-20 flex flex-col gap-1 -mt-8 rounded-t-3xl border-none">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1 pt-2">
              <h2 className="font-serif text-4xl font-bold text-neutral-900 leading-tight">
                {String(liveItem.title || "Untitled")}
              </h2>
              {liveItem.subtitle && (
                <p className="text-[#A38A65] text-sm uppercase tracking-widest font-semibold mt-1">
                  {String(liveItem.subtitle)}
                </p>
              )}
              {(liveItem.runtime || liveItem.pages || (liveItem as any).pageCount) && (
                 <p className="text-neutral-500 text-sm font-medium mt-1">
                    {liveItem.runtime ? <span>{liveItem.runtime} minutes</span> : null}
                    {liveItem.runtime && (liveItem.pages || (liveItem as any).pageCount) ? <span className="mx-1">•</span> : null}
                    {(liveItem.pages || (liveItem as any).pageCount) ? <span>{liveItem.pages || (liveItem as any).pageCount} pages</span> : null}
                 </p>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0 pt-2">
               {liveItem.category === "book" && (
                 <button
                    onClick={(e) => {
                       e.stopPropagation();
                       const searchQuery = encodeURIComponent(`${liveItem.title} ${liveItem.subtitle || ""}`);
                       window.open(`https://www.goodreads.com/search?q=${searchQuery}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E8DCC4] hover:bg-[#DEDAC4] text-[#5C4A30] text-xs font-bold rounded-full transition-colors shadow-sm whitespace-nowrap"
                 >
                    <BookOpen className="w-4 h-4" /> Open in Goodreads
                 </button>
               )}
               {(liveItem.category === "movie" || liveItem.category === "tv") && (
                 <button
                    onClick={(e) => {
                       e.stopPropagation();
                       const searchQuery = encodeURIComponent(`${liveItem.title}`);
                       window.open(`https://www.imdb.com/find/?q=${searchQuery}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F5C518] hover:bg-[#E2B616] text-black text-xs font-bold rounded-full transition-colors shadow-sm whitespace-nowrap"
                 >
                    Open in IMDb
                 </button>
               )}
               {(liveItem.category === "place" || liveItem.category === "food" || String(liveItem.subCategory || "").toLowerCase().includes("restaurant") || !!liveItem.metadata?.address) && (
                 <button
                    onClick={(e) => {
                       e.stopPropagation();
                       if (liveItem.metadata?.googleMapsUrl) {
                          window.open(liveItem.metadata.googleMapsUrl, '_blank');
                       } else {
                          const searchQuery = encodeURIComponent(`${liveItem.title} ${liveItem.subtitle || liveItem.metadata?.address || ""}`);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${searchQuery}`, '_blank');
                       }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold rounded-full transition-colors shadow-sm whitespace-nowrap"
                 >
                    <MapPin className="w-3.5 h-3.5" /> Open in Google Maps
                 </button>
               )}
            </div>
          </div>

          {liveItem.category === "music" && (
            <div className="flex flex-col gap-2 mt-4 mb-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const searchQuery = encodeURIComponent(`${liveItem.title} ${liveItem.subtitle || liveItem.author || ""}`);
                    window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#FF0000] hover:bg-[#D90000] text-white text-xs font-bold rounded-2xl transition-colors shadow-sm min-w-[120px]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Play Free (YouTube)
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const searchQuery = encodeURIComponent(`${liveItem.title} ${liveItem.subtitle || ""}`);
                    window.open(`https://open.spotify.com/search/${searchQuery}`, '_blank');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] text-white text-xs font-bold rounded-2xl transition-colors shadow-sm min-w-[120px]"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  Open in Spotify
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 items-center flex-wrap mt-4 mb-4">
            <span className="bg-transparent text-neutral-700 border border-neutral-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <Book className="w-3.5 h-3.5 text-neutral-500" />
              {String(liveItem.category || "unknown")}
            </span>
            <span className="bg-transparent text-neutral-700 border border-neutral-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <Eye className="w-3.5 h-3.5 text-neutral-500" />
              {statusName}
            </span>
            {(liveItem as any).releaseYear && (
              <span className="bg-transparent text-neutral-700 border border-neutral-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                {(liveItem as any).releaseYear}
              </span>
            )}
          </div>

          {profile?.showSocialIndicators !== false && getMockFriendsForTitle(liveItem.title) && (
             <div 
                onClick={() => window.dispatchEvent(new CustomEvent('open-social-modal', { detail: { itemId: liveItem.id, title: liveItem.title } }))}
                className="flex items-center gap-3 mb-4 bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm w-full cursor-pointer hover:bg-neutral-50 transition-colors"
             >
                 <div className="flex -space-x-2">
                    {getMockFriendsForTitle(liveItem.title)!.map((friendName, idx) => (
                      <div key={idx} className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm" title={friendName}>
                        {friendName.charAt(0)}
                      </div>
                    ))}
                 </div>
                 <span className="text-sm font-medium text-neutral-500">
                    Liked by <span className="text-neutral-800 font-semibold">{getMockFriendsForTitle(liveItem.title)!.join(" and ")}</span>
                 </span>
             </div>
          )}

          {(liveItem.reaction || ratingNum > 0 || userCriticScore > 0 || googlePlacesRating > 0) && (
            <div className="flex flex-col gap-3 bg-[#1A1816] text-[#D4AF37] p-5 rounded-[24px] w-full mb-2 relative overflow-hidden border border-[#2e2a22] shadow-lg">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, #D4AF37 0%, transparent 50%), radial-gradient(circle at 0% 100%, #D4AF37 0%, transparent 50%)' }} />
              
              {/* User row */}
              {(liveItem.reaction || userCriticScore > 0 || ratingNum > 0) && (
                <div className="flex items-center justify-between w-full relative z-10">
                  <span className="text-[#A38A65] text-xs font-bold uppercase tracking-widest shrink-0">Your Review</span>
                  <div className="flex items-center gap-4">
                    {liveItem.reaction && (
                      <div className="flex items-center gap-2 text-[#D4AF37] text-sm font-bold shrink-0">
                        {getReactionIcon(liveItem.reaction, "fill-[#D4AF37] text-[#D4AF37]")} 
                        <span className="text-[#D4AF37] font-serif tracking-wide">
                        {(liveItem.reaction as any) === 'love' || (liveItem.reaction as any) === 'favorite' ? 'Loved' : 
                         liveItem.reaction === 'like' ? 'Liked' : 
                         liveItem.reaction === 'dislike' ? 'Disliked' : 
                         liveItem.reaction === 'hate' ? 'Hated' : liveItem.reaction}
                        </span>
                      </div>
                    )}
                    {liveItem.reaction && (userCriticScore > 0 || ratingNum > 0) && (
                      <div className="w-px h-6 bg-[#3A352A]" />
                    )}
                    {(userCriticScore > 0 || ratingNum > 0) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.dispatchEvent(new CustomEvent("open-universal-add-item", { detail: { item: liveItem } }));
                          onClose();
                        }}
                        className="flex items-baseline gap-1 group hover:opacity-80 transition-opacity shrink-0"
                        title="Edit Rating"
                      >
                        <span className="text-4xl font-serif text-white font-bold leading-none tracking-tighter">
                           {(() => {
                              let score = userCriticScore > 0 ? userCriticScore : ratingNum;
                              if (score > 10) {
                                 score = score / 10;
                              }
                              return score.toFixed(1);
                           })()}
                        </span>
                        <span className="text-[#A38A65] text-sm font-medium">/ 10</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Source row */}
              {googlePlacesRating > 0 && (
                <>
                  {(liveItem.reaction || userCriticScore > 0 || ratingNum > 0) && (
                    <div className="w-full h-px bg-[#3A352A] my-1" />
                  )}
                  <div className="flex items-center justify-between w-full relative z-10">
                    <span className="text-[#A38A65] text-xs font-bold uppercase tracking-widest shrink-0">
                      {(liveItem.sourceAttribution === 'Google Places API' || liveItem.metadata?.googlePlacesRating !== undefined) ? 'Google Places' : (liveItem.sourceAttribution && liveItem.sourceAttribution !== 'Your Library' && liveItem.sourceAttribution !== 'User Provided' ? liveItem.sourceAttribution.replace(/ API/i, '') : 'Public Rating')}
                    </span>
                    <div className="flex items-center gap-1.5 text-sm font-bold bg-[#2A261F] px-3 py-1.5 rounded-full shrink-0 leading-none border border-[#3A352A]">
                      {(liveItem.sourceAttribution === 'Google Places API' || liveItem.metadata?.googlePlacesRating !== undefined) ? <span className="text-[#4285F4]">G</span> : <Star className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />}
                      <span className="flex items-baseline gap-0.5">
                        <span className="text-white">{googlePlacesRating.toFixed(1)}</span>
                        <span className="text-[10px] text-[#A38A65] font-medium">/ 5</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 flex flex-col gap-4 shrink-0 mb-2">
          {(() => {
            const hasUrl = (liveItem as any).url || (liveItem as any).affiliateUrl;
            if (!hasUrl) return null;
            
            let finalUrl = (liveItem as any).affiliateUrl || (liveItem as any).url;
            
            const creatorProfile = (liveItem as any).creatorProfile;
            
            // Amazon Affiliate Logic (User > Platform)
            const userAmazonTag = creatorProfile?.affiliateTags?.amazon;
            const platformAmazonTag = (import.meta as any).env.VITE_DILECTI_AMAZON_TAG;
            const activeAmazonTag = userAmazonTag || platformAmazonTag;

            
            
            if (finalUrl && finalUrl.includes('amazon.com') && activeAmazonTag) {
               if (finalUrl.includes('tag=')) {
                  finalUrl = finalUrl.replace(/tag=[^&]+/, `tag=${activeAmazonTag}`);
               } else {
                  finalUrl = finalUrl.includes('?') ? `${finalUrl}&tag=${activeAmazonTag}` : `${finalUrl}?tag=${activeAmazonTag}`;
               }
            }

            return (
              <div className="flex flex-col gap-2 pt-2 pb-2">
                <a 
                  href={finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-center shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 tracking-wide"
                >
                  <ShoppingBag className="w-5 h-5" />
                  View Product ↗
                </a>
                <p className="text-[10px] text-black/40 font-medium text-center italic dark:text-white/40 leading-snug px-2">
                  Purchases may earn an affiliate commission. Dilecti recommendations are based purely on taste, never on affiliate partnerships.
                </p>
              </div>
            );
          })()}

          {liveItem.metadata?.address ? (
            <div>
              <h4 className="text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest mb-1.5">
                Location
              </h4>
              <div className="bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/50 flex flex-col gap-1 dark:bg-neutral-800/50">
                   <div className="flex items-start gap-2 justify-between">
                     <p className="text-neutral-700 font-medium leading-relaxed text-sm flex items-start gap-2 dark:text-neutral-300">
                       <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5 dark:text-neutral-500" />
                       <span>{String(liveItem.metadata.address)}</span>
                     </p>
                     <a 
                       href={liveItem.metadata.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(liveItem.metadata.address)}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-emerald-600 text-[10px] uppercase font-bold hover:underline shrink-0 mt-1 dark:text-emerald-400"
                     >
                       Directions ↗
                     </a>
                   </div>
              </div>
            </div>
          ) : null}

          {liveItem.review ? (
            <div>
              <h4 className="text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest mb-1.5">
                Review
              </h4>
              <p className="text-neutral-700 italic font-serif leading-relaxed text-sm bg-orange-50/50 p-3 rounded-xl border border-orange-100 dark:text-neutral-300">
                {String(liveItem.review)}
              </p>
            </div>
          ) : null}

          {(liveItem as any).bestFood ? (
            <div>
              <h4 className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">
                Best Things To Order
              </h4>
              <p className="text-orange-900 font-serif leading-relaxed text-sm bg-orange-50/50 p-4 rounded-2xl border border-orange-100 italic">
                {String((liveItem as any).bestFood)}
              </p>
            </div>
          ) : null}

          {liveItem.negativeFeedback ? (
            <div>
              <h4 className="text-xs font-semibold text-red-800/40 uppercase tracking-widest mb-2">
                Why this wasn't for you
              </h4>
              <p className="text-red-900 font-medium leading-relaxed text-sm bg-red-50 p-4 rounded-2xl border border-red-100 dark:bg-red-950 dark:text-red-100">
                {String(liveItem.negativeFeedback)}
              </p>
            </div>
          ) : null}

          {Array.isArray(liveItem.collections) &&
          liveItem.collections.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {liveItem.collections.map((c, idx) => (
                  <span
                    key={`${c}-${idx}`}
                    className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-medium dark:text-emerald-300 dark:bg-emerald-950 dark:border-emerald-900"
                  >
                    #{String(c)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <EnrichmentSection item={liveItem} />

          {/* Phase 3: Dish Bridge */}
          {liveItem.category === "food" && liveItem.subCategory === "Entrees" && (
             <div className="mt-4 border-t border-dashed border-emerald-200 pt-6 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex flex-col items-center justify-center dark:bg-emerald-900">
                    <span className="text-xl">🍽️</span>
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-neutral-900 leading-tight dark:text-white">Dish Connections</h4>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider dark:text-neutral-400">Restaurants & Recipes for {liveItem.title}</p>
                  </div>
                </div>

                {(() => {
                  const dishStr = String(liveItem.title || "").toLowerCase();
                  const relatedRestaurants = userItems.filter(i => i.category === "food" && i.subCategory === "Restaurants" && (String(i.title).toLowerCase().includes(dishStr) || String(i.bestFood || "").toLowerCase().includes(dishStr) || String(i.description || "").toLowerCase().includes(dishStr) || (i.collections || []).some(c => String(c).toLowerCase().includes(dishStr))));
                  
                  const relatedRecipes = userItems.filter(i => i.category === "food" && i.subCategory === "Recipes" && (String(i.title).toLowerCase().includes(dishStr) || String(i.description || "").toLowerCase().includes(dishStr) || (i.collections || []).some(c => String(c).toLowerCase().includes(dishStr))));

                  if (relatedRestaurants.length === 0 && relatedRecipes.length === 0) {
                     return (
                        <div className="bg-neutral-50 rounded-2xl p-4 text-center border border-neutral-100 dark:bg-neutral-800/50 dark:border-white/5">
                           <p className="text-sm text-neutral-500 dark:text-neutral-400">No restaurants or recipes saved for this dish yet. Add them to your library and they will appear here!</p>
                        </div>
                     );
                  }

                  return (
                     <div className="flex flex-col gap-4">
                        {relatedRestaurants.length > 0 && (
                           <div>
                              <h5 className="text-[10px] uppercase font-bold text-neutral-400 mb-2 dark:text-neutral-500">Restaurants</h5>
                              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                                 {relatedRestaurants.map((r, idx) => (
                                    <div key={`${r.id}-${idx}`} onClick={() => {
                                        window.dispatchEvent(new CustomEvent('open-item', { detail: r }));
                                    }} className="shrink-0 w-32 border border-black/5 bg-white rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all group dark:bg-[#1a1a1a] dark:border-white/5">
                                       <div className="h-20 bg-emerald-50 flex items-center justify-center relative dark:bg-emerald-950">
                                          {r.coverUrl ? <ImageWithFallback category={liveItem.category} src={r.coverUrl} className="w-full h-full object-cover" /> : <Utensils className="w-5 h-5 text-emerald-200" />}
                                       </div>
                                       <div className="p-2">
                                          <p className="font-bold text-[11px] leading-tight text-neutral-800 line-clamp-2 group-hover:text-emerald-700 dark:text-neutral-200">{r.title}</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {relatedRecipes.length > 0 && (
                           <div>
                              <h5 className="text-[10px] uppercase font-bold text-neutral-400 mb-2 dark:text-neutral-500">Recipes</h5>
                              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                                 {relatedRecipes.map((r, idx) => (
                                    <div key={`${r.id}-${idx}`} onClick={() => {
                                        window.dispatchEvent(new CustomEvent('open-item', { detail: r }));
                                    }} className="shrink-0 w-32 border border-black/5 bg-white rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all group dark:bg-[#1a1a1a] dark:border-white/5">
                                       <div className="h-20 bg-orange-50 flex items-center justify-center relative">
                                          {r.coverUrl ? <ImageWithFallback category={liveItem.category} src={r.coverUrl} className="w-full h-full object-cover" /> : <span className="text-xl">📜</span>}
                                       </div>
                                       <div className="p-2">
                                          <p className="font-bold text-[11px] leading-tight text-neutral-800 line-clamp-2 group-hover:text-orange-700 dark:text-neutral-200">{r.title}</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  );
                })()}
             </div>
          )}

          <div className="mt-2 text-[10px] text-neutral-400 border-t border-neutral-100 pt-3 pb-2 flex items-center justify-between gap-4 dark:text-neutral-500 dark:border-white/5">
             <div><span className="font-semibold text-neutral-500 dark:text-neutral-400">Added:</span> {new Date(liveItem.dateAdded).toLocaleDateString()}</div>
             <div><span className="font-semibold text-neutral-500 dark:text-neutral-400">Source:</span> {liveItem.sourceAttribution || "User Provided"}</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
