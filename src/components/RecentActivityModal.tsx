import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface RecentActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecentActivityModal({ isOpen, onClose }: RecentActivityModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-safe">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-white dark:bg-[#1a1a1a] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        >
           <div className="px-6 py-4 flex items-center justify-between border-b border-neutral-100 dark:border-white/5 shrink-0">
             <h2 className="font-serif font-bold text-xl text-neutral-900 dark:text-white">Recent Activity</h2>
             <button onClick={onClose} className="p-2 bg-neutral-100 dark:bg-white/5 rounded-full hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-neutral-500" />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0 bg-neutral-50/50 dark:bg-black/20">
               {/* Mock Extended List */}
               <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-neutral-200 dark:border-white/5 shadow-sm">
                  <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-white/5 pb-3">
                     <div className="flex items-center gap-3">
                        <img src="https://i.pravatar.cc/150?u=emma" className="w-8 h-8 rounded-full border border-neutral-200 shrink-0" />
                        <div className="text-sm">
                           <span className="font-bold text-neutral-900 dark:text-white">Emma Watson</span> <span className="text-neutral-500">rated 5 items</span>
                        </div>
                     </div>
                     <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">1d ago</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                     <div className="w-full aspect-[2/3] rounded-lg bg-neutral-100 overflow-hidden shrink-0"><img src="https://m.media-amazon.com/images/M/MV5BODdjMjM3ZGItNThhNC00ZTE0LWE4ZWQtNzU3NTE4MzlhMTcwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" className="w-full h-full object-cover"/></div>
                     <div className="w-full aspect-[2/3] rounded-lg bg-neutral-100 overflow-hidden shrink-0"><img src="https://covers.openlibrary.org/b/id/11494950-L.jpg" className="w-full h-full object-cover"/></div>
                     <div className="w-full aspect-[2/3] rounded-lg bg-neutral-100 overflow-hidden shrink-0"><img src="https://covers.openlibrary.org/b/id/12690987-L.jpg" className="w-full h-full object-cover"/></div>
                     <div className="w-full aspect-[2/3] rounded-lg bg-neutral-100 overflow-hidden shrink-0"><img src="https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover"/></div>
                     <div className="w-full aspect-[2/3] rounded-lg bg-neutral-50 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-neutral-500 border border-neutral-200 dark:border-white/10">+2</div>
                  </div>
               </div>

               <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-neutral-200 dark:border-white/5 shadow-sm">
                  <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-white/5 pb-3">
                     <div className="flex items-center gap-3">
                        <img src="https://i.pravatar.cc/150?u=chris" className="w-8 h-8 rounded-full border border-neutral-200 shrink-0" />
                        <div className="text-sm">
                           <span className="font-bold text-neutral-900 dark:text-white">Chris Evans</span> <span className="text-neutral-500">watched a movie</span>
                        </div>
                     </div>
                     <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">2d ago</span>
                  </div>
                  <div className="flex gap-4 items-center">
                     <div className="w-16 h-24 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-black/5"><img src="https://m.media-amazon.com/images/M/MV5BODdjMjM3ZGItNThhNC00ZTE0LWE4ZWQtNzU3NTE4MzlhMTcwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" className="w-full h-full object-cover"/></div>
                     <div className="flex-1">
                        <div className="text-base font-bold text-neutral-900 dark:text-white line-clamp-1">Dune: Part Two</div>
                        <div className="text-sm text-neutral-500 mb-1">Epic, visually stunning, and unforgettable.</div>
                        <div className="flex items-center gap-1 mt-1 text-sm font-bold text-emerald-600">
                           <Star className="w-4 h-4 fill-emerald-600" /> 8/10
                        </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-neutral-300" />
                  </div>
               </div>

               <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-neutral-200 dark:border-white/5 shadow-sm">
                  <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-white/5 pb-3">
                     <div className="flex items-center gap-3">
                        <img src="https://i.pravatar.cc/150?u=zoe" className="w-8 h-8 rounded-full border border-neutral-200 shrink-0" />
                        <div className="text-sm">
                           <span className="font-bold text-neutral-900 dark:text-white">Zoe Saldana</span> <span className="text-neutral-500">read a book</span>
                        </div>
                     </div>
                     <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">3d ago</span>
                  </div>
                  <div className="flex gap-4 items-center">
                     <div className="w-16 h-24 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-black/5"><img src="https://covers.openlibrary.org/b/id/12690987-L.jpg" className="w-full h-full object-cover"/></div>
                     <div className="flex-1">
                        <div className="text-base font-bold text-neutral-900 dark:text-white line-clamp-2 leading-tight">Tomorrow, and Tomorrow, and Tomorrow</div>
                        <div className="flex items-center gap-1 mt-2 text-sm font-bold text-emerald-600">
                           <Star className="w-4 h-4 fill-emerald-600" /> 9/10
                        </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-neutral-300" />
                  </div>
               </div>
           </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
