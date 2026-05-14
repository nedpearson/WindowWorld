import { useState } from 'react';
import { OpeningSafetyReview, ExportBlockerResult, checkExportReadiness, CATEGORY_LABELS } from '../utils/safetyGlazingRules';

interface FinalTemperedReviewProps {
  reviews: OpeningSafetyReview[];
  onResolve?: (updatedReviews: OpeningSafetyReview[]) => void;
}

export function FinalTemperedReview({ reviews, onResolve }: FinalTemperedReviewProps) {
  const [localReviews, setLocalReviews] = useState(reviews);
  const result: ExportBlockerResult = checkExportReadiness(localReviews);

  const withTempered = localReviews.filter(r => r.temperedRequired === 'yes');
  const withWarnings = localReviews.filter(r => r.flags.length > 0 && r.temperedRequired !== 'yes');
  const unsure = localReviews.filter(r => r.temperedRequired === 'unsure');
  const overrides = localReviews.filter(r => r.safetyReviewStatus === 'override');
  const unreviewed = localReviews.filter(r => r.flags.length > 0 && r.safetyReviewStatus === 'not_started');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>🛡️ Tempered Glass Final Review</h3>
        {result.blocked ? (
          <span style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', padding: '0.375rem 0.875rem', borderRadius: 999, fontWeight: 700, fontSize: '0.875rem' }}>
            🔴 Export Blocked
          </span>
        ) : (
          <span style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)', padding: '0.375rem 0.875rem', borderRadius: 999, fontWeight: 700, fontSize: '0.875rem' }}>
            ✅ Clear to Export
          </span>
        )}
      </div>

      {/* Blockers */}
      {result.blockers.length > 0 && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ fontWeight: 800, color: 'var(--danger)', marginBottom: '0.625rem' }}>❌ Export Blockers</div>
          {result.blockers.map((b, i) => (
            <div key={i} style={{ fontSize: '0.875rem', color: 'var(--danger)', marginBottom: '0.375rem' }}>• {b}</div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '0.625rem' }}>⚠️ Logged Overrides</div>
          {result.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>• {w}</div>
          ))}
        </div>
      )}

      {/* Summary grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Tempered Confirmed', count: withTempered.length, color: 'var(--success)' },
          { label: 'Warnings / Flagged', count: withWarnings.length, color: 'var(--warning)' },
          { label: 'Unsure', count: unsure.length, color: 'var(--danger)' },
          { label: 'Override Logged', count: overrides.length, color: 'var(--warning)' },
          { label: 'Not Reviewed', count: unreviewed.length, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-opening status table */}
      {localReviews.filter(r => r.flags.length > 0).length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', fontWeight: 700, fontSize: '0.875rem', borderBottom: '1px solid var(--border)' }}>
            Safety Glazing Review by Opening
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Opening</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Flags</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Decision</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Full</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Half</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {localReviews.filter(r => r.flags.length > 0).map(rev => {
                const statusColor = rev.temperedRequired === 'yes' ? 'var(--success)'
                  : rev.temperedRequired === 'unsure' ? 'var(--danger)'
                  : rev.safetyReviewStatus === 'override' ? 'var(--warning)'
                  : 'var(--text-muted)';

                return (
                  <tr key={rev.openingNumber} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 700 }}>#{rev.openingNumber}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      {rev.flags.slice(0, 2).map((f, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: f.severity === 'high' ? 'var(--danger)' : 'var(--warning)' }}>
                          {CATEGORY_LABELS[f.category]}
                        </div>
                      ))}
                      {rev.flags.length > 2 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{rev.flags.length - 2} more</div>}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: statusColor }}>
                      {rev.temperedRequired === 'yes' ? '✅ Yes'
                        : rev.temperedRequired === 'no' ? '✗ No'
                        : rev.temperedRequired === 'unsure' ? '❓ Unsure'
                        : '— Not reviewed'}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                      {rev.temperedFull ? '✓' : '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                      {rev.temperedHalf ? '✓' : '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700, background: statusColor + '22', color: statusColor }}>
                        {rev.safetyReviewStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
