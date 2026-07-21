import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {  collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, writeBatch , updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserItem, UserProfile } from './types';

let globalProfileUpdateQueue: Partial<UserProfile> = {};
let globalProfileUpdateTimer: NodeJS.Timeout | null = null;

export function useUserProfile() {
  const [user, loading] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    const stored = localStorage.getItem(`dilecti_profile_${user.uid}`);
    if(stored){
      try{
        setProfile(JSON.parse(stored));
      } catch(e){
      }
    }

    const path = `users/${user.uid}`;
    const ref = doc(db, path);
    const unsubscribe = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data() as UserProfile;
        setProfile(d);
        try { localStorage.setItem(`dilecti_profile_${user.uid}`, JSON.stringify(d)); } catch(e){}
      } else {
        setProfile(null);
      }
      setLoadingProfile(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoadingProfile(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    // Optimistic local update
    setProfile(prev => prev ? { ...prev, ...data } : data as UserProfile);
    
    globalProfileUpdateQueue = { ...globalProfileUpdateQueue, ...data };
    
    if (globalProfileUpdateTimer) {
      clearTimeout(globalProfileUpdateTimer);
    }
    
    globalProfileUpdateTimer = setTimeout(async () => {
      const payload = { ...globalProfileUpdateQueue };
      globalProfileUpdateQueue = {};
      
      const path = `users/${user.uid}`;
      const ref = doc(db, path);
      try {
        if (payload.displayName !== undefined) {
          payload.displayNameLower = payload.displayName ? payload.displayName.toLowerCase() : '';
        }
        if (payload.handle !== undefined) {
          payload.handleLower = payload.handle ? payload.handle.toLowerCase() : '';
        }
        
        const cleanUndefined = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          Object.keys(obj).forEach(key => {
            if (obj[key] === undefined) {
              delete obj[key];
            } else if (typeof obj[key] === 'object') {
              cleanUndefined(obj[key]);
            }
          });
        };
        cleanUndefined(payload);

        await setDoc(ref, payload, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }, 2500);
  };

  return { profile, loadingProfile, updateProfile };
}

export function useUserItems() {
  const [user, loading] = useAuthState(auth);
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setUserItems([]);
      setLoadingItems(false);
      return;
    }

    const stored=localStorage.getItem(`dilecti_items_${user.uid}`);
    if(stored){
      try{
        const p=JSON.parse(stored);
        if(p?.length>0)setUserItems(p);
      } catch(e){
      }
    }

    let legacyItems: UserItem[] = [];
    let chunkItems: UserItem[] = [];

    const pathLegacy = `users/${user.uid}/items`;
    const qLegacy = collection(db, pathLegacy);

    const pathChunks = `users/${user.uid}/item_lists`;
    const qChunks = collection(db, pathChunks);

    const updateCombined = () => {
       const map = new Map<string, UserItem>();
       // Add chunk items first
       chunkItems.forEach(item => {
           if (item.id) map.set(item.id, item);
       });
       // Legacy items override or merge
       legacyItems.forEach(item => {
           if (item.id) {
               if (map.has(item.id)) {
                   map.set(item.id, { ...map.get(item.id), ...item });
                } else {
                   map.set(item.id, item);
               }
           }
       });
       const combined = Array.from(map.values());
       combined.sort((a,b) => (b.dateAdded || 0) - (a.dateAdded || 0));
       
       setUserItems(combined);
       try { localStorage.setItem(`dilecti_items_${user.uid}`, JSON.stringify(combined)); } catch(e){}

       // Silent repair of Unsplash images
       if (combined && combined.length > 0) {
           combined.forEach(async (item) => {
               if (item.coverUrl && (item.coverUrl.includes("source.unsplash.com") || item.coverUrl.includes("images.unsplash.com"))) {
                   if (item.category === "food" || item.category === "place") {
                       try {
                           const r = await fetch("/api/repair-image", {
                               method: "POST",
                               headers: { "Content-Type": "application/json" },
                               body: JSON.stringify({ title: item.title, subtitle: item.subtitle, category: item.category })
                           });
                           if (r.ok) {
                               const data = await r.json();
                               if (data && data.coverUrl && data.coverUrl !== item.coverUrl && !data.coverUrl.includes("unsplash.com")) {
                                   const { updateDoc, doc } = await import("firebase/firestore");
                                   const ref = doc(db, `users/${user.uid}/items`, item.id);
                                   await updateDoc(ref, { coverUrl: data.coverUrl }).catch(() => {});
                               }
                           }
                       } catch (e) {
                           console.error("Repair failed", e);
                       }
                   }
               }
           });
       }


       setLoadingItems(false);
    };

            const applyTranslationLayer = (data: any) => {
       return {
          ...data,
          title: data.title || 'Untitled',
          category: data.category || 'other',
          dateAdded: data.dateAdded || Date.now(),
          status: data.status || 'completed'
       };
    };

    const unsubLegacy = onSnapshot(qLegacy, (snapshot) => {
      legacyItems = snapshot.docs.map(d => {
        return {
          id: d.id,
          ...applyTranslationLayer(d.data()),
         } as UserItem;
      });
      updateCombined();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, pathLegacy);
      setLoadingItems(false);
    });

    const unsubChunks = onSnapshot(qChunks, (snapshot) => {
      let temp: UserItem[] = [];
      snapshot.docs.forEach(d => {
         const arr = d.data().items || [];
         arr.forEach((itemData: any) => {
            temp.push({
               ...applyTranslationLayer(itemData),
               id: itemData.id,
               _chunkId: d.id, // internal reference for fast updates
             } as UserItem);
         });
      });
      chunkItems = temp;
      updateCombined();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, pathChunks);
      setLoadingItems(false);
    });

    return () => { unsubLegacy(); unsubChunks(); };
  }, [user, loading]);

  const saveItem = async (item: UserItem) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const { id, _chunkId, ...data } = item as any;
    
    let finalId = id;
    if (!finalId) {
      const titleLower = (data.title || 'Untitled').toLowerCase();
      const categoryMatch = data.category || 'other';
      const existing = userItems.find(i => (i.title || "").toLowerCase() === titleLower && i.category === categoryMatch);
      if (existing && existing.id) {
        finalId = existing.id;
      } else {
        finalId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
    }
    
    finalId = finalId.replace(/\//g, '-');
    const cleanStr = (s?: any) => (typeof s === 'string' ? s.trim() : s);
    const cleanedTitle = cleanStr(data.title) || 'Untitled';
    const cleanedCategory = (cleanStr(data.category) || 'other').toLowerCase();
    const payload: Record<string, any> = {
       id: finalId,
       title: cleanedTitle,
       category: cleanedCategory,
       dateAdded: data.dateAdded || Date.now(),
       status: data.status || 'completed'
    };
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'title' && key !== 'category' && key !== 'dateAdded' && key !== 'status') {
        payload[key] = (typeof value === 'string') ? value.trim() : value;
      }
    });

    // Mutually Exclusive Lists Logic
    if (payload.status === 'up-next' || payload.status === 'planning') {
      if (payload.reaction === 'love') {
         payload.reaction = null; // Strip curated status if want-to-try
      }
    } else if (payload.status === 'abandoned' || payload.status === 'not-for-me' || payload.reaction === 'dislike' || payload.reaction === 'hate') {
      if (payload.reaction === 'love') {
         payload.reaction = null; // Strip curated if disliked/abandoned
      }
    }

    const originalItem = userItems.find(i => i.id === finalId) as any;
    
    if (originalItem && originalItem._chunkId) {
       const chunkRef = doc(db, `users/${currentUser.uid}/item_lists/${originalItem._chunkId}`);
       try {
         const snap = await getDoc(chunkRef);
         if (snap.exists()) {
            const arr = snap.data().items || [];
            const idx = arr.findIndex((i: any) => i.id === finalId);
            if (idx !== -1) arr[idx] = { ...arr[idx], ...payload };
            else arr.push(payload);
            await setDoc(chunkRef, { items: arr }, { merge: true });
          } else {
            await setDoc(chunkRef, { items: [payload] });
         }
       } catch (error) {
         console.warn("Failed to update item in chunk", error);
       }
    } else {
       const ref = doc(db, `users/${currentUser.uid}/items/${finalId}`);
       try {
         // for legacy individual doc, don't store id inside payload to match old schema
         const { id: _, ...docPayload } = payload;
         await setDoc(ref, docPayload, { merge: true });
        } catch (error) {
          console.warn("Failed to save item to Firestore", error);
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/items/${finalId}`);
       }
    }

    // Trigger cost-efficient AI background ingestion pipeline
    if (!payload.embedding) {
      fetch('/api/ingest-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { ...payload, id: finalId } })
      })
      .then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any))
      .then(resData => {
         if (resData.embedding && resData.embedding.length > 0) {
            // Save it again, this time with the embedding so we don't trigger the infinite loop
            const metadataUpdates: any = {};
            if (resData.runtime) metadataUpdates.runtime = resData.runtime;
            if (resData.pages) metadataUpdates.pages = resData.pages;
            if (resData.genres) metadataUpdates.genres = resData.genres;
            
            saveItem({ ...item, id: finalId, embedding: resData.embedding, inferredThemes: resData.themes, ...metadataUpdates } as any);
         }
      })
      .catch(console.warn);
    }
  };

  const removeItem = async (itemId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const safeItemId = itemId.replace(/\//g, '-');
    
    const originalItem = userItems.find(i => i.id === safeItemId || i.id === itemId) as any;
    
    if (originalItem && originalItem._chunkId) {
       const chunkRef = doc(db, `users/${currentUser.uid}/item_lists/${originalItem._chunkId}`);
       try {
         const snap = await getDoc(chunkRef);
         if (snap.exists()) {
            const arr = snap.data().items || [];
            const newArr = arr.filter((i: any) => i.id !== safeItemId && i.id !== itemId);
            await setDoc(chunkRef, { items: newArr });
         }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${currentUser.uid}/item_lists/${originalItem._chunkId}`);
       }
    } else {
       const pathForDelete = `users/${currentUser.uid}/items/${safeItemId}`;
       const ref = doc(db, pathForDelete);
       try {
         await deleteDoc(ref);
        } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, pathForDelete);
       }
    }
  };

  const saveMultipleItems = async (newItems: UserItem[]) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    let batch = writeBatch(db);
    let chunkCount = 0;
    const CHUNK_SIZE = 490;
    const ts = Date.now();

    for (let i = 0; i < newItems.length; i += CHUNK_SIZE) {
       const slice = newItems.slice(i, i + CHUNK_SIZE);
       const chunkId = `chunk_${ts}_${chunkCount}`;
       chunkCount++;
       
       const payloadItems = slice.map(b => {
          const { id, _chunkId, ...data } = b as any;
          let finalId = id;
          if (!finalId) {
             const titleLower = (data.title || 'Untitled').toLowerCase();
             const categoryMatch = data.category || 'other';
             const existing = userItems.find(x => (x.title || "").toLowerCase() === titleLower && x.category === categoryMatch);
             if (existing && existing.id) {
               finalId = existing.id;
              } else {
               finalId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
             }
          }
          
          const safeId = finalId.replace(/\//g, '-');
          
          const itemPayload: Record<string, any> = {
             id: safeId,
             title: data.title || 'Untitled',
             category: data.category || 'other',
             dateAdded: data.dateAdded || Date.now(),
             status: data.status || 'completed'
          };

          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null && key !== 'title' && key !== 'category' && key !== 'dateAdded' && key !== 'status') {
              itemPayload[key] = value;
            }
          });
          return itemPayload;
       });

       const chunkRef = doc(db, `users/${currentUser.uid}/item_lists/${chunkId}`);
       batch.set(chunkRef, { items: payloadItems }, { merge: true });
    }

    if (chunkCount > 0) {
      try {
        await batch.commit();
       } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/item_lists (batch)`);
      }
    }
  };

  return { userItems, loadingItems, saveItem, removeItem, saveMultipleItems };
}