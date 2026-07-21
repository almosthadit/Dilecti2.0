import React, { useEffect, useState, useRef } from 'react';
import { useAudioPlayer } from '../lib/audioPlayerStore';
import { Music2, Play, Pause, SkipForward, SkipBack, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';

export function GlobalMiniPlayer() {
  const { currentTrack, isPlaying, togglePlay, next, prev, clear } = useAudioPlayer();
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!currentTrack) {
      setVideoId(null);
      return;
    }
    
    let isMounted = true;
    const fetchVideoId = async () => {
      setIsLoading(true);
      try {
        const query = `${currentTrack.title} ${currentTrack.artist} lyrics audio`;
        const res = await fetch('/api/search-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        if (isMounted && data.videoId) {
          setVideoId(data.videoId);
        }
      } catch (e) {
        console.error("Failed to fetch video for track", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchVideoId();
    
    return () => {
      isMounted = false;
    };
  }, [currentTrack]);

  useEffect(() => {
    // ReactPlayer uses its own `playing` prop, no need to manually call methods
  }, [isPlaying]);

  if (!currentTrack) return null;

  return (
    <>
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[110]"
      >
        <div className="bg-neutral-900/95 backdrop-blur-xl dark:bg-black/95 rounded-2xl p-3 text-white shadow-2xl flex flex-col gap-3 border border-white/10 overflow-hidden relative group w-[280px]">
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
              </div>
            )}
            
            {videoId ? (
              <div className={cn("w-full h-full", isLoading ? "opacity-0" : "opacity-100")}>
                 <ReactPlayer
                   {...({
                     url: `https://www.youtube.com/watch?v=${videoId}`,
                     playing: isPlaying,
                     onEnded: () => next(),
                     width: "100%",
                     height: "100%",
                     config: {
                       youtube: {
                         playerVars: { modestbranding: 1, rel: 0, autoplay: 1 }
                       } as any
                     }
                   } as any)}
                 />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                <Music2 className="w-8 h-8 text-white/30" />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate">{currentTrack.title}</h4>
              <p className="text-white/60 text-xs truncate">{currentTrack.artist}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0 relative z-10">
              <button onClick={prev} className="text-white/60 hover:text-white transition-colors p-1">
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
              <button 
                onClick={togglePlay}
                className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button onClick={next} className="text-white/60 hover:text-white transition-colors p-1">
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
          
          <button 
            onClick={clear}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-10 backdrop-blur-md"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
