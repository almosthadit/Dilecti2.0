import React, { useState, useEffect } from 'react';
import { View } from 'lucide-react';
import { useUserItems } from '../hooks';

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [showTokensDetails, setShowTokensDetails] = useState(false);
  const { userItems, saveItem } = useUserItems();

  useEffect(() => {
    const handleToggle = () => setOpen(prev => !prev);
    window.addEventListener('toggle-debug', handleToggle);
    return () => window.removeEventListener('toggle-debug', handleToggle);
  }, []);

  useEffect(() => {
    if (!open) return;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/system-stats');
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        setStats(data);
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [open]);

  const handleBackfill = async () => {
    setIsBackfilling(true);
    try {
      const needEmbedding = userItems.filter((i: any) => !i.embedding || i.embedding.length === 0).slice(0, 50);
      if (needEmbedding.length === 0) {
        setIsBackfilling(false);
        return;
      }
      
      const res = await fetch('/api/generate-embeddings-batch', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: needEmbedding.map(i => `${i.title} ${i.subtitle || ''} ${i.description || ''} ${i.category}`.trim()) })
      });
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      
      if (data.embeddings && data.embeddings.length === needEmbedding.length) {
        // Save them sequentially
        for (let j = 0; j < needEmbedding.length; j++) {
           await saveItem({ ...needEmbedding[j], embedding: data.embeddings[j] } as any);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleBackfillMetrics = async () => {
    setIsBackfilling(true);
    try {
      const needMetricsAll = userItems.filter((i: any) => 
        (i.category === 'movie' || i.category === 'tv' || i.category === 'book' || i.category === 'watch') && 
        (i.runtime === undefined && i.pages === undefined)
      );

      for (let i = 0; i < needMetricsAll.length; i += 50) {
        const chunk = needMetricsAll.slice(i, i + 50);
        const res = await fetch('/api/backfill-metrics', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk.map((c: any) => ({ id: c.id, title: c.title, subtitle: c.subtitle, category: c.category })) })
        });
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        
        if (data.backfilledItems) {
          for (let j = 0; j < data.backfilledItems.length; j++) {
             const bk = data.backfilledItems[j];
             const item = chunk.find((c: any) => c.id === bk.id);
             if (item && bk.metrics) {
                const itemAny = item as any;
                await saveItem({ 
                  ...item, 
                  runtime: bk.metrics.runtime || itemAny.runtime, 
                  pages: bk.metrics.pages || itemAny.pages 
                } as any);
             }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleBackfillImages = async () => {
    setIsBackfilling(true);
    try {
      const missingImagesAll = userItems.filter((i: any) => (!i.coverUrl || i.coverUrl.includes('places.googleapis.com')) && !i.image);

      for (let i = 0; i < missingImagesAll.length; i += 20) {
        const chunk = missingImagesAll.slice(i, i + 20);
        const res = await fetch('/api/fill-missing-images', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk.map((c: any) => ({ id: c.id, title: c.title, subtitle: c.subtitle, category: c.category })) })
        });
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        
        if (data.updatedItems) {
          for (let j = 0; j < data.updatedItems.length; j++) {
             const updated = data.updatedItems[j];
             const item = chunk.find((c: any) => c.id === updated.id);
             if (item && updated.coverUrl) {
                await saveItem({ 
                  ...item, 
                  coverUrl: updated.coverUrl
                } as any);
             }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBackfilling(false);
    }
  };

  const embeddedItems = userItems.filter((i: any) => i.embedding && i.embedding.length > 0).length;
  const missingImages = userItems.filter((i: any) => (!i.coverUrl || i.coverUrl.includes('places.googleapis.com')) && !i.image).length;
  const totalItems = userItems.length;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 w-80 bg-slate-900 border border-slate-700 text-slate-300 p-4 rounded-xl z-50 text-xs shadow-2xl flex flex-col gap-2 font-mono">
      <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
        <h3 className="font-bold text-white uppercase tracking-wider text-[10px]">AI Cost Center & Debug</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800">Close</button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
        <div>
          <span className="text-slate-500">Gemini Setup: </span>
          <span className={stats.apiKeyPresent ? "text-emerald-400" : "text-amber-400"}>
             {stats.apiKeyPresent ? "Active" : "Using Free Fallback"}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Local Vector Embeddings: </span>
          <span className="text-emerald-400">Enabled (Xenova)</span>
        </div>
        <div>
          <span className="text-slate-500">Global Recommend Mode: </span>
          <span className="text-cyan-400">
             {stats.apiKeyPresent ? "Gemini Generative Engine" : "0-Cost Local Vectors"}
          </span>
        </div>
        <div className="border-t border-slate-800 pt-2">
          <span className="text-slate-500 font-bold block mb-1">Cache Metrics:</span>
          <div>Cache Hits Avoided API: <span className="text-white">{stats.cacheHits || 0}</span></div>
          <div>Est. Tokens Saved: <span className="text-emerald-400">{(stats.tokensSaved || 0).toLocaleString()}</span></div>
        </div>
        <div className="border-t border-slate-800 pt-2">
          <span className="text-slate-500 font-bold block mb-1">Usage Data:</span>
          <div>Gemini API Calls: <span className="text-yellow-400">{stats.geminiCalls || 0}</span></div>
          <div>Local Vector Searches: <span className="text-cyan-400">{stats.vectorSearches || 0}</span></div>
          <div>Firestore Backend Reads: <span className="text-orange-400">{stats.firestoreReads || 0}</span> <span className="text-[10px] text-slate-500">(Quota: 50k/day)</span></div>
          <div 
            className="cursor-pointer hover:bg-slate-800/50 -mx-1 px-1 rounded transition-colors"
            onClick={() => setShowTokensDetails(!showTokensDetails)}
          >
            Tokens Used: <span className="text-fuchsia-400">{(stats.tokensUsed || 0).toLocaleString()}</span>
            <div className="text-[10px] text-slate-500">Est. Cost: <span className="text-emerald-400">${(stats.costIncurred || 0).toFixed(4)}</span></div>
          </div>
          {showTokensDetails && stats.functionTokens && (
            <div className="mt-2 pl-2 border-l border-slate-700 space-y-1 text-[10px]">
              {Object.entries(stats.functionTokens).sort((a: any, b: any) => b[1].tokens - a[1].tokens).map(([func, data]: any) => (
                <div key={func} className="flex justify-between gap-2">
                   <span className="text-slate-400 truncate" title={func}>{func}</span>
                   <span className="text-fuchsia-400 shrink-0">{data.tokens.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-slate-800 pt-2">
          <span className="text-slate-500 font-bold block mb-1">Data Health:</span>
          <div>Total Global Items: <span className="text-white">{stats.totalItems || totalItems}</span></div>
          <div>Embedded Items: <span className="text-yellow-400">{stats.embeddedItems || embeddedItems}</span></div>
          <div>Items without Images: <span className="text-rose-400">{stats.missingImages || missingImages}</span></div>
        </div>
      </div>
    </div>
  );
}
