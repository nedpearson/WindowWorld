import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  PhoneIcon, EnvelopeIcon, CalendarIcon, BanknotesIcon,
  ArrowTrendingUpIcon, BoltIcon, CloudIcon, FireIcon,
  MapPinIcon, ClockIcon, ArrowUpIcon, ArrowDownIcon,
  ExclamationTriangleIcon, CheckCircleIcon, ChevronRightIcon,
  ChatBubbleLeftIcon, DocumentTextIcon, UserGroupIcon,
  SparklesIcon, ArrowPathIcon, FunnelIcon, StarIcon,
  XMarkIcon, CurrencyDollarIcon, CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid, FireIcon as FireSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useAuthStore, useAppStore } from '../../store/auth.store';

// ─── Demo data ────────────────────────────────────────────────
const TODAY_QUEUE = [
  {
    id: '1', name: 'Michael Trosclair', phone: '(225) 555-1003',
    action: 'Schedule sign & install', actionType: 'schedule' as const,
    stage: 'VERBAL_COMMIT', urgency: 'critical' as const,
    reason: 'Verbal commit — waiting on contract. Series 4000 pricing locks in 5 days.',
    estValue: 14800, daysSinceContact: 5,
  },
  {
    id: '2', name: 'Patricia Landry', phone: '(225) 555-2048',
    action: 'Follow up on proposal', actionType: 'call' as const,
    stage: 'PROPOSAL_SENT', urgency: 'high' as const,
    reason: 'Proposal viewed 2x but no response in 4 days.',
    estValue: 9200, daysSinceContact: 4,
  },
  {
    id: '3', name: 'Susan Bourgeois', phone: '(225) 555-3102',
    action: 'Make first contact', actionType: 'call' as const,
    stage: 'NEW_LEAD', urgency: 'high' as const,
    reason: 'Storm lead — optimal contact window is 24–48h after storm.',
    estValue: 4200, daysSinceContact: 1,
    isStorm: true,
  },
  {
    id: '4', name: 'Angela Mouton', phone: '(225) 555-4413',
    action: 'Send proposal', actionType: 'proposal' as const,
    stage: 'MEASURING_COMPLETE', urgency: 'medium' as const,
    reason: 'All measurements verified — ready to generate proposal.',
    estValue: 8900, daysSinceContact: 3,
  },
  {
    id: '5', name: 'Robert Comeaux', phone: '(225) 555-0021',
    action: 'Confirm appointment', actionType: 'text' as const,
    stage: 'APPOINTMENT_SET', urgency: 'medium' as const,
    reason: 'Appointment tomorrow at 10 AM — needs confirmation.',
    estValue: 6800, daysSinceContact: 2,
  },
];

const FOLLOW_UPS_OVERDUE = [
  { id: '6', name: 'Carol Chauvin', daysOverdue: 3, stage: 'FOLLOW_UP', phone: '(225) 555-5560' },
  { id: '7', name: 'James Fontenot', daysOverdue: 5, stage: 'QUALIFIED', phone: '(225) 555-6671' },
];

const TODAY_APPTS = [
  { id: 'a1', time: '10:00 AM', name: 'Robert Comeaux', type: 'initial-consult', address: '4821 Scenic Hwy, BR', phone: '(225) 555-0021', duration: 90, status: 'CONFIRMED', prepItems: ['Window count: 10', 'Year built: 1988', 'Insurance claim likely'] },
  { id: 'a2', time: '1:30 PM', name: 'Karen Guidry', type: 'measurement', address: '312 Sherwood Forest Blvd, BR', phone: '(225) 555-7723', duration: 60, status: 'CONFIRMED', prepItems: ['8 openings to measure', 'Bring laser measure', 'Storm damage noted'] },
  { id: 'a3', time: '3:45 PM', name: 'Tom Bergeron', type: 'proposal', address: '—', phone: '(225) 555-8834', duration: 45, status: 'SCHEDULED', prepItems: ['Series 3000 proposal ready', 'Financing: 18-mo same-as-cash', 'Wife sits in on calls'] },
];

const PIPELINE_STAGES = [
  { stage: 'New Lead', count: 14, value: 58200, color: 'bg-slate-500' },
  { stage: 'Attempting Contact', count: 8, value: 31600, color: 'bg-amber-500' },
  { stage: 'Appointment Set', count: 7, value: 54300, color: 'bg-blue-500' },
  { stage: 'Proposal Sent', count: 8, value: 71400, color: 'bg-purple-500' },
  { stage: 'Verbal Commit', count: 3, value: 41200, color: 'bg-emerald-500' },
];

