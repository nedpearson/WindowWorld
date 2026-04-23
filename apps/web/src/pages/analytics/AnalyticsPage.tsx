import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CurrencyDollarIcon, UsersIcon,
  TrophyIcon,
  CheckCircleIcon, BuildingStorefrontIcon,
  DocumentTextIcon, BanknotesIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import apiClient from '../../api/client';

type Period = '7d' | '30d' | '90d';
type AnalyticsTab = 'overview' | 'reps' | 'sources' | 'win-loss' | 'velocity';

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

// ── Fallback shapes so UI never breaks ─────────────────────────
const EMPTY_DASHBOARD = {
  kpis: { mtdRevenue: 0, newLeads: 0, closeRate: 0, avgDealSize: 0, proposalsSent: 0, arOutstanding: 0 },
  revenueRaw: [] as any[], funnelRaw: [] as any[], recentWins: [] as any[] };

function formatK(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`; }

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

  // ── API state ──────────────────────────────────────────────
  const [dash, setDash] = useState<any>(null);
  const [repPerf, setRepPerf] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const days = PERIOD_DAYS[period];
    setLoading(true);

    Promise.allSettled([
      apiClient.analytics.dashboard({ days }),
      apiClient.analytics.repPerformance({ days }),
      apiClient.analytics.leadSources({ days }),
      apiClient.analytics.revenueTrend(days),
      apiClient.analytics.funnel(days),
      apiClient.analytics.pipeline({ days }),
    ]).then(([d, r, s, rev, fn, pip]) => {
      if (d.status === 'fulfilled') setDash(d.value);
      if (r.status === 'fulfilled') setRepPerf((r.value as any)?.reps ?? []);
      if (s.status === 'fulfilled') setSources((s.value as any)?.sources ?? []);
      if (rev.status === 'fulfilled') setRevenue((rev.value as any)?.data ?? []);
      if (fn.status === 'fulfilled') setFunnel((fn.value as any)?.stages ?? []);
      if (pip.status === 'fulfilled') setPipeline((pip.value as any)?.stages ?? []);
      setLoading(false);
    });
  }, [period]);

  const kpis = dash?.kpis ?? EMPTY_DASHBOARD.kpis;

  const KPI_CARDS = [
    { label: 'MTD Revenue', value: formatK(kpis.mtdRevenue ?? 0), icon: CurrencyDollarIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: '/leads?status=SOLD' },
    { label: 'New Leads', value: String(kpis.newLeads ?? 0), icon: UsersIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/leads?status=NEW_LEAD' },
    { label: 'Close Rate', value: `${(kpis.closeRate ?? 0).toFixed(1)}%`, icon: TrophyIcon, color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/leads?status=VERBAL_COMMIT' },
    { label: 'Avg Deal Size', value: formatK(kpis.avgDealSize ?? 0), icon: BuildingStorefrontIcon, color: 'text-amber-400', bg: 'bg-amber-500/10', href: '/leads?status=SOLD' },
    { label: 'Proposals Sent', value: String(kpis.proposalsSent ?? 0), icon: DocumentTextIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/10', href: '/proposals?status=SENT' },
    { label: 'A/R Outstanding', value: formatK(kpis.arOutstanding ?? 0), icon: BanknotesIcon, color: 'text-red-400', bg: 'bg-red-500/10', href: '/invoices?status=OVERDUE' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
        <div className="text-xs text-slate-400 mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="text-sm" style={{ color: p.color }}>
            {typeof p.value === 'number' && p.name === 'amount' ? `$${p.value.toLocaleString()}` : p.value}
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
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(kpi.href)}
              className="card p-4 flex flex-col gap-2 cursor-pointer hover:border-slate-600 group transition-colors">
              <div className="flex items-center justify-between">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', kpi.bg)}>
                  <Icon className={clsx('h-4 w-4', kpi.color)} />
                </div>
                <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className={clsx('text-xl font-bold', kpi.color)}>
                {loading ? <span className="h-5 w-16 bg-slate-700 rounded animate-pulse inline-block" /> : kpi.value}
              </div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{kpi.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Tab nav */}
      <div className="flex gap-0.5 border-b border-slate-700 overflow-x-auto">
        {([
          ['overview', 'Overview'],
          ['reps', 'Rep Performance'],
          ['sources', 'Lead Sources'],
          ['win-loss', 'Win / Loss'],
          ['velocity', 'Pipeline Velocity'],
        ] as [AnalyticsTab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx('px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px',
              activeTab === tab ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-300')}>
            {label}
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
                <h2 className="text-sm font-semibold text-white mb-4">Revenue Trend</h2>
                {loading ? (
                  <div className="h-52 bg-slate-800 rounded-lg animate-pulse" />
                ) : revenue.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-slate-600 text-sm">No data for period</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} name="amount" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Funnel */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Conversion Funnel</h2>
                {loading ? (
                  <div className="h-52 bg-slate-800 rounded-lg animate-pulse" />
                ) : funnel.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-slate-600 text-sm">No data for period</div>
                ) : (
                  <div className="space-y-2.5 mt-2">
                    {funnel.map((stage: any, i: number) => (
                      <button key={stage.label ?? i}
                        onClick={() => stage.status && navigate(`/leads?status=${stage.status}`)}
                        className="w-full text-left group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{stage.label}</span>
                          <div className="text-xs flex items-center gap-2">
                            <span className="text-white font-medium">{stage.count}</span>
                            <span className="text-slate-500">{stage.pct?.toFixed(0)}%</span>
                            <ChevronRightIcon className="h-3 w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <div className="score-bar">
                          <motion.div className="score-bar-fill h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${stage.pct ?? 0}%` }}
                            transition={{ delay: i * 0.08, duration: 0.6 }}
                            style={{ backgroundColor: stage.color ?? '#3b82f6' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent wins */}
            <div className="card">
              <div className="flex items-center gap-2 p-4 border-b border-slate-700/50">
                <TrophyIcon className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Recent Wins</span>
              </div>
              {loading ? (
                <div className="p-4 space-y-3">
                  {[0,1,2].map(i => <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />)}
                </div>
              ) : (dash?.recentWins ?? []).length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-sm">No closed deals in this period</div>
              ) : (
                <div className="divide-y divide-slate-700/30">
                  {(dash?.recentWins ?? []).map((win: any) => (
                    <Link key={win.id} to={win.id ? `/leads/${win.id}` : '/leads?status=SOLD'}
                      className="flex items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white group-hover:text-brand-300 transition-colors">{win.name}</div>
                        <div className="text-xs text-slate-500">{win.city} · {win.windows} windows · {win.rep}</div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="text-sm font-bold text-emerald-400">${(win.amount ?? 0).toLocaleString()}</div>
                          <div className="text-[10px] text-slate-600">{win.closedAt}</div>
                        </div>
                        <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── REP PERFORMANCE ── */}
        {activeTab === 'reps' && (
          <motion.div key="reps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {loading ? (
              <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
            ) : repPerf.length === 0 ? (
              <div className="card p-12 text-center text-slate-600">No rep data for this period</div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold text-white mb-4">Revenue by Rep</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={repPerf.map((r: any) => ({ name: r.name?.split(' ')[0], revenue: r.revenue }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="amount">
                          {repPerf.map((_: any, i: number) => (
                            <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#10b981'][i % 3]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold text-white mb-4">Close Rate by Rep</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={repPerf.map((r: any) => ({ name: r.name?.split(' ')[0], rate: r.closeRate }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="rate" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                    <span className="text-sm font-semibold text-white">Rep Leaderboard ({period})</span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rank</th><th>Rep</th><th>Leads</th><th>Closed</th><th>Close Rate</th><th>Avg Deal</th><th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repPerf.map((rep: any, i: number) => (
                        <tr key={rep.id ?? i}
                          onClick={() => rep.id && navigate(`/leads?repId=${rep.id}`)}
                          className={clsx(rep.id && 'cursor-pointer hover:bg-slate-700/30 transition-colors')}>
                          <td><span className="font-bold">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span></td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-[10px] font-bold">
                                {rep.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium text-white">{rep.name}</span>
                            </div>
                          </td>
                          <td>{rep.leadsAssigned}</td>
                          <td><span className="font-medium text-white">{rep.dealsClosed}</span></td>
                          <td><span className="text-xs text-brand-400">{(rep.closeRate ?? 0).toFixed(1)}%</span></td>
                          <td className="font-mono text-sm">${(rep.avgDealSize ?? 0).toLocaleString()}</td>
                          <td className="font-bold text-emerald-400">${(rep.revenue ?? 0).toLocaleString()}</td>
                          <td><ChevronRightIcon className="h-3.5 w-3.5 text-slate-600" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── LEAD SOURCES ── */}
        {activeTab === 'sources' && (
          <motion.div key="sources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {loading ? (
              <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
            ) : sources.length === 0 ? (
              <div className="card p-12 text-center text-slate-600">No source data for this period</div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold text-white mb-4">Lead Volume by Source</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={sources.map((s: any) => ({ name: s.source, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {sources.map((_: any, i: number) => (
                            <Cell key={i} fill={['#3b82f6','#10b981','#8b5cf6','#ef4444','#f59e0b','#64748b'][i % 6]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold text-white mb-4">Revenue by Source</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={sources.filter((s: any) => s.revenue > 0).map((s: any) => ({ name: s.source, revenue: s.revenue }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="#10b981" />
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
                      <tr><th>Source</th><th>Leads</th><th>Closed</th><th>Close Rate</th><th>Revenue</th><th>Rev/Lead</th></tr>
                    </thead>
                    <tbody>
                      {[...sources].sort((a: any, b: any) => b.revenue - a.revenue).map((src: any) => (
                        <tr key={src.source}
                          onClick={() => navigate(`/leads?source=${encodeURIComponent(src.source)}`)}
                          className="cursor-pointer hover:bg-slate-700/30 transition-colors">
                          <td><span className="font-medium text-slate-200">{src.source}</span></td>
                          <td>{src.count}</td>
                          <td>{src.closed}</td>
                          <td><span className={clsx('text-xs font-medium', src.closeRate >= 30 ? 'text-emerald-400' : src.closeRate >= 20 ? 'text-brand-400' : 'text-slate-400')}>{(src.closeRate ?? 0).toFixed(1)}%</span></td>
                          <td className="font-medium text-white">${(src.revenue ?? 0).toLocaleString()}</td>
                          <td className="font-mono text-sm text-slate-400">${src.count > 0 ? Math.round((src.revenue ?? 0) / src.count).toLocaleString() : '—'}</td>
                          <td><ChevronRightIcon className="h-3.5 w-3.5 text-slate-600" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── WIN/LOSS & VELOCITY: show pipeline data ── */}
        {(activeTab === 'win-loss' || activeTab === 'velocity') && (
          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {loading ? (
              <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
            ) : pipeline.length === 0 ? (
              <div className="card p-12 text-center text-slate-600">No pipeline data for this period</div>
            ) : (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white mb-5">
                  {activeTab === 'velocity' ? 'Pipeline Velocity — Avg Days per Stage' : 'Pipeline Stage Breakdown'}
                </h2>
                <div className="space-y-4">
                  {pipeline.map((stage: any, i: number) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-400">{stage.label ?? stage.stage}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-slate-500">{stage.count} leads</span>
                          <span className="font-bold text-white">${(stage.value ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }}
                          animate={{ width: `${stage.pct ?? 0}%` }}
                          transition={{ delay: i * 0.06 }}
                          className="h-full rounded-full" style={{ background: stage.color ?? '#3b82f6' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
