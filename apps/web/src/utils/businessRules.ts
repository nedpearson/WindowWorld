// ═══════════════════════════════════════════════════════════════
// Window World — Business Rules Engine
// Centralized, configurable rules system for form validation,
// auto-population, smart warnings, and pricing adjustments.
// ═══════════════════════════════════════════════════════════════

export type RuleSeverity = 'blocker' | 'high' | 'medium' | 'low' | 'info';
export type RuleTrigger =
  | 'product_type_change' | 'color_change' | 'exterior_type_change'
  | 'clear_story_toggle' | 'abbreviation_entry' | 'oriel_toggle'
  | 'opening_save' | 'form_validate' | 'pre_export';

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  triggerCondition: (opening: any, context: RuleContext) => boolean;
  actions: RuleAction[];
  severity: RuleSeverity;
  autoApply: boolean;
  requiresConfirmation: boolean;
  active: boolean;
  category: string;
  triggers: RuleTrigger[];
}

export interface RuleAction {
  type: 'set_field' | 'add_warning' | 'add_note' | 'add_price' | 'expand_abbreviation' | 'require_confirmation' | 'flag_field';
  field?: string;
  value?: any;
  message?: string;
  priceLabel?: string;
  priceAmount?: number;
  pricingLogic?: 'fixed' | 'first_plus_additional';
  firstAmount?: number;
  additionalAmount?: number;
}

export interface RuleContext {
  allOpenings: any[];
  appointment?: any;
  openingIndex?: number;
  /** For abbreviation rules */
  inputText?: string;
  /** Counts for pricing logic */
  clearStoryCount?: number;
  clearStoryIndex?: number;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  autoApplied: boolean;
  requiresConfirmation: boolean;
  actions: AppliedAction[];
  openingNumber?: number;
}

export interface AppliedAction {
  type: RuleAction['type'];
  field?: string;
  value?: any;
  message: string;
  priceAmount?: number;
  applied: boolean;
  confirmed: boolean;
}

// ═══════════════════════════════════════════════════════════════
// WINDOW WORLD BUSINESS RULES
// ═══════════════════════════════════════════════════════════════

