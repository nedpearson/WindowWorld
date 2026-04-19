import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BoltIcon as BoltOutline, CloudIcon, FireIcon,
  TrophyIcon, ClockIcon, CurrencyDollarIcon,
  FunnelIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid, StarIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

const INTELLIGENCE_LEADS = [
  { id: '1', name: 'Michael Trosclair', city: 'Baton Rouge', parish: 'East Baton Rouge', score: 91, urgency: 88, closePct: 87, financingPct: 62, status: 'VERBAL_COMMIT', isStorm: true, est: 14800, signals: ['Storm damage signals', 'High energy bills reported', 'Verbal commit pending', 'Product selected'], pitchAngle: 'PREMIUM_VALUE', stuckDays: 3 },
  { id: '8', name: 'James Hebert', city: 'Baton Rouge', parish: 'East Baton Rouge', score: 95, urgency: 92, closePct: 95, financingPct: 30, status: 'SOLD', isStorm: false, est: 11600, signals: ['Referral lead', 'Cash buyer', 'Previously closed'], pitchAngle: 'CONSULTATIVE', stuckDays: 0 },
  { id: '2', name: 'Patricia Landry', city: 'Baton Rouge', parish: 'East Baton Rouge', score: 85, urgency: 68, closePct: 65, financingPct: 55, status: 'PROPOSAL_SENT', isStorm: false, est: 9200, signals: ['Proposal opened 3× (est.)', '3 days since proposal', 'No response yet'], pitchAngle: 'FINANCING_FIRST', stuckDays: 3 },
  { id: '4', name: 'Angela Mouton', city: 'Prairieville', parish: 'Ascension', score: 82, urgency: 75, closePct: 70, financingPct: 70, status: 'MEASURING_COMPLETE', isStorm: false, est: 8900, signals: ['Measurements verified', 'Ready to quote', 'Financing preferred'], pitchAngle: 'FINANCING_FIRST', stuckDays: 2 },
  { id: '7', name: 'Carol Chauvin', city: 'Slidell', parish: 'St. Tammany', score: 80, urgency: 62, closePct: 60, financingPct: 45, status: 'QUALIFIED', isStorm: false, est: 7400, signals: ['Referral from closed customer', 'Quality-focused buyer', 'Appointment not yet scheduled'], pitchAngle: 'PREMIUM_VALUE', stuckDays: 5 },
  { id: '6', name: 'Karen Guidry', city: 'Denham Springs', parish: 'Livingston', score: 74, urgency: 69, closePct: 55, financingPct: 65, status: 'INSPECTION_COMPLETE', isStorm: true, est: 7800, signals: ['Storm-affected', 'Inspection done', 'Awaiting proposal'], pitchAngle: 'INSURANCE_STORM', stuckDays: 4 },
  { id: '9', name: 'Louis Badeaux', city: 'Metairie', parish: 'Jefferson', score: 77, urgency: 82, closePct: 50, financingPct: 72, status: 'ATTEMPTING_CONTACT', isStorm: true, est: 6800, signals: ['Storm-affected', 'Multiple contact attempts', 'High urgency score'], pitchAngle: 'URGENCY_BASED', stuckDays: 7 },
  { id: '3', name: 'Robert Comeaux', city: 'Baton Rouge', parish: 'East Baton Rouge', score: 78, urgency: 72, closePct: 68, financingPct: 48, status: 'APPOINTMENT_SET', isStorm: false, est: 6500, signals: ['Appointment confirmed', 'Door knock lead', 'Older home (1978)'], pitchAngle: 'ENERGY_SAVINGS', stuckDays: 0 },
];

const PITCH_ANGLE_LABELS: Record<string, { label: string; color: string }> = {
  PREMIUM_VALUE:    { label: 'Premium Value', color: 'badge-purple' },
  FINANCING_FIRST:  { label: 'Financing First', color: 'badge-yellow' },
  URGENCY_BASED:    { label: 'Urgency', color: 'badge-red' },
  INSURANCE_STORM:  { label: 'Storm / Insurance', color: 'badge-storm' },
  ENERGY_SAVINGS:   { label: 'Energy Savings', color: 'badge-blue' },
  CONSULTATIVE:     { label: 'Consultative', color: 'badge-green' },
  BUDGET_CONSCIOUS: { label: 'Budget', color: 'badge-slate' },
};

