import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';

export function useHybridSearch(userItems: any[], searchTerm: string) {
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/universal-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchTerm, category: null })
        });
        const data = await res.json();
        setGlobalSearchResults(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const localSearchResults = useMemo(() => {
    if (!searchTerm.trim() || !userItems) return undefined;
    const fuse = new Fuse(userItems, {
      keys: ['title', 'subtitle', 'category'],
      threshold: 0.2,
      ignoreLocation: false,
      distance: 100,
    });
    return fuse.search(searchTerm).map(result => result.item);
  }, [searchTerm, userItems]);

  return { localSearchResults, globalSearchResults, isSearching };
}
