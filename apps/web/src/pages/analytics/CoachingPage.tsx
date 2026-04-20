import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChartBarIcon, UserGroupIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  StarIcon, ClockIcon, PhoneIcon, DocumentTextIcon,
  BanknotesIcon, FunnelIcon, SparklesIcon, ExclamationTriangleIcon,
  CheckCircleIcon, BoltIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, FireIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ─── Types & Demo data ─────────────────────────────────────

interface RepMetric {
  id: string;
  name: string;
  avatar: string;
  role: string;
  leadsOwned: number;
  contactRate: number;       // %
  appointmentRate: number;   // % of leads -> appt
  showRate: number;          // % appointments shown
  proposalRate: number;      // % appts -> proposal
  closeRate: number;         // % proposals -> closed
  avgDealSize: number;
  revenueThisMonth: number;
  revenueGoal: number;
  followUpCompliance: number; // % follow-ups on time
  responseTime: number;        // avg hours to first contact
  weeklyTrend: number[];       // last 8 weeks revenue
  strengths: string[];
  improvements: string[];
  coachingTip: string;
}

const DEMO_REPS: RepMetric[] = [
  {
    id: 'r1', name: 'Jake Thibodaux', avatar: 'JT', role: 'Senior Sales Rep',
    leadsOwned: 34, contactRate: 78, appointmentRate: 52, showRate: 88,
    proposalRate: 74, closeRate: 48, avgDealSize: 14200, revenueThisMonth: 42600,
    revenueGoal: 50000, followUpCompliance: 91, responseTime: 1.4,
    weeklyTrend: [8200, 9100, 7400, 10200, 8800, 11400, 9600, 12100],
    strengths: ['Close rate top 10%', 'Fastest response time', 'High appointment show rate'],
    improvements: ['Proposal acceptance below avg (48% vs 55% team)', 'Pipeline getting thin — 34 leads, need 40+'],
    coachingTip: 'Jake's closing rate is strong but his proposal-to-close gap suggests he's not pre-qualifying financing before presenting. Try leading with the monthly payment option before quoting grand total.',
  },
  {
    id: 'r2', name: 'Chad Melancon', avatar: 'CM', role: 'Sales Rep',
    leadsOwned: 28, contactRate: 61, appointmentRate: 38, showRate: 72,
    proposalRate: 68, closeRate: 38, avgDealSize: 10800, revenueThisMonth: 28400,
    revenueGoal: 40000, followUpCompliance: 67, responseTime: 4.2,
    weeklyTrend: [5100, 4800, 6200, 5400, 7100, 6800, 5900, 6300],
    strengths: ['Good avg deal size for tenure', 'Strong product knowledge'],
    improvements: ['Lowest contact rate (61%)', 'Appointment show rate needs work (72%)', 'Follow-up compliance at risk (67%)'],
    coachingTip: 'Chad is losing leads at first contact — 39% of his leads never get a response within 4h. Implement same-day follow-up discipline. Role-play voicemail script and teach SMS-first for unresponsive leads.',
  },
  {
    id: 'r3', name: 'Danielle Arceneaux', avatar: 'DA', role: 'Sales Rep',
    leadsOwned: 31, contactRate: 84, appointmentRate: 61, showRate: 91,
    proposalRate: 79, closeRate: 44, avgDealSize: 11600, revenueThisMonth: 31200,
    revenueGoal: 40000, followUpCompliance: 88, responseTime: 1.9,
    weeklyTrend: [5400, 6200, 7100, 6800, 7400, 8200, 7900, 8100],
    strengths: ['Highest appointment set rate', 'Best show rate on team (91%)', 'Strong follow-up compliance'],
    improvements: ['Close rate below potential (44%)', 'Avg deal size lowest on team — needs upsell work'],
    coachingTip: 'Danielle gets the most appointments and they actually show — the gap is at close. She\'s likely presenting before fully understanding the homeowner\'s budget pressure. Coach her on the "What would make this a yes today?" close and Series 4000 upsell story.',
  },
];

const TEAM_AVG = {
  contactRate: 74, appointmentRate: 50, showRate: 84, proposalRate: 74,
  closeRate: 43, avgDealSize: 12200, followUpCompliance: 82, responseTime: 2.5,
};