const CATEGORIES = [
  { key: 'all', label: 'All Leads', icon: BoltSolid, color: 'brand' },
  { key: 'storm', label: 'Storm Leads', icon: CloudIcon, color: 'purple' },
  { key: 'hot', label: 'Hot (Score 80+)', icon: FireIcon, color: 'red' },
  { key: 'stuck', label: 'Stuck (5+ days)', icon: ClockIcon, color: 'amber' },
  { key: 'high-value', label: 'High Value ($8K+)', icon: CurrencyDollarIcon, color: 'emerald' },
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

export function LeadIntelligencePage() {
  const [category, setCategory] = useState('all');

  const filtered = INTELLIGENCE_LEADS.filter((lead) => {
    if (category === 'storm') return lead.isStorm;
    if (category === 'hot') return lead.score >= 80;
    if (category === 'stuck') return lead.stuckDays >= 5;
    if (category === 'high-value') return lead.est >= 8000;
    return true;
  });

  const totalPotential = filtered.reduce((sum, l) => sum + l.est, 0);
  const avgScore = filtered.length ? Math.round(filtered.reduce((s, l) => s + l.score, 0) / filtered.length) : 0;

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BoltSolid className="h-5 w-5 text-brand-400" />
            <h1 className="text-xl font-bold text-white">Lead Intelligence</h1>
          </div>
          <p className="text-slate-500 text-sm">
            AI-ranked leads with personalized pitch recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-4">
            <div className="text-lg font-bold text-white">${(totalPotential / 1000).toFixed(0)}K</div>
            <div className="text-xs text-slate-500">potential in view</div>
          </div>
          <Link to="/leads" className="btn-secondary btn-sm">Table View</Link>
          <Link to="/pipeline" className="btn-secondary btn-sm">Pipeline</Link>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap">
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
              {key === 'all' ? INTELLIGENCE_LEADS.length :
               key === 'storm' ? INTELLIGENCE_LEADS.filter(l => l.isStorm).length :
               key === 'hot' ? INTELLIGENCE_LEADS.filter(l => l.score >= 80).length :
               key === 'stuck' ? INTELLIGENCE_LEADS.filter(l => l.stuckDays >= 5).length :
               INTELLIGENCE_LEADS.filter(l => l.est >= 8000).length}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
          <BoltSolid className="h-3 w-3 text-brand-500" />
          AI-scored · Refreshed hourly
        </div>
      </div>

      {/* Lead cards */}
      <div className="space-y-3">
        {filtered.map((lead, idx) => {
          const pitchConfig = PITCH_ANGLE_LABELS[lead.pitchAngle];
          return (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card p-4 hover:border-slate-600/60 transition-all"
            >
              <div className="flex items-start gap-5">
                {/* Rank + score ring */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="text-xs font-bold text-slate-600">#{idx + 1}</div>
                  <ScoreRing score={lead.score} />
                  <div className="text-[9px] text-slate-600">score</div>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-base">{lead.name}</span>
                        {lead.isStorm && (
                          <span className="badge-storm text-[10px]">
                            <CloudIcon className="h-3 w-3" /> Storm
                          </span>
                        )}
                        {lead.stuckDays >= 5 && (
                          <span className="badge badge-yellow text-[10px]">
                            <ClockIcon className="h-3 w-3" /> Stuck {lead.stuckDays}d
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {lead.city} · {lead.parish} · {lead.status.replace(/_/g, ' ')}
                      </div>
                    </div>

                    {/* Value + close prob */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-emerald-400">${(lead.est / 1000).toFixed(1)}K</div>
                      <div className="text-xs text-slate-500">{lead.closePct}% close prob</div>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {[
                      { label: 'Lead Score', val: lead.score },
                      { label: 'Urgency', val: lead.urgency },
                      { label: 'Financing', val: lead.financingPct },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                          <span>{label}</span><span className="font-mono">{val}</span>
                        </div>
                        <div className="score-bar">
                          <div className="score-bar-fill" style={{
                            width: `${val}%`,
                            background: val >= 80 ? '#10b981' : val >= 60 ? '#3b82f6' : val >= 40 ? '#f59e0b' : '#64748b',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI signals + pitch */}
                  <div className="flex items-start gap-4 mt-3 pt-3 border-t border-slate-700/30">
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-600 uppercase tracking-wide mb-1.5">AI Signals</div>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.signals.map((signal) => (
                          <span key={signal} className="badge badge-slate text-[10px]">{signal}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right space-y-2">
                      <div>
                        <div className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Pitch Angle</div>
                        {pitchConfig && (
                          <span className={`badge text-[10px] ${pitchConfig.color}`}>{pitchConfig.label}</span>
                        )}
                      </div>
                      <Link to={`/leads/${lead.id}`} className="btn-primary btn-sm flex items-center gap-1">
                        Open <ChevronRightIcon className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-slate-500">No leads in this category</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 text-xs text-slate-600">
        <BoltOutline className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          AI lead scores are based on lawful, observable signals including lead source, engagement history, property characteristics, and territory data.
          Scores do not make determinations about income, creditworthiness, or any protected characteristics.
          Always exercise professional judgment. <span className="text-slate-500">Confidence scores reflect data availability, not absolute certainty.</span>
        </p>
      </div>
    </div>
  );
}