const PROPOSALS_PENDING = [
  { id: 'p1', name: 'Patricia Landry', value: 9200, sentDays: 4, viewCount: 2, status: 'VIEWED' },
  { id: 'p2', name: 'Carol Chauvin', value: 7400, sentDays: 7, viewCount: 0, status: 'SENT' },
  { id: 'p3', name: 'Mark Hebert', value: 12100, sentDays: 2, viewCount: 1, status: 'VIEWED' },
];

const GOAL = { target: 75000, current: 42600, label: 'Monthly Revenue' };

const URGENCY_CONFIG = {
  critical: { label: 'Critical', class: 'text-red-400 bg-red-500/10 border-red-500/20', dot: 'bg-red-400', pulse: true },
  high:     { label: 'High',     class: 'text-amber-400 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400', pulse: false },
  medium:   { label: 'Medium',   class: 'text-blue-400 bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400', pulse: false },
};

const ACTION_CONFIG = {
  call:     { icon: PhoneIcon,         label: 'Call',          class: 'btn-primary', href: (phone: string) => `tel:${phone}` },
  text:     { icon: ChatBubbleLeftIcon, label: 'Text',          class: 'btn-secondary', href: (phone: string) => `sms:${phone}` },
  schedule: { icon: CalendarIcon,      label: 'Schedule',      class: 'btn-primary', href: () => '/appointments' },
  proposal: { icon: DocumentTextIcon,  label: 'Send Proposal', class: 'btn-primary', href: (_, id: string) => `/leads/${id}` },
  email:    { icon: EnvelopeIcon,      label: 'Email',         class: 'btn-secondary', href: () => '#' },
};

const TYPE_COLOR: Record<string, string> = {
  'initial-consult': 'border-l-blue-500 bg-blue-500/5',
  'measurement': 'border-l-cyan-500 bg-cyan-500/5',
  'proposal': 'border-l-purple-500 bg-purple-500/5',
  'close': 'border-l-emerald-500 bg-emerald-500/5',
  'follow-up': 'border-l-amber-500 bg-amber-500/5',
  'installation': 'border-l-orange-500 bg-orange-500/5',
};

