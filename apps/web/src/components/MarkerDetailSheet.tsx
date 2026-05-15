// ═══════════════════════════════════════════════════════════════
// Marker Detail Sheet — Mobile Bottom Sheet
// Inline opening configuration when tapping a sketch marker.
// Includes: measurements, product, colors, glass, install, tempered.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { SketchMarkerData, WindowType, ShapeType } from '../utils/sketchSync';
import { calcUnitedInches, checkTubShowerRule, checkLowGlassRule, calculateGlassArea } from '../utils/sketchSync';
import { WW_OPENING_DEFAULTS } from '../utils/openingDefaults';

const WINDOW_TYPES: { value: WindowType; label: string; icon: string }[] = [
  { value: 'double_hung', label: 'Double Hung', icon: '🪟' },
  { value: 'picture', label: 'Picture', icon: '🖼️' },
  { value: 'slider', label: 'Slider', icon: '↔️' },
  { value: 'casement', label: 'Casement', icon: '🔲' },
  { value: 'awning', label: 'Awning', icon: '☂️' },
  { value: 'patio_door', label: 'Patio Door', icon: '🚪' },
  { value: 'bso', label: 'BSO', icon: '⬇️' },
  { value: 'special_shape', label: 'Special Shape', icon: '⬡' },
  { value: 'oriel', label: 'Oriel', icon: '🔲' },
  { value: 'door_sidelight', label: 'Door Sidelight', icon: '🚪' },
  { value: 'other', label: 'Other', icon: '❓' },
];

