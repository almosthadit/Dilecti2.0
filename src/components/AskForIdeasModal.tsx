import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Send, Loader2, Plus, Mic, Library, Users } from 'lucide-react';
import { useUserItems, useUserProfile } from '../hooks';
import { RecommendationModal } from './RecommendationModal';
import { cn, sanitizeReason } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from "./ImageWithFallback";
import Fuse from 'fuse.js';


interface AskForIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

const FUN_MESSAGES = [
  "Consulting your Taste Graph...",
  "Sifting through the cosmic shelves...",
  "Cross-referencing your media soulmate database...",
  "Summoning the recommendation spirits...",
  "Filtering out the things you told us you hate...",
  "Polishing up the perfect suggestions...",
  "Curating some exquisite vibes just for you...",
  "Making sure no boring items slip through...",
  "Analyzing the unique rhythm of your tastebuds...",
  "Calibrating the ultimate personal recommendation engine..."
];

export default function AskForIdeasModal({ isOpen, onClose, initialPrompt }: AskForIdeasModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [selectedRec, setSelectedRec] = useState<any | null>(null);
  const [searchPreview, setSearchPreview] = useState<any[]>([]);
  const recognitionRef = useRef<any>(null);

  const { userItems, saveItem } = useUserItems();
  const { profile, updateProfile } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (prompt.trim().length > 0 && !isGenerating && results.length === 0) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch("/api/universal-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: prompt, category: null })
          });
          const data = await res.json();
          
          let previewMatches = data || [];
          
          setSearchPreview(previewMatches.slice(0, 5));
        } catch (e) {
          console.error(e);
        }
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setSearchPreview([]);
    }
  }, [prompt, isGenerating, results, userItems]);

  useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt || '');
      if (initialPrompt && initialPrompt.trim().length > 0) {
        // Auto-submit initial prompt after a short delay
        setTimeout(() => {
           const btn = document.getElementById('ask-ideas-submit-btn');
           if (btn) btn.click();
        }, 500);
      } else {
        setResults([]);
        setError("");
        setSelectedRec(null);
      }
    }
  }, [isOpen, initialPrompt]);

  const toggleSpeech = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setPrompt(transcript);
      }
    };
    
    recognition.start();
  };

  useEffect(() => {
    if (!isOpen && isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isOpen]);

  const handleSearchLibrary = () => {
    onClose();
    navigate('/library');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('set-library-search', { detail: { query: prompt } }));
    }, 100);
  };

  const handleSearchPeople = () => {
    onClose();
    navigate('/feed');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('set-feed-search', { detail: { query: prompt } }));
    }, 100);
  };

  const handleManualAdd = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { item: { title: prompt } } }));
  };

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingMessageIdx((prev) => (prev + 1) % FUN_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const getFallbackTags = (item: any) => {
      if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) return item.tags;
      const len = item.title.length;
      if (item.category === 'movie' || (item.category as any) === 'watch' || item.category === 'tv') {
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

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setLoadingMessageIdx(0);
    setError("");
    setResults([]);

    try {
      // Summarize context to avoid blowing up the token window
      let contextStr = "";
      if (profile?.preferences) {
         contextStr += `User Taste Profile:\n${profile.preferences}\n\n`;
      }
      if (profile?.interests && profile.interests.length > 0) {
         contextStr += `Specific Interests:\n${profile.interests.join(', ')}\n\n`;
      }

      // Background extract interests
      if (prompt.length > 5) {
          fetch("/api/extract-interests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt }),
          })
          .then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any))
          .then((data) => {
              if (data.interests && Array.isArray(data.interests) && data.interests.length > 0) {
                  const newHistory = {
                      query: prompt,
                      timestamp: Date.now(),
                      extractedInterests: data.interests
                  };
                  const currentHistory = profile?.searchHistory || [];
                  const updatedHistory = [newHistory, ...currentHistory].slice(0, 50);
                  
                  const currentInterests = profile?.interests || [];
                  const updatedInterests = Array.from(new Set([...currentInterests, ...data.interests]));
                  
                  if (updateProfile) {
                      updateProfile({ searchHistory: updatedHistory, interests: updatedInterests });
                  }
              }
          })
          .catch(console.error);
      }

      const lightweightItems = userItems.map(i => ({
        id: i.id,
        title: i.title,
        category: i.category,
        rating: i.rating,
        reaction: i.reaction,
        status: i.status,
        dateAdded: i.dateAdded
      }));

      const res = await fetch("/api/ask-for-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context: contextStr, items: lightweightItems }),
      });
      
      if (!res.ok) throw new Error("Failed to fetch ideas");
      
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      setResults(data);
    } catch (e) {
      setError("Our recommendation engine is taking a quick breather. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] dark:bg-[#1a1a1a]"
      >
        <div className="p-5 sm:p-6 border-b border-black/5 flex items-center justify-between bg-emerald-50/30 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:text-emerald-400 dark:bg-emerald-900">
               <Sparkles className="w-5 h-5" />
            </div>
            <div>
               <h2 className="font-bold text-lg leading-tight">Ask Dilecti for Ideas</h2>
               <p className="text-xs text-neutral-500 dark:text-neutral-400">Semantic AI Search across all categories</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col">
          <div className="mb-6 shrink-0">
             <label className="block text-sm font-bold text-neutral-800 mb-2 dark:text-neutral-200">What are you looking for?</label>
             <div className="relative">
                 <textarea 
                   placeholder="e.g. A cyberpunk video game with a great soundtrack, or a cozy fantasy novel..."
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                      }
                   }}
                   className="w-full bg-black/5 dark:bg-white/5 rounded-xl border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition-all p-4 pb-16 text-sm min-h-[140px] resize-none outline-none text-neutral-900 dark:text-white"
                 />
                 <div className="absolute bottom-3 right-3 flex items-center gap-2">
                   <button
                     type="button"
                     onClick={toggleSpeech}
                     className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"} dark:text-neutral-400`}
                     title={isListening ? "Stop listening" : "Speak to Ask"}
                   >
                     <Mic className="w-5 h-5" />
                   </button>
                   <button 
                     id="ask-ideas-submit-btn"
                     onClick={handleSend}
                     disabled={isGenerating || prompt.trim().length === 0}
                     className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                   >
                     {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                     <span>{isGenerating ? "Getting..." : "Get Recommendations"}</span>
                   </button>
                 </div>
             </div>
             
             {prompt.trim().length > 0 && !isGenerating && results.length === 0 && (
                <div className="mt-4 flex flex-col gap-2">
                   <button onClick={handleSearchLibrary} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left border border-black/5 dark:border-white/5">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                         <Library className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                         <div className="font-semibold text-neutral-900 dark:text-white truncate">Search library for "{prompt}"</div>
                         <div className="text-sm text-neutral-500 dark:text-neutral-400">Find in your saved items</div>
                      </div>
                   </button>
                   <button onClick={handleSearchPeople} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left border border-black/5 dark:border-white/5">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                         <Users className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                         <div className="font-semibold text-neutral-900 dark:text-white truncate">Search people for "{prompt}"</div>
                         <div className="text-sm text-neutral-500 dark:text-neutral-400">Find friends and creators</div>
                      </div>
                   </button>
                   <button onClick={handleManualAdd} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left border border-black/5 dark:border-white/5 group/add">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0 group-hover/add:bg-orange-100 transition-colors">
                         <Plus className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                         <div className="font-semibold text-orange-700 dark:text-orange-400 truncate">Add "{prompt}" manually</div>
                         <div className="text-sm text-orange-600/70 dark:text-orange-400/70">Create a new item with this title</div>
                      </div>
                   </button>
                   {searchPreview.length > 0 && (
                      <div className="mt-4 border-t border-black/5 dark:border-white/5 pt-4">
                        <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Top Matches</div>
                        {searchPreview.slice(0, 3).map((item, idx) => {
                           const itemCategoryMap = (item.category as any) === 'watch' ? ['movie', 'tv'] : [item.category];
                           const uCategoryMap = (cat: string) => cat === 'watch' ? ['movie', 'tv'] : [cat];
                           
                           const fuzzyItems = new Fuse(userItems, {
                              keys: ['title', 'subtitle'],
                              threshold: 0.2
                           });
                           
                           let existing = userItems.find(
                             (uItem) =>
                               uItem.title.toLowerCase() === item.title.toLowerCase() &&
                               (uItem.category === item.category || ((item.category as any) === 'watch' && (uItem.category === 'movie' || uItem.category === 'tv')) || (item.category === 'movie' && (uItem.category as any) === 'watch'))
                           );
                           
                           if (!existing) {
                             const searchMatches = fuzzyItems.search(item.title).map(res => res.item);
                             existing = searchMatches.find(uItem => {
                               const uCats = uCategoryMap(uItem.category);
                               const iCats = itemCategoryMap;
                               return uCats.some(c => iCats.includes(c));
                             });
                           }
                           return (
                             <button 
                               key={idx} 
                               onClick={() => {
                                 onClose();
                                 if (existing) {
                                   window.dispatchEvent(new CustomEvent('open-item', { detail: existing }));
                                 } else {
                                   window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { initialItem: item, initialCategory: null } }));
                                 }
                               }}
                               className="flex items-center gap-3 p-2 w-full hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
                             >
                               <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-100 dark:bg-white/5">
                                  <ImageWithFallback src={item.coverUrl} category={item.category} className="w-full h-full object-cover" />
                               </div>
                               <div className="flex-1 overflow-hidden">
                                  <div className="font-semibold text-neutral-900 dark:text-white truncate">{item.title}</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate capitalize">{item.category}</div>
                                    {existing && (
                                      <div className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                                        {existing.status === 'up-next' ? 'Want to Try' : 'In Library'}
                                      </div>
                                    )}
                                  </div>
                               </div>
                             </button>
                           );
                        })}
                      </div>
                   )}
                </div>
             )}
          </div>

          {error && (
             <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4 dark:bg-red-950 dark:text-red-400">
                {error}
             </div>
          )}

            <div className="flex-1">
             {results.length > 0 && (
                <div className="space-y-4 pb-4">
                   <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500 mb-4 dark:text-neutral-400">AI Recommendations</h3>
                   {results.map((rec, idx) => {
                      const existing = userItems.find(
                        (item) =>
                          item.title.toLowerCase() === rec.title.toLowerCase() &&
                          (item.category === rec.category || (rec.category === 'watch' && (item.category === 'movie' || item.category === 'tv')))
                      );
                      const isAdded = !!existing;
                      const isCompleted = existing?.status === 'completed' || existing?.status === 'read';

                      return (
                       <div 
                           key={idx} 
                           className={`bg-white border rounded-[1.5rem] p-4 sm:p-5 flex flex-col sm:flex-row gap-5 lg:gap-6 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${isAdded ? 'border-emerald-100 bg-emerald-50/10' : ''} dark:bg-[#1a1a1a]`}
                        >
                          <div className="relative shrink-0 w-24 h-36 sm:w-32 sm:h-48 md:w-36 md:h-56 mx-auto sm:mx-0 cursor-pointer" onClick={() => setSelectedRec({...rec, sourceAttribution: "Ask For Ideas"})}>
                            {rec.coverUrl ? (
                                <ImageWithFallback src={rec.coverUrl} className="w-full h-full object-cover rounded-xl shadow-md border" alt={rec.title} referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-full h-full bg-neutral-100 rounded-xl shadow-inner border flex items-center justify-center dark:bg-neutral-800">
                                   <Sparkles className="w-8 h-8 text-neutral-300" />
                                </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-0 flex flex-col py-1">
                             <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md dark:text-emerald-400 dark:bg-emerald-950">
                                  {rec.category || 'Idea'}
                                </span>
                                {isAdded && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm flex items-center gap-1 dark:text-emerald-200 dark:bg-emerald-900 dark:border-emerald-800">
                                     ✓ {isCompleted ? "Completed" : "In Queue"}
                                  </span>
                                )}
                             </div>
                             <h4 className="font-bold text-xl sm:text-2xl leading-tight text-neutral-900 mb-1.5 cursor-pointer hover:text-emerald-600 transition-colors dark:text-white" onClick={() => setSelectedRec({...rec, sourceAttribution: "Ask For Ideas"})}>{rec.title}</h4>
                             {rec.subtitle && <p className="text-sm font-medium text-neutral-500 mb-3 dark:text-neutral-400">{rec.subtitle}</p>}
                             
                             <div className="flex flex-wrap gap-1.5 mb-3">
                                {(rec.tags || getFallbackTags(rec)).map((tag: string, i: number) => {
                                   const colors = [
                                      "bg-green-50 text-green-700 border-green-100 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900/30",
                                      "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/30",
                                      "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30",
                                      "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30",
                                      "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30"
                                   ];
                                   const hash = tag.charCodeAt(tag.length - 1) % colors.length;
                                   return (
                                      <span key={i} className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border", colors[hash])}>
                                         {tag}
                                      </span>
                                   );
                                })}
                             </div>

                             <p className="text-sm sm:text-base text-neutral-700 leading-relaxed italic line-clamp-3 sm:line-clamp-none mb-auto dark:text-neutral-300">"{sanitizeReason(rec.reason, rec.category)}"</p>

                             <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                               {/* Quick Add To Queue Button */}
                               <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 if (isAdded) return;
                                 
                                 const targetCategory = rec.category === 'watch' ? 'movie' : rec.category;
                                 saveItem({
                                    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                                    title: rec.title,
                                    subtitle: rec.subtitle || "",
                                    category: targetCategory as any,
                                    coverUrl: rec.coverUrl || "",
                                    status: "up-next",
                                    sourceAttribution: "Ask For Ideas",
                                    review: sanitizeReason(rec.reason, rec.category) || "",
                                    dateAdded: Date.now(),
                                    rating: 0
                                 });
                              }}
                              disabled={isAdded}
                              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${ isAdded ? "bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95" } dark:text-neutral-500 dark:border-white/10`}
                              title={isAdded ? "Already in your library" : "Quick Add to Queue (Want to Watch/Read/Try)"}
                            >
                              {isAdded ? (
                                <>✓ Added</>
                              ) : (
                                <>
                                   <Plus className="w-4 h-4" /> Queue
                                </>
                              )}
                            </button>

                            {/* Rate It Button */}
                            {!isAdded && (
                              <button 
                                onClick={(e) => {
                                   e.stopPropagation();
                                   window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { item: { title: rec.title, category: rec.category, coverUrl: rec.coverUrl, subtitle: rec.subtitle, recommendationReason: sanitizeReason(rec.reason, rec.category), sourceAttribution: "Ask For Ideas" } } }));
                                }}
                                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 shadow-sm transition-all hover:scale-105 active:scale-95 dark:bg-[#1a1a1a] dark:text-neutral-300 dark:border-white/10"
                              >
                                Rate It
                              </button>
                            )}

                            {/* Not Interested Button */}
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setResults(results.filter((_, i) => i !== idx));
                              }}
                              className="flex items-center justify-center gap-1.5 p-2 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all ml-auto dark:text-neutral-500"
                              title="Not Interested"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          </div>
                        </div>
                      );
                   })}
                </div>
             )}
             
             {isGenerating && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-400 dark:text-neutral-500">
                   <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                   <p className="animate-pulse text-sm font-medium text-neutral-600 max-w-xs dark:text-neutral-400">{FUN_MESSAGES[loadingMessageIdx]}</p>
                </div>
             )}
             
             {!isGenerating && results.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-400 h-full dark:text-neutral-500">
                   <Sparkles className="w-12 h-12 mb-4 text-emerald-100" />
                   <p className="max-w-xs text-sm">Tell Dilecti what you're craving. The AI will cross-reference your specific Taste Profile to find the best fit.</p>
                </div>
             )}
          </div>
        </div>
      </motion.div>
      <RecommendationModal 
         selectedRec={selectedRec} 
         setSelectedRec={setSelectedRec}
         onReject={(rec, reason) => {
             setResults(results.filter((r) => r.title !== rec.title));
             setSelectedRec(null);
         }}
         saveItem={saveItem}
      />
    </div>
  );
}