// ─── Goal Ring ─────────────────────────────────────────────────
function GoalRing({ pct }: { pct: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
      <motion.circle cx="36" cy="36" r={r} fill="none" stroke="url(#goalGrad)" strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ}` }}
        transition={{ duration: 1.2, ease: 'easeOut' }} />
      <defs>
        <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Appointment Prep Card ─────────────────────────────────────
function ApptPrepCard({ appt }: { appt: typeof TODAY_APPTS[0] }) {
  const [dismissed, setDismissed] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  if (dismissed) return null;

  const typeLabel = {
    'initial-consult': 'Consultation', 'measurement': 'Measurement',
    'proposal': 'Proposal Pres.', 'close': 'Contract Signing', 'follow-up': 'Follow-Up',
  }[appt.type] || appt.type;

  const toggleCheck = (i: number) => setCheckedItems((prev) => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  return (
    <div className={clsx('card p-4 border-l-4', TYPE_COLOR[appt.type] || 'border-l-slate-500')}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{appt.time}</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{typeLabel}</span>
          </div>
          <div className="text-sm font-semibold text-white mt-0.5">{appt.name}</div>
          {appt.address !== '—' && (
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

      {/* Prep checklist */}
      <div className="space-y-1.5 mb-3">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Prep Checklist</div>
        {appt.prepItems.map((item, i) => (
          <button key={i} onClick={() => toggleCheck(i)}
            className="flex items-center gap-2 w-full text-left group">
            <div className={clsx('w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors',
              checkedItems.has(i) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-400')}>
              {checkedItems.has(i) && <CheckCircleIcon className="h-3 w-3 text-white" />}
            </div>
            <span className={clsx('text-xs transition-colors', checkedItems.has(i) ? 'line-through text-slate-600' : 'text-slate-400')}>{item}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <a href={`tel:${appt.phone}`} className="btn-sm btn-primary flex items-center gap-1.5 flex-1 justify-center">
          <PhoneIcon className="h-3.5 w-3.5" /> Call
        </a>
        <a href={`sms:${appt.phone}`} className="btn-sm btn-secondary flex items-center gap-1.5 flex-1 justify-center">
          <ChatBubbleLeftIcon className="h-3.5 w-3.5" /> Text
        </a>
        {appt.address !== '—' && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(appt.address)}`}
            target="_blank" rel="noopener noreferrer" className="btn-sm btn-secondary flex items-center gap-1.5 flex-1 justify-center">
            <MapPinIcon className="h-3.5 w-3.5" /> Nav
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Action Queue Item ─────────────────────────────────────────
function ActionItem({ item, index, onDismiss }: {
  item: typeof TODAY_QUEUE[0];
  index: number;
  onDismiss: (id: string) => void;
}) {
  const urgency = URGENCY_CONFIG[item.urgency];
  const actionCfg = ACTION_CONFIG[item.actionType];
  const isLink = item.actionType === 'schedule' || item.actionType === 'proposal';
  const href = actionCfg.href(item.phone, item.id);

  const ActionBtn = () => (
    isLink
      ? <Link to={href as string} className={clsx('btn-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap', actionCfg.class)}>
          <actionCfg.icon className="h-3.5 w-3.5" />{actionCfg.label}
        </Link>
      : <a href={href as string} className={clsx('btn-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap', actionCfg.class)}>
          <actionCfg.icon className="h-3.5 w-3.5" />{actionCfg.label}
        </a>
  );

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}
      className="flex items-start gap-3 px-5 py-4 hover:bg-slate-800/30 transition-colors group border-b border-slate-800/50 last:border-0">
      <div className="flex-shrink-0 w-6 text-center">
        <span className="text-xs font-bold text-slate-600">#{index + 1}</span>
      </div>
      <div className={clsx('relative flex-shrink-0 mt-0.5',urgency.pulse && 'animate-ping-slow')}>
        <div className={clsx('w-2 h-2 rounded-full', urgency.dot)} />
        {urgency.pulse && <div className={clsx('absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-60', urgency.dot)} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/leads/${item.id}`} className="text-sm font-semibold text-white hover:text-brand-300 transition-colors">
            {item.name}
          </Link>
          {item.isStorm && <span className="text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/25 px-1.5 py-0.5 rounded-full">⛈ Storm</span>}
          <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full border font-medium', urgency.class)}>{urgency.label}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.reason}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-semibold text-emerald-400">${item.estValue.toLocaleString()}</span>
          <span className="text-[10px] text-slate-600">· {item.daysSinceContact}d since contact</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ActionBtn />
        <button onClick={() => onDismiss(item.id)} className="btn-icon btn-ghost h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <XMarkIcon className="h-3.5 w-3.5 text-slate-600" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const stormMode = useAppStore((s) => s.stormModeActive);
  const financingMode = useAppStore((s) => s.financingModeActive);

  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const [nextApptExpanded, setNextApptExpanded] = useState(true);
  const [showAllQueue, setShowAllQueue] = useState(false);

  const dismiss = (id: string) => setDismissedItems((prev) => new Set([...prev, id]));
  const queue = TODAY_QUEUE.filter((i) => !dismissedItems.has(i.id));
  const visibleQueue = showAllQueue ? queue : queue.slice(0, 3);
  const pipelineTotal = PIPELINE_STAGES.reduce((s, st) => s + st.value, 0);
  const goalPct = Math.min(100, Math.round((GOAL.current / GOAL.target) * 100));
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const nextAppt = TODAY_APPTS[0];

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">
            {greeting}, <span className="text-gradient">{user?.firstName}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{today} · You have{' '}
            <span className="text-amber-400 font-semibold">{queue.length} actions</span> and{' '}
            <span className="text-brand-400 font-semibold">{TODAY_APPTS.length} appointments</span> today
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {stormMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
              <CloudIcon className="h-3.5 w-3.5" /> Storm Mode
            </div>
          )}
          {financingMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <CurrencyDollarIcon className="h-3.5 w-3.5" /> Financing Mode
            </div>
          )}
          <Link to="/field" className="btn-secondary btn-sm flex items-center gap-1.5">
            <MapPinIcon className="h-4 w-4" /> Field Mode
          </Link>
          <Link to="/leads/new" className="btn-primary btn-sm">+ New Lead</Link>
        </div>
      </div>

      {/* Storm alert */}
      <AnimatePresence>
        {stormMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="storm-banner">
            <CloudIcon className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Storm Opportunity Mode Active</span>
              <span className="ml-2">— 23 storm-affected leads in East BR and Livingston Parish. Contact within 48h window.</span>
            </div>
            <Link to="/leads?isStormLead=true" className="ml-auto btn btn-sm bg-purple-600 text-white hover:bg-purple-500 whitespace-nowrap">
              View Storm Leads
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overdue alert banner */}
      {FOLLOW_UPS_OVERDUE.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-500/8 border border-red-500/20 rounded-xl">
          <ExclamationTriangleIcon className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300 font-medium">
            {FOLLOW_UPS_OVERDUE.length} follow-ups overdue:
          </span>
          <div className="flex gap-2 flex-wrap">
            {FOLLOW_UPS_OVERDUE.map((fu) => (
              <span key={fu.id} className="text-xs text-red-400">
                {fu.name} <span className="text-red-600">({fu.daysOverdue}d overdue)</span>
                {' · '}
                <a href={`tel:${fu.phone}`} className="underline hover:text-red-300">call now</a>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pipeline Value', value: `$${(pipelineTotal / 1000).toFixed(0)}K`, sub: `${PIPELINE_STAGES.reduce((s, st) => s + st.count, 0)} leads`, icon: ArrowTrendingUpIcon, color: 'blue', delta: 8 },
          { label: 'Closed This Month', value: `$${(GOAL.current / 1000).toFixed(0)}K`, sub: `${goalPct}% of goal`, icon: BanknotesIcon, color: 'green', delta: 5 },
          { label: 'Proposals Pending', value: PROPOSALS_PENDING.length, sub: `$${(PROPOSALS_PENDING.reduce((s, p) => s + p.value, 0) / 1000).toFixed(0)}K at stake`, icon: DocumentTextIcon, color: 'purple', delta: null },
          { label: 'Appts Today', value: TODAY_APPTS.length, sub: `Next: ${nextAppt?.time}`, icon: CalendarIcon, color: 'amber', delta: null },
        ].map((s) => {
          const colorMap: Record<string, { gradient: string; icon: string; delta: string }> = {
            blue:   { gradient: 'from-brand-600/20 to-brand-800/10 border-brand-600/20', icon: 'text-brand-400 bg-brand-500/15', delta: 'text-brand-400' },
            green:  { gradient: 'from-emerald-600/20 to-emerald-800/10 border-emerald-600/20', icon: 'text-emerald-400 bg-emerald-500/15', delta: 'text-emerald-400' },
            purple: { gradient: 'from-purple-600/20 to-purple-800/10 border-purple-600/20', icon: 'text-purple-400 bg-purple-500/15', delta: 'text-purple-400' },
            amber:  { gradient: 'from-amber-600/20 to-amber-800/10 border-amber-600/20', icon: 'text-amber-400 bg-amber-500/15', delta: 'text-amber-400' },
          };
          const c = colorMap[s.color];
          return (
            <div key={s.label} className={`card p-5 bg-gradient-to-br ${c.gradient}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${c.icon}`}><s.icon className="h-5 w-5" /></div>
                {s.delta !== null && (
                  <div className={clsx('flex items-center gap-0.5 text-xs font-medium', c.delta)}>
                    <ArrowUpIcon className="h-3 w-3" />{s.delta}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-0.5">{s.value}</div>
              <div className="text-xs text-slate-400 font-medium">{s.label}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Action Queue (main) ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today's Game Plan */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FireSolid className="h-4 w-4 text-red-400" />
                <h2 className="text-sm font-semibold text-white">Today's Action Queue</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium">{queue.length} items</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Priority AI-ranked</span>
                <BoltSolid className="h-3 w-3 text-brand-400" />
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircleIcon className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-semibold text-sm">All clear! Queue is empty.</p>
                <p className="text-slate-500 text-xs mt-1">Great work — all follow-ups are on track.</p>
              </div>
            ) : (
              <div>
                {visibleQueue.map((item, i) => (
                  <ActionItem key={item.id} item={item} index={i} onDismiss={dismiss} />
                ))}
                {queue.length > 3 && (
                  <div className="px-5 py-3 border-t border-slate-800">
                    <button onClick={() => setShowAllQueue(!showAllQueue)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1">
                      {showAllQueue ? '▲ Show less' : `▼ Show ${queue.length - 3} more actions`}
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
            <div className="divide-y divide-slate-800/50">
              {PROPOSALS_PENDING.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      {p.status === 'VIEWED' && (
                        <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">Viewed ×{p.viewCount}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                      <span className="text-emerald-400 font-semibold">${p.value.toLocaleString()}</span>
                      <span className={clsx('font-medium', p.sentDays > 5 ? 'text-red-400' : p.sentDays > 3 ? 'text-amber-400' : 'text-slate-500')}>
                        Sent {p.sentDays}d ago
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link to={`/proposals`} className="btn-sm btn-secondary text-xs">View</Link>
                    <button onClick={() => toast.success(`Follow-up call logged for ${p.name}`)}
                      className="btn-sm btn-primary text-xs flex items-center gap-1">
                      <PhoneIcon className="h-3 w-3" /> Follow Up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline breakdown */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Pipeline Breakdown</h2>
              <Link to="/pipeline" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Kanban →</Link>
            </div>
            <div className="space-y-3">
              {PIPELINE_STAGES.map((stage) => {
                const pct = (stage.value / pipelineTotal) * 100;
                return (
                  <div key={stage.stage}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className={clsx('w-2 h-2 rounded-full', stage.color)} />
                        <span className="text-xs text-slate-400">{stage.stage}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-mono">{stage.count} leads</span>
                        <span className="text-xs font-semibold text-slate-300">${(stage.value / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                    <div className="score-bar">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 }}
                        className={clsx('score-bar-fill', stage.color + '/70')} style={{ background: undefined }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-4">
          {/* Goal tracker */}
          <div className="card p-5">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <GoalRing pct={goalPct} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{goalPct}%</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{GOAL.label}</div>
                <div className="text-xl font-bold text-white mt-1">${(GOAL.current / 1000).toFixed(0)}K</div>
                <div className="text-xs text-slate-500">of ${(GOAL.target / 1000).toFixed(0)}K target</div>
                <div className="text-xs text-emerald-400 mt-1 font-medium">
                  ${((GOAL.target - GOAL.current) / 1000).toFixed(0)}K to go
                </div>
              </div>
            </div>
          </div>

          {/* Today's Route */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">Today's Route</h2>
              </div>
              <Link to="/appointments" className="text-xs text-brand-400 hover:text-brand-300">All →</Link>
            </div>
            <div className="divide-y divide-slate-800/50">
              {TODAY_APPTS.map((appt, i) => (
                <div key={appt.id}>
                  <button
                    onClick={() => setNextApptExpanded(i === 0 ? !nextApptExpanded : true)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors text-left group"
                  >
                    <div className="text-xs font-mono text-slate-500 w-16 pt-0.5 flex-shrink-0">{appt.time}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">{appt.name}</div>
                      <div className={clsx('text-[10px] capitalize mt-0.5',
                        appt.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-400')}>
                        {appt.status.toLowerCase()} · {appt.type.replace('-', ' ')}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={`tel:${appt.phone}`} onClick={e => e.stopPropagation()} className="btn-icon btn-ghost h-6 w-6">
                        <PhoneIcon className="h-3 w-3" />
                      </a>
                    </div>
                  </button>
                  {/* Prep card for next appointment */}
                  {i === 0 && nextApptExpanded && <div className="px-4 pb-3"><ApptPrepCard appt={appt} /></div>}
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="ai-card">
            <div className="flex items-center gap-2 mb-3">
              <SparklesIcon className="h-4 w-4 text-brand-400" />
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide">AI Recommendations</span>
            </div>
            <div className="space-y-2">
              {[
                { text: 'Michael Trosclair at verbal commit — call within 24h to schedule install. Risk of going cold.', link: '/leads/1', urgency: 'text-red-400' },
                { text: 'Patricia Landry viewed proposal twice. Best time to call: Mon–Wed 5–7 PM.', link: '/leads/2', urgency: 'text-amber-400' },
                { text: 'Susan Bourgeois storm window closing. Offer free assessment to accelerate.', link: '/leads/3', urgency: 'text-purple-400' },
              ].map((rec, i) => (
                <div key={i} className="flex gap-2.5 py-2 border-t border-slate-700/30 first:border-0 first:pt-0">
                  <div className="w-5 h-5 rounded-full bg-brand-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-brand-400">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 leading-relaxed">{rec.text}</p>
                    <Link to={rec.link} className={clsx('text-[10px] font-medium hover:opacity-80 flex items-center gap-1 mt-1', rec.urgency)}>
                      View lead <ChevronRightIcon className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="ai-confidence mt-3 pt-3 border-t border-slate-700/30">
              <BoltIcon className="h-3 w-3" /> AI-generated · updates at 6am daily
            </div>
          </div>

          {/* Financing opportunities */}
          {financingMode && (
            <div className="card p-4 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-3">
                <CurrencyDollarIcon className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Financing Opportunities</span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { name: 'Jennifer Trosclair', amount: 14800, monthly: 82, term: '18-mo SAC' },
                  { name: 'Patricia Landry', amount: 9200, monthly: 51, term: '18-mo SAC' },
                ].map((f) => (
                  <div key={f.name} className="flex justify-between items-center py-1 border-b border-emerald-500/10 last:border-0">
                    <span className="text-slate-400">{f.name}</span>
                    <span className="text-emerald-400 font-semibold">${f.monthly}/mo · {f.term}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
