import React, { useState, useEffect } from 'react';
import { Search, User, Mic, Sparkles, Lightbulb } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import RichCriticPortalModal from './RichCriticPortalModal';
import SettingsModal from './SettingsModal';
import DilectiNavIcon from './DilectiNavIcon';

export default function DilectiHeader() {
  const { user, loading, signIn, signOut } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRichCritic, setShowRichCritic] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isHome = location.pathname === '/';
  
  useEffect(() => {
    const handleOpenSettings = () => setShowSettings(true);
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  const handleSearch = () => {
    window.dispatchEvent(
      new CustomEvent('open-ask-for-ideas')
    );
  };

  return (
    <>
      <header className="w-full border-b border-black/5 bg-white sticky top-0 z-30 dark:bg-[#1a1a1a] dark:border-white/5">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between">
          <div className="flex items-center flex-shrink-0">
            <div className="flex flex-shrink-0 items-center justify-start cursor-pointer group" onClick={() => {
              navigate('/');
              window.scrollTo(0, 0);
            }}>
            <div className="w-8 h-8 md:w-9 md:h-9 text-emerald-500 hover:scale-105 transition-transform flex items-center justify-center">
              <DilectiNavIcon className="w-full h-full" strokeWidth="1" />
            </div>
            {/* Show dilecti text ONLY on larger screens or hide completely on mobile to save space */}
            <span className="hidden sm:inline-block ml-2 font-logo font-semibold text-[26px] md:text-[30px] leading-none tracking-normal text-black pt-1 dark:text-white">
              dilecti
            </span>
          </div>
          <span className="hidden lg:inline-block ml-4 text-[11px] uppercase font-semibold text-neutral-500 border-l border-neutral-200 pl-4 tracking-[0.2em] opacity-80 pt-1 dark:text-neutral-400 dark:border-white/10">
            Save. Share. Discover.
          </span>
        </div>
        
        {!isHome && (
          <div className="flex-1 mx-2 sm:mx-4 flex justify-end md:justify-center items-center">
              <button 
                 onClick={handleSearch}
                 className="bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-100 rounded-full py-1.5 px-3 md:py-2 md:px-4 flex items-center gap-2 cursor-pointer group shadow-sm dark:bg-emerald-950 dark:border-emerald-900"
                 title="Ask Dilecti AI"
              >
                 <div className="bg-emerald-200/50 p-1 md:p-1.5 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-700 group-hover:scale-110 transition-transform dark:text-emerald-300" />
                 </div>
                 <span className="text-xs md:text-sm font-bold text-emerald-900 hidden sm:inline-block dark:text-emerald-100">Ask AI</span>
              </button>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 ml-auto">
          <button 
             className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 transition-colors px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-emerald-100 shadow-sm whitespace-nowrap dark:bg-emerald-950 dark:border-emerald-900"
             onClick={() => setShowRichCritic(true)}
             title="Open Rich Critic Portal"
          >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px] md:w-[18px] md:h-[18px] text-emerald-600 dark:text-emerald-400">
               <ellipse cx="12" cy="17" rx="8" ry="3"></ellipse>
               <path d="M4 17v-4c0 1.66 3.58 3 8 3s8-1.34 8-3v4"></path>
               <path d="M4 13V9c0 1.66 3.58 3 8 3s8-1.34 8-3v4"></path>
               <ellipse cx="12" cy="6" rx="8" ry="3"></ellipse>
              </svg>
             <span className="font-bold text-[12px] md:text-sm text-emerald-900 dark:text-emerald-100">1017</span>
          </button>
          
          <button
             onClick={() => window.dispatchEvent(new Event('toggle-debug'))}
             className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300"
             title="Toggle Debug Panel"
          >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
               <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
               <path d="M9 18c1.84 0 3.33-1.34 3.33-3s-1.49-3-3.33-3S5.67 13.34 5.67 15s1.49 3 3.33 3z"></path>
               <path d="M2 12c0-1.66 4-3 9-3s9 1.34 9 3"></path>
             </svg>
          </button>

          {loading ? (
             <div className="w-8 h-8 md:w-10 md:h-10 bg-black/5 rounded-full animate-pulse dark:bg-white/5" />
          ) : (
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-full overflow-hidden border border-black/10 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all group relative dark:border-white/10"
                onClick={() => user ? setShowSettings(true) : signIn()}
                title={user ? "Open Settings" : "Login"}
              >
                 {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-900">
                       <User className="w-4 h-4 md:w-5 md:h-5 text-emerald-800 dark:text-emerald-200" />
                    </div>
                 )}
                 <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                 </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </header>
      <RichCriticPortalModal
        isOpen={showRichCritic}
        onClose={() => setShowRichCritic(false)}
      />
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
}
