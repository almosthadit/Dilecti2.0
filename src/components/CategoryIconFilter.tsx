import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Film, Music as MusicIcon, Utensils, LayoutGrid, Gamepad, Globe, Headphones, X } from "lucide-react";
import { cn } from "../lib/utils";

interface CategoryIconFilterProps {
  value: string | null;
  onChange: (val: string | null) => void;
  className?: string;
}

const CATS = [
  { id: 'All', icon: LayoutGrid, label: 'All' },
  { id: 'Books', icon: BookOpen, label: 'Books' },
  { id: 'TV & Movies', icon: Film, label: 'Movies/TV' },
  { id: 'Music', icon: MusicIcon, label: 'Music' },
  { id: 'Podcasts', icon: Headphones, label: 'Podcasts' },
  { id: 'Food', icon: Utensils, label: 'Food' },
  { id: 'Places', icon: Globe, label: 'Places' },
  { id: 'Games/Sports', icon: Gamepad, label: 'Games' }
];

export default function CategoryIconFilter({ value, onChange, className }: CategoryIconFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCat = CATS.find(c => c.id === (value === 'Overall' ? 'All' : (value || 'All'))) || CATS[0];
  const ActiveIcon = activeCat.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("fixed bottom-[80px] right-4 sm:right-8 sm:bottom-[32px] z-50 flex flex-col items-end", className)}>
      <div 
        className={cn(
          "absolute bottom-20 right-0 flex flex-col gap-2 items-end transition-all origin-bottom duration-200",
          isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 pointer-events-none"
        )}
      >
        {CATS.map(cat => {
          const Icon = cat.icon;
          const isActive = (value === cat.id || (value === null && cat.id === 'All') || (value === 'Overall' && cat.id === 'All'));
          return (
            <button
              key={cat.id}
              onClick={() => {
                onChange(cat.id === 'All' ? null : cat.id);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all",
                isActive
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-[0_4px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_10px_rgba(255,255,255,0.1)]"
                  : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              <span className="font-medium text-sm">{cat.label}</span>
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
      >
        {isOpen ? <X className="w-6 h-6" /> : <ActiveIcon className="w-6 h-6" />}
      </button>
    </div>
  );
}
