import { useState } from 'react';
import { MEASUREMENT_RULES, MeasurementRule, MeasurementRuleStatus } from '../utils/measurementRules';

// ═══════════════════════════════════════════════════════════════
// Measurement Rules Admin Dashboard — Office Mode
// ═══════════════════════════════════════════════════════════════

const STATUS_COLORS: Record<MeasurementRuleStatus, { bg: string; color: string; label: string }> = {
  verified:           { bg: 'rgba(34,197,94,0.12)',   color: 'var(--success)', label: '✅ Verified' },
  needs_verification: { bg: 'rgba(245,158,11,0.12)',  color: 'var(--warning)', label: '⚠️ Needs Verification' },
  draft:              { bg: 'rgba(139,92,246,0.12)',   color: 'var(--primary)', label: '📝 Draft' },
  inactive:           { bg: 'rgba(100,116,139,0.12)', color: 'var(--text-muted)', label: '— Inactive' },
};

export function MeasurementRulesAdminPage() {
  const [rules, setRules] = useState<MeasurementRule[]>(MEASUREMENT_RULES);
  const [filter, setFilter] = useState<MeasurementRuleStatus | 'all'>('all');
  const [editing, setEditing] = useState<MeasurementRule | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = filter === 'all' ? rules : rules.filter(r => r.status === filter);
  const needsVerif = rules.filter(r => r.status === 'needs_verification').length;

  const toggleStatus = (id: string, status: MeasurementRuleStatus) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>📐 Measurement Rules</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Configure takeoff/deduction rules for all window types. All NEEDS_VERIFICATION rules must be confirmed by Window World before field use.
        </p>
      </div>

      {needsVerif > 0 && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10 }}>
          <strong style={{ color: 'var(--warning)' }}>⚠️ {needsVerif} rule{needsVerif > 1 ? 's' : ''} need verification</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
            — Review and mark verified after confirming values with Window World.
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {(['all', 'verified', 'needs_verification', 'draft'] as const).map(s => {
          const count = s === 'all' ? rules.length : rules.filter(r => r.status === s).length;
          const info = s === 'all' ? { bg: 'var(--bg-secondary)', color: 'var(--text-primary)', label: 'All Rules' } : STATUS_COLORS[s];
          return (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '0.75rem', background: filter === s ? info.color + '22' : 'var(--bg-secondary)', border: `2px solid ${filter === s ? info.color : 'transparent'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: info.color }}>{count}</div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{info.label}</div>
            </button>
          );
        })}
      </div>

      {/* Rule table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700 }}>Measurement Rules ({filtered.length})</span>
          <button onClick={() => setShowAdd(true)} className="btn btn-sm btn-primary">+ Add Rule</button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Rule</th>
              <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Window / Exterior</th>
              <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Width Takeoff</th>
              <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Height Takeoff</th>
              <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(rule => {
              const statusInfo = STATUS_COLORS[rule.status];
              return (
                <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 700 }}>{rule.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: 260 }}>{rule.description}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem' }}>
                      {rule.windowType && <span className="badge" style={{ marginRight: '0.25rem' }}>{rule.windowType}</span>}
                      {rule.exteriorType && <span className="badge">{rule.exteriorType}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {rule.installType && `Install: ${rule.installType}`}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                    {rule.widthTakeoffFraction
                      ? `−${rule.widthTakeoffFraction}" (${rule.widthTakeoffDecimal}")`
                      : rule.widthTakeoffDecimal === 0 ? 'None' : rule.widthTakeoffDecimal ? `−${rule.widthTakeoffDecimal}"` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                    {rule.heightTakeoffFraction
                      ? `−${rule.heightTakeoffFraction}" (${rule.heightTakeoffDecimal}")`
                      : rule.heightTakeoffDecimal === 0 ? 'None' : rule.heightTakeoffDecimal ? `−${rule.heightTakeoffDecimal}"` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ padding: '0.25rem 0.625rem', borderRadius: 999, background: statusInfo.bg, color: statusInfo.color, fontWeight: 700, fontSize: '0.6875rem' }}>
                      {statusInfo.label}
                    </span>
                    {rule.requiresConfirmation && <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Req. confirmation</div>}
                    {rule.requiresPhoto && <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Req. photo</div>}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.375rem', flexDirection: 'column' }}>
                      {rule.status === 'needs_verification' && (
                        <button
                          onClick={() => toggleStatus(rule.id, 'verified')}
                          style={{ padding: '0.25rem 0.5rem', background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 4, cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700 }}
                        >
                          ✅ Mark Verified
                        </button>
                      )}
                      {rule.status === 'verified' && (
                        <button
                          onClick={() => toggleStatus(rule.id, 'needs_verification')}
                          style={{ padding: '0.25rem 0.5rem', background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', border: '1px solid var(--warning)', borderRadius: 4, cursor: 'pointer', fontSize: '0.6875rem' }}
                        >
                          ⚠️ Needs Review
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(rule)}
                        style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: '0.6875rem' }}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Simple edit panel */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: 12, width: '90%', maxWidth: 520 }}>
            <h3 style={{ margin: '0 0 1rem' }}>Edit Rule — {editing.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="form-group">
                <span className="form-label">Status</span>
                <select className="form-input" value={editing.status}
                  onChange={e => setEditing({ ...editing, status: e.target.value as MeasurementRuleStatus })}>
                  <option value="verified">✅ Verified</option>
                  <option value="needs_verification">⚠️ Needs Verification</option>
                  <option value="draft">📝 Draft</option>
                  <option value="inactive">— Inactive</option>
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Width Takeoff (inches decimal)</span>
                <input className="form-input" type="number" step="0.0625" value={editing.widthTakeoffDecimal || 0}
                  onChange={e => setEditing({ ...editing, widthTakeoffDecimal: parseFloat(e.target.value) })} />
              </label>
              <label className="form-group">
                <span className="form-label">Height Takeoff (inches decimal)</span>
                <input className="form-input" type="number" step="0.0625" value={editing.heightTakeoffDecimal || 0}
                  onChange={e => setEditing({ ...editing, heightTakeoffDecimal: parseFloat(e.target.value) })} />
              </label>
              <label className="form-group">
                <span className="form-label">Notes</span>
                <textarea className="form-input" rows={3} value={editing.notes || ''}
                  onChange={e => setEditing({ ...editing, notes: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => {
                setRules(prev => prev.map(r => r.id === editing.id ? editing : r));
                setEditing(null);
              }} className="btn btn-primary">Save Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
