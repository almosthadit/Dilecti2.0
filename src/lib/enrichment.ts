import { doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { UserItem } from "../types";

export const enrichItemsInBackground = async (uid: string, items: UserItem[]) => {
  if (!items || items.length === 0) return;
  
  let batch = writeBatch(db);
  let batchCount = 0;

  // 1. Bulk Categorize first to save Gemini rate limits
  const itemsToCategorize = items.filter(item => item.id && !item.subCategory);
  let catData: any[] = [];
  
  if (itemsToCategorize.length > 0) {
    try {
      const res = await fetch("/api/bulk-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items: itemsToCategorize.map(i => ({ id: i.id, title: i.title, category: i.category })) 
        })
      });
      if (res.ok) {
        catData = await res.json().catch(() => ({}));
      }
    } catch (e) {
      console.warn("Background bulk-categorize failed:", e);
    }
  }

  for (const item of items) {
    if (!item.id) continue;
    
    const needsFetch = !item.coverUrl || !item.description || !item.subCategory;
    if (!needsFetch) continue;

    try {
      let updates: any = {};
      
      const catUpdate = catData.find((c: any) => c.id === item.id);
      if (catUpdate) {
        if (catUpdate.subCategory) updates.subCategory = catUpdate.subCategory;
        if (catUpdate.category) updates.category = catUpdate.category;
      }
      
      // 2. Search for Cover & Description
      if (!item.coverUrl || !item.description || !item.metadata?.address) {
        const res = await fetch("/api/universal-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: item.title, category: updates.category || item.category || '' })
        });
        if (res.ok) {
          const matches = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
          if (matches && matches.length > 0) {
            const match = matches[0];
            if (!item.coverUrl && match.coverUrl) updates.coverUrl = match.coverUrl;
            if ((!item.description || item.description === "General preference") && match.description) updates.description = match.description;
            if (!item.subtitle && (match.subtitle || match.author)) updates.subtitle = match.subtitle || match.author;
            // Merge metadata if present
            if (!item.metadata?.address && match.metadata) {
               updates.metadata = {
                  ...(item.metadata || {}),
                  ...match.metadata
               };
            }
          }
        }
      }
      
      // Apply updates to firestore batch
      let cachedAttempted: Record<string, boolean> = {};
      try { cachedAttempted = JSON.parse(localStorage.getItem('dilecti_enriched_items') || '{}'); } catch {}
      cachedAttempted[item.id] = true;
      try { localStorage.setItem('dilecti_enriched_items', JSON.stringify(cachedAttempted)); } catch {}

      updates.enrichmentAttempted = true;
      const ref = doc(db, `users/${uid}/items/${item.id}`);
      batch.set(ref, updates, { merge: true });
      batchCount++;
      
      if (batchCount >= 50) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    } catch (e: any) {
      console.warn(`Background enrichment paused for item ${item.title} due to network interruption.`);
    }
    
    // Add a larger delay to avoid third-party rate limits (TMDB, Books, etc)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
};
