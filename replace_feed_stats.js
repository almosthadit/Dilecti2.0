const fs = require('fs');
let code = fs.readFileSync('src/components/FeedTab.tsx', 'utf-8');

// The original stats header
const originalHeaderRegex = /<div className="flex items-center justify-between mt-2 pb-2">.*?<div className="w-px h-8 bg-neutral-200 dark:bg-white\/10"><\/div>.*?<\/div>\s*<div className="sticky top-0 z-40 bg-neutral-50\/95/s;

// We will remove it from above and add it below the search bar.
code = code.replace(originalHeaderRegex, '<div className="sticky top-0 z-40 bg-neutral-50/95');

const searchBarDiv = `<div className="w-full mb-4 sm:mb-6">
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
               </div>`;

const newStats = `<div className="bg-white rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 shadow-sm border border-black/5 dark:bg-[#1a1a1a] dark:border-white/10 mb-6 flex flex-col gap-3 sm:gap-6">
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
                     onClick={() => { setFindFriendsTab('matches' as any); setShowFindFriends(true); }}
                     className="flex flex-col items-center justify-center space-y-1 sm:space-y-2 cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl py-2"
                   >
                     <Crosshair className="w-4 h-4 sm:w-6 sm:h-6 text-neutral-400 dark:text-neutral-500" />
                     <span className="font-bold text-lg sm:text-3xl text-neutral-900 dark:text-white">{tasteTwinsCount}</span>
                     <div className="flex items-center gap-1 text-[10px] sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                       Taste Twins <ChevronRight className="w-3 h-3 hidden sm:block" />
                     </div>
                   </div>
                 </div>
               </div>`;

code = code.replace(searchBarDiv, searchBarDiv + '\n</div>\n' + newStats + '\n<div className="sticky top-[120px] z-30 pt-2 bg-neutral-50 dark:bg-[#09090b]">');
fs.writeFileSync('src/components/FeedTab.tsx', code);
