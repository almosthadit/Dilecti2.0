import Fuse from "fuse.js";
import { cn } from "../lib/utils";
import { UserBook } from "../types";
import { useNavigate } from 'react-router-dom';
import { checkItemAccess } from '../lib/privacy';
import {
  Star,
  MessageCircle,
  Heart,
  Quote,
  Search,
  TrendingUp,
  UserPlus,
  UserCheck,
  Loader2,
  Filter,
  Plus,
  Zap,
  Users,
  PlusCircle,
  ChefHat,
  CheckSquare,
  BookOpen,
  Tv,
  Utensils,
  ChevronRight,
  Gamepad,
  Music,
  PenTool,
  Bookmark,
  Globe,
  LayoutGrid,
  List,
  MoreVertical,
  ChevronDown,
  Crosshair,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Sparkles,
  Headphones,
  Map as MapIcon
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUser } from "../context/UserContext";
import { useUserProfile } from "../hooks";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  limit,
  orderBy,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { FindFriendsModal } from "./FindFriendsModal";
import { CreateCircleModal } from "./CreateCircleModal";
import { SmartSearchBar } from "./SmartSearchBar";
import PublicProfileModal from "./PublicProfileModal";
import { CircleProfileModal } from "./CircleProfileModal";
import RecentActivityModal from "./RecentActivityModal";
import { RecommendationModal } from "./RecommendationModal";
import { CATEGORY_SUB_FILTERS_DISPLAY_NAMES } from "../lib/constants";
import { useUserItems } from "../hooks";
import CategoryIconFilter from "./CategoryIconFilter";
import { ImageWithFallback } from "./ImageWithFallback";


type ActivityItem = {
  id: string;
  user: { id: string; name: string; avatar: string };
  action: string;
  category: string;
  book: { title: string; author: string; coverUrl?: string; genres?: string[]; year?: string };
  rating?: number;
  criticScore?: number;
  review?: string;
  status?: string;
  timeAgo: string;
  dateAdded: number;
};

// Mock data for groups / circles
const MOCK_CIRCLES = [
  { id: '1', name: 'Book Club', members: 12, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: '2', name: 'Movie Buffs', members: 24, icon: Tv, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: '3', name: 'Foodies', members: 16, icon: Utensils, color: 'text-rose-500', bg: 'bg-rose-50' }
];

let feedCache: ActivityItem[] | null = null;
let publicCache: ActivityItem[] | null = null;
let followingCache: Set<string> | null = null;
let suggestedCache: any[] | null = null;
let circlesCache: any[] | null = null;

