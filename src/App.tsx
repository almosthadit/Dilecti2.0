import { BrowserRouter as Router, Routes, Route, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DilectiHome from './components/DilectiHome';
import Navigation from './components/Navigation';
import DilectiHeader from './components/DilectiHeader';
import TasteProfileModal from './components/TasteProfileModal';
import UniversalAddModal from './components/UniversalAddModal';
import CategoryZone from './components/CategoryZone';
import DiscoverTab from './components/DiscoverTab';
import FeedTab from './components/FeedTab';
import EarnTab from './components/EarnTab';
import UniversalLibrary from './components/UniversalLibrary';
import ProfileTab from './components/ProfileTab';
import StatsTab from './components/StatsTab';
import LoginScreen from './components/LoginScreen';
import { useUser } from './context/UserContext';
import SplashScreen from './components/SplashScreen';
import RichCriticPortalModal from './components/RichCriticPortalModal';
import ItemDetailModal from './components/ItemDetailModal';
import CreatorGraphModal from './components/CreatorGraphModal';
import PublicProfileModal from './components/PublicProfileModal';
import TasteCompareModal from './components/TasteCompareModal';
import ImportModal from './components/ImportModal';

import AskForIdeasModal from './components/AskForIdeasModal';
import AITasteQuizModal from './components/AITasteQuizModal';
import SettingsModal from './components/SettingsModal';
import DebugPanel from './components/DebugPanel';
import { SocialItemModal } from './components/SocialItemModal';
import { PlaylistGeneratorModal } from './components/PlaylistGeneratorModal';
import { FoodGeneratorModal } from './components/FoodGeneratorModal';
import { GlobalMiniPlayer } from './components/GlobalMiniPlayer';
import { FriendMapViewModal } from './components/FriendMapViewModal';

import { useUserProfile } from './hooks';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [pathname]);
  return null;
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const { profile, updateProfile } = useUserProfile();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('dilecti_splash_seen_v3');
  });

  const wasFullyLoggedOut = React.useRef(false);

  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem('theme') || 'light';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    // Apply immediately
    applyTheme();
    
    // Listen for changes
    window.addEventListener('theme-changed', applyTheme);
    return () => window.removeEventListener('theme-changed', applyTheme);
  }, []);

  useEffect(() => {
    if (!user && !loading) {
      wasFullyLoggedOut.current = true;
    }
  }, [user, loading]);

  useEffect(() => {
    if (user && wasFullyLoggedOut.current) {
      wasFullyLoggedOut.current = false;
      sessionStorage.removeItem('dilecti_splash_seen_v3');
      setShowSplash(true);
      navigate('/');
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center dark:bg-[#1a1a1a]">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"/>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => {
      sessionStorage.setItem('dilecti_splash_seen_v3', 'true');
      setShowSplash(false);
    }} />;
  }

  return <>{children}</>;
}

