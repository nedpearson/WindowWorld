// ═══════════════════════════════════════════════════════════
// Missing Information Check — Final blocker screen
// Shows every issue classified by severity with jump-to-fix
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { validateAppointment, type ValidationResult, type ValidationIssue } from '../utils/validationEngine';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  BLOCKER: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '🛑', label: 'BLOCKER' },
  HIGH:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '⚠️', label: 'HIGH' },
  MEDIUM:  { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', icon: 'ℹ️', label: 'MEDIUM' },
  LOW:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '💡', label: 'LOW' },
};

const READY_STATE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  incomplete:           { color: '#ef4444', label: 'Incomplete', icon: '🔴' },
  review:              { color: '#f59e0b', label: 'Ready for Review', icon: '🟡' },
  ready_for_signature: { color: '#3b82f6', label: 'Ready for Customer Signature', icon: '🔵' },
  ready_to_export:     { color: '#22c55e', label: 'Ready to Export', icon: '🟢' },
};

export function MissingInfoCheck({
  appointment,
  onJumpToStep,
}: {
  appointment: any;
  onJumpToStep: (step: number) => void;
}) {
  const result: ValidationResult = useMemo(
    () => validateAppointment(appointment),
    [appointment]
  );

  const readyConfig = READY_STATE_CONFIG[result.readyState];

  // Group issues by section
  const grouped = useMemo(() => {
    const map: Record<string, ValidationIssue[]> = {};
    for (const issue of result.issues) {
      const key = issue.section;
      if (!map[key]) map[key] = [];
      map[key].push(issue);
    }
    return map;
  }, [result.issues]);

  return (
    <div>
      {/* Readiness header */}
      <div className="card" style={{
        marginBottom: '1.5rem',
        background: `linear-gradient(135deg, ${readyConfig.color}15, ${readyConfig.color}08)`,
        borderColor: `${readyConfig.color}40`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: readyConfig.color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {readyConfig.icon} {readyConfig.label}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Overall completion: {result.overallPct}%
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: SEVERITY_CONFIG.BLOCKER.bg, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: SEVERITY_CONFIG.BLOCKER.color }}>{result.blockers}</div>
              <div style={{ fontSize: '0.6875rem', color: SEVERITY_CONFIG.BLOCKER.color }}>Blockers</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: SEVERITY_CONFIG.HIGH.bg, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: SEVERITY_CONFIG.HIGH.color }}>{result.high}</div>
              <div style={{ fontSize: '0.6875rem', color: SEVERITY_CONFIG.HIGH.color }}>High</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: SEVERITY_CONFIG.MEDIUM.bg, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: SEVERITY_CONFIG.MEDIUM.color }}>{result.medium}</div>
              <div style={{ fontSize: '0.6875rem', color: SEVERITY_CONFIG.MEDIUM.color }}>Medium</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: SEVERITY_CONFIG.LOW.bg, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: SEVERITY_CONFIG.LOW.color }}>{result.low}</div>
              <div style={{ fontSize: '0.6875rem', color: SEVERITY_CONFIG.LOW.color }}>Low</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
          <div style={{
            width: `${result.overallPct}%`, height: '100%', borderRadius: 8,
            background: `linear-gradient(90deg, ${readyConfig.color}, ${readyConfig.color}aa)`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Section completion bars */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>📊 Section Completion</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {Object.entries(result.sections).map(([name, s]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: 120, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{name}</span>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${s.pct}%`, height: '100%', borderRadius: 4,
                  background: s.pct === 100 ? '#22c55e' : s.pct > 60 ? '#f59e0b' : '#ef4444',
                }} />
              </div>
              <span style={{ width: 40, fontSize: '0.75rem', fontWeight: 700,
                color: s.pct === 100 ? '#22c55e' : s.pct > 60 ? '#f59e0b' : '#ef4444'
              }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-opening completeness */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>🪟 Opening Completeness</h3>
        {result.openings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No openings to check</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {result.openings.map(o => (
              <div key={o.openingNumber} className="card" style={{
                padding: '0.75rem',
                borderColor: o.pct === 100 ? 'var(--success)' : o.pct > 60 ? 'var(--warning)' : 'var(--danger)',
                borderLeftWidth: 3,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Opening #{o.openingNumber}</strong>
                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {o.roomLocation}
                    </span>
                  </div>
                  <span style={{
                    fontWeight: 700, fontSize: '0.875rem',
                    color: o.pct === 100 ? '#22c55e' : o.pct > 60 ? '#f59e0b' : '#ef4444'
                  }}>
                    {o.pct}% ({o.filled}/{o.total})
                  </span>
                </div>
                {o.missing.length > 0 && (
                  <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--warning)' }}>
                    Missing: {o.missing.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issues by section */}
      {Object.keys(grouped).length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>🔍 All Issues</h3>
          {Object.entries(grouped).map(([section, sectionIssues]) => (
            <div key={section} style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                {section} ({sectionIssues.length})
              </h4>
              {sectionIssues.map(issue => {
                const cfg = SEVERITY_CONFIG[issue.severity];
                return (
                  <div key={issue.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.75rem', marginBottom: '0.25rem',
                    background: cfg.bg, borderRadius: 'var(--radius-sm)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <span>{cfg.icon}</span>
                      <span style={{ fontSize: '0.8125rem', color: cfg.color }}>{issue.message}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: '0.625rem' }}>
                        {cfg.label}
                      </span>
                      <button
                        className="btn btn-sm"
                        style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', background: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                        onClick={() => onJumpToStep(issue.jumpStep)}
                      >
                        Fix →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* All clear */}
      {result.issues.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
          <h2 style={{ color: '#22c55e' }}>All Clear!</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>All required fields are complete. Ready to generate the final packet.</p>
        </div>
      )}
    </div>
  );
}
