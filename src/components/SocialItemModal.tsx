import React from 'react';
import { X, Star } from 'lucide-react';
import { getMockFriendsForTitle } from '../lib/utils';
import { cn } from '../lib/utils';

export function SocialItemModal({ isOpen, onClose, title }: { isOpen: boolean, onClose: () => void, title: string | null }) {
  if (!isOpen || !title) return null;
  const friends = getMockFriendsForTitle(title) || [];
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60" onClick={onClose} />
      <div className="bg-white dark:bg-[#111111] w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
         <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
            <h3 className="font-serif text-2xl font-bold text-neutral-900 dark:text-white">Friends who liked</h3>
            <button onClick={onClose} className="p-2 bg-black/5 hover:bg-black/10 rounded-full dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
         </div>
         <div className="p-6 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
             <h4 className="font-bold text-lg text-emerald-700 dark:text-emerald-400">"{title}"</h4>
         </div>
         <div className="p-6 max-h-[60vh] overflow-y-auto">
             {friends.length === 0 ? (
                 <p className="text-black/50 dark:text-white/50 text-center py-8 font-medium">No friends have this item yet.</p>
             ) : (
                 <div className="flex flex-col gap-4">
                     {friends.map((name, i) => (
                         <div key={i} className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-2xl cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                              onClick={() => {
                                  onClose();
                                  window.dispatchEvent(new CustomEvent('open-public-profile', { detail: { userId: `mock_${name}` } }));
                              }}
                         >
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=b6e3f4`} alt={name} className="w-12 h-12 rounded-full border border-black/10 dark:border-white/10" />
                            <div className="flex-1">
                                <h4 className="font-bold text-neutral-900 dark:text-white">{name}</h4>
                                <div className="flex gap-2 mt-1">
                                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full"><Star className="w-3 h-3"/> Highly Rated</span>
                                </div>
                            </div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
      </div>
    </div>
  );
}
