// ═══════════════════════════════════════════════════════════
// Window World — Centralized Validation Engine
// Checks every required field across Order Form + Contract.
// Classifies each as BLOCKER | HIGH | MEDIUM | LOW
// Returns structured results with jump-to-fix metadata.
// ═══════════════════════════════════════════════════════════

import {
  ORDER_FORM_HEADER, ORDER_FORM_OPENING, ORDER_FORM_SKETCH,
  CONTRACT_FIELDS, SPECIALTY_SHAPES, CASEMENT_AWNING,
  type FieldSeverity, type FormFieldDef,
} from './formFieldDefs';

export interface ValidationIssue {
  id: string;
  fieldId: string;
  label: string;
  severity: FieldSeverity;
  section: string;
  form: string;
  openingNumber?: number;
  message: string;
  /** Which step in the workflow to jump to */
  jumpStep: number;
  /** Field path for programmatic focus */
  fieldPath: string;
}

export interface OpeningCompleteness {
  openingNumber: number;
  roomLocation: string;
  total: number;
  filled: number;
  pct: number;
  missing: string[];
  issues: ValidationIssue[];
}

export interface ValidationResult {
  /** All issues sorted by severity */
  issues: ValidationIssue[];
  /** Count by severity */
  blockers: number;
  high: number;
  medium: number;
  low: number;
  /** Section completion percentages */
  sections: Record<string, { total: number; filled: number; pct: number }>;
  /** Per-opening completeness */
  openings: OpeningCompleteness[];
  /** Overall readiness */
  overallPct: number;
  readyState: 'incomplete' | 'review' | 'ready_for_signature' | 'ready_to_export';
  canExport: boolean;
}

// Step mapping for jump-to-fix
const STEP_MAP: Record<string, number> = {
  'Customer': 0,
  'Job Info': 1,
  'Sketch': 2,
  'Openings': 3,
  'Measurements': 3,
  'Product & Options': 3,
  'Installation': 3,
  'Pricing': 4,
  'Order Form': 5,
  'Contract': 6,
  'Product Counts': 6,
  'Job Scope': 6,
  'Acknowledgments': 6,
  'Signatures': 7,
  'Header': 0,
};

