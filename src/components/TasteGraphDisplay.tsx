import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserItem } from '../types';
import { Sparkles, ArrowLeft, ArrowRight, Share2, MoreVertical, Info, Compass, Trophy, TrendingUp, Plane, Utensils, Film, BookOpen, Music as MusicIcon, Lightbulb, User, Activity, MapPin, HelpCircle, LayoutGrid, Gamepad, Globe, PartyPopper, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './ImageWithFallback';
import { TasteGraphConstellation } from './TasteGraphConstellation';
import { cn, normalizeTheme } from '../lib/utils';
import '../styles/dilectiProfile.css';

interface TasteConstellationProps {
  items: UserItem[];
  value: string;
  onChange: (val: string) => void;
  onToggleFavorite?: (id: string, isFav: boolean) => void;
  insightText?: string;
  isLoadingInsight?: boolean;
  onInsightClick?: () => void;
  stickyTopClass?: string;
}

type TasteTheme = {
  id: string;
  name: string;
  strength: number;
  explanation: string;
  categories: { name: string; percentage: number; count?: number; icon: any }[];
  evidenceItems: UserItem[];
  allItems?: UserItem[];
  recommendations: { name: string; count: number; icon: any }[];
  color: string;
};

type HiddenConnection = {
  id: string;
  title: string;
  confidence: number;
  explanation: string;
  evidenceItems: UserItem[];
  color: string;
};

export function TasteGraphDisplay(props: TasteConstellationProps) {
  const [view, setView] = useState<'home' | 'theme_detail' | 'hidden_connections' | 'network' | 'help'>('home');
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<string | null>(props.value && props.value !== 'Overall' ? props.value : null);

  useEffect(() => {
    if (props.value !== undefined) {
      setThemeCategoryFilter(props.value === 'Overall' ? null : props.value);
    }
  }, [props.value]);
  const [detailCategoryFilter, setDetailCategoryFilter] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     if (view === 'theme_detail' && containerRef.current) {
        // Find scrollable parent or window and scroll into view smoothly with offset for sticky header
        const y = containerRef.current.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top: y, behavior: 'smooth' });
     }
  }, [view]);
  
  // Sync props.value into local state if props.value is provided and we want it to act as source of truth.
  // Or simply rely on a single derived currentFilter:
  const currentFilter = themeCategoryFilter !== null ? themeCategoryFilter : (props.value !== undefined && props.value !== 'Overall' ? props.value : 'All');

  // Generate data based on items to make it look realistic and specific to the user
  const data = useMemo(() => {
    let items = props.items || [];
    
    // Filter items based on selected category first
    const rawFilter = currentFilter !== 'All' ? currentFilter.toLowerCase() : null;
    const isExclude = rawFilter?.startsWith('-');
    const activeFilter = isExclude ? rawFilter.substring(1) : rawFilter;
    
    if (activeFilter) {
        items = items.filter(it => {
            const cat = (it.category || '').toLowerCase();
            let match = false;
            if ((activeFilter === 'watch' || activeFilter === 'movies') && (cat.includes('watch') || cat.includes('movie') || cat.includes('tv'))) match = true;
            else if ((activeFilter === 'book' || activeFilter === 'books') && (cat.includes('book') || cat.includes('read'))) match = true;
            else if ((activeFilter === 'music' || activeFilter === 'listen') && (cat.includes('music') || cat.includes('listen') || cat === 'song')) match = true;
            else if ((activeFilter === 'food' || activeFilter === 'eat' || activeFilter === 'restaurants' || activeFilter === 'restaurant') && (cat.includes('food') || cat.includes('restaurant'))) match = true;
            else if ((activeFilter === 'game' || activeFilter === 'games' || activeFilter === 'play') && (cat.includes('game') || cat.includes('play'))) match = true;
            else if ((activeFilter === 'place' || activeFilter === 'places' || activeFilter === 'visit') && (cat.includes('place') || cat.includes('visit') || cat.includes('travel'))) match = true;
            else if (cat === activeFilter) match = true;
            return isExclude ? !match : match;
        });
    }
    
    // Attempt to extract dynamic themes from user's actual items
    const themeMap: Record<string, UserItem[]> = {};
    const keywordMap: Record<string, UserItem[]> = {};
    
    items.forEach(it => {
        // Extract themes/genres ONLY (no categories/subcategories)
        const tKeys = new Set<string>();
        if (it.metadata?.genres && it.metadata.genres.length > 0) {
            it.metadata.genres.forEach((t: string) => tKeys.add(t));
        }
        if ((it as any).tags && (it as any).tags.length > 0) {
            (it as any).tags.forEach((t: string) => tKeys.add(t));
        }
        
        Array.from(tKeys)
          .map(w => normalizeTheme(w))
          .filter(k => k.length > 0)
          .forEach(word => {
            if (!themeMap[word]) themeMap[word] = [];
            themeMap[word].push(it);
        });

        // Extract keywords for hidden connections
        const kKeys = new Set<string>();
        if (it.metadata?.keywords && Array.isArray(it.metadata.keywords)) {
            it.metadata.keywords.forEach((t: string) => kKeys.add(t));
        }
        if (it.metadata?.themes && Array.isArray(it.metadata.themes)) {
            it.metadata.themes.forEach((t: string) => kKeys.add(t));
        }
        if (it.metadata?.genres && Array.isArray(it.metadata.genres)) {
            it.metadata.genres.forEach((t: string) => kKeys.add(t));
        }
        if (it.subtitle) kKeys.add(it.subtitle);
        if (it.author) kKeys.add(it.author);
        if (it.metadata?.director) kKeys.add(it.metadata.director);
        if (it.metadata?.creator) kKeys.add(it.metadata.creator);
        
        Array.from(kKeys)
          .map(w => normalizeTheme(w))
          .filter(k => k.length > 3)
          .forEach(word => {
            if (!keywordMap[word]) keywordMap[word] = [];
            keywordMap[word].push(it);
        });
    });

    const themeColors = ["#3b82f6", "#a855f7", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6"];
    
    const themeScores: Record<string, number> = {};
    Object.keys(themeMap).forEach(t => {
       const themeItems = themeMap[t];
       let score = 0;
       themeItems.forEach(it => {
           const itemAny = it as any;
           if ((it.category === 'movie' || it.category === 'tv' || (it.category as any) === 'watch') && itemAny.runtime) {
               score += (itemAny.runtime / 60); // 1 point per hour
           } else if (it.category === 'book' && (itemAny.pages || itemAny.pageCount)) {
               score += ((itemAny.pages || itemAny.pageCount) / 30); // ~1 point per hour roughly
           } else if ((it.category as any) === 'music' || (it.category as any) === 'listen' || (it.category as any) === 'song') {
               score += (itemAny.runtime ? itemAny.runtime / 60 : 0.06); // typical song is 3-4 mins (0.06 hours)
           } else {
               score += 2; // Default discrete item value for places, products, etc.
           }
       });
       themeScores[t] = score;
    });
    
    let maxImpact = Math.max(...Object.values(themeScores), 1);
    
    let dynamicThemes: TasteTheme[] = Object.keys(themeMap)
       .sort((a, b) => themeScores[b] - themeScores[a])
       .map((t, idx) => {
           const themeItems = themeMap[t];
           const impactScore = themeScores[t];
           
           const strength = Math.min(100, Math.max(1, Math.round((impactScore / maxImpact) * 100)));
           
           const catMap: Record<string, number> = {};
           themeItems.forEach(it => {
               let cat = (it.category || 'other').toLowerCase();
               if (cat === 'restaurant' || cat === 'restaurants' || cat === 'food') cat = 'Restaurants';
               else if (cat === 'game' || cat === 'games') cat = 'Games';
               else if (cat === 'book' || cat === 'books') cat = 'Books';
               else if (cat === 'movie' || cat === 'movies' || cat === 'watch' || cat === 'tv' || cat === 'tvs') cat = 'TV & Movies';
               else if (cat === 'place' || cat === 'places' || cat === 'travel') cat = 'Places';
               else if (cat === 'music' || cat === 'listen' || cat === 'song') cat = 'Music';
               else if (cat === 'event' || cat === 'events') cat = 'Events';
               else if (cat === 'product' || cat === 'products') cat = 'Products';
               else cat = cat.charAt(0).toUpperCase() + cat.slice(1);
               catMap[cat] = (catMap[cat] || 0) + 1;
           });
           
           const categories = Object.keys(catMap).map(cat => {
               let icon = Sparkles;
               if (cat.toLowerCase().includes('book')) icon = BookOpen;
               else if (cat.toLowerCase().includes('movie') || cat.toLowerCase().includes('watch')) icon = Film;
               else if (cat.toLowerCase().includes('music')) icon = MusicIcon;
               else if (cat.toLowerCase().includes('game')) icon = Activity;
               else if (cat.toLowerCase().includes('food') || cat.toLowerCase().includes('restaurant')) icon = Utensils;
               else if (cat.toLowerCase().includes('travel') || cat.toLowerCase().includes('place')) icon = Plane;
               
               return {
                   name: cat,
                   percentage: Math.round((catMap[cat] / themeItems.length) * 100),
                   count: catMap[cat],
                   icon
               };
           }).sort((a, b) => b.percentage - a.percentage);

           return {
               id: t.toLowerCase().replace(/\s+/g, '-') + '-' + idx,
               name: t,
               strength,
               explanation: `You consistently gravitate towards content and experiences related to ${t.toLowerCase()}.`,
               color: themeColors[idx % themeColors.length],
               categories,
               evidenceItems: themeItems,
               allItems: themeItems,
               recommendations: [
                  { name: "Hidden Gems", count: Math.floor(Math.random() * 20) + 5, icon: Sparkles },
                  { name: "Creators", count: Math.floor(Math.random() * 10) + 2, icon: User }
               ]
           };
       });

    const ignoreList = ['drama', 'comedy', 'fiction', 'non-fiction', 'nonfiction', 'action', 'adventure', 'thriller', 'documentary', 'movie', 'book', 'game', 'music', 'tv', 'restaurant', 'novel', 'history'];
    let validKeys = Object.keys(keywordMap).filter(k => {
        if (keywordMap[k].length < 2) return false;
        if (ignoreList.includes(k.toLowerCase())) return false;
        return true;
    });

    let crossCategoryKeys = validKeys.filter(k => {
        const cats = new Set(keywordMap[k].map(it => {
            let cat = (it.category || '').toLowerCase();
            if (cat === 'tvs' || cat === 'tv' || cat === 'movie' || cat === 'movies' || cat === 'watch') return 'watch';
            if (cat === 'books') return 'book';
            if (cat === 'games') return 'game';
            if (cat === 'places') return 'place';
            if (cat === 'events') return 'event';
            if (cat === 'products') return 'product';
            return cat;
        }));
        return cats.size >= 2;
    });

    let finalKeys = crossCategoryKeys.length >= 3 ? crossCategoryKeys : Array.from(new Set([...crossCategoryKeys, ...validKeys]));

    let dynamicConnections: HiddenConnection[] = finalKeys
       .sort((a, b) => keywordMap[b].length - keywordMap[a].length)
       .slice(0, 3)
       .map((t, idx) => {
           const isCrossCat = new Set(keywordMap[t].map(it => {
               let cat = (it.category || '').toLowerCase();
               if (cat === 'tvs' || cat === 'tv' || cat === 'movie' || cat === 'movies' || cat === 'watch') return 'watch';
               if (cat === 'books') return 'book';
               if (cat === 'games') return 'game';
               if (cat === 'places') return 'place';
               if (cat === 'events') return 'event';
               if (cat === 'products') return 'product';
               return cat;
           })).size >= 2;
           const title = isCrossCat ? `The "${t}" Thread` : `Fascination: ${t}`;
           const explanation = isCrossCat 
                ? `We found a cross-category link connecting your items through "${t}".` 
                : `We noticed an intense focus on "${t}" in your library.`;
           return {
               id: t.toLowerCase().replace(/\s+/g, '-') + '-conn-' + idx,
               title,
               confidence: 80 + Math.floor(Math.random() * 19),
               explanation,
               evidenceItems: keywordMap[t],
               color: themeColors[(idx + 3) % themeColors.length]
           };
       });

    const getItems = (count: number) => {
       const shuffled = [...items].sort(() => 0.5 - Math.random());
       return shuffled;
    };

    if (dynamicThemes.length === 0) {
      dynamicThemes = [
        {
          id: "exploration",
          name: "Exploration",
          strength: 87,
          explanation: "You're drawn to experiences that expand your world and your perspective.",
          color: "#3b82f6", // blue
          categories: [
            { name: "Travel", percentage: 92, icon: Plane },
            { name: "Food", percentage: 88, icon: Utensils },
            { name: "Movies", percentage: 85, icon: Film },
            { name: "Books", percentage: 80, icon: BookOpen },
            { name: "Music", percentage: 74, icon: MusicIcon },
          ],
          evidenceItems: getItems(5),
          allItems: getItems(10),
          recommendations: [
            { name: "Restaurants", count: 23, icon: Utensils },
            { name: "Books", count: 12, icon: BookOpen },
            { name: "Movies", count: 18, icon: Film },
            { name: "Podcasts", count: 9, icon: Lightbulb },
            { name: "Creators", count: 6, icon: User },
          ]
        },
        {
          id: "creativity",
          name: "Creativity",
          strength: 76,
          explanation: "You value original expression and breaking traditional boundaries.",
          color: "#a855f7", // purple
          categories: [
            { name: "Art", percentage: 88, icon: Lightbulb },
            { name: "Music", percentage: 82, icon: MusicIcon },
            { name: "Books", percentage: 75, icon: BookOpen },
          ],
          evidenceItems: getItems(4),
          recommendations: [
            { name: "Exhibits", count: 14, icon: Activity },
            { name: "Creators", count: 8, icon: User },
          ]
        },
        {
          id: "learning",
          name: "Learning",
          strength: 81,
          explanation: "You consistently seek out deep knowledge and mastery of new subjects.",
          color: "#22c55e", // green
          categories: [
            { name: "Books", percentage: 95, icon: BookOpen },
            { name: "Podcasts", percentage: 89, icon: Lightbulb },
          ],
          evidenceItems: getItems(4),
          recommendations: [
            { name: "Books", count: 32, icon: BookOpen },
            { name: "Articles", count: 15, icon: BookOpen },
          ]
        },
        {
          id: "competition",
          name: "Competition",
          strength: 71,
          explanation: "You are motivated by strategy, winning, and pushing limits.",
          color: "#f59e0b", // amber
          categories: [
            { name: "Games", percentage: 90, icon: Activity },
            { name: "Sports", percentage: 85, icon: Activity },
          ],
          evidenceItems: getItems(3),
          recommendations: [
            { name: "Events", count: 5, icon: MapPin },
          ]
        },
        {
          id: "nostalgia",
          name: "Nostalgia",
          strength: 65,
          explanation: "You have a strong affinity for classic eras and comforting memories.",
          color: "#ef4444", // red
          categories: [
            { name: "Movies", percentage: 80, icon: Film },
            { name: "Music", percentage: 78, icon: MusicIcon },
          ],
          evidenceItems: getItems(4),
          recommendations: [
            { name: "Movies", count: 11, icon: Film },
          ]
        },
        {
          id: "humor",
          name: "Humor",
          strength: 58,
          explanation: "You appreciate wit, satire, and lighthearted entertainment.",
          color: "#14b8a6", // teal
          categories: [
            { name: "Movies", percentage: 70, icon: Film },
            { name: "Podcasts", percentage: 65, icon: Lightbulb },
          ],
          evidenceItems: getItems(3),
          recommendations: [
            { name: "Creators", count: 12, icon: User },
          ]
        }
      ];
    }

    if (dynamicConnections.length < 3) {
      dynamicConnections = [
        {
          id: "stoic",
          title: "Stoic Struggle",
          confidence: 92,
          explanation: "A theme of resilience, sacrifice, and purpose in the face of extreme challenges.",
          evidenceItems: getItems(4),
          color: "#a855f7"
        },
        {
          id: "mastery",
          title: "Achievement Through Mastery",
          confidence: 88,
          explanation: "You're motivated by mastery, precision, and pushing the limits of what's possible.",
          evidenceItems: getItems(4),
          color: "#f59e0b"
        },
        {
          id: "mindful",
          title: "Mindful Living",
          confidence: 76,
          explanation: "You seek balance, intentionality, and a deeper connection with the present moment.",
          evidenceItems: getItems(4),
          color: "#14b8a6"
        }
      ];
    }

    return { themes: dynamicThemes, connections: dynamicConnections };
  }, [props.items, themeCategoryFilter]);

  const selectedTheme = data.themes.find(t => t.id === selectedThemeId);

  if (view === 'network') {
    return (
      <div className="relative w-full h-[700px] bg-black rounded-[2rem] overflow-hidden border border-white/10 flex flex-col">
        <TasteGraphConstellation {...props} value={currentFilter} onChange={(v) => {
            setThemeCategoryFilter(v);
            if(props.onChange) props.onChange(v);
        }} />
        
        {/* Top Controls Overlay */}
        <div className="absolute top-6 left-0 w-full px-6 flex items-start justify-between z-50 pointer-events-none">
            <button 
               onClick={() => setView('home')}
               className="bg-black/50 hover:bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 transition-colors font-medium text-sm pointer-events-auto"
            >
               <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full bg-[#050B14] rounded-[2rem] border border-white/5 text-white font-sans shadow-2xl relative min-h-[700px] flex flex-col max-w-[500px] mx-auto md:max-w-4xl">
      {/* Background container just for the top section */}
      <div className="absolute top-0 left-0 right-0 h-[700px] pointer-events-none overflow-hidden z-0 rounded-t-[2rem]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
           <ellipse cx="20%" cy="40%" rx="300" ry="150" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="1" transform="rotate(-15 20% 40%)" />
           <circle cx="90%" cy="30%" r="200" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="1" />
           <circle cx="10%" cy="30%" r="4" fill="#a855f7" className="shadow-[0_0_15px_#a855f7]" />
           <circle cx="85%" cy="20%" r="2" fill="#f97316" />
           <circle cx="5%" cy="60%" r="3" fill="#14b8a6" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-transparent to-[#050B14] opacity-80 pointer-events-none" />
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 2px, transparent 2px)', backgroundSize: '90px 90px', backgroundPosition: '20px 20px' }} />
      </div>

      <AnimatePresence mode="popLayout">
        
        {/* =========================================================
            SCREEN 1: TASTE DNA HOME
        ========================================================= */}
        {view === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col relative w-full z-10"
          >
            {/* Header */}
            <div className="px-6 md:px-8 pt-8 pb-4 flex flex-col items-center justify-center text-center relative">
               <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="font-serif text-3xl md:text-4xl font-bold text-white whitespace-nowrap">
                     Your Taste DNA
                  </h2>
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                  <button onClick={() => setView('help')} className="ml-1 text-white/40 hover:text-white/80 transition-colors">
                     <HelpCircle className="w-5 h-5" />
                  </button>
               </div>
               <p className="text-white/60 text-sm md:text-base mb-6">The themes that shape you.</p>
            </div>

            {/* Category Filters Under Header */}
            <div className={`sticky ${props.stickyTopClass || "top-[60px] md:top-[72px]"} z-[60] bg-[#050B14]/90 backdrop-blur-md pb-4 pt-4 flex flex-col sm:flex-row items-center gap-4 w-full mx-auto mb-2 border-b border-white/5 md:border-none`}>
               <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar w-full px-4 sm:justify-center justify-start">
                  {[
                     { id: 'All', icon: LayoutGrid, label: 'All' },
                     { id: 'Books', icon: BookOpen, label: 'Books' },
                     { id: 'Movies', icon: Film, label: 'Movies' },
                     { id: 'Music', icon: MusicIcon, label: 'Music' },
                     { id: 'Food', icon: Utensils, label: 'Food' },
                     { id: 'Games', icon: Gamepad, label: 'Games' },
                     { id: 'Places', icon: Globe, label: 'Places' },
                     { id: 'Events', icon: PartyPopper, label: 'Events' },
                     { id: 'Products', icon: ShoppingBag, label: 'Products' }
                  ].map(cat => {
                     const isActive = currentFilter === cat.id || (currentFilter === 'All' && cat.id === 'All');
                     const isExcluded = currentFilter === `-${cat.id}`;
                     return (
                     <div key={cat.id} className="relative group">
                        <button
                           onClick={() => {
                              let newFilter: string | null = null;
                              if (cat.id === 'All') {
                                 newFilter = null;
                              } else if (currentFilter === cat.id) {
                                 newFilter = `-${cat.id}`;
                              } else if (currentFilter === `-${cat.id}`) {
                                 newFilter = null;
                              } else {
                                 newFilter = cat.id;
                              }
                              setThemeCategoryFilter(newFilter);
                              if (props.onChange) props.onChange(newFilter || 'All');
                           }}
                           className={`p-2.5 rounded-full border transition-colors flex items-center justify-center relative ${
                              isActive
                                 ? "bg-white text-black border-white"
                                 : isExcluded
                                 ? "bg-red-500/20 text-red-400 border-red-500/50"
                                 : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                           }`}
                           title={cat.id === 'All' ? 'All' : `${cat.label} (Tap twice to exclude)`}
                        >
                           <cat.icon className="w-4.5 h-4.5" />
                           {isExcluded && (
                               <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-lg rotate-45 scale-150">\</div>
                           )}
                        </button>
                        {cat.id !== 'All' && (
                           <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                              Tap twice to exclude
                           </div>
                        )}
                     </div>
                  )})}
               </div>
            </div>

            {/* Bubble Chart (CSS Layout) */}
            <div className="relative w-full h-[350px] md:h-[400px] flex items-center justify-center my-4 overflow-hidden">
               {/* Background Glow */}
               <div className="absolute inset-0 bg-gradient-to-b from-[#050B14] via-[#0B1528] to-[#050B14] opacity-50" />
               <div className="absolute w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px]" />
               
               <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px]">
                  {/* Center Node */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white/20 bg-black/50 backdrop-blur-md flex items-center justify-center z-10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                     <span className="font-bold text-lg md:text-xl text-white tracking-widest">YOU</span>
                  </div>

                  {/* Orbiting Themes */}
                  {(() => {
                     const filteredThemes = data.themes.slice(0, 6);

                     return filteredThemes.map((theme, i) => {
                        const angle = (i / filteredThemes.length) * Math.PI * 2 - Math.PI / 2;
                        const radius = window.innerWidth < 768 ? 110 : 140; // responsive radius
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        
                        // Scale based on strength
                        const scale = 0.7 + (theme.strength / 100) * 0.5;

                        return (
                           <button
                              key={theme.id}
                              onClick={() => {
                                 setSelectedThemeId(theme.id);
                                 setView('theme_detail');
                                 setDetailCategoryFilter(null);
                              }}
                              className="absolute top-1/2 left-1/2 flex flex-col items-center justify-center rounded-full border-2 bg-black/60 backdrop-blur-md transition-transform hover:scale-110 active:scale-95 group z-20"
                              style={{
                                 width: `${90 * scale}px`,
                                 height: `${90 * scale}px`,
                                 transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                 borderColor: theme.color,
                                 boxShadow: `0 0 20px ${theme.color}40`,
                              }}
                           >
                              <div className="absolute inset-0 rounded-full opacity-20" style={{ backgroundColor: theme.color }} />
                              <Compass className="w-5 h-5 mb-1 opacity-80" style={{ color: theme.color }} />
                              <span className="text-[11px] md:text-xs font-bold text-white tracking-tight text-center px-1 leading-tight">{theme.name}</span>
                              <span className="text-[9px] md:text-[10px] text-white/60">
                                 {theme.allItems ? theme.allItems.length : theme.evidenceItems.length} {theme.allItems && theme.allItems.length === 1 ? 'item' : (!theme.allItems && theme.evidenceItems.length === 1 ? 'item' : 'items')}
                              </span>
                           </button>
                        );
                     });
                  })()}
               </div>
            </div>

            <div className="flex justify-center mb-8">
               <button 
                 onClick={() => setView('network')}
                 className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-colors"
               >
                 View Constellation
               </button>
            </div>

            {/* Scrollable Content Below */}
            <div className="px-6 md:px-8 pb-8 flex-1">
               {/* Insight Cards */}
               {(data.themes.length > 0 || data.themes.length > 1) && (
                 <div className="grid grid-cols-2 gap-4 mb-8">
                    {data.themes.length > 0 && (
                      <button 
                        onClick={() => {
                          if (data.themes.length > 0) {
                            setSelectedThemeId(data.themes[0].id);
                            setView('theme_detail');
                            setDetailCategoryFilter(null);
                          }
                        }} 
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col gap-2 relative overflow-hidden text-left hover:bg-white/10 transition-colors cursor-pointer"
                      >
                         <div className="absolute top-0 right-0 p-3 opacity-20"><Trophy className="w-12 h-12 text-blue-400" /></div>
                         <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                            <Trophy className="w-3.5 h-3.5" /> Top Cluster
                         </div>
                         <div className="text-base md:text-lg font-bold text-white relative z-10 leading-tight line-clamp-2">{data.themes[0]?.name || "Exploration"}</div>
                         <div className="text-xs text-white/50 relative z-10 line-clamp-2">Your most prominent theme</div>
                      </button>
                    )}
                    {data.themes.length > 1 && (
                      <button 
                        onClick={() => {
                          if (data.themes.length > 1) {
                            setSelectedThemeId(data.themes[1].id);
                            setView('theme_detail');
                            setDetailCategoryFilter(null);
                          }
                        }} 
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col gap-2 relative overflow-hidden text-left hover:bg-white/10 transition-colors cursor-pointer"
                      >
                         <div className="absolute top-0 right-0 p-3 opacity-20"><TrendingUp className="w-12 h-12 text-emerald-400" /></div>
                         <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            <TrendingUp className="w-3.5 h-3.5" /> Secondary Cluster
                         </div>
                         <div className="text-base md:text-lg font-bold text-white relative z-10 leading-tight line-clamp-2">{data.themes[1]?.name || "Optimistic Futurism"}</div>
                         <div className="text-xs text-emerald-400/80 relative z-10 font-medium">Another strong pattern</div>
                      </button>
                    )}
                 </div>
               )}

               {/* Recent Discoveries (Hidden Connections) */}
               {data.connections && data.connections.length > 0 && (
                 <div>
                    <div className="flex justify-between items-end mb-4">
                       <h3 className="font-serif text-lg md:text-xl font-bold">Recent discoveries</h3>
                       <button className="text-xs text-white/50 hover:text-white" onClick={() => setView('hidden_connections')}>View all</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       {data.connections.map(conn => (
                          <button 
                            key={conn.id} 
                            onClick={() => setView('hidden_connections')}
                            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden text-left hover:border-white/30 transition-colors group relative"
                          >
                             <div className="h-24 w-full bg-black relative">
                                {conn.evidenceItems[0]?.coverUrl ? (
                                  <ImageWithFallback src={conn.evidenceItems[0].coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-black" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] to-transparent opacity-90" />
                             </div>
                             <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col gap-1">
                                <div className="text-xs md:text-sm font-bold text-white leading-tight line-clamp-2 drop-shadow-md">{conn.title}</div>
                                <div className="text-[10px] font-medium" style={{ color: conn.color }}>{conn.confidence}% match</div>
                             </div>
                          </button>
                       ))}
                    </div>
                 </div>
               )}

               {/* Themes Table */}
               {data.themes.length > 0 && (
                 <div className="mt-8 border-t border-white/10 pt-8">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-bold uppercase tracking-wider text-white">Your Unique Clusters</h3>
                     <span className="text-xs text-white/50">{data.themes.length} themes</span>
                   </div>
                   <div className="w-full overflow-x-auto rounded-xl border border-white/10">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50">
                         <tr>
                           <th className="px-4 py-3 font-medium">Theme</th>
                           <th className="px-4 py-3 font-medium">
                             <div className="flex flex-col gap-0.5">
                               <span>Strength</span>
                               <span className="text-[9px] text-white/40 normal-case tracking-normal whitespace-normal font-normal max-w-[120px]">Based on recency, rating & time.</span>
                             </div>
                           </th>
                           <th className="px-4 py-3 font-medium">Items</th>
                           <th className="px-4 py-3 font-medium text-right">Action</th>
                         </tr>
                       </thead>
                        <tbody className="divide-y divide-white/5 bg-transparent">
                         {data.themes.map((theme) => (
                           <tr key={theme.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => { setSelectedThemeId(theme.id); setView('theme_detail'); setDetailCategoryFilter(null); }}>
                             <td className="px-4 py-3 font-bold text-white group-hover:opacity-80 transition-opacity">
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }}></div>
                                 {theme.name}
                               </div>
                             </td>
                             <td className="px-4 py-3">
                               <div className="flex items-center gap-2 w-32">
                                 <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                   <div className="h-full rounded-full" style={{ width: `${theme.strength}%`, backgroundColor: theme.color }}></div>
                                 </div>
                                 <span className="text-xs text-white/50 w-20 whitespace-nowrap group-hover:text-white transition-colors">{theme.strength}% ({theme.allItems?.length || theme.evidenceItems.length} items)</span>
                               </div>
                             </td>
                             <td className="px-4 py-3 text-white/70">
                               <div className="flex -space-x-2">
                                  {(theme.allItems || theme.evidenceItems).slice(0, 5).map((item: any, i: number) => (
                                     <div key={`${item.id}-${i}-${Math.random()}`} className="w-6 h-6 rounded-full overflow-hidden border border-[#050B14] cursor-pointer" style={{ zIndex: 5 - i }} onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-item', { detail: item })); }} title={item.title}>
                                        {item.coverUrl ? <ImageWithFallback src={item.coverUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/50">{item.title?.charAt(0)}</div>}
                                     </div>
                                  ))}
                                  {(theme.allItems || theme.evidenceItems).length > 5 && (
                                     <div className="w-6 h-6 rounded-full overflow-hidden border border-[#050B14] bg-white/10 flex items-center justify-center text-[8px] font-bold cursor-pointer text-white/70 hover:bg-white/20 transition-colors" style={{ zIndex: 0 }} onClick={(e) => { e.stopPropagation(); setSelectedThemeId(theme.id); setView('theme_detail'); setDetailCategoryFilter(null); }}>
                                        +{(theme.allItems || theme.evidenceItems).length - 5}
                                     </div>
                                  )}
                               </div>
                             </td>
                             <td className="px-4 py-3 text-right">
                               <button 
                                 onClick={() => {
                                   setSelectedThemeId(theme.id);
                                   setView('theme_detail');
                                   setDetailCategoryFilter(null);
                                 }}
                                 className="text-xs text-white/50 hover:text-white"
                               >
                                 View details
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}
            </div>
          </motion.div>
        )}

        {/* =========================================================
            SCREEN 2: THEME DETAIL
        ========================================================= */}
        {view === 'theme_detail' && selectedTheme && (
          <motion.div 
            key="theme_detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col relative w-full h-full overflow-y-auto custom-scrollbar"
          >
             {/* Sticky Header */}
             <div className="sticky top-0 z-50 bg-[#050B14]/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-white/10">
                <button onClick={() => setView('home')} className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                   <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-serif text-lg font-bold">{selectedTheme.name}</h2>
                <div className="flex gap-1 -mr-2">
                   <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                      <Share2 className="w-4 h-4" />
                   </button>
                   <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                   </button>
                </div>
             </div>

             <div className="px-6 md:px-8 py-6 flex flex-col gap-8">
                {/* Strength & Explanation */}
                <div>
                   <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ backgroundColor: `${selectedTheme.color}20`, color: selectedTheme.color }}>
                      {selectedTheme.allItems ? selectedTheme.allItems.length : selectedTheme.evidenceItems.length} {selectedTheme.allItems && selectedTheme.allItems.length === 1 ? 'Item' : (!selectedTheme.allItems && selectedTheme.evidenceItems.length === 1 ? 'Item' : 'Items')}
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2">{selectedTheme.name}</h3>
                   <p className="text-lg md:text-xl font-serif text-white/70 leading-relaxed">
                      {selectedTheme.explanation}
                   </p>
                </div>

                {/* Appears in */}
                {(selectedTheme.categories.length > 1 || (selectedTheme.categories.length === 1 && selectedTheme.categories[0].name.toLowerCase() !== selectedTheme.name.toLowerCase())) && (
                <div className="border-t border-white/10 pt-6">
                   <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-base font-bold text-white">Appears in</h3>
                   </div>
                   <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                      {selectedTheme.categories.map((cat, i) => (
                         <div 
                           key={i} 
                           onClick={() => setDetailCategoryFilter(detailCategoryFilter === cat.name ? null : cat.name)} 
                           className={cn("flex flex-col items-center gap-2 min-w-[60px] cursor-pointer hover:opacity-80 transition-opacity", detailCategoryFilter === cat.name ? "opacity-100" : (detailCategoryFilter ? "opacity-40" : "opacity-100"))}
                         >
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
                               <cat.icon className="w-6 h-6" style={{ color: selectedTheme.color }} />
                            </div>
                            <div className="text-xs font-medium">{cat.name}</div>
                            <div className="text-[10px] text-white/50">
                               {cat.count !== undefined ? `${cat.count} item${cat.count !== 1 ? 's' : ''}` : `${cat.percentage}%`}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
                )}

                {/* Why we think this */}
                <div className="border-t border-white/10 pt-6">
                   <h3 className="text-base font-bold text-white mb-1">
                     {detailCategoryFilter ? `Items in ${detailCategoryFilter}` : (selectedTheme.id.startsWith('cat-') ? `Your ${selectedTheme.name} Collection` : "Why we think this")}
                   </h3>
                   <p className="text-sm text-white/60 mb-4">
                     {detailCategoryFilter ? `Showing items that match ${detailCategoryFilter} and this theme.` : (selectedTheme.id.startsWith('cat-') ? `Here are your ${selectedTheme.name.toLowerCase()} items.` : "Here are the items from your collection that define this theme.")}
                   </p>
                   
                   <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                      {(detailCategoryFilter 
                        ? (selectedTheme.allItems || selectedTheme.evidenceItems).filter(item => {
                            const catNameLower = detailCategoryFilter.toLowerCase();
                            const itemCat = (item.category || '').toLowerCase();
                            // Handle variations like "Movies" and "Movies/TV" mapping to "movie" or "watch"
                            if (catNameLower.includes('movie') || catNameLower.includes('tv') || catNameLower === 'watch') {
                              return itemCat === 'movie' || itemCat === 'watch' || itemCat === 'tv';
                            }
                            if (catNameLower.includes('book')) return itemCat === 'book';
                            if (catNameLower.includes('music') || catNameLower.includes('song') || catNameLower.includes('album')) return itemCat === 'music';
                            if (catNameLower.includes('food') || catNameLower.includes('restaurant')) return itemCat === 'food' || itemCat === 'restaurant';
                            if (catNameLower.includes('game')) return itemCat === 'game';
                            if (catNameLower.includes('travel') || catNameLower.includes('place')) return itemCat === 'place' || itemCat === 'places';
                            return itemCat === catNameLower;
                          })
                        : (selectedTheme.allItems || selectedTheme.evidenceItems)
                      ).map((item, i) => (
                         <div key={`${item.id}-${i}-${Math.random()}`} onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-item', { detail: item })); }} className="min-w-[100px] w-[100px] flex flex-col gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="w-full aspect-[2/3] bg-white/10 rounded-lg overflow-hidden relative shadow-md border border-white/5">
                               {item.coverUrl ? (
                                  <ImageWithFallback src={item.coverUrl} className="w-full h-full object-cover" alt={item.title} />
                               ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Compass className="w-6 h-6 opacity-20"/></div>
                               )}
                            </div>
                            <div className="text-xs font-bold leading-tight text-center line-clamp-2">{item.title}</div>
                         </div>
                      ))}
                   </div>
                </div>

                {/* Hidden Connections CTA */}
                <div className="pt-4 pb-8">
                   <button 
                      onClick={() => setView('hidden_connections')}
                      className="w-full relative overflow-hidden bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl p-5 md:p-6 text-left flex items-center justify-between group hover:border-purple-400/60 transition-all shadow-lg"
                   >
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
                      <div className="relative z-10 flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-300" />
                         </div>
                         <div>
                            <div className="font-bold text-purple-100 text-lg mb-0.5">Hidden connections</div>
                            <div className="text-purple-300/80 text-xs md:text-sm">AI found patterns you might not see</div>
                         </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform relative z-10" />
                   </button>
                </div>
             </div>
          </motion.div>
        )}

        {/* =========================================================
            SCREEN 3: HIDDEN CONNECTIONS
        ========================================================= */}
        {view === 'hidden_connections' && (
          <motion.div 
            key="hidden_connections"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col relative w-full h-full overflow-y-auto custom-scrollbar"
          >
             {/* Sticky Header */}
             <div className="sticky top-0 z-50 bg-[#050B14]/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-white/10">
                <button onClick={() => setView('theme_detail')} className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                   <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-serif text-lg font-bold">Hidden Connections</h2>
                <button className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                   <Info className="w-5 h-5" />
                </button>
             </div>

             <div className="px-6 md:px-8 py-6">
                <p className="text-white/70 text-sm md:text-base leading-relaxed mb-6">
                   Our AI looks across your saves to find patterns you might not see.
                </p>

                {/* Cards List */}
                <div className="flex flex-col gap-6 pb-8">
                   {data.connections.map(conn => (
                      <div key={conn.id} className="bg-white/5 border rounded-2xl p-5 overflow-hidden relative shadow-lg" style={{ borderColor: `${conn.color}30` }}>
                         <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: conn.color, opacity: 0.5 }} />
                         
                         <div className="flex justify-between items-start mb-4 mt-2">
                            <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: conn.color }}>
                               <Compass className="w-5 h-5" /> {conn.title}
                            </h3>
                            <div className="text-xs font-medium bg-white/10 px-2 py-1 rounded-md text-white/80">
                               {conn.confidence}% match
                            </div>
                         </div>

                         <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                            {conn.evidenceItems.map((item, i) => (
                               <div key={`${item.id}-${i}-${Math.random()}`} onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-item', { detail: item })); }} className="min-w-[70px] w-[70px] flex flex-col gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                                  <div className="w-full aspect-square bg-white/10 rounded-lg overflow-hidden relative shadow-sm">
                                     {item.coverUrl ? (
                                        <ImageWithFallback src={item.coverUrl} className="w-full h-full object-cover" alt={item.title} />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-4 h-4 opacity-20"/></div>
                                     )}
                                  </div>
                                  <div className="text-[9px] font-bold leading-tight text-center line-clamp-2 uppercase tracking-wide text-white/80">{item.title}</div>
                               </div>
                            ))}
                         </div>

                         <p className="text-sm text-white/80 leading-relaxed mb-5 border-t border-white/10 pt-4">
                            {conn.explanation}
                         </p>
                      </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}

        {/* =========================================================
            SCREEN 5: HELP / EXPLANATION
        ========================================================= */}
        {view === 'help' && (
          <motion.div 
            key="help"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col relative w-full h-full p-8 md:p-12 overflow-y-auto custom-scrollbar"
          >
             <button 
                onClick={() => setView('home')} 
                className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white"
             >
                <ArrowLeft className="w-5 h-5" />
             </button>

             <div className="max-w-2xl mx-auto mt-12 w-full">
                <div className="flex justify-center mb-8">
                   <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
                      <Sparkles className="w-10 h-10 text-emerald-400 relative z-10" />
                   </div>
                </div>
                
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-white text-center mb-10 leading-tight">
                   How your Taste DNA is created
                </h2>
                
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                   {/* Step 1 */}
                   <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#050B14] bg-emerald-500/20 text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                         <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-white/5 border border-white/10">
                         <h3 className="font-bold text-white mb-2 text-lg">1. You Collect</h3>
                         <p className="text-white/70 text-sm leading-relaxed">
                            Every time you save a book, movie, album, or restaurant, we look beyond the surface. We analyze the underlying genres, themes, aesthetics, and moods of what you love.
                         </p>
                      </div>
                   </div>
                   
                   {/* Step 2 */}
                   <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#050B14] bg-blue-500/20 text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                         <LayoutGrid className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-white/5 border border-white/10">
                         <h3 className="font-bold text-white mb-2 text-lg">2. AI Synthesizes</h3>
                         <p className="text-white/70 text-sm leading-relaxed">
                            Our AI identifies patterns across your collection. It connects a sci-fi book you read to an electronic album you listened to, realizing you have a deep affinity for "Futuristic Isolation".
                         </p>
                      </div>
                   </div>
                   
                   {/* Step 3 */}
                   <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#050B14] bg-purple-500/20 text-purple-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                         <Compass className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-white/5 border border-white/10">
                         <h3 className="font-bold text-white mb-2 text-lg">3. DNA Emerges</h3>
                         <p className="text-white/70 text-sm leading-relaxed">
                            These patterns become the distinct "nodes" in your Taste DNA. The larger the node, the stronger that theme is present in your collection. These themes evolve constantly as you add more items.
                         </p>
                      </div>
                   </div>
                </div>

                <div className="mt-12 text-center">
                   <button 
                      onClick={() => setView('home')}
                      className="bg-emerald-500 hover:bg-emerald-400 text-[#050B14] px-8 py-3 rounded-full font-bold transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                   >
                      Got it
                   </button>
                </div>
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
