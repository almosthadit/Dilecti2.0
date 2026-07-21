import React, { useState, useRef, useEffect } from 'react';
import { Search, Users, Sparkles, Library, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './ImageWithFallback';

interface SmartSearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onLibrarySelect?: () => void;
  localResults?: any[];
  globalResults?: any[];
  onGlobalResultSelect?: (item: any) => void;
  onLocalResultSelect?: (item: any) => void;
}

export function SmartSearchBar({ placeholder = "Search anything...", value, onChange, onLibrarySelect, localResults, onLocalResultSelect, globalResults, onGlobalResultSelect }: SmartSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onChange(val);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAskDilecti = () => {
    setIsFocused(false);
    window.dispatchEvent(new CustomEvent('open-ask-for-ideas', { detail: { prompt: localValue } }));
  };

  const handleSearchPeople = () => {
    setIsFocused(false);
    navigate('/feed');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('set-feed-search', { detail: { query: localValue } }));
    }, 100);
  };

  const handleSearchLibrary = () => {
    setIsFocused(false);
    if (onLibrarySelect) {
      onLibrarySelect();
    } else {
      navigate('/library', { state: { query: localValue } });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('set-library-search', { detail: { query: localValue } }));
      }, 100);
    }
  };

  const handleAddGlobal = () => {
    setIsFocused(false);
    window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { initialQuery: localValue } }));
  };

  return (
    <div ref={wrapperRef} className="w-full relative z-50">
      <div className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/10 hover:border-emerald-500/50 rounded-full p-2.5 sm:p-3 pl-5 pr-5 flex items-center gap-3 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-transparent group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-purple-500/10 to-orange-500/10 hidden dark:block opacity-50"></div>
        <Search className="w-5 h-5 text-emerald-500 dark:text-teal-400 shrink-0 relative z-10" />
        <input
          type="text"
          placeholder={placeholder}
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
              setIsFocused(false);
            }
          }}
          className="flex-1 bg-transparent text-[15px] sm:text-base font-medium text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none relative z-10"
        />
      </div>

      {isFocused && localValue.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col">
            {localResults && localResults.length > 0 && (
              <div className="border-b border-neutral-100 dark:border-white/5 py-2">
                <div className="px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">In Your Library</div>
                {localResults.slice(0, 5).map((item, index) => {
                  const isDuplicate = localResults.filter((i: any) => i.title && i.title.toLowerCase() === (item.title || '').toLowerCase()).length > 1;
                  return (
                    <button
                      key={item.id || index}
                      onClick={() => {
                        setIsFocused(false);
                        if (onLocalResultSelect) onLocalResultSelect(item);
                      }}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors text-left w-full relative"
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-100 dark:bg-white/5">
                        <ImageWithFallback src={item.coverUrl} category={item.category} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-semibold text-neutral-900 dark:text-white truncate">{item.title}</div>
                        <div className="text-xs flex items-center gap-2">
                          <span className="text-neutral-500 dark:text-neutral-400 truncate capitalize">{item.category}</span>
                          {isDuplicate && <span className="text-[9px] bg-amber-500/90 text-white px-1.5 py-0.5 rounded-sm font-bold tracking-wider uppercase">Duplicate</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            
            
            {globalResults && globalResults.length > 0 && (
              <div className="border-b border-neutral-100 dark:border-white/5 py-2">
                <div className="px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">Global Database</div>
                {globalResults.slice(0, 5).map((item: any, index: number) => (
                  <button
                    key={item.id || index}
                    onClick={() => {
                      setIsFocused(false);
                      if (onGlobalResultSelect) onGlobalResultSelect(item);
                    }}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors text-left w-full"
                  >
                    <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-100 dark:bg-white/5">
                      <ImageWithFallback src={item.coverUrl} category={item.category} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-semibold text-neutral-900 dark:text-white truncate">{item.title}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate capitalize">{item.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {localResults !== undefined && (
              <button 
                onClick={handleAddGlobal}
                className="flex items-center gap-3 p-4 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors text-left border-b border-neutral-100 dark:border-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">Add "{localValue}"</div>
                  <div className="text-sm text-emerald-600/70 dark:text-emerald-400/70">Search global database to add</div>
                </div>
              </button>
            )}

            {!localResults && (
              <button 
                onClick={handleSearchLibrary}
                className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Library className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-semibold text-neutral-900 dark:text-white truncate">Search library for "{localValue}"</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">Find in your saved items</div>
                </div>
              </button>
            )}

            <button 
              onClick={handleSearchPeople}
              className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors text-left border-t border-neutral-100 dark:border-white/5"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-semibold text-neutral-900 dark:text-white truncate">Search people for "{localValue}"</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">Find friends and creators</div>
              </div>
            </button>
            <button 
              onClick={handleAskDilecti}
              className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors text-left border-t border-neutral-100 dark:border-white/5 group/dilecti"
            >
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0 group-hover/dilecti:bg-purple-100 dark:group-hover/dilecti:bg-purple-500/20 transition-colors">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-semibold text-purple-700 dark:text-purple-300 truncate">Ask Dilecti about "{localValue}"</div>
                <div className="text-sm text-purple-600/70 dark:text-purple-400/70">Get personalized AI recommendations</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
