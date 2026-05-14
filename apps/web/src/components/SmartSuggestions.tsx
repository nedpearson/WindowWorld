import { useState, useMemo } from 'react';
import {
  generateSuggestions, getConfigs, getBuiltInConfigs, saveConfig,
  applyConfig, toggleFavorite, deleteConfig, getRoomSuggestions,
  type SavedConfig, type SmartSuggestion,
} from '../utils/repMemory';

// ─── SUGGESTION BAR (inline in Opening list) ────────────
export function SmartSuggestionBar({
  openings,
  onBulkUpdate,
}: {
  openings: any[];
  onBulkUpdate: (field: string, value: any, targets: 'all' | 'remaining') => void;
}) {
  const suggestions = useMemo(() => {
    return generateSuggestions(openings, null, (updates, targets) => {
      for (const [field, value] of Object.entries(updates)) {
        onBulkUpdate(field, value, targets as any);
      }
    });
  }, [openings]);

  const actionable = suggestions.filter(s => s.type !== 'config_reuse' && s.type !== 'note_suggest');
  if (actionable.length === 0) return null;

  return (
    <div className="smart-bar">
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
        ⚡ SMART:
      </span>
      <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', flex: 1 }}>
        {actionable.slice(0, 4).map(s => (
          <button key={s.id} onClick={s.action} className="smart-chip">
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CONFIG PICKER (inside Opening editor modal) ────────
export function ConfigPicker({
  onApply,
  currentOpening,
}: {
  onApply: (fields: Record<string, any>) => void;
  currentOpening: any;
}) {
  const [showAll, setShowAll] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const userConfigs = getConfigs();
  const builtInConfigs = getBuiltInConfigs();
  const allConfigs = [...userConfigs, ...builtInConfigs];
  const displayed = showAll ? allConfigs : allConfigs.slice(0, 3);

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveConfig(saveName.trim(), currentOpening);
    setSaveName('');
    setShowSave(false);
  };

  return (
    <div style={{ marginBottom: '0.75rem', padding: '0.625rem', background: 'rgba(139,92,246,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139,92,246,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6' }}>📋 Quick Configs</span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button onClick={() => setShowSave(!showSave)} style={{ fontSize: '0.625rem', padding: '2px 6px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 4, color: '#8b5cf6', cursor: 'pointer' }}>
            💾 Save Current
          </button>
          {allConfigs.length > 3 && (
            <button onClick={() => setShowAll(!showAll)} style={{ fontSize: '0.625rem', padding: '2px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>
              {showAll ? 'Show Less' : `+${allConfigs.length - 3} more`}
            </button>
          )}
        </div>
      </div>

      {/* Save form */}
      {showSave && (
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem' }}>
          <input className="form-input" placeholder="Config name..." value={saveName} onChange={e => setSaveName(e.target.value)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', flex: 1 }} />
          <button onClick={handleSave} className="btn btn-sm btn-primary" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>Save</button>
        </div>
      )}

      {/* Config chips */}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {displayed.map(cfg => (
          <div key={cfg.id} style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
            <button onClick={() => onApply(cfg.fields)} className="smart-chip" style={{ background: cfg.favorite ? 'rgba(245,158,11,0.12)' : undefined }}>
              {cfg.favorite && '⭐'} {cfg.name}
            </button>
            {cfg.id.startsWith('cfg_') && (
              <>
                <button onClick={() => { toggleFavorite(cfg.id); }} style={{ fontSize: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                  {cfg.favorite ? '★' : '☆'}
                </button>
                <button onClick={() => deleteConfig(cfg.id)} style={{ fontSize: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px' }}>×</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROOM LABEL AUTOCOMPLETE ────────────────────────────
export function RoomAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const rooms = useMemo(() => getRoomSuggestions(), []);
  const filtered = rooms.filter(r => r.toLowerCase().includes((value || '').toLowerCase())).slice(0, 8);

  return (
    <div style={{ position: 'relative' }}>
      <input className="form-input" value={value || ''} onChange={e => { onChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="e.g. Living Room" />
      {showSuggestions && filtered.length > 0 && value !== filtered[0] && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow)',
        }}>
          {filtered.map(room => (
            <button key={room} onMouseDown={() => { onChange(room); setShowSuggestions(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '0.375rem 0.75rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8125rem' }}>
              {room}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── INSTALL NOTES SUGGESTIONS ──────────────────────────
// ─── INSTALL NOTES SUGGESTIONS ──────────────────────────
export function InstallNoteSuggestions({
  opening,
  onAppend,
}: {
  opening: any;
  onAppend: (note: string) => void;
}) {
  const { generateSmartInstallNotes } = require('../utils/businessRules');
  const suggestions = generateSmartInstallNotes(opening);

  if (suggestions.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
      {suggestions.map((sn: any, i: number) => (
        <button key={i} onClick={() => onAppend(sn.note)} title={sn.reason}
          style={{ fontSize: '0.5625rem', padding: '2px 6px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 4, color: '#06b6d4', cursor: 'pointer' }}>
          + {sn.note}
        </button>
      ))}
    </div>
  );
}

// ─── QUICK PACKAGES ───────────────────────────────────────
export function QuickPackages({
  openings,
  onApplyPackage
}: {
  openings: any[];
  onApplyPackage: (pkg: any) => void;
}) {
  const { QUICK_PACKAGES } = require('../utils/businessRules');

  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>📦 One-Tap Packages</h3>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {QUICK_PACKAGES.map((pkg: any) => (
          <button key={pkg.id} className="btn btn-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={() => onApplyPackage(pkg)} title={pkg.description}>
            <span>{pkg.icon}</span> {pkg.label}
          </button>
        ))}
      </div>
    </div>
  );
}

