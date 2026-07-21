import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, ArrowLeft, BookOpen, Tv, Utensils, Gamepad, Music, Plane, Users, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ICONS = [
  { id: 'book', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50', name: 'Reading' },
  { id: 'tv', icon: Tv, color: 'text-orange-500', bg: 'bg-orange-50', name: 'Movies & TV' },
  { id: 'food', icon: Utensils, color: 'text-rose-500', bg: 'bg-rose-50', name: 'Food' },
  { id: 'game', icon: Gamepad, color: 'text-purple-500', bg: 'bg-purple-50', name: 'Games' },
  { id: 'music', icon: Music, color: 'text-sky-500', bg: 'bg-sky-50', name: 'Music' },
  { id: 'travel', icon: Plane, color: 'text-indigo-500', bg: 'bg-indigo-50', name: 'Travel' },
  { id: 'users', icon: Users, color: 'text-neutral-500', bg: 'bg-neutral-100', name: 'General' },
];

export function CreateCircleModal({ isOpen, onClose, onCreated }: { isOpen: boolean, onClose: () => void, onCreated: () => void }) {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [friendCategories, setFriendCategories] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !user) {
      setStep(1);
      setName('');
      setDescription('');
      setSelectedFriends(new Set());
      setFriendCategories({});
      setSearch('');
      setSelectedIcon(ICONS[0]);
      return;
    }
    const fetchFriends = async () => {
      setLoading(true);
      try {
        const followsRef = collection(db, "users", user.uid, "following");
        const snap = await getDocs(followsRef);
        const fetched: any[] = [];
        for (const d of snap.docs) {
           const friendDoc = await getDoc(doc(db, "users", d.id));
           if (friendDoc.exists()) {
              fetched.push({ id: d.id, ...friendDoc.data() });
           }
        }
        setFriends(fetched);
      } catch (err) {
        console.error("Error fetching friends:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [isOpen, user]);

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => {
       const newSet = new Set(prev);
       if (newSet.has(id)) {
           newSet.delete(id);
       } else {
           newSet.add(id);
           setFriendCategories(c => ({...c, [id]: ['movies', 'tv', 'books', 'food', 'music', 'places', 'games']}));
       }
       return newSet;
    });
  };

  const toggleCategory = (friendId: string, category: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setFriendCategories(prev => {
          const cats = prev[friendId] || [];
          if (cats.includes(category)) {
              return { ...prev, [friendId]: cats.filter(c => c !== category) };
          } else {
              return { ...prev, [friendId]: [...cats, category] };
          }
      });
  };

  const handleCreate = async () => {
    if (!user || !name) return;
    setLoading(true);
    try {
       const circleId = Date.now().toString();
       const circleRef = doc(db, "users", user.uid, "circles", circleId);
       await setDoc(circleRef, {
          id: circleId,
          name,
          description,
          iconId: selectedIcon.id,
          color: selectedIcon.color,
          bg: selectedIcon.bg,
          members: Array.from(selectedFriends),
          memberSettings: friendCategories,
          createdAt: serverTimestamp()
       });
       onCreated();
       onClose();
    } catch (e) {
       console.error("Failed to create circle", e);
    } finally {
       setLoading(false);
    }
  };

  const filteredFriends = friends.filter(f => 
    (f.displayName?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] min-h-[60vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                 <button onClick={() => step === 2 ? setStep(1) : onClose()} className="p-2 hover:bg-neutral-100 rounded-full dark:hover:bg-neutral-800 transition-colors">
                   {step === 2 ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
                 </button>
                 <h2 className="font-serif text-xl font-bold dark:text-white">
                    {step === 1 ? "Create Circle" : "Add People"}
                 </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-left">
                  <div>
                     <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Name your circle</label>
                     <input 
                        type="text" 
                        placeholder="e.g. Book Club" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl py-4 flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3">Choose an icon</label>
                     <div className="flex flex-wrap gap-3">
                        {ICONS.map(i => {
                           const isSelected = selectedIcon.id === i.id;
                           return (
                              <button 
                                 key={i.id}
                                 onClick={() => setSelectedIcon(i)}
                                 className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                                    isSelected ? cn(i.bg, "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-neutral-900 shadow-sm") : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                 )}
                              >
                                 <i.icon className={cn("w-5 h-5", isSelected ? i.color : "text-neutral-500 dark:text-neutral-400")} />
                              </button>
                           )
                        })}
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Add description (optional)</label>
                     <textarea 
                        placeholder="What is this circle about?" 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none text-sm"
                     />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right h-full flex flex-col">
                   <div className="relative shrink-0">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                     <input
                        type="text"
                        placeholder="Search friends..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-full py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                     />
                   </div>

                   <div className="flex-1 overflow-y-auto space-y-1">
                      {loading ? (
                         <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                         </div>
                      ) : filteredFriends.length > 0 ? (
                         filteredFriends.map(f => {
                            const isSelected = selectedFriends.has(f.id);
                            return (
                               <div key={f.id} className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/50 rounded-2xl overflow-hidden mb-2">
                                 <div onClick={() => toggleFriend(f.id)} className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group">
                                   <div className="flex items-center gap-4">
                                     <img 
                                        src={f.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${f.displayName}`} 
                                        className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-800"
                                     />
                                     <span className="font-bold text-sm text-neutral-900 dark:text-white">{f.displayName}</span>
                                   </div>
                                   <div className={cn(
                                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                      isSelected ? "bg-emerald-500 border-emerald-500" : "border-neutral-300 dark:border-neutral-600 group-hover:border-emerald-400"
                                   )}>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                   </div>
                                 </div>
                                 {isSelected && (
                                    <div className="pl-16 pr-4 pb-3 flex flex-wrap gap-2">
                                      {[
                                         { id: 'movies', label: 'Movies & TV', icon: Tv },
                                         { id: 'books', label: 'Books', icon: BookOpen },
                                         { id: 'food', label: 'Food', icon: Utensils },
                                         { id: 'music', label: 'Music', icon: Music },
                                         { id: 'games', label: 'Games', icon: Gamepad },
                                      ].map(cat => {
                                         const included = (friendCategories[f.id] || []).includes(cat.id);
                                         return (
                                           <button
                                             key={cat.id}
                                             onClick={(e) => toggleCategory(f.id, cat.id, e)}
                                             className={cn(
                                                "px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors border",
                                                included 
                                                 ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400" 
                                                 : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400"
                                             )}
                                           >
                                             <cat.icon className="w-3 h-3" /> {cat.label}
                                           </button>
                                         )
                                      })}
                                    </div>
                                 )}
                               </div>
                            )
                         })
                      ) : (
                         <div className="text-center py-12 text-neutral-500 text-sm">
                            {friends.length === 0 ? "You haven't followed any friends yet." : "No friends found matching your search."}
                         </div>
                      )}
                   </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
               {step === 1 ? (
                  <button 
                     disabled={!name}
                     onClick={() => setStep(2)} 
                     className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     Next
                  </button>
               ) : (
                  <button 
                     disabled={loading}
                     onClick={handleCreate} 
                     className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                     Create Circle ({selectedFriends.size})
                  </button>
               )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
