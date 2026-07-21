import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, GitMerge, MessageCircle, ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { UserProfile, UserItem, TasteComparison } from '../types';
import { useUserItems } from '../hooks';

// Particle Venn Diagram Canvas
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
             // Dark mode canvas matching the modal background
             ctx.fillStyle = 'rgba(250, 249, 248, 0.3)';
             ctx.fillRect(0, 0, width, height);

             const centerX = width / 2;
             const centerY = height / 2;
             const radius = Math.min(width, height) * 0.25;

             const leftCenter = { x: centerX - radius*0.6, y: centerY };
             const rightCenter = { x: centerX + radius*0.6, y: centerY };

             particles.forEach(p => {
                 p.x += p.vx;
                 p.y += p.vy;
                 
                 // Apply forces based on progress
                 if (progress > 0) {
                     const target = p.targetMode === 'left' ? leftCenter : rightCenter;
                     const dx = target.x - p.x;
                     const dy = target.y - p.y;
                     const dist = Math.sqrt(dx*dx + dy*dy);
                     
                     // Swirl logic
                     const angle = Math.atan2(dy, dx);
                     const swirlForce = (1 - progress) * 0.1;
                     p.vx += Math.cos(angle + swirlForce) * progress * 0.05;
                     p.vy += Math.sin(angle + swirlForce) * progress * 0.05;
                     
                     // Dampen
                     p.vx *= 0.95;
                     p.vy *= 0.95;
                     
                     // Contain within circle if progress high
                     if (progress > 0.8 && dist > radius * 0.9) {
                          p.x = target.x - Math.cos(angle) * radius * 0.9;
                          p.y = target.y - Math.sin(angle) * radius * 0.9;
                     }
                 } else {
                     // Bounce off walls
                     if (p.x < 0 || p.x > width) p.vx *= -1;
                     if (p.y < 0 || p.y > height) p.vy *= -1;
                 }

                 ctx.beginPath();
                 ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                 ctx.fillStyle = p.color;
                 ctx.fill();
             });

             // Draw rings when fully formed
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

import { checkItemAccess } from '../lib/privacy';

