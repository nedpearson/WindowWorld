import { api } from '../utils/api';

export function ContractExport({ appointment }: { appointment: any }) {
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
  const c = appointment.customer;
  const openings = appointment.openings || [];

  const generatePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Window World — Contract / Order Form', 14, y);
    y += 12;

    // Customer
    doc.setFontSize(11);
    doc.text(`Customer: ${c.firstName} ${c.lastName}`, 14, y); y += 6;
    doc.text(`Phone: ${c.phone || 'N/A'}  |  Email: ${c.email || 'N/A'}`, 14, y); y += 6;
    doc.text(`Job Address: ${appointment.jobAddress || 'N/A'}`, 14, y); y += 6;
    doc.text(`Date: ${appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'N/A'}`, 14, y);
    y += 10;

    // Openings table
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

    // Totals
    doc.setFontSize(11);
    doc.text(`Subtotal: ${fmt(appointment.subtotal)}`, 14, y); y += 6;
    doc.text(`Tax (${(appointment.taxRate * 100).toFixed(2)}%): ${fmt(appointment.taxAmount)}`, 14, y); y += 6;
    doc.text(`Total: ${fmt(appointment.totalAmount)}`, 14, y); y += 6;
    doc.text(`Deposit: ${fmt(appointment.depositAmount)}`, 14, y); y += 6;
    doc.text(`Balance Due: ${fmt(appointment.balanceDue)}`, 14, y); y += 12;

    // Signature lines
    doc.text('Customer Signature: _________________________  Date: __________', 14, y); y += 10;
    doc.text('Estimator Signature: ________________________  Date: __________', 14, y); y += 10;

    // Notes
    if (appointment.estimatorNotes) {
      doc.text(`Estimator Notes: ${appointment.estimatorNotes}`, 14, y); y += 8;
    }
    if (appointment.installerNotes) {
      doc.text(`Installer Notes: ${appointment.installerNotes}`, 14, y); y += 8;
    }

    doc.save(`${c.lastName}_${c.firstName}_Contract.pdf`);
  };

  const exportJSON = async () => {
    const data = await api.exportJSON(appointment.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${c.lastName}_quote.json`; a.click();
  };

  const exportCSV = async () => {
    const csv = await api.exportCSV(appointment.id);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${c.lastName}_openings.csv`; a.click();
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>📄 Contract & Export</h2>

      <div className="card-grid">
        <div className="card" style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }} onClick={generatePDF}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
          <h3>Generate PDF Contract</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Printable contract packet with all details
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }} onClick={exportCSV}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
          <h3>Export CSV</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Opening schedule spreadsheet
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }} onClick={exportJSON}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💾</div>
          <h3>Export JSON Backup</h3>
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
