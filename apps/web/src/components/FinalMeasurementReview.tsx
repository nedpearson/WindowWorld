import { MeasurementAdjustment, checkMeasurementExportReadiness } from '../utils/measurementRules';
import { toFractionDisplay } from '../utils/measurementParser';

// ═══════════════════════════════════════════════════════════════
// Final Measurement Accuracy Review — Pre-Export Gate
// Shows raw vs final measurements, rules applied, overrides
// ═══════════════════════════════════════════════════════════════

interface FinalMeasurementReviewProps {
  openings: any[];
  adjustments: Record<number, MeasurementAdjustment>;
}

export function FinalMeasurementReview({ openings, adjustments }: FinalMeasurementReviewProps) {
  const check = checkMeasurementExportReadiness(openings, adjustments);
  const filledOpenings = openings.filter(o => o.model || o.qty);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>📐 Measurement Accuracy Review</h3>
        {check.blocked ? (
          <span style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', padding: '0.375rem 0.875rem', borderRadius: 999, fontWeight: 700, fontSize: '0.875rem' }}>
            🔴 Export Blocked
          </span>
        ) : (
          <span style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)', padding: '0.375rem 0.875rem', borderRadius: 999, fontWeight: 700, fontSize: '0.875rem' }}>
            ✅ Measurements Clear
          </span>
        )}
      </div>

      {/* Blockers */}
      {check.blockers.length > 0 && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ fontWeight: 800, color: 'var(--danger)', marginBottom: '0.625rem' }}>❌ Export Blockers</div>
          {check.blockers.map((b, i) => (
            <div key={i} style={{ fontSize: '0.875rem', color: 'var(--danger)', marginBottom: '0.375rem' }}>• {b}</div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {check.warnings.length > 0 && (
        <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '0.625rem' }}>⚠️ Warnings</div>
          {check.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>• {w}</div>
          ))}
        </div>
      )}

      {/* Per-opening measurement table */}
      {filledOpenings.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', fontWeight: 700, fontSize: '0.875rem', borderBottom: '1px solid var(--border)' }}>
            Measurement Summary by Opening
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>#</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Opening</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Raw W × H</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Takeoff</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Order W × H</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Rule</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filledOpenings.map((op, i) => {
                const opNum = op.openingNumber || i + 1;
                const adj = adjustments[opNum];
                const isOriel = (op.productCategory || op.model || '').toLowerCase().includes('oriel');
                const statusColor = adj?.approved ? 'var(--success)' : adj ? 'var(--warning)' : 'var(--text-muted)';

                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 700 }}>#{opNum}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{op.model || op.productCategory || '—'}</div>
                      {isOriel && <div style={{ fontSize: '0.625rem', color: op.topSashConfirmed ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        {op.topSashConfirmed ? '✅ Top sash confirmed' : '🔴 Top sash NOT confirmed'}
                      </div>}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'monospace' }}>
                      {adj ? `${toFractionDisplay(adj.rawWidth)}" × ${toFractionDisplay(adj.rawHeight)}"` : `${op.width || '?'}" × ${op.height || '?'}"`}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'monospace', color: 'var(--warning)' }}>
                      {adj && (adj.widthTakeoff > 0 || adj.heightTakeoff > 0)
                        ? `−${toFractionDisplay(adj.widthTakeoff)}" / −${toFractionDisplay(adj.heightTakeoff)}"`
                        : '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--success)' }}>
                      {adj ? `${toFractionDisplay(adj.adjustedWidth)}" × ${toFractionDisplay(adj.adjustedHeight)}"` : `${op.width || '?'}" × ${op.height || '?'}"`}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      {adj?.ruleName ? (
                        <div>
                          <div style={{ fontSize: '0.75rem' }}>{adj.ruleName}</div>
                          {adj.ruleStatus === 'needs_verification' && (
                            <div style={{ fontSize: '0.625rem', color: 'var(--warning)' }}>⚠️ NEEDS_VERIFICATION</div>
                          )}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>No rule</span>}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700, background: statusColor + '22', color: statusColor }}>
                        {adj?.approved ? 'Approved' : adj ? 'Pending' : 'Not set'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filledOpenings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No openings added yet.
        </div>
      )}
    </div>
  );
}
