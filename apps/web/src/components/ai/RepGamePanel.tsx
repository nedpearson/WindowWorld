import { motion } from 'framer-motion';
import { FireIcon, TrophyIcon, StarIcon, BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

export function RepGamePanel() {
  // Static demo data for gamification
  const stats = {
    streakDays: 14,
    weeklyScore: 850,
    premiumRatio: 42,
    responseSpeed: 'Fast',
    rank: 'Top 10%'
  };

  return (
    <div className="card p-5 border-brand-500/20 bg-gradient-to-br from-brand-900/10 to-slate-900 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-4 relative">
        <TrophyIcon className="h-5 w-5 text-amber-400" />
        <h2 className="text-sm font-semibold text-white">Rep Leaderboard Stats</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 relative">
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <FireIcon className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Login Streak</div>
            <div className="text-lg font-bold text-white">{stats.streakDays} <span className="text-sm text-slate-400 font-normal">days</span></div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <StarIcon className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Weekly Score</div>
            <div className="text-lg font-bold text-white">{stats.weeklyScore} <span className="text-sm text-slate-400 font-normal">pts</span></div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <TrophyIcon className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Premium Ratio</div>
            <div className="text-lg font-bold text-white">{stats.premiumRatio}%</div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <BoltIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Lead Response</div>
            <div className="text-sm font-bold text-emerald-400">{stats.responseSpeed}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-between items-center text-xs">
        <span className="text-slate-400">Current Standing</span>
        <span className="font-bold text-brand-400">{stats.rank}</span>
      </div>
    </div>
  );
}
