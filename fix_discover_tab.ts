import fs from 'fs';

let content = fs.readFileSync('src/components/DiscoverTab.tsx', 'utf8');

const target = `             {displayKeys.map((key) => {
                const meta = CATEGORY_META[key];
                if (!meta) return null;
                const items = discoveries[key] || [];
                const isLoading = loadingCats[key];
                return (
                   <DiscoverSection`;

const replacement = `             {displayKeys.map((key) => {
                const meta = CATEGORY_META[key];
                if (!meta) return null;

                const apiCat = categoryToApiCat[key];
                let mixed: any[] = [];
                
                if (sourceFilters.global) {
                   mixed = [...(discoveries[key] || [])];
                }
                
                if (sourceFilters.personal && userItems) {
                   const personal = userItems.filter(i => (i.category === apiCat || (key === 'TV & Movies' && (i.category === 'tv' || i.category === 'movie' || i.category === 'watch')) || (key === 'Games/Sports' && (i.category === 'game' || i.category === 'sports' || i.category === 'games')))).map(i => ({...i, sourceSignal: "Personal", tags: ["📌 Saved"]}));
                   mixed = [...mixed, ...personal];
                }
             
                if (sourceFilters.friends && friendItems) {
                   const friends = friendItems.filter(i => (i.category === apiCat || (key === 'TV & Movies' && (i.category === 'tv' || i.category === 'movie' || i.category === 'watch')) || (key === 'Games/Sports' && (i.category === 'game' || i.category === 'sports' || i.category === 'games')))).map(i => ({...i, sourceSignal: \`Friend: \${i.displayName || 'Someone'}\`, tags: ["👥 Friend's Choice"]}));
                   mixed = [...mixed, ...friends];
                }
                
                // Deduplicate by title
                const seen = new Set();
                const items = mixed.filter(item => {
                   if (!item.title) return false;
                   const titleLower = item.title.toLowerCase();
                   if (seen.has(titleLower)) return false;
                   seen.add(titleLower);
                   return true;
                });

                const isLoading = loadingCats[key];
                return (
                   <DiscoverSection`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/DiscoverTab.tsx', content);