export const WINDOW_WORLD_RULES: BusinessRule[] = [
  // ─── RULE 1: PICTURE WINDOW — NO SCREEN ─────────────────
  {
    id: 'ww-picture-no-screen',
    name: 'Picture Window — No Screen',
    description: 'Picture windows should have no screen by default. If a screen is selected, show a confirmation warning.',
    triggerCondition: (opening) => {
      const cat = (opening.productCategory || opening.model || '').toLowerCase();
      return cat.includes('picture') || cat === 'pic';
    },
    actions: [
      { type: 'set_field', field: 'screenOption', value: 'No Screen', message: 'Picture window: auto-set to No Screen' },
      { type: 'add_note', message: 'PIC NO SCREEN' },
      { type: 'add_warning', message: 'Picture windows normally have no screen. Confirm if override is intentional.' },
    ],
    severity: 'medium',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['product_type_change', 'opening_save'],
  },

  // ─── RULE 2: DIFFERENT COLOR WINDOW ─────────────────────
  {
    id: 'ww-different-color',
    name: 'Different Color Window',
    description: 'If window color differs from standard White/White, flag the color difference and remind to mark out the other color on the order form.',
    triggerCondition: (opening) => {
      const int = (opening.interiorColor || opening.intColor || '').toLowerCase();
      const ext = (opening.exteriorColor || opening.extColor || '').toLowerCase();
      const defaultColor = 'white';
      return (int !== defaultColor && int !== '') || (ext !== defaultColor && ext !== '');
    },
    actions: [
      { type: 'flag_field', field: 'interiorColor', message: 'Non-standard color selected' },
      { type: 'flag_field', field: 'exteriorColor', message: 'Non-standard color selected' },
      { type: 'add_warning', message: 'Different color selected. Mark out the other color on the order form if applicable.' },
      { type: 'require_confirmation', message: 'Color marked/confirmed' },
    ],
    severity: 'high',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'color_validation',
    triggers: ['color_change', 'opening_save'],
  },

  // ─── RULE 3: SIDING OR WOOD EXTERIOR ────────────────────
  {
    id: 'ww-siding-wood-exterior',
    name: 'Siding/Wood Exterior — Vinyl Trim + Header',
    description: 'If exterior type is siding or wood, automatically require vinyl trim and header.',
    triggerCondition: (opening) => {
      const ext = (opening.exteriorType || opening.installType || opening.typeExt || '').toLowerCase();
      return ext.includes('siding') || ext.includes('wood') || ext.includes('vinyl siding');
    },
    actions: [
      { type: 'set_field', field: 'trimRequired', value: true, message: 'Vinyl trim required for siding/wood exterior' },
      { type: 'set_field', field: 'headerRequired', value: true, message: 'Header required for siding/wood exterior' },
      { type: 'add_note', message: 'Siding/wood exterior: vinyl trim required; header required.' },
      { type: 'add_warning', message: 'Siding/wood exterior detected. Verify vinyl trim and header are included in pricing.' },
    ],
    severity: 'high',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'installation',
    triggers: ['exterior_type_change', 'opening_save'],
  },

  // ─── RULE 4: CLEAR STORY ────────────────────────────────
  {
    id: 'ww-clear-story',
    name: 'Clear Story — Ladder Access + Pricing',
    description: 'Clear story windows require ladder access. First clear story = $225, each additional = $75.',
    triggerCondition: (opening) => {
      return !!(
        opening.clearStory || opening.ladderRequired ||
        (opening.floorNumber && opening.floorNumber >= 2) ||
        (opening.installNotes || '').toLowerCase().includes('clear story') ||
        (opening.installNotes || '').toLowerCase().includes('ladder')
      );
    },
    actions: [
      { type: 'add_note', message: 'Clear story / ladder access required.' },
      { type: 'add_price', priceLabel: 'Clear Story Charge', pricingLogic: 'first_plus_additional', firstAmount: 225, additionalAmount: 75, message: 'Clear story charge: first = $225, additional = $75 each' },
      { type: 'add_warning', message: 'Require exterior photo if possible for clear story opening.' },
    ],
    severity: 'high',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'installation',
    triggers: ['clear_story_toggle', 'opening_save'],
  },

  // ─── RULE 5: BSO ABBREVIATION ───────────────────────────
  {
    id: 'ww-bso-expansion',
    name: 'BSO — Bottom Sash Only',
    description: 'When "BSO" is entered, expand to "Bottom Sash Only" and show helper label.',
    triggerCondition: (opening, ctx) => {
      const text = (ctx.inputText || opening.notes || opening.installNotes || opening.model || '').toUpperCase();
      return text.includes('BSO');
    },
    actions: [
      { type: 'expand_abbreviation', field: 'notes', value: 'Bottom Sash Only', message: 'BSO = Bottom Sash Only' },
      { type: 'add_warning', message: 'BSO = Bottom Sash Only. Verify this is the intended configuration.' },
    ],
    severity: 'info',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'abbreviations',
    triggers: ['abbreviation_entry', 'opening_save'],
  },

  // ─── RULE 6: ORIEL WINDOW ──────────────────────────────
  {
    id: 'ww-oriel-top-sash',
    name: 'Oriel — Top Sash Measurement',
    description: 'Oriel window measurements must be based on the top sash. Require confirmation.',
    triggerCondition: (opening) => {
      return !!(
        opening.oriel ||
        (opening.productCategory || '').toLowerCase().includes('oriel') ||
        (opening.model || '').toLowerCase().includes('oriel')
      );
    },
    actions: [
      { type: 'require_confirmation', message: 'Oriel measurement must be based on top sash. Confirm top sash measurement used.' },
      { type: 'add_warning', message: 'Confirm oriel measurement used top sash.' },
    ],
    severity: 'blocker',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'measurement_validation',
    triggers: ['oriel_toggle', 'opening_save', 'pre_export'],
  },

  // ─── ADDITIONAL ERROR PREVENTION RULES ─────────────────
  {
    id: 'ww-impossible-dimensions',
    name: 'Impossible Dimensions Check',
    description: 'Catch impossible or suspicious window dimensions',
    triggerCondition: (opening) => {
      const w = parseFloat(opening.width) || 0;
      const h = parseFloat(opening.height) || 0;
      if (w <= 0 || h <= 0) return false;
      return w > 120 || h > 120 || w < 8 || h < 8 || (w > h * 4) || (h > w * 6);
    },
    actions: [
      { type: 'add_warning', message: 'Dimensions appear unusual. Verify width and height are correct and not swapped.' },
    ],
    severity: 'high',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'measurement_validation',
    triggers: ['opening_save', 'form_validate'],
  },

  {
    id: 'ww-picture-screen-override',
    name: 'Picture Window Screen Override Warning',
    description: 'Warn if a picture window has a screen selected (override scenario)',
    triggerCondition: (opening) => {
      const cat = (opening.productCategory || opening.model || '').toLowerCase();
      const screen = (opening.screenOption || '').toLowerCase();
      return (cat.includes('picture') || cat === 'pic') && screen !== 'no screen' && screen !== '' && screen !== 'none';
    },
    actions: [
      { type: 'add_warning', message: 'Picture windows normally have no screen. Confirm screen override is intentional.' },
      { type: 'require_confirmation', message: 'Picture window screen override confirmed' },
    ],
    severity: 'high',
    autoApply: false,
    requiresConfirmation: true,
    active: true,
    category: 'product_defaults',
    triggers: ['product_type_change', 'opening_save'],
  },

  {
    id: 'ww-patio-door-labor',
    name: 'Patio Door — Labor Review',
    description: 'Patio doors require labor/pricing review',
    triggerCondition: (opening) => {
      const cat = (opening.productCategory || opening.model || '').toLowerCase();
      return cat.includes('patio') || cat.includes('sliding door') || cat.includes('french door');
    },
    actions: [
      { type: 'add_note', message: 'Verify track/frame condition.' },
      { type: 'add_warning', message: 'Patio door detected. Verify labor pricing and track condition.' },
    ],
    severity: 'medium',
    autoApply: true,
    requiresConfirmation: false,
    active: true,
    category: 'product_defaults',
    triggers: ['product_type_change', 'opening_save'],
  },
];

