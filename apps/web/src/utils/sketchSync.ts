// ═══════════════════════════════════════════════════════════════
// Sketch-to-Opening Sync Engine
// Handles: marker creation → opening record → order form row link
// Validates marker/opening/order row consistency
// ═══════════════════════════════════════════════════════════════

import { WW_OPENING_DEFAULTS } from './openingDefaults';

// ── Types ────────────────────────────────────────────────────
export type MarkerSymbol = 'window_x' | 'front_door' | 'patio_door' | 'special_shape' | 'oriel' | 'note' | 'arrow';
export type WindowType = 'double_hung' | 'picture' | 'slider' | 'casement' | 'awning' | 'patio_door' | 'bso' | 'special_shape' | 'oriel' | 'door_sidelight' | 'other';
export type ShapeType = 'arch' | 'eyebrow' | 'circle_top' | 'quarter_arch' | 'half_round' | 'extended_leg' | 'custom' | 'other';
export type ValidationStatus = 'incomplete' | 'measured' | 'priced' | 'complete';
export type GroupType = 'mull_pair' | 'twin' | 'triple' | 'bay_bow' | 'field_note' | 'other';

export interface SketchMarkerData {
  id: string;
  sketchId: string;
  markerType: string;
  markerNumber: number | null;
  markerSymbol: MarkerSymbol;
  markerLabel: string;
  windowType: WindowType | null;
  shapeType: ShapeType | null;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  unitedInches: number | null;
  elevation: string;
  roomLocation: string;
  floorNumber: number;
  notes: string;
  linkedOrderRowNumber: number | null;
  validationStatus: ValidationStatus;
  groupId: string | null;
  ladderReq: boolean;
  exteriorMaterial: string;
  removalType: string;
  installType: string;
  pricingStatus: string;
}

export interface MarkerGroupData {
  id: string;
  sketchId: string;
  groupType: GroupType;
  groupNote: string;
  keepSeparateRows: boolean;
  needsReview: boolean;
  pricingReviewed: boolean;
  memberMarkerIds: string[];
}

export interface SyncWarning {
  type: 'marker_no_opening' | 'opening_no_marker' | 'duplicate_number' | 'missing_measurement'
    | 'missing_window_type' | 'missing_options' | 'joined_missing_note' | 'missing_front_door'
    | 'oriel_no_confirmation' | 'special_shape_missing_dims' | 'tempered_unresolved';
  severity: 'blocker' | 'high' | 'medium' | 'low';
  message: string;
  markerNumber?: number;
  openingNumber?: number;
}

// ── Default Window Types by Symbol ──────────────────────────
const SYMBOL_TO_WINDOW_TYPE: Record<MarkerSymbol, WindowType | null> = {
  window_x: 'double_hung',
  front_door: null,
  patio_door: 'patio_door',
  special_shape: 'special_shape',
  oriel: 'oriel',
  note: null,
  arrow: null,
};

const SYMBOL_TO_MARKER_TYPE: Record<MarkerSymbol, string> = {
  window_x: 'window',
  front_door: 'door',
  patio_door: 'door',
  special_shape: 'window',
  oriel: 'window',
  note: 'note',
  arrow: 'dimension',
};

