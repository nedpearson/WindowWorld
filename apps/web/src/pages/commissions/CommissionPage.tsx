import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BanknotesIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon,
  PencilIcon, ArrowTrendingUpIcon, UserGroupIcon, ChevronDownIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { FireIcon, TrophyIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────
interface CommissionTier {
  minRevenue: number;
  maxRevenue: number | null;
  rate: number;
  label: string;
  color: string;
}

interface Deal {
  id: string;
  customer: string;
  amount: number;
  closedAt: string;
  repId: string;
  status: 'PAID' | 'PENDING' | 'PROJECTED';
  series: string;
}

interface Rep {
  id: string;
  name: string;
  avatar: string;
  mtdRevenue: number;
  ytdRevenue: number;
  openPipeline: number;
  deals: Deal[];
}

// ─── Demo data ────────────────────────────────────────────
const DEFAULT_TIERS: CommissionTier[] = [
  { minRevenue: 0,      maxRevenue: 25000,  rate: 6,   label: 'Base',    color: 'text-slate-400' },
  { minRevenue: 25001,  maxRevenue: 50000,  rate: 8,   label: 'Silver',  color: 'text-slate-300' },
  { minRevenue: 50001,  maxRevenue: 75000,  rate: 10,  label: 'Gold',    color: 'text-amber-400' },
  { minRevenue: 75001,  maxRevenue: null,   rate: 12,  label: 'Platinum', color: 'text-purple-400' },
];

const DEMO_REPS: Rep[] = [
  {
    id: 'r1', name: 'Jake Thibodaux', avatar: 'JT',
    mtdRevenue: 42600, ytdRevenue: 89400, openPipeline: 31200,
    deals: [
      { id: 'd1', customer: 'Michael Trosclair', amount: 22400, closedAt: 'Apr 15', repId: 'r1', status: 'PENDING', series: 'Series 4000' },
      { id: 'd2', customer: 'James Hebert', amount: 11600, closedAt: 'Apr 10', repId: 'r1', status: 'PAID', series: 'Series 6000' },
      { id: 'd3', customer: 'Robert Comeaux', amount: 8600, closedAt: 'Apr 8', repId: 'r1', status: 'PAID', series: 'Series 3000' },
      { id: 'd4', customer: 'Patricia Landry (projected)', amount: 9200, closedAt: 'Projected', repId: 'r1', status: 'PROJECTED', series: 'Series 4000' },
    ],
  },
  {
    id: 'r2', name: 'Danielle Arceneaux', avatar: 'DA',
    mtdRevenue: 31200, ytdRevenue: 67200, openPipeline: 22800,
    deals: [
      { id: 'd5', customer: 'Angela Mouton', amount: 9800, closedAt: 'Apr 14', repId: 'r2', status: 'PENDING', series: 'Series 3000' },
      { id: 'd6', customer: 'Karen Guidry', amount: 12150, closedAt: 'Apr 9', repId: 'r2', status: 'PAID', series: 'Series 6000' },
      { id: 'd7', customer: 'Carol Chauvin (projected)', amount: 7400, closedAt: 'Projected', repId: 'r2', status: 'PROJECTED', series: 'Series 4000' },
    ],
  },
  {
    id: 'r3', name: 'Chad Melancon', avatar: 'CM',
    mtdRevenue: 18800, ytdRevenue: 28800, openPipeline: 14400,
    deals: [
      { id: 'd8', customer: 'Paul Guidry', amount: 10800, closedAt: 'Apr 12', repId: 'r3', status: 'PAID', series: 'Series 4000' },
      { id: 'd9', customer: 'Linda Arceneaux (projected)', amount: 8000, closedAt: 'Projected', repId: 'r3', status: 'PROJECTED', series: 'Series 3000' },
    ],
  },
];

function calcCommission(revenue: number, tiers: CommissionTier[]): { earned: number; tier: CommissionTier } {
  const tier = [...tiers].reverse().find(t => revenue >= t.minRevenue) || tiers[0];
  return { earned: revenue * (tier.rate / 100), tier };
}

// ─── Rep commission card ───────────────────────────────────
function RepCard({ rep, tiers }: { rep: Rep; tiers: CommissionTier[] }) {
  const [expanded, setExpanded] = useState(false);
  const { earned, tier } = calcCommission(rep.mtdRevenue, tiers);
  const projRevenue = rep.mtdRevenue + rep.deals.filter(d => d.status === 'PROJECTED').reduce((s, d) => s + d.amount, 0);
  const { earned: projEarned, tier: projTier } = calcCommission(projRevenue, tiers);

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600/50 to-slate-700 flex items-center justify-center text-sm font-bold text-white">
            {rep.avatar}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{rep.name}</div>
            <div className={clsx('text-xs font-medium', tier.color)}>{tier.label} Tier · {tier.rate}%</div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="btn-icon btn-ghost h-7 w-7">
            <ChevronDownIcon className={clsx('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>

        {/* Commission summary */}
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-lg font-bold text-emerald-400">${earned.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Earned MTD</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className={clsx('text-lg font-bold', projTier.color)}>${projEarned.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">With Pipeline</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-lg font-bold text-brand-400">${Math.round(rep.openPipeline * tiers[tiers.length - 1].rate / 100).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Max Potential</div>
          </div>
        </div>

        {/* Progress to next tier */}
        {tier.maxRevenue && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">Progress to next tier</span>
              <span className={clsx('font-semibold', tier.color)}>${(tier.maxRevenue - rep.mtdRevenue).toLocaleString()} to go</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (rep.mtdRevenue / tier.maxRevenue) * 100)}%` }}
                className={clsx('h-full rounded-full', tier.rate >= 10 ? 'bg-amber-500' : tier.rate >= 8 ? 'bg-brand-500' : 'bg-slate-500')} />
            </div>
          </div>
        )}
      </div>

      {/* Deal list */}
      {expanded && (
        <div className="border-t border-slate-800 divide-y divide-slate-800/50">
          {rep.deals.map(d => (
            <div key={d.id} className="px-5 py-3 flex items-center gap-3">
              <div className={clsx('w-2 h-2 rounded-full flex-shrink-0',
                d.status === 'PAID' ? 'bg-emerald-500' : d.status === 'PENDING' ? 'bg-amber-500' : 'bg-slate-600')} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">{d.customer}</div>
                <div className="text-[10px] text-slate-600">{d.series} · {d.closedAt}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-semibold text-white">${d.amount.toLocaleString()}</div>
                <div className={clsx('text-[10px]', d.status === 'PAID' ? 'text-emerald-500' : d.status === 'PENDING' ? 'text-amber-500' : 'text-slate-600')}>
                  +${(d.amount * tier.rate / 100).toFixed(0)} comm.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────
export function CommissionPage() {
  const [tiers, setTiers] = useState<CommissionTier[]>(DEFAULT_TIERS);
  const [editingTiers, setEditingTiers] = useState(false);
  const [draftTiers, setDraftTiers] = useState<CommissionTier[]>(DEFAULT_TIERS);

  const totalEarned = DEMO_REPS.reduce((s, r) => s + calcCommission(r.mtdRevenue, tiers).earned, 0);
  const totalPipeline = DEMO_REPS.reduce((s, r) => s + r.openPipeline, 0);

  const saveTiers = () => { setTiers(draftTiers); setEditingTiers(false); toast.success('Commission tiers updated!'); };

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BanknotesIcon className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Commission Tracker</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Track rep earnings, tiers, and projected payouts</p>
        </div>
        <button onClick={() => { setDraftTiers(tiers); setEditingTiers(!editingTiers); }}
          className="btn-secondary btn-sm flex items-center gap-1.5">
          <PencilIcon className="h-4 w-4" /> {editingTiers ? 'Cancel' : 'Edit Tiers'}
        </button>
      </div>

      {/* Team summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Team Commissions MTD', value: `$${totalEarned.toLocaleString('en', { maximumFractionDigits: 0 })}`, color: 'text-emerald-400' },
          { label: 'Open Pipeline', value: `$${(totalPipeline / 1000).toFixed(0)}K`, color: 'text-brand-400' },
          { label: 'Top Earner', value: DEMO_REPS.sort((a, b) => b.mtdRevenue - a.mtdRevenue)[0].name.split(' ')[0], color: 'text-amber-400' },
          { label: 'Current Avg Tier', value: `${(tiers[1].rate + tiers[2].rate) / 2}%`, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tier editor */}
      {editingTiers && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Edit Commission Tiers</h2>
          <div className="space-y-3">
            {draftTiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-slate-500 w-20 flex-shrink-0">{tier.label}</span>
                <span className="text-xs text-slate-600">from ${tier.minRevenue.toLocaleString()}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Rate:</span>
                  <input type="number" min={1} max={25} value={tier.rate}
                    onChange={e => setDraftTiers(prev => prev.map((t, j) => j === i ? { ...t, rate: Number(e.target.value) } : t))}
                    className="w-16 input py-1 text-sm" />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveTiers} className="btn-primary btn-sm mt-4 flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4" /> Save Tiers
          </button>
        </motion.div>
      )}

      {/* Tier table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Commission Structure</h2>
        </div>
        <div className="divide-y divide-slate-800/50">
          {tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className={clsx('text-xs font-bold w-20', t.color)}>{t.label}</div>
              <div className="text-xs text-slate-400 flex-1">
                ${t.minRevenue.toLocaleString()} – {t.maxRevenue ? '$' + t.maxRevenue.toLocaleString() : 'unlimited'}
              </div>
              <div className={clsx('text-sm font-bold', t.color)}>{t.rate}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rep cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {DEMO_REPS.sort((a, b) => b.mtdRevenue - a.mtdRevenue).map(r => (
          <RepCard key={r.id} rep={r} tiers={tiers} />
        ))}
      </div>
    </div>
  );
}
