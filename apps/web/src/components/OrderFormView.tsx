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
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'pt', 'letter'); // PORTRAIT
      const pw = 612, m = 28;
      let y = m;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('WINDOW AND PATIO DOOR ORDER FORM', pw / 2, y + 14, { align: 'center' });
      y += 28;

      // Customer info block
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const s = (v: any) => v ?? '';
      doc.text(`PO#: ${s(formData.poNumber)}     Account#: ${s(formData.accountNumber)}     Date: ${s(formData.orderDate)}`, m, y); y += 13;
      doc.text(`Customer: ${s(formData.customerName)}     Phone: ${s(formData.phone)}     Phone2: ${s(formData.phone2)}`, m, y); y += 13;
      doc.text(`Address: ${s(formData.address)}, ${s(formData.city)}, ${s(formData.state)} ${s(formData.zip)}`, m, y); y += 13;
      doc.text(`Estimator: ${s(formData.estimator)}`, m, y); y += 18;

      // Column headers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      const cols = ['#','Qty','Model','Vinyl','Int','Ext','W','×','H','Leg','Rad','Win#','Hng','Glass','Foam','Grid','Pat','Ful','Spc','Fil','Hlf','Min','F/L','S','U','NF','Scr','Orl','HR','TExt','TInt','Rmv','Sill'];
      const cw = [14,16,32,20,18,18,24,10,24,18,20,18,18,22,18,16,20,14,14,14,14,14,14,12,12,16,16,16,16,16,16,16,16];
      let cx = m;
      cols.forEach((c, i) => {
        doc.rect(cx, y, cw[i], 14);
        doc.text(c, cx + cw[i] / 2, y + 10, { align: 'center' });
        cx += cw[i];
      });
      y += 14;

      // Opening rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      for (const o of (formData.openings || [])) {
        if (y > 730) { doc.addPage(); y = m; }
        cx = m;
        const vals = [
          String(o.openingNumber || ''), String(o.qty || 1), s(o.model), s(o.vinylColor),
          s(o.interiorColor), s(o.exteriorColor), String(o.width || ''), '×', String(o.height || ''),
          String(o.legHeight || ''), String(o.customRadius || ''), String(o.windowNumber || o.openingNumber || ''),
          s(o.hinge), s(o.glassOption), o.foamEnhanced ? '✓' : '',
          s(o.gridStyle), s(o.gridPattern), o.gridFull ? '✓' : '', o.gridSpec ? '✓' : '',
          o.typeFill ? '✓' : '', o.typeHalf ? '✓' : '', o.typeMine ? '✓' : '',
          o.tempFull ? '✓' : '', o.tempS ? '✓' : '', o.tempU ? '✓' : '',
          o.nailFin ? '✓' : '', o.fullScreen ? '✓' : '', o.oriel ? '✓' : '', o.horizontalRR ? '✓' : '',
          s(o.exteriorType), s(o.trimType), s(o.removeInstallType), o.sillRepair ? '✓' : ''
        ];
        vals.forEach((v, i) => {
          doc.rect(cx, y, cw[i], 13);
          doc.text(v, cx + cw[i] / 2, y + 9.5, { align: 'center' });
          cx += cw[i];
        });
        y += 13;
      }
      y += 8;

      // Notes
      if (formData.sketchNotes || formData.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('NOTES:', m, y + 8);
        doc.rect(m, y + 10, pw - m * 2, 36);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const notes = formData.sketchNotes || formData.notes || '';
        doc.text(doc.splitTextToSize(notes, pw - m * 2 - 8), m + 4, y + 20);
        y += 52;
      }

      // Certification
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('I certify the salesperson has explained and identified each and every abbreviation, term, and drawing on this page to my full satisfaction,', m, y + 6);
      doc.text('and I have complete understanding how each and every window or entrance is measured, how it\'s constructed, accessorized, and warranted.', m, y + 13);
      y += 22;

      // Signature
      doc.setFontSize(8);
      doc.text('OWNER', m, y + 10);
      doc.line(m + 40, y + 10, m + 200, y + 10);
      doc.text('DATE', pw / 2 + 40, y + 10);
      doc.line(pw / 2 + 70, y + 10, pw - m, y + 10);
      y += 18;

      // Footer
      doc.setFontSize(6);
      doc.text('PAGE 1 OF ___', m, 780);
      doc.text('White Copy - Original     Yellow Copy - Estimator     Pink Copy - Customer', pw / 2, 780, { align: 'center' });

      const name = (formData.customerName || 'blank').replace(/\s+/g, '_');
      doc.save(`OrderForm_${name}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Check the console for details.');
    }
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
