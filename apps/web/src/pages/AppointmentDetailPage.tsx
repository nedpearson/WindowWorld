import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useDraftStore, useAuthStore } from '../store';
import { OpeningEditor } from '../components/OpeningEditor';
import { HouseMapView } from '../components/HouseMapView';
import { PricingReview } from '../components/PricingReview';
import { ContractExport } from '../components/ContractExport';
import { OrderFormView } from '../components/OrderFormView';
import { ContractFormView } from '../components/ContractFormView';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { MissingInfoCheck } from '../components/MissingInfoCheck';
import { StepCompletionBadge } from '../components/StepCompletion';
import { validateAppointment } from '../utils/validationEngine';
import { AppointmentCoach } from '../components/AppointmentCoach';
import { OfficeReviewPanel } from '../components/OfficeReviewPanel';

const STEPS = [
  'Customer',
  'Job Info',
  'Home Sketch',
  'Openings',
  'Pricing',
  'Order Form',
  'Contract',
  'Missing Info',
  'Export',
];

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

  const validation = useMemo(
    () => appt ? validateAppointment(appt) : null,
    [appt]
  );

  if (!appt) return <div className="loading" style={{ padding: '3rem', textAlign: 'center' }}>Loading appointment...</div>;

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  // Ready state indicator
  const readyConfig: Record<string, { color: string; label: string }> = {
    incomplete: { color: '#ef4444', label: 'Incomplete' },
    review: { color: '#f59e0b', label: 'Review' },
    ready_for_signature: { color: '#3b82f6', label: 'Signature Ready' },
    ready_to_export: { color: '#22c55e', label: 'Export Ready' },
  };

  const readyState = validation ? readyConfig[validation.readyState] : readyConfig.incomplete;

  return (
    <div className="fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/appointments')} style={{ marginBottom: '0.5rem' }}>← Back</button>
          <h1>{appt.customer.firstName} {appt.customer.lastName}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{appt.jobAddress}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Readiness badge */}
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, color: readyState.color,
            background: `${readyState.color}18`, padding: '4px 10px', borderRadius: 9999,
          }}>
            {validation?.overallPct}% — {readyState.label}
          </span>
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

      {/* Enhanced Stepper with completion badges */}
      <div className="stepper">
        {STEPS.map((s, i) => {
          const isActive = step === i;
          const isCompleted = i < step;
          // For "Missing Info" step, show blocker count
          const stepBlockers = validation?.issues.filter(iss => iss.jumpStep === i && iss.severity === 'BLOCKER').length || 0;

          return (
            <button
              key={s}
              className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => setStep(i)}
            >
              <span className="stepper-num">
                {isCompleted ? '✓' : i + 1}
              </span>
              <span>{s}</span>
              {/* Completion badge */}
              {appt && i <= 7 && (
                <StepCompletionBadge stepIndex={i} appointment={appt} />
              )}
              {/* Blocker indicator */}
              {stepBlockers > 0 && !isActive && (
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700, color: '#ef4444',
                  background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: 4, marginLeft: '0.125rem',
                }}>
                  {stepBlockers}🛑
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Validation summary bar */}
      {validation && validation.blockers > 0 && (
        <div style={{
          padding: '0.625rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-sm)',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.8125rem', color: '#ef4444', fontWeight: 600 }}>
            🛑 {validation.blockers} blocker{validation.blockers > 1 ? 's' : ''} must be fixed before export
            {validation.high > 0 && ` · ${validation.high} high priority`}
          </span>
          <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none' }}
            onClick={() => setStep(7)}>
            View All →
          </button>
        </div>
      )}

      {/* Step content */}
      {step === 0 && <CustomerStep appt={appt} onSave={save} validation={validation} />}
      {step === 1 && <JobInfoStep appt={appt} onSave={save} />}
      {step === 2 && <HouseMapView appointmentId={id!} openings={appt.openings || []} />}
      {step === 3 && <OpeningEditor appointmentId={id!} onUpdate={load} />}
      {step === 4 && <PricingReview appointment={appt} onRecalculate={recalc} onSave={save} />}
      {step === 5 && <OrderFormView appointmentId={id!} />}
      {step === 6 && <ContractFormView appointmentId={id!} />}
      {step === 7 && <MissingInfoCheck appointment={appt} onJumpToStep={setStep} />}
      {step === 8 && (
        <div>
          {validation && !validation.canExport && (
            <div className="card" style={{
              marginBottom: '1rem', background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)',
              textAlign: 'center', padding: '2rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛑</div>
              <h3 style={{ color: '#ef4444' }}>Cannot Export — {validation.blockers} Blocker{validation.blockers > 1 ? 's' : ''} Remaining</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Fix all blockers on the Missing Info Check step before generating the final packet.
              </p>
              <button className="btn btn-danger" style={{ marginTop: '1rem' }} onClick={() => setStep(7)}>
                Go to Missing Info Check
              </button>
            </div>
          )}
          <ContractExport appointment={appt} />
        </div>
      )}

      {/* Floating Voice Assistant */}
      <VoiceAssistant appointmentId={id!} userId={useAuthStore.getState().user?.id || ''} onApplied={load} />

      {/* AI Appointment Coach */}
      <AppointmentCoach appointment={appt} onJumpToStep={setStep} />

      {/* Office Review Panel */}
      <OfficeReviewPanel appointment={appt} currentUserName={useAuthStore.getState().user?.name || 'Office'} />

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
          {validation && (
            <span style={{
              marginLeft: '0.75rem', fontSize: '0.75rem', fontWeight: 700,
              color: readyState.color,
            }}>
              {readyState.label}
            </span>
          )}
        </div>
        <span className="total-value">{fmt(appt.totalAmount)}</span>
      </div>
    </div>
  );
}

// ─── CUSTOMER STEP with inline validation ─────────────────
function CustomerStep({ appt, onSave, validation }: { appt: any; onSave: (u: any) => void; validation: any }) {
  const [c, setC] = useState(appt.customer);
  const upd = (f: string, v: any) => setC({ ...c, [f]: v });

  const saveCustomer = async () => {
    try { await api.updateCustomer(c.id, c); } catch {}
  };

  // Find issues for this step
  const stepIssues = validation?.issues?.filter((i: any) => i.jumpStep === 0) || [];

  const fieldWarn = (path: string) => {
    const issue = stepIssues.find((i: any) => i.fieldPath.endsWith(path));
    if (!issue) return null;
    return (
      <span style={{ fontSize: '0.6875rem', color: issue.severity === 'BLOCKER' ? '#ef4444' : '#f59e0b', marginLeft: '0.25rem' }}>
        {issue.severity === 'BLOCKER' ? '🛑' : '⚠'} Required
      </span>
    );
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem' }}>👤 Customer Information</h2>
      {stepIssues.length > 0 && (
        <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#ef4444' }}>
          {stepIssues.length} field{stepIssues.length > 1 ? 's' : ''} need attention
        </div>
      )}
      <div className="form-row">
        <div className="form-group"><label className="form-label">First Name {fieldWarn('firstName')}</label><input className="form-input" value={c.firstName || ''} onChange={e => upd('firstName', e.target.value)} onBlur={saveCustomer} style={!c.firstName ? { borderColor: '#ef4444' } : {}} /></div>
        <div className="form-group"><label className="form-label">Last Name {fieldWarn('lastName')}</label><input className="form-input" value={c.lastName || ''} onChange={e => upd('lastName', e.target.value)} onBlur={saveCustomer} style={!c.lastName ? { borderColor: '#ef4444' } : {}} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Phone {fieldWarn('phone')}</label><input className="form-input" value={c.phone || ''} onChange={e => upd('phone', e.target.value)} onBlur={saveCustomer} style={!c.phone ? { borderColor: '#ef4444' } : {}} /></div>
        <div className="form-group"><label className="form-label">Email {fieldWarn('email')}</label><input className="form-input" value={c.email || ''} onChange={e => upd('email', e.target.value)} onBlur={saveCustomer} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Phone 2</label><input className="form-input" value={c.phone2 || ''} onChange={e => upd('phone2', e.target.value)} onBlur={saveCustomer} /></div>
        <div className="form-group"><label className="form-label">WW Customer ID</label><input className="form-input" value={c.customerId || ''} onChange={e => upd('customerId', e.target.value)} onBlur={saveCustomer} /></div>
      </div>
      <div className="form-group"><label className="form-label">Address {fieldWarn('address')}</label><input className="form-input" value={c.address || ''} onChange={e => upd('address', e.target.value)} onBlur={saveCustomer} style={!c.address ? { borderColor: '#ef4444' } : {}} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">City {fieldWarn('city')}</label><input className="form-input" value={c.city || ''} onChange={e => upd('city', e.target.value)} onBlur={saveCustomer} /></div>
        <div className="form-group"><label className="form-label">State {fieldWarn('state')}</label><input className="form-input" value={c.state || ''} onChange={e => upd('state', e.target.value)} onBlur={saveCustomer} /></div>
        <div className="form-group"><label className="form-label">ZIP {fieldWarn('zip')}</label><input className="form-input" value={c.zip || ''} onChange={e => upd('zip', e.target.value)} onBlur={saveCustomer} /></div>
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
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Project Type</label>
          <select className="form-select" value={a.projectType || ''} onChange={e => { upd('projectType', e.target.value); onSave({ projectType: e.target.value }); }}>
            <option value="replacement">Replacement</option>
            <option value="new_construction">New Construction</option>
            <option value="remodel">Remodel</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Complete Job?</label>
          <select className="form-select" value={a.completeJob ? 'yes' : 'no'} onChange={e => { upd('completeJob', e.target.value === 'yes'); onSave({ completeJob: e.target.value === 'yes' }); }}>
            <option value="yes">Complete Job — All Windows</option>
            <option value="no">Partial — Remaining Windows Only</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">PO Number</label><input className="form-input" value={a.poNumber || ''} onChange={e => upd('poNumber', e.target.value)} onBlur={() => onSave({ poNumber: a.poNumber })} /></div>
        <div className="form-group"><label className="form-label">Account Number</label><input className="form-input" value={a.accountNumber || ''} onChange={e => upd('accountNumber', e.target.value)} onBlur={() => onSave({ accountNumber: a.accountNumber })} /></div>
      </div>
      <div className="form-group"><label className="form-label">Estimator Notes</label><textarea className="form-textarea" value={a.estimatorNotes || ''} onChange={e => upd('estimatorNotes', e.target.value)} onBlur={() => onSave({ estimatorNotes: a.estimatorNotes })} /></div>
      <div className="form-group"><label className="form-label">Installer Notes</label><textarea className="form-textarea" value={a.installerNotes || ''} onChange={e => upd('installerNotes', e.target.value)} onBlur={() => onSave({ installerNotes: a.installerNotes })} /></div>
      <div className="form-group"><label className="form-label">Office Notes</label><textarea className="form-textarea" value={a.officeNotes || ''} onChange={e => upd('officeNotes', e.target.value)} onBlur={() => onSave({ officeNotes: a.officeNotes })} /></div>
    </div>
  );
}
