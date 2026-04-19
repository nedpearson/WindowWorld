import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CurrencyDollarIcon, UsersIcon, ChartBarIcon,
  TrophyIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  CalendarIcon, FunnelIcon, ClockIcon, BoltIcon as BoltOutline,
  CheckCircleIcon, ExclamationCircleIcon, BuildingStorefrontIcon,
  DocumentTextIcon, BanknotesIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, FunnelChart, Funnel,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LabelList,
} from 'recharts';

// ── Demo Data ──────────────────────────────────────────────────

const REVENUE_TREND = [
  { week: 'Mar 17', amount: 8200, leads: 14 },
  { week: 'Mar 24', amount: 11400, leads: 18 },
  { week: 'Mar 31', amount: 9800, leads: 16 },
  { week: 'Apr 7',  amount: 15600, leads: 22 },
  { week: 'Apr 14', amount: 13200, leads: 19 },
  { week: 'Apr 19', amount: 18400, leads: 26 },
];

const FUNNEL_DATA = [
  { label: 'Leads In',      count: 87,  pct: 100, color: '#3b82f6' },
  { label: 'Appt Set',      count: 62,  pct: 71,  color: '#6366f1' },
  { label: 'Inspected',     count: 48,  pct: 55,  color: '#8b5cf6' },
  { label: 'Proposal Sent', count: 39,  pct: 45,  color: '#a855f7' },
  { label: 'Committed',     count: 24,  pct: 28,  color: '#c026d3' },
  { label: 'Closed/Won',    count: 19,  pct: 22,  color: '#10b981' },
];

const REP_PERFORMANCE = [
  { id: 'r1', name: 'Jake Thibodaux', role: 'SALES_REP', avatar: 'JT', metrics: { leadsAssigned: 38, dealsClosed: 12, revenue: 89_400, closeRate: 31.6, avgDealSize: 7450, proposalsSent: 18 } },
  { id: 'r2', name: 'Danielle Adams', role: 'SALES_REP', avatar: 'DA', metrics: { leadsAssigned: 31, dealsClosed: 8,  revenue: 67_200, closeRate: 25.8, avgDealSize: 8400, proposalsSent: 14 } },
  { id: 'r3', name: 'Marcus Duplessis', role: 'SALES_REP', avatar: 'MD', metrics: { leadsAssigned: 18, dealsClosed: 4,  revenue: 28_800, closeRate: 22.2, avgDealSize: 7200, proposalsSent: 9 } },
];

const SOURCE_DATA = [
  { source: 'CANVASS', count: 32, closed: 8,  revenue: 58_400, closeRate: 25, color: '#3b82f6' },
  { source: 'REFERRAL', count: 18, closed: 7,  revenue: 54_600, closeRate: 38.9, color: '#10b981' },
  { source: 'WEBSITE', count: 14, closed: 3,  revenue: 22_100, closeRate: 21.4, color: '#8b5cf6' },
  { source: 'STORM',   count: 11, closed: 3,  revenue: 27_300, closeRate: 27.3, color: '#ef4444' },
  { source: 'SOCIAL',  count: 7,  closed: 1,  revenue: 7_450,  closeRate: 14.3, color: '#f59e0b' },
  { source: 'MAILER',  count: 5,  closed: 0,  revenue: 0,      closeRate: 0,    color: '#64748b' },
];

