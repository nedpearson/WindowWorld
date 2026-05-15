// ═══════════════════════════════════════════════════════════════
// Sketch Sync Engine — Unit Tests
// Covers: marker creation, opening sync, validation, tempered rules
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  createMarkerData,
  createOpeningFromMarker,
  validateSketchSync,
  calcUnitedInches,
  computeMarkerValidation,
  getNextMarkerNumber,
  checkTubShowerRule,
  checkLowGlassRule,
  calculateGlassArea,
  calculateClearStoryCharges,
  buildLockdownChecklist,
  isExportBlocked,
} from './sketchSync';
import type { SketchMarkerData, MarkerGroupData } from './sketchSync';

describe('createMarkerData', () => {
  it('creates window_x marker with correct number', () => {
    const m = createMarkerData('sketch1', 'window_x', 100, 200, 'front', []);
    expect(m.markerSymbol).toBe('window_x');
    expect(m.markerNumber).toBe(1);
    expect(m.markerLabel).toBe('X #1');
    expect(m.windowType).toBe('double_hung');
    expect(m.validationStatus).toBe('incomplete');
  });

  it('increments marker number', () => {
    const existing = [createMarkerData('s', 'window_x', 0, 0, 'front', [])];
    const m2 = createMarkerData('s', 'window_x', 50, 50, 'front', existing);
    expect(m2.markerNumber).toBe(2);
  });

  it('front door has no number', () => {
    const m = createMarkerData('s', 'front_door', 100, 100, 'front', []);
    expect(m.markerNumber).toBeNull();
    expect(m.markerLabel).toBe('Front Door');
  });

  it('note marker has no number', () => {
    const m = createMarkerData('s', 'note', 50, 50, 'front', []);
    expect(m.markerNumber).toBeNull();
    expect(m.markerLabel).toBe('Note');
  });

  it('patio_door auto-sets window type', () => {
    const m = createMarkerData('s', 'patio_door', 100, 100, 'rear', []);
    expect(m.windowType).toBe('patio_door');
    expect(m.markerNumber).toBe(1);
  });

  it('oriel auto-sets window type', () => {
    const m = createMarkerData('s', 'oriel', 100, 100, 'front', []);
    expect(m.windowType).toBe('oriel');
  });

  it('special_shape auto-sets window type', () => {
    const m = createMarkerData('s', 'special_shape', 100, 100, 'front', []);
    expect(m.windowType).toBe('special_shape');
  });
});

describe('createOpeningFromMarker', () => {
  it('creates opening with WW defaults', () => {
    const marker = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    const opening = createOpeningFromMarker(marker, 'appt_1');
    expect(opening.appointmentId).toBe('appt_1');
    expect(opening.openingNumber).toBe(1);
    expect(opening.glassPackage).toBe('LEE');
    expect(opening.foamEnhanced).toBe(true);
    expect(opening.removalType).toBe('ALUM');
    expect(opening.seriesModel).toBe('4000 Series');
    expect(opening.interiorColor).toBe('White');
    expect(opening.exteriorColor).toBe('White');
  });

  it('picture window gets no screen', () => {
    const marker = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    marker.windowType = 'picture';
    const opening = createOpeningFromMarker(marker, 'appt_1');
    expect(opening.screenOption).toBe('No Screen');
  });
});

describe('calcUnitedInches', () => {
  it('calculates correctly', () => {
    expect(calcUnitedInches(35.375, 59.875)).toBe(95.25);
  });
  it('returns 0 for zeros', () => {
    expect(calcUnitedInches(0, 0)).toBe(0);
  });
});

describe('validateSketchSync', () => {
  it('warns about missing front door', () => {
    const markers: SketchMarkerData[] = [createMarkerData('s', 'window_x', 100, 100, 'front', [])];
    const warnings = validateSketchSync(markers, [], []);
    expect(warnings.some(w => w.type === 'missing_front_door')).toBe(true);
  });

  it('warns about missing measurement', () => {
    const m = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    const warnings = validateSketchSync([m], [], []);
    expect(warnings.some(w => w.type === 'missing_measurement')).toBe(true);
  });

  it('warns about marker with no linked opening', () => {
    const m = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    const warnings = validateSketchSync([m], [], []);
    expect(warnings.some(w => w.type === 'marker_no_opening')).toBe(true);
  });

  it('no opening warning when linked', () => {
    const m = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m.width = 35; m.height = 60;
    const openings = [{ openingNumber: 1 }];
    const warnings = validateSketchSync([m], openings, []);
    expect(warnings.some(w => w.type === 'marker_no_opening')).toBe(false);
    expect(warnings.some(w => w.type === 'missing_measurement')).toBe(false);
  });

  it('warns about joined group missing note', () => {
    const groups: MarkerGroupData[] = [{
      id: 'g1', sketchId: 's', groupType: 'mull_pair', groupNote: '',
      keepSeparateRows: true, needsReview: true, pricingReviewed: false, memberMarkerIds: ['a', 'b'],
    }];
    const warnings = validateSketchSync([], [], groups);
    expect(warnings.some(w => w.type === 'joined_missing_note')).toBe(true);
  });
});

describe('Tempered Glass Rules', () => {
  it('Rule A: tub within 60 inches triggers', () => {
    expect(checkTubShowerRule(48, 'yes')).toBe(true);
    expect(checkTubShowerRule(60, 'yes')).toBe(true);
  });

  it('Rule A: no tub does not trigger', () => {
    expect(checkTubShowerRule(null, 'no')).toBe(false);
    expect(checkTubShowerRule(72, 'yes')).toBe(false);
  });

  it('Rule B: low glass with large area triggers', () => {
    expect(checkLowGlassRule(14, 10)).toBe(true);
    expect(checkLowGlassRule(17, 15)).toBe(true);
  });

  it('Rule B: high glass does not trigger', () => {
    expect(checkLowGlassRule(18, 10)).toBe(false);
    expect(checkLowGlassRule(14, 8)).toBe(false);
  });

  it('glass area calculation', () => {
    expect(calculateGlassArea(36, 36)).toBe(9);
    expect(calculateGlassArea(48, 48)).toBe(16);
  });
});

describe('Clear Story Pricing', () => {
  it('first = $225, additional = $75', () => {
    const openings = [
      { openingNumber: 1, floorNumber: 2 },
      { openingNumber: 2, floorNumber: 2 },
      { openingNumber: 3, floorNumber: 1 },
    ];
    const charges = calculateClearStoryCharges(openings);
    expect(charges.length).toBe(2);
    expect(charges[0].charge).toBe(225);
    expect(charges[1].charge).toBe(75);
  });
});

describe('Lockdown Checklist', () => {
  it('blocks export with unresolved items', () => {
    const markers: SketchMarkerData[] = [
      { ...createMarkerData('s', 'window_x', 100, 100, 'front', []), width: null, height: null },
    ];
    const checklist = buildLockdownChecklist(markers, [], [], []);
    const { blocked } = isExportBlocked(checklist);
    expect(blocked).toBe(true);
  });

  it('allows export when all checks pass', () => {
    const m = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m.width = 35; m.height = 60;
    const openings = [{ openingNumber: 1, glassPackage: 'LEE', removalType: 'ALUM', totalPrice: 500, pricingStatus: 'complete' }];
    const checklist = buildLockdownChecklist([m], openings, [], []);
    const blockerItems = checklist.filter(i => i.blocker && i.status === 'fail');
    // Should have no blocker failures (front door warning is non-blocker)
    expect(blockerItems.length).toBe(0);
  });
});
