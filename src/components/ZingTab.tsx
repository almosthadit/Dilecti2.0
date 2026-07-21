import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Heart, Sparkles, ChefHat, Calendar, CheckSquare, MessageCircle, Settings, Shield, PlusCircle, CalendarPlus, Activity, Check, X, ThumbsUp, ThumbsDown, Utensils, Zap, Inbox, DollarSign, Clock, HelpCircle, Navigation } from 'lucide-react';
import { ZingConnection, CoupleWidgetSettings } from '../types';
import { useZingStore, ZingTask, FoodDecisionHistory, CapturedSuggestion, SharedDecision, TimelineEvent } from '../lib/zingStore';

// Mock Data
export const MOCK_PARTNER: ZingConnection = {
  id: 'conn_1',
  name: 'Alyssa',
  relationshipType: 'partner',
  status: 'active',
  sharedCategories: ['food', 'places', 'movies', 'events'],
  permissionTemplate: {
    canSee: ['food', 'places', 'calendar', 'goals', 'chores', 'mood'],
    aiCanUseSilently: ['allergies', 'budget_limits'],
    aiCanReveal: ['general_preferences'],
    requiresConfirmation: ['conflict', 'intimacy'],
    neverShareable: ['private_journal'],
  },
  aiUsageSettings: { silentFilteringEnabled: true, explicitRevealEnabled: true },
};

export const MOCK_FRIENDS: ZingConnection[] = [
  {
    id: 'conn_2',
    name: 'Justin',
    relationshipType: 'close_friend',
    status: 'active',
    sharedCategories: ['movies', 'games'],
    permissionTemplate: {
      canSee: ['movies', 'games', 'public_favorites'],
      aiCanUseSilently: [],
      aiCanReveal: [],
      requiresConfirmation: [],
      neverShareable: ['finance', 'mood', 'intimacy'],
    },
    aiUsageSettings: { silentFilteringEnabled: false, explicitRevealEnabled: false },
  }
];

export function CoupleModeDashboardView({ onBack, partner }: { onBack: () => void, partner: ZingConnection }) {
  return (
    <div className="pt-24 px-4 sm:px-6 md:px-8 pb-32 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-black/50 hover:text-black/80 font-bold dark:text-white/50">&larr; Back</button>
      </div>
      <TodayTogetherDashboard partner={partner} />
    </div>
  );
}

// --- COUPLE MODE COMPONENTS ---

