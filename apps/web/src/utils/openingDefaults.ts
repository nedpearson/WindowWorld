// ═══════════════════════════════════════════════════════════════
// Window World — Opening Defaults Engine
// Applies Window World default field values to new openings.
// Tracks which values were defaulted vs manually entered.
// ═══════════════════════════════════════════════════════════════

export interface DefaultTracker {
  /** Fields that were set by defaults (not manually entered) */
  defaultedFields: Record<string, { value: any; source: string; ruleId?: string; appliedAt: number }>;
  /** Fields that were manually overridden after being defaulted */
  overriddenFields: Record<string, { originalDefault: any; newValue: any; overriddenAt: number }>;
}

// ─── WINDOW WORLD HARD DEFAULTS ─────────────────────────────
// These are the company-standard defaults for every new opening.
export const WW_OPENING_DEFAULTS: Record<string, any> = {
  // RULE A: Default glass option = LEE
  glassOption: 'LEE',
  glassPackage: 'LEE',
  // RULE B: Default foam enhanced = checked
  foamEnhanced: true,
  // RULE C: Default type removed = ALUM
  removalType: 'ALUM',
  typeRemoved: 'ALUM',
  // Standard defaults
  interiorColor: 'White',
  exteriorColor: 'White',
  seriesModel: '4000 Series',
  productCategory: 'double_hung',
  gridStyle: 'None',
  screenOption: 'Full Screen',
  quantity: 1,
  floorNumber: 1,
  elevation: 'front',
  argon: false,
  nailFin: false,
  oriel: false,
  horizontalRR: false,
  sillRepair: false,
  temperedGlass: 'none',
  obscureGlass: 'none',
};

// ─── CONDITIONAL DEFAULTS (based on other fields) ───────────
export interface ConditionalDefault {
  id: string;
  name: string;
  description: string;
  triggerField: string;
  triggerValues: string[];
  triggerOperator: 'equals' | 'includes' | 'not_equals';
  setField: string;
  setValue: any;
  helperNote: string;
  requiresConfirmation: boolean;
  additionalFields?: Record<string, any>;
  additionalNotes?: string;
}

export const WW_CONDITIONAL_DEFAULTS: ConditionalDefault[] = [
  // RULE D: Brick → Type Install = EXT
  {
    id: 'ww-brick-ext',
    name: 'Brick Exterior → EXT Install',
    description: 'When exterior type is Brick, default Type Install to EXT',
    triggerField: 'exteriorType',
    triggerValues: ['brick', 'Brick', 'BRICK'],
    triggerOperator: 'includes',
    setField: 'installType',
    setValue: 'EXT',
    helperNote: 'Brick exterior defaults Type Install to EXT.',
    requiresConfirmation: false,
  },
  // RULE E: Siding/Wood → Type Install = INT
  {
    id: 'ww-siding-int',
    name: 'Siding/Wood → INT Install + Trim/Header',
    description: 'When exterior type is Siding or Wood, default Type Install to INT and require vinyl trim/header',
    triggerField: 'exteriorType',
    triggerValues: ['siding', 'Siding', 'SIDING', 'wood', 'Wood', 'WOOD', 'vinyl siding', 'Vinyl Siding'],
    triggerOperator: 'includes',
    setField: 'installType',
    setValue: 'INT',
    helperNote: 'Siding/Wood exterior defaults Type Install to INT and requires vinyl trim/header.',
    requiresConfirmation: true,
    additionalFields: {
      trimRequired: true,
      headerRequired: true,
    },
    additionalNotes: 'Siding/wood exterior: vinyl trim required; header required.',
  },
  // RULE G: Picture Window → No Screen
  {
    id: 'ww-pic-no-screen',
    name: 'Picture Window → No Screen',
    description: 'Picture windows should default to No Screen',
    triggerField: 'productCategory',
    triggerValues: ['picture', 'pic', 'Picture', 'PIC'],
    triggerOperator: 'includes',
    setField: 'screenOption',
    setValue: 'No Screen',
    helperNote: 'Picture windows normally have no screen.',
    requiresConfirmation: false,
    additionalFields: { fullScreen: false },
  },
];

