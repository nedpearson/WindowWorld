import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { getAllSketchMarkers } from './DrawableSketch';

// ═══════════════════════════════════════════════════════════
//  HIGH-FIDELITY ORDER FORM — matches BTR Window Contract
//  "Order Form" tab layout exactly.
//  Layout: Sketch box (B2:R22) | Customer info (S9:AL19)
//          Column headers (row 23-24) + ref rows (26-30)
//          Opening grid (rows 31-54, 24 slots)
//          Certification + Signature (rows 55-60)
// ═══════════════════════════════════════════════════════════

// Column header definitions matching the Excel exactly
const COL_HEADERS_ROW1 = [
  { key: '#', w: 18 },
  { key: 'QTY', w: 24 },
  { key: 'MODEL', w: 40 },
  { key: 'VINYL', w: 36 },
  { key: 'INT', w: 36 },
  { key: 'EXT', w: 36 },
  { key: 'MFG SIZE', w: 110, span: 4 }, // W, x, H, Leg
  { key: 'CUSTOM', w: 38 },
  { key: '', w: 18 }, // spacer M
  { key: 'WINDOW', w: 40 },
  { key: '', w: 30 }, // Hinge O
  { key: 'GLASS', w: 38 },
  { key: 'FOAM', w: 38 },
  { key: 'GRID OPTIONS', w: 70, span: 3 },
  { key: 'OBSC', w: 46, span: 3 },
  { key: 'TEMP', w: 34 },
  { key: 'NAIL FIN', w: 56, span: 2 },
  { key: 'FULL', w: 36 },
  { key: 'ORIEL', w: 38 },
  { key: 'HDR', w: 28 },
  { key: 'FOAM', w: 28 },
  { key: '', w: 3 }, // spacer AE
  { key: 'TYPE', w: 40 },
  { key: 'TYPE', w: 36 },
  { key: 'TYPE', w: 48, span: 3 },
  { key: 'TYPE', w: 32 },
  { key: 'SILL', w: 36 },
];

const COL_HEADERS_ROW2 = [
  '', '', '', 'COLOR', 'COLOR', 'COLOR',
  'WIDTH', 'X', 'HEIGHT', 'LEG HT',
  'RADIUS', '',
  'NUMBER', 'HINGE', 'OPTION', 'ENHANCED',
  'STYLE', 'PATTERN', '',
  'FUL-BSO', '', '',
  'FUL-BSO',
  'NO J', 'WITH J',
  'SCREEN', 'DIM', 'FLASH', 'EXP',
  '',
  'Ext.', 'Trim', 'Remove', '', '',
  'Install', 'Repair',
];

// Reference rows (26-30) from Excel
const REF_ROWS = [
  { af: 'BRICK', ag: 'VINYL', ah: 'ALUM', ak: 'IN', al: 'Yes' },
  { af: 'ALUM', ag: 'CAP', ah: 'STEEL', ak: 'OUT', al: 'No' },
  { af: 'STUCCO', ag: 'F&T', ah: 'STORM', ak: 'EXT' },
  { e: 'WH', g: 'WH', af: 'WOOD', ah: 'WOOD' },
  { e: 'BG', g: 'FW', p: 'LE' },
];

