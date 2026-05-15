// ═══════════════════════════════════════════════════════════════
// Final Lockdown Review — Pre-Export Validation Screen
// Blocks export for unresolved blockers; surfaces all warnings
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildLockdownChecklist, isExportBlocked, validateSketchSync } from '../utils/sketchSync';
import type { SketchMarkerData, MarkerGroupData, LockdownItem } from '../utils/sketchSync';

const CATEGORY_LABELS: Record<string, { icon: string; label: string }> = {
  sketch: { icon: '🏠', label: 'Sketch Completeness' },
  rules: { icon: '⚡', label: 'Business Rules' },
  tempered: { icon: '🛡️', label: 'Tempered Glass' },
  pricing: { icon: '💰', label: 'Pricing' },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  pass: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', icon: '✓' },
  fail: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: '✕' },
  warn: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: '⚠' },
  skip: { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', icon: '—' },
};

export default function FinalLockdownReview() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<LockdownItem[]>([]);
  const [markers, setMarkers] = useState<SketchMarkerData[]>([]);
  const [groups, setGroups] = useState<MarkerGroupData[]>([]);

  useEffect(() => {
    if (!appointmentId) return;
    // Load from localStorage (same source as SketchFieldPage)
    try {
      const saved = localStorage.getItem(`sketch_field_${appointmentId}`);
      if (saved) {
        const data = JSON.parse(saved);
        const m = data.markers || [];
        const g = data.groups || [];
        setMarkers(m);
        setGroups(g);
        // Build checklist with mock openings from markers
        const openings = m
          .filter((mk: SketchMarkerData) => mk.markerNumber !== null && mk.markerSymbol !== 'front_door' && mk.markerSymbol !== 'note' && mk.markerSymbol !== 'arrow')
          .map((mk: SketchMarkerData) => ({
            openingNumber: mk.markerNumber,
            width: mk.width,
            height: mk.height,
            roomLocation: mk.roomLocation,
            productCategory: mk.windowType,
            glassPackage: 'LEE',
            removalType: mk.removalType || 'ALUM',
            totalPrice: 0,
            pricingStatus: 'pending',
            orielConfirmed: false,
          }));
        setChecklist(buildLockdownChecklist(m, openings, g, []));
      }
    } catch {}
  }, [appointmentId]);

  const { blocked, blockers } = isExportBlocked(checklist);
  const categories = ['sketch', 'rules', 'tempered', 'pricing'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '1rem', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>🔒 Final Lockdown Review</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pre-export validation checklist</div>
        </div>
        <button onClick={() => navigate(-1)} style={{ padding: '0.375rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          ← Back to Sketch
        </button>
      </div>

      {/* Summary banner */}
      <div style={{
        padding: '1rem', borderRadius: 12, marginBottom: '1rem', textAlign: 'center',
        background: blocked ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
        border: `2px solid ${blocked ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{blocked ? '🚫' : '✅'}</div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: blocked ? '#ef4444' : '#22c55e' }}>
          {blocked ? `${blockers.length} BLOCKER${blockers.length > 1 ? 'S' : ''} — EXPORT BLOCKED` : 'READY FOR EXPORT'}
        </div>
        {blocked && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Resolve all blockers before generating the final order form / contract packet.
          </div>
        )}
      </div>

      {/* Checklist by category */}
      {categories.map(cat => {
        const items = checklist.filter(i => i.category === cat);
        if (items.length === 0) return null;
        const info = CATEGORY_LABELS[cat];
        const passCount = items.filter(i => i.status === 'pass').length;
        return (
          <div key={cat} style={{ marginBottom: '0.75rem', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{info.icon} {info.label}</span>
              <span style={{ fontSize: '0.7rem', color: passCount === items.length ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                {passCount}/{items.length} passed
              </span>
            </div>
            {items.map(item => {
              const s = STATUS_STYLES[item.status];
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: s.bg, color: s.color, fontWeight: 800, fontSize: '0.75rem',
                  }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                    {item.message && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.message}</div>}
                  </div>
                  {item.blocker && item.status === 'fail' && (
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 4, fontWeight: 700 }}>BLOCKER</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Export Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button disabled={blocked} onClick={() => navigate(`/appointments/${appointmentId}/order-form`)}
          style={{
            flex: 1, padding: '0.875rem', borderRadius: 10, border: 'none', cursor: blocked ? 'not-allowed' : 'pointer',
            background: blocked ? 'rgba(148,163,184,0.2)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: blocked ? '#94a3b8' : '#fff', fontWeight: 800, fontSize: '0.9rem',
            opacity: blocked ? 0.5 : 1,
          }}>
          {blocked ? '🔒 Export Blocked' : '📄 Generate Order Form'}
        </button>
        <button onClick={() => navigate(`/appointments/${appointmentId}/sketch`)}
          style={{
            padding: '0.875rem 1.25rem', borderRadius: 10, border: '1px solid var(--border)',
            background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600,
          }}>
          🏠 Edit Sketch
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: '1rem', padding: '0.5rem', borderRadius: 8, background: 'rgba(148,163,184,0.05)', fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center' }}>
        Final determination of tempered glass and building code compliance must be made by Window World management or local code officials.
      </div>
    </div>
  );
}
