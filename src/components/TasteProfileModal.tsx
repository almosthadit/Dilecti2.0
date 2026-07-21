import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Check, Sparkles, Loader2, MessageSquare, ListChecks, Keyboard, Link2, ArrowRight, Tv, Utensils, Headphones, Globe, BookOpen, PartyPopper, Gamepad, ShoppingBag, Send, User, Database, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUserProfile } from '../hooks';

const CATEGORIES = [
  { id: 'Food', label: 'Food', icon: Utensils },
  { id: 'TV & Movies', label: 'TV & Movies', icon: Tv },
  { id: 'Music', label: 'Music', icon: Headphones },
  { id: 'Products', label: 'Products', icon: ShoppingBag },
  { id: 'Places', label: 'Places', icon: Globe },
  { id: 'Books', label: 'Books', icon: BookOpen },
  { id: 'Events', label: 'Events', icon: PartyPopper },
  { id: 'Games', label: 'Games/Sports', icon: Gamepad },
];

const SUGGESTED_PILLS: Record<string, string[]> = {
  'Food': ['Sushi', 'Pizza', 'Thai', 'Burgers', 'Vegan', 'Fine Dining', 'Street Food', 'Mexican', 'Indian'],
  'TV & Movies': ['Sci-Fi', 'Comedy', 'Drama', 'The Office', 'Inception', 'Anime', 'Documentaries', 'Thriller'],
  'Music': ['Pop', 'Rock', 'Hip Hop', 'Jazz', 'Classical', 'Electronic', 'Taylor Swift', 'The Beatles'],
  'Products': ['Apple', 'Nike', 'Sony', 'Minimalist', 'Smart Home', 'Skincare', 'Espresso Machines'],
  'Places': ['Beaches', 'Mountains', 'Tokyo', 'Paris', 'New York', 'Museums', 'Coffee Shops'],
  'Books': ['Fiction', 'Non-Fiction', 'Fantasy', 'Sci-Fi', 'Biography', 'Self-Help', 'Thriller', 'History'],
  'Events': ['Concerts', 'Festivals', 'Theater', 'Sports', 'Art Exhibits', 'Tech Conferences'],
  'Games': ['RPG', 'FPS', 'Nintendo', 'Board & Card Games', 'Puzzle', 'Indie Games', 'Strategy', 'Soccer', 'Basketball']
};

const QUIZ_QUESTIONS = [
  {
    category: 'TV & Movies',
    question: "What's your perfect weekend watch?",
    options: [
      { id: 'Sci-Fi', label: 'Mind-bending Sci-Fi', emoji: '🛸', desc: 'Space, future tech, aliens' },
      { id: 'Comedy', label: 'Light Comedy', emoji: '😂', desc: 'Sitcoms, stand-up, satire' },
      { id: 'Drama', label: 'Intense Drama', emoji: '🎭', desc: 'Character studies, emotion' },
      { id: 'Documentaries', label: 'Documentaries', emoji: '🧠', desc: 'Real-world stories, history' },
      { id: 'Anime', label: 'Anime', emoji: '⚔️', desc: 'Action, animation, shonen' },
      { id: 'Fantasy', label: 'Epic Fantasy', emoji: '🐉', desc: 'Swords, sorcery, magic' },
    ]
  },
  {
    category: 'Food',
    question: "You're treating yourself to dinner. What's the vibe?",
    options: [
      { id: 'Sushi', label: 'Sushi & Japanese', emoji: '🍣', desc: 'Fresh, precise, umami' },
      { id: 'Italian', label: 'Cozy Italian', emoji: '🍝', desc: 'Pasta, wine, comfort' },
      { id: 'Mexican', label: 'Spicy Mexican', emoji: '🌮', desc: 'Tacos, margaritas, vibrant' },
      { id: 'Burgers', label: 'Classic Burgers', emoji: '🍔', desc: 'Juicy, casual, fries' },
      { id: 'Thai', label: 'Flavorful Thai', emoji: '🍜', desc: 'Curries, noodles, spice' },
      { id: 'Fine Dining', label: 'Fine Dining', emoji: '✨', desc: 'Tasting menus, elegance' },
    ]
  },
  {
    category: 'Music',
    question: "What's playing in your headphones right now?",
    options: [
      { id: 'Pop', label: 'Upbeat Pop', emoji: '🌟', desc: 'Chart-toppers, catchy hooks' },
      { id: 'Hip Hop', label: 'Hip Hop & Rap', emoji: '🎤', desc: 'Beats, bars, storytelling' },
      { id: 'Electronic', label: 'EDM & House', emoji: '🎛️', desc: 'Dance, synths, festivals' },
      { id: 'Indie', label: 'Indie Alternative', emoji: '🎸', desc: 'Off the beaten path, acoustic' },
      { id: 'Classical', label: 'Mellow Classical', emoji: '🎻', desc: 'Focus, relax, symphonies' },
      { id: 'Rock', label: 'Classic Rock', emoji: '🤘', desc: 'Guitars, anthems, live' },
    ]
  }
];