export default function FeedTab({
  onPreviewBook,
  categoryFilter,
  hideHeader
}: {
  onPreviewBook?: (book: any) => void;
  categoryFilter?: string;
  hideHeader?: boolean;
}) {
  const { user, loading: userLoading } = useUser();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [following, setFollowing] = useState<Set<string>>(followingCache || new Set());
  const [feedItems, setFeedItems] = useState<ActivityItem[]>(feedCache || []);
  const [publicItems, setPublicItems] = useState<ActivityItem[]>(publicCache || []);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>(suggestedCache || []);
  const [circles, setCircles] = useState<any[]>(circlesCache || []);
  const [loading, setLoading] = useState(!feedCache && !publicCache);

  const [followersCount, setFollowersCount] = useState(0);
  const [tasteTwinsCount, setTasteTwinsCount] = useState(0);
  
  // Taste Twins calculation
  useEffect(() => {
     if (!user || !profile) return;
     const calculateTwins = async () => {
         try {
             const usersRef = collection(db, 'users');
             const q = query(usersRef, limit(100)); 
             const snap = await getDocs(q);
             let twins = 0;
             const myInterests = new Set(profile.interests || []);
             
             snap.forEach(d => {
                 if (d.id === user.uid) return;
                 const data = d.data();
                 let matchScore = 0; 
                 
                 const theirInterests = data.interests || [];
                 theirInterests.forEach((i: string) => { if (myInterests.has(i)) matchScore += 15; });
                 
                 if (matchScore > 40) {
                     twins++;
                 }
             });
             setTasteTwinsCount(twins);
         } catch (e) {}
     }
     calculateTwins();
  }, [user, profile]);

  const [showFindFriends, setShowFindFriends] = useState(false);
  const [findFriendsTab, setFindFriendsTab] = useState<'discover' | 'following' | 'followers' | 'matches'>('discover');
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [showGroupsBar, setShowGroupsBar] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [activeUserFilter, setActiveUserFilter] = useState<string>('All');
  const [activeLocationFilter, setActiveLocationFilter] = useState<string>('All');
  const [sortOption, setSortOption] = useState<'recency' | 'rating' | 'taste'>('recency');
  const [filterOption, setFilterOption] = useState<'everyone' | 'following'>('everyone');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'row' | 'grid'>('grid');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [catTypeFilters, setCatTypeFilters] = useState<Record<string, Record<string, 'include' | 'exclude'>>>({});
  const [selectedRec, setSelectedRec] = useState<any | null>(null);
  const [showLikesModal, setShowLikesModal] = useState<{itemId: string, likesCount: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    const handleSetSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.query) {
        setSearchQuery(customEvent.detail.query);
      }
    };
    window.addEventListener('set-feed-search', handleSetSearch);
    return () => window.removeEventListener('set-feed-search', handleSetSearch);
  }, []);
  
  const { saveItem, userItems } = useUserItems();

  const calculateMatch = (itemTitle: string) => {
     if (!userItems) return Math.floor(Math.random() * 20 + 80); // Default 80-99%
     const titleLower = (itemTitle || '').toLowerCase();
     const userItem = userItems.find(i => (i.title || '').toLowerCase() === titleLower);
     
     if (userItem) {
        // User disliked it
        if (userItem.reaction === 'dislike' || userItem.reaction === 'hate' || (Number(userItem.criticScore || userItem.rating) > 0 && Number(userItem.criticScore || userItem.rating) <= 4)) {
           return Math.floor(Math.random() * 20 + 10); // 10-29%
        }
        // User liked it
        if (userItem.reaction === 'love' || userItem.reaction === 'like' || Number(userItem.criticScore || userItem.rating) >= 8) {
           return Math.floor(Math.random() * 10 + 90); // 90-99%
        }
     }
     
     // Base string similarity logic check to see if user has a similar item they disliked
     const dislikedItems = userItems.filter(i => i.reaction === 'dislike' || i.reaction === 'hate' || (Number(i.criticScore || i.rating) > 0 && Number(i.criticScore || i.rating) <= 4));
     if (dislikedItems.some(di => titleLower.includes((di.title || '').toLowerCase()) || (di.title || '').toLowerCase().includes(titleLower))) {
        return Math.floor(Math.random() * 20 + 20); // 20-39%
     }

     return Math.floor(Math.random() * 20 + 80);
  };

  useEffect(() => {
    const handleRefresh = () => setRefreshTrigger(p => p + 1);
    window.addEventListener('refresh-feed', handleRefresh);
    return () => window.removeEventListener('refresh-feed', handleRefresh);
  }, []);

  const handlePreview = (item: any) => {
    if (onPreviewBook) {
      onPreviewBook(item.book);
      return;
    }
    
    // Map item format to RecommendationModal expected format
    setSelectedRec({
       title: item.book.title,
       subtitle: item.book.author || item.book.subtitle,
       coverUrl: item.book.coverUrl,
       category: item.category,
       description: item.review,
       reason: `Shared by ${item.user.name}`
    });
  };

  const handleSeedDemoData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fakeUsers = [
         { id: 'mock-user-1', displayName: 'Sarah Johnson', email: 'sarah@example.com', photoURL: 'https://i.pravatar.cc/150?u=sarah' },
         { id: 'mock-user-2', displayName: 'Mike Chen', email: 'mike@example.com', photoURL: 'https://i.pravatar.cc/150?u=mike' },
         { id: 'mock-user-3', displayName: 'Emma Watson', email: 'emma@example.com', photoURL: 'https://i.pravatar.cc/150?u=emma' },
         { id: 'mock-user-4', displayName: 'Alex The Critic', email: 'alex@example.com', photoURL: 'https://i.pravatar.cc/150?u=alex' }
      ];

      const fakeActivity = [
         { title: 'Project Hail Mary', author: 'Andy Weir', category: 'books', status: 'completed', review: 'An incredible story! Highly recommend.', rating: 10, coverUrl: 'https://covers.openlibrary.org/b/id/11494950-L.jpg', metadata: { genres: ['Sci-Fi'] } },
         { title: 'Dune Part Two', author: 'Denis Villeneuve', year: '2024', category: 'movies', status: 'completed', rating: 9, review: 'Epic, visually stunning, and unforgettable.', coverUrl: 'https://m.media-amazon.com/images/M/MV5BODdjMjM3ZGItNThhNC00ZTE0LWE4ZWQtNzU3NTE4MzlhMTcwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg', metadata: { genres: ['Sci-Fi', 'Adventure'] } },
         { title: 'Ramen Tatsu-Ya', author: 'Austin, TX', category: 'food', status: 'completed', rating: 9, review: 'Best ramen in town.', coverUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&q=80&w=200', metadata: { genres: ['Ramen'] } },
         { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', category: 'books', status: 'completed', review: 'Emotional, glamorous, unforgettable.', rating: 8, coverUrl: 'https://covers.openlibrary.org/b/id/12690987-L.jpg', metadata: { genres: ['Fiction'] } },
      ];

      const alexItems = [
         { title: 'Everything Everywhere All at Once', author: 'Daniel Kwan, Daniel Scheinert', category: 'movies', status: 'completed', rating: 10, metadata: { genres: ['Sci-Fi', 'Comedy', 'Drama'] } },
         { title: 'In the Mood for Love', author: 'Wong Kar-wai', category: 'movies', status: 'completed', rating: 10, metadata: { genres: ['Romance', 'Drama'] } },
         { title: 'The Secret History', author: 'Donna Tartt', category: 'books', status: 'completed', rating: 9, metadata: { genres: ['Fiction', 'Dark Academia'] } },
         { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', category: 'books', status: 'completed', rating: 9, metadata: { genres: ['Fiction', 'Romance'] } },
         { title: 'Disco Elysium', author: 'ZA/UM', category: 'games', status: 'completed', rating: 10, metadata: { genres: ['RPG', 'Narrative'] } },
         { title: 'Hollow Knight', author: 'Team Cherry', category: 'games', status: 'completed', rating: 9, metadata: { genres: ['Metroidvania', 'Action'] } },
         { title: 'Omasake Sushi', author: 'Tokyo', category: 'food', status: 'completed', rating: 10, metadata: { genres: ['Japanese', 'Fine Dining'] } },
         { title: 'Blonde', author: 'Frank Ocean', category: 'music', status: 'completed', rating: 10, metadata: { genres: ['R&B', 'Pop'] } },
         { title: 'In Rainbows', author: 'Radiohead', category: 'music', status: 'completed', rating: 9, metadata: { genres: ['Alternative Rock'] } },
         { title: 'Stardew Valley', author: 'ConcernedApe', category: 'games', status: 'completed', rating: 10, metadata: { genres: ['Simulation', 'Farming'] } }
      ];

      const emmaItems = [
         { title: 'Little Women', author: 'Louisa May Alcott', category: 'books', status: 'completed', rating: 10, review: 'A classic that never gets old.', metadata: { genres: ['Classics', 'Fiction'] } },
         { title: 'Pride and Prejudice', author: 'Jane Austen', category: 'books', status: 'completed', rating: 10, metadata: { genres: ['Romance', 'Classics'] } },
         { title: 'Amélie', author: 'Jean-Pierre Jeunet', category: 'movies', status: 'completed', rating: 9, metadata: { genres: ['Romance', 'Comedy'] } },
         { title: 'La La Land', author: 'Damien Chazelle', category: 'movies', status: 'completed', rating: 10, metadata: { genres: ['Musical', 'Romance'] } },
         { title: 'Folklore', author: 'Taylor Swift', category: 'music', status: 'completed', rating: 10, metadata: { genres: ['Indie Folk', 'Pop'] } },
         { title: 'The French Laundry', author: 'Yountville, CA', category: 'food', status: 'completed', rating: 10, metadata: { genres: ['Fine Dining', 'French'] } },
         { title: 'Animal Crossing: New Horizons', author: 'Nintendo', category: 'games', status: 'completed', rating: 9, metadata: { genres: ['Simulation', 'Cozy'] } },
         { title: 'Normal People', author: 'Sally Rooney', category: 'books', status: 'completed', rating: 8, metadata: { genres: ['Contemporary', 'Romance'] } },
         { title: '1989 (Taylor\'s Version)', author: 'Taylor Swift', category: 'music', status: 'completed', rating: 9, metadata: { genres: ['Pop'] } }
      ];

      for (let i = 0; i < fakeUsers.length; i++) {
         await setDoc(doc(db, 'users', fakeUsers[i].id), { ...fakeUsers[i], createdAt: serverTimestamp() });
         
         if (fakeUsers[i].id === 'mock-user-4') {
            for (let j = 0; j < alexItems.length; j++) {
               const itemRef = doc(collection(db, 'users', fakeUsers[i].id, 'items'));
               await setDoc(itemRef, {
                   ...alexItems[j],
                   isPrivate: false,
                   dateAdded: Date.now() - (j * 10000000)
               });
            }
         } else if (fakeUsers[i].id === 'mock-user-3') {
            for (let j = 0; j < emmaItems.length; j++) {
               const itemRef = doc(collection(db, 'users', fakeUsers[i].id, 'items'));
               await setDoc(itemRef, {
                   ...emmaItems[j],
                   isPrivate: false,
                   dateAdded: Date.now() - (j * 10000000)
               });
            }
         } else {
             const itemRef = doc(collection(db, 'users', fakeUsers[i].id, 'items'));
             await setDoc(itemRef, {
                 ...fakeActivity[i % fakeActivity.length],
                 isPrivate: false,
                 dateAdded: Date.now() - (i * 10000000)
             });
         }
      }
      
      // Just for Evelyn Hugo to Sarah
      const ehRef = doc(collection(db, 'users', 'mock-user-1', 'items'));
      await setDoc(ehRef, {
         ...fakeActivity[3],
         isPrivate: false,
         dateAdded: Date.now() - 40000000
      });
      
      // Follow them automatically
      for (const u of fakeUsers) {
         const followRef = doc(db, 'users', user.uid, 'following', u.id);
         await setDoc(followRef, {
            targetUserId: u.id,
            targetDisplayName: u.displayName,
            followedAt: serverTimestamp()
         });
      }
      
      // Create mock Circles
      const circle1Ref = doc(collection(db, 'users', user.uid, 'circles'), 'circle-1');
      await setDoc(circle1Ref, { name: 'Book Club', iconId: 'book', color: 'text-emerald-600', bg: 'bg-emerald-50', members: ['mock-user-1'] });
      
      const circle2Ref = doc(collection(db, 'users', user.uid, 'circles'), 'circle-2');
      await setDoc(circle2Ref, { name: 'Movie Buffs', iconId: 'tv', color: 'text-orange-500', bg: 'bg-orange-50', members: ['mock-user-2'] });

      const circle3Ref = doc(collection(db, 'users', user.uid, 'circles'), 'circle-3');
      await setDoc(circle3Ref, { name: 'Austin Foodies', iconId: 'food', color: 'text-rose-500', bg: 'bg-rose-50', members: ['mock-user-3'] });

      window.location.reload();
    } catch (err) {
      console.warn(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
         const mockItems = [
            {
               id: 'mock-1',
               user: { id: 'mock-alex-rivera', name: 'Alex Rivera', avatar: 'https://i.pravatar.cc/150?u=alex' },
               action: 'watched a movie', category: 'movie',
               book: { title: 'Dune: Part Two', author: 'Denis Villeneuve', coverUrl: 'https://m.media-amazon.com/images/M/MV5BODdjMjM3ZGItNThhNC00ZTE0LWE4ZWQtNzU3NTE4MzlhMTcwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg' },
               status: 'completed', rating: 10, review: 'Absolutely spectacular world-building and sound design.',
               timeAgo: getTimeAgo(Date.now() - 10000000), dateAdded: Date.now() - 10000000
            },
            {
               id: 'mock-2',
               user: { id: 'mock-sam-chen', name: 'Sam Chen', avatar: 'https://i.pravatar.cc/150?u=sam' },
               action: 'ate at a restaurant', category: 'food',
               book: { title: 'Uchi', author: 'Austin, TX', coverUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=200' },
               status: 'completed', rating: 9, review: 'The best sushi experience in Texas. The zero sen roll is unmatched.',
               timeAgo: getTimeAgo(Date.now() - 50000000), dateAdded: Date.now() - 50000000
            },
            {
               id: 'mock-3',
               user: { id: 'mock-jordan-lee', name: 'Jordan Lee', avatar: 'https://i.pravatar.cc/150?u=jordan' },
               action: 'beat a game', category: 'game',
               book: { title: 'The Last of Us Part II', author: 'Naughty Dog', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.png' },
               status: 'completed', rating: 10, review: 'An emotionally devastating masterpiece. The gameplay loop is incredibly refined.',
               timeAgo: getTimeAgo(Date.now() - 150000000), dateAdded: Date.now() - 150000000
            },
            {
               id: 'mock-4',
               user: { id: 'mock-casey-smith', name: 'Casey Smith', avatar: 'https://i.pravatar.cc/150?u=casey' },
               action: 'is exploring', category: 'music',
               book: { title: 'Brat', author: 'Charli XCX', coverUrl: 'https://upload.wikimedia.org/wikipedia/en/2/23/Charli_XCX_-_Brat.png' },
               status: 'in-progress', rating: 9, review: 'Club pop perfection. The production is completely unhinged in the best way.',
               timeAgo: getTimeAgo(Date.now() - 200000000), dateAdded: Date.now() - 200000000
            },
            {
               id: 'mock-5',
               user: { id: 'mock-morgan-davis', name: 'Morgan Davis', avatar: 'https://i.pravatar.cc/150?u=morgan' },
               action: 'finished a book', category: 'book',
               book: { title: 'Dark Matter', author: 'Blake Crouch', coverUrl: 'https://covers.openlibrary.org/b/id/10515152-L.jpg' },
               status: 'completed', rating: 8, review: 'A mind-bending thriller that I could not put down. Finished in one sitting.',
               timeAgo: getTimeAgo(Date.now() - 350000000), dateAdded: Date.now() - 350000000
            }
         ];
      setFeedItems(mockItems as any[]);
      setLoading(false);
      return;
    }
    const loadData = async () => {
      if (feedItems.length === 0) setLoading(true);
      try {
        const followsRef = collection(db, "users", user.uid, "following");
        const followsSnap = await getDocs(followsRef);
        const followersRef = collection(db, "users", user.uid, "followers");
        const followersSnap = await getDocs(followersRef);
        setFollowersCount(followersSnap.docs.length);

        const followingIds = new Set<string>();
        const followSettings: Record<string, string[]> = {};
        const followGroups: Record<string, string | null> = {};
        followsSnap.forEach((doc) => {
           followingIds.add(doc.id);
           followSettings[doc.id] = doc.data().allowedCategories;
           followGroups[doc.id] = doc.data().relationshipGroup || null;
        });
        setFollowing(followingIds);
        followingCache = followingIds;

        const circlesSnap = await getDocs(collection(db, "users", user.uid, "circles"));

        const fetchedCircles: any[] = [];
        circlesSnap.forEach(doc => fetchedCircles.push({ id: doc.id, ...doc.data() }));
        setCircles(fetchedCircles);
        circlesCache = fetchedCircles;

        const allItems: ActivityItem[] = [];

        if (followingIds.size > 0) {
          // Limit to max 5 users to prevent read exhaustion
          const activeFollowing = Array.from(followingIds).slice(0, 5);
          await Promise.all(activeFollowing.map(async (followedId) => {
            const userDoc = await getDoc(doc(db, "users", followedId));
            if (!userDoc.exists()) return;

            const userData = userDoc.data();
            const userName = userData.displayName || "Unknown";
            const userAvatar = userData.photoURL || "";

            const authorCirclesSnap = await getDocs(collection(db, "users", followedId, "circles"));
            const authorCircles = authorCirclesSnap.docs.map(d => ({id: d.id, ...d.data()}));

            const itemsRef = collection(db, "users", followedId, "items");
            // Limit to 5 most recent items per followed user
            const q = query(itemsRef, orderBy("dateAdded", "desc"), limit(5));
            const itemsSnap = await getDocs(q);
            
            itemsSnap.forEach((itemDoc) => {
              const itemData = itemDoc.data();
              const viewerGroup = followGroups[followedId];
              
              if (!checkItemAccess(itemData as any, user?.uid || null, followedId, viewerGroup, authorCircles as any)) {
                  return;
              }
              
              const allowedCats = followSettings[followedId];
              if (allowedCats && Array.isArray(allowedCats)) {
                 const mappedCat = itemData.category === 'watch' ? 'tv' : 
                                  (itemData.category === 'movie' ? 'movies' : 
                                  (itemData.category === 'book' ? 'books' : itemData.category));
                 if (!allowedCats.includes(mappedCat) && !allowedCats.includes(itemData.category)) return;
              }

              if (categoryFilter) {
                 const cat = (itemData.category || '').toLowerCase();
                 const filterLower = categoryFilter.toLowerCase();
                 let matches = false;
                 if (filterLower === 'watch') matches = ['tv', 'movie', 'movies', 'watch'].includes(cat);
                 else if (filterLower === 'food') matches = ['food', 'restaurant', 'drink'].includes(cat);
                 else if (filterLower === 'music') matches = ['music', 'song', 'album'].includes(cat);
                 else if (filterLower === 'books') matches = ['book', 'books'].includes(cat);
                 else if (filterLower === 'places') matches = ['places', 'place'].includes(cat);
                 else if (filterLower === 'products') matches = ['products', 'product'].includes(cat);
                 else if (filterLower === 'events') matches = ['events', 'event'].includes(cat);
                 else if (filterLower === 'games') matches = ['games', 'game'].includes(cat);
                 else matches = cat === filterLower;
                 
                 if (!matches) return;
              }

              let actionVerb = "added a";
              const c = itemData.category?.toLowerCase() || '';
              const status = itemData.status;
              
              if (status === "completed" || status === "read") {
                 if (c.includes('movie')) actionVerb = "watched a movie";
                 else if (c.includes('book')) actionVerb = "finished a book";
                 else if (c.includes('game')) actionVerb = "beat a game";
                 else if (c.includes('food')) actionVerb = "ate at a restaurant";
                 else actionVerb = "finished exploring";
              } else if (status === "in-progress" || status === "watching" || status === "reading") {
                 if (c.includes('movie')) actionVerb = "is watching a movie";
                 else if (c.includes('book')) actionVerb = "is reading a book";
                 else if (c.includes('game')) actionVerb = "is playing a game";
                 else if (c.includes('food')) actionVerb = "is eating at";
                 else actionVerb = "is exploring";
              } else {
                 if (c.includes('movie')) actionVerb = "wants to watch a movie";
                 else if (c.includes('book')) actionVerb = "wants to read a book";
                 else if (c.includes('game')) actionVerb = "wants to play a game";
                 else if (c.includes('food')) actionVerb = "wants to try a restaurant";
                 else actionVerb = "saved an item";
              }
              
              if (itemData.rating) {
                 if (c.includes('movie')) actionVerb = "rated a movie";
                 else if (c.includes('book')) actionVerb = "rated a book";
                 else if (c.includes('game')) actionVerb = "rated a game";
                 else if (c.includes('food')) actionVerb = "rated a restaurant";
                 else actionVerb = "rated an item";
              }

              allItems.push({
                id: `${followedId}-${itemDoc.id}`,
                user: {
                  id: followedId,
                  name: userName,
                  avatar: userAvatar ? userAvatar : `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`,
                },
                action: actionVerb,
                category: itemData.category,
                book: {
                  title: itemData.title,
                  author: itemData.creator || itemData.author || "Unknown",
                  coverUrl: itemData.coverUrl,
                  genres: itemData.metadata?.genres || [],
                  year: itemData.year,
                },
                status: itemData.status,
                rating: itemData.rating,
                review: itemData.review,
                timeAgo: getTimeAgo(itemData.dateAdded || Date.now()),
                dateAdded: itemData.dateAdded || 0,
              } as any);
            });
          }));

          const mockItems = [
             {
                id: 'mock-1',
                user: { id: 'mock-alex-rivera', name: 'Alex Rivera', avatar: 'https://i.pravatar.cc/150?u=alex' },
                action: 'watched a movie', category: 'movie',
                book: { title: 'Dune: Part Two', author: 'Denis Villeneuve', coverUrl: 'https://m.media-amazon.com/images/M/MV5BODdjMjM3ZGItNThhNC00ZTE0LWE4ZWQtNzU3NTE4MzlhMTcwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg' },
                status: 'completed', rating: 10, review: 'Absolutely spectacular world-building and sound design.',
                timeAgo: getTimeAgo(Date.now() - 10000000), dateAdded: Date.now() - 10000000
             },
             {
                id: 'mock-2',
                user: { id: 'mock-sam-chen', name: 'Sam Chen', avatar: 'https://i.pravatar.cc/150?u=sam' },
                action: 'ate at a restaurant', category: 'food',
                book: { title: 'Uchi', author: 'Austin, TX', coverUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=200' },
                status: 'completed', rating: 9, review: 'The best sushi experience in Texas. The zero sen roll is unmatched.',
                timeAgo: getTimeAgo(Date.now() - 50000000), dateAdded: Date.now() - 50000000
             },
             {
                id: 'mock-3',
                user: { id: 'mock-jordan-lee', name: 'Jordan Lee', avatar: 'https://i.pravatar.cc/150?u=jordan' },
                action: 'beat a game', category: 'game',
                book: { title: 'The Last of Us Part II', author: 'Naughty Dog', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.png' },
                status: 'completed', rating: 10, review: 'An emotionally devastating masterpiece. The gameplay loop is incredibly refined.',
                timeAgo: getTimeAgo(Date.now() - 150000000), dateAdded: Date.now() - 150000000
             },
             {
                id: 'mock-4',
                user: { id: 'mock-casey-smith', name: 'Casey Smith', avatar: 'https://i.pravatar.cc/150?u=casey' },
                action: 'is exploring', category: 'music',
                book: { title: 'Brat', author: 'Charli XCX', coverUrl: 'https://upload.wikimedia.org/wikipedia/en/2/23/Charli_XCX_-_Brat.png' },
                status: 'in-progress', rating: 9, review: 'Club pop perfection. The production is completely unhinged in the best way.',
                timeAgo: getTimeAgo(Date.now() - 200000000), dateAdded: Date.now() - 200000000
             },
             {
                id: 'mock-5',
                user: { id: 'mock-morgan-davis', name: 'Morgan Davis', avatar: 'https://i.pravatar.cc/150?u=morgan' },
                action: 'finished a book', category: 'book',
                book: { title: 'Dark Matter', author: 'Blake Crouch', coverUrl: 'https://covers.openlibrary.org/b/id/10515152-L.jpg' },
                status: 'completed', rating: 8, review: 'A mind-bending thriller that I could not put down. Finished in one sitting.',
                timeAgo: getTimeAgo(Date.now() - 350000000), dateAdded: Date.now() - 350000000
             }
          ];

          const filteredMock = categoryFilter ? mockItems.filter(item => {
             const cat = (item.category || '').toLowerCase();
             const filterLower = categoryFilter.toLowerCase();
             if (filterLower === 'watch') return ['tv', 'movie', 'movies', 'watch'].includes(cat);
             if (filterLower === 'food') return ['food', 'restaurant', 'drink'].includes(cat);
             if (filterLower === 'music') return ['music', 'song', 'album'].includes(cat);
             if (filterLower === 'books') return ['book', 'books'].includes(cat);
             if (filterLower === 'places') return ['places', 'place'].includes(cat);
             if (filterLower === 'products') return ['products', 'product'].includes(cat);
             if (filterLower === 'events') return ['events', 'event'].includes(cat);
             if (filterLower === 'games') return ['games', 'game'].includes(cat);
             return cat === filterLower;
          }) : mockItems;

          // Fetch from random public users
          const randomUsersRef = collection(db, "users");
          const randomUsersSnap = await getDocs(query(randomUsersRef, limit(10)));
          const randomIds = randomUsersSnap.docs.map(d => d.id).filter(id => id !== user.uid && !followingIds.has(id));
          
          await Promise.all(randomIds.map(async (randomId) => {
            const userDoc = await getDoc(doc(db, "users", randomId));
            if (!userDoc.exists()) return;

            const userData = userDoc.data();
            const userName = userData.displayName || "Unknown";
            const userAvatar = userData.photoURL || "";

            const itemsRef = collection(db, "users", randomId, "items");
            const q = query(itemsRef, where("privacy", "==", "public"), orderBy("dateAdded", "desc"), limit(5));
            const itemsSnap = await getDocs(q);
            
            itemsSnap.forEach((itemDoc) => {
              const itemData = itemDoc.data();
              if (categoryFilter) {
                 const cat = (itemData.category || '').toLowerCase();
                 const filterLower = categoryFilter.toLowerCase();
                 let matches = false;
                 if (filterLower === 'watch') matches = ['tv', 'movie', 'movies', 'watch'].includes(cat);
                 else if (filterLower === 'food') matches = ['food', 'restaurant', 'drink'].includes(cat);
                 else if (filterLower === 'music') matches = ['music', 'song', 'album'].includes(cat);
                 else if (filterLower === 'books') matches = ['book', 'books'].includes(cat);
                 else if (filterLower === 'places') matches = ['places', 'place'].includes(cat);
                 else if (filterLower === 'products') matches = ['products', 'product'].includes(cat);
                 else if (filterLower === 'events') matches = ['events', 'event'].includes(cat);
                 else if (filterLower === 'games') matches = ['games', 'game'].includes(cat);
                 else matches = cat === filterLower;
                 if (!matches) return;
              }

              let actionVerb = "added a";
              const c = itemData.category?.toLowerCase() || '';
              const status = itemData.status;
              
              if (status === "completed" || status === "read") {
                 if (c.includes('movie')) actionVerb = "watched a movie";
                 else if (c.includes('book')) actionVerb = "finished a book";
                 else if (c.includes('game')) actionVerb = "beat a game";
                 else if (c.includes('food')) actionVerb = "ate at a restaurant";
                 else actionVerb = "finished exploring";
              } else if (status === "in-progress" || status === "watching" || status === "reading") {
                 if (c.includes('movie')) actionVerb = "is watching a movie";
                 else if (c.includes('book')) actionVerb = "is reading a book";
                 else if (c.includes('game')) actionVerb = "is playing a game";
                 else if (c.includes('food')) actionVerb = "is eating at";
                 else actionVerb = "is exploring";
              } else {
                 if (c.includes('movie')) actionVerb = "wants to watch a movie";
                 else if (c.includes('book')) actionVerb = "wants to read a book";
                 else if (c.includes('game')) actionVerb = "wants to play a game";
                 else if (c.includes('food')) actionVerb = "wants to try a restaurant";
                 else actionVerb = "saved an item";
              }
              
              if (itemData.rating) {
                 if (c.includes('movie')) actionVerb = "rated a movie";
                 else if (c.includes('book')) actionVerb = "rated a book";
                 else if (c.includes('game')) actionVerb = "rated a game";
                 else if (c.includes('food')) actionVerb = "rated a restaurant";
                 else actionVerb = "rated an item";
              }

              allItems.push({
                id: itemDoc.id,
                user: {
                  id: randomId,
                  name: userName,
                  avatar: userAvatar,
                },
                action: actionVerb,
                category: itemData.category,
                book: {
                  title: itemData.title,
                  author: itemData.creator || itemData.author || "Unknown",
                  coverUrl: itemData.coverUrl,
                  genres: itemData.metadata?.genres || [],
                  year: itemData.year,
                },
                status: itemData.status,
                rating: itemData.rating,
                review: itemData.review,
                timeAgo: getTimeAgo(itemData.dateAdded || Date.now()),
                dateAdded: itemData.dateAdded || 0,
              } as any);
            });
          }));

          allItems.push(...filteredMock as any[]);
          allItems.sort((a, b) => b.dateAdded - a.dateAdded);
          const finalFeed = allItems.slice(0, 50);
          setFeedItems(finalFeed);
          feedCache = finalFeed;
        }

        // Fetch some public items from suggested users
        const suggested: any[] = [];
        if (false) {
           const pItems: ActivityItem[] = [];
           await Promise.all(suggested.slice(0, 5).map(async (sUser) => {
              const itemsRef = collection(db, "users", sUser.id, "items");
              const q = query(itemsRef, orderBy("dateAdded", "desc"), limit(5));
              const itemsSnap = await getDocs(q);
              itemsSnap.forEach((itemDoc) => {
                const itemData = itemDoc.data();
                if (!checkItemAccess(itemData as any, user?.uid || null, sUser.id, null, [])) return;

                if (categoryFilter) {
                   const cat = (itemData.category || '').toLowerCase();
                   const filterLower = categoryFilter.toLowerCase();
                   let matches = false;
                   if (filterLower === 'watch') matches = ['tv', 'movie', 'movies', 'watch'].includes(cat);
                   else if (filterLower === 'food') matches = ['food', 'restaurant', 'drink'].includes(cat);
                   else if (filterLower === 'music') matches = ['music', 'song', 'album'].includes(cat);
                   else if (filterLower === 'books') matches = ['book', 'books'].includes(cat);
                   else if (filterLower === 'places') matches = ['places', 'place'].includes(cat);
                   else if (filterLower === 'products') matches = ['products', 'product'].includes(cat);
                   else if (filterLower === 'events') matches = ['events', 'event'].includes(cat);
                   else if (filterLower === 'games') matches = ['games', 'game'].includes(cat);
                   else matches = cat === filterLower;
                   
                   if (!matches) return;
                }
  
                let actionVerb = "added a";
                const c = itemData.category?.toLowerCase() || '';
                const status = itemData.status;
                
                if (status === "completed" || status === "read") {
                   if (c.includes('movie')) actionVerb = "watched a movie";
                   else if (c.includes('book')) actionVerb = "finished a book";
                   else if (c.includes('game')) actionVerb = "beat a game";
                   else if (c.includes('food')) actionVerb = "ate at a restaurant";
                   else actionVerb = "finished exploring";
                } else if (status === "in-progress" || status === "watching" || status === "reading") {
                   if (c.includes('movie')) actionVerb = "is watching a movie";
                   else if (c.includes('book')) actionVerb = "is reading a book";
                   else if (c.includes('game')) actionVerb = "is playing a game";
                   else if (c.includes('food')) actionVerb = "is eating at";
                   else actionVerb = "is exploring";
                } else {
                   if (c.includes('movie')) actionVerb = "wants to watch a movie";
                   else if (c.includes('book')) actionVerb = "wants to read a book";
                   else if (c.includes('game')) actionVerb = "wants to play a game";
                   else if (c.includes('food')) actionVerb = "wants to try a restaurant";
                   else actionVerb = "saved an item";
                }
                
                if (itemData.rating) {
                   if (c.includes('movie')) actionVerb = "rated a movie";
                   else if (c.includes('book')) actionVerb = "rated a book";
                   else if (c.includes('game')) actionVerb = "rated a game";
                   else if (c.includes('food')) actionVerb = "rated a restaurant";
                   else actionVerb = "rated an item";
                }
  
                pItems.push({
                  id: `${sUser.id}-${itemDoc.id}`,
                  user: {
                    id: sUser.id,
                    name: sUser.displayName || "Unknown",
                    avatar: sUser.photoURL ? sUser.photoURL : `https://api.dicebear.com/7.x/initials/svg?seed=${sUser.displayName || "Unknown"}`,
                  },
                  action: actionVerb,
                  category: itemData.category,
                  book: {
                    title: itemData.title,
                    author: itemData.creator || itemData.author || "Unknown",
                    coverUrl: itemData.coverUrl,
                    genres: itemData.metadata?.genres || [],
                    year: itemData.year,
                  },
                  status: itemData.status,
                  rating: itemData.rating,
                  review: itemData.review,
                  timeAgo: getTimeAgo(itemData.dateAdded || Date.now()),
                  dateAdded: itemData.dateAdded || 0,
                } as any);
              });
           }));
           pItems.sort((a, b) => b.dateAdded - a.dateAdded);
           const finalPublic = pItems.slice(0, 20);
           setPublicItems(finalPublic);
           publicCache = finalPublic;
        }

      } catch (err) {
        console.warn("Failed to load social feed data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, userLoading, refreshTrigger]);

  const toggleFollow = async (targetId: string, targetName: string) => {
    if (!user) return;
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
      console.warn("Failed to toggle follow", e);
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = (Date.now() - timestamp) / 1000;
    if (diff < 3600) return 'Just now';
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // We will no longer block the entire page on loading.
  // if (loading) {
  //    return (
  //       <div className="flex items-center justify-center min-h-[50vh]">
  //          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
  //       </div>
  //    );
  // }

  const renderEmptyState = () => (
     <div className="max-w-2xl mx-auto px-4 pt-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-[28px] p-8 border border-indigo-200/50 text-center relative overflow-hidden dark:from-indigo-950/40 dark:to-indigo-900/40 dark:border-indigo-800/30">
          <div className="absolute top-0 right-0 p-12 opacity-10 blur-xl mix-blend-multiply">
            <Heart className="w-48 h-48 text-indigo-500" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-indigo-50">
                  <Heart className="w-10 h-10 text-indigo-500 fill-indigo-100 dark:fill-indigo-900/50" />
                </div>
              </div>
              <h2 className="font-serif text-3xl font-bold text-neutral-900 leading-tight mb-3 dark:text-white">
                Great taste is better shared
              </h2>
              <p className="text-neutral-600 font-medium dark:text-neutral-400">Follow friends and creators to improve your recommendations.</p>
            </div>
            
            <button onClick={() => { setFindFriendsTab('discover'); setShowFindFriends(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-10 rounded-full shadow-lg transition-transform active:scale-95 text-sm inline-flex items-center gap-2">
              <Search className="w-5 h-5" /> Find People
            </button>
            <button onClick={handleSeedDemoData} disabled={loading} className="block mx-auto text-indigo-600 hover:text-indigo-700 font-bold text-xs hover:underline disabled:opacity-50 mt-4 px-4 py-2 opacity-50 hover:opacity-100 transition-opacity">
                {loading ? 'Seeding...' : 'Seed Demo Data (Testing)'}
            </button>
          </div>
        </div>

        <div className="text-left pt-6">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif font-bold text-xl dark:text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> Trending Now</h3>
           </div>
           
           <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
              {[1,2,3].map(i => (
                <div key={i} className="w-32 flex-shrink-0 animate-pulse">
                  <div className="w-full aspect-[2/3] bg-neutral-100 rounded-[16px] mb-3 dark:bg-neutral-800" />
                  <div className="h-4 bg-neutral-100 rounded mb-1 dark:bg-neutral-800" />
                  <div className="h-3 bg-neutral-100 rounded w-2/3 dark:bg-neutral-800" />
                </div>
              ))}
           </div>
        </div>
     </div>
  );

  const getIconComponent = (iconId: string) => {
     switch (iconId) {
        case 'book': return <BookOpen className="w-3.5 h-3.5" />;
        case 'tv': return <Tv className="w-3.5 h-3.5" />;
        case 'food': return <Utensils className="w-3.5 h-3.5" />;
        default: return <Users className="w-3.5 h-3.5" />;
     }
  };

  const getCircleIconStyle = (iconId: string) => {
     switch (iconId) {
        case 'book': return 'bg-indigo-500';
        case 'tv': return 'bg-emerald-500';
        case 'food': return 'bg-rose-500';
        default: return 'bg-neutral-500';
     }
  };

  // Helper to map friend ID to a mock circle they belong to, if we seeded them
  const getUserCircle = (userId: string) => {
    // If not seeded correctly, mock it
    if (userId === 'mock-user-1') return { name: 'Book Club', icon: 'book' };
    if (userId === 'mock-user-2') return { name: 'Movie Buffs', icon: 'tv' };
    if (userId === 'mock-user-3') return { name: 'Austin Foodies', icon: 'food' };
    return null;
  };

  // Deduplicate and pull highest rated items
  const bestItems = [...feedItems].sort((a,b) => (b.criticScore || b.rating || 0) - (a.criticScore || a.rating || 0) - (a.review ? 0 : 5)); // Prefer items with reviews and high ratings
  const topPick = bestItems.length > 0 ? bestItems[0] : null;
  const recommendedItems = feedItems.filter(i => i.id !== topPick?.id);

  // Removed following.size === 0 block to always show the feed (including mock data)

  // Deduplicate items securely
  const uniqueItems = Array.from(new Map(feedItems.map(item => [item.book.title, item])).values());
  
  let searchedItems = uniqueItems;
  if (searchQuery.trim()) {
      const fuse = new Fuse(uniqueItems, {
         keys: ['book.title', 'book.author', 'user.name', 'category'],
         threshold: 0.2,
         ignoreLocation: false
      });
      searchedItems = fuse.search(searchQuery).map(res => res.item);
  }

  const sortedItems = searchedItems
    .filter(item => {
       if (selectedCircleId) {
          const circle = circles.find(c => c.id === selectedCircleId);
          if (circle) {
             if (!circle.members.includes(item.user.id)) {
                return false;
             }
             if (circle.memberSettings && circle.memberSettings[item.user.id]) {
                const allowedCats = circle.memberSettings[item.user.id];
                const itemCatLower = item.category?.toLowerCase() || '';
                let mappedCat = itemCatLower;
                if (['tv', 'movie', 'movies', 'watch'].includes(itemCatLower)) mappedCat = 'movies';
                else if (['book', 'books'].includes(itemCatLower)) mappedCat = 'books';
                else if (['food', 'restaurant', 'drink'].includes(itemCatLower)) mappedCat = 'food';
                else if (['music', 'song', 'album'].includes(itemCatLower)) mappedCat = 'music';
                else if (['game', 'games'].includes(itemCatLower)) mappedCat = 'games';

                if (allowedCats.length > 0 && !allowedCats.includes(mappedCat) && !allowedCats.includes(item.category) && !allowedCats.includes('All')) {
                   return false;
                }
             }
          }
       }

       if (activeCategoryFilter && activeCategoryFilter !== 'All') {
           const id = activeCategoryFilter;
           const cat = item.category?.toLowerCase() || '';
           if (id === 'TV & Movies' && !cat.includes('movie') && !cat.includes('tv') && cat !== 'watch') return false;
           if (id === 'Books' && !cat.includes('book') && cat !== 'read') return false;
           if (id === 'Food' && !cat.includes('food') && !cat.includes('restaurant') && !cat.includes('eat') && !cat.includes('dining')) return false;
           if (id === 'Games/Sports' && !cat.includes('game') && !cat.includes('sports')) return false;
           if (id === 'Music' && !cat.includes('music') && !cat.includes('song') && !cat.includes('listen')) return false;
           if (id === 'Places' && !cat.includes('place') && !cat.includes('travel')) return false;
           if (id === 'Highly Rated' && (item.criticScore || item.rating || 0) < 8) return false;
       }
       if (activeUserFilter !== 'All') {
          if (item.user.name !== activeUserFilter) return false;
       }
       if (activeLocationFilter !== 'All') {
          // Future mapping for place/location logic based on items if we had geo info
       }
       
       if (filterOption === 'following') {
          // just mock filtering by removing roughly 30% of items randomly or by specific names to simulate following
          // Emma and Sarah are usually friends
          if (item.user.name !== 'Emma Watson' && item.user.name !== 'Sarah Johnson') return false;
       }
       
       if (categoryFilter) {
          const cat = (item.category || '').toLowerCase();
          const filterLower = categoryFilter.toLowerCase();
          let matches = false;
          if (filterLower === 'watch') matches = ['tv', 'movie', 'movies', 'watch'].includes(cat);
          else if (filterLower === 'food') matches = ['food', 'restaurant', 'drink'].includes(cat);
          else if (filterLower === 'music') matches = ['music', 'song', 'album'].includes(cat);
          else if (filterLower === 'books') matches = ['book', 'books'].includes(cat);
          else if (filterLower === 'places') matches = ['places', 'place'].includes(cat);
          else if (filterLower === 'products') matches = ['products', 'product'].includes(cat);
          else if (filterLower === 'events') matches = ['events', 'event'].includes(cat);
          else if (filterLower === 'games') matches = ['games', 'game'].includes(cat);
          else matches = cat === filterLower;
          
          if (!matches) return false;
       }
       
       return true;
    })
    .sort((a,b) => {
       if (sortOption === 'rating') {
          return (b.criticScore || b.rating || 0) - (a.criticScore || a.rating || 0) - (a.review ? 0 : 5);
       }
       return b.dateAdded - a.dateAdded;
    });

  const usersList = ['All', ...Array.from(new Set(feedItems.map(i => i.user.name)))];
  const locationsList = ['All', 'Austin, TX', 'New York, NY', 'San Francisco, CA'];

  const featuredItem = sortedItems.length > 0 ? sortedItems[0] : null;
  const standardItems = sortedItems.length > 1 ? sortedItems.slice(1) : [];

  const categoryGroups = sortedItems.reduce((acc, item) => {
     let cat = item.category || 'other';
     if (['tv', 'movie', 'movies', 'watch'].includes(cat.toLowerCase())) cat = 'Movies & TV';
     else if (['food', 'restaurant', 'drink'].includes(cat.toLowerCase())) cat = 'Food';
     else if (['book', 'books'].includes(cat.toLowerCase())) cat = 'Books';
     else if (['music', 'song', 'album'].includes(cat.toLowerCase())) cat = 'Music';
     else cat = 'Other';
     
     if (!acc[cat]) acc[cat] = [];
     acc[cat].push(item);
     return acc;
  }, {} as Record<string, typeof sortedItems>);

  const getCategoryIcon = (cat: string) => {
     switch (cat) {
        case 'Movies & TV': return <Tv className="w-5 h-5" />;
        case 'Food': return <Utensils className="w-5 h-5" />;
        case 'Books': return <BookOpen className="w-5 h-5" />;
        case 'Music': return <Music className="w-5 h-5" />;
        default: return <Star className="w-5 h-5" />;
     }
  };

  return (
    <div className={cn("max-w-5xl mx-auto px-4 pt-2 md:pt-4 pb-32", hideHeader && "pb-8")}>
       <FindFriendsModal isOpen={showFindFriends} onClose={() => setShowFindFriends(false)} following={following} onFollowToggle={toggleFollow} initialTab={findFriendsTab} initialSearch={searchQuery} />
       <PublicProfileModal isOpen={selectedProfileId !== null} targetUserId={selectedProfileId} onClose={() => setSelectedProfileId(null)} />
       <RecentActivityModal isOpen={showRecentActivity} onClose={() => setShowRecentActivity(false)} />
       <CreateCircleModal isOpen={showCreateCircle} onClose={() => setShowCreateCircle(false)} onCreated={() => { setShowCreateCircle(false); window.dispatchEvent(new CustomEvent('refresh-feed')); }} />

       {!hideHeader && (
          <>
             <div className="sticky top-0 z-40 bg-neutral-50/95 dark:bg-[#09090b]/95 backdrop-blur-md pt-2 pb-4 mb-6 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-t border-neutral-100 dark:border-white/10">
               <div className="w-full">
                 <SmartSearchBar 
                   placeholder="Search people, creators, tastes..."
                   value={searchQuery}
                   onChange={(val) => {
                     setSearchQuery(val);
                     if (val.trim()) {
                        setShowFindFriends(true);
                     }
                   }}
                 />
               </div>
</div>

               <div className="bg-white rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 shadow-sm border border-black/5 dark:bg-[#1a1a1a] dark:border-white/10 mb-6 flex flex-col gap-3 sm:gap-6">
                 <div className="grid grid-cols-3 divide-x divide-black/5 dark:divide-white/5">
                   <div 
                     onClick={() => { setFindFriendsTab('following'); setShowFindFriends(true); }}
                     className="flex flex-col items-center justify-center space-y-1 sm:space-y-2 cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl py-2"
                   >
                     <Users className="w-4 h-4 sm:w-6 sm:h-6 text-neutral-400 dark:text-neutral-500" />
                     <span className="font-bold text-lg sm:text-3xl text-neutral-900 dark:text-white">{following.size}</span>
                     <div className="flex items-center gap-1 text-[10px] sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                       Following <ChevronRight className="w-3 h-3 hidden sm:block" />
                     </div>
                   </div>
                   <div 
                     onClick={() => { setFindFriendsTab('followers'); setShowFindFriends(true); }}
                     className="flex flex-col items-center justify-center space-y-1 sm:space-y-2 cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl py-2"
                   >
                     <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-neutral-400 dark:text-neutral-500" />
                     <span className="font-bold text-lg sm:text-3xl text-neutral-900 dark:text-white">{followersCount}</span>
                     <div className="flex items-center gap-1 text-[10px] sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                       Followers <ChevronRight className="w-3 h-3 hidden sm:block" />
                     </div>
                   </div>
                   <div 
                     onClick={() => { setFindFriendsTab('matches'); setShowFindFriends(true); }}
                     className="flex flex-col items-center justify-center space-y-1 sm:space-y-2 cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl py-2"
                   >
                     <Crosshair className="w-4 h-4 sm:w-6 sm:h-6 text-neutral-400 dark:text-neutral-500" />
                     <span className="font-bold text-lg sm:text-3xl text-neutral-900 dark:text-white">{tasteTwinsCount}</span>
                     <div className="flex items-center gap-1 text-[10px] sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                       Taste Twins <ChevronRight className="w-3 h-3 hidden sm:block" />
                     </div>
                   </div>
                 </div>
               </div>
<div className="sticky top-[72px] z-30 pt-2 bg-neutral-50 dark:bg-[#09090b]">
               
               <div className="flex items-center justify-between gap-2">
                 <div className="flex items-center gap-2 flex-1 flex-wrap">
                   <div className="relative shrink-0 flex gap-2">
                     <button 
                       onClick={() => window.dispatchEvent(new CustomEvent('open-playlist-modal'))}
                       className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white border border-purple-200 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-colors text-purple-600 dark:text-purple-400 dark:bg-[#1a1a1a] dark:border-purple-500/30 dark:hover:bg-purple-900/20"
                       title="Friend Mix"
                     >
                       <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
                     </button>
                     <button 
                       onClick={() => window.dispatchEvent(new CustomEvent('open-map-modal'))}
                       className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white border border-emerald-200 rounded-lg sm:rounded-xl hover:bg-emerald-50 transition-colors text-emerald-600 dark:text-emerald-400 dark:bg-[#1a1a1a] dark:border-emerald-500/30 dark:hover:bg-emerald-900/20"
                       title="Discovery Map"
                     >
                       <MapIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                     </button>
                     <button onClick={() => setShowGroupsBar(!showGroupsBar)} className={cn("flex items-center gap-2 shrink-0 border rounded-lg sm:rounded-xl px-4 py-1.5 h-8 sm:h-10 text-sm font-medium transition-colors", showGroupsBar ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400" : "bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300")}>
                        <Users className="w-4 h-4" /> <span className="hidden sm:inline">Groups</span>
                     </button>
                     <button 
                       onClick={() => { setIsSortOpen(!isSortOpen); setIsFiltersOpen(false); }}
                       className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border rounded-lg sm:rounded-xl transition-colors ${isSortOpen ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800'}`}
                       title="Sort feed"
                     >
                       <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5" />
                     </button>
                     {isSortOpen && (
                       <div className="absolute top-full left-0 mt-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-2 w-[220px] z-50 flex flex-col items-start text-left text-sm text-black/70 dark:text-white/70 animate-in fade-in duration-200">
                         <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Sort By</div>
                         
                         <button onClick={() => { setSortOption('recency'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'recency' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                            Latest {sortOption === 'recency' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                         </button>
                         <button onClick={() => { setSortOption('rating'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'rating' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                            Highest Rated {sortOption === 'rating' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                         </button>
                         <button onClick={() => { setSortOption('taste'); setIsSortOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${sortOption === 'taste' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                            Taste Match <Sparkles className="w-3.5 h-3.5 inline ml-1 text-emerald-500" /> {sortOption === 'taste' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                         </button>
                       </div>
                     )}
                     <button 
                       onClick={() => { setIsFiltersOpen(!isFiltersOpen); setIsSortOpen(false); }}
                       className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border rounded-lg sm:rounded-xl transition-colors ${isFiltersOpen ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800'}`}
                       title="Filter feed"
                     >
                       <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                     </button>
                     {isFiltersOpen && (
                       <div className="absolute top-full left-0 mt-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-2 w-[220px] max-h-[300px] overflow-y-auto z-50 flex flex-col items-start text-left text-sm text-black/70 dark:text-white/70 animate-in fade-in duration-200 hide-scrollbar">
                         <div className="px-2 py-1.5 text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">Visibility</div>
                         
                         <button onClick={() => { setFilterOption('following'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'following' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                            Following Activity {filterOption === 'following' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                         </button>
                         <button onClick={() => { setFilterOption('everyone'); setIsFiltersOpen(false); }} className={`w-full flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-lg transition-colors ${filterOption === 'everyone' ? 'font-bold text-black dark:text-white bg-neutral-50 dark:bg-white/5' : ''}`}>
                            Everyone {filterOption === 'everyone' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
                 
                 <button
                     onClick={() => setViewMode(viewMode === 'row' ? 'grid' : 'row')}
                     className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg sm:rounded-xl hover:bg-neutral-50 transition-colors dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white/70 dark:hover:bg-neutral-800 ml-auto shrink-0"
                     title="Toggle view"
                   >
                     {viewMode === 'row' ? (
                         <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                     ) : (
                         <List className="w-4 h-4 sm:w-5 sm:h-5" />
                     )}
                 </button>
               </div>

                <AnimatePresence>
                   {showGroupsBar && (
                      <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="overflow-hidden"
                      >
                         <div className="flex items-center gap-3 pt-4 overflow-x-auto hide-scrollbar pb-2">
                            <button 
                               onClick={() => setSelectedCircleId(null)}
                               className={cn(
                                  "shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-colors",
                                  selectedCircleId === null ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                               )}
                            >
                               All Friends
                            </button>
                            {circles.map(c => (
                               <button 
                                  key={c.id}
                                  onClick={() => setSelectedCircleId(c.id)}
                                  className={cn(
                                     "shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-colors flex items-center gap-2",
                                     selectedCircleId === c.id ? "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500" : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                                  )}
                               >
                                  {c.name}
                               </button>
                            ))}
                            <button 
                               onClick={() => setShowCreateCircle(true)}
                               className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors border border-dashed border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-700"
                            >
                               <Plus className="w-4 h-4" />
                            </button>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
          </>
       )}

       {viewMode === 'row' ? (
          <div className="space-y-6">
             {loading && sortedItems.length === 0 ? (
                [1, 2, 3].map(i => (
                   <div key={i} className="flex flex-col sm:flex-row bg-white dark:bg-[#1a1a1a] rounded-[24px] overflow-hidden border border-neutral-200 dark:border-white/10 shadow-sm animate-pulse">
                      <div className="w-full sm:w-[35%] aspect-square sm:aspect-auto sm:min-h-[200px] bg-neutral-200 dark:bg-white/5"></div>
                      <div className="w-full sm:w-[65%] p-4 flex flex-col justify-center space-y-4">
                         <div className="h-4 bg-neutral-200 dark:bg-white/5 rounded w-1/4"></div>
                         <div className="h-6 bg-neutral-200 dark:bg-white/5 rounded w-3/4"></div>
                         <div className="h-4 bg-neutral-200 dark:bg-white/5 rounded w-full"></div>
                         <div className="h-4 bg-neutral-200 dark:bg-white/5 rounded w-5/6"></div>
                      </div>
                   </div>
                ))
             ) : sortedItems.map((item, i) => {
                let catGroup = 'Other';
                const catLower = (item.category || '').toLowerCase();
                if (['tv', 'movie', 'movies', 'watch'].includes(catLower)) catGroup = 'Movies & TV';
                else if (['food', 'restaurant', 'drink'].includes(catLower)) catGroup = 'Food';
                else if (['book', 'books'].includes(catLower)) catGroup = 'Books';
                else if (['music', 'song', 'album'].includes(catLower)) catGroup = 'Music';

                return (
                   <div key={`${item.id}-${i}`} className="flex flex-col sm:flex-row bg-white dark:bg-[#1a1a1a] rounded-[24px] overflow-hidden border border-neutral-200 dark:border-white/10 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePreview(item)}>
                      {/* Left Image */}
                      <div className="relative w-full sm:w-[35%] aspect-square sm:aspect-auto sm:min-h-[200px]">
                         {item.book.coverUrl ? (
                            <ImageWithFallback src={item.book.coverUrl} className="absolute inset-0 w-full h-full object-cover" />
                         ) : (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                               <BookOpen className="w-12 h-12 text-neutral-300" />
                            </div>
                         )}
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                         
                         <div className="absolute top-4 left-4 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setSelectedProfileId(item.user.id); }}>
                            <div className="relative">
                               <img src={item.user.avatar} className="w-10 h-10 rounded-full border-2 border-white/20 object-cover cursor-pointer" />
                               <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1a1a]">
                                  <CheckSquare className="w-2.5 h-2.5 text-white" />
                               </div>
                            </div>
                            <span className="text-white font-medium text-sm drop-shadow-md cursor-pointer hover:underline">{item.user.name}</span>
                         </div>
                         
                         <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                            <span className="text-white font-semibold text-sm drop-shadow-md">{item.timeAgo}</span>
                            <button className="text-white hover:text-emerald-400 drop-shadow-md"><Bookmark className="w-5 h-5" /></button>
                         </div>
                         
                         <div className="absolute bottom-4 left-4 right-4 text-white">
                            <h3 className="font-serif font-bold text-2xl leading-tight mb-1">{item.book.title}</h3>
                            <p className="text-sm font-medium text-white/80 line-clamp-1">{item.book.author} {item.book.year ? `• ${item.book.year}` : ''}</p>
                         </div>
                      </div>
                      
                      {/* Right Details */}
                      <div className="w-full sm:w-[65%] p-4 flex flex-col justify-center">
                         <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                               {getCategoryIcon(catGroup)} {catGroup}
                            </div>
                            <button><MoreVertical className="w-5 h-5 text-neutral-400" /></button>
                         </div>
                         
                         <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-3">{calculateMatch(item.book.title)}% Match for You</div>
                         
                         {item.book.genres && item.book.genres.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                               {item.book.genres.slice(0, 3).map((tag: string) => (
                                  <span key={tag} className="bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 text-xs font-bold px-3 py-1 rounded-full">{tag}</span>
                               ))}
                            </div>
                         )}
                         
                         <div className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); setShowLikesModal({itemId: item.id, likesCount: 4}); }}>
                            <div className="flex -space-x-2">
                               <img src="https://i.pravatar.cc/150?u=emma" className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1a1a1a]" />
                               <img src="https://i.pravatar.cc/150?u=chris" className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1a1a1a]" />
                               <img src="https://i.pravatar.cc/150?u=zoe" className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1a1a1a]" />
                            </div>
                            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">+4 friends saved this</span>
                         </div>
                         
                         <p className="text-neutral-700 dark:text-neutral-300 text-sm font-medium leading-relaxed mt-auto line-clamp-3">
                            {item.review || `A great find added by ${item.user.name}.`}
                         </p>
                      </div>
                   </div>
                );
             })}
          </div>
       ) : (
          <div className="space-y-10">
             {loading && Object.keys(categoryGroups).length === 0 ? (
                [1, 2].map(cat => (
                   <div key={cat} className="space-y-4 animate-pulse">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-neutral-200 dark:bg-white/5"></div>
                            <div className="h-6 w-32 rounded bg-neutral-200 dark:bg-white/5"></div>
                         </div>
                      </div>
                      <div className="flex overflow-x-auto gap-4 pb-4">
                         {[1, 2, 3].map(i => (
                            <div key={i} className="w-[240px] h-[300px] flex-shrink-0 bg-neutral-200 dark:bg-[#1a1a1a] rounded-[20px] overflow-hidden border border-neutral-200 dark:border-white/10 shadow-sm"></div>
                         ))}
                      </div>
                   </div>
                ))
             ) : ['Food', 'Movies & TV', 'Books', 'Music', 'Other'].map(cat => {
                let items = categoryGroups[cat];
                if (!items || items.length === 0) return null;
                
                const availableFilters = CATEGORY_SUB_FILTERS_DISPLAY_NAMES[cat] || CATEGORY_SUB_FILTERS_DISPLAY_NAMES[cat === 'Movies & TV' ? 'TV & Movies' : cat] || [];
                
                const activeIncludes = Object.entries(catTypeFilters[cat] || {}).filter(([_, v]) => v === 'include').map(([k]) => k);
                const activeExcludes = Object.entries(catTypeFilters[cat] || {}).filter(([_, v]) => v === 'exclude').map(([k]) => k);

                if (activeIncludes.length > 0 || activeExcludes.length > 0) {
                    items = items.filter((item: any) => {
                       const searchStr = `${item.book.title} ${item.book.author} ${item.category} ${item.book.genres?.join(' ') || ''} ${item.review || ''}`.toLowerCase();
                       const matchType = (t: string) => searchStr.includes(t.toLowerCase());
                       
                       if (activeExcludes.length > 0 && activeExcludes.some(matchType)) return false;
                       if (activeIncludes.length > 0 && !activeIncludes.some(matchType)) return false;
                       return true;
                    });
                }
                
                if (items.length === 0) return null;
                
                return (
                   <div key={cat} className="space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            {getCategoryIcon(cat)}
                            <h2 className="font-serif font-bold text-xl text-neutral-900 dark:text-white">{cat}</h2>
                         </div>
                         <button className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white text-sm font-bold flex items-center gap-1">
                            View all <ChevronRight className="w-4 h-4" />
                         </button>
                      </div>
                      
                      {availableFilters.length > 0 && (
                        <div className="flex gap-2 mb-2 items-center overflow-x-auto hide-scrollbar pb-1">
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
                                  state === 'include' ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : 
                                  state === 'exclude' ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 line-through" : 
                                  "bg-neutral-100 dark:bg-white/5 border-transparent text-neutral-600 dark:text-white/60 hover:bg-neutral-200 dark:hover:bg-white/10"
                                }`}
                              >
                                {f}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                         {items.map((item, i) => (
                            <div key={`${item.id}-${i}`} className="w-[240px] flex-shrink-0 bg-white dark:bg-[#1a1a1a] rounded-[20px] overflow-hidden border border-neutral-200 dark:border-white/10 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePreview(item)}>
                               <div className="relative aspect-[4/5]">
                                  {item.book.coverUrl ? (
                                     <ImageWithFallback src={item.book.coverUrl} className="absolute inset-0 w-full h-full object-cover" />
                                  ) : (
                                     <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                                        <BookOpen className="w-8 h-8 text-neutral-300" />
                                     </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                  
                                  <div className="absolute top-3 left-3 flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); setSelectedProfileId(item.user.id); }}>
                                     <img src={item.user.avatar} className="w-8 h-8 rounded-full border-2 border-white/20 object-cover cursor-pointer" />
                                     <span className="text-white font-medium text-xs drop-shadow-md cursor-pointer hover:underline">{item.user.name}</span>
                                  </div>
                                  
                                  <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                                     <span className="text-white font-semibold text-xs drop-shadow-md">{item.timeAgo}</span>
                                     <button className="text-white hover:text-emerald-400 drop-shadow-md"><Bookmark className="w-4 h-4" /></button>
                                  </div>
                                  
                                  <div className="absolute bottom-3 left-3 right-3 text-white">
                                     <h3 className="font-serif font-bold text-lg leading-tight mb-0.5 line-clamp-2">{item.book.title}</h3>
                                     <p className="text-xs font-medium text-white/80 line-clamp-1">{item.book.author} {item.book.year ? `• ${item.book.year}` : ''}</p>
                                  </div>
                               </div>
                               <div className="p-4">
                                  <div className="flex items-center justify-between">
                                     <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">{calculateMatch(item.book.title)}% Match</span>
                                     <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); setShowLikesModal({itemId: item.id, likesCount: 4}); }}>
                                        <div className="flex -space-x-1.5">
                                           <img src="https://i.pravatar.cc/150?u=emma" className="w-5 h-5 rounded-full border-2 border-white dark:border-[#1a1a1a]" title="Emma" />
                                           <img src="https://i.pravatar.cc/150?u=chris" className="w-5 h-5 rounded-full border-2 border-white dark:border-[#1a1a1a]" title="Chris" />
                                           <img src="https://i.pravatar.cc/150?u=zoe" className="w-5 h-5 rounded-full border-2 border-white dark:border-[#1a1a1a]" title="Zoe" />
                                        </div>
                                        <span className="text-xs font-bold text-neutral-500">+4</span>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         ))}
                       </div>
                   </div>
                );
             })}
          </div>
       )}
       
       <RecommendationModal 
          selectedRec={selectedRec} 
          setSelectedRec={setSelectedRec} 
          onReject={(rec) => {
             setSelectedRec(null);
          }} 
          saveItem={(item) => {
             saveItem(item);
             setSelectedRec(null);
          }}
       />

       {showLikesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLikesModal(null)}>
             <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-neutral-100 dark:border-white/10 flex items-center justify-between">
                   <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Saved By</h3>
                   <button onClick={() => setShowLikesModal(null)} className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                   {[
                     { name: 'Emma Wilson', handle: '@emmaw', avatar: 'https://i.pravatar.cc/150?u=emma' },
                     { name: 'Chris Evans', handle: '@chrise', avatar: 'https://i.pravatar.cc/150?u=chris' },
                     { name: 'Zoe Martinez', handle: '@zoem', avatar: 'https://i.pravatar.cc/150?u=zoe' },
                     { name: 'Alex Rivera', handle: '@alexr', avatar: 'https://i.pravatar.cc/150?u=alex' },
                     { name: 'Sam Chen', handle: '@samc', avatar: 'https://i.pravatar.cc/150?u=sam' },
                     { name: 'Jordan Lee', handle: '@jordanl', avatar: 'https://i.pravatar.cc/150?u=jordan' },
                     { name: 'Casey Smith', handle: '@caseys', avatar: 'https://i.pravatar.cc/150?u=casey' }
                   ].map((u, i) => (
                     <div key={i} className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl cursor-pointer" onClick={() => { setShowLikesModal(null); setSelectedProfileId('mock-' + u.name.toLowerCase().replace(' ', '-')); }}>
                        <img src={u.avatar} className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-white/10" />
                        <div className="flex-1">
                           <div className="font-bold text-sm text-neutral-900 dark:text-white">{u.name}</div>
                           <div className="text-xs text-neutral-500">{u.handle}</div>
                        </div>
                        <button className="bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-900 dark:text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); setFollowing(prev => { const n = new Set(prev); if(n.has(u.name)) n.delete(u.name); else n.add(u.name); return n; }); }}>
                           {following.has(u.name) ? 'Following' : 'Follow'}
                        </button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       )}
        {!hideHeader && (
           <CategoryIconFilter 
             value={activeCategoryFilter} 
             onChange={(val) => {
                 if (val && val !== 'All') {
                     let targetPath = '';
                     if (val === 'Books') targetPath = '/zone/books';
                     else if (val === 'TV & Movies') targetPath = '/zone/watch';
                     else if (val === 'Music') targetPath = '/zone/music';
                     else if (val === 'Podcasts') targetPath = '/zone/podcasts';
                     else if (val === 'Food') targetPath = '/zone/food';
                     else if (val === 'Places') targetPath = '/zone/places';
                     else if (val === 'Games/Sports') targetPath = '/zone/games';
                     if (targetPath) {
                        navigate(targetPath);
                     } else {
                        setActiveCategoryFilter(val);
                     }
                 } else {
                     setActiveCategoryFilter('All');
                 }
             }} 
           />
        )}
    </div>
  );
}
