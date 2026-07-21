import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Star,
  Clock,
  DollarSign,
  Users,
  Hexagon,
  Plus,
  User,
  Sparkles,
  Navigation,
  Globe,
  Gamepad,
  Shirt,
  Utensils,
  HeartPulse,
  Tv,
  Headphones,
  BookOpen,
  PenTool,
  PartyPopper,
  ShoppingBag,
  SlidersHorizontal,
  Settings2,
  Heart,
  Database,
  X,
  Music,
  ArrowRight,
  Loader2,
  Info,
  ThumbsDown,
  ChevronDown,
  Compass,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useUserProfile, useUserItems } from "../hooks";
import RichCriticPortalModal from "./RichCriticPortalModal";
import { RecommendationModal } from "./RecommendationModal";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { TasteGraphDisplay } from "./TasteGraphDisplay";
import TasteProfileGenerator from "./TasteProfileGenerator";
import TasteProfileDisplay from "./TasteProfileDisplay";
import DilectiNavIcon from "./DilectiNavIcon";

const categories = [
  {
    name: "Food",
    id: "food",
    icon: Utensils,
    darkColor: "dark:text-[#14b8a6]",
    darkBorderHover: "dark:hover:border-[#14b8a6]/50",
  },
  {
    name: "Movies/TV",
    id: "watch",
    icon: Tv,
    darkColor: "dark:text-[#a855f7]",
    darkBorderHover: "dark:hover:border-[#a855f7]/50",
  },
  {
    name: "Music",
    id: "music",
    icon: Headphones,
    darkColor: "dark:text-[#ec4899]",
    darkBorderHover: "dark:hover:border-[#ec4899]/50",
  },
  {
    name: "Products",
    id: "products",
    icon: ShoppingBag,
    darkColor: "dark:text-[#f97316]",
    darkBorderHover: "dark:hover:border-[#f97316]/50",
  },
  {
    name: "Places",
    id: "places",
    icon: Globe,
    darkColor: "dark:text-[#10b981]",
    darkBorderHover: "dark:hover:border-[#10b981]/50",
  },
  {
    name: "Books",
    id: "books",
    path: "/zone/books",
    icon: BookOpen,
    darkColor: "dark:text-[#3b82f6]",
    darkBorderHover: "dark:hover:border-[#3b82f6]/50",
  },
  {
    name: "Events",
    id: "events",
    icon: Ticket,
    darkColor: "dark:text-[#eab308]",
    darkBorderHover: "dark:hover:border-[#eab308]/50",
  },
  {
    name: "Games/Sports",
    id: "games",
    icon: Gamepad,
    darkColor: "dark:text-[#06b6d4]",
    darkBorderHover: "dark:hover:border-[#06b6d4]/50",
  },
];

