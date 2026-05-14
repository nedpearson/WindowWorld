import { useState } from 'react';
import { api } from '../utils/api';

interface ReconciliationIssue {
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  category: string;
  message: string;
  fixAction?: string;
}

function runReconciliation(appt: any): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];
  const openings = appt.openings || [];
  const c = appt.customer;

  // Customer data checks
  if (!c.firstName || !c.lastName) issues.push({ severity: 'BLOCKER', category: 'Customer', message: 'Customer name is missing', fixAction: 'Go to Customer step' });
  if (!c.phone) issues.push({ severity: 'BLOCKER', category: 'Customer', message: 'Phone number is required', fixAction: 'Go to Customer step' });
  if (!appt.jobAddress) issues.push({ severity: 'BLOCKER', category: 'Job', message: 'Job address is missing', fixAction: 'Go to Job Info step' });

  // Opening checks
  if (openings.length === 0) issues.push({ severity: 'BLOCKER', category: 'Openings', message: 'No openings entered — Order Form will be empty' });
  if (openings.length > 24) issues.push({ severity: 'WARNING', category: 'Openings', message: `${openings.length} openings exceeds 24-slot template — extra openings will overflow to notes` });

  for (const o of openings) {
    if (!o.width || !o.height) {
      issues.push({ severity: 'BLOCKER', category: 'Measurements', message: `Opening #${o.openingNumber}: Width or Height is missing` });
    }
    if (!o.productCategory) {
      issues.push({ severity: 'WARNING', category: 'Product', message: `Opening #${o.openingNumber}: No product type selected` });
    }
    // Tempered glass review
    if (o.temperedGlass && !o.temperedReviewed) {
      issues.push({ severity: 'WARNING', category: 'Tempered', message: `Opening #${o.openingNumber}: Tempered glass needs review confirmation` });
    }
    // Oriel top sash
    if (o.isOriel && !o.orielTopSash) {
      issues.push({ severity: 'WARNING', category: 'Oriel', message: `Opening #${o.openingNumber}: Oriel window — top sash measurement required` });
    }
    // Picture window screen check
    if (o.productCategory === 'picture' && o.screenOption && o.screenOption !== 'None') {
      issues.push({ severity: 'INFO', category: 'Screen', message: `Opening #${o.openingNumber}: Picture window — screen is typically N/A` });
    }
  }

  // Pricing checks
  const computedTotal = openings.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
  if (computedTotal > 0 && appt.totalAmount && Math.abs(computedTotal - appt.totalAmount) > 1) {
    issues.push({ severity: 'WARNING', category: 'Pricing', message: `Opening total ($${computedTotal.toFixed(2)}) differs from contract total ($${(appt.totalAmount || 0).toFixed(2)})` });
  }

  // Deposit/balance check
  if (appt.totalAmount > 0 && appt.depositAmount > appt.totalAmount) {
    issues.push({ severity: 'BLOCKER', category: 'Payment', message: 'Deposit exceeds total amount' });
  }

  return issues;
}

