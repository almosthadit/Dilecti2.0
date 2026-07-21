import { X, BookMarked, Star, Users, Sparkles, Plus, Clock, Bookmark, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "./ImageWithFallback";


export default function BookPreviewModal({ 
  book, 
  onClose, 
  onAdd 
}: { 
  book: any, 
  onClose: () => void, 
  onAdd: (book: any, status: 'read' | 'currently-reading' | 'up-next') => void 
}) {
  if (!book) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 text-black dark:text-white">
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={onClose}
        />
        
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[90vh] dark:bg-[#1a1a1a]"
        >
            <div className="absolute top-4 right-4 z-20">
                <button onClick={onClose} className="w-8 h-8 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors dark:bg-white/5">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-8 pb-6 flex flex-col items-center text-center overflow-y-auto">
                <div className="w-32 h-48 bg-black/5 rounded-lg shadow-lg mb-6 overflow-hidden flex-shrink-0 dark:bg-white/5">
                    {book.cover ? (
                        <ImageWithFallback 
                            src={book.cover} 
                           className="w-full h-full object-cover" 
                           alt={book.title} 
                           referrerPolicy="no-referrer"
                        />
                    ) : (book.cover_i || book.cover_id) ? (
                        <ImageWithFallback 
                            src={`https://covers.openlibrary.org/b/id/${book.cover_i || book.cover_id}-L.jpg`} 
                           className="w-full h-full object-cover" 
                           alt={book.title} 
                           referrerPolicy="no-referrer"
                        />
                    ) : (book.coverUrl) ? (
                        <ImageWithFallback 
                            category={book.category} src={book.coverUrl} 
                           className="w-full h-full object-cover" 
                           alt={book.title} 
                           referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-black/20">
                           <BookMarked className="w-12 h-12" />
                        </div>
                    )}
                </div>
                <h2 className="font-serif text-2xl font-bold mb-2 leading-tight">{book.title}</h2>
                <p className="text-black/60 mb-6 dark:text-white/60">{book.author_name?.[0] || book.authors?.[0]?.name || book.author || "Unknown Author"}</p>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs font-medium text-black/60 mb-6 w-full justify-center dark:text-white/60">
                   <div className="flex items-center gap-1 bg-black/5 px-2 py-1 rounded-md dark:bg-white/5">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" /> 4.2 Avg
                   </div>
                   <div className="flex items-center gap-1 bg-black/5 px-2 py-1 rounded-md dark:bg-white/5">
                      <Users className="w-3.5 h-3.5" /> 3 Friends read
                   </div>
                </div>

                {/* AI Summary */}
                <div className="w-full bg-gradient-to-br from-feyble-accent/5 to-purple-500/5 p-4 rounded-xl mb-6 text-left relative border border-feyble-accent/10">
                   <Sparkles className="w-4 h-4 text-feyble-ink absolute top-4 left-4" />
                   <p className="pl-6 text-sm text-feyble-ink/80 leading-relaxed font-medium">
                      <strong className="text-feyble-ink block mb-0.5">Fiona says:</strong>
                      Based on your recent reads, you'll likely enjoy this book.
                   </p>
                </div>

                {/* Status Buttons */}
                <div className="w-full grid grid-cols-3 gap-2 mb-4">
                   <button 
                      onClick={() => { onAdd(book, 'up-next'); onClose(); }}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-black/5 hover:bg-black/10 transition-colors group dark:bg-white/5"
                   >
                      <Bookmark className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Up Next</span>
                   </button>
                   <button 
                      onClick={() => { onAdd(book, 'currently-reading'); onClose(); }}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-black/5 hover:bg-black/10 transition-colors group dark:bg-white/5"
                   >
                      <Clock className="w-5 h-5 text-black/40 group-hover:text-amber-600 transition-colors" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Reading</span>
                   </button>
                   <button 
                      onClick={() => { onAdd(book, 'read'); onClose(); }}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-feyble-ink text-white hover:bg-feyble-ink/90 transition-colors group shadow-md"
                   >
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">I've Read It</span>
                   </button>
                </div>
            </div>
        </motion.div>
    </div>
  );
}
