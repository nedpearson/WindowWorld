// ═══════════════════════════════════════════════════════════
// Step Completeness Sidebar — Shows completion % per step
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { validateAppointment, type ValidationResult } from '../utils/validationEngine';

const STEP_SECTIONS: Record<number, string[]> = {
  0: ['Header'],         // Customer
  1: ['Header'],         // Job Info
  2: ['Sketch'],         // Home Sketch
  3: ['Openings'],       // Opening Schedule
  4: ['Pricing'],        // Pricing
  5: [],                 // Order Form Review (inherits)
  6: ['Customer', 'Job Scope', 'Product Counts', 'Pricing', 'Acknowledgments'],
  7: ['Signatures'],     // Missing Info Check
};

export function StepCompletionBadge({
  stepIndex,
  appointment,
}: {
  stepIndex: number;
  appointment: any;
}) {
  const result: ValidationResult = useMemo(
    () => validateAppointment(appointment),
    [appointment]
  );

  // Calculate step-specific completeness
  const sectionNames = STEP_SECTIONS[stepIndex] || [];
  let total = 0;
  let filled = 0;
  for (const name of sectionNames) {
    const s = result.sections[name];
    if (s) {
      total += s.total;
      filled += s.filled;
    }
  }

  // For openings step, use opening data
  if (stepIndex === 3) {
    total = result.openings.reduce((s, o) => s + o.total, 0);
    filled = result.openings.reduce((s, o) => s + o.filled, 0);
  }

  const pct = total > 0 ? Math.round((filled / total) * 100) : (stepIndex <= 1 ? 100 : 0);

  // Count blockers for this step
  const stepBlockers = result.issues.filter(i => i.jumpStep === stepIndex && i.severity === 'BLOCKER').length;
  const stepWarnings = result.issues.filter(i => i.jumpStep === stepIndex && i.severity !== 'BLOCKER').length;

  if (total === 0 && stepIndex > 4) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.25rem' }}>
      {/* Completion percentage */}
      <span style={{
        fontSize: '0.625rem', fontWeight: 700,
        color: pct === 100 ? '#22c55e' : pct > 60 ? '#f59e0b' : '#ef4444',
      }}>
        {pct}%
      </span>
      {/* Blocker count */}
      {stepBlockers > 0 && (
        <span style={{
          fontSize: '0.5625rem', fontWeight: 700, color: '#ef4444',
          background: 'rgba(239,68,68,0.15)', padding: '1px 4px', borderRadius: 4,
        }}>
          {stepBlockers}🛑
        </span>
      )}
      {/* Warning count */}
      {stepWarnings > 0 && stepBlockers === 0 && (
        <span style={{
          fontSize: '0.5625rem', fontWeight: 700, color: '#f59e0b',
          background: 'rgba(245,158,11,0.15)', padding: '1px 4px', borderRadius: 4,
        }}>
          {stepWarnings}⚠
        </span>
      )}
    </div>
  );
}

/** Simple overall readiness badge for dashboard */
export function ReadinessBadge({ appointment }: { appointment: any }) {
  const result = useMemo(() => validateAppointment(appointment), [appointment]);

  const config: Record<string, { color: string; label: string }> = {
    incomplete:           { color: '#ef4444', label: `${result.overallPct}% Complete` },
    review:              { color: '#f59e0b', label: 'Ready for Review' },
    ready_for_signature: { color: '#3b82f6', label: 'Ready for Signature' },
    ready_to_export:     { color: '#22c55e', label: 'Ready to Export' },
  };

  const c = config[result.readyState];
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 700, color: c.color,
      background: `${c.color}18`, padding: '2px 8px', borderRadius: 9999,
    }}>
      {c.label}
    </span>
  );
}
