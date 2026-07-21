import React, { useState } from 'react';
import { SmartSearchBar } from './SmartSearchBar';
import { useHybridSearch } from '../hooks/useHybridSearch';

interface SearchControllerProps {
  userItems: any[];
  onLocalSelect: (item: any) => void;
  onGlobalSelect: (item: any) => void;
  placeholder?: string;
  initialQuery?: string;
}

export function SearchController({ userItems, onLocalSelect, onGlobalSelect, placeholder = "Search...", initialQuery = "" }: SearchControllerProps) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const { localSearchResults, globalSearchResults, isSearching } = useHybridSearch(userItems || [], searchTerm);

  React.useEffect(() => {
    const handleSetSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.query) {
        setSearchTerm(customEvent.detail.query);
      }
    };
    window.addEventListener('set-library-search', handleSetSearch);
    return () => window.removeEventListener('set-library-search', handleSetSearch);
  }, []);

  return (
    <SmartSearchBar 
      placeholder={placeholder}
      value={searchTerm}
      onChange={(val) => setSearchTerm(val)}
      localResults={localSearchResults}
      onLocalResultSelect={(item) => {
        onLocalSelect(item);
        setSearchTerm('');
      }}
      globalResults={globalSearchResults}
      onGlobalResultSelect={(item) => {
        onGlobalSelect(item);
        setSearchTerm('');
      }}
    />
  );
}
