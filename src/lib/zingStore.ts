import { useState, useEffect } from 'react';

// --- Zing State Abstraction Layer ---
// In Phase 2, this uses localStorage to persist data for prototyping without compromising Firestore security.
// The abstraction ensures we can swap to Firestore in Phase 3 without changing widget components overmuch.

import { ZingConnection } from '../types';

export type ZingTask = {
  id: string;
  text: string;
  owner: 'Partner A' | 'Partner B' | 'Both' | 'Unassigned';
  done: boolean;
  effort: 'quick' | 'normal' | 'heavy';
  type: 'chore' | 'task' | 'goal';
};

export type FoodDecisionHistory = {
  id: string;
  date: string;
  vibe: string;
  result: string;
  rating: 'up' | 'down' | 'none';
};

export type CapturedSuggestion = {
  id: string;
  snippet: string;
  category: string;
  assignee: string | null;
  privacy: 'shared' | 'requires_confirmation';
  status: 'pending' | 'saved' | 'dismissed';
};

export type SharedDecision = {
  id: string;
  title: string;
  type: 'food' | 'weekend' | 'vacation' | 'gift' | 'date' | 'general' | 'movie';
  status: 'pending' | 'resolved';
  resolvedValue?: string;
  tasteReasoning?: string;
};

export type TimelineEvent = {
  id: string;
  title: string;
  subtitle?: string;
  time: string;
  iconType: 'task' | 'decision' | 'mood' | 'alert' | 'food';
};

export type TasteOverlap = {
  id: string;
  category: 'restaurant' | 'movie' | 'book' | 'activity' | 'travel' | 'gift';
  name: string;
  matchType: 'both_love' | 'you_love' | 'they_love' | 'explore';
};

export type MemoryLog = {
  id: string;
  title: string;
  date: string;
  sentiment: 'loved' | 'hated' | 'neutral' | 'milestone';
  category: 'food' | 'trip' | 'activity' | 'general' | 'movie';
};

export type ZingStoreData = {
  connections: ZingConnection[];
  tasks: ZingTask[];
  decisions: SharedDecision[];
  timeline: TimelineEvent[];
  foodDecisions: FoodDecisionHistory[];
  tasteProfile: TasteOverlap[];
  memories: MemoryLog[];
  lastMood: { text: string; note: string | null; time: string } | null;
  capturedSuggestions: CapturedSuggestion[];
};

const DEFAULT_DATA: ZingStoreData = {
  connections: [],
  tasks: [
    { id: '1', text: 'Dog food pickup', owner: 'Partner A', done: false, effort: 'quick', type: 'chore' },
    { id: '2', text: 'Contractor check-in', owner: 'Partner B', done: false, effort: 'normal', type: 'task' },
    { id: '3', text: 'Daycare bag & laundry', owner: 'Both', done: false, effort: 'heavy', type: 'chore' },
  ],
  decisions: [
    { id: 'd1', title: 'Weekend plans', type: 'weekend', status: 'pending' },
    { id: 'd2', title: 'Movie night tonight', type: 'movie', status: 'pending' },
    { id: 'd3', title: 'Summer vacation destination', type: 'vacation', status: 'resolved', resolvedValue: 'Italy', tasteReasoning: 'You both have Amalfi Coast saved in your travel bucket lists.' },
  ],
  timeline: [
    { id: 't1', title: 'Internet bill paid', time: new Date(Date.now() - 3600000).toISOString(), iconType: 'task' },
    { id: 't2', title: 'Alyssa requested support', time: new Date(Date.now() - 7200000).toISOString(), iconType: 'mood' },
  ],
  foodDecisions: [],
  tasteProfile: [
    { id: 'tp1', category: 'restaurant', name: 'Odd Duck', matchType: 'both_love' },
    { id: 'tp2', category: 'movie', name: 'Dune: Part Two', matchType: 'both_love' },
    { id: 'tp3', category: 'activity', name: 'Bouldering', matchType: 'they_love' },
    { id: 'tp4', category: 'travel', name: 'Tokyo', matchType: 'explore' },
    { id: 'tp5', category: 'restaurant', name: 'Uchi', matchType: 'you_love' },
    { id: 'tp6', category: 'movie', name: 'Past Lives', matchType: 'both_love' },
  ],
  memories: [
    { id: 'm1', title: 'We loved Odd Duck for dinner', date: new Date(Date.now() - 86400000 * 5).toISOString(), sentiment: 'loved', category: 'food' },
    { id: 'm2', title: 'Anniversary dinner was perfect', date: new Date(Date.now() - 86400000 * 30).toISOString(), sentiment: 'milestone', category: 'general' },
    { id: 'm3', title: 'Hated that new sci-fi movie', date: new Date(Date.now() - 86400000 * 12).toISOString(), sentiment: 'hated', category: 'movie' }
  ],
  lastMood: null,
  capturedSuggestions: [
    { id: 's1', snippet: 'Can you grab dog food after work?', category: 'Task', assignee: 'Partner A', privacy: 'shared', status: 'pending' },
    { id: 's2', snippet: 'We should ask your parents about Sunday dinner.', category: 'Family', assignee: 'Both', privacy: 'requires_confirmation', status: 'pending' },
  ],
};

export function useZingStore() {
  const [data, setData] = useState<ZingStoreData>(DEFAULT_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem('zing_store_v1');
        if (stored) {
          setData(JSON.parse(stored));
        } else {
          localStorage.setItem('zing_store_v1', JSON.stringify(DEFAULT_DATA));
        }
      } catch(e) {
        console.warn("Could not load Zing store from localStorage", e);
      }
      setIsLoaded(true);
    };

    load();

    const handleUpdate = () => load();
    window.addEventListener('zing_store_update', handleUpdate);
    return () => window.removeEventListener('zing_store_update', handleUpdate);
  }, []);

  const save = (newData: ZingStoreData) => {
    setData(newData);
    localStorage.setItem('zing_store_v1', JSON.stringify(newData));
    window.dispatchEvent(new Event('zing_store_update'));
  };

  const updateTasks = (tasks: ZingTask[]) => save({ ...data, tasks });
  const updateDecisions = (decisions: SharedDecision[]) => save({ ...data, decisions });
  const updateTimeline = (timeline: TimelineEvent[]) => save({ ...data, timeline });
  const updateFoodHistory = (foodDecisions: FoodDecisionHistory[]) => save({ ...data, foodDecisions });
  const updateTasteProfile = (tasteProfile: TasteOverlap[]) => save({ ...data, tasteProfile });
  const updateMemories = (memories: MemoryLog[]) => save({ ...data, memories });
  const updateMood = (mood: ZingStoreData['lastMood']) => save({ ...data, lastMood: mood });
  const updateCapturedSuggestions = (suggestions: CapturedSuggestion[]) => save({ ...data, capturedSuggestions: suggestions });
  const updateConnections = (connections: ZingConnection[]) => save({ ...data, connections });

  return {
    data,
    isLoaded,
    updateTasks,
    updateDecisions,
    updateTimeline,
    updateFoodHistory,
    updateTasteProfile,
    updateMemories,
    updateMood,
    updateCapturedSuggestions,
    updateConnections,
  };
}
