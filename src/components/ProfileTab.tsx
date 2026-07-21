import React, { useMemo, useState, useEffect } from 'react';
import { useUserProfile, useUserItems } from '../hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useUser } from '../context/UserContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Sparkles, Lock, Edit3, Settings2, CheckCircle, Shield, EyeOff, Trash2, Info, ThumbsDown, Loader2, RefreshCw, Copy, Share, LayoutGrid, BookOpen, Film, Music as MusicIcon, Utensils, Gamepad, User } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import TasteProfileDisplay from './TasteProfileDisplay';
import { getNormalizedCat } from '../lib/utils';
import { buildQuantitativeProfile, detectTasteContradictions, detectLatentPersonas } from '../services/tasteIntelligence';
import '../styles/dilectiProfile.css';
import { TasteGraphDisplay } from './TasteGraphDisplay';
import { ImageWithFallback } from "./ImageWithFallback";


function parseSections(markdown: string) {
    if (!markdown) return { themes: [], exploration: [] };
    
    // Support JSON format
    let parsedJson = null;
    try {
        const cleanText = markdown.trim();
        if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
           parsedJson = JSON.parse(cleanText);
        } else {
           const match = cleanText.match(/\{[\s\S]*\}/);
           if (match) {
              parsedJson = JSON.parse(match[0]);
           }
        }
    } catch(e) {}

    if (parsedJson) {
        const sections = { themes: [] as any[], exploration: [] as any[] };
        if (parsedJson.deep_dive && Array.isArray(parsedJson.deep_dive)) {
            parsedJson.deep_dive.forEach((d: any) => {
                if (d.heading && d.body) {
                    sections.themes.push({ name: d.heading, desc: d.body });
                }
            });
        }
        if (parsedJson.exploration_trajectory && Array.isArray(parsedJson.exploration_trajectory)) {
            parsedJson.exploration_trajectory.forEach((d: any) => {
                if (d.heading && d.body) {
                    sections.exploration.push({ name: d.heading, desc: d.body });
                }
            });
        }
        return sections;
    }

    const lines = markdown.split('\n');
    const sections: Record<string, {name: string, desc: string}[]> = { themes: [], exploration: [] };
    
    // Support the new format
    if (markdown.includes('## Title') || markdown.includes('## Deep Dive') || markdown.includes('## Summary') || markdown.includes('## The Hook') || markdown.includes('## TLDR')) {
        let tldr = '', hook = '', insight = '', takeaway = '', deepDive = '', currentPart = '';
        for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.startsWith('## tldr') || lower.startsWith('### tldr') || lower.startsWith('## summary') || lower.startsWith('### summary')) currentPart = 'tldr';
            else if (lower.startsWith('## the hook') || lower.startsWith('### the hook') || lower.startsWith('## title') || lower.startsWith('### title')) currentPart = 'hook';
            else if (lower.startsWith('## the insight') || lower.startsWith('### the insight')) currentPart = 'insight';
            else if (lower.startsWith('## takeaway') || lower.startsWith('### takeaway')) currentPart = 'takeaway';
            else if (lower.startsWith('## deep dive') || lower.startsWith('### deep dive')) currentPart = 'deepDive';
            else if (line.startsWith('## ') || line.startsWith('### ')) currentPart = '';
            else if (currentPart === 'tldr' && line.trim()) tldr += line.trim() + ' ';
            else if (currentPart === 'hook' && line.trim()) hook += line.trim() + ' ';
            else if (currentPart === 'insight' && line.trim()) insight += line.trim() + ' ';
            else if (currentPart === 'takeaway' && line.trim()) takeaway += line.trim() + ' ';
            else if (currentPart === 'deepDive' && line.trim()) deepDive += line.trim() + '\n';
        }
        
        // Push Deep Dive first so it becomes the narrativeText (themes[0].desc)
        if (deepDive) sections.themes.push({ name: 'Deep Dive', desc: deepDive.trim() });
        if (tldr) sections.themes.push({ name: 'Summary', desc: tldr.trim() });
        if (hook) sections.themes.push({ name: 'Title', desc: hook.trim() });
        if (insight) sections.themes.push({ name: 'The Insight', desc: insight.trim() });
        if (takeaway) sections.themes.push({ name: 'Takeaway', desc: takeaway.trim() });
        
        return sections;
    }

    let currentSection = '';
    
    for (const line of lines) {
       const lower = line.toLowerCase();
       if (lower.includes('**core themes**') || lower.includes('## core themes') || lower.includes('core themes:')) {
          currentSection = 'themes';
          continue;
       }
       if (lower.includes('**exploration zones**') || lower.includes('## exploration zones') || lower.includes('exploration zones:')) {
          currentSection = 'exploration';
          continue;
       }
       if (currentSection) {
          if (line.match(/^#[^#]/) || line.trim() === '---') { 
             currentSection = '';
             continue;
          }
          let match = line.match(/^[*-]\s*\*\*([^*]+)\*\*:\s*(.*)/);
          if (match) {
             sections[currentSection].push({ name: match[1].trim(), desc: match[2].trim() });
          } else {
             match = line.match(/^[*-]\s*\*\*([^*]+)\*\*(.*?)$/);
             if (match && match[2].trim().length > 5) {
                sections[currentSection].push({ name: match[1].trim(), desc: match[2].replace(/^:/, '').trim() });
             }
          }
       }
    }
    
    if (sections.themes.length === 0) {
        for (const line of lines) {
           let match = line.match(/^[*-]\s*\*\*([^*]+)\*\*:\s*(.*)/);
           if (match) {
              sections.themes.push({ name: match[1].trim(), desc: match[2].trim() });
           } else {
               match = line.match(/^[*-]\s*\*\*([^*]+)\*\*(.*?)$/);
               if (match && match[2].trim().length > 10) {
                  sections.themes.push({ name: match[1].trim(), desc: match[2].replace(/^:/, '').trim() });
               }
           }
        }
    }
    return sections;
}

