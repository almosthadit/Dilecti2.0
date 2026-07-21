import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X, Sparkles, Compass, CheckCircle2, ThumbsDown, BookmarkPlus } from "lucide-react";
import { useUserProfile } from "../hooks";
import { getMockFriendsForTitle } from "../lib/utils";
import { ImageWithFallback } from "./ImageWithFallback";


export function RecommendationModal({ 
   selectedRec, 
   setSelectedRec, 
   onReject,
   saveItem 
}: { 
   selectedRec: any; 
   setSelectedRec: (v: any) => void;
   onReject: (rec: any, reason: string) => void;
   saveItem: (item: any) => void;
}) {
   const { profile } = useUserProfile();
   const [rejectingRec, setRejectingRec] = useState<any | null>(null);
   const [tryingRec, setTryingRec] = useState<any | null>(null);
   const [rejectReason, setRejectReason] = useState("");

   // Reset rejecting state if modal closes or rec changes
   React.useEffect(() => {
      setRejectingRec(null);
      setTryingRec(null);
      setRejectReason("");
   }, [selectedRec]);

   return (
      <AnimatePresence>
         {selectedRec && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
               onClick={() => setSelectedRec(null)}
            >
               <motion.div 
                  initial={{ y: 20, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 20, scale: 0.95 }}
                  onClick={e => e.stopPropagation()}
                  className="bg-white rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl flex flex-col dark:bg-[#1a1a1a]"
               >
                  <div className="relative h-48 md:h-64 shrink-0 bg-neutral-100 flex items-center justify-center overflow-hidden dark:bg-neutral-800">
                     {selectedRec.coverUrl ? (
                        <>
                           <ImageWithFallback 
                               category={selectedRec.category} src={selectedRec.coverUrl} 
                              alt={selectedRec.title} 
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
                              <Star className="w-16 h-16 opacity-50 text-neutral-400" />
                           </div>
                        </>
                     ) : (
                        <Star className="w-16 h-16 text-neutral-300" />
                     )}
                     <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-full p-2 cursor-pointer hover:bg-black/80 transition-colors" onClick={() => setSelectedRec(null)}>
                        <X className="w-5 h-5 text-white" />
                     </div>
                  </div>
                  <div className="p-6 md:p-8">
                     <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                           <h3 className="font-serif text-2xl font-bold text-neutral-900 leading-tight mb-1 dark:text-white">{selectedRec.title}</h3>
                           <div className="flex flex-wrap items-center gap-2 mb-2">
                              <p className="text-neutral-500 font-medium dark:text-neutral-400">{selectedRec.subtitle || selectedRec.category}</p>
                              
                              {selectedRec.imdbScore && (selectedRec.category === 'movie' || selectedRec.category === 'tv' || selectedRec.category === 'TV & Movies') && (
                                <button onClick={() => window.open(`https://www.imdb.com/find/?q=${encodeURIComponent(selectedRec.title)}`, '_blank')} className="bg-[#f5c518] hover:bg-[#E2B616] text-black text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1 dark:text-white transition-colors cursor-pointer" title="View on IMDb">
                                  IMDb {selectedRec.imdbScore}
                                </button>
                              )}

                              {selectedRec.rating && (selectedRec.category === 'book') && (
                                <button onClick={() => window.open(`https://www.goodreads.com/search?q=${encodeURIComponent(selectedRec.title)}`, '_blank')} className="bg-[#EBE8D5] hover:bg-[#DEDAC4] text-[#333] text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer" title="View on Goodreads">
                                  Goodreads {selectedRec.rating}
                                </button>
                              )}

                              {selectedRec.rating && (selectedRec.category === 'place' || selectedRec.category === 'food' || String(selectedRec.category).toLowerCase().includes('restaurant')) && (
                                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRec.title + " " + (selectedRec.subtitle || ""))}`, '_blank')} className="bg-[#4285F4] hover:bg-[#3367D6] text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer" title="View on Google Maps">
                                  Google Maps {selectedRec.rating}
                                </button>
                              )}

                              {(selectedRec.category === 'music' || selectedRec.category === 'podcast') && (
                                 <button onClick={() => window.open(`https://open.spotify.com/search/${encodeURIComponent(selectedRec.title)}`, '_blank')} className="bg-[#1DB954] hover:bg-[#1ed760] text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer" title="View on Spotify">
                                   Open in Spotify
                                 </button>
                              )}
                           </div>
                           
                           {profile?.showSocialIndicators !== false && getMockFriendsForTitle(selectedRec.title) && (
                              <div 
                                 onClick={() => window.dispatchEvent(new CustomEvent('open-social-modal', { detail: { itemId: selectedRec.id || selectedRec.title, title: selectedRec.title } }))}
                                 className="flex items-center gap-2 mb-3 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl border border-neutral-100 dark:border-white/5 w-fit cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                              >
                                  <div className="flex -space-x-2">
                                     {getMockFriendsForTitle(selectedRec.title)!.map((friendName, idx) => (
                                       <div key={idx} className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title={friendName}>
                                         {friendName.charAt(0)}
                                       </div>
                                     ))}
                                  </div>
                                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                                     Liked by {getMockFriendsForTitle(selectedRec.title)!.join(" and ")}
                                  </span>
                              </div>
                           )}
                           {selectedRec.description && (
                              <p className="text-sm text-neutral-600 leading-relaxed dark:text-neutral-400">{selectedRec.description}</p>
                           )}
                        </div>
                     </div>
                     
                     <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 mb-6 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                        <div className="flex items-center gap-2 mb-2">
                           <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                           <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">Why you'll love this</span>
                        </div>
                        <div className="text-sm font-medium text-emerald-900 leading-relaxed dark:text-emerald-100">
                           {(() => {
                              const topReasons = selectedRec.context?.topReasons || [];
                              const noveltyExplanation = selectedRec.context?.noveltyExplanation;
                              const bullets = [...topReasons];
                              if (bullets.length < 3 && noveltyExplanation && !bullets.includes(noveltyExplanation)) {
                                 bullets.push(noveltyExplanation);
                              }
                              
                              if (bullets.length > 0) {
                                 return (
                                    <ul className="list-disc pl-4 space-y-1.5 marker:text-emerald-500">
                                       {bullets.map((bullet: string, i: number) => (
                                          <li key={i}>{bullet}</li>
                                       ))}
                                    </ul>
                                 );
                              }
                              return <p>{selectedRec.reason}</p>;
                           })()}
                        </div>
                     </div>

                     
                     
                     {/* Why Dilecti thinks this (Expandable) */}
                     {selectedRec.context && selectedRec.context.usedSignals && (
                        <details className="group mb-6 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-white/5 rounded-2xl overflow-hidden cursor-pointer transition-all">
                           <summary className="flex items-center justify-between p-4 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 select-none outline-none">
                              <div className="flex items-center gap-2">
                                 <Compass className="w-4 h-4" />
                                 <span>Why Dilecti thinks this</span>
                              </div>
                              <div className="transition-transform duration-200 group-open:rotate-180">
                                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                              </div>
                           </summary>
                           <div className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-white/5">
                              <ul className="space-y-2 text-[13px] font-medium text-neutral-600 dark:text-neutral-300">
                                 {(selectedRec.context.usedSignals.includes('themeOverlap') || selectedRec.context.usedSignals.includes('creatorOverlap') || selectedRec.context.usedSignals.includes('locationRelevance') || selectedRec.context.usedSignals.includes('pricePreference')) && (
                                    <li className="flex items-start gap-2">
                                       <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                       <span>matched saved items</span>
                                    </li>
                                 )}
                                 {selectedRec.context.usedSignals.includes('themeOverlap') && (
                                    <li className="flex items-start gap-2">
                                       <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                       <span>matched themes/genres</span>
                                    </li>
                                 )}
                                 {selectedRec.context.usedSignals.includes('creatorOverlap') && (
                                    <li className="flex items-start gap-2">
                                       <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                       <span>matched creators/authors</span>
                                    </li>
                                 )}
                                 {(selectedRec.context.usedSignals.includes('categorySignatures') || selectedRec.context.usedSignals.includes('topCategories')) && (
                                    <li className="flex items-start gap-2">
                                       <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                       <span>category match</span>
                                    </li>
                                 )}
                                 {(selectedRec.context.usedSignals.includes('criticScore') || selectedRec.context.usedSignals.includes('voteAverage') || selectedRec.context.usedSignals.includes('averageRating') || selectedRec.context.usedSignals.includes('rating')) && (
                                    <li className="flex items-start gap-2">
                                       <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                       <span>quality signal</span>
                                    </li>
                                 )}
                                 {selectedRec.context.usedSignals.includes('locationRelevance') && (
                                    <li className="flex items-start gap-2">
                                       <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                       <span>location signal for Food/Places</span>
                                    </li>
                                 )}
                                 
                                 {/* Caveats */}
                                 {selectedRec.context.negativePreferenceChecks && selectedRec.context.negativePreferenceChecks.length > 0 && (
                                    <li className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5">
                                       <div className="flex items-center gap-2 mb-2">
                                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">caveats if any</span>
                                       </div>
                                       <ul className="list-disc pl-4 space-y-1 text-amber-700 dark:text-amber-300 marker:text-amber-400">
                                          {selectedRec.context.negativePreferenceChecks.map((cav, i) => (
                                             <li key={i}>{typeof cav === 'string' ? cav : cav.reason || JSON.stringify(cav)}</li>
                                          ))}
                                       </ul>
                                    </li>
                                 )}
                              </ul>
                           </div>
                        </details>
                     )}

                     {rejectingRec ? (
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 mb-6 relative">
                           <div className="absolute top-2 right-2 cursor-pointer p-1" onClick={() => setRejectingRec(null)}>
                              <X className="w-4 h-4 text-red-400 hover:text-red-600" />
                           </div>
                           <h4 className="text-red-800 font-bold text-sm mb-2">Why isn't this for you?</h4>
                           <p className="text-xs text-red-600 mb-3 hover:text-red-700 dark:text-red-400">Help Dilecti understand your taste better.</p>
                           <textarea
                              className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-400 min-h-[80px] mb-3 resize-none dark:bg-[#1a1a1a]"
                              placeholder="E.g. I don't really like horror movies because..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                           />
                           <button 
                              onClick={() => {
                                 onReject(selectedRec, rejectReason);
                                 setSelectedRec(null);
                              }}
                              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-sm"
                           >
                              Confirm
                           </button>
                        </div>
                     ) : (
                     <div className="flex flex-col gap-3 mt-4">
                        <button 
                           disabled={tryingRec === 'saved'}
                           onClick={() => {
                              saveItem({
                                 id: `item-${Date.now()}`,
                                 title: selectedRec.title,
                                 subtitle: selectedRec.subtitle,
                                 category: selectedRec.category,
                                 coverUrl: selectedRec.coverUrl,
                                 status: 'up-next',
                                 inLibrary: true,
                                 criticScore: 0,
                                 review: "",
                                 dateAdded: Date.now(),
                                 collections: [],
                              } as any);
                              setTryingRec('saved');
                              setTimeout(() => setSelectedRec(null), 1500);
                           }}
                           className={`w-full text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2.5 shadow-md ${tryingRec === 'saved' ? 'bg-emerald-600 cursor-default' : 'bg-neutral-900 hover:bg-black active:scale-95'}`}
                        >
                           {tryingRec === 'saved' ? <CheckCircle2 className="w-5 h-5" /> : <BookmarkPlus className="w-5 h-5" />}
                           <span className="text-sm font-bold tracking-wide">
                              {tryingRec === 'saved' ? 'Added to your "want to try" list' : 'I want to try this'}
                           </span>
                        </button>
                        
                        <div className="flex gap-3 w-full">
                           <button 
                               onClick={() => {
                                 setSelectedRec(null);
                                 window.dispatchEvent(new CustomEvent('open-universal-add-item', {
                                    detail: {
                                       item: {
                                          title: selectedRec.title,
                                          subtitle: selectedRec.subtitle,
                                          category: selectedRec.category,
                                          coverUrl: selectedRec.coverUrl,
                                          recommendationReason: selectedRec.reason,
                                          inLibrary: true,
                                          status: 'completed',
                                          sourceAttribution: "Recommendations"
                                       }
                                    }
                                 }));
                               }}
                              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-3 px-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-emerald-100/50 dark:text-emerald-300 dark:bg-emerald-950"
                           >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[11px] font-bold uppercase tracking-wide text-center leading-tight">I've Tried This</span>
                           </button>
                           <button 
                              onClick={() => setRejectingRec(selectedRec)}
                              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-3 px-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-rose-100/50"
                              title="Not interested"
                           >
                              <ThumbsDown className="w-4 h-4 text-rose-500" />
                              <span className="text-[11px] font-bold uppercase tracking-wide text-center leading-tight">Not For Me</span>
                           </button>
                        </div>
                     </div>
                     )}
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
   );
}
