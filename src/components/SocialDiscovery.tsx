import React, { useState, useEffect } from 'react';
import { collection, query, limit, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useUser } from '../context/UserContext';
import { UserProfile } from '../types';
import { Search, UserPlus, UserCheck, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useUserProfile } from '../hooks';
import { useNavigate } from 'react-router-dom';

export default function SocialDiscovery({ following, setFollowing, showHeader = false }: { following: Set<string>, setFollowing: React.Dispatch<React.SetStateAction<Set<string>>>, showHeader?: boolean }) {
  const { user, signIn } = useUser();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [similarPeople, setSimilarPeople] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'similar'>('all');

  useEffect(() => {
    // Fetch some suggested users
    const fetchSuggested = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'users'), limit(50));
        const snap = await getDocs(q);
        const users: any[] = [];
        snap.forEach(doc => {
          if (doc.id !== user.uid) {
            const data = doc.data() as UserProfile;
            if (data.isDiscoverable !== false) {
               users.push({ id: doc.id, ...data });
            }
          }
        });

        // prefer those we don't follow and mix it up a bit
        const notFollowed = users.filter(u => !following.has(u.id));
        setSuggested(notFollowed.slice(0, 5));

        // Basic client-side filtering for 'similar' based on gender and age overlap if present
        if (profile?.demographics?.gender || profile?.demographics?.age) {
           const myGender = profile.demographics.gender;
           const sim = notFollowed.filter(u => {
              if (myGender && u.demographics?.gender === myGender) return true;
              return false; // Very basic check
           });
           setSimilarPeople(sim.length > 0 ? sim.slice(0, 5) : notFollowed.slice(0, 5).reverse());
        } else {
           setSimilarPeople([]);
        }
      } catch (err) {
        console.error("Failed to load suggested users", err);
      }
    };
    fetchSuggested();
  }, [user, following, profile?.demographics]);

  useEffect(() => {
     const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsers();
      } else {
        setResults([]);
      }
     }, 500);
     return () => clearTimeout(timer);
  }, [searchTerm, user]);

  const searchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const lowerSearch = searchTerm.toLowerCase();
      // Use client-side filtering for simplicity and compatibility since indexes might be tricky
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const searchResults: any[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== user?.uid) {
          const data = doc.data() as UserProfile;
          if (data.isDiscoverable === false) return;

          const matchesDisplayName = data.displayNameLower?.includes(lowerSearch) || data.displayName?.toLowerCase().includes(lowerSearch);
          const matchesHandle = data.handleLower?.includes(lowerSearch) || data.handle?.toLowerCase().includes(lowerSearch);
          
          if (matchesDisplayName || matchesHandle) {
            searchResults.push({ id: doc.id, ...data });
          }
        }
      });
      setResults(searchResults.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFollow = async (targetId: string, targetName: string) => {
    if (!user) {
      signIn();
      return;
    }
    const followRef = doc(db, "users", user.uid, "following", targetId);
    try {
      if (following.has(targetId)) {
        await deleteDoc(followRef);
        setFollowing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(targetId);
          return newSet;
        });
      } else {
        await setDoc(followRef, { 
           targetUserId: targetId,
           followedAt: serverTimestamp(),
           targetDisplayName: targetName
        });
        setFollowing((prev) => {
          const newSet = new Set(prev);
          newSet.add(targetId);
          return newSet;
        });
      }
    } catch (e) {
      console.error("Failed to toggle follow", e);
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/following/${targetId}`);
    }
  };

  const displayList = searchTerm ? results : suggested;

  return (
    <div className="dark:bg-transparent dark:border-white/5 p-4 md:p-6 rounded-3xl relative overflow-hidden min-h-[300px] flex flex-col justify-start w-full">
      <div className="w-full text-center relative z-10 mb-4 mt-0 max-w-xl mx-auto px-0 md:px-4">
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight balance-text text-balance">See what your favorite people love</h3>
      </div>
      <form onSubmit={searchUsers} className="flex gap-3 mb-4 mt-0 relative z-10 w-full max-w-xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-900/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or handle..."
            className="w-full bg-white dark:bg-[#09090b] dark:text-white dark:border-white/10 dark:placeholder-white/40 border border-emerald-100 rounded-full py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm"
          />
        </div>
      </form>

      {/* Prominent Marketing Image placed behind or alongside the search */}
      {!searchTerm && (
         <>
           <div className="flex justify-center mb-4 pointer-events-none relative z-0 mt-2">
              <img src="/dilecti-logo-circle.png" alt="Dilecti Circle" className="w-48 h-48 sm:w-56 sm:h-56 object-contain opacity-100 mix-blend-multiply dark:mix-blend-lighten dark:opacity-30" />
           </div>
         </>
      )}

      {isSearching && <div className="py-4 text-center text-emerald-900/50 relative z-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}

      {!isSearching && displayList.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 hide-scrollbar relative z-10">
          {!searchTerm && <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-900/40 mb-2 px-1">Suggested People</h3>}
          {displayList.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-white p-4 rounded-2xl border border-emerald-50 shadow-sm hover:border-emerald-100 transition-colors cursor-pointer dark:bg-[#1a1a1a]"
            >
              <div 
                 className="flex items-center gap-4 flex-1"
                 onClick={() => {
                   window.dispatchEvent(new CustomEvent('open-public-profile', { detail: { userId: p.id, fullScreen: true }}));
                 }}
              >
                <img
                  src={p.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${p.displayName}`}
                  alt={p.displayName}
                  className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5"
                />
                <div>
                  <div className="font-serif font-medium text-emerald-950 leading-tight dark:text-emerald-50">
                    {p.displayName}
                  </div>
                  {(p.handle || p.accountType) && (
                     <div className="text-xs text-emerald-900/60 mt-0.5 flex items-center gap-1">
                        {p.handle && <span>@{p.handle}</span>}
                        {p.handle && p.accountType && <span>•</span>}
                        {p.accountType === 'creator' && <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider dark:text-emerald-200 dark:bg-emerald-900">Creator</span>}
                     </div>
                  )}
                  {p.bio && <p className="text-xs text-black/50 mt-1 line-clamp-1 dark:text-white/50">{p.bio}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button
                   onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('open-taste-compare', { detail: { targetUserId: p.id }}));
                   }}
                   className="hidden sm:inline-block px-3 py-1.5 rounded-full font-bold text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors dark:text-emerald-300 dark:bg-emerald-950"
                 >
                   Compare
                 </button>
                 <button
                   onClick={(e) => {
                      e.stopPropagation();
                      toggleFollow(p.id, p.displayName || 'Unknown');
                   }}
                   className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all active:scale-[0.98] ${ following.has(p.id) ? "bg-black/5 text-black hover:bg-red-50 hover:text-red-500" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm" } dark:text-white`}
                 >
                   {following.has(p.id) ? (
                     <span className="flex items-center gap-1">
                       <UserCheck className="w-3 h-3" /> Following
                     </span>
                   ) : (
                     "Follow"
                   )}
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!isSearching && searchTerm && displayList.length === 0 && (
        <p className="text-center text-emerald-900/50 py-4 text-sm mt-2">
          No taste-makers found matching "{searchTerm}".
        </p>
      )}
    </div>
  );
}
