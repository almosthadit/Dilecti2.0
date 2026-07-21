import React, { useState, useEffect } from "react";
import { X, Loader2, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUser } from "../context/UserContext";
import { useUserProfile, useUserItems } from "../hooks";

const Tooltip = ({ children, content }: { children: React.ReactNode, content: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center" 
         onMouseEnter={() => setShow(true)} 
         onMouseLeave={() => setShow(false)}
         onClick={(e) => { e.stopPropagation(); setShow(!show); }}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[220px] p-3 bg-neutral-900 text-white text-xs font-medium rounded-xl shadow-2xl z-[100] text-center pointer-events-none dark:bg-white dark:text-black leading-snug"
          >
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[6px] border-transparent border-t-neutral-900 dark:border-t-white"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function SettingsModal({
  isOpen,
  onClose,
  initialTab = "account",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "account" | "demographics" | "social" | "custom AI";
}) {
  const { user, signOut } = useUser();
  const { profile, updateProfile: updateFirestoreProfile } = useUserProfile();
  const { userItems, saveItem, removeItem } = useUserItems();

  const [restoringMeta, setRestoringMeta] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [extractingArtists, setExtractingArtists] = useState(false);
  const [deduplicating, setDeduplicating] = useState(false);
  const [activeMaintenanceAction, setActiveMaintenanceAction] = useState<string | null>(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState("");
  const [maintenanceLogs, setMaintenanceLogs] = useState<{message: string, date: Date}[]>([]);

  const logMaintenanceProgress = (msg: string) => {
    setEnrichmentProgress(msg);
    setMaintenanceLogs(prev => [{message: msg, date: new Date()}, ...prev]);
    setTimeout(() => setEnrichmentProgress(""), 4000);
  };

  const [dedupState, setDedupState] = useState<{
    status: "idle" | "scanning" | "confirming" | "removing" | "done" | "clean";
    count: number;
    duplicateIds: string[];
    sampleTitles: string[];
    removedCount: number;
  }>({
    status: "idle",
    count: 0,
    duplicateIds: [],
    sampleTitles: [],
    removedCount: 0,
  });

  const [activeTab, setActiveTab] = useState<
    "account" | "demographics" | "social" | "custom AI"
  >(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const [localDemographics, setLocalDemographics] = useState<any>({});
  const [localPreferences, setLocalPreferences] = useState("");
  const [localSocial, setLocalSocial] = useState<{
    handle: string,
    bio: string,
    accountType: string,
    isDiscoverable: boolean,
    creatorCategoryTags: string[],
    affiliateTags?: { amazon?: string, rakuten?: string }
  }>({
    handle: "",
    bio: "",
    accountType: "person",
    isDiscoverable: true,
    creatorCategoryTags: [] as string[],
    affiliateTags: { amazon: "", rakuten: "" },
  });
  
  const [localCardSize, setLocalCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [localShowSocialIndicators, setLocalShowSocialIndicators] = useState(true);
  const [localConsent, setLocalConsent] = useState(false);
  
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
     return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const [localGeminiKey, setLocalGeminiKey] = useState("");
  const [localAiProvider, setLocalAiProvider] = useState("gemini");
  useEffect(() => {
     if (isOpen) {
        setLocalGeminiKey(localStorage.getItem('user_gemini_api_key') || "");
        setLocalAiProvider(localStorage.getItem('user_ai_provider') || "gemini");
     }
  }, [isOpen]);

  const handleSaveTokens = (key: string) => {
     setLocalGeminiKey(key);
     if (key.trim() === "") {
        localStorage.removeItem('user_gemini_api_key');
     } else {
        localStorage.setItem('user_gemini_api_key', key.trim());
     }
  };

  const handleSaveProvider = (provider: string) => {
     setLocalAiProvider(provider);
     localStorage.setItem('user_ai_provider', provider);
  };

  const isEditingRef = React.useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile && isOpen && !isEditingRef.current) {
      setLocalDemographics(profile.demographics || {});
      setLocalConsent(profile.userConsentedToDemographicProfiling || false);
      setLocalPreferences(profile.preferences || "");
      setLocalCardSize(profile.cardSize || 'medium');
      setLocalShowSocialIndicators(profile.showSocialIndicators !== false);
      setLocalSocial({
        handle: profile.handle || "",
        bio: profile.bio || "",
        accountType: profile.accountType || "person",
        isDiscoverable: profile.isDiscoverable !== false,
        creatorCategoryTags: profile.creatorCategoryTags || [],
        affiliateTags: profile.affiliateTags || { amazon: "", rakuten: "" }
      });
    }
  }, [profile, isOpen]);

  useEffect(() => {
    if (!isEditingRef.current || !isOpen) return;
    const currentTimer = setTimeout(async () => {
      setIsSaving(true);
      await updateFirestoreProfile({
        demographics: localDemographics,
        userConsentedToDemographicProfiling: localConsent,
        cardSize: localCardSize,
        showSocialIndicators: localShowSocialIndicators,
        // Note: we might not want to overwrite preferences here if we only want to update demographics.
        // But to match the previous behavior, keeping it.
        ...localSocial,
        creatorCategoryTags:
          localSocial.creatorCategoryTags as import("../types").Category[],
        accountType: localSocial.accountType as "person" | "creator" | "brand",
      });
      setIsSaving(false);
      setTimeout(() => {
        isEditingRef.current = false;
      }, 500);
    }, 1000);
    return () => clearTimeout(currentTimer);
  }, [localDemographics, localConsent, localSocial, localCardSize, localShowSocialIndicators, isOpen]);

  const handleEnrichTags = async () => {
    setActiveMaintenanceAction("tags");
    try {
      const itemsToEnrich = userItems.filter((i: any) => 
        !i.metadata?.genres || !i.metadata?.keywords || i.metadata.genres.length === 0
      );
      
      if (itemsToEnrich.length === 0) {
        logMaintenanceProgress("All items are already enriched!");
        return;
      }
      
      let enrichedCount = 0;
      for (let i = 0; i < itemsToEnrich.length; i += 10) {
        const chunk = itemsToEnrich.slice(i, i + 10);
        setEnrichmentProgress(`Enriching tags for items ${i + 1} to ${Math.min(i + 10, itemsToEnrich.length)} of ${itemsToEnrich.length}...`);
        
        const res = await fetch('/api/enrich-item', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk.map((c: any) => ({ id: c.id, title: c.title, subtitle: c.subtitle, category: c.category })) })
        });
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        
        if (data.enrichedItems) {
          for (let j = 0; j < data.enrichedItems.length; j++) {
             const bk = data.enrichedItems[j];
             const item = chunk.find((c: any) => c.id === bk.id);
             if (item && bk.metadata) {
                await saveItem({ 
                  ...item, 
                  metadata: { ...(item.metadata || {}), ...bk.metadata }
                } as any);
             }
          }
          enrichedCount += data.enrichedItems.length;
        }
      }
      logMaintenanceProgress(`Successfully enriched tags for ${enrichedCount} items.`);
    } catch (e) {
      console.error(e);
      logMaintenanceProgress("Failed to enrich tags.");
    } finally {
      setActiveMaintenanceAction(prev => prev === "tags" ? null : prev);
    }
  };
  const handleBackfillImages = async () => {
    setActiveMaintenanceAction("images");
    try {
      const missingImagesAll = userItems.filter((i: any) => (!i.coverUrl || i.coverUrl.includes('places.googleapis.com')) && !i.image);
      
      if (missingImagesAll.length === 0) {
        logMaintenanceProgress("All items have images!");
        return;
      }

      let updatedCount = 0;
      for (let i = 0; i < missingImagesAll.length; i += 20) {
        const chunk = missingImagesAll.slice(i, i + 20);
        setEnrichmentProgress(`Finding images for items ${i + 1} to ${Math.min(i + 20, missingImagesAll.length)} of ${missingImagesAll.length}...`);
        
        const res = await fetch('/api/fill-missing-images', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk.map((c: any) => ({ id: c.id, title: c.title, subtitle: c.subtitle, category: c.category })) })
        });
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        
        if (data.updatedItems) {
          for (let j = 0; j < data.updatedItems.length; j++) {
             const updated = data.updatedItems[j];
             const item = chunk.find((c: any) => c.id === updated.id);
             if (item && updated.coverUrl) {
                await saveItem({ 
                  ...item, 
                  coverUrl: updated.coverUrl
                } as any);
                updatedCount++;
             }
          }
        }
      }
      logMaintenanceProgress(`Found missing images for ${updatedCount} items.`);
    } catch (e) {
      console.error(e);
      logMaintenanceProgress("Failed to backfill images.");
    } finally {
      setActiveMaintenanceAction(prev => prev === "images" ? null : prev);
    }
  };
  const handleBackfill = async () => {
    setActiveMaintenanceAction("embeddings");
    setEnrichmentProgress("Generating embeddings...");
    try {
      const needEmbedding = userItems.filter((i: any) => !i.embedding || i.embedding.length === 0).slice(0, 50);
      if (needEmbedding.length === 0) {
        logMaintenanceProgress("All items have embeddings!");
        return;
      }
      
      const res = await fetch('/api/generate-embeddings-batch', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: needEmbedding.map(i => `${i.title} ${i.subtitle || ''} ${i.description || ''} ${i.category}`.trim()) })
      });
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      
      if (data.embeddings && data.embeddings.length === needEmbedding.length) {
        let savedCount = 0;
        for (let j = 0; j < needEmbedding.length; j++) {
           await saveItem({ ...needEmbedding[j], embedding: data.embeddings[j] } as any);
           savedCount++;
        }
        logMaintenanceProgress(`Successfully generated embeddings for ${savedCount} items.`);
      } else {
        logMaintenanceProgress("Failed to generate embeddings.");
      }
    } catch (e) {
      console.error(e);
      logMaintenanceProgress("Error generating embeddings.");
    } finally {
      setActiveMaintenanceAction(prev => prev === "embeddings" ? null : prev);
    }
  };
  
  const handleBackfillReleaseYears = async () => {
    setActiveMaintenanceAction("release-years");
    try {
      const needReleaseYears = userItems.filter((i: any) => !i.releaseYear);
      
      if (needReleaseYears.length === 0) {
        logMaintenanceProgress("All items have release years!");
        return;
      }

      let updatedCount = 0;
      for (let i = 0; i < needReleaseYears.length; i += 50) {
        const chunk = needReleaseYears.slice(i, i + 50);
        setEnrichmentProgress(`Backfilling release years for items ${i + 1} to ${Math.min(i + 50, needReleaseYears.length)} of ${needReleaseYears.length}...`);
        
        const res = await fetch('/api/backfill-release-years', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk.map((c: any) => ({ id: c.id, title: c.title, subtitle: c.subtitle, category: c.category })) })
        });
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        
        if (data.backfilledItems) {
          for (let j = 0; j < data.backfilledItems.length; j++) {
             const updated = data.backfilledItems[j];
             const item = chunk.find((c: any) => c.id === updated.id);
             if (item && updated.releaseYear) {
                await saveItem({
                   ...item,
                   releaseYear: updated.releaseYear
                } as any);
                updatedCount++;
             }
          }
        }
      }

      logMaintenanceProgress(`Successfully backfilled release years for ${updatedCount} items.`);
    } catch (e) {
      console.error(e);
      logMaintenanceProgress("Failed to backfill release years.");
    } finally {
      setActiveMaintenanceAction(prev => prev === "release-years" ? null : prev);
    }
  };

  const handleBackfillMetrics = async () => {
    setActiveMaintenanceAction("metrics");
    try {
      const needMetricsAll = userItems.filter((i: any) => 
        (i.category === 'movie' || i.category === 'tv' || i.category === 'book' || i.category === 'watch') && 
        (i.runtime === undefined && i.pages === undefined)
      );
      
      if (needMetricsAll.length === 0) {
        logMaintenanceProgress("All media items have metrics!");
        return;
      }

      let updatedCount = 0;
      for (let i = 0; i < needMetricsAll.length; i += 50) {
        const chunk = needMetricsAll.slice(i, i + 50);
        setEnrichmentProgress(`Backfilling metrics for items ${i + 1} to ${Math.min(i + 50, needMetricsAll.length)} of ${needMetricsAll.length}...`);
        
        const res = await fetch('/api/backfill-metrics', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk.map((c: any) => ({ id: c.id, title: c.title, subtitle: c.subtitle, category: c.category })) })
        });
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        
        if (data.backfilledItems) {
          for (let j = 0; j < data.backfilledItems.length; j++) {
             const bk = data.backfilledItems[j];
             const item = chunk.find((c: any) => c.id === bk.id);
             if (item && bk.metrics) {
                const itemAny = item as any;
                await saveItem({ 
                  ...item, 
                  runtime: bk.metrics.runtime || itemAny.runtime, 
                  pages: bk.metrics.pages || itemAny.pages 
                } as any);
                updatedCount++;
             }
          }
        }
      }
      logMaintenanceProgress(`Successfully backfilled metrics for ${updatedCount} items.`);
    } catch (e) {
      console.error(e);
      logMaintenanceProgress("Failed to backfill metrics.");
    } finally {
      setActiveMaintenanceAction(prev => prev === "metrics" ? null : prev);
    }
  };
  const handleCleanData = async () => {
    setActiveMaintenanceAction("clean");
    try {
      setEnrichmentProgress("Cleaning data...");
      
      let updatedCount = 0;
      for (const item of userItems) {
        let changed = false;
        const updates: any = {};
        
        // Clean title
        if (item.title && item.title !== item.title.trim()) {
          updates.title = item.title.trim();
          changed = true;
        }
        
        // Lowercase and trim category
        if (item.category && item.category !== item.category.trim().toLowerCase()) {
          updates.category = item.category.trim().toLowerCase();
          changed = true;
        }

        // Clean subtitle/author
        if (item.subtitle && item.subtitle !== item.subtitle.trim()) {
           updates.subtitle = item.subtitle.trim();
           changed = true;
        }
        if (item.author && item.author !== item.author.trim()) {
           updates.author = item.author.trim();
           changed = true;
        }

        // Trim descriptions
        if (item.description && item.description !== item.description.trim()) {
           updates.description = item.description.trim();
           changed = true;
        }

        if (changed) {
          await saveItem({ ...item, ...updates });
          updatedCount++;
          if (updatedCount % 10 === 0) {
             setEnrichmentProgress(`Cleaned ${updatedCount} items...`);
          }
        }
      }
      
      logMaintenanceProgress(updatedCount > 0 ? `Successfully cleaned ${updatedCount} items!` : "All items are already clean.");
    } catch (e) {
      console.error(e);
      logMaintenanceProgress("Error cleaning data.");
    } finally {
      setActiveMaintenanceAction(prev => prev === "clean" ? null : prev);
    }
  };

  const handleRunAllMaintenance = async () => {
    // Run them sequentially. They all use `userItems` which might change, but they 
    // update items using `saveItem` which updates the backend.
    setActiveMaintenanceAction("all");
    try {
      setEnrichmentProgress("Running all maintenance tasks...");
      await handleEnrichTags();
      await handleBackfillImages();
      await handleBackfillReleaseYears();
      await handleBackfillMetrics();
      await handleBackfill();
      logMaintenanceProgress("All maintenance tasks completed!");
    } catch (e) {
      console.error(e);
      logMaintenanceProgress("Error running maintenance tasks.");
    } finally {
      setActiveMaintenanceAction(null);
    }
  };

  const updateDemographics = (updater: typeof localDemographics) => {
    isEditingRef.current = true;
    setLocalDemographics(updater);
  };

  const updateSocial = (updater: typeof localSocial) => {
    isEditingRef.current = true;
    setLocalSocial(updater);
  };

  const renderBooleanToggle = (label: string, field: string) => (
    <div>
      <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            updateDemographics({ ...localDemographics, [field]: true })
          }
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex-1 ${localDemographics[field] === true ? "bg-emerald-600 text-white shadow-sm" : "text-black/60 bg-black/5 hover:bg-black/10 hover:text-black"} dark:bg-white/5`}
        >
          Yes
        </button>
        <button
          onClick={() =>
            updateDemographics({ ...localDemographics, [field]: false })
          }
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex-1 ${localDemographics[field] === false ? "bg-emerald-600 text-white shadow-sm" : "text-black/60 bg-black/5 hover:bg-black/10 hover:text-black"} dark:bg-white/5`}
        >
          No
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-3xl h-full md:h-auto md:max-h-[85vh] rounded-2xl md:rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col dark:bg-[#1a1a1a]"
        >
          <div className="flex-shrink-0 p-6 border-b border-black/5 flex items-center justify-between bg-white z-10 relative dark:bg-[#1a1a1a] dark:border-white/5">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-2xl font-bold text-neutral-900 leading-tight dark:text-white">
                Settings
              </h2>
              {isSaving && (
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/50 hover:text-black transition-colors dark:bg-white/5 dark:text-white/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex border-b border-black/5 pb-0 px-6 pt-4 gap-4 bg-white z-10 overflow-x-auto hide-scrollbar dark:bg-[#1a1a1a] dark:border-white/5">
            {["account", "demographics", "social", "custom AI"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-3 border-b-2 text-sm font-semibold capitalize transition-all whitespace-nowrap ${activeTab === tab ? "border-emerald-600 text-emerald-800" : "border-transparent text-neutral-500 hover:text-neutral-800"} dark:text-neutral-400`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto hide-scrollbar flex-1 p-6 md:p-8 space-y-8 pb-32">
            {activeTab === "account" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center font-serif text-3xl text-emerald-800 uppercase overflow-hidden border border-emerald-200 dark:text-emerald-200 dark:bg-emerald-900 dark:border-emerald-800">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user?.email?.charAt(0) || "U"
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-2xl text-neutral-900 dark:text-white">
                      {user?.displayName || "Reader"}
                    </h3>
                    <p className="text-neutral-500 font-medium dark:text-neutral-400">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await signOut();
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-xl transition-colors text-sm dark:bg-red-950 dark:text-red-400"
                  >
                    Sign Out
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Display Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl opacity-70 cursor-not-allowed dark:bg-white/5"
                      value={user?.displayName || ""}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl opacity-70 cursor-not-allowed dark:bg-white/5"
                      value={user?.email || ""}
                      disabled
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 mt-4 dark:text-white/50">
                      Theme Selection
                    </label>
                    <div className="flex gap-3">
                       <button 
                          onClick={() => {
                             setThemeMode('light');
                             localStorage.setItem('theme', 'light');
                             window.dispatchEvent(new Event('theme-changed'));
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors ${themeMode === 'light' ? 'bg-white border-emerald-500 text-emerald-800 shadow-sm' : 'bg-neutral-50 border-transparent text-neutral-500 hover:bg-neutral-100'} dark:text-neutral-400 dark:text-emerald-200`}
                       >
                          Light
                       </button>
                       <button 
                          onClick={() => {
                             setThemeMode('dark');
                             localStorage.setItem('theme', 'dark');
                             window.dispatchEvent(new Event('theme-changed'));
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors ${themeMode === 'dark' ? 'bg-neutral-900 border-emerald-500 text-emerald-400 shadow-sm' : 'bg-neutral-50 border-transparent text-neutral-500 hover:bg-neutral-100'} dark:text-neutral-400`}
                       >
                          Dark
                       </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 mt-4 dark:text-white/50 cursor-help" title="Controls how large the items appear in your library grids.">
                      <Tooltip content="Controls how large the items appear in your library grids.">
                         <span className="flex items-center gap-1">Card Size <HelpCircle className="w-3 h-3" /></span>
                      </Tooltip>
                    </label>
                    <div className="flex gap-3">
                       <button 
                          onClick={() => {
                             // We are editing
                             setLocalCardSize('small');
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors ${localCardSize === 'small' ? 'bg-white border-emerald-500 text-emerald-800 shadow-sm dark:bg-emerald-900 dark:border-emerald-500 dark:text-emerald-200' : 'bg-neutral-50 border-transparent text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                       >
                          Small
                       </button>
                       <button 
                          onClick={() => {
                             isEditingRef.current = true;
                             setLocalCardSize('medium');
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors ${localCardSize === 'medium' || !localCardSize ? 'bg-white border-emerald-500 text-emerald-800 shadow-sm dark:bg-emerald-900 dark:border-emerald-500 dark:text-emerald-200' : 'bg-neutral-50 border-transparent text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                       >
                          Medium
                       </button>
                       <button 
                          onClick={() => {
                             isEditingRef.current = true;
                             setLocalCardSize('large');
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors ${localCardSize === 'large' ? 'bg-white border-emerald-500 text-emerald-800 shadow-sm dark:bg-emerald-900 dark:border-emerald-500 dark:text-emerald-200' : 'bg-neutral-50 border-transparent text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                       >
                          Large
                       </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 mt-4 dark:text-white/50 cursor-help" title="Shows small icons on items indicating if your friends have also interacted with them.">
                      <Tooltip content="Shows small icons on items indicating if your friends have also interacted with them.">
                         <span className="flex items-center gap-1">Show demo friend activity <HelpCircle className="w-3 h-3" /></span>
                      </Tooltip>
                    </label>
                    <div className="flex gap-3">
                       <button 
                          onClick={() => {
                             isEditingRef.current = true;
                             setLocalShowSocialIndicators(true);
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors ${localShowSocialIndicators ? 'bg-white border-emerald-500 text-emerald-800 shadow-sm dark:bg-emerald-900 dark:border-emerald-500 dark:text-emerald-200' : 'bg-neutral-50 border-transparent text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                       >
                          Show
                       </button>
                       <button 
                          onClick={() => {
                             isEditingRef.current = true;
                             setLocalShowSocialIndicators(false);
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors ${!localShowSocialIndicators ? 'bg-white border-emerald-500 text-emerald-800 shadow-sm dark:bg-emerald-900 dark:border-emerald-500 dark:text-emerald-200' : 'bg-neutral-50 border-transparent text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                       >
                          Hide
                       </button>
                    </div>
                  </div>
                  
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex gap-4 mt-8 dark:bg-emerald-950 dark:border-emerald-900">
                  <div className="text-emerald-700 dark:text-emerald-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-shield-check"
                    >
                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div className="text-emerald-800 text-sm dark:text-emerald-200">
                    <p className="font-bold mb-1">Data Privacy & Security</p>
                    <p className="opacity-90 leading-snug">
                      Answers from your Taste Quizzes and your profile
                      preferences are stored securely in your private cloud
                      profile. They are solely used by the Dilecti engine to
                      tune and map your recommendations.
                    </p>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/5">
                  <h4 className="font-serif text-lg font-bold text-neutral-900 mb-4 dark:text-white">
                    Legal & Privacy
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <button onClick={() => setLegalModalType('privacy')} className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-left flex items-center justify-between">
                      Privacy Policy <span className="text-neutral-400">→</span>
                    </button>
                    <button onClick={() => setLegalModalType('terms')} className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-left flex items-center justify-between">
                      Terms of Service <span className="text-neutral-400">→</span>
                    </button>
                  </div>
                  
                  <h4 className="font-serif text-lg font-bold text-neutral-900 mb-4 dark:text-white">
                    Library Maintenance
                  </h4>
                  <p className="text-sm text-neutral-600 mb-4 dark:text-neutral-400">
                    You can restore missing notifications or manually scan your
                    library for missing metadata (like images, descriptions, or
                    subcategories) using the Dilecti Enrichment Engine.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => {
                        setRestoringMeta(true);
                        localStorage.removeItem("dilecti_hide_enrichment");
                        setTimeout(() => window.location.reload(), 500);
                      }}
                      disabled={restoringMeta}
                      title="Show notifications to automatically fix missing images or tags across your library."
                      className="px-4 py-2 bg-black/5 hover:bg-black/10 disabled:opacity-50 text-neutral-800 font-medium rounded-xl transition-colors text-sm flex items-center gap-2 dark:text-neutral-200 dark:bg-white/5"
                    >
                      {restoringMeta && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {restoringMeta
                        ? "Restoring..."
                        : "Restore Metadata Notifications"}
                    </button>
                    <button
                      onClick={async () => {
                        if (!userItems) return;
                        setExtractingArtists(true);
                        let added = 0;
                        const musicItems = userItems.filter(
                          (i) =>
                            i.category === "music" &&
                            i.subtitle &&
                            (!i.subCategory ||
                              i.subCategory.toLowerCase() !== "artist"),
                        );
                        const newlyAdded = new Set<string>();
                        for (const item of musicItems) {
                          const artistName = item.subtitle!.trim();
                          const artistLower = artistName.toLowerCase();
                          const existingArtist = userItems.find(
                            (i) =>
                              i.category === "music" &&
                              i.title.toLowerCase() === artistLower,
                          );
                          if (
                            !existingArtist &&
                            !newlyAdded.has(artistLower) &&
                            artistName.length > 0
                          ) {
                            newlyAdded.add(artistLower);
                            const artistPayload = {
                              id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                              title: artistName,
                              category: "music",
                              subCategory: "artist",
                              dateAdded: Date.now(),
                              status: "completed",
                              sourceAttribution: "Auto-Added Artist",
                            };
                            await saveItem(artistPayload as any);
                            added++;
                          }
                        }
                        setExtractingArtists(false);
                        alert(
                          `Extract complete! Added ${added} missing artists to your library.`,
                        );
                      }}
                      disabled={extractingArtists}
                      title="Finds artists from your music library and ensures they are added as distinct items."
                      className="px-4 py-2 bg-black/5 hover:bg-black/10 disabled:opacity-50 text-neutral-800 font-medium rounded-xl transition-colors text-sm flex items-center gap-2 dark:text-neutral-200 dark:bg-white/5"
                    >
                      {extractingArtists && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {extractingArtists
                        ? "Extracting..."
                        : "Extract Missing Artists"}
                    </button>
                    
                    <button
                      onClick={handleCleanData}
                      disabled={activeMaintenanceAction !== null}
                      title="Standardizes item titles, categories, and descriptions without using AI."
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2 shadow-sm"
                    >
                      {activeMaintenanceAction === "clean" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Clean & Format Data
                      <Tooltip content="Standardizes titles, removes extra whitespace, and formats categories correctly. Does not use AI credits.">
                        <HelpCircle className="w-4 h-4 ml-1 opacity-70 hover:opacity-100" />
                      </Tooltip>
                    </button>

                    <button
                      onClick={handleRunAllMaintenance}
                      disabled={activeMaintenanceAction !== null}
                      title="Run all AI-based maintenance tasks sequentially: Enrich Tags, Missing Images, Missing Metrics, and Embeddings."
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2 shadow-sm"
                    >
                      {activeMaintenanceAction === "all" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Run All AI Maintenance
                      <Tooltip content="Sequentially runs tag enrichment, image backfill, metrics generation, and embedding generation for all items.">
                        <HelpCircle className="w-4 h-4 ml-1 opacity-70 hover:opacity-100" />
                      </Tooltip>
                    </button>
                    
                    <button
                      onClick={handleEnrichTags}
                      disabled={activeMaintenanceAction !== null}
                      title="Uses AI to generate precise genre and keyword tags for items missing them."
                      className="px-4 py-2 bg-black/5 hover:bg-black/10 disabled:opacity-50 text-neutral-800 font-medium rounded-xl transition-colors text-sm flex items-center gap-2 dark:text-neutral-200 dark:bg-white/5"
                    >
                      {activeMaintenanceAction === "tags" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Enrich Tags
                      <Tooltip content="Uses AI to generate precise genre and keyword tags for items missing them.">
                        <HelpCircle className="w-4 h-4 ml-1 opacity-50 hover:opacity-100" />
                      </Tooltip>
                    </button>
                    
                                        <button
                      onClick={handleBackfillReleaseYears}
                      disabled={activeMaintenanceAction !== null}
                      title="Searches for and automatically adds original release years to items."
                      className="px-4 py-2 bg-black/5 hover:bg-black/10 disabled:opacity-50 text-neutral-800 font-medium rounded-xl transition-colors text-sm flex items-center gap-2 dark:text-neutral-200 dark:bg-white/5"
                    >
                      {activeMaintenanceAction === "release-years" && (
                         <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Backfill Release Years
                      <Tooltip content="Searches for and automatically adds original release years to items. Useful for timeline and era analysis.">
                        <HelpCircle className="w-4 h-4 ml-1 opacity-50 hover:opacity-100" />
                      </Tooltip>
                    </button>
                    
                    <button
                      onClick={handleBackfillImages}
                      disabled={activeMaintenanceAction !== null}
                      title="Searches for and automatically adds cover artwork to items that don't have images."
                      className="px-4 py-2 bg-black/5 hover:bg-black/10 disabled:opacity-50 text-neutral-800 font-medium rounded-xl transition-colors text-sm flex items-center gap-2 dark:text-neutral-200 dark:bg-white/5"
                    >
                      {activeMaintenanceAction === "images" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Backfill Missing Images
                      <Tooltip content="Searches for and automatically adds cover artwork to items that don't have images.">
                        <HelpCircle className="w-4 h-4 ml-1 opacity-50 hover:opacity-100" />
                      </Tooltip>
                    </button>
                    
                    <button
                      onClick={handleBackfillMetrics}
                      disabled={activeMaintenanceAction !== null}
                      title="Calculates missing runtimes or page counts for your movies, TV shows, and books."
                      className="px-4 py-2 bg-black/5 hover:bg-black/10 disabled:opacity-50 text-neutral-800 font-medium rounded-xl transition-colors text-sm flex items-center gap-2 dark:text-neutral-200 dark:bg-white/5"
                    >
                      {activeMaintenanceAction === "metrics" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Backfill Missing Metrics
                      <Tooltip content="Calculates missing runtimes or page counts for your movies, TV shows, and books.">
                        <HelpCircle className="w-4 h-4 ml-1 opacity-50 hover:opacity-100" />
                      </Tooltip>
                    </button>
                    
                    <button
                      onClick={handleBackfill}
                      disabled={activeMaintenanceAction !== null}
                      title="Generates hidden vector embeddings used for similarity matching in the Taste Graph."
                      className="px-4 py-2 bg-black/5 hover:bg-black/10 disabled:opacity-50 text-neutral-800 font-medium rounded-xl transition-colors text-sm flex items-center gap-2 dark:text-neutral-200 dark:bg-white/5"
                    >
                      {activeMaintenanceAction === "embeddings" && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Backfill Embeddings
                      <Tooltip content="Generates hidden vector embeddings used for similarity matching in the Taste Graph.">
                        <HelpCircle className="w-4 h-4 ml-1 opacity-50 hover:opacity-100" />
                      </Tooltip>
                    </button>

                    {dedupState.status === "idle" && (
                      <button
                        onClick={() => {
                          if (!userItems) return;
                          setDedupState({
                            status: "scanning",
                            count: 0,
                            duplicateIds: [],
                            sampleTitles: [],
                            removedCount: 0,
                          });

                          setTimeout(() => {
                            const seen = new Set<string>();
                            const dupIds: string[] = [];
                            const dupTitles: string[] = [];

                            for (const item of userItems) {
                              const authorStr = item.author ? `-${item.author.toLowerCase().trim()}` : '';
                              const creatorStr = item.metadata?.creator ? `-${item.metadata.creator.toLowerCase().trim()}` : '';
                              const directorStr = item.metadata?.director ? `-${item.metadata.director.toLowerCase().trim()}` : '';
                              const key = `${item.category}-${item.title.toLowerCase().trim()}${authorStr}${creatorStr}${directorStr}`;
                              
                              if (seen.has(key)) {
                                dupIds.push(item.id);
                                if (dupTitles.length < 3) {
                                  dupTitles.push(item.title);
                                }
                              } else {
                                seen.add(key);
                              }
                            }

                            if (dupIds.length > 0) {
                              setDedupState({
                                status: "confirming",
                                count: dupIds.length,
                                duplicateIds: dupIds,
                                sampleTitles: dupTitles,
                                removedCount: 0,
                              });
                            } else {
                              setDedupState({
                                status: "clean",
                                count: 0,
                                duplicateIds: [],
                                sampleTitles: [],
                                removedCount: 0,
                              });
                            }
                          }, 800);
                        }}
                        title="Scans your library for exact duplicates and merges them."
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 active:bg-neutral-900 border border-transparent text-white font-medium rounded-xl transition-all text-sm flex items-center gap-2 w-full sm:w-auto"
                      >
                        Remove Duplicates
                      </button>
                    )}

                    {dedupState.status === "scanning" && (
                      <div className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 flex items-center justify-between text-neutral-700 animate-pulse dark:text-neutral-300 dark:bg-neutral-800/50 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin dark:text-emerald-400" />
                          <div className="text-sm">
                            <p className="font-bold text-neutral-800 dark:text-neutral-200">
                              Scanning library duplicates...
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Comparing library books, music tracks, and movies.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {dedupState.status === "confirming" && (
                      <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 animate-in fade-in duration-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start gap-4">
                            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 mt-0.5 flex-shrink-0">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            </div>
                            <div className="text-sm">
                              <p className="font-bold text-amber-950 dark:text-amber-50">
                                Found {dedupState.count} duplicate items
                              </p>
                              <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                                For items like{" "}
                                <span className="font-semibold italic">
                                  "
                                  {dedupState.sampleTitles.join(", ")}
                                  {dedupState.count > 3 ? "..." : ""}"
                                </span>
                                , only one copy will remain in your library.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end mt-1">
                            <button
                              onClick={() =>
                                setDedupState({
                                  status: "idle",
                                  count: 0,
                                  duplicateIds: [],
                                  sampleTitles: [],
                                  removedCount: 0,
                                })
                              }
                              className="px-3.5 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 font-semibold rounded-lg text-xs text-neutral-700 transition-colors dark:bg-[#1a1a1a] dark:text-neutral-300 dark:border-white/10"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                setDedupState((prev) => ({
                                  ...prev,
                                  status: "removing",
                                }));
                                let deleted = 0;
                                try {
                                  for (const id of dedupState.duplicateIds) {
                                    await removeItem(id);
                                    deleted++;
                                  }
                                  setDedupState((prev) => ({
                                    ...prev,
                                    status: "done",
                                    removedCount: deleted,
                                  }));
                                } catch (e) {
                                  console.error(
                                    "Failed to remove duplicates:",
                                    e,
                                  );
                                  setDedupState({
                                    status: "idle",
                                    count: 0,
                                    duplicateIds: [],
                                    sampleTitles: [],
                                    removedCount: 0,
                                  });
                                }
                              }}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 font-semibold rounded-lg text-xs text-white shadow-sm transition-colors"
                            >
                              Delete Duplicates
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {dedupState.status === "removing" && (
                      <div className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 flex items-center text-neutral-700 animate-pulse dark:text-neutral-300 dark:bg-neutral-800/50 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin dark:text-emerald-400" />
                          <div className="text-sm">
                            <p className="font-bold text-neutral-800 dark:text-neutral-200">
                              Cleaning duplicates...
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Permanently removing duplicated references from
                              database.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {dedupState.status === "done" && (
                      <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 animate-in zoom-in-95 duration-200 dark:text-emerald-100 dark:bg-emerald-950 dark:border-emerald-800">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 flex-shrink-0 dark:text-emerald-300 dark:bg-emerald-900">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                            </div>
                            <div className="text-sm">
                              <p className="font-bold text-emerald-950 dark:text-emerald-50">
                                Library clean-up successful!
                              </p>
                              <p className="text-xs text-emerald-700/95 leading-relaxed">
                                Removed exactly {dedupState.removedCount}{" "}
                                duplicate item
                                {dedupState.removedCount === 1 ? "" : "s"} from
                                your records.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setDedupState({
                                status: "idle",
                                count: 0,
                                duplicateIds: [],
                                sampleTitles: [],
                                removedCount: 0,
                              })
                            }
                            className="px-3.5 py-1.5 bg-emerald-650 hover:bg-emerald-700 active:bg-emerald-800 font-semibold rounded-lg text-xs text-white shadow-sm transition-colors ml-auto"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}

                    {dedupState.status === "clean" && (
                      <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 animate-in zoom-in-95 duration-200 dark:text-emerald-100 dark:bg-emerald-950 dark:border-emerald-800">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 flex-shrink-0 dark:text-emerald-300 dark:bg-emerald-900">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                              </svg>
                            </div>
                            <div className="text-sm">
                              <p className="font-bold text-emerald-950 dark:text-emerald-50">
                                No duplicates found
                              </p>
                              <p className="text-xs text-emerald-700/95">
                                Your library is clean and has no duplicate
                                entries.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setDedupState({
                                status: "idle",
                                count: 0,
                                duplicateIds: [],
                                sampleTitles: [],
                                removedCount: 0,
                              })
                            }
                            className="px-3.5 py-1.5 bg-emerald-650 hover:bg-emerald-700 active:bg-emerald-800 font-semibold rounded-lg text-xs text-white shadow-sm transition-colors ml-auto"
                          >
                            Great
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {enrichmentProgress && (
                    <div className="mt-4 w-full bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3 text-indigo-700 animate-in fade-in duration-200 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-300">
                      {activeMaintenanceAction !== null && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                      <span className="text-sm font-medium">{enrichmentProgress}</span>
                    </div>
                  )}

                  {maintenanceLogs.length > 0 && (
                    <div className="mt-6 w-full border border-black/5 rounded-xl p-4 dark:border-white/5 bg-white dark:bg-[#1a1a1a] animate-in fade-in">
                      <h5 className="text-xs font-semibold uppercase text-black/50 dark:text-white/50 mb-3 flex items-center justify-between">
                        Maintenance History
                        <button onClick={() => setMaintenanceLogs([])} className="hover:text-black dark:hover:text-white transition-colors">Clear</button>
                      </h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {maintenanceLogs.map((log, idx) => (
                           <div key={idx} className="flex justify-between items-start md:items-center text-xs py-2 border-b border-black/5 dark:border-white/5 last:border-0 gap-2 flex-col md:flex-row">
                               <span className="text-neutral-700 dark:text-neutral-300 pr-4">{log.message}</span>
                               <span className="text-neutral-400 dark:text-neutral-500 flex-shrink-0 whitespace-nowrap">{log.date.toLocaleTimeString()}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "demographics" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl text-emerald-800 dark:text-emerald-200 dark:bg-emerald-950">
                  <p className="text-sm font-medium">
                    Auto-saving is enabled. Feel free to update answers anytime
                    to improve recommendations.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer bg-black/5 p-4 rounded-xl dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    checked={localConsent}
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setLocalConsent(e.target.checked);
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-black dark:text-white">Allow AI to use demographics for taste profiling</span>
                    <span className="text-xs text-black/60 dark:text-white/60 mt-1">If enabled, Dilecti will gently calibrate its tone and provide cohort-level insights in your taste profile (e.g. "Unlike most people your age..."). We never use this to infer sensitive medical, political, or lifestyle traits.</span>
                  </div>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Birthday
                    </label>
                    <input
                      type="date"
                      className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors cursor-pointer dark:bg-white/5"
                      value={localDemographics.birthday || ""}
                      onChange={(e) =>
                        updateDemographics({
                          ...localDemographics,
                          birthday: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Gender
                    </label>
                    <div className="flex items-center gap-2 flex-wrap bg-black/5 p-2 rounded-xl dark:bg-white/5">
                      {["Male", "Female", "Non-binary", "Other"].map((g) => (
                        <button
                          key={g}
                          onClick={() =>
                            updateDemographics({
                              ...localDemographics,
                              gender: g,
                            })
                          }
                          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors flex-1 md:flex-none ${localDemographics.gender === g ? "bg-white text-black shadow-sm" : "text-black/60 hover:bg-black/5 hover:text-black"} dark:text-white`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. New York City, UK"
                      className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors dark:bg-white/5"
                      value={localDemographics.location || ""}
                      onChange={(e) =>
                        updateDemographics({
                          ...localDemographics,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Relationship & Family
                    </label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Married with young kids"
                        className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors dark:bg-white/5"
                        value={localDemographics.relationshipStatus || ""}
                        onChange={(e) =>
                          updateDemographics({
                            ...localDemographics,
                            relationshipStatus: e.target.value,
                          })
                        }
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        {["Single", "Married", "Parent"].map((r) => (
                          <button
                            key={r}
                            onClick={() =>
                              updateDemographics({
                                ...localDemographics,
                                relationshipStatus:
                                  localDemographics.relationshipStatus
                                    ? `${localDemographics.relationshipStatus}, ${r}`
                                    : r,
                              })
                            }
                            className="px-3 py-1 text-[11px] rounded-full font-medium transition-colors bg-black/5 text-black/60 hover:bg-black/10 hover:text-black dark:bg-white/5 dark:text-white/60"
                          >
                            + {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:col-span-2">
                    {renderBooleanToggle("Have Kids?", "hasKids")}
                    {renderBooleanToggle("Currently a Student?", "isStudent")}
                    {renderBooleanToggle("Work From Home?", "worksFromHome")}
                    {renderBooleanToggle("Introvert?", "isIntrovert")}
                    {renderBooleanToggle("Live in a City?", "livesInCity")}
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div>
                      <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                        Pet Ownership
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {["Dog(s)", "Cat(s)", "Other", "None"].map((p) => (
                          <button
                            key={p}
                            onClick={() =>
                              updateDemographics({
                                ...localDemographics,
                                pets: localDemographics.pets === p ? "" : p,
                              })
                            }
                            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${localDemographics.pets === p ? "bg-emerald-600 text-white" : "bg-black/5 text-black/60 hover:bg-black/10 hover:text-black"} dark:text-white/60`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "social" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Display Handle
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 font-medium">
                        @
                      </span>
                      <input
                        type="text"
                        className="w-full bg-black/5 border-transparent outline-none font-sans text-sm pl-8 pr-4 py-3 rounded-xl focus:bg-black/10 transition-colors dark:bg-white/5"
                        value={localSocial.handle}
                        onChange={(e) =>
                          updateSocial({
                            ...localSocial,
                            handle: e.target.value.replace(
                              /[^a-zA-Z0-9_]/g,
                              "",
                            ),
                          })
                        }
                        placeholder="yourname"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Account Type
                    </label>
                    <select
                      className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors cursor-pointer dark:bg-white/5"
                      value={localSocial.accountType}
                      onChange={(e) =>
                        updateSocial({
                          ...localSocial,
                          accountType: e.target.value,
                        })
                      }
                    >
                      <option value="person">Personal</option>
                      <option value="creator">Creator / Tastemaker</option>
                      <option value="brand">Brand / Publication</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                      Short Bio
                    </label>
                    <textarea
                      className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors resize-none dark:bg-white/5"
                      rows={2}
                      maxLength={150}
                      value={localSocial.bio}
                      onChange={(e) =>
                        updateSocial({ ...localSocial, bio: e.target.value })
                      }
                      placeholder="Tell people about your taste..."
                    />
                  </div>

                  {localSocial.accountType === "creator" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                        Creator Expertise Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors dark:bg-white/5"
                        value={localSocial.creatorCategoryTags.join(", ")}
                        onChange={(e) => {
                          const tags = e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean);
                          updateSocial({
                            ...localSocial,
                            creatorCategoryTags: tags,
                          });
                        }}
                        placeholder="e.g. Fine Dining, Fantasy Lit, Horror Movies"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2 flex items-center justify-between p-4 bg-black/5 rounded-xl dark:bg-white/5">
                    <div>
                      <h4 className="font-medium text-sm text-neutral-900 dark:text-white">
                        Public Discoverability
                      </h4>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        Allow people to find and follow your public taste
                        profile. Private items remain hidden.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSocial({
                          ...localSocial,
                          isDiscoverable: !localSocial.isDiscoverable,
                        })
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative ${localSocial.isDiscoverable ? "bg-emerald-500" : "bg-black/20"}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${localSocial.isDiscoverable ? "left-7" : "left-1"} dark:bg-[#1a1a1a]`}
                      />
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 pt-6 border-t border-black/5 dark:border-white/5 mt-4">
                  <h4 className="font-medium text-sm text-neutral-900 mb-2 dark:text-white">
                    Creator Monetization (Affiliate Tags)
                  </h4>
                  <p className="text-xs text-black/50 mb-4 dark:text-white/50">
                    Add your affiliate IDs. When others view products you saved, they'll use your affiliate links. Dilecti is a taste-first platform: algorithms are never influenced by affiliate partnerships or payouts. 
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                        Amazon Associates ID
                      </label>
                      <input
                        type="text"
                        className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors dark:bg-white/5"
                        value={localSocial.affiliateTags?.amazon || ""}
                        onChange={(e) =>
                          updateSocial({
                            ...localSocial,
                            affiliateTags: { ...(localSocial.affiliateTags || {}), amazon: e.target.value }
                          })
                        }
                        placeholder="e.g. dilecti0a-20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-black/50 uppercase mb-2 dark:text-white/50">
                        Rakuten Affiliate ID
                      </label>
                      <input
                        type="text"
                        className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors dark:bg-white/5"
                        value={localSocial.affiliateTags?.rakuten || ""}
                        onChange={(e) =>
                          updateSocial({
                            ...localSocial,
                            affiliateTags: { ...(localSocial.affiliateTags || {}), rakuten: e.target.value }
                          })
                        }
                        placeholder="e.g. 392019"
                      />
                    </div>
                  </div>
                </div>

                {profile?.rejectedRecommendations &&
                  profile.rejectedRecommendations.length > 0 && (
                    <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 shadow-sm mt-6">
                      <h4 className="font-serif text-lg font-medium mb-1 text-red-900 dark:text-red-100">
                        Excluded Recommendations
                      </h4>
                      <p className="text-xs text-red-700/80 mb-4 font-medium">
                        Dilecti actively avoids recommending these types of
                        items to you.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {profile.rejectedRecommendations.map(
                          (rejectTitle: string, idx: number) => (
                            <div
                              key={idx}
                              className="bg-white px-3 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-800 shadow-sm flex items-center gap-2 dark:bg-[#1a1a1a]"
                            >
                              {rejectTitle}
                              <button
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      `Undislike "${rejectTitle}"?`,
                                    )
                                  )
                                    return;
                                  const newRejects =
                                    profile.rejectedRecommendations.filter(
                                      (t: string) => t !== rejectTitle,
                                    );
                                  updateFirestoreProfile({
                                    rejectedRecommendations: newRejects,
                                  });
                                }}
                                className="text-red-400 hover:text-red-600 rounded-full transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {activeTab === "custom AI" && (
              <div className="space-y-6 animate-in fade-in">
                <h4 className="font-serif text-xl mb-2 text-neutral-900 dark:text-white">
                  Custom AI Services
                </h4>
                <p className="text-sm text-black/50 mb-4 dark:text-white/50">
                  Bring your own AI to power your recommendations. This feature
                  allows technical override of our models.
                </p>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-2">
                      AI Provider
                    </label>
                    <select 
                      value={localAiProvider}
                      onChange={(e) => handleSaveProvider(e.target.value)}
                      className="bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors w-full dark:bg-white/5"
                    >
                      <option value="gemini">Google Gemini (Default)</option>
                      <option value="openai">OpenAI GPT-4o (Custom)</option>
                      <option value="anthropic">Anthropic Claude (Custom)</option>
                      <option value="local_llm">Local LLM (WebLLM / Transformers)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-2">
                      API Key {localAiProvider === 'local_llm' ? '(Not Required for Local)' : ''}
                    </label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={localGeminiKey}
                      onChange={(e) => handleSaveTokens(e.target.value)}
                      disabled={localAiProvider === 'local_llm'}
                      className="w-full bg-black/5 border-transparent outline-none font-sans text-sm px-4 py-3 rounded-xl focus:bg-black/10 transition-colors dark:bg-white/5 disabled:opacity-50"
                    />
                    <p className="text-[11px] text-emerald-600 mt-2 font-medium">
                      If no key is provided, we use a 0-cost local vector-embedding search instead. Keep empty to save money!
                    </p>
                    {localAiProvider === 'openai' && (
                      <p className="text-[11px] text-black/50 mt-2 dark:text-white/50">
                        To use OpenAI, you need a developer account. <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white">Sign up here</a> and <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white">get your API key here</a>.
                      </p>
                    )}
                    {localAiProvider === 'anthropic' && (
                      <p className="text-[11px] text-black/50 mt-2 dark:text-white/50">
                        To use Anthropic Claude, you need a developer account. <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white">Sign up here</a> and <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white">get your API key here</a>.
                      </p>
                    )}
                    {localAiProvider === 'gemini' && (
                      <p className="text-[11px] text-black/50 mt-2 dark:text-white/50">
                        To use Google Gemini, you need a developer account. <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white">Sign up here</a> and <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white">get your API key here</a>.
                      </p>
                    )}

                    {localAiProvider === 'local_llm' && (
                      <div className="mt-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                         <h5 className="font-semibold text-sm mb-1">Local LLM Download</h5>
                         <p className="text-xs text-neutral-500 mb-3">Download a local model to run inference directly in your browser without API costs.</p>
                         <button className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-black text-xs font-semibold rounded-lg hover:opacity-80 transition-opacity">
                            Download Llama-3 (Browser-run)
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
