import { useState } from 'react';

export function PricingReview({ appointment, onRecalculate, onSave }: { appointment: any; onRecalculate: () => void; onSave: (u: any) => void }) {
  const [a, setA] = useState(appointment);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const upd = (f: string, v: any) => { const n = { ...a, [f]: v }; setA(n); };
  const save = () => onSave({ taxRate: a.taxRate, adminFee: a.adminFee, discount: a.discount, depositAmount: a.depositAmount, financingAmount: a.financingAmount });

  const openingsTotal = (appointment.openings || []).reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
  const lineItemsTotal = (appointment.lineItems || []).reduce((s: number, li: any) => s + (li.totalPrice || 0), 0);
  const subtotal = openingsTotal + lineItemsTotal;
  const discounted = subtotal - (a.discount || 0);
  const tax = discounted * (a.taxRate || 0);
  const total = discounted + tax + (a.adminFee || 0);
  const balance = total - (a.depositAmount || 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>💰 Pricing Review</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { onRecalculate(); save(); }}>🔄 Recalculate</button>
      </div>

      {/* Opening summary */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Openings Summary</h3>
        <table className="data-table">
          <thead><tr><th>#</th><th>Room</th><th>Product</th><th>UI</th><th>Price</th><th>⚠</th></tr></thead>
          <tbody>
            {(appointment.openings || []).map((o: any) => (
              <tr key={o.id}>
                <td>{o.openingNumber}</td>
                <td>{o.roomLocation || '—'}</td>
                <td>{o.productCategory?.replace(/_/g, ' ')}</td>
                <td>{o.unitedInches}"</td>
                <td>{fmt(o.totalPrice)}</td>
                <td>{o.needsVerification && <span className="needs-verify">NEEDS_VERIFICATION</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Openings Subtotal</td><td colSpan={2} style={{ fontWeight: 700 }}>{fmt(openingsTotal)}</td></tr>
          </tfoot>
        </table>
      </div>

      {/* Totals */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Quote Totals</h3>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Openings Subtotal</span><span>{fmt(openingsTotal)}</span>
          </div>
          {lineItemsTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Line Items</span><span>{fmt(lineItemsTotal)}</span>
          </div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Discount</span>
            <input className="form-input" type="number" step="0.01" style={{ width: 120, textAlign: 'right' }}
              value={a.discount || ''} onChange={e => upd('discount', +e.target.value)} onBlur={save} />
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal (after discount)</span><span>{fmt(discounted)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Tax Rate</span>
            <input className="form-input" type="number" step="0.0001" style={{ width: 100, textAlign: 'right' }}
              value={a.taxRate || ''} onChange={e => upd('taxRate', +e.target.value)} onBlur={save} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tax Amount</span><span>{fmt(tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Admin/Setup Fee</span>
            <input className="form-input" type="number" step="0.01" style={{ width: 120, textAlign: 'right' }}
              value={a.adminFee || ''} onChange={e => upd('adminFee', +e.target.value)} onBlur={save} />
          </div>
          <hr style={{ border: 'none', borderTop: '2px solid var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800 }}>
            <span>Total</span><span style={{ color: 'var(--success)' }}>{fmt(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Deposit</span>
            <input className="form-input" type="number" step="0.01" style={{ width: 120, textAlign: 'right' }}
              value={a.depositAmount || ''} onChange={e => upd('depositAmount', +e.target.value)} onBlur={save} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Financing</span>
            <input className="form-input" type="number" step="0.01" style={{ width: 120, textAlign: 'right' }}
              value={a.financingAmount || ''} onChange={e => upd('financingAmount', +e.target.value)} onBlur={save} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 700 }}>
            <span>Balance Due</span><span style={{ color: balance > 0 ? 'var(--warning)' : 'var(--success)' }}>{fmt(balance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
