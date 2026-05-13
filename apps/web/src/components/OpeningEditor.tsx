import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { learnFromOpening } from '../utils/repMemory';
import { SmartSuggestionBar, ConfigPicker, RoomAutocomplete, InstallNoteSuggestions } from './SmartSuggestions';
import { QuickWxH, SameAsPrevious, QuickAddMultiple } from './QuickMeasure';

const CATEGORIES = ['double_hung','picture','slider','casement','awning','eyebrow','circle_top','quarter_arch','patio_door','custom_shape'];
const ELEVATIONS = ['front','rear','left','right','garage','other'];
const COLORS = ['White','Almond','Clay','Bronze','Black','Dark Chocolate','Forest Green'];
const GRID_STYLES = ['None','Colonial','Prairie','Diamond','Perimeter'];
const GLASS_PKG = ['Clear','SolarZone','SolarZone Elite'];
const REMOVAL = ['full_tearout','insert','none'];
const SPECIALTY = ['eyebrow','circle_top','quarter_arch','custom_shape'];

const empty = (appointmentId: string, num: number) => ({
  appointmentId, openingNumber: num, quantity: 1, roomLocation: '', elevation: 'front', floorNumber: 1, width: 0, height: 0,
  productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White',
  gridStyle: 'None', gridPattern: '', glassPackage: 'SolarZone', temperedGlass: 'none', obscureGlass: 'none',
  argon: false, foamEnhanced: false, nailFin: false, oriel: false, horizontalRR: false, sillRepair: false,
  lowEPackage: '', screenOption: 'Standard', trimNotes: '', hinge: '',
  removalType: 'full_tearout', installType: '', installNotes: '', customerNotes: '', installerNotes: '',
  basePrice: 0, optionsPrice: 0, laborPrice: 0, totalPrice: 0,
  radius: null, customRadius: null, legHeight: null, specialtyNotes: '', needsVerification: false
});

