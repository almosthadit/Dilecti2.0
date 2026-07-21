import { useState, useEffect } from 'react';

type Track = { title: string; artist: string; friend: string; duration: string; url?: string };

class AudioPlayerStore {
  playlist: Track[] = [];
  currentIndex: number = 0;
  isPlaying: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // We rely on the GlobalMiniPlayer to render the actual YouTube iframe fallback
  }

  setPlaylist(playlist: Track[]) {
    this.playlist = playlist;
    this.currentIndex = 0;
    this.isPlaying = true;
    this.notify();
  }

  playIndex(index: number) {
    if (this.playlist.length === 0) return;
    this.currentIndex = index;
    this.isPlaying = true;
    this.notify();
  }

  togglePlay() {
    if (this.playlist.length === 0) return;
    this.isPlaying = !this.isPlaying;
    this.notify();
  }

  next() {
    if (this.playlist.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.isPlaying = true;
    this.notify();
  }

  prev() {
    if (this.playlist.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.isPlaying = true;
    this.notify();
  }

  clear() {
    this.playlist = [];
    this.isPlaying = false;
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getSnapshot = () => ({
    playlist: this.playlist,
    currentIndex: this.currentIndex,
    isPlaying: this.isPlaying,
    currentTrack: this.playlist[this.currentIndex] || null
  });
}

export const audioPlayerStore = new AudioPlayerStore();

export function useAudioPlayer() {
  const [state, setState] = useState(audioPlayerStore.getSnapshot());

  useEffect(() => {
    return audioPlayerStore.subscribe(() => {
      setState(audioPlayerStore.getSnapshot());
    });
  }, []);

  return {
    ...state,
    setPlaylist: (p: Track[]) => audioPlayerStore.setPlaylist(p),
    togglePlay: () => audioPlayerStore.togglePlay(),
    next: () => audioPlayerStore.next(),
    prev: () => audioPlayerStore.prev(),
    clear: () => audioPlayerStore.clear(),
    playIndex: (i: number) => audioPlayerStore.playIndex(i)
  };
}
