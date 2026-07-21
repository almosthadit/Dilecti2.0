import React, { useMemo, useState, useEffect, useRef } from "react";
import { UserItem } from "../types";
import { BookOpen, Film, Tv, Music as MusicIcon, Gamepad2, Utensils, MapPin, Sparkles, Heart, Activity, Share2, Compass, X, Loader2, ArrowRight, ArrowLeft, Download, MoreHorizontal, User, Edit2, Lightbulb, LayoutGrid, Gamepad, Globe, PartyPopper, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import { normalizeTheme, cn } from '../lib/utils';
import { ImageWithFallback } from "./ImageWithFallback";


const CATEGORIES = [
  { id: "Overall", label: "Overview" },
  { id: "book", label: "Read" },
  { id: "watch", label: "Watch" },
  { id: "music", label: "Listen" },
  { id: "game", label: "Play" },
  { id: "food", label: "Eat" },
  { id: "place", label: "Visit" }
];

const CAT_COLORS: Record<string, string> = {
  books: '#f59e0b', // amber-500
  watch: '#06b6d4', // cyan-500
  music: '#ec4899', // pink-500
  food: '#ea580c', // orange-600
  games: '#22c55e', // green-500
  activities: '#3b82f6', // blue-500
  people: '#a855f7', // purple-500
  places: '#8b5cf6', // violet-500
  travel: '#8b5cf6',
  default: '#14b8a6' // teal-500
};

const CAT_ICONS: Record<string, React.ElementType> = {
  books: BookOpen,
  watch: Tv,
  movie: Film,
  tv: Tv,
  music: MusicIcon,
  games: Gamepad2,
  game: Gamepad2,
  food: Utensils,
  places: MapPin,
  place: MapPin,
  travel: Compass,
  activities: Activity,
  people: User,
  default: Sparkles
};

// Helpers
function normalizeCat(cat: string) {
    let c = (cat || 'other').toLowerCase();
    if (c.includes('game') || c.includes('sports')) c = 'games';
    if (c.includes('tv') || c.includes('movie') || c === 'watch') c = 'watch';
    if (c === 'book' || c === 'books' || c === 'read') c = 'books';
    if (c === 'place' || c.includes('travel') || c === 'places') c = 'travel';
    if (c === 'music' || c === 'listen') c = 'music';
    if (c === 'food' || c === 'eat' || c === 'dining' || c === 'restaurant') c = 'food';
    if (c === 'event' || c === 'events') c = 'events';
    if (c === 'product' || c === 'products') c = 'products';
    return c;
}

interface NodePathElement {
  id: string;
  label: string;
  type: 'root' | 'category' | 'theme' | 'item';
  color: string;
  icon: any;
  items: UserItem[];
}

interface TasteConstellationProps {
  items: UserItem[];
  value: string;
  onChange: (val: string) => void;
  onToggleFavorite?: (id: string, isFav: boolean) => void;
  insightText?: string;
  isLoadingInsight?: boolean;
  onInsightClick?: () => void;
}

export function TasteGraphConstellation({ 
  items = [], 
  value, 
  onChange, 
  onToggleFavorite,
  insightText,
  isLoadingInsight,
  onInsightClick
}: TasteConstellationProps) {
   const [path, setPath] = useState<NodePathElement[]>([]);
   const [fullScreen, setFullScreen] = useState(false);
   const [showNarrative, setShowNarrative] = useState(false);

   const containerRef = useRef<HTMLDivElement>(null);
   const [{ x, y, scale }, api] = useSpring(() => ({ 
      x: 0, 
      y: 0, 
      scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.8 : 1.0,
      config: { mass: 1, tension: 300, friction: 30 }
   }));

   useEffect(() => {
     const preventScroll = (e: WheelEvent) => { 
        if (fullScreen) {
            e.preventDefault(); 
        } else if (e.ctrlKey) {
            // Only prevent if zooming
            e.preventDefault();
        }
     };
     const preventPinch = (e: TouchEvent) => { 
        if (e.touches.length > 1) { 
            e.preventDefault(); 
        } 
     };
     const el = containerRef.current;
     if (el) {
       el.addEventListener('wheel', preventScroll, { passive: false });
       el.addEventListener('touchmove', preventPinch, { passive: false });
     }
     return () => {
       if (el) {
         el.removeEventListener('wheel', preventScroll);
         el.removeEventListener('touchmove', preventPinch);
       }
     }
   }, [fullScreen]);

   useGesture({
      onDrag: ({ offset: [dx, dy], event }) => {
        // Don't intercept single finger drag if not full screen (let them scroll)
        if (!fullScreen && event.type.startsWith('touch') && (event as TouchEvent).touches.length === 1) return;
        api.start({ x: dx, y: dy });
      },
      onPinch: ({ offset: [s] }) => {
        api.start({ scale: s });
      }
   }, {
      target: containerRef,
      eventOptions: { passive: false },
      drag: { 
         enabled: true,
         from: () => [x.get(), y.get()], 
         filterTaps: true,
         bounds: { left: -800, right: 800, top: -800, bottom: 800 },
         rubberband: true
      },
      pinch: { enabled: true, scaleBounds: { min: 0.2, max: 10.0 }, from: () => [scale.get(), 0] }
   });

   const [viewMode, setViewMode] = useState<'clusters' | 'folder'>('clusters');
   const [internalValue, setInternalValue] = useState(value || 'Overall');
   
   // Sync with props if controlled
   useEffect(() => {
     if (value) setInternalValue(value);
   }, [value]);

   useEffect(() => {
       if (!internalValue || internalValue === 'Overall' || internalValue === 'All') {
           setPath([]);
       } else {
           const c = normalizeCat(internalValue);
           const filtered = items.filter(it => normalizeCat(it.category) === c);
           if (filtered.length > 0) {
               setPath([{
                   id: c,
                   label: c.charAt(0).toUpperCase() + c.slice(1),
                   type: 'category',
                   color: CAT_COLORS[c] || CAT_COLORS.default,
                   icon: CAT_ICONS[c] || CAT_ICONS.default,
                   items: filtered
               }]);
           } else {
               setPath([]);
           }
       }
   }, [internalValue, items]);

   const handleSelectNode = (node: any) => {
       if (node.type === 'item') return;
       api.start({ x: 0, y: 0, scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.8 : 1.0 });
       const newPath = [...path, node];
       setPath(newPath);
   };

   const handleGoBack = () => {
       api.start({ x: 0, y: 0, scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.8 : 1.0 });
       const newPath = path.slice(0, path.length - 1);
       setPath(newPath);
   };

   // Math Graph generation for rings
   const { layout, totalFavs } = useMemo(() => {
       const getThemeKeysForItems = (items: UserItem[], extractType: 'theme' | 'keyword') => {
            const map: Record<string, UserItem[]> = {};
            items.forEach(it => {
                const keys = new Set<string>();
                if (extractType === 'theme') {
                    if (it.metadata?.genres && it.metadata.genres.length > 0) {
                        it.metadata.genres.forEach((t: string) => keys.add(t));
                    } else if ((it as any).tags && (it as any).tags.length > 0) {
                        (it as any).tags.forEach((t: string) => keys.add(t));
                    } else if (it.subCategory) {
                        keys.add(it.subCategory);
                    } else if (it.category === 'food' || it.category === 'place' || it.category === 'product') {
                        if (it.subtitle) keys.add(it.subtitle);
                    }
                } else {
                    if (it.metadata?.keywords && it.metadata.keywords.length > 0) {
                        it.metadata.keywords.forEach((t: string) => keys.add(t));
                    } else if (it.subtitle) {
                        keys.add(it.subtitle);
                    } else if (it.author) {
                        keys.add(it.author);
                    }
                }
                if (keys.size === 0) {
                    keys.add("Uncategorized");
                }
                
                const words = Array.from(keys)
                    .filter(k => k && k.trim().length > 0 && k !== "General")
                    .map(k => normalizeTheme(k))
                    .filter(k => k.length > 0);
                    
                words.forEach(w => {
                    if (!map[w]) map[w] = [];
                    map[w].push(it);
                });
            });
            
            return Object.keys(map)
               .filter(k => map[k].length > (items.length > 20 ? 1 : 0)) // remove single items if graph is huge
               .map((t, idx) => {
                const colors = Object.values(CAT_COLORS).filter(c => c !== CAT_COLORS.default);
                const color = colors[idx % colors.length];
                const uniqueCats = new Set(map[t].map(it => normalizeCat(it.category))).size;
                return { 
                    id: `${extractType}-${t}`,
                    theme: t, 
                    label: t,
                    color: uniqueCats >= 3 ? '#38bdf8' : color,
                    items: map[t] 
                };
            }).sort((a,b) => b.items.length - a.items.length);
       };

       const getGroups = (parentItems: UserItem[], parentType: string, parentColor: string) => {
             // If we have few items, skip clustering and just show the tiles
             if (parentType !== 'root' && parentItems.length <= 6) return [];

             if (parentType === 'root') {
                 if (viewMode === 'folder') {
                     const map: Record<string, UserItem[]> = {};
                     parentItems.forEach(it => {
                         const c = normalizeCat(it.category);
                         if(!map[c]) map[c] = [];
                         map[c].push(it);
                     });
                     return Object.keys(map).map(c => ({
                         id: c,
                         label: c.charAt(0).toUpperCase() + c.slice(1),
                         color: CAT_COLORS[c] || CAT_COLORS.default,
                         icon: CAT_ICONS[c] || CAT_ICONS.default,
                         items: map[c],
                         type: 'category'
                     })).sort((a,b) => b.items.length - a.items.length);
                 } else {
                     const themesData = getThemeKeysForItems(parentItems, 'theme');
                     return themesData.map((td) => ({
                         ...td,
                         type: 'theme',
                         icon: Compass
                     }));
                 }

             } else if (parentType === 'category') {
                 const map: Record<string, UserItem[]> = {};
                 let hasSubCats = false;
                 parentItems.forEach(it => {
                     const sub = it.subCategory || 'Other';
                     if (it.subCategory) hasSubCats = true;
                     if (!map[sub]) map[sub] = [];
                     map[sub].push(it);
                 });
                 if (hasSubCats && Object.keys(map).length > 1) {
                     return Object.keys(map).map(sub => ({
                         id: `sub-${sub}`,
                         label: sub,
                         color: parentColor,
                         icon: Compass,
                         items: map[sub],
                         type: 'subcategory'
                     })).sort((a,b) => b.items.length - a.items.length);
                 }
                 const themesData = getThemeKeysForItems(parentItems, 'theme');
                 return themesData.map((td) => ({ ...td, color: parentColor, type: 'theme', icon: Compass }));

             } else if (parentType === 'subcategory') {
                 const themesData = getThemeKeysForItems(parentItems, 'theme');
                 return themesData.map((td) => ({ ...td, color: parentColor, type: 'theme', icon: Compass }));
             } else if (parentType === 'theme') {
                 const keywordsData = getThemeKeysForItems(parentItems, 'keyword');
                 if (keywordsData.length > 1 && keywordsData.length < parentItems.length) {
                     return keywordsData.map((td) => ({ ...td, color: parentColor, type: 'keyword_cluster', icon: Sparkles }));
                 }
                 return parentItems.map((item, i) => ({
                     id: `item-${item.id}-${i}`,
                     item: item,
                     label: item.title,
                     color: parentColor,
                     icon: Compass,
                     items: [item],
                     type: 'item'
                 }));
             } else if (parentType === 'keyword_cluster') {
                 return parentItems.map((item, i) => ({
                     id: `item-${item.id}-${i}`,
                     item: item,
                     label: item.title,
                     color: parentColor,
                     icon: Compass,
                     items: [item],
                     type: 'item'
                 }));
             }
             return [];
         };

       let totalFavs = 0;
       items.forEach(i => { if (i.reaction === 'love') totalFavs++; });
       
       const cxCenter = 500;
       const cyCenter = 500;
       
       let links: any[] = [];
       let nodes: any[] = [];
       let maxRadiusUsed = 100;
       
       const currentCenterData = path.length > 0 ? path[path.length - 1] : {
           id: 'you',
           label: 'YOU',
           icon: User, 
           color: '#eab308',
           items: items,
           type: 'root'
       };

       const centerNode = {
           ...currentCenterData,
           cx: cxCenter,
           cy: cyCenter,
           r: 45,
           ring: 0,
           count: currentCenterData.items.length
       };
       nodes.push(centerNode);
       
       let childrenGroups = getGroups(currentCenterData.items, currentCenterData.type, currentCenterData.color);
       
       // Limit to prevent lag on huge datasets
       if (childrenGroups.length > 40) {
           childrenGroups = childrenGroups.slice(0, 40);
       }

       const ringRadii = [130, 230, 340, 460, 590, 730, 880, 1040];
       const ringCapacities = [10, 18, 28, 40, 55, 75, 100, 130];
       let ringIndex = 0;
       let ringCount = 0;
       
       childrenGroups.forEach((child: any, i) => {
           if (ringCount >= ringCapacities[ringIndex]) {
               ringIndex = Math.min(ringIndex + 1, ringRadii.length - 1);
               ringCount = 0;
           }
           
           let itemsInThisRing = ringCapacities[ringIndex];
           let remaining = childrenGroups.length - i + ringCount;
           if (remaining < itemsInThisRing) {
               itemsInThisRing = remaining;
           }

           const angle = (ringCount / itemsInThisRing) * Math.PI * 2 - Math.PI / 2 + (ringIndex * (Math.PI / itemsInThisRing));
           const radius = ringRadii[ringIndex];
           if (radius > maxRadiusUsed) maxRadiusUsed = radius;

           const nx = cxCenter + Math.cos(angle) * radius;
           const ny = cyCenter + Math.sin(angle) * radius;
           
           nodes.push({
               ...child,
               cx: nx,
               cy: ny,
               r: 46,
               ring: ringIndex + 1,
               baseAngle: angle,
               count: child.items.length
           });
           links.push({ source: centerNode.id, target: child.id, color: child.color, type: 'solid' });
           ringCount++;
           
           // Only show sub-children for inner ring to reduce clutter
           if (ringIndex === 0 && child.items.length > 2) {
               const subChildren = getGroups(child.items, child.type, child.color).slice(0, 3);
               if (subChildren.length > 0) {
                   const subRingRadius = radius + 85;
                   if (subRingRadius > maxRadiusUsed) maxRadiusUsed = subRingRadius;
                   
                   subChildren.forEach((sub: any, j) => {
                       const spread = Math.PI / 3; 
                       const subAngle = angle - spread/2 + ((j+1) / (subChildren.length+1)) * spread;
                       const tx = cxCenter + Math.cos(subAngle) * subRingRadius;
                       const ty = cyCenter + Math.sin(subAngle) * subRingRadius;
                       const uniqueId = `${child.id}-${sub.id}`;
                       
                       nodes.push({
                           ...sub,
                           id: uniqueId,
                           cx: tx,
                           cy: ty,
                           r: 38,
                           isMajor: false,
                           ring: 2,
                           baseAngle: subAngle,
                           count: sub.items.length
                       });
                       links.push({ source: child.id, target: uniqueId, color: child.color, type: 'dotted' });
                   });
               }
           }
       });
       
       return { layout: { centerNode, nodes, links, currentCenterData, maxRadiusUsed }, totalFavs };
   }, [items, path, viewMode]);
   
   // Empty state
   if (items.length < 3) {
       return (
          <div className="w-full flex justify-center py-12 mb-8">
              <div className="text-center text-white/50 bg-neutral-900 border border-white/10 rounded-[2rem] p-8 max-w-md shadow-2xl">
                 <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50 text-emerald-400" />
                 <h3 className="text-xl font-serif font-bold text-white mb-2">Build your Constellation</h3>
                 <p className="text-sm px-4">Save a few items or mark favorites to start building your Taste Constellation. The map evolves as you add more.</p>
              </div>
          </div>
       );
   }

   const isOverall = path.length === 0;

   const graphBackground = (
      <>
         {/* Pure black backdrop with stars */}
         <div className="absolute inset-0 bg-black pointer-events-none" />
         <img 
            src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600&auto=format&fit=crop" 
            alt="Night Sky" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" 
         />
         <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="20%" cy="40%" rx="300" ry="150" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="1" transform="rotate(-15 20% 40%)" />
            <circle cx="90%" cy="30%" r="200" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="1" />
            <circle cx="10%" cy="30%" r="4" fill="#a855f7" className="shadow-[0_0_15px_#a855f7]" />
            <circle cx="85%" cy="20%" r="2" fill="#f97316" />
            <circle cx="5%" cy="60%" r="3" fill="#14b8a6" />
         </svg>
         <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
         <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 2px, transparent 2px)', backgroundSize: '90px 90px', backgroundPosition: '20px 20px' }} />
      </>
   );

   const formatInsightText = (text: string, isSnippet: boolean = false) => {
       if (!text) return null;
       
       const sections: Record<string, string> = {};
       let currentSection = "Hook";
       let currentContent: string[] = [];
       
       const lines = text.split('\n');
       for (const l of lines) {
           if (l.toLowerCase().startsWith('## the hook')) { if(currentContent.length) sections[currentSection] = currentContent.join('\n'); currentSection = 'Hook'; currentContent = []; }
           else if (l.toLowerCase().startsWith('## the insight')) { if(currentContent.length) sections[currentSection] = currentContent.join('\n'); currentSection = 'Insight'; currentContent = []; }
           else if (l.toLowerCase().startsWith('## takeaway')) { if(currentContent.length) sections[currentSection] = currentContent.join('\n'); currentSection = 'Takeaway'; currentContent = []; }
           else if (l.toLowerCase().startsWith('## deep dive')) { if(currentContent.length) sections[currentSection] = currentContent.join('\n'); currentSection = 'Deep Dive'; currentContent = []; }
           else if (l.startsWith('##')) { if(currentContent.length) sections[currentSection] = currentContent.join('\n'); currentSection = l.replace('##', '').trim(); currentContent = []; }
           else {
               if (l.trim().length > 0) currentContent.push(l.trim().replace(/\*\*/g, ''));
           }
       }
       if (currentContent.length) sections[currentSection] = currentContent.join('\n');

       if (Object.keys(sections).length === 1 && sections['Hook'] && !text.includes('##')) {
            // It didn't format it right, just raw text
            if (isSnippet) return text;
            return <div className="text-xl md:text-2xl text-white/90 leading-relaxed font-serif">{text}</div>;
       }

       if (isSnippet) {
           return (
              <>
                 <span className="font-bold text-emerald-300 block mb-1">{sections['Hook']}</span>
                 <span className="opacity-90">{sections['Insight']}</span>
              </>
           );
       }

       const containerVariants = {
           hidden: { opacity: 0 },
           show: {
               opacity: 1,
               transition: {
                   staggerChildren: 0.15
               }
           }
       };

       const itemVariants: any = {
           hidden: { opacity: 0, y: 20 },
           show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
       };

       return (
           <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8 pb-4">
              {sections['Hook'] && (
                 <motion.h3 variants={itemVariants} className="text-3xl md:text-5xl font-serif font-bold text-emerald-300 leading-[1.1] tracking-tight">
                    {sections['Hook']}
                 </motion.h3>
              )}
              {sections['Insight'] && (
                 <motion.div variants={itemVariants} className="text-xl md:text-2xl text-white/90 leading-relaxed font-serif relative pl-6 md:pl-8">
                    <span className="absolute left-0 top-[-10px] text-5xl md:text-7xl text-emerald-500/30 font-serif leading-none">"</span>
                    <span className="relative z-10 italic">{sections['Insight']}</span>
                 </motion.div>
              )}
              {sections['Takeaway'] && (
                 <motion.div variants={itemVariants} className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-5 md:p-8 my-6 backdrop-blur-md shadow-lg flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Lightbulb className="w-4 h-4 text-emerald-400" />
                       </div>
                       <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 font-sans">Actionable Takeaway</div>
                    </div>
                    <div className="text-lg md:text-xl text-emerald-50 font-sans font-medium leading-relaxed ml-11 pt-1">{sections['Takeaway']}</div>
                 </motion.div>
              )}
              {sections['Deep Dive'] && (
                 <motion.div variants={itemVariants} className="text-base md:text-lg text-white/60 font-sans leading-relaxed space-y-5 pt-4 mt-8 border-t border-white/10">
                    {sections['Deep Dive'].split('\n').map((p, i) => <p key={i} className="pl-4 border-l-2 border-white/10">{p}</p>)}
                 </motion.div>
              )}
           </motion.div>
       );
   };

   return (
       <div className={`w-full ${fullScreen ? "fixed inset-0 z-50 bg-black flex flex-col" : ""}`}>
           <div className={`w-full bg-[#030712] rounded-[2rem] shadow-sm relative overflow-hidden ring-1 ring-white/5 flex flex-col ${fullScreen ? "h-full rounded-none ring-0 w-full" : "h-[700px] mb-8"}`}>
              {/* Header area - positioned tightly above graph */}
               <div className="z-20 pointer-events-none px-6 pt-20 pb-2 md:px-8 md:pt-20 md:pb-4 relative w-full flex flex-col items-start bg-gradient-to-b from-black/80 to-transparent min-w-0">
                  <div className="flex w-full justify-between items-start min-w-0">
                     <div className="pointer-events-auto w-full min-w-0">
                         <AnimatePresence>
                             {path.length > 0 && (
                                <motion.div 
                                   initial={{ opacity: 0, y: -10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   exit={{ opacity: 0, y: -10 }}
                                   className="flex items-center gap-3 mb-2"
                                >
                                   <div className="text-white/70 text-xs md:text-sm font-medium tracking-wide flex items-center overflow-x-auto custom-scrollbar pr-4">
                                       <button onClick={() => {
                                           api.start({ x: 0, y: 0, scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.8 : 1.0 });
                                           setPath([]);
                                       }} className="hover:text-white transition-colors whitespace-nowrap">ROOT</button>
                                       {path.map((n, idx) => (
                                           <span key={idx} className="inline-flex items-center whitespace-nowrap">
                                               <span className="mx-2 opacity-30">/</span>
                                               <span className={idx === path.length - 1 ? "text-emerald-400 font-bold" : ""}>{n.label.toUpperCase()}</span>
                                           </span>
                                       ))}
                                   </div>
                                </motion.div>
                             )}
                         </AnimatePresence>
                         <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-1 drop-shadow-md">Taste Constellation</h2>
                         
                         <div className="flex items-center gap-3 mb-4">
                            <p className="text-sm text-white/60 drop-shadow">A map of what shapes you.</p>
                            <span className="text-white/20">•</span>
                            <div className="flex items-center gap-3 text-xs text-white/40 font-mono tracking-widest uppercase">
                               <span><strong className="text-white/70">{items.length}</strong> Items</span>
                               <span><strong className="text-white/70">{totalFavs}</strong> Favs</span>
                            </div>
                         </div>

                         {/* Category Filters Under Header */}
                         <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full sm:w-auto pb-1 sm:pb-0 mb-2">
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
                            ].map(cat => (
                               <button
                                  key={cat.id}
                                  onClick={() => {
                                     const newCat = cat.id === 'All' ? null : cat.id;
                                     setInternalValue(newCat || 'Overall');
                                     if(onChange) onChange(newCat || 'Overall');
                                  }}
                                  className={cn(
                                     "p-2 rounded-full border transition-colors flex items-center justify-center shrink-0",
                                     (internalValue === cat.id || (internalValue === 'Overall' && cat.id === 'All'))
                                        ? "bg-white text-black border-white"
                                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                                  )}
                                  title={cat.label}
                               >
                                  <cat.icon className="w-4 h-4" />
                               </button>
                            ))}
                         </div>
                     </div>
                  </div>
              </div>

               <div 
                  ref={containerRef}
                  className="flex-1 relative w-full overflow-hidden flex items-center justify-center group"
                  style={{ touchAction: 'none' }}
               >
                  {graphBackground}

                  {/* Absolute UI Overlays inside Graph */}
                  {path.length > 0 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
                          <button 
                             onClick={() => handleGoBack()}
                             className="px-6 py-3 bg-neutral-900 border border-white/20 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all rounded-full text-white shadow-xl flex items-center gap-3 font-medium font-sans"
                          >
                             <ArrowLeft className="w-5 h-5" /> Back
                          </button>
                      </div>
                  )}

                  {/* Absolute Floating Controls */}
                  <div className="absolute bottom-6 right-6 z-40 pointer-events-auto flex flex-col gap-2">
                      <div className="flex bg-neutral-900/80 backdrop-blur border border-white/20 rounded-full p-1 shadow-xl flex-col items-center">
                         <button 
                             disabled={path.length > 0}
                             onClick={() => setViewMode('folder')} 
                             className={cn("p-2 rounded-full transition-all flex items-center justify-center", viewMode === 'folder' ? 'bg-emerald-500 text-white' : 'text-white/50 hover:text-white', path.length > 0 ? "opacity-30 cursor-not-allowed" : "")}
                             title="Categories View"
                         >
                             <LayoutGrid className="w-4 h-4" />
                         </button>
                         <button 
                             disabled={path.length > 0}
                             onClick={() => setViewMode('clusters')} 
                             className={cn("p-2 rounded-full transition-all flex items-center justify-center", viewMode === 'clusters' ? 'bg-emerald-500 text-white' : 'text-white/50 hover:text-white', path.length > 0 ? "opacity-30 cursor-not-allowed" : "")}
                             title="Themes View"
                         >
                             <Lightbulb className="w-4 h-4" />
                         </button>
                      </div>

                      <div className="flex flex-col bg-neutral-900/80 backdrop-blur border border-white/20 rounded-full p-1 shadow-xl items-center mt-2">
                          <button onClick={() => {
                              const current = scale.get();
                              api.start({ scale: Math.min(10.0, current + 0.3) });
                          }} className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-colors font-bold text-xl">
                             +
                          </button>
                          <button onClick={() => {
                              const current = scale.get();
                              api.start({ scale: Math.max(0.2, current - 0.3) });
                          }} className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-colors font-bold text-xl">
                             −
                          </button>
                      </div>
                      
                      <button onClick={() => setFullScreen(!fullScreen)} className="w-10 h-10 mt-2 bg-neutral-900/80 backdrop-blur border border-white/20 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-colors shadow-xl">
                         {fullScreen ? <X className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
                      </button>
                  </div>

                  {fullScreen && (
                     <>
                        <div className="absolute bottom-10 left-6 z-30 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 text-xs">
                           <div className="text-white/40 font-bold uppercase tracking-widest mb-3">Legend</div>
                           <div className="space-y-2">
                               <div className="flex items-center gap-2 text-white/80"><div className="w-2 h-0.5 bg-yellow-500 rounded" /> Inner Ring &nbsp;<span className="text-white/40">= Core Interests</span></div>
                               <div className="flex items-center gap-2 text-white/80"><div className="w-2 h-0.5 bg-white/60 rounded" /> Middle Ring <span className="text-white/40">= Strong Themes</span></div>
                               <div className="flex items-center gap-2 text-white/80"><div className="w-2 h-0.5 border-t border-dashed border-white/40" /> Outer Ring <span className="text-white/40">= Emerging Themes</span></div>
                           </div>
                        </div>

                        <div className="absolute bottom-10 right-6 z-30 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 text-xs font-medium text-white/60 text-right">
                           <Sparkles className="w-3 h-3 inline mr-1 text-white/80" /> Closer to you = more dominant<br/>
                           Further out = less dominant
                        </div>

                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-4">
                           <button className="px-8 py-3 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white font-bold tracking-wide hover:bg-white/20 flex items-center gap-2">
                               <Edit2 className="w-4 h-4" /> Edit
                           </button>
                           <button className="px-8 py-3 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white font-bold tracking-wide hover:bg-white/20 flex items-center gap-2">
                               <Share2 className="w-4 h-4" /> Share
                           </button>
                        </div>
                     </>
                  )}

                  {layout.nodes.length <= 1 ? (
                      <div className="absolute inset-0 w-full h-full overflow-y-auto pointer-events-auto custom-scrollbar p-6 md:p-8 pt-[20px] md:pt-[40px] pb-32 z-10">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-6xl mx-auto">
                              {layout.currentCenterData.items.map((it: UserItem, idx: number) => (
                                  <div key={`${it.id}-${idx}`} className="bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:border-white/30 transition-all backdrop-blur-md group">
                                      {it.coverUrl ? (
                                         <div className="w-full h-40 relative rounded-xl overflow-hidden shadow-md">
                                             <ImageWithFallback src={it.coverUrl} alt={it.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                         </div>
                                      ) : (
                                         <div className="w-full h-40 bg-white/5 rounded-xl flex items-center justify-center text-white/20 group-hover:bg-white/10 transition-colors">
                                            <layout.currentCenterData.icon className="w-10 h-10 opacity-40 shrink-0" />
                                         </div>
                                      )}
                                      <div className="flex flex-col gap-1">
                                          <div className="flex justify-between items-start gap-2">
                                              <h4 className="font-bold text-white text-sm line-clamp-2 leading-tight group-hover:text-emerald-300 transition-colors">{it.title}</h4>
                                              {it.reaction === 'love' && <Heart className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 shrink-0 mt-0.5" />}
                                          </div>
                                          <p className="text-xs text-white/40 font-mono tracking-wide uppercase line-clamp-1">{it.subtitle || it.author || normalizeCat(it.category)}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : (
                      <animated.div 
                         style={{ x, y, scale }}
                         className="absolute inset-0 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing origin-center"
                      >
                      {/* We offset viewBox dynamically so nodes don't get cut off and scale seamlessly to the container. */}
                      {(() => {
                          const r = Math.max(layout.maxRadiusUsed || 200, 200) + 120;
                          return (
                      <svg className="w-full h-full pointer-events-auto" viewBox={`${500 - r} ${500 - r} ${r * 2} ${r * 2}`} preserveAspectRatio="xMidYMid meet">
                         {/* Lines Loop */}
                         {layout.links.map((link: any, i: number) => {
                             const sourceParams = layout.nodes.find((n:any) => n.id === link.source);
                             const targetParams = layout.nodes.find((n:any) => n.id === link.target);
                             if (!sourceParams || !targetParams) return null;
                             
                             return (
                                 <motion.line
                                     key={`link-${i}`}
                                     x1={sourceParams.cx} y1={sourceParams.cy}
                                     x2={targetParams.cx} y2={targetParams.cy}
                                     stroke={link.color}
                                     strokeWidth={link.type === 'solid' ? "1.5" : "1"}
                                     strokeDasharray={link.type === 'dotted' ? "4 4" : "0"}
                                     initial={{ pathLength: 0, opacity: 0 }}
                                     animate={{ pathLength: 1, opacity: 0.6 }}
                                     transition={{ duration: 1, delay: 0.2 }}
                                 />
                             );
                         })}
    
                         {/* Concentric subtle rings for depth */}
                         {path.length === 0 && [140, 240, 340].map((r, i) => (
                             <circle key={`bg-ring-${i}`} cx="500" cy="500" r={r} fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.05" strokeDasharray="4 4"/>
                         ))}
    
                         {/* Nodes Loop */}
                         {layout.nodes.map((n: any, i: number) => {
                             const size = n.r; 
                             const isCenter = n.ring === 0;
                             const glowFilter = `drop-shadow(0 0 16px ${n.color}60)`;
                             
                             return (
                             <motion.g
                                 key={`${n.id}-${i}`}
                                 onClick={(e) => {
                                     e.stopPropagation();
                                     if (n.ring > 0 && n.type !== 'item') {
                                         handleSelectNode(n);
                                     } else if (n.type === 'item') {
                                         window.dispatchEvent(new CustomEvent('open-item', { detail: n.item || n }));
                                     } else if (isCenter) {
                                         handleGoBack();
                                     }
                                 }}
                                 className={n.ring > 0 ? "cursor-pointer" : (isCenter && path.length > 0 ? "cursor-pointer" : "")}
                                 initial={{ opacity: 0, scale: 0 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 transition={{ delay: i * 0.02, type: "spring", stiffness: 200, damping: 15 }}
                                 style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
                             >
                                 {/* Node Outline */}
                                 <circle 
                                    cx={n.cx} 
                                    cy={n.cy} 
                                    r={size} 
                                    fill="#000" 
                                    stroke={n.color} 
                                    strokeWidth={isCenter ? "3" : "1.5"}
                                    style={{ filter: glowFilter }}
                                 />
                                 
                                 {/* Inner Fill */}
                                 <circle cx={n.cx} cy={n.cy} r={size - 2} fill={n.color} opacity={isCenter ? 0.2 : 0.1} />
    
                                 {/* Node Content */}
                                 {n.type !== 'item' || isCenter || n.isMajor ? (
                                    <foreignObject x={n.cx - size} y={n.cy - size} width={size * 2} height={size * 2}>
                                        <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none text-center px-0.5">
                                            <div className="relative">
                                             <n.icon className={`${isCenter ? 'mb-1' : 'mb-0.5'}`} style={{ color: "white", width: isCenter ? '20px' : '14px', height: isCenter ? '20px' : '14px' }} />
                                             {n.type === 'item' && n.isFav && (
                                                 <Heart className="absolute -top-1 -right-1 w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                                             )}
                                             </div>
                                            {n.r > 16 && (
                                              <span className={`font-serif font-bold text-white leading-[1.1] ${isCenter ? 'text-[12px]' : 'text-[8px]'} line-clamp-2 w-full break-words`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                 {n.label}
                                              </span>
                                            )}
                                            {n.count != null && (
                                               <div className="text-white/80 font-bold leading-none mt-0.5" style={{ fontSize: isCenter ? '10px' : '7px' }}>
                                                  {n.count} {n.count > 0 && layout.centerNode.count > 0 && `(${Math.round((n.count / layout.centerNode.count) * 100)}%)`}
                                               </div>
                                            )}
                                        </div>
                                    </foreignObject>
                                 ) : (
                                     <foreignObject x={n.cx - size} y={n.cy - size} width={size * 2} height={size * 2}>
                                         <div className="w-full h-full flex items-center justify-center pointer-events-none drop-shadow-md">
                                            {n.isFav ? <Heart className="w-3 h-3 fill-emerald-400 text-emerald-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/80" />}
                                         </div>
                                     </foreignObject>
                                 )}
                             </motion.g>
                         )})}
                      </svg>
                          );
                      })()}
                      </animated.div>
                  )}

                  {/* Absolute Corner Sparkle for Identity Insight */}
                  <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
                     <button 
                        onClick={() => setShowNarrative(true)} 
                        className="group w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-emerald-500/30 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] pointer-events-auto"
                     >
                         <Lightbulb className="w-4 h-4 group-hover:scale-110 transition-transform animate-pulse" />
                     </button>
                  </div>
                  
                  {/* Full Narrative Modal Overlay */}
                  <AnimatePresence>
                      {showNarrative && (
                          <motion.div 
                              initial={{ opacity: 0, y: "100%" }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: "100%" }}
                              transition={{ type: "spring", damping: 25, stiffness: 200 }}
                              className="absolute inset-0 z-50 bg-neutral-950/95 backdrop-blur-2xl flex flex-col pointer-events-auto overflow-y-auto p-6 md:p-12 pb-24"
                          >
                              <div className="flex justify-between items-start mb-10 w-full max-w-4xl mx-auto pt-4 md:pt-0">
                                  <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/50 px-4 py-2 rounded-full border border-emerald-500/20">
                                      <Lightbulb className="w-4 h-4 animate-pulse" /> Identity Insight: {path.length > 0 ? path[path.length - 1].label : 'Overall'}
                                  </div>
                                  <button onClick={() => setShowNarrative(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 hover:text-white transition-all">
                                      <X className="w-5 h-5" />
                                  </button>
                              </div>
                              <div className="text-white flex-1 w-full max-w-4xl mx-auto">
                                  {isLoadingInsight ? (
                                     <div className="flex items-center justify-center gap-3 py-20 h-full">
                                       <Loader2 className="w-8 h-8 animate-spin text-emerald-500" /> 
                                       <span className="text-white/70 text-xl font-serif">Decoding your constellation...</span>
                                     </div>
                                  ) : (
                                     formatInsightText(insightText) || (
                                        <div className="text-2xl text-white/70 font-serif text-center mt-20">
                                            This view reveals the themes, connections, and curiosities that define your unique aesthetic.
                                        </div>
                                     )
                                  )}
                                  
                                  {!isLoadingInsight && (
                                      <motion.div 
                                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                                          className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                                      >
                                          <div className="text-emerald-400/80 text-sm md:text-base font-sans flex items-center gap-3">
                                              <Sparkles className="w-5 h-5 flex-shrink-0" /> <span>Click a highlighted node on the constellation to explore its deeper themes.</span>
                                          </div>
                                          {onInsightClick && (
                                          <button 
                                             onClick={(e) => { e.stopPropagation(); setShowNarrative(false); onInsightClick(); }} 
                                             className="w-full md:w-auto px-8 py-4 bg-emerald-500/20 text-emerald-400 font-bold tracking-wide rounded-full text-sm md:text-base whitespace-nowrap hover:bg-emerald-500/30 transition-colors shrink-0 flex items-center justify-center gap-2"
                                          >
                                             Explore {path.length > 0 ? path[path.length - 1].label : 'Library'} <ArrowRight className="w-4 h-4" />
                                          </button>
                                          )}
                                      </motion.div>
                                  )}
                              </div>
                          </motion.div>
                      )}
                  </AnimatePresence>
               </div>
           </div>
           
           {/* Identity Insight Card (Hide in fullscreen) */}
           {!fullScreen && (
            <div 
               onClick={() => setShowNarrative(true)}
               className="w-full bg-gradient-to-r from-neutral-900 to-black border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between cursor-pointer group hover:border-emerald-700/50 transition-colors shadow-lg min-h-[140px]"
            >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none opacity-50" />
                <div className="relative z-10 w-full md:max-w-xl pr-12 md:pr-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
                        <Lightbulb className="w-4 h-4 animate-pulse" /> Identity Insight: {path.length > 0 ? path[path.length - 1].label : 'Overall'}
                    </div>
                    {isOverall ? (
                        <div className="text-white/90 text-lg md:text-xl font-serif italic leading-relaxed line-clamp-3">
                            {isLoadingInsight ? (
                                 <div className="flex items-center gap-2">
                                   <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> Analyzing Taste Vector...
                                 </div>
                            ) : (
                                 formatInsightText(insightText, true) || "This view reveals the themes, connections, and curiosities that define your unique aesthetic."
                            )}
                        </div>
                    ) : (
                        <div className="text-white/90 text-lg md:text-xl font-serif italic leading-relaxed line-clamp-3">
                            {isLoadingInsight ? (
                                 <div className="flex items-center gap-2">
                                   <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> Defining Sub-Identity...
                                 </div>
                            ) : (
                                 formatInsightText(insightText, true) || "Your collection shows an authentic appreciation for craft and discovery in this domain."
                            )}
                        </div>
                    )}
                </div>
                
                <div 
                   onClick={(e) => { e.stopPropagation(); if (onInsightClick) onInsightClick(); }}
                   className="absolute md:relative right-6 top-6 md:top-auto md:right-auto w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/70 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50 transition-all transform hover:scale-110 z-10 flex-shrink-0 cursor-pointer"
                >
                    <ArrowRight className="w-5 h-5" />
                </div>
            </div>
           )}
       </div>
   );
}

