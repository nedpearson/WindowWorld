import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FireIcon, EnvelopeIcon, PhoneIcon, ChatBubbleLeftIcon, HandRaisedIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import apiClient from '../../api/client';
import { Link } from 'react-router-dom';

export function FollowUpEngine() {
  const { data: followUps, isLoading } = useQuery({
    queryKey: ['silo-follow-up-engine'],
    queryFn: () => (apiClient as any).silo.getFollowUpEngine().then((res: any) => res.data as any)
  });

  if (isLoading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-48 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-slate-800 rounded-xl" />
          <div className="h-16 bg-slate-800 rounded-xl" />
          <div className="h-16 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!followUps || !followUps.priorityFollowUps) return null;

  return (
    <div className="card p-5 border-amber-500/20 shadow-lg shadow-amber-500/5 bg-gradient-to-br from-amber-900/10 to-slate-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FireIcon className="h-6 w-6 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Silo Money Engine</h2>
        </div>
        <div className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
          {followUps.priorityFollowUps.length} Priority Actions
        </div>
      </div>

      <div className="space-y-3">
        {followUps.priorityFollowUps.map((lead: any, i: number) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={lead.id} 
            className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link to={`/leads/${lead.id}`} className="font-bold text-white hover:text-amber-400 transition-colors">
                    {lead.name}
                  </Link>
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{lead.status}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <HandRaisedIcon className="h-3.5 w-3.5 text-red-400" /> 
                  <span className="text-red-400 font-medium">{lead.daysStale} days stale</span>
                  <span className="mx-1">·</span>
                  <span className="text-emerald-400 font-semibold">${lead.value?.toLocaleString()}</span>
                </div>
                <div className="text-xs text-brand-400 mt-1.5 italic bg-brand-500/10 inline-block px-2 py-0.5 rounded border border-brand-500/20">
                  {lead.siloReason}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:flex-shrink-0">
              <button className="btn-sm bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1.5">
                <EnvelopeIcon className="h-3.5 w-3.5" /> Email
              </button>
              <button className="btn-sm bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1.5">
                <ChatBubbleLeftIcon className="h-3.5 w-3.5" /> SMS
              </button>
              <button className="btn-sm bg-brand-600/20 text-brand-400 border border-brand-500/20 hover:bg-brand-600/30 flex items-center gap-1.5">
                <PhoneIcon className="h-3.5 w-3.5" /> Call
              </button>
            </div>
          </motion.div>
        ))}

        {followUps.priorityFollowUps.length === 0 && (
          <div className="text-center py-6">
            <div className="text-slate-400 font-medium">Pipeline is perfectly up to date.</div>
            <div className="text-xs text-slate-500 mt-1">No stale leads detected by Silo AI.</div>
          </div>
        )}
      </div>
    </div>
  );
}
