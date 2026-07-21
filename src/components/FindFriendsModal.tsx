import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, UserPlus, UserCheck, ArrowLeft, Heart, Link, Users, Smartphone } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { useUserProfile } from '../hooks';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function FindFriendsModal({ isOpen, onClose, following, onFollowToggle, initialTab = 'discover', initialSearch = '' }: { isOpen: boolean, onClose: () => void, following: Set<string>, onFollowToggle: (id: string, name: string) => void, initialTab?: 'discover' | 'invite' | 'contacts' | 'following' | 'followers' | 'matches', initialSearch?: string }) {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const [search, setSearch] = useState(initialSearch);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'invite' | 'contacts' | 'following' | 'followers' | 'matches'>(initialTab);

  useEffect(() => {
    if (isOpen) {
       setActiveTab(initialTab);
       if (initialSearch) setSearch(initialSearch);
    }
  }, [isOpen, initialTab, initialSearch]);

  useEffect(() => {
    if (!isOpen || !user || !profile) return;
    
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(search ? 500 : 100)); 
        const snap = await getDocs(q);
        const fetched: any[] = [];
        const lowerSearch = search.toLowerCase();
        const myInterests = new Set(profile.interests || []);
        
        snap.forEach(d => {
          if (d.id !== user.uid) {
            const data = d.data();
            
            let matchScore = 0; 
            const theirInterests = data.interests || [];
            theirInterests.forEach((i: string) => { if (myInterests.has(i)) matchScore += 15; });
            
            const tasteMatch = Math.min(99, matchScore);

            if (search) {
               const matchesSearch = (data.displayName?.toLowerCase() || '').includes(lowerSearch) || (data.email?.toLowerCase() || '').includes(lowerSearch);
               if (matchesSearch) fetched.push({ id: d.id, tasteMatch, ...data });
            } else {
               fetched.push({ id: d.id, tasteMatch, ...data });
            }
          }
        });
        
        // Deduplicate
        const unique = Array.from(new Map(fetched.map(item => [item.id, item])).values());
        setUsers(unique.slice(0, 50)); // limit display to 50
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };
    
    const timer = setTimeout(() => {
       fetchUsers();
    }, search ? 400 : 0);
    
    return () => clearTimeout(timer);
  }, [isOpen, user, profile, search]);

  const [initialFollowing, setInitialFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setInitialFollowing(new Set(following));
    }
  }, [isOpen]);

  const filteredUsers = users.filter(u => {
    if (search) return true; // If searching, show all matches regardless of tab
    if (activeTab === 'following') return initialFollowing.has(u.id);
    if (activeTab === 'followers') return false; // Not implemented followers
    if (activeTab === 'matches') return u.tasteMatch > 70;
    if (activeTab === 'discover') return !initialFollowing.has(u.id);
    return true;
  });

  const handleShare = async () => {
     if (navigator.share) {
        try {
           await navigator.share({
              title: 'Join me on Dilecti',
              text: 'Check out Dilecti, the best way to share what you love with friends!',
              url: window.location.origin
           });
        } catch (e) {
           console.log('Error sharing:', e);
        }
     } else {
        alert("Sharing is not supported on this device.");
     }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] min-h-[70vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                 <button onClick={() => activeTab === 'contacts' ? setActiveTab('invite') : onClose()} className="p-2 hover:bg-neutral-100 rounded-full dark:hover:bg-neutral-800 transition-colors">
                   {activeTab === 'contacts' ? <ArrowLeft className="w-5 h-5"/> : <X className="w-5 h-5" />}
                 </button>
                 <h2 className="font-serif text-xl font-bold dark:text-white">
                    {search ? "Search Results" : activeTab === 'discover' ? "Find Friends" : activeTab === 'invite' ? "Invite Friends" : activeTab === 'following' ? 'Following' : activeTab === 'followers' ? 'Followers' : activeTab === 'matches' ? 'Taste Twins' : "Contacts"}
                 </h2>
              </div>
            </div>

            {activeTab !== 'contacts' && !search && (
               <div className="flex px-4 pt-2 border-b border-neutral-100 dark:border-neutral-800 overflow-x-auto hide-scrollbar gap-2">
                  <button 
                     onClick={() => setActiveTab('discover')} 
                     className={cn("whitespace-nowrap px-2 text-sm font-bold py-3 border-b-2 text-center transition-colors", activeTab === 'discover' ? "border-emerald-500 text-emerald-600" : "border-transparent text-neutral-500 hover:text-neutral-700")}
                  >
                     Discover
                  </button>
                  <button 
                     onClick={() => setActiveTab('matches')} 
                     className={cn("whitespace-nowrap px-2 text-sm font-bold py-3 border-b-2 text-center transition-colors", activeTab === 'matches' ? "border-emerald-500 text-emerald-600" : "border-transparent text-neutral-500 hover:text-neutral-700")}
                  >
                     Taste Twins
                  </button>
                  <button 
                     onClick={() => setActiveTab('following')} 
                     className={cn("whitespace-nowrap px-2 text-sm font-bold py-3 border-b-2 text-center transition-colors", activeTab === 'following' ? "border-emerald-500 text-emerald-600" : "border-transparent text-neutral-500 hover:text-neutral-700")}
                  >
                     Following
                  </button>
                  <button 
                     onClick={() => setActiveTab('followers')} 
                     className={cn("whitespace-nowrap px-2 text-sm font-bold py-3 border-b-2 text-center transition-colors", activeTab === 'followers' ? "border-emerald-500 text-emerald-600" : "border-transparent text-neutral-500 hover:text-neutral-700")}
                  >
                     Followers
                  </button>
                  <button 
                     onClick={() => setActiveTab('invite')} 
                     className={cn("whitespace-nowrap px-2 text-sm font-bold py-3 border-b-2 text-center transition-colors", activeTab === 'invite' ? "border-emerald-500 text-emerald-600" : "border-transparent text-neutral-500 hover:text-neutral-700")}
                  >
                     Invite
                  </button>
               </div>
            )}

            {(activeTab === 'discover' || activeTab === 'matches' || activeTab === 'following' || activeTab === 'followers') && (
               <>
                  <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex gap-2">
                     <div className="relative flex-1">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                       <input
                         type="text"
                         placeholder="Search people..."
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-full py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                       />
                     </div>
                     <button 
                        onClick={() => setActiveTab('invite')}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-5 rounded-full transition-colors shrink-0"
                     >
                       <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Invite</span>
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2">
                     {loading ? (
                       <div className="flex justify-center py-12">
                         <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                       </div>
                     ) : filteredUsers.length > 0 ? (
                       <div className="space-y-1">
                         {filteredUsers.map(u => {
                           const isFollowing = following.has(u.id);
                           return (
                             <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                               <div className="flex items-center gap-4">
                                 <img 
                                   src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName}`} 
                                   alt={u.displayName}
                                   className="w-12 h-12 rounded-full border border-neutral-200 dark:border-neutral-800"
                                 />
                                 <div>
                                   <div className="font-bold text-neutral-900 dark:text-white">{u.displayName || "Unknown User"}</div>
                                   <div className="text-xs text-neutral-500">
                                     @{u.displayName?.toLowerCase().replace(/\s+/g, '') || u.id.slice(0,8)}
                                   </div>
                                 </div>
                               </div>
                               <div className="flex flex-col items-end gap-1">
                                 <button
                                   onClick={() => onFollowToggle(u.id, u.displayName || "Unknown User")}
                                   className={cn(
                                     "px-5 py-1.5 rounded-full font-bold text-sm transition-colors",
                                     isFollowing 
                                       ? "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700" 
                                       : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                                   )}
                                 >
                                   {isFollowing ? "Following" : "Follow"}
                                 </button>
                                 {isFollowing && (
                                    <select className="text-[10px] bg-transparent text-neutral-400 border-none outline-none cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 pr-1 py-0 text-right appearance-none" style={{ WebkitAppearance: 'none', MozAppearance: 'none' }} title="Designate relationship group">
                                       <option value="friend">Friend</option>
                                       <option value="follower">Follower</option>
                                       <option value="family">Family</option>
                                       <option value="partner">Partner</option>
                                       <option value="custom">Custom Group...</option>
                                    </select>
                                 )}
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     ) : (
                       <div className="text-center py-12 text-neutral-500">
                          No users found matching "{search}"
                       </div>
                     )}
                  </div>
               </>
            )}

            {activeTab === 'invite' && (
               <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-right-4">
                  <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                     <div className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-full" />
                     <Heart className="w-20 h-20 text-emerald-500 fill-emerald-100 dark:fill-emerald-900 relative z-10" />
                     <div className="absolute top-4 left-4 p-2 bg-white dark:bg-neutral-800 rounded-full shadow-sm text-sky-500"><Users className="w-5 h-5"/></div>
                     <div className="absolute bottom-8 right-0 p-3 bg-white dark:bg-neutral-800 rounded-full shadow-sm text-rose-500"><UserPlus className="w-5 h-5"/></div>
                  </div>
                  
                  <h3 className="font-serif text-3xl font-bold text-neutral-900 dark:text-white mb-3">Invite your friends to join Dilecti</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-8 font-medium">Share Dilecti with friends and see what they love.</p>
                  
                  <div className="w-full space-y-3">
                     <button onClick={() => setActiveTab('contacts')} className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-colors">
                        <Smartphone className="w-5 h-5" /> Invite Contacts
                     </button>
                     <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 py-4 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white font-bold rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        <Link className="w-5 h-5" /> Share Link
                     </button>
                  </div>
               </div>
            )}

            {activeTab === 'contacts' && (
               <div className="flex-1 flex flex-col animate-in slide-in-from-right-4">
                  <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                     <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                       <input
                         type="text"
                         placeholder="Search contacts..."
                         className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-full py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                       />
                     </div>
                  </div>
                  <div className="flex-1 p-8 text-center text-neutral-500 flex flex-col items-center justify-center">
                     <Smartphone className="w-12 h-12 mb-4 text-neutral-300 dark:text-neutral-700" />
                     <p className="font-medium">You need to grant permission to access your contacts to use this feature.</p>
                     <button className="mt-6 px-6 py-3 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold rounded-full">
                        Grant Permission
                     </button>
                  </div>
               </div>
            )}
            
            {activeTab === 'discover' && (
               <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button onClick={onClose} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-colors">
                     Done
                  </button>
               </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
