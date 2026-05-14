import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store';
import { useMobileStore, type FieldExtraction } from '../store/mobileStore';
import { useSyncWorker } from '../utils/useSyncWorker';
import { parseWxH, FRACTION_BUTTONS } from '../utils/measurementParser';
import { SketchBoard } from '../components/DrawableSketch';
import { OpeningWizard } from '../components/OpeningWizard';
import { MissingInfoCheck } from '../components/MissingInfoCheck';
import { PricingReview } from '../components/PricingReview';
import { validateAppointment } from '../utils/validationEngine';
import { runAppointmentCoach } from '../utils/appointmentCoach';

type MobileTab = 'home' | 'openings' | 'notes' | 'sketch' | 'review' | 'pricing' | 'checklist';

export function MobileFieldPage() {
  const navigate = useNavigate();
  const { appointmentId: routeApptId } = useParams<{ appointmentId: string }>();
  const user = useAuthStore(s => s.user);
  const mobile = useMobileStore();
  const sync = useSyncWorker();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appt, setAppt] = useState<any>(null);
  const [tab, setTab] = useState<MobileTab>('home');
  const [recording, setRecording] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [nextAction, setNextAction] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showMeasure, setShowMeasure] = useState<number | null>(null);
  const [measureInput, setMeasureInput] = useState('');
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [finalCheck, setFinalCheck] = useState<any>(null);
  const [apptLoadError, setApptLoadError] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // If we have a route param, auto-load that appointment
    if (routeApptId) {
      loadAppt(routeApptId);
    } else {
      // Fallback: load appointment list for selection
      api.getAppointments({}).then(data => {
        setAppointments(Array.isArray(data) ? data : []);
      }).catch(() => {
        setApptLoadError('Could not load appointments — working offline');
      });
    }
    const onLine = () => { mobile.setOnline(true); }
    const offLine = () => mobile.setOnline(false);
    window.addEventListener('online', onLine);
    window.addEventListener('offline', offLine);
    return () => { window.removeEventListener('online', onLine); window.removeEventListener('offline', offLine); };
  }, [routeApptId]);

  const loadAppt = async (id: string) => {
    setApptLoadError('');
    try {
      const data = await api.getAppointment(id);
      setAppt(data);
      mobile.setActiveAppointment(id);
      // Save a draft copy for offline access
      mobile.saveDraft(`appt_${id}`, data);
    } catch {
      // Fallback to cached draft if offline
      const cached = mobile.getDraft(`appt_${id}`);
      if (cached) {
        setAppt(cached);
        mobile.setActiveAppointment(id);
        setApptLoadError('⚠️ Offline — showing cached data');
      } else {
        setApptLoadError('Could not load appointment and no cached data available');
        return;
      }
    }
    setTab('home');
    try { const qs = await api.post(`/mobile/quality-score/${id}`, {}); setQualityScore(qs); } catch {}
  };

  // ── Recording ──────────────────────────────────────────
  const [processing, setProcessing] = useState(false);
  const [lastParseResult, setLastParseResult] = useState<string>('');
  const [lastSessionId, setLastSessionId] = useState<string>('');

  const parseAndApply = async () => {
    const input = transcript.trim();
    if (!input || !appt) return;
    setProcessing(true);
    setLastParseResult('');
    try {
      // 1. Create voice session
      const session = await api.post('/voice/sessions', { appointmentId: appt.id, userId: user!.id, status: 'recording' });
      setLastSessionId(session.id);
      // 2. Save transcript
      await api.post('/voice/transcripts', { voiceSessionId: session.id, rawText: input, provider: 'web_speech', confidence: 0.85 });
      // 3. Parse into entities
      const result = await api.post('/voice/parse', { voiceSessionId: session.id, text: input });
      const entities = result.entities || [];

      if (entities.length === 0) {
        setLastParseResult('⚠ No fields detected. Try being more specific, e.g. "Window one is a double hung, 35 3/8 by 59 7/8, front bedroom"');
        setProcessing(false);
        return;
      }

      // 4. Accept all entities
      await api.post(`/voice/sessions/${session.id}/accept-all`, {});
      // 5. Apply directly to the order form / appointment openings
      const applied = await api.post(`/voice/apply/${session.id}`, {});

      // 6. Also store in mobile store for local tracking
      const localId = mobile.addRecording({
        localId: '', status: 'applied_to_form', transcript: input, extractions: entities.map((e: any) => ({
          sourceType: 'recording' as const, sourceText: input, targetTable: e.entityType === 'customer' ? 'Customer' : 'Opening',
          targetField: e.fieldName, originalValue: e.fieldValue, normalizedValue: e.fieldValue,
          confidenceScore: e.confidence, requiresReview: false, status: 'approved' as const,
          openingNumber: e.openingNumber,
        })),
        createdAt: Date.now(), appointmentId: appt.id, synced: true
      });

      // Build detailed result message
      const details = applied.details || [];
      const lines = details.map((d: any) => `  #${d.openingNumber}: ${d.action} (${d.fields.join(', ')})`).join('\n');
      setLastParseResult(`✅ Applied ${entities.length} field(s) to the order form.\n${applied.appliedOpenings || 0} opening(s) updated.\n${lines}`);
      // Reload appointment to show updated data
      await loadAppt(appt.id);
      setTranscript('');
    } catch (err: any) {
      setLastParseResult(`❌ Failed to parse: ${err?.message || 'Unknown error'}. Try again.`);
    }
    setProcessing(false);
  };

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech not supported — use Chrome'); return; }
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    let final = '';
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final + interim);
    };
    r.onerror = () => setRecording(false);
    r.onend = () => {
      setRecording(false);
      if (final.trim()) setTranscript(final.trim());
      // Stay on home tab — let user review/edit transcript before parsing
    };
    recognitionRef.current = r; r.start(); setRecording(true); setTranscript(''); setLastParseResult('');
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop(); recognitionRef.current = null; setRecording(false);
  }, []);

  // ── Text Note ──────────────────────────────────────────
  const saveNote = async () => {
    if (!noteText.trim() || !appt) return;
    // LOCAL-FIRST: save immediately so note is never lost even if offline
    const localId = mobile.addNote({
      localId: '', noteText, extractions: [], status: 'pending',
      createdAt: Date.now(), appointmentId: appt.id, synced: false
    });
    // Queue for server sync (drains automatically when online)
    mobile.enqueue({ entityType: 'note', entityId: localId, operation: 'create',
      payload: { userId: user?.id, appointmentId: appt.id, noteText } });
    setNoteText(''); setShowNoteModal(false); setTab('review');
    // Attempt AI extraction — non-blocking, failure does not lose the note
    try {
      await api.post('/mobile/notes', { userId: user?.id, appointmentId: appt.id, noteText });
      const session = await api.post('/voice/sessions', { appointmentId: appt.id, userId: user?.id, status: 'recording' });
      await api.post('/voice/transcripts', { voiceSessionId: session.id, rawText: noteText, provider: 'typed', confidence: 0.9 });
      const result = await api.post('/voice/parse', { voiceSessionId: session.id, text: noteText });
      const exts: FieldExtraction[] = (result.entities || []).map((e: any) => ({
        sourceType: 'note' as const, sourceText: noteText, targetTable: e.entityType === 'customer' ? 'Customer' : 'Opening',
        targetField: e.fieldName, originalValue: e.fieldValue, normalizedValue: e.fieldValue,
        confidenceScore: e.confidence, requiresReview: e.confidence < 0.8, status: 'pending' as const, openingNumber: e.openingNumber,
      }));
      mobile.updateNote(localId, { extractions: exts, status: exts.length > 0 ? 'needs_review' : 'saved_as_note', synced: true });
    } catch (err: any) {
      // Extraction failed — note is safe locally
      mobile.updateNote(localId, { status: 'saved_as_note', lastError: err?.message });
    }
  };

  // ── Apply Extractions ──────────────────────────────────
  const applyExtractions = async (localId: string, exts: FieldExtraction[]) => {
    if (!appt) return;
    const approved = exts.filter(e => e.status === 'approved');
    try {
      const session = await api.post('/voice/sessions', { appointmentId: appt.id, userId: user!.id, status: 'reviewed' });
      for (const e of approved) {
        await api.post('/voice/sessions/' + session.id + '/accept-all', {});
      }
      await api.post('/voice/apply/' + session.id, {});
      mobile.updateRecording(localId, { status: 'applied_to_form' });
      await loadAppt(appt.id);
    } catch {}
  };

  // ── Measurement Keypad ─────────────────────────────────
  const applyMeasurement = async (openingNum: number) => {
    if (!measureInput.trim() || !appt) return;
    const parsed = parseWxH(measureInput);
    if (!parsed.width.valid) return;
    const w = parsed.width.inches;
    const h = parsed.height.valid ? parsed.height.inches : 0;
    const existing = appt.openings?.find((o: any) => o.openingNumber === openingNum);
    if (!existing) return;
    const data: any = { width: w };
    if (h > 0) { data.height = h; data.unitedInches = w + h; }
    // LOCAL-FIRST: save draft, queue sync, update UI optimistically
    mobile.saveDraftOpening(appt.id, openingNum, { ...existing, ...data });
    mobile.enqueue({ entityType: 'measurement', entityId: existing.id, operation: 'update', payload: data });
    setMeasureInput(''); setShowMeasure(null);
    setAppt((prev: any) => ({
      ...prev,
      openings: (prev?.openings || []).map((o: any) => o.openingNumber === openingNum ? { ...o, ...data } : o)
    }));
    // Try immediate server save (non-blocking, already queued as backup)
    try { await api.updateOpening(existing.id, data); } catch { /* queued for retry */ }
  };

  // ── Final Check ────────────────────────────────────────
  const runFinalCheck = async () => {
    if (!appt) return;
    try { const fc = await api.post(`/mobile/final-check/${appt.id}`, {}); setFinalCheck(fc); } catch {}
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const allExtractions = [...mobile.recordings.filter(r => r.appointmentId === appt?.id).flatMap(r => r.extractions.map((e, i) => ({ ...e, _localId: r.localId, _idx: i }))),
    ...mobile.notes.filter(n => n.appointmentId === appt?.id).flatMap(n => n.extractions.map((e, i) => ({ ...e, _localId: n.localId, _idx: i })))];
  const pendingReview = allExtractions.filter(e => e.status === 'pending').length;
  const completionPct = appt ? Math.round((appt.completionPct || 0)) : 0;

  // ── No appointment selected ────────────────────────────
  if (!appt) return (
    <div className="mobile-field">
      <div className="mf-header">
        <button className="mf-back" onClick={() => navigate('/mobile')}>←</button>
        <h2 style={{ flex: 1 }}>📱 Field App</h2>
        <span className={`mf-sync ${mobile.isOnline ? 'online' : 'offline'}`}>{mobile.isOnline ? '🟢' : '🔴'}</span>
      </div>
      <div style={{ padding: '1rem' }}>
        {apptLoadError && <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--warning)' }}>⚠️ {apptLoadError}</div>}
        <h3 style={{ marginBottom: '1rem' }}>Select Appointment</h3>
        {appointments.map((a: any) => (
          <div key={a.id} className="mf-appt-card" onClick={() => loadAppt(a.id)}>
            <div style={{ fontWeight: 700 }}>{a.customer?.firstName} {a.customer?.lastName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.jobAddress || 'No address'} · {a._count?.openings || 0} openings</div>
            <span className={`badge badge-${a.status === 'sold' ? 'sold' : a.status === 'quoted' ? 'quoted' : 'draft'}`}>{a.status}</span>
          </div>
        ))}
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => navigate('/mobile')}>← Back to Today</button>
      </div>
    </div>
  );

  // ── Main Mobile UI ─────────────────────────────────────
  return (
    <div className="mobile-field">
      {/* Header */}
      <div className="mf-header">
        <button className="mf-back" onClick={() => navigate('/mobile')}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{appt.customer?.firstName} {appt.customer?.lastName}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{appt.jobAddress}</div>
        </div>
        <div className="mf-completion">{completionPct}%</div>
        <span className={`mf-sync ${mobile.isOnline ? 'online' : 'offline'}`}
          title={mobile.lastSyncAt ? `Last sync: ${new Date(mobile.lastSyncAt).toLocaleTimeString()}` : 'Never synced'}>
          {mobile.isOnline ? '🟢' : '🔴'}
        </span>
      </div>

      {/* Offline warning banner */}
      {!mobile.isOnline && (
        <div style={{ background: 'rgba(245,158,11,0.15)', borderBottom: '1px solid rgba(245,158,11,0.3)', padding: '0.375rem 1rem', fontSize: '0.75rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📵</span>
          <span>Offline mode — changes are saving locally and will sync when you reconnect.</span>
        </div>
      )}

      {/* Sync queue status */}
      {(sync.pendingCount > 0 || sync.failedCount > 0) && (
        <div style={{ background: sync.failedCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.08)', borderBottom: `1px solid ${sync.failedCount > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.15)'}`, padding: '0.375rem 1rem', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {sync.pendingCount > 0 && <span style={{ color: 'var(--accent)' }}>⏳ {sync.pendingCount} change{sync.pendingCount > 1 ? 's' : ''} syncing…</span>}
          {sync.failedCount > 0 && (
            <><span style={{ color: 'var(--danger)' }}>❌ {sync.failedCount} failed</span>
            <button style={{ marginLeft: 'auto', fontSize: '0.625rem', padding: '2px 6px', border: '1px solid var(--danger)', borderRadius: 4, background: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={sync.retryAll}>Retry All</button></>
          )}
        </div>
      )}

      {/* Appointment load error */}
      {apptLoadError && (
        <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
          {apptLoadError}
        </div>
      )}

      {/* Quality Score Bar */}
      {qualityScore && (
        <div className="mf-score-bar">
          <div className="mf-score-item"><span>Overall</span><strong style={{ color: qualityScore.overallScore >= 75 ? 'var(--success)' : qualityScore.overallScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{qualityScore.overallScore}%</strong></div>
          <div className="mf-score-item"><span>Clarity</span><strong>{qualityScore.installerClarityScore}%</strong></div>
          <div className="mf-score-item"><span>Measure</span><strong>{qualityScore.measurementConfidenceScore}%</strong></div>
          <div className="mf-score-item"><span>Price</span><strong>{qualityScore.pricingConfidenceScore}%</strong></div>
        </div>
      )}

      {/* Tab Content */}
      <div className="mf-content">
        {tab === 'home' && (
          <div className="mf-home">
            <div className="mf-action-grid">
              <button className={`mf-action-btn mf-mic ${recording ? 'recording' : ''}`} onClick={recording ? stopRecording : startRecording}>
                <span style={{ fontSize: '2rem' }}>{recording ? '⏹' : '🎤'}</span>
                <span>{recording ? 'Stop' : 'Record'}</span>
              </button>
              <button className="mf-action-btn" onClick={() => setShowNoteModal(true)}>
                <span style={{ fontSize: '2rem' }}>📝</span><span>Type Notes</span>
              </button>
              <button className="mf-action-btn" onClick={() => setTab('openings')}>
                <span style={{ fontSize: '2rem' }}>🪟</span><span>Openings ({appt.openings?.length || 0})</span>
              </button>
              <button className="mf-action-btn" onClick={() => setShowWizard(true)}>
                <span style={{ fontSize: '2rem' }}>🪄</span><span>Add Opening</span>
              </button>
              <button className="mf-action-btn" onClick={() => setTab('sketch')}>
                <span style={{ fontSize: '2rem' }}>🏠</span><span>Sketch</span>
              </button>
              <button className="mf-action-btn" onClick={() => setTab('pricing')}>
                <span style={{ fontSize: '2rem' }}>💰</span><span>Pricing</span>
              </button>
              <button className="mf-action-btn" onClick={() => { setTab('review'); }}>
                <span style={{ fontSize: '2rem' }}>🔍</span><span>Review{pendingReview > 0 && <span className="mf-badge">{pendingReview}</span>}</span>
              </button>
              <button className="mf-action-btn" onClick={() => setTab('checklist')}>
                <span style={{ fontSize: '2rem' }}>✅</span><span>Checklist</span>
              </button>
              <button className="mf-action-btn" onClick={() => navigate(`/mobile/order/${appt.id}`)}>
                <span style={{ fontSize: '2rem' }}>📄</span><span>Order Form</span>
              </button>
            </div>

            {/* "What do I do next?" button */}
            <button onClick={() => {
              try {
                const result = runAppointmentCoach(appt);
                const top = result.items[0];
                setNextAction(top ? { action: top.message, reason: top.detail || '', priority: top.severity } : { action: 'All clear!', reason: 'No issues found — appointment looks good.', priority: 'info' });
              } catch { setNextAction({ action: 'Review your appointment', reason: 'Check openings and measurements' }); }
            }} style={{
              width: '100%', marginTop: '1rem', padding: '0.875rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))',
              border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
              color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <span>What do I do next?</span>
            </button>
            {nextAction && (
              <div className="card" style={{ marginTop: '0.75rem', padding: '0.875rem', background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.2)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>➡️ {nextAction.action || nextAction.title || 'Review appointment'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{nextAction.reason || nextAction.description || ''}</div>
                {nextAction.priority && <div style={{ fontSize: '0.625rem', color: 'var(--warning)', marginTop: '0.25rem' }}>Priority: {nextAction.priority}</div>}
              </div>
            )}

            {/* Active Recording */}
            {recording && (
              <div className="mf-recording-active">
                <div className="recording-indicator"><span className="recording-dot" /> Recording...</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{transcript || 'Listening...'}</div>
              </div>
            )}

            {/* Processing indicator */}
            {processing && (
              <div className="mf-recording-active" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="loading" style={{ fontSize: '1.25rem' }}>🔍</span>
                  <strong style={{ fontSize: '0.875rem' }}>Extracting fields from your recording...</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>AI is parsing your notes and will show results on the Review tab.</div>
              </div>
            )}

            {/* Transcript ready — edit then apply */}
            {!recording && !processing && transcript && (
              <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>📝 Your Recording</h3>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Edit the text below if needed, then click Apply to populate the order form.</p>
                <textarea className="form-textarea" value={transcript} onChange={e => setTranscript(e.target.value)} rows={4} style={{ fontSize: '0.9375rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="btn btn-primary" onClick={parseAndApply} style={{ flex: 1, padding: '0.75rem', fontSize: '0.9375rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                    🔍 Parse & Apply to Order Form
                  </button>
                  <button className="btn btn-secondary" onClick={() => setTranscript('')}>✕</button>
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  💡 Tip: Say things like "Window one is a double hung, 35 3/8 by 59 7/8, front bedroom, second floor, ladder required"
                </div>
              </div>
            )}

            {/* Parse result feedback */}
            {lastParseResult && (
              <div className="card" style={{ marginTop: '0.75rem', padding: '0.75rem', background: lastParseResult.startsWith('✅') ? 'rgba(34,197,94,0.08)' : lastParseResult.startsWith('❌') ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', borderColor: lastParseResult.startsWith('✅') ? 'rgba(34,197,94,0.3)' : lastParseResult.startsWith('❌') ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)' }}>
                <div style={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>{lastParseResult}</div>
              </div>
            )}

            {/* Final Check Results */}
            {finalCheck && (
              <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{finalCheck.canExport ? '✅ Ready to Export' : '⛔ Cannot Export'}</h3>
                {finalCheck.checks.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.8125rem' }}>
                    <span>{c.passed ? '✅' : c.level === 'critical' ? '🔴' : '🟡'}</span>
                    <span style={{ color: c.passed ? 'var(--text-muted)' : 'var(--text-primary)' }}>{c.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Openings Tab ──────────────────────────────── */}
        {tab === 'openings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Openings ({appt.openings?.length || 0})</h3>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                const num = (appt.openings?.length || 0) + 1;
                await api.createOpening({ appointmentId: appt.id, openingNumber: num });
                await loadAppt(appt.id);
              }}>+ Add</button>
            </div>
            {(appt.openings || []).map((op: any) => (
              <div key={op.id} className="mf-opening-card">
                <div className="mf-opening-header">
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>#{op.openingNumber}</span>
                  <span>{op.roomLocation || 'No room'}</span>
                  <span className="badge badge-draft">{op.productCategory || 'No type'}</span>
                </div>
                <div className="mf-opening-dims">
                  {op.width && op.height ? `${op.width}" × ${op.height}" (${op.unitedInches || (op.width + op.height)} UI)` : <span style={{ color: 'var(--danger)' }}>⚠ No measurements</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setShowMeasure(op.openingNumber); setMeasureInput(''); }}>📏 Measure</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/appointments/${appt.id}`)}>✏️ Edit</button>
                  {!op.roomLocation && <span className="mf-missing-badge">Room?</span>}
                  {!op.elevation && <span className="mf-missing-badge">Side?</span>}
                  {!op.installNotes && <span className="mf-missing-badge">Install notes?</span>}
                </div>
                {/* Inline Measure Keypad */}
                {showMeasure === op.openingNumber && (
                  <div className="mf-keypad" style={{ marginTop: '0.75rem' }}>
                    <input className="form-input" value={measureInput} onChange={e => setMeasureInput(e.target.value)} placeholder="W x H (e.g. 35 3/8 x 59 7/8)" autoFocus />
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                      {FRACTION_BUTTONS.map(f => (
                        <button key={f.value} className="btn btn-sm btn-secondary" onClick={() => setMeasureInput(prev => prev + ' ' + f.value)}>{f.label}</button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => applyMeasurement(op.openingNumber)}>✓ Apply</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowMeasure(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Review Tab ────────────────────────────────── */}
        {tab === 'review' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Review Extracted Fields ({allExtractions.length})</h3>
            {allExtractions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No extractions yet. Record or type notes to extract fields.</p>
            ) : (
              <>
                {allExtractions.map((ext, i) => (
                  <div key={i} className={`mf-extraction ${ext.status}`}>
                    <div className="mf-ext-header">
                      <span className="badge" style={{ background: ext.confidenceScore >= 0.8 ? 'rgba(34,197,94,0.2)' : ext.confidenceScore >= 0.5 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: ext.confidenceScore >= 0.8 ? 'var(--success)' : ext.confidenceScore >= 0.5 ? 'var(--warning)' : 'var(--danger)' }}>
                        {Math.round(ext.confidenceScore * 100)}%
                      </span>
                      <strong>{ext.targetField}</strong>
                      {ext.openingNumber && <span style={{ color: 'var(--accent)' }}>#{ext.openingNumber}</span>}
                      {ext.pricingImpact && <span className="mf-missing-badge">💰 Price</span>}
                    </div>
                    <div style={{ fontSize: '0.8125rem', margin: '0.25rem 0' }}>{ext.normalizedValue}</div>
                    {ext.sourceText && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{ext.sourceText?.slice(0, 80)}"</div>}
                    <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                      {ext.status === 'pending' && <>
                        <button className="btn btn-sm btn-success" onClick={() => mobile.approveExtraction(ext._localId, ext._idx)}>✓ Apply</button>
                        <button className="btn btn-sm btn-danger" onClick={() => mobile.rejectExtraction(ext._localId, ext._idx)}>✕ Ignore</button>
                      </>}
                      {ext.status === 'approved' && <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ Approved</span>}
                      {ext.status === 'rejected' && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>✕ Ignored</span>}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-success" onClick={() => {
                    allExtractions.filter(e => e.status === 'pending' && e.confidenceScore >= 0.8).forEach(e => mobile.approveExtraction(e._localId, e._idx));
                  }}>✓ Approve All Safe</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Sketch Tab ────────────────────────────────── */}
        {tab === 'sketch' && (
          <div>
            <SketchBoard appointmentId={appt.id} openings={appt.openings || []} />
          </div>
        )}

        {/* ── Pricing Tab ────────────────────────────────── */}
        {tab === 'pricing' && (
          <div>
            <PricingReview
              appointment={appt}
              onRecalculate={() => api.recalculate(appt.id).then(() => loadAppt(appt.id))}
              onSave={(updates: any) => api.updateAppointment(appt.id, updates).then(() => loadAppt(appt.id))}
            />
          </div>
        )}

        {/* ── Checklist Tab ──────────────────────────────── */}
        {tab === 'checklist' && (
          <div>
            <MissingInfoCheck appointment={appt} onJumpToStep={(step) => {
              if (step <= 2) setTab('openings');
              else if (step === 3) setTab('sketch');
              else if (step >= 4) setTab('pricing');
              else setTab('home');
            }} />
          </div>
        )}
      </div>

      {/* ── Note Modal ──────────────────────────────────── */}
      {showNoteModal && (
        <div className="mf-modal-overlay" onClick={e => e.target === e.currentTarget && setShowNoteModal(false)}>
          <div className="mf-modal">
            <h3>📝 Type Notes</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>Type measurements, opening details, customer info. AI will extract fields.</p>
            <textarea className="form-textarea" value={noteText} onChange={e => setNoteText(e.target.value)} rows={6} placeholder="e.g. Window one is a double hung, 35 3/8 by 59 7/8, front bedroom, second floor, ladder required, remove aluminum, tempered glass" autoFocus />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={saveNote} disabled={!noteText.trim()}>🔍 Save & Extract</button>
              <button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Opening Wizard Modal ─────────────────────────── */}
      {showWizard && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg-primary)', zIndex: 300,
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        }}>
          <OpeningWizard
            initialData={{}}
            appointmentId={appt.id}
            allOpenings={appt.openings || []}
            onSave={async (data: any) => {
              await api.createOpening({ ...data, appointmentId: appt.id });
              await loadAppt(appt.id);
              setShowWizard(false);
              setTab('openings');
            }}
            onCancel={() => setShowWizard(false)}
          />
        </div>
      )}

      {/* ── Bottom Nav ──────────────────────────────────── */}
      <nav className="mf-bottom-nav">
        {([['home', '🏠', 'Home'], ['openings', '🪟', 'Open'], ['pricing', '💰', 'Price'], ['checklist', '✅', 'Check'], ['review', '🔍', 'AI']] as [MobileTab, string, string][]).map(([t, icon, label]) => (
          <button key={t} className={`mf-nav-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            <span>{icon}</span><span>{label}</span>
            {t === 'review' && pendingReview > 0 && <span className="mf-nav-badge">{pendingReview}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
