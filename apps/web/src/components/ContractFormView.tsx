import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export function ContractFormView({ appointmentId }: { appointmentId: string }) {
  const [formData, setFormData] = useState<any>(null);
  const [reconciled, setReconciled] = useState(true);
  const [loading, setLoading] = useState(false);

  const autoFill = async () => {
    setLoading(true);
    try {
      const result = await api.post(`/forms/auto-fill/contract/${appointmentId}`, {});
      setFormData(result.formData);
      setReconciled(result.reconciled);
    } catch (err) {
      console.error('Auto-fill failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { autoFill(); }, [appointmentId]);
  const upd = (f: string, v: any) => setFormData({ ...formData, [f]: v });
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const generatePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;
    const lm = 14;

    doc.setFontSize(18);
    doc.text('WINDOW AND PATIO DOOR CONTRACT', 105, y, { align: 'center' });
    y += 12;

    doc.setFontSize(10);
    doc.text(`Customer: ${formData.customerName}`, lm, y); y += 6;
    doc.text(`Address: ${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`, lm, y); y += 6;
    doc.text(`Email: ${formData.email}    Customer ID: ${formData.customerId}`, lm, y); y += 6;
    doc.text(`Phone: ${formData.phone}    Phone 2: ${formData.phone2 || ''}`, lm, y); y += 10;

    // Job scope
    doc.setFontSize(11);
    doc.text('JOB SCOPE', lm, y); y += 6;
    doc.setFontSize(9);
    doc.text(`Complete Job: ${formData.completeJob ? 'YES' : 'NO'}    Total Windows/Doors: ${formData.totalWindows}`, lm, y); y += 5;
    doc.text(`Double Hung: ${formData.doubleHungQty}    Other Style: ${formData.otherStyleQty}    Specialty: ${formData.specialtyQty}    Doors: ${formData.doorQty}`, lm, y); y += 5;
    doc.text(`Options: ${formData.optionsQty}`, lm, y); y += 10;

    // Pre-1978
    if (formData.preLead1978) {
      doc.setTextColor(200, 0, 0);
      doc.text('⚠ PRE-1978 HOME — LEAD CONTAINMENT PROCEDURES APPLY', lm, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
    }

    // Line items
    if (formData.lineItems?.length > 0) {
      doc.setFontSize(11);
      doc.text('LINE ITEMS', lm, y); y += 6;
      doc.setFontSize(8);
      doc.text('Description                              Category    Qty    Unit Price    Total', lm, y); y += 5;
      for (const li of formData.lineItems) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.text(`${(li.label || '').padEnd(40).slice(0, 40)} ${(li.category || '').padEnd(12).slice(0, 12)}${String(li.quantity).padEnd(7)}${fmt(li.unitPrice).padStart(12)}    ${fmt(li.totalPrice)}`, lm, y);
        y += 4;
      }
      y += 6;
    }

    // Pricing summary
    doc.setFontSize(11);
    doc.text('PRICING SUMMARY', lm, y); y += 8;
    doc.setFontSize(10);
    doc.text(`Total List Price:           ${fmt(formData.totalListPrice)}`, lm, y); y += 6;
    if (formData.discount > 0) {
      doc.text(`Discount:                   -${fmt(formData.discount)}`, lm, y); y += 6;
    }
    doc.text(`Administrative/Setup Fee:    ${fmt(formData.adminSetupFee)}`, lm, y); y += 6;
    doc.text(`Sales Tax (${(formData.salesTaxRate * 100).toFixed(2)}%):        ${fmt(formData.salesTaxAmount)}`, lm, y); y += 6;
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT:               ${fmt(formData.totalAmount)}`, lm, y); y += 8;
    doc.setFontSize(10);
    doc.text(`Custom Order Deposit:        ${fmt(formData.customOrderDeposit)}`, lm, y); y += 6;
    doc.text(`Balance Paid to Installer:   ${fmt(formData.balancePaidToInstaller)}`, lm, y); y += 6;
    doc.text(`Amount Financed:             ${fmt(formData.amountFinanced)}`, lm, y); y += 12;

    // Signatures
    doc.text('Customer Signature: _________________________    Date: __________', lm, y); y += 10;
    doc.text('Co-Buyer Signature: _________________________    Date: __________', lm, y); y += 10;
    doc.text('Estimator Signature: ________________________    Date: __________', lm, y); y += 10;
    doc.text(`Estimator: ${formData.estimator}    Date: ${formData.estimatorDate}`, lm, y);

    doc.save(`Contract_${formData.customerName.replace(/ /g, '_')}.pdf`);
  };

  if (!formData) return <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>{loading ? '⏳ Auto-filling contract...' : 'Click to auto-fill contract'}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>📜 Window & Patio Door Contract</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={autoFill}>🔄 Refresh</button>
          <button className="btn btn-primary" onClick={generatePDF}>📄 Export PDF</button>
        </div>
      </div>

      {!reconciled && (
        <div className="warning-list" style={{ marginBottom: '1rem' }}>
          <li className="warning-item">⚠ PRICING MISMATCH — Opening totals do not match appointment subtotal. Review before finalizing.</li>
        </div>
      )}

      {/* Customer Info */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Customer Information</h3>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}><label className="form-label">Customer Name</label><input className="form-input" value={formData.customerName} onChange={e => upd('customerName', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Customer ID</label><input className="form-input" value={formData.customerId} onChange={e => upd('customerId', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}><label className="form-label">Address</label><input className="form-input" value={formData.address} onChange={e => upd('address', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">City</label><input className="form-input" value={formData.city} onChange={e => upd('city', e.target.value)} /></div>
          <div className="form-group" style={{ width: 60 }}><label className="form-label">ST</label><input className="form-input" value={formData.state} onChange={e => upd('state', e.target.value)} /></div>
          <div className="form-group" style={{ width: 80 }}><label className="form-label">Zip</label><input className="form-input" value={formData.zip} onChange={e => upd('zip', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={formData.email} onChange={e => upd('email', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={formData.phone} onChange={e => upd('phone', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Phone 2</label><input className="form-input" value={formData.phone2} onChange={e => upd('phone2', e.target.value)} /></div>
        </div>
      </div>

      {/* Job Scope */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Job Scope</h3>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Complete Job</label><select className="form-select" value={formData.completeJob ? 'yes' : 'no'} onChange={e => upd('completeJob', e.target.value === 'yes')}><option value="yes">Yes</option><option value="no">No - Remaining windows</option></select></div>
          <div className="form-group"><label className="form-label">Total Windows/Doors</label><input className="form-input" readOnly value={formData.totalWindows} style={{ background: 'var(--bg-card)', fontWeight: 700 }} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}><strong>{formData.doubleHungQty}</strong><br /><small>Double Hung</small></div>
          <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}><strong>{formData.otherStyleQty}</strong><br /><small>Other Style</small></div>
          <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}><strong>{formData.specialtyQty}</strong><br /><small>Specialty</small></div>
          <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}><strong>{formData.doorQty}</strong><br /><small>Doors</small></div>
        </div>
        {formData.preLead1978 && (
          <div className="warning-list" style={{ marginTop: '0.75rem' }}>
            <li className="warning-item">⚠ PRE-1978 HOME — Lead paint containment procedures required</li>
          </div>
        )}
      </div>

      {/* Pricing Summary */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Pricing Summary</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total List Price</span>
            <input className="form-input" type="number" step="0.01" style={{ width: 140, textAlign: 'right' }} value={formData.totalListPrice} onChange={e => upd('totalListPrice', +e.target.value)} />
          </div>
          {formData.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Discount</span><span>-{fmt(formData.discount)}</span>
          </div>}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Administrative/Setup Fee</span>
            <input className="form-input" type="number" step="0.01" style={{ width: 140, textAlign: 'right' }} value={formData.adminSetupFee} onChange={e => upd('adminSetupFee', +e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sales Tax ({(formData.salesTaxRate * 100).toFixed(2)}%)</span><span>{fmt(formData.salesTaxAmount)}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '2px solid var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800 }}>
            <span>TOTAL AMOUNT</span><span style={{ color: 'var(--success)' }}>{fmt(formData.totalAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Custom Order Deposit</span>
            <input className="form-input" type="number" step="0.01" style={{ width: 140, textAlign: 'right' }} value={formData.customOrderDeposit} onChange={e => upd('customOrderDeposit', +e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Balance Paid to Installer</span><span style={{ color: 'var(--warning)', fontWeight: 700 }}>{fmt(formData.balancePaidToInstaller)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Amount Financed</span>
            <input className="form-input" type="number" step="0.01" style={{ width: 140, textAlign: 'right' }} value={formData.amountFinanced} onChange={e => upd('amountFinanced', +e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
