import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaperOrderForm, PaperOrderFormHandle, OrderFormData, OpeningRow, emptyFormData } from '../components/PaperOrderForm';
import { api } from '../utils/api';

// ═══════════════════════════════════════════════════════════════
// MOBILE ORDER FORM — Field-friendly editing with form fidelity
// ═══════════════════════════════════════════════════════════════

type MobileTab = 'customer' | 'openings' | 'sketch' | 'notes' | 'preview';

export function MobileOrderFormPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const formRef = useRef<PaperOrderFormHandle>(null);

  const [tab, setTab] = useState<MobileTab>('customer');
  const [formData, setFormData] = useState<OrderFormData>(emptyFormData());
  const [loading, setLoading] = useState(true);
  const [editingOpening, setEditingOpening] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  useEffect(() => {
    if (!appointmentId) { setLoading(false); return; }
    loadData();
  }, [appointmentId]);

  const loadData = async () => {
    try {
      const result = await api.post(`/forms/auto-fill/order-form/${appointmentId}`, {});
      const fd = result.formData;
      setFormData({
        poNumber: fd.poNumber || '',
        accountNumber: fd.accountNumber || '',
        orderDate: fd.orderDate || '',
        customerName: fd.customerName || '',
        phone: fd.phone || '',
        phone2: fd.phone2 || '',
        address: fd.address || '',
        city: fd.city || '',
        state: fd.state || '',
        zip: fd.zip || '',
        estimator: fd.estimator || '',
        estimatorPhone: fd.estimatorPhone || '',
        notes: fd.sketchNotes || '',
        sketchDataUrl: '',
        pageNumber: 1,
        totalPages: fd.totalPages || 1,
        openings: mapOpenings(fd.openings || []),
      });
    } catch {}
    setLoading(false);
  };

  const mapOpenings = (arr: any[]): OpeningRow[] => {
    const rows = arr.map((o: any) => ({
      qty: o.qty || 1, model: o.model || '', vinylColor: o.vinylColor || '',
      intColor: o.interiorColor || '', extColor: o.exteriorColor || '',
      width: o.width ? String(o.width) : '', height: o.height ? String(o.height) : '',
      legHeight: o.legHeight ? String(o.legHeight) : '', customRadius: o.customRadius ? String(o.customRadius) : '',
      windowNumber: o.windowNumber ? String(o.windowNumber) : String(o.openingNumber || ''),
      hinge: o.hinge || '', glassOption: o.glassOption || '', foamEnhanced: !!o.foamEnhanced,
      gridStyle: o.gridStyle || '', gridPattern: o.gridPattern || '', gridFull: !!o.gridFull, gridSpec: !!o.gridSpec,
      typeFill: !!o.typeFill, typeHalf: !!o.typeHalf, typeMine: !!o.typeMine,
      tempFull: !!o.tempFull, tempS: !!o.tempS, tempU: !!o.tempU,
      nailFin: !!o.nailFin, fullScreen: !!o.fullScreen, oriel: !!o.oriel, hor: !!o.horizontalRR,
      typeExt: o.exteriorType || '', typeInt: o.trimType || '', rmvInst: o.removeInstallType || '', sill: !!o.sillRepair,
      gridOptions: o.gridStyle || '', obsc: '', temp: '', floor: o.floorNumber ? String(o.floorNumber) : '',
    }));
    const empty: OpeningRow = { qty: 0, model: '', vinylColor: '', intColor: '', extColor: '', width: '', height: '', legHeight: '', customRadius: '', windowNumber: '', hinge: '', glassOption: '', foamEnhanced: false, gridStyle: '', gridPattern: '', gridFull: false, gridSpec: false, typeFill: false, typeHalf: false, typeMine: false, tempFull: false, tempS: false, tempU: false, nailFin: false, fullScreen: false, oriel: false, hor: false, typeExt: '', typeInt: '', rmvInst: '', sill: false, gridOptions: '', obsc: '', temp: '', floor: '' };
    while (rows.length < 20) rows.push({ ...empty });
    return rows.slice(0, 20);
  };

  const updateField = (field: keyof OrderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateOpening = (idx: number, field: keyof OpeningRow, value: any) => {
    setFormData(prev => {
      const openings = [...prev.openings];
      openings[idx] = { ...openings[idx], [field]: value };
      return { ...prev, openings };
    });
  };

  const filledCount = formData.openings.filter(o => o.qty > 0 || o.model).length;

  // Voice-to-field (Web Speech API)
  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Voice not supported in this browser'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    setIsRecording(true);
    setVoiceText('');
    recognition.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setVoiceText(text);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  if (loading) {
    return (
      <div className="mobile-field">
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>⏳ Loading form...</div>
      </div>
    );
  }

  return (
    <div className="mobile-field">
      {/* Header */}
      <div className="mf-header">
        <button className="mf-back" onClick={() => navigate(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>📋 Order Form</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {formData.customerName || 'New Form'} · {filledCount} openings
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={async () => {
          try {
            await api.post('/forms', { appointmentId, formType: 'order_form', formData: JSON.stringify(formData), status: 'filled' });
            alert('Saved!');
          } catch { alert('Save failed'); }
        }}>💾</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflow: 'auto' }}>
        {([
          { id: 'customer' as MobileTab, icon: '👤', label: 'Customer' },
          { id: 'openings' as MobileTab, icon: '🪟', label: `Openings (${filledCount})` },
          { id: 'sketch' as MobileTab, icon: '🏠', label: 'Sketch' },
          { id: 'notes' as MobileTab, icon: '📝', label: 'Notes' },
          { id: 'preview' as MobileTab, icon: '🖨️', label: 'Preview' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '0.625rem 0.5rem', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.6875rem', whiteSpace: 'nowrap',
            background: tab === t.id ? 'rgba(59,130,246,0.1)' : 'transparent',
            color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="mf-content">
        {/* ═══ CUSTOMER TAB ═══ */}
        {tab === 'customer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Voice button */}
            <button onClick={startVoice} style={{
              padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: isRecording ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.05)',
              cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)',
              fontSize: '1rem', fontWeight: 600,
            }}>
              {isRecording ? '🔴 Listening...' : '🎤 Voice-to-Field'}
            </button>
            {voiceText && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(139,92,246,0.08)', borderRadius: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Heard: "{voiceText}"
              </div>
            )}

            {[
              { label: 'PO #', field: 'poNumber' as keyof OrderFormData },
              { label: 'Account #', field: 'accountNumber' as keyof OrderFormData },
              { label: 'Order Date', field: 'orderDate' as keyof OrderFormData },
              { label: 'Customer Name', field: 'customerName' as keyof OrderFormData },
              { label: 'Phone', field: 'phone' as keyof OrderFormData },
              { label: 'Phone 2', field: 'phone2' as keyof OrderFormData },
              { label: 'Address', field: 'address' as keyof OrderFormData },
              { label: 'City', field: 'city' as keyof OrderFormData },
              { label: 'State', field: 'state' as keyof OrderFormData },
              { label: 'Zip', field: 'zip' as keyof OrderFormData },
              { label: 'Estimator', field: 'estimator' as keyof OrderFormData },
            ].map(f => (
              <div key={f.field} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{f.label}</label>
                <input className="form-input" value={(formData[f.field] as string) || ''}
                  onChange={e => updateField(f.field, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {/* ═══ OPENINGS TAB ═══ */}
        {tab === 'openings' && (
          <div>
            {/* Quick add */}
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.75rem' }}
              onClick={() => {
                const firstEmpty = formData.openings.findIndex(o => !o.model && !o.qty);
                if (firstEmpty >= 0) setEditingOpening(firstEmpty);
              }}>
              + Add Opening
            </button>

            {/* Opening cards */}
            {formData.openings.map((o, i) => {
              if (!o.model && !o.qty && editingOpening !== i) return null;
              const isEditing = editingOpening === i;
              return (
                <div key={i} className="mf-opening-card" onClick={() => !isEditing && setEditingOpening(i)}>
                  <div className="mf-opening-header">
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent)' }}>#{i + 1}</span>
                    <span style={{ fontWeight: 600 }}>{o.model || 'Untitled'}</span>
                    {o.width && o.height && <span style={{ color: 'var(--text-muted)' }}>{o.width}" × {o.height}"</span>}
                  </div>

                  {isEditing && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div><label className="form-label">QTY</label><input className="form-input" type="number" value={o.qty || ''} onChange={e => updateOpening(i, 'qty', +e.target.value)} /></div>
                        <div><label className="form-label">Model</label><input className="form-input" value={o.model} onChange={e => updateOpening(i, 'model', e.target.value)} /></div>
                        <div><label className="form-label">Width</label><input className="form-input" value={o.width} onChange={e => updateOpening(i, 'width', e.target.value)} /></div>
                        <div><label className="form-label">Height</label><input className="form-input" value={o.height} onChange={e => updateOpening(i, 'height', e.target.value)} /></div>
                        <div><label className="form-label">Vinyl Color</label><input className="form-input" value={o.vinylColor} onChange={e => updateOpening(i, 'vinylColor', e.target.value)} /></div>
                        <div><label className="form-label">Int Color</label><input className="form-input" value={o.intColor} onChange={e => updateOpening(i, 'intColor', e.target.value)} /></div>
                        <div><label className="form-label">Ext Color</label><input className="form-input" value={o.extColor} onChange={e => updateOpening(i, 'extColor', e.target.value)} /></div>
                        <div><label className="form-label">Glass Option</label><input className="form-input" value={o.glassOption} onChange={e => updateOpening(i, 'glassOption', e.target.value)} /></div>
                        <div><label className="form-label">Grid Options</label><input className="form-input" value={o.gridOptions} onChange={e => updateOpening(i, 'gridOptions', e.target.value)} /></div>
                        <div><label className="form-label">Floor #</label><input className="form-input" value={o.floor} onChange={e => updateOpening(i, 'floor', e.target.value)} /></div>
                        <div><label className="form-label">Window #</label><input className="form-input" value={o.windowNumber} onChange={e => updateOpening(i, 'windowNumber', e.target.value)} /></div>
                        <div><label className="form-label">Hinge</label><input className="form-input" value={o.hinge} onChange={e => updateOpening(i, 'hinge', e.target.value)} /></div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
                        {[
                          { key: 'foamEnhanced' as keyof OpeningRow, label: 'Foam Enhanced' },
                          { key: 'nailFin' as keyof OpeningRow, label: 'Nail Fin' },
                          { key: 'fullScreen' as keyof OpeningRow, label: 'Full Screen' },
                          { key: 'oriel' as keyof OpeningRow, label: 'Oriel' },
                          { key: 'hor' as keyof OpeningRow, label: 'HOR R&R' },
                          { key: 'sill' as keyof OpeningRow, label: 'Sill Repair' },
                          { key: 'gridFull' as keyof OpeningRow, label: 'Grid Full' },
                          { key: 'gridSpec' as keyof OpeningRow, label: 'Grid Spec' },
                          { key: 'typeFill' as keyof OpeningRow, label: 'Type Fill' },
                          { key: 'typeHalf' as keyof OpeningRow, label: 'Type Half' },
                          { key: 'tempFull' as keyof OpeningRow, label: 'Temp Full' },
                        ].map(cb => (
                          <label key={cb.key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                            <input type="checkbox" checked={!!o[cb.key]} onChange={e => updateOpening(i, cb.key, e.target.checked)}
                              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                            {cb.label}
                          </label>
                        ))}
                      </div>
                      <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={e => { e.stopPropagation(); setEditingOpening(null); }}>
                        Done
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ SKETCH TAB ═══ */}
        {tab === 'sketch' && (
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Draw the house layout. Mark window positions.
            </p>
            <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '2px solid var(--border)' }}>
              <canvas
                width={600}
                height={360}
                style={{ width: '100%', display: 'block', touchAction: 'none' }}
              />
            </div>
          </div>
        )}

        {/* ═══ NOTES TAB ═══ */}
        {tab === 'notes' && (
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" style={{ minHeight: 200 }}
              value={formData.notes}
              onChange={e => updateField('notes', e.target.value)}
            />
          </div>
        )}

        {/* ═══ PREVIEW TAB ═══ */}
        {tab === 'preview' && (
          <div className="paper-form-wrapper" style={{ padding: 0 }}>
            <PaperOrderForm
              ref={formRef}
              initialData={formData}
              editable={false}
            />
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="mf-bottom-nav">
        {([
          { id: 'customer' as MobileTab, icon: '👤', label: 'Customer' },
          { id: 'openings' as MobileTab, icon: '🪟', label: 'Openings' },
          { id: 'sketch' as MobileTab, icon: '🏠', label: 'Sketch' },
          { id: 'notes' as MobileTab, icon: '📝', label: 'Notes' },
          { id: 'preview' as MobileTab, icon: '🖨️', label: 'Preview' },
        ]).map(t => (
          <button key={t.id} className={`mf-nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
