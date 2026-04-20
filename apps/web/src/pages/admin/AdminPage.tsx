import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  UsersIcon, ShieldCheckIcon, TrophyIcon,
  PlusIcon, MagnifyingGlassIcon, XMarkIcon,
  ArrowPathIcon, ClockIcon, ExclamationTriangleIcon,
  CheckCircleIcon, UserMinusIcon, UserPlusIcon,
  ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldSolid, TrophyIcon as TrophySolid } from '@heroicons/react/24/solid';
import {
  useAdminUsers, useCreateUser, useUpdateUser,
  useDeactivateUser, useReactivateUser, useAuditLog,
  useLeaderboard, useOrgStats,
  type AdminUser, type AuditLog, type LeaderboardEntry,
} from '../../api/admin';
import { useAuthStore } from '../../store/auth.store';

// ─── Role definitions (must match Prisma UserRole enum) ───────
type UserRoleEnum =
  | 'SUPER_ADMIN' | 'SALES_MANAGER' | 'SALES_REP'
  | 'FIELD_MEASURE_TECH' | 'OFFICE_ADMIN' | 'FINANCE_BILLING' | 'READ_ONLY_ANALYST';

const ROLES: UserRoleEnum[] = [
  'SUPER_ADMIN', 'SALES_MANAGER', 'SALES_REP',
  'FIELD_MEASURE_TECH', 'OFFICE_ADMIN', 'FINANCE_BILLING', 'READ_ONLY_ANALYST',
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:         'Admin',
  SALES_MANAGER:       'Sales Manager',
  SALES_REP:           'Sales Rep',
  FIELD_MEASURE_TECH:  'Field Tech',
  OFFICE_ADMIN:        'Office Admin',
  FINANCE_BILLING:     'Finance',
  READ_ONLY_ANALYST:   'Analyst',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:        'bg-red-500/15 text-red-400 border-red-500/25',
  SALES_MANAGER:      'bg-purple-500/15 text-purple-400 border-purple-500/25',
  SALES_REP:          'bg-brand-500/15 text-brand-400 border-brand-500/25',
  FIELD_MEASURE_TECH: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  OFFICE_ADMIN:       'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  FINANCE_BILLING:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  READ_ONLY_ANALYST:  'bg-slate-600/30 text-slate-400 border-slate-600/30',
};

const ACTION_COLORS: Record<string, string> = {
  create:     'text-emerald-400',
  update:     'text-brand-400',
  delete:     'text-red-400',
  deactivate: 'text-amber-400',
  reactivate: 'text-emerald-400',
  send:       'text-purple-400',
  approve:    'text-cyan-400',
  login:      'text-slate-400',
};

