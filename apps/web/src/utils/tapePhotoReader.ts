// ═══════════════════════════════════════════════════════════════
// Window World — Photo Tape Measurement Reader
// Simulates tape-read OCR. In production, integrate with a
// vision API (Google Cloud Vision / Gemini Vision).
//
// IMPORTANT: Never silently apply AI-detected measurements.
// Always require rep review and approval before use.
// ═══════════════════════════════════════════════════════════════

import { parseMeasurement, toFractionDisplay, ParsedMeasurement } from './measurementParser';
import { MeasurementType } from './measurementRules';

export type PhotoReadStatus = 'pending' | 'processing' | 'detected' | 'low_confidence' | 'failed' | 'approved' | 'rejected';

export interface TapePhotoRead {
  id: string;
  photoDataUrl?: string;    // base64 data URL for preview
  photoStoragePath?: string;
  openingId?: string;
  appointmentId?: string;
  measurementType: MeasurementType;
  // AI/OCR outputs
  rawAiText?: string;
  detectedFraction?: string;    // e.g. "35 3/8"
  detectedDecimal?: number;     // e.g. 35.375
  confidence: number;           // 0-1
  candidates?: string[];        // alternate readings if confidence low
  // Rep review
  correctedValue?: number;
  selectedValue?: number;
  // Applied rule
  ruleAppliedId?: string;
  takeoffAmount?: number;
  finalDecimal?: number;
  finalFraction?: string;
  // Audit
  approvedBy?: string;
  approvedAt?: Date;
  status: PhotoReadStatus;
  requiresManualCorrection: boolean;
  metadata?: Record<string, any>;
}

// ─── CONFIDENCE THRESHOLDS ───────────────────────────────────
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,    // auto-show, still needs rep approval
  MEDIUM: 0.65,  // show with warning
  LOW: 0.40,     // require manual correction before applying
};

// ─── PARSE OCR TEXT INTO MEASUREMENT ────────────────────────
function parseOcrText(text: string): { parsed: ParsedMeasurement; confidence: number } {
  if (!text?.trim()) return { parsed: { inches: 0, display: '', wholeInches: 0, fraction: '', valid: false, warnings: [] }, confidence: 0 };

  const parsed = parseMeasurement(text.trim());

  // Estimate confidence based on format clarity
  let confidence = parsed.valid ? 0.80 : 0.30;
  if (/^\d+\s+\d+\/\d+$/.test(text.trim())) confidence = 0.92;   // "35 3/8" — most reliable
  if (/^\d+$/.test(text.trim())) confidence = 0.75;               // whole number only
  if (/^\d+\.\d+$/.test(text.trim())) confidence = 0.85;          // decimal

  return { parsed, confidence };
}

// ─── SIMULATE TAPE OCR (client-side demo) ───────────────────
// In production, replaces with actual vision API call.
// The photo is sent to Gemini Vision / Cloud Vision, which
// returns the tape reading as text.
export async function analyzeTapePhoto(
  photoDataUrl: string,
  measurementType: MeasurementType,
  callRealApi: boolean = false,
): Promise<{ detectedText: string; confidence: number; candidates: string[] }> {

  if (callRealApi) {
    // Production: POST photo to /api/vision/tape-read
    // The server uses Gemini Vision to read the tape
    throw new Error('Real API not configured — use simulateTapeRead for demo');
  }

  // Simulation: return a plausible measurement for demo purposes
  // Rep MUST correct this before it applies to the order form
  await new Promise(r => setTimeout(r, 1200)); // simulate API latency

  const DEMO_READINGS: Partial<Record<MeasurementType, { text: string; confidence: number; candidates: string[] }>> = {
    width:            { text: '35 3/8', confidence: 0.88, candidates: ['35 3/8', '35 1/4', '35 5/8'] },
    height:           { text: '59 7/8', confidence: 0.91, candidates: ['59 7/8', '59 3/4'] },
    top_sash_width:   { text: '35 3/8', confidence: 0.86, candidates: ['35 3/8'] },
    top_sash_height:  { text: '29 1/2', confidence: 0.83, candidates: ['29 1/2', '29 3/4'] },
    leg_height:       { text: '12 0',   confidence: 0.78, candidates: ['12', '12 1/8'] },
    rise:             { text: '8 3/4',  confidence: 0.80, candidates: ['8 3/4', '8 1/2'] },
    radius:           { text: '22 1/4', confidence: 0.72, candidates: ['22 1/4', '22 3/8'] },
  };

  return DEMO_READINGS[measurementType] || { text: '36', confidence: 0.70, candidates: ['36'] };
}

// ─── BUILD TAPE PHOTO READ RECORD ───────────────────────────
export async function processTapePhoto(
  photoDataUrl: string,
  measurementType: MeasurementType,
  openingId?: string,
  appointmentId?: string,
): Promise<TapePhotoRead> {
  const id = `tpr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { detectedText, confidence, candidates } = await analyzeTapePhoto(photoDataUrl, measurementType);
  const { parsed } = parseOcrText(detectedText);

  const requiresManualCorrection = confidence < CONFIDENCE_THRESHOLDS.MEDIUM;

  return {
    id,
    photoDataUrl,
    openingId,
    appointmentId,
    measurementType,
    rawAiText: detectedText,
    detectedFraction: parsed.valid ? parsed.display : undefined,
    detectedDecimal: parsed.valid ? parsed.inches : undefined,
    confidence,
    candidates,
    status: parsed.valid
      ? (confidence >= CONFIDENCE_THRESHOLDS.HIGH ? 'detected' : 'low_confidence')
      : 'failed',
    requiresManualCorrection,
    metadata: { parsedWarnings: parsed.warnings },
  };
}

// ─── APPROVE PHOTO READ ──────────────────────────────────────
export function approvePhotoRead(
  read: TapePhotoRead,
  finalDecimalValue: number,
  repName?: string,
): TapePhotoRead {
  return {
    ...read,
    selectedValue: finalDecimalValue,
    finalDecimal: finalDecimalValue,
    finalFraction: toFractionDisplay(finalDecimalValue),
    approvedBy: repName || 'rep',
    approvedAt: new Date(),
    status: 'approved',
  };
}

// ─── CONFIDENCE LABEL HELPER ─────────────────────────────────
export function getConfidenceLabel(confidence: number): {
  label: string; color: string; requiresManualEntry: boolean;
} {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return { label: `High confidence (${Math.round(confidence * 100)}%)`, color: 'var(--success)', requiresManualEntry: false };
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return { label: `Medium confidence (${Math.round(confidence * 100)}%) — verify reading`, color: 'var(--warning)', requiresManualEntry: false };
  return { label: `Low confidence (${Math.round(confidence * 100)}%) — manual entry required`, color: 'var(--danger)', requiresManualEntry: true };
}

export const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  width: 'Width',
  height: 'Height',
  top_sash_width: 'Top Sash Width',
  top_sash_height: 'Top Sash Height',
  leg_height: 'Leg Height',
  rise: 'Rise',
  radius: 'Radius',
  custom_radius: 'Custom Radius',
};
