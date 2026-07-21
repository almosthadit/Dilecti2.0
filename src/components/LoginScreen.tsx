import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, LibraryBig, Users, Compass, AlertCircle, Heart, Tv, Headphones, Utensils, BookOpen, Globe } from 'lucide-react';
import { useUser } from '../context/UserContext';

function MarketingHeartIcons() {
  return (
    <div className="relative w-48 h-48 mx-auto my-12 flex items-center justify-center">
      {/* Central Heart */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 bg-rose-100 rounded-[2rem] flex items-center justify-center text-rose-600 shadow-xl relative z-10"
      >
        <Heart className="w-10 h-10 fill-current" />
      </motion.div>
      
      {/* Orbiting Icons */}
      <motion.div className="absolute inset-0 z-0" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
        {/* Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-500 shadow-sm">
          <Tv className="w-5 h-5" />
        </div>
        {/* Right */}
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center text-purple-500 shadow-sm" style={{ transform: 'translate(50%, -50%) rotate(-90deg)' }}>
          <Headphones className="w-5 h-5" />
        </div>
        {/* Bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center text-orange-500 shadow-sm" style={{ transform: 'translate(-50%, 50%) rotate(-180deg)' }}>
          <Utensils className="w-5 h-5" />
        </div>
        {/* Left */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-500 shadow-sm dark:bg-indigo-950 dark:border-indigo-800" style={{ transform: 'translate(-50%, -50%) rotate(90deg)' }}>
          <BookOpen className="w-5 h-5" />
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginScreen() {
  const { signIn, authError } = useUser();
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col font-sans relative overflow-x-hidden dark:bg-[#1a1a1a]">
       {/* Background structural patterns */}
       <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200/50 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] bg-indigo-200/40 rounded-full blur-3xl"></div>
       </div>

       <main className="relative z-10 flex-1 w-full max-w-lg mx-auto flex flex-col justify-center px-6 pt-12 pb-8">

         
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
           className="text-center mb-10"
         >
            <h1 className="font-serif text-4xl min-[390px]:text-[2.5rem] sm:text-[3.25rem] whitespace-nowrap font-bold tracking-tight text-neutral-900 mb-4 leading-[1.1] dark:text-white">
               Save. Share. Discover.
            </h1>
            <p className="text-neutral-600 text-lg sm:text-xl max-w-sm mx-auto dark:text-neutral-400">
               Track your favorite movies, music, and books. Connect with friends to see what they love, and discover your next obsession.
            </p>
         </motion.div>

         <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
           className="flex flex-col gap-6 mb-8"
         >
            <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-black/5 shadow-sm dark:border-white/5">
               <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-emerald-100 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 text-emerald-600 shadow-inner dark:text-emerald-400 dark:bg-emerald-900">
                     <LibraryBig className="w-7 h-7" />
                  </div>
                  <div className="pt-1">
                     <h3 className="font-bold text-neutral-900 text-lg tracking-tight mb-1 dark:text-white">Universal Taste Profile</h3>
                     <p className="text-neutral-600 text-sm leading-relaxed dark:text-neutral-400">Curate your cultural footprint. A living profile of the media, food, and places that move you.</p>
                  </div>
               </div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-black/5 shadow-sm dark:border-white/5">
               <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-indigo-100 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 text-indigo-600 shadow-inner">
                     <Compass className="w-7 h-7" />
                  </div>
                  <div className="pt-1">
                     <h3 className="font-bold text-neutral-900 text-lg tracking-tight mb-1 dark:text-white">Personalized Discovery</h3>
                     <p className="text-neutral-600 text-sm leading-relaxed dark:text-neutral-400">Get impossibly good recommendations based on the precise details of what you already love.</p>
                  </div>
               </div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-black/5 shadow-sm dark:border-white/5">
               <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-rose-100 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 text-rose-600 shadow-inner">
                     <Users className="w-7 h-7" />
                  </div>
                  <div className="pt-1">
                     <h3 className="font-bold text-neutral-900 text-lg tracking-tight mb-1 dark:text-white">Curated Circles</h3>
                     <p className="text-neutral-600 text-sm leading-relaxed dark:text-neutral-400">Build custom feeds of trusted reviews. No algorithms, just the opinions of people you care about.</p>
                  </div>
               </div>
            </div>
         </motion.div>

         <MarketingHeartIcons />

       </main>
       
       <div className="sticky bottom-0 inset-x-0 px-6 pb-8 pt-8 bg-gradient-to-t from-white via-white to-transparent dark:from-[#1a1a1a] dark:via-[#1a1a1a] dark:to-transparent z-20 mt-auto">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
             className="max-w-md mx-auto w-full"
          >
             {authError && (
               <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 dark:bg-red-950">
                 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 dark:text-red-400" />
                 <p className="text-sm text-red-800 whitespace-pre-wrap">{authError}</p>
               </div>
             )}
             <button 
               onClick={signIn}
               className="w-full bg-neutral-900 hover:bg-black text-white font-bold py-[18px] px-8 rounded-full flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-xl shadow-black/10"
             >
               <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-[22px] h-[22px] bg-white rounded-full p-0.5 dark:bg-[#1a1a1a]" />
               <span className="text-lg">Continue with Google</span>
             </button>
             <p className="text-center text-neutral-500 text-xs mt-6 font-medium dark:text-neutral-400">
                By continuing, you agree to our Terms of Service.
             </p>
          </motion.div>
       </div>
    </div>
  );
}
