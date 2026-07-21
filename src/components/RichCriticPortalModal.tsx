import React from 'react';
import { X, TrendingUp, DollarSign, Wallet, ArrowUpRight, Gift, Share2, Award, Zap, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function RichCriticPortalModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm sm:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl pb-8 dark:bg-[#1a1a1a]"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
               <Award className="w-6 h-6" />
               <h2 className="font-serif text-xl font-bold text-neutral-900 dark:text-white">Rich Critic Portal</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-neutral-400 bg-black/5 hover:bg-black/10 hover:text-neutral-600 rounded-full transition-colors dark:text-neutral-500 dark:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 md:px-10 mt-8">
            <div className="mb-10">
              <h3 className="text-3xl md:text-5xl font-serif font-medium text-neutral-900 tracking-tight leading-tight mb-3 dark:text-white">
                Your Monetization Dashboard
              </h3>
              <p className="text-neutral-500 text-lg dark:text-neutral-400">
                Track your earnings, manage your Criticoins, and discover new ways to monetize your taste.
              </p>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col justify-between dark:bg-emerald-950 dark:border-emerald-900">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl dark:text-emerald-400 dark:bg-emerald-900">
                    <Star className="w-5 h-5" fill="currentColor" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Total Coins</span>
                </div>
                <div>
                  <div className="text-4xl font-bold text-emerald-900 mb-1 dark:text-emerald-100">1,017</div>
                  <div className="text-sm font-medium text-emerald-700 flex items-center gap-1 dark:text-emerald-300">
                    <TrendingUp className="w-3 h-3" /> +120 this week
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200 flex flex-col justify-between dark:bg-neutral-800/50 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white shadow-sm text-neutral-600 rounded-xl dark:bg-[#1a1a1a] dark:text-neutral-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Earnings</span>
                </div>
                <div>
                  <div className="text-4xl font-bold text-neutral-900 mb-1 dark:text-white">$458.20</div>
                  <div className="text-sm font-medium text-neutral-500 flex items-center gap-1 dark:text-neutral-400">
                     Ready to withdraw
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200 flex flex-col justify-between dark:bg-neutral-800/50 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white shadow-sm text-neutral-600 rounded-xl dark:bg-[#1a1a1a] dark:text-neutral-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Conversion Rate</span>
                </div>
                <div>
                  <div className="text-4xl font-bold text-neutral-900 mb-1 dark:text-white">4.2%</div>
                  <div className="text-sm font-medium text-emerald-600 flex items-center gap-1 dark:text-emerald-400">
                    <TrendingUp className="w-3 h-3" /> Top 5% of critics
                  </div>
                </div>
              </div>
            </div>

            {/* Opportunities */}
            <h4 className="text-lg font-bold text-neutral-900 mb-4 px-1 dark:text-white">Active Opportunities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div className="border border-neutral-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-sm transition-all group flex flex-col dark:border-white/10">
                <div className="flex items-start justify-between mb-3">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                         <Share2 className="w-5 h-5" />
                      </div>
                      <div>
                         <h5 className="font-semibold text-neutral-900 dark:text-white">Affiliate Link: Espresso Machine</h5>
                         <p className="text-xs text-neutral-500 dark:text-neutral-400">Breville Barista Express</p>
                      </div>
                   </div>
                   <span className="bg-neutral-100 text-neutral-600 text-xs font-bold px-2.5 py-1 rounded-md dark:text-neutral-400 dark:bg-neutral-800">8% Rev</span>
                </div>
                <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between dark:border-white/5">
                   <span className="text-sm text-neutral-500 dark:text-neutral-400">22 Conversions this month</span>
                   <button className="text-emerald-600 text-sm font-semibold flex items-center gap-1 group-hover:text-emerald-700 dark:text-emerald-400">
                     Promote <ArrowUpRight className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-sm transition-all group flex flex-col dark:border-white/10">
                <div className="flex items-start justify-between mb-3">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                         <Gift className="w-5 h-5" />
                      </div>
                      <div>
                         <h5 className="font-semibold text-neutral-900 dark:text-white">Sponsored Review: Movie</h5>
                         <p className="text-xs text-neutral-500 dark:text-neutral-400">Dune: Part Two (IMAX)</p>
                      </div>
                   </div>
                   <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md dark:text-emerald-200 dark:bg-emerald-900">500 Coins</span>
                </div>
                <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between dark:border-white/5">
                   <span className="text-sm text-neutral-500 dark:text-neutral-400">Needs your review</span>
                   <button className="text-emerald-600 text-sm font-semibold flex items-center gap-1 group-hover:text-emerald-700 dark:text-emerald-400">
                     Start <ArrowUpRight className="w-4 h-4" />
                   </button>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                 Withdraw Earnings
              </button>
              <button className="flex-1 bg-white border-2 border-neutral-200 hover:border-neutral-300 text-neutral-900 font-semibold py-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 dark:bg-[#1a1a1a] dark:text-white dark:border-white/10">
                 <Zap className="w-4 h-4 text-emerald-500" />
                 Spend Coins
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
