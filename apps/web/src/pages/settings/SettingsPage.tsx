import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  UserCircleIcon, BellIcon, ShieldCheckIcon, CreditCardIcon,
  BuildingOfficeIcon, LockClosedIcon, KeyIcon, CheckIcon,
  EyeIcon, EyeSlashIcon, ComputerDesktopIcon, DevicePhoneMobileIcon,
  ArrowRightOnRectangleIcon, ClockIcon, GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth.store';
import { useUpdateUser } from '../../api/admin';
import apiClient from '../../api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const NOTIF_DEFAULTS = {
  newLead:         true,
  proposalViewed:  true,
  contractSigned:  true,
  paymentReceived: true,
  appointmentReminder: true,
  teamActivity:    false,
  systemUpdates:   true,
  weeklyReport:    false,
};

type NotifKey = keyof typeof NOTIF_DEFAULTS;
const NOTIF_LABELS: Record<NotifKey, { label: string; description: string; category: string }> = {
  newLead:             { label: 'New Lead Assigned',       description: 'When a lead is assigned to you',           category: 'Sales' },
  proposalViewed:      { label: 'Proposal Viewed',         description: 'When a client opens your proposal',         category: 'Sales' },
  contractSigned:      { label: 'Contract Signed',          description: 'When a quote is accepted',                  category: 'Sales' },
  paymentReceived:     { label: 'Payment Received',         description: 'When an invoice is marked paid',            category: 'Finance' },
  appointmentReminder: { label: 'Appointment Reminder',    description: '1 hour before a scheduled appointment',     category: 'Calendar' },
  teamActivity:        { label: 'Team Activity Feed',       description: 'Updates from team members in your org',     category: 'Team' },
  systemUpdates:       { label: 'System Alerts',            description: 'Critical system and security notifications', category: 'System' },
  weeklyReport:        { label: 'Weekly Performance Report', description: 'Your weekly summary every Monday morning', category: 'Reports' },
};

// ─── Toggle Switch ─────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none',
        checked ? 'bg-brand-500' : 'bg-slate-700',
      )}>
      <span className={clsx(
        'inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0.5',
      )} />
    </button>
  );
}

