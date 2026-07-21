import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Link, Beaker, Search, CheckCircle2 } from 'lucide-react';
import { useZingStore } from '../lib/zingStore';
import { MOCK_PARTNER, MOCK_FRIENDS } from './ZingTab';

export function AddConnectionModal({
  isOpen,
  onClose,
  type,
  onConfigNeeded
}: {
  isOpen: boolean;
  onClose: () => void;
  type: 'partner' | 'friend' | 'family' | null;
  onConfigNeeded: () => void;
}) {
  const store = useZingStore();
  const [mockState, setMockState] = useState<'default' | 'search' | 'linkCopied'>('default');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !type) return null;

  const handleClose = () => {
    setMockState('default');
    setSearchQuery('');
    onClose();
  }

  const handleCreateDemo = () => {
    if (type === 'partner') {
      store.updateConnections([...store.data.connections, MOCK_PARTNER]);
      store.updateTimeline([{ id: Date.now().toString(), title: `Partner added: ${MOCK_PARTNER.name}`, time: new Date().toISOString(), iconType: 'alert' }, ...store.data.timeline]);
      handleClose();
      onConfigNeeded();
    } else {
      store.updateConnections([...store.data.connections, MOCK_FRIENDS[0]]);
      store.updateTimeline([{ id: Date.now().toString(), title: `Friend added: ${MOCK_FRIENDS[0].name}`, time: new Date().toISOString(), iconType: 'alert' }, ...store.data.timeline]);
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh] dark:bg-[#1a1a1a]"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 p-6 shrink-0 dark:border-white/5">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {mockState === 'search' ? 'Search Users' : `Add ${type === 'partner' ? 'Partner' : type === 'friend' ? 'Friend' : 'Family Member'}`}
            </h2>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto shrink-0 flex-1">
            {mockState === 'default' && (
              <>
                <button onClick={() => setMockState('search')} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors text-left group dark:border-white/10">
                  <div className="bg-neutral-100 p-3 rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors dark:bg-neutral-800">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-white">Search Dilecti Users</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Find them by username or email</p>
                  </div>
                </button>

                <button onClick={() => {
                  setMockState('linkCopied');
                  setTimeout(() => setMockState('default'), 3000);
                }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-neutral-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left group dark:border-white/10">
                  <div className="bg-neutral-100 p-3 rounded-full group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors dark:bg-neutral-800">
                    <Link className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-white">Invite via Link</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Send them a direct invite connection</p>
                  </div>
                </button>

                <div className="relative py-4 group">
                  <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-200 dark:border-white/10" />
                  </div>
                  <div className="relative flex animate-pulse justify-center">
                      <span className="bg-white px-4 text-xs tracking-widest text-neutral-400 font-bold uppercase dark:bg-[#1a1a1a] dark:text-neutral-500">or try it out</span>
                  </div>
                </div>

                <button onClick={handleCreateDemo} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white transition-colors text-left group shadow-md border border-neutral-700">
                  <div className="bg-white/10 p-3 rounded-full text-white transition-colors group-hover:scale-110">
                    <Beaker className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white flex gap-2 items-center">
                      Create Demo {type === 'partner' ? 'Partner' : 'Friend'} <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider">Example</span>
                    </h3>
                    <p className="text-sm text-neutral-300">Test drive the full Zing experience instantly</p>
                  </div>
                </button>
              </>
            )}

            {mockState === 'linkCopied' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 dark:text-emerald-400 dark:bg-emerald-900">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-xl text-neutral-900 dark:text-white">Invite Link Copied!</h3>
                <p className="text-neutral-500 text-sm max-w-[250px] dark:text-neutral-400">
                  Send this link to your {type}. When they click it, you'll be connected on Zing.
                </p>
              </div>
            )}

            {mockState === 'search' && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="relative">
                  <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 dark:text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search by name, @username, or email..." 
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium dark:bg-neutral-800/50 dark:border-white/10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                  {searchQuery.length > 2 ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse dark:bg-neutral-800">
                        <Search className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                      </div>
                      <p className="font-medium text-neutral-900 dark:text-white">No users found</p>
                      <p className="text-sm">We couldn't find anyone matching "{searchQuery}". They must have a Dilecti account.</p>
                      <button onClick={() => setMockState('default')} className="text-indigo-600 font-bold text-sm mt-4 hover:underline">
                        Go back and invite via link instead
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm">Type at least 3 characters to search</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
