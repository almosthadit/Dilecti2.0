import { useState, useEffect, useRef } from "react";
import { X, Loader2, Sparkles, Plus, Mic } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sanitizeReason } from '../lib/utils';

type Recommendation = {
  title: string;
  author: string;
  reason: string;
};

import { UserBook } from "../types";

export default function AIAssistantModal({ 
  isOpen, 
  onClose,
  onAddBook,
  initialPrompt = "",
  booksContext = []
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onAddBook?: (title: string, author: string) => void;
  initialPrompt?: string;
  booksContext?: UserBook[];
}) {
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'fiona', text?: string, recommendations?: Recommendation[] }[]>([]);
  const [error, setError] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleSpeech = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setPrompt(transcript);
      }
    };
    
    recognition.start();
  };

  useEffect(() => {
    if (!isOpen && isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isOpen]);

  // Only update prompt when a NEW initialPrompt is passed in while opening
  useEffect(() => {
    if (isOpen && initialPrompt) {
      if (initialPrompt !== prompt) {
        setPrompt(initialPrompt);
      }
    }
  }, [isOpen, initialPrompt]);

  // Scroll to bottom when history changes
  useEffect(() => {
    if (endOfMessagesRef.current) {
       endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isGenerating]);

  useEffect(() => {
    // Optional: auto-trigger generation if there's an initial prompt
    if (isOpen && initialPrompt && history.length === 0 && !isGenerating) {
      handleGenerate(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  const handleGenerate = async (currentPrompt: string = prompt) => {
    if (!currentPrompt.trim()) return;
    
    // Add user message to history
    setHistory(prev => [...prev, { role: 'user', text: currentPrompt }]);
    setPrompt(""); // Clear input
    
    setIsGenerating(true);
    setError("");
    
    // Create a summarized context of highly-rated books and tags
    let contextStr = "";
    if (booksContext.length > 0) {
       const favorites = booksContext.filter(b => (b.criticScore || b.rating) >= 8 || b.reaction === 'love').map(b => `${b.title} by ${b.author}`);
       const completedOrReading = booksContext.filter(b => b.status === 'read' || b.status === 'currently-reading').map(b => `${b.title} by ${b.author}`);
       const disliked = booksContext.filter(b => b.status === 'not-for-me' || b.status === 'abandoned' || b.reaction === 'hate' || b.reaction === 'dislike' || (b.rating && Number(b.rating)>0 && Number(b.rating)<3)).map(b => `${b.title} by ${b.author}`);
       
       contextStr = `Current Library Context:\n- Highly Rated Favorites: ${favorites.join(', ') || 'None yet'}.\n- ALREADY READ OR CURRENTLY READING (DO NOT RECOMMEND THESE): ${completedOrReading.join(', ') || 'None yet'}.\n- DISLIKED OR ABANDONED (DO NOT RECOMMEND THESE OR ANYTHING LIKE THEM): ${disliked.join(', ') || 'None yet'}.\n`;
    }
    
    // Check preferences
    try {
      const prefs = localStorage.getItem('feyble_preferences');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.genres?.length) contextStr += `- Favorite Genres: ${parsed.genres.join(', ')}\n`;
        if (parsed.authors?.length) contextStr += `- Favorite Authors: ${parsed.authors.join(', ')}\n`;
        if (parsed.books?.length) contextStr += `- All-Time Favorite Books: ${parsed.books.join(', ')}\n`;
        if (parsed.tropes?.length) contextStr += `- Preferred Tropes: ${parsed.tropes.join(', ')}\n`;
        if (parsed.moods?.length) contextStr += `- Desired Moods: ${parsed.moods.join(', ')}\n`;
        if (parsed.bookLength && parsed.bookLength !== 'any') {
           const map = { short: '< 250 pages', medium: '250-450 pages', long: '450+ pages' };
           contextStr += `- Preferred Book Length: ${map[parsed.bookLength as keyof typeof map]}\n`;
        }
      }
    } catch(e) {}

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt, context: contextStr }),
      });
      if (!res.ok) throw new Error("Failed to fetch recommendations.");
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      
      let recs = data;
      if (!Array.isArray(recs) || recs.length === 0) {
        recs = [
          { title: "Whoops!", author: "Fiona", reason: "I'm a bit overwhelmed with requests right now. Please try again later!" }
        ];
      }
      
      // Add Fiona's response
      setHistory(prev => [...prev, { role: 'fiona', recommendations: recs }]);
    } catch (err) {
      setError("Fiona is taking a nap. Please ensure GEMINI_API_KEY is configured.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed inset-x-4 bottom-24 md:bottom-auto md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] bg-gradient-to-br from-indigo-950 to-gray-900 rounded-[32px] shadow-2xl z-[200] overflow-hidden flex flex-col max-h-[80vh] border border-white/20"
          >
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Sparkles className="w-64 h-64 text-white" />
            </div>

             <div className="flex justify-between items-start p-6 pb-0 relative z-10">
               <div className="flex items-center gap-4">
                 <div className="text-4xl filter drop-shadow-md pb-1 leading-none">🦉📚</div>
                 <div>
                   <h2 className="font-sans text-2xl font-bold text-white leading-tight">
                     Fiona the Owl
                   </h2>
                   <p className="text-indigo-200/70 text-sm">Your AI Librarian</p>
                 </div>
               </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 transition-colors ml-auto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 md:p-8 relative z-10 overflow-y-auto flex flex-col space-y-6">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <p className="text-white/90 text-lg md:text-xl font-medium mb-2 font-sans italic max-w-sm">
                    "Hoo's looking for a good book? Tell me what you're craving..."
                  </p>
                  {(!booksContext?.length && !localStorage.getItem('feyble_preferences')) && (
                     <p className="text-indigo-300/80 text-sm mt-4 tracking-wide max-w-sm">
                       Tip: Head over to your Profile to add your favorite authors and genres, or rate some books so I can give you personalized picks!
                     </p>
                  )}
                </div>
              ) : (
                history.map((entry, idx) => (
                  <div key={idx} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                    {entry.role === 'user' ? (
                       <div className="bg-indigo-600 text-white px-6 py-4 rounded-3xl rounded-tr-sm max-w-[85%] shadow-md">
                          <p className="font-sans text-base">{entry.text}</p>
                       </div>
                    ) : (
                       <div className="flex flex-col w-full max-w-[90%]">
                         {entry.recommendations?.map((rec, i) => (
                           <div key={i} className="flex items-start gap-3 mt-4 first:mt-0">
                             <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex-1 relative group">
                               <div className="flex justify-between items-start gap-4">
                                 <div>
                                   <h3 className="font-sans font-bold text-xl mb-1 text-white">{rec.title}</h3>
                                   <p className="text-indigo-200/80 text-sm mb-3">by {rec.author}</p>
                                 </div>
                                 {onAddBook && (
                                   <button 
                                     onClick={() => {
                                       onAddBook(rec.title, rec.author);
                                       onClose();
                                     }}
                                     className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors flex-shrink-0"
                                     title="Add to Library"
                                   >
                                     <Plus className="w-5 h-5" />
                                   </button>
                                 )}
                               </div>
                               <p className="text-sm text-white/90 leading-relaxed italic border-l-2 border-indigo-400 pl-3">"{sanitizeReason(rec.reason, 'books')}"</p>
                             </div>
                           </div>
                         ))}
                       </div>
                    )}
                  </div>
                ))
              )}
              
              {isGenerating && (
                 <div className="flex justify-start w-full">
                   <div className="bg-white/10 text-white px-6 py-4 rounded-3xl rounded-tl-sm max-w-[85%] flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="font-sans italic text-white/70">Fiona is thinking...</span>
                   </div>
                 </div>
              )}
              {error && <p className="text-red-300 text-sm mt-2 px-2 text-center">{error}</p>}
              <div ref={endOfMessagesRef} />
            </div>

            <div className="p-4 md:p-6 bg-black/20 border-t border-white/10 relative z-10 shrink-0">
              <div className="flex justify-between items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 focus-within:bg-white/15 focus-within:border-white/40 transition-all">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="e.g. A mystery set in an old library..."
                  className="w-full bg-transparent border-none px-4 text-white outline-none placeholder:text-white/40 font-sans text-base pr-10"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSpeech}
                    className={`p-2.5 rounded-xl transition-all ${isListening ? "bg-red-500 text-white animate-pulse" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                    title={isListening ? "Listening... Speak now" : "Speak to AI"}
                  >
                     <Mic className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleGenerate()}
                    disabled={isGenerating || !prompt.trim()}
                    className="bg-white text-indigo-950 font-semibold px-4 md:px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 dark:bg-[#1a1a1a]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Ask</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
