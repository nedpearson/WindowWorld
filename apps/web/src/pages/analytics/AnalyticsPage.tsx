import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrophyIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

const REVENUE_DATA = [
  { month: 'Nov \'25', revenue: 28400, deals: 4 },
  { month: 'Dec \'25', revenue: 19200, deals: 3 },
  { month: 'Jan \'26', revenue: 34600, deals: 5 },
  { month: 'Feb \'26', revenue: 41200, deals: 6 },
  { month: 'Mar \'26', revenue: 38900, deals: 5 },
  { month: 'Apr \'26', revenue: 42600, deals: 5 },
];

const SOURCE_DATA = [
  { name: 'Referral', value: 38, color: '#3b82f6' },
  { name: 'Door Knock', value: 24, color: '#10b981' },
  { name: 'Web', value: 18, color: '#7c3aed' },
  { name: 'Storm List', value: 14, color: '#a855f7' },
  { name: 'Canvass', value: 6, color: '#64748b' },
];

const PARISH_DATA = [
  { parish: 'East Baton Rouge', leads: 52, closed: 18, revenue: 138400 },
  { parish: 'Livingston', leads: 24, closed: 7, revenue: 54200 },
  { parish: 'Ascension', leads: 18, closed: 5, revenue: 41800 },
  { parish: 'Jefferson', leads: 14, closed: 4, revenue: 29600 },
  { parish: 'St. Tammany', leads: 11, closed: 3, revenue: 22100 },
  { parish: 'Lafayette', leads: 8, closed: 1, revenue: 7400 },
];

const REP_DATA = [
  { name: 'Jake Thibodaux', closed: 14, revenue: 108600, closeRate: 72, avgTicket: 7757 },
  { name: 'Danielle Arceneaux', closed: 10, revenue: 81200, closeRate: 61, avgTicket: 8120 },
];

const PIPELINE_AGING = [
  { stage: 'Proposal Sent', count: 8, avgDays: 4.1, value: 71400 },
  { stage: 'Appointment Set', count: 7, avgDays: 2.3, value: 54300 },
  { stage: 'Inspection Complete', count: 6, avgDays: 3.8, value: 48200 },
  { stage: 'Follow Up', count: 5, avgDays: 8.2, value: 31600 },
  { stage: 'Verbal Commit', count: 3, avgDays: 1.4, value: 41200 },
];

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(148,163,184,0.1)',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
};

type Period = 'week' | 'month' | 'quarter';

function StatCard({ label, value, subtext, delta }: any) {
  return (
    <div className="card p-5">
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1.5">{value}</div>
      {subtext && <div className="text-xs text-slate-600 mt-0.5">{subtext}</div>}
      {delta !== undefined && (
        <div className={clsx('flex items-center gap-1 text-xs font-medium mt-2', delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          <ArrowUpIcon className={clsx('h-3 w-3', delta < 0 && 'rotate-180')} />
          {Math.abs(delta)}% vs last period
        </div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month');

  return (
    <div className="p-6 space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Performance overview · Louisiana territory</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 rounded-xl border border-slate-700/50 p-1">
          {(['week', 'month', 'quarter'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                period === p ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value="$42.6K" subtext="This month" delta={9} />
        <StatCard label="Closed Deals" value="5" subtext="Avg $8,520 ticket" delta={5} />
        <StatCard label="Close Rate" value="34%" subtext="vs 28% prior" delta={21} />
        <StatCard label="Pipeline Value" value="$218K" subtext="Across all stages" delta={12} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">Revenue Trend</h2>
            <span className="badge badge-green text-[10px]">↑ 9% MoM</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={REVENUE_DATA} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead sources */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-5">Lead Sources</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={SOURCE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                dataKey="value" paddingAngle={3}>
                {SOURCE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {SOURCE_DATA.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-slate-400 flex-1">{s.name}</span>
                <span className="text-xs font-mono text-slate-500">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Parish performance table */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Parish Performance</h2>
          <div className="space-y-3">
            {PARISH_DATA.map((parish, i) => {
              const closeRate = Math.round((parish.closed / parish.leads) * 100);
              return (
                <div key={parish.parish} className="flex items-center gap-3">
                  <div className="w-4 text-[10px] text-slate-600 font-mono">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-300 truncate">{parish.parish}</span>
                      <span className="text-xs font-bold text-emerald-400">${(parish.revenue / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="score-bar flex-1">
                        <div className="score-bar-fill bg-brand-500/60" style={{ width: `${closeRate}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-600 w-10 text-right">{closeRate}% close · {parish.leads} leads</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rep leaderboard */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Rep Leaderboard</h2>
            <span className="text-xs text-slate-600">({period})</span>
          </div>
          <div className="space-y-4">
            {REP_DATA.map((rep, i) => (
              <div key={rep.name} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs',
                      i === 0 ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'
                    )}>
                      {i === 0 ? '🥇' : '🥈'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{rep.name}</div>
                      <div className="text-xs text-slate-500">{rep.closed} deals · {rep.closeRate}% close</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-emerald-400">${(rep.revenue / 1000).toFixed(0)}K</div>
                    <div className="text-[10px] text-slate-600">avg ${rep.avgTicket.toLocaleString()}/deal</div>
                  </div>
                </div>
                <div className="score-bar">
                  <div className="score-bar-fill bg-brand-500" style={{ width: `${(rep.revenue / REP_DATA[0].revenue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline aging */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Pipeline Aging</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Leads</th>
                <th>Avg Days in Stage</th>
                <th>Total Value</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE_AGING.map((stage) => (
                <tr key={stage.stage}>
                  <td className="font-medium text-slate-200">{stage.stage}</td>
                  <td>{stage.count}</td>
                  <td>
                    <span className={clsx('font-mono', stage.avgDays > 7 ? 'text-red-400' : stage.avgDays > 4 ? 'text-amber-400' : 'text-slate-300')}>
                      {stage.avgDays}d
                    </span>
                  </td>
                  <td className="text-emerald-400 font-semibold">${(stage.value / 1000).toFixed(0)}K</td>
                  <td>
                    <span className={clsx('badge text-[10px]',
                      stage.avgDays > 7 ? 'badge-red' : stage.avgDays > 4 ? 'badge-yellow' : 'badge-green'
                    )}>
                      {stage.avgDays > 7 ? 'High Risk' : stage.avgDays > 4 ? 'Watch' : 'Healthy'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
