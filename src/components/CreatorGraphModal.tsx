import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search } from 'lucide-react';
import { UserItem } from '../types';
import { useUserItems } from '../hooks';
import { CATEGORY_META } from '../components/UniversalLibrary';
import { ImageWithFallback } from "./ImageWithFallback";


export default function CreatorGraphModal() {
  const [targetItem, setTargetItem] = useState<UserItem | null>(null);
  const { userItems } = useUserItems();

  useEffect(() => {
    const handleOpen = (e: CustomEvent) => {
      setTargetItem(e.detail);
    };
    window.addEventListener('open-creator-graph' as any, handleOpen);
    return () => window.removeEventListener('open-creator-graph' as any, handleOpen);
  }, []);

  if (!targetItem) return null;

  const creatorName = targetItem.subtitle;
  const relatedItems = creatorName 
     ? userItems.filter(item => 
         item.id !== targetItem.id && 
         (item.subtitle === creatorName || item.title?.includes(creatorName) || item.metadata?.tags?.includes(creatorName))
       )
     : [];

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setTargetItem(null)}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300]"
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-[32px] overflow-hidden shadow-2xl z-[350] flex flex-col pt-2 dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto my-3 shrink-0 dark:bg-white/10" />
        
        <div className="px-6 pb-4 border-b border-black/5 shrink-0 flex justify-between items-center dark:border-white/5">
            <div>
               <h2 className="text-xl font-bold text-neutral-900 font-serif dark:text-white">More by {creatorName}</h2>
               <p className="text-sm text-neutral-500 font-medium mt-1 dark:text-neutral-400">Creator Graph Analysis</p>
            </div>
            <button onClick={() => setTargetItem(null)} className="p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-black/60 hover:text-black dark:bg-white/5 dark:text-white/60">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-6 overflow-y-auto">
            {relatedItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {relatedItems.map((item, i) => {
                        const meta = CATEGORY_META[item.category as any] || CATEGORY_META['books'];
                        return (
                            <div 
                                key={`${item.id}-${i}`} 
                                onClick={() => {
                                    setTargetItem(null);
                                    setTimeout(() => window.dispatchEvent(new CustomEvent('open-item', { detail: item })), 100);
                                }}
                                className="cursor-pointer group flex flex-col"
                            >
                                <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-sm border border-black/5 bg-white relative dark:bg-[#1a1a1a] dark:border-white/5">
                                    {item.coverUrl ? (
                                        <ImageWithFallback src={item.coverUrl!} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${meta.bgColor} ${meta.textColor}`}>
                                            <span className="font-bold text-sm line-clamp-3 leading-tight">{item.title}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-bold text-sm text-neutral-900 line-clamp-1 dark:text-white">{item.title}</h4>
                                    <p className="text-xs text-neutral-500 line-clamp-1 dark:text-neutral-400">{item.category}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="w-12 h-12 text-black/10 mb-4" />
                    <h3 className="text-lg font-bold text-neutral-900 mb-2 dark:text-white">No other items found</h3>
                    <p className="text-sm text-neutral-500 max-w-xs dark:text-neutral-400">You haven't added anything else by {creatorName} to your library yet.</p>
                </div>
            )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