// ── Create marker data with defaults ────────────────────────
export function createMarkerData(
  sketchId: string,
  symbol: MarkerSymbol,
  x: number,
  y: number,
  elevation: string,
  existingMarkers: SketchMarkerData[],
): SketchMarkerData {
  const isOpeningMarker = symbol !== 'note' && symbol !== 'arrow' && symbol !== 'front_door';
  const nextNumber = isOpeningMarker
    ? getNextMarkerNumber(existingMarkers)
    : null;

  const label = symbol === 'front_door'
    ? 'Front Door'
    : symbol === 'note'
      ? 'Note'
      : symbol === 'arrow'
        ? ''
        : `X #${nextNumber}`;

  return {
    id: `marker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sketchId,
    markerType: SYMBOL_TO_MARKER_TYPE[symbol],
    markerNumber: nextNumber,
    markerSymbol: symbol,
    markerLabel: label,
    windowType: SYMBOL_TO_WINDOW_TYPE[symbol],
    shapeType: null,
    x, y,
    width: null,
    height: null,
    unitedInches: null,
    elevation,
    roomLocation: '',
    floorNumber: 1,
    notes: '',
    linkedOrderRowNumber: nextNumber,
    validationStatus: 'incomplete',
    groupId: null,
    ladderReq: false,
    exteriorMaterial: '',
    removalType: WW_OPENING_DEFAULTS.removalType || 'ALUM',
    installType: '',
    pricingStatus: 'pending',
  };
}

// ── Get next available marker number ────────────────────────
export function getNextMarkerNumber(markers: SketchMarkerData[]): number {
  const numbers = markers
    .filter(m => m.markerNumber !== null && m.markerSymbol !== 'front_door' && m.markerSymbol !== 'note' && m.markerSymbol !== 'arrow')
    .map(m => m.markerNumber!);
  if (numbers.length === 0) return 1;
  return Math.max(...numbers) + 1;
}

// ── Create opening data from marker ─────────────────────────
export function createOpeningFromMarker(
  marker: SketchMarkerData,
  appointmentId: string,
): Record<string, any> {
  return {
    appointmentId,
    openingNumber: marker.markerNumber || 1,
    quantity: 1,
    roomLocation: marker.roomLocation || '',
    elevation: marker.elevation || 'front',
    floorNumber: marker.floorNumber || 1,
    width: marker.width || 0,
    height: marker.height || 0,
    unitedInches: marker.unitedInches || 0,
    productCategory: marker.windowType || 'double_hung',
    productModel: '',
    seriesModel: '4000 Series',
    interiorColor: 'White',
    exteriorColor: 'White',
    gridStyle: 'None',
    gridPattern: '',
    glassPackage: WW_OPENING_DEFAULTS.glassPackage || 'LEE',
    temperedGlass: 'none',
    obscureGlass: 'none',
    argon: false,
    foamEnhanced: WW_OPENING_DEFAULTS.foamEnhanced ?? true,
    lowEPackage: '',
    screenOption: marker.windowType === 'picture' ? 'No Screen' : 'Full Screen',
    nailFin: false,
    oriel: marker.windowType === 'oriel',
    horizontalRR: false,
    hinge: '',
    exteriorType: marker.exteriorMaterial || '',
    trimType: '',
    trimNotes: '',
    removalType: marker.removalType || WW_OPENING_DEFAULTS.removalType || 'ALUM',
    installType: marker.installType || '',
    sillRepair: false,
    installNotes: '',
    customerNotes: '',
    installerNotes: '',
    basePrice: 0,
    optionsPrice: 0,
    laborPrice: 0,
    totalPrice: 0,
    radius: null,
    customRadius: null,
    legHeight: null,
    specialtyNotes: marker.shapeType ? `Shape: ${marker.shapeType}` : '',
    needsVerification: false,
    pricingStatus: 'pending',
  };
}

// ── Calculate united inches ─────────────────────────────────
export function calcUnitedInches(width: number, height: number): number {
  return Math.round((width + height) * 100) / 100;
}

// ── Validate marker ↔ opening ↔ order row sync ──────────────
export function validateSketchSync(
  markers: SketchMarkerData[],
  openings: any[],
  groups: MarkerGroupData[],
): SyncWarning[] {
  const warnings: SyncWarning[] = [];
  const openingMarkers = markers.filter(m =>
    m.markerSymbol !== 'note' && m.markerSymbol !== 'arrow' && m.markerSymbol !== 'front_door'
  );

  // Check front door exists
  if (!markers.find(m => m.markerSymbol === 'front_door')) {
    warnings.push({
      type: 'missing_front_door',
      severity: 'medium',
      message: 'No front door marker placed. Add one to establish house orientation.',
    });
  }

  // Check each opening marker has a linked opening
  for (const marker of openingMarkers) {
    const linkedOpening = openings.find(o => o.openingNumber === marker.markerNumber);

    if (!linkedOpening) {
      warnings.push({
        type: 'marker_no_opening',
        severity: 'high',
        message: `Marker X #${marker.markerNumber} has no linked opening record.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // Missing measurement
    if (!marker.width || !marker.height) {
      warnings.push({
        type: 'missing_measurement',
        severity: 'blocker',
        message: `X #${marker.markerNumber}: Missing width or height measurement.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // Missing window type
    if (!marker.windowType) {
      warnings.push({
        type: 'missing_window_type',
        severity: 'high',
        message: `X #${marker.markerNumber}: No window type selected.`,
        markerNumber: marker.markerNumber!,
      });
    }

    // Oriel without confirmation
    if (marker.windowType === 'oriel') {
      // Check if oriel confirmation exists (would be in opening data)
      if (linkedOpening && !linkedOpening.orielConfirmed) {
        warnings.push({
          type: 'oriel_no_confirmation',
          severity: 'blocker',
          message: `X #${marker.markerNumber}: Oriel window missing largest sash/window panel confirmation.`,
          markerNumber: marker.markerNumber!,
        });
      }
    }

    // Special shape missing dimensions
    if (marker.windowType === 'special_shape') {
      if (!marker.shapeType) {
        warnings.push({
          type: 'special_shape_missing_dims',
          severity: 'blocker',
          message: `X #${marker.markerNumber}: Special shape window missing shape type.`,
          markerNumber: marker.markerNumber!,
        });
      }
    }
  }

  // Check each opening has a marker
  for (const opening of openings) {
    const linkedMarker = openingMarkers.find(m => m.markerNumber === opening.openingNumber);
    if (!linkedMarker) {
      warnings.push({
        type: 'opening_no_marker',
        severity: 'medium',
        message: `Opening #${opening.openingNumber} has no sketch marker.`,
        openingNumber: opening.openingNumber,
      });
    }
  }

  // Duplicate marker numbers
  const numberCounts: Record<number, number> = {};
  for (const marker of openingMarkers) {
    if (marker.markerNumber !== null) {
      numberCounts[marker.markerNumber] = (numberCounts[marker.markerNumber] || 0) + 1;
    }
  }
  for (const [num, count] of Object.entries(numberCounts)) {
    if (count > 1) {
      warnings.push({
        type: 'duplicate_number',
        severity: 'high',
        message: `Marker number #${num} is used ${count} times. Each marker should have a unique number.`,
        markerNumber: parseInt(num),
      });
    }
  }

  // Joined markers missing group note
  for (const group of groups) {
    if (!group.groupNote || group.groupNote.trim() === '') {
      warnings.push({
        type: 'joined_missing_note',
        severity: 'medium',
        message: `Mull/joined group (${group.groupType}) is missing a group note.`,
      });
    }
  }

  return warnings;
}

