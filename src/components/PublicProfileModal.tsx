import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Compass, GitMerge, MessageCircle, Settings2, Heart, Bookmark, Sparkles, UserCheck, UserPlus, Headphones, Map as MapIcon, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { UserProfile, UserItem } from '../types';
import { checkItemAccess } from '../lib/privacy';
import { useUserItems } from '../hooks';
import TasteProfileDisplay from './TasteProfileDisplay';
import { TasteGraphDisplay } from './TasteGraphDisplay';
import { CATEGORY_SUB_FILTERS_DISPLAY_NAMES } from '../lib/constants';
import { ImageWithFallback } from "./ImageWithFallback";


const VennParticles = ({ progress }: { progress: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;
        
        const numParticles = 200;
        const particles = Array.from({ length: numParticles }).map((_, i) => ({
            id: i,
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            targetMode: i % 2 === 0 ? 'left' : 'right',
            color: i % 2 === 0 ? '#10b981' : '#6366f1' // Emerald / Indigo
        }));

        const render = () => {
             ctx.fillStyle = 'rgba(26, 26, 26, 0.3)';
             ctx.fillRect(0, 0, width, height);

             const centerX = width / 2;
             const centerY = height / 2;
             const radius = Math.min(width, height) * 0.25;

             const leftCenter = { x: centerX - radius*0.6, y: centerY };
             const rightCenter = { x: centerX + radius*0.6, y: centerY };

             particles.forEach(p => {
                 p.x += p.vx;
                 p.y += p.vy;
                 
                 if (progress > 0) {
                     const target = p.targetMode === 'left' ? leftCenter : rightCenter;
                     const dx = target.x - p.x;
                     const dy = target.y - p.y;
                     const dist = Math.sqrt(dx*dx + dy*dy);
                     
                     const angle = Math.atan2(dy, dx);
                     const swirlForce = (1 - progress) * 0.1;
                     p.vx += Math.cos(angle + swirlForce) * progress * 0.05;
                     p.vy += Math.sin(angle + swirlForce) * progress * 0.05;
                     
                     p.vx *= 0.95;
                     p.vy *= 0.95;
                     
                     if (progress > 0.8 && dist > radius * 0.9) {
                          p.x = target.x - Math.cos(angle) * radius * 0.9;
                          p.y = target.y - Math.sin(angle) * radius * 0.9;
                     }
                 } else {
                     if (p.x < 0 || p.x > width) p.vx *= -1;
                     if (p.y < 0 || p.y > height) p.vy *= -1;
                 }

                 ctx.beginPath();
                 ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                 ctx.fillStyle = p.color;
                 ctx.fill();
             });

             if (progress > 0.5) {
                 const alpha = (progress - 0.5) * 2;
                 ctx.lineWidth = 4;
                 
                 ctx.beginPath();
                 ctx.arc(leftCenter.x, leftCenter.y, radius, 0, Math.PI * 2);
                 ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 0.5})`;
                 ctx.stroke();

                 ctx.beginPath();
                 ctx.arc(rightCenter.x, rightCenter.y, radius, 0, Math.PI * 2);
                 ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.5})`;
                 ctx.stroke();
             }

             requestRef.current = requestAnimationFrame(render);
        };
        
        requestRef.current = requestAnimationFrame(render);
        
        return () => {
             if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [progress]);

    return (
        <canvas ref={canvasRef} className="w-full h-full absolute inset-0 z-0 pointer-events-none" />
    );
};

