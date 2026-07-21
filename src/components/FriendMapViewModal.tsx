import React, { useState, useEffect, useMemo } from 'react';
import { X, Map as MapIcon, Compass, MapPin, Library, Users, List, Navigation, Utensils } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary, InfoWindow } from '@vis.gl/react-google-maps';
import { cn } from '../lib/utils';
import { useUserItems, useUserProfile } from '../hooks';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

function MapContent() {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const { userItems } = useUserItems();
  const { profile } = useUserProfile();
  const [showFriends, setShowFriends] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showList, setShowList] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [friendPlaces, setFriendPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);

  // Auto-locate on mount (using profile location)
  useEffect(() => {
    const handleGeocodeFallback = async () => {
      if (profile?.demographics?.location && geocodingLib) {
        try {
          const geocoder = new geocodingLib.Geocoder();
          const results = await geocoder.geocode({ address: profile.demographics.location });
          if (results.results && results.results.length > 0) {
            const loc = results.results[0].geometry.location;
            setMapCenter({ lat: loc.lat(), lng: loc.lng() });
          }
        } catch (e) {
          console.error("Geocoding failed", e);
        }
      }
    };

    handleGeocodeFallback();
  }, [geocodingLib, profile?.demographics?.location]);

  useEffect(() => {
    if (!map || !placesLib || !mapCenter) return;
    
    let isSubscribed = true;

    const fetchNearby = async () => {
      try {
        const response = await placesLib.Place.searchNearby({
          fields: ['displayName', 'location', 'rating', 'userRatingCount', 'priceLevel'],
          locationRestriction: {
            center: mapCenter,
            radius: 2000,
          },
          includedPrimaryTypes: ['restaurant', 'cafe', 'bar'],
          maxResultCount: 8,
        });

        if (!isSubscribed) return;

        if (response.places) {
          const friendsLists = [
            [{ name: 'Alex', rating: 9, review: 'Amazing pasta.' }, { name: 'Sam', rating: 8, review: 'Good drinks.' }],
            [{ name: 'Jordan', rating: 10, review: 'My favorite spot!' }],
            [{ name: 'Casey', rating: 7 }, { name: 'Taylor', rating: 6 }, { name: 'Alex', rating: 8 }],
            [{ name: 'Taylor', rating: 9, review: 'Perfect for dates.' }],
            [{ name: 'Sam', rating: 8 }, { name: 'Jordan', rating: 8 }],
            [{ name: 'Alex', rating: 10, review: 'Incredible atmosphere.' }],
            [{ name: 'Casey', rating: 7 }, { name: 'Sam', rating: 9 }],
            [{ name: 'Jordan', rating: 8 }, { name: 'Taylor', rating: 8 }]
          ];
          
          const newFriendPlaces = response.places.map((place: any, i: number) => ({
            id: `friend_place_${i}`,
            title: place.displayName,
            lat: place.location.lat(),
            lng: place.location.lng(),
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            priceLevel: place.priceLevel,
            isUserItem: false,
            friends: friendsLists[i % friendsLists.length]
          }));

          setFriendPlaces(newFriendPlaces);
        }
      } catch (err) {
        console.error("Failed to fetch nearby places", err);
      }
    };

    fetchNearby();

    return () => {
      isSubscribed = false;
    };
  }, [map, placesLib, mapCenter]);

  const [realUserPlaces, setRealUserPlaces] = useState<any[]>([]);

  useEffect(() => {
    if (!map || !placesLib || !userItems) return;

    let isSubscribed = true;
    const foodItems = userItems.filter((i: any) => i.category === 'food' || i.category === 'restaurants' || i.category === 'restaurant' || i.category === 'place');

    const geocodeItems = async () => {
      const results: any[] = [];
      for (const item of foodItems) {
        if (!isSubscribed) break;
        
        if (item.metadata?.lat && item.metadata?.lng) {
             results.push({
               id: item.id,
               title: item.title,
               lat: item.metadata.lat,
               lng: item.metadata.lng,
               isUserItem: true,
               friends: []
             });
             continue;
        }
        
        try {
          const response = await placesLib.Place.searchByText({
            textQuery: item.title,
            fields: ['displayName', 'location'],
            maxResultCount: 1,
          });
          const place = response.places?.[0];

          if (place && place.location) {
             results.push({
               id: item.id,
               title: item.title,
               lat: place.location.lat(),
               lng: place.location.lng(),
               isUserItem: true,
               friends: []
             });
          }
          await new Promise(r => setTimeout(r, 250)); // Rate limit prevention
        } catch (e) {
           console.warn("Failed to geocode", item.title);
        }
      }
      if (isSubscribed) {
        setRealUserPlaces(results);
      }
    };

    geocodeItems();

    return () => {
      isSubscribed = false;
    };
  }, [map, placesLib, userItems]);

  const places = [
    ...(showFriends ? friendPlaces : []),
    ...(showLibrary ? realUserPlaces : [])
  ];

  useEffect(() => {
    if (map && places.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidCoords = false;
      places.forEach((place: any) => {
         const lat = Number(place.lat);
         const lng = Number(place.lng);
         if (!isNaN(lat) && !isNaN(lng)) {
             bounds.extend({ lat, lng });
             hasValidCoords = true;
         }
      });
      if (hasValidCoords) {
         map.fitBounds(bounds, 40);
      }
    } else if (map && mapCenter) {
      map.panTo(mapCenter);
    }
  }, [map, mapCenter, places.length]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !geocodingLib) return;
    
    const geocoder = new geocodingLib.Geocoder();
    try {
      const results = await geocoder.geocode({ address: searchQuery });
      if (results.results[0]) {
        const loc = results.results[0].geometry.location;
        const newCenter = { lat: loc.lat(), lng: loc.lng() };
        setMapCenter(newCenter);
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    }
  };

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(newCenter);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location", error);
          setIsLocating(false);
          alert("Could not get your location. Please check your browser permissions.");
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      {/* View Toggle */}
      <div className="absolute top-4 right-4 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-full shadow-lg border border-neutral-100 dark:border-white/10 p-1 flex">
        <button 
          onClick={() => setShowList(false)}
          className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5", !showList ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-neutral-500")}
        >
          <MapIcon className="w-3.5 h-3.5" />
          Map
        </button>
        <button 
          onClick={() => setShowList(true)}
          className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5", showList ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-neutral-500")}
        >
          <List className="w-3.5 h-3.5" />
          List
        </button>
      </div>

      {/* Floating Filter Toggles */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-2 p-1 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-full shadow-xl border border-black/5 dark:border-white/10">
        <button
          onClick={() => setShowFriends(!showFriends)}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
            showFriends ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          Friends
        </button>
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
            showLibrary ? "bg-emerald-500 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
        >
          <Library className="w-3.5 h-3.5" />
          My Library
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-food-modal'))}
          className="px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-1.5 bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
        >
          <Utensils className="w-3.5 h-3.5" />
          Where to Eat?
        </button>
      </div>

      {/* List View Full Overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-white dark:bg-neutral-900 flex flex-col z-30 transition-transform duration-300 pb-20",
          showList ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5 mt-16">
          {places.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 dark:text-neutral-400 text-sm">
              No places found in this area.
            </div>
          ) : (
            places.map((place: any) => (
              <div 
                key={place.id}
                className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                onClick={() => {
                  setMapCenter({ lat: Number(place.lat), lng: Number(place.lng) });
                  setSelectedPlace(place);
                  if (window.innerWidth < 768) {
                    setShowList(false); // Auto-close list on mobile when selecting
                  }
                }}
              >
                <h4 className="font-bold text-neutral-900 dark:text-white text-sm mb-1">{place.title}</h4>
                {showFriends && !place.isUserItem && place.friends && place.friends.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Friends:</span>
                    <div className="flex -space-x-1.5">
                      {place.friends.map((friend: any, idx: number) => (
                        <img
                          key={idx}
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${friend.name}`}
                          className="w-5 h-5 rounded-full border border-white dark:border-neutral-900 shadow-sm"
                          alt={friend.name}
                          title={friend.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {showLibrary && place.isUserItem && (
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded text-[10px] font-bold">Saved</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative w-full h-full">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-11/12 max-w-sm">
          <form onSubmit={handleSearch} className="flex bg-white dark:bg-neutral-900 rounded-full shadow-lg border border-neutral-100 dark:border-white/10 overflow-hidden">
            <input 
              type="text" 
              placeholder="Search a location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 bg-transparent text-sm focus:outline-none dark:text-white"
            />
            <button type="submit" className="px-4 text-emerald-500 font-bold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              Search
            </button>
          </form>
          <div className="flex justify-center mt-2 gap-2">
            <button 
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-full shadow-md text-xs font-bold flex items-center gap-2 hover:bg-white dark:hover:bg-neutral-800 transition-colors border border-black/5 dark:border-white/10"
            >
              <Navigation className={cn("w-3 h-3", isLocating ? "animate-pulse" : "")} />
              {isLocating ? "Locating..." : "My Location"}
            </button>
          </div>
        </div>

        <Map
          defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI={true}
        >
          {places.map((place: any) => (
            <AdvancedMarker key={place.id} position={{ lat: Number(place.lat), lng: Number(place.lng) }} title={place.title} onClick={() => setSelectedPlace(place)}>
              <div className="relative group cursor-pointer flex flex-col items-center">
                <div className="relative flex items-center gap-1.5 z-10 bg-white dark:bg-neutral-800 py-1.5 px-3 rounded-full shadow-lg border border-neutral-100 dark:border-white/10 transition-transform group-hover:scale-105">
                  <span className="font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[120px]">{place.title}</span>
                  {showFriends && !place.isUserItem && place.friends && place.friends.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {place.friends.slice(0, 3).map((friend: any, idx: number) => (
                        <img
                          key={idx}
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${friend.name}`}
                          className={cn(
                            "w-5 h-5 rounded-full border-[1.5px] border-white dark:border-neutral-800 shadow-sm",
                            place.friends.length > 1 ? "bg-red-500" : "bg-emerald-500"
                          )}
                          alt={friend.name}
                        />
                      ))}
                      {place.friends.length > 3 && (
                        <div className="w-5 h-5 rounded-full border-[1.5px] border-white dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[8px] font-bold text-neutral-600 dark:text-neutral-300">
                          +{place.friends.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  {showLibrary && place.isUserItem && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 border-[1.5px] border-white dark:border-neutral-800 shadow-sm flex items-center justify-center">
                      <Library className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white dark:border-t-neutral-800 drop-shadow-sm -mt-[1px]" />
              </div>
            </AdvancedMarker>
          ))}

          {selectedPlace && (
            <InfoWindow
              position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
              onCloseClick={() => setSelectedPlace(null)}
            >
              <div className="p-2 min-w-[220px] max-w-[280px] flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-neutral-900 text-sm leading-tight">{selectedPlace.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                    {selectedPlace.rating && (
                      <span className="flex items-center gap-0.5 bg-yellow-100 text-yellow-800 px-1 rounded font-bold">
                        ★ {selectedPlace.rating}
                      </span>
                    )}
                    {selectedPlace.userRatingCount && <span>({selectedPlace.userRatingCount})</span>}
                    {selectedPlace.priceLevel && (
                      <span className="text-neutral-400">
                        {Array.from({ length: selectedPlace.priceLevel + 1 }).map(() => '$').join('')}
                      </span>
                    )}
                  </div>
                </div>
                
                {(() => {
                  const matchingUserItem = selectedPlace.isUserItem ? userItems?.find(i => i.id === selectedPlace.id) : userItems?.find((i: any) => i.title.toLowerCase() === selectedPlace.title.toLowerCase());
                  if (matchingUserItem) {
                    return (
                      <button 
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-item', { detail: matchingUserItem }));
                        }}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors shadow-sm"
                      >
                        View in Library
                      </button>
                    );
                  }
                  
                  return (
                    <div className="flex flex-col gap-3">
                      {selectedPlace.friends && selectedPlace.friends.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {selectedPlace.friends.map((friend: any, i: number) => (
                            <div key={i} className="flex gap-2 items-start bg-neutral-50 p-2 rounded-md">
                              <button
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent('open-public-profile', { detail: { userId: friend.name.toLowerCase() } }));
                                }}
                                className="shrink-0 transition-transform hover:scale-105 hover:opacity-80 focus:outline-none"
                              >
                                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${friend.name}`} alt={friend.name} className="w-8 h-8 rounded-full border border-neutral-200" />
                              </button>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-neutral-900">{friend.name}</span>
                                  {friend.rating && (
                                    <span className="text-[10px] font-bold bg-neutral-200 px-1 rounded text-neutral-700">{friend.rating}/10</span>
                                  )}
                                </div>
                                {friend.review && (
                                  <p className="text-[10px] text-neutral-600 italic line-clamp-2 leading-tight">"{friend.review}"</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-universal-add-item', { 
                            detail: { item: { title: selectedPlace.title, category: 'place' } } 
                          }));
                        }}
                        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-bold transition-colors shadow-sm"
                      >
                        Add to Library
                      </button>
                    </div>
                  );
                })()}
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </div>
  );
}


export function FriendMapViewModal({ isOpen, onClose, targetUserId }: { isOpen: boolean; onClose: () => void; targetUserId?: string | null }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full h-full sm:h-[80vh] sm:max-w-4xl bg-white dark:bg-neutral-900 sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-neutral-100 dark:border-white/10 flex justify-between items-center bg-white dark:bg-neutral-900 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <MapIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-white leading-tight">Discovery Map</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">See places from your library and circle</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
          </button>
        </div>

        <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-800">
          {!hasValidKey ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-md bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-lg border border-neutral-200 dark:border-white/10">
                <MapPin className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Google Maps API Key Required</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 text-left">
                  To view the interactive map, you need to add your API key:
                </p>
                <ul className="text-sm text-left text-neutral-600 dark:text-neutral-400 space-y-3 list-disc pl-5">
                  <li>Get an API Key from Google Cloud Console.</li>
                  <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right corner in AI Studio)</li>
                  <li>Select <strong>Secrets</strong></li>
                  <li>Type <code className="bg-neutral-100 dark:bg-white/10 px-1 rounded">GOOGLE_MAPS_PLATFORM_KEY</code> and press Enter</li>
                  <li>Paste your key and press Enter. The app will rebuild.</li>
                </ul>
              </div>
            </div>
          ) : (
            <APIProvider apiKey={API_KEY} version="weekly" libraries={['places']}>
              <MapContent />
            </APIProvider>
          )}
        </div>
      </div>
    </div>
  );
}
