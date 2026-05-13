import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store';
import { FRACTION_BUTTONS } from '../utils/measurementParser';

interface Room { id: string; roomName: string; roomType: string; sortOrder: number; status: string; completionPct: number; openingCount: number; notes: string | null; openings: any[] | null; }

export function WalkthroughPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [appt, setAppt] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<number>(0);
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [newProduct, setNewProduct] = useState('double_hung');
  const [newNotes, setNewNotes] = useState('');
  const [chatQ, setChatQ] = useState('');
  const [chatA, setChatA] = useState('');
  const [chatActions, setChatActions] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [riskScore, setRiskScore] = useState<any>(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!appointmentId) return;
    api.getAppointment(appointmentId).then(setAppt);
    loadWalkthrough();
    api.get('/walkthrough/templates').then(setTemplates).catch(() => {});
  }, [appointmentId]);

  const loadWalkthrough = async () => {
    const data = await api.get(`/walkthrough/appointment/${appointmentId}`);
    if (data) { setSession(data.session); setRooms(data.rooms || []); }
  };

  const startWalkthrough = async () => {
    const data = await api.post('/walkthrough/start', { appointmentId, userId: user!.id });
    setSession(data.session); setRooms(data.rooms); setActiveRoom(0);
  };

  const completeRoom = async (roomId: string) => {
    await api.put(`/walkthrough/rooms/${roomId}`, { status: 'completed', completionPct: 100 });
    await loadWalkthrough();
    if (activeRoom < rooms.length - 1) setActiveRoom(activeRoom + 1);
  };

  const skipRoom = async (roomId: string) => {
    await api.put(`/walkthrough/rooms/${roomId}`, { status: 'skipped', completionPct: 0 });
    await loadWalkthrough();
    if (activeRoom < rooms.length - 1) setActiveRoom(activeRoom + 1);
  };

  const addOpening = async () => {
    if (!rooms[activeRoom]) return;
    const room = rooms[activeRoom];
    const num = (appt?.openings?.length || 0) + 1;
    const data: any = { appointmentId, openingNumber: num, productCategory: newProduct, roomLocation: room.roomName };
    if (newWidth) data.width = parseFloat(newWidth);
    if (newHeight) data.height = parseFloat(newHeight);
    if (newWidth && newHeight) data.unitedInches = parseFloat(newWidth) + parseFloat(newHeight);
    if (newNotes) data.installNotes = newNotes;
    if (room.roomType === 'upstairs') { data.floorNumber = 2; }

    const opening = await api.createOpening(data);
    await api.post(`/walkthrough/rooms/${room.id}/openings`, {
      openingId: opening.id, openingNumber: num, productType: newProduct,
      width: data.width, height: data.height, notes: newNotes
    });
    setNewWidth(''); setNewHeight(''); setNewNotes(''); setShowAddOpening(false);
    const freshAppt = await api.getAppointment(appointmentId!);
    setAppt(freshAppt);
    await loadWalkthrough();
  };

  const addRoomNote = async (noteText: string) => {
    if (!rooms[activeRoom] || !noteText.trim()) return;
    await api.post(`/walkthrough/rooms/${rooms[activeRoom].id}/notes`, { noteType: 'text', noteText });
    await loadWalkthrough();
  };

  const applyTemplate = async (templateId: string) => {
    if (!appt?.openings?.length) return;
    const ids = appt.openings.map((o: any) => o.id);
    await api.post(`/walkthrough/templates/${templateId}/apply`, { openingIds: ids, appointmentId, userId: user!.id });
    const freshAppt = await api.getAppointment(appointmentId!);
    setAppt(freshAppt);
    setShowTemplates(false);
  };

  const askAI = async () => {
    if (!chatQ.trim()) return;
    const r = await api.post('/walkthrough/ai-chat', { appointmentId, userId: user!.id, question: chatQ });
    setChatA(r.answer); setChatActions(r.actions || []); setChatQ('');
  };

  const computeRisk = async () => {
    const r = await api.post(`/walkthrough/callback-risk/${appointmentId}`, {});
    setRiskScore(r);
  };

  // Voice recording
  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    let final = '';
    r.onresult = (e: any) => { let i = ''; for (let x = e.resultIndex; x < e.results.length; x++) { if (e.results[x].isFinal) final += e.results[x][0].transcript + ' '; else i += e.results[x][0].transcript; } setTranscript(final + i); };
    r.onend = () => { setRecording(false); if (final.trim()) { setTranscript(final.trim()); addRoomNote(final.trim()); } };
    r.onerror = () => setRecording(false);
    recognitionRef.current = r; r.start(); setRecording(true); setTranscript('');
  }, [activeRoom, rooms]);

  const stopVoice = useCallback(() => { recognitionRef.current?.stop(); setRecording(false); }, []);

  const room = rooms[activeRoom];
  const completedCount = rooms.filter(r => r.status === 'completed').length;
  const totalPct = rooms.length > 0 ? Math.round((completedCount / rooms.length) * 100) : 0;

  // No session yet
  if (!session) return (
    <div className="fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem' }}>🏠 Room-by-Room Walkthrough</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Walk through the home room by room. Never forget a window.</p>
      <button className="btn btn-primary btn-lg" onClick={startWalkthrough} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '1rem 2rem', fontSize: '1.125rem' }}>
        🚀 Start Walkthrough
      </button>
      <button className="btn btn-secondary" onClick={() => navigate(`/appointments/${appointmentId}`)} style={{ marginLeft: '1rem' }}>← Back to Appointment</button>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem' }}>🏠 Walkthrough — {appt?.customer?.firstName} {appt?.customer?.lastName}</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt?.jobAddress}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontWeight: 800, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8125rem' }}>{totalPct}%</div>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowChat(!showChat)}>🤖 AI</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowTemplates(!showTemplates)}>📋 Templates</button>
          <button className="btn btn-sm btn-secondary" onClick={computeRisk}>📊 Risk</button>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/appointments/${appointmentId}`)}>← Back</button>
        </div>
      </div>

      {/* Risk Score */}
      {riskScore && (
        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <span>Overall: <strong style={{ color: riskScore.riskLevel === 'PASS' ? 'var(--success)' : riskScore.riskLevel === 'REVIEW' ? 'var(--warning)' : 'var(--danger)' }}>{riskScore.overallRisk}% {riskScore.riskLevel}</strong></span>
            <span>Meas: {riskScore.measurementRisk}%</span><span>Sketch: {riskScore.sketchRisk}%</span>
            <span>Price: {riskScore.pricingRisk}%</span><span>Notes: {riskScore.notesRisk}%</span><span>Sigs: {riskScore.signatureRisk}%</span>
          </div>
          {riskScore.blockers.length > 0 && <div style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.75rem' }}>Blockers: {riskScore.blockers.join(', ')}</div>}
        </div>
      )}

      {/* Room Tabs */}
      <div className="stepper" style={{ marginBottom: '1rem' }}>
        {rooms.map((r, i) => (
          <button key={r.id} className={`stepper-step ${i === activeRoom ? 'active' : ''} ${r.status === 'completed' ? 'completed' : ''}`} onClick={() => setActiveRoom(i)}>
            <span className="stepper-num">{r.status === 'completed' ? '✓' : i + 1}</span>
            {r.roomName}
            {(r.openings?.length || 0) > 0 && <span style={{ fontSize: '0.625rem', color: 'var(--accent)' }}>({r.openings?.length})</span>}
          </button>
        ))}
      </div>

      {/* Active Room */}
      {room && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>{room.roomName}</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-sm btn-primary" onClick={() => setShowAddOpening(true)}>+ Add Opening</button>
              <button className={`btn btn-sm ${recording ? 'btn-danger' : 'btn-secondary'}`} onClick={recording ? stopVoice : startVoice}>
                {recording ? '⏹ Stop' : '🎤 Voice'}
              </button>
            </div>
          </div>

          {/* Room Openings */}
          {(room.openings || []).map((op: any) => (
            <div key={op.id} style={{ padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
              <strong>#{op.openingNumber}</strong> {op.productType || '—'} · {op.width && op.height ? `${op.width}" × ${op.height}"` : <span style={{ color: 'var(--danger)' }}>No dims</span>}
              {op.notes && <span style={{ color: 'var(--text-muted)' }}> · {op.notes}</span>}
            </div>
          ))}
          {(room.openings || []).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No openings in this room yet.</p>}

          {/* Room Notes */}
          {(room.notes as any)?.map?.((n: any, i: number) => (
            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>📝 {n.noteText}</div>
          ))}

          {/* Voice Transcript */}
          {recording && <div className="recording-indicator" style={{ marginTop: '0.5rem' }}><span className="recording-dot" /> {transcript || 'Listening...'}</div>}

          {/* Room Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-success btn-sm" onClick={() => completeRoom(room.id)}>✓ Room Complete</button>
            <button className="btn btn-secondary btn-sm" onClick={() => skipRoom(room.id)}>Skip Room</button>
            {activeRoom > 0 && <button className="btn btn-secondary btn-sm" onClick={() => setActiveRoom(activeRoom - 1)}>← Prev</button>}
            {activeRoom < rooms.length - 1 && <button className="btn btn-secondary btn-sm" onClick={() => setActiveRoom(activeRoom + 1)}>Next →</button>}
          </div>
        </div>
      )}

      {/* Add Opening Modal */}
      {showAddOpening && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={e => e.target === e.currentTarget && setShowAddOpening(false)}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 440, padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Add Opening — {room?.roomName}</h3>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Width</label><input className="form-input" value={newWidth} onChange={e => setNewWidth(e.target.value)} placeholder="35 3/8" /></div>
              <div className="form-group"><label className="form-label">Height</label><input className="form-input" value={newHeight} onChange={e => setNewHeight(e.target.value)} placeholder="59 7/8" /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {FRACTION_BUTTONS.map(f => <button key={f.value} className="btn btn-sm btn-secondary" onClick={() => { const target = !newWidth ? setNewWidth : setNewHeight; target(prev => prev + ' ' + f.value); }}>{f.label}</button>)}
            </div>
            <div className="form-group">
              <label className="form-label">Product</label>
              <select className="form-select" value={newProduct} onChange={e => setNewProduct(e.target.value)}>
                <option value="double_hung">Double Hung</option><option value="picture">Picture</option><option value="slider">Slider</option>
                <option value="casement">Casement</option><option value="awning">Awning</option><option value="patio_door">Patio Door</option>
                <option value="circle_top">Circle Top</option><option value="eyebrow">Eyebrow</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Install Notes</label><input className="form-input" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Ladder, brick, sill repair..." /></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={addOpening}>Add Opening</button>
              <button className="btn btn-secondary" onClick={() => setShowAddOpening(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat */}
      {showChat && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>🤖 AI Rep Assistant</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input className="form-input" value={chatQ} onChange={e => setChatQ(e.target.value)} placeholder="Did I forget anything?" onKeyDown={e => e.key === 'Enter' && askAI()} />
            <button className="btn btn-primary btn-sm" onClick={askAI}>Ask</button>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {['Did I forget anything?', 'Which openings are incomplete?', 'Why is pricing flagged?', 'What signatures are missing?'].map(q => (
              <button key={q} className="btn btn-sm btn-secondary" onClick={() => { setChatQ(q); }}>{q}</button>
            ))}
          </div>
          {chatA && <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>{chatA}</div>}
          {chatActions.length > 0 && (
            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {chatActions.map((a, i) => <button key={i} className="btn btn-sm btn-primary">{a.label}</button>)}
            </div>
          )}
        </div>
      )}

      {/* Templates */}
      {showTemplates && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>📋 Opening Templates</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Apply a template to ALL openings in this appointment.</p>
          <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {templates.map((t: any) => (
              <div key={t.id} className="card" style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => applyTemplate(t.id)}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{t.description}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Used {t.usageCount}x</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session complete button */}
      {completedCount === rooms.length && rooms.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button className="btn btn-lg btn-success" onClick={async () => {
            await api.post(`/walkthrough/complete/${session.id}`, {});
            navigate(`/appointments/${appointmentId}`);
          }} style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }}>
            ✅ Walkthrough Complete — Back to Appointment
          </button>
        </div>
      )}
    </div>
  );
}
