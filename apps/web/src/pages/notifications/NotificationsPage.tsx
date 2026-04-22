import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BellIcon, CheckCircleIcon, EyeIcon, CalendarIcon,
  DocumentTextIcon, UserIcon, CurrencyDollarIcon,
  ArrowPathIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import apiClient from '../../api/client';

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

const TYPE_CONFIG: Record<NType, { icon: any; color: string; bg: string; label: string }> = {
  lead:        { icon: UserIcon,           color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Lead' },
  proposal:    { icon: DocumentTextIcon,   color: 'text-purple-400',  bg: 'bg-purple-500/10',  label: 'Proposal' },
  appointment: { icon: CalendarIcon,       color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    label: 'Appointment' },
  payment:     { icon: CurrencyDollarIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Payment' },
  ai:          { icon: EyeIcon,            color: 'text-brand-400',   bg: 'bg-brand-500/10',   label: 'AI Insight' },
  system:      { icon: ArrowPathIcon,      color: 'text-slate-400',   bg: 'bg-slate-700',      label: 'System' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function guessType(notif: any): NType {
  const t = (notif.type ?? notif.category ?? '').toLowerCase();
  if (t.includes('lead')) return 'lead';
  if (t.includes('proposal')) return 'proposal';
  if (t.includes('appoint')) return 'appointment';
  if (t.includes('pay') || t.includes('invoice')) return 'payment';
  if (t.includes('ai')) return 'ai';
  return 'system';
}

function mapApiNotif(n: any): Notification {
  return {
    id: n.id,
    type: guessType(n),
    title: n.title ?? n.subject ?? 'Notification',
    body: n.body ?? n.message ?? n.content ?? '',
    time: n.createdAt ? timeAgo(n.createdAt) : '—',
    read: n.read ?? n.isRead ?? false,
    linkTo: n.linkTo ?? n.link ?? undefined,
    linkLabel: n.linkLabel ?? 'View →',
    urgent: n.urgent ?? n.priority === 'HIGH',
  };
}

function NotifCard({ notif, onRead, onDismiss }: { notif: Notification; onRead: (id: string) => void; onDismiss: (id: string) => void }) {
  const cfg = TYPE_CONFIG[notif.type];
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6, height: 0, marginBottom: 0 }}
      className={clsx('flex gap-4 p-4 rounded-xl border transition-colors group',
        notif.read ? 'bg-slate-900/40 border-slate-800/60' : 'bg-slate-900 border-slate-700 shadow-sm',
        notif.urgent && !notif.read && 'border-l-4 border-l-red-500/60'
      )}>
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
        <cfg.icon className={clsx('h-4.5 w-4.5', cfg.color)} style={{ width: 18, height: 18 }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('text-sm font-semibold', notif.read ? 'text-slate-400' : 'text-white')}>{notif.title}</span>
            {notif.urgent && !notif.read && (
              <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Urgent</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!notif.read && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1" />}
            <button onClick={() => onDismiss(notif.id)}
              className="btn-icon btn-ghost h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className={clsx('text-xs mt-1 leading-relaxed', notif.read ? 'text-slate-600' : 'text-slate-400')}>{notif.body}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] text-slate-600">{notif.time}</span>
          {notif.linkTo && (
            <Link to={notif.linkTo} onClick={() => onRead(notif.id)}
              className={clsx('text-[11px] font-medium hover:opacity-80 transition-opacity', cfg.color)}>
              {notif.linkLabel || 'View →'}
            </Link>
          )}
          {!notif.read && (
            <button onClick={() => onRead(notif.id)} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
              Mark read
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<NType | ''>('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    apiClient.notifications.list(100)
      .then((data: any) => {
        const raw: any[] = data?.data ?? data ?? [];
        setNotifs(raw.map(mapApiNotif));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await apiClient.notifications.markRead(id); } catch {}
  };

  const dismiss = (id: string) => setNotifs((prev) => prev.filter((n) => n.id !== id));

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
    try { await apiClient.notifications.markAllRead(); } catch {}
  };

  const filtered = notifs.filter((n) => {
    if (typeFilter && n.type !== typeFilter) return false;
    if (readFilter === 'unread' && n.read) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-3xl page-transition">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BellAlertIcon className="h-5 w-5 text-brand-400" />
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full font-bold">{unreadCount} new</span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Real-time alerts from leads, proposals, and campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary btn-sm flex items-center gap-1.5">
              <CheckCircleIcon className="h-4 w-4" />Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'unread'] as const).map((f) => (
          <button key={f} onClick={() => setReadFilter(f)}
            className={clsx('btn-sm capitalize', readFilter === f ? 'btn-primary' : 'btn-secondary')}>
            {f === 'all' ? `All (${notifs.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-700" />
        {(Object.entries(TYPE_CONFIG) as [NType, any][]).map(([type, cfg]) => (
          <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
            className={clsx('btn-sm text-xs', typeFilter === type ? `${cfg.bg} ${cfg.color} border border-current/30` : 'btn-secondary')}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />)}</div>}
        <AnimatePresence mode="popLayout">
          {!loading && filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
              <BellIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-white font-medium text-sm">All caught up!</p>
              <p className="text-slate-500 text-xs mt-1">No {readFilter === 'unread' ? 'unread ' : ''}{typeFilter ? TYPE_CONFIG[typeFilter].label.toLowerCase() + ' ' : ''}notifications.</p>
            </motion.div>
          )}
          {filtered.map((n) => (
            <NotifCard key={n.id} notif={n} onRead={markRead} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
