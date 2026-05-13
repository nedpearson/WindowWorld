import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useDraftStore, useAuthStore } from '../store';
import { OpeningEditor } from '../components/OpeningEditor';
import { HouseMapView } from '../components/HouseMapView';
import { PricingReview } from '../components/PricingReview';
import { ContractExport } from '../components/ContractExport';
import { ValidationWarnings } from '../components/ValidationWarnings';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { OrderFormView } from '../components/OrderFormView';
import { ContractFormView } from '../components/ContractFormView';

const STEPS = ['Customer', 'Job Info', 'Openings', 'House Map', 'Pricing', 'Order Form', 'Contract', 'Export'];

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appt, setAppt] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { saveDraft } = useDraftStore();

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getAppointment(id);
      setAppt(data);
      saveDraft(`appt_${id}`, data);
    } catch { navigate('/appointments'); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async (updates: any) => {
    if (!id) return;
    setSaving(true);
    try {
      const data = await api.updateAppointment(id, updates);
      setAppt((p: any) => ({ ...p, ...data }));
      saveDraft(`appt_${id}`, { ...appt, ...data });
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const recalc = async () => {
    if (!id) return;
    try { const d = await api.recalculate(id); setAppt((p: any) => ({ ...p, ...d })); } catch {}
  };

  if (!appt) return <div className="loading" style={{ padding: '3rem', textAlign: 'center' }}>Loading appointment...</div>;

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  return (
    <div className="fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/appointments')} style={{ marginBottom: '0.5rem' }}>← Back</button>
          <h1>{appt.customer.firstName} {appt.customer.lastName}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{appt.jobAddress}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="form-select" value={appt.status} onChange={e => save({ status: e.target.value })} style={{ width: 'auto' }}>
            {['draft', 'in_progress', 'quoted', 'sold', 'cancelled', 'needs_remeasure'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => save(appt)} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <button key={s} className={`stepper-step ${step === i ? 'active' : ''} ${i < step ? 'completed' : ''}`}
            onClick={() => setStep(i)}>
            <span className="stepper-num">{i < step ? '✓' : i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {/* Validation */}
      <ValidationWarnings appointment={appt} />

      {/* Step content */}
      {step === 0 && <CustomerStep appt={appt} onSave={save} />}
      {step === 1 && <JobInfoStep appt={appt} onSave={save} />}
      {step === 2 && <OpeningEditor appointmentId={id!} onUpdate={load} />}
      {step === 3 && <HouseMapView appointmentId={id!} openings={appt.openings || []} />}
      {step === 4 && <PricingReview appointment={appt} onRecalculate={recalc} onSave={save} />}
      {step === 5 && <OrderFormView appointmentId={id!} />}
      {step === 6 && <ContractFormView appointmentId={id!} />}
      {step === 7 && <ContractExport appointment={appt} />}

      {/* Floating Voice Assistant */}
      <VoiceAssistant appointmentId={id!} userId={useAuthStore.getState().user?.id || ''} onApplied={load} />

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          ← Previous
        </button>
        <button className="btn btn-primary" onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={step === STEPS.length - 1}>
          Next →
        </button>
      </div>

      {/* Sticky total */}
      <div className="sticky-total">
        <div>
          <span className="total-label">Quote Total</span>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {appt.openings?.length || 0} openings
          </span>
        </div>
        <span className="total-value">{fmt(appt.totalAmount)}</span>
      </div>
    </div>
  );
}

function CustomerStep({ appt, onSave }: { appt: any; onSave: (u: any) => void }) {
  const [c, setC] = useState(appt.customer);
  const upd = (f: string, v: any) => setC({ ...c, [f]: v });

  const saveCustomer = async () => {
    try { await api.updateCustomer(c.id, c); } catch {}
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem' }}>👤 Customer Information</h2>
      <div className="form-row">
        <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={c.firstName || ''} onChange={e => upd('firstName', e.target.value)} onBlur={saveCustomer} /></div>
        <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={c.lastName || ''} onChange={e => upd('lastName', e.target.value)} onBlur={saveCustomer} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={c.phone || ''} onChange={e => upd('phone', e.target.value)} onBlur={saveCustomer} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={c.email || ''} onChange={e => upd('email', e.target.value)} onBlur={saveCustomer} /></div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={c.address || ''} onChange={e => upd('address', e.target.value)} onBlur={saveCustomer} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">City</label><input className="form-input" value={c.city || ''} onChange={e => upd('city', e.target.value)} onBlur={saveCustomer} /></div>
        <div className="form-group"><label className="form-label">State</label><input className="form-input" value={c.state || ''} onChange={e => upd('state', e.target.value)} onBlur={saveCustomer} /></div>
        <div className="form-group"><label className="form-label">ZIP</label><input className="form-input" value={c.zip || ''} onChange={e => upd('zip', e.target.value)} onBlur={saveCustomer} /></div>
      </div>
      <div className="form-check" style={{ marginTop: '0.5rem' }}>
        <input type="checkbox" checked={c.preLead1978 || false} onChange={e => { upd('preLead1978', e.target.checked); setTimeout(saveCustomer, 100); }} />
        <label className="form-label" style={{ margin: 0 }}>Pre-1978 Home (Lead Paint Acknowledgement Required)</label>
      </div>
    </div>
  );
}

function JobInfoStep({ appt, onSave }: { appt: any; onSave: (u: any) => void }) {
  const [a, setA] = useState(appt);
  const upd = (f: string, v: any) => { const n = { ...a, [f]: v }; setA(n); };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem' }}>🏠 Job Information</h2>
      <div className="form-group"><label className="form-label">Job Address</label><input className="form-input" value={a.jobAddress || ''} onChange={e => upd('jobAddress', e.target.value)} onBlur={() => onSave({ jobAddress: a.jobAddress, jobCity: a.jobCity, jobState: a.jobState, jobZip: a.jobZip })} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">City</label><input className="form-input" value={a.jobCity || ''} onChange={e => upd('jobCity', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">State</label><input className="form-input" value={a.jobState || ''} onChange={e => upd('jobState', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">ZIP</label><input className="form-input" value={a.jobZip || ''} onChange={e => upd('jobZip', e.target.value)} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Project Type</label>
        <select className="form-select" value={a.projectType || ''} onChange={e => { upd('projectType', e.target.value); onSave({ projectType: e.target.value }); }}>
          <option value="replacement">Replacement</option>
          <option value="new_construction">New Construction</option>
          <option value="remodel">Remodel</option>
        </select>
      </div>
      <div className="form-group"><label className="form-label">Estimator Notes</label><textarea className="form-textarea" value={a.estimatorNotes || ''} onChange={e => upd('estimatorNotes', e.target.value)} onBlur={() => onSave({ estimatorNotes: a.estimatorNotes })} /></div>
      <div className="form-group"><label className="form-label">Installer Notes</label><textarea className="form-textarea" value={a.installerNotes || ''} onChange={e => upd('installerNotes', e.target.value)} onBlur={() => onSave({ installerNotes: a.installerNotes })} /></div>
      <div className="form-group"><label className="form-label">Office Notes</label><textarea className="form-textarea" value={a.officeNotes || ''} onChange={e => upd('officeNotes', e.target.value)} onBlur={() => onSave({ officeNotes: a.officeNotes })} /></div>
    </div>
  );
}