export default function PublicProfileModal({ isOpen, onClose, targetUserId, isFullScreen = false }: { isOpen: boolean, onClose: () => void, targetUserId: string | null, isFullScreen?: boolean }) {
  const { user, signIn } = useUser();
  const { userItems: myItems, loadingItems: myItemsLoading } = useUserItems();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [relationshipGroup, setRelationshipGroup] = useState<'friend' | 'family' | 'partner' | null>(null);
  const [allowedCategories, setAllowedCategories] = useState<string[]>(['movies', 'tv', 'books', 'food', 'music', 'places', 'products']);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'taste_dna' | 'compare'>('library');
  const [filterOption, setFilterOption] = useState<'default' | 'liked' | 'disliked'>('default');
  const [showLibraryOnly, setShowLibraryOnly] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>('completed');
  const [sortOption, setSortOption] = useState<'recency' | 'alphabetical' | 'rating' | 'year'>('recency');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [catTypeFilters, setCatTypeFilters] = useState<Record<string, Record<string, 'include' | 'exclude'>>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compare AI State
  const [comparePhase, setComparePhase] = useState<'idle' | 'analyzing' | 'result'>('idle');
  const [compareProgress, setCompareProgress] = useState(0);
  const [aiResult, setAiResult] = useState<{overlap: string, divergence: string, catalysts: string[]}|null>(null);
  
  const [tasteMatchPercent, setTasteMatchPercent] = useState<number | null>(null);

  useEffect(() => {
     if (myItems && items && myItems.length > 0 && items.length > 0 && tasteMatchPercent === null) {
         fetch('/api/taste-match', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 myTitles: myItems.filter(i => i.status !== 'up-next' && i.status !== 'planning').map(i => i.title),
                 theirTitles: items.filter(i => i.status !== 'up-next' && i.status !== 'planning').map(i => i.title)
             })
         })
         .then(r => r.json())
         .then(data => {
             if (data && typeof data.matchPercentage === 'number') {
                 setTasteMatchPercent(data.matchPercentage);
             }
         })
         .catch(e => console.error("Taste match fetch error", e));
     }
  }, [myItems, items, tasteMatchPercent]);

  useEffect(() => {
     const clickOutside = (e: MouseEvent) => {
        if (showSettings && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
           setShowSettings(false);
           window.dispatchEvent(new CustomEvent('refresh-feed'));
        }
     };
     document.addEventListener('mousedown', clickOutside);
     return () => document.removeEventListener('mousedown', clickOutside);
  }, [showSettings]);

  useEffect(() => {
    if (!isOpen || !targetUserId) return;
    
    // Reset to defaults
    setActiveTab('library');
    setStatusFilter('completed');
    
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (targetUserId.startsWith('mock_')) {
          const name = targetUserId.replace('mock_', '');
          if (isMounted) {
            setProfile({
              displayName: name,
              handle: name.toLowerCase().replace(/\s/g, ''),
              photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
              isDiscoverable: true,
              showSocialIndicators: true
            });
            setItems([
              { id: '5', category: 'food', title: 'Tatsu Ramen', subtitle: 'Austin, TX', status: 'completed', isPrivate: false, rating: 9.2, reaction: 'love', coverUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&h=750&fit=crop' } as any,
              { id: '6', category: 'movie', title: 'The Grand Budapest Hotel', subtitle: '2014 • Wes Anderson', status: 'completed', isPrivate: false, rating: 8.7, reaction: 'like', coverUrl: 'https://images.unsplash.com/photo-1563240619-44ce092cdc5f?w=500&h=750&fit=crop' } as any,
              { id: '7', category: 'music', title: 'Smells Like Teen Spirit', subtitle: 'Nirvana', status: 'completed', isPrivate: false, rating: 9.5, reaction: 'love', coverUrl: 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5cb37?w=500&h=750&fit=crop' } as any,
              { id: '8', category: 'book', title: 'Dune', subtitle: 'Frank Herbert', status: 'completed', isPrivate: false, rating: 9.0, reaction: 'dislike', coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=500&h=750&fit=crop' } as any,
              { id: '1', category: 'movie', title: 'Inception', subtitle: 'Christopher Nolan', status: 'completed', isPrivate: false, rating: 9.8, reaction: 'love' } as any,
              { id: '2', category: 'music', title: 'Bohemian Rhapsody', subtitle: 'Queen', status: 'completed', isPrivate: false, rating: 9.5 } as any,
              { id: '3', category: 'book', title: 'The Great Gatsby', subtitle: 'F. Scott Fitzgerald', status: 'completed', isPrivate: false, rating: 8.0 } as any,
              { id: '4', category: 'place', title: 'Central Park', subtitle: 'New York', status: 'completed', isPrivate: false, reaction: 'like', rating: 8.5 } as any,
            ]);
            setLoading(false);
          }
          return;
        }

        const pRef = doc(db, 'users', targetUserId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists() && isMounted) {
           setProfile(pSnap.data() as UserProfile);
        }

        let viewerGroup: string | null = null;
        if (user) {
            const viewerRef = doc(db, 'users', targetUserId, 'following', user.uid);
            const vSnap = await getDoc(viewerRef);
            if (vSnap.exists()) {
                viewerGroup = vSnap.data().relationshipGroup || null;
            }
        }
        
        const authorCirclesSnap = await getDocs(collection(db, "users", targetUserId, "circles"));
        const authorCircles = authorCirclesSnap.docs.map(d => ({id: d.id, ...d.data()}));

        const fetched: UserItem[] = [];
        const itemsMap = new Map<string, UserItem>();

        const chunksRef = collection(db, 'users', targetUserId, 'item_lists');
        const cSnap = await getDocs(chunksRef);
        cSnap.forEach(d => {
           const arr = d.data().items || [];
           arr.forEach((info: any) => {
              if (checkItemAccess(info, user?.uid || null, targetUserId, viewerGroup, authorCircles as any)) {
                  itemsMap.set(info.id, { ...info, _chunkId: d.id });
              }
           });
        });

        const itemsRef = collection(db, 'users', targetUserId, 'items');
        const iSnap = await getDocs(itemsRef);
        iSnap.forEach(d => {
           const info = d.data() as UserItem;
           if (checkItemAccess(info, user?.uid || null, targetUserId, viewerGroup, authorCircles as any)) {
               itemsMap.set(d.id, { id: d.id, ...info });
           }
        });
        
        fetched.push(...Array.from(itemsMap.values()));
        
        fetched.sort((a,b) => {
            const reactionA = a.reaction === 'love' ? 10 : (a.rating || 0);
            const reactionB = b.reaction === 'love' ? 10 : (b.rating || 0);
            if (reactionA !== reactionB) return reactionB - reactionA;
            return (b.dateAdded || 0) - (a.dateAdded || 0);
        });

        if (isMounted) {
           setItems(fetched);
        }

        if (user && isMounted) {
           const followRef = doc(db, 'users', user.uid, 'following', targetUserId);
           const fSnap = await getDoc(followRef);
           if (fSnap.exists()) {
               setIsFollowing(true);
               const data = fSnap.data();
               if (data.allowedCategories) setAllowedCategories(data.allowedCategories);
               if (data.relationshipGroup) setRelationshipGroup(data.relationshipGroup);
           } else {
               setIsFollowing(false);
               setAllowedCategories(['movies', 'tv', 'books', 'food', 'music', 'places', 'products']);
               setRelationshipGroup(null);
           }
        }
      } catch(e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { isMounted = false; };
  }, [isOpen, targetUserId, user]);

  const toggleFollow = async () => {
    if (!user) {
      signIn();
      return;
    }
    if (!targetUserId || !profile) return;
    const followRef = doc(db, "users", user.uid, "following", targetUserId);
    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        setIsFollowing(false);
      } else {
        await setDoc(followRef, { 
           targetUserId: targetUserId,
           followedAt: serverTimestamp(),
           targetDisplayName: profile.displayName || 'Unknown',
           allowedCategories: ['movies', 'tv', 'books', 'food', 'music', 'places', 'products']
        });
        setIsFollowing(true);
      }
    } catch (e) {
      console.error("Failed to toggle follow", e);
    }
  };

  const updateAllowedCategories = async (cat: string) => {
    if (!user || !targetUserId || !isFollowing) return;
    setAllowedCategories(prev => {
        let next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
        const followRef = doc(db, "users", user.uid, "following", targetUserId);
        setDoc(followRef, { allowedCategories: next }, { merge: true });
        return next;
    });
  };

  const updateRelationshipGroup = async (group: 'friend' | 'family' | 'partner' | null) => {
     if (!user || !targetUserId || !isFollowing) return;
     setRelationshipGroup(group);
     const followRef = doc(db, "users", user.uid, "following", targetUserId);
     setDoc(followRef, { relationshipGroup: group }, { merge: true });
  };

  const runCompareAI = async () => {
      if (!user || !targetUserId || !profile || myItemsLoading) return;
      if (comparePhase !== 'idle') return;
      
      setComparePhase('analyzing');
      setCompareProgress(0);

      const startTime = Date.now();
      const animateInterval = setInterval(() => {
          const now = Date.now();
          const elapsed = now - startTime;
          const p = Math.min(1, Math.max(0, elapsed / 3000));
          setCompareProgress(p);
          if (p >= 1) clearInterval(animateInterval);
      }, 50);

      try {
          const res = await fetch('/api/taste-compare-ai', {
             method: 'POST',
             headers: { 
                 'Content-Type': 'application/json',
                 'x-user-api-key': localStorage.getItem('user_gemini_api_key') || '',
                 'x-user-ai-provider': localStorage.getItem('user_ai_provider') || 'gemini'
             },
             body: JSON.stringify({
                myItems: myItems.filter(i => i.status !== 'up-next' && i.status !== 'planning'),
                theirItems: items.filter(i => i.status !== 'up-next' && i.status !== 'planning'),
                myName: user.displayName,
                theirName: profile.displayName || "Them"
             })
          });
          const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
          if (data.overlap) {
             setAiResult(data);
          }
      } catch(e) {}

      setTimeout(() => {
          setComparePhase('result');
      }, 3500);
  };

  if (!isOpen) return null;

  const narrativeContent = profile?.miniProfiles?.['overall']?.content;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[35] bg-white dark:bg-[#1a1a1a] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="w-full h-full relative overflow-hidden flex flex-col dark bg-[#05080b]"
          style={{ 
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(146, 105, 39, 0.08), transparent 50%), radial-gradient(circle at 50% 30%, rgba(41, 30, 18, 0.35) 0%, rgba(9, 11, 14, 1) 85%)',
            '--dp-gold': '#D6A95B',
            '--dp-border': 'rgba(229,184,107,.22)',
            '--dp-surface': '#0B1118'
          } as any}
        >
          <div className="w-full h-full overflow-y-auto overflow-x-hidden relative flex flex-col">
            <div className="w-full flex items-center justify-between p-4 border-b border-white/10 shrink-0 max-w-7xl mx-auto px-4 sm:px-8">
              <div className="font-logo text-xl tracking-[0.32em] font-semibold text-[#D6A95B] cursor-pointer select-none">DILECTI</div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4A75B] mb-4" />
              </div>
            ) : (!profile || profile.isDiscoverable === false) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-white/50">
                <p className="font-serif text-lg font-medium text-white mb-2">Unavailable</p>
                <p className="text-sm">This profile might not exist or is not public.</p>
              </div>
            ) : (
              <div className="flex-1 w-full flex flex-col pb-32 max-w-7xl mx-auto z-10 px-4 sm:px-8">
                
                {/* Hero Card */}
                <div className="mt-8 relative rounded-[2rem] p-6 sm:p-10 md:p-12 flex flex-col sm:flex-row items-center sm:items-center gap-6 sm:gap-10 overflow-hidden group shadow-2xl border border-white/[0.05] bg-gradient-to-br from-[#1a1a1a] via-[#111] to-black w-full text-center sm:text-left">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#D4A75B]/10 via-transparent to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A75B] opacity-[0.03] blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:opacity-[0.05] transition-opacity duration-700" />

                  {/* Taste Match Button (Absolute Top Right) */}
                  {user && user.uid !== targetUserId && tasteMatchPercent !== null && tasteMatchPercent > 0 && (
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-full py-1.5 px-3 shadow-lg">
                        <div className="w-6 h-6 rounded-full bg-[#D4A75B]/20 flex items-center justify-center">
                            <Heart className="w-3.5 h-3.5 text-[#D4A75B] fill-[#D4A75B]" />
                        </div>
                        <div className="flex flex-col items-start leading-none pt-0.5">
                            <span className="text-sm font-bold text-white">{tasteMatchPercent}%</span>
                            <span className="text-[9px] uppercase tracking-wider text-white/50">taste match</span>
                        </div>
                    </div>
                  )}

                  {/* Gold Coin / Avatar */}
                  <div className="relative z-10 shrink-0 mx-auto sm:mx-0 mt-8 sm:mt-0">
                    <div className="dp-avatar-wrap relative w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-[1.02]">
                      {/* Concentric Orbit Rings */}
                      <svg className="absolute inset-[-18px] w-[calc(100%+36px)] h-[calc(100%+36px)] pointer-events-none" viewBox="0 0 220 220" fill="none">
                        <circle cx="110" cy="110" r="105" stroke="var(--dp-gold, #D4A75B)" strokeWidth="1" strokeDasharray="3 4" opacity="0.25" />
                        <circle cx="110" cy="110" r="95" stroke="var(--dp-gold, #D4A75B)" strokeWidth="1" opacity="0.12" />
                        <circle cx="5" cy="110" r="4.5" fill="#FFEBB3" className="shadow-lg" />
                        <circle cx="5" cy="110" r="9" fill="#D4A75B" opacity="0.3" />
                      </svg>

                      {/* Roman Medallion (SVG based coin) */}
                      <div className="w-full h-full relative z-10 flex items-center justify-center">
                        <svg width="100%" height="100%" viewBox="0 0 160 160" className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]">
                          <defs>
                            <linearGradient id="gold-rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FFF2D4" />
                              <stop offset="25%" stopColor="#D4A75B" />
                              <stop offset="50%" stopColor="#7B561E" />
                              <stop offset="75%" stopColor="#F5D38E" />
                              <stop offset="100%" stopColor="#4A310D" />
                            </linearGradient>
                            
                            <radialGradient id="gold-coin-face" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                              <stop offset="0%" stopColor="#E5BE75" />
                              <stop offset="50%" stopColor="#9C6E2E" />
                              <stop offset="85%" stopColor="#5E3F15" />
                              <stop offset="100%" stopColor="#2E1C05" />
                            </radialGradient>

                            <linearGradient id="gold-emboss-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#FFEAB8" />
                              <stop offset="40%" stopColor="#D9A855" />
                              <stop offset="70%" stopColor="#8A5C1E" />
                              <stop offset="100%" stopColor="#54360B" />
                            </linearGradient>

                            <filter id="coin-inset-shadow" x="-10%" y="-10%" width="120%" height="120%">
                              <feOffset dx="1" dy="2"/>
                              <feGaussianBlur stdDeviation="1.5" result="offset-blur"/>
                              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                              <feFlood floodColor="black" floodOpacity="0.7" result="color"/>
                              <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                              <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                            </filter>

                            <filter id="emboss-filter" x="-10%" y="-10%" width="120%" height="120%">
                              <feDropShadow dx="1" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.8"/>
                              <feDropShadow dx="-0.5" dy="-0.5" stdDeviation="0.5" floodColor="#FFFFFF" floodOpacity="0.45"/>
                            </filter>
                          </defs>

                          {/* Coin Outer Ring (Beveled Edge) */}
                          <circle cx="80" cy="80" r="74" fill="url(#gold-rim-grad)" stroke="#3E270D" strokeWidth="1" />
                          
                          {/* Inner Rim Layer */}
                          <circle cx="80" cy="80" r="70" fill="#2A1B0A" />
                          <circle cx="80" cy="80" r="69" fill="url(#gold-rim-grad)" />
                          <circle cx="80" cy="80" r="66" fill="#1C1004" />

                          {/* Coin Face */}
                          <circle cx="80" cy="80" r="65" fill="url(#gold-coin-face)" filter="url(#coin-inset-shadow)" />

                          {/* Subtle Inner Beaded Circle */}
                          <circle cx="80" cy="80" r="60" fill="none" stroke="url(#gold-emboss-grad)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />

                          {/* Embossed Letter */}
                          <text 
                            x="80" 
                            y="98" 
                            fontFamily="var(--font-logo, serif)" 
                            fontSize="58" 
                            fontWeight="700"
                            textAnchor="middle" 
                            fill="url(#gold-emboss-grad)" 
                            filter="url(#emboss-filter)"
                            className="select-none font-logo"
                            style={{ letterSpacing: '0px' }}
                          >
                            {(profile.displayName || 'Dilecti').trim().charAt(0).toUpperCase()}
                          </text>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="min-w-0 flex-1 flex flex-col items-center sm:items-start text-center sm:text-left z-10 w-full mt-2 sm:mt-0">
                    <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
                      <div className="flex flex-col items-center sm:items-start max-w-full">
                          <h1 className="font-logo font-medium text-[24px] sm:text-[36px] md:text-[40px] tracking-[0.1em] sm:tracking-[0.18em] leading-[1.05] bg-gradient-to-b from-[#FFF2D4] via-[#D4A75B] to-[#7B561E] bg-clip-text text-transparent uppercase break-words text-balance flex flex-wrap items-center gap-2 justify-center sm:justify-start max-w-full">
                            {profile.displayName}
                            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#D4A75B] flex items-center justify-center text-black text-[10px] sm:text-xs shrink-0"><svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>
                          </h1>
                          <p className="text-white/40 text-xs sm:text-sm mt-2 font-medium flex items-center gap-2 justify-center sm:justify-start">
                             {profile.demographics?.location || "Global"} <span className="w-1 h-1 rounded-full bg-white/20" /> Dilecti since {profile.createdAt ? Math.max(2026, new Date(profile.createdAt.seconds ? profile.createdAt.seconds * 1000 : profile.createdAt).getFullYear()) : '2026'}
                          </p>
                      </div>
                      {user && user.uid !== targetUserId && (
                        <div className="flex flex-col gap-2 items-center sm:items-end shrink-0 relative mt-4 sm:mt-0 w-full sm:w-auto" ref={dropdownRef}>
                          <div className="flex gap-1 w-full max-w-[200px] justify-center sm:justify-end mx-auto sm:mx-0">
                              <button
                                 onClick={toggleFollow}
                                 className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[#D6A95B]/40 hover:border-[#D6A95B] hover:bg-[#D6A95B]/5 text-[10px] sm:text-xs font-sans tracking-wider rounded-full transition-all duration-300 uppercase ${isFollowing ? 'text-[#F2D28A] bg-white/5' : 'bg-[#D4A75B] text-black hover:bg-[#FFE099]'}`}
                              >
                                 <span>{isFollowing ? "Following" : "Follow"}</span>
                                 {isFollowing ? <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" /> : <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />}
                              </button>
                              {isFollowing && (
                                 <button 
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="hidden flex items-center justify-center px-2 border border-l-0 border-[#D6A95B]/40 hover:border-[#D6A95B] hover:bg-[#D6A95B]/5 text-[#F2D28A] rounded-r-full transition-all duration-300"
                                 >
                                    ▼
                                 </button>
                              )}
                          </div>
                          
                          {showSettings && isFollowing && (
                             <div className="absolute top-full mt-2 w-56 sm:right-0 bg-[#1a1a1a] border border-[#D6A95B]/20 rounded-2xl shadow-xl p-3 z-50 text-left flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                <p className="text-[10px] font-bold text-[#F2D28A] uppercase tracking-wider mb-1 px-2">Relationship</p>
                                {(['friend', 'family', 'partner'] as const).map(group => (
                                   <label key={group} className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded-xl cursor-pointer">
                                      <input type="radio" name="fs-relationship" checked={relationshipGroup === group} onChange={() => updateRelationshipGroup(group)} className="rounded-full text-[#D4A75B] focus:ring-[#D4A75B] bg-white/10 border-none w-4 h-4" />
                                      <span className="text-sm font-medium text-white capitalize">{group}</span>
                                   </label>
                                ))}
                                <label className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded-xl cursor-pointer mb-2">
                                   <input type="radio" name="fs-relationship" checked={relationshipGroup === null} onChange={() => updateRelationshipGroup(null)} className="rounded-full text-[#D4A75B] focus:ring-[#D4A75B] bg-white/10 border-none w-4 h-4" />
                                   <span className="text-sm font-medium text-white/50">None</span>
                                </label>
                                
                                <div className="h-px bg-white/10 my-1 w-full" />
                                <p className="text-[10px] font-bold text-[#F2D28A] uppercase tracking-wider mb-1 px-2 mt-1">Show items from</p>
                                {['movies', 'tv', 'books', 'food', 'music', 'places', 'products'].map(cat => (
                                   <label key={cat} className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded-xl cursor-pointer">
                                      <input type="checkbox" checked={allowedCategories.includes(cat)} onChange={() => updateAllowedCategories(cat)} className="rounded text-[#D4A75B] focus:ring-[#D4A75B] bg-white/10 border-none w-4 h-4" />
                                      <span className="text-sm font-medium text-white capitalize">{cat}</span>
                                   </label>
                                ))}
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                    {profile.bio && (
                       <div className="mt-4 sm:mt-6 text-[var(--dp-muted)] max-w-md font-serif text-base sm:text-lg leading-relaxed text-center sm:text-left flex gap-2 justify-center sm:justify-start items-start">
                           <span className="text-[#D4A75B] text-2xl font-serif leading-none mt-1">"</span>
                           <p>{profile.bio}</p>
                           <span className="text-[#D4A75B] text-2xl font-serif self-end leading-none mb-1">"</span>
                       </div>
                    )}
                  </div>
                </div>

                {/* Sticky Header with Tabs and Actions */}
                <div className="sticky top-0 z-40 bg-[#05080b]/90 backdrop-blur-xl border-b border-white/5 py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 flex flex-col items-center justify-between gap-4 mt-6">
                   {/* Tabs */}
                   <div className="flex gap-1 sm:gap-2 p-1 bg-white/5 border border-white/10 rounded-full w-max max-w-full overflow-x-auto hide-scrollbar">
                     <button 
                       onClick={() => setActiveTab('library')} 
                       className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'library' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                     >
                       Library
                     </button>
                     <button 
                       onClick={() => setActiveTab('taste_dna')} 
                       className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'taste_dna' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                     >
                       Taste DNA
                     </button>
                     {user && user.uid !== targetUserId && (
                       <button 
                         onClick={() => { setActiveTab('compare'); if (comparePhase === 'idle') runCompareAI(); }} 
                         className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'compare' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                       >
                         Compare To You
                       </button>
                     )}
                   </div>
                   
                   {activeTab === 'library' && (
                       <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-2 mb-2 w-full max-w-md mx-auto">
                          <div className={`flex flex-col items-center justify-center cursor-pointer p-2 rounded-xl transition-colors ${filterOption === 'default' && (statusFilter === null || statusFilter === 'completed') ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`} onClick={() => { setActiveTab('library'); setFilterOption('default'); setStatusFilter('completed'); setTimeout(() => document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                             <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4A75B]" />
                                <span className="text-lg sm:text-2xl font-serif text-white">{items.filter(i => i.status !== 'up-next' && i.status !== 'planning').length}</span>
                             </div>
                             <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-white/40 text-center">Saved</span>
                          </div>
                          <div className={`flex flex-col items-center justify-center cursor-pointer p-2 rounded-xl transition-colors ${filterOption === 'liked' ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`} onClick={() => { setActiveTab('library'); setFilterOption('liked'); setStatusFilter('completed'); setTimeout(() => document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                             <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
                                <span className="text-lg sm:text-2xl font-serif text-white">{items.filter(i => (i.reaction === 'love' || i.reaction === 'like' || Number(i.criticScore || i.rating) >= 8) && i.status !== 'up-next' && i.status !== 'planning').length}</span>
                             </div>
                             <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-white/40 text-center">Favorites</span>
                          </div>
                          <div className={`flex flex-col items-center justify-center cursor-pointer p-2 rounded-xl transition-colors ${statusFilter === 'up-next' ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`} onClick={() => { setActiveTab('library'); setStatusFilter('up-next'); setFilterOption('default'); setTimeout(() => document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                             <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4A75B]" />
                                <span className="text-lg sm:text-2xl font-serif text-white">{items.filter(i => i.status === 'up-next' || i.status === 'planning').length}</span>
                             </div>
                             <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-white/40 text-center">To Try</span>
                          </div>
                       </div>
                   )}

                   {/* Actions (if Library Tab) */}
                   <div className="w-full flex items-center justify-between sm:justify-end">
                   {activeTab === 'library' && (

                       <div className="flex items-center gap-2 shrink-0">
                         <div className="relative shrink-0 flex gap-2">
                           <button 
                             onClick={() => window.dispatchEvent(new CustomEvent('open-playlist-modal', { detail: { targetUserId: targetUserId } }))}
                             className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#1a1a1a] border border-purple-500/30 rounded-lg sm:rounded-xl hover:bg-purple-900/20 transition-colors text-purple-400"
                             title="Friend Mix"
                           >
                             <Headphones className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => window.dispatchEvent(new CustomEvent('open-map-modal', { detail: { targetUserId: targetUserId } }))}
                             className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#1a1a1a] border border-emerald-500/30 rounded-lg sm:rounded-xl hover:bg-emerald-900/20 transition-colors text-emerald-400"
                             title="Discovery Map"
                           >
                             <MapIcon className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => { setIsSortOpen(!isSortOpen); setIsFiltersOpen(false); }}
                             className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border rounded-lg sm:rounded-xl transition-colors ${isSortOpen ? 'bg-white border-white text-neutral-900' : 'bg-[#1a1a1a] border-white/10 text-white/70 hover:bg-neutral-800'}`}
                             title="Sort items"
                           >
                             <ArrowUpDown className="w-4 h-4" />
                           </button>
                           {isSortOpen && (
                             <div className="absolute top-full right-0 mt-3 bg-neutral-900 border border-white/10 rounded-xl shadow-xl p-2 w-[220px] z-50 flex flex-col items-start text-left text-sm text-white/70 animate-in fade-in duration-200">
                               <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Sort By</div>
                               
                               <button onClick={() => { setSortOption('recency'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${sortOption === 'recency' ? 'font-bold text-white bg-white/5' : ''}`}>
                                  Recently Saved {sortOption === 'recency' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setSortOption('alphabetical'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${sortOption === 'alphabetical' ? 'font-bold text-white bg-white/5' : ''}`}>
                                  Alphabetical {sortOption === 'alphabetical' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setSortOption('rating'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${sortOption === 'rating' ? 'font-bold text-white bg-white/5' : ''}`}>
                                  Rating {sortOption === 'rating' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setSortOption('year'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${sortOption === 'year' ? 'font-bold text-white bg-white/5' : ''}`}>
                                  Release Year {sortOption === 'year' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               
                               <div className="w-full h-px bg-white/10 my-1"></div>
                               <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Order</div>
                               
                               <button onClick={() => { setSortDirection('desc'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${sortDirection === 'desc' ? 'font-bold text-white' : ''}`}>
                                  Descending {sortDirection === 'desc' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setSortDirection('asc'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${sortDirection === 'asc' ? 'font-bold text-white' : ''}`}>
                                  Ascending {sortDirection === 'asc' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                             </div>
                           )}
                           <button 
                             onClick={() => { setIsFiltersOpen(!isFiltersOpen); setIsSortOpen(false); }}
                             className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border rounded-lg sm:rounded-xl transition-colors ${isFiltersOpen ? 'bg-white border-white text-neutral-900' : 'bg-[#1a1a1a] border-white/10 text-white/70 hover:bg-neutral-800'}`}
                             title="Filter items"
                           >
                             <SlidersHorizontal className="w-4 h-4" />
                           </button>
                           {isFiltersOpen && (
                             <div className="absolute top-full right-0 mt-3 bg-neutral-900 border border-white/10 rounded-xl shadow-xl p-2 w-[220px] max-h-[300px] overflow-y-auto z-50 flex flex-col items-start text-left text-sm text-white/70 animate-in fade-in duration-200 hide-scrollbar">
                               <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Visibility</div>
                               
                               <button onClick={() => { setShowLibraryOnly(true); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${showLibraryOnly ? 'font-bold text-white' : ''}`}>
                                  Library Items Only {showLibraryOnly && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setShowLibraryOnly(false); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${!showLibraryOnly ? 'font-bold text-white' : ''}`}>
                                  All Rated Items {!showLibraryOnly && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               
                               <div className="w-full h-px bg-white/10 my-1"></div>
                               <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Rating Filter</div>
                               <button onClick={() => { setFilterOption('default'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${filterOption === 'default' ? 'font-bold text-white' : ''}`}>
                                  Any Rating {filterOption === 'default' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setFilterOption('liked'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${filterOption === 'liked' ? 'font-bold text-white' : ''}`}>
                                  Liked Only (8+) {filterOption === 'liked' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setFilterOption('disliked'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${filterOption === 'disliked' ? 'font-bold text-white' : ''}`}>
                                  Disliked Only {filterOption === 'disliked' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <div className="w-full h-px bg-white/10 my-1"></div>
                               <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Status</div>
                               <button onClick={() => { setStatusFilter('all'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${statusFilter === 'all' ? 'font-bold text-white' : ''}`}>
                                  Any Status {statusFilter === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setStatusFilter('completed'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${statusFilter === 'completed' || statusFilter === null ? 'font-bold text-white' : ''}`}>
                                  Completed Only {(statusFilter === 'completed' || statusFilter === null) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                               <button onClick={() => { setStatusFilter('up-next'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-white/5 hover:text-white rounded-lg transition-colors ${statusFilter === 'up-next' ? 'font-bold text-white' : ''}`}>
                                  Want to Try Only {statusFilter === 'up-next' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                               </button>
                             </div>
                           )}
                         </div>
                       </div>
                   )}
                   </div>
                </div>

                {/* Tab Content */}
                <div className="w-full pt-4" id="library-section">
                  {/* LIBRARY TAB */}
                  {activeTab === 'library' && (
                     <div className="space-y-8">
                         <div className="space-y-12">
                             {['movies', 'tv', 'books', 'music', 'food', 'places', 'products', 'events', 'games', 'podcasts', 'creators', 'custom'].map(cat => {
                                 const catMap: Record<string, string[]> = {
                                   movies: ['movie', 'movies', 'watch'],
                                   tv: ['tv'],
                                   books: ['book', 'books', 'read'],
                                   music: ['music', 'listen'],
                                   food: ['food', 'foods'],
                                   places: ['place', 'places'],
                                   products: ['product', 'products'],
                                   events: ['event', 'events'],
                                   games: ['game', 'games', 'play'],
                                   podcasts: ['podcast', 'podcasts'],
                                   creators: ['creator', 'creators'],
                                   custom: ['custom']
                                 };
                                 
                                 let catItems = items.filter(i => {
                                     const iCat = (i.category || 'custom').toLowerCase();
                                     return catMap[cat]?.includes(iCat);
                                 });
                                                               // Apply Filter
                                 if (filterOption === 'default') {
                                    catItems = catItems.filter(i => {
                                        const ratingNum = i.rating ? Number(i.rating) : 0;
                                        const isLegacyGoogleRating = i.metadata?.googlePlacesRating === undefined && i.sourceAttribution === 'Google Places API' && Number(i.criticScore) > 0 && Number(i.criticScore) <= 5.0;
                                        const criticScoreNum = i.criticScore && !isLegacyGoogleRating ? Number(i.criticScore) : 0;
                                        const googlePlacesRating = Number(i.metadata?.googlePlacesRating !== undefined ? i.metadata?.googlePlacesRating : (isLegacyGoogleRating ? i.criticScore : 0));
                                        const isNotForMe = i.status === 'not-for-me' || i.status === 'abandoned' || i.reaction === 'hate' || i.reaction === 'dislike' || (ratingNum > 0 && ratingNum < 3) || (criticScoreNum > 0 && criticScoreNum < 5) || (googlePlacesRating > 0 && googlePlacesRating < 3);
                                        return !isNotForMe;
                                    });
                                 } else if (filterOption === 'liked') {
                                    catItems = catItems.filter(i => {
                                        const rNum = i.rating ? Number(i.rating) : 0;
                                        const isLgRating = i.metadata?.googlePlacesRating === undefined && i.sourceAttribution === 'Google Places API' && Number(i.criticScore) > 0 && Number(i.criticScore) <= 5.0;
                                        const cScoreNum = i.criticScore && !isLgRating ? Number(i.criticScore) : 0;
                                        const gpRating = Number(i.metadata?.googlePlacesRating !== undefined ? i.metadata?.googlePlacesRating : (isLgRating ? i.criticScore : 0));
                                        return rNum >= 4 || cScoreNum >= 7 || gpRating >= 4 || i.reaction === 'love' || i.reaction === 'like';
                                    });
                                 } else if (filterOption === 'disliked') {
                                    catItems = catItems.filter(i => {
                                        const rNum = i.rating ? Number(i.rating) : 0;
                                        const isLgRating = i.metadata?.googlePlacesRating === undefined && i.sourceAttribution === 'Google Places API' && Number(i.criticScore) > 0 && Number(i.criticScore) <= 5.0;
                                        const cScoreNum = i.criticScore && !isLgRating ? Number(i.criticScore) : 0;
                                        const gpRating = Number(i.metadata?.googlePlacesRating !== undefined ? i.metadata?.googlePlacesRating : (isLgRating ? i.criticScore : 0));
                                        return i.status === 'not-for-me' || i.status === 'abandoned' || i.reaction === 'hate' || i.reaction === 'dislike' || (rNum > 0 && rNum < 3) || (cScoreNum > 0 && cScoreNum < 5) || (gpRating > 0 && gpRating < 3);
                                    });
                                 }
                                 
                                 if (statusFilter === 'up-next') {
                                     catItems = catItems.filter(i => i.status === 'up-next' || i.status === 'planning');
                                 } else if (statusFilter === 'completed' || statusFilter === null) {
                                     catItems = catItems.filter(i => i.status !== 'up-next' && i.status !== 'planning');
                                 }
                                 
                                 if (showLibraryOnly) {
                                     catItems = catItems.filter(i => i.inLibrary !== false || i.status === 'up-next' || i.status === 'planning');
                                 }
                       
                                 // Apply Sort
                                 catItems.sort((a, b) => {
                                     let result = 0;
                                     if (sortOption === 'alphabetical') {
                                        result = (b.title || '').localeCompare(a.title || '');
                                     } else if (sortOption === 'rating') {
                                        const rA = a.reaction === 'love' ? 10 : (Number(a.rating) || 0);
                                        const rB = b.reaction === 'love' ? 10 : (Number(b.rating) || 0);
                                        result = rA - rB; 
                                     } else if (sortOption === 'year') {
                                        const yearA = a.metadata?.year || parseInt((a.title.match(/\b(19|20)\d{2}\b/) || [])[0] || '0') || Number(a.releaseYear) || 0;
                                        const yearB = b.metadata?.year || parseInt((b.title.match(/\b(19|20)\d{2}\b/) || [])[0] || '0') || Number(b.releaseYear) || 0;
                                        if (yearA !== yearB) result = yearA - yearB; 
                                        else result = (b.dateAdded || 0) - (a.dateAdded || 0);
                                     } else {
                                        result = (b.dateAdded || 0) - (a.dateAdded || 0);
                                     }
                                     return sortDirection === 'desc' ? result : -result;
                                 });

                                 if (catItems.length === 0) return null;
                                 
                                 const catDisplayNames: Record<string, string> = {
                                   movies: 'TV & Movies', tv: 'TV & Movies', books: 'Books', music: 'Music', food: 'Food', places: 'Places', products: 'Products', events: 'Events', games: 'Games/Sports', podcasts: 'Podcasts', creators: 'Creators', custom: 'Custom'
                                 };
                                 const displayName = catDisplayNames[cat] || cat;
                                 const availableFilters = CATEGORY_SUB_FILTERS_DISPLAY_NAMES[displayName] || [];
                                 
                                 return (
                                 <div key={cat} className="space-y-4">
                                     <h3 className="font-serif text-2xl font-bold capitalize px-2 text-[#F2D28A]">{cat}</h3>
                                     {availableFilters.length > 0 && (
                                       <div className="flex gap-2 mb-2 px-2 items-center overflow-x-auto hide-scrollbar pb-1">
                                         {availableFilters.map(f => {
                                           const state = catTypeFilters[cat]?.[f];
                                           return (
                                             <button 
                                               key={f}
                                               onClick={() => {
                                                 setCatTypeFilters(prev => {
                                                   const next = { ...prev };
                                                   if (!next[cat]) next[cat] = {};
                                                   if (!state) next[cat][f] = 'include';
                                                   else if (state === 'include') next[cat][f] = 'exclude';
                                                   else delete next[cat][f];
                                                   return next;
                                                 });
                                               }} 
                                               className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                                                 state === 'include' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : 
                                                 state === 'exclude' ? "bg-red-500/20 text-red-400 border-red-500/30 line-through" : 
                                                 "bg-white/5 border-transparent text-white/60 hover:bg-white/10"
                                               }`}
                                             >
                                               {f}
                                             </button>
                                           );
                                         })}
                                       </div>
                                     )}
                                     <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4 px-2 snap-x">
                                         {catItems.map((item, i) => (
                                             <div 
                                                 key={`${item.id}-${i}`} 
                                                 className="w-[160px] sm:w-[200px] flex-shrink-0 flex flex-col bg-[#1a1a1a] border border-white/5 rounded-[1.5rem] overflow-hidden shadow-sm relative group cursor-pointer hover:shadow-lg hover:border-[#D4A75B]/30 hover:-translate-y-1 transition-all duration-300 aspect-[2/3] snap-start"
                                                 onClick={() => window.dispatchEvent(new CustomEvent('open-item', { detail: { ...item, creatorProfile: profile } }))}
                                             >
                                                 {item.coverUrl ? (
                                                     <div className="w-full h-[60%] relative bg-black shrink-0">
                                                         <ImageWithFallback 
                                                              category={item.category} src={item.coverUrl} 
                                                             alt={item.title} 
                                                             className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                                             referrerPolicy="no-referrer"
                                                         />
                                                     </div>
                                                 ) : (
                                                     <div className="w-full h-[60%] flex flex-col items-center justify-center p-4 text-center shrink-0 bg-white/5 text-white/50">
                                                         <span className="font-bold text-xs sm:text-sm line-clamp-2 leading-tight">{item.title}</span>
                                                     </div>
                                                 )}
                                                 <div className="p-3 sm:p-4 flex flex-col flex-1 relative">
                                                     <h4 className="font-bold text-sm sm:text-base text-white mb-0.5 leading-tight line-clamp-1 group-hover:text-[#F2D28A] transition-colors">{item.title}</h4>
                                                     <p className="text-xs font-medium text-[var(--dp-muted)] line-clamp-1 mb-0.5">{item.subtitle || item.description || ''}</p>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             );
                         })}
                         </div>
                     </div>
                  )}

                  {/* TASTE DNA TAB */}
                  {activeTab === 'taste_dna' && (
                     <div className="space-y-12">
                     
                     <div className="bg-[#1a1a1a] border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl">
                            <h3 className="font-serif text-2xl text-[#F2D28A] mb-6 border-b border-white/10 pb-4">Media Metrics</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Total Items</div>
                                    <div className="text-2xl font-serif text-white">{items.length}</div>
                                </div>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Curated Favorites</div>
                                    <div className="text-2xl font-serif text-white">{items.filter(i => i.reaction === 'love').length}</div>
                                </div>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Categories</div>
                                    <div className="text-2xl font-serif text-white">{new Set((items || []).map(i => {
    let c = (i.category || '').toLowerCase();
    if (c === 'books') return 'book';
    if (c === 'games') return 'game';
    if (c === 'places') return 'place';
    if (c === 'events') return 'event';
    if (c === 'products') return 'product';
    if (c === 'tvs' || c === 'tv' || c === 'movie' || c === 'movies') return 'watch';
    return c;
}).filter(Boolean)).size}</div>
                                </div>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div className="text-[10px] text-[var(--dp-gold)] uppercase tracking-wider mb-1">Backlog Ratio</div>
                                    <div className="text-2xl font-serif text-white">{items.length > 0 ? Math.round((items.filter(i => i.status === 'up-next' || i.status === 'planning').length / items.length) * 100) : 0}%</div>
                                    <div className="text-[10px] text-white/40 mt-1">unread/unwatched</div>
                                </div>
                            </div>
                     </div>

                        {narrativeContent ? (
                          <div className="bg-[#1a1a1a] border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl">
                            <h3 className="font-serif text-2xl text-[#F2D28A] mb-6 border-b border-white/10 pb-4">Taste Persona</h3>
                            <div className="text-[14px] leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar pr-2 space-y-4">
                              {(() => {
                                  let profileData = null;
                                  try {
                                     const cleanText = narrativeContent.trim();
                                     if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
                                        profileData = JSON.parse(cleanText);
                                     } else {
                                        const match = cleanText.match(/\{[\s\S]*\}/);
                                        if (match) {
                                           profileData = JSON.parse(match[0]);
                                        }
                                     }
                                  } catch(e) {}
                                  return (
                                      <TasteProfileDisplay markdown={narrativeContent} profileData={profileData} />
                                  );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-white/50 border border-white/5 rounded-[2rem] bg-white/5">
                            <Compass className="w-8 h-8 mx-auto mb-4 opacity-30" />
                            <p>No narrative persona generated yet.</p>
                          </div>
                        )}

                        <div className="bg-[#1a1a1a] border border-white/10 rounded-[2rem] shadow-xl overflow-hidden min-h-[600px] relative">
                          <TasteGraphDisplay items={items.filter(i => i.status !== 'up-next' && i.status !== 'planning')} value="" onChange={() => {}} onToggleFavorite={() => {}} stickyTopClass="top-0" />
                        </div>
                     </div>
                  )}

                  {/* COMPARE TO YOU TAB */}
                  {activeTab === 'compare' && (
                     <div className="relative min-h-[60vh] bg-[#1a1a1a] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col items-center justify-center p-6 md:p-10">
                        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${comparePhase === 'result' ? 'opacity-20' : 'opacity-100'}`}>
                            <VennParticles progress={compareProgress} />
                        </div>

                        {(comparePhase === 'idle' || comparePhase === 'analyzing') && (
                           <div className="relative z-10 flex flex-col items-center justify-center text-center">
                              <h3 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
                                 {comparePhase === 'idle' ? 'Starting Analysis...' : 'Synthesizing Taste Profiles...'}
                              </h3>
                              <p className="text-white/60 font-medium max-w-md animate-pulse">
                                 Dilecti AI is currently analyzing shared genres, contrasting preferences, and overall aesthetic alignment.
                              </p>
                           </div>
                        )}

                        {comparePhase === 'result' && aiResult && (
                            <motion.div 
                               initial={{ opacity: 0, y: 20 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="relative z-20 w-full max-w-3xl space-y-8"
                            >
                                {/* Avatars Header */}
                                <div className="flex items-center justify-center gap-6 mb-8">
                                     <img 
                                          src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`}
                                          className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-[#1a1a1a] shadow-xl bg-emerald-900 object-cover"
                                      />
                                      <GitMerge className="w-8 h-8 text-[#D4A75B]" />
                                      <img 
                                          src={profile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.displayName}`}
                                          className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-[#1a1a1a] shadow-xl bg-indigo-900 object-cover"
                                      />
                                </div>

                                {/* Overlap Card */}
                                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-sm">
                                    <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[#D4A75B] mb-4 flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full bg-[#D4A75B]" />
                                       The Overlap
                                    </h4>
                                    <p className="font-serif text-xl md:text-2xl font-medium text-white leading-relaxed italic">
                                        "{aiResult.overlap}"
                                    </p>
                                </div>

                                {/* Divergence Card */}
                                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-sm">
                                    <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                       The Divergence
                                    </h4>
                                    <p className="font-serif text-lg md:text-xl font-medium text-white/90 leading-relaxed">
                                        {aiResult.divergence}
                                    </p>
                                </div>

                                {/* Catalysts */}
                                <div>
                                    <h4 className="font-sans text-sm font-bold uppercase tracking-widest text-white/40 mb-4 text-center">
                                       Friendship Catalysts
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {aiResult.catalysts.map((cat, i) => (
                                            <div key={i} className="bg-white/5 hover:bg-white/10 transition-colors p-5 rounded-2xl flex gap-4 items-start group cursor-default">
                                                <div className="bg-[#111] rounded-full p-2 shadow-sm text-white/50 group-hover:text-[#D4A75B] transition-colors mt-0.5">
                                                    <MessageCircle className="w-4 h-4" />
                                                </div>
                                                <p className="text-sm font-medium text-white/90 leading-snug">{cat}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                     </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