// ─── Confirm Deactivate Dialog ────────────────────────────────
function ConfirmDialog({
  user, onConfirm, onCancel, isPending,
}: {
  user: AdminUser; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
            <UserMinusIcon className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Deactivate {user.firstName}?</h3>
          <p className="text-sm text-slate-400">
            {user.firstName} will lose access immediately. You can reactivate them at any time.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1" disabled={isPending}>Cancel</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {isPending ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────
function AddUserModal({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    role: 'SALES_REP' as UserRoleEnum, password: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.firstName || !form.lastName || !form.password) {
      toast.error('All fields required'); return;
    }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await createUser.mutateAsync(form as any);
      toast.success(`${form.firstName} ${form.lastName} added to team`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
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
            <select value={form.role} onChange={(e) => set('role', e.target.value as UserRoleEnum)} className="input">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
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
            {createUser.isPending ? 'Adding…' : 'Add Member'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Edit User Drawer ─────────────────────────────────────────
function EditUserDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const updateUser = useUpdateUser();
  const [role, setRole] = useState(user.role as unknown as UserRoleEnum);
  const [phone, setPhone] = useState(user.phone || '');

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync({ id: user.id, role: role as any, phone });
      toast.success('User updated');
      onClose();
    } catch { toast.error('Update failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-xs font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <span className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</span>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost h-7 w-7"><XMarkIcon className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRoleEnum)} className="input">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="(225) 555-0100" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={updateUser.isPending} className="btn-primary flex-1">
            {updateUser.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── User Row ─────────────────────────────────────────────────
function UserRow({ user, currentUserId }: { user: AdminUser; currentUserId?: string }) {
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const isSelf = user.id === currentUserId;

  const handleToggle = async () => {
    try {
      if (user.isActive) {
        await deactivate.mutateAsync(user.id);
        toast.success(`${user.firstName} deactivated`);
      } else {
        await reactivate.mutateAsync(user.id);
        toast.success(`${user.firstName} reactivated`);
      }
      setShowConfirm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Action failed');
    }
  };

  const lastSeen = user.lastLoginAt
    ? (() => {
        const diff = Date.now() - new Date(user.lastLoginAt).getTime();
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
      })()
    : 'Never';

  return (
    <>
      <tr className={clsx('hover:bg-slate-800/30 transition-colors group', !user.isActive && 'opacity-50')}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 relative">
              {user.firstName[0]}{user.lastName[0]}
              {isSelf && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />}
            </div>
            <div>
              <div className="text-sm font-medium text-white flex items-center gap-1.5">
                {user.firstName} {user.lastName}
                {isSelf && <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-400/10 px-1.5 py-0.5 rounded-full">You</span>}
              </div>
              <div className="text-[11px] text-slate-500">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium border', ROLE_COLORS[user.role] || 'bg-slate-700/30 text-slate-400 border-slate-700/30')}>
            {ROLE_LABELS[user.role] || user.role}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">
          <div className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{lastSeen}</div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-400">{user._count?.assignedLeads ?? 0}</td>
        <td className="px-4 py-3">
          <span className={clsx('w-2 h-2 rounded-full inline-block', user.isActive ? 'bg-emerald-400' : 'bg-slate-600')} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setShowEdit(true)} className="btn-sm btn-ghost text-slate-400 hover:text-white text-xs">Edit</button>
            {isSelf ? (
              <span className="text-xs text-slate-600 px-2">—</span>
            ) : (
              <button
                onClick={() => user.isActive ? setShowConfirm(true) : handleToggle()}
                disabled={deactivate.isPending || reactivate.isPending}
                className={clsx('btn-sm text-xs', user.isActive ? 'btn-ghost text-red-400 hover:text-red-300' : 'btn-ghost text-emerald-400')}>
                {user.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
          </div>
        </td>
      </tr>
      <AnimatePresence>
        {showConfirm && (
          <ConfirmDialog
            user={user}
            onConfirm={handleToggle}
            onCancel={() => setShowConfirm(false)}
            isPending={deactivate.isPending}
          />
        )}
        {showEdit && <EditUserDrawer user={user} onClose={() => setShowEdit(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Audit Row ────────────────────────────────────────────────
function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const timeStr = new Date(log.occurredAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const hasChanges = log.newValues && Object.keys(log.newValues).length > 0;

  return (
    <>
      <tr className="hover:bg-slate-800/20 transition-colors cursor-pointer" onClick={() => hasChanges && setExpanded(!expanded)}>
        <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{timeStr}</td>
        <td className="px-4 py-3">
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 capitalize">{log.entityType}</span>
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
        <td className="px-4 py-3 text-slate-600 text-xs">
          {hasChanges && (expanded ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />)}
        </td>
      </tr>
      {expanded && hasChanges && (
        <tr className="bg-slate-800/30">
          <td colSpan={6} className="px-4 py-3">
            <pre className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap">{JSON.stringify(log.newValues, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────
function LeaderboardPanel({
  period, setPeriod,
}: { period: 'week' | 'month' | 'quarter'; setPeriod: (p: 'week' | 'month' | 'quarter') => void }) {
  const { data: entries = [], isLoading } = useLeaderboard(period);
  const maxRevenue = Math.max(...entries.map((e) => e.revenue), 1);
  const medals = ['🥇', '🥈', '🥉'];
  const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
  const totalDeals = entries.reduce((s, e) => s + e.closedDeals, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 card overflow-hidden">
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
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading rankings…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <TrophySolid className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No sales data for this period yet.</p>
            <p className="text-slate-600 text-xs mt-1">Closed deals will appear here automatically.</p>
          </div>
        ) : (
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
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full border', ROLE_COLORS[entry.role] || 'text-slate-500')}>
                      {ROLE_LABELS[entry.role] || entry.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Period Summary</div>
          <div className="space-y-3">
            {[
              { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(1)}K`, color: 'text-emerald-400' },
              { label: 'Deals Closed', value: totalDeals, color: 'text-white' },
              { label: 'Active Reps', value: entries.length, color: 'text-brand-400' },
              { label: 'Avg Deal Size', value: `$${totalDeals ? (totalRevenue / totalDeals / 1000).toFixed(1) : 0}K`, color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{s.label}</span>
                <span className={clsx('text-sm font-semibold', s.color)}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
        {entries[0] && (
          <div className="card p-5 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <TrophySolid className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Top Performer</span>
            </div>
            <div className="text-base font-bold text-white">{entries[0].name}</div>
            <div className="text-sm text-emerald-400 font-semibold">${entries[0].revenue.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">{entries[0].closedDeals} deals · {period}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function AdminPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'leaderboard'>('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [lbPeriod, setLbPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const { data: apiUsers, isLoading: usersLoading, refetch: refetchUsers } = useAdminUsers({
    search: userSearch, role: roleFilter || undefined,
    isActive: showInactive ? undefined : true,
  });
  const { data: auditData, refetch: refetchAudit } = useAuditLog({
    entityType: auditEntityFilter || undefined, limit: 100,
  });
  const { data: statsData } = useOrgStats();

  const users = apiUsers || [];
  const auditLogs = auditData?.items || [];
  const stats = statsData || { totalLeads: 0, activeLeads: 0, totalProposals: 0, sentProposals: 0, totalInvoices: 0, paidInvoices: 0, activeUsers: 0, totalRevenue: 0 };

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
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search team members…" className="input pl-9" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-44 text-sm">
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-600" />
              Show inactive
            </label>
            <button onClick={() => refetchUsers()} className="btn-icon btn-ghost h-8 w-8 text-slate-500 hover:text-slate-300">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="card overflow-hidden">
            {usersLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading team…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Member', 'Role', 'Last Active', 'Leads', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <UsersIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">No team members found</p>
                          <button onClick={() => setShowAddUser(true)} className="btn-primary btn-sm mt-3 inline-flex items-center gap-1.5">
                            <PlusIcon className="h-3.5 w-3.5" /> Add first member
                          </button>
                        </td>
                      </tr>
                    ) : users.map((u) => <UserRow key={u.id} user={u} currentUserId={currentUser?.id} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Audit Log Tab ── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={auditEntityFilter} onChange={(e) => setAuditEntityFilter(e.target.value)} className="input w-40 text-sm">
              <option value="">All Types</option>
              {['lead', 'proposal', 'invoice', 'user', 'appointment', 'document', 'inspection'].map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500">{auditLogs.length} entries</span>
            <button onClick={() => refetchAudit()} className="btn-icon btn-ghost h-8 w-8 ml-auto text-slate-500 hover:text-slate-300">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
            <span className="text-[11px] text-slate-600 flex items-center gap-1">
              <ArrowPathIcon className="h-3 w-3" /> Auto-refresh 30s
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
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <ShieldCheckIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No audit events yet</p>
                        <p className="text-slate-600 text-xs mt-1">All user actions will be logged here</p>
                      </td>
                    </tr>
                  ) : auditLogs.map((log) => <AuditRow key={log.id} log={log} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaderboard Tab ── */}
      {activeTab === 'leaderboard' && (
        <LeaderboardPanel period={lbPeriod} setPeriod={setLbPeriod} />
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} />}
      </AnimatePresence>
    </div>
  );
}