export function TodayTogetherDashboard({ partner }: { partner: ZingConnection }) {
  const store = useZingStore();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');

  if (!store.isLoaded) {
    return <div className="py-20 text-center text-black/50 font-medium animate-pulse dark:text-white/50">Loading dashboard...</div>;
  }

  const handleQuickAdd = () => {
    if (!quickAddText.trim()) return;
    const textLower = quickAddText.toLowerCase();
    
    // Smart Routing Logic
    if (textLower.includes('dinner') || textLower.includes('eat') || textLower.includes('restaurant') || textLower.includes('sushi') || textLower.includes('pizza')) {
       // Convert to Food Idea / Decision
       const newDecision: SharedDecision = {
         id: Date.now().toString(),
         title: quickAddText,
         type: 'food',
         status: 'pending'
       };
       store.updateDecisions([newDecision, ...store.data.decisions]);
       store.updateTimeline([{ id: Date.now().toString(), title: 'Added food idea', subtitle: quickAddText, time: new Date().toISOString(), iconType: 'food' }, ...store.data.timeline]);
    } else if (textLower.includes('weekend') || textLower.includes('vacation') || textLower.includes('trip') || textLower.includes('date')) {
       // Convert to Shared Decision
       const newDecision: SharedDecision = {
         id: Date.now().toString(),
         title: quickAddText,
         type: textLower.includes('date') ? 'date' : 'weekend',
         status: 'pending'
       };
       store.updateDecisions([newDecision, ...store.data.decisions]);
       store.updateTimeline([{ id: Date.now().toString(), title: 'Added a plan to discuss', subtitle: quickAddText, time: new Date().toISOString(), iconType: 'decision' }, ...store.data.timeline]);
    } else {
       // Default to Task
       const newTask: ZingTask = {
         id: Date.now().toString(),
         text: quickAddText,
         owner: 'Unassigned',
         done: false,
         effort: 'normal',
         type: 'task'
       };
       store.updateTasks([newTask, ...store.data.tasks]);
       store.updateTimeline([{ id: Date.now().toString(), title: 'Added a task', subtitle: quickAddText, time: new Date().toISOString(), iconType: 'task' }, ...store.data.timeline]);
    }
    
    setQuickAddText('');
    setShowQuickAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-400 to-orange-300 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xl">
            {partner.name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight dark:text-white">Today Together</h2>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Couple Mode with {partner.name}</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors dark:text-neutral-400 dark:bg-neutral-800">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:grid-cols-3">
        {/* Core Daily Essentials */}
        <AICoupleBrief store={store} partner={partner} />
        <FoodDecisionWidget store={store} partner={partner} />
        <SharedDecisionsWidget store={store} partner={partner} />
        
        <CoupleTimelineWidget store={store} partner={partner} />
        
        {/* Mood/Support Check-in */}
        <MoodCheckInWidget store={store} partner={partner} />

        {/* Quick Add Widget */}
        {!showQuickAdd ? (
          <div onClick={() => setShowQuickAdd(true)} className="bg-neutral-900 rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center items-center text-center cursor-pointer hover:bg-neutral-800 transition-colors group">
             <PlusCircle className="w-8 h-8 text-neutral-400 mb-2 group-hover:scale-110 transition-transform dark:text-neutral-500" />
             <h3 className="font-bold text-white mb-1">Quick Add</h3>
             <p className="text-sm text-neutral-400 dark:text-neutral-500">Capture a task, idea, or reminder</p>
          </div>
        ) : (
          <div className="bg-neutral-900 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <h3 className="font-bold text-white mb-3">Quick Add</h3>
            <textarea
              autoFocus
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              placeholder="e.g. Call contractor tomorrow..."
              className="w-full bg-white/10 text-white placeholder-white/40 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowQuickAdd(false)} className="flex-1 px-3 py-2 text-white/70 hover:text-white font-semibold text-sm">Cancel</button>
              <button onClick={handleQuickAdd} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-3 py-2 text-sm shadow-sm transition-colors">Save</button>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <SharedTasteWidget store={store} partner={partner} />
        <RelationshipMemoryWidget store={store} partner={partner} />
      </div>

      {/* Captured Suggestions Tray */}
      {store.data.capturedSuggestions.length > 0 && (
        <CapturedSuggestionsTray store={store} />
      )}
      
      <div className="pt-4 pb-8 flex justify-end border-t border-black/5 mt-8 dark:border-white/5">
        <button className="flex border border-neutral-200 bg-white items-center gap-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 px-5 py-2.5 rounded-full transition-colors shadow-sm dark:bg-[#1a1a1a] dark:text-neutral-400 dark:border-white/10">
          <Settings className="w-4 h-4" /> Couple Widgets Settings
        </button>
      </div>
    </div>
  );
}

function AICoupleBrief({ store, partner }: { store: ReturnType<typeof useZingStore>, partner: ZingConnection }) {
  const currentHour = new Date().getHours();
  const isMorning = currentHour < 16;

  const pendingTasks = store.data.tasks.filter(t => !t.done);
  const completedTasks = store.data.tasks.filter(t => t.done);
  const pendingDecisions = store.data.decisions.filter(d => d.status === 'pending');
  const hasFoodDecision = store.data.foodDecisions.length > 0 && new Date(store.data.foodDecisions[0].date).toDateString() === new Date().toDateString();
  const needMoodSupport = store.data.lastMood?.text === 'Need Support';

  return (
    <div className="bg-gradient-to-br from-indigo-900/95 to-purple-900/95 rounded-2xl p-5 text-white shadow-sm border border-indigo-800 relative overflow-hidden md:col-span-2 lg:col-span-1">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-32 h-32" />
      </div>
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-300" />
          <h3 className="font-bold text-indigo-100">{isMorning ? 'Morning Brief' : 'Evening Brief'}</h3>
        </div>
        <div className="text-sm text-indigo-50/90 leading-relaxed space-y-3 mb-4">
          {isMorning ? (
            <>
              <p>
                Good morning. {pendingDecisions.length > 0 ? `We have ${pendingDecisions.length} decisions waiting on us today, starting with: ` : 'Clear skies today. '}
                {pendingDecisions.length > 0 && <><strong className="text-white">{pendingDecisions[0].title.toLowerCase()}</strong>.</>}
              </p>
              <p>
                {hasFoodDecision ? 'Dinner is already decided. ' : 'Dinner is undecided. '}
                There are {pendingTasks.length} active tasks today.
              </p>
              {needMoodSupport && (
                <p className="text-rose-300 font-medium">Please note your partner requested support.</p>
              )}
            </>
          ) : (
            <>
              <p>
                Good evening. We knocked out {completedTasks.length} {completedTasks.length === 1 ? 'task' : 'tasks'} today.
              </p>
              <p>
                {hasFoodDecision ? 'Dinner is locked in. ' : 'Dinner is still undecided, consider throwing out an idea. '}
                {pendingDecisions.length > 0 && `We still need to figure out ${pendingDecisions[0].title.toLowerCase()}.`}
              </p>
              {needMoodSupport && (
                <p className="text-rose-300 font-medium">Please afford your partner extra grace tonight.</p>
              )}
            </>
          )}
        </div>
        <div className="mt-auto bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-indigo-100 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            {isMorning ? 'Connection moment: Leave a sticky note on the mirror.' : 'Connection moment: Thank each other for one thing.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function FoodDecisionWidget({ store, partner }: { store: ReturnType<typeof useZingStore>, partner: ZingConnection }) {
  const [decision, setDecision] = useState<'pending' | 'voted' | 'decided' | 'rating'>('pending');
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  // Modes
  const modes = [
    { id: 'Date Night', icon: <Sparkles className="w-4 h-4 text-purple-500" /> },
    { id: 'Fastest', icon: <Zap className="w-4 h-4 text-amber-500" /> },
    { id: 'Healthiest', icon: <Heart className="w-4 h-4 text-emerald-500" /> },
    { id: 'Cheapest', icon: <DollarSign className="w-4 h-4 text-green-600" /> }
  ];

  // Check if today already has a decision in history
  const todayDecision = store.data.foodDecisions.find(fd => new Date(fd.date).toDateString() === new Date().toDateString());

  useEffect(() => {
    if (todayDecision) {
      if (todayDecision.rating === 'none') {
        setDecision('rating');
      } else {
        setDecision('decided');
      }
    } else {
      setDecision('pending');
    }
  }, [todayDecision]);

  const handleDecideForUs = (mode?: string) => {
    const vibeToUse = mode || 'Surprise';
    const result = vibeToUse === 'Healthiest' ? 'Sweetgreen \uD83E\uDD57' : vibeToUse === 'Cheapest' ? 'Tacos \uD83C\uDF2E' : vibeToUse === 'Date Night' ? 'Italian \uD83C\uDF5D' : 'Thai Basil \uD83C\uDF3F';
    
    const newDecision: FoodDecisionHistory = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      vibe: vibeToUse,
      result: result,
      rating: 'none'
    };
    store.updateFoodHistory([newDecision, ...store.data.foodDecisions]);
    store.updateTimeline([{ id: Date.now().toString(), title: 'Decided on Dinner', subtitle: result, time: new Date().toISOString(), iconType: 'food' }, ...store.data.timeline]);
  };

  const handleRate = (rating: 'up' | 'down') => {
    if (!todayDecision) return;
    const updated = store.data.foodDecisions.map(fd => fd.id === todayDecision.id ? { ...fd, rating } : fd);
    store.updateFoodHistory(updated);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col relative overflow-hidden group dark:bg-[#1a1a1a] dark:border-white/10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Food Decision</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full dark:text-neutral-500 dark:bg-neutral-800">Tonight</span>
      </div>
      
      {decision === 'pending' && (
        <div className="flex-1 flex flex-col z-10">
          <p className="text-sm font-medium text-neutral-600 mb-3 dark:text-neutral-400">Decision Modes</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {modes.map(mode => (
              <button 
                key={mode.id}
                onClick={() => handleDecideForUs(mode.id)} 
                className="text-sm font-medium py-2 rounded-xl border bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700 transition-colors flex items-center justify-center gap-1.5 dark:text-neutral-300 dark:bg-neutral-800/50 dark:border-white/10"
              >
                {mode.icon} {mode.id}
              </button>
            ))}
          </div>
          <button onClick={() => handleDecideForUs('Surprise')} className="mt-auto bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
            <Sparkles className="w-4 h-4 text-orange-300" /> Surprise Us
          </button>
        </div>
      )}

      {decision === 'voted' && (
         <div className="flex-1 flex items-center justify-center flex-col text-center z-10">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-2 shadow-inner">
               <Activity className="w-5 h-5 text-orange-600 animate-pulse" />
            </div>
            <p className="font-bold text-neutral-900 dark:text-white">Waiting for {partner.name}...</p>
            <p className="text-xs text-neutral-500 font-medium mt-1 dark:text-neutral-400">You voted: {selectedVibe}</p>
         </div>
      )}

      {(decision === 'rating' || decision === 'decided') && todayDecision && (
        <div className="flex-1 flex flex-col z-10">
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <h4 className="font-bold text-neutral-900 text-xl tracking-tight mb-1 dark:text-white">{todayDecision.result}</h4>
            
            <div className="bg-orange-50/50 rounded-lg p-3 text-left mt-3 border border-orange-100/50">
              <p className="text-[11px] leading-relaxed text-orange-900/80 font-medium">
                <strong className="text-orange-900">Fairness Engine:</strong> You picked Pizza yesterday. Alyssa picked Greek last time. {todayDecision.result.split(' ')[0]} fits both your active cravings and hasn't been chosen in 14 days.
              </p>
            </div>
            
            {decision === 'rating' ? (
              <div className="mt-4 w-full">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 dark:text-neutral-500">Rate this choice</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => handleRate('down')} className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors dark:text-neutral-400 dark:bg-neutral-800/50 dark:border-white/10">
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRate('up')} className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-colors dark:text-neutral-400 dark:bg-neutral-800/50 dark:border-white/10">
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full dark:text-emerald-400 dark:bg-emerald-950">
                <Check className="w-3.5 h-3.5" /> Rated {todayDecision.rating === 'up' ? 'Good' : 'Bad'}
              </div>
            )}
          </div>
          
          <div className="mt-auto pt-3 flex justify-center border-t border-black/5 dark:border-white/5">
              <button onClick={() => store.updateFoodHistory(store.data.foodDecisions.filter(fd => fd.id !== todayDecision.id))} className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 uppercase tracking-wider dark:text-neutral-500">Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SharedDecisionsWidget({ store, partner }: { store: ReturnType<typeof useZingStore>, partner: ZingConnection }) {
  const pending = store.data.decisions.filter(d => d.status === 'pending');
  const resolved = store.data.decisions.filter(d => d.status === 'resolved');
  
  const displayDecisions = [...pending, ...resolved].slice(0, 4);

  const resolveDecision = (id: string) => {
     store.updateDecisions(store.data.decisions.map(d => d.id === id ? { ...d, status: 'resolved', resolvedValue: 'Discussed' } : d));
     const dec = store.data.decisions.find(d => d.id === id);
     if (dec) {
        store.updateTimeline([{ id: Date.now().toString(), title: 'Resolved a decision', subtitle: dec.title, time: new Date().toISOString(), iconType: 'decision' }, ...store.data.timeline]);
     }
  };

  const suggestDecision = (id: string, type: 'food' | 'weekend' | 'vacation' | 'gift' | 'date' | 'general' | 'movie') => {
    let suggestion = 'Maybe a picnic?';
    let reasoning = 'You both enjoy outdoors.';
    
    if (type === 'vacation') {
      suggestion = 'Tokyo, Japan';
      reasoning = 'You both have Tokyo in your "Explore" travel lists for this year.';
    } else if (type === 'movie') {
      suggestion = 'Dune: Part Two';
      reasoning = 'Both of you highly rated the first one and love sci-fi.';
    } else if (type === 'food') {
      suggestion = 'Uchi Sushi';
      reasoning = 'Alyssa picked it last time, but you both love it and haven\'t been in 2 months.';
    } else if (type === 'weekend') {
      suggestion = 'Bouldering';
      reasoning = 'Alyssa loves it, and you\'ve been wanting to try more active dates.';
    } else if (type === 'gift') {
      suggestion = 'Coffee Subscription';
      reasoning = 'They have "Specialty Coffee" listed heavily in their Explore interests.';
    } else if (type === 'date') {
      suggestion = 'Pottery Class';
      reasoning = 'Both of you saved a reel about local pottery classes recently.';
    }

    store.updateDecisions(store.data.decisions.map(d => d.id === id ? { ...d, status: 'resolved', resolvedValue: suggestion, tasteReasoning: reasoning } : d));
    const dec = store.data.decisions.find(d => d.id === id);
    if (dec) {
      store.updateTimeline([{ id: Date.now().toString(), title: 'Used Taste Suggestion', subtitle: dec.title, time: new Date().toISOString(), iconType: 'decision' }, ...store.data.timeline]);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col md:col-span-2 lg:col-span-1 min-h-[300px] dark:bg-[#1a1a1a] dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Waiting on Us</h3>
        </div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider dark:text-neutral-500">{pending.length} unresolved</p>
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {displayDecisions.length === 0 ? (
          <div className="text-center text-sm font-medium text-neutral-400 py-4 dark:text-neutral-500">No decisions waiting.</div>
        ) : (
          displayDecisions.map(dec => (
            <div key={dec.id} className={`flex flex-col gap-2 group ${dec.status === 'resolved' ? 'opacity-70' : ''}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => resolveDecision(dec.id)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${dec.status === 'resolved' ? 'bg-indigo-500 border-indigo-500' : 'border-neutral-300 hover:border-indigo-400'}`}>
                  {dec.status === 'resolved' && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                   <p className={`text-sm font-bold transition-colors line-clamp-1 ${dec.status === 'resolved' ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>{dec.title}</p>
                   {dec.status === 'pending' && (
                     <div className="flex items-center gap-2 mt-1.5">
                       <button onClick={() => suggestDecision(dec.id, dec.type)} className="text-[10px] bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-indigo-100 transition-colors dark:bg-indigo-950">
                         <Sparkles className="w-3 h-3" /> Taste Match
                       </button>
                     </div>
                   )}
                   {dec.status === 'resolved' && dec.resolvedValue && (
                     <div className="mt-1.5 bg-neutral-50 rounded-lg p-2.5 border border-neutral-100 dark:bg-neutral-800/50 dark:border-white/5">
                       <p className="text-xs font-bold text-neutral-800 mb-0.5 dark:text-neutral-200">{dec.resolvedValue}</p>
                       {dec.tasteReasoning && (
                         <p className="text-[10px] leading-tight text-neutral-500 font-medium dark:text-neutral-400">
                           <span className="font-bold text-indigo-500 mr-1">Overlap:</span>
                           {dec.tasteReasoning}
                         </p>
                       )}
                     </div>
                   )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.elements.namedItem('newDecision') as HTMLInputElement;
            if (!input.value.trim()) return;
            const title = input.value.trim();
            const textLower = title.toLowerCase();
            let type: 'food' | 'weekend' | 'vacation' | 'gift' | 'date' | 'general' | 'movie' = 'general';
            if (textLower.includes('weekend')) type = 'weekend';
            if (textLower.includes('vacation') || textLower.includes('trip')) type = 'vacation';
            if (textLower.includes('food') || textLower.includes('eat') || textLower.includes('dinner')) type = 'food';
            if (textLower.includes('gift')) type = 'gift';
            if (textLower.includes('date')) type = 'date';
            if (textLower.includes('movie')) type = 'movie';

            const newDec: SharedDecision = {
              id: Date.now().toString(),
              title,
              type,
              status: 'pending'
            };
            store.updateDecisions([newDec, ...store.data.decisions]);
            store.updateTimeline([{ id: Date.now().toString(), title: 'Added a decision', subtitle: title, time: new Date().toISOString(), iconType: 'decision' }, ...store.data.timeline]);
            input.value = '';
          }}
          className="flex items-center gap-2"
        >
          <input 
            type="text" 
            name="newDecision" 
            placeholder="Add decision (e.g. Movies tonight)" 
            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:bg-neutral-800/50 dark:border-white/10"
          />
          <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg p-2 font-bold transition-colors">
            <PlusCircle className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function CoupleTimelineWidget({ store, partner }: { store: ReturnType<typeof useZingStore>, partner: ZingConnection }) {
   const timeline = store.data.timeline.slice(0, 5); // limit to 5
   
   return (
     <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col dark:bg-[#1a1a1a] dark:border-white/10">
       <div className="flex items-center gap-2 mb-4">
         <Navigation className="w-5 h-5 text-sky-500" />
         <h3 className="font-bold text-neutral-900 dark:text-white">Activity Stream</h3>
       </div>
       <div className="space-y-4 flex-1">
          {timeline.length === 0 ? (
             <div className="text-sm font-medium text-neutral-400 text-center py-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 h-full flex flex-col items-center justify-center p-4 dark:text-neutral-500 dark:bg-neutral-800/50 dark:border-white/10">Activity will appear here once you start using Couple Mode.</div>
          ) : (
             timeline.map(event => (
               <div key={event.id} className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 dark:bg-neutral-800">
                    {event.iconType === 'task' && <CheckSquare className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />}
                    {event.iconType === 'decision' && <HelpCircle className="w-4 h-4 text-indigo-500" />}
                    {event.iconType === 'mood' && <Heart className="w-4 h-4 text-rose-500" />}
                    {event.iconType === 'food' && <Utensils className="w-4 h-4 text-orange-500" />}
                    {event.iconType === 'alert' && <Zap className="w-4 h-4 text-amber-500" />}
                 </div>
                 <div className="pt-1.5 flex flex-col">
                    <p className="text-xs font-medium text-neutral-800 leading-tight block dark:text-neutral-200">{event.title}</p>
                    {event.subtitle && <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1 dark:text-neutral-400">{event.subtitle}</p>}
                 </div>
               </div>
             ))
          )}
       </div>
     </div>
   );
}

function MoodCheckInWidget({ store, partner }: { store: ReturnType<typeof useZingStore>, partner: ZingConnection }) {
  const { lastMood } = store.data;
  // Reset if from yesterday (mocking logic)
  const isToday = lastMood && new Date(lastMood.time).toDateString() === new Date().toDateString();

  const handleMood = (text: string) => {
    store.updateMood({ text, note: null, time: new Date().toISOString() });
    store.updateTimeline([{ id: Date.now().toString(), title: `Checked in as ${text}`, time: new Date().toISOString(), iconType: 'mood' }, ...store.data.timeline]);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col justify-between dark:bg-[#1a1a1a] dark:border-white/10">
      <div>
         <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-2">
             <Heart className="w-5 h-5 text-rose-500" />
             <h3 className="font-bold text-neutral-900 dark:text-white">Health & Support</h3>
           </div>
         </div>
         {isToday && lastMood ? (
           <div className={`rounded-xl p-4 border text-sm font-medium ${ lastMood.text === 'Need Support' ? 'bg-rose-50 border-rose-100 text-rose-900' : lastMood.text === 'Need Space' ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-emerald-50 border-emerald-100 text-emerald-900' } dark:border-emerald-900`}>
             You checked in as <strong>{lastMood.text}</strong>. {partner.name} has been notified.
           </div>
         ) : (
           <p className="text-sm text-neutral-500 mb-4 font-medium dark:text-neutral-400">How are you feeling right now?</p>
         )}
      </div>
      {!(isToday && lastMood) && (
        <div className="flex flex-wrap gap-2 mt-4">
          {['All Good', 'Need Support', 'Need Space'].map(m => (
            <button 
              key={m} 
              onClick={() => handleMood(m)}
              className="bg-neutral-50 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm dark:text-neutral-300 dark:bg-neutral-800/50 dark:border-white/10"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CapturedSuggestionsTray({ store }: { store: ReturnType<typeof useZingStore> }) {
  const pending = store.data.capturedSuggestions.filter(s => s.status === 'pending');
  
  if (pending.length === 0) return null;

  const dismiss = (id: string) => {
    store.updateCapturedSuggestions(store.data.capturedSuggestions.map(s => s.id === id ? {...s, status: 'dismissed'} : s));
  };
  const save = (id: string) => {
    store.updateCapturedSuggestions(store.data.capturedSuggestions.map(s => s.id === id ? {...s, status: 'saved'} : s));
    // Provide visual feedback or directly convert to task. For now, just mark handled.
  };

  return (
    <div className="mt-8">
      <h3 className="font-bold text-neutral-900 flex items-center gap-2 mb-4 dark:text-white">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        Captured from Chat
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
        {pending.map(sugg => (
          <div key={sugg.id} className="min-w-[280px] sm:min-w-[320px] bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 snap-start shrink-0 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-100/50 px-2 py-0.5 rounded-full">{sugg.category}</span>
              {sugg.privacy === 'requires_confirmation' && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1"><Shield className="w-3 h-3" /> Private</span>
              )}
            </div>
            <p className="text-sm font-medium text-neutral-800 mb-4 line-clamp-2 dark:text-neutral-200">"{sugg.snippet}"</p>
            <div className="flex gap-2">
              <button onClick={() => dismiss(sugg.id)} className="flex-1 bg-white border border-neutral-200 text-neutral-600 text-xs font-bold py-2 rounded-xl hover:bg-neutral-50 transition-colors dark:bg-[#1a1a1a] dark:text-neutral-400 dark:border-white/10">Dismiss</button>
              <button onClick={() => save(sugg.id)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-xs font-bold py-2 rounded-xl transition-colors">Add to {sugg.category}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SharedTasteWidget({ store, partner }: { store: ReturnType<typeof useZingStore>, partner: ZingConnection }) {
  const profile = store.data.tasteProfile;
  const bothLove = profile.filter(p => p.matchType === 'both_love');
  const theyLove = profile.filter(p => p.matchType === 'they_love');
  const youLove = profile.filter(p => p.matchType === 'you_love');
  const explore = profile.filter(p => p.matchType === 'explore');

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col dark:bg-[#1a1a1a] dark:border-white/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Shared Taste</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 dark:text-neutral-500">We Both Love</h4>
          <div className="flex flex-wrap gap-2">
             {bothLove.map((item, i) => (
                <span key={`${item.id}-${i}`} className="bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                   {item.category === 'movie' ? '🎬' : item.category === 'restaurant' ? '🍽️' : '✨'} {item.name}
                </span>
             ))}
          </div>
        </div>
        
        <div>
           <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 dark:text-neutral-500">They Love</h4>
           <div className="flex flex-wrap gap-2">
             {theyLove.map((item, i) => (
                <span key={`${item.id}-${i}`} className="bg-neutral-50 border border-neutral-200 text-neutral-600 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 dark:text-neutral-400 dark:bg-neutral-800/50 dark:border-white/10">
                   {item.category === 'activity' ? '🧗' : '✨'} {item.name}
                </span>
             ))}
           </div>
        </div>

        <div>
           <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Should Explore</h4>
           <div className="flex flex-wrap gap-2">
             {explore.map((item, i) => (
                <span key={`${item.id}-${i}`} className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 dark:text-emerald-300 dark:bg-emerald-950 dark:border-emerald-900">
                   ✈️ {item.name}
                </span>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}

function RelationshipMemoryWidget({ store, partner }: { store: ReturnType<typeof useZingStore>, partner: ZingConnection }) {
  const memories = store.data.memories;

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col dark:bg-[#1a1a1a] dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Memory Log</h3>
        </div>
        <button className="text-[10px] bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold uppercase tracking-wider px-2 py-1 rounded-full transition-colors hidden sm:block dark:text-neutral-400 dark:bg-neutral-800">Add Log</button>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {memories.length === 0 ? (
          <div className="text-sm font-medium text-neutral-400 text-center py-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 h-full flex flex-col items-center justify-center p-4 dark:text-neutral-500 dark:bg-neutral-800/50 dark:border-white/10">
            <p>Your first memory is waiting to be logged.</p>
          </div>
        ) : (
          memories.map(memory => (
            <div key={memory.id} className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-100 rounded-xl dark:bg-neutral-800/50 dark:border-white/5">
             <div className="mt-0.5 shrink-0">
               {memory.sentiment === 'loved' && <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />}
               {memory.sentiment === 'hated' && <ThumbsDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
               {memory.sentiment === 'neutral' && <Check className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />}
               {memory.sentiment === 'milestone' && <Sparkles className="w-4 h-4 text-amber-500" />}
             </div>
             <div>
                <p className="text-sm font-semibold text-neutral-900 leading-snug dark:text-white">{memory.title}</p>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1 dark:text-neutral-500">
                  {new Date(memory.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
             </div>
          </div>
         ))
        )}
      </div>
    </div>
  );
}

function CalendarSnapshotWidget() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col dark:bg-[#1a1a1a] dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Schedule</h3>
        </div>
        <button title="Sync Calendar" className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500">
           <CalendarPlus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3 flex-1">
         <div className="flex items-stretch gap-3">
            <div className="w-1 bg-rose-400 rounded-full shrink-0" />
            <div>
               <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide dark:text-neutral-400">5:00 PM</p>
               <p className="text-sm font-medium text-neutral-900 dark:text-white">Daycare Pickup</p>
            </div>
         </div>
         <div className="flex items-stretch gap-3">
            <div className="w-1 bg-indigo-400 rounded-full shrink-0" />
            <div>
               <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide dark:text-neutral-400">7:30 PM</p>
               <p className="text-sm font-medium text-neutral-900 dark:text-white">Dinner @ Home</p>
            </div>
         </div>
         
         <div className="mt-4 p-3 bg-neutral-50 border border-neutral-100 rounded-lg border-dashed dark:bg-neutral-800/50 dark:border-white/5">
            <p className="text-xs text-neutral-500 text-center flex flex-col gap-1 items-center dark:text-neutral-400">
               <span>Google Calendar not connected.</span>
               <button className="text-blue-600 font-semibold hover:underline">Connect Calendar</button>
            </p>
         </div>
      </div>
    </div>
  );
}

// --- ONBOARDING COMPONENTS ---

export function CoupleOnboarding({ onComplete, onCancel }: { onComplete: () => void, onCancel: () => void }) {
  return (
    <div className="pt-24 px-4 pb-32 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
      <h1 className="text-3xl font-bold text-neutral-900 text-center tracking-tight dark:text-white">Set up Couple Mode</h1>
      <p className="text-center text-neutral-500 dark:text-neutral-400">Just a few questions to personalize your shared space. You can always change these later.</p>
      
      <div className="bg-white border border-neutral-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6 dark:bg-[#1a1a1a] dark:border-white/10">
         <div className="space-y-4">
           <div>
             <h3 className="font-bold text-neutral-900 mb-2 dark:text-white">Do you have kids?</h3>
             <select className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:bg-neutral-800/50 dark:border-white/10">
                <option>No</option>
                <option>Yes</option>
                <option>Expecting or planning</option>
             </select>
           </div>
           
           <div>
             <h3 className="font-bold text-neutral-900 mb-2 dark:text-white">Do you have pets?</h3>
             <select className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:bg-neutral-800/50 dark:border-white/10">
                <option>Yes</option>
                <option>No</option>
             </select>
           </div>
           
           <div>
             <h3 className="font-bold text-neutral-900 mb-2 dark:text-white">Enable specific widgets?</h3>
             <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer dark:bg-neutral-800/50 dark:border-white/10">
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">Food Decisions</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer dark:bg-neutral-800/50 dark:border-white/10">
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">Chores & Tasks</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer dark:bg-neutral-800/50 dark:border-white/10">
                  <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">Shared Finances / Bills</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer dark:bg-neutral-800/50 dark:border-white/10">
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">Intimacy & Connection</span>
                </label>
             </div>
           </div>
         </div>
         
         <div className="pt-4 border-t border-neutral-100 flex items-center justify-between dark:border-white/5">
           <button onClick={onCancel} className="text-neutral-500 font-semibold px-4 py-2 dark:text-neutral-400">Cancel</button>
           <button onClick={onComplete} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-full shadow-sm transition-colors">
             Create Dashboard
           </button>
         </div>
      </div>
    </div>
  );
}


// --- OTHER RELATIONSHIP COMPONENTS ---

export function ConnectionCard({ connection }: { connection: ZingConnection }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col dark:bg-[#1a1a1a] dark:border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 font-bold text-lg border border-neutral-200 dark:text-neutral-400 dark:bg-neutral-800 dark:border-white/10">
          {connection.name[0]}
        </div>
        <div>
          <h3 className="font-bold text-neutral-900 leading-tight dark:text-white">{connection.name}</h3>
          <p className="text-xs text-neutral-500 capitalize dark:text-neutral-400">{connection.relationshipType.replace('_', ' ')}</p>
        </div>
      </div>
      
      <div className="mt-auto space-y-3">
         <div className="bg-neutral-50 rounded-lg p-2.5 dark:bg-neutral-800/50">
           <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1 dark:text-neutral-400">Shared Categories</p>
           <div className="flex flex-wrap gap-1.5">
             {connection.sharedCategories.map(cat => (
                <span key={cat} className="bg-white border border-neutral-200 text-neutral-600 text-[10px] px-2 py-0.5 rounded-full capitalize dark:bg-[#1a1a1a] dark:text-neutral-400 dark:border-white/10">
                   {cat}
                </span>
             ))}
           </div>
         </div>
         <button className="w-full text-center text-sm font-semibold text-emerald-600 border border-emerald-100 hover:bg-emerald-50 py-2 rounded-xl transition-colors dark:text-emerald-400 dark:border-emerald-900">
            View Shared Taste
         </button>
      </div>
    </div>
  );
}

export function AddConnectionCard({ title, icon }: { title: string, icon: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer group text-center min-h-[160px] dark:bg-neutral-800/50 dark:border-white/10">
       <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform dark:bg-[#1a1a1a]">
         {icon}
       </div>
       <h3 className="font-bold text-neutral-700 group-hover:text-emerald-700 dark:text-neutral-300">{title}</h3>
    </div>
  );
}
