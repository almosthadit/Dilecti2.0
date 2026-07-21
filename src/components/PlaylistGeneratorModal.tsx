import React, { useState } from 'react';
import { X, Music2, Check, Download, Play, Shuffle, Headphones, Sparkles, Loader2, Copy, Pause, SkipForward, SkipBack, Search, Minimize2, Bookmark } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAudioPlayer } from '../lib/audioPlayerStore';
import { useUserItems } from '../hooks';

const MOCK_FRIENDS = [
  { id: '1', name: 'Alex' },
  { id: '2', name: 'Jordan' },
  { id: '3', name: 'Taylor' },
  { id: '4', name: 'Sam' },
  { id: '5', name: 'Casey' },
  { id: '6', name: 'Riley' },
  { id: '7', name: 'Morgan' },
  { id: '8', name: 'Jamie' },
  { id: '9', name: 'Avery' },
  { id: '10', name: 'Cameron' },
  { id: '11', name: 'Quinn' },
  { id: '12', name: 'Reese' }
];

export function PlaylistGeneratorModal({ isOpen, onClose, targetUserId }: { isOpen: boolean; onClose: () => void; targetUserId?: string | null }) {
  const { saveItem } = useUserItems();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [numSongs, setNumSongs] = useState<number>(20);
  const [genres, setGenres] = useState('');
  const [generating, setGenerating] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');

  // Use global audio player
  const { playlist: generatedPlaylist, currentIndex, isPlaying, currentTrack, setPlaylist, togglePlay, next, prev, playIndex, clear } = useAudioPlayer();

  if (!isOpen) return null;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      // Mock generated playlist based on friends
      const mockSongs = [
        { title: 'Cruel Summer', artist: 'Taylor Swift', friend: 'Alex', duration: '2:58' },
        { title: 'Blinding Lights', artist: 'The Weeknd', friend: 'Jordan', duration: '3:20' },
        { title: 'Levitating', artist: 'Dua Lipa', friend: 'Taylor', duration: '3:23' },
        { title: 'Watermelon Sugar', artist: 'Harry Styles', friend: 'Sam', duration: '2:54' },
        { title: 'Good Days', artist: 'SZA', friend: 'Casey', duration: '4:39' },
        { title: 'Kill Bill', artist: 'SZA', friend: 'Alex', duration: '2:33' },
        { title: 'As It Was', artist: 'Harry Styles', friend: 'Jordan', duration: '2:47' },
        { title: 'Anti-Hero', artist: 'Taylor Swift', friend: 'Taylor', duration: '3:20' },
        { title: 'Flowers', artist: 'Miley Cyrus', friend: 'Sam', duration: '3:20' },
        { title: 'Paint The Town Red', artist: 'Doja Cat', friend: 'Casey', duration: '3:51' },
      ];
      // filter or adjust size loosely
      const selected = mockSongs.slice(0, Math.max(3, Math.min(numSongs, 10)));
      setPlaylist(selected);
      setGenerating(false);
    }, 1500);
  };

  const handleToggleFriend = (id: string) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-500/10 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">Friend Mix</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Combine your friends' favorites</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {generatedPlaylist.length > 0 && (
              <button onClick={onClose} title="Minimize to background player" className="p-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 text-purple-600 dark:text-purple-400 rounded-full transition-colors">
                <Minimize2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto hide-scrollbar">
          {generatedPlaylist.length === 0 && !generating ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-white mb-3">Pull songs from ({selectedFriends.length})</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1 pr-2 hide-scrollbar">
                  {MOCK_FRIENDS.filter(f => f.name.toLowerCase().includes(friendSearchQuery.toLowerCase())).map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleToggleFriend(f.id)}
                      className={cn(
                        "flex items-center justify-between w-full p-2 rounded-xl border transition-colors group",
                        selectedFriends.includes(f.id) 
                          ? "bg-purple-50/50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/30" 
                          : "bg-white border-neutral-100 hover:border-neutral-200 dark:bg-transparent dark:border-white/5 dark:hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${f.name}`} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800" alt="" />
                        <span className={cn(
                          "text-sm font-bold",
                          selectedFriends.includes(f.id) ? "text-purple-700 dark:text-purple-300" : "text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors"
                        )}>
                          {f.name}
                        </span>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                        selectedFriends.includes(f.id) 
                          ? "bg-purple-500 border-purple-500 text-white" 
                          : "border-neutral-300 dark:border-neutral-600"
                      )}>
                        {selectedFriends.includes(f.id) && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-white mb-3">Playlist Length: {numSongs} songs</label>
                <input 
                  type="range" 
                  min="5" max="50" step="5"
                  value={numSongs}
                  onChange={(e) => setNumSongs(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>Snack (5)</span>
                  <span>Deep Dive (50)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-white mb-2">Vibe / Genres (Optional)</label>
                <input 
                  type="text" 
                  value={genres}
                  onChange={e => setGenres(e.target.value)}
                  placeholder="e.g. Include 80s, exclude country..."
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-white/40"
                />
              </div>

              <button 
                onClick={handleGenerate}
                disabled={selectedFriends.length === 0}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Generate Playlist
              </button>
            </div>
          ) : generating ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Mixing the Perfect Blend</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Checking what your friends have on repeat...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Mini Player */}
              {currentTrack && (
                <div className="bg-neutral-900 dark:bg-black rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 bg-neutral-800 rounded-2xl mb-4 shadow-2xl flex items-center justify-center border border-white/10">
                      <Music2 className="w-8 h-8 text-white/50" />
                    </div>
                    
                    <div className="text-center w-full mb-6">
                      <h3 className="font-bold text-xl truncate">{currentTrack.title}</h3>
                      <p className="text-white/60 text-sm truncate mt-1">{currentTrack.artist}</p>
                    </div>

                    <div className="w-full space-y-2 mb-6">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden flex">
                        <div className={cn("h-full bg-purple-400 rounded-full", isPlaying ? "w-full animate-pulse" : "w-0")} />
                      </div>
                      <div className="flex justify-center text-[10px] text-white/50 font-medium uppercase tracking-widest">
                        {isPlaying ? 'Playing via YouTube' : 'Paused'}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <button onClick={prev} className="text-white/70 hover:text-white transition-colors">
                        <SkipBack className="w-6 h-6 fill-current" />
                      </button>
                      <button 
                        onClick={togglePlay}
                        className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                      >
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                      </button>
                      <button onClick={next} className="text-white/70 hover:text-white transition-colors">
                        <SkipForward className="w-6 h-6 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-purple-50 dark:bg-purple-500/10 rounded-2xl p-4 border border-purple-100 dark:border-purple-500/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-neutral-900 dark:text-white">Up Next</h3>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-2 py-1 rounded-md">{generatedPlaylist.length} tracks</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {generatedPlaylist.map((song, i) => (
                    <div 
                      key={i} 
                      onClick={() => playIndex(i)}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl shadow-sm border cursor-pointer transition-colors",
                        i === currentIndex 
                          ? "bg-purple-100/50 border-purple-200 dark:bg-purple-500/20 dark:border-purple-500/30" 
                          : "bg-white dark:bg-neutral-800 border-neutral-100 dark:border-white/5 hover:border-purple-200 dark:hover:border-white/20"
                      )}
                    >
                      <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center text-neutral-400 shrink-0 relative overflow-hidden">
                        {i === currentIndex && isPlaying ? (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center gap-0.5">
                            <div className="w-1 h-3 bg-purple-500 animate-pulse" />
                            <div className="w-1 h-4 bg-purple-500 animate-pulse delay-75" />
                            <div className="w-1 h-2 bg-purple-500 animate-pulse delay-150" />
                          </div>
                        ) : (
                          <Music2 className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold text-sm truncate", i === currentIndex ? "text-purple-700 dark:text-purple-300" : "text-neutral-900 dark:text-white")}>{song.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{song.artist}</p>
                      </div>
                      <div className="flex flex-col items-center shrink-0 w-12 text-[10px] text-neutral-400">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${song.friend}`} className="w-5 h-5 rounded-full mb-0.5" alt="" />
                        <span>Via {song.friend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={async () => {
                    try {
                      await saveItem({
                        id: crypto.randomUUID(),
                        category: 'music',
                        subCategory: 'playlist',
                        title: `Friend Mix: ${selectedFriends.length > 0 ? selectedFriends.map(id => MOCK_FRIENDS.find(f => f.id === id)?.name).join(', ') : 'All Friends'}`,
                        subtitle: `${generatedPlaylist.length} tracks`,
                        coverUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}`,
                        rating: 0,
                        review: generatedPlaylist.map(s => `${s.title} by ${s.artist}`).join('\n'),
                        dateAdded: Date.now(),
                        status: 'completed',
                        visibility: 'private'
                      });
                      alert('Playlist saved to your library!');
                    } catch (e) {
                      console.error('Failed to save', e);
                    }
                  }}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Bookmark className="w-4 h-4" />
                  Save to Library
                </button>
                <div className="flex gap-3 flex-1">
                  <button 
                    onClick={() => {
                      const text = generatedPlaylist.map(s => `${s.title} by ${s.artist}`).join('\n');
                      navigator.clipboard.writeText(text);
                      alert('Copied to clipboard! You can paste this into Spotify or YouTube Music.');
                    }}
                    className="flex-1 py-3 bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button 
                    onClick={() => {
                      clear();
                      setGenerating(false);
                    }}
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Shuffle className="w-4 h-4" />
                    New Mix
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