// ─── Mini sparkline ────────────────────────────────────────
function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const last = data[data.length - 1] > data[data.length - 2];
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * h} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Metric Bar ────────────────────────────────────────────
function MetricBar({ label, value, avg, format = 'pct', good = 'high' }: {
  label: string; value: number; avg: number; format?: 'pct' | 'hrs' | 'dollar'; good?: 'high' | 'low';
}) {
  const display = format === 'pct' ? `${value}%`
    : format === 'hrs' ? `${value}h`
    : `$${value.toLocaleString()}`;

  const isGood = good === 'high' ? value >= avg : value <= avg;
  const pct = format === 'dollar' ? Math.min(100, (value / (avg * 1.5)) * 100) : Math.min(100, value);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={clsx('font-semibold', isGood ? 'text-emerald-400' : 'text-amber-400')}>{display}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.1, duration: 0.6 }}
          className={clsx('h-full rounded-full', isGood ? 'bg-emerald-500' : 'bg-amber-500')} />
      </div>
      <div className="text-[9px] text-slate-700">Team avg: {format === 'pct' ? avg + '%' : format === 'hrs' ? avg + 'h' : '$' + avg.toLocaleString()}</div>
    </div>
  );
}

// ─── Rep Card ──────────────────────────────────────────────
function RepCard({ rep, rank }: { rep: RepMetric; rank: number }) {
  const [showCoach, setShowCoach] = useState(false);
  const pct = Math.min(100, Math.round((rep.revenueThisMonth / rep.revenueGoal) * 100));
  const isOnTrack = pct >= 70;
  const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.05 }}
      className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600/50 to-slate-700 flex items-center justify-center text-sm font-bold text-white">
            {rep.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{rep.name}</span>
              {rank === 0 && <FireIcon className="h-3.5 w-3.5 text-amber-400" />}
            </div>
            <div className="text-[11px] text-slate-500">{rep.role} · {rep.leadsOwned} leads</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={clsx('text-lg font-bold', isOnTrack ? 'text-emerald-400' : 'text-amber-400')}>
            ${(rep.revenueThisMonth / 1000).toFixed(0)}K
          </div>
          <div className="text-[11px] text-slate-500">{pct}% of ${(rep.revenueGoal / 1000).toFixed(0)}K goal</div>
        </div>
      </div>

      {/* Goal bar */}
      <div className="px-5 py-3 border-b border-slate-800/50">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
            className={clsx('h-full rounded-full', pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-brand-500' : 'bg-amber-500')} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>$0</span><span>${(rep.revenueGoal / 1000).toFixed(0)}K</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-5 grid grid-cols-2 gap-4">
        <MetricBar label="Contact Rate"        value={rep.contactRate}        avg={TEAM_AVG.contactRate}        format="pct" />
        <MetricBar label="Close Rate"          value={rep.closeRate}          avg={TEAM_AVG.closeRate}          format="pct" />
        <MetricBar label="Show Rate"           value={rep.showRate}           avg={TEAM_AVG.showRate}           format="pct" />
        <MetricBar label="Follow-Up Comply"    value={rep.followUpCompliance} avg={TEAM_AVG.followUpCompliance} format="pct" />
        <MetricBar label="First Response Time" value={rep.responseTime}       avg={TEAM_AVG.responseTime}       format="hrs"  good="low" />
        <MetricBar label="Avg Deal Size"       value={rep.avgDealSize}        avg={TEAM_AVG.avgDealSize}        format="dollar" />
      </div>

      {/* Trend + coach */}
      <div className="px-5 pb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] text-slate-600 mb-1">8-Week Revenue Trend</div>
          <Sparkline data={rep.weeklyTrend}
            color={rep.weeklyTrend[rep.weeklyTrend.length - 1] > rep.weeklyTrend[0] ? '#10b981' : '#f59e0b'} />
        </div>
        <button onClick={() => setShowCoach(!showCoach)}
          className={clsx('btn-sm flex items-center gap-1.5', showCoach ? 'btn-primary' : 'bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20')}>
          <SparklesIcon className="h-3.5 w-3.5" /> Coach Tips
        </button>
      </div>

      {/* Coaching panel */}
      {showCoach && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
          <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-4">
            {rep.strengths.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">Strengths</div>
                {rep.strengths.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-emerald-300 mb-1">
                    <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />{s}
                  </div>
                ))}
              </div>
            )}
            {rep.improvements.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-1.5">Areas to Improve</div>
                {rep.improvements.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-amber-300 mb-1">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />{s}
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 bg-brand-500/8 rounded-xl border border-brand-500/15">
              <div className="text-[10px] font-semibold text-brand-400 uppercase tracking-wide mb-1.5">
                <SparklesIcon className="h-3 w-3 inline mr-1" />AI Coaching Insight
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{rep.coachingTip}</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────
export function CoachingPage() {
  const [sortBy, setSortBy] = useState<'revenue' | 'closeRate' | 'contactRate'>('revenue');

  const sorted = [...DEMO_REPS].sort((a, b) => {
    if (sortBy === 'revenue') return b.revenueThisMonth - a.revenueThisMonth;
    if (sortBy === 'closeRate') return b.closeRate - a.closeRate;
    return b.contactRate - a.contactRate;
  });

  const totalRevenue = DEMO_REPS.reduce((s, r) => s + r.revenueThisMonth, 0);
  const totalGoal = DEMO_REPS.reduce((s, r) => s + r.revenueGoal, 0);
  const avgClose = Math.round(DEMO_REPS.reduce((s, r) => s + r.closeRate, 0) / DEMO_REPS.length);
  const teamPct = Math.round((totalRevenue / totalGoal) * 100);

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-brand-400" />
            <h1 className="text-xl font-bold text-white">Rep Performance Coaching</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Manager view · individual metrics, trends, and AI coaching insights</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Sort by:</span>
          {(['revenue', 'closeRate', 'contactRate'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={clsx('btn-sm text-xs capitalize', sortBy === s ? 'btn-primary' : 'btn-secondary')}>
              {s === 'revenue' ? 'Revenue' : s === 'closeRate' ? 'Close Rate' : 'Contact Rate'}
            </button>
          ))}
        </div>
      </div>

      {/* Team stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Team Revenue', value: `$${(totalRevenue / 1000).toFixed(0)}K`, sub: `${teamPct}% of $${(totalGoal / 1000).toFixed(0)}K goal`, color: 'text-brand-400' },
          { label: 'Avg Close Rate', value: `${avgClose}%`, sub: 'team average', color: 'text-emerald-400' },
          { label: 'Active Reps', value: DEMO_REPS.length, sub: 'with leads this month', color: 'text-cyan-400' },
          { label: 'At-Risk Reps', value: DEMO_REPS.filter(r => r.revenueThisMonth / r.revenueGoal < 0.6).length, sub: 'below 60% of goal', color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
            <div className="text-[11px] text-slate-600">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Rep cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {sorted.map((rep, i) => <RepCard key={rep.id} rep={rep} rank={i} />)}
      </div>

      {/* Team avg table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Team Comparison Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Rep', 'Contact %', 'Appt Set %', 'Show %', 'Proposal %', 'Close %', 'Avg Deal', 'Follow-Up %', '1st Response'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {sorted.map(rep => (
                <tr key={rep.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-200 whitespace-nowrap">{rep.name}</td>
                  {[
                    { v: rep.contactRate,        avg: TEAM_AVG.contactRate,        suf: '%' },
                    { v: rep.appointmentRate,     avg: TEAM_AVG.appointmentRate,    suf: '%' },
                    { v: rep.showRate,            avg: TEAM_AVG.showRate,           suf: '%' },
                    { v: rep.proposalRate,        avg: TEAM_AVG.proposalRate,       suf: '%' },
                    { v: rep.closeRate,           avg: TEAM_AVG.closeRate,          suf: '%' },
                    { v: rep.avgDealSize,         avg: TEAM_AVG.avgDealSize,        suf: '', prefix: '$', thresh: 0.9 },
                    { v: rep.followUpCompliance,  avg: TEAM_AVG.followUpCompliance, suf: '%' },
                    { v: rep.responseTime,        avg: TEAM_AVG.responseTime,       suf: 'h', low: true },
                  ].map((m, i) => {
                    const isGood = m.low ? m.v <= m.avg : m.v >= m.avg * (m.thresh || 1);
                    return (
                      <td key={i} className={clsx('px-4 py-3 font-medium whitespace-nowrap', isGood ? 'text-emerald-400' : 'text-amber-400')}>
                        {m.prefix}{m.prefix ? m.v.toLocaleString() : m.v}{m.suf}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Team avg row */}
              <tr className="bg-slate-800/20 border-t border-slate-700">
                <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Team Avg</td>
                {[
                  `${TEAM_AVG.contactRate}%`, `${TEAM_AVG.appointmentRate}%`, `${TEAM_AVG.showRate}%`,
                  `${TEAM_AVG.proposalRate}%`, `${TEAM_AVG.closeRate}%`, `$${TEAM_AVG.avgDealSize.toLocaleString()}`,
                  `${TEAM_AVG.followUpCompliance}%`, `${TEAM_AVG.responseTime}h`,
                ].map((v, i) => (
                  <td key={i} className="px-4 py-3 text-slate-500 text-[11px]">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
