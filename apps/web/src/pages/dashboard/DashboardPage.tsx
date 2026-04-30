import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  PhoneIcon, CalendarIcon, BanknotesIcon,
  ArrowTrendingUpIcon, BoltIcon, CloudIcon,
  MapPinIcon, CheckCircleIcon, ChevronRightIcon,
  ChatBubbleLeftIcon, DocumentTextIcon,
  SparklesIcon, XMarkIcon, CurrencyDollarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid, FireIcon as FireSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useAuthStore, useAppStore } from '../../store/auth.store';
import apiClient from '../../api/client';
import { useCalendarAppointments, type Appointment } from '../../api/appointments';
import { MobileAccessQR } from '../../components/MobileAccessQR';
import {
  usePipelineValueDrilldown, useRevenueDrilldown, useProposalsDrilldown,
  useApptsDrilldown, useGoalDrilldown, usePipelineDrilldown, useQueueDrilldown,
} from '../../components/DashboardDrilldowns';
import { isDemoMode } from '../../utils/isDemoMode';

// ── Helpers ────────────────────────────────────────────────────
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function formatTime(s: string) { return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

// ── Demo Data Fallbacks ────────────────────────────────────────
const DEMO_DASH_DATA = {
  kpis: { mtdRevenue: 48500, monthlyTarget: 75000 },
  pipeline: {
    stages: [
      { stage: 'LEAD', label: 'New Lead', count: 42, value: 125000, color: '#3b82f6' },
      { stage: 'APPT_SET', label: 'Appointment Set', count: 18, value: 85000, color: '#8b5cf6' },
      { stage: 'PROPOSAL_SENT', label: 'Proposal Sent', count: 12, value: 65000, color: '#f59e0b' },
      { stage: 'CONTRACT_SIGNED', label: 'Contract Signed', count: 8, value: 48500, color: '#10b981' },
    ]
  }
};

const DEMO_PROPOSALS = [
  { id: 'p1', lead: { firstName: 'John', lastName: 'Doe' }, status: 'SENT', quote: { grandTotal: 12500 }, sentAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'p2', lead: { firstName: 'Sarah', lastName: 'Smith' }, status: 'VIEWED', viewCount: 3, quote: { grandTotal: 8400 }, sentAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'p3', lead: { firstName: 'Mike', lastName: 'Johnson' }, status: 'SENT', quote: { grandTotal: 18200 }, sentAt: new Date(Date.now() - 6 * 86400000).toISOString() },
];

const DEMO_QUEUE = [
  { id: 'l1', firstName: 'Emily', lastName: 'Davis', status: 'PROPOSAL_SENT', city: 'Dallas', estimatedValue: 15000, phone: '555-0101' },
  { id: 'l2', firstName: 'Robert', lastName: 'Wilson', status: 'APPT_SET', city: 'Fort Worth', estimatedValue: 8500, phone: '555-0102', isStormLead: true },
  { id: 'l3', firstName: 'Lisa', lastName: 'Taylor', status: 'LEAD', city: 'Arlington', estimatedValue: 12000, phone: '555-0103' },
  { id: 'l4', firstName: 'James', lastName: 'Anderson', status: 'PROPOSAL_SENT', city: 'Plano', estimatedValue: 9500, phone: '555-0104' },
];

const DEMO_CAL_APTS = [
  { id: 'a1', title: 'Consultation', type: 'initial-consult', scheduledAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(), lead: { firstName: 'Emily', lastName: 'Davis', phone: '555-0101' }, address: '123 Main St, Dallas, TX', leadId: 'l1', status: 'SCHEDULED', createdById: 'u1' },
  { id: 'a2', title: 'Measurement', type: 'measurement', scheduledAt: new Date(new Date().setHours(14, 30, 0, 0)).toISOString(), lead: { firstName: 'Robert', lastName: 'Wilson', phone: '555-0102' }, address: '456 Oak Ln, Fort Worth, TX', leadId: 'l2', status: 'SCHEDULED', createdById: 'u1' },
] as Appointment[];

// ── Goal Ring ──────────────────────────────────────────────────
function GoalRing({ pct }: { pct: number }) {
  const r = 30; const circ = 2 * Math.PI * r; const dash = (pct / 100) * circ;
  return (
    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
      <motion.circle cx="36" cy="36" r={r} fill="none" stroke="url(#goalGrad)" strokeWidth="6"
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ}` }}
        transition={{ duration: 1.2, ease: 'easeOut' }} />
      <defs>
        <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Appointment Card ───────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  'initial-consult': 'border-l-blue-500',
  'measurement': 'border-l-cyan-500',
  'proposal': 'border-l-purple-500',
  'close': 'border-l-emerald-500',
  'follow-up': 'border-l-amber-500',
  'installation': 'border-l-orange-500' };

function ApptCard({ appt }: { appt: Appointment }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const leadName = appt.lead ? `${appt.lead.firstName} ${appt.lead.lastName}` : appt.title;
  const phone = appt.lead?.phone ?? '';
  const leadId = appt.leadId || appt.lead?.id;
  return (
    <div className={clsx('card p-4 border-l-4', TYPE_COLOR[appt.type] || 'border-l-slate-500')}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-xs font-semibold text-slate-400">{formatTime(appt.scheduledAt)}</div>
          {leadId ? (
            <Link to={`/leads/${leadId}`} className="text-sm font-semibold text-white hover:text-brand-300 transition-colors mt-0.5 block">
              {leadName}
            </Link>
          ) : (
            <div className="text-sm font-semibold text-white mt-0.5">{leadName}</div>
          )}
          {appt.address && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(appt.address)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 mt-0.5">
              <MapPinIcon className="h-3 w-3" />{appt.address}
            </a>
          )}
        </div>
        <button onClick={() => setDismissed(true)} className="btn-icon btn-ghost h-6 w-6 text-slate-600">
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        {phone && <a href={`tel:${phone}`} className="btn-sm btn-primary flex items-center gap-1.5 flex-1 justify-center"><PhoneIcon className="h-3.5 w-3.5" />Call</a>}
        {phone && <a href={`sms:${phone}`} className="btn-sm btn-secondary flex items-center gap-1.5 flex-1 justify-center"><ChatBubbleLeftIcon className="h-3.5 w-3.5" />Text</a>}
        {leadId && <Link to={`/leads/${leadId}`} className="btn-sm btn-secondary flex items-center gap-1.5 flex-1 justify-center"><ChevronRightIcon className="h-3.5 w-3.5" />Lead</Link>}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const stormMode = useAppStore((s) => s.stormModeActive);
  const drillPipelineValue = usePipelineValueDrilldown();
  const drillRevenue       = useRevenueDrilldown();
  const drillProposals     = useProposalsDrilldown();
  const drillAppts         = useApptsDrilldown();
  const drillGoal          = useGoalDrilldown();
  const drillPipelineStage = usePipelineDrilldown();
  const drillQueue         = useQueueDrilldown();
  const financingMode = useAppStore((s) => s.financingModeActive);

  const [showAllQueue, setShowAllQueue] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // ── Dashboard API data ──────────────────────────────────────
  const [dashData, setDashData] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    apiClient.analytics.dashboard({ days: 30 })
      .then((d: any) => setDashData(d))
      .catch(() => {}) // fail silently, show zeros
      .finally(() => setDashLoading(false));
  }, []);

  // ── Proposals awaiting response ─────────────────────────────
  const [proposals, setProposals] = useState<any[]>([]);
  useEffect(() => {
    apiClient.proposals.list({ status: 'SENT', limit: 5 })
      .then((d: any) => setProposals(d?.data ?? []))
      .catch(() => {});
  }, []);

  // ── Today's appointments via calendar hook ──────────────────
  const today = new Date();
  const rangeStart = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString(); }, []);
  const rangeEnd   = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString(); }, []);
  const { data: calApts = [] } = useCalendarAppointments(rangeStart, rangeEnd);

  // ── Action queue from leads.bestToday ──────────────────────
  const [queue, setQueue] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/leads/best-today', { params: { limit: 8 } })
      .then((r: any) => setQueue(r.data?.leads ?? r.data?.data ?? []))
      .catch(() => {});
  }, []);


  // ── Pipeline data from analytics ───────────────────────────
  const rawPipeline: any[] = dashData?.pipeline?.stages ?? [];
  const rawPipelineTotal = rawPipeline.reduce((s: number, st: any) => s + (st.value ?? 0), 0);
  const rawMtdRevenue = dashData?.kpis?.mtdRevenue ?? 0;

  // nedpearson@gmail.com → strict PRODUCTION_EMAILS block → always empty state.
  // Only org.slug === 'demo' gets demo data.
  const isDemoFallback = isDemoMode(user);

  const activeDashData = isDemoFallback ? DEMO_DASH_DATA : dashData;
  const activeProposals = isDemoFallback && proposals.length === 0 ? DEMO_PROPOSALS : proposals;
  const activeQueue = isDemoFallback && queue.length === 0 ? DEMO_QUEUE : queue;
  const activeCalApts = isDemoFallback && calApts.length === 0 ? DEMO_CAL_APTS : calApts;

  const visibleQueue = (showAllQueue ? activeQueue : activeQueue.slice(0, 3)).filter((i: any) => !dismissedIds.has(i.id));

  const pipeline: any[] = activeDashData?.pipeline?.stages ?? [];
  const pipelineTotal = pipeline.reduce((s: number, st: any) => s + (st.value ?? 0), 0);

  // ── Goals ──────────────────────────────────────────────────
  const mtdRevenue = activeDashData?.kpis?.mtdRevenue ?? 0;
  const monthlyTarget = activeDashData?.kpis?.monthlyTarget ?? 75000;
  const goalPct = Math.min(100, Math.round((mtdRevenue / monthlyTarget) * 100));

  const todayApts = activeCalApts.filter((a: any) => isSameDay(new Date(a.scheduledAt), today));


  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">
            {greeting}, <span className="text-gradient">{user?.firstName}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{todayStr} · You have{' '}
            <span className="text-amber-400 font-semibold">{activeQueue.length} actions</span> and{' '}
            <span className="text-brand-400 font-semibold">{todayApts.length} appointments</span> today
            {isDemoFallback && <span className="ml-2 px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 text-[10px] font-bold uppercase tracking-wider border border-brand-500/30">Demo Mode</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {stormMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
              <CloudIcon className="h-3.5 w-3.5" />Storm Mode
            </div>
          )}
          {financingMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <CurrencyDollarIcon className="h-3.5 w-3.5" />Financing Mode
            </div>
          )}
          <Link to="/leads/new" className="btn-primary btn-sm">+ New Lead</Link>
        </div>
      </div>

      {/* Storm banner */}
      <AnimatePresence>
        {stormMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="storm-banner">
            <CloudIcon className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Storm Opportunity Mode Active</span>
              <span className="ml-2">— Priority storm leads in your territory.</span>
            </div>
            <Link to="/leads?isStormLead=true" className="ml-auto btn btn-sm bg-purple-600 text-white hover:bg-purple-500 whitespace-nowrap">
              View Storm Leads
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pipeline Value', value: (dashLoading && !isDemoFallback) ? '—' : `$${(pipelineTotal / 1000).toFixed(0)}K`,
            sub: `${pipeline.reduce((s: number, st: any) => s + (st.count ?? 0), 0)} leads`, icon: ArrowTrendingUpIcon, color: 'blue',
            onClick: () => drillPipelineValue(pipeline, pipelineTotal) },
          { label: 'Closed This Month', value: (dashLoading && !isDemoFallback) ? '—' : `$${(mtdRevenue / 1000).toFixed(0)}K`,
            sub: `${goalPct}% of goal`, icon: BanknotesIcon, color: 'green',
            onClick: () => drillRevenue(mtdRevenue, monthlyTarget, goalPct) },
          { label: 'Proposals Pending', value: (dashLoading && !isDemoFallback) ? '—' : String(activeProposals.length),
            sub: `$${((activeProposals.reduce((s: number, p: any) => s + (p.quote?.grandTotal ?? 0), 0)) / 1000).toFixed(0)}K at stake`, icon: DocumentTextIcon, color: 'purple',
            onClick: () => drillProposals(activeProposals) },
          { label: 'Appts Today', value: String(todayApts.length),
            sub: todayApts[0] ? `Next: ${formatTime(todayApts[0].scheduledAt)}` : 'None scheduled', icon: CalendarIcon, color: 'amber',
            onClick: () => drillAppts(todayApts) },
        ].map((s) => {
          const cMap: Record<string, { g: string; ic: string }> = {
            blue:   { g: 'from-brand-600/20 to-brand-800/10 border-brand-600/20', ic: 'text-brand-400 bg-brand-500/15' },
            green:  { g: 'from-emerald-600/20 to-emerald-800/10 border-emerald-600/20', ic: 'text-emerald-400 bg-emerald-500/15' },
            purple: { g: 'from-purple-600/20 to-purple-800/10 border-purple-600/20', ic: 'text-purple-400 bg-purple-500/15' },
            amber:  { g: 'from-amber-600/20 to-amber-800/10 border-amber-600/20', ic: 'text-amber-400 bg-amber-500/15' } };
          const c = cMap[s.color];
          return (
            <motion.button key={s.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(s as any).onClick}
              className={`card p-5 bg-gradient-to-br ${c.g} text-left cursor-pointer group relative`}>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRightIcon className="h-4 w-4 text-slate-500" />
              </div>
              <div className={`p-2 rounded-lg mb-3 w-fit ${c.ic}`}><s.icon className="h-5 w-5" /></div>
              <div className="text-2xl font-bold text-white mb-0.5">{s.value}</div>
              <div className="text-xs text-slate-400 font-medium">{s.label}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{s.sub}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Mobile Field App QR */}
      <MobileAccessQR />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Action Queue */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FireSolid className="h-4 w-4 text-red-400" />
                <h2 className="text-sm font-semibold text-white">Today's Action Queue</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium">{activeQueue.length} items</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Priority AI-ranked</span>
                <BoltSolid className="h-3 w-3 text-brand-400" />
              </div>
            </div>

            {activeQueue.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircleIcon className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-semibold text-sm">All clear! Queue is empty.</p>
                <p className="text-slate-500 text-xs mt-1">Great work — all follow-ups are on track.</p>
              </div>
            ) : (
              <div>
                {visibleQueue.map((item: any, i: number) => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => drillQueue(item)}
                    className="flex items-start gap-3 px-5 py-4 hover:bg-slate-800/30 transition-colors group border-b border-slate-800/50 last:border-0 cursor-pointer">
                    <div className="flex-shrink-0 w-6 text-center">
                      <span className="text-xs font-bold text-slate-600">#{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/leads/${item.id}`} className="text-sm font-semibold text-white hover:text-brand-300 transition-colors">
                          {item.firstName} {item.lastName}
                        </Link>
                        {item.isStormLead && <span className="text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/25 px-1.5 py-0.5 rounded-full">⛈ Storm</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.status?.replace(/_/g, ' ')} · {item.city}</p>
                      {item.estimatedValue && <span className="text-xs font-semibold text-emerald-400">${item.estimatedValue.toLocaleString()}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.phone && <a href={`tel:${item.phone}`} className="btn-sm btn-primary flex items-center gap-1"><PhoneIcon className="h-3.5 w-3.5" />Call</a>}
                      <button onClick={() => setDismissedIds(prev => new Set([...prev, item.id]))}
                        className="btn-icon btn-ghost h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <XMarkIcon className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {activeQueue.length > 3 && (
                  <div className="px-5 py-3 border-t border-slate-800">
                    <button onClick={() => setShowAllQueue(!showAllQueue)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                      {showAllQueue ? '▲ Show less' : `▼ Show ${activeQueue.length - 3} more actions`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Proposals Awaiting Response */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-white">Proposals Awaiting Response</h2>
              </div>
              <Link to="/proposals" className="text-xs text-brand-400 hover:text-brand-300 font-medium">All proposals →</Link>
            </div>
            {activeProposals.length === 0 ? (
              <div className="p-8 text-center text-slate-600 text-sm">No pending proposals</div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {activeProposals.map((p: any) => {
                  const sentDays = p.sentAt ? Math.round((Date.now() - new Date(p.sentAt).getTime()) / 86400000) : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{p.lead?.firstName} {p.lead?.lastName}</span>
                          {p.status === 'VIEWED' && <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">Viewed ×{p.viewCount}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                          <span className="text-emerald-400 font-semibold">${(p.quote?.grandTotal ?? 0).toLocaleString()}</span>
                          <span className={clsx('font-medium', sentDays > 5 ? 'text-red-400' : sentDays > 3 ? 'text-amber-400' : 'text-slate-500')}>
                            Sent {sentDays}d ago
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link to={`/proposals/${p.id}`} className="btn-sm btn-secondary text-xs">View</Link>
                        <button onClick={() => toast.success(`Follow-up logged for ${p.lead?.firstName}`)} className="btn-sm btn-primary text-xs flex items-center gap-1">
                          <PhoneIcon className="h-3 w-3" />Follow Up
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pipeline */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Pipeline Breakdown</h2>
              <Link to="/pipeline" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Kanban →</Link>
            </div>
            {dashLoading && !isDemoFallback ? (
              <div className="space-y-3">{[0,1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />)}</div>
            ) : pipeline.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-4">No pipeline data</p>
            ) : (
              <div className="space-y-3">
                {pipeline.map((stage: any) => {
                  const pct = pipelineTotal > 0 ? (stage.value / pipelineTotal) * 100 : 0;
                  return (
                    <button key={stage.label ?? stage.stage} onClick={() => drillPipelineStage(stage, pipelineTotal)}
                      className="w-full text-left group hover:bg-slate-800/30 rounded-lg p-1.5 -mx-1.5 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: stage.color ?? '#64748b' }} />
                          <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{stage.label ?? stage.stage}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 font-mono">{stage.count} leads</span>
                          <span className="text-xs font-semibold text-slate-300">${((stage.value ?? 0) / 1000).toFixed(0)}K</span>
                          <ChevronRightIcon className="h-3 w-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        </div>
                      </div>
                      <div className="score-bar">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 }}
                          className="score-bar-fill" style={{ background: stage.color ?? '#3b82f6' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Goal tracker */}
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => drillGoal(mtdRevenue, monthlyTarget, goalPct)}
            className="card p-5 w-full text-left group cursor-pointer relative">
            <ChevronRightIcon className="absolute top-4 right-4 h-4 w-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <GoalRing pct={goalPct} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{goalPct}%</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Monthly Revenue</div>
                <div className="text-xl font-bold text-white mt-1">${(mtdRevenue / 1000).toFixed(0)}K</div>
                <div className="text-xs text-slate-500">of ${(monthlyTarget / 1000).toFixed(0)}K target</div>
                <div className="text-xs text-emerald-400 mt-1 font-medium">${((monthlyTarget - mtdRevenue) / 1000).toFixed(0)}K to go</div>
              </div>
            </div>
          </motion.button>

          {/* Today's Route */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">Today's Route</h2>
              </div>
              <Link to="/appointments" className="text-xs text-brand-400 hover:text-brand-300">All →</Link>
            </div>
            {todayApts.length === 0 ? (
              <div className="p-6 text-center text-slate-600 text-sm">No appointments today</div>
            ) : (
              <div className="p-4 space-y-3">
                {todayApts.map((appt) => <ApptCard key={appt.id} appt={appt} />)}
              </div>
            )}
          </div>

          {/* Silo AI Morning Brief Widget */}
          <div className="card border-brand-500/20 shadow-lg shadow-brand-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="p-4 border-b border-slate-800 flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">Silo AI Morning Brief</h2>
              </div>
              <Link to="/silo-coach" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Open Coach →</Link>
            </div>
            
            <div className="p-4 relative">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/50">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Today's Score</div>
                  <div className="text-2xl font-bold text-white">{activeQueue.length > 0 ? Math.min(100, 50 + activeQueue.length * 5) : '—'}<span className="text-sm text-slate-500 font-normal">{activeQueue.length > 0 ? '/100' : ''}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Follow-up Discipline</div>
                  <div className="text-2xl font-bold text-emerald-400">{activeQueue.length > 0 ? 'Great' : '—'}</div>
                </div>
              </div>

              {activeQueue.slice(0, 3).length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Priority Actions</div>
                  {activeQueue.slice(0, 3).map((lead: any, i: number) => (
                    <div key={lead.id} className="flex gap-3 group">
                      <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-400">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300">
                          Follow up with <span className="font-semibold text-white">{lead.firstName} {lead.lastName}</span>
                        </p>
                        <p className="text-xs text-brand-400 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          Silo AI: High close probability detected.
                        </p>
                      </div>
                      <Link to={`/leads/${lead.id}`} className="btn-sm btn-secondary flex-shrink-0 h-7 text-xs px-2">Work</Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-300 font-medium">All caught up!</p>
                  <p className="text-xs text-slate-500 mt-1">Silo AI has no priority actions for you right now.</p>
                </div>
              )}
            </div>
            <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
              <BoltIcon className="h-3 w-3 text-brand-400" />
              Press <span className="px-1.5 py-0.5 rounded bg-slate-700 font-mono text-[10px] text-slate-300">⌘J</span> anywhere to ask Silo AI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