// ── Compute marker validation status ────────────────────────
export function computeMarkerValidation(marker: SketchMarkerData, opening: any | null): ValidationStatus {
  if (!marker.width || !marker.height) return 'incomplete';
  if (!marker.windowType) return 'incomplete';
  if (!opening) return 'incomplete';
  if (opening.totalPrice > 0) return 'priced';
  if (marker.width > 0 && marker.height > 0) return 'measured';
  return 'incomplete';
}

// ── Build complete lockdown checklist ────────────────────────
export interface LockdownItem {
  id: string;
  category: 'sketch' | 'rules' | 'tempered' | 'pricing';
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message?: string;
  blocker: boolean;
}

export function buildLockdownChecklist(
  markers: SketchMarkerData[],
  openings: any[],
  groups: MarkerGroupData[],
  safetyReviews: any[],
): LockdownItem[] {
  const items: LockdownItem[] = [];
  const openingMarkers = markers.filter(m =>
    m.markerSymbol !== 'note' && m.markerSymbol !== 'arrow' && m.markerSymbol !== 'front_door'
  );

  // ── SKETCH ──
  const hasFrontDoor = markers.some(m => m.markerSymbol === 'front_door');
  items.push({ id: 'front-door', category: 'sketch', label: 'Front door marker placed', status: hasFrontDoor ? 'pass' : 'warn', blocker: false });

  const allNumbered = openingMarkers.every(m => m.markerNumber !== null);
  items.push({ id: 'all-numbered', category: 'sketch', label: 'All markers numbered', status: allNumbered ? 'pass' : 'fail', blocker: true });

  const allMeasured = openingMarkers.every(m => m.width && m.height && m.width > 0 && m.height > 0);
  items.push({ id: 'all-measured', category: 'sketch', label: 'All windows measured', status: allMeasured ? 'pass' : 'fail', blocker: true });

  const allLinked = openingMarkers.every(m => openings.find(o => o.openingNumber === m.markerNumber));
  items.push({ id: 'all-linked', category: 'sketch', label: 'All markers linked to order rows', status: allLinked ? 'pass' : 'fail', blocker: true });

  const allGroupsReviewed = groups.every(g => g.groupNote && g.groupNote.trim() !== '');
  items.push({ id: 'groups-reviewed', category: 'sketch', label: 'All joined/mulled windows reviewed', status: groups.length === 0 ? 'skip' : allGroupsReviewed ? 'pass' : 'warn', blocker: false });

  const specialShapesOk = openingMarkers.filter(m => m.windowType === 'special_shape').every(m => m.shapeType);
  items.push({ id: 'special-shapes', category: 'sketch', label: 'Special shapes reviewed', status: openingMarkers.filter(m => m.windowType === 'special_shape').length === 0 ? 'skip' : specialShapesOk ? 'pass' : 'fail', blocker: true });

  const orielsConfirmed = openingMarkers.filter(m => m.windowType === 'oriel').every(m => {
    const op = openings.find(o => o.openingNumber === m.markerNumber);
    return op && op.orielConfirmed;
  });
  items.push({ id: 'oriels-confirmed', category: 'sketch', label: 'Oriel largest sash/panel confirmed', status: openingMarkers.filter(m => m.windowType === 'oriel').length === 0 ? 'skip' : orielsConfirmed ? 'pass' : 'fail', blocker: true });

  // ── RULES ──
  items.push({ id: 'lee-applied', category: 'rules', label: 'LEE glass default applied or changed', status: openings.every(o => o.glassPackage) ? 'pass' : 'warn', blocker: false });
  items.push({ id: 'foam-checked', category: 'rules', label: 'Foam Enhanced checked or changed', status: 'pass', blocker: false });
  items.push({ id: 'alum-applied', category: 'rules', label: 'ALUM removal applied or changed', status: openings.every(o => o.removalType) ? 'pass' : 'warn', blocker: false });

  // ── TEMPERED ──
  const unresolvedTempered = safetyReviews.filter(r =>
    r.temperedRequired === 'unsure' || (r.safetyReviewStatus === 'flagged' && r.temperedRequired === 'not_reviewed')
  );
  items.push({
    id: 'tempered-resolved',
    category: 'tempered',
    label: 'All tempered reviews resolved',
    status: unresolvedTempered.length === 0 ? 'pass' : 'fail',
    message: unresolvedTempered.length > 0 ? `${unresolvedTempered.length} unresolved tempered review(s)` : undefined,
    blocker: true,
  });

  // ── PRICING ──
  const allPriced = openings.every(o => o.totalPrice > 0 || o.pricingStatus === 'manual');
  items.push({ id: 'all-priced', category: 'pricing', label: 'Pricing generated from marker data', status: allPriced ? 'pass' : 'warn', blocker: false });

  return items;
}

