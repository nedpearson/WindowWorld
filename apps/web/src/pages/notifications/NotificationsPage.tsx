import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BellIcon, CheckCircleIcon, EyeIcon, CalendarIcon,
  DocumentTextIcon, UserIcon, CurrencyDollarIcon,
  ExclamationTriangleIcon, ArrowPathIcon, XMarkIcon,
  PhoneIcon, ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ─── Types ──────────────────────────────────────────────────
type NType = 'lead' | 'proposal' | 'appointment' | 'payment' | 'system' | 'ai';

interface Notification {
  id: string;
  type: NType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  linkTo?: string;
  linkLabel?: string;
  urgent?: boolean;
}

// ─── Demo data ────────────────────────────────────────────
const DEMO_NOTIFS: Notification[] = [
  { id: 'n1', type: 'proposal', title: 'Proposal Opened', body: 'Patricia Landry opened your proposal for the 4th time in 24 hours. High intent signal.', time: '11 min ago', read: false, urgent: true, linkTo: '/proposals', linkLabel: 'View Proposal' },
  { id: 'n2', type: 'lead', title: 'New Storm Lead Assigned', body: 'Susan Bourgeois (Denham Springs) has been assigned to you — storm damage reported in her ZIP.', time: '38 min ago', read: false, urgent: true, linkTo: '/leads/3', linkLabel: 'View Lead' },
  { id: 'n3', type: 'appointment', title: 'Appointment in 2 Hours', body: 'Consultation with Robert Comeaux at 4821 Scenic Hwy at 10:00 AM. Inspection checklist ready.', time: '1h ago', read: false, linkTo: '/appointments', linkLabel: 'Open Route' },
  { id: 'n4', type: 'proposal', title: 'Proposal Accepted!', body: 'Michael Trosclair accepted your proposal for $22,400. Ready to schedule install.', time: '2h ago', read: false, urgent: true, linkTo: '/proposals', linkLabel: 'Create Invoice' },
  { id: 'n5', type: 'payment', title: 'Invoice Payment Received', body: 'Angela Mouton paid $4,900 deposit on Invoice #INV-2024-041. Balance: $4,300.', time: '3h ago', read: true, linkTo: '/invoices', linkLabel: 'View Invoice' },
  { id: 'n6', type: 'ai', title: 'AI: Best Time to Call', body: 'Based on Karen Guidry\'s open patterns, 5–7 PM Tuesday-Wednesday is optimal contact window.', time: '4h ago', read: true, linkTo: '/leads/6', linkLabel: 'View Lead' },
  { id: 'n7', type: 'lead', title: 'Lead Follow-Up Overdue', body: 'James Fontenot hasn\'t been contacted in 5 days. Stage: Qualified. Est. value: $8,400.', time: '5h ago', read: true, linkTo: '/leads', linkLabel: 'View Lead' },
  { id: 'n8', type: 'appointment', title: 'Appointment Confirmed', body: 'Karen Guidry confirmed measurement appointment for 1:30 PM today via SMS reply.', time: '6h ago', read: true, linkTo: '/appointments', linkLabel: 'View Schedule' },
  { id: 'n9', type: 'system', title: 'Campaign Started', body: '3 storm leads were enrolled in "Storm Damage Urgency" campaign automatically.', time: 'Yesterday', read: true, linkTo: '/automations', linkLabel: 'View Campaigns' },
  { id: 'n10', type: 'proposal', title: 'Proposal Expired', body: 'Carol Chauvin\'s proposal expired (30-day window). Create a revised proposal to re-engage.', time: 'Yesterday', read: true, linkTo: '/proposals', linkLabel: 'View Proposals' },
  { id: 'n11', type: 'payment', title: 'Invoice Overdue', body: 'Robert Comeaux invoice #INV-2024-038 is 12 days overdue. Balance: $11,200.', time: '2 days ago', read: true, linkTo: '/invoices', linkLabel: 'View Invoice', urgent: true },
  { id: 'n12', type: 'system', title: 'Weekly Performance Summary', body: 'You closed $14,300 this week — 94% of your target. 3 proposals pending response totaling $27,300.', time: '2 days ago', read: true },
];