export function ContractExport({ appointment }: { appointment: any }) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [showRecon, setShowRecon] = useState(false);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
  const c = appointment.customer;
  const openings = appointment.openings || [];
  const issues = runReconciliation(appointment);
  const blockers = issues.filter(i => i.severity === 'BLOCKER');
  const warnings = issues.filter(i => i.severity === 'WARNING');

  // ── Excel Workbook Export (BTR Template) ──
  const exportExcel = async () => {
    setExporting('excel');
    try {
      const blob = await api.exportExcel(appointment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${c.lastName}_${c.firstName}_Contract.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Excel export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(null);
    }
  };

  const generatePDF = async () => {
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(20);
      doc.text('Window World — Contract / Order Form', 14, y); y += 12;
      doc.setFontSize(11);
      doc.text(`Customer: ${c.firstName} ${c.lastName}`, 14, y); y += 6;
      doc.text(`Phone: ${c.phone || 'N/A'}  |  Email: ${c.email || 'N/A'}`, 14, y); y += 6;
      doc.text(`Job Address: ${appointment.jobAddress || 'N/A'}`, 14, y); y += 6;
      doc.text(`Date: ${appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'N/A'}`, 14, y);
      y += 10;

      doc.setFontSize(13);
      doc.text('Opening Schedule', 14, y); y += 8;
      doc.setFontSize(8);
      doc.text('#  Room           Elev    W×H      UI   Product         Series      Price', 14, y); y += 5;

      openings.forEach((o: any) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const line = `${String(o.openingNumber).padEnd(3)}${(o.roomLocation || '').padEnd(15).slice(0,15)} ${(o.elevation || '').padEnd(8).slice(0,8)}${String(o.width || 0).padEnd(4)}×${String(o.height || 0).padEnd(5)} ${String(o.unitedInches || 0).padEnd(5)}${(o.productCategory || '').replace(/_/g,' ').padEnd(16).slice(0,16)}${(o.seriesModel || '').padEnd(12).slice(0,12)}$${(o.totalPrice || 0).toFixed(2)}`;
        doc.text(line, 14, y); y += 4;
      });

      y += 8;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.text(`Subtotal: ${fmt(appointment.subtotal)}`, 14, y); y += 6;
      doc.text(`Tax (${((appointment.taxRate || 0) * 100).toFixed(2)}%): ${fmt(appointment.taxAmount)}`, 14, y); y += 6;
      doc.text(`Total: ${fmt(appointment.totalAmount)}`, 14, y); y += 6;
      doc.text(`Deposit: ${fmt(appointment.depositAmount)}`, 14, y); y += 6;
      doc.text(`Balance Due: ${fmt(appointment.balanceDue)}`, 14, y); y += 12;
      doc.text('Customer Signature: _________________________  Date: __________', 14, y); y += 10;
      doc.text('Estimator Signature: ________________________  Date: __________', 14, y);

      doc.save(`${c.lastName}_${c.firstName}_Contract.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const exportJSON = async () => {
    setExporting('json');
    try {
      const data = await api.exportJSON(appointment.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${c.lastName}_quote.json`; a.click();
    } finally { setExporting(null); }
  };

  const exportCSV = async () => {
    setExporting('csv');
    try {
      const csv = await api.exportCSV(appointment.id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${c.lastName}_openings.csv`; a.click();
    } finally { setExporting(null); }
  };

  const sevColor = (s: string) => s === 'BLOCKER' ? '#ef4444' : s === 'WARNING' ? '#f59e0b' : '#60a5fa';

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>📄 Contract & Export</h2>

      {/* ── Reconciliation Panel ── */}
      <div className="card" style={{
        marginBottom: '1rem',
        borderColor: blockers.length > 0 ? 'rgba(239,68,68,0.3)' : warnings.length > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)',
        background: blockers.length > 0 ? 'rgba(239,68,68,0.05)' : warnings.length > 0 ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowRecon(!showRecon)}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {blockers.length > 0 ? '🛑' : warnings.length > 0 ? '⚠️' : '✅'}
              Workbook Reconciliation
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                {blockers.length > 0 ? `${blockers.length} blocker${blockers.length > 1 ? 's' : ''}` : warnings.length > 0 ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : 'All checks passed'}
              </span>
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{showRecon ? '▲' : '▼'}</span>
        </div>
        {showRecon && issues.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {issues.map((issue, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.375rem 0.5rem', background: `${sevColor(issue.severity)}08`, borderRadius: 6 }}>
                <span style={{ color: sevColor(issue.severity), fontWeight: 700, fontSize: '0.75rem', minWidth: 70 }}>
                  {issue.severity === 'BLOCKER' ? '🛑 BLOCK' : issue.severity === 'WARNING' ? '⚠ WARN' : 'ℹ INFO'}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem', minWidth: 70 }}>{issue.category}</span>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Export Cards ── */}
      <div className="card-grid">
        {/* PRIMARY: Excel Workbook Export */}
        <div className="card" style={{
          textAlign: 'center', padding: '2rem', cursor: blockers.length > 0 ? 'not-allowed' : 'pointer',
          opacity: blockers.length > 0 ? 0.5 : 1,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.08))',
          borderColor: 'rgba(34,197,94,0.3)',
        }} onClick={blockers.length > 0 ? undefined : exportExcel}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📗</div>
          <h3 style={{ color: '#22c55e' }}>{exporting === 'excel' ? 'Generating...' : 'Download BTR Workbook'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Exact Contract + Order Form — filled from appointment data
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: '0.375rem' }}>
            .xlsx • Preserves original template layout
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }} onClick={generatePDF}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
          <h3>{exporting === 'pdf' ? 'Generating...' : 'Generate PDF'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Printable contract packet
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }} onClick={exportCSV}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
          <h3>{exporting === 'csv' ? 'Exporting...' : 'Export CSV'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Opening schedule spreadsheet
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }} onClick={exportJSON}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💾</div>
          <h3>{exporting === 'json' ? 'Exporting...' : 'Export JSON'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Full quote data backup
          </p>
        </div>
      </div>

      {/* Quick preview */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Contract Preview</h3>
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
          <p><strong>Customer:</strong> {c.firstName} {c.lastName}</p>
          <p><strong>Address:</strong> {appointment.jobAddress}</p>
          <p><strong>Openings:</strong> {openings.length}</p>
          <p><strong>Total:</strong> {fmt(appointment.totalAmount)}</p>
          <p><strong>Deposit:</strong> {fmt(appointment.depositAmount)}</p>
          <p><strong>Balance:</strong> {fmt(appointment.balanceDue)}</p>
        </div>
      </div>
    </div>
  );
}