// ═══════════════════════════════════════════════════════════════
// ABBREVIATION MAP
// ═══════════════════════════════════════════════════════════════
export const ABBREVIATION_MAP: Record<string, string> = {
  'BSO': 'Bottom Sash Only',
  'DH': 'Double Hung',
  'PIC': 'Picture Window',
  'SL': 'Slider',
  'CAS': 'Casement',
  'AWN': 'Awning',
  'PD': 'Patio Door',
  'CS': 'Clear Story',
  'NF': 'Nail Fin',
  'FS': 'Full Screen',
  'HS': 'Half Screen',
  'VT': 'Vinyl Trim',
  'HDR': 'Header',
  'SZ': 'SolarZone',
  'SZE': 'SolarZone Elite',
  'COL': 'Colonial Grid',
  'TG': 'Tempered Glass',
  'OG': 'Obscure Glass',
  'FE': 'Foam Enhanced',
};

// ═══════════════════════════════════════════════════════════════
// AUTO-GENERATED OPENING NAMES
// ═══════════════════════════════════════════════════════════════
export function generateOpeningName(opening: any): string {
  const parts: string[] = [];
  if (opening.roomLocation) parts.push(opening.roomLocation);
  if (opening.elevation) parts.push(capitalize(opening.elevation));
  if (opening.position) parts.push(opening.position);
  if (parts.length === 0) {
    const cat = (opening.productCategory || opening.model || 'Window').toLowerCase();
    if (cat.includes('patio') || cat.includes('door')) parts.push('Patio Door');
    else if (cat.includes('picture')) parts.push('Picture Window');
    else if (cat.includes('casement')) parts.push('Casement');
    else if (cat.includes('awning')) parts.push('Awning');
    else parts.push('Window');
  }
  if (opening.floorNumber && opening.floorNumber >= 2) {
    parts.push(opening.floorNumber === 2 ? '2nd Floor' : `${opening.floorNumber}th Floor`);
  }
  if (opening.clearStory) parts.push('Clear Story');
  return parts.join(' ') || `Window ${opening.openingNumber || ''}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ═══════════════════════════════════════════════════════════════
// RULE ENGINE — Evaluate rules against an opening
// ═══════════════════════════════════════════════════════════════
export function evaluateRules(
  opening: any,
  context: RuleContext,
  triggers: RuleTrigger[] = ['opening_save'],
): RuleResult[] {
  const results: RuleResult[] = [];

  for (const rule of WINDOW_WORLD_RULES) {
    if (!rule.active) continue;
    if (!rule.triggers.some(t => triggers.includes(t))) continue;

    try {
      if (!rule.triggerCondition(opening, context)) continue;
    } catch { continue; }

    const appliedActions: AppliedAction[] = rule.actions.map(action => {
      let message = action.message || '';

      // Calculate pricing for clear story
      if (action.pricingLogic === 'first_plus_additional' && rule.id === 'ww-clear-story') {
        const csOpenings = context.allOpenings.filter(o =>
          o.clearStory || o.ladderRequired || (o.floorNumber && o.floorNumber >= 2)
        );
        const idx = csOpenings.findIndex(o =>
          (o.openingNumber || o.id) === (opening.openingNumber || opening.id)
        );
        const amount = idx === 0 ? (action.firstAmount || 225) : (action.additionalAmount || 75);
        message = `Clear story charge: ${idx === 0 ? 'first' : 'additional'} = $${amount}`;
        return { type: action.type, field: action.field, value: amount, message, priceAmount: amount, applied: rule.autoApply, confirmed: false };
      }

      return { type: action.type, field: action.field, value: action.value, message, priceAmount: action.priceAmount, applied: rule.autoApply, confirmed: false };
    });

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      autoApplied: rule.autoApply,
      requiresConfirmation: rule.requiresConfirmation,
      actions: appliedActions,
      openingNumber: opening.openingNumber,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// APPLY AUTO-ACTIONS to an opening (mutates a copy)
// ═══════════════════════════════════════════════════════════════
export function applyAutoRules(opening: any, context: RuleContext): { updated: any; results: RuleResult[] } {
  const results = evaluateRules(opening, context, ['opening_save']);
  const updated = { ...opening };

  for (const result of results) {
    if (!result.autoApplied) continue;
    for (const action of result.actions) {
      if (action.type === 'set_field' && action.field) {
        (updated as any)[action.field] = action.value;
        action.applied = true;
      }
      if (action.type === 'expand_abbreviation' && action.field) {
        const current = (updated as any)[action.field] || '';
        if (current.toUpperCase().includes('BSO')) {
          (updated as any)[action.field] = current.replace(/\bBSO\b/gi, 'Bottom Sash Only');
          action.applied = true;
        }
      }
    }
  }

  return { updated, results };
}

// ═══════════════════════════════════════════════════════════════
// SMART INSTALL NOTES — auto-generate based on opening details
// ═══════════════════════════════════════════════════════════════
export function generateSmartInstallNotes(opening: any): { note: string; reason: string; severity: RuleSeverity }[] {
  const notes: { note: string; reason: string; severity: RuleSeverity }[] = [];
  const cat = (opening.productCategory || opening.model || '').toLowerCase();
  const ext = (opening.exteriorType || opening.installType || opening.typeExt || '').toLowerCase();

  if (opening.clearStory || opening.ladderRequired || (opening.floorNumber && opening.floorNumber >= 2)) {
    notes.push({ note: 'Ladder access required.', reason: 'Second floor / clear story opening', severity: 'high' });
  }
  if (ext.includes('siding') || ext.includes('wood')) {
    notes.push({ note: 'Vinyl trim required. Header required.', reason: 'Siding/wood exterior', severity: 'high' });
  }
  if (opening.sillRepair) {
    notes.push({ note: 'Verify sill condition and repair as needed.', reason: 'Sill damage flagged', severity: 'medium' });
  }
  if (cat.includes('picture')) {
    notes.push({ note: 'Picture window; no screen unless manually overridden.', reason: 'Picture window type', severity: 'low' });
  }
  if (cat.includes('patio') || cat.includes('door')) {
    notes.push({ note: 'Verify track/frame condition.', reason: 'Patio door', severity: 'medium' });
  }
  if (opening.oriel) {
    notes.push({ note: 'Oriel — measurement must be based on top sash.', reason: 'Oriel window', severity: 'high' });
  }
  if ((opening.roomLocation || '').toLowerCase().match(/bath|shower/)) {
    notes.push({ note: 'Bathroom — verify tempered glass requirement.', reason: 'Bathroom location', severity: 'medium' });
  }

  return notes;
}

// ═══════════════════════════════════════════════════════════════
// ONE-TAP PACKAGE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
export interface QuickPackage {
  id: string;
  label: string;
  icon: string;
  description: string;
  applyFields: Record<string, any>;
  targetFilter?: (opening: any) => boolean;
  category: string;
}

export const QUICK_PACKAGES: QuickPackage[] = [
  { id: 'color-white-all', label: 'White Int/Ext — All', icon: '⬜', description: 'Apply white interior/exterior to all openings', applyFields: { interiorColor: 'White', exteriorColor: 'White' }, category: 'color' },
  { id: 'screen-full-all', label: 'Full Screen — All', icon: '🪟', description: 'Apply full screen to all openings', applyFields: { screenOption: 'Full Screen', fullScreen: true }, category: 'screen' },
  { id: 'screen-full-dh', label: 'Full Screen — Double Hungs', icon: '🪟', description: 'Apply full screen to all double hung windows', applyFields: { screenOption: 'Full Screen', fullScreen: true }, targetFilter: (o) => (o.productCategory || o.model || '').toLowerCase().includes('double_hung'), category: 'screen' },
  { id: 'grid-colonial-all', label: 'Colonial Grids — All', icon: '🔲', description: 'Apply colonial grids to all openings', applyFields: { gridStyle: 'Colonial', gridFull: true }, category: 'grid' },
  { id: 'grid-colonial-front', label: 'Colonial Grids — Front', icon: '🔲', description: 'Apply colonial grids to front-facing openings', applyFields: { gridStyle: 'Colonial', gridFull: true }, targetFilter: (o) => (o.elevation || '').toLowerCase() === 'front', category: 'grid' },
  { id: 'grid-none-all', label: 'No Grids — All', icon: '⬜', description: 'Remove grids from all openings', applyFields: { gridStyle: 'None', gridPattern: '', gridFull: false, gridSpec: false }, category: 'grid' },
  { id: 'floor-2-selected', label: 'Mark Second Floor', icon: '🏠', description: 'Mark selected openings as second floor', applyFields: { floorNumber: 2 }, category: 'floor' },
  { id: 'brick-install', label: 'Brick Install Package', icon: '🧱', description: 'Apply brick exterior install package', applyFields: { exteriorType: 'Brick', installType: 'brick' }, category: 'install' },
  { id: 'siding-install', label: 'Siding/Wood Exterior', icon: '🪵', description: 'Apply siding/wood exterior with vinyl trim + header', applyFields: { exteriorType: 'Siding', installType: 'siding', trimRequired: true, headerRequired: true }, category: 'install' },
  { id: 'no-screen-pic', label: 'No Screen — Pictures', icon: '🚫', description: 'Set no screen for all picture windows', applyFields: { screenOption: 'No Screen', fullScreen: false }, targetFilter: (o) => (o.productCategory || o.model || '').toLowerCase().includes('picture'), category: 'screen' },
  { id: 'foam-all', label: 'Foam Enhanced — All', icon: '🫧', description: 'Apply foam enhanced to all openings', applyFields: { foamEnhanced: true }, category: 'options' },
  { id: 'nailfin-all', label: 'Nail Fin — All', icon: '🔩', description: 'Apply nail fin to all openings', applyFields: { nailFin: true }, category: 'options' },
];
