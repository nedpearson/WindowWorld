import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  UserCircleIcon, BellIcon, ShieldCheckIcon, CreditCardIcon,
  BuildingOfficeIcon, LockClosedIcon, KeyIcon, CheckIcon,
  EyeIcon, EyeSlashIcon, ComputerDesktopIcon, DevicePhoneMobileIcon,
  ArrowRightOnRectangleIcon, ClockIcon, GlobeAltIcon, CalendarDaysIcon,
  LinkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth.store';
import { useUpdateUser, useOrgStats } from '../../api/admin';
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
  weeklyReport:    false };

type NotifKey = keyof typeof NOTIF_DEFAULTS;
const NOTIF_LABELS: Record<NotifKey, { label: string; description: string; category: string }> = {
  newLead:             { label: 'New Lead Assigned',       description: 'When a lead is assigned to you',           category: 'Sales' },
  proposalViewed:      { label: 'Proposal Viewed',         description: 'When a client opens your proposal',         category: 'Sales' },
  contractSigned:      { label: 'Contract Signed',          description: 'When a quote is accepted',                  category: 'Sales' },
  paymentReceived:     { label: 'Payment Received',         description: 'When an invoice is marked paid',            category: 'Finance' },
  appointmentReminder: { label: 'Appointment Reminder',    description: '1 hour before a scheduled appointment',     category: 'Calendar' },
  teamActivity:        { label: 'Team Activity Feed',       description: 'Updates from team members in your org',     category: 'Team' },
  systemUpdates:       { label: 'System Alerts',            description: 'Critical system and security notifications', category: 'System' },
  weeklyReport:        { label: 'Weekly Performance Report', description: 'Your weekly summary every Monday morning', category: 'Reports' } };

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
    phone:     user?.phone     || '' });
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

      {/* Active Sessions removed in production cleanup pass */}
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
    } } as any);

  const { mutate: savePrefs, isPending: isSaving } = useMutation({
    mutationFn: () => apiClient.users.updatePreferences(prefs),
    onSuccess: () => {
      // Also mirror to localStorage as a fast offline cache
      localStorage.setItem('ww_notif_prefs', JSON.stringify(prefs));
      toast.success('Notification preferences saved');
      setDirty(false);
    },
    onError: () => toast.error('Failed to save preferences') });

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
    name: '', phone: '', email: '', address: '', timezone: 'America/Chicago', website: '' });
  const [dirty, setDirty] = useState(false);

  // Load real org data on mount
  const { isLoading: _orgLoading } = useQuery({
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
        website:  org.website  || '' });
    } } as any);

  const { mutate: saveOrg, isPending: isSaving } = useMutation({
    mutationFn: () => apiClient.teams.update(form),
    onSuccess: () => {
      toast.success('Organization settings saved');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['org-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to save');
    } });

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



      <button onClick={handleSave} disabled={!dirty || isSaving} className="btn-primary btn-sm">
        {isSaving ? 'Saving…' : 'Save Organization Settings'}
      </button>
    </div>
  );
}

// ─── Google Calendar Tab ───────────────────────────────────────
function GoogleCalendarTab() {
  const [status, setStatus] = useState<{
    connected: boolean;
    connectedAt: string | null;
    calendarId: string;
    enabled: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    apiClient.calendar.getStatus()
      .then((r: any) => setStatus(r?.data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));

    // Handle OAuth redirect back from Google
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get('gcal');
    if (gcal === 'connected') {
      toast.success('Google Calendar connected! Appointments will now be checked for conflicts.');
      // Remove query param without reload
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gcal === 'denied') {
      toast.info('Google Calendar access was denied.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gcal === 'error') {
      toast.error('Failed to connect Google Calendar. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
    // Redirect the browser to the OAuth consent URL
    const url = apiClient.calendar.getConnectUrl();
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Appointments will no longer be checked for conflicts.')) return;
    setDisconnecting(true);
    try {
      await apiClient.calendar.disconnect();
      setStatus((s) => s ? { ...s, connected: false, connectedAt: null } : s);
      toast.success('Google Calendar disconnected');
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-white">Google Calendar Integration</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Connect your personal Google Calendar so WindowWorld can detect scheduling conflicts
          before any appointment is booked.
        </p>
      </div>

      {/* Feature overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: '🔍', title: 'Conflict Detection', desc: 'Warns when a proposed appointment overlaps a personal calendar block' },
          { icon: '📅', title: 'Auto-Sync', desc: 'New WW appointments are added to your Google Calendar automatically' },
          { icon: '🔒', title: 'Private & Secure', desc: 'Only free/busy times are read — event titles & details stay private' },
        ].map((f) => (
          <div key={f.title} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="text-lg mb-1.5">{f.icon}</div>
            <div className="text-xs font-semibold text-white mb-1">{f.title}</div>
            <div className="text-[11px] text-slate-500 leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Connection card */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-6">
          <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          Checking connection status…
        </div>
      ) : !status?.enabled ? (
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-amber-300">Not Configured</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Google Calendar integration hasn't been configured yet.
              Contact your administrator to add the required API credentials.
            </div>
          </div>
        </div>
      ) : status?.connected ? (
        <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* Google Calendar logo */}
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Google Calendar</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium">
                    Connected
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Calendar: <span className="text-slate-300">{status.calendarId || 'primary'}</span>
                </div>
                {status.connectedAt && (
                  <div className="text-xs text-slate-600 mt-0.5">
                    Connected {new Date(status.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="btn-sm px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-xs font-medium whitespace-nowrap"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>

          {/* What happens now */}
          <div className="border-t border-emerald-500/10 pt-3 space-y-1.5">
            <div className="text-xs font-semibold text-emerald-400 mb-2">Active protections</div>
            {[
              'Conflict warning before any new appointment is booked',
              'New WindowWorld appointments sync to your Google Calendar',
              'Cancelled appointments are removed from your calendar',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Google Calendar</div>
              <div className="text-xs text-slate-500 mt-0.5">Not connected</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click below to authorize WindowWorld to read your calendar's free/busy information.
            You will be taken to Google's sign-in page — WindowWorld only sees <strong className="text-slate-300">blocked time slots</strong>,
            never your event titles or details.
          </p>
          <button
            onClick={handleConnect}
            className="btn-primary btn-sm flex items-center gap-2"
            id="gcal-connect-btn"
          >
            <LinkIcon className="h-4 w-4" />
            Connect Google Calendar
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="border-t border-slate-800 pt-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">How It Works</div>
        <ol className="space-y-2">
          {[
            'Click "Connect Google Calendar" and sign in with your Google account',
            'WindowWorld checks your calendar for conflicts before each appointment is saved',
            'If a conflict is found, you see a warning and can choose to override or pick a different time',
            'The new appointment is automatically added to your Google Calendar with customer details',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
              <span className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',  label: 'Profile',           icon: UserCircleIcon },
  { id: 'calendar', label: 'Google Calendar',    icon: CalendarDaysIcon },
  { id: 'security', label: 'Security',           icon: ShieldCheckIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'organization', label: 'Organization',   icon: BuildingOfficeIcon },
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
            {activeTab === 'calendar'      && <GoogleCalendarTab />}
            {activeTab === 'security'      && <SecurityTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'organization'  && <OrganizationTab />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