export default function TasteProfileModal({
  isOpen,
  onClose,
  initialCategory = null
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string | null;
}) {
  const { profile, updateProfile } = useUserProfile();
  
  // Views: 'selector', 'manual', 'quiz', 'ai-interview', 'loading', 'success', 'interests'
  const [view, setView] = useState<'selector' | 'manual' | 'quiz' | 'ai-interview' | 'loading' | 'success' | 'interests'>('selector');
  
  const [category, setCategory] = useState<string>(initialCategory || 'Food');
  const [manualInput, setManualInput] = useState('');
  const [selectedPills, setSelectedPills] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Quiz state
  const [quizStep, setQuizStep] = useState(0);

  // AI Interview State
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: "Hi! I'm your Dilecti AI taste assistant. I'll automatically add anything you mention to your unified Taste Graph. What are a few of your all-time favorite movies or TV shows?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hasVocalizedInitialGreeting, setHasVocalizedInitialGreeting] = useState(false);

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (view === 'ai-interview') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      // Speak the initial greeting if not yet spoken
      const aiGreeting = messages[0]?.text;
      if (aiGreeting && !hasVocalizedInitialGreeting && 'speechSynthesis' in window) {
        setHasVocalizedInitialGreeting(true);
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiGreeting);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [messages, view, hasVocalizedInitialGreeting]);

  // Handle Speech Recognition for Manual and AI Interview
  useEffect(() => {
    let recognition: any = null;

    if (isRecording) {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            if (view === 'ai-interview') {
              setChatInput(prev => prev + finalTranscript);
            } else {
              setManualInput(prev => prev ? prev + (prev.endsWith(' ') ? '' : ' ') + finalTranscript : finalTranscript);
            }
          }
        };

        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        
        try { recognition.start(); } catch (e) { console.error(e); }
      } else {
        alert("Speech recognition isn't supported in this browser. Try Chrome or Safari.");
        setIsRecording(false);
      }
    }

    return () => {
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
    };
  }, [isRecording, view]);

  useEffect(() => {
    if (!isOpen && isRecording) {
      setIsRecording(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setManualInput('');
    setSelectedPills([]);
  };

  const handleSaveData = async (dataToAdd: string) => {
    setView('loading');
    let currentPrefs = profile?.preferences || '';
    const newPrefs = currentPrefs ? currentPrefs + '\n' + dataToAdd : dataToAdd;
    await updateProfile({ preferences: newPrefs });
    setTimeout(() => {
      setView('success');
    }, 1500);
  };

  const handleManualSubmit = () => {
    const totalInputItems = [
      ...selectedPills,
      ...manualInput.split(',').map(s => s.trim()).filter(Boolean)
    ];
    if (totalInputItems.length === 0) return;
    const addition = `${category}: ${totalInputItems.join(', ')}`;
    handleSaveData(addition);
  };

  const handleQuizSubmit = () => {
    const totalInputItems = [
      ...selectedPills,
      ...manualInput.split(',').map(s => s.trim()).filter(Boolean)
    ];
    if (totalInputItems.length === 0) {
      if (quizStep < QUIZ_QUESTIONS.length - 1) {
        setQuizStep(prev => prev + 1);
        setManualInput('');
        setSelectedPills([]);
      } else {
        setView('selector');
      }
      return;
    }

    const addition = `${QUIZ_QUESTIONS[quizStep].category}: ${totalInputItems.join(', ')}`;
    // If more steps, accumulate (mocking accumulation by just continuing for now, in real app we'd accumulate to local state)
    // We will just save immediately for the mockup demo
    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      let currentPrefs = profile?.preferences || '';
      updateProfile({ preferences: currentPrefs ? currentPrefs + '\n' + addition : addition });
      setQuizStep(prev => prev + 1);
      setManualInput('');
      setSelectedPills([]);
    } else {
      handleSaveData(addition);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const newMessages = [...messages, { role: 'user' as const, text: chatInput }];
    setMessages(newMessages);
    setChatInput('');
    setIsRecording(false);
    
    // Stop any ongoing speech when user sends a new message
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const response = await fetch('/api/taste-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await response.json().catch(() => ({}));
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        
        // Speak the AI's response aloud
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.reply);
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I had a little trouble thinking just then. Could you repeat that?" }]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl h-[85vh] max-h-[800px] shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden dark:bg-[#1a1a1a]">
        
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pointer-events-none">
          {view !== 'selector' && view !== 'loading' && view !== 'success' && (
            <button 
              onClick={() => {
                setView('selector');
                setMessages([{ role: 'ai', text: "Hi! I'm your Dilecti AI taste assistant. I'll automatically add anything you mention to your unified Taste Graph. What are a few of your all-time favorite movies or TV shows?" }]);
                setQuizStep(0);
                setSelectedPills([]);
                setManualInput('');
              }}
              className="px-4 py-2 bg-black/5 hover:bg-black/10 rounded-full text-sm font-medium transition-colors pointer-events-auto backdrop-blur-md dark:bg-white/5"
            >
              Switch Method
            </button>
          )}
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-neutral-600 transition-colors pointer-events-auto backdrop-blur-md ml-auto dark:text-neutral-400 dark:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full relative">
          
          {/* =====================
              PATH SELECTOR VIEW
             ===================== */}
          {view === 'selector' && (
            <div className="p-8 md:p-12 pt-20 h-full flex flex-col">
              <div className="text-center flex flex-col items-center mb-10">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 dark:bg-emerald-900">
                  <Sparkles className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-neutral-900 mb-2 dark:text-white">Enhance Taste Profile</h2>
                <p className="text-neutral-500 max-w-md dark:text-neutral-400">Choose how you'd like to share your favorites and let our AI build your unified Taste Graph.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto w-full">
                <button 
                  onClick={() => setView('ai-interview')}
                  className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col gap-3 group dark:bg-[#1a1a1a] dark:border-white/10"
                >
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform dark:text-emerald-400 dark:bg-emerald-950">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">AI Interview</h3>
                    <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Have a natural conversation. The AI extracts and graph your tastes automatically.</p>
                  </div>
                </button>

                <button 
                  onClick={() => setView('quiz')}
                  className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col gap-3 group dark:bg-[#1a1a1a] dark:border-white/10"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Quick Quiz</h3>
                    <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Rapid-fire guided questions with smart multi-select pills.</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                     window.dispatchEvent(new CustomEvent('open-import', { detail: { mode: 'ai-memory' } }));
                     onClose();
                  }}
                  className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-indigo-500 hover:shadow-md transition-all text-left flex flex-col gap-3 group dark:bg-[#1a1a1a] dark:border-white/10"
                >
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Migrate Memory</h3>
                    <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Import your past conversations or context from other AI systems.</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                     window.dispatchEvent(new CustomEvent('open-import', { detail: { mode: 'upload' } }));
                     onClose();
                  }}
                  className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col gap-3 group dark:bg-[#1a1a1a] dark:border-white/10"
                >
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Upload Lists</h3>
                    <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Import CSV files or lists of your past activity to rapidly build your profile.</p>
                  </div>
                </button>

                <button 
                  onClick={() => setView('manual')}
                  className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-purple-500 hover:shadow-md transition-all text-left flex flex-col gap-3 group dark:bg-[#1a1a1a] dark:border-white/10"
                >
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Keyboard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Manual Entry</h3>
                    <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Directly select categories and enter exactly what you want.</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                     window.dispatchEvent(new CustomEvent('open-settings', { detail: 'demographics' }));
                     onClose();
                  }}
                  className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-orange-500 hover:shadow-md transition-all text-left flex flex-col gap-3 group dark:bg-[#1a1a1a] dark:border-white/10"
                >
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Demographics</h3>
                    <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Provide your background so the AI can refine recommendations.</p>
                  </div>
                </button>

                <button 
                  onClick={() => setView('interests')}
                  className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-pink-500 hover:shadow-md transition-all text-left flex flex-col gap-3 group md:col-span-2 dark:bg-[#1a1a1a] dark:border-white/10"
                >
                  <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Specific Interests</h3>
                    <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Manage tagged topics, genres, or niche search subjects you want specifically curated for you.</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* =====================
              MANUAL ENTRY VIEW
             ===================== */}
          {view === 'manual' && (
            <div className="p-8 md:p-12 pt-20">
              <div className="mb-6">
                <h2 className="font-serif text-3xl font-bold text-neutral-900 mb-6 dark:text-white">Manual Entry</h2>
                
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCategoryChange(c.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap",
                        category === c.id 
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" 
                          : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                      )}
                    >
                      <c.icon className="w-4 h-4" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {(SUGGESTED_PILLS[category] || []).length > 0 && (
                  <div className="space-y-3">
                     <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Tappable Quick Picks</p>
                     <div className="flex flex-wrap gap-2">
                       {SUGGESTED_PILLS[category].map(pill => {
                         const isSelected = selectedPills.includes(pill);
                         return (
                           <button
                             key={pill}
                             onClick={() => setSelectedPills(prev => prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill])}
                             className={cn(
                               "px-4 py-2 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                               isSelected 
                                 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                                 : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 dark:bg-[#1a1a1a] dark:text-neutral-300 dark:border-neutral-800 dark:hover:bg-neutral-800"
                             )}
                           >
                             {isSelected && <Check className="w-3.5 h-3.5" />}
                             {pill}
                           </button>
                         );
                       })}
                     </div>
                  </div>
                )}

                <div className="space-y-3">
                   <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Other (Type or Speak)</p>
                   <div className="relative">
                     <textarea
                       value={manualInput}
                       onChange={(e) => setManualInput(e.target.value)}
                       placeholder={`Add any other ${category} favorites...`}
                       className="w-full h-32 p-4 pb-14 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-neutral-900 placeholder:text-neutral-400 shadow-sm dark:bg-[#1a1a1a] dark:text-white dark:border-white/10"
                     />
                     <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                       <button
                         onClick={() => setIsRecording(!isRecording)}
                         className={cn(
                           "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm border",
                           isRecording 
                             ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                             : "bg-neutral-100 text-neutral-700 border-transparent hover:bg-neutral-200"
                         )}
                       >
                         <Mic className={cn("w-4 h-4", isRecording ? "text-white" : "text-blue-500")} />
                         {isRecording ? "Listening..." : "Speak"}
                       </button>
                       <span className="text-xs text-neutral-400 font-medium dark:text-neutral-500">Use commas to separate</span>
                     </div>
                   </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleManualSubmit}
                    disabled={manualInput.trim().length === 0 && selectedPills.length === 0}
                    className="w-full bg-neutral-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Save {category} to Taste Graph
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================
              QUICK QUIZ VIEW
             ===================== */}
          {view === 'quiz' && (
            <div className="p-8 md:p-12 pt-20 h-full flex flex-col">
              <div className="mb-6 text-center px-4">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold tracking-widest uppercase rounded-full mb-3">
                  Quick Quiz ({quizStep + 1} of {QUIZ_QUESTIONS.length})
                </span>
                <h2 className="font-serif text-3xl md:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight dark:text-white">
                  {QUIZ_QUESTIONS[quizStep].question}
                </h2>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-6 animate-in fade-in slide-in-from-right-8 py-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-4xl mx-auto w-full">
                  {QUIZ_QUESTIONS[quizStep].options.map(opt => {
                    const isSelected = selectedPills.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedPills(prev => prev.includes(opt.id) ? prev.filter(p => p !== opt.id) : [...prev, opt.id])}
                        className={cn(
                          "p-4 md:p-5 text-left rounded-2xl border-2 transition-all group relative overflow-hidden",
                          isSelected 
                            ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200 ring-offset-1"
                            : "border-black/5 bg-white hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-in zoom-in">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div className="text-3xl md:text-4xl mb-2 md:mb-3 filter drop-shadow-sm group-hover:scale-110 transition-transform origin-left">{opt.emoji}</div>
                        <div className="font-bold text-neutral-900 group-hover:text-blue-700 transition-colors text-sm md:text-base leading-tight mb-1 dark:text-white">{opt.label}</div>
                        <div className="text-xs text-neutral-500 line-clamp-2 md:line-clamp-1 dark:text-neutral-400">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="max-w-2xl mx-auto w-full pt-2">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative">
                      <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Add anything else not listed above..."
                        className="w-full p-4 pr-16 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-neutral-900 shadow-sm font-medium text-sm md:text-base transition-shadow dark:bg-[#1a1a1a] dark:text-white dark:border-white/10"
                      />
                      <button
                        onClick={() => setIsRecording(!isRecording)}
                        className={cn(
                          "absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-lg transition-colors",
                          isRecording ? "bg-rose-500 text-white animate-pulse" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                        )}
                        title="Voice Input"
                      >
                        <Mic className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  onClick={handleQuizSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 transform active:scale-95"
                >
                  {quizStep < QUIZ_QUESTIONS.length - 1 ? 'Next Question' : 'Finish & Save'} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* =====================
              AI INTERVIEW VIEW
             ===================== */}
          {view === 'ai-interview' && (
            <div className="flex flex-col h-full pt-16">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'ai' ? "justify-start" : "justify-end")}>
                    <div className={cn(
                      "max-w-[85%] rounded-3xl p-4 md:p-5 text-sm md:text-base leading-relaxed shadow-sm",
                      msg.role === 'ai' 
                        ? "bg-white border border-neutral-200 text-neutral-900 rounded-tl-none font-medium text-lg" 
                        : "bg-emerald-600 text-white rounded-tr-none font-medium"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-neutral-200 pointer-events-auto shrink-0 dark:bg-[#1a1a1a] dark:border-white/10">
                <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-neutral-100 rounded-[2rem] p-2 border border-neutral-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all dark:bg-neutral-800 dark:border-white/10">
                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={cn(
                      "w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-colors",
                      isRecording ? "bg-rose-500 text-white animate-pulse" : "bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                    )}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <textarea 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
                    }}
                    placeholder="Type or speak your thoughts..."
                    className="flex-1 bg-transparent border-none py-3 px-2 focus:outline-none resize-none max-h-32 text-neutral-900 font-medium dark:text-white"
                    rows={1}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim()}
                    className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                </div>
                <div className="text-center mt-3">
                  <button 
                    onClick={() => {
                      const transcript = messages.filter(m => m.role === 'user').map(m => m.text).join(' | ');
                      handleSaveData(`AI Interview Data: ${transcript}`);
                    }} 
                    className="text-xs font-bold text-neutral-500 uppercase tracking-widest hover:text-emerald-600 transition-colors dark:text-neutral-400"
                  >
                    End Interview & Save Taste Graph
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================
              LOADING & SUCCESS
             ===================== */}
          {/* =====================
              INTERESTS ENTRY VIEW
             ===================== */}
          {view === 'interests' && (
            <div className="p-8 md:p-12 pt-20 flex flex-col h-full overflow-hidden">
              <div className="mb-6 flex-shrink-0">
                <button 
                  onClick={() => setView('selector')}
                  className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mb-6 dark:text-neutral-400"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" /> Back to options
                </button>
                <h2 className="font-serif text-3xl font-bold text-neutral-900 mb-2 dark:text-white">Specific Interests</h2>
                <p className="text-neutral-500 mb-6 dark:text-neutral-400">Manage explicit topics, genres, or niches you are interested in. Dilecti uses these to prioritize recommendations for you.</p>
                
                <div className="relative mb-8">
                   <div className="flex bg-white rounded-xl shadow-sm border border-neutral-200 p-1 dark:bg-[#1a1a1a] dark:border-white/10">
                      <input 
                         type="text"
                         value={chatInput}
                         onChange={(e) => setChatInput(e.target.value)}
                         placeholder="Add an interest (e.g. 'Cyberpunk', 'Japanese Cuisine')"
                         className="flex-1 bg-transparent px-4 py-3 outline-none text-neutral-900 placeholder:text-neutral-400 dark:text-white"
                         onKeyDown={(e) => {
                            if (e.key === 'Enter' && chatInput.trim()) {
                               const newInterests = [...(profile?.interests || []), chatInput.trim()];
                               updateProfile({ interests: newInterests });
                               setChatInput('');
                            }
                         }}
                      />
                      <button 
                         onClick={() => {
                            if (chatInput.trim()) {
                               const newInterests = [...(profile?.interests || []), chatInput.trim()];
                               updateProfile({ interests: newInterests });
                               setChatInput('');
                            }
                         }}
                         className="bg-neutral-900 text-white rounded-lg px-6 py-2 font-medium hover:bg-black transition-colors"
                      >
                         Add
                      </button>
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                 {(!profile?.interests || profile.interests.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                       <Sparkles className="w-12 h-12 text-neutral-200 mb-4" />
                       <h3 className="text-lg font-bold text-neutral-900 mb-1 dark:text-white">No specific interests yet</h3>
                       <p className="text-neutral-500 max-w-sm dark:text-neutral-400">Add some specific interests above to curate your dashboard.</p>
                    </div>
                 ) : (
                    <div className="flex flex-wrap gap-2">
                       {profile.interests.map((interest, idx) => (
                          <div key={idx} className="bg-pink-50 border border-pink-100 text-pink-800 px-4 py-2 rounded-full font-medium flex items-center gap-2 group transition-colors hover:bg-pink-100">
                             {interest}
                             <button 
                                onClick={() => {
                                   const newInterests = (profile.interests || []).filter((_, i) => i !== idx);
                                   updateProfile({ interests: newInterests });
                                }}
                                className="w-5 h-5 rounded-full bg-pink-200 text-pink-600 flex items-center justify-center hover:bg-pink-300 hover:text-pink-800 transition-colors"
                             >
                                <X className="w-3 h-3" />
                             </button>
                          </div>
                       ))}
                    </div>
                 )}

                 {profile?.searchHistory && profile.searchHistory.length > 0 && (
                     <div className="mt-12">
                         <h3 className="text-xl font-bold text-neutral-900 mb-4 dark:text-white">Search History</h3>
                         <div className="space-y-4">
                             {profile.searchHistory.map((history, idx) => (
                                 <div key={idx} className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4 dark:bg-[#1a1a1a] dark:border-white/5">
                                     <p className="text-neutral-900 dark:text-white font-medium mb-1">"{history.query}"</p>
                                     <p className="text-xs text-neutral-400 mb-3">{new Date(history.timestamp).toLocaleString()}</p>
                                     {history.extractedInterests && history.extractedInterests.length > 0 && (
                                         <div className="flex flex-wrap gap-2 mt-2">
                                             <span className="text-xs text-neutral-500 flex items-center self-center mr-1">Derived interests:</span>
                                             {history.extractedInterests.map((ei, eIdx) => (
                                                 <span key={eIdx} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
                                                     {ei}
                                                 </span>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
              </div>
            </div>
          )}

          {view === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-6 dark:text-emerald-400" />
              <h3 className="font-serif text-3xl font-medium mb-3">Updating Taste Graph...</h3>
              <p className="text-neutral-500 dark:text-neutral-400">Normalizing entities and expanding semantic relationships.</p>
            </div>
          )}

          {view === 'success' && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in-95 p-8">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 dark:text-emerald-400 dark:bg-emerald-900">
                <Sparkles className="w-12 h-12" />
              </div>
              <h3 className="font-serif text-4xl font-bold mb-4">Taste Graph Updated!</h3>
              <p className="text-neutral-600 max-w-md mb-10 text-lg dark:text-neutral-400">
                Your profile is richer. The AI now has higher confidence in what you love.
              </p>

              <div className="flex gap-4 w-full max-w-sm">
                <button 
                  onClick={() => setView('selector')}
                  className="flex-1 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold py-4 rounded-xl transition-colors shadow-sm dark:bg-[#1a1a1a] dark:text-neutral-300 dark:border-white/10"
                >
                  Add More
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl transition-colors shadow-sm"
                >
                  Return Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
