// ═══════════════════════════════════════════════════════════════
// Sketch Marker Renderer
// Renders typed markers (X, door, patio, shape, oriel, note, arrow)
// on the sketch canvas with validation badges
// ═══════════════════════════════════════════════════════════════

import type { SketchMarkerData, ValidationStatus } from '../utils/sketchSync';

const MARKER_SIZE = 28;
const SMALL_MARKER_SIZE = 20;

const VALIDATION_COLORS: Record<ValidationStatus, string> = {
  incomplete: '#ef4444',
  measured: '#f59e0b',
  priced: '#3b82f6',
  complete: '#22c55e',
};

const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  incomplete: '!',
  measured: '📐',
  priced: '$',
  complete: '✓',
};

// ── Draw a single marker on canvas context ──────────────────
export function drawMarkerOnCanvas(
  ctx: CanvasRenderingContext2D,
  marker: SketchMarkerData,
  isSelected: boolean = false,
  isJoinSelected: boolean = false,
) {
  const { x, y, markerSymbol, markerNumber, markerLabel, validationStatus } = marker;
  const r = MARKER_SIZE;

  ctx.save();

  // Selection glow
  if (isSelected || isJoinSelected) {
    ctx.shadowColor = isJoinSelected ? '#f59e0b' : '#3b82f6';
    ctx.shadowBlur = 12;
  }

  switch (markerSymbol) {
    case 'window_x':
      drawWindowX(ctx, x, y, r, markerNumber!, isSelected, validationStatus);
      break;
    case 'front_door':
      drawFrontDoor(ctx, x, y, r, isSelected);
      break;
    case 'patio_door':
      drawPatioDoor(ctx, x, y, r, markerNumber!, isSelected, validationStatus);
      break;
    case 'special_shape':
      drawSpecialShape(ctx, x, y, r, markerNumber!, isSelected, validationStatus);
      break;
    case 'oriel':
      drawOriel(ctx, x, y, r, markerNumber!, isSelected, validationStatus);
      break;
    case 'note':
      drawNote(ctx, x, y, SMALL_MARKER_SIZE, markerLabel);
      break;
    case 'arrow':
      // Arrow is drawn via line tool, not a marker render
      break;
  }

  ctx.restore();

  // Room label below marker
  if (marker.roomLocation && markerSymbol !== 'note' && markerSymbol !== 'arrow') {
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(marker.roomLocation.slice(0, 14), x, y + r + 12);
    ctx.restore();
  }
}

// ── Window X marker ─────────────────────────────────────────
function drawWindowX(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number,
  selected: boolean,
  status: ValidationStatus,
) {
  // Circle background
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = selected ? '#2563eb' : '#3b82f6';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // X inside
  const s = r * 0.5;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - s, y - s);
  ctx.lineTo(x + s, y + s);
  ctx.moveTo(x + s, y - s);
  ctx.lineTo(x - s, y + s);
  ctx.stroke();

  // Number badge
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${num}`, x, y + r + 2);

  // Validation badge
  drawValidationBadge(ctx, x + r - 4, y - r + 4, status);
}

// ── Front door marker ───────────────────────────────────────
function drawFrontDoor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  selected: boolean,
) {
  // Door shape (rectangle with arc)
  const w = r * 1.2;
  const h = r * 1.6;

  ctx.fillStyle = selected ? '#dc2626' : '#b91c1c';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, [6, 6, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // Door handle
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(x + w / 4, y + 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 8px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DOOR', x, y - h / 4);

  // Arrow pointing up (orientation)
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 - 8);
  ctx.lineTo(x, y - h / 2 - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 5, y - h / 2 - 15);
  ctx.lineTo(x, y - h / 2 - 20);
  ctx.lineTo(x + 5, y - h / 2 - 15);
  ctx.stroke();
}

// ── Patio door marker ───────────────────────────────────────
function drawPatioDoor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number,
  selected: boolean,
  status: ValidationStatus,
) {
  const w = r * 2;
  const h = r * 1.4;

  ctx.fillStyle = selected ? '#7c3aed' : '#6d28d9';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Sliding divider
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 + 4);
  ctx.lineTo(x, y + h / 2 - 4);
  ctx.stroke();

  // Arrows showing slide direction
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('↔', x, y - 2);

  // Number
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.fillText(`#${num}`, x, y + h / 2 + 10);

  drawValidationBadge(ctx, x + w / 2 - 4, y - h / 2 + 4, status);
}

// ── Special shape marker ────────────────────────────────────
function drawSpecialShape(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number,
  selected: boolean,
  status: ValidationStatus,
) {
  // Hexagon
  ctx.fillStyle = selected ? '#059669' : '#047857';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`S#${num}`, x, y);

  drawValidationBadge(ctx, x + r - 2, y - r + 2, status);
}

// ── Oriel marker ────────────────────────────────────────────
function drawOriel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  num: number,
  selected: boolean,
  status: ValidationStatus,
) {
  // Double rectangle (top/bottom sash visual)
  const w = r * 1.4;
  const h = r * 1.6;

  ctx.fillStyle = selected ? '#ea580c' : '#c2410c';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Divider line (top/bottom sash)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 3, y - 2);
  ctx.lineTo(x + w / 2 - 3, y - 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 8px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ORIEL', x, y - h / 4);
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.fillText(`#${num}`, x, y + h / 4);

  drawValidationBadge(ctx, x + w / 2, y - h / 2, status);
}

// ── Note marker ─────────────────────────────────────────────
function drawNote(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  label: string,
) {
  ctx.fillStyle = 'rgba(245,158,11,0.9)';
  ctx.beginPath();
  ctx.roundRect(x - 2, y - r / 2, Math.max(r * 3, (label?.length || 4) * 6 + 12), r, 4);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`📝 ${label || 'Note'}`, x + 4, y);
}

// ── Validation badge ────────────────────────────────────────
function drawValidationBadge(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  status: ValidationStatus,
) {
  const r = 7;
  ctx.fillStyle = VALIDATION_COLORS[status];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(VALIDATION_LABELS[status], x, y);
}

// ── Draw join/mull connector line between markers ───────────
export function drawGroupConnector(
  ctx: CanvasRenderingContext2D,
  markers: SketchMarkerData[],
  groupType: string,
) {
  if (markers.length < 2) return;

  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);

  for (let i = 0; i < markers.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(markers[i].x, markers[i].y);
    ctx.lineTo(markers[i + 1].x, markers[i + 1].y);
    ctx.stroke();
  }

  // Group label at midpoint
  const midX = (markers[0].x + markers[markers.length - 1].x) / 2;
  const midY = (markers[0].y + markers[markers.length - 1].y) / 2;
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(245,158,11,0.9)';
  ctx.beginPath();
  ctx.roundRect(midX - 20, midY - 8, 40, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = 'bold 8px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🔗 ${groupType.replace('_', ' ').toUpperCase()}`, midX, midY);

  ctx.restore();
}

// ── Hit test: is a point inside a marker? ───────────────────
export function hitTestMarker(
  marker: SketchMarkerData,
  px: number, py: number,
  tolerance: number = MARKER_SIZE + 4,
): boolean {
  const dx = px - marker.x;
  const dy = py - marker.y;
  return Math.sqrt(dx * dx + dy * dy) <= tolerance;
}

export { MARKER_SIZE, VALIDATION_COLORS };
