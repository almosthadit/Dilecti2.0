import React, { useState } from 'react';
import { X, Utensils, Check, Shuffle, Sparkles, Loader2, Copy, Search, Minimize2, Bookmark, MapPin, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';
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

export function FoodGeneratorModal({ isOpen, onClose, targetUserId }: { isOpen: boolean; onClose: () => void; targetUserId?: string | null }) {
  const { saveItem } = useUserItems();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [numOptions, setNumOptions] = useState<number>(3);
  const [vibe, setVibe] = useState('');
  const [guestVibe, setGuestVibe] = useState('');
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [generatedFood, setGeneratedFood] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const mockFood = [
        { title: 'Lucia\'s Pizzeria', artist: 'Italian • $$', friend: 'Alex', duration: '1.2 mi' },
        { title: 'Golden Dragon', artist: 'Chinese • $', friend: 'Jordan', duration: '0.8 mi' },
        { title: 'Taco Stand', artist: 'Mexican • $', friend: 'Taylor', duration: '2.1 mi' },
        { title: 'Green Bowl', artist: 'Healthy • $$', friend: 'Sam', duration: '0.5 mi' },
        { title: 'Steakhouse 99', artist: 'American • $$$', friend: 'Casey', duration: '3.4 mi' },
        { title: 'Sushi Zen', artist: 'Japanese • $$', friend: 'Alex', duration: '1.5 mi' },
        { title: 'Burger Joint', artist: 'American • $', friend: 'Jordan', duration: '0.3 mi' },
        { title: 'Cafe Mocha', artist: 'Cafe • $', friend: 'Taylor', duration: '1.1 mi' },
        { title: 'Thai Spice', artist: 'Thai • $$', friend: 'Sam', duration: '2.8 mi' },
        { title: 'Pasta Bella', artist: 'Italian • $$', friend: 'Casey', duration: '1.9 mi' },
      ];
      
      const selected = mockFood.slice(0, Math.max(3, Math.min(numOptions, 10)));
      setGeneratedFood(selected);
      setGenerating(false);
    }, 1500);
  };

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location", error);
          alert("Could not get your location.");
          setIsLocating(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsLocating(false);
    }
  };

  const handleToggleFriend = (id: string) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center bg-gradient-to-r from-orange-500/10 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">Where to Eat?</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Find spots based on friends' taste</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto hide-scrollbar">
          {generatedFood.length === 0 && !generating ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-white mb-3">Pull favorites from ({selectedFriends.length})</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-black border border-neutral-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                  {MOCK_FRIENDS.filter(f => f.name.toLowerCase().includes(friendSearchQuery.toLowerCase())).map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => handleToggleFriend(friend.id)}
                      className={cn(
                        "flex flex-col items-center min-w-[72px] p-2 rounded-xl border transition-all",
                        selectedFriends.includes(friend.id) 
                          ? "bg-orange-50 border-orange-200 dark:bg-orange-500/20 dark:border-orange-500/30" 
                          : "bg-white dark:bg-neutral-800 border-neutral-100 dark:border-white/5 hover:border-orange-200"
                      )}
                    >
                      <div className="relative w-12 h-12 mb-2">
                        <img 
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${friend.name}`}
                          className="w-full h-full rounded-full"
                          alt=""
                        />
                        {selectedFriends.includes(friend.id) && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 truncate w-full text-center">{friend.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-white mb-3">Guest Preferences (Off-App Friend)</label>
                <input
                  type="text"
                  placeholder="e.g. Vegan, hates loud places, cheap..."
                  value={guestVibe}
                  onChange={e => setGuestVibe(e.target.value)}
                  className="w-full p-3 bg-neutral-100 dark:bg-black border border-neutral-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:text-white placeholder:text-neutral-400 mb-6"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-white mb-3">Vibe & Cuisine</label>
                <input
                  type="text"
                  placeholder="e.g. Quick and cheap, premium, Italian..."
                  value={vibe}
                  onChange={e => setVibe(e.target.value)}
                  className="w-full p-3 bg-neutral-100 dark:bg-black border border-neutral-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:text-white placeholder:text-neutral-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-white mb-3">Location</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="e.g. San Francisco, CA or ZIP code"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 bg-neutral-100 dark:bg-black border border-neutral-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                  <button
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Use Current Location"
                  >
                    <Navigation className={cn("w-5 h-5", isLocating ? "animate-pulse text-orange-500" : "")} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-white mb-3">Number of Options: {numOptions}</label>
                <div className="flex gap-2">
                  {[3, 5, 10].map(num => (
                    <button
                      key={num}
                      onClick={() => setNumOptions(num)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-bold transition-all border",
                        numOptions === num 
                          ? "bg-orange-500 text-white border-orange-600" 
                          : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/10 hover:border-orange-300"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={selectedFriends.length === 0 && !vibe}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                Find Places
              </button>
            </div>
          ) : generating ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Finding the Perfect Spots</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Checking what your friends love...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="bg-orange-50 dark:bg-orange-500/10 rounded-2xl p-4 border border-orange-100 dark:border-orange-500/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-neutral-900 dark:text-white">Generated Options</h3>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20 px-2 py-1 rounded-md">{generatedFood.length} options</span>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {generatedFood.map((option, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-xl shadow-sm border bg-white dark:bg-neutral-800 border-neutral-100 dark:border-white/5 transition-colors"
                    >
                      <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center text-neutral-400 shrink-0 relative overflow-hidden">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate text-neutral-900 dark:text-white">{option.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{option.artist}</p>
                      </div>
                      <div className="flex flex-col items-center shrink-0 w-12 text-[10px] text-neutral-400">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${option.friend}`} className="w-5 h-5 rounded-full mb-0.5" alt="" />
                        <span>Via {option.friend}</span>
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
                        category: 'food',
                        subCategory: 'restaurant collection',
                        title: `Friend Feast: ${selectedFriends.length > 0 ? selectedFriends.map(id => MOCK_FRIENDS.find(f => f.id === id)?.name).join(', ') : 'All Friends'}`,
                        subtitle: `${generatedFood.length} options`,
                        coverUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}`,
                        rating: 0,
                        review: generatedFood.map(s => `${s.title} (${s.artist})`).join('\n'),
                        dateAdded: Date.now(),
                        status: 'completed',
                        visibility: 'private'
                      });
                      alert('Collection saved to your library!');
                    } catch (e) {
                      console.error('Failed to save', e);
                    }
                  }}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Bookmark className="w-4 h-4" />
                  Save Collection
                </button>
                <div className="flex gap-3 flex-1">
                  <button 
                    onClick={() => {
                      const text = `Dilecti suggests these ${generatedFood.length} spots for our vibe tonight:\n\n` + generatedFood.map((s, idx) => `${idx + 1}. ${s.title} (${s.artist})`).join('\n') + '\n\nVote below.';
                      navigator.clipboard.writeText(text);
                      alert('Copied to clipboard!');
                    }}
                    className="flex-1 py-3 bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Export to Group Chat
                  </button>
                  <button 
                    onClick={() => {
                      setGeneratedFood([]);
                      setGenerating(false);
                    }}
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Shuffle className="w-4 h-4" />
                    New Search
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
