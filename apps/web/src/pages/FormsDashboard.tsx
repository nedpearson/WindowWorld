import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getSignatures, allSignaturesComplete } from '../utils/signatureStore';
import { validateAppointment } from '../utils/validationEngine';

// ── Recent appointments with form-first actions ───────────
export function FormsDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try { setAppointments(await api.getAppointments()); } catch {}
      setLoading(false);
    })();
  }, []);

  const enriched = appointments.map(a => {
    const v = validateAppointment(a);
    const sigs = getSignatures(a.id);
    const signed = allSignaturesComplete(sigs);
    return { ...a, validation: v, signed };
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const active = enriched.filter(a => a.status !== 'complete' && a.status !== 'cancelled');
  const recent = enriched.slice(0, 12);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading forms...</div>
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Hero header */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🪟</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>Window World Forms</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Fill the Order Form and Contract — guided by AI, sketch-ready, export-ready.
        </p>
      </div>

      {/* Primary action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem', marginBottom: '2rem' }}>
        {[
          { icon: '📋', label: 'New Order Form', desc: 'Start a new window/door order', action: () => navigate('/appointments/new?form=order'), color: '#3b82f6' },
          { icon: '📄', label: 'New Contract', desc: 'Start a new customer contract', action: () => navigate('/appointments/new?form=contract'), color: '#8b5cf6' },
          { icon: '⏳', label: 'Continue Draft', desc: `${active.length} in progress`, action: () => {}, color: '#f59e0b', disabled: active.length === 0 },
          { icon: '🔍', label: 'Review Missing Info', desc: 'Check all open forms', action: () => navigate('/office'), color: '#ef4444' },
          { icon: '📦', label: 'Export Packet', desc: 'Generate signed PDF packet', action: () => {}, color: '#22c55e' },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action} disabled={btn.disabled}
            style={{ padding: '1.25rem 1rem', background: 'var(--bg-card)', border: `1px solid ${btn.disabled ? 'var(--border)' : `${btn.color}40`}`, borderRadius: 12, cursor: btn.disabled ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'all 0.2s', opacity: btn.disabled ? 0.5 : 1 }}
            onMouseEnter={e => !btn.disabled && ((e.currentTarget as HTMLButtonElement).style.borderColor = btn.color)}
            onMouseLeave={e => !btn.disabled && ((e.currentTarget as HTMLButtonElement).style.borderColor = `${btn.color}40`)}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.375rem' }}>{btn.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: btn.color }}>{btn.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{btn.desc}</div>
          </button>
        ))}
      </div>

      {/* Active in-progress forms */}
      {active.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 700 }}>⏳ In Progress ({active.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {active.slice(0, 5).map(a => <AppointmentFormCard key={a.id} appt={a} navigate={navigate} />)}
          </div>
        </div>
      )}

      {/* Recent appointments */}
      <div>
        <h2 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 700 }}>📅 Recent ({recent.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recent.map(a => <AppointmentFormCard key={a.id} appt={a} navigate={navigate} />)}
        </div>
      </div>

      {appointments.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
          <p style={{ color: 'var(--text-muted)' }}>No appointments yet. Start by creating a new order form.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/appointments')}>
            + New Appointment
          </button>
        </div>
      )}
    </div>
  );
}

function AppointmentFormCard({ appt, navigate }: { appt: any; navigate: any }) {
  const v = appt.validation;
  const openings = appt.openings?.length || 0;
  const total = appt.openings?.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0) || 0;

  const formSteps = [
    { label: 'Order Form', icon: '📋', step: 5, done: openings > 0 },
    { label: 'Contract', icon: '📄', step: 6, done: v?.overallPct > 70 },
    { label: 'Sketch', icon: '🏠', step: 2, done: false },
    { label: 'Signed', icon: '✍️', step: 8, done: appt.signed },
    { label: 'Export', icon: '📦', step: 8, done: appt.signed && v?.canExport },
  ];

  return (
    <div className="card" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      {/* Customer */}
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
          {appt.customer?.firstName} {appt.customer?.lastName}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {appt.customer?.address || 'No address'} · {openings} openings · ${total.toFixed(0)}
        </div>
      </div>

      {/* Completion */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <div style={{ width: 80, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${v?.overallPct || 0}%`, height: '100%', background: (v?.overallPct || 0) >= 90 ? '#22c55e' : (v?.overallPct || 0) >= 60 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', minWidth: 28 }}>{v?.overallPct || 0}%</span>
      </div>

      {/* Form step pills */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {formSteps.map(s => (
          <button key={s.label} onClick={() => navigate(`/appointments/${appt.id}`, { state: { step: s.step } })}
            title={`Open ${s.label}`}
            style={{ padding: '0.125rem 0.5rem', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: '0.625rem', fontWeight: 700,
              background: s.done ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
              color: s.done ? '#22c55e' : 'var(--text-muted)',
            }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Issue badges */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {(v?.blockers || 0) > 0 && (
          <span style={{ fontSize: '0.5625rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            🛑 {v.blockers}
          </span>
        )}
        {(v?.high || 0) > 0 && (
          <span style={{ fontSize: '0.5625rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            ⚠ {v.high}
          </span>
        )}
      </div>

      {/* Open button */}
      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/appointments/${appt.id}`)}>
        Open →
      </button>
    </div>
  );
}