function LayoutShell() {
  const location = useLocation();
  const [showUniversalAdd, setShowUniversalAdd] = useState(false);
  const [addPhotoScan, setAddPhotoScan] = useState(false);
  const [addCategory, setAddCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addItemData, setAddItemData] = useState<any>(null);
  
  const [showTasteProfile, setShowTasteProfile] = useState(false);
  const [isTasteQuizOpen, setIsTasteQuizOpen] = useState(false);
  const [showRichCritic, setShowRichCritic] = useState(false);
  const [activeItemDetails, setActiveItemDetails] = useState<any>(null);
  
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<string | null>(null);
  const [showAskForIdeas, setShowAskForIdeas] = useState(false);
  const [askForIdeasPrompt, setAskForIdeasPrompt] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'account' | 'demographics' | 'social' | 'custom AI'>('account');
  
  // Social Modals
  const [publicProfileTarget, setPublicProfileTarget] = useState<string | null>(null);
  const [isPublicProfileFullScreen, setIsPublicProfileFullScreen] = useState(false);
  const [tasteCompareTarget, setTasteCompareTarget] = useState<string | null>(null);
  const [socialItemTarget, setSocialItemTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [playlistModalTarget, setPlaylistModalTarget] = useState<string | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapModalTarget, setMapModalTarget] = useState<string | null>(null);

  useEffect(() => {
    // Check for incoming share data from PWA web share target
    const params = new URLSearchParams(window.location.search);
    if (params.has('share') || params.has('title') || params.has('text') || params.has('url')) {
      const title = params.get('title') || '';
      const text = params.get('text') || '';
      const url = params.get('url') || '';
      let combined = [title, text, url].filter(Boolean).join(' ');
      // Security: Sanitize and truncate incoming PWA web share target text to prevent injection or DoS
      if (combined.length > 2000) {
        combined = combined.substring(0, 2000) + '...';
      }
      
      // Clean up the URL so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (combined.trim()) {
        setTimeout(() => {
          setSearchQuery(combined);
          setAddCategory(null);
          setAddItemData(null);
          setShowUniversalAdd(true);
        }, 500);
      }
    }
  }, []);

  useEffect(() => {
     setPublicProfileTarget(null);
     setIsPublicProfileFullScreen(false);
     setTasteCompareTarget(null);
     setSocialItemTarget(null);
     setIsPlaylistModalOpen(false);
      setIsFoodModalOpen(false);
     setIsMapModalOpen(false);
     setActiveItemDetails(null);
     setShowUniversalAdd(false);
     setShowTasteProfile(false);
     setIsTasteQuizOpen(false);
     setShowRichCritic(false);
     setShowSettings(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleCloseAllModals = () => {
       setPublicProfileTarget(null);
       setIsPublicProfileFullScreen(false);
       setTasteCompareTarget(null);
       setSocialItemTarget(null);
       setIsPlaylistModalOpen(false);
      setIsFoodModalOpen(false);
       setIsMapModalOpen(false);
       setActiveItemDetails(null);
       setShowUniversalAdd(false);
       setShowTasteProfile(false);
       setIsTasteQuizOpen(false);
       setShowRichCritic(false);
       setShowSettings(false);
       setShowAskForIdeas(false);
       setShowImport(false);
    };
    window.addEventListener('close-all-modals', handleCloseAllModals);

    const handleToast = (e: Event) => {
        const ce = e as CustomEvent;
        setToast({ message: ce.detail.message, type: ce.detail.type });
        setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('toast-alert', handleToast);

    const handleCreateNew = (e: Event) => {
      const customEvent = e as CustomEvent;
      const category = customEvent.detail?.category || null;
      let catId = category;
      if (category === 'Food') catId = 'food';
      if (category === 'TV/Movies') catId = 'watch';
      if (category === 'Music') catId = 'music';
      if (category === 'Products') catId = 'products';
      if (category === 'Places') catId = 'places';
      if (category === 'Books') catId = 'books';
      if (category === 'Events') catId = 'events';
      if (category === 'Games' || category === 'Games/Sports') catId = 'games';
      
      setAddCategory(catId);
      setSearchQuery('');
      setAddItemData(null);
      setShowUniversalAdd(true);
      
      setActiveItemDetails(null);
      setPublicProfileTarget(null);
      setTasteCompareTarget(null);
      setShowAskForIdeas(false);
    };
    
    const handleOpenTasteProfile = () => setShowTasteProfile(true);
    const handleOpenTasteQuiz = () => setIsTasteQuizOpen(true);
    const handleOpenRichCritic = () => setShowRichCritic(true);
    const handleOpenSettings = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSettingsTab(customEvent.detail || 'account');
      setShowSettings(true);
    };
    const handleOpenImport = (e: Event) => {
       const customEvent = e as CustomEvent;
       if (customEvent.detail?.returnToAdd) {
           sessionStorage.setItem('dilecti_return_to_add', 'true');
       }
       if (customEvent.detail?.mode) {
           setImportMode(customEvent.detail.mode);
       } else {
           setImportMode(null);
       }
       setShowImport(true);
    };
    const handleAskForIdeas = (e: Event) => {
       const customEvent = e as CustomEvent;
       setAskForIdeasPrompt(customEvent.detail?.prompt || "");
       setShowAskForIdeas(true);
    };

    const handleOpenSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAddCategory(null);
      setSearchQuery(customEvent.detail?.query || '');
      setAddItemData(null);
      setShowUniversalAdd(true);
    };

    const handleOpenAdd = (e: Event) => {
      const customEvent = e as CustomEvent;
      const itemToEdit = customEvent.detail?.item || customEvent.detail?.initialItem || null;
      setAddCategory(itemToEdit?.category || customEvent.detail?.initialCategory || customEvent.detail?.defaultCategory || null);
      setSearchQuery(customEvent.detail?.initialQuery || '');
      setAddItemData(itemToEdit || (customEvent.detail?.defaultStatus ? { status: customEvent.detail.defaultStatus } : null));
      setAddPhotoScan(customEvent.detail?.openPhotoScan || false);
      setShowUniversalAdd(true);
    };

    const handleOpenItem = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveItemDetails(customEvent.detail);
    };

    const handleOpenPublicProfile = (e: Event) => {
       const customEvent = e as CustomEvent;
       setPublicProfileTarget(customEvent.detail?.userId || null);
       setIsPublicProfileFullScreen(customEvent.detail?.fullScreen || false);
    };

    const handleOpenTasteCompare = (e: Event) => {
       const customEvent = e as CustomEvent;
       setTasteCompareTarget(customEvent.detail?.targetUserId || null);
    };

    const handleOpenSocialModal = (e: Event) => {
       const customEvent = e as CustomEvent;
       setSocialItemTarget(customEvent.detail?.title || null);
    };

    window.addEventListener('create-new-item', handleCreateNew);
    window.addEventListener('open-taste-profile', handleOpenTasteProfile);
    window.addEventListener('open-taste-quiz', handleOpenTasteQuiz);
    window.addEventListener('open-settings', handleOpenSettings);
    window.addEventListener('open-rich-critic-portal', handleOpenRichCritic);
    window.addEventListener('open-universal-search', handleOpenSearch);
    window.addEventListener('open-universal-add-item', handleOpenAdd);
    const handleOpenPlaylist = (e: Event) => {
      const customEvent = e as CustomEvent;
      setPlaylistModalTarget(customEvent.detail?.targetUserId || null);
      setIsPlaylistModalOpen(true);
    };

    const handleOpenFood = (e: Event) => {
      setIsFoodModalOpen(true);
    };
    const handleOpenMap = (e: Event) => {
       const customEvent = e as CustomEvent;
       setMapModalTarget(customEvent.detail?.targetUserId || null);
       setIsMapModalOpen(true);
    };

    window.addEventListener('open-item', handleOpenItem);
    window.addEventListener('open-public-profile', handleOpenPublicProfile);
    window.addEventListener('open-taste-compare', handleOpenTasteCompare);
    window.addEventListener('open-social-modal', handleOpenSocialModal);
    window.addEventListener('open-import', handleOpenImport);
    window.addEventListener('open-ask-for-ideas', handleAskForIdeas);
    window.addEventListener('open-playlist-modal', handleOpenPlaylist);
    window.addEventListener('open-food-modal', handleOpenFood);
    window.addEventListener('open-map-modal', handleOpenMap);
    
    return () => {
       window.removeEventListener('close-all-modals', handleCloseAllModals);
       window.removeEventListener('toast-alert', handleToast);
       window.removeEventListener('create-new-item', handleCreateNew);
       window.removeEventListener('open-taste-profile', handleOpenTasteProfile);
       window.removeEventListener('open-taste-quiz', handleOpenTasteQuiz);
       window.removeEventListener('open-settings', handleOpenSettings);
       window.removeEventListener('open-rich-critic-portal', handleOpenRichCritic);
       window.removeEventListener('open-universal-search', handleOpenSearch);
       window.removeEventListener('open-universal-add-item', handleOpenAdd);
       window.removeEventListener('open-item', handleOpenItem);
       window.removeEventListener('open-public-profile', handleOpenPublicProfile);
       window.removeEventListener('open-taste-compare', handleOpenTasteCompare);
       window.removeEventListener('open-social-modal', handleOpenSocialModal);
       window.removeEventListener('open-import', handleOpenImport);
       window.removeEventListener('open-ask-for-ideas', handleAskForIdeas);
       window.removeEventListener('open-playlist-modal', handleOpenPlaylist);
       window.removeEventListener('open-food-modal', handleOpenFood);
       window.removeEventListener('open-map-modal', handleOpenMap);
    }
  }, []);

  const showHeader = location.pathname === '/' || location.pathname === '/profile';

  return (
    <div className="min-h-screen pb-20 relative bg-white dark:bg-[#1a1a1a]">

      {showHeader && <DilectiHeader />}
      <Outlet />
      
      <div className="max-w-5xl mx-auto px-6 py-12 text-center opacity-50">
         <p className="text-[10px] sm:text-xs font-medium text-black/60 dark:text-white/60 mb-2">
            Affiliate Disclosure: Some links on Dilecti may earn an affiliate commission.
         </p>
         <p className="text-[10px] sm:text-xs text-black/40 dark:text-white/40">
            Our recommendations and algorithms are driven entirely by user taste and curation. They are never influenced by affiliate partnerships, merchants, or financial incentives.
         </p>
      </div>

      <Navigation onImportClick={() => window.dispatchEvent(new Event('open-import'))} />
      <UniversalAddModal 
        isOpen={showUniversalAdd} 
        onClose={() => {
          setShowUniversalAdd(false);
          setAddPhotoScan(false);
          setSearchQuery('');
          setAddItemData(null);
        }} 
        initialCategory={addCategory}
        initialQuery={searchQuery}
        initialItem={addItemData}
        initialPhotoScan={addPhotoScan}
      />
      <TasteProfileModal 
        isOpen={showTasteProfile} 
        onClose={() => setShowTasteProfile(false)} 
      />
      <RichCriticPortalModal
        isOpen={showRichCritic}
        onClose={() => setShowRichCritic(false)}
      />
      <ItemDetailModal
        isOpen={!!activeItemDetails}
        initialItem={activeItemDetails}
        onClose={() => setActiveItemDetails(null)}
      />
      <CreatorGraphModal />
      <PublicProfileModal
        isOpen={!!publicProfileTarget}
        targetUserId={publicProfileTarget}
        isFullScreen={isPublicProfileFullScreen}
        onClose={() => {
           setPublicProfileTarget(null);
           setIsPublicProfileFullScreen(false);
        }}
      />
      <TasteCompareModal
        isOpen={!!tasteCompareTarget}
        targetUserId={tasteCompareTarget}
        onClose={() => setTasteCompareTarget(null)}
      />
      <SocialItemModal
        isOpen={!!socialItemTarget}
        title={socialItemTarget}
        onClose={() => setSocialItemTarget(null)}
      />
      <ImportModal
        isOpen={showImport}
        onClose={() => {
           setShowImport(false);
           setImportMode(null);
        }}
        initialMode={importMode}
      />
      <AskForIdeasModal
        isOpen={showAskForIdeas}
        onClose={() => setShowAskForIdeas(false)}
        initialPrompt={askForIdeasPrompt}
      />
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        initialTab={settingsTab}
      />
      {isTasteQuizOpen && <AITasteQuizModal onClose={() => setIsTasteQuizOpen(false)} />}
      <FoodGeneratorModal isOpen={isFoodModalOpen} onClose={() => setIsFoodModalOpen(false)} />
      <PlaylistGeneratorModal isOpen={isPlaylistModalOpen} onClose={() => setIsPlaylistModalOpen(false)} targetUserId={playlistModalTarget} />
      <FriendMapViewModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} targetUserId={mapModalTarget} />
      
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
          >
             <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
             {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      <DebugPanel />
      <GlobalMiniPlayer />
    </div>
  );
}


export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthWrapper>
        <Routes>
          <Route path="/" element={<LayoutShell />}>
            {/* Universal Zone */}
            <Route index element={<DilectiHome />} />
            
            <Route path="library" element={<UniversalLibrary />} />
            <Route path="zone/:categoryId" element={<CategoryZone />} />
            
            <Route path="discover" element={<DiscoverTab />} />
            
            <Route path="feed" element={<FeedTab />} />
            
            <Route path="stats" element={<StatsTab />} />
            
            <Route path="earn" element={<EarnTab />} />
            <Route path="profile" element={<ProfileTab />} />

            {/* Book Zone / Feyble */}
            <Route path="books/*" element={<Navigate to="/zone/books" replace />} />
            <Route path="feyble/*" element={<Navigate to="/zone/books" replace />} />
          </Route>
        </Routes>
      </AuthWrapper>
    </Router>
  );
}