// ─── Profile Tab ───────────────────────────────────────────────
function ProfileTab() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updateUser = useUpdateUser();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    phone:     user?.phone     || '',
  });
  const [dirty, setDirty] = useState(false);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const updated = await updateUser.mutateAsync({ id: user.id, ...form } as any);
      setUser({ ...user, firstName: updated.firstName, lastName: updated.lastName } as any);
      toast.success('Profile updated');
      setDirty(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Avatar section */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</div>
          <div className="text-xs text-slate-400 mt-0.5">{user?.email}</div>
          <div className="text-[11px] text-brand-400 mt-1 font-medium">
            {user?.role === 'SUPER_ADMIN' ? 'Admin' :
             user?.role === 'SALES_MANAGER' ? 'Sales Manager' :
             user?.role === 'SALES_REP' ? 'Sales Rep' :
             user?.role === 'FIELD_MEASURE_TECH' ? 'Field Tech' :
             user?.role || 'Member'}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-6 space-y-5">
        <h3 className="text-sm font-semibold text-white">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">First Name</label>
            <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Last Name</label>
            <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className="input" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email Address</label>
            <input value={user?.email || ''} disabled
              className="input opacity-50 cursor-not-allowed bg-slate-800/50" />
            <p className="text-[11px] text-slate-600 mt-1">Email is managed by your SSO provider</p>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Phone</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" placeholder="(225) 555-0100" />
          </div>
        </div>

        {dirty && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
            <span className="text-sm text-brand-300">You have unsaved changes</span>
            <div className="flex gap-2">
              <button onClick={() => { setForm({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' }); setDirty(false); }}
                className="btn-ghost btn-sm text-slate-400">Discard</button>
              <button onClick={handleSave} disabled={updateUser.isPending} className="btn-primary btn-sm">
                {updateUser.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────
function SecurityTab() {
  const user = useAuthStore((s) => s.user);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePwChange = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await apiClient.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password changed successfully');
      setChangingPassword(false);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const sessions = [
    { device: 'Chrome on Windows', location: 'Baton Rouge, LA', time: 'Active now', icon: ComputerDesktopIcon, current: true },
    { device: 'Safari on iPhone', location: 'Baton Rouge, LA', time: '2 hours ago', icon: DevicePhoneMobileIcon, current: false },
  ];

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Google SSO info */}
      {user?.googleId ? (
        <div className="flex items-start gap-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <CheckIcon className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-emerald-400">Signed in with Google</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Your account uses Google SSO. Password authentication is disabled for security.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Change Password</h3>
          {!changingPassword ? (
            <button onClick={() => setChangingPassword(true)} className="btn-secondary btn-sm flex items-center gap-2">
              <LockClosedIcon className="h-4 w-4" /> Change Password
            </button>
          ) : (
            <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              {[
                { key: 'current', label: 'Current Password' },
                { key: 'next',    label: 'New Password' },
                { key: 'confirm', label: 'Confirm New Password' },
              ].map(({ key, label }) => (
                <div key={key} className="relative">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwForm[key as keyof typeof pwForm]}
                    onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="input pr-9"
                  />
                  {key === 'next' && (
                    <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-7 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setChangingPassword(false)} className="btn-ghost btn-sm flex-1">Cancel</button>
                <button onClick={handlePwChange} disabled={saving} className="btn-primary btn-sm flex-1">
                  {saving ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div className="border-t border-slate-800 pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Two-Factor Authentication</h3>
            <p className="text-xs text-slate-500 mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Coming soon</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-800 opacity-50 cursor-not-allowed">
          <KeyIcon className="h-5 w-5 text-slate-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-400">Authenticator App</div>
            <div className="text-xs text-slate-600">Use an app like Google Authenticator</div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="border-t border-slate-800 pt-6 space-y-3">
        <h3 className="text-sm font-semibold text-white">Active Sessions</h3>
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-800">
              <s.icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  {s.device}
                  {s.current && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Current</span>}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <GlobeAltIcon className="h-3 w-3" />{s.location}
                  <ClockIcon className="h-3 w-3 ml-1" />{s.time}
                </div>
              </div>
              {!s.current && (
                <button className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  <ArrowRightOnRectangleIcon className="h-3.5 w-3.5" /> Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<NotifKey, boolean>>(NOTIF_DEFAULTS);
  const [dirty, setDirty] = useState(false);

  // Load from API on mount (server is source of truth)
  const { isLoading: prefsLoading } = useQuery({
    queryKey: ['user-notif-prefs'],
    queryFn: () => apiClient.users.me(),
    onSuccess: (res: any) => {
      const serverPrefs = res?.data?.notifPreferences;
      if (serverPrefs && Object.keys(serverPrefs).length > 0) {
        setPrefs((p) => ({ ...p, ...serverPrefs }));
      } else {
        // First time — try localStorage migration
        try {
          const ls = localStorage.getItem('ww_notif_prefs');
          if (ls) setPrefs((p) => ({ ...p, ...JSON.parse(ls) }));
        } catch {}
      }
    },
  } as any);

  const { mutate: savePrefs, isPending: isSaving } = useMutation({
    mutationFn: () => apiClient.users.updatePreferences(prefs),
    onSuccess: () => {
      // Also mirror to localStorage as a fast offline cache
      localStorage.setItem('ww_notif_prefs', JSON.stringify(prefs));
      toast.success('Notification preferences saved');
      setDirty(false);
    },
    onError: () => toast.error('Failed to save preferences'),
  });

  const toggle = (key: NotifKey) => { setPrefs((p) => ({ ...p, [key]: !p[key] })); setDirty(true); };
  const categories = [...new Set(Object.values(NOTIF_LABELS).map((v) => v.category))];

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-white">Notification Preferences</h3>
        <p className="text-xs text-slate-500 mt-0.5">Choose how and when you receive updates from WindowWorld</p>
      </div>

      {prefsLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
          <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          Loading preferences…
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-800">{cat}</div>
            {(Object.entries(NOTIF_LABELS) as [NotifKey, typeof NOTIF_LABELS[NotifKey]][])
              .filter(([, v]) => v.category === cat)
              .map(([key, meta]) => (
                <div key={key} className="flex items-center justify-between py-3 hover:bg-slate-800/20 px-3 -mx-3 rounded-lg transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{meta.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{meta.description}</div>
                  </div>
                  <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
                </div>
              ))
            }
          </div>
        ))
      )}

      <div className="pt-2 flex items-center gap-3">
        <button onClick={() => savePrefs()} disabled={!dirty || isSaving} className="btn-primary btn-sm flex items-center gap-2">
          {isSaving ? 'Saving…' : dirty ? 'Save Preferences' : <><CheckIcon className="h-4 w-4" /> Saved</>}
        </button>
        <button onClick={() => { setPrefs(NOTIF_DEFAULTS); setDirty(true); }} className="btn-ghost btn-sm text-slate-400">
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

// ─── Organization Tab ─────────────────────────────────────────
function OrganizationTab() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICE_ADMIN';
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', timezone: 'America/Chicago', website: '',
  });
  const [dirty, setDirty] = useState(false);

  // Load real org data on mount
  const { isLoading: orgLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: () => apiClient.teams.me(),
    enabled: isAdmin,
    onSuccess: (res: any) => {
      const org = res?.data;
      if (org) setForm({
        name:     org.name     || '',
        phone:    org.phone    || '',
        email:    org.email    || '',
        address:  org.address  || '',
        timezone: org.timezone || 'America/Chicago',
        website:  org.website  || '',
      });
    },
  } as any);

  const { mutate: saveOrg, isPending: isSaving } = useMutation({
    mutationFn: () => apiClient.teams.update(form),
    onSuccess: () => {
      toast.success('Organization settings saved');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['org-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to save');
    },
  });

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const handleSave = () => saveOrg();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldCheckIcon className="h-12 w-12 text-slate-700 mb-4" />
        <div className="text-slate-400 text-sm font-medium">Admin Access Required</div>
        <div className="text-slate-600 text-xs mt-1">Only Admins can modify organization settings</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-white">Organization Settings</h3>
        <p className="text-xs text-slate-500 mt-0.5">Manage your company profile and default preferences</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Organization Name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Primary Phone</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Contact Email</label>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} className="input" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Address</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Timezone</label>
            <select value={form.timezone} onChange={(e) => set('timezone', e.target.value)} className="input">
              <option value="America/Chicago">Central (CST/CDT)</option>
              <option value="America/New_York">Eastern (EST/EDT)</option>
              <option value="America/Denver">Mountain (MST/MDT)</option>
              <option value="America/Los_Angeles">Pacific (PST/PDT)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Website</label>
            <input value={form.website} onChange={(e) => set('website', e.target.value)} className="input" />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-t border-slate-800 pt-6 space-y-3">
        <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
        <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Export All Data</div>
              <div className="text-xs text-slate-500">Download a full CSV export of all leads, proposals, and invoices</div>
            </div>
            <button className="btn-secondary btn-sm whitespace-nowrap" onClick={() => toast.info('Export queued — you will receive an email with the download link')}>
              Export CSV
            </button>
          </div>
          <div className="h-px bg-red-500/10" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-red-300">Delete Organization</div>
              <div className="text-xs text-slate-500">Permanently delete all data. This cannot be undone.</div>
            </div>
            <button className="btn-sm px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors whitespace-nowrap text-xs font-medium"
              onClick={() => toast.error('Contact support to delete your organization')}>
              Delete Org
            </button>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={!dirty || isSaving} className="btn-primary btn-sm">
        {isSaving ? 'Saving…' : 'Save Organization Settings'}
      </button>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────
function BillingTab() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPER_ADMIN';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CreditCardIcon className="h-12 w-12 text-slate-700 mb-4" />
        <div className="text-slate-400 text-sm font-medium">Admin Access Required</div>
        <div className="text-slate-600 text-xs mt-1">Only Admins can view billing information</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-white">Billing & Subscription</h3>
        <p className="text-xs text-slate-500 mt-0.5">Manage your plan, payment methods, and invoices</p>
      </div>

      {/* Current Plan */}
      <div className="p-5 bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20 rounded-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-1">Current Plan</div>
            <div className="text-lg font-bold text-white">Professional</div>
            <div className="text-sm text-slate-400 mt-0.5">$299 / month · Up to 10 users · All features</div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-medium">Active</span>
        </div>
        <div className="mt-4 pt-4 border-t border-brand-500/10 flex items-center justify-between text-xs text-slate-500">
          <span>Next billing: May 20, 2026</span>
          <button className="text-brand-400 hover:text-brand-300 transition-colors" onClick={() => toast.info('Redirecting to Stripe Portal…')}>
            Manage in Stripe →
          </button>
        </div>
      </div>

      {/* Usage */}
      <div className="card p-5 space-y-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan Usage</div>
        {[
          { label: 'Team Members',    used: 1, max: 10,    unit: 'users' },
          { label: 'Active Leads',    used: 89, max: 500,  unit: 'leads' },
          { label: 'AI Analyses',     used: 23, max: 200,  unit: 'this month' },
          { label: 'Storage',         used: 1.2, max: 10,  unit: 'GB' },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">{item.label}</span>
              <span className="text-slate-300">{item.used} / {item.max} {item.unit}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', (item.used / item.max) > 0.8 ? 'bg-red-400' : (item.used / item.max) > 0.6 ? 'bg-amber-400' : 'bg-brand-500')}
                style={{ width: `${Math.min((item.used / item.max) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Payment Method */}
      <div className="card p-5 space-y-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Method</div>
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
          <div className="w-8 h-6 bg-slate-600 rounded flex items-center justify-center">
            <span className="text-[9px] font-bold text-slate-300">VISA</span>
          </div>
          <div className="flex-1">
            <div className="text-sm text-white">•••• •••• •••• 4242</div>
            <div className="text-xs text-slate-500">Expires 12/27</div>
          </div>
          <button className="btn-ghost btn-sm text-xs text-slate-400" onClick={() => toast.info('Redirecting to Stripe to update your card…')}>Update</button>
        </div>
      </div>

      {/* Invoice History */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Invoices</span>
        </div>
        <div className="divide-y divide-slate-800/50">
          {[
            { date: 'Apr 20, 2026', amount: '$299.00', status: 'Paid' },
            { date: 'Mar 20, 2026', amount: '$299.00', status: 'Paid' },
            { date: 'Feb 20, 2026', amount: '$299.00', status: 'Paid' },
          ].map((inv, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-slate-400">{inv.date}</span>
              <span className="text-sm text-white font-medium">{inv.amount}</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">{inv.status}</span>
              <button className="text-xs text-slate-500 hover:text-brand-400 transition-colors">Download</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',  label: 'Profile',       icon: UserCircleIcon },
  { id: 'security', label: 'Security',       icon: ShieldCheckIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'organization', label: 'Organization', icon: BuildingOfficeIcon },
  { id: 'billing',  label: 'Billing',        icon: CreditCardIcon },
] as const;

type TabId = typeof TABS[number]['id'];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account, team, and organization preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left',
                    activeTab === tab.id
                      ? 'bg-brand-500/15 text-brand-300'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
                  )}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card p-6 min-h-[400px]">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}>
            {activeTab === 'profile'       && <ProfileTab />}
            {activeTab === 'security'      && <SecurityTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'organization'  && <OrganizationTab />}
            {activeTab === 'billing'       && <BillingTab />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