export function OpeningEditor({ appointmentId, onUpdate }: { appointmentId: string; onUpdate: () => void }) {
  const [openings, setOpenings] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await api.getOpenings(appointmentId);
    setOpenings(data);
  };

  useEffect(() => { load(); }, [appointmentId]);

  const addOpening = () => {
    const num = openings.length + 1;
    setEditing(empty(appointmentId, num));
  };

  const saveOpening = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await api.updateOpening(editing.id, editing);
      } else {
        await api.createOpening(editing);
      }
      // Learn from saved opening
      learnFromOpening(editing);
      setEditing(null);
      await load();
      onUpdate();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const deleteOpening = async (id: string) => {
    if (!confirm('Delete this opening?')) return;
    await api.deleteOpening(id);
    await load();
    onUpdate();
  };

  // Bulk update handler for smart suggestions
  const handleBulkUpdate = async (field: string, value: any, targets: 'all' | 'remaining') => {
    for (const op of openings) {
      if (targets === 'remaining' && op[field] === value) continue;
      if (!op.id) continue;
      try {
        await api.updateOpening(op.id, { [field]: value });
      } catch {}
    }
    await load();
    onUpdate();
  };

  const upd = (f: string, v: any) => setEditing({ ...editing, [f]: v });
  const isSpecialty = editing && SPECIALTY.includes(editing.productCategory);

  const specWarnings = () => {
    if (!editing || !isSpecialty) return [];
    const w: string[] = [];
    const cat = editing.productCategory;
    if (cat === 'circle_top' && editing.width < 12) w.push('Circle top minimum width is 12"');
    if (cat === 'eyebrow' && editing.height < 8) w.push('Eyebrow minimum height is 8"');
    if (cat === 'quarter_arch' && !editing.radius && editing.width) w.push('Quarter arch needs a radius');
    if ((cat === 'circle_top' || cat === 'eyebrow') && !editing.radius) w.push('Radius is required');
    return w;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2>🪟 Openings ({openings.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <QuickAddMultiple onAdd={async (count, template) => {
            for (let i = 0; i < count; i++) {
              const num = openings.length + i + 1;
              try { await api.createOpening({ ...empty(appointmentId, num), ...template }); } catch {}
            }
            await load(); onUpdate();
          }} />
          <button className="btn btn-primary" onClick={addOpening}>+ Add Opening</button>
        </div>
      </div>

      {/* ═══ SMART SUGGESTION BAR ═══ */}
      {openings.length >= 2 && (
        <SmartSuggestionBar openings={openings} onBulkUpdate={handleBulkUpdate} />
      )}

      {/* Opening list */}
      {openings.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>#</th><th>Room</th><th>Elev</th><th>W×H</th><th>UI</th><th>Product</th><th>Series</th><th>Price</th><th></th>
            </tr></thead>
            <tbody>
              {openings.map((o: any) => (
                <tr key={o.id}>
                  <td><strong>{o.openingNumber}</strong></td>
                  <td>{o.roomLocation || '—'}</td>
                  <td>{o.elevation || '—'}</td>
                  <td>{o.width}" × {o.height}"</td>
                  <td><strong>{o.unitedInches}"</strong></td>
                  <td>{o.productCategory?.replace('_', ' ')}</td>
                  <td>{o.seriesModel}</td>
                  <td>
                    ${o.totalPrice?.toFixed(2)}
                    {o.needsVerification && <span className="needs-verify" style={{ marginLeft: '0.375rem' }}>⚠</span>}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(o)} style={{ marginRight: '0.375rem' }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteOpening(o.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openings.length === 0 && !editing && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>No openings yet</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={addOpening}>Add First Opening</button>
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '0.75rem' }}>Opening #{editing.openingNumber}</h2>

            {/* ═══ SAME AS PREVIOUS ═══ */}
            <SameAsPrevious
              previousOpening={openings.find((o: any) => o.openingNumber === editing.openingNumber - 1) || null}
              currentOpening={editing}
              onApply={(fields) => setEditing({ ...editing, ...fields })}
            />

            {/* ═══ CONFIG PICKER ═══ */}
            <ConfigPicker
              currentOpening={editing}
              onApply={(fields) => setEditing({ ...editing, ...fields })}
            />

            {/* Specialty warnings */}
            {specWarnings().length > 0 && (
              <ul className="warning-list" style={{ marginBottom: '1rem' }}>
                {specWarnings().map((w, i) => <li key={i} className="warning-item">⚠ {w}</li>)}
              </ul>
            )}

            {/* Basic info — with Room autocomplete */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Room / Location</label>
                <RoomAutocomplete value={editing.roomLocation || ''} onChange={(v) => upd('roomLocation', v)} />
              </div>
              <div className="form-group"><label className="form-label">Elevation</label>
                <select className="form-select" value={editing.elevation || ''} onChange={e => upd('elevation', e.target.value)}>
                  {ELEVATIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Floor</label>
                <select className="form-select" value={editing.floorNumber || 1} onChange={e => upd('floorNumber', +e.target.value)}>
                  {[1,2,3].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* ═══ QUICK MEASUREMENT ENTRY ═══ */}
            <QuickWxH
              width={editing.width || 0}
              height={editing.height || 0}
              onWidthChange={(v) => upd('width', v)}
              onHeightChange={(v) => upd('height', v)}
              productCategory={editing.productCategory || 'double_hung'}
            />

            {/* Product */}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Product Category</label>
                <select className="form-select" value={editing.productCategory || ''} onChange={e => upd('productCategory', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Series / Model</label>
                <select className="form-select" value={editing.seriesModel || ''} onChange={e => upd('seriesModel', e.target.value)}>
                  {['4000 Series','6000 Series','Custom'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Colors */}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Interior Color</label>
                <select className="form-select" value={editing.interiorColor || ''} onChange={e => upd('interiorColor', e.target.value)}>
                  {COLORS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Exterior Color</label>
                <select className="form-select" value={editing.exteriorColor || ''} onChange={e => upd('exteriorColor', e.target.value)}>
                  {COLORS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Grid & Glass */}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Grid Style</label>
                <select className="form-select" value={editing.gridStyle || ''} onChange={e => upd('gridStyle', e.target.value)}>
                  {GRID_STYLES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Grid Pattern</label><input className="form-input" value={editing.gridPattern || ''} onChange={e => upd('gridPattern', e.target.value)} placeholder="e.g. 2x2" /></div>
              <div className="form-group"><label className="form-label">Glass Package</label>
                <select className="form-select" value={editing.glassPackage || ''} onChange={e => upd('glassPackage', e.target.value)}>
                  {GLASS_PKG.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', margin: '0.75rem 0' }}>
              <div className="form-group" style={{ minWidth: 120 }}><label className="form-label">Tempered</label>
                <select className="form-select" value={editing.temperedGlass || 'none'} onChange={e => upd('temperedGlass', e.target.value)}>
                  <option value="none">None</option><option value="full">Full</option><option value="half">Half</option>
                </select>
              </div>
              <div className="form-group" style={{ minWidth: 120 }}><label className="form-label">Obscure</label>
                <select className="form-select" value={editing.obscureGlass || 'none'} onChange={e => upd('obscureGlass', e.target.value)}>
                  <option value="none">None</option><option value="full">Full</option><option value="half">Half</option>
                </select>
              </div>
              <div className="form-check"><input type="checkbox" checked={editing.argon} onChange={e => upd('argon', e.target.checked)} /><label>Argon</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.foamEnhanced} onChange={e => upd('foamEnhanced', e.target.checked)} /><label>Foam Enhanced</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.nailFin} onChange={e => upd('nailFin', e.target.checked)} /><label>Nail Fin</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.oriel} onChange={e => upd('oriel', e.target.checked)} /><label>Oriel</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.horizontalRR} onChange={e => upd('horizontalRR', e.target.checked)} /><label>H R&R</label></div>
              <div className="form-check"><input type="checkbox" checked={editing.sillRepair} onChange={e => upd('sillRepair', e.target.checked)} /><label>Sill Repair</label></div>
            </div>

            {/* Specialty fields */}
            {isSpecialty && (
              <div className="card" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)', marginTop: '0.75rem' }}>
                <h3 style={{ color: 'var(--warning)', marginBottom: '0.75rem' }}>🔷 Specialty Shape Details</h3>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Radius</label><input className="form-input" type="number" value={editing.radius || ''} onChange={e => upd('radius', +e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Custom Radius</label><input className="form-input" type="number" value={editing.customRadius || ''} onChange={e => upd('customRadius', +e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Leg Height</label><input className="form-input" type="number" value={editing.legHeight || ''} onChange={e => upd('legHeight', +e.target.value)} /></div>
                </div>
                <div className="form-group"><label className="form-label">Specialty Notes</label><textarea className="form-textarea" value={editing.specialtyNotes || ''} onChange={e => upd('specialtyNotes', e.target.value)} /></div>
              </div>
            )}

            {/* Installation */}
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <div className="form-group"><label className="form-label">Removal Type</label>
                <select className="form-select" value={editing.removalType || ''} onChange={e => upd('removalType', e.target.value)}>
                  {REMOVAL.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Screen</label>
                <select className="form-select" value={editing.screenOption || ''} onChange={e => upd('screenOption', e.target.value)}>
                  {['Standard','Retractable','None'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <div className="form-group"><label className="form-label">Base Price</label><input className="form-input" type="number" step="0.01" value={editing.basePrice || ''} onChange={e => upd('basePrice', +e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Options Price</label><input className="form-input" type="number" step="0.01" value={editing.optionsPrice || ''} onChange={e => upd('optionsPrice', +e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Labor Price</label><input className="form-input" type="number" step="0.01" value={editing.laborPrice || ''} onChange={e => upd('laborPrice', +e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Total Price</label><input className="form-input" type="number" step="0.01" value={editing.totalPrice || ''} onChange={e => upd('totalPrice', +e.target.value)} /></div>
            </div>

            {/* Notes with smart suggestions */}
            <div className="form-group"><label className="form-label">Trim / Sill / Jamb Notes</label><input className="form-input" value={editing.trimNotes || ''} onChange={e => upd('trimNotes', e.target.value)} /></div>
            <div className="form-group">
              <label className="form-label">Install Notes</label>
              <textarea className="form-textarea" value={editing.installNotes || ''} onChange={e => upd('installNotes', e.target.value)} />
              {/* ═══ SMART NOTE SUGGESTIONS ═══ */}
              <InstallNoteSuggestions opening={editing} onAppend={(note) => {
                const existing = editing.installNotes || '';
                upd('installNotes', existing ? `${existing}\n${note}` : note);
              }} />
            </div>

            <div className="form-check" style={{ marginTop: '0.5rem' }}>
              <input type="checkbox" checked={editing.needsVerification} onChange={e => upd('needsVerification', e.target.checked)} />
              <label style={{ color: 'var(--warning)' }}>⚠ Needs Verification</label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={saveOpening} disabled={saving}>{saving ? 'Saving...' : 'Save Opening'}</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