export default function DilectiHome() {
  const { user, loading } = useUser();
  const { profile, loadingProfile, updateProfile } = useUserProfile();
  const { userItems, saveItem } = useUserItems();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showRichCritic, setShowRichCritic] = useState(false);

  const [recommendations, setRecommendations] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("dilecti_home_recs");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [loadingRecs, setLoadingRecs] = useState(() => {
    try {
      return !localStorage.getItem("dilecti_home_recs");
    } catch (e) {
      return false;
    }
  });
  const fetchedContextRef = React.useRef<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRec, setSelectedRec] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [miniProfileCat, setMiniProfileCat] = useState<string>(
    (location.state as any)?.openGraphCat || "overall",
  );
  const [miniProfileContent, setMiniProfileContent] = useState<string>("");
  const [loadingMini, setLoadingMini] = useState(false);

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (userItems || []).forEach((item) => {
      let norm = (item.category || "other").toLowerCase();
      let cat = 'other';
      if (['books', 'book'].includes(norm)) cat = 'book';
      else if (['games', 'game', 'sports', 'games/sports'].includes(norm)) cat = 'game';
      else if (['places', 'place'].includes(norm)) cat = 'place';
      else if (['events', 'event'].includes(norm)) cat = 'event';
      else if (['products', 'product'].includes(norm)) cat = 'product';
      else if (['music'].includes(norm)) cat = 'music';
      else if (['food', 'restaurants', 'restaurant'].includes(norm)) cat = 'food';
      else if (['tvs', 'tv', 'movie', 'movies', 'watch', 'tv series', 'tv show', 'tv shows', 'tv & movies'].includes(norm)) cat = 'watch';
      
      if (cat !== 'other' && cat !== 'custom') {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [userItems]);

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map((c) => c[0]);

  const generateMiniProfile = async (cat: string, silent: boolean = false) => {
    if (!cat) return;
    if (!silent) setMiniProfileCat(cat);

    const normalizedCat = cat.toLowerCase();

    const catItems =
      userItems?.filter((i) => {
        if (normalizedCat === "overall") return true;
        if (normalizedCat.startsWith("theme-")) {
          const themeName = normalizedCat.substring(6);
          const keys = new Set<string>();
          if ((i as any).tags)
            (i as any).tags.forEach((t: string) => keys.add(t.toLowerCase()));
          if (i.metadata?.genres)
            i.metadata.genres.forEach((t: string) => keys.add(t.toLowerCase()));
          if (i.metadata?.keywords)
            i.metadata.keywords.forEach((t: string) =>
              keys.add(t.toLowerCase()),
            );
          if (keys.size === 0) {
            if (i.subCategory) keys.add(i.subCategory.toLowerCase());
            else if (i.subtitle) keys.add(i.subtitle.toLowerCase());
            else keys.add("uncategorized");
          }
          return keys.has(themeName);
        }
        let c = (i.category || "other").toLowerCase();
        return c === normalizedCat;
      }) || [];
    const subcounts: Record<string, number> = {};
    catItems.forEach((i) => {
      let key =
        normalizedCat === "overall" ? i.category || "other" : i.subCategory;
      if (key) {
        if (typeof key === "string") {
          const lowerKey = key.toLowerCase();
          if (lowerKey === "restaurants" || lowerKey === "restaurant")
            key = "Restaurants";
          else if (lowerKey === "games" || lowerKey === "game") key = "Games";
          else if (lowerKey === "movies" || lowerKey === "movie")
            key = "Movies";
          else if (lowerKey === "books" || lowerKey === "book") key = "Books";
          else key = key.charAt(0).toUpperCase() + key.slice(1);
        }
        subcounts[key] = (subcounts[key] || 0) + 1;
      }
    });

    const metrics = {
      totalSaved: catItems.length,
      favorites: catItems.filter(
        (i) => i.reaction === "love" || (i.rating || 0) > 7,
      ).length,
      subcategories: subcounts,
    };

    const currentHash = `${Math.floor(metrics.totalSaved / 5)}-${Math.floor(metrics.favorites / 3)}-${Math.floor(Object.keys(subcounts).length / 2)}`;
    const cached = profile?.miniProfiles?.[cat];

    if (catItems.length < 3 && normalizedCat !== "overall") {
      if (!silent)
        setMiniProfileContent(
          "Not enough data to analyze yet. Add a few more items!",
        );
      return;
    }

    if (
      cached &&
      cached.hash === currentHash &&
      Date.now() - cached.generatedAt < 1000 * 60 * 60 * 24 * 7
    ) {
      if (!silent) setMiniProfileContent(cached.content);
      return;
    }

    if (!silent) {
      setLoadingMini(true);
      setMiniProfileContent("");
    }

    try {
      const res = await fetch("/api/generate-mini-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: cat,
          items: catItems,
          metrics,
          demographicsContext: profile?.demographics || {},
          previousNarrative: profile?.miniProfiles?.[cat]?.content || '',
          userName: profile?.displayName || user?.displayName || "The user"
        }),
      });
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      
      let isValidProfile = false;
      try {
        if (data.narrative) {
          let parsed = null;
          const cleanText = data.narrative.trim();
          if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
            parsed = JSON.parse(cleanText);
          } else {
            const match = cleanText.match(/\{[\s\S]*\}/);
            if (match) {
              parsed = JSON.parse(match[0]);
            }
          }
          if (parsed && parsed.title) {
            isValidProfile = true;
          }
        }
      } catch (e) {
        console.warn("DilectiHome: Returned narrative is not valid JSON profile:", e);
      }

      if (data.error && !silent) {
         window.dispatchEvent(new CustomEvent('toast-alert', { detail: { message: `AI Error: ${data.error}`, type: 'error' } }));
      }

      if (isValidProfile) {
        if (!silent) setMiniProfileContent(data.narrative);

        if (updateProfile) {
          updateProfile({
            miniProfiles: {
              ...(profile?.miniProfiles || {}),
              [cat]: {
                hash: currentHash,
                content: data.narrative,
                generatedAt: Date.now(),
              },
            },
          });
        }
      } else {
        if (!silent) {
          const prev = profile?.miniProfiles?.[cat]?.content;
          if (prev) {
            setMiniProfileContent(prev);
          } else {
            setMiniProfileContent("Could not analyze at this time.");
          }
        }
      }
    } catch (e) {
      console.error(e);
      if (!silent) {
        const prev = profile?.miniProfiles?.[cat]?.content;
        if (prev) {
          setMiniProfileContent(prev);
        } else {
          setMiniProfileContent("Could not analyze at this time.");
        }
      }
    } finally {
      if (!silent) setLoadingMini(false);
    }
  };



  const handleInvite = () => {
    try {
      navigator.clipboard.writeText(
        "https://ais-dev-xpfmxqo6frdtvjbwifmbpy-184163339409.us-east1.run.app",
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {}
  };

  useEffect(() => {
    const handleOpenRec = (e: Event) => {
      setSelectedRec((e as CustomEvent).detail);
    };
    const handleSetTasteCategory = (e: Event) => {
      const cat = (e as CustomEvent).detail;
      const catMapping = cat === "Overall" ? "overall" : cat;
      generateMiniProfile(catMapping);
    };
    window.addEventListener("open-recommendation", handleOpenRec);
    window.addEventListener("set-taste-category", handleSetTasteCategory);
    return () => {
      window.removeEventListener("open-recommendation", handleOpenRec);
      window.removeEventListener("set-taste-category", handleSetTasteCategory);
    };
  }, [userItems]);

  const handleCategoryClick = (category: any) => {
    if (category.path) {
      navigate(category.path);
    } else {
      navigate(`/zone/${category.id}`);
    }
  };

  const getCategoryIcon = (catId: string) => {
    const found = categories.find(
      (c) => c.id === catId || c.name.toLowerCase() === catId,
    );
    return found ? found.icon : Star;
  };

  const handleReject = (rec: any, reason: string) => {
    if (!updateProfile || !profile) return;
    const newRecs = recommendations.filter((r) => r.title !== rec.title);
    setRecommendations(newRecs);
    try {
      localStorage.setItem("dilecti_home_recs", JSON.stringify(newRecs));
    } catch (e) {}

    const rejected = profile.rejectedRecommendations || [];
    rejected.push(rec.title);

    const currentPrefs = profile.preferences || "";
    const updatedPrefs =
      currentPrefs + `\nI did not like ${rec.title} because ${reason}`;

    updateProfile({
      cachedRecommendations: newRecs,
      rejectedRecommendations: rejected,
      preferences: updatedPrefs,
    });
  };

  const activeRecs = recommendations.filter((r) => {
    if (profile?.rejectedRecommendations?.includes(r.title)) return false;
    if (userItems?.some((i) => i.title.toLowerCase() === r.title.toLowerCase()))
      return false;
    if (selectedCategory && r.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#070b15] text-neutral-900 dark:text-neutral-100 font-sans relative transition-colors selection:bg-emerald-500/30 overflow-x-hidden">
      <main className="w-full mx-auto flex flex-col items-center relative z-10">
        {/* Above the Fold Container */}
        <div className="w-full flex flex-col h-auto mb-6 md:mb-12">
          
          {/* Hero Section */}
          <div className="relative w-full flex flex-col items-center justify-start h-[45vh] min-h-[320px] max-h-[450px] md:h-[55vh] md:min-h-[450px] md:max-h-[600px] lg:h-[65vh] lg:max-h-[700px] z-0">
            {/* Background Image */}
            <div className="absolute inset-0 w-full h-full pointer-events-none -z-10">
              <img
                src="/boat-with-stars.png"
                alt="Hero Background"
                className="w-full h-full object-cover object-[center_35%] sm:object-[center_30%] md:object-[center_35%] lg:object-[center_35%] opacity-100 dark:invert dark:hue-rotate-180 dark:opacity-80"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Fade to background color at the bottom - Desktop only */}
              <div className="hidden md:block absolute bottom-0 left-0 w-full h-24 lg:h-32 bg-gradient-to-t from-[#fafafa] dark:from-[#070b15] to-transparent"></div>
            </div>

            {/* Text Overlay - Removed for desktop */}
          </div>

          {/* Buttons Section */}
          <div className="w-full max-w-5xl mx-auto flex-1 md:flex-none flex flex-col items-center justify-center min-h-0 relative z-20 px-4 sm:px-0">
            {/* Search Action Bar */}
            <div className="w-full max-w-lg md:max-w-2xl mx-auto mb-5 md:mb-6 shrink-0 -mt-20 sm:-mt-28 md:-mt-20 lg:-mt-24">
              <div
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-ask-for-ideas"))
                }
                className="bg-white/95 dark:bg-[#09090b]/90 backdrop-blur-md border border-neutral-200 dark:border-white/10 hover:border-emerald-500/50 rounded-full p-4 md:p-5 flex items-center gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-md transition-all font-sans cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-purple-500/5 to-orange-500/5 hidden dark:block opacity-50"></div>
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform relative z-10" />
                <span className="flex-1 bg-transparent text-[14px] md:text-[15px] font-medium text-neutral-500 dark:text-neutral-400 text-left relative z-10 whitespace-nowrap overflow-hidden text-ellipsis">
                  Ask Dilecti for recommendations...
                </span>
              </div>
            </div>

            {/* Categories */}
            <div className="w-full max-w-lg md:max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative flex-1 min-h-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`bg-[#111111] hover:bg-[#2A2A2D] dark:bg-[#111]/80 dark:hover:bg-[#111] dark:backdrop-blur-md text-white rounded-xl cursor-pointer px-4 py-3.5 transition-all duration-200 active:scale-95 flex flex-row items-center justify-start text-left gap-3 font-medium shadow-sm border border-transparent dark:border-white/5 group h-full`}
                >
                  <cat.icon
                    className={`w-4 h-4 md:w-5 md:h-5 shrink-0 text-white/90 transition-colors duration-300 font-light`}
                    strokeWidth={1.5}
                  />
                  <span className="text-[14px] md:text-[15px] font-normal tracking-wide">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Taste Profile Prompt */}
        {profile && (
          <div className="w-full max-w-4xl mx-auto px-2 mb-12 md:mb-20 z-20">
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-3xl p-6 sm:p-8 border border-emerald-100 dark:border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center gap-6 text-left">
                <div className="bg-emerald-100 p-3 rounded-full hidden sm:block shrink-0 dark:bg-emerald-900">
                  <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold font-serif text-emerald-950 mb-1.5 dark:text-emerald-50">
                    {!profile.demographics || !profile.preferences
                      ? "Complete your Taste Profile"
                      : "Refine your Taste Profile"}
                  </h3>
                  <p className="text-base text-emerald-700/80 max-w-xl leading-relaxed">
                    {!profile.demographics || !profile.preferences
                      ? "Take a quick quiz or share some demographics to get highly personalized recommendations out of the gate."
                      : "Update your demographics or retake the taste quiz anytime to keep Dilecti's recommendations precisely tuned to you."}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  window.dispatchEvent(new Event("open-taste-profile"))
                }
                className="bg-emerald-900 hover:bg-emerald-950 text-white px-8 py-3 rounded-xl font-semibold transition-colors active:scale-95 whitespace-nowrap w-full sm:w-auto shadow-md text-base"
              >
                {!profile.demographics || !profile.preferences
                  ? "Tell Dilecti"
                  : "Update Profile"}
              </button>
            </div>
          </div>
        )}

        {/* Graph Background & Map Display */}
        {userItems && userItems.length >= 5 && (
          <div className="w-full relative overflow-visible flex flex-col items-center">
            <div className="w-full max-w-4xl mx-auto relative z-10 px-2 mt-0 md:mt-8 mb-8 md:mb-16">
              <TasteGraphDisplay
                items={userItems}
                value={
                  miniProfileCat === "overall" ? "Overall" : miniProfileCat
                }
                onChange={(cat) => {
                  const catMapping = cat === "Overall" ? "overall" : cat;
                  generateMiniProfile(catMapping);
                }}
                onToggleFavorite={async (id: string, isFav: boolean) => {
                  const it = userItems.find((x) => x.id === id);
                  if (it)
                    await saveItem({
                      ...it,
                      reaction: isFav ? "like" : "love",
                    });
                }}
                insightText={miniProfileContent}
                isLoadingInsight={loadingMini}
                onInsightClick={() => {
                  window.dispatchEvent(new Event("open-taste-profile"));
                }}
              />
            </div>
          </div>
        )}

        {/* Enrich Taste Profile Widget (Only shown if needs rich profile data) */}
        {(!profile?.demographics ||
          Object.keys(profile.demographics).length === 0 ||
          (userItems?.length || 0) < 5) && (
          <div className="w-full max-w-4xl mx-auto mb-8 md:mb-16 px-4">
            <div className="bg-gradient-to-br from-indigo-50/80 to-indigo-100/50 rounded-[2rem] p-8 lg:p-12 border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-sm dark:border-indigo-800">
              <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="flex-1 relative z-10 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/60 text-indigo-800 text-xs font-bold uppercase tracking-widest rounded-full mb-4 border border-indigo-100/50 dark:text-indigo-200">
                  <Sparkles className="w-3 h-3" /> Taste Graph 2.0
                </div>
                <h2 className="font-serif text-3xl md:text-5xl font-bold text-neutral-900 mb-4 tracking-tight leading-tight dark:text-white">
                  Enrich Your <br className="hidden md:block" />
                  Taste Profile
                </h2>
                <p className="text-neutral-600 font-medium max-w-xl mx-auto md:mx-0 mb-8 leading-relaxed text-lg dark:text-neutral-400">
                  The more you explore, rate, and define your tastes, the more
                  accurate and surprising Dilecti's recommendations become. Map
                  your aesthetic.
                </p>
                <button
                  onClick={() =>
                    window.dispatchEvent(new Event("open-taste-quiz"))
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-full transition-all active:scale-95 inline-flex items-center gap-2 shadow-md hover:shadow-lg w-full sm:w-auto justify-center"
                >
                  <Hexagon className="w-5 h-5 fill-indigo-400" /> Go to Taste
                  Graph
                </button>
              </div>

              {/* Visual particle representation */}
              <div className="relative w-40 h-40 md:w-56 md:h-56 shrink-0 z-10 mt-4 md:mt-0">
                <div className="absolute inset-0 bg-white/40 rounded-full animate-pulse border-2 border-white shadow-xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 border-4 border-white" />
                {/* Orbit dots */}
                <div
                  className="absolute top-6 left-10 w-4 h-4 bg-amber-400 rounded-full shadow-sm animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="absolute bottom-10 right-6 w-6 h-6 bg-indigo-500 rounded-full shadow-sm animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="absolute top-12 right-10 w-3 h-3 bg-rose-400 rounded-full shadow-sm animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
                <div
                  className="absolute bottom-8 left-8 w-5 h-5 bg-sky-400 rounded-full shadow-sm animate-bounce"
                  style={{ animationDelay: "450ms" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Build your network section */}
        <div className="w-full max-w-4xl mx-auto mb-16 px-4">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/50 rounded-3xl p-8 md:p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-6 border border-emerald-100 dark:bg-[#1a1a1a] dark:border-emerald-900">
              <span className="flex">
                <User className="w-5 h-5 text-emerald-600 -mr-1 dark:text-emerald-400" />
                <User className="w-5 h-5 text-emerald-600 top-1 relative dark:text-emerald-400" />
                <User className="w-5 h-5 text-emerald-600 -ml-1 dark:text-emerald-400" />
              </span>
            </div>
            <h3 className="font-serif text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight mb-4 dark:text-white">
              Curate Your Circle
            </h3>
            <p className="text-neutral-600 mb-8 text-base md:text-lg leading-relaxed max-w-2xl mx-auto dark:text-neutral-400">
              Invite friends, follow trusted tastemakers, and build custom
              groups to get exactly the recommendations you want.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                onClick={handleInvite}
                className="bg-white border border-neutral-200 hover:border-emerald-500 hover:text-emerald-700 text-neutral-800 font-semibold py-3 px-6 rounded-xl transition-all shadow-sm w-full sm:w-auto dark:bg-[#1a1a1a] dark:text-neutral-200 dark:border-white/10"
              >
                {copiedLink ? "Link Copied!" : "Invite Friends"}
              </button>
              <button
                onClick={() => navigate("/discover")}
                className="bg-white border border-neutral-200 hover:border-emerald-500 hover:text-emerald-700 text-neutral-800 font-semibold py-3 px-6 rounded-xl transition-all shadow-sm w-full sm:w-auto dark:bg-[#1a1a1a] dark:text-neutral-200 dark:border-white/10"
              >
                Discover Creators
              </button>
            </div>
          </div>
        </div>
      </main>

      <RichCriticPortalModal
        isOpen={showRichCritic}
        onClose={() => setShowRichCritic(false)}
      />

      {/* Selected Recommendation Modal */}
      <RecommendationModal
        selectedRec={selectedRec}
        setSelectedRec={setSelectedRec}
        onReject={handleReject}
        saveItem={(item) => {
          saveItem(item);

          // Immediately remove it from the "Curated For You" array
          if (item.title) {
            const newRecs = recommendations.filter(
              (r) => r.title !== item.title,
            );
            setRecommendations(newRecs);
            try {
              localStorage.setItem(
                "dilecti_home_recs",
                JSON.stringify(newRecs),
              );
            } catch (e) {}

            if (updateProfile && profile) {
              updateProfile({
                cachedRecommendations: newRecs,
              });
            }
          }
        }}
      />
    </div>
  );
}
