import React from 'react';
import { DollarSign, ArrowRight, Star, TrendingUp, Award } from 'lucide-react';

export default function EarnTab() {
  return (
    <div className="min-h-screen pb-24 bg-white pt-12 md:pt-16 animate-in fade-in duration-300 dark:bg-[#1a1a1a]">
      <div className="max-w-xl mx-auto px-4 md:px-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:text-emerald-400 dark:bg-emerald-900">
            <DollarSign className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-2 dark:text-white">Earnings Zone</h1>
          <p className="text-neutral-600 font-medium text-sm md:text-base dark:text-neutral-400">
            Monetize your great taste. Earn rewards when friends discover things you love.
          </p>
        </div>

        <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm mb-6 flex flex-col items-center justify-center text-center dark:bg-[#1a1a1a] dark:border-white/5">
          <p className="text-neutral-500 font-semibold uppercase tracking-widest text-xs mb-2 dark:text-neutral-400">Available Balance</p>
          <div className="text-5xl font-bold text-emerald-600 tracking-tight dark:text-emerald-400">$0.00</div>
          <button className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-full w-full max-w-xs transition-all shadow-md">
            Cash Out
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-neutral-900 mt-8 mb-4 dark:text-white">How to Earn</h3>
          
          <div className="bg-white border border-black/5 p-4 rounded-2xl flex gap-4 items-start shadow-sm dark:bg-[#1a1a1a] dark:border-white/5">
             <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 fill-current" />
             </div>
             <div>
                <h4 className="font-bold text-neutral-900 dark:text-white">Curate Your Library</h4>
                <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Add your favorite items and leave thoughtful reviews.</p>
             </div>
          </div>

          <div className="bg-white border border-black/5 p-4 rounded-2xl flex gap-4 items-start shadow-sm dark:bg-[#1a1a1a] dark:border-white/5">
             <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
             </div>
             <div>
                <h4 className="font-bold text-neutral-900 dark:text-white">Influence Others</h4>
                <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Get paid when other users purchase or engage with your recommendations.</p>
             </div>
          </div>
          
          <div className="bg-white border border-black/5 p-4 rounded-2xl flex gap-4 items-start shadow-sm dark:bg-[#1a1a1a] dark:border-white/5">
             <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
             </div>
             <div>
                <h4 className="font-bold text-neutral-900 dark:text-white">Become a Top Critic</h4>
                <p className="text-sm text-neutral-500 mt-1 dark:text-neutral-400">Earn bonuses by consistently surfacing high-quality finds.</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
