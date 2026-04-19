import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  UsersIcon, ShieldCheckIcon, TrophyIcon, ChartBarIcon,
  PlusIcon, MagnifyingGlassIcon, XMarkIcon, CheckCircleIcon,
  ExclamationTriangleIcon, PencilIcon, EyeSlashIcon, ArrowPathIcon,
  ClockIcon, UserCircleIcon, Cog6ToothIcon, KeyIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldSolid, TrophyIcon as TrophySolid } from '@heroicons/react/24/solid';
import {
  useAdminUsers, useCreateUser, useUpdateUser,
  useDeactivateUser, useReactivateUser, useAuditLog,
  useLeaderboard, useOrgStats,
  type AdminUser, type AuditLog, type LeaderboardEntry,
} from '../../api/admin';

// ─── Constants ────────────────────────────────────────────────
const ROLES = ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'FIELD_TECH', 'VIEWER'] as const;
const ROLE_COLORS: Record<string, string> = {
  ADMIN:         'bg-red-500/15 text-red-400 border-red-500/25',
  SALES_MANAGER: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  SALES_REP:     'bg-brand-500/15 text-brand-400 border-brand-500/25',
  FIELD_TECH:    'bg-amber-500/15 text-amber-400 border-amber-500/25',
  VIEWER:        'bg-slate-600/30 text-slate-400 border-slate-600/30',
};
const ACTION_COLORS: Record<string, string> = {
  create:     'text-emerald-400',
  update:     'text-brand-400',
  delete:     'text-red-400',
  deactivate: 'text-amber-400',
  send:       'text-purple-400',
  approve:    'text-cyan-400',
};

// ─── Demo data fallbacks ──────────────────────────────────────
const DEMO_USERS: AdminUser[] = [
  { id: 'u1', email: 'nedpearson@bridgebox.ai', firstName: 'Ned', lastName: 'Pearson', role: 'ADMIN', phone: '(225) 555-0001', isActive: true, lastLoginAt: new Date().toISOString(), createdAt: '2026-01-01T00:00:00Z', _count: { assignedLeads: 0 } },
  { id: 'u2', email: 'jake.thibodaux@windowworld.com', firstName: 'Jake', lastName: 'Thibodaux', role: 'SALES_REP', phone: '(225) 555-0103', isActive: true, lastLoginAt: new Date(Date.now() - 86400000 * 2).toISOString(), createdAt: '2026-01-15T00:00:00Z', _count: { assignedLeads: 24 } },
  { id: 'u3', email: 'sara.richard@windowworld.com', firstName: 'Sara', lastName: 'Richard', role: 'SALES_MANAGER', phone: '(225) 555-0204', isActive: true, lastLoginAt: new Date(Date.now() - 86400000).toISOString(), createdAt: '2026-01-10T00:00:00Z', _count: { assignedLeads: 8 } },
  { id: 'u4', email: 'mike.broussard@windowworld.com', firstName: 'Mike', lastName: 'Broussard', role: 'FIELD_TECH', phone: '(225) 555-0305', isActive: true, lastLoginAt: new Date(Date.now() - 86400000 * 3).toISOString(), createdAt: '2026-02-01T00:00:00Z', _count: { assignedLeads: 0 } },
  { id: 'u5', email: 'chris.fontenot@windowworld.com', firstName: 'Chris', lastName: 'Fontenot', role: 'SALES_REP', phone: '(225) 555-0406', isActive: false, createdAt: '2026-01-20T00:00:00Z', _count: { assignedLeads: 6 } },
];
const DEMO_AUDIT: AuditLog[] = [
  { id: 'a1', entityType: 'proposal', entityId: 'p1', action: 'send', occurredAt: new Date(Date.now() - 900000).toISOString(), user: { id: 'u2', firstName: 'Jake', lastName: 'Thibodaux', role: 'SALES_REP' } },
  { id: 'a2', entityType: 'lead', entityId: 'l1', action: 'update', occurredAt: new Date(Date.now() - 3600000).toISOString(), newValues: { status: 'VERBAL_COMMIT' }, user: { id: 'u2', firstName: 'Jake', lastName: 'Thibodaux', role: 'SALES_REP' } },
  { id: 'a3', entityType: 'invoice', entityId: 'i1', action: 'create', occurredAt: new Date(Date.now() - 7200000).toISOString(), user: { id: 'u3', firstName: 'Sara', lastName: 'Richard', role: 'SALES_MANAGER' } },
  { id: 'a4', entityType: 'user', entityId: 'u5', action: 'deactivate', occurredAt: new Date(Date.now() - 86400000).toISOString(), user: { id: 'u1', firstName: 'Ned', lastName: 'Pearson', role: 'ADMIN' } },
  { id: 'a5', entityType: 'proposal', entityId: 'p2', action: 'approve', occurredAt: new Date(Date.now() - 172800000).toISOString(), user: { id: 'u3', firstName: 'Sara', lastName: 'Richard', role: 'SALES_MANAGER' } },
];
const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'u2', name: 'Jake Thibodaux', role: 'SALES_REP', closedDeals: 8, revenue: 112400, totalLeads: 24 },
  { id: 'u3', name: 'Sara Richard', role: 'SALES_MANAGER', closedDeals: 5, revenue: 87200, totalLeads: 18 },
  { id: 'u5', name: 'Chris Fontenot', role: 'SALES_REP', closedDeals: 3, revenue: 44800, totalLeads: 12 },
];
const DEMO_STATS = { totalLeads: 89, activeLeads: 47, totalProposals: 34, sentProposals: 22, totalInvoices: 18, paidInvoices: 11, activeUsers: 4, totalRevenue: 244400 };