const SHAPE_TYPES: { value: ShapeType; label: string }[] = [
  { value: 'arch', label: 'Arch' },
  { value: 'eyebrow', label: 'Eyebrow' },
  { value: 'circle_top', label: 'Circle Top' },
  { value: 'quarter_arch', label: 'Quarter Arch' },
  { value: 'half_round', label: 'Half Round' },
  { value: 'extended_leg', label: 'Extended-Leg' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other' },
];

const ELEVATIONS = ['front', 'rear', 'left', 'right', 'garage', 'patio', 'other'];
const EXTERIOR_TYPES = ['Brick', 'Siding', 'Wood', 'Stucco', 'Other'];
const INTERIOR_COLORS = ['White', 'Almond', 'Clay', 'Woodgrain'];
const EXTERIOR_COLORS = ['White', 'Almond', 'Clay', 'Bronze', 'Black'];
const GRID_STYLES = ['None', 'Colonial', 'Prairie', 'Diamond'];
const GLASS_OPTIONS = ['LEE', 'Clear', 'SolarZone', 'SolarZone Elite'];
const SCREEN_OPTIONS = ['Full Screen', 'Half Screen', 'No Screen'];

interface MarkerDetailSheetProps {
  marker: SketchMarkerData;
  onUpdate: (updates: Partial<SketchMarkerData>) => void;
  onOpeningUpdate?: (fields: Record<string, any>) => void;
  onClose: () => void;
  onDelete: () => void;
  opening?: any;
}

export function MarkerDetailSheet({
  marker,
  onUpdate,
  onOpeningUpdate,
  onClose,
  onDelete,
  opening,
}: MarkerDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'measure' | 'product' | 'options' | 'install' | 'safety'>('measure');
  const [orielConfirmed, setOrielConfirmed] = useState(false);
  const [temperedAnswers, setTemperedAnswers] = useState({
    tubNearby: '' as string,
    tubDistance: '' as string,
    bottomHeight: '' as string,
  });

  const isOriel = marker.windowType === 'oriel';
  const isSpecialShape = marker.windowType === 'special_shape';
  const isPicture = marker.windowType === 'picture';
  const isPatioDoor = marker.windowType === 'patio_door';

  // Auto-set defaults based on window type
  useEffect(() => {
    if (isPicture && opening) {
      onOpeningUpdate?.({ screenOption: 'No Screen' });
    }
  }, [marker.windowType]);

  const handleDimensionChange = (field: 'width' | 'height', value: string) => {
    const num = parseFloat(value) || null;
    const updates: Partial<SketchMarkerData> = { [field]: num };
    const w = field === 'width' ? num : marker.width;
    const h = field === 'height' ? num : marker.height;
    if (w && h) {
      updates.unitedInches = calcUnitedInches(w, h);
      updates.validationStatus = 'measured';
    }
    onUpdate(updates);
  };

  const ui = calcUnitedInches(marker.width || 0, marker.height || 0);
  const glassArea = calculateGlassArea(marker.width || 0, marker.height || 0);
  const tubRule = checkTubShowerRule(
    parseFloat(temperedAnswers.tubDistance) || null,
    temperedAnswers.tubNearby || null,
  );
  const lowGlassRule = checkLowGlassRule(
    parseFloat(temperedAnswers.bottomHeight) || null,
    glassArea,
  );

  const TABS = [
    { id: 'measure', label: '📐 Measure', icon: '📐' },
    { id: 'product', label: '🪟 Product', icon: '🪟' },
    { id: 'options', label: '⚙️ Options', icon: '⚙️' },
    { id: 'install', label: '🔧 Install', icon: '🔧' },
    { id: 'safety', label: '🛡️ Safety', icon: '🛡️' },
  ] as const;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--bg-card, #1e1e2e)',
      borderTop: '3px solid var(--accent, #3b82f6)',
      borderRadius: '16px 16px 0 0',
      maxHeight: '70vh',
      overflowY: 'auto',
      zIndex: 1000,
      padding: '0.75rem',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.25s ease-out',
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            {marker.markerLabel || `X #${marker.markerNumber}`}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {marker.elevation?.toUpperCase()} elevation
            {marker.width && marker.height ? ` · ${marker.width}×${marker.height} · UI: ${ui}` : ' · No measurements'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button onClick={onDelete} style={deleteBtnStyle}>🗑</button>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.75rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap',
              background: activeTab === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
              color: activeTab === t.id ? '#fff' : 'var(--text-muted)',
            }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: Measure ──────────────────────────────────── */}
      {activeTab === 'measure' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <FieldGroup label="Width (in)">
              <input type="number" step="0.125" value={marker.width || ''}
                onChange={e => handleDimensionChange('width', e.target.value)}
                placeholder="35.375" className="form-input" autoFocus />
            </FieldGroup>
            <FieldGroup label="Height (in)">
              <input type="number" step="0.125" value={marker.height || ''}
                onChange={e => handleDimensionChange('height', e.target.value)}
                placeholder="59.875" className="form-input" />
            </FieldGroup>
          </div>
          {ui > 0 && (
            <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: 8, textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6' }}>United Inches: {ui}</span>
            </div>
          )}
          <FieldGroup label="Room / Location">
            <input className="form-input" value={marker.roomLocation || ''}
              onChange={e => onUpdate({ roomLocation: e.target.value })}
              placeholder="e.g. Living Room, Master Bath" />
          </FieldGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <FieldGroup label="Elevation">
              <select className="form-input" value={marker.elevation || 'front'}
                onChange={e => onUpdate({ elevation: e.target.value })}>
                {ELEVATIONS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Floor">
              <select className="form-input" value={marker.floorNumber || 1}
                onChange={e => onUpdate({ floorNumber: parseInt(e.target.value) })}>
                <option value={1}>1st Floor</option>
                <option value={2}>2nd Floor (Clear Story)</option>
                <option value={3}>3rd Floor</option>
              </select>
            </FieldGroup>
          </div>
          {(marker.floorNumber || 1) >= 2 && (
            <div style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: '0.75rem', color: '#f59e0b' }}>
              ⚠️ Clear story / upper floor — ladder access required. First = $225, additional = $75.
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Product ──────────────────────────────────── */}
      {activeTab === 'product' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <FieldGroup label="Window Type">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
              {WINDOW_TYPES.map(wt => (
                <button key={wt.value} onClick={() => onUpdate({ windowType: wt.value })}
                  style={{
                    padding: '0.4rem', borderRadius: 8, border: '2px solid',
                    borderColor: marker.windowType === wt.value ? '#3b82f6' : 'var(--border)',
                    background: marker.windowType === wt.value ? 'rgba(59,130,246,0.1)' : 'transparent',
                    cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                    color: marker.windowType === wt.value ? '#3b82f6' : 'var(--text-secondary)',
                    textAlign: 'center',
                  }}>
                  <div style={{ fontSize: '1rem' }}>{wt.icon}</div>
                  {wt.label}
                </button>
              ))}
            </div>
          </FieldGroup>

          {isSpecialShape && (
            <FieldGroup label="Shape Type">
              <select className="form-input" value={marker.shapeType || ''}
                onChange={e => onUpdate({ shapeType: e.target.value as ShapeType })}>
                <option value="">Select shape...</option>
                {SHAPE_TYPES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
              </select>
            </FieldGroup>
          )}

          {isOriel && (
            <div style={{ padding: '0.75rem', background: 'rgba(234,88,12,0.1)', border: '2px solid rgba(234,88,12,0.3)', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#ea580c', marginBottom: '0.375rem' }}>
                ⚠️ ORIEL MEASUREMENT RULE
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                For Oriel windows, measure the <strong>largest sash/window panel</strong>. 
                Enter the largest sash measurement as the width and height above.
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={orielConfirmed}
                  onChange={e => {
                    setOrielConfirmed(e.target.checked);
                    onOpeningUpdate?.({ orielConfirmed: e.target.checked });
                  }}
                  style={{ width: 20, height: 20, accentColor: '#22c55e' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: orielConfirmed ? '#22c55e' : '#ea580c' }}>
                  {orielConfirmed ? '✓ Largest sash measurement confirmed' : 'Confirm largest sash measurement used'}
                </span>
              </label>
            </div>
          )}

          <FieldGroup label="Model / Series">
            <input className="form-input" value={opening?.seriesModel || '4000 Series'}
              onChange={e => onOpeningUpdate?.({ seriesModel: e.target.value })} />
          </FieldGroup>
        </div>
      )}

      {/* ── TAB: Options ──────────────────────────────────── */}
      {activeTab === 'options' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <FieldGroup label="Interior Color">
              <select className="form-input" value={opening?.interiorColor || 'White'}
                onChange={e => onOpeningUpdate?.({ interiorColor: e.target.value })}>
                {INTERIOR_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Exterior Color">
              <select className="form-input" value={opening?.exteriorColor || 'White'}
                onChange={e => onOpeningUpdate?.({ exteriorColor: e.target.value })}>
                {EXTERIOR_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FieldGroup>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <FieldGroup label="Grid Style">
              <select className="form-input" value={opening?.gridStyle || 'None'}
                onChange={e => onOpeningUpdate?.({ gridStyle: e.target.value })}>
                {GRID_STYLES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Glass Option">
              <select className="form-input" value={opening?.glassPackage || WW_OPENING_DEFAULTS.glassPackage}
                onChange={e => onOpeningUpdate?.({ glassPackage: e.target.value })}>
                {GLASS_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </FieldGroup>
          </div>
          <FieldGroup label="Screen">
            <select className="form-input" value={opening?.screenOption || (isPicture ? 'No Screen' : 'Full Screen')}
              onChange={e => onOpeningUpdate?.({ screenOption: e.target.value })}>
              {SCREEN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FieldGroup>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <CheckItem label="Foam Enhanced" checked={opening?.foamEnhanced ?? true}
              onChange={v => onOpeningUpdate?.({ foamEnhanced: v })} />
            <CheckItem label="Nail Fin" checked={opening?.nailFin ?? false}
              onChange={v => onOpeningUpdate?.({ nailFin: v })} />
            <CheckItem label="Oriel" checked={opening?.oriel ?? isOriel}
              onChange={v => onOpeningUpdate?.({ oriel: v })} />
            <CheckItem label="Obscure Glass" checked={opening?.obscureGlass === 'standard'}
              onChange={v => onOpeningUpdate?.({ obscureGlass: v ? 'standard' : 'none' })} />
          </div>

          {isPicture && (opening?.screenOption || '').toLowerCase() !== 'no screen' && (
            <div style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: '0.75rem', color: '#f59e0b' }}>
              ⚠️ Picture windows normally have no screen. Confirm override is intentional.
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Install ──────────────────────────────────── */}
      {activeTab === 'install' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <FieldGroup label="Exterior Surface">
              <select className="form-input" value={marker.exteriorMaterial || ''}
                onChange={e => {
                  onUpdate({ exteriorMaterial: e.target.value });
                  // Auto-apply install type rule
                  const ext = e.target.value.toLowerCase();
                  if (ext === 'brick') {
                    onUpdate({ installType: 'EXT' });
                    onOpeningUpdate?.({ exteriorType: 'Brick', installType: 'EXT' });
                  } else if (ext === 'siding' || ext === 'wood') {
                    onUpdate({ installType: 'INT' });
                    onOpeningUpdate?.({ exteriorType: e.target.value, installType: 'INT', trimRequired: true, headerRequired: true });
                  } else {
                    onOpeningUpdate?.({ exteriorType: e.target.value });
                  }
                }}>
                <option value="">Select...</option>
                {EXTERIOR_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Type Removed">
              <input className="form-input" value={marker.removalType || WW_OPENING_DEFAULTS.removalType}
                onChange={e => {
                  onUpdate({ removalType: e.target.value });
                  onOpeningUpdate?.({ removalType: e.target.value });
                }} />
            </FieldGroup>
          </div>
          <FieldGroup label="Type Install">
            <input className="form-input" value={marker.installType || ''}
              onChange={e => {
                onUpdate({ installType: e.target.value });
                onOpeningUpdate?.({ installType: e.target.value });
              }}
              placeholder="EXT, INT, etc." />
          </FieldGroup>
          {(marker.exteriorMaterial || '').toLowerCase() === 'siding' || (marker.exteriorMaterial || '').toLowerCase() === 'wood' ? (
            <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: 8, fontSize: '0.75rem', color: '#3b82f6' }}>
              ⚡ Rule Applied: Siding/Wood → INT install. Vinyl trim + header required.
            </div>
          ) : null}
          <FieldGroup label="Install / Installer Notes">
            <textarea className="form-input" rows={3} value={opening?.installNotes || ''}
              onChange={e => onOpeningUpdate?.({ installNotes: e.target.value })}
              placeholder="Ladder access, sill repair, trim notes..." />
          </FieldGroup>
          <CheckItem label="Sill Repair" checked={opening?.sillRepair ?? false}
            onChange={v => onOpeningUpdate?.({ sillRepair: v })} />
        </div>
      )}

      {/* ── TAB: Safety / Tempered ────────────────────────── */}
      {activeTab === 'safety' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Answer these questions to determine tempered glass requirements.
          </div>

          {/* Tempered Rule A: Tub/Shower */}
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.375rem' }}>🛁 Rule A: Tub/Shower Proximity</div>
            <FieldGroup label="Is this window near a tub, shower, or wet area?">
              <select className="form-input" value={temperedAnswers.tubNearby}
                onChange={e => setTemperedAnswers(prev => ({ ...prev, tubNearby: e.target.value }))}>
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Unknown</option>
              </select>
            </FieldGroup>
            {temperedAnswers.tubNearby === 'yes' && (
              <FieldGroup label="Distance to tub/shower drain (inches)?">
                <input type="number" className="form-input" value={temperedAnswers.tubDistance}
                  onChange={e => setTemperedAnswers(prev => ({ ...prev, tubDistance: e.target.value }))}
                  placeholder="e.g. 48" />
              </FieldGroup>
            )}
            {tubRule && (
              <div style={{ padding: '0.4rem', background: 'rgba(239,68,68,0.15)', borderRadius: 6, fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '0.375rem' }}>
                🚨 TEMPERED GLASS REQUIRED — Window within 60" of tub/shower.
              </div>
            )}
          </div>

          {/* Tempered Rule B: Low Glass */}
          <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.375rem' }}>⬇️ Rule B: Low Glass + Large Area</div>
            <FieldGroup label="Bottom of glass height from floor (inches)?">
              <input type="number" className="form-input" value={temperedAnswers.bottomHeight}
                onChange={e => setTemperedAnswers(prev => ({ ...prev, bottomHeight: e.target.value }))}
                placeholder="e.g. 14" />
            </FieldGroup>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Glass area: {glassArea > 0 ? `${glassArea} sq ft` : 'Enter dimensions first'}
            </div>
            {lowGlassRule && (
              <div style={{ padding: '0.4rem', background: 'rgba(239,68,68,0.15)', borderRadius: 6, fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '0.375rem' }}>
                🚨 TEMPERED GLASS REQUIRED — Low glass (&lt;18") with area &gt;9 sq ft.
              </div>
            )}
          </div>

          {/* Summary */}
          <div style={{
            padding: '0.75rem', borderRadius: 8,
            background: (tubRule || lowGlassRule) ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `2px solid ${(tubRule || lowGlassRule) ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: (tubRule || lowGlassRule) ? '#ef4444' : '#22c55e' }}>
              {(tubRule || lowGlassRule) ? '🛡️ TEMPERED REQUIRED' : '✓ No tempered requirement detected'}
            </div>
            {(tubRule || lowGlassRule) && (
              <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                Mark Tempered Full or Tempered Half on the order form.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable field wrapper ──────────────────────────────────
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Checkbox item ───────────────────────────────────────────
function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8rem' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: '#3b82f6' }} />
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </label>
  );
}

// ── Button styles ───────────────────────────────────────────
const deleteBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.9rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
