import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SparklesIcon, CurrencyDollarIcon, ChevronDownIcon, ChevronUpIcon,
  CheckCircleIcon, XMarkIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import apiClient from '../../../api/client';
import { toast } from 'sonner';
import { haptic } from '../../../utils/haptics';

// ─── Types ────────────────────────────────────────────────────
interface Stop {
  id: string;
  lead: { id: string; name: string; score: number };
  type: string;
}

interface PitchTabProps {
  stops: Stop[];
  activeStopId: string | null;
}

// ─── Financing Calculator ─────────────────────────────────────
function FinancingCalc({ price }: { price: number }) {
  const [term, setTerm] = useState(60);
  const [rate, setRate] = useState(8.9);
  const monthly = price > 0
    ? (price * (rate / 1200)) / (1 - Math.pow(1 + rate / 1200, -term))
    : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-slate-500 mb-1">Loan Term</div>
          <div className="flex gap-1">
            {[24, 36, 60, 84, 120].map(m => (
              <button key={m} onClick={() => setTerm(m)}
                className={clsx('flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors',
                  term === m ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'
                )}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-1">APR</div>
          <div className="flex gap-1">
            {[5.9, 8.9, 12.9, 17.9].map(r => (
              <button key={r} onClick={() => setRate(r)}
                className={clsx('flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors',
                  rate === r ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                )}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 text-center">
        <div className="text-xs text-slate-500 mb-1">Monthly Payment</div>
        <div className="text-4xl font-black text-white">
          ${monthly > 0 ? monthly.toFixed(0) : '—'}
          <span className="text-sm text-slate-500 font-normal">/mo</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">{term} months · {rate}% APR</div>
      </div>
      <p className="text-[10px] text-slate-600 text-center">
        Lead with financing — "Only ${monthly > 0 ? monthly.toFixed(0) : '___'}/mo for brand new windows!"
      </p>
    </div>
  );
}

// ─── Objection Handlers ───────────────────────────────────────
const OBJECTIONS = [
  {
    q: '"It\'s too expensive"',
    a: 'I hear you — but think about it as an investment. Energy savings of $80–120/month means these windows basically pay for themselves in 7–10 years, and they\'ll be under warranty the whole time. With financing starting at $___/mo, it\'s actually less than your average utility bill increase.',
    tag: 'price',
  },
  {
    q: '"We need to think about it"',
    a: 'Totally understand. Most people feel that way. Can I ask — is there a specific concern I can help clarify right now? Often what feels like a big decision gets clearer when we break it down. Also, our install calendar books up fast — I can pencil you in for a later date with no obligation.',
    tag: 'stall',
  },
  {
    q: '"We got a cheaper quote"',
    a: 'Great question. There are a lot of window companies out there. What matters most is the warranty, the installer\'s track record, and what\'s actually in the window. May I ask who you got the quote from? WindowWorld has been in Louisiana for X years and our warranty is lifetime transferable — that\'s rare.',
    tag: 'competitor',
  },
  {
    q: '"Need to talk to my spouse"',
    a: 'Of course! Is there any way we could set up a quick call with both of you? Even 10 minutes on the phone together helps me answer everyone\'s questions at once. When would work — evenings or weekends?',
    tag: 'spouse',
  },
  {
    q: '"Not the right time"',
    a: 'I totally respect that. Can I ask — is it a timing issue around budget, schedule, or something else? Sometimes I can build a solution around your timeline. And if it\'s truly not the right time, I\'d love to keep in touch — our prices aren\'t going down.',
    tag: 'timing',
  },
  {
    q: '"Windows look fine to me"',
    a: 'That\'s actually the most common situation we see. Most windows fail from the inside out — you won\'t see the seal failure until condensation or drafts appear. Can I show you a quick inspection trick? It\'ll take 30 seconds and will tell us if you have any hidden issues.',
    tag: 'no_need',
  },
];

function ObjectionCard({ objection }: { objection: typeof OBJECTIONS[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 overflow-hidden">
      <button
        onClick={() => { haptic.tap(); setExpanded(e => !e); }}
        className="w-full flex items-center justify-between p-3.5 text-left"
      >
        <div className="text-sm font-medium text-slate-200">{objection.q}</div>
        {expanded
          ? <ChevronUpIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
          : <ChevronDownIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
        }
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="h-px bg-slate-700/50 mb-3" />
              <p className="text-sm text-slate-300 leading-relaxed italic">"{objection.a}"</p>
              <span className={clsx(
                'inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded',
                objection.tag === 'price' ? 'bg-red-500/15 text-red-400' :
                objection.tag === 'competitor' ? 'bg-orange-500/15 text-orange-400' :
                'bg-slate-700 text-slate-500'
              )}>#{objection.tag}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Pitch Coach ───────────────────────────────────────────
function AIPitchCoach({ leadId, leadName }: { leadId: string; leadName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-summary', leadId],
    queryFn: () => apiClient.leads.getAiSummary(leadId),
    staleTime: 10 * 60 * 1000,
    enabled: !!leadId,
  });

  const summary = (data as any)?.data;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/30">
        <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Loading AI insights for {leadName}…</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/30 text-xs text-slate-500">
        No AI analysis available yet. Complete an inspection to unlock AI insights.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {summary.recommendedPitchAngle && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20">
          <SparklesIcon className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] font-bold text-brand-400 uppercase tracking-wide mb-1">Recommended Pitch</div>
            <div className="text-sm text-white font-medium">{summary.recommendedPitchAngle.replace(/_/g, ' ')}</div>
          </div>
        </div>
      )}
      {summary.likelyObjections?.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-2">Likely Objections</div>
          {summary.likelyObjections.map((obj: string) => (
            <div key={obj} className="flex items-center gap-2 text-xs text-amber-200 mb-1">
              <ExclamationTriangleIcon className="h-3 w-3 text-amber-400 flex-shrink-0" />
              {obj}
            </div>
          ))}
        </div>
      )}
      {summary.estimatedRevenue && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-xs text-emerald-300">Estimated Revenue</span>
          <span className="text-sm font-bold text-emerald-400">
            ${Number(summary.estimatedRevenue).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── PitchTab ─────────────────────────────────────────────────
export function PitchTab({ stops, activeStopId }: PitchTabProps) {
  const [section, setSection] = useState<'coach' | 'objections' | 'financing'>('coach');
  const [projectPrice, setProjectPrice] = useState(8000);

  const activeStop = stops.find(s => s.id === activeStopId) ?? stops[0];

  return (
    <div className="space-y-4">
      {/* Section switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-800 border border-slate-700/50">
        {([
          { key: 'coach', label: '🤖 Coach' },
          { key: 'objections', label: '💬 Objections' },
          { key: 'financing', label: '💰 Financing' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { haptic.selection(); setSection(key); }}
            className={clsx(
              'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
              section === key ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active stop indicator */}
      {activeStop ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30">
          <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-xs text-slate-400">Active stop:</span>
          <span className="text-xs font-semibold text-white">{activeStop.lead.name}</span>
          <span className={clsx(
            'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded',
            activeStop.lead.score >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
            activeStop.lead.score >= 40 ? 'bg-amber-500/20 text-amber-400' :
            'bg-slate-700 text-slate-500'
          )}>
            Score {activeStop.lead.score}
          </span>
        </div>
      ) : (
        <div className="text-xs text-slate-500 px-1">Select a stop in the Route tab</div>
      )}

      <AnimatePresence mode="wait">
        {/* AI Coach */}
        {section === 'coach' && (
          <motion.div key="coach" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
            <div className="flex items-center gap-2">
              <BoltIcon className="h-4 w-4 text-brand-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">AI Pitch Intelligence</span>
            </div>
            {activeStop
              ? <AIPitchCoach leadId={activeStop.lead.id} leadName={activeStop.lead.name} />
              : (
                <div className="space-y-2">
                  {[
                    { icon: '🔑', tip: 'Always confirm both decision-makers are present before starting your pitch.' },
                    { icon: '📊', tip: 'Lead with energy savings data — Louisiana homeowners average $1,200/yr in HVAC savings with new windows.' },
                    { icon: '🌊', tip: 'Storm season pitch: "If one hurricane window breaks, your entire house is at risk."' },
                    { icon: '⏰', tip: 'Create urgency: install calendar fills 4–6 weeks out. Today\'s visit is your best opportunity.' },
                    { icon: '💪', tip: 'Lifetime warranty is your biggest differentiator. Competitors offer 10-20 years — we do lifetime.' },
                  ].map(({ icon, tip }) => (
                    <div key={tip} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/30">
                      <span className="text-base flex-shrink-0">{icon}</span>
                      <p className="text-xs text-slate-300 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              )
            }
          </motion.div>
        )}

        {/* Objections */}
        {section === 'objections' && (
          <motion.div key="obj" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
            <div className="text-xs text-slate-500">Tap an objection to see your rebuttal script</div>
            {OBJECTIONS.map(o => <ObjectionCard key={o.q} objection={o} />)}
          </motion.div>
        )}

        {/* Financing calculator */}
        {section === 'financing' && (
          <motion.div key="fin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-500">Project Total</div>
                <div className="text-sm font-bold text-white">${projectPrice.toLocaleString()}</div>
              </div>
              <input
                type="range" min={2000} max={50000} step={500}
                value={projectPrice}
                onChange={e => setProjectPrice(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>$2,000</span><span>$50,000</span>
              </div>
            </div>
            <FinancingCalc price={projectPrice} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