// ─── Add User Modal ───────────────────────────────────────────
function AddUserModal({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'SALES_REP' as AdminUser['role'], password: '' });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.firstName || !form.lastName || !form.password) {
      toast.error('All fields required');
      return;
    }
    try {
      await createUser.mutateAsync(form);
      toast.success(`${form.firstName} ${form.lastName} added to team`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Add Team Member</h2>
          <button onClick={onClose} className="btn-icon btn-ghost h-7 w-7"><XMarkIcon className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">First Name</label>
              <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className="input" placeholder="Jake" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Last Name</label>
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className="input" placeholder="Thibodaux" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input" placeholder="jake@windowworld.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Phone</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" placeholder="(225) 555-0103" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Role</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value as any)} className="input">
              {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Temporary Password</label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="input" placeholder="Min 8 characters" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={createUser.isPending}>Cancel</button>
          <button onClick={handleSubmit} disabled={createUser.isPending} className="btn-primary flex-1">
            {createUser.isPending ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── User Row ─────────────────────────────────────────────────
function UserRow({ user }: { user: AdminUser }) {
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const updateUser = useUpdateUser();
  const [editRole, setEditRole] = useState(false);

  const handleToggleActive = async () => {
    try {
      if (user.isActive) {
        await deactivate.mutateAsync(user.id);
        toast.success(`${user.firstName} deactivated`);
      } else {
        await reactivate.mutateAsync(user.id);
        toast.success(`${user.firstName} reactivated`);
      }
    } catch { toast.error('Action failed'); }
  };

  const handleRoleChange = async (role: AdminUser['role']) => {
    try {
      await updateUser.mutateAsync({ id: user.id, role });
      toast.success(`Role updated to ${role}`);
      setEditRole(false);
    } catch { toast.error('Role update failed'); }
  };

  const lastSeen = user.lastLoginAt
    ? (() => {
        const diff = Date.now() - new Date(user.lastLoginAt).getTime();
        if (diff < 3600000) return 'Just now';
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
      })()
    : 'Never';

  return (
    <tr className={clsx('hover:bg-slate-800/30 transition-colors', !user.isActive && 'opacity-50')}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{user.firstName} {user.lastName}</div>
            <div className="text-[11px] text-slate-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {editRole ? (
          <select defaultValue={user.role} autoFocus onBlur={() => setEditRole(false)}
            onChange={(e) => handleRoleChange(e.target.value as any)}
            className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white">
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        ) : (
          <button onClick={() => setEditRole(true)}
            className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium border transition-opacity hover:opacity-80', ROLE_COLORS[user.role])}>
            {user.role.replace('_', ' ')}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />{lastSeen}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">{user._count?.assignedLeads ?? 0}</td>
      <td className="px-4 py-3">
        <span className={clsx('w-2 h-2 rounded-full inline-block', user.isActive ? 'bg-emerald-400' : 'bg-slate-600')} />
      </td>
      <td className="px-4 py-3">
        <button onClick={handleToggleActive}
          disabled={deactivate.isPending || reactivate.isPending}
          className={clsx('btn-sm text-xs', user.isActive ? 'btn-ghost text-red-400 hover:text-red-300' : 'btn-ghost text-emerald-400')}>
          {user.isActive ? 'Deactivate' : 'Reactivate'}
        </button>
      </td>
    </tr>
  );
}

// ─── Audit Row ────────────────────────────────────────────────
function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const timeStr = new Date(log.occurredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const hasChanges = log.newValues && Object.keys(log.newValues).length > 0;

  return (
    <>
      <tr className="hover:bg-slate-800/20 transition-colors cursor-pointer" onClick={() => hasChanges && setExpanded(!expanded)}>
        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{timeStr}</td>
        <td className="px-4 py-3">
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">{log.entityType}</span>
        </td>
        <td className="px-4 py-3">
          <span className={clsx('text-sm font-semibold capitalize', ACTION_COLORS[log.action] || 'text-slate-400')}>{log.action}</span>
        </td>
        <td className="px-4 py-3">
          {log.user ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300">
                {log.user.firstName[0]}{log.user.lastName[0]}
              </div>
              {log.user.firstName} {log.user.lastName}
            </div>
          ) : <span className="text-xs text-slate-600">System</span>}
        </td>
        <td className="px-4 py-3 font-mono text-[10px] text-slate-600 truncate max-w-[120px]">{log.entityId.slice(0, 8)}…</td>
        <td className="px-4 py-3 text-slate-600 text-xs">{hasChanges ? '▶' : ''}</td>
      </tr>
      {expanded && hasChanges && (
        <tr className="bg-slate-800/30">
          <td colSpan={6} className="px-4 py-3">
            <pre className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap">
              {JSON.stringify(log.newValues, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────
function LeaderboardPanel({ period, setPeriod }: { period: 'week' | 'month' | 'quarter'; setPeriod: (p: 'week' | 'month' | 'quarter') => void }) {
  const { data: apiData } = useLeaderboard(period);
  const entries = apiData?.length ? apiData : DEMO_LEADERBOARD;
  const maxRevenue = Math.max(...entries.map((e) => e.revenue), 1);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrophySolid className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-semibold text-white">Sales Leaderboard</span>
        </div>
        <div className="flex gap-1">
          {(['week', 'month', 'quarter'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('btn-sm capitalize text-xs', period === p ? 'btn-primary' : 'btn-ghost')}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-800/50">
        {entries.map((entry, i) => (
          <div key={entry.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-800/20 transition-colors">
            <span className="text-xl w-6 text-center">{medals[i] || `#${i + 1}`}</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {entry.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{entry.name}</span>
                <span className="text-sm font-semibold text-emerald-400">${entry.revenue.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(entry.revenue / maxRevenue) * 100}%` }}
                  transition={{ delay: i * 0.1 }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
              </div>
              <div className="flex gap-3 mt-1 text-[11px] text-slate-600">
                <span>{entry.closedDeals} closed</span>
                <span>{entry.totalLeads} leads</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'leaderboard'>('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [lbPeriod, setLbPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const { data: apiUsers } = useAdminUsers({ search: userSearch, role: roleFilter || undefined, isActive: showInactive ? undefined : true });
  const { data: auditData } = useAuditLog({ entityType: auditEntityFilter || undefined, limit: 50 });
  const { data: statsData } = useOrgStats();

  const users = apiUsers?.length ? apiUsers : DEMO_USERS.filter((u) => showInactive || u.isActive);
  const auditLogs = auditData?.items?.length ? auditData.items : DEMO_AUDIT;
  const stats = statsData || DEMO_STATS;

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldSolid className="h-5 w-5 text-brand-400" />
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">User management, audit log, and org-wide reporting</p>
        </div>
        {activeTab === 'users' && (
          <button onClick={() => setShowAddUser(true)} className="btn-primary btn-sm flex items-center gap-2">
            <PlusIcon className="h-4 w-4" /> Add Team Member
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: stats.totalLeads, sub: `${stats.activeLeads} active`, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Proposals Sent', value: stats.sentProposals, sub: `${stats.totalProposals} total`, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Invoices Paid', value: stats.paidInvoices, sub: `${stats.totalInvoices} total`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Revenue Collected', value: `$${(stats.totalRevenue / 1000).toFixed(0)}K`, sub: `${stats.activeUsers} active reps`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            <div className={clsx('text-[11px] mt-1 px-1.5 py-0.5 rounded-full inline-block', s.bg, s.color)}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {([
          { id: 'users', label: `Team (${users.length})`, icon: UsersIcon },
          { id: 'audit', label: 'Audit Log', icon: ShieldCheckIcon },
          { id: 'leaderboard', label: 'Leaderboard', icon: TrophyIcon },
        ] as const).map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={clsx('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id ? 'text-white border-brand-500' : 'text-slate-500 border-transparent hover:text-slate-300')}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search team members..." className="input pl-9" />
            </div>
            {/* Role filter */}
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-40 text-sm">
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
            {/* Show inactive toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-600" />
              Show inactive
            </label>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Member', 'Role', 'Last Active', 'Leads', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No users found</td></tr>
                  ) : users.map((u) => <UserRow key={u.id} user={u} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Log Tab ── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={auditEntityFilter} onChange={(e) => setAuditEntityFilter(e.target.value)} className="input w-40 text-sm">
              <option value="">All Types</option>
              {['lead', 'proposal', 'invoice', 'user', 'appointment', 'document'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500">{auditLogs.length} entries</span>
            <span className="text-[11px] text-slate-600 ml-auto flex items-center gap-1">
              <ArrowPathIcon className="h-3 w-3" /> Auto-refreshes every 30s
            </span>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Time', 'Entity', 'Action', 'By', 'ID', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No audit events yet</td></tr>
                  ) : auditLogs.map((log) => <AuditRow key={log.id} log={log} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaderboard Tab ── */}
      {activeTab === 'leaderboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <LeaderboardPanel period={lbPeriod} setPeriod={setLbPeriod} />
          </div>
          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Period Summary</div>
              <div className="space-y-3">
                {[
                  { label: 'Total Revenue', value: `$${(DEMO_LEADERBOARD.reduce((s, e) => s + e.revenue, 0) / 1000).toFixed(1)}K`, color: 'text-emerald-400' },
                  { label: 'Deals Closed', value: DEMO_LEADERBOARD.reduce((s, e) => s + e.closedDeals, 0), color: 'text-white' },
                  { label: 'Active Reps', value: DEMO_LEADERBOARD.length, color: 'text-brand-400' },
                  { label: 'Avg Deal Size', value: `$${(DEMO_LEADERBOARD.reduce((s, e) => s + e.revenue, 0) / Math.max(DEMO_LEADERBOARD.reduce((s, e) => s + e.closedDeals, 0), 1) / 1000).toFixed(1)}K`, color: 'text-purple-400' },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">{s.label}</span>
                    <span className={clsx('text-sm font-semibold', s.color)}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-2">
                <TrophySolid className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">Top Performer</span>
              </div>
              <div className="text-base font-bold text-white">{DEMO_LEADERBOARD[0]?.name}</div>
              <div className="text-sm text-emerald-400 font-semibold">${DEMO_LEADERBOARD[0]?.revenue.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 mt-1">{DEMO_LEADERBOARD[0]?.closedDeals} deals · {lbPeriod}</div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} />}
      </AnimatePresence>
    </div>
  );
}
