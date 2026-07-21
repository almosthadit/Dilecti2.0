import React, { useState, useEffect, useRef } from "react";
import { useUserItems } from "../hooks";
import { useUser } from "../context/UserContext";
import { db } from "../lib/firebase";
import { doc, setDoc, writeBatch } from "firebase/firestore";
import { Loader2, Sparkles, X, Undo2 } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";



export const isJunk = (desc: string) => {
  const descLower = (desc || "").trim().toLowerCase();
  return !descLower ||
         descLower === "book" ||
         descLower === "movie" ||
         descLower === "tv show" ||
         descLower === "podcast" ||
         descLower === "album" ||
         descLower === "general preference" ||
         descLower.startsWith("an item in the") ||
         descLower.includes("dilecti user") ||
         descLower.includes("you might like") ||
         descLower.includes("you will love this") ||
         descLower.includes("you'll love this") ||
         descLower.includes("you might like this") ||
         descLower.includes("you might love this");
};

export default function EnrichmentBanner() {
  const { userItems } = useUserItems();
  const { user } = useUser();
  const [isEnriching, setIsEnriching] = useState(false);
  const [autoFixedItems, setAutoFixedItems] = useState<any[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const processingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userItems || !user || isEnriching) return;
    
    let cachedAttempted: Record<string, boolean> = {};
    try { cachedAttempted = JSON.parse(localStorage.getItem('dilecti_enriched_items') || '{}'); } catch {}

    const itemsToFix = userItems.filter((b: any) => {

       const isMissingCrucialData = isJunk(b.description || "") || !b.subtitle || !b.coverUrl;
       const needsForceFix = (b.enrichmentVersion !== 3) && isMissingCrucialData;
       return (!b.enrichmentAttempted && !cachedAttempted[b.id] && (!b.coverUrl || !b.subCategory || b.subCategory === "")) || needsForceFix;
    });
    
    const newToProcess = itemsToFix.filter((i: any) => !processingIds.current.has(i.id));
    
    if (newToProcess.length > 0) {
      
      executeAutoFix(newToProcess);
    }
  }, [userItems, user, isEnriching]);

  const executeAutoFix = async (needsFixingAll: any[]) => {
      if (!user) return;
      
      const needsFixing = needsFixingAll.slice(0, 25);
      setIsEnriching(true);
      needsFixing.forEach(i => processingIds.current.add(i.id));
      
      const newProposed: any[] = [];
      
      try {
        // Categorize
        const categoryNeedsFixing = needsFixing.filter(b => !b.subCategory || b.subCategory === "");
        let catData: any[] = [];
        if (categoryNeedsFixing.length > 0) {
            const res = await fetch("/api/bulk-categorize", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ items: categoryNeedsFixing.map(b => ({ id: b.id, title: b.title, category: b.category })) })
            });
            catData = await res.json().catch(()=>([]));
        }
        
        // Prepare working set
        for (const b of needsFixing) {
          let itemUpdates: any = { id: b.id, original: b, updates: {} };
          
          const catUpdate = catData.find((c: any) => c.id === b.id);
          if (catUpdate) {
             itemUpdates.updates.subCategory = catUpdate.subCategory;
             if (catUpdate.category) itemUpdates.updates.category = catUpdate.category;
          }

          if (!b.coverUrl || isJunk(b.description || "") || !b.subtitle) {
             itemUpdates.needsFetch = true;
          }
          newProposed.push(itemUpdates);
        }
        
        // Fetch specifics
        const toFetch = newProposed.filter(p => p.needsFetch);
        for (const p of toFetch) {
           const res = await fetch("/api/universal-search", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ query: p.original.title, category: p.updates.category || p.original.category || '' }),
           });
           if (res.ok) {
              const matches = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
              if (matches && matches.length > 0) {
                 const match = matches[0];
                 if (!p.original.coverUrl && match.coverUrl) p.updates.coverUrl = match.coverUrl;
                    
                 if (isJunk(p.original.description || "") && match.description && match.description !== "Location" && match.description !== "General preference" && match.description !== "Restaurant") {
                     p.updates.description = match.description;
                 }
                 if (!p.original.subtitle && (match.subtitle || match.author)) p.updates.subtitle = match.subtitle || match.author;
              }
           }
           
              const stillJunk = p.updates.description ? isJunk(p.updates.description) : isJunk(p.original.description || "");
                 
           if (stillJunk) {
              const descData = await fetch("/api/wikipedia-summary", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ title: p.original.title, category: p.updates.category || p.original.category })
              }).then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any));
              
              if (descData && descData.description) {
                 p.updates.description = descData.description;
              }
           }
           await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        let batchRef = writeBatch(db);
        let writeCount = 0;
        let cachedAttempted: Record<string, boolean> = {};
        try { cachedAttempted = JSON.parse(localStorage.getItem('dilecti_enriched_items') || '{}'); } catch {}

        for (const p of newProposed) {
           cachedAttempted[p.id] = true;
           
           if (true) {
             const finalUpdates = { ...p.updates, enrichmentAttempted: true, enrichmentVersion: 3 };
             const docRef = doc(db, "users", user.uid, "items", p.id);
             batchRef.set(docRef, finalUpdates, { merge: true });
             writeCount++;
             
             if (writeCount >= 490) {
                await batchRef.commit();
                batchRef = writeBatch(db);
                writeCount = 0;
             }
           }
        }
        
        try { localStorage.setItem('dilecti_enriched_items', JSON.stringify(cachedAttempted)); } catch {}

        if (writeCount > 0) {
           await batchRef.commit();
        }
        
        const validUpdates = newProposed.filter(p => Object.keys(p.updates).length > 0);
        if (validUpdates.length > 0) {
           setAutoFixedItems(prev => [...prev, ...validUpdates]);
        }
        
      } catch (e: any) {
        console.error("Auto fix failed:", e);
      } finally {
        setIsEnriching(false);
      }
  };

  const handleUndo = async (item: any) => {
    if (!user) return;
    setIsReverting(true);
    const revertData: any = {};
    for (const key of Object.keys(item.updates)) {
       // if the original field didn't exist or was empty, revert it back to empty.
       // we avoid overwriting with undefined; firestore prefers empty string or field deletion, 
       // but empty string is fine.
       revertData[key] = item.original[key] || "";
    }
    revertData.enrichmentAttempted = true; // mark attempted so it isn't automatically fixed again
    
    await setDoc(doc(db, "users", user.uid, "items", item.id), revertData, { merge: true });
    
    setAutoFixedItems(prev => prev.filter(i => i.id !== item.id));
    setIsReverting(false);
  };

  if (autoFixedItems.length === 0) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm relative z-40 animate-in slide-in-from-top-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 opacity-90" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Library Enhanced</span>
            <span className="text-xs text-indigo-100 hidden sm:block">
              Automatically fixed metadata and images for {autoFixedItems.length} {autoFixedItems.length === 1 ? 'item' : 'items'}.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={() => setShowReview(true)} 
            className="bg-white text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 dark:bg-[#1a1a1a]"
          >
            Review Changes
          </button>
          
          <button onClick={() => setAutoFixedItems([])} className="text-indigo-200 hover:text-white transition-colors" title="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showReview && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 dark:bg-[#1a1a1a]">
              <div className="p-6 border-b border-neutral-100 flex flex-col gap-1 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold font-serif text-neutral-900 dark:text-white">Enrichment Log</h2>
                    <button onClick={() => setShowReview(false)} disabled={isReverting} className="text-neutral-400 hover:text-black transition-colors bg-neutral-100 hover:bg-neutral-200 p-1.5 rounded-full dark:text-neutral-500 dark:bg-neutral-800">
                      <X className="w-4 h-4" />
                    </button>
                 </div>
                 <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    The system automatically applied these improvements. You can undo any individual change.
                 </p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/50">
                 {autoFixedItems.length === 0 ? (
                   <div className="text-center text-neutral-500 py-8 font-medium dark:text-neutral-400">No recent automated fixes.</div>
                 ) : autoFixedItems.map(p => (
                   <div key={p.id} className="flex gap-4 p-4 border border-indigo-100 bg-white rounded-xl shadow-sm relative group transition-all hover:border-indigo-200 dark:bg-[#1a1a1a] dark:border-indigo-800">
                     <button 
                       onClick={() => handleUndo(p)} 
                       disabled={isReverting}
                       className="absolute top-3 right-3 text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs font-semibold bg-neutral-100 hover:bg-red-50 px-2 py-1 rounded-full disabled:opacity-50 dark:text-neutral-500 dark:bg-neutral-800"
                       title="Undo these changes"
                     >
                       <Undo2 className="w-3 h-3" /> Undo
                     </button>
                     <div className="w-12 h-16 bg-neutral-100 rounded flex-shrink-0 overflow-hidden text-[10px] text-center flex items-center justify-center border border-neutral-200 dark:bg-neutral-800 dark:border-white/10">
                        {p.updates.coverUrl || p.original.coverUrl ? (
                          <ImageWithFallback src={p.updates.coverUrl || p.original.coverUrl} className="w-full h-full object-cover" />
                        ) : <span className="text-neutral-400 italic dark:text-neutral-500">N/A</span>}
                     </div>
                     <div className="flex-1 min-w-0 pr-16 bg-white dark:bg-[#1a1a1a]">
                        <div className="font-bold text-sm text-neutral-900 truncate flex items-center gap-2 dark:text-white">
                           {p.original.title} 
                           {p.updates.category && <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider dark:bg-indigo-950">{p.updates.category}</span>}
                           {p.updates.subCategory && <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider dark:bg-indigo-950">{p.updates.subCategory}</span>}
                        </div>
                        <div className="text-xs text-neutral-500 truncate italic mt-0.5 dark:text-neutral-400">{p.updates.subtitle || p.original.subtitle}</div>
                        {p.updates.description && <div className="text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed bg-neutral-50 p-2 rounded-lg border border-neutral-100 dark:text-neutral-400 dark:bg-neutral-800/50 dark:border-white/5">{p.updates.description}</div>}
                        {!p.updates.description && Object.keys(p.updates).length === 0 && (
                           <div className="text-[10px] text-neutral-400 mt-2 flex gap-2 dark:text-neutral-500">
                             No visible changes
                           </div>
                        )}
                        <div className="text-[10px] text-emerald-600 mt-2 font-medium flex gap-2 dark:text-emerald-400">
                           {p.updates.coverUrl && <span>+ Cover Image</span>}
                           {p.updates.description && <span>+ Description</span>}
                           {p.updates.subCategory && <span>+ Category</span>}
                        </div>
                     </div>
                   </div>
                 ))}
              </div>
               <div className="p-4 sm:p-6 border-t border-neutral-100 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0 dark:bg-[#1a1a1a] dark:border-white/5">
                 <button onClick={() => setShowReview(false)} disabled={isReverting} className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm">
                   Done
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