export default function ProfileTab() {
  const { user } = useUser();
  const { profile, updateProfile } = useUserProfile();
  const { userItems } = useUserItems();
  const navigate = useNavigate();
  const location = useLocation();

  const contradictions = useMemo(() => {
    if (!profile || !userItems) return [];
    const qp = buildQuantitativeProfile(profile, userItems, user?.uid || 'unknown');
    return detectTasteContradictions(profile, userItems, qp);
  }, [profile, userItems, user]);
  const highMediumContradictions = contradictions.filter(c => c.confidence === 'high' || c.confidence === 'medium');

  const latentPersonas = useMemo(() => {
    if (!profile || !userItems) return [];
    const qp = buildQuantitativeProfile(profile, userItems, user?.uid || 'unknown');
    return detectLatentPersonas(profile, userItems, qp);
  }, [profile, userItems, user]);
  
  const initialTab = location.state?.activeNarrativeTab 
    ? (getNormalizedCat(location.state.activeNarrativeTab) || 'overall')
    : 'overall';
    
  const [activeNarrativeTab, setActiveNarrativeTab] = useState(initialTab);
  const [isRoasting, setIsRoasting] = useState(false);
  const [eraModal, setEraModal] = useState<{decade: string, items: any[]} | null>(null);
  const [roastText, setRoastText] = useState<string | null>(null);
  const [eraShiftText, setEraShiftText] = useState<string | null>(null);
  const [isEraLoading, setIsEraLoading] = useState(false);
  const [tasteDNAFilter, setTasteDNAFilter] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.activeNarrativeTab) {
      const norm = getNormalizedCat(location.state.activeNarrativeTab);
      if (norm) {
        setActiveNarrativeTab(norm);
        // Clear the state so we don't keep reacting to it if we change tabs later
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state?.activeNarrativeTab]);

  useEffect(() => {
    if (userItems && userItems.length > 0 && !eraShiftText && !isEraLoading) {
      setIsEraLoading(true);
      fetch("/api/taste-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: userItems, type: "era" })
      })
      .then(r => r.ok ? r.json() : {} as any).catch(() => ({} as any))
      .then(d => setEraShiftText(d.text))
      .catch(() => setEraShiftText("Not enough data to analyze era shifts."))
      .finally(() => setIsEraLoading(false));
    }
  }, [userItems, eraShiftText, isEraLoading]);
  
    const handleRoast = async () => {
    setIsRoasting(true);
    try {
      const res = await fetch("/api/taste-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: userItems, type: "roast" })
      });
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      setRoastText(data.text);
    } catch (e) {
      setRoastText("Couldn't roast you right now. You got lucky.");
    } finally {
      setIsRoasting(false);
    }
  };
  const [activeMainTab, setActiveMainTab] = useState<'narrative'|'constellation'|'stats'>('narrative');
  const [showConfidenceTooltip, setShowConfidenceTooltip] = useState(false);
  const [showNarrativeFeedback, setShowNarrativeFeedback] = useState(false);
  const [narrativeFeedbackText, setNarrativeFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackResponse, setFeedbackResponse] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Also try scrolling the document body just in case
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, []);

  const handleFeedbackSubmit = () => {
    if (!narrativeFeedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    // Simulate API call to process feedback and regenerate
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackResponse(`Thanks for your feedback! We originally generated this based on your high affinity for ${activeNarrativeTab} items and themes we extracted. We're recalibrating your Taste DNA with these new insights.`);
      setShowNarrativeFeedback(false);
      setNarrativeFeedbackText("");
    }, 1500);
  };

  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);

  const overallData = profile?.miniProfiles?.['overall']?.content 
    ? parseSections(profile.miniProfiles['overall'].content) 
    : { themes: [], exploration: [] };

  const existingCats = Object.keys(profile?.miniProfiles || {}).filter(c => {
    const lowerC = c.toLowerCase();
    return !['the hook', 'the insight', 'takeaway', 'deep dive', 'summary', 'title', 'tldr'].includes(lowerC) && !lowerC.includes('the hook');
  });
  const themeCats = overallData.themes
    .filter((t: any) => !['the hook', 'the insight', 'takeaway', 'deep dive', 'summary', 'title', 'tldr'].includes(t.name.toLowerCase()))
    .slice(0, 4)
    .map((t: any) => 'Theme-' + t.name);

  // Normalize categories
  const catMap = new Map();
  ['overall', ...Array.from(new Set((userItems || []).map(i => i.category).filter(Boolean)))].forEach(c => {
    const norm = getNormalizedCat(c as string);
    if (norm) {
      if (!catMap.has(norm)) {
        catMap.set(norm, norm); // Store the normalized version as the definitive category
      }
    }
  });
  const allPossibleCats = Array.from(catMap.values());
  const sortedCategories = allPossibleCats.sort((a, b) => a === 'overall' ? -1 : b === 'overall' ? 1 : a.localeCompare(b));

  const displayCat = (cat: string) => {
     if (cat.startsWith('Theme-')) return cat.replace('Theme-', '');
     if (cat === 'overall') return 'Overall';
     if (cat === 'book') return 'Books';
     if (cat === 'game') return 'Games/Sports';
     if (cat === 'watch') return 'TV & Movies';
     if (cat === 'product') return 'Products';
     if (cat === 'place') return 'Places';
     if (cat === 'event') return 'Events';
     if (cat === 'music') return 'Music';
     if (cat === 'food') return 'Food';
     return cat;
  };

  useEffect(() => {
     let isMounted = true;

     const generateProfile = async () => {
         setIsGeneratingNarrative(true);
         
         try {
             const normalizedCat = activeNarrativeTab.toLowerCase();
             const catItems = userItems?.filter(i => {
                  if (normalizedCat === 'overall') return true;
                  if (normalizedCat.startsWith('theme-')) {
                      const themeName = normalizedCat.substring(6);
                      const keys = new Set<string>();
                      if ((i as any).tags) (i as any).tags.forEach((t: string) => keys.add(t.toLowerCase()));
                      if (i.metadata?.genres) i.metadata.genres.forEach((t: string) => keys.add(t.toLowerCase()));
                      if (i.metadata?.keywords) i.metadata.keywords.forEach((t: string) => keys.add(t.toLowerCase()));
                      if (keys.size === 0) {
                          if (i.subCategory) keys.add(i.subCategory.toLowerCase());
                          else if (i.subtitle) keys.add(i.subtitle.toLowerCase());
                          else keys.add("uncategorized");
                      }
                      return keys.has(themeName);
                  }
                  let c = (i.category || 'other').toLowerCase();
                  return c === normalizedCat;
             }) || [];

             const subcounts: Record<string, number> = {};
             catItems.forEach(i => {
                let key = normalizedCat === 'overall' ? (i.category || 'other') : i.subCategory;
                if (key) {
                   if (typeof key === 'string') {
                       const lowerKey = key.toLowerCase();
                       if (lowerKey === 'restaurants' || lowerKey === 'restaurant') key = 'Restaurants';
                       else if (lowerKey === 'games' || lowerKey === 'game') key = 'Games';
                       else if (lowerKey === 'movies' || lowerKey === 'movie') key = 'Movies';
                       else if (lowerKey === 'books' || lowerKey === 'book') key = 'Books';
                       else key = key.charAt(0).toUpperCase() + key.slice(1);
                   }
                   subcounts[key] = (subcounts[key] || 0) + 1;
                }
             });
             
             const metrics = {
                 totalSaved: catItems.length,
                 favorites: catItems.filter(i => i.reaction === 'love' || (i.rating || 0) > 7).length,
                 subcategories: subcounts
             };

             const existing = profile?.miniProfiles?.[activeNarrativeTab] 
                || (activeNarrativeTab === 'book' ? profile?.miniProfiles?.['books'] : null)
                || (activeNarrativeTab === 'game' ? profile?.miniProfiles?.['games'] : null)
                || (activeNarrativeTab === 'place' ? profile?.miniProfiles?.['places'] : null)
                || (activeNarrativeTab === 'event' ? profile?.miniProfiles?.['events'] : null)
                || (activeNarrativeTab === 'product' ? profile?.miniProfiles?.['products'] : null)
                || (activeNarrativeTab === 'watch' ? (profile?.miniProfiles?.['movies'] || profile?.miniProfiles?.['tv']) : null) as any;
             let shouldRegenerate = !existing;

             if (existing && existing.totalSavedAtGeneration !== undefined) {
                 const daysSince = (Date.now() - (existing.generatedAt || 0)) / (1000 * 60 * 60 * 24);
                 const newItems = metrics.totalSaved - (existing.totalSavedAtGeneration || 0);
                 const newFavs = metrics.favorites - (existing.favoritesAtGeneration || 0);
                 if (newItems >= 10 || newFavs >= 3 || daysSince >= 14) {
                     shouldRegenerate = true;
                 }
             }

             if (!shouldRegenerate) {
                 setIsGeneratingNarrative(false);
                 return;
             }

             const res = await fetch('/api/generate-mini-profile', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-user-api-key': localStorage.getItem('user_gemini_api_key') || '', 'x-user-ai-provider': localStorage.getItem('user_ai_provider') || 'gemini'
                },
                body: JSON.stringify({ 
                  category: activeNarrativeTab, 
                  items: catItems,
                  allItems: userItems || [], 
                  metrics, 
                  demographicsContext: profile?.demographics || {}, 
                  userConsentedToDemographicProfiling: profile?.userConsentedToDemographicProfiling || false,
                  previousNarrative: profile?.miniProfiles?.[activeNarrativeTab]?.content || '',
                  userName: profile?.displayName || user?.displayName || "The user"
                })
             });
             const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
             
             if (data.error && isMounted) {
                 let errMessage = data.error;
                 if (typeof errMessage === 'string' && errMessage.includes('{"error":')) {
                     try {
                         const p = JSON.parse(errMessage);
                         if (p.error && p.error.message) errMessage = p.error.message;
                     } catch(e){}
                 }
                 window.dispatchEvent(new CustomEvent('toast-alert', { detail: { message: `AI Error: ${errMessage}`, type: 'error' } }));
                 setIsGeneratingNarrative(false);
                 return;
             }

             if (data.narrative && updateProfile && isMounted) {
                let parsed = null;
                try {
                    const cleanText = data.narrative.trim();
                    if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
                        parsed = JSON.parse(cleanText);
                    } else {
                        const match = cleanText.match(/\{[\s\S]*\}/);
                        if (match) parsed = JSON.parse(match[0]);
                    }
                    if (!parsed || !parsed.title) {
                        window.dispatchEvent(new CustomEvent('toast-alert', { detail: { message: "Taste Profile analysis produced an invalid format. Keeping your existing profile.", type: 'warning' } }));
                        setIsGeneratingNarrative(false);
                        return;
                    }
                    if (false) {
                        parsed = JSON.parse(data.narrative);
                    }
                } catch(e) {}

                updateProfile({
                   miniProfiles: {
                      ...(profile?.miniProfiles || {}),
                      [activeNarrativeTab]: {
                         ...(parsed || {}),
                         hash: `${Math.floor(metrics.totalSaved / 5)}-${Math.floor(metrics.favorites / 3)}-${Math.floor(Object.keys(subcounts).length / 2)}`,
                         content: data.narrative,
                         generatedAt: Date.now(),
                         totalSavedAtGeneration: metrics.totalSaved,
                         favoritesAtGeneration: metrics.favorites,
                         quantitativeTasteStats: data.quantitativeTasteStats,
                         tasteSignals: data.tasteSignals,
                         profileVersion: 2,
                         curatedEvidenceItemIds: catItems.slice(0, 60).map(i => i.id)
                      }
                   }
                });
             }
         } catch(e) {
             console.error(e);
         } finally {
             if (isMounted) setIsGeneratingNarrative(false);
         }
     };

     generateProfile();

     return () => { isMounted = false; };
  }, [activeNarrativeTab, profile?.miniProfiles]);

  const narrativeContent = profile?.miniProfiles?.[activeNarrativeTab]?.content 
    || (activeNarrativeTab === 'book' ? profile?.miniProfiles?.['books']?.content : null)
    || (activeNarrativeTab === 'game' ? profile?.miniProfiles?.['games']?.content : null)
    || (activeNarrativeTab === 'place' ? profile?.miniProfiles?.['places']?.content : null)
    || (activeNarrativeTab === 'event' ? profile?.miniProfiles?.['events']?.content : null)
    || (activeNarrativeTab === 'product' ? profile?.miniProfiles?.['products']?.content : null)
    || (activeNarrativeTab === 'watch' ? (profile?.miniProfiles?.['movies']?.content || profile?.miniProfiles?.['tv']?.content) : null);
  const narrativeText = narrativeContent || "Gathering insights and clustering items to build this persona...";

  const handleEditProfile = () => window.dispatchEvent(new Event('open-settings'));
  const handleOpenTasteProfile = () => window.dispatchEvent(new Event('open-taste-profile'));

  const handleCopy = () => {
    if (narrativeText) {
      navigator.clipboard.writeText(narrativeText);
      window.dispatchEvent(new CustomEvent('toast-alert', { detail: { message: 'Narrative copied to clipboard', type: 'info' } }));
    }
  };

  const handleShare = async () => {
    if (narrativeText && navigator.share) {
      try {
        await navigator.share({
          title: 'My Dilecti Persona',
          text: narrativeText
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      handleCopy();
    }
  };

  const avatarUrl = user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName || 'Dilecti'}&backgroundColor=F7EFE3&textColor=B9893C`;

  return (
    <div className="dilecti-profile-page dark">
      <div className="dp-shell">
        
        {/* Header / Topbar */}
        <div className="dp-topbar">
          <div className="dp-wordmark cursor-pointer select-none" onClick={() => navigate('/')}>DILECTI</div>
          <button onClick={handleEditProfile} className="text-[var(--dp-muted)] hover:text-[var(--dp-gold)] transition-colors">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="dp-hero">
          <div className="dp-hero-left">
            <div className="dp-avatar-wrap">
              {/* Concentric Orbit Rings */}
              <svg className="absolute inset-[-18px] w-[calc(100%+36px)] h-[calc(100%+36px)] pointer-events-none" viewBox="0 0 220 220" fill="none">
                {/* Outer dashed ring */}
                <circle cx="110" cy="110" r="105" stroke="var(--dp-gold)" strokeWidth="1" strokeDasharray="3 4" opacity="0.25" />
                {/* Inner subtle solid ring */}
                <circle cx="110" cy="110" r="95" stroke="var(--dp-gold)" strokeWidth="1" opacity="0.12" />
                {/* Glowing gold orbit dot at 9 o'clock */}
                <circle cx="5" cy="110" r="4.5" fill="#FFEBB3" className="shadow-lg" />
                <circle cx="5" cy="110" r="9" fill="#D4A75B" opacity="0.3" />
              </svg>

              {/* Roman Medallion (SVG based coin) */}
              <div className="w-full h-full relative z-10 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 160 160" className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]">
                  <defs>
                    <linearGradient id="gold-rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFF2D4" />
                      <stop offset="25%" stopColor="#D4A75B" />
                      <stop offset="50%" stopColor="#7B561E" />
                      <stop offset="75%" stopColor="#F5D38E" />
                      <stop offset="100%" stopColor="#4A310D" />
                    </linearGradient>
                    
                    <radialGradient id="gold-coin-face" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                      <stop offset="0%" stopColor="#E5BE75" />
                      <stop offset="50%" stopColor="#9C6E2E" />
                      <stop offset="85%" stopColor="#5E3F15" />
                      <stop offset="100%" stopColor="#2E1C05" />
                    </radialGradient>

                    <linearGradient id="gold-emboss-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFEAB8" />
                      <stop offset="40%" stopColor="#D9A855" />
                      <stop offset="70%" stopColor="#8A5C1E" />
                      <stop offset="100%" stopColor="#54360B" />
                    </linearGradient>

                    <filter id="coin-inset-shadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feOffset dx="1" dy="2"/>
                      <feGaussianBlur stdDeviation="1.5" result="offset-blur"/>
                      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                      <feFlood floodColor="black" floodOpacity="0.7" result="color"/>
                      <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                    </filter>

                    <filter id="emboss-filter" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="1" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.8"/>
                      <feDropShadow dx="-0.5" dy="-0.5" stdDeviation="0.5" floodColor="#FFFFFF" floodOpacity="0.45"/>
                    </filter>
                  </defs>

                  {/* Coin Outer Ring (Beveled Edge) */}
                  <circle cx="80" cy="80" r="74" fill="url(#gold-rim-grad)" stroke="#3E270D" strokeWidth="1" />
                  
                  {/* Inner Rim Layer */}
                  <circle cx="80" cy="80" r="70" fill="#2A1B0A" />
                  <circle cx="80" cy="80" r="69" fill="url(#gold-rim-grad)" />
                  <circle cx="80" cy="80" r="66" fill="#1C1004" />

                  {/* Coin Face */}
                  <circle cx="80" cy="80" r="65" fill="url(#gold-coin-face)" filter="url(#coin-inset-shadow)" />

                  {/* Subtle Inner Beaded Circle */}
                  <circle cx="80" cy="80" r="60" fill="none" stroke="url(#gold-emboss-grad)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />

                  {/* Embossed Letter */}
                  <text 
                    x="80" 
                    y="98" 
                    fontFamily="var(--font-logo)" 
                    fontSize="58" 
                    fontWeight="700"
                    textAnchor="middle" 
                    fill="url(#gold-emboss-grad)" 
                    filter="url(#emboss-filter)"
                    className="select-none font-logo"
                    style={{ letterSpacing: '0px' }}
                  >
                    {(user?.displayName || 'Dilecti').trim().charAt(0).toUpperCase()}
                  </text>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="dp-hero-right min-w-0">
            {/* Name + Edit Profile Button Row */}
            <div className="flex justify-between items-start w-full gap-2 xs:gap-4">
              <h1 className="font-logo font-medium text-[18px] xs:text-[22px] sm:text-[28px] md:text-[32px] tracking-[0.12em] xs:tracking-[0.16em] sm:tracking-[0.18em] leading-[1.05] bg-gradient-to-b from-[#FFF2D4] via-[#D4A75B] to-[#7B561E] bg-clip-text text-transparent uppercase text-left break-words flex-1 text-balance">
                {(user?.displayName || 'Avery Morgan').toUpperCase().trim().split(/\s+/).map((part, idx) => (
                  <div key={idx} className="leading-[1.1]">{part}</div>
                ))}
              </h1>
              <div className="flex flex-col gap-2 items-end shrink-0 mt-0.5">
                  <button 
                    onClick={handleEditProfile}
                    className="flex items-center justify-center gap-1 w-full px-2.5 py-1.5 xs:px-3.5 xs:py-1.5 border border-[#D6A95B]/40 hover:border-[#D6A95B] hover:bg-[#D6A95B]/5 text-[#F2D28A] text-[9.5px] xs:text-[11px] font-sans tracking-wider rounded-full transition-all duration-300 uppercase"
                  >
                    <Edit3 className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-[#D6A95B]" />
                    <span>Edit Profile</span>
                  </button>
                  <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-public-profile', { detail: { userId: user?.uid, fullScreen: true } }));
                    }}
                    className="flex items-center justify-center gap-1 w-full px-2.5 py-1.5 xs:px-3.5 xs:py-1.5 border border-[#D6A95B]/40 hover:border-[#D6A95B] hover:bg-[#D6A95B]/5 text-[#F2D28A] text-[9.5px] xs:text-[11px] font-sans tracking-wider rounded-full transition-all duration-300 uppercase"
                  >
                    <EyeOff className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-[#D6A95B]" />
                    <span>View Public</span>
                  </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content Tabs */}
        <div className="flex gap-2 p-1 bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-full mb-6 w-max mx-auto">
           <button 
             onClick={() => setActiveMainTab('narrative')}
             className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${activeMainTab === 'narrative' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
           >
             Narratives
           </button>
           <button 
             onClick={() => setActiveMainTab('constellation')}
             className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${activeMainTab === 'constellation' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
           >
             Taste DNA
           </button>
                   </div>

        {activeMainTab === 'narrative' && (
        <div className="dp-card">
          <div className="dp-card-pad">
            <div className="dp-section-title mb-4">
              <span className="flex items-center gap-2">YOUR NARRATIVE LIBRARY 
                <div className="relative group cursor-pointer inline-flex items-center">
                  <Info className="w-3.5 h-3.5 text-[var(--dp-muted)] hover:text-white transition-colors" />
                  <div className="absolute top-6 left-0 w-64 p-3 bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-xl shadow-2xl z-50 text-[11px] text-[var(--dp-ink)] text-left opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-normal">
                    Generated utilizing experimental AI models summarizing your inputs and collections into distinct personas. Click anywhere on the persona content to explore the full Taste Profile details.
                  </div>
                </div>
              </span>
            </div>
            
            <div className="dp-tabs">
               {sortedCategories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveNarrativeTab(cat)}
                    className={`dp-tab capitalize ${activeNarrativeTab === cat ? 'active' : ''}`}
                  >
                    {displayCat(cat)}
                  </button>
               ))}
            </div>

            <div className="mt-4 pt-2 border-t border-[var(--dp-border)]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="capitalize font-display text-[20px] text-[var(--dp-ink)]">
                   {displayCat(activeNarrativeTab)} Persona
                </h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] xs:text-[11px] font-sans tracking-wider uppercase text-[var(--dp-muted)] hover:text-[var(--dp-gold)] transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="hidden xs:inline">Copy</span>
                  </button>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-1.5 text-[10px] xs:text-[11px] font-sans tracking-wider uppercase text-[var(--dp-muted)] hover:text-[var(--dp-gold)] transition-colors"
                  >
                    <Share className="w-3 h-3" />
                    <span className="hidden xs:inline">Share</span>
                  </button>
                  <button 
                    onClick={() => {
                        if (updateProfile && !isGeneratingNarrative) {
                          const updatedMiniProfiles = { ...(profile?.miniProfiles || {}) };
                          (updatedMiniProfiles as any)[activeNarrativeTab] = null;
                          updateProfile({ miniProfiles: updatedMiniProfiles });
                          window.dispatchEvent(new CustomEvent('toast-alert', { detail: { message: `Recalibrating ${activeNarrativeTab} persona...`, type: 'info' } }));
                      }
                  }}
                  disabled={isGeneratingNarrative}
                  className="flex items-center gap-1.5 text-[10px] xs:text-[11px] font-sans tracking-wider uppercase text-[var(--dp-muted)] hover:text-[var(--dp-gold)] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Regenerate</span>
                </button>
                </div>
              </div>
              <div className="dp-narrative md:grid md:grid-cols-1 md:gap-4 flex flex-col items-start mb-6">
                <div className="flex flex-col justify-between w-full relative min-h-[200px]">
                  {isGeneratingNarrative ? (
                      <div className="w-full flex flex-col gap-4 py-8 items-center justify-center text-center opacity-70 animate-pulse">
                         <div className="w-12 h-12 rounded-full border-4 border-neutral-200 dark:border-white/10 border-t-[var(--dp-gold)] animate-spin mb-4" />
                         <h4 className="font-display text-lg text-neutral-900 dark:text-white mb-2">Analyzing your taste profile...</h4>
                         <p className="text-sm text-neutral-500 max-w-xs mx-auto">This may take a moment while our AI clusters your items, keywords, and history to generate your unique persona.</p>
                      </div>
                  ) : (
                  <div className="text-[13px] leading-[1.6] max-h-[600px] md:max-h-[500px] overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    {(() => {
                        let profileData = null;
                        try {
                           const cleanText = narrativeContent.trim();
                           if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
                              profileData = JSON.parse(cleanText);
                           } else {
                              const match = cleanText.match(/\{[\s\S]*\}/);
                              if (match) {
                                 profileData = JSON.parse(match[0]);
                              }
                           }
                        } catch(e) {
                           console.warn("Could not parse profileData JSON:", e);
                        }
                        
                        return (
                            <TasteProfileDisplay markdown={narrativeText} profileData={profileData} />
                        );
                    })()}
                  </div>
                  )}
                </div>
              </div>

              {latentPersonas.length > 0 && (
                <div className="mt-6 mb-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 px-1">
                    <User className="w-4 h-4 text-[var(--dp-gold)]" />
                    <h3 className="font-display text-sm tracking-widest uppercase text-white/80">Latent Personas</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {latentPersonas.map((p) => (
                      <div key={p.id} className="bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-[var(--dp-gold)]/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-display text-emerald-100 text-sm leading-tight">{p.name}</h4>
                          <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--dp-gold)]/10 text-[var(--dp-gold)] whitespace-nowrap border border-[var(--dp-gold)]/20">
                            {p.confidence} confidence
                          </span>
                        </div>
                        <p className="text-xs text-emerald-100/60 leading-relaxed font-sans">
                          {p.summary}
                        </p>
                        {p.motifs && p.motifs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {p.motifs.map(m => (
                              <span key={m} className="text-[10px] uppercase tracking-widest text-emerald-100/50 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {highMediumContradictions.length > 0 && (
                <div className="mt-6 mb-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="w-4 h-4 text-[var(--dp-gold)]" />
                    <h3 className="font-display text-sm tracking-widest uppercase text-white/80">What Dilecti Notices</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {highMediumContradictions.map((c) => (
                      <div key={c.id} className="bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-[var(--dp-gold)]/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-display text-emerald-100 text-sm leading-tight">{c.title}</h4>
                          <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--dp-gold)]/10 text-[var(--dp-gold)] whitespace-nowrap border border-[var(--dp-gold)]/20">
                            {c.confidence} confidence
                          </span>
                        </div>
                        <p className="text-xs text-emerald-100/60 leading-relaxed font-sans">
                          {c.description}
                        </p>
                        {c.evidenceItemIds && c.evidenceItemIds.length > 0 && (
                          <div className="mt-1 pt-3 border-t border-[var(--dp-border)] flex flex-col gap-2">
                            <span className="text-[10px] text-emerald-100/40 uppercase tracking-widest">Evidence</span>
                            <div className="flex flex-wrap gap-1.5">
                              {c.evidenceItemIds.slice(0, 4).map(id => {
                                const item = userItems?.find(i => i.id === id);
                                if (!item) return null;
                                return (
                                  <span key={id} className="text-[11px] bg-black/40 text-emerald-100/70 px-2 py-1 rounded-md border border-white/5 truncate max-w-[150px]">
                                    {item.title}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {feedbackResponse ? (
                <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-900/50 rounded-xl text-[12px] text-emerald-200 leading-relaxed font-sans mt-3">
                  {feedbackResponse}
                </div>
              ) : showNarrativeFeedback ? (
                <div className="mt-3 bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-xl p-3 flex flex-col gap-2 relative">
                  <textarea 
                    value={narrativeFeedbackText}
                    onChange={(e) => setNarrativeFeedbackText(e.target.value)}
                    placeholder="Why doesn't this resonate? Your feedback directly recalibrates your Taste Profile."
                    className="w-full bg-black/20 rounded-lg p-2 text-[12px] text-white/90 placeholder:text-white/40 focus:outline-none resize-none h-20"
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button 
                      onClick={() => setShowNarrativeFeedback(false)}
                      className="text-[11px] text-[var(--dp-muted)] hover:text-white px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmittingFeedback || !narrativeFeedbackText.trim()}
                      className="text-[11px] bg-[var(--dp-gold)] text-black px-3 py-1 rounded-md font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isSubmittingFeedback && <Loader2 className="w-3 h-3 animate-spin"/>}
                      Send Feedback
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[var(--dp-muted)] hover:text-[var(--dp-gold)] transition-colors group cursor-pointer font-sans uppercase tracking-widest pl-1"
                  onClick={() => setShowNarrativeFeedback(true)}
                >
                  <ThumbsDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  I don't agree with this
                </button>
              )}
            </div>
            
            <div className="mt-8 pt-8 border-t border-[var(--dp-border)] flex justify-center">
                <button 
                  onClick={() => setActiveMainTab('constellation')}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--dp-surface)] border border-[var(--dp-gold)]/30 hover:border-[var(--dp-gold)] rounded-full text-white text-xs font-bold uppercase tracking-widest transition-all group"
                >
                  <Sparkles className="w-4 h-4 text-[var(--dp-gold)] group-hover:scale-110 transition-transform" />
                  View Taste DNA & Vibe Check
                </button>
            </div>
          </div>
        </div>
        )}

        {activeMainTab === 'constellation' && (() => {
        
            const consumedMoviesOrTv = (userItems || []).filter(i => {
                const catStr = (i.category as string || '').toLowerCase();
                return ['watch', 'movie', 'movies', 'tv', 'tv series', 'tv show', 'tv shows', 'tv & movies', 'tvs'].includes(catStr) && ['completed', 'read', 'watched'].includes(i.status);
            });
            const totalRuntimeMinutes = consumedMoviesOrTv.reduce((acc, curr: any) => acc + (curr.runtime || 0), 0);
            const totalRuntimeHours = Math.round(totalRuntimeMinutes / 60);

            const consumedBooks = (userItems || []).filter(i => {
                const catStr = i.category as string;
                return (catStr === 'book' || catStr === 'books') && ['completed', 'read'].includes(i.status);
            });
            const totalPages = consumedBooks.reduce((acc, curr: any) => acc + (curr.pages || curr.pageCount || 0), 0);

            const totalItems = userItems?.length || 0;
            const completedItems = (userItems || []).filter(i => ['completed', 'read', 'watched', 'listened', 'tried'].includes(i.status)).length;
            const lovedItems = (userItems || []).filter(i => i.reaction === 'love').length;
            const aspirationalItems = (userItems || []).filter(i => ['up-next', 'planning', 'want-to-try', 'saved'].includes(i.status)).length;
            const reviewsWritten = (userItems || []).filter(i => (i.review && i.review.trim().length > 0) || (i.favoriteQuote && i.favoriteQuote.trim().length > 0)).length;
            const pre2000Items = (userItems || []).filter(i => {
                const itemYear = i.metadata?.year || parseInt((i.title.match(/\b(19|20)\d{2}\b/) || [])[0] || '0') || Number(i.releaseYear) || 0;
                return itemYear > 0 && itemYear < 2000;
            }).length;

            const positivityRatio = completedItems > 0 ? Math.round((lovedItems / completedItems) * 100) : 0;
            const backlogRatio = totalItems > 0 ? Math.round((aspirationalItems / totalItems) * 100) : 0;

            const categoryCounts = (userItems || []).reduce((acc: any, item) => {
               const cat = getNormalizedCat(item.category || 'other');
               if (cat) {
                  acc[cat] = (acc[cat] || 0) + 1;
               }
               return acc;
            }, {});
            
            const sortedCategories = Object.entries(categoryCounts).sort((a: any, b: any) => b[1] - a[1]);

            // Apply Taste DNA Filter to Eras chart
            let filteredItemsForEras = userItems || [];
            if (tasteDNAFilter && tasteDNAFilter !== 'All') {
               const isExclude = tasteDNAFilter.startsWith('-');
               const actualFilter = isExclude ? tasteDNAFilter.substring(1).toLowerCase() : tasteDNAFilter.toLowerCase();
               
               filteredItemsForEras = filteredItemsForEras.filter(it => {
                   const cat = (it.category || '').toLowerCase();
                   let match = false;
                   if ((actualFilter === 'watch' || actualFilter === 'movies') && (cat.includes('watch') || cat.includes('movie') || cat.includes('tv'))) match = true;
                   else if ((actualFilter === 'book' || actualFilter === 'books') && (cat.includes('book') || cat.includes('read'))) match = true;
                   else if ((actualFilter === 'music' || actualFilter === 'listen') && (cat.includes('music') || cat.includes('listen') || cat === 'song')) match = true;
                   else if ((actualFilter === 'food' || actualFilter === 'eat' || actualFilter === 'restaurants' || actualFilter === 'restaurant') && (cat.includes('food') || cat.includes('restaurant'))) match = true;
                   else if ((actualFilter === 'game' || actualFilter === 'games' || actualFilter === 'play') && (cat.includes('game') || cat.includes('play'))) match = true;
                   else if ((actualFilter === 'place' || actualFilter === 'places' || activeNarrativeTab === 'visit') && (cat.includes('place') || cat.includes('visit') || cat.includes('travel'))) match = true;
                   else if (cat === actualFilter) match = true;
                   return isExclude ? !match : match;
               });
            }

            // Era Data
            const eraDistribution = filteredItemsForEras.reduce((acc: any, i: any) => {
                const year = i.metadata?.year || parseInt((i.title.match(/\b(19|20)\d{2}\b/) || [])[0] || '0') || Number(i.releaseYear);
                if (year > 1900 && year <= new Date().getFullYear()) {
                    const decade = Math.floor(year / 10) * 10;
                    const cat = getNormalizedCat(i.category || 'other') || 'other';
                    if (!acc[decade]) acc[decade] = { count: 0, items: [] };
                    acc[decade].count++;
                    acc[decade].items.push(i);
                    acc[decade][cat] = (acc[decade][cat] || 0) + 1;
                }
                return acc;
            }, {});
            
            const eraChartData = Object.entries(eraDistribution)
                .map(([decade, data]: any) => ({ decade: `${decade}s`, decadeNum: parseInt(decade), ...data }))
                .sort((a: any, b: any) => a.decadeNum - b.decadeNum);

           return (
           <div className="space-y-6">
               {eraModal && (
                   <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEraModal(null)}>
                       <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                           <div className="p-6 border-b border-white/10 flex justify-between items-center">
                               <h3 className="text-xl font-display text-white">{eraModal.decade} Era <span className="text-white/50 text-sm ml-2">({eraModal.items.length} items)</span></h3>
                               <button onClick={() => setEraModal(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                           </div>
                           <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
                               {eraModal.items.map((item: any, i: number) => (
                                   <div key={`${item.id}-${i}-${Math.random()}`} onClick={() => { setEraModal(null); window.dispatchEvent(new CustomEvent('open-item', { detail: item })); }} className="cursor-pointer group flex flex-col">
                                       <div className="aspect-square bg-neutral-800 rounded-lg overflow-hidden mb-2 relative">
                                           {item.imageUrl ? <ImageWithFallback src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><Sparkles className="w-8 h-8"/></div>}
                                       </div>
                                       <div className="text-xs font-medium text-white line-clamp-1">{item.title}</div>
                                       <div className="text-[10px] text-white/50 line-clamp-1">{item.creator}</div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>
               )}
               <div className="relative rounded-3xl bg-[#050B14] border border-[var(--dp-border)]">
                   <div className="relative bg-transparent min-h-[500px]">
                       <TasteGraphDisplay
                           items={userItems || []}
                           value={tasteDNAFilter || 'Overall'}
                           onChange={setTasteDNAFilter}
                           onToggleFavorite={() => {}}
                        />
                   </div>

                   <div className="px-6 md:px-8 pb-8 pt-4 border-t border-white/10 bg-gradient-to-b from-transparent to-black/20 rounded-b-3xl">
                     <div className="flex justify-between items-center mb-6">
                       <div className="dp-section-title">TASTE DNA & VIBE CHECK</div>
                       <button
                         onClick={handleRoast}
                         disabled={isRoasting}
                         className="px-3 py-1.5 bg-[var(--dp-gold)] text-black font-bold text-[10px] uppercase tracking-wider rounded-full hover:bg-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                       >
                         {isRoasting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                         Roast My Taste
                       </button>
                     </div>
                     
                     {roastText && (
                       <div className="mb-6 p-4 bg-black/20 dark:bg-white/5 border border-[var(--dp-border)] rounded-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                         <div className="absolute top-0 left-0 w-1 h-full bg-[var(--dp-gold)]"></div>
                         <p className="font-serif italic text-sm text-[var(--dp-ink)] leading-relaxed">
                           "{roastText}"
                         </p>
                       </div>
                     )}
                     
                     <div className="border-t border-[var(--dp-border)] pt-6 mt-6">
                        <div className="dp-section-title mb-6">TASTE EVOLUTION (BY ERA)</div>
                        {eraChartData.length > 0 ? (
                          <>
                            <div className="h-[200px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={eraChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} onClick={(e: any) => {
                                    if (e && e.activePayload && e.activePayload.length > 0) {
                                        setEraModal({ decade: e.activePayload[0].payload.decade, items: e.activePayload[0].payload.items });
                                    }
                                }} className="cursor-pointer">
                                  <XAxis dataKey="decade" stroke="var(--dp-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                  <YAxis stroke="var(--dp-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                  <RechartsTooltip 
                                     cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', fontSize: '12px', color: '#fff'}}
                                   />
                                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                  <Bar dataKey="book" name="Books" stackId="a" fill="#3b82f6" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                  <Bar dataKey="game" name="Games" stackId="a" fill="#10b981" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                  <Bar dataKey="place" name="Places" stackId="a" fill="#f59e0b" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                  <Bar dataKey="event" name="Events" stackId="a" fill="#8b5cf6" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                  <Bar dataKey="product" name="Products" stackId="a" fill="#ec4899" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                  <Bar dataKey="music" name="Music" stackId="a" fill="#ef4444" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                  <Bar dataKey="food" name="Food" stackId="a" fill="#f97316" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                  <Bar dataKey="watch" name="Watch" stackId="a" fill="#06b6d4" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                  <Bar dataKey="other" name="Other" stackId="a" fill="#6b7280" onClick={(e: any) => { if (e && e.payload) setEraModal({ decade: e.payload.decade, items: e.payload.items }) }} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="mt-4 p-3 bg-black/10 dark:bg-white/5 rounded-lg border border-[var(--dp-border)]">
                               <p className="text-xs text-[var(--dp-muted)] font-medium leading-relaxed">
                                 <span className="text-[var(--dp-gold)] font-bold">Era Shift Analysis:</span> {isEraLoading ? 'Analyzing timeline...' : (eraShiftText || 'Not enough data.')}
                               </p>
                            </div>
                          </>
                        ) : (
                          <div className="h-32 flex items-center justify-center text-[var(--dp-muted)] text-xs border border-dashed border-[var(--dp-border)] rounded-xl">
                             Not enough release year data to plot eras.
                          </div>
                        )}
                     </div>
                 </div>
              </div>

              <div className="dp-card">
                 <div className="dp-card-pad">
                     <div className="dp-section-title mb-4">MEDIA METRICS</div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div 
                             onClick={() => navigate('/library', { state: { statusFilter: null, filterOption: 'all' } })}
                             className="bg-black/20 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/40 transition-colors"
                         >
                             <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Total Items</div>
                             <div className="text-2xl font-serif text-white">{totalItems}</div>
                         </div>
                         <div 
                             onClick={() => navigate('/library', { state: { filterOption: 'favorites', statusFilter: 'rated' } })}
                             className="bg-black/20 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/40 transition-colors"
                         >
                             <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Curated Favorites</div>
                             <div className="text-2xl font-serif text-white">{lovedItems}</div>
                         </div>
                         <div 
                             onClick={() => navigate('/library', { state: { statusFilter: 'up-next' } })}
                             className="bg-black/20 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/40 transition-colors"
                         >
                             <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Want to Try</div>
                             <div className="text-2xl font-serif text-white">{aspirationalItems}</div>
                         </div>
                         <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                             <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Categories</div>
                             <div className="text-2xl font-serif text-white">{new Set((userItems || []).map(i => {
    const norm = getNormalizedCat(i.category || '');
    return norm ? norm : null;
}).filter(Boolean)).size}</div>
                         </div>
                         <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                             <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Hours Watched</div>
                             <div className="text-2xl font-serif text-white">{totalRuntimeHours.toLocaleString()}</div>
                         </div>
                         <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                             <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Pages Read</div>
                             <div className="text-2xl font-serif text-white">{totalPages.toLocaleString()}</div>
                         </div>
                         <div className="bg-black/20 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                             <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1 relative z-10">Positivity Ratio</div>
                             <div className="text-2xl font-serif text-white relative z-10">{positivityRatio}%</div>
                             <div className="text-[10px] text-white/40 mt-1 relative z-10">of completed are favorites</div>
                         </div>
                         <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                             <div className="text-[10px] text-[var(--dp-gold)] uppercase tracking-wider mb-1">Backlog Ratio</div>
                             <div className="text-2xl font-serif text-white">{backlogRatio}%</div>
                             <div className="text-[10px] text-white/40 mt-1">unread/unwatched</div>
                         </div>
                         <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                             <div className="text-[10px] text-purple-400 uppercase tracking-wider mb-1">Reviews Written</div>
                             <div className="text-2xl font-serif text-white">{reviewsWritten}</div>
                             <div className="text-[10px] text-white/40 mt-1">notes & quotes saved</div>
                         </div>
                         <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                             <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Vintage Classics</div>
                             <div className="text-2xl font-serif text-white">{pre2000Items}</div>
                             <div className="text-[10px] text-white/40 mt-1">released before 2000</div>
                         </div>
                     </div>
                 </div>
              </div>
              
              <div className="dp-card">
                 <div className="dp-card-pad">
                     <div className="dp-section-title mb-4">CATEGORY BREAKDOWN</div>
                     <div className="space-y-4">
                        {sortedCategories.map(([cat, count]: [string, any]) => {
                           const percentage = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
                           return (
                              <div key={cat} className="flex flex-col gap-1.5">
                                 <div className="flex justify-between items-end text-sm">
                                    <span className="capitalize text-white/80 font-medium">{displayCat(cat)}</span>
                                    <span className="font-mono text-white/50 text-xs">{count} items ({percentage}%)</span>
                                 </div>
                                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: `${percentage}%` }} />
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                 </div>
              </div>
              <div className="mt-8 pt-8 border-t border-[var(--dp-border)] flex justify-center w-full">
                  <button 
                    onClick={() => setActiveMainTab('narrative')}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--dp-surface)] border border-[var(--dp-gold)]/30 hover:border-[var(--dp-gold)] rounded-full text-white text-xs font-bold uppercase tracking-widest transition-all group"
                  >
                    <BookOpen className="w-4 h-4 text-[var(--dp-gold)] group-hover:scale-110 transition-colors" />
                    View AI Narratives
                  </button>
              </div>
           </div>
           );
        
              })()}

        

        {/* You're in Control */}
        <div className="dp-card">
          <div className="dp-card-pad">
            <div className="dp-section-title">
              <span className="flex items-center gap-2">YOU'RE IN CONTROL 
                <div className="relative group cursor-pointer inline-flex items-center">
                  <Shield className="w-3.5 h-3.5 text-[var(--dp-muted)] hover:text-white transition-colors" />
                  <div className="absolute bottom-6 left-0 w-64 p-3 bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-xl shadow-2xl z-50 text-[11px] text-[var(--dp-ink)] text-left opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-normal">
                    Manage how your data is used. Edit your profile to hide items, alter preferences, or pause inference clustering dynamically.
                  </div>
                </div>
              </span>
            </div>
            <p className="text-[12px] text-[var(--dp-muted)] mb-4">Review or update any inference about you.</p>
            
            <div className="dp-control-grid">
               <button onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: 'demographics' }))} className="dp-control text-[var(--dp-green)] hover:bg-[var(--dp-green)] hover:text-white transition-colors duration-300 group">
                 <CheckCircle className="w-5 h-5 mb-1" />
                 <span className="group-hover:text-white font-bold text-[11px] text-[var(--dp-ink)]">Confirm</span>
               </button>
               <button onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: 'demographics' }))} className="dp-control text-[var(--dp-gold)] hover:bg-[var(--dp-gold)] hover:text-white transition-colors duration-300 group">
                 <Edit3 className="w-5 h-5 mb-1" />
                 <span className="group-hover:text-white font-bold text-[11px] text-[var(--dp-ink)]">Correct</span>
               </button>
               <button onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: 'account' }))} className="dp-control text-[var(--dp-muted)] hover:bg-[var(--dp-muted)] hover:text-white transition-colors duration-300 group">
                 <EyeOff className="w-5 h-5 mb-1" />
                 <span className="group-hover:text-white font-bold text-[11px] text-[var(--dp-ink)]">Hide</span>
               </button>
               <button onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: 'account' }))} className="dp-control text-[var(--dp-danger)] hover:bg-[var(--dp-danger)] hover:text-white transition-colors duration-300 group">
                 <Trash2 className="w-5 h-5 mb-1" />
                 <span className="group-hover:text-white font-bold text-[11px] text-[var(--dp-ink)]">Delete</span>
               </button>
            </div>
          </div>
        </div>
        
        <div className="text-center py-6 text-[11px] font-mono tracking-widest uppercase text-[var(--dp-muted)] flex flex-col items-center gap-1">
          You're in control of your data.<br/>We'll always protect your privacy.
          <div className="text-lg mt-2">✨</div>
        </div>
        
      </div>
    </div>
  );
}

