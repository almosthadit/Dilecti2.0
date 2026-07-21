import React, { useState } from 'react';
import { BookOpen, Film, Music as MusicIcon, Utensils, LayoutGrid, Gamepad, Globe, Headphones, Image as ImageIcon } from "lucide-react";
import { cn } from "../lib/utils";


interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  category?: string;
  fallbackIconSize?: number;
}

const getCategoryDetails = (category?: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('book')) return { icon: BookOpen, colors: 'from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-600 dark:text-amber-400' };
  if (cat.includes('movie') || cat.includes('tv') || cat.includes('film') || cat.includes('watch')) return { icon: Film, colors: 'from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-600 dark:text-blue-400' };
  if (cat.includes('music') || cat.includes('song') || cat.includes('album')) return { icon: MusicIcon, colors: 'from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 text-pink-600 dark:text-pink-400' };
  if (cat.includes('podcast')) return { icon: Headphones, colors: 'from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-600 dark:text-purple-400' };
  if (cat.includes('food') || cat.includes('restaurant')) return { icon: Utensils, colors: 'from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-600 dark:text-emerald-400' };
  if (cat.includes('place') || cat.includes('travel') || cat.includes('city') || cat.includes('nature') || cat.includes('museum')) return { icon: Globe, colors: 'from-cyan-100 to-sky-100 dark:from-cyan-900/40 dark:to-sky-900/40 text-cyan-600 dark:text-cyan-400' };
  if (cat.includes('game') || cat.includes('sport')) return { icon: Gamepad, colors: 'from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 text-red-600 dark:text-red-400' };
  return { icon: ImageIcon, colors: 'from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 text-neutral-400 dark:text-neutral-500' };
}

export function ImageWithFallback({ src, category, className, alt, fallbackIconSize = 24, ...props }: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const { icon: Icon, colors } = getCategoryDetails(category);
    return (
      <div className={cn(`flex items-center justify-center bg-gradient-to-br ${colors}`, className)}>
        <Icon size={fallbackIconSize} strokeWidth={1.5} className="opacity-50" />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      className={className} 
      alt={alt || ""} 
      onError={() => setHasError(true)}
      {...props} 
    />
  );
}
