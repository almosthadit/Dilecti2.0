import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';

interface AutocompleteInputProps {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (value: string[]) => void;
  fetchSuggestions: (query: string) => Promise<{ id: string; label: string }[]>;
}

export default function AutocompleteInput({ label, placeholder, value, onChange, fetchSuggestions }: AutocompleteInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    
    // Debounce
    const timer = setTimeout(async () => {
      setIsFetching(true);
      try {
        const results = await fetchSuggestions(query.trim());
        setSuggestions(results);
        setIsOpen(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsFetching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  const currentValues = value || [];

  const handleSelect = (itemLabel: string) => {
    if (!currentValues.includes(itemLabel)) {
      onChange([...currentValues, itemLabel]);
    }
    setQuery('');
    setIsOpen(false);
  };

  const removeTag = (tag: string) => {
    onChange(currentValues.filter(v => v !== tag));
  };

  return (
    <div className="w-full relative" ref={wrapperRef}>
      <label className="block text-xs font-semibold text-black/40 uppercase mb-2">{label}</label>
      
      <div className="bg-black/5 rounded-xl px-2 py-2 min-h-[48px] flex flex-wrap gap-2 items-center transition-colors focus-within:bg-black/10 relative z-20 dark:bg-white/5">
        {currentValues.map(tag => (
          <span key={tag} className="bg-white px-3 py-1 text-sm rounded-full flex items-center gap-1 shadow-sm font-medium border border-black/5 dark:bg-[#1a1a1a] dark:border-white/5">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-black/50 transition-colors p-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        <div className="relative flex-1 min-w-[120px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setIsOpen(true) }}
            placeholder={currentValues.length === 0 ? placeholder : "Add more..."}
            className="w-full bg-transparent border-none outline-none font-sans text-sm py-1.5 px-2 placeholder:text-black/30"
          />
        </div>
        
        {isFetching && <Loader2 className="w-4 h-4 text-black/40 animate-spin absolute right-4" />}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/5 rounded-xl shadow-xl overflow-hidden z-30 max-h-48 overflow-y-auto dark:bg-[#1a1a1a] dark:border-white/5">
          {suggestions.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.label)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 transition-colors border-b border-black/5 last:border-0 truncate dark:border-white/5"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
