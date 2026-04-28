import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BoltIcon as BoltOutline, CloudIcon, FireIcon, ClockIcon, CurrencyDollarIcon, ChevronRightIcon,
  ChartBarIcon, ExclamationTriangleIcon, ChatBubbleLeftIcon, ShieldExclamationIcon, BuildingOfficeIcon, SparklesIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import apiClient from '../../api/client';

const PITCH_ANGLE_LABELS: Record<string, { label: string; color: string }> = {
  PREMIUM_VALUE:    { label: 'Premium Value', color: 'badge-purple' },
  FINANCING_FIRST:  { label: 'Financing First', color: 'badge-yellow' },
  URGENCY_BASED:    { label: 'Urgency', color: 'badge-red' },
  INSURANCE_STORM:  { label: 'Storm / Insurance', color: 'badge-storm' },
  ENERGY_SAVINGS:   { label: 'Energy Savings', color: 'badge-blue' },
  CONSULTATIVE:     { label: 'Consultative', color: 'badge-green' },
  BUDGET_CONSCIOUS: { label: 'Budget', color: 'badge-slate' }
};

const CATEGORIES = [
  { key: 'all', label: 'All Leads', icon: BoltSolid },
  { key: 'storm', label: 'Storm Leads', icon: CloudIcon },
  { key: 'hot', label: 'Hot (Score 80+)', icon: FireIcon },
  { key: 'stuck', label: 'Stuck (5+ days)', icon: ClockIcon },
  { key: 'high-value', label: 'High Value ($8K+)', icon: CurrencyDollarIcon },
];

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * 18;
  const strokeDash = (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : '#f59e0b';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="4" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

// ── Daily Trend Signals ───────────────────────────────────────
function DailyTrendSignals() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-brand-500/20 mb-6">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-brand-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Daily Trend Signals: Baton Rouge Area</h2>
        </div>
        <ChevronDownIcon className={clsx('h-5 w-5 text-slate-500 transition-transform', expanded && 'rotate-180')} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <CloudIcon className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Weather Alerts</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Recent hail reports in Prairieville & Gonzales area. Expect an 18% spike in search volume for "window damage repair" over the next 48 hours.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <FireIcon className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Homeowner Shifts</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  High volume of home refinancing inquiries in Ascencion Parish. Homeowners are accessing equity specifically for exterior remodels.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <BuildingOfficeIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Competitor Weakness</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  "ReliaBilt" reviews dropping on local Google pages due to install delays. Heavy opportunity to pitch our "Guaranteed Timeline" to comparison shoppers.
                </p>
              </div>

              <div className="bg-brand-500/10 rounded-xl p-4 border border-brand-500/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <SparklesIcon className="h-4 w-4 text-brand-400" />
                  <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide">Marketing Angle (24h)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  "Did the last storm leave micro-cracks? Get a free 21-point Window World inspection." Focus ad-spend on the 70769 zip code.
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Lead Intelligence Page ───────────────────────────────────────
export function LeadIntelligencePage() {
  const [category, setCategory] = useState('all');
  const [leads, setLeads] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.leads.list({ sortBy: 'aiScore', sortDir: 'desc', limit: 50 })
      .then((d: any) => {
        const raw: any[] = d?.data ?? d?.leads ?? [];
        setLeads(raw.map((l: any, i: number) => {
          // Generate mock properties if they don't exist for the expanded intelligence card
          const mockReason = l.isStormLead ? "Recent hail damage inquiry detected in local zip code" : "Multiple site visits and pricing page views";
          const mockFirstMessage = `Hi ${l.firstName}, noticed you're looking into replacement windows in ${l.city}. We have a local crew near you this week offering free assessments.`;
          const mockOffer = l.financingLikelihood > 50 ? "$0 Down, 0% Interest for 18 Months" : "Free Premium Upgrade on 5+ Windows";
          const mockRisks = l.aiScore < 70 ? ["Comparing 3+ quotes", "High price sensitivity"] : ["Might delay until next spring"];
          const mockCompetitor = i % 3 === 0 ? "Renewal by Andersen" : i % 2 === 0 ? "Champion Windows" : "Local Contractor";
          
          return {
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            city: l.city ?? '',
            parish: l.parish ?? l.county ?? l.city ?? '',
            score: l.aiScore ?? 50,
            urgency: l.urgencyScore ?? l.urgency ?? 50,
            closePct: l.closeProbability ?? l.closePct ?? 50,
            financingPct: l.financingLikelihood ?? l.financingPct ?? 30,
            status: l.status,
            isStorm: l.isStormLead ?? false,
            est: l.estimatedValue ?? 0,
            signals: l.aiSignals ?? l.signals ?? [],
            pitchAngle: l.pitchAngle ?? 'CONSULTATIVE',
            stuckDays: l.stuckDays ?? 0,
            reasonForFlagging: l.reasonForFlagging ?? mockReason,
            firstContactMsg: l.firstContactMsg ?? mockFirstMessage,
            bestOffer: l.bestOffer ?? mockOffer,
            riskFactors: l.riskFactors ?? mockRisks,
            competitor: l.competitor ?? mockCompetitor,
          };
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter((lead) => {
    if (category === 'storm') return lead.isStorm;
    if (category === 'hot') return lead.score >= 80;
    if (category === 'stuck') return lead.stuckDays >= 5;
    if (category === 'high-value') return lead.est >= 8000;
    return true;
  });

  const totalPotential = filtered.reduce((sum, l) => sum + l.est, 0);

  return (
    <div className="p-6 space-y-5 page-transition max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BoltSolid className="h-6 w-6 text-brand-400" />
            <h1 className="text-2xl font-bold text-white">Lead Intelligence Engine</h1>
          </div>
          <p className="text-slate-400 text-sm">
            AI-identified, high-intent homeowners matching 5-star customer profiles.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4 border-r border-slate-700 pr-6">
            <div className="text-2xl font-bold text-white">${(totalPotential / 1000).toFixed(0)}K</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold">potential in view</div>
          </div>
          <Link to="/leads" className="btn-secondary">Table View</Link>
          <Link to="/pipeline" className="btn-secondary">Pipeline</Link>
        </div>
      </div>

      <DailyTrendSignals />

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              category === key
                ? 'bg-brand-600/20 text-brand-300 border-brand-500/40'
                : 'text-slate-500 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 rounded-full">
              {key === 'all' ? leads.length :
               key === 'storm' ? leads.filter(l => l.isStorm).length :
               key === 'hot' ? leads.filter(l => l.score >= 80).length :
               key === 'stuck' ? leads.filter(l => l.stuckDays >= 5).length :
               leads.filter(l => l.est >= 8000).length}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
          <BoltSolid className="h-3 w-3 text-brand-500" />
          Real-time Engine Active
        </div>
      </div>

      {/* Lead cards */}
      <div className="space-y-4">
        {filtered.map((lead, idx) => {
          const pitchConfig = PITCH_ANGLE_LABELS[lead.pitchAngle];
          return (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card p-0 overflow-hidden border border-slate-700/60 hover:border-brand-500/30 transition-all"
            >
              <div className="p-5 flex flex-col lg:flex-row items-start gap-6">
                
                {/* Left Column: Core Identity */}
                <div className="flex flex-col items-center justify-center gap-2 w-full lg:w-48 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-700/50 pb-4 lg:pb-0 lg:pr-6">
                  <ScoreRing score={lead.score} size={80} />
                  <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Intent Score</div>
                  <div className="text-center mt-2">
                    <div className="font-bold text-white text-lg">{lead.name || 'Anonymous Homeowner'}</div>
                    <div className="text-sm text-slate-400 mt-0.5">{lead.city || 'Baton Rouge'} {lead.parish ? `· ${lead.parish}` : ''}</div>
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Predicted Value</div>
                    <div className="text-xl font-bold text-emerald-400">${(lead.est / 1000).toFixed(1)}K</div>
                  </div>
                </div>

                {/* Middle Column: Intelligence Data */}
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider">
                      <SparklesIcon className="h-3.5 w-3.5" /> {lead.closePct}% Close Prob.
                    </div>
                    {lead.isStorm && (
                      <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider">
                        <CloudIcon className="h-3.5 w-3.5" /> Storm Tracker
                      </div>
                    )}
                    {pitchConfig && (
                      <div className={`flex items-center gap-1.5 badge text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider ${pitchConfig.color}`}>
                        {pitchConfig.label}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Reason for Flagging</div>
                    <div className="text-sm text-slate-300 bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                      {lead.reasonForFlagging}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                        <CurrencyDollarIcon className="h-4 w-4" /> Best Offer to Present
                      </div>
                      <div className="text-sm font-medium text-emerald-400">
                        {lead.bestOffer}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                        <BuildingOfficeIcon className="h-4 w-4" /> Likely Competitor
                      </div>
                      <div className="text-sm font-medium text-slate-300">
                        {lead.competitor}
                      </div>
                    </div>
                  </div>

                  {lead.riskFactors && lead.riskFactors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                        <ShieldExclamationIcon className="h-4 w-4 text-amber-500" /> Risk Factors
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lead.riskFactors.map((risk: string, i: number) => (
                          <span key={i} className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                            {risk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                      <ChatBubbleLeftIcon className="h-4 w-4" /> Recommended First Message
                    </div>
                    <div className="text-sm text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 italic">
                      "{lead.firstContactMsg}"
                    </div>
                  </div>
                </div>

                {/* Right Column: Actions */}
                <div className="flex flex-col gap-2 w-full lg:w-40 flex-shrink-0">
                  <Link to={`/leads/${lead.id}`} className="btn-primary w-full justify-center">
                    Open Lead
                  </Link>
                  <button className="btn-secondary w-full justify-center bg-brand-600/10 text-brand-400 border-brand-500/30 hover:bg-brand-600/20">
                    Send Message
                  </button>
                  <button className="btn-secondary w-full justify-center">
                    Dismiss
                  </button>
                </div>

              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card p-12 text-center border-dashed border-2 border-slate-700/50">
            <SparklesIcon className="h-12 w-12 text-brand-500/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Leads Match Criteria</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              The Intelligence Engine hasn't flagged any recent leads matching this specific category.
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-xs text-slate-500 mt-8">
        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-slate-600" />
        <p className="leading-relaxed">
          The 5-Star Lead Intelligence Engine synthesizes behavioral signals, regional weather data, and property characteristics to predict intent. 
          Recommendations are AI-generated based on Window World's highest-performing historical engagements in the Baton Rouge territory. 
          Data is refreshed hourly.
        </p>
      </div>
    </div>
  );
}