export default function TasteCompareModal({ isOpen, onClose, targetUserId }: { isOpen: boolean, onClose: () => void, targetUserId: string | null }) {
  const { user } = useUser();
  const { userItems: myItems, loadingItems: myItemsLoading } = useUserItems();
  
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [targetItems, setTargetItems] = useState<UserItem[]>([]);
  
  const [phase, setPhase] = useState<'loading' | 'analyzing' | 'result'>('loading');
  const [progress, setProgress] = useState(0);
  const [aiResult, setAiResult] = useState<{overlap: string, divergence: string, catalysts: string[]}|null>(null);

  useEffect(() => {
    if (!isOpen || !targetUserId || !user) return;
    
    let isMounted = true;
    setPhase('loading');
    setProgress(0);
    setAiResult(null);

    const fetchTargetData = async () => {
      try {
        const pRef = doc(db, 'users', targetUserId);
        const pSnap = await getDoc(pRef);
        let theirProfile = null;
        if (pSnap.exists()) {
           theirProfile = pSnap.data() as UserProfile;
           setTargetProfile(theirProfile);
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

        const itemsRef = collection(db, 'users', targetUserId, 'items');
        const iSnap = await getDocs(itemsRef);
        const fetched: UserItem[] = [];
        iSnap.forEach(d => {
           const info = d.data() as UserItem;
           if (checkItemAccess(info, user?.uid || null, targetUserId, viewerGroup, authorCircles as any)) {
               fetched.push({ id: d.id, ...info });
           }
        });
        
        if (isMounted) {
           setTargetItems(fetched);
           setPhase('analyzing');
           
           // Start animation progression
           const startTime = Date.now();
           const animateInterval = setInterval(() => {
               const now = Date.now();
               const elapsed = now - startTime;
               const p = Math.min(1, Math.max(0, elapsed / 3000)); // 3 seconds to form
               setProgress(p);
               if (p >= 1) clearInterval(animateInterval);
           }, 50);

           // Hit AI endpoint
           try {
             const res = await fetch('/api/taste-compare-ai', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-api-key': localStorage.getItem('user_gemini_api_key') || '',
                    'x-user-ai-provider': localStorage.getItem('user_ai_provider') || 'gemini'
                },
                body: JSON.stringify({
                   myItems,
                   theirItems: fetched,
                   myName: user.displayName,
                   theirName: theirProfile?.displayName || "Them"
                })
             });
             const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
             if (data.overlap && isMounted) {
                setAiResult(data);
             }
           } catch(e) {}

           // Wait at least a few seconds for dramatic effect and then show result
           setTimeout(() => {
              if (isMounted) setPhase('result');
           }, 3500);
        }
      } catch(e) {
        console.error(e);
      }
    };
    
    // Only fetch once myItems are ready
    if (!myItemsLoading) {
      fetchTargetData();
    }
    
    return () => { isMounted = false; };
  }, [isOpen, targetUserId, user, myItemsLoading]);

  // Fallback close behavior if stuck
  useEffect(() => {
      if (phase === 'loading') {
         const t = setTimeout(() => {
              setPhase((prevPhase) => prevPhase !== 'result' ? 'analyzing' : prevPhase);
         }, 5000);
         return () => clearTimeout(t);
      }
  }, [phase]);


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-3xl rounded-2xl md:rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[85vh] dark:bg-[#1a1a1a]"
        >
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b border-black/5 flex items-center justify-between bg-white z-20 relative dark:bg-[#1a1a1a] dark:border-white/5">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 dark:text-emerald-300 dark:bg-emerald-900">
                    <GitMerge className="w-5 h-5" />
                 </div>
                 <div>
                    <h2 className="font-serif text-xl font-bold text-neutral-900 leading-tight dark:text-white">Taste Compare</h2>
                    <p className="text-xs text-black/50 tracking-wider uppercase font-semibold dark:text-white/50">Intersection Analysis</p>
                 </div>
             </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/50 hover:text-black transition-colors dark:bg-white/5 dark:text-white/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex-1 overflow-y-auto hide-scrollbar bg-white z-10 w-full flex flex-col dark:bg-[#1a1a1a]">
              
              {/* Particle Background always visible, but fades out when results show if we want, or stays as subtle background */}
              <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${phase === 'result' ? 'opacity-20' : 'opacity-100'}`}>
                  <VennParticles progress={progress} />
              </div>

              {(phase === 'loading' || phase === 'analyzing') && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
                    <h3 className="font-serif text-3xl font-bold text-neutral-900 mb-2 dark:text-white">
                       {phase === 'loading' ? 'Gathering Data...' : 'Synthesizing Taste Profiles...'}
                    </h3>
                    <p className="text-neutral-500 font-medium max-w-md animate-pulse dark:text-neutral-400">
                       Dilecti AI is currently analyzing shared genres, contrasting preferences, and overall aesthetic alignment.
                    </p>
                 </div>
              )}

              {phase === 'result' && aiResult && (
                  <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="p-6 md:p-10 space-y-8 z-20 relative max-w-2xl mx-auto"
                  >
                      {/* Avatars Header */}
                      <div className="flex items-center justify-center gap-4 mb-4">
                           <img 
                                src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`}
                                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white shadow-xl bg-emerald-100 object-cover dark:bg-emerald-900"
                            />
                            <GitMerge className="w-6 h-6 text-neutral-300" />
                            <img 
                                src={targetProfile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${targetProfile?.displayName}`}
                                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white shadow-xl bg-indigo-100 object-cover"
                            />
                      </div>

                      {/* Overlap Card */}
                      <div className="bg-white border rounded-[2rem] p-8 shadow-sm dark:bg-[#1a1a1a]">
                          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2 dark:text-emerald-400">
                             <div className="w-2 h-2 rounded-full bg-emerald-500" />
                             The Overlap
                          </h4>
                          <p className="font-serif text-xl md:text-2xl font-medium text-neutral-900 leading-relaxed italic dark:text-white">
                              "{aiResult.overlap}"
                          </p>
                      </div>

                      {/* Divergence Card */}
                      <div className="bg-white border rounded-[2rem] p-8 shadow-sm dark:bg-[#1a1a1a]">
                          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-indigo-500" />
                             The Divergence
                          </h4>
                          <p className="font-serif text-lg md:text-xl font-medium text-neutral-800 leading-relaxed dark:text-neutral-200">
                              {aiResult.divergence}
                          </p>
                      </div>

                      {/* Catalysts */}
                      <div>
                          <h4 className="font-sans text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4 text-center dark:text-neutral-500">
                             Friendship Catalysts
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {aiResult.catalysts.map((cat, i) => (
                                  <div key={i} className="bg-black/5 hover:bg-black/10 transition-colors p-5 rounded-2xl flex gap-4 items-start group cursor-default dark:bg-white/5">
                                      <div className="bg-white rounded-full p-2 shadow-sm text-neutral-500 group-hover:text-emerald-600 transition-colors mt-0.5 dark:bg-[#1a1a1a] dark:text-neutral-400">
                                          <MessageCircle className="w-4 h-4" />
                                      </div>
                                      <p className="text-sm font-medium text-neutral-800 leading-snug dark:text-neutral-200">{cat}</p>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-black/5 dark:border-white/5">
                          <button 
                             onClick={async () => {
                                 if (navigator.share) {
                                     try {
                                         await navigator.share({
                                             title: 'Dilecti Taste Analysis',
                                             text: `Check out this AI Taste Analysis between ${user?.displayName} and ${targetProfile?.displayName}!\n\nThe Overlap: ${aiResult.overlap}\n\nThe Divergence: ${aiResult.divergence}`,
                                             url: window.location.href,
                                         });
                                     } catch(e) {}
                                 } else {
                                     navigator.clipboard.writeText(`Dilecti Taste Analysis between ${user?.displayName} and ${targetProfile?.displayName}:\n\nOverlap: ${aiResult.overlap}\n\nDivergence: ${aiResult.divergence}`);
                                     alert("Analysis copied to clipboard!");
                                 }
                             }}
                             className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-full font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> Share Graph
                          </button>
                          
                          <button 
                             onClick={onClose}
                             className="bg-white hover:bg-neutral-50 text-neutral-800 border-2 border-neutral-200 px-8 py-3.5 rounded-full font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center dark:bg-[#1a1a1a] dark:text-neutral-200 dark:border-white/10"
                          >
                             Done
                          </button>
                      </div>
                  </motion.div>
              )}

              {phase === 'result' && !aiResult && (
                  <div className="flex-1 flex items-center justify-center text-neutral-500 p-8 text-center bg-white z-20 dark:bg-[#1a1a1a] dark:text-neutral-400">
                      <p>We couldn't generate a taste analysis at this time. Try again later.</p>
                  </div>
              )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
