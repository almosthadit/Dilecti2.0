import React, { useState, useEffect, useRef } from "react";
import { Star, X, Check, Search, Loader2, Sparkles, Utensils, Tv, Headphones, ShoppingBag, Globe, BookOpen, PartyPopper, Gamepad, Heart, ThumbsUp, ThumbsDown, Skull, Plus, Trash2, Share, Camera, List, FileUp, Database, Hash, User, ArrowLeft, Mic, Image as ImageIcon, Bot, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { UserItem, Category } from "../types";
import { useUserItems, useUserProfile } from "../hooks";
import { useUser } from "../context/UserContext";
import { db } from "../lib/firebase";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { enrichItemsInBackground } from "../lib/enrichment";
import AutocompleteInput from "./AutocompleteInput";
import { ImageWithFallback } from "./ImageWithFallback";
import Fuse from "fuse.js";


const categoriesDef = [
  { name: "Food", id: "food", icon: Utensils },
  { name: "TV & Movies", id: "movie", icon: Tv }, // we map 'movie' and 'tv' identically below
  { name: "Music", id: "music", icon: Headphones },
  { name: "Products", id: "product", icon: ShoppingBag },
  { name: "Places", id: "place", icon: Globe },
  { name: "Books", id: "book", icon: BookOpen },
  { name: "Events", id: "event", icon: PartyPopper },
  { name: "Games/Sports", id: "game", icon: Gamepad },
  { name: "Podcasts", id: "podcast", icon: Headphones },
  { name: "Creators", id: "creator", icon: Star },
  { name: "Custom", id: "custom", icon: Star },
];

export const getDefaultSubCategoryFor = (category: string | null): string => {
  if (!category) return "";
  const cat = category.toLowerCase();
  const defaults: Record<string, string> = {
    music: "Artists",
    food: "Restaurants",
    movie: "Movies",
    tv: "TV Shows",
    watch: "Movies",
    game: "Video Games",
    book: "Fiction",
    event: "Concerts",
    place: "Cities",
    product: "Tech",
  };
  return defaults[cat] || "";
};

const FUN_SEARCH_MESSAGES = [
  "Rummaging through metadata archives...",
  "Calibrating neural catalog keys...",
  "Sifting the web for matching covers...",
  "Whispering queries to index gnomes...",
  "Correcting spelling with graceful algos...",
  "Polishing search results for you..."
];

export default function UniversalAddModal({
  isOpen,
  onClose,
  initialCategory,
  initialQuery = "",
  initialItem = null,
  initialPhotoScan = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: string | null;
  initialQuery?: string;
  initialItem?: any;
  initialPhotoScan?: boolean;
}) {
  const { userItems, saveItem, removeItem, saveMultipleItems } = useUserItems();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const isInLibrary = initialItem && userItems.some((i: any) => i.id === initialItem.id);

  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [addMode, setAddMode] = useState<"single" | "bulk">(initialPhotoScan ? "bulk" : "single");
  const [bulkMode, setBulkMode] = useState<'text' | 'photo'>(initialPhotoScan ? "photo" : "text");
  const [bulkText, setBulkText] = useState("");
  const [isBulkParsing, setIsBulkParsing] = useState(false);
  const [bulkStatusText, setBulkStatusText] = useState("");
  const [parsedBulkItems, setParsedBulkItems] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [selectedItem, setSelectedItem] = useState<Partial<UserItem> | null>(null);
  const isCustom = selectedItem ? !selectedItem.sourceAttribution : false;
  
  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState<number | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [subCategory, setSubCategory] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  
  const [status, setStatus] = useState<UserItem["status"]>("completed");
  const [criticScore, setCriticScore] = useState(0.0);
  const [rating, setRating] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [review, setReview] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [bestFood, setBestFood] = useState("");
  const [negativeFeedback, setNegativeFeedback] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'groups' | 'custom'>('public');
  const [allowedGroups, setAllowedGroups] = useState<string[]>([]);
  const [excludedGroups, setExcludedGroups] = useState<string[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [excludedUsers, setExcludedUsers] = useState<string[]>([]);
  const [customBase, setCustomBase] = useState<'public' | 'private'>('public');
  
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionsQuery, setConnectionsQuery] = useState("");
  const [showConnectionsDropdown, setShowConnectionsDropdown] = useState(false);
  const [myCircles, setMyCircles] = useState<any[]>([]);
  const [inLibrary, setInLibrary] = useState(true);
  const [collections, setCollections] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [affiliateUrl,
      setAffiliateUrl] = useState("");
  
  // Search Autocomplete state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [isEditingCover, setIsEditingCover] = useState(false);
  const [coverAlts, setCoverAlts] = useState<string[]>([]);
  const [loadingCovers, setLoadingCovers] = useState(false);

  const [searchMessageIdx, setSearchMessageIdx] = useState(0);
  const [hasStartedForm, setHasStartedForm] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setSearchMessageIdx((prev) => (prev + 1) % FUN_SEARCH_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isSearching]);

  useEffect(() => {
    // Only use profile location for UniversalAddModal, 
    // we only ask for GPS location when they open the map feature as requested.
  }, [activeCategory, isOpen]);

  useEffect(() => {
    if (isOpen && user) {
      const fetchCircles = async () => {
        try {
          const snap = await getDocs(collection(db, "users", user.uid, "circles"));
          const fetched: any[] = [];
          snap.forEach(d => fetched.push({ id: d.id, ...d.data() }));
          setMyCircles(fetched);
        } catch(e) {
          console.error("Error fetching circles", e);
        }
      };
      fetchCircles();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (visibility === 'custom' && connections.length === 0 && user) {
      const fetchConnections = async () => {
        try {
          const followsRef = collection(db, "users", user.uid, "following");
          const followsSnap = await getDocs(followsRef);
          const followIds = followsSnap.docs.map(d => d.id);
          
          const followersRef = collection(db, "users", user.uid, "followers");
          const followersSnap = await getDocs(followersRef);
          const followerIds = followersSnap.docs.map(d => d.id);
          
          const uniqueIds = Array.from(new Set([...followIds, ...followerIds]));
          if (uniqueIds.length === 0) return;
          
          const usersList: any[] = [];
          for (const uid of uniqueIds) {
             const udoc = await getDoc(doc(db, "users", uid));
             if (udoc.exists()) {
                usersList.push({ id: udoc.id, ...udoc.data() });
             }
          }
          setConnections(usersList);
        } catch (e) {
          console.error("Error fetching connections", e);
        }
      };
      fetchConnections();
    }
  }, [visibility, user, connections.length]);

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory || initialItem?.category || null);
      if (initialPhotoScan) {
         setAddMode("bulk");
         setBulkMode("photo");
      }
      if (initialItem && initialItem.title) {
        handleSelectResult({ ...initialItem, id: initialItem.id || `item-${Date.now()}` });
        setHasStartedForm(true);
      } else {
        resetForm();
        setQuery(initialQuery || "");
        if (initialQuery) {
          setHasStartedForm(false);
          setShowSuggestions(true);
        }
        if (initialCategory) {
          setSubCategory(getDefaultSubCategoryFor(initialCategory));
        }
      }
    } else {
      resetForm();
      setAddMode("single");
      setBulkMode("text");
      setParsedBulkItems([]);
      setBulkText("");
    }
  }, [isOpen, initialCategory, initialQuery, initialItem, initialPhotoScan]);

  const resetForm = () => {
    setSelectedItem(null);
    setTitle("");
    setSubtitle("");
    setReleaseYear(null);
    setSubCategory("");
    setDescription("");
    setCoverUrl("");
    setCriticScore(0.0);
    setRating(0);
    setReaction(null);
    setReview("");
    setFavoriteQuote("");
    setBestFood("");
    setNegativeFeedback("");
    setIsPrivate(false);
    setVisibility('public');
    setAllowedGroups([]);
    setExcludedGroups([]);
    setAllowedUsers([]);
    setExcludedUsers([]);
    setCustomBase('public');
    setInLibrary(true);
    setStatus("completed");
    setCollections([]);
    setUrl("");
    setAffiliateUrl("");
    setQuery("");
    setSuggestions([]);
    setHasStartedForm(false);
    setIsEditingCover(false);
    setCoverAlts([]);
    setLoadingCovers(false);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectResult = (res: any) => {
    let catVal = res.category;
    if (typeof catVal === 'string') {
      const lower = catVal.toLowerCase();
      if (lower.includes('tv') || lower.includes('show')) catVal = 'tv';
      else if (lower.includes('movie') || lower.includes('film') || lower === 'watch') catVal = 'movie';
      else if (lower.includes('book')) catVal = 'book';
      else if (lower.includes('food')) catVal = 'food';
      else if (lower.includes('music')) catVal = 'music';
      else if (lower.includes('product')) catVal = 'product';
      else if (lower.includes('place')) catVal = 'place';
      else if (lower.includes('game') || lower.includes('sport')) catVal = 'game';
      else if (lower.includes('podcast')) catVal = 'podcast';
      else if (lower.includes('creator')) catVal = 'creator';
      else if (lower.includes('art')) catVal = 'art';
      else if (lower.includes('link')) catVal = 'link';
      else if (lower.includes('event')) catVal = 'event';
    }
    setSelectedItem({
      id: res.id || `item-${Date.now()}`,
      category: catVal as Category,
      sourceAttribution: res.sourceAttribution,
    });
    setActiveCategory(catVal as Category);
    const t = res.title || res.name || "";
    setTitle(t);
    setQuery(t);
    setHasStartedForm(true);
    setSubtitle(res.subtitle || res.author || "");
    setSubCategory(res.subCategory || getDefaultSubCategoryFor(catVal) || "");
    setDescription(res.description || "");
    setReleaseYear(res.releaseYear !== undefined ? Number(res.releaseYear) : null);
    setCoverUrl(res.coverUrl || "");
    setCriticScore(res.criticScore !== undefined ? res.criticScore : 0.0);
    
    if (res.rating !== undefined) setRating(res.rating);
    else if (!hasStartedForm) setRating(0);
    
    const newReaction = res.reaction !== undefined ? res.reaction : (hasStartedForm ? reaction : null);
    const initialStatus = res.status !== undefined ? res.status : (hasStartedForm ? status : "completed");
    setReaction(newReaction);
    setStatus(newReaction && initialStatus === 'up-next' ? 'completed' : initialStatus);
    
    if (res.review !== undefined) setReview(res.review);
    else if (!hasStartedForm) setReview("");
    
    if (res.favoriteQuote !== undefined) setFavoriteQuote(res.favoriteQuote);
    else if (!hasStartedForm) setFavoriteQuote("");
    
    if (res.bestFood !== undefined) setBestFood(res.bestFood);
    else if (!hasStartedForm) setBestFood("");
    
    if (res.negativeFeedback !== undefined) setNegativeFeedback(res.negativeFeedback);
    else if (!hasStartedForm) setNegativeFeedback("");
    
    if (res.isPrivate !== undefined) setIsPrivate(res.isPrivate);
    else if (!hasStartedForm) setIsPrivate(false);
    
    if (res.visibility !== undefined) setVisibility(res.visibility);
    else if (res.isPrivate !== undefined) setVisibility(res.isPrivate ? 'private' : 'public');
    else if (!hasStartedForm) setVisibility('public');
    
    if (res.allowedGroups !== undefined) setAllowedGroups(res.allowedGroups);
    else if (!hasStartedForm) setAllowedGroups([]);
    
    if (res.excludedGroups !== undefined) setExcludedGroups(res.excludedGroups);
    else if (!hasStartedForm) setExcludedGroups([]);

    if (res.allowedUsers !== undefined) setAllowedUsers(res.allowedUsers);
    else if (!hasStartedForm) setAllowedUsers([]);

    if (res.excludedUsers !== undefined) setExcludedUsers(res.excludedUsers);
    else if (!hasStartedForm) setExcludedUsers([]);

    if (res.customBase !== undefined) setCustomBase(res.customBase);
    else if (!hasStartedForm) setCustomBase('public');
    
    setInLibrary(res.inLibrary !== false);
    
    if (res.collections !== undefined) setCollections(res.collections);
    else if (!hasStartedForm) setCollections([]);
    setUrl(res.url || "");
    setAffiliateUrl(res.affiliateUrl || "");
    setShowSuggestions(false);
    setHasStartedForm(true);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    if (query === title && !showSuggestions) {
       return;
    }
    const abortController = new AbortController();
    const delay = setTimeout(async () => {
      if (query === title && !showSuggestions) return; // Don't search if it matches selected EXACTLY and not explicitly open
      setIsSearching(true);
      try {
        const activeMapped = activeCategory === 'tv' || activeCategory === 'watch' ? 'movie' : activeCategory;
        const filteredItems = userItems.filter((item: any) => {
          const itemCat = item.category === 'tv' || item.category === 'watch' ? 'movie' : item.category;
          return activeMapped ? itemCat === activeMapped : true;
        });
        
        const fuse = new Fuse(filteredItems, {
          keys: ['title', 'subtitle'],
          threshold: 0.2,
          ignoreLocation: false,
        });
        
        let existingMatches = fuse.search(query).map(result => ({ ...result.item, sourceAttribution: 'Your Library' }));

        // Instantly show local library matches
        if (existingMatches.length > 0) {
           setSuggestions(existingMatches);
           setShowSuggestions(true);
        }

        const isDescriptiveQuery = query.split(" ").length > 4 || query.includes("where") || query.includes("that") || query.includes("about") || (subCategory && ["Entrees", "Recipes", "Snacks"].includes(subCategory));
        
        let data: any[] = [];
        
        if (isDescriptiveQuery) {
           const aiRes = await fetch("/api/universal-search-ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query, category: activeCategory, subCategory, locationString: profile?.demographics?.location }),
              signal: abortController.signal,
           });
           data = await aiRes.json().catch(() => ({}));
        } else {
           const res = await fetch("/api/universal-search", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ query, category: activeCategory, subCategory, location, locationString: profile?.demographics?.location }),
             signal: abortController.signal,
           });
           data = await res.json().catch(() => ({}));
           
           if (!abortController.signal.aborted) {
             if ((!data || data.length === 0) && query.length > 2) {
                const aiRes = await fetch("/api/universal-search-ai", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ query, category: activeCategory, subCategory, locationString: profile?.demographics?.location }),
                   signal: abortController.signal,
                });
                const aiData = await aiRes.json().catch(() => ({}));
                if (aiData && aiData.length > 0) data = aiData;
             }
           }
        }
        
        if (!abortController.signal.aborted) {
          if (!data || !Array.isArray(data)) data = [];
          
          // Merge rich API metadata into existing library matches if they share a title
          existingMatches = existingMatches.map((localMatch: any) => {
             const localLower = localMatch.title ? localMatch.title.toLowerCase() : "";
             let apiMatch = data.find((d: any) => d.title && d.title.toLowerCase() === localLower);
             if (!apiMatch && localLower) {
                // fuzzy match fallback
                apiMatch = data.find((d: any) => d.title && d.title.toLowerCase().includes(localLower));
             }
             if (apiMatch) {
               return {
                 ...apiMatch, // Bring in all rich API data (better covers, desc, numeric data)
                 ...localMatch, // But keep local library data like ratings/ID overrides
                 category: typeof localMatch.category === 'string' && localMatch.category.toLowerCase().includes('movie') ? 'movie' : (apiMatch.category || localMatch.category),
                 coverUrl: apiMatch.coverUrl || localMatch.coverUrl,
                 description: apiMatch.description || localMatch.description,
                 subtitle: apiMatch.subtitle || localMatch.subtitle,
                 url: apiMatch.url || localMatch.url,
                 affiliateUrl: apiMatch.affiliateUrl || localMatch.affiliateUrl,
                 sourceAttribution: 'Your Library'
               };
             }
             return localMatch;
          });
          
          // Filter out API results that match existing local items tightly by title
          const localTitles = new Set(existingMatches.map((m: any) => m.title.toLowerCase()));
          const filteredApiData = data.filter((d: any) => d.title && !localTitles.has(d.title.toLowerCase()));

          const combined = [...existingMatches, ...filteredApiData];
          setSuggestions(combined.slice(0, 6)); // Top 6
          setShowSuggestions(true);
        }
      } catch (e: any) {
        if (e.name !== "AbortError") setSuggestions([]);
      } finally {
        if (!abortController.signal.aborted) setIsSearching(false);
      }
    }, 300); // 300ms debounce
    return () => {
      clearTimeout(delay);
      abortController.abort();
    };
  }, [query, activeCategory, location, title]);

  const handleSave = async () => {
    let cat: any = ((activeCategory === "watch" ? "movie" : activeCategory) as Category) || "book";
    if (cat === "tv") {
      cat = "tv" as Category;
    }
    if (cat === "movie" && subCategory === "TV Shows") {
      cat = "tv" as Category;
    } else if (cat === "tv show" || cat === "tv shows" || cat === "tv series") {
      cat = "tv" as Category;
    }
    let finalDescription = description;
    let finalCoverUrl = coverUrl;
    let finalSubtitle = subtitle;
    let finalTags = collections;

    const isMissingMetadata = (!finalDescription || !finalCoverUrl || !title) && !isInLibrary;

    const newItem: any = {
      id: selectedItem?.id || `manual-${Date.now()}`,
      category: cat,
      subCategory: subCategory || "",
      title: title || query,
      coverUrl: finalCoverUrl,
      description: finalDescription,
      criticScore,
      rating,
      review,
      favoriteQuote,
      bestFood,
      negativeFeedback,
      isPrivate: visibility !== 'public',
      visibility,
      allowedGroups: visibility === 'groups' ? allowedGroups : (visibility === 'custom' && customBase === 'private' ? allowedGroups : []),
      excludedGroups: visibility === 'custom' && customBase === 'public' ? excludedGroups : [],
      allowedUsers: visibility === 'custom' && customBase === 'private' ? allowedUsers : [],
      excludedUsers: visibility === 'custom' && customBase === 'public' ? excludedUsers : [],
      customBase: visibility === 'custom' ? customBase : 'public',
      inLibrary,
      dateAdded: initialItem ? initialItem.dateAdded : Date.now(),
      status: (reaction && status === 'up-next') ? 'completed' : status,
      collections: finalTags,
      url,
      affiliateUrl,
      releaseYear: releaseYear,
      sourceAttribution: selectedItem?.sourceAttribution || (isMissingMetadata ? "AI Generated" : "User Provided"),
    };
    
    if (reaction) newItem.reaction = reaction;
    if (cat === "book") {
      newItem.author = finalSubtitle;
    } else {
      newItem.subtitle = finalSubtitle;
    }

    saveItem(newItem as any);
    if (user && isMissingMetadata) {

    }
    onClose();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const processVideoFile = async (file: Blob | File) => {
    setIsBulkParsing(true);
    setBulkStatusText("Extracting frames from video...");
    try {
      const fileUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = fileUrl;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          if (video.duration === Infinity || isNaN(video.duration)) {
             video.currentTime = 1e101; // force browser to seek to end to recalculate duration
             video.onseeked = () => {
                video.onseeked = null;
                video.currentTime = 0;
                resolve(null);
             };
          } else {
             resolve(null);
          }
        };
        video.onerror = reject;
        // fallback in case metadata doesn't trigger
        setTimeout(resolve, 3000);
      });

      const duration = video.duration && isFinite(video.duration) ? video.duration : 30; // fallback roughly 30s
      // Extract exactly up to 15 frames
      const maxFrames = 15;
      const interval = Math.max(0.2, duration / maxFrames);
      const base64Images: string[] = [];

      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;

      let width = video.videoWidth || 800;
      let height = video.videoHeight || 800;
      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      for (let time = 0; time < duration; time += interval) {
         if (base64Images.length >= maxFrames) break;
         video.currentTime = time;
         await new Promise(resolve => {
            video.onseeked = resolve;
            // timeout to prevent hanging on bad seek
            setTimeout(resolve, 500); 
         });
         ctx?.drawImage(video, 0, 0, width, height);
         base64Images.push(canvas.toDataURL("image/jpeg", 0.7));
      }
      
      URL.revokeObjectURL(fileUrl);
      setBulkStatusText("Analyzing video frames...");

      const res = await fetch("/api/scan-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images })
      });
      
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      if (!res.ok) {
         setBulkError(data.error || "Failed to scan video. Please try again.");
         return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
         let newItems = data.map((it: any) => ({
           title: it.title,
           subtitle: it.subtitle || "",
           category: it.category || "book"
         }));
         
         const existingTitles = new Set(userItems.map((ui: any) => (ui.title || "").toLowerCase()));
         newItems = newItems.filter(it => !existingTitles.has(it.title.toLowerCase()));
         
         if (newItems.length === 0) {
            setBulkError("All items found in the video are already in your library!");
         } else {
            setParsedBulkItems(newItems);
            setBulkError(null);
         }
      } else {
         setBulkError("No items were detected in the video. Please try a clearer recording.");
      }
    } catch (e: any) {
      console.error(e);
      setBulkError(e.message || "Failed to extract items from video.");
    } finally {
      setIsBulkParsing(false);
      setBulkStatusText("");
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleBulkVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processVideoFile(e.target.files[0]);
  };

  const startScreenRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
         setBulkStatusText("Screen recording is not supported in this view. Please try opening the app in a new tab (click the arrow icon in the top right).");
         return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
         const blob = new Blob(chunks, { type: 'video/webm' });
         processVideoFile(blob);
         stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setBulkStatusText("Recording screen... Stop sharing to process.");
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'NotAllowedError') {
         setBulkError("Screen recording not supported on this device. Please use 'Upload Recording'.");
      }
    }
  };

  const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    setIsBulkParsing(true);
    try {
      const base64Images = await Promise.all(
        files.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (evt) => {
               const img = new Image();
               img.onload = () => {
                 const canvas = document.createElement("canvas");
                 const MAX_WIDTH = 1200;
                 const MAX_HEIGHT = 1200;
                 let width = img.width;
                 let height = img.height;

                 if (width > height) {
                   if (width > MAX_WIDTH) {
                     height *= MAX_WIDTH / width;
                     width = MAX_WIDTH;
                   }
                 } else {
                   if (height > MAX_HEIGHT) {
                     width *= MAX_HEIGHT / height;
                     height = MAX_HEIGHT;
                   }
                 }
                 canvas.width = width;
                 canvas.height = height;
                 const ctx = canvas.getContext("2d");
                 ctx?.drawImage(img, 0, 0, width, height);
                 resolve(canvas.toDataURL("image/jpeg", 0.8));
               };
               img.onerror = (err) => reject(err);
               img.src = evt.target?.result as string;
            };
            reader.onerror = error => reject(error);
          });
        })
      );
      
      const res = await fetch("/api/scan-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images })
      });
      
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      if (!res.ok) {
         setBulkError(data.error || "Failed to scan photos. Please try again.");
         return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
         let newItems = data.map((it: any) => ({
           title: it.title,
           subtitle: it.subtitle || "",
           category: it.category || "book"
         }));
         
         const existingTitles = new Set(userItems.map((ui: any) => (ui.title || "").toLowerCase()));
         newItems = newItems.filter(it => !existingTitles.has(it.title.toLowerCase()));
         
         if (newItems.length === 0) {
            setBulkError("All items found in the photos are already in your library!");
         } else {
            setParsedBulkItems(newItems);
            setBulkError(null);
         }
      } else {
         setBulkError("No items were detected in the photos. Please try a clearer picture, or type them in manually.");
      }
    } catch (e: any) {
      console.error(e);
      setBulkError(e.message || "Failed to extract items from photos.");
    } finally {
      setIsBulkParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBulkParse = async () => {
    if (!bulkText.trim()) return;
    setIsBulkParsing(true);
    setParsedBulkItems([]);
    try {
      setBulkStatusText("Extracting items...");
      const res = await fetch("/api/bulk-enrich", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ text: bulkText, category: activeCategory }),
      });
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      
      let newItems = Array.isArray(data) ? data : [];
      const existingTitles = new Set(userItems.map((ui: any) => (ui.title || "").toLowerCase()));
      newItems = newItems.filter(it => !existingTitles.has((it.title || "").toLowerCase()));
      
      if (newItems.length > 0) {
        setParsedBulkItems(newItems);
        setBulkError(null);
      } else {
        setParsedBulkItems([]);
        setBulkError("No new valid items detected.");
      }
    } catch (e) {
      console.error(e);
      setBulkError("Failed to parse items.");
    } finally {
      setIsBulkParsing(false);
      setBulkStatusText("");
    }
  };

  const handleBulkSave = async () => {
     if (parsedBulkItems.length === 0) return;
     const itemsToSave: any[] = [];
     for (let idx = 0; idx < parsedBulkItems.length; idx++) {
       const parsed = parsedBulkItems[idx];
       const finalReaction = parsed.reaction || reaction;
       
       let cat: any = parsed.category || activeCategory || "book";
       if (cat === "movie" && parsed.subCategory === "TV Shows") {
         cat = "tv";
       } else if (cat === "watch") {
         cat = "movie";
       } else if (cat === "tv show" || cat === "tv shows" || cat === "tv series") {
         cat = "tv";
       }
       
       const newItem: any = {
         id: `item-${Date.now()}-${idx}`,
         category: cat,
         title: parsed.title,
         subtitle: parsed.subtitle,
         description: parsed.description,
         coverUrl: parsed.coverUrl || "",
         criticScore: 0,
         rating: parsed.rating || 0,
         reaction: finalReaction || undefined,
         review: parsed.review || "",
         dateAdded: Date.now(),
         status: parsed.status || (finalReaction && status === 'up-next' ? 'completed' : status || "completed"),
         collections: collections,
         sourceAttribution: "AI Natural Language",
       };
       if (newItem.category === "book") {
         newItem.author = parsed.subtitle;
       } else {
         newItem.subtitle = parsed.subtitle;
       }
       itemsToSave.push(newItem);
     }
     
     await saveMultipleItems(itemsToSave);
     

     onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto md:overflow-hidden relative flex flex-col md:flex-row animate-in zoom-in-95 duration-200 z-[200] dark:bg-[#1a1a1a]">
        
        {/* Mobile Header elements overlay */}
        <button onClick={onClose} className="absolute top-4 right-4 z-[210] p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors md:top-6 md:right-8 dark:bg-white/5">
          <X className="w-5 h-5 text-black/60 dark:text-white/60" />
        </button>

        {/* Left/Top Side: Cover */}
        {hasStartedForm && (
        <div className="w-full md:w-[320px] bg-neutral-100 p-6 md:p-8 flex-col items-center justify-center border-b md:border-b-0 md:border-r border-black/5 shrink-0 relative flex dark:bg-neutral-800 dark:border-white/5">
          <div className="absolute top-4 left-4 md:top-6 md:left-6 z-[60]">
             <button onClick={() => { if (addMode === "bulk") setAddMode("single"); else { setShowSuggestions(true); setHasStartedForm(false); } }} className="md:hidden px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-xl text-xs font-bold text-black/60 transition-colors flex items-center gap-2 dark:bg-white/5 dark:text-white/60">
                <Search className="w-3.5 h-3.5" /> Edit Search
             </button>
             <button onClick={() => setAddMode(addMode === "single" ? "bulk" : "single")} className="hidden md:flex px-4 py-2 bg-black/5 hover:bg-black/10 rounded-xl text-xs font-bold text-black/60 transition-colors items-center gap-2 dark:bg-white/5 dark:text-white/60">
                {addMode === "single" ? <><List className="w-3.5 h-3.5" /> Bulk Upload</> : <><Search className="w-3.5 h-3.5" /> Back to Search</>}
             </button>
          </div>
          
          <div className="w-32 h-48 md:w-48 md:h-72 bg-white rounded-lg shadow-md overflow-hidden flex items-center justify-center p-4 relative group mt-4 md:mt-8 shrink-0 dark:bg-[#1a1a1a]">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover absolute inset-0" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-black/30 font-serif italic text-center leading-snug text-xs md:text-base">{title || query || 'No Title'}</span>
            )}
          </div>
          
          {hasStartedForm && addMode === 'single' && (
             <div className="flex flex-col items-center mt-3 z-50">
               <button
                 type="button"
                 onClick={async (e) => {
                   e.stopPropagation();
                   setIsEditingCover(!isEditingCover);
                   if (!isEditingCover && coverAlts.length === 0) {
                     setLoadingCovers(true);
                     try {
                       const res = await fetch("/api/image-search", {
                         method: "POST",
                         headers: { "Content-Type": "application/json" },
                         body: JSON.stringify({ query: title || query, category: activeCategory }),
                       });
                       if (res.ok) {
                         const urls = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
                         setCoverAlts(urls || []);
                       }
                     } catch (err) {
                       console.error(err);
                     } finally {
                       setLoadingCovers(false);
                     }
                   }
                 }}
                 className="text-[11px] font-bold text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-black/5 dark:border-white/5"
               >
                 <ImageIcon className="w-3.5 h-3.5" />
                 {isEditingCover ? "Hide Alt Images" : "Change Image"}
               </button>

               {isEditingCover && (
                 <div className="mt-3 w-full min-w-[220px] max-w-[240px] bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl p-3 shadow-md flex flex-col gap-2 z-[60]">
                   <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">Select Alternative Cover</span>
                   <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                     {loadingCovers ? (
                       <div className="col-span-3 flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-black/40 dark:text-white/40" /></div>
                     ) : coverAlts.length > 0 ? (
                       coverAlts.map((altUrl, i) => (
                         <div
                           key={i}
                           onClick={() => {
                             setCoverUrl(altUrl);
                             setIsEditingCover(false);
                           }}
                           className="h-14 w-full rounded overflow-hidden cursor-pointer border border-transparent hover:border-emerald-500 opacity-80 hover:opacity-100 transition-all bg-neutral-100 dark:bg-neutral-800"
                         >
                           <img src={altUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         </div>
                       ))
                     ) : (
                       <span className="col-span-3 text-center text-black/40 dark:text-white/40 text-[10px] py-3 italic">No alternate images.</span>
                     )}
                   </div>
                 </div>
               )}
             </div>
          )}
          
          {hasStartedForm && addMode === 'single' && (
              <div className="mt-4 md:mt-6 flex flex-col items-center">
                 <h2 className="text-black/90 text-base md:text-lg font-bold text-center leading-tight mb-1 dark:text-white/90">
                     {title || query || 'Untitled'}
                 </h2>
                 {(subtitle || selectedItem?.subtitle) && (
                     <p className="text-black/60 text-xs md:text-sm font-medium text-center dark:text-white/60">
                         {subtitle || selectedItem?.subtitle}
                     </p>
                 )}
              </div>
          )}

          {description && hasStartedForm && addMode === 'single' && (
            <div className="mt-4 md:mt-6 text-black/80 dark:text-white/80 font-serif text-sm md:text-base leading-relaxed overflow-y-visible text-center px-2">
              {description}
            </div>
         )}
        </div>
        )}

        {/* Right Side: Form */}
        <div className="w-full md:flex-1 p-6 md:p-8 md:overflow-y-auto">
          
          {addMode === "bulk" ? (
             <div className="space-y-6">
                 <div>
                   <div className="flex items-center justify-between mb-3">
                     <h4 className="text-xs font-semibold text-black/40 uppercase tracking-widest">Select Target Category (Optional)</h4>
                     <button onClick={() => setAddMode("single")} className="md:hidden px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-xl text-xs font-bold text-black/60 transition-colors flex items-center gap-1.5 mr-8 dark:bg-white/5 dark:text-white/60">
                       <ArrowLeft className="w-3.5 h-3.5" /> Back
                     </button>
                   </div>
                   <select
                     value={activeCategory || ""}
                     onChange={e => setActiveCategory(e.target.value || null)}
                     className="w-full bg-black/5 rounded-xl px-4 py-3 border-none outline-none font-medium text-neutral-800 appearance-none dark:text-neutral-200 dark:bg-white/5"
                   >
                     <option value="">Auto Category (Let AI Decide)</option>
                     {categoriesDef.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                   </select>
                 </div>

                 <div className="flex bg-black/5 p-1 rounded-full text-sm font-medium w-fit mb-6 flex-wrap gap-1 dark:bg-white/5">
                   <button 
                     onClick={() => setBulkMode('text')} 
                     className={`px-4 py-2 rounded-full transition-all ${bulkMode === 'text' ? 'bg-white shadow-sm text-black font-semibold' : 'text-black/60 hover:text-black'} dark:text-white`}
                   >
                     AI Entry
                   </button>
                   <button 
                     onClick={() => setBulkMode('photo')} 
                     className={`px-4 py-2 rounded-full transition-all ${bulkMode === 'photo' ? 'bg-white shadow-sm text-black font-semibold' : 'text-black/60 hover:text-black'} dark:text-white`}
                   >
                     Photo Upload
                   </button>
                 </div>

                 {bulkMode === 'text' ? (
                   <>
                     <div className="mb-6">
                       <h4 className="text-xs font-semibold text-black/40 uppercase tracking-widest mb-2 font-serif text-lg">AI Assistant Log</h4>
                       <textarea
                         value={bulkText}
                         onChange={(e) => setBulkText(e.target.value)}
                         placeholder="Paste a list or log naturally: e.g., 'Add Dune to my books and rate it 9.5', 'Ate at Noma and it was amazing...'"
                         className="w-full bg-black/5 border-none rounded-2xl p-4 text-base h-40 outline-none placeholder:text-black/30 font-sans dark:bg-white/5"
                       />
                     </div>
                     <button
                       onClick={handleBulkParse}
                       disabled={isBulkParsing || !bulkText.trim()}
                       className="w-full flex items-center justify-center gap-2 py-4 bg-black text-white font-bold rounded-2xl disabled:opacity-50 transition-colors dark:bg-white"
                     >
                       {isBulkParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                       {isBulkParsing ? "Parsing..." : "Let AI Log Items"}
                     </button>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center p-8 bg-black/5 border border-dashed border-black/10 rounded-2xl mb-6 dark:border-white/10 dark:bg-white/5">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleBulkPhotoUpload} 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <input 
                        type="file" 
                        ref={videoInputRef} 
                        onChange={handleBulkVideoUpload} 
                        accept="video/*" 
                        className="hidden" 
                      />
                      <Camera className="w-8 h-8 text-black/30 mb-3" />
                      <p className="text-sm text-black/60 font-medium mb-4 text-center px-4 dark:text-white/60">
                        Upload a photo or screen recording of your bookshelf, movie collection, browsing history, playlist or whatever says something about you.
                      </p>
                      <div className="flex flex-col gap-3 w-full max-w-[280px]">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isBulkParsing}
                          className="bg-white text-black font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-2 w-full dark:bg-[#1a1a1a] dark:text-white"
                        >
                           {isBulkParsing && !bulkStatusText?.includes("video") && !bulkStatusText?.includes("Recording") ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Camera className="w-4 h-4 shrink-0" />}
                           {isBulkParsing && !bulkStatusText?.includes("video") && !bulkStatusText?.includes("Recording") ? (bulkStatusText || "Scanning...") : "Select Photos"}
                        </button>

                        <div className="flex items-center gap-2 mt-2 mb-2">
                           <div className="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
                           <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider">Or</span>
                           <div className="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
                        </div>
                        
                        <button 
                          onClick={() => videoInputRef.current?.click()}
                          disabled={isBulkParsing}
                          className="bg-white text-black font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-2 w-full text-sm border border-black/5 dark:bg-[#1a1a1a] dark:border-white/5 dark:text-white"
                        >
                           <FileUp className="w-4 h-4 shrink-0 text-black/60 dark:text-white/60" />
                           Upload Screen Recording
                        </button>
                        <button 
                          onClick={startScreenRecording}
                          disabled={isBulkParsing}
                          className="bg-black text-white font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-2 w-full text-sm dark:bg-white"
                        >
                           <Tv className="w-4 h-4 shrink-0 text-white/80" />
                           {bulkStatusText?.includes("Recording") ? "Recording in progress..." : "Record Screen"}
                        </button>
                      </div>
                      
                      {bulkError && (
                         <div className="mt-6 text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg text-center w-full dark:bg-red-950 dark:text-red-400">
                            {bulkError}
                         </div>
                      )}
                   </div>
                 )}
                 
                 {parsedBulkItems.length > 0 && (
                   <div className="mt-6 bg-black/5 rounded-2xl p-4 space-y-4 dark:bg-white/5">
                     <h3 className="font-bold text-sm">Ready to save: {parsedBulkItems.length} items</h3>
                     
                     <div className="flex gap-2">
                       <select
                         value={status}
                         onChange={e => {
                           const newStatus = e.target.value as any;
                           setStatus(newStatus);
                           if (newStatus === 'up-next') {
                               setInLibrary(false);
                               setReaction(undefined);
                               setParsedBulkItems(prev => prev.map(item => ({...item, reaction: undefined})));
                           }
                         }}
                         className="flex-1 bg-white rounded-xl px-3 py-2 border-none outline-none font-medium text-sm text-neutral-600 appearance-none shadow-sm dark:bg-[#1a1a1a] dark:text-neutral-400"
                       >
                         <option value="completed">Completed / Tried</option>
                         <option value="up-next">Want to Try</option>
                       </select>
                       <select
                         value={reaction || ""}
                         onChange={e => {
                            const val = e.target.value;
                            setReaction((val as any) || undefined);
                            if (val && status === 'up-next') setStatus('completed');
                            
                            // Apply to all items visibly
                            setParsedBulkItems(prev => prev.map(item => ({...item, reaction: val || undefined})));
                         }}
                         className="flex-1 bg-white rounded-xl px-3 py-2 border-none outline-none font-medium text-sm text-neutral-600 appearance-none shadow-sm dark:bg-[#1a1a1a] dark:text-neutral-400"
                       >
                         <option value="">No Global Rating</option>
                         <option value="love">♥️ Loved it</option>
                         <option value="like">👍 Liked it</option>
                         <option value="dislike">👎 Disliked it</option>
                         <option value="hate">😡 Hated it</option>
                       </select>
                     </div>

                     <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                       {parsedBulkItems.map((item, i) => (
                         <div key={i} className="flex gap-3 border-b border-black/5 pb-2 bg-white rounded-xl p-3 shadow-sm items-center dark:bg-[#1a1a1a] dark:border-white/5">
                            {item.coverUrl ? (
                               <ImageWithFallback src={item.coverUrl} className="w-10 h-14 object-cover rounded bg-black/5 shrink-0 dark:bg-white/5" alt="" referrerPolicy="no-referrer" />
                            ) : (
                               <div className="w-10 h-14 bg-black/5 rounded flex-shrink-0 flex items-center justify-center text-[10px] text-black/30 font-medium dark:bg-white/5">No Img</div>
                            )}
                            <div className="flex justify-between items-start gap-2 flex-1 min-w-0">
                               <div className="flex flex-col flex-1 min-w-0">
                                  <input 
                                    type="text" 
                                    value={item.title} 
                                    onChange={e => {
                                       const newItems = [...parsedBulkItems];
                                       newItems[i].title = e.target.value;
                                       setParsedBulkItems(newItems);
                                    }} 
                                    className="font-semibold text-sm bg-transparent border-none outline-none p-0 focus:ring-0 w-full" 
                                  />
                                  <input 
                                    type="text" 
                                    value={item.subtitle || ""} 
                                    onChange={e => {
                                       const newItems = [...parsedBulkItems];
                                       newItems[i].subtitle = e.target.value;
                                       setParsedBulkItems(newItems);
                                    }}
                                    placeholder="Subtitle/Creator"
                                    className="text-xs text-black/50 bg-transparent border-none outline-none p-0 focus:ring-0 truncate w-full mt-0.5 dark:text-white/50" 
                                  />
                                  <div className="flex flex-wrap gap-2 w-full mt-2">
                                    <select 
                                       value={item.category || ""}
                                       onChange={e => {
                                          const newItems = [...parsedBulkItems];
                                          newItems[i].category = e.target.value;
                                          newItems[i].subCategory = "";
                                          setParsedBulkItems(newItems);
                                       }}
                                       className="text-[10px] text-black/70 bg-black/5 rounded px-2 py-1 outline-none border-none shrink-0 dark:bg-white/5 dark:text-white/70 font-medium"
                                    >
                                       <option value="movie">Movies & TV</option>
                                       <option value="tv">TV Shows</option>
                                       <option value="book">Books</option>
                                       <option value="music">Music</option>
                                       <option value="food">Food</option>
                                       <option value="place">Places</option>
                                       <option value="product">Products</option>
                                       <option value="game">Games</option>
                                       <option value="event">Events</option>
                                       <option value="podcast">Podcasts</option>
                                    </select>
                                    <input 
                                      type="text" 
                                      value={item.subCategory || ""} 
                                      onChange={e => {
                                         const newItems = [...parsedBulkItems];
                                         newItems[i].subCategory = e.target.value;
                                         setParsedBulkItems(newItems);
                                      }}
                                      placeholder="Sub-Category"
                                      className="text-[10px] text-black/70 bg-black/5 rounded px-2 py-1 outline-none border-none shrink-0 w-24 dark:bg-white/5 dark:text-white/70 font-medium placeholder:text-black/30 dark:placeholder:text-white/30" 
                                    />
                                    <select 
                                      value={item.status || 'completed'} 
                                      onChange={e => {
                                         const newItems = [...parsedBulkItems];
                                         newItems[i].status = e.target.value;
                                         if (e.target.value === 'up-next') {
                                           newItems[i].reaction = undefined;
                                         }
                                         setParsedBulkItems(newItems);
                                      }}
                                      className="text-[10px] text-black/70 bg-black/5 rounded px-2 py-1 outline-none border-none shrink-0 dark:bg-white/5 dark:text-white/70 font-medium"
                                    >
                                       <option value="completed">Completed / Tried</option>
                                       <option value="up-next">Want to Try</option>
                                       <option value="in-progress">In Progress</option>
                                       <option value="abandoned">Abandoned</option>
                                    </select>
                                    <select 
                                      value={item.reaction || ''} 
                                      onChange={e => {
                                         const newItems = [...parsedBulkItems];
                                         newItems[i].reaction = e.target.value || undefined;
                                         if (e.target.value) {
                                           newItems[i].status = 'completed';
                                         }
                                         setParsedBulkItems(newItems);
                                      }}
                                      className="text-[10px] text-black/70 bg-black/5 rounded px-2 py-1 outline-none border-none shrink-0 dark:bg-white/5 dark:text-white/70 font-medium"
                                    >
                                       <option value="">Rate...</option>
                                       <option value="love">♥️ Love</option>
                                       <option value="like">👍 Like</option>
                                       <option value="dislike">👎 Dislike</option>
                                       <option value="hate">😡 Hate</option>
                                    </select>
                                  </div>
                               </div>
                               <button 
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     setParsedBulkItems((prev) => prev.filter((_, idx) => idx !== i));
                                  }}
                                  className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0 dark:bg-red-950"
                                  title="Remove from queue"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                       ))}
                     </div>
                     <button onClick={handleBulkSave} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl mt-4">Save All to Library</button>
                   </div>
                 )}
             </div>
          ) : (
            <>
              {/* Single item - direct search & form */}
              <div className={cn("gap-3 relative z-50 items-stretch", hasStartedForm ? "mb-6 hidden md:flex" : "flex-col mb-4")} ref={searchRef}>
                 {!hasStartedForm && (
                   <h2 className="font-serif text-3xl font-bold text-neutral-900 mb-6 text-center tracking-tight dark:text-white">Add to your library</h2>
                 )}
                 <div className="flex-1 relative w-full">
                    <div className={cn("bg-black/5 dark:bg-white/5 rounded-xl px-4 flex items-center gap-3 relative transition-all", hasStartedForm ? "h-12" : "h-16 text-lg border-2 border-transparent focus-within:bg-white dark:focus-within:bg-[#2A2A2D] focus-within:border-emerald-500 focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]")}>
                      {isSearching ? <Loader2 className={cn("text-black/40 dark:text-white/40 animate-spin absolute left-4", hasStartedForm ? "w-5 h-5" : "w-6 h-6")} /> : <Search className={cn("text-black/40 dark:text-white/40 absolute left-4", hasStartedForm ? "w-5 h-5" : "w-6 h-6")} />}
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => {
                          setQuery(e.target.value);
                          if (!showSuggestions) setShowSuggestions(true);
                        }}
                        onFocus={() => { setShowSuggestions(true) }}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        placeholder="Search by title, creator, or describe an event/item..."
                        className="bg-transparent border-none outline-none font-serif text-lg md:text-xl w-full pl-10 pr-4 h-full text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 placeholder:text-sm md:placeholder:text-lg"
                      />
                    </div>

                    {!hasStartedForm && (
                      <div className="flex flex-wrap gap-2 mt-4 px-1">
                        <button
                          onClick={() => {
                            onClose();
                            window.dispatchEvent(new Event('open-ask-for-ideas'));
                          }}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" /> Ask for ideas/recommendations
                        </button>
                      </div>
                    )}
                    {!hasStartedForm && activeCategory && (
                      <div className="flex flex-wrap gap-2 mt-4 px-1">
                        {(() => {
                          const cat = activeCategory === 'tv' || activeCategory === 'watch' ? 'movie' : activeCategory;
                          const subFilters: Record<string, string[]> = {
                            'music': ['Artists', 'Songs', 'Albums'],
                            'food': ['Restaurants', 'Snacks', 'Entrees'],
                            'movie': ['Movies', 'TV Shows', 'Actors'],
                            'game': ['Video Games', 'Board & Card Games', 'Sports'],
                            'book': ['Fiction', 'Non-Fiction', 'Audiobooks'],
                            'event': ['Concerts', 'Theater', 'Sports'],
                            'place': ['Cities', 'Nature', 'Venues'],
                            'product': ['Tech', 'Home', 'Fashion'],
                          };
                          const options = subFilters[cat] || [];
                          if (options.length === 0) return null;
                          return options.map(o => (
                            <button
                              key={o}
                              onClick={() => setSubCategory(subCategory === o ? "" : o)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm",
                                subCategory === o ? "bg-emerald-600 text-white" : "bg-black/5 hover:bg-black/10 text-black/60"
                              )}
                            >
                              {o}
                            </button>
                          ));
                        })()}
                      </div>
                    )}

                    {showSuggestions && (
                      <div className={cn(
                        "mt-2 bg-white rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.05)] border border-black/5 overflow-hidden z-[200] w-full left-0 dark:bg-[#1a1a1a] dark:border-white/5",
                        hasStartedForm ? "absolute top-full max-h-[40vh] md:max-h-[60vh] overflow-y-auto" : "max-h-[65vh] overflow-y-auto"
                      )}>
                        {suggestions.length > 0 ? (
                          <>
                            {suggestions.map((s: any, i: number) => {
                              let overrideId = s.category;
                              if (overrideId === 'tv' || overrideId === 'watch') overrideId = 'movie';
                              const catName = categoriesDef.find(c => c.id === overrideId)?.name || s.category;
                              const isLibrary = s.sourceAttribution === 'Your Library';
                              
                              return (
                                <button
                                  key={i}
                                  className={cn(
                                    "w-full p-3 flex gap-4 text-left transition-colors border-b border-black/5 dark:border-white/5 relative",
                                    isLibrary ? "bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40" : "hover:bg-black/5 dark:hover:bg-white/5"
                                  )}
                                  onClick={() => handleSelectResult(s)}
                                >
                                  <div className="w-10 h-14 bg-black/5 shrink-0 rounded overflow-hidden flex items-center justify-center relative shadow-sm dark:bg-white/5">
                                    {s.coverUrl ? <ImageWithFallback src={s.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span className="text-xs text-black/30 dark:text-white/30 text-center font-serif leading-tight px-1">N/A</span>}
                                    {isLibrary && (
                                       <div className="absolute inset-x-0 bottom-0 top-0 ring-inset ring-2 ring-emerald-500/20 dark:ring-emerald-500/40" />
                                    )}
                                  </div>
                                  <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2 w-full">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className={cn("font-bold text-sm truncate", isLibrary ? "text-emerald-950 dark:text-emerald-100" : "text-black/90 dark:text-white/90")}>{s.title}</span>
                                        <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0", isLibrary ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "text-black/40 bg-black/5 dark:text-white/40 dark:bg-white/5")}>{catName}</span>
                                      </div>
                                      {isLibrary && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ml-2 flex items-center gap-1 shadow-sm dark:text-emerald-300 dark:bg-emerald-900">
                                          {s.status === 'up-next' ? (
                                             <>Want to Try</>
                                          ) : (
                                             <><Check className="w-3 h-3" /> In Library</>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5 max-w-full gap-2">
                                       <div className="flex items-center gap-2 min-w-0 flex-1">
                                         <span className={cn("text-xs truncate shrink-0 max-w-[50%]", isLibrary ? "text-emerald-800/60 dark:text-emerald-200/60" : "text-black/50 dark:text-white/50")}>{s.subtitle}</span>
                                         {!isLibrary && s.sourceAttribution && (
                                           <span className="text-[9px] text-black/30 dark:text-white/30 truncate min-w-0 italic">Source: {s.sourceAttribution}</span>
                                         )}
                                       </div>
                                       {(s.price || s.rating) && (
                                         <div className="flex items-center gap-2 shrink-0 ml-2">
                                           {s.rating && (
                                             <span className="flex items-center text-[10px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded dark:bg-amber-950">
                                               <Star className="w-3 h-3 mr-0.5 fill-current" /> {s.rating}
                                             </span>
                                           )}
                                           {s.price && (
                                             <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:text-emerald-400 dark:bg-emerald-950">{s.price}</span>
                                           )}
                                         </div>
                                       )}
                                    </div>
                                    {s.description && <span className={cn("text-xs line-clamp-1 mt-0.5", isLibrary ? "text-emerald-800/50 dark:text-emerald-200/50" : "text-black/40 dark:text-white/40")}>{s.description}</span>}
                                  </div>
                                </button>
                              );
                            })}
                            {isSearching && (
                              <div className="w-full p-4 flex gap-4 items-center animate-pulse border-b border-black/5 last:border-b-0 bg-black/[0.02] dark:border-white/5">
                                <div className="w-10 h-14 bg-black/10 shrink-0 rounded flex items-center justify-center dark:bg-white/10">
                                   <Loader2 className="w-5 h-5 text-black/40 animate-spin" />
                                </div>
                                <div className="flex flex-col justify-center">
                                   <span className="font-bold text-sm text-black/60 dark:text-white/60">AI is searching deeper...</span>
                                   <span className="text-xs text-emerald-600 font-medium transition-all duration-300 dark:text-emerald-400">{FUN_SEARCH_MESSAGES[searchMessageIdx]}</span>
                                </div>
                              </div>
                            )}
                          </>
                        ) : null}
                        
                        {query.length > 0 && !isSearching && (
                           <button
                             className="w-full p-4 flex items-center gap-3 text-left hover:bg-black/5 transition-colors border-t border-black/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] dark:border-white/5"
                             onClick={() => handleSelectResult({ title: query, category: activeCategory || "book", subtitle: "" })}
                           >
                              <div className="w-10 h-10 bg-black/5 rounded-full flex flex-col items-center justify-center shrink-0 dark:bg-white/5">
                                <Plus className="w-5 h-5 text-black/50 dark:text-white/50" />
                              </div>
                              <div className="flex flex-col justify-center min-w-0 flex-1">
                                <span className="font-bold text-sm text-black/90 truncate dark:text-white/90">Create Custom: "{query}"</span>
                                <span className="text-xs text-black/40">Add this manually</span>
                              </div>
                           </button>
                        )}
                      </div>
                    )}
                 </div>
              </div>
              
              {!hasStartedForm && query.length === 0 && (
                 <div className="flex flex-col gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                       <button onClick={() => { setAddMode("bulk"); setBulkMode("text"); setShowSuggestions(false); }} className="h-full w-full p-5 flex flex-col items-center text-center gap-3 bg-black/5 hover:bg-black/10 transition-colors rounded-2xl border border-black/5 dark:border-white/5 dark:bg-white/5">
                          <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 dark:bg-[#1a1a1a]">
                              <Sparkles className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                              <div className="font-bold text-[15px] text-black/90 tracking-tight dark:text-white/90">AI Assisted Add</div>
                              <div className="text-xs text-black/50 leading-relaxed mt-1 dark:text-white/50">Paste a full list, log, or just ask naturally</div>
                          </div>
                       </button>
                       <div className="flex flex-col gap-2 h-full">
                          <button onClick={() => { setAddMode("bulk"); setBulkMode("photo"); setShowSuggestions(false); setTimeout(() => fileInputRef.current?.click(), 100); }} className="w-full flex-1 p-5 flex flex-col items-center justify-center text-center gap-3 bg-black/5 hover:bg-black/10 transition-colors rounded-2xl border border-black/5 dark:border-white/5 dark:bg-white/5">
                             <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 dark:bg-[#1a1a1a]">
                                 <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                             </div>
                             <div>
                                 <div className="font-bold text-[15px] text-black/90 tracking-tight dark:text-white/90">Upload Photo</div>
                                 <div className="text-[11px] text-black/50 leading-relaxed mt-1 dark:text-white/50">Scan shelves or lists</div>
                             </div>
                          </button>
                          <div className="flex gap-2">
                             <button onClick={() => { setAddMode("bulk"); setBulkMode("photo"); setShowSuggestions(false); setTimeout(() => videoInputRef.current?.click(), 100); }} className="flex-1 p-2 flex flex-col items-center justify-center gap-1 bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 transition-colors rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                                <FileUp className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                                <span className="font-bold text-[10px] text-emerald-900 leading-snug dark:text-emerald-100">Upload Screen<br/>Recording</span>
                             </button>
                             <button onClick={() => { setAddMode("bulk"); setBulkMode("photo"); setShowSuggestions(false); setTimeout(() => startScreenRecording(), 100); }} className="flex-1 p-2 flex flex-col items-center justify-center gap-1 bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 transition-colors rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                                <Tv className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                                <span className="font-bold text-[10px] text-emerald-900 leading-snug text-center dark:text-emerald-100">Record<br/>Screen</span>
                             </button>
                          </div>
                       </div>
                       
                       <button onClick={() => { window.dispatchEvent(new CustomEvent('open-import', { detail: { returnToAdd: true, initialMode: 'ai-memory' } })); onClose(); }} className="h-full w-full p-5 flex flex-col items-center text-center gap-3 bg-purple-50 hover:bg-purple-100 transition-colors rounded-2xl border border-purple-100/50 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 dark:border-purple-900/50">
                          <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 dark:bg-[#1a1a1a]">
                              <Bot className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                              <div className="font-bold text-[15px] text-purple-950 tracking-tight dark:text-purple-50">Import Memory</div>
                              <div className="text-xs text-purple-800/70 leading-relaxed mt-1 dark:text-purple-200/70">Transfer tastes from ChatGPT or Claude</div>
                          </div>
                       </button>
                       
                       <button onClick={() => { window.dispatchEvent(new CustomEvent('open-import', { detail: { returnToAdd: true, initialMode: 'url' } })); onClose(); }} className="h-full w-full p-5 flex flex-col items-center text-center gap-3 bg-blue-50 hover:bg-blue-100 transition-colors rounded-2xl border border-blue-100/50 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:border-blue-900/50">
                          <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 dark:bg-[#1a1a1a]">
                              <Globe className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                              <div className="font-bold text-[15px] text-blue-950 tracking-tight dark:text-blue-50">Import from URL</div>
                              <div className="text-xs text-blue-800/70 leading-relaxed mt-1 dark:text-blue-200/70">Paste a link to any public list</div>
                          </div>
                       </button>

                       <button onClick={() => { window.dispatchEvent(new CustomEvent('open-import', { detail: { returnToAdd: true, initialMode: 'upload' } })); onClose(); }} className="h-full w-full p-5 flex flex-col items-center text-center gap-3 bg-amber-50 hover:bg-amber-100 transition-colors rounded-2xl border border-amber-100/50 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 dark:border-amber-900/50">
                          <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 dark:bg-[#1a1a1a]">
                              <FileText className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                              <div className="font-bold text-[15px] text-amber-950 tracking-tight dark:text-amber-50">Import CSV</div>
                              <div className="text-xs text-amber-800/70 leading-relaxed mt-1 dark:text-amber-200/70">Upload structured data files</div>
                          </div>
                       </button>

                       <button onClick={() => { window.dispatchEvent(new CustomEvent('open-import', { detail: { returnToAdd: true } })); onClose(); }} className="h-full w-full p-5 flex flex-col items-center text-center gap-3 bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-2xl border border-emerald-100/50 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 dark:border-emerald-900/50">
                          <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 dark:bg-[#1a1a1a]">
                              <Database className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                              <div className="font-bold text-[15px] text-emerald-950 tracking-tight dark:text-emerald-50">Integrations</div>
                              <div className="text-xs text-emerald-800/70 leading-relaxed mt-1 dark:text-emerald-200/70">Connect to Letterboxd, Spotify, etc</div>
                          </div>
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <button onClick={() => { window.dispatchEvent(new Event('open-taste-profile')); onClose(); }} className="w-full p-5 flex items-center gap-4 bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-2xl border border-emerald-100/50 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:border-emerald-900/50">
                          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 dark:bg-[#1a1a1a]">
                              <Hash className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="text-left">
                              <div className="font-bold text-[15px] text-emerald-950 tracking-tight mb-0.5 dark:text-emerald-50">Taste Quiz</div>
                              <div className="text-xs text-emerald-800/70 leading-relaxed dark:text-emerald-200/70">Refine your taste profile with a quick AI interview</div>
                          </div>
                       </button>
                       <button onClick={() => { window.dispatchEvent(new Event('open-taste-profile')); onClose(); }} className="w-full p-5 flex items-center gap-4 bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-2xl border border-emerald-100/50 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:border-emerald-900/50">
                          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 dark:bg-[#1a1a1a]">
                              <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="text-left">
                              <div className="font-bold text-[15px] text-emerald-950 tracking-tight mb-0.5 dark:text-emerald-50">Demographics</div>
                              <div className="text-xs text-emerald-800/70 leading-relaxed dark:text-emerald-200/70">Add location, age, and lifestyle context</div>
                          </div>
                       </button>
                    </div>
                 </div>
              )}
              
              {/* Duplicate description removed to fix layout rendering double elements */}
              
              {hasStartedForm && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {(() => {
                     const isDuplicate = !isInLibrary && userItems.some((item: any) => 
                         item.title?.toLowerCase() === (title || query).toLowerCase()
                     );
                     if (!isDuplicate) return null;
                     return (
                         <div className="bg-amber-50 text-amber-900 border border-amber-100 p-4 rounded-xl mb-6 text-sm dark:bg-amber-950 dark:border-amber-800/50 dark:text-amber-200">
                             <div className="flex gap-3 items-start">
                                 <span className="text-amber-600 font-bold dark:text-amber-400 mt-0.5">!</span>
                                 <div className="flex-1 font-medium leading-relaxed">
                                     An item named <span className="font-bold">"{title || query}"</span> is already in your library. You can still save this to create a separate entry, but be aware it might be a duplicate.
                                 </div>
                             </div>
                         </div>
                     );
                 })()}
                 {initialItem?.recommendationReason && (
                    <div className="bg-purple-50 text-purple-900 border border-purple-100 p-4 rounded-xl mb-6 text-sm dark:bg-purple-950 dark:border-purple-800/50 dark:text-purple-200">
                       <div className="flex gap-3 items-start">
                          <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                          <div className="flex-1 font-serif leading-relaxed italic">{initialItem.recommendationReason}</div>
                       </div>
                    </div>
                 )}
              
              <div className="mb-8 flex gap-3">
                 <select
                   value={activeCategory === 'tv' || activeCategory === 'watch' ? 'movie' : (activeCategory || "")}
                   onChange={e => {
                     const newCat = e.target.value;
                     setActiveCategory(newCat);
                     setSubCategory(getDefaultSubCategoryFor(newCat));
                   }}
                   className="flex-1 bg-black/5 rounded-xl px-4 py-3 border-none outline-none font-medium text-neutral-600 appearance-none dark:text-neutral-400 dark:bg-white/5"
                 >
                   <option value="">Auto Category</option>
                   {categoriesDef.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>

                 {(() => {
                   const cat = activeCategory === 'tv' || activeCategory === 'watch' ? 'movie' : (activeCategory || "");
                   const subFilters: Record<string, string[]> = {
                     'music': ['Artists', 'Songs', 'Albums'],
                     'food': ['Restaurants', 'Snacks', 'Entrees'],
                     'movie': ['Movies', 'TV Shows', 'Actors'],
                     'game': ['Video Games', 'Board & Card Games', 'Sports'],
                     'book': ['Fiction', 'Non-Fiction', 'Audiobooks'],
                     'event': ['Concerts', 'Theater', 'Sports'],
                     'place': ['Cities', 'Nature', 'Venues'],
                     'product': ['Tech', 'Home', 'Fashion'],
                   };
                   const options = subFilters[cat] || [];
                   if (options.length === 0) return null;
                   return (
                     <select
                       value={subCategory}
                       onChange={e => setSubCategory(e.target.value)}
                       className="flex-1 bg-black/5 rounded-xl px-4 py-3 border-none outline-none font-medium text-neutral-600 appearance-none dark:text-neutral-400 dark:bg-white/5"
                     >
                       <option value="">Specific Type...</option>
                       {options.map(o => <option key={o} value={o}>{o}</option>)}
                     </select>
                   );
                 })()}
              </div>

              <div className="mb-8">
                 <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-3">Status</label>
                 <div className="flex flex-wrap gap-2">
                   {(() => {
                     const cat = activeCategory || (selectedItem?.category) || 'book';
                     let options = [
                        { id: 'completed', label: 'Completed / Tried' },
                        { id: 'currently-reading', label: 'In Progress' },
                        { id: 'up-next', label: 'Want to Try' },
                        { id: 'abandoned', label: 'Abandoned' },
                        { id: 'not-for-me', label: 'Not for Me' }
                     ];
                     if (cat === 'book' || cat === 'books') {
                        options = [
                           { id: 'completed', label: 'Read' },
                           { id: 'currently-reading', label: 'Currently Reading' },
                           { id: 'up-next', label: 'Want to Read' },
                           { id: 'abandoned', label: 'Abandoned' },
                           { id: 'not-for-me', label: 'Not for Me' }
                        ];
                     } else if (subCategory === 'Actors' || cat === 'creator') {
                        options = [
                           { id: 'completed', label: 'Favorite' },
                           { id: 'currently-reading', label: 'Following' },
                           { id: 'up-next', label: 'Want to Watch' },
                           { id: 'abandoned', label: 'Not a Fan' },
                           { id: 'not-for-me', label: 'Not for Me' }
                        ];
                     } else if (cat === 'watch' || cat === 'movie' || cat === 'tv') {
                        options = [
                           { id: 'completed', label: 'Watched' },
                           { id: 'currently-reading', label: 'Currently Watching' },
                           { id: 'up-next', label: 'Want to Watch' },
                           { id: 'abandoned', label: 'Abandoned' },
                           { id: 'not-for-me', label: 'Not for Me' }
                        ];
                     } else if (cat === 'food' || cat === 'place' || cat === 'places') {
                        options = [
                           { id: 'completed', label: 'Visited' },
                           { id: 'currently-reading', label: 'Currently Here' },
                           { id: 'up-next', label: 'Want to Go' },
                           { id: 'abandoned', label: 'Not Going' },
                           { id: 'not-for-me', label: 'Not for Me' }
                        ];
                     } else if (cat === 'event' || cat === 'events') {
                        options = [
                           { id: 'completed', label: 'Attended' },
                           { id: 'currently-reading', label: 'Currently Attending' },
                           { id: 'up-next', label: 'Want to Attend' },
                           { id: 'abandoned', label: 'Missed' },
                           { id: 'not-for-me', label: 'Not for Me' }
                        ];
                     } else if (cat === 'game' || cat === 'games') {
                        options = [
                           { id: 'completed', label: 'Played' },
                           { id: 'currently-reading', label: 'Currently Playing' },
                           { id: 'up-next', label: 'Want to Play' },
                           { id: 'abandoned', label: 'Abandoned' },
                           { id: 'not-for-me', label: 'Not for Me' }
                        ];
                     } else if (cat === 'music' || cat === 'podcast' || cat === 'podcasts') {
                        options = [
                           { id: 'completed', label: 'Listened' },
                           { id: 'currently-reading', label: 'Currently Listening' },
                           { id: 'up-next', label: 'Want to Listen' },
                           { id: 'abandoned', label: 'Abandoned' },
                           { id: 'not-for-me', label: 'Not for Me' }
                        ];
                     } else if (cat === 'product' || cat === 'products') {
                        options = [
                           { id: 'completed', label: 'Owned/Used' },
                           { id: 'currently-reading', label: 'Currently Using' },
                           { id: 'up-next', label: 'Want to Buy' },
                           { id: 'abandoned', label: 'Abandoned' },
                           { id: 'not-for-me', label: 'Not for Me' }
                        ];
                     }
                     return options.map(opt => (
                        <button
                           key={opt.id}
                           onClick={() => {
                              setStatus(opt.id as any);
                              if (opt.id === 'up-next') {
                                  setInLibrary(false);
                                  setReaction(null);
                                  setRating(0);
                              }
                           }}
                           className={cn(
                              "px-4 py-2 rounded-full text-sm font-bold transition-all border",
                              status === opt.id ? "bg-black text-white border-black shadow-md" : "bg-white text-black/50 border-black/10 hover:bg-black/5 hover:text-black/80"
                           )}
                        >
                           {opt.label}
                        </button>
                     ));
                   })()}
                 </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-3">Quick Reaction {status === 'completed' ? <span className="text-red-500">*</span> : ''}</label>
                <div className="flex gap-3">
                  {[
                    { id: 'love', icon: Heart },
                    { id: 'like', icon: ThumbsUp },
                    { id: 'dislike', icon: ThumbsDown },
                    { id: 'hate', icon: Skull }
                  ].map(r => (
                     <button
                       key={r.id}
                       onClick={() => { const newR = reaction === r.id ? null : r.id; setReaction(newR); if (newR && status === 'up-next') setStatus('completed'); }}
                       className={`w-14 h-14 flex items-center justify-center rounded-3xl transition-all border shrink-0 ${reaction === r.id ? 'bg-black text-white border-black shadow-lg scale-110' : 'bg-black/5 text-black/60 border-transparent hover:bg-black/10 hover:scale-105'} dark:text-white/60`}
                     >
                       <r.icon className={cn("w-6 h-6", reaction === r.id ? "fill-white" : "")} />
                     </button>
                  ))}
                </div>
              </div>

              {reaction && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-end justify-between mb-4">
                    <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider">Numerical Rating</label>
                  </div>
                  <div className="flex items-center gap-5">
                     <div 
                       className="w-16 h-16 bg-black/5 text-black rounded-2xl flex items-center justify-center text-2xl font-bold font-serif shrink-0 border border-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
                       onClick={() => { setRating(0); setCriticScore(0); }}
                       title="Click to reset rating"
                     >
                       <span className="group-hover:hidden">{rating.toFixed(1)}</span>
                       <span className="hidden group-hover:block text-neutral-400">
                         <X className="w-6 h-6" />
                       </span>
                     </div>
                     <div className="flex-1">
                       <input 
                         type="range"
                         min="0" max="10" step="0.1"
                         value={criticScore}
                         onChange={e => {
                           const val = parseFloat(e.target.value);
                           setRating(val);
                           setCriticScore(val);
                         }}
                         className="w-full accent-black h-2 hover:h-3 transition-all bg-black/10 rounded-lg appearance-none cursor-pointer dark:bg-white/10"
                       />
                       <div className="flex justify-between text-xs text-black/40 font-bold mt-3 uppercase tracking-wide">
                         <span>0.0</span>
                         <span>Masterpiece 10.0</span>
                       </div>
                     </div>
                  </div>
                </div>
              )}

              <div className="mb-8" style={{ marginTop: '-10px' }}>
                 <AutocompleteInput 
                    label="Tags" 
                    placeholder="+ Add tag (press Enter)"
                    value={collections}
                    onChange={setCollections}
                    fetchSuggestions={async (q) => { 
                        try {
                            const res = await fetch("/api/search-tags", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ query: q })
                            });
                            return await res.json();
                        } catch (e) {
                            return [{id: q, label: q}];
                        }
                    }}
                 />
              </div>

              {isCustom && (
              <>
                <div className="mb-8">
                   <input 
                     type="text"
                     value={title}
                     onChange={e => setTitle(e.target.value)}
                     placeholder="Title"
                     className="w-full bg-black/5 rounded-xl px-4 py-3 border-none outline-none font-medium text-neutral-600 mb-2 dark:text-neutral-400 dark:bg-white/5"
                   />
                   <input 
                     type="text"
                     value={subtitle}
                     onChange={e => setSubtitle(e.target.value)}
                     placeholder="Author, Director, Artist, Brand..."
                     className="w-full bg-black/5 rounded-xl px-4 py-3 border-none outline-none font-medium text-neutral-600 dark:text-neutral-400 dark:bg-white/5"
                   />
                   <input 
                     type="number"
                     value={releaseYear || ""}
                     onChange={e => setReleaseYear(parseInt(e.target.value) || null)}
                     placeholder="Release Year (e.g. 1999)"
                     className="w-full bg-black/5 rounded-xl px-4 py-3 border-none outline-none font-medium text-neutral-600 dark:text-neutral-400 dark:bg-white/5 mt-2"
                   />
                </div>
              </>
              )}

              <div className="flex flex-col gap-3 mb-8">
                <div className="flex items-center gap-2">
                   <input
                     id="is-in-library-checkbox"
                     type="checkbox"
                     checked={inLibrary}
                     onChange={(e) => setInLibrary(e.target.checked)}
                     className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                   />
                   <label htmlFor="is-in-library-checkbox" className="text-sm font-medium text-black/60 cursor-pointer dark:text-white/60">
                     Add to Library
                   </label>
                </div>
                <div className="flex flex-col gap-2">
                   <label className="text-sm font-medium text-black/60 dark:text-white/60 mb-1">
                     Visibility
                   </label>
                   <select 
                     value={visibility}
                     onChange={(e) => setVisibility(e.target.value as any)}
                     className="w-full sm:w-64 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                   >
                     <option value="public">Public (Everyone)</option>
                     <option value="groups">Specific Groups</option>
                     <option value="custom">Custom (Advanced)</option>
                     <option value="private">Private (Only Me)</option>
                   </select>
                   
                   {visibility === 'groups' && (
                     <div className="flex flex-col gap-2 mt-2">
                        <span className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase">Predefined Groups</span>
                        <div className="flex flex-wrap gap-3">
                           {(['friend', 'family', 'partner'] as const).map(group => (
                             <label key={group} className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-transparent">
                                <input 
                                  type="checkbox" 
                                  checked={allowedGroups.includes(group)}
                                  onChange={(e) => {
                                     if (e.target.checked) setAllowedGroups([...allowedGroups, group]);
                                     else setAllowedGroups(allowedGroups.filter(g => g !== group));
                                  }}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-[#1a1a1a] border-none w-4 h-4" 
                                />
                                <span className="text-sm font-medium capitalize">{group}</span>
                             </label>
                           ))}
                        </div>
                        {myCircles.length > 0 && (
                          <>
                            <span className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mt-2">Custom Groups</span>
                            <div className="flex flex-wrap gap-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                               {myCircles.map((cg: any) => (
                                 <label key={cg.id} className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-transparent">
                                    <input 
                                      type="checkbox" 
                                      checked={allowedGroups.includes(cg.id)}
                                      onChange={(e) => {
                                         if (e.target.checked) setAllowedGroups([...allowedGroups, cg.id]);
                                         else setAllowedGroups(allowedGroups.filter(g => g !== cg.id));
                                      }}
                                      className="rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-[#1a1a1a] border-none w-4 h-4" 
                                    />
                                    <span className="text-sm font-medium">{cg.name}</span>
                                 </label>
                               ))}
                            </div>
                          </>
                        )}
                     </div>
                   )}

                   {visibility === 'custom' && (
                     <div className="flex flex-col gap-4 mt-2 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/10 dark:border-white/10">
                        <div className="flex gap-4">
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={customBase === 'public'} onChange={() => setCustomBase('public')} className="text-emerald-600" />
                              <span className="text-sm font-medium">Share with everyone, except...</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={customBase === 'private'} onChange={() => setCustomBase('private')} className="text-emerald-600" />
                              <span className="text-sm font-medium">Hide from everyone, except...</span>
                           </label>
                        </div>
                        
                        <div className="h-px bg-black/10 dark:bg-white/10 w-full" />
                        
                        <div className="flex flex-col gap-2">
                           <span className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase">
                              {customBase === 'public' ? 'Exclude Groups' : 'Include Groups'}
                           </span>
                           <div className="flex flex-wrap gap-3 max-h-40 overflow-y-auto custom-scrollbar p-1">
                              {(['friend', 'family', 'partner'] as const).map(group => {
                                 const isChecked = customBase === 'public' ? excludedGroups.includes(group) : allowedGroups.includes(group);
                                 return (
                                   <label key={group} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1a1a1a] rounded-xl cursor-pointer hover:bg-black/5 transition-colors border border-black/5 dark:border-white/5">
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={(e) => {
                                           if (customBase === 'public') {
                                              if (e.target.checked) setExcludedGroups([...excludedGroups, group]);
                                              else setExcludedGroups(excludedGroups.filter(g => g !== group));
                                           } else {
                                              if (e.target.checked) setAllowedGroups([...allowedGroups, group]);
                                              else setAllowedGroups(allowedGroups.filter(g => g !== group));
                                           }
                                        }}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-[#1a1a1a] border-none w-4 h-4" 
                                      />
                                      <span className="text-sm font-medium capitalize">{group}</span>
                                   </label>
                                 );
                              })}
                              {myCircles.map((cg: any) => {
                                 const isChecked = customBase === 'public' ? excludedGroups.includes(cg.id) : allowedGroups.includes(cg.id);
                                 return (
                                   <label key={cg.id} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1a1a1a] rounded-xl cursor-pointer hover:bg-black/5 transition-colors border border-black/5 dark:border-white/5">
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={(e) => {
                                           if (customBase === 'public') {
                                              if (e.target.checked) setExcludedGroups([...excludedGroups, cg.id]);
                                              else setExcludedGroups(excludedGroups.filter(g => g !== cg.id));
                                           } else {
                                              if (e.target.checked) setAllowedGroups([...allowedGroups, cg.id]);
                                              else setAllowedGroups(allowedGroups.filter(g => g !== cg.id));
                                           }
                                        }}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-[#1a1a1a] border-none w-4 h-4" 
                                      />
                                      <span className="text-sm font-medium">{cg.name}</span>
                                   </label>
                                 );
                              })}
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <span className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase">
                              {customBase === 'public' ? 'Exclude Specific People' : 'Include Specific People'}
                           </span>
                           <div className="flex flex-col gap-2">
                              <div className="relative">
                                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                                 <input 
                                   type="text" 
                                   placeholder="Search your connections to select..."
                                   value={connectionsQuery}
                                   onChange={(e) => {
                                      setConnectionsQuery(e.target.value);
                                      setShowConnectionsDropdown(true);
                                   }}
                                   onFocus={() => setShowConnectionsDropdown(true)}
                                   onBlur={() => setTimeout(() => setShowConnectionsDropdown(false), 200)}
                                   className="w-full bg-white dark:bg-[#1a1a1a] rounded-xl pl-9 pr-4 py-2 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                 />
                                 
                                 {showConnectionsDropdown && connectionsQuery && (
                                   <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                      {connections
                                         .filter(c => c.displayName?.toLowerCase().includes(connectionsQuery.toLowerCase()) || c.username?.toLowerCase().includes(connectionsQuery.toLowerCase()))
                                         .map(c => {
                                            const isSelected = customBase === 'public' ? excludedUsers.includes(c.id) : allowedUsers.includes(c.id);
                                            return (
                                              <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                   if (customBase === 'public') {
                                                      if (!isSelected) setExcludedUsers([...excludedUsers, c.id]);
                                                      else setExcludedUsers(excludedUsers.filter(x => x !== c.id));
                                                   } else {
                                                      if (!isSelected) setAllowedUsers([...allowedUsers, c.id]);
                                                      else setAllowedUsers(allowedUsers.filter(x => x !== c.id));
                                                   }
                                                   setConnectionsQuery("");
                                                   setShowConnectionsDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
                                              >
                                                 <div className="flex items-center gap-2">
                                                    {c.photoURL ? (
                                                       <img src={c.photoURL} alt="" className="w-6 h-6 rounded-full" />
                                                    ) : (
                                                       <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                                          {c.displayName?.charAt(0) || '?'}
                                                       </div>
                                                    )}
                                                    <span className="font-medium">{c.displayName}</span>
                                                 </div>
                                                 {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                                              </button>
                                            );
                                         })}
                                      {connections.filter(c => c.displayName?.toLowerCase().includes(connectionsQuery.toLowerCase()) || c.username?.toLowerCase().includes(connectionsQuery.toLowerCase())).length === 0 && (
                                         <div className="px-4 py-3 text-sm text-center text-black/50 dark:text-white/50">No connections found</div>
                                      )}
                                   </div>
                                 )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mt-1">
                                 {customBase === 'public' ? excludedUsers.map(uid => {
                                    const u = connections.find(c => c.id === uid);
                                    return (
                                      <div key={uid} className="flex items-center gap-1 bg-white dark:bg-[#1a1a1a] px-2 py-1 rounded-lg border border-black/10 text-xs font-medium">
                                         <span>{u ? u.displayName : uid}</span>
                                         <button type="button" onClick={() => setExcludedUsers(excludedUsers.filter(x => x !== uid))} className="text-black/40 hover:text-red-500"><X className="w-3 h-3" /></button>
                                      </div>
                                    )
                                 }) : allowedUsers.map(uid => {
                                    const u = connections.find(c => c.id === uid);
                                    return (
                                      <div key={uid} className="flex items-center gap-1 bg-white dark:bg-[#1a1a1a] px-2 py-1 rounded-lg border border-black/10 text-xs font-medium">
                                         <span>{u ? u.displayName : uid}</span>
                                         <button type="button" onClick={() => setAllowedUsers(allowedUsers.filter(x => x !== uid))} className="text-black/40 hover:text-red-500"><X className="w-3 h-3" /></button>
                                      </div>
                                    )
                                 })}
                              </div>
                           </div>
                        </div>

                     </div>
                   )}
                </div>
              </div>

              {!["food", "places", "products"].includes(activeCategory || (selectedItem?.category as string) || "") && (
              <div className="mb-8">
                 <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-2">Favorite Quote / Highlights</label>
                 <textarea
                   value={favoriteQuote}
                   onChange={e => setFavoriteQuote(e.target.value)}
                   placeholder="&quot;The only way to make sense out of change is to plunge into it...&quot;"
                   className="w-full bg-[#FCFBE7] text-[#9A8F53] rounded-xl p-4 resize-none h-24 outline-none placeholder:text-[#9A8F53]/50 font-serif italic"
                 />
              </div>
              )}

              {["food"].includes(activeCategory || (selectedItem?.category as string) || "") && (
              <div className="mb-8">
                 <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-2">Best Things To Order</label>
                 <textarea
                   value={bestFood}
                   onChange={e => setBestFood(e.target.value)}
                   placeholder="e.g. Spicy rigatoni, meatballs..."
                   className="w-full bg-orange-50 text-orange-900 rounded-xl p-4 resize-none h-24 outline-none placeholder:text-orange-900/50 font-serif italic"
                 />
              </div>
              )}

              {(status === 'not-for-me' || status === 'abandoned' || reaction === 'hate' || reaction === 'dislike') && (
              <div className="mb-8">
                 <label className="block text-xs font-semibold text-red-800/60 uppercase tracking-wider mb-2">Why wasn't this for you?</label>
                 <textarea
                   value={negativeFeedback}
                   onChange={e => setNegativeFeedback(e.target.value)}
                   placeholder="Helps train the algorithm on what to avoid..."
                   className="w-full bg-red-50 border border-red-100 text-red-900 rounded-xl p-4 resize-none h-24 outline-none placeholder:text-red-900/40 font-medium dark:bg-red-950 dark:text-red-100"
                 />
              </div>
              )}

              <div className="mb-8">
                 <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-2">Your Review</label>
                 <textarea
                   value={review}
                   onChange={e => setReview(e.target.value)}
                   placeholder="What did you think?"
                   className="w-full bg-black/5 rounded-xl p-4 resize-none h-32 outline-none placeholder:text-black/30 font-serif italic dark:bg-white/5"
                 />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
                 {selectedItem?.id && initialItem ? (
                   <button onClick={() => { removeItem(selectedItem.id as string); onClose(); }} className="text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                     Delete
                   </button>
                 ) : <div />}
                 
                 <div className="flex gap-3 ml-auto">
                   <button onClick={onClose} className="px-6 py-3 font-bold text-black/60 hover:bg-black/5 rounded-xl transition-colors dark:text-white/60">
                     Cancel
                   </button>
                   <button 
                     onClick={handleSave} 
                     disabled={isSaving || (status === 'completed' && !reaction)} 
                     className="px-6 py-3 font-bold text-white bg-black hover:bg-black/80 rounded-xl transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 dark:bg-white"
                   >
                     {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                     {isInLibrary ? "Update Entry" : status === 'up-next' ? "Add to My Queue" : "Save to Library"}
                   </button>
                 </div>
              </div>
              </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