const KPIS = [
  { label: 'MTD Revenue', value: '$76,600', sub: '+18.4% vs last month', trend: 'up', icon: CurrencyDollarIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'New Leads', value: '87', sub: '+12 this week', trend: 'up', icon: UsersIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Close Rate', value: '21.8%', sub: '+3.2pp vs last month', trend: 'up', icon: TrophyIcon, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: 'Avg Deal Size', value: '$7,854', sub: '+$340 vs last month', trend: 'up', icon: BuildingStorefrontIcon, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Proposals Sent', value: '41', sub: '19 viewed · 15 accepted', trend: 'up', icon: DocumentTextIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { label: 'A/R Outstanding', value: '$24,380', sub: '$4,200 overdue', trend: 'neutral', icon: BanknotesIcon, color: 'text-red-400', bg: 'bg-red-500/10' },
];

const RECENT_WINS = [
  { id: 'w1', name: 'Michael Trosclair', amount: 8840, windows: 9, series: 'Series 4000', rep: 'Jake T.', city: 'Baton Rouge', closedAt: '2h ago' },
  { id: 'w2', name: 'Karen Guidry', amount: 12_150, windows: 14, series: 'Series 6000', rep: 'Danielle A.', city: 'Denham Springs', closedAt: 'Yesterday' },
  { id: 'w3', name: 'Angela Mouton', amount: 7_450, windows: 7, series: 'Series 4000', rep: 'Danielle A.', city: 'Prairieville', closedAt: '2 days ago' },
  { id: 'w4', name: 'James Hebert', amount: 11_600, windows: 11, series: 'Series 6000', rep: 'Jake T.', city: 'Baton Rouge', closedAt: '3 days ago' },
];

const ACTIVE_CAMPAIGNS = [
  { id: 'c1', name: 'New Lead Welcome Sequence', enrollments: 34, completions: 12, openRate: 68.2, clickRate: 24.1 },
  { id: 'c2', name: 'Proposal Follow-up Sequence', enrollments: 19, completions: 7, openRate: 74.3, clickRate: 31.8 },
  { id: 'c3', name: 'Storm Damage Urgency Campaign', enrollments: 8, completions: 3, openRate: 72.5, clickRate: 38.2 },
  { id: 'c4', name: 'Post-Install Review Request', enrollments: 15, completions: 11, openRate: 81.3, clickRate: 42.7 },
];

type Period = '7d' | '30d' | '90d';

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'reps' | 'campaigns' | 'sources'>('overview');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
        <div className="text-xs text-slate-400 mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="text-sm" style={{ color: p.color }}>
            {p.name === 'amount' ? `$${p.value.toLocaleString()}` : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics &amp; Reporting</h1>
          <p className="text-slate-500 text-sm mt-0.5">WindowWorld Louisiana · Baton Rouge HQ</p>
        </div>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('btn-sm', period === p ? 'btn-primary' : 'btn-secondary')}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPIS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }} className="card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', kpi.bg)}>
                  <Icon className={clsx('h-4 w-4', kpi.color)} />
                </div>
                {kpi.trend === 'up' && <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-emerald-400" />}
                {kpi.trend === 'down' && <ArrowTrendingDownIcon className="h-3.5 w-3.5 text-red-400" />}
              </div>
              <div className={clsx('text-xl font-bold', kpi.color)}>{kpi.value}</div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{kpi.label}</div>
              <div className="text-[10px] text-slate-600">{kpi.sub}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-slate-700">
        {(['overview', 'reps', 'campaigns', 'sources'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx('px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors -mb-px',
              activeTab === tab ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-300')}>
            {tab === 'reps' ? 'Rep Performance' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Revenue trend */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Revenue Trend (Weekly)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={REVENUE_TREND} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} name="amount" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Conversion funnel */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Conversion Funnel (Last 30 Days)</h2>
                <div className="space-y-2.5">
                  {FUNNEL_DATA.map((stage, i) => (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{stage.label}</span>
                        <div className="text-xs flex items-center gap-2">
                          <span className="text-white font-medium">{stage.count}</span>
                          <span className="text-slate-500">{stage.pct}%</span>
                        </div>
                      </div>
                      <div className="score-bar">
                        <motion.div className="score-bar-fill h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${stage.pct}%` }}
                          transition={{ delay: i * 0.08, duration: 0.6 }}
                          style={{ backgroundColor: stage.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Overall close rate</span>
                    <span className="font-bold text-emerald-400">21.8%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent wins */}
            <div className="card">
              <div className="flex items-center gap-2 p-4 border-b border-slate-700/50">
                <TrophyIcon className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Recent Wins</span>
              </div>
              <div className="divide-y divide-slate-700/30">
                {RECENT_WINS.map((win) => (
                  <div key={win.id} className="flex items-center gap-4 p-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{win.name}</div>
                      <div className="text-xs text-slate-500">{win.city} · {win.windows} windows · {win.series} · {win.rep}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">${win.amount.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-600">{win.closedAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── REP PERFORMANCE ── */}
        {activeTab === 'reps' && (
          <motion.div key="reps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Revenue by Rep</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={REP_PERFORMANCE.map((r) => ({ name: r.name.split(' ')[0], revenue: r.metrics.revenue }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="amount">
                      {REP_PERFORMANCE.map((_, i) => (
                        <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#10b981'][i % 3]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Close Rate by Rep</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={REP_PERFORMANCE.map((r) => ({ name: r.name.split(' ')[0], rate: r.metrics.closeRate }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]} name="amount" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rep leaderboard table */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                <span className="text-sm font-semibold text-white">Rep Leaderboard ({period})</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Rep</th>
                    <th>Leads</th>
                    <th>Proposals</th>
                    <th>Deals Closed</th>
                    <th>Close Rate</th>
                    <th>Avg Deal</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {REP_PERFORMANCE.map((rep, i) => (
                    <tr key={rep.id}>
                      <td>
                        <span className={clsx('font-bold text-base', i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : 'text-amber-700')}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-[10px] font-bold">
                            {rep.avatar}
                          </div>
                          <span className="font-medium text-white">{rep.name}</span>
                        </div>
                      </td>
                      <td>{rep.metrics.leadsAssigned}</td>
                      <td>{rep.metrics.proposalsSent}</td>
                      <td><span className="font-medium text-white">{rep.metrics.dealsClosed}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="score-bar flex-1 h-1.5">
                            <div className="score-bar-fill bg-brand-500" style={{ width: `${rep.metrics.closeRate * 2}%` }} />
                          </div>
                          <span className="text-xs text-brand-400">{rep.metrics.closeRate}%</span>
                        </div>
                      </td>
                      <td className="font-mono text-sm">${rep.metrics.avgDealSize.toLocaleString()}</td>
                      <td className="font-bold text-emerald-400">${rep.metrics.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── CAMPAIGNS ── */}
        {activeTab === 'campaigns' && (
          <motion.div key="campaigns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Active Campaigns', value: '4', color: 'text-brand-400' },
                { label: 'Total Enrolled', value: '76', color: 'text-white' },
                { label: 'Avg Open Rate', value: '74.1%', color: 'text-emerald-400' },
                { label: 'Avg Click Rate', value: '34.2%', color: 'text-purple-400' },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div className={clsx('stat-value', s.color)}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Campaign Performance</span>
                <Link to="/leads" className="btn-primary btn-sm">Manage Campaigns</Link>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Enrolled</th>
                    <th>Completed</th>
                    <th>Open Rate</th>
                    <th>Click Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_CAMPAIGNS.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium text-white">{c.name}</td>
                      <td>{c.enrollments}</td>
                      <td>{c.completions}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="score-bar w-20 h-1.5">
                            <div className="score-bar-fill bg-emerald-500" style={{ width: `${c.openRate}%` }} />
                          </div>
                          <span className="text-xs text-emerald-400">{c.openRate}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="score-bar w-20 h-1.5">
                            <div className="score-bar-fill bg-purple-500" style={{ width: `${c.clickRate}%` }} />
                          </div>
                          <span className="text-xs text-purple-400">{c.clickRate}%</span>
                        </div>
                      </td>
                      <td><span className="badge badge-green text-[10px]">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── SOURCES ── */}
        {activeTab === 'sources' && (
          <motion.div key="sources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Lead Volume by Source</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={SOURCE_DATA.map((s) => ({ name: s.source, count: s.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="amount">
                      {SOURCE_DATA.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Revenue by Source</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={SOURCE_DATA.filter((s) => s.revenue > 0).map((s) => ({ name: s.source, revenue: s.revenue }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="amount">
                      {SOURCE_DATA.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                <span className="text-sm font-semibold text-white">Source Performance Breakdown</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Leads</th>
                    <th>Closed</th>
                    <th>Close Rate</th>
                    <th>Revenue Generated</th>
                    <th>Revenue/Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {SOURCE_DATA.sort((a, b) => b.revenue - a.revenue).map((src) => (
                    <tr key={src.source}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: src.color }} />
                          <span className="font-medium text-slate-200">{src.source}</span>
                        </div>
                      </td>
                      <td>{src.count}</td>
                      <td>{src.closed}</td>
                      <td>
                        <span className={clsx('text-xs font-medium', src.closeRate >= 30 ? 'text-emerald-400' : src.closeRate >= 20 ? 'text-brand-400' : 'text-slate-400')}>
                          {src.closeRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="font-medium text-white">${src.revenue.toLocaleString()}</td>
                      <td className="font-mono text-sm text-slate-400">
                        ${src.count > 0 ? (src.revenue / src.count).toFixed(0) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
