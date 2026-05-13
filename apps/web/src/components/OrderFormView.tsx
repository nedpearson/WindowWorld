import { useState, useEffect } from 'react';
import { api } from '../utils/api';

// Source tag styles — display only, not in PDF
const SOURCE_TAGS: Record<string, { icon: string; label: string; bg: string; color: string }> = {
  voice: { icon: '🎤', label: 'Voice', bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
  typed: { icon: '📝', label: 'Typed', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  manual: { icon: '✏️', label: 'Manual', bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  template: { icon: '📋', label: 'Template', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
};

function SourceTag({ source }: { source: string }) {
  const tag = SOURCE_TAGS[source] || SOURCE_TAGS.manual;
  return (
    <span style={{ fontSize: '0.5625rem', padding: '1px 5px', borderRadius: 4, background: tag.bg, color: tag.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {tag.icon} {tag.label}
    </span>
  );
}

export function OrderFormView({ appointmentId }: { appointmentId: string }) {
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openingSources, setOpeningSources] = useState<Record<number, string>>({});

  const autoFill = async () => {
    setLoading(true);
    try {
      const result = await api.post(`/forms/auto-fill/order-form/${appointmentId}`, {});
      setFormData(result.formData);
    } catch (err) {
      console.error('Auto-fill failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load voice session data to determine which openings came from voice
  const loadSources = async () => {
    try {
      const sessions = await api.get(`/voice/sessions/appointment/${appointmentId}`);
      const sources: Record<number, string> = {};
      for (const sess of (sessions || [])) {
        if (sess.status === 'applied' || sess.status === 'parsed' || sess.status === 'reviewed') {
          for (const e of (sess.entities || [])) {
            if (e.openingNumber) {
              // Check transcript provider
              const provider = sess.transcripts?.[0]?.provider || 'web_speech';
              sources[e.openingNumber] = provider === 'typed' ? 'typed' : 'voice';
            }
          }
        }
      }
      setOpeningSources(sources);
    } catch {}
  };

  useEffect(() => { autoFill(); loadSources(); }, [appointmentId]);

  const upd = (field: string, value: any) => setFormData({ ...formData, [field]: value });

  const generatePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('l', 'mm', 'letter'); // landscape
    let y = 15;
    const lm = 10;

    doc.setFontSize(16);
    doc.text('WINDOW AND PATIO DOOR ORDER FORM', 140, y, { align: 'center' });
    y += 10;

    // Header
    doc.setFontSize(9);
    doc.text(`PO#: ${formData.poNumber}    Account#: ${formData.accountNumber}    Date: ${formData.orderDate}`, lm, y); y += 5;
    doc.text(`Customer: ${formData.customerName}    Phone: ${formData.phone}    Phone2: ${formData.phone2 || ''}`, lm, y); y += 5;
    doc.text(`Address: ${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`, lm, y); y += 5;
    doc.text(`Estimator: ${formData.estimator}`, lm, y); y += 8;

    // Column headers
    doc.setFontSize(6);
    const cols = ['#', 'Qty', 'Model', 'Color', 'Int', 'Ext', 'Width', 'Height', 'UI', 'Leg', 'Grid', 'Glass', 'Foam', 'Temp', 'Obsc', 'Screen', 'Fin', 'Oriel', 'H R&R', 'Floor', 'Trim', 'Rmv/Inst', 'Sill', 'Elev', 'Room', 'Notes'];
    const colX = [lm, lm+8, lm+16, lm+32, lm+46, lm+56, lm+66, lm+78, lm+90, lm+100, lm+110, lm+122, lm+136, lm+146, lm+156, lm+166, lm+178, lm+186, lm+194, lm+204, lm+214, lm+224, lm+240, lm+250, lm+258, lm+266];
    
    cols.forEach((c, i) => doc.text(c, colX[i], y));
    y += 1;
    doc.line(lm, y, 275, y);
    y += 3;

    // Opening rows — NO source tags in PDF
    doc.setFontSize(6.5);
    for (const o of (formData.openings || [])) {
      if (y > 195) { doc.addPage(); y = 15; }
      const vals = [
        String(o.openingNumber), String(o.qty || 1), o.model || '', o.vinylColor || '', o.interiorColor || '', o.exteriorColor || '',
        String(o.width || ''), String(o.height || ''), String(o.unitedInches || ''), String(o.legHeight || ''),
        o.gridStyle || '', o.glassOption || '', o.foamEnhanced ? '✓' : '', o.tempered || '', o.obscure || '',
        o.fullScreen ? 'Full' : '', o.nailFin ? '✓' : '', o.oriel ? '✓' : '', o.horizontalRR ? '✓' : '',
        String(o.floorNumber || ''), o.trimType || '', o.removeInstallType || '', o.sillRepair ? '✓' : '',
        o.elevation || '', o.roomLocation || '', (o.notes || '').slice(0, 20)
      ];
      vals.forEach((v, i) => doc.text(v, colX[i], y));
      y += 4;
    }

    // Sketch area placeholder
    y += 5;
    doc.setFontSize(8);
    doc.text('SKETCH / LAYOUT:', lm, y);
    y += 3;
    doc.rect(lm, y, 120, 50);
    doc.text('(See attached sketch page)', lm + 5, y + 25);

    // Sketch markers
    if (formData.sketchMarkers?.length > 0) {
      let my = y + 5;
      doc.setFontSize(6);
      for (const m of formData.sketchMarkers) {
        if (my > y + 45) break;
        doc.text(`#${m.openingNumber} - ${m.elevation} ${m.label || ''} ${m.roomName || ''}`, lm + 5, my);
        my += 3;
      }
    }

    doc.save(`OrderForm_${formData.customerName.replace(/ /g, '_')}.pdf`);
  };

  if (!formData) return <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>{loading ? '⏳ Auto-filling order form...' : 'Click to auto-fill order form'}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>📋 Window & Patio Door Order Form</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Source legend — display only */}
          <div style={{ display: 'flex', gap: '0.375rem', marginRight: '0.5rem' }}>
            <SourceTag source="voice" />
            <SourceTag source="typed" />
            <SourceTag source="manual" />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={autoFill}>🔄 Refresh</button>
          <button className="btn btn-primary" onClick={generatePDF}>📄 Export PDF</button>
        </div>
      </div>

      {/* Header fields */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">PO #</label><input className="form-input" value={formData.poNumber} onChange={e => upd('poNumber', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Account #</label><input className="form-input" value={formData.accountNumber} onChange={e => upd('accountNumber', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Order Date</label><input className="form-input" type="date" value={formData.orderDate} onChange={e => upd('orderDate', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Customer</label><input className="form-input" value={formData.customerName} onChange={e => upd('customerName', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={formData.phone} onChange={e => upd('phone', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estimator</label><input className="form-input" value={formData.estimator} readOnly style={{ background: 'var(--bg-card)' }} /></div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}><label className="form-label">Address</label><input className="form-input" value={formData.address} onChange={e => upd('address', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">City</label><input className="form-input" value={formData.city} onChange={e => upd('city', e.target.value)} /></div>
          <div className="form-group" style={{ width: 60 }}><label className="form-label">ST</label><input className="form-input" value={formData.state} onChange={e => upd('state', e.target.value)} /></div>
          <div className="form-group" style={{ width: 80 }}><label className="form-label">Zip</label><input className="form-input" value={formData.zip} onChange={e => upd('zip', e.target.value)} /></div>
        </div>
      </div>

      {/* Openings table with source indicators */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Opening Schedule ({formData.openings?.length || 0} openings)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th>#</th><th>Src</th><th>Qty</th><th>Model</th><th>Int</th><th>Ext</th><th>W</th><th>H</th><th>UI</th>
                <th>Grid</th><th>Glass</th><th>Foam</th><th>Temp</th><th>Screen</th><th>Elev</th><th>Room</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(formData.openings || []).map((o: any, i: number) => {
                const source = openingSources[o.openingNumber] || 'manual';
                return (
                  <tr key={i}>
                    <td><strong>{o.openingNumber}</strong></td>
                    <td><SourceTag source={source} /></td>
                    <td>{o.qty}</td>
                    <td>{o.model}</td>
                    <td>{o.interiorColor}</td>
                    <td>{o.exteriorColor}</td>
                    <td>{o.width}"</td>
                    <td>{o.height}"</td>
                    <td><strong>{o.unitedInches}"</strong></td>
                    <td>{o.gridStyle}</td>
                    <td>{o.glassOption}</td>
                    <td>{o.foamEnhanced ? '✓' : ''}</td>
                    <td>{o.tempered}</td>
                    <td>{o.fullScreen ? 'Full' : ''}</td>
                    <td>{o.elevation}</td>
                    <td>{o.roomLocation}</td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sketch markers */}
      {formData.sketchMarkers?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>Sketch Markers</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {formData.sketchMarkers.map((m: any, i: number) => (
              <span key={i} className="badge badge-progress">#{m.openingNumber} — {m.elevation} {m.label || ''}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