function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && value === 0) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function getVal(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function shouldCheck(field: FormFieldDef, opening?: any, appointment?: any): boolean {
  if (!field.condition) return true;
  switch (field.condition) {
    case 'isSpecialtyShape':
      return opening && SPECIALTY_SHAPES.includes(opening.productCategory);
    case 'isCasementOrAwning':
      return opening && CASEMENT_AWNING.includes(opening.productCategory);
    case 'hasGrid':
      return opening && opening.gridStyle && opening.gridStyle !== 'None';
    case 'preLead1978Home':
      return appointment?.customer?.preLead1978 === true;
    default: return true;
  }
}

export function validateAppointment(appointment: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const sectionCounts: Record<string, { total: number; filled: number }> = {};

  const track = (section: string, isFilled: boolean) => {
    if (!sectionCounts[section]) sectionCounts[section] = { total: 0, filled: 0 };
    sectionCounts[section].total++;
    if (isFilled) sectionCounts[section].filled++;
  };

  const customer = appointment.customer || {};
  const openings: any[] = appointment.openings || [];
  const signatures: any[] = appointment.signatures || [];
  const houseMap = appointment.houseMap || null;

  // ─── HEADER / CUSTOMER / JOB ──────────────────────────
  for (const field of ORDER_FORM_HEADER) {
    if (!shouldCheck(field, null, appointment)) continue;
    let val: any;
    if (field.source === 'customer') val = getVal(customer, field.dataPath);
    else if (field.source === 'appointment') val = getVal(appointment, field.dataPath);
    const filled = !isEmpty(val);
    track(field.section, filled);
    if (field.required && !filled) {
      issues.push({
        id: `${field.id}`,
        fieldId: field.id,
        label: field.label,
        severity: field.severity,
        section: field.section,
        form: field.form,
        message: `Missing: ${field.label}`,
        jumpStep: STEP_MAP[field.section] ?? 0,
        fieldPath: `${field.source}.${field.dataPath}`,
      });
    }
  }

  // ─── SKETCH ───────────────────────────────────────────
  for (const field of ORDER_FORM_SKETCH) {
    let val: any;
    if (field.dataPath === 'sketchData') val = houseMap?.sketchData;
    else if (field.dataPath === 'markers') val = houseMap?.markers;
    const filled = !isEmpty(val);
    track('Sketch', filled);
    if (field.required && !filled) {
      issues.push({
        id: field.id,
        fieldId: field.id,
        label: field.label,
        severity: field.severity,
        section: 'Sketch',
        form: field.form,
        message: `Missing: ${field.label}`,
        jumpStep: 2,
        fieldPath: `sketch.${field.dataPath}`,
      });
    }
  }

  // ─── PER-OPENING FIELDS ───────────────────────────────
  const openingResults: OpeningCompleteness[] = [];

  if (openings.length === 0) {
    issues.push({
      id: 'no-openings',
      fieldId: 'no-openings',
      label: 'Opening Schedule',
      severity: 'BLOCKER',
      section: 'Openings',
      form: 'order_form',
      message: 'No openings entered — at least one window/door opening is required',
      jumpStep: 3,
      fieldPath: 'openings',
    });
  }

  for (const op of openings) {
    const oIssues: ValidationIssue[] = [];
    let oTotal = 0;
    let oFilled = 0;
    const missing: string[] = [];

    for (const field of ORDER_FORM_OPENING) {
      if (!shouldCheck(field, op, appointment)) continue;
      const val = getVal(op, field.dataPath);
      const filled = !isEmpty(val);
      oTotal++;
      if (filled) oFilled++;
      track('Openings', filled);

      if (field.required && !filled) {
        const issue: ValidationIssue = {
          id: `${field.id}-${op.openingNumber}`,
          fieldId: field.id,
          label: field.label,
          severity: field.severity,
          section: 'Openings',
          form: field.form,
          openingNumber: op.openingNumber,
          message: `Opening #${op.openingNumber}: Missing ${field.label}`,
          jumpStep: 3,
          fieldPath: `opening.${op.openingNumber}.${field.dataPath}`,
        };
        oIssues.push(issue);
        issues.push(issue);
        missing.push(field.label);
      }
    }

    // Sketch marker check
    const hasMarker = houseMap?.markers?.some((m: any) => m.openingNumber === op.openingNumber);
    if (!hasMarker) {
      const markerIssue: ValidationIssue = {
        id: `sketch-marker-${op.openingNumber}`,
        fieldId: 'os-markers',
        label: 'Sketch Marker',
        severity: 'HIGH',
        section: 'Sketch',
        form: 'order_form',
        openingNumber: op.openingNumber,
        message: `Opening #${op.openingNumber}: No sketch marker placed`,
        jumpStep: 2,
        fieldPath: `sketch.marker.${op.openingNumber}`,
      };
      oIssues.push(markerIssue);
      issues.push(markerIssue);
      missing.push('Sketch Marker');
    }

    // Pricing check
    if (isEmpty(op.totalPrice) || op.totalPrice <= 0) {
      const priceIssue: ValidationIssue = {
        id: `price-${op.openingNumber}`,
        fieldId: 'oo-price',
        label: 'Price',
        severity: 'BLOCKER',
        section: 'Pricing',
        form: 'order_form',
        openingNumber: op.openingNumber,
        message: `Opening #${op.openingNumber}: No price set`,
        jumpStep: 4,
        fieldPath: `opening.${op.openingNumber}.totalPrice`,
      };
      oIssues.push(priceIssue);
      issues.push(priceIssue);
      missing.push('Price');
    }

    openingResults.push({
      openingNumber: op.openingNumber,
      roomLocation: op.roomLocation || 'Unnamed',
      total: oTotal,
      filled: oFilled,
      pct: oTotal > 0 ? Math.round((oFilled / oTotal) * 100) : 0,
      missing,
      issues: oIssues,
    });
  }

  // ─── CONTRACT FIELDS ──────────────────────────────────
  for (const field of CONTRACT_FIELDS) {
    if (!shouldCheck(field, null, appointment)) continue;
    let val: any;
    if (field.source === 'customer') val = getVal(customer, field.dataPath);
    else if (field.source === 'pricing' || field.source === 'appointment') val = getVal(appointment, field.dataPath);
    else if (field.source === 'signature') val = signatures.find((s: any) => s.signerRole === field.dataPath);
    else if (field.dataPath.startsWith('_computed_')) {
      // Computed fields from openings
      const cats = openings.map((o: any) => o.productCategory);
      if (field.dataPath === '_computed_dh_count') val = cats.filter(c => c === 'double_hung').length;
      else if (field.dataPath === '_computed_other_count') val = cats.filter(c => !['double_hung', 'patio_door', ...SPECIALTY_SHAPES].includes(c)).length;
      else if (field.dataPath === '_computed_spec_count') val = cats.filter(c => SPECIALTY_SHAPES.includes(c)).length;
      else if (field.dataPath === '_computed_door_count') val = cats.filter(c => c === 'patio_door').length;
    }

    const filled = !isEmpty(val);
    track(field.section, filled);

    if (field.required && !filled) {
      issues.push({
        id: field.id,
        fieldId: field.id,
        label: field.label,
        severity: field.severity,
        section: field.section,
        form: field.form,
        message: `Missing: ${field.label}`,
        jumpStep: STEP_MAP[field.section] ?? 6,
        fieldPath: `${field.source}.${field.dataPath}`,
      });
    }
  }

  // ─── CROSS-CHECK: ORDER/CONTRACT RECONCILIATION ───────
  if (appointment.subtotal > 0 && appointment.totalAmount > 0) {
    const computedTotal = openings.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
    if (Math.abs(computedTotal - appointment.subtotal) > 0.01) {
      issues.push({
        id: 'reconcile-mismatch',
        fieldId: 'reconcile-mismatch',
        label: 'Total Reconciliation',
        severity: 'BLOCKER',
        section: 'Pricing',
        form: 'both',
        message: `Opening totals ($${computedTotal.toFixed(2)}) do not match subtotal ($${appointment.subtotal.toFixed(2)})`,
        jumpStep: 4,
        fieldPath: 'pricing.subtotal',
      });
    }
  }

  // ─── RESULTS ──────────────────────────────────────────
  const sections: Record<string, { total: number; filled: number; pct: number }> = {};
  for (const [k, v] of Object.entries(sectionCounts)) {
    sections[k] = { ...v, pct: v.total > 0 ? Math.round((v.filled / v.total) * 100) : 0 };
  }

  const blockers = issues.filter(i => i.severity === 'BLOCKER').length;
  const high = issues.filter(i => i.severity === 'HIGH').length;
  const medium = issues.filter(i => i.severity === 'MEDIUM').length;
  const low = issues.filter(i => i.severity === 'LOW').length;

  const totalChecks = Object.values(sectionCounts).reduce((s, v) => s + v.total, 0);
  const totalFilled = Object.values(sectionCounts).reduce((s, v) => s + v.filled, 0);
  const overallPct = totalChecks > 0 ? Math.round((totalFilled / totalChecks) * 100) : 0;

  let readyState: ValidationResult['readyState'] = 'incomplete';
  if (blockers === 0 && high === 0) readyState = 'ready_for_signature';
  else if (blockers === 0) readyState = 'review';
  if (blockers === 0 && high === 0 && medium === 0 && signatures.length >= 1) readyState = 'ready_to_export';

  // Sort: BLOCKER first, then HIGH, MEDIUM, LOW
  const severityOrder: Record<FieldSeverity, number> = { BLOCKER: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    issues,
    blockers,
    high,
    medium,
    low,
    sections,
    openings: openingResults,
    overallPct,
    readyState,
    canExport: blockers === 0,
  };
}
