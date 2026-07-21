import React, { useMemo } from "react";
import { UserItem } from "../types";
import { Copy, Award, Calendar, BarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { useUserItems } from "../hooks";
import { ImageWithFallback } from "./ImageWithFallback";


export default function StatsTab() {
  const { userItems } = useUserItems();
  const books = userItems || [];

  const totalBooks = books.length;
  const ratedBooks = books.filter((b) => b.rating && b.rating > 0);
  
  const avgRating =
    ratedBooks.length > 0
      ? (
          ratedBooks.reduce((acc, curr) => acc + Number(curr.rating), 0) /
          ratedBooks.length
        ).toFixed(1)
      : "0.0";
      
  const withReviews = books.filter(
    (b) => b.review && b.review.length > 0
  ).length;

  const authorRatings = useMemo(() => {
    const authors: Record<string, { total: number; count: number }> = {};
    books.forEach((b) => {
      let creator = b.author || b.subtitle;
      if (
        creator &&
        (creator.toLowerCase().includes("wiki") ||
         creator.toLowerCase().includes("entity") ||
         creator === "Topic")
      ) {
        creator = undefined;
      }
      if (b.rating > 0 && creator) {
        if (!authors[creator]) authors[creator] = { total: 0, count: 0 };
        authors[creator].total += b.rating;
        authors[creator].count += 1;
      }
    });
    return Object.entries(authors)
      .map(([creator, { total, count }]) => ({ creator, avg: total / count }))
      .sort((a, b) => b.avg - a.avg || b.creator.localeCompare(a.creator))
      .slice(0, 5);
  }, [books]);

  const recentItems = useMemo(() => {
    return [...books].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0)).slice(0, 4);
  }, [books]);

  // Data Visualization: Items consumed over time (Grouped by Month/Year)
  const chartData = useMemo(() => {
    const data: Record<string, any> = {};
    const categories = new Set<string>();

    books.forEach((b) => {
      if (!b.dateAdded) return;
      const date = new Date(b.dateAdded);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      if (!data[monthYear]) {
        data[monthYear] = { name: monthYear, sortKey: date.getTime() };
      }
      
      const cat = b.category || "other";
      categories.add(cat);
      data[monthYear][cat] = (data[monthYear][cat] || 0) + 1;
    });

    return {
      data: Object.values(data).sort((a, b) => a.sortKey - b.sortKey),
      categories: Array.from(categories)
    };
  }, [books]);

  const categoryColors: Record<string, string> = {
    book: "#059669",
    movie: "#2563eb",
    tv: "#7c3aed",
    game: "#ea580c",
    food: "#dc2626",
    music: "#d97706",
    places: "#0891b2",
    other: "#64748b"
  };

  const getCatColor = (cat: string) => categoryColors[cat] || categoryColors.other;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full mx-auto max-w-6xl pb-24 px-4 sm:px-6 mt-6 sm:mt-12">
      <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
        <h2 className="font-serif text-3xl font-medium">Activity & Saved Content</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon={Copy} label="Items Saved" value={totalBooks.toString()} />
        <StatCard icon={StarIcon} label="Avg Rating" value={avgRating} />
        <StatCard icon={Award} label="Reviews Written" value={withReviews.toString()} />
        <StatCard icon={Calendar} label="Active Streaks" value="0" />
      </div>

      {chartData.data.length > 0 ? (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-black/5 flex flex-col h-[400px] dark:bg-[#1a1a1a] dark:border-white/5 mt-12">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <h3 className="font-serif text-xl font-medium">Consumption Over Time</h3>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.data}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.4} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} dx={-10} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                {chartData.categories.map(cat => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={getCatColor(cat)} radius={[4, 4, 0, 0]} maxBarSize={50} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-black/5 flex flex-col items-center justify-center h-[300px] dark:bg-[#1a1a1a] dark:border-white/5 mt-12">
           <BarChart2 className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mb-4" />
           <p className="text-neutral-500 font-medium">No consumption data yet.</p>
           <p className="text-neutral-400 text-sm mt-1">Start saving items to see your stats over time.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 mt-12">
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-black/5 flex flex-col h-full dark:bg-[#1a1a1a] dark:border-white/5">
           <h3 className="font-serif text-xl font-medium mb-6">Recently Saved</h3>
           <div className="space-y-4 flex-1">
             {recentItems.length === 0 ? (
                <div className="flex flex-col gap-2 h-full justify-center">
                   <p className="text-black/40 text-sm">Your saved content will appear here.</p>
                </div>
             ) : (
                recentItems.map((item, i) => (
                   <div key={`${item.id}-${i}`} className="flex gap-4 items-center bg-black/5 p-3 rounded-2xl dark:bg-white/5">
                      <div className="w-12 h-16 bg-neutral-200 rounded-lg overflow-hidden shrink-0 dark:bg-neutral-700">
                         {item.coverUrl ? <ImageWithFallback src={item.coverUrl} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="font-medium text-black truncate dark:text-white">{item.title}</h4>
                         <p className="text-xs text-black/50 truncate uppercase tracking-widest dark:text-white/50">{item.category}</p>
                      </div>
                   </div>
                ))
             )}
           </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-black/5 flex flex-col h-full dark:bg-[#1a1a1a] dark:border-white/5">
           <h3 className="font-serif text-xl font-medium mb-6">Top Rated Creators</h3>
           <div className="space-y-4 flex-1">
             {authorRatings.length === 0 ? (
                <div className="flex flex-col gap-2 h-full justify-center">
                   <p className="text-black/40 text-sm">Rate some items to see your top creators.</p>
                </div>
             ) : (
                authorRatings.map(a => (
                   <div key={a.creator} className="flex justify-between items-center text-sm p-3 bg-black/5 rounded-xl dark:bg-white/5">
                      <span className="font-medium text-black/80 truncate pr-4">{a.creator}</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold dark:text-emerald-200 dark:bg-emerald-900">{a.avg.toFixed(1)} ★</span>
                   </div>
                ))
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/5 flex flex-col justify-center items-center text-center dark:bg-[#1a1a1a] dark:border-white/5">
      <Icon className="w-6 h-6 text-emerald-800 mb-3 dark:text-emerald-200" />
      <span className="font-serif text-3xl font-bold text-neural-900 mb-1">{value}</span>
      <span className="text-xs font-semibold text-black/40 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function StarIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
