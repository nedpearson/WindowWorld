import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export function PricingAdminPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [newItem, setNewItem] = useState<any>(null);

  const load = () => { api.getPricingTables().then(setTables).catch(console.error); };
  useEffect(() => { load(); }, []);

  const fmt = (n: number) => `$${(n || 0).toFixed(2)}`;

  const saveItem = async (item: any) => {
    try {
      await api.updatePricingItem(item.id, {
        label: item.label, price: item.price, unitedInchesMin: item.unitedInchesMin,
        unitedInchesMax: item.unitedInchesMax, needsVerification: item.needsVerification,
        priceType: item.priceType, productCategory: item.productCategory, seriesModel: item.seriesModel,
      });
      load();
    } catch {}
  };

  const addItem = async () => {
    if (!newItem) return;
    try { await api.createPricingItem(newItem); setNewItem(null); load(); } catch {}
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this pricing item?')) return;
    await api.deletePricingItem(id);
    load();
  };

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '1.5rem' }}>💰 Pricing Administration</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Edit pricing tables below. Items marked ⚠ NEEDS_VERIFICATION were estimated from source documents and should be confirmed.
      </p>

      {tables.map(table => (
        <div key={table.id} className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div>
              <h2>{table.name}</h2>
              <span className="badge badge-progress" style={{ marginTop: '0.25rem' }}>{table.category}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setNewItem({ pricingTableId: table.id, label: '', price: 0, needsVerification: true, priceType: 'flat', sortOrder: (table.items?.length || 0) })}>
              + Add Item
            </button>
          </div>

          {table.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{table.description}</p>}

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th>Label</th><th>UI Min</th><th>UI Max</th><th>Price</th><th>Type</th><th>⚠</th><th></th>
              </tr></thead>
              <tbody>
                {(table.items || []).map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      {editing?.id === item.id ? (
                        <input className="form-input" value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} style={{ minWidth: 150 }} />
                      ) : item.label}
                    </td>
                    <td>
                      {editing?.id === item.id ? (
                        <input className="form-input" type="number" value={editing.unitedInchesMin ?? ''} onChange={e => setEditing({ ...editing, unitedInchesMin: e.target.value ? +e.target.value : null })} style={{ width: 70 }} />
                      ) : item.unitedInchesMin ?? '—'}
                    </td>
                    <td>
                      {editing?.id === item.id ? (
                        <input className="form-input" type="number" value={editing.unitedInchesMax ?? ''} onChange={e => setEditing({ ...editing, unitedInchesMax: e.target.value ? +e.target.value : null })} style={{ width: 70 }} />
                      ) : item.unitedInchesMax ?? '—'}
                    </td>
                    <td>
                      {editing?.id === item.id ? (
                        <input className="form-input" type="number" step="0.01" value={editing.price} onChange={e => setEditing({ ...editing, price: +e.target.value })} style={{ width: 90 }} />
                      ) : fmt(item.price)}
                    </td>
                    <td>{item.priceType}</td>
                    <td>{item.needsVerification && <span className="needs-verify">⚠ VERIFY</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {editing?.id === item.id ? (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => { saveItem(editing); setEditing(null); }}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)} style={{ marginLeft: '0.25rem' }}>✕</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditing({ ...item })}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)} style={{ marginLeft: '0.25rem' }}>×</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* New item modal */}
      {newItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setNewItem(null)}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 480, padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Add Pricing Item</h2>
            <div className="form-group"><label className="form-label">Label</label><input className="form-input" value={newItem.label} onChange={e => setNewItem({ ...newItem, label: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Price</label><input className="form-input" type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: +e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Price Type</label>
                <select className="form-select" value={newItem.priceType} onChange={e => setNewItem({ ...newItem, priceType: e.target.value })}>
                  <option value="flat">Flat</option><option value="per_unit">Per Unit</option><option value="per_sqft">Per SqFt</option><option value="per_linft">Per LnFt</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">UI Min</label><input className="form-input" type="number" value={newItem.unitedInchesMin ?? ''} onChange={e => setNewItem({ ...newItem, unitedInchesMin: e.target.value ? +e.target.value : null })} /></div>
              <div className="form-group"><label className="form-label">UI Max</label><input className="form-input" type="number" value={newItem.unitedInchesMax ?? ''} onChange={e => setNewItem({ ...newItem, unitedInchesMax: e.target.value ? +e.target.value : null })} /></div>
            </div>
            <div className="form-check"><input type="checkbox" checked={newItem.needsVerification} onChange={e => setNewItem({ ...newItem, needsVerification: e.target.checked })} /><label>Needs Verification</label></div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={addItem} disabled={!newItem.label}>Add Item</button>
              <button className="btn btn-secondary" onClick={() => setNewItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
