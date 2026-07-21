import React, { useState, useEffect } from 'react';
import { X, Loader2, ArrowLeft, UserPlus, FileText, Activity as ActivityIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Tv, Utensils, Gamepad, Music, Plane, Users } from 'lucide-react';
import { checkItemAccess } from '../lib/privacy';
import { ImageWithFallback } from "./ImageWithFallback";


const getIconComponent = (iconId: string) => {
   switch (iconId) {
      case 'book': return BookOpen;
      case 'tv': return Tv;
      case 'food': return Utensils;
      case 'game': return Gamepad;
      case 'music': return Music;
      case 'travel': return Plane;
      default: return Users;
   }
};

export function CircleProfileModal({ isOpen, circleId, onClose, categoryId, onPreviewBook }: { isOpen: boolean, circleId: string | null, onClose: () => void, categoryId?: string, onPreviewBook?: (book: any) => void }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [circleData, setCircleData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'activity' | 'members' | 'about'>('activity');
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !user || !circleId) {
       setCircleData(null);
       setMembers([]);
       setActivities([]);
       setActiveTab('activity');
       return;
    }
    
    const fetchCircle = async () => {
      setLoading(true);
      try {
        const circleDoc = await getDoc(doc(db, "users", user.uid, "circles", circleId));
        if (circleDoc.exists()) {
           const data = circleDoc.data();
           setCircleData(data);
           
           // Fetch members
           const membersList = [];
           if (data.members && data.members.length > 0) {
              for (const memberId of data.members) {
                 const mDoc = await getDoc(doc(db, "users", memberId));
                 if (mDoc.exists()) {
                    membersList.push({ id: memberId, ...mDoc.data() });
                 }
              }
           }
           setMembers(membersList);

           // Fetch recent activity from members
           const activitiesList = [];
           for (const m of membersList) {
              let viewerGroup: string | null = null;
              if (user) {
                  const viewerRef = doc(db, 'users', m.id, 'following', user.uid);
                  const vSnap = await getDoc(viewerRef);
                  if (vSnap.exists()) {
                      viewerGroup = vSnap.data().relationshipGroup || null;
                  }
              }

              const authorCirclesSnap = await getDocs(collection(db, "users", m.id, "circles"));
              const authorCircles = authorCirclesSnap.docs.map(d => ({id: d.id, ...d.data()}));

              const refs = collection(db, "users", m.id, "items");
              const sn = await getDocs(query(refs, limit(5)));
              sn.forEach(docSnap => {
                 const idata = docSnap.data();
                 const matchesCat = (!categoryId || idata.category === categoryId);
                 
                 const hasAccess = checkItemAccess(idata as any, user?.uid || null, m.id, viewerGroup, authorCircles as any);

                 if (hasAccess && matchesCat) {
                    activitiesList.push({ ...idata, id: docSnap.id, user: m });
                 }
              });
           }
           activitiesList.sort((a,b) => b.dateAdded - a.dateAdded);
           setActivities(activitiesList.slice(0, 15));
        }
      } catch (err) {
        console.error("Error fetching circle data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCircle();
  }, [isOpen, circleId, user, categoryId]);

  if (!isOpen) return null;

  const Icon = circleData ? getIconComponent(circleData.iconId) : Users;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="bg-white dark:bg-neutral-900 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {loading ? (
                <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                   <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
            ) : !circleData ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
                   <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 dark:bg-neutral-800">
                      <X className="w-8 h-8 text-neutral-400" />
                   </div>
                   <h3 className="text-xl font-bold mb-2 dark:text-white">Circle not found</h3>
                   <button onClick={onClose} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-full">Go Back</button>
                </div>
            ) : (
                <>
                   <div className="relative shrink-0">
                      <div className="absolute top-4 left-4 z-10 flex gap-2">
                         <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white flex flex-col items-center justify-center hover:bg-black/70 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                         </button>
                      </div>
                      <div className="absolute top-4 right-4 z-10 flex gap-2">
                         <button className="h-10 px-4 rounded-full bg-black/50 backdrop-blur text-white flex items-center gap-2 font-bold text-sm hover:bg-black/70 transition-colors">
                            <UserPlus className="w-4 h-4" /> Invite
                         </button>
                      </div>

                      <div className={cn("w-full h-48 md:h-56 flex items-center justify-center", circleData.bg || "bg-emerald-50 dark:bg-emerald-900/30")}>
                         <Icon className={cn("w-20 h-20 opacity-50", circleData.color || "text-emerald-500")} />
                      </div>

                      <div className="px-6 relative -mt-8">
                         <div className={cn("w-24 h-24 rounded-3xl border-4 border-white dark:border-neutral-900 flex items-center justify-center shadow-md", circleData.bg || "bg-emerald-50", circleData.color || "text-emerald-600")}>
                            <Icon className="w-10 h-10" />
                         </div>
                         <div className="mt-4">
                            <h2 className="font-serif text-3xl font-bold dark:text-white">{circleData.name}</h2>
                            <p className="text-sm font-medium text-neutral-500 mt-1">{members.length} members</p>
                         </div>
                      </div>
                   </div>

                   <div className="flex border-b border-neutral-100 dark:border-neutral-800 mt-6 px-2">
                      <button 
                         onClick={() => setActiveTab('activity')}
                         className={cn("flex-1 py-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'activity' ? "border-emerald-500 text-emerald-600" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300")}
                      >
                         Activity
                      </button>
                      <button 
                         onClick={() => setActiveTab('members')}
                         className={cn("flex-1 py-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'members' ? "border-emerald-500 text-emerald-600" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300")}
                      >
                         Members
                      </button>
                      <button 
                         onClick={() => setActiveTab('about')}
                         className={cn("flex-1 py-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'about' ? "border-emerald-500 text-emerald-600" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300")}
                      >
                         About
                      </button>
                   </div>

                   <div className="flex-1 overflow-y-auto">
                      {activeTab === 'activity' && (
                         <div className="p-4 space-y-4">
                            {activities.length > 0 ? activities.map((item, i) => (
                               <div key={`${item.id}-${i}`} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-black/5 shadow-sm dark:bg-neutral-900 dark:border-white/5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onPreviewBook?.({title: item.title, author: item.creator || item.author, coverUrl: item.coverUrl})}>
                                  <img src={item.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user.displayName}`} className="w-10 h-10 rounded-full bg-neutral-200 shrink-0 border border-neutral-200 dark:border-neutral-800" />
                                  <div className="flex-1 min-w-0">
                                     <div className="text-sm text-neutral-800 dark:text-neutral-200 mb-1">
                                        <span className="font-bold">{item.user.displayName}</span> {item.status === 'completed' ? 'finished' : 'added'} a {item.category || 'item'}
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <h4 className="font-serif font-bold text-neutral-900 truncate dark:text-white leading-tight">{item.title}</h4>
                                     </div>
                                     {item.rating && (
                                        <div className="mt-2">
                                           <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/50">
                                              {item.rating}/10
                                           </span>
                                        </div>
                                     )}
                                     {item.review && (
                                        <p className="text-sm italic text-neutral-600 border-l-2 border-neutral-200 pl-3 my-2 dark:text-neutral-400 dark:border-neutral-700">{item.review}</p>
                                     )}
                                  </div>
                                  {item.coverUrl && (
                                     <div className="w-12 h-16 rounded overflow-hidden shrink-0 shadow-sm">
                                        <ImageWithFallback src={item.coverUrl} className="w-full h-full object-cover" />
                                     </div>
                                  )}
                               </div>
                            )) : (
                               <div className="text-center py-12 px-4 text-neutral-500 flex flex-col items-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl mx-2">
                                  <ActivityIcon className="w-10 h-10 mb-4 text-neutral-300 dark:text-neutral-700" />
                                  <p className="font-medium text-sm">No recent activity from members of this circle.</p>
                               </div>
                            )}
                         </div>
                      )}

                      {activeTab === 'members' && (
                         <div className="p-4 space-y-2">
                            {members.map(m => (
                               <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                  <div className="flex items-center gap-3">
                                     <img src={m.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${m.displayName}`} className="w-12 h-12 rounded-full border border-neutral-200 dark:border-neutral-800" />
                                     <div>
                                        <div className="font-bold text-neutral-900 dark:text-white">{m.displayName}</div>
                                        <div className="text-xs text-neutral-500">@{m.displayName?.toLowerCase().replace(/\s+/g,'')}</div>
                                     </div>
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}

                      {activeTab === 'about' && (
                         <div className="p-6">
                            <div className="flex items-start gap-3 text-neutral-600 dark:text-neutral-300">
                               <FileText className="w-5 h-5 mt-0.5 text-neutral-400 shrink-0" />
                               <p className="leading-relaxed">
                                  {circleData.description || "A place to share what you love with people who share your interests."}
                               </p>
                            </div>
                         </div>
                      )}
                   </div>
                </>
            )}
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
