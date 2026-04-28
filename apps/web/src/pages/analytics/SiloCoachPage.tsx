import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { SparklesIcon, ArrowTrendingUpIcon, ShieldExclamationIcon, CheckCircleIcon, PlayIcon, CurrencyDollarIcon, FireIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuthStore } from '../../store/auth.store';
import apiClient from '../../api/client';
import { Link } from 'react-router-dom';
import { RepGamePanel } from '../../components/ai/RepGamePanel';

export function SiloCoachPage() {
  const user = useAuthStore(s => s.user);

  const { data: brief, isLoading } = useQuery({
    queryKey: ['silo-morning-brief', user?.id],
    queryFn: () => (apiClient as any).silo.getMorningBrief(user?.id as string).then((res: any) => res.data as any),
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-64 bg-slate-800/50 rounded-xl animate-pulse" />
            <div className="h-64 bg-slate-800/50 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
            <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="h-6 w-6 text-brand-400" />
            <h1 className="text-2xl font-bold text-white">Silo AI Coach</h1>
          </div>
          <p className="text-slate-400">Your personal morning brief and sales optimization engine.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700/50">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Today's Score</div>
            <div className="text-xl font-bold text-brand-400">{brief.scores?.todayScore || 0}/100</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Weekly Pipeline</div>
            <div className="text-xl font-bold text-emerald-400">${((brief.moneyLikelyThisWeek || 0) / 1000).toFixed(1)}k</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Action Plan & Hot Leads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Action Plan */}
          <div className="card border-brand-500/20 shadow-lg shadow-brand-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="p-5 border-b border-slate-800 flex items-center justify-between relative">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <PlayIcon className="h-5 w-5 text-brand-400" /> Daily Action Plan
              </h2>
            </div>
            <div className="p-5 relative">
              <ul className="space-y-3">
                {brief.dailyActionPlan?.map((action: string, idx: number) => (
                  <motion.li 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                    key={idx} className="flex items-start gap-3"
                  >
                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-slate-300">{action}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* Hot Leads */}
          <div className="card">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <FireIcon className="h-5 w-5 text-orange-400" /> Top Leads to Work Today
              </h2>
            </div>
            <div className="divide-y divide-slate-800/50">
              {brief.bestLeadsToWork?.map((lead: any) => (
                <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div>
                    <Link to={`/leads/${lead.id}`} className="font-medium text-white hover:text-brand-300">{lead.name}</Link>
                    <div className="text-xs text-brand-400 mt-1 flex items-center gap-1">
                      <SparklesIcon className="h-3 w-3" /> {lead.reason}
                    </div>
                  </div>
                  <Link to={`/leads/${lead.id}`} className="btn-sm btn-secondary">View Lead</Link>
                </div>
              ))}
              {(!brief.bestLeadsToWork || brief.bestLeadsToWork.length === 0) && (
                <div className="p-6 text-center text-slate-500 text-sm">No priority leads identified today.</div>
              )}
            </div>
          </div>

          {/* Hottest Proposals */}
          <div className="card">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" /> Hottest Proposals
              </h2>
            </div>
            <div className="divide-y divide-slate-800/50">
              {brief.hottestProposals?.map((prop: any) => (
                <div key={prop.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div>
                    <div className="font-medium text-white">{prop.name}</div>
                    <div className="text-xs text-slate-400 mt-1">Value: <span className="text-emerald-400 font-semibold">${prop.value.toLocaleString()}</span></div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-brand-400 uppercase font-semibold">{prop.action}</span>
                    <Link to={`/proposals/${prop.id}`} className="btn-sm btn-primary">Open</Link>
                  </div>
                </div>
              ))}
              {(!brief.hottestProposals || brief.hottestProposals.length === 0) && (
                <div className="p-6 text-center text-slate-500 text-sm">No hot proposals pending.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Scores & Risks */}
        <div className="space-y-6">
          {/* Silo AI Scores */}
          <div className="card p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-brand-400" /> Performance Drivers
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Pipeline Score', value: brief.scores?.pipelineScore, color: 'bg-emerald-500' },
                { label: 'Closing Momentum', value: brief.scores?.closingMomentum, color: 'bg-brand-500' },
                { label: 'Follow-Up Discipline', value: brief.scores?.followUpDiscipline, color: 'bg-amber-500' },
                { label: 'Appointment Readiness', value: brief.scores?.appointmentReadiness, color: 'bg-purple-500' }
              ].map(score => (
                <div key={score.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{score.label}</span>
                    <span className="text-white font-semibold">{score.value}/100</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${score.value}%` }} className={clsx("h-full rounded-full", score.color)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Follow-ups */}
          <div className="card">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <ShieldExclamationIcon className="h-5 w-5 text-amber-400" />
              <h2 className="font-semibold text-white">Overdue Follow-ups</h2>
            </div>
            <div className="divide-y divide-slate-800/50">
              {brief.overdueFollowUps?.map((f: any) => (
                <div key={f.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30">
                  <div>
                    <Link to={`/leads/${f.id}`} className="font-medium text-white hover:text-brand-300">{f.name}</Link>
                    <div className="text-xs text-amber-400 mt-1">{f.daysOverdue} days overdue</div>
                  </div>
                  <Link to={`/leads/${f.id}`} className="btn-sm btn-secondary text-xs">Work</Link>
                </div>
              ))}
              {(!brief.overdueFollowUps || brief.overdueFollowUps.length === 0) && (
                <div className="p-6 text-center flex flex-col items-center">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-400 mb-2" />
                  <div className="text-slate-300 font-medium">All caught up!</div>
                  <div className="text-xs text-slate-500">No overdue follow-ups.</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Gamification Panel */}
          <RepGamePanel />
        </div>
      </div>
    </div>
  );
}
