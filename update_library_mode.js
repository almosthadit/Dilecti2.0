const fs = require('fs');
let code = fs.readFileSync('src/components/LibraryManagementMode.tsx', 'utf-8');

// 1. Add sort state
code = code.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  "const [searchTerm, setSearchTerm] = useState('');\n  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' }>({ key: 'dateAdded', direction: 'desc' });\n  const [categoryFilter, setCategoryFilter] = useState<string>('');"
);

// 2. Add categoryFilter prop if possible or just use the local state if it's not passed
code = code.replace(
  "export default function LibraryManagementMode() {",
  "export default function LibraryManagementMode({ initialCategory = '' }: { initialCategory?: string }) {\n  const [localCat, setLocalCat] = useState(initialCategory);"
);
code = code.replace("const [categoryFilter, setCategoryFilter] = useState<string>('');", "const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);");

// 3. Update filteredItems with Sort and DateAdded
code = code.replace(
  "return fuse.search(searchTerm).map(r => r.item);",
  "let result = fuse.search(searchTerm).map(r => r.item);\n    if (categoryFilter) result = result.filter((i: any) => i.category === categoryFilter);\n    return result.sort((a: any, b: any) => {\n      if (sortConfig.key === 'title') return sortConfig.direction === 'asc' ? (a.title||'').localeCompare(b.title||'') : (b.title||'').localeCompare(a.title||'');\n      if (sortConfig.key === 'category') return sortConfig.direction === 'asc' ? (a.category||'').localeCompare(b.category||'') : (b.category||'').localeCompare(a.category||'');\n      if (sortConfig.key === 'rating') return sortConfig.direction === 'asc' ? (a.rating||0) - (b.rating||0) : (b.rating||0) - (a.rating||0);\n      if (sortConfig.key === 'dateAdded') return sortConfig.direction === 'asc' ? (a.dateAdded||0) - (b.dateAdded||0) : (b.dateAdded||0) - (a.dateAdded||0);\n      return 0;\n    });"
);
code = code.replace(
  "if (!searchTerm.trim()) return userItems.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));",
  "if (!searchTerm.trim()) {\n      let result = [...userItems];\n      if (categoryFilter) result = result.filter((i: any) => i.category === categoryFilter);\n      return result.sort((a: any, b: any) => {\n        if (sortConfig.key === 'title') return sortConfig.direction === 'asc' ? (a.title||'').localeCompare(b.title||'') : (b.title||'').localeCompare(a.title||'');\n        if (sortConfig.key === 'category') return sortConfig.direction === 'asc' ? (a.category||'').localeCompare(b.category||'') : (b.category||'').localeCompare(a.category||'');\n        if (sortConfig.key === 'rating') return sortConfig.direction === 'asc' ? (a.rating||0) - (b.rating||0) : (b.rating||0) - (a.rating||0);\n        if (sortConfig.key === 'dateAdded') return sortConfig.direction === 'asc' ? (a.dateAdded||0) - (b.dateAdded||0) : (b.dateAdded||0) - (a.dateAdded||0);\n        return 0;\n      });\n    }"
);

// 4. Update the bulk update UI to exact rating input
code = code.replace(
  /<select\s+value=\{bulkRating\}.*?<\/select>/s,
  `<input 
             type="number" 
             step="0.1" min="0" max="10"
             placeholder="Rating 0.0-10.0"
             value={bulkRating} 
             onChange={e => setBulkRating(e.target.value ? Number(e.target.value) : '')}
             className="bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs sm:text-sm outline-none text-neutral-800 dark:text-neutral-200 w-32"
           />`
);

// 5. Update headers to be sortable and include Date Added
let thead = `<thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-b border-black/5 dark:border-white/10">
            <tr>
              <th className="p-2 sm:p-3 w-8 sm:w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                  onChange={toggleAll}
                  className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th className="p-2 sm:p-3 font-semibold w-5/12 sm:w-auto cursor-pointer hover:text-black dark:hover:text-white" onClick={() => setSortConfig({ key: 'title', direction: sortConfig.key === 'title' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}>Title {sortConfig.key === 'title' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="p-2 sm:p-3 font-semibold w-[20%] sm:w-auto cursor-pointer hover:text-black dark:hover:text-white" onClick={() => setSortConfig({ key: 'category', direction: sortConfig.key === 'category' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}>Category {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="p-2 sm:p-3 font-semibold w-[15%] sm:w-auto cursor-pointer hover:text-black dark:hover:text-white" onClick={() => setSortConfig({ key: 'rating', direction: sortConfig.key === 'rating' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}>Rating {sortConfig.key === 'rating' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="p-2 sm:p-3 font-semibold w-[15%] sm:w-auto cursor-pointer hover:text-black dark:hover:text-white hidden md:table-cell" onClick={() => setSortConfig({ key: 'dateAdded', direction: sortConfig.key === 'dateAdded' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}>Date Added {sortConfig.key === 'dateAdded' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="p-2 sm:p-3 font-semibold hidden lg:table-cell">Visibility</th>
            </tr>
          </thead>`;
code = code.replace(/<thead.*?<\/thead>/s, thead);

// 6. Update table body to include dateAdded
code = code.replace(
  /<td className="p-2 sm:p-3 text-neutral-500 dark:text-neutral-400 capitalize hidden sm:table-cell align-top pt-4">/g,
  `<td className="p-2 sm:p-3 text-neutral-500 dark:text-neutral-400 hidden md:table-cell align-top pt-4">
                  {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : '-'}
                </td>
                <td className="p-2 sm:p-3 text-neutral-500 dark:text-neutral-400 capitalize hidden lg:table-cell align-top pt-4">`
);
code = code.replace(/colSpan=\{5\}/g, "colSpan={6}");

// 7. Update inline rating editor
let inlineRating = `<div className="flex items-center gap-2 w-full relative z-10 bg-white dark:bg-neutral-900 border border-emerald-500 shadow-lg rounded-xl p-2 animate-in fade-in zoom-in-95 duration-200">
                      <select 
                        className="bg-black/5 dark:bg-white/5 border-none rounded-lg p-2 text-sm outline-none cursor-pointer flex-shrink-0"
                        defaultValue={item.reaction || ''}
                        onChange={e => handleDirectReactionChange(item, e.target.value)}
                      >
                        <option value="">No reaction</option>
                        <option value="love">❤️ Love</option>
                        <option value="like">👍 Like</option>
                        <option value="dislike">👎 Dislike</option>
                        <option value="hate">💀 Hate</option>
                      </select>
                      <input 
                        type="number"
                        step="0.1" min="0" max="10"
                        placeholder="0.0"
                        className="bg-black/5 dark:bg-white/5 border-none rounded-lg p-2 text-sm w-20 outline-none"
                        defaultValue={item.rating || ''}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleDirectRatingChange(item, (e.target as HTMLInputElement).value);
                            setActiveEdit(null);
                          }
                          if (e.key === 'Escape') setActiveEdit(null);
                        }}
                      />
                      <button onClick={(e) => {
                         const inp = e.currentTarget.previousElementSibling as HTMLInputElement;
                         handleDirectRatingChange(item, inp.value);
                         setActiveEdit(null);
                      }} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shrink-0"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setActiveEdit(null)} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 shrink-0"><X className="w-4 h-4" /></button>
                    </div>`;
code = code.replace(/<div className="flex flex-col gap-1 w-full relative z-10".*?<\/div>/s, inlineRating);

fs.writeFileSync('src/components/LibraryManagementMode.tsx', code);
