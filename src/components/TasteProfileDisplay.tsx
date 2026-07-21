import React, { useState, useMemo } from 'react';
import Markdown from 'react-markdown';
import { Sparkles, Fingerprint, Activity, Map, User, ChevronDown, ChevronUp, Zap, Hash, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatIdentityText } from '../lib/utils';

function ParticleBackground() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; s: number; d: number; col?: string }[]>([]);

  React.useEffect(() => {
    const colors = ['bg-emerald-400', 'bg-teal-400', 'bg-indigo-400'];
    const p = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 3 + 1,
      d: Math.random() * 15 + 10,
      col: colors[Math.floor(Math.random() * colors.length)]
    }));
    setParticles(p);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.col}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.d,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function TasteProfileDisplay({ markdown, profileData }: { markdown?: string, profileData?: any }) {
  const [expandedDeepDive, setExpandedDeepDive] = useState(true);

  const sectionsMap = useMemo(() => {
    if (!markdown) return {};
    
    const map: Record<string, string> = {};
    if (markdown.includes('## ')) {
       const chunks = markdown.split('## ').filter(s => s.trim().length > 0);
       chunks.forEach(s => {
          const lines = s.split('\n');
          const title = lines[0].trim().replace(/[*_]/g, '');
          map[title.toLowerCase()] = lines.slice(1).join('\n').trim();
       });
       return map;
    }
    
    // Fallback old format
    const lines = markdown.split('\n');
    let currentTitle = 'overview';
    let currentContent = '';
    for (const line of lines) {
      const match = line.match(/^(?:-\s*)?\*\*([^*]+)\*\*:\s*(.*)/);
      if (match) {
        if (currentContent.trim()) {
           map[currentTitle.toLowerCase()] = currentContent.trim();
        }
        currentTitle = match[1].trim();
        currentContent = match[2].trim() + '\n';
      } else {
        currentContent += line + '\n';
      }
    }
    if (currentContent.trim()) {
      map[currentTitle.toLowerCase()] = currentContent.trim();
    }
    return map;
  }, [markdown]);

  if (!profileData && Object.keys(sectionsMap).length === 0) return null;

  // Render structured profile
  if (profileData) {
    return (
      <div className="w-full max-w-lg md:max-w-2xl mx-auto flex flex-col gap-6 relative z-10 text-emerald-950 pb-8 dark:text-emerald-50">
        
        {/* Card 1: Archetype Title & Core Narrative */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
           className="relative overflow-hidden bg-white/70 dark:bg-emerald-950/40 backdrop-blur-xl border border-emerald-100 rounded-[2rem] p-8 md:p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px] dark:border-emerald-900"
         >
            <ParticleBackground />
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles className="w-40 h-40" />
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-8 relative z-10 shadow-sm border border-emerald-100/50 dark:text-emerald-200 dark:bg-emerald-950">
               <Fingerprint className="w-3.5 h-3.5" /> Taste Archetype
            </div>
            
            <h2 className={`font-serif font-bold tracking-tight text-emerald-950 leading-tight relative z-10 text-center dark:text-emerald-50 mb-6 ${(profileData.title?.length || 0) > 50 ? 'text-2xl md:text-4xl' : 'text-4xl md:text-6xl'}`}>
              {profileData.title}
            </h2>
            
            {profileData.core_read ? (
               <p className={`font-serif font-medium leading-relaxed text-emerald-900 dark:text-emerald-100/90 text-center relative z-10 max-w-3xl ${profileData.core_read.length > 150 ? 'text-base md:text-lg' : 'text-xl md:text-2xl'}`}>
                  {formatIdentityText(profileData.core_read)}
               </p>
            ) : (
               <p className={`font-serif font-medium leading-relaxed text-emerald-900 dark:text-emerald-100/90 text-center relative z-10 max-w-3xl ${(profileData.summary || '').length > 150 ? 'text-base md:text-lg' : 'text-xl md:text-2xl'}`}>
                  {formatIdentityText(profileData.summary)}
               </p>
            )}

            {profileData.vibe_labels && profileData.vibe_labels.length > 0 && (
               <div className="flex flex-wrap gap-2 justify-center mt-10 relative z-10">
                 {profileData.vibe_labels.map((vibe: string, idx: number) => (
                   <span key={idx} className="px-4 py-2 bg-emerald-100/50 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 rounded-full text-xs font-bold border border-emerald-200/50 dark:border-emerald-800/50 uppercase tracking-widest">
                     {vibe}
                   </span>
                 ))}
               </div>
            )}
         </motion.div>

        {/* Card 2: Core Themes */}
        {profileData.deep_dive && profileData.deep_dive.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-emerald-100 shadow-sm overflow-hidden dark:border-emerald-900 dark:bg-white/5"
          >
              <button 
                onClick={() => setExpandedDeepDive(!expandedDeepDive)}
                className="w-full flex items-center justify-between p-6 md:p-8 text-left hover:bg-emerald-50/50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100/50 flex items-center justify-center text-emerald-600 flex-shrink-0 dark:text-emerald-400">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-950 text-lg dark:text-emerald-50">Core Themes</h3>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600/60 mt-0.5">Explore thematic clusters</p>
                    </div>
                </div>
                {expandedDeepDive ? <ChevronUp className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              </button>

              <AnimatePresence>
                {expandedDeepDive && (
                  <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                  >
                      <div className="px-6 md:px-8 pb-8 pt-0 border-t border-emerald-50 dark:border-emerald-900 mt-2 space-y-6">
                          {profileData.deep_dive.map((sec: any, idx: number) => (
                            <div key={idx} className="mt-6">
                              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 mb-2">{sec.heading}</h4>
                              <p className="text-emerald-800/80 dark:text-emerald-100/70 text-sm leading-relaxed">{sec.body}</p>
                            </div>
                          ))}
                      </div>
                  </motion.div>
                )}
              </AnimatePresence>
          </motion.div>
        )}

        {/* Card 3: Exploration Zones */}
        {profileData.exploration_trajectory && profileData.exploration_trajectory.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-emerald-950 text-emerald-50 rounded-[2rem] p-8 md:p-10 shadow-md relative overflow-hidden"
          >
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-800/40 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-900/30 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col gap-8 relative z-10">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400/80 mb-6 flex items-center gap-2">
                     <Map className="w-4 h-4" /> Exploration Zones
                  </h3>
                  
                  <div className="space-y-6">
                    {profileData.exploration_trajectory.map((sec: any, idx: number) => (
                      <div key={idx} className="bg-emerald-900/40 rounded-2xl p-5 border border-emerald-800/40">
                        <h4 className="font-bold text-emerald-200 mb-2">{sec.heading}</h4>
                        <p className="text-emerald-100/80 text-sm leading-relaxed">{sec.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
          </motion.div>
        )}

      </div>
    );
  }

  let hook = sectionsMap['the hook'] || sectionsMap['identity'] || sectionsMap['overview'];
  if (!hook && Object.keys(sectionsMap).length > 0) {
    const firstKey = Object.keys(sectionsMap).find(k => k !== 'the insight' && k !== 'takeaway' && k !== 'deep dive' && k !== 'dominant index');
    if (firstKey) hook = sectionsMap[firstKey];
  }
  const insight = sectionsMap['the insight'] || sectionsMap['dominant index'];
  const takeaway = sectionsMap['takeaway'];
  const deepDive = sectionsMap['deep dive'];

  return (
    <div className="w-full max-w-lg md:max-w-2xl mx-auto flex flex-col gap-6 relative z-10 text-emerald-950 pb-8 dark:text-emerald-50">
       {/* Card 1: The Hook */}
       {hook && (
         <motion.div 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
           className="relative overflow-hidden bg-white/70 dark:bg-emerald-950/40 backdrop-blur-xl border border-emerald-100 rounded-[2rem] p-8 md:p-10 shadow-sm text-center flex flex-col items-center justify-center min-h-[200px] dark:border-emerald-900"
         >
            <ParticleBackground />
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles className="w-40 h-40" />
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6 relative z-10 shadow-sm border border-emerald-100/50 dark:text-emerald-200 dark:bg-emerald-950">
               <Fingerprint className="w-3.5 h-3.5" /> Taste Archetype
            </div>
            
            <h2 className={`font-serif font-bold tracking-tight text-emerald-950 leading-tight relative z-10 text-center dark:text-emerald-50 ${hook.length > 80 ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl'}`}>
               <Markdown components={{ p: ({node, ...props}) => <span {...props} />, strong: ({node, ...props}) => <strong className="text-emerald-700 dark:text-emerald-300" {...props} /> }}>
                 {hook.replace(/[*_]/g, '')}
               </Markdown>
            </h2>
         </motion.div>
       )}

       {/* Card 2: The Insight & Takeaway */}
       {(insight || takeaway) && (
         <motion.div 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
           className="bg-emerald-950 text-emerald-50 rounded-[2rem] p-8 md:p-10 shadow-md relative overflow-hidden"
         >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-800/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-900/30 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col gap-8 relative z-10">
               {insight && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80 mb-3 flex items-center gap-2">
                       <Activity className="w-3.5 h-3.5" /> The Insight
                    </h3>
                    <p className="text-lg md:text-xl font-medium leading-relaxed text-emerald-50/90">
                       <Markdown components={{ p: ({node, ...props}) => <span {...props} /> }}>{insight}</Markdown>
                    </p>
                  </div>
               )}
               
               {takeaway && (
                  <div className="bg-emerald-900/50 rounded-2xl p-6 border border-emerald-800/50 mt-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2 flex items-center gap-2">
                       <Zap className="w-3.5 h-3.5 fill-emerald-400/20" /> Actionable Takeaway
                    </h3>
                    <p className="text-base font-medium leading-snug text-emerald-100">
                       <Markdown components={{ p: ({node, ...props}) => <span {...props} /> }}>{takeaway}</Markdown>
                    </p>
                  </div>
               )}
            </div>
         </motion.div>
       )}

       {/* Card 3: Deep Dive Expandable */}
       {deepDive && (
         <motion.div 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
           className="bg-white/60 dark:bg-emerald-950/40 backdrop-blur-md rounded-[2rem] border border-emerald-100 shadow-sm overflow-hidden dark:border-emerald-900"
         >
            <button 
               onClick={() => setExpandedDeepDive(!expandedDeepDive)}
               className="w-full flex items-center justify-between p-6 md:p-8 text-left hover:bg-emerald-50/50 dark:hover:bg-white/5 transition-colors"
            >
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100/50 flex items-center justify-center text-emerald-600 flex-shrink-0 dark:text-emerald-400">
                     <Map className="w-5 h-5" />
                  </div>
                  <div>
                     <h3 className="font-bold text-emerald-950 text-lg dark:text-emerald-50">Deep Dive</h3>
                     <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600/60 mt-0.5">Read the full analysis</p>
                  </div>
               </div>
               {expandedDeepDive ? <ChevronUp className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
            </button>

            <AnimatePresence>
               {expandedDeepDive && (
                 <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                 >
                    <div className="px-6 md:px-8 pb-8 pt-0 border-t border-emerald-50 mt-2">
                        <div className="markdown-body prose prose-emerald max-w-none text-left w-full mt-6">
                           <Markdown
                              components={{
                                 p: ({node, ...props}) => <p className="text-emerald-900/80 dark:text-emerald-100/80 leading-relaxed text-[15px] md:text-[16px] mb-5 font-medium" {...props} />,
                                 strong: ({node, ...props}) => <strong className="font-bold text-emerald-950 dark:text-emerald-50" {...props} />,
                              }}
                           >
                              {deepDive}
                           </Markdown>
                        </div>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
         </motion.div>
       )}

       {/* Retake Quiz CTA Button */}
        <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
           className="w-full mt-6 flex justify-center"
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('open-taste-quiz'));
                }}
                className="bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-black uppercase tracking-[0.15em] px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-sm border border-emerald-100 dark:bg-[#1a1a1a] dark:hover:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900"
            >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Refine with Quiz
            </button>
        </motion.div>
    </div>
  );
}
