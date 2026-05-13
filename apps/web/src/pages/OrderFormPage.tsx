import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaperOrderForm, PaperOrderFormHandle, OrderFormData, OpeningRow, emptyFormData } from '../components/PaperOrderForm';
import { DrawableSketchCanvas } from '../components/DrawableSketch';
import { api } from '../utils/api';

// ═══════════════════════════════════════════════════════════════
// ORDER FORM PAGE — Edit + Print + AI + Mobile
// ═══════════════════════════════════════════════════════════════

type Mode = 'edit' | 'print' | 'mobile';

export function OrderFormPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const formRef = useRef<PaperOrderFormHandle>(null);

  const [mode, setMode] = useState<Mode>('edit');
  const [formData, setFormData] = useState<OrderFormData>(emptyFormData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [showAI, setShowAI] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [showSketchTools, setShowSketchTools] = useState(false);

  // Load data from API
  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    loadFormData();
  }, [appointmentId]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      const result = await api.post(`/forms/auto-fill/order-form/${appointmentId}`, {});
      const fd = result.formData;
      // Map API data to PaperOrderForm structure
      const mapped: OrderFormData = {
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
        notes: fd.sketchNotes || '',
        sketchDataUrl: '',
        pageNumber: 1,
        totalPages: fd.totalPages || 1,
        openings: mapOpenings(fd.openings || []),
      };
      setFormData(mapped);
      runAIValidation(mapped);
    } catch (err) {
      console.error('Failed to load form data:', err);
    }
    setLoading(false);
  };

  // Map API openings to form row structure
  const mapOpenings = (apiOpenings: any[]): OpeningRow[] => {
    const rows: OpeningRow[] = apiOpenings.map(o => ({
      qty: o.qty || 1,
      model: o.model || '',
      vinylColor: o.vinylColor || '',
      intColor: o.interiorColor || '',
      extColor: o.exteriorColor || '',
      width: o.width ? String(o.width) : '',
      height: o.height ? String(o.height) : '',
      legHeight: o.legHeight ? String(o.legHeight) : '',
      customRadius: o.customRadius ? String(o.customRadius) : '',
      windowNumber: o.windowNumber ? String(o.windowNumber) : String(o.openingNumber || ''),
      hinge: o.hinge || '',
      glassOption: o.glassOption || '',
      foamEnhanced: !!o.foamEnhanced,
      gridOptions: o.gridStyle || '',
      obsc: o.obscure === 'none' ? '' : (o.obscure || ''),
      temp: o.tempered === 'none' ? '' : (o.tempered || ''),
      fullScreen: !!o.fullScreen,
      oriel: !!o.oriel,
      hor: !!o.horizontalRR,
      typeExt: o.exteriorType || '',
      floor: o.floorNumber ? String(o.floorNumber) : '',
      typeInt: o.trimType || '',
      rmvInst: o.removeInstallType || '',
      sill: !!o.sillRepair,
    }));
    // Pad to 20 rows
    while (rows.length < 20) {
      rows.push({
        qty: 0, model: '', vinylColor: '', intColor: '', extColor: '',
        width: '', height: '', legHeight: '', customRadius: '', windowNumber: '',
        hinge: '', glassOption: '', foamEnhanced: false, gridOptions: '',
        obsc: '', temp: '', fullScreen: false, oriel: false, hor: false,
        typeExt: '', floor: '', typeInt: '', rmvInst: '', sill: false,
      });
    }
    return rows.slice(0, 20);
  };

  // AI Validation
  const runAIValidation = (fd: OrderFormData) => {
    const warnings: string[] = [];
    if (!fd.customerName) warnings.push('Missing customer name');
    if (!fd.phone) warnings.push('Missing phone number');
    if (!fd.address) warnings.push('Missing address');
    if (!fd.orderDate) warnings.push('Missing order date');
    if (!fd.estimator) warnings.push('Missing estimator');

    const filledOpenings = fd.openings.filter(o => o.qty > 0 || o.model);
    if (filledOpenings.length === 0) {
      warnings.push('No openings added to order form');
    }

    filledOpenings.forEach((o, i) => {
      const num = o.windowNumber || String(i + 1);
      if (!o.width || !o.height) warnings.push(`Opening #${num}: Missing dimensions`);
      if (!o.model) warnings.push(`Opening #${num}: Missing model`);
      if (!o.glassOption) warnings.push(`Opening #${num}: Missing glass option`);
      if (o.width && o.height) {
        const w = parseFloat(o.width);
        const h = parseFloat(o.height);
        if (w > 0 && h > 0) {
          const ui = w + h;
          if (ui > 120) warnings.push(`Opening #${num}: United inches ${ui}" exceeds typical maximum`);
          if (ui < 20) warnings.push(`Opening #${num}: United inches ${ui}" seems too small`);
        }
      }
    });

    if (!fd.sketchDataUrl) {
      warnings.push('Sketch area is empty — draw house layout');
    }

    setAiWarnings(warnings);
  };

  // Save
  const saveForm = async () => {
    const fd = formRef.current?.getFormData();
    if (!fd || !appointmentId) return;
    setSaving(true);
    try {
      await api.post(`/forms`, {
        appointmentId,
        formType: 'order_form',
        formData: JSON.stringify(fd),
        status: 'filled',
      });
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  // PDF Export using jsPDF
  const exportPDF = async () => {
    const fd = formRef.current?.getFormData();
    if (!fd) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('l', 'pt', 'letter'); // landscape, points, letter
    const pw = 792; // 11in @ 72dpi
    const ph = 612; // 8.5in @ 72dpi
    const margin = 24;
    let y = margin;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('WINDOW AND PATIO DOOR ORDER FORM', pw / 2, y + 14, { align: 'center' });
    y += 24;

    // Customer info box
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const infoX = pw - margin - 240;
    const infoW = 240;
    doc.rect(infoX, y, infoW, 110);

    const drawInfoField = (label: string, value: string, fy: number, fx: number, fw: number) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, fx + 2, fy + 8);
      doc.setFont('helvetica', 'normal');
      const labelW = doc.getTextWidth(label) + 4;
      doc.text(value || '', fx + labelW + 2, fy + 8);
      doc.line(fx, fy + 12, fx + fw, fy + 12);
    };

    let iy = y;
    drawInfoField('PO#:', fd.poNumber, iy, infoX, infoW / 2);
    drawInfoField('ACCT #:', fd.accountNumber, iy, infoX + infoW / 2, infoW / 2);
    iy += 14;
    drawInfoField('ORDER DATE:', fd.orderDate, iy, infoX, infoW);
    iy += 14;
    drawInfoField('Customer:', fd.customerName, iy, infoX, infoW * 0.65);
    drawInfoField('Phone:', fd.phone, iy, infoX + infoW * 0.65, infoW * 0.35);
    iy += 14;
    drawInfoField('Address:', fd.address, iy, infoX, infoW * 0.65);
    drawInfoField('Phone:', fd.phone2, iy, infoX + infoW * 0.65, infoW * 0.35);
    iy += 14;
    drawInfoField('City:', fd.city, iy, infoX, infoW * 0.65);
    drawInfoField('Zip:', fd.zip, iy, infoX + infoW * 0.65, infoW * 0.35);
    iy += 14;
    drawInfoField('Estimator:', fd.estimator, iy, infoX, infoW);

    // Sketch box
    const sketchW = pw - margin - infoW - margin - 8;
    const sketchH = 110;
    doc.rect(margin, y, sketchW, sketchH);
    if (fd.sketchDataUrl) {
      try { doc.addImage(fd.sketchDataUrl, 'PNG', margin + 1, y + 1, sketchW - 2, sketchH - 2); } catch {}
    }
    y += sketchH + 6;

    // Opening table
    const colLabels = ['#','QTY','MODEL','VINYL','INT','EXT','W','H','LEG','RAD','WIN#','HNG','GLASS','FOAM','GRID','OBS','TMP','FUL','ORL','HOR','T.EX','FL#','T.IN','R/I','SIL'];
    const colWidths = [14, 18, 42, 32, 28, 28, 28, 28, 22, 24, 22, 18, 32, 18, 32, 18, 18, 18, 18, 18, 22, 18, 22, 22, 18];
    const tableW = colWidths.reduce((a, b) => a + b, 0);
    const tableX = margin;
    const rowH = 13;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    let cx = tableX;
    colLabels.forEach((label, i) => {
      doc.rect(cx, y, colWidths[i], rowH * 1.2);
      doc.text(label, cx + colWidths[i] / 2, y + rowH * 0.8, { align: 'center' });
      cx += colWidths[i];
    });
    y += rowH * 1.2;

    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    fd.openings.forEach((row, rowIdx) => {
      if (y > ph - 80) return; // overflow guard
      cx = tableX;
      const vals = [
        String(rowIdx + 1),
        row.qty ? String(row.qty) : '',
        row.model,
        row.vinylColor,
        row.intColor,
        row.extColor,
        row.width,
        row.height,
        row.legHeight,
        row.customRadius,
        row.windowNumber,
        row.hinge,
        row.glassOption,
        row.foamEnhanced ? '✓' : '',
        row.gridOptions,
        row.obsc,
        row.temp,
        row.fullScreen ? '✓' : '',
        row.oriel ? '✓' : '',
        row.hor ? '✓' : '',
        row.typeExt,
        row.floor,
        row.typeInt,
        row.rmvInst,
        row.sill ? '✓' : '',
      ];
      vals.forEach((v, i) => {
        doc.rect(cx, y, colWidths[i], rowH);
        doc.text(v || '', cx + colWidths[i] / 2, y + rowH * 0.75, { align: 'center' });
        cx += colWidths[i];
      });
      y += rowH;
    });

    y += 4;

    // Notes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('NOTES:', margin, y + 8);
    doc.rect(margin, y + 10, 160, 60);
    if (fd.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      const lines = doc.splitTextToSize(fd.notes, 155);
      doc.text(lines, margin + 3, y + 18);
    }

    // Certification
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5);
    const certText = 'I certify this salesperson has explained and identified each and every abbreviation, term, and drawing on this page to my full and complete understanding including how each and every window is removed, installed, trimmed, accessorized, and warranted.';
    const certLines = doc.splitTextToSize(certText, pw - margin - 200);
    doc.text(certLines, margin + 170, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('OWNER', margin + 170, y + 50);
    doc.line(margin + 200, y + 50, margin + 340, y + 50);
    doc.text('DATE', margin + 350, y + 50);
    doc.line(margin + 370, y + 50, margin + 440, y + 50);

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5);
    doc.text('White Copy - Original      Yellow Copy - Estimator      Pink Copy - Customer', margin, ph - margin + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(`PAGE ${fd.pageNumber} OF ${fd.totalPages}`, pw - margin, ph - margin + 4, { align: 'right' });

    doc.save(`OrderForm_${fd.customerName.replace(/\s/g, '_') || 'blank'}.pdf`);
  };

  // Print
  const printForm = () => {
    setMode('print');
    setTimeout(() => window.print(), 200);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--text-muted)' }}>
        <div className="loading" style={{ fontSize: '1.25rem' }}>⏳ Loading order form...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ═══ TOOLBAR ═══ */}
      <div className="form-page-toolbar" style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap',
      }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, flex: 1 }}>📋 Order Form</h2>

        {/* Mode toggle */}
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {(['edit', 'print'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '0.375rem 0.875rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem',
              background: mode === m ? 'var(--accent)' : 'var(--bg-input)',
              color: mode === m ? 'white' : 'var(--text-secondary)',
            }}>
              {m === 'edit' ? '✏️ Edit' : '🖨️ Print'}
            </button>
          ))}
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => setShowAI(!showAI)}>
          🤖 AI {aiWarnings.length > 0 && <span style={{
            marginLeft: 4, fontSize: '0.625rem', fontWeight: 800, color: '#ef4444',
            background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: 9999,
          }}>{aiWarnings.length}</span>}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={saveForm} disabled={saving}>
          {saving ? '💾 Saving...' : '💾 Save'}
        </button>
        <button className="btn btn-primary btn-sm" onClick={exportPDF}>📄 PDF</button>
        <button className="btn btn-secondary btn-sm" onClick={printForm}>🖨️ Print</button>

        {lastSaved && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Last saved: {lastSaved}</span>}
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {/* Form */}
        <div style={{ flex: 1 }} className="paper-form-wrapper">
          <PaperOrderForm
            ref={formRef}
            initialData={formData}
            editable={mode === 'edit'}
            onDataChange={data => {
              setFormData(data);
              runAIValidation(data);
            }}
          />
        </div>

        {/* AI Panel */}
        {showAI && (
          <div style={{
            width: 300, flexShrink: 0, padding: '1rem', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'auto',
            maxHeight: 'calc(100vh - 100px)', position: 'sticky', top: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>🤖 AI Assistant</h3>
              <button onClick={() => setShowAI(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {aiWarnings.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--success)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontWeight: 600 }}>Form looks complete!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  {aiWarnings.length} issue{aiWarnings.length !== 1 ? 's' : ''} detected
                </div>
                {aiWarnings.map((w, i) => (
                  <div key={i} style={{
                    padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderRadius: 6,
                    background: w.includes('Missing') ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${w.includes('Missing') ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                    color: w.includes('Missing') ? '#ef4444' : '#f59e0b',
                  }}>
                    {w.includes('Missing') ? '🛑' : '⚠️'} {w}
                  </div>
                ))}
              </div>
            )}

            {/* Field Explanations */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>📖 Field Guide</h4>
              {[
                { label: 'QTY', desc: 'Number of identical windows at this opening' },
                { label: 'MODEL', desc: 'Window product model (e.g., 4000 Series DH)' },
                { label: 'MFG SIZE', desc: 'Manufacturer size: Width × Height in inches' },
                { label: 'FOAM ENHANCED', desc: 'Foam-filled frame for insulation boost' },
                { label: 'OBSC', desc: 'Obscure/frosted glass (bathroom, etc)' },
                { label: 'TEMP', desc: 'Tempered glass: Full, Half, or none' },
                { label: 'ORIEL', desc: 'Oriel-style window projection' },
                { label: 'HOR R&R', desc: 'Horizontal remove & replace' },
                { label: 'SILL', desc: 'Sill repair needed at this opening' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: '0.375rem', fontSize: '0.6875rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{f.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}> — {f.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
