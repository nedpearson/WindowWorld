import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaperOrderForm, PaperOrderFormHandle, OrderFormData, emptyFormData } from '../components/PaperOrderForm';
import { api } from '../utils/api';

type Mode = 'edit' | 'print';

export function OrderFormPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const formRef = useRef<PaperOrderFormHandle>(null);
  const [mode, setMode] = useState<Mode>('edit');
  const [formData, setFormData] = useState<OrderFormData>(emptyFormData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);

  useEffect(() => { if (!appointmentId) { setLoading(false); return; } loadFormData(); }, [appointmentId]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      const result = await api.post(`/forms/auto-fill/order-form/${appointmentId}`, {});
      const fd = result.formData;
      const mapped: OrderFormData = {
        poNumber: fd.poNumber || '', accountNumber: fd.accountNumber || '', orderDate: fd.orderDate || '',
        customerName: fd.customerName || '', phone: fd.phone || '', phone2: fd.phone2 || '',
        address: fd.address || '', city: fd.city || '', state: fd.state || '', zip: fd.zip || '',
        estimator: fd.estimator || '', estimatorPhone: fd.estimatorPhone || '', notes: fd.sketchNotes || '',
        sketchDataUrl: '', pageNumber: 1, totalPages: fd.totalPages || 1,
        openings: mapOpenings(fd.openings || []),
      };
      setFormData(mapped);
      runAIValidation(mapped);
    } catch (err) { console.error('Failed to load form data:', err); }
    setLoading(false);
  };

  const mapOpenings = (arr: any[]) => {
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
    while (rows.length < 20) rows.push({
      qty: 0, model: '', vinylColor: '', intColor: '', extColor: '', width: '', height: '',
      legHeight: '', customRadius: '', windowNumber: '', hinge: '', glassOption: '', foamEnhanced: false,
      gridStyle: '', gridPattern: '', gridFull: false, gridSpec: false,
      typeFill: false, typeHalf: false, typeMine: false, tempFull: false, tempS: false, tempU: false,
      nailFin: false, fullScreen: false, oriel: false, hor: false,
      typeExt: '', typeInt: '', rmvInst: '', sill: false, gridOptions: '', obsc: '', temp: '', floor: '',
    });
    return rows.slice(0, 20);
  };

  const runAIValidation = (fd: OrderFormData) => {
    const w: string[] = [];
    if (!fd.customerName) w.push('Missing customer name');
    if (!fd.phone) w.push('Missing phone number');
    if (!fd.address) w.push('Missing address');
    if (!fd.orderDate) w.push('Missing order date');
    if (!fd.estimator) w.push('Missing estimator');
    const filled = fd.openings.filter(o => o.qty > 0 || o.model);
    if (!filled.length) w.push('No openings added');
    filled.forEach((o, i) => {
      const n = o.windowNumber || String(i + 1);
      if (!o.width || !o.height) w.push(`Opening #${n}: Missing dimensions`);
      if (!o.model) w.push(`Opening #${n}: Missing model`);
    });
    if (!fd.sketchDataUrl) w.push('Sketch area is empty');
    setAiWarnings(w);
  };

  const saveForm = async () => {
    const fd = formRef.current?.getFormData(); if (!fd || !appointmentId) return;
    setSaving(true);
    try { await api.post('/forms', { appointmentId, formType: 'order_form', formData: JSON.stringify(fd), status: 'filled' }); setLastSaved(new Date().toLocaleTimeString()); } catch {}
    setSaving(false);
  };

  // PDF Export — PORTRAIT orientation
  const exportPDF = async () => {
    const fd = formRef.current?.getFormData(); if (!fd) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'pt', 'letter'); // PORTRAIT
    const pw = 612, ph = 792, m = 22;
    let y = m;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('WINDOW AND PATIO DOOR ORDER FORM', pw / 2, y + 13, { align: 'center' });
    y += 22;

    // Sketch box
    const infoW = 210, skW = pw - m * 2 - infoW - 6, skH = 130;
    doc.rect(m, y, skW, skH);
    if (fd.sketchDataUrl) { try { doc.addImage(fd.sketchDataUrl, 'PNG', m + 1, y + 1, skW - 2, skH - 2); } catch {} }

    // Customer info boxes
    const ix = m + skW + 6; let iy = y;
    const drawBox = (label: string, val: string, h: number = 16) => {
      doc.rect(ix, iy, infoW, h);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.text(label, ix + 3, iy + h * 0.65);
      doc.setFont('helvetica', 'normal');
      const lw = doc.getTextWidth(label) + 6;
      doc.text(val || '', ix + lw, iy + h * 0.65);
      iy += h;
    };
    drawBox('PO#', fd.poNumber); drawBox('ACCT #', fd.accountNumber); drawBox('ORDER DATE:', fd.orderDate);
    // Customer detail box
    const cdH = 64; doc.rect(ix, iy, infoW, cdH);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5);
    doc.text('Customer:', ix + 3, iy + 10); doc.setFont('helvetica', 'normal'); doc.text(fd.customerName, ix + 38, iy + 10);
    doc.text('Phone:', ix + infoW * 0.6, iy + 10); doc.text(fd.phone, ix + infoW * 0.6 + 22, iy + 10);
    doc.line(ix + infoW * 0.6 - 2, iy, ix + infoW * 0.6 - 2, iy + cdH * 0.5);
    doc.text('Phone:', ix + infoW * 0.6, iy + 22); doc.text(fd.phone2, ix + infoW * 0.6 + 22, iy + 22);
    doc.line(ix, iy + 28, ix + infoW, iy + 28);
    doc.setFont('helvetica', 'bold'); doc.text('Address', ix + 3, iy + 38); doc.setFont('helvetica', 'normal'); doc.text(fd.address, ix + 30, iy + 38);
    doc.line(ix, iy + 44, ix + infoW, iy + 44);
    doc.setFont('helvetica', 'bold'); doc.text('City', ix + 3, iy + 54); doc.text('Zip', ix + infoW * 0.6, iy + 54);
    doc.setFont('helvetica', 'normal'); doc.text(fd.city, ix + 18, iy + 54); doc.text(fd.zip, ix + infoW * 0.6 + 14, iy + 54);
    iy += cdH;
    drawBox('Estimator:', fd.estimator); drawBox('Phone:', fd.estimatorPhone || '');
    y += skH + 6;

    // Opening table — portrait columns
    const labels = ['#','QTY','MDL','VNL','INT','EXT','W','×','H','LEG','RAD','WIN','HNG','GLS','FOM','STY','PAT','FUL','SPC','FIL','HLF','MIN','F/L','S','U','NF','FSC','ORL','HOR','TEX','TIN','RMV','SIL'];
    const cw = [12,14,28,18,16,16,22,8,22,16,18,16,16,20,16,14,18,12,12,12,12,12,12,10,10,14,14,14,14,14,14,14,14];
    const rh = 12.5;
    let cx = m;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(4);
    labels.forEach((l, i) => { doc.rect(cx, y, cw[i], rh * 1.3); doc.text(l, cx + cw[i] / 2, y + rh, { align: 'center' }); cx += cw[i]; });
    y += rh * 1.3;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(5);
    fd.openings.forEach((row, ri) => {
      if (y > ph - 100) return;
      cx = m;
      const v = [String(ri+1), row.qty?String(row.qty):'', row.model, row.vinylColor, row.intColor, row.extColor,
        row.width, '×', row.height, row.legHeight, row.customRadius, row.windowNumber, row.hinge, row.glassOption,
        row.foamEnhanced?'✓':'', row.gridStyle, row.gridPattern, row.gridFull?'✓':'', row.gridSpec?'✓':'',
        row.typeFill?'✓':'', row.typeHalf?'✓':'', row.typeMine?'✓':'',
        row.tempFull?'✓':'', row.tempS?'✓':'', row.tempU?'✓':'',
        row.nailFin?'✓':'', row.fullScreen?'✓':'', row.oriel?'✓':'', row.hor?'✓':'',
        row.typeExt, row.typeInt, row.rmvInst, row.sill?'✓':''];
      v.forEach((val, i) => { doc.rect(cx, y, cw[i], rh); doc.text(val||'', cx + cw[i]/2, y + rh*0.75, { align: 'center' }); cx += cw[i]; });
      y += rh;
    });
    y += 4;

    // Notes
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text('NOTES:', m, y + 8);
    doc.rect(m, y + 10, pw - m * 2, 32);
    if (fd.notes) { doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.text(doc.splitTextToSize(fd.notes, pw - m * 2 - 6), m + 3, y + 18); }
    y += 48;

    // Certification
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5);
    const cert = 'I certify the salesperson has explained and identified each and every abbreviation, term, and drawing on this page to my full satisfaction, and I have complete understanding how each and every window or entrance is measured, how it\'s constructed, accessorized, and warranted.';
    doc.text(doc.splitTextToSize(cert, pw - m * 2), m, y + 6);
    y += 22;

    // Bottom info grid
    doc.rect(m, y, (pw - m * 2) * 0.22, 48); doc.rect(m + (pw - m * 2) * 0.22, y, (pw - m * 2) * 0.48, 48); doc.rect(m + (pw - m * 2) * 0.7, y, (pw - m * 2) * 0.3, 48);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5);
    doc.text('Estimator:', m + 3, y + 10); doc.text('Customer:', m + (pw - m * 2) * 0.22 + 3, y + 10); doc.text('PO#', m + (pw - m * 2) * 0.7 + 3, y + 10);
    doc.text('Phone:', m + 3, y + 34); doc.text('Address', m + (pw - m * 2) * 0.22 + 3, y + 22); doc.text('ACCT #', m + (pw - m * 2) * 0.7 + 3, y + 22);
    doc.text('ORDER DATE:', m + (pw - m * 2) * 0.7 + 3, y + 34);
    y += 54;

    // OWNER / DATE
    doc.line(m, y, pw - m, y);
    doc.setFontSize(7); doc.text('OWNER', m, y + 10); doc.line(m + 36, y + 10, m + 180, y + 10);
    doc.text('DATE', pw / 2 + 40, y + 10); doc.line(pw / 2 + 68, y + 10, pw - m, y + 10);

    // Footer
    doc.setFontSize(5.5);
    doc.text(`PAGE ${fd.pageNumber} OF ___`, m, ph - m + 4);
    doc.text('White Copy - Original', pw * 0.28, ph - m + 4);
    doc.text('Yellow Copy - Estimator', pw * 0.48, ph - m + 4);
    doc.text('Pink Copy - Customer', pw * 0.72, ph - m + 4);

    doc.save(`OrderForm_${fd.customerName.replace(/\s/g, '_') || 'blank'}.pdf`);
  };

  const printForm = () => { setMode('print'); setTimeout(() => window.print(), 200); };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--text-muted)' }}><div style={{ fontSize: '1.25rem' }}>⏳ Loading order form...</div></div>;

  return (
    <div style={{ position: 'relative' }}>
      <div className="form-page-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, flex: 1 }}>📋 Order Form</h2>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {(['edit', 'print'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '0.375rem 0.875rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', background: mode === m ? 'var(--accent)' : 'var(--bg-input)', color: mode === m ? 'white' : 'var(--text-secondary)' }}>
              {m === 'edit' ? '✏️ Edit' : '🖨️ Print'}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAI(!showAI)}>🤖 AI {aiWarnings.length > 0 && <span style={{ marginLeft: 4, fontSize: '0.625rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: 9999 }}>{aiWarnings.length}</span>}</button>
        <button className="btn btn-secondary btn-sm" onClick={saveForm} disabled={saving}>{saving ? '💾 Saving...' : '💾 Save'}</button>
        <button className="btn btn-primary btn-sm" onClick={exportPDF}>📄 PDF</button>
        <button className="btn btn-secondary btn-sm" onClick={printForm}>🖨️ Print</button>
        {lastSaved && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Last saved: {lastSaved}</span>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1 }} className="paper-form-wrapper">
          <PaperOrderForm ref={formRef} initialData={formData} editable={mode === 'edit'} onDataChange={d => { setFormData(d); runAIValidation(d); }} />
        </div>

        {showAI && (
          <div style={{ width: 300, flexShrink: 0, padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'auto', maxHeight: 'calc(100vh - 100px)', position: 'sticky', top: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>🤖 AI Assistant</h3>
              <button onClick={() => setShowAI(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            {aiWarnings.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--success)' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div><div style={{ fontWeight: 600 }}>Form looks complete!</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{aiWarnings.length} issue{aiWarnings.length !== 1 ? 's' : ''} detected</div>
                {aiWarnings.map((w, i) => (
                  <div key={i} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderRadius: 6, background: w.includes('Missing') ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${w.includes('Missing') ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, color: w.includes('Missing') ? '#ef4444' : '#f59e0b' }}>
                    {w.includes('Missing') ? '🛑' : '⚠️'} {w}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>📖 Field Guide</h4>
              {[{ l: 'GRID OPTIONS', d: 'Style, Pattern, Full, Spec sub-fields' }, { l: 'TYPE', d: 'Fill, Half, Mine sub-fields' }, { l: '9\' TEMP', d: 'Full Lite, S OTA, U OTA tempered glass' }, { l: 'NAIL FIN', d: 'Nail fin installation method' }, { l: 'FOAM ENHANCED', d: 'Foam-filled frame for insulation' }, { l: 'HOR R&R', d: 'Horizontal remove & replace' }, { l: 'SILL Repair', d: 'Sill repair needed at opening' }].map(f => (
                <div key={f.l} style={{ marginBottom: '0.375rem', fontSize: '0.6875rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{f.l}</span>
                  <span style={{ color: 'var(--text-muted)' }}> — {f.d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
