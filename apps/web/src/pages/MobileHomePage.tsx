import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store';
import { useMobileStore } from '../store/mobileStore';

interface NewApptForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  appointmentDate: string;
  projectType: string;
}

export function MobileHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const mobile = useMobileStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewApptForm>({
    firstName: '', lastName: '', phone: '', address: '', city: '', zip: '',
    appointmentDate: new Date().toISOString().slice(0, 16),
    projectType: 'replacement',
  });
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({});
      setAppointments(Array.isArray(data) ? data : []);
      setError('');
    } catch {
      setError('Could not load appointments — working offline');
      // Try getting from cached drafts
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Today's appointments
  const today = new Date().toDateString();
  const todayAppts = appointments.filter(a => {
    if (!a.appointmentDate) return false;
    return new Date(a.appointmentDate).toDateString() === today;
  });

  // In-progress / incomplete
  const inProgress = appointments.filter(a =>
    ['draft', 'in_progress', 'needs_remeasure'].includes(a.status) &&
    new Date(a.appointmentDate || 0).toDateString() !== today
  );

  // Needing sync (unsynced items in queue for this appointment)
  const needsSync = appointments.filter(a =>
    mobile.syncQueue.some(q => q.payload?.appointmentId === a.id && q.status === 'failed')
  );

  const createAppointment = async () => {
    if (!form.firstName || !form.lastName) return;
    setCreating(true);
    try {
      const cust = await api.createCustomer({
        firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        address: form.address, city: form.city, zip: form.zip, state: 'LA',
      });
      const appt = await api.createAppointment({
        customerId: cust.id, userId: user!.id,
        jobAddress: form.address, jobCity: form.city, jobZip: form.zip,
        appointmentDate: form.appointmentDate ? new Date(form.appointmentDate).toISOString() : new Date().toISOString(),
        projectType: form.projectType,
      });
      setShowNew(false);
      navigate(`/mobile/field/${appt.id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const syncStatus = mobile.isOnline ? (mobile.syncQueue.filter(q => q.status === 'pending').length > 0 ? 'syncing' : 'synced') : 'offline';

  const statusColor: Record<string, string> = {
    draft: '#64748b', in_progress: '#3b82f6', quoted: '#f59e0b',
    sold: '#22c55e', needs_remeasure: '#f59e0b', cancelled: '#ef4444',
  };

  const completionColor = (pct: number) =>
    pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  const call = (phone: string) => { window.location.href = `tel:${phone.replace(/\D/g, '')}`; };

  const navigate2 = (address: string) => {
    window.open(`https://maps.apple.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  const ApptCard = ({ a, highlight }: { a: any; highlight?: boolean }) => (
    <div
      style={{
        background: highlight ? 'rgba(59,130,246,0.06)' : 'var(--bg-card)',
        border: `1px solid ${highlight ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
        borderRadius: 16, padding: '1rem', marginBottom: '0.75rem',
        transition: 'all 0.2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            {a.customer?.firstName} {a.customer?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
            {a.appointmentDate ? new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time set'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 700, padding: '0.25rem 0.625rem',
            borderRadius: 9999, background: `${statusColor[a.status] || '#64748b'}22`,
            color: statusColor[a.status] || '#64748b', textTransform: 'capitalize',
          }}>
            {a.status?.replace('_', ' ')}
          </span>
          {/* Completion % */}
          <div style={{
            fontSize: '0.625rem', fontWeight: 800, padding: '0.125rem 0.375rem',
            borderRadius: 9999, background: `${completionColor(a.completionPct || 0)}22`,
            color: completionColor(a.completionPct || 0),
          }}>
            {Math.round(a.completionPct || 0)}%
          </div>
        </div>
      </div>

      {/* Address */}
      {a.jobAddress && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '0.25rem' }}>
          <span>📍</span> {a.jobAddress}{a.jobCity ? `, ${a.jobCity}` : ''}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
        <span>🪟 {a._count?.openings || 0} openings</span>
        {a.totalAmount > 0 && <span style={{ color: '#22c55e', fontWeight: 700 }}>${Math.round(a.totalAmount).toLocaleString()}</span>}
        {needsSync.find(n => n.id === a.id) && <span style={{ color: 'var(--warning)' }}>⚠ Sync needed</span>}
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <button
          onClick={() => navigate(`/mobile/field/${a.id}`)}
          style={{
            padding: '0.625rem 0.25rem', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
          }}
        >
          {a.status === 'draft' ? '▶ Start' : '▶ Continue'}
        </button>
        {a.jobAddress && (
          <button
            onClick={() => navigate2(`${a.jobAddress} ${a.jobCity || ''}`)}
            style={{
              padding: '0.625rem 0.25rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            🗺 Navigate
          </button>
        )}
        {a.customer?.phone && (
          <button
            onClick={() => call(a.customer.phone)}
            style={{
              padding: '0.625rem 0.25rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            📞 Call
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      background: 'var(--bg-primary)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        padding: '0.875rem 1rem',
        paddingTop: 'max(0.875rem, env(safe-area-inset-top))',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🪟 Field App
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Sync status dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                background: syncStatus === 'synced' ? '#22c55e' : syncStatus === 'syncing' ? '#f59e0b' : '#ef4444',
                animation: syncStatus === 'syncing' ? 'pulse 1s infinite' : 'none',
              }} />
              <span style={{ color: 'var(--text-muted)' }}>
                {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing…' : 'Offline'}
              </span>
            </div>
            {installPrompt && (
              <button
                onClick={() => installPrompt.prompt()}
                style={{
                  fontSize: '0.6875rem', padding: '0.25rem 0.5rem', background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer',
                }}
              >
                ⬇ Install App
              </button>
            )}
            <button
              onClick={() => { useAuthStore.getState().logout(); }}
              style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Sync warning banner */}
      {!mobile.isOnline && (
        <div style={{
          background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.25)',
          padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--warning)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          📵 Offline mode — changes save locally and sync when you reconnect
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--warning)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* NEW APPOINTMENT */}
        <button
          onClick={() => setShowNew(true)}
          style={{
            width: '100%', padding: '1rem', marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: '1rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>+</span> New Appointment
        </button>

        {/* TODAY */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Today</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{todayAppts.length} appt{todayAppts.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
          ) : todayAppts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              No appointments scheduled for today
            </div>
          ) : (
            todayAppts.map(a => <ApptCard key={a.id} a={a} highlight />)
          )}
        </div>

        {/* IN PROGRESS */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Drafts & In Progress</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inProgress.length}</span>
            </div>
            {inProgress.map(a => <ApptCard key={a.id} a={a} />)}
          </div>
        )}

        {/* ALL RECENT */}
        {appointments.filter(a => !todayAppts.includes(a) && !inProgress.includes(a)).slice(0, 5).length > 0 && (
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent</h2>
            </div>
            {appointments.filter(a => !todayAppts.includes(a) && !inProgress.includes(a)).slice(0, 5).map(a => (
              <ApptCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>

      {/* NEW APPOINTMENT SHEET */}
      {showNew && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}
        >
          <div style={{
            width: '100%', background: 'var(--bg-secondary)',
            borderRadius: '20px 20px 0 0', padding: '1.5rem',
            maxHeight: '90dvh', overflowY: 'auto',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>New Appointment</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Customer */}
            <div style={{ marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customer
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
              {[
                { key: 'firstName', label: 'First Name *', type: 'text' },
                { key: 'lastName', label: 'Last Name *', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{f.label}</div>
                  <input
                    type={f.type} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '0.625rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
              <input type="tel" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '0.625rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Address</div>
              <input type="text" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.6fr', gap: '0.625rem', marginBottom: '1rem' }}>
              {[
                { key: 'city', label: 'City' },
                { key: 'zip', label: 'ZIP' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{f.label}</div>
                  <input type="text" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                    value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>

            {/* Appointment */}
            <div style={{ marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Appointment
            </div>
            <div style={{ marginBottom: '0.625rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Date & Time</div>
              <input type="datetime-local" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}
                value={form.appointmentDate} onChange={e => setForm(p => ({ ...p, appointmentDate: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Project Type</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {['replacement', 'new_construction', 'remodel'].map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p, projectType: t }))}
                    style={{
                      padding: '0.625rem', borderRadius: 8, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                      border: `1px solid ${form.projectType === t ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.projectType === t ? 'rgba(59,130,246,0.15)' : 'var(--bg-input)',
                      color: form.projectType === t ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                    {t === 'replacement' ? 'Replace' : t === 'new_construction' ? 'New' : 'Remodel'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={createAppointment}
              disabled={!form.firstName || !form.lastName || creating}
              style={{
                width: '100%', padding: '1rem', background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                opacity: (!form.firstName || !form.lastName || creating) ? 0.5 : 1,
              }}
            >
              {creating ? 'Creating…' : '✓ Create Appointment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
