import { BookOpen, Compass, Activity, Download, Home, UserRound, Plus, DollarSign, Zap, Settings2, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import DilectiNavIcon from "./DilectiNavIcon";
import UsersThree from "./UsersThree";

type NavigationProps = {
  onImportClick: () => void;
};

export default function Navigation({ onImportClick }: NavigationProps) {
  const location = useLocation();

  // Helper to determine if a tab is active.
  const isActive = (tabId: string) => {
    if (tabId === 'home') {
      return location.pathname === '/';
    }
    if (tabId === 'profile') {
      return location.pathname.startsWith('/profile');
    }
    return location.pathname.startsWith(`/${tabId}`);
  };

  const tabsLeft = [
    { id: 'home', label: 'Home', icon: Home, path: `/` },
    { id: 'library', label: 'Library', icon: BookOpen, path: `/library` },
    { id: 'discover', label: 'Discover', icon: Compass, path: `/discover` },
  ];
  
  const tabsRight = [
    { id: 'feed', label: 'Social', icon: UsersThree, path: `/feed` },
    { id: 'earn', label: 'Earn', icon: DollarSign, path: `/earn` },
    { id: 'profile', label: 'Profile', icon: UserRound, path: `/profile` },
  ];

  const inkColor = "text-emerald-700";
  const bgInkColor = "sm:bg-emerald-700";

  return (
    <div className="fixed bottom-0 inset-x-0 z-[45] bg-transparent pointer-events-none">

      <div className="bg-white border-t border-black/10 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pointer-events-auto dark:bg-neutral-900 dark:border-white/20 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <nav className="max-w-5xl mx-auto flex items-center justify-between sm:justify-center sm:gap-4 px-2 sm:px-6 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pt-3 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {tabsLeft.map((tab) => {
            const active = isActive(tab.id);
            return (
              <Link
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                to={tab.path}
                onClick={() => window.dispatchEvent(new Event('close-all-modals'))}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all flex-1 sm:flex-none",
                  active
                    ? `${inkColor} sm:bg-emerald-50 sm:text-emerald-800 dark:sm:bg-emerald-950 dark:sm:text-emerald-300 dark:text-emerald-400`
                    : "text-black/50 hover:text-black/90 hover:bg-black/5 dark:text-white/50 dark:hover:text-white/90 dark:hover:bg-white/5"
                )}
              >
                <tab.icon className={cn("w-5 h-5 sm:w-5 sm:h-5", active ? "text-emerald-700 dark:text-emerald-400" : "")} />
                <span className={cn(active ? "font-bold" : "font-medium", "sm:inline")}>{tab.label}</span>
              </Link>
            )
          })}
          
          <button 
             onClick={() => {
                let currentCategory = null;
                if (location.pathname.startsWith('/zone/')) {
                   currentCategory = location.pathname.split('/zone/')[1];
                }
                window.dispatchEvent(new CustomEvent('create-new-item', { detail: { category: currentCategory } }));
             }}
             className="relative flex flex-col sm:flex-row items-center justify-center -mt-6 sm:mt-0 px-2 sm:px-4 rounded-full transition-transform active:scale-95 group"
             title="Create New..."
          >
             <div className="bg-emerald-600 text-white shadow-lg rounded-full w-14 h-14 sm:w-12 sm:h-12 border-4 border-white dark:border-[#1a1a1a] flex items-center justify-center group-hover:scale-105 transition-transform">
               <DilectiNavIcon className="w-6 h-6 sm:w-6 sm:h-6" />
             </div>
             <span className="sr-only sm:not-sr-only sm:ml-2 sm:font-bold text-emerald-700 hidden sm:inline-block group-hover:text-emerald-900 transition-colors dark:text-emerald-300">Add</span>
          </button>


          {tabsRight.map((tab) => {
            const active = isActive(tab.id);
            return (
              <Link
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                to={tab.path!}
                onClick={() => window.dispatchEvent(new Event('close-all-modals'))}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all flex-1 sm:flex-none",
                  active
                    ? `${inkColor} sm:bg-emerald-50 sm:text-emerald-800 dark:sm:bg-emerald-950 dark:sm:text-emerald-300 dark:text-emerald-400`
                    : "text-black/50 hover:text-black/90 hover:bg-black/5 dark:text-white/50 dark:hover:text-white/90 dark:hover:bg-white/5"
                )}
              >
                <tab.icon className={cn("w-5 h-5 sm:w-5 sm:h-5", active ? "text-emerald-700 dark:text-emerald-400" : "")} />
                <span className={cn(active ? "font-bold" : "font-medium", "sm:inline")}>{tab.label}</span>
              </Link>
            )
          })}
      </nav>
      </div>
    </div>
  );
}
