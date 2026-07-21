import { ImageWithFallback } from "./ImageWithFallback";
import React, { useState, useEffect, useRef } from "react";
import { X, Search, Camera, Heart, ThumbsUp, ThumbsDown, Skull } from "lucide-react";
import { UserBook, UserItem } from "../types";
import AutocompleteInput from "./AutocompleteInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  book: UserBook | null;
  onSave: (book: UserBook) => void;
  onDelete?: (book: UserBook) => void;
}

export function ReviewEditor({ isOpen, onClose, book, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<UserItem["status"]>("completed");
  const [rating, setRating] = useState(0);
  const [criticScore, setCriticScore] = useState(0.0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [review, setReview] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [collections, setCollections] = useState<string[]>([]);
  
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (book) {
      setTitle(book.title || "");
      setQuery(book.title || "");
      setAuthor(book.subtitle || book.author || "");
      setCoverUrl(book.coverUrl || "");
      setStatus(book.status || "read");
      setRating(book.rating || 0);
      setCriticScore(book.criticScore || 0.0);
      setReaction(book.reaction || null);
      setReview(book.review || "");
      setFavoriteQuote(book.favoriteQuote || "");
      setCollections(book.collections || []);
    }
  }, [book]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const delay = setTimeout(async () => {
      if (query === title) return; // don't search if it match selected
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`);
        const json = await r.json().catch(() => ({}));
        setSuggestions(json.docs || []);
        setShowSuggestions(true);
      } catch (e) {
        console.error(e);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [query]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!book) return;
    onSave({
      ...book,
      title: title || query,
      author: author,
      subtitle: author,
      category: 'book',
      coverUrl,
      status,
      rating,
      criticScore,
      reaction,
      review,
      favoriteQuote,
      collections
    } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative flex flex-col md:flex-row animate-in zoom-in-95 duration-200 dark:bg-[#1a1a1a]">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors dark:bg-white/5">
          <X className="w-5 h-5 text-black/60 dark:text-white/60" />
        </button>

        {/* Left Side: Cover */}
        <div className="w-full md:w-1/3 bg-neutral-100 p-8 flex flex-col items-center justify-center border-r border-black/5 dark:bg-neutral-800 dark:border-white/5">
          <div className="w-48 h-72 bg-white rounded-lg shadow-md overflow-hidden flex items-center justify-center p-4 relative group dark:bg-[#1a1a1a]">
            {coverUrl ? (
              <ImageWithFallback src={coverUrl} alt="Cover" className="w-full h-full object-cover absolute inset-0" />
            ) : (
              <span className="text-black/30 font-serif italic text-center leading-snug">{title || query || 'No Title'}</span>
            )}
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3 p-8 overflow-y-auto">
          <div className="flex gap-4 mb-6" style={{ position: 'relative', zIndex: 50 }} ref={searchRef}>
            <div className="flex-1 relative">
              <div className="bg-black/5 rounded-xl px-4 py-3 flex items-center gap-3 dark:bg-white/5">
                <Search className="w-5 h-5 text-black/40" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => { if(suggestions.length) setShowSuggestions(true) }}
                  placeholder="Book title..."
                  className="bg-transparent border-none outline-none font-serif text-xl w-full"
                />
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-black/5 overflow-hidden dark:bg-[#1a1a1a] dark:border-white/5">
                  {suggestions.map((s: any, i: number) => {
                    const cUrl = s.cover_i ? `https://covers.openlibrary.org/b/id/${s.cover_i}-M.jpg` : '';
                    return (
                      <button
                        key={i}
                        className="w-full p-3 flex gap-3 text-left hover:bg-black/5 transition-colors border-b border-black/5 last:border-0 dark:border-white/5"
                        onClick={() => {
                          setTitle(s.title);
                          setQuery(s.title);
                          setAuthor(s.author_name?.[0] || "");
                          if(cUrl) setCoverUrl(cUrl);
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="w-10 h-14 bg-black/5 shrink-0 rounded overflow-hidden flex items-center justify-center dark:bg-white/5">
                          {cUrl ? <ImageWithFallback src={cUrl} className="w-full h-full object-cover" /> : <span className="text-xs text-black/30">N/A</span>}
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                          <span className="font-bold text-sm truncate">{s.title}</span>
                          <span className="text-xs text-black/50 truncate dark:text-white/50">{s.author_name?.[0]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <button className="bg-black/5 hover:bg-black/10 px-4 rounded-xl flex items-center gap-2 font-medium text-sm transition-colors text-black/70 dark:bg-white/5 dark:text-white/70">
              <Camera className="w-4 h-4" /> Scan Cover
            </button>
          </div>

          <div className="flex gap-4 mb-8">
            <input 
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Author"
              className="flex-1 bg-black/5 rounded-xl px-4 py-3 border-none outline-none font-medium text-neutral-600 dark:text-neutral-400 dark:bg-white/5"
            />
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="bg-black/5 rounded-full px-4 py-2 border-none outline-none font-medium text-sm text-neutral-600 appearance-none min-w-[140px] dark:text-neutral-400 dark:bg-white/5"
            >
              <option value="read">Completed</option>
              <option value="currently-reading">Currently Reading</option>
              <option value="up-next">Up Next</option>
            </select>
          </div>

          <div className="mb-8" style={{ marginTop: '-10px' }}>
             <AutocompleteInput 
                label="Tags" 
                placeholder="+ Add tag (press Enter)"
                value={collections}
                onChange={setCollections}
                fetchSuggestions={async (q) => { 
                    try {
                        const res = await fetch("/api/search-tags", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ query: q })
                        });
                        return await res.json();
                    } catch (e) {
                        return [{id: q, label: q}];
                    }
                }}
             />
          </div>

          <div className="mb-8">
            <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-3">Quick Reaction</label>
            <div className="flex gap-3">
              {[
                { id: 'heart', icon: Heart },
                { id: 'thumbs-up', icon: ThumbsUp },
                { id: 'thumbs-down', icon: ThumbsDown },
                { id: 'skull', icon: Skull }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setReaction(reaction === r.id ? null : r.id)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors ${reaction === r.id ? 'bg-black text-white' : 'bg-black/5 text-black/60 hover:bg-black/10'} dark:text-white/60`}
                >
                  <r.icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-end justify-between mb-2">
              <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider">Rank Score</label>
            </div>
            <div className="flex items-center gap-4">
               <div 
                   className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-xl font-bold font-serif shrink-0 shadow-lg dark:bg-white cursor-pointer hover:bg-neutral-800 transition-colors group"
                   onClick={() => { setRating(0); setCriticScore(0); }}
                   title="Click to reset rating"
                 >
                   <span className="group-hover:hidden">{criticScore.toFixed(1)}</span>
                   <span className="hidden group-hover:block text-neutral-400">
                     <X className="w-6 h-6" />
                   </span>
                 </div>
               <div className="flex-1">
                 <input 
                   type="range"
                   min="0" max="10" step="0.1"
                   value={criticScore}
                   onChange={e => {
                     setCriticScore(parseFloat(e.target.value));
                     setRating(parseFloat(e.target.value));
                   }}
                   className="w-full accent-black"
                 />
                 <div className="flex justify-between text-xs text-black/40 font-bold mt-2 uppercase tracking-wide">
                   <span>0.0</span>
                   <span>Masterpiece 10.0</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="mb-8">
             <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-2">Favorite Quote</label>
             <textarea
               value={favoriteQuote}
               onChange={e => setFavoriteQuote(e.target.value)}
               placeholder="&quot;The only way to make sense out of change is to plunge into it...&quot;"
               className="w-full bg-[#FCFBE7] text-[#9A8F53] rounded-xl p-4 resize-none h-24 outline-none placeholder:text-[#9A8F53]/50 font-serif italic"
             />
          </div>

          <div className="mb-8">
             <label className="block text-xs font-semibold text-black/40 uppercase tracking-wider mb-2">Your Review</label>
             <textarea
               value={review}
               onChange={e => setReview(e.target.value)}
               placeholder="What did you think of the book?"
               className="w-full bg-black/5 rounded-xl p-4 resize-none h-32 outline-none placeholder:text-black/30 font-serif italic dark:bg-white/5"
             />
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
             {book?.id && onDelete ? (
               <button onClick={() => onDelete(book)} className="text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                 Delete
               </button>
             ) : <div />}
             
             <div className="flex gap-3">
               <button onClick={onClose} className="px-6 py-3 font-bold text-black/60 hover:bg-black/5 rounded-xl transition-colors dark:text-white/60">
                 Cancel
               </button>
               <button onClick={handleSave} className="px-6 py-3 font-bold text-white bg-black hover:bg-black/80 rounded-xl transition-colors shadow-lg dark:bg-white">
                 Save
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