// ─── CREATE NEW OPENING WITH DEFAULTS ───────────────────────
export function createOpeningWithDefaults(
  appointmentId: string,
  openingNumber: number,
  existingOpenings: any[] = [],
  neverAskTwiceDefaults: Record<string, any> = {},
): { opening: any; tracker: DefaultTracker } {
  const tracker: DefaultTracker = { defaultedFields: {}, overriddenFields: {} };
  const now = Date.now();

  // Start with base empty opening
  const opening: any = {
    appointmentId,
    openingNumber,
    width: 0,
    height: 0,
    basePrice: 0,
    optionsPrice: 0,
    laborPrice: 0,
    totalPrice: 0,
    radius: null,
    customRadius: null,
    legHeight: null,
    specialtyNotes: '',
    needsVerification: false,
    installNotes: '',
    customerNotes: '',
    installerNotes: '',
    trimNotes: '',
    hinge: '',
    lowEPackage: '',
    installType: '',
    exteriorType: '',
    trimType: '',
    roomLocation: '',
    pricingStatus: 'pending',
  };

  // Apply Window World hard defaults
  for (const [field, value] of Object.entries(WW_OPENING_DEFAULTS)) {
    opening[field] = value;
    tracker.defaultedFields[field] = { value, source: 'ww_company_default', appliedAt: now };
  }

  // Apply Never Ask Twice defaults (from previous openings in this job)
  for (const [field, value] of Object.entries(neverAskTwiceDefaults)) {
    // Never Ask Twice overrides company defaults if available
    if (value !== undefined && value !== null && value !== '') {
      opening[field] = value;
      tracker.defaultedFields[field] = { value, source: 'never_ask_twice', appliedAt: now };
    }
  }

  return { opening, tracker };
}

// ─── APPLY CONDITIONAL DEFAULTS ─────────────────────────────
export function applyConditionalDefaults(
  opening: any,
  tracker: DefaultTracker,
  changedField?: string,
): { opening: any; tracker: DefaultTracker; appliedRules: ConditionalDefault[]; helperNotes: string[] } {
  const updated = { ...opening };
  const updatedTracker = { ...tracker };
  const appliedRules: ConditionalDefault[] = [];
  const helperNotes: string[] = [];

  for (const rule of WW_CONDITIONAL_DEFAULTS) {
    if (changedField && changedField !== rule.triggerField) continue;

    const triggerValue = (updated[rule.triggerField] || '').toString().toLowerCase();
    const matches = rule.triggerValues.some(v => triggerValue.includes(v.toLowerCase()));

    if (!matches) continue;

    // Check if the target field was manually overridden — don't re-apply
    if (updatedTracker.overriddenFields[rule.setField]) continue;

    // Apply the default
    updated[rule.setField] = rule.setValue;
    updatedTracker.defaultedFields[rule.setField] = {
      value: rule.setValue,
      source: 'conditional_rule',
      ruleId: rule.id,
      appliedAt: Date.now(),
    };

    // Apply additional fields
    if (rule.additionalFields) {
      for (const [af, av] of Object.entries(rule.additionalFields)) {
        updated[af] = av;
        updatedTracker.defaultedFields[af] = {
          value: av,
          source: 'conditional_rule',
          ruleId: rule.id,
          appliedAt: Date.now(),
        };
      }
    }

    // Add install notes if specified
    if (rule.additionalNotes && !(updated.installNotes || '').includes(rule.additionalNotes)) {
      updated.installNotes = ((updated.installNotes || '') + '\n' + rule.additionalNotes).trim();
    }

    appliedRules.push(rule);
    helperNotes.push(rule.helperNote);
  }

  return { opening: updated, tracker: updatedTracker, appliedRules, helperNotes };
}

// ─── TRACK MANUAL OVERRIDE ──────────────────────────────────
export function trackOverride(
  tracker: DefaultTracker,
  field: string,
  newValue: any,
): DefaultTracker {
  const updated = { ...tracker, overriddenFields: { ...tracker.overriddenFields } };

  if (tracker.defaultedFields[field]) {
    updated.overriddenFields[field] = {
      originalDefault: tracker.defaultedFields[field].value,
      newValue,
      overriddenAt: Date.now(),
    };
  }

  return updated;
}

// ─── CHECK IF FIELD WAS DEFAULTED ───────────────────────────
export function isDefaulted(tracker: DefaultTracker, field: string): boolean {
  return !!tracker.defaultedFields[field] && !tracker.overriddenFields[field];
}

export function isOverridden(tracker: DefaultTracker, field: string): boolean {
  return !!tracker.overriddenFields[field];
}

// ─── DEFAULT INDICATOR COMPONENT DATA ───────────────────────
export function getFieldSource(tracker: DefaultTracker, field: string): 'default' | 'override' | 'manual' {
  if (tracker.overriddenFields[field]) return 'override';
  if (tracker.defaultedFields[field]) return 'default';
  return 'manual';
}

export function getFieldSourceLabel(tracker: DefaultTracker, field: string): string {
  const source = getFieldSource(tracker, field);
  if (source === 'default') {
    const def = tracker.defaultedFields[field];
    if (def.source === 'ww_company_default') return '🏢 WW Default';
    if (def.source === 'never_ask_twice') return '🔄 Auto-filled';
    if (def.source === 'conditional_rule') return '⚡ Rule Applied';
    return '📋 Default';
  }
  if (source === 'override') return '✏️ Manual Override';
  return '';
}