// ── Check if export is blocked ──────────────────────────────
export function isExportBlocked(checklist: LockdownItem[]): { blocked: boolean; blockers: string[] } {
  const blockers = checklist.filter(i => i.blocker && i.status === 'fail').map(i => i.label);
  return { blocked: blockers.length > 0, blockers };
}

// ── Clear story pricing calculation ─────────────────────────
export function calculateClearStoryCharges(openings: any[]): { openingNumber: number; charge: number; label: string }[] {
  const clearStoryOpenings = openings.filter(o =>
    o.clearStory || o.ladderRequired || (o.floorNumber && o.floorNumber >= 2)
  );
  return clearStoryOpenings.map((o, idx) => ({
    openingNumber: o.openingNumber,
    charge: idx === 0 ? 225 : 75,
    label: idx === 0 ? 'Clear Story — First ($225)' : 'Clear Story — Additional ($75)',
  }));
}

// ── Glass area calculation for tempered review ──────────────
export function calculateGlassArea(widthInches: number, heightInches: number): number {
  return Math.round((widthInches * heightInches) / 144 * 100) / 100;
}

// ── Tempered Rule A: Tub/Shower within 60" ──────────────────
export function checkTubShowerRule(distanceInches: number | null, nearby: string | null): boolean {
  if (nearby === 'yes' && (distanceInches === null || distanceInches <= 60)) return true;
  if (distanceInches !== null && distanceInches <= 60) return true;
  return false;
}

// ── Tempered Rule B: Low glass <18" + >9 sqft ──────────────
export function checkLowGlassRule(bottomHeightInches: number | null, glassAreaSqft: number | null): boolean {
  if (bottomHeightInches !== null && bottomHeightInches < 18 && glassAreaSqft !== null && glassAreaSqft > 9) return true;
  return false;
}
