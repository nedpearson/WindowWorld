import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, ChevronDownIcon, BoltIcon, CheckBadgeIcon, ShieldExclamationIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import apiClient from '../../api/client';

interface PrepPanelProps {
  appointmentId: string;
}

export function AppointmentPrepPanel({ appointmentId }: PrepPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: prepData, isLoading } = useQuery({
    queryKey: ['silo-prep', appointmentId],
    queryFn: () => (apiClient as any).silo.getAppointmentPrep(appointmentId).then((res: any) => res.data as any),
    enabled: !!appointmentId,
  });

  if (isLoading) {
    return (
      <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="h-4 w-4 text-brand-400" />
          <div className="h-4 bg-brand-500/20 rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-800 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!prepData) return null;

  return (
    <div className="bg-gradient-to-br from-brand-900/40 to-slate-900 border border-brand-500/30 rounded-xl overflow-hidden mt-4">
      {/* Header (always visible summary) */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors flex items-start justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 bg-brand-500/20 p-1.5 rounded-lg border border-brand-500/30">
            <SparklesIcon className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Silo AI Pre-Appointment Brief
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                Ready
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1 pr-4">
              <span className="font-semibold text-slate-300">Opener:</span> "{prepData.opener}"
            </p>
          </div>
        </div>
        <button className="text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronDownIcon className={clsx("h-5 w-5 transition-transform duration-200", expanded ? "rotate-180" : "")} />
        </button>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-800/50"
          >
            <div className="p-4 space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
                    <BoltIcon className="h-3 w-3 text-amber-400" /> Likely Objections
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc pl-3">
                    {prepData.likelyObjections?.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                  </ul>
                </div>
                
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
                    <CurrencyDollarIcon className="h-3 w-3 text-emerald-400" /> Financing
                  </div>
                  <div className="text-xs text-slate-300">
                    Likelihood: <span className="font-semibold text-white">{prepData.financingLikelihood}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Strategy: <span className="text-brand-400">{prepData.closingStrategy}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Recommended Pitch Strategy</div>
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-white">{prepData.bestPitchAngle}</div>
                    <CheckBadgeIcon className="h-5 w-5 text-brand-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Product</span>
                      <span className="text-white font-medium">{prepData.bestProductRecommendation}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Upsell</span>
                      <span className="text-emerald-400 font-medium">{prepData.upsellOpportunity}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Questions to Ask</div>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {prepData.questionsToAsk?.map((q: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-brand-400 mt-0.5">•</span> {q}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
                    <ShieldExclamationIcon className="h-3 w-3 text-red-400" /> Risks
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {prepData.risksToWatchFor?.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
