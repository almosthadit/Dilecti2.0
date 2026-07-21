import React, { useState, useMemo } from 'react';
import { useUserItems } from '../hooks';
import { Search, Trash2, Edit2, Check, X } from 'lucide-react';
import { UserItem, Category } from '../types';
import Fuse from 'fuse.js';

export default function LibraryManagementMode({ initialCategory = '' }: { initialCategory?: string }) {
  const { userItems, saveItem, removeItem, saveMultipleItems } = useUserItems();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' }>({ key: 'dateAdded', direction: 'desc' });
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Bulk Edit States
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkRating, setBulkRating] = useState<number | ''>('');
  const [bulkReaction, setBulkReaction] = useState<string>('');
  
  // Inline Edit State
  const [activeEdit, setActiveEdit] = useState<{ id: string, field: string } | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const filteredItems = useMemo(() => {
    if (!userItems) return [];
    
    let result = [...userItems];
    if (categoryFilter) result = result.filter((i: any) => i.category === categoryFilter);

    if (searchTerm.trim()) {
      const fuse = new Fuse(result, {
        keys: ['title', 'category'],
        threshold: 0.2,
        ignoreLocation: false,
      });
      result = fuse.search(searchTerm).map(r => r.item);
    }
    
    return result.sort((a: any, b: any) => {
      if (sortConfig.key === 'title') return sortConfig.direction === 'asc' ? (a.title||'').localeCompare(b.title||'') : (b.title||'').localeCompare(a.title||'');
      if (sortConfig.key === 'category') return sortConfig.direction === 'asc' ? (a.category||'').localeCompare(b.category||'') : (b.category||'').localeCompare(a.category||'');
      if (sortConfig.key === 'rating') return sortConfig.direction === 'asc' ? (a.rating||0) - (b.rating||0) : (b.rating||0) - (a.rating||0);
      if (sortConfig.key === 'dateAdded') return sortConfig.direction === 'asc' ? (a.dateAdded||0) - (b.dateAdded||0) : (b.dateAdded||0) - (a.dateAdded||0);
      return 0;
    });
  }, [userItems, searchTerm, categoryFilter, sortConfig]);

  if (!userItems) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  
  const toggleAll = () => {
    if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map((i: any) => i.id)));
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;
    for (const id of Array.from(selectedIds)) {
      await removeItem(id);
    }
    setSelectedIds(new Set());
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    
    const itemsToUpdate = userItems.filter((i: any) => selectedIds.has(i.id)).map((i: any) => {
      const updated = { ...i };
      if (bulkCategory) updated.category = bulkCategory as Category;
      if (bulkRating !== '') updated.rating = Number(bulkRating);
      if (bulkReaction !== '') updated.reaction = bulkReaction;
      return updated;
    });

    await saveMultipleItems(itemsToUpdate);
    setBulkCategory('');
    setBulkRating('');
    setBulkReaction('');
    setSelectedIds(new Set());
    alert(`Updated ${itemsToUpdate.length} items`);
  };

  const handleInlineSaveTitle = async (item: any) => {
    if (!editingTitle.trim() || editingTitle === item.title) {
      setActiveEdit(null);
      return;
    }
    await saveItem({ ...item, title: editingTitle.trim() });
    setActiveEdit(null);
  };

  const handleDirectCategoryChange = async (item: any, newCategory: string) => {
    await saveItem({ ...item, category: newCategory });
    setActiveEdit(null);
  };

  const handleDirectReactionChange = async (item: any, newReaction: string) => {
    await saveItem({ ...item, reaction: newReaction });
  };

  const handleDirectRatingChange = async (item: any, newRating: string) => {
    await saveItem({ ...item, rating: newRating === '' ? 0 : Number(newRating) });
  };

  const categoriesDef = [
    { name: "Food", id: "food" },
    { name: "TV & Movies", id: "movie" },
    { name: "Music", id: "music" },
    { name: "Products", id: "product" },
    { name: "Places", id: "place" },
    { name: "Books", id: "book" },
    { name: "Events", id: "event" },
    { name: "Games/Sports", id: "game" },
    { name: "Podcasts", id: "podcast" },
    { name: "Creators", id: "creator" },
    { name: "Custom", id: "custom" },
  ];

  const getReactionIcon = (reaction: string) => {
    if (reaction === 'love' || reaction === 'heart') return '❤️';
    if (reaction === 'like' || reaction === 'thumbs-up') return '👍';
    if (reaction === 'dislike' || reaction === 'thumbs-down') return '👎';
    if (reaction === 'hate' || reaction === 'skull') return '💀';
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl sm:rounded-[2rem] border border-black/5 dark:border-white/10 p-3 sm:p-6 shadow-sm mb-12 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-1">Library Management Mode</h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Quickly edit, categorize, or delete items in bulk.</p>
        </div>
        <div className="relative w-full md:w-64">
           <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
           <input 
             type="text" 
             placeholder="Search items..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm outline-none border border-transparent focus:border-emerald-500"
           />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-[70px] sm:top-[120px] z-40 bg-emerald-50/95 dark:bg-emerald-900/95 backdrop-blur-xl border border-emerald-200 dark:border-emerald-800 p-3 sm:p-4 rounded-xl flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6 shadow-xl shadow-emerald-900/5">
           <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200">
             {selectedIds.size} selected
           </span>
           <div className="h-4 w-px bg-emerald-200 dark:bg-emerald-700 hidden sm:block"></div>
           
           <select 
             value={bulkCategory} 
             onChange={e => setBulkCategory(e.target.value)}
             className="bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs sm:text-sm outline-none text-neutral-800 dark:text-neutral-200"
           >
             <option value="">Category...</option>
             {categoriesDef.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>

           <select 
             value={bulkReaction} 
             onChange={e => setBulkReaction(e.target.value)}
             className="bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs sm:text-sm outline-none text-neutral-800 dark:text-neutral-200"
           >
             <option value="">Reaction...</option>
             <option value="love">❤️ Heart</option>
             <option value="like">👍 Thumbs Up</option>
             <option value="dislike">👎 Thumbs Down</option>
             <option value="hate">💀 Skull</option>
           </select>

           <input 
             type="number" 
             step="0.1" min="0" max="10"
             placeholder="Rating..."
             value={bulkRating} 
             onChange={e => setBulkRating(e.target.value ? Number(e.target.value) : '')}
             className="bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs sm:text-sm outline-none text-neutral-800 dark:text-neutral-200 w-24"
           />

           <button 
             onClick={handleBulkUpdate}
             disabled={!bulkCategory && bulkRating === '' && bulkReaction === ''}
             className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
           >
             Apply
           </button>
           
           <button 
             onClick={handleBulkDelete}
             className="ml-auto px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-1 sm:gap-2"
           >
             <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Delete Selected</span>
           </button>
        </div>
      )}

      <div className="overflow-x-auto border border-black/5 dark:border-white/10 rounded-xl">
        <table className="w-full min-w-[700px] text-left text-[11px] sm:text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-b border-black/5 dark:border-white/10">
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
              <th className="p-2 sm:p-3 font-semibold w-[15%] sm:w-auto cursor-pointer hover:text-black dark:hover:text-white " onClick={() => setSortConfig({ key: 'dateAdded', direction: sortConfig.key === 'dateAdded' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}>Date Added {sortConfig.key === 'dateAdded' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th className="p-2 sm:p-3 font-semibold ">Visibility</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {filteredItems.map((item: any) => (
              <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                <td className="p-2 sm:p-3 text-center align-top pt-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </td>
                <td className="p-2 sm:p-3 font-medium text-neutral-900 dark:text-white align-top">
                   <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                     <div 
                       className="w-6 h-8 sm:w-8 sm:h-10 bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden flex-shrink-0 cursor-pointer"
                       onClick={() => window.dispatchEvent(new CustomEvent('open-item', { detail: item }))}
                     >
                       {item.coverUrl ? <img src={item.coverUrl} className="w-full h-full object-cover" /> : null}
                     </div>
                     {activeEdit?.id === item.id && activeEdit?.field === 'title' ? (
                       <div className="flex items-center gap-1 sm:gap-2 w-full">
                         <input 
                           type="text" 
                           autoFocus
                           value={editingTitle}
                           onChange={e => setEditingTitle(e.target.value)}
                           onKeyDown={e => {
                             if (e.key === 'Enter') handleInlineSaveTitle(item);
                             if (e.key === 'Escape') setActiveEdit(null);
                           }}
                           className="w-full min-w-[80px] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 rounded px-1 sm:px-2 py-1 text-[11px] sm:text-sm outline-none focus:border-emerald-500"
                         />
                         <button onClick={() => handleInlineSaveTitle(item)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded dark:text-emerald-400 shrink-0"><Check className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                         <button onClick={() => setActiveEdit(null)} className="p-1 text-neutral-400 hover:bg-neutral-100 rounded dark:hover:bg-neutral-800 shrink-0"><X className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                       </div>
                     ) : (
                       <div className="flex items-start sm:items-center gap-1 sm:gap-2 group flex-wrap">
                         <span 
                           className="cursor-pointer hover:underline whitespace-normal break-words leading-tight flex-1 min-w-0"
                           onClick={() => window.dispatchEvent(new CustomEvent('open-item', { detail: item }))}
                         >
                           {item.title}
                         </span>
                         {userItems.filter((i: any) => i.title && i.title.toLowerCase() === (item.title || '').toLowerCase()).length > 1 && (
                           <span className="text-[9px] bg-amber-500/90 text-white px-1 sm:px-1.5 py-0.5 rounded-sm font-bold tracking-wider uppercase shrink-0">Dup</span>
                         )}
                         <button 
                           onClick={() => { setActiveEdit({ id: item.id, field: 'title' }); setEditingTitle(item.title); }}
                           className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-emerald-600 transition-all rounded shrink-0"
                         >
                           <Edit2 className="w-3 h-3" />
                         </button>
                       </div>
                     )}
                   </div>
                </td>
                <td className="p-2 sm:p-3 text-neutral-500 dark:text-neutral-400 capitalize align-top pt-4">
                  {activeEdit?.id === item.id && activeEdit?.field === 'category' ? (
                    <select
                      autoFocus
                      className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 rounded p-1 text-[11px] sm:text-sm w-full outline-none"
                      defaultValue={item.category || ''}
                      onChange={e => handleDirectCategoryChange(item, e.target.value)}
                      onBlur={() => setActiveEdit(null)}
                    >
                      <option value="">Category...</option>
                      {categoriesDef.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <div 
                      className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 -m-1 rounded whitespace-normal break-words leading-tight"
                      onClick={() => setActiveEdit({ id: item.id, field: 'category' })}
                    >
                      {item.category || <span className="opacity-50">-</span>}
                    </div>
                  )}
                </td>
                <td className="p-2 sm:p-3 align-top pt-4">
                  {activeEdit?.id === item.id && activeEdit?.field === 'rating' ? (
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-[220px] max-w-full relative z-10 bg-white dark:bg-neutral-900 border border-emerald-500 shadow-xl rounded-xl p-2 animate-in fade-in zoom-in-95 duration-200 -ml-2 -mt-2">
                      <select 
                        className="bg-black/5 dark:bg-white/5 border-none rounded-lg p-2 text-xs sm:text-sm outline-none cursor-pointer flex-shrink-0"
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
                        className="bg-black/5 dark:bg-white/5 border-none rounded-lg p-2 text-xs sm:text-sm w-16 outline-none text-center font-bold"
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
                      }} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shrink-0 flex-1 flex justify-center"><Check className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                      <button onClick={() => setActiveEdit(null)} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 shrink-0"><X className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                    </div>
                  ) : (
                    <div 
                      className="flex items-start gap-1 sm:gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 -m-1 rounded flex-wrap"
                      onClick={() => setActiveEdit({ id: item.id, field: 'rating' })}
                    >
                      {item.reaction && (
                        <span className="text-sm sm:text-lg leading-none" title={item.reaction}>{getReactionIcon(item.reaction)}</span>
                      )}
                      {item.rating > 0 ? (
                        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs">
                          {item.rating}
                        </div>
                      ) : (
                        !item.reaction && <span className="text-neutral-400">-</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-2 sm:p-3 text-neutral-500 dark:text-neutral-400  align-top pt-4">
                  {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : '-'}
                </td>
                <td className="p-2 sm:p-3 text-neutral-500 dark:text-neutral-400 capitalize  align-top pt-4">
                  {item.visibility || 'public'}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-500">No items found matching your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