// Source tag styles — display only, not in PDF/Excel
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
  const formRef = useRef<HTMLDivElement>(null);

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

  const loadSources = async () => {
    try {
      const sessions = await api.get(`/voice/sessions/appointment/${appointmentId}`);
      const sources: Record<number, string> = {};
      for (const sess of (sessions || [])) {
        if (sess.status === 'applied' || sess.status === 'parsed' || sess.status === 'reviewed') {
          for (const e of (sess.entities || [])) {
            if (e.openingNumber) {
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
      const html2canvas = (await import('html2canvas')).default;
      
      if (formRef.current) {
        const canvas = await html2canvas(formRef.current, { 
          scale: 2, backgroundColor: '#ffffff',
          logging: false,
        });
        const imgData = canvas.toDataURL('image/png');
        const doc = new jsPDF('l', 'pt', 'letter'); // Landscape like the actual form
        const pw = 792, ph = 612;
        const imgW = pw - 20;
        const imgH = (canvas.height / canvas.width) * imgW;
        doc.addImage(imgData, 'PNG', 10, 10, imgW, Math.min(imgH, ph - 20));
        const name = (formData.customerName || 'blank').replace(/\s+/g, '_');
        doc.save(`OrderForm_${name}.pdf`);
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Check console.');
    }
  };

  const downloadExcel = async () => {
    try {
      const token = localStorage.getItem('wwa_token');
      const res = await fetch(`/api/exports/excel/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData?.customerName || 'Order'}_Contract.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Excel download failed: ' + err.message);
    }
  };

  if (!formData) return <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>{loading ? '⏳ Auto-filling order form...' : 'Click to auto-fill order form'}</div>;

  const s = (v: any) => v ?? '';
  const openings: any[] = formData.openings || [];
  const sketchMarkers = getAllSketchMarkers(appointmentId);

  // Build 24 opening rows (blank if no data)
  const openingRows = Array.from({ length: 24 }, (_, i) => openings[i] || null);

  return (
    <div>
      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>📋 Order Form Preview</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.375rem', marginRight: '0.5rem' }}>
            <SourceTag source="voice" />
            <SourceTag source="typed" />
            <SourceTag source="manual" />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={autoFill}>🔄 Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={generatePDF}>📄 PDF</button>
          <button className="btn btn-sm" onClick={downloadExcel} style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>📥 Excel</button>
        </div>
      </div>

      {/* ═══ THE FORM — pixel-perfect Excel replica ═══ */}
      <div ref={formRef} style={{
        background: '#ffffff', color: '#000', fontFamily: 'Arial, sans-serif',
        fontSize: '8px', lineHeight: 1.2, padding: '8px',
        border: '1px solid #999', borderRadius: 4, overflowX: 'auto',
      }}>
        {/* ── TOP SECTION: Sketch Box (left) | Customer Info (right) ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 2 }}>
          {/* SKETCH BOX — B2:R22 */}
          <div style={{
            width: 420, minHeight: 260, border: '2px solid #333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', flexShrink: 0, background: '#fafafa',
          }}>
            {sketchMarkers.length > 0 || (() => {
              // Try to load sketch image from localStorage
              try {
                const raw = localStorage.getItem(`wwa_sketch_${appointmentId}_front`);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (parsed?.dataUrl) return true;
                }
              } catch {}
              return false;
            })() ? (
              <SketchPreview appointmentId={appointmentId} />
            ) : (
              <div style={{ color: '#aaa', fontSize: '11px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: 4 }}>🏠</div>
                SKETCH / DRAWING AREA
                <div style={{ fontSize: '7px', marginTop: 4 }}>Draw on Home Sketch tab to populate</div>
              </div>
            )}
          </div>

          {/* CUSTOMER INFO & HEADER — S5:AL19 */}
          <div style={{ flex: 1, paddingLeft: 8 }}>
            {/* Title */}
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px', marginBottom: 6, letterSpacing: '0.5px' }}>
              WINDOW AND PATIO DOOR ORDER FORM
            </div>

            {/* PO / Acct / Date row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 4, fontSize: '8px' }}>
              <FieldCell label="PO#" value={s(formData.poNumber)} w={100} editable onChange={v => upd('poNumber', v)} />
              <FieldCell label="ACCT #" value={s(formData.accountNumber)} w={100} />
              <FieldCell label="ORDER DATE:" value={s(formData.orderDate)} w={120} editable onChange={v => upd('orderDate', v)} />
            </div>

            {/* Customer line */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 3 }}>
              <FieldCell label="Customer:" value={s(formData.customerName)} w={260} />
              <FieldCell label="Phone:" value={s(formData.phone)} w={140} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 3 }}>
              <FieldCell label="" value="" w={260} />
              <FieldCell label="Phone:" value={s(formData.phone2)} w={140} />
            </div>

            {/* Address line */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 3 }}>
              <FieldCell label="Address" value={`${s(formData.address)}`} w={260} />
              <FieldCell label="City" value={s(formData.city)} w={100} />
              <FieldCell label="Zip" value={s(formData.zip)} w={50} />
            </div>

            {/* Estimator line */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 3 }}>
              <FieldCell label="Estimator:" value={s(formData.estimator)} w={260} />
              <FieldCell label="Phone:" value={s(formData.estimatorPhone || '225-328-2500')} w={140} />
            </div>
          </div>
        </div>

        {/* ── COLUMN HEADERS (rows 23-24) ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', minWidth: 1100 }}>
            <thead>
              <tr>
                <TH w={18}>#</TH>
                <TH w={24}>QTY</TH>
                <TH w={40}>MODEL</TH>
                <TH w={36}>VINYL<br/><sub>COLOR</sub></TH>
                <TH w={36}>INT<br/><sub>COLOR</sub></TH>
                <TH w={36}>EXT<br/><sub>COLOR</sub></TH>
                <TH w={54}>MFG<br/><sub>WIDTH</sub></TH>
                <TH w={10}>×</TH>
                <TH w={54}>MFG<br/><sub>HEIGHT</sub></TH>
                <TH w={42}>LEG<br/><sub>HT</sub></TH>
                <TH w={38}>CUSTOM<br/><sub>RADIUS</sub></TH>
                <TH w={36}>WIN<br/><sub>#</sub></TH>
                <TH w={28}>HNG</TH>
                <TH w={36}>GLASS<br/><sub>OPT</sub></TH>
                <TH w={34}>FOAM<br/><sub>ENH</sub></TH>
                <TH w={32}>GRID<br/><sub>STY</sub></TH>
                <TH w={40}>GRID<br/><sub>PAT</sub></TH>
                <TH w={34}>OBSC<br/><sub>F/B</sub></TH>
                <TH w={34}>TEMP<br/><sub>F/B</sub></TH>
                <TH w={28}>NF<br/><sub>NoJ</sub></TH>
                <TH w={28}>NF<br/><sub>wJ</sub></TH>
                <TH w={34}>FUL<br/><sub>SCR</sub></TH>
                <TH w={32}>ORL<br/><sub>DIM</sub></TH>
                <TH w={28}>HDR<br/><sub>FL</sub></TH>
                <TH w={28}>FM<br/><sub>EXP</sub></TH>
                <TH w={36}>TYPE<br/><sub>Ext.</sub></TH>
                <TH w={34}>TYPE<br/><sub>Trim</sub></TH>
                <TH w={44}>TYPE<br/><sub>Remove</sub></TH>
                <TH w={34}>TYPE<br/><sub>Install</sub></TH>
                <TH w={32}>SILL<br/><sub>Rep</sub></TH>
              </tr>
            </thead>
            <tbody>
              {/* Reference options rows (visual only) */}
              <tr style={{ fontSize: '6px', color: '#888', background: '#f5f5f5' }}>
                <TD colSpan={4}></TD><TD>WH</TD><TD colSpan={1}></TD><TD>WH</TD>
                <TD colSpan={6}></TD><TD></TD><TD>LE</TD><TD></TD>
                <TD colSpan={8}></TD>
                <TD>BRICK</TD><TD>VINYL</TD><TD>ALUM</TD><TD>IN</TD><TD>Yes</TD>
              </tr>
              <tr style={{ fontSize: '6px', color: '#888', background: '#f5f5f5' }}>
                <TD colSpan={4}></TD><TD>BG</TD><TD colSpan={1}></TD><TD>FW</TD>
                <TD colSpan={6}></TD><TD></TD><TD>LEE</TD><TD></TD>
                <TD colSpan={8}></TD>
                <TD>ALUM</TD><TD>CAP</TD><TD>STEEL</TD><TD>OUT</TD><TD>No</TD>
              </tr>

              {/* ── OPENING ROWS (24 slots) ── */}
              {openingRows.map((o, i) => {
                const num = i + 1;
                const source = o ? (openingSources[o.openingNumber] || 'manual') : '';
                const filled = !!o;
                return (
                  <tr key={i} style={{
                    background: filled ? (i % 2 === 0 ? '#fff' : '#fafafa') : 'transparent',
                    height: 18,
                  }}>
                    <TD bold>{num}</TD>
                    <TD>{o?.qty || ''}</TD>
                    <TD>{o?.model || ''}</TD>
                    <TD>{o?.vinylColor || ''}</TD>
                    <TD>{o?.interiorColor?.substring(0, 3) || ''}</TD>
                    <TD>{o?.exteriorColor?.substring(0, 3) || ''}</TD>
                    <TD>{o?.width || ''}</TD>
                    <TD>x</TD>
                    <TD>{o?.height || ''}</TD>
                    <TD>{o?.legHeight || ''}</TD>
                    <TD>{o?.customRadius || ''}</TD>
                    <TD>{o?.windowNumber || o?.openingNumber || ''}</TD>
                    <TD>{o?.hinge || ''}</TD>
                    <TD>{o?.glassOption || ''}</TD>
                    <TD>{o?.foamEnhanced ? '✓' : ''}</TD>
                    <TD>{o?.gridStyle && o.gridStyle !== 'None' ? o.gridStyle.substring(0, 3) : ''}</TD>
                    <TD>{o?.gridPattern || ''}</TD>
                    <TD>{o?.obscureGlass && o.obscureGlass !== 'none' ? (o.obscureGlass === 'full' ? 'FUL' : 'BSO') : ''}</TD>
                    <TD>{o?.temperedGlass && o.temperedGlass !== 'none' ? (o.temperedGlass === 'full' ? 'FUL' : 'BSO') : ''}</TD>
                    <TD>{o?.nailFinNoJ ? '✓' : ''}</TD>
                    <TD>{o?.nailFinWithJ ? '✓' : ''}</TD>
                    <TD>{o?.fullScreen ? '✓' : ''}</TD>
                    <TD>{o?.oriel || ''}</TD>
                    <TD>{o?.headerFlash ? '✓' : ''}</TD>
                    <TD>{o?.foamExp ? '✓' : ''}</TD>
                    <TD>{o?.exteriorType?.substring(0, 5) || ''}</TD>
                    <TD>{o?.trimType?.substring(0, 4) || ''}</TD>
                    <TD>{o?.removeInstallType?.substring(0, 5) || ''}</TD>
                    <TD>{o?.installType?.substring(0, 3) || ''}</TD>
                    <TD>{o?.sillRepair ? 'Yes' : ''}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── CERTIFICATION & SIGNATURE (rows 55-60) ── */}
        <div style={{ marginTop: 6, fontSize: '7px', lineHeight: 1.4, color: '#333' }}>
          <p style={{ margin: '0 0 1px 0' }}>
            I certify the salesperson has explained and identified each and every abbreviation, term, and drawing on this page to my full satisfaction,
          </p>
          <p style={{ margin: '0 0 1px 0' }}>
            and I have complete understanding how each and every window or entrance is measured, how it's constructed, accessorized, and warranted.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 6, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: '9px', fontWeight: 700 }}>OWNER</span>
            <div style={{ width: 200, borderBottom: '1px solid #333' }}>&nbsp;</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: '9px', fontWeight: 700 }}>DATE</span>
            <div style={{ width: 140, borderBottom: '1px solid #333' }}>&nbsp;</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '6px', color: '#888' }}>
          <span>White Copy - Original&nbsp;&nbsp;&nbsp;Yellow Copy - Estimator&nbsp;&nbsp;&nbsp;Pink Copy - Customer</span>
          <span>PAGE 1 OF ___</span>
        </div>
      </div>
    </div>
  );
}

// ── Sketch preview image from localStorage ──
function SketchPreview({ appointmentId }: { appointmentId: string }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    const elevations = ['front', 'rear', 'left', 'right', 'garage', 'other'];
    for (const elev of elevations) {
      try {
        const raw = localStorage.getItem(`wwa_sketch_${appointmentId}_${elev}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.dataUrl) { setImgSrc(parsed.dataUrl); return; }
        }
      } catch {}
    }
  }, [appointmentId]);

  if (!imgSrc) return <div style={{ color: '#aaa', fontSize: '10px' }}>No sketch saved</div>;
  return <img src={imgSrc} alt="Home sketch" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />;
}

// ── Helper components ──
function FieldCell({ label, value, w, editable, onChange }: {
  label: string; value: string; w: number; editable?: boolean; onChange?: (v: string) => void;
}) {
  return (
    <div style={{ width: w }}>
      <div style={{ fontSize: '7px', color: '#666', marginBottom: 1 }}>{label}</div>
      {editable ? (
        <input
          value={value}
          onChange={e => onChange?.(e.target.value)}
          style={{
            width: '100%', fontSize: '9px', fontWeight: 600, border: 'none',
            borderBottom: '1px solid #999', padding: '1px 2px', background: 'transparent', outline: 'none',
          }}
        />
      ) : (
        <div style={{ fontSize: '9px', fontWeight: 600, borderBottom: '1px solid #ccc', padding: '1px 2px', minHeight: 14 }}>
          {value}
        </div>
      )}
    </div>
  );
}

function TH({ children, w }: { children: React.ReactNode; w: number }) {
  return (
    <th style={{
      width: w, minWidth: w, padding: '2px 1px', fontSize: '6.5px', fontWeight: 700,
      textAlign: 'center', borderBottom: '2px solid #333', borderRight: '1px solid #ccc',
      background: '#f0f0f0', lineHeight: 1.1, verticalAlign: 'bottom',
    }}>
      {children}
    </th>
  );
}

function TD({ children, bold, colSpan }: { children?: React.ReactNode; bold?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{
      padding: '1px 2px', fontSize: '7.5px', textAlign: 'center',
      borderBottom: '1px solid #ddd', borderRight: '1px solid #eee',
      fontWeight: bold ? 700 : 400, whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  );
}