const TYPE_CONFIG: Record<NType, { icon: any; color: string; bg: string; label: string }> = {
  lead:        { icon: UserIcon,             color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Lead' },
  proposal:    { icon: DocumentTextIcon,     color: 'text-purple-400',  bg: 'bg-purple-500/10',  label: 'Proposal' },
  appointment: { icon: CalendarIcon,         color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    label: 'Appointment' },
  payment:     { icon: CurrencyDollarIcon,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Payment' },
  ai:          { icon: EyeIcon,              color: 'text-brand-400',   bg: 'bg-brand-500/10',   label: 'AI Insight' },
  system:      { icon: ArrowPathIcon,        color: 'text-slate-400',   bg: 'bg-slate-700',      label: 'System' },
};

function NotifCard({ notif, onRead, onDismiss }: { notif: Notification; onRead: (id: string) => void; onDismiss: (id: string) => void }) {
  const cfg = TYPE_CONFIG[notif.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6, height: 0, marginBottom: 0 }}
      className={clsx(
        'flex gap-4 p-4 rounded-xl border transition-colors group',
        notif.read
          ? 'bg-slate-900/40 border-slate-800/60'
          : 'bg-slate-900 border-slate-700 shadow-sm',
        notif.urgent && !notif.read && 'border-l-4 border-l-red-500/60'
      )}
    >
      {/* Icon */}
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
        <cfg.icon className={clsx('h-4.5 w-4.5', cfg.color)} style={{ width: 18, height: 18 }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('text-sm font-semibold', notif.read ? 'text-slate-400' : 'text-white')}>
              {notif.title}
            </span>
            {notif.urgent && !notif.read && (
              <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                Urgent
              </span>
            )}
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!notif.read && (
              <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1" />
            )}
            <button onClick={() => onDismiss(notif.id)}
              className="btn-icon btn-ghost h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className={clsx('text-xs mt-1 leading-relaxed', notif.read ? 'text-slate-600' : 'text-slate-400')}>
          {notif.body}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] text-slate-600">{notif.time}</span>
          {notif.linkTo && (
            <Link to={notif.linkTo} onClick={() => onRead(notif.id)}
              className={clsx('text-[11px] font-medium hover:opacity-80 transition-opacity', cfg.color)}>
              {notif.linkLabel || 'View →'}
            </Link>
          )}
          {!notif.read && (
            <button onClick={() => onRead(notif.id)}
              className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
              Mark read
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>(DEMO_NOTIFS);
  const [typeFilter, setTypeFilter] = useState<NType | ''>('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifs.filter(n => !n.read).length;

  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const dismiss = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));
  const markAllRead = () => { setNotifs(prev => prev.map(n => ({ ...n, read: true }))); toast.success('All notifications marked as read'); };
  const clearAll = () => { setNotifs([]); toast.success('Notifications cleared'); };

  const filtered = notifs.filter(n => {
    if (typeFilter && n.type !== typeFilter) return false;
    if (readFilter === 'unread' && n.read) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-3xl page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BellAlertIcon className="h-5 w-5 text-brand-400" />
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Real-time alerts from leads, proposals, and campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary btn-sm flex items-center gap-1.5">
              <CheckCircleIcon className="h-4 w-4" /> Mark all read
            </button>
          )}
          <button onClick={clearAll} className="btn-ghost btn-sm text-slate-500">Clear all</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(TYPE_CONFIG) as [NType, typeof TYPE_CONFIG[NType]][]).map(([type, cfg]) => {
          const count = notifs.filter(n => n.type === type && !n.read).length;
          if (!count) return null;
          return (
            <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              className={clsx('card p-3 flex items-center gap-2.5 text-left transition-all',
                typeFilter === type && 'ring-1 ring-brand-500/50')}>
              <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', cfg.bg)}>
                <cfg.icon className={clsx('h-4 w-4', cfg.color)} />
              </div>
              <div>
                <div className={clsx('text-lg font-bold', cfg.color)}>{count}</div>
                <div className="text-[10px] text-slate-500">{cfg.label}</div>
              </div>
            </button>
          );
        }).filter(Boolean)}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setReadFilter(f)}
              className={clsx('btn-sm capitalize', readFilter === f ? 'btn-primary' : 'btn-secondary')}>
              {f === 'all' ? `All (${notifs.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex gap-1 flex-wrap">
          {(Object.entries(TYPE_CONFIG) as [NType, any][]).map(([type, cfg]) => (
            <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              className={clsx('btn-sm text-xs', typeFilter === type
                ? `${cfg.bg} ${cfg.color} border border-current/30`
                : 'btn-secondary')}>
              {cfg.label}
            </button>
          ))}
          {typeFilter && (
            <button onClick={() => setTypeFilter('')} className="btn-ghost btn-sm">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-16 text-center">
              <BellIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-white font-medium text-sm">All caught up!</p>
              <p className="text-slate-500 text-xs mt-1">No {readFilter === 'unread' ? 'unread ' : ''}{typeFilter ? TYPE_CONFIG[typeFilter].label.toLowerCase() + ' ' : ''}notifications.</p>
            </motion.div>
          ) : (
            filtered.map(n => (
              <NotifCard key={n.id} notif={n} onRead={markRead} onDismiss={dismiss} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
