/**
 * Workbook Template Engine
 * Copies the master BTR template, populates cells from appointment data,
 * preserves all formatting/formulas/merges, and exports filled workbooks.
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const TEMPLATE_PATH = path.resolve(__dirname2, '../templates/BTR_Window_Contract_Template.xlsx');

// ── Opening row column mapping (mirrors frontend config) ──
const OPENING_START_ROW = 31;
const OPEN_COLS = {
  qty: 'C', model: 'D', vinylColor: 'E', intColor: 'F', extColor: 'G',
  width: 'H', height: 'J', legHeight: 'K', customRadius: 'L',
  windowNumber: 'N', hinge: 'O', glassOption: 'P', foamEnhanced: 'Q',
  gridStyle: 'R', gridPattern: 'S', obscureFull: 'U', temperedFull: 'X',
  nailFinNoJ: 'Y', nailFinWithJ: 'Z', fullScreen: 'AA', orielDim: 'AB',
  headerFlash: 'AC', foamExp: 'AD', typeExterior: 'AF', typeTrim: 'AG',
  typeRemoved: 'AH', typeInstall: 'AK', sillRepair: 'AL',
};

export interface CustomerData {
  firstName: string; lastName: string; email?: string;
  address: string; city: string; state: string; zip: string;
  phone: string; phoneSecondary?: string;
}

export interface OpeningData {
  qty?: number; model?: string; vinylColor?: string;
  intColor?: string; extColor?: string;
  width?: number; height?: number; legHeight?: number; customRadius?: number;
  windowNumber?: number; hinge?: string; glassOption?: string;
  foamEnhanced?: string; gridStyle?: string; gridPattern?: string;
  obscureFull?: string; temperedFull?: string;
  nailFinNoJ?: string; nailFinWithJ?: string; fullScreen?: string;
  orielDim?: string; headerFlash?: string; foamExp?: string;
  typeExterior?: string; typeTrim?: string; typeRemoved?: string;
  typeInstall?: string; sillRepair?: string;
  roomLocation?: string; notes?: string;
}

export interface AppointmentExportData {
  customer: CustomerData;
  openings: OpeningData[];
  estimatorName?: string;
  estimatorPhone?: string;
  estimatorEmpNum?: string;
  completeJob?: string;
  orderDate?: Date;
  poNumber?: string;
  notes?: string;
  sketchImagePath?: string; // Path to rendered sketch PNG for Order Form box
}

/**
 * Generate a filled workbook from appointment data.
 * Returns the ExcelJS workbook ready for streaming or saving.
 */
export async function generateFilledWorkbook(data: AppointmentExportData): Promise<ExcelJS.Workbook> {
  // Verify template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at ${TEMPLATE_PATH}`);
  }

  // Load the master template (preserves all formatting, merges, formulas)
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);

  // ── Fill Contract Tab ──
  const contract = workbook.getWorksheet('Contract');
  if (contract) {
    fillContractSheet(contract, data);
  }

  // ── Fill Order Form Tab ──
  const orderForm = workbook.getWorksheet('Order Form');
  if (orderForm) {
    fillOrderFormSheet(orderForm, data);
    // Insert sketch image into B2:R22 sketch box
    if (data.sketchImagePath) {
      await insertSketchImage(workbook, orderForm, data.sketchImagePath);
    }
  }

  return workbook;
}

function setCellValue(sheet: ExcelJS.Worksheet, cellAddr: string, value: any) {
  if (value === undefined || value === null || value === '') return;
  const cell = sheet.getCell(cellAddr);
  cell.value = value;
}

function fillContractSheet(sheet: ExcelJS.Worksheet, data: AppointmentExportData) {
  const { customer } = data;

  // Customer info
  setCellValue(sheet, 'F9', `${customer.firstName} ${customer.lastName}`);
  setCellValue(sheet, 'J9', customer.email);
  setCellValue(sheet, 'F10', customer.address);
  setCellValue(sheet, 'S10', customer.phone);
  setCellValue(sheet, 'F11', customer.city);
  setCellValue(sheet, 'H11', customer.state || 'LA');
  setCellValue(sheet, 'L11', customer.zip);
  setCellValue(sheet, 'S11', customer.phoneSecondary);

  // Job info
  setCellValue(sheet, 'Q8', data.completeJob || 'Y');

  // Estimator
  if (data.estimatorName) {
    setCellValue(sheet, 'D84', data.estimatorName);
    setCellValue(sheet, 'D85', data.estimatorName);
  }
  if (data.estimatorEmpNum) {
    setCellValue(sheet, 'C84', data.estimatorEmpNum);
    setCellValue(sheet, 'C85', data.estimatorEmpNum);
  }

  // Auto-count product types from openings
  const counts = countProductTypes(data.openings);
  if (counts.dh4000 > 0) setCellValue(sheet, 'C15', counts.dh4000);
  if (counts.dh4000FE > 0) setCellValue(sheet, 'C16', counts.dh4000FE);
  if (counts.picture > 0) setCellValue(sheet, 'C20', counts.picture);
  if (counts.slider2 > 0) setCellValue(sheet, 'C21', counts.slider2);
  if (counts.slider3 > 0) setCellValue(sheet, 'C22', counts.slider3);
  if (counts.casement > 0) setCellValue(sheet, 'C23', counts.casement);
  if (counts.dblCasement > 0) setCellValue(sheet, 'C24', counts.dblCasement);

  // Auto-count options from openings
  const opts = countOptions(data.openings);
  if (opts.fullScreen > 0) setCellValue(sheet, 'M14', opts.fullScreen);
  if (opts.nailFin > 0) setCellValue(sheet, 'M26', opts.nailFin);
  if (opts.oriel > 0) setCellValue(sheet, 'M27', opts.oriel);
  if (opts.grid > 0) setCellValue(sheet, 'M28', opts.grid);
  if (opts.obscure > 0) setCellValue(sheet, 'M24', opts.obscure);
  if (opts.tempered > 0) setCellValue(sheet, 'M23', opts.tempered);
}

function fillOrderFormSheet(sheet: ExcelJS.Worksheet, data: AppointmentExportData) {
  // Estimator (hardcoded area at row 18-19)
  if (data.estimatorName) {
    setCellValue(sheet, 'W18', data.estimatorName);
  }
  if (data.estimatorPhone) {
    setCellValue(sheet, 'AG18', data.estimatorPhone);
  }

  // PO # and order date
  if (data.poNumber) setCellValue(sheet, 'U9', data.poNumber);
  if (data.orderDate) setCellValue(sheet, 'AH9', data.orderDate);

  // Notes
  if (data.notes) setCellValue(sheet, 'B59', data.notes);

  // ── Fill opening rows (31-54) ──
  for (let i = 0; i < Math.min(data.openings.length, 24); i++) {
    const opening = data.openings[i];
    const row = OPENING_START_ROW + i;

    if (opening.qty) setCellValue(sheet, `${OPEN_COLS.qty}${row}`, opening.qty);
    if (opening.model) setCellValue(sheet, `${OPEN_COLS.model}${row}`, opening.model);
    if (opening.vinylColor) setCellValue(sheet, `${OPEN_COLS.vinylColor}${row}`, opening.vinylColor);
    if (opening.intColor) setCellValue(sheet, `${OPEN_COLS.intColor}${row}`, opening.intColor);
    if (opening.extColor) setCellValue(sheet, `${OPEN_COLS.extColor}${row}`, opening.extColor);
    if (opening.width) setCellValue(sheet, `${OPEN_COLS.width}${row}`, opening.width);
    if (opening.height) setCellValue(sheet, `${OPEN_COLS.height}${row}`, opening.height);
    if (opening.legHeight) setCellValue(sheet, `${OPEN_COLS.legHeight}${row}`, opening.legHeight);
    if (opening.customRadius) setCellValue(sheet, `${OPEN_COLS.customRadius}${row}`, opening.customRadius);
    if (opening.windowNumber) setCellValue(sheet, `${OPEN_COLS.windowNumber}${row}`, opening.windowNumber);
    if (opening.hinge) setCellValue(sheet, `${OPEN_COLS.hinge}${row}`, opening.hinge);
    if (opening.glassOption) setCellValue(sheet, `${OPEN_COLS.glassOption}${row}`, opening.glassOption);
    if (opening.foamEnhanced) setCellValue(sheet, `${OPEN_COLS.foamEnhanced}${row}`, opening.foamEnhanced);
    if (opening.gridStyle) setCellValue(sheet, `${OPEN_COLS.gridStyle}${row}`, opening.gridStyle);
    if (opening.gridPattern) setCellValue(sheet, `${OPEN_COLS.gridPattern}${row}`, opening.gridPattern);
    if (opening.obscureFull) setCellValue(sheet, `${OPEN_COLS.obscureFull}${row}`, opening.obscureFull);
    if (opening.temperedFull) setCellValue(sheet, `${OPEN_COLS.temperedFull}${row}`, opening.temperedFull);
    if (opening.nailFinNoJ) setCellValue(sheet, `${OPEN_COLS.nailFinNoJ}${row}`, opening.nailFinNoJ);
    if (opening.nailFinWithJ) setCellValue(sheet, `${OPEN_COLS.nailFinWithJ}${row}`, opening.nailFinWithJ);
    if (opening.fullScreen) setCellValue(sheet, `${OPEN_COLS.fullScreen}${row}`, opening.fullScreen);
    if (opening.orielDim) setCellValue(sheet, `${OPEN_COLS.orielDim}${row}`, opening.orielDim);
    if (opening.headerFlash) setCellValue(sheet, `${OPEN_COLS.headerFlash}${row}`, opening.headerFlash);
    if (opening.foamExp) setCellValue(sheet, `${OPEN_COLS.foamExp}${row}`, opening.foamExp);
    if (opening.typeExterior) setCellValue(sheet, `${OPEN_COLS.typeExterior}${row}`, opening.typeExterior);
    if (opening.typeTrim) setCellValue(sheet, `${OPEN_COLS.typeTrim}${row}`, opening.typeTrim);
    if (opening.typeRemoved) setCellValue(sheet, `${OPEN_COLS.typeRemoved}${row}`, opening.typeRemoved);
    if (opening.typeInstall) setCellValue(sheet, `${OPEN_COLS.typeInstall}${row}`, opening.typeInstall);
    if (opening.sillRepair) setCellValue(sheet, `${OPEN_COLS.sillRepair}${row}`, opening.sillRepair);
  }
}

// ── Helpers: auto-count product types from openings ──

interface ProductCounts {
  dh4000: number; dh4000FE: number; picture: number;
  slider2: number; slider3: number; casement: number; dblCasement: number;
  patioDoor6: number; patioDoor8: number; specialty: number;
}

function countProductTypes(openings: OpeningData[]): ProductCounts {
  const c: ProductCounts = { dh4000: 0, dh4000FE: 0, picture: 0, slider2: 0, slider3: 0, casement: 0, dblCasement: 0, patioDoor6: 0, patioDoor8: 0, specialty: 0 };
  for (const o of openings) {
    const qty = o.qty || 1;
    const m = o.model || '';
    if (m === '3001') c.dh4000 += qty;
    else if (m === '3001-FE') c.dh4000FE += qty;
    else if (m === '3004') c.picture += qty;
    else if (m === '3002') c.slider2 += qty;
    else if (m === '3003') c.slider3 += qty;
    else if (['3005', '0951', '0952'].includes(m)) c.casement += qty;
    else if (m === '3006') c.dblCasement += qty;
  }
  return c;
}

interface OptionCounts {
  fullScreen: number; nailFin: number; oriel: number; grid: number; obscure: number; tempered: number;
}

function countOptions(openings: OpeningData[]): OptionCounts {
  const c: OptionCounts = { fullScreen: 0, nailFin: 0, oriel: 0, grid: 0, obscure: 0, tempered: 0 };
  for (const o of openings) {
    const qty = o.qty || 1;
    if (o.fullScreen) c.fullScreen += qty;
    if (o.nailFinNoJ || o.nailFinWithJ) c.nailFin += qty;
    if (o.orielDim) c.oriel += qty;
    if (o.gridStyle) c.grid += qty;
    if (o.obscureFull) c.obscure += qty;
    if (o.temperedFull) c.tempered += qty;
  }
  return c;
}

/**
 * Generate filled workbook and return as a Buffer for download
 */
export async function generateWorkbookBuffer(data: AppointmentExportData): Promise<Buffer> {
  const workbook = await generateFilledWorkbook(data);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ═══════════════════════════════════════════════════
//  SKETCH IMAGE INSERTION
//  Inserts the rendered sketch image into the Order Form
//  blank box at B2:R22 using ExcelJS image anchoring.
//  Uses contain-fit with padding to preserve aspect ratio.
// ═══════════════════════════════════════════════════

async function insertSketchImage(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  imagePath: string
): Promise<void> {
  if (!fs.existsSync(imagePath)) {
    console.warn(`Sketch image not found at ${imagePath} — skipping insertion`);
    return;
  }

  const ext = path.extname(imagePath).toLowerCase();
  const extensionMap: Record<string, 'png' | 'jpeg' | 'gif'> = {
    '.png': 'png', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.gif': 'gif',
  };
  const excelExt = extensionMap[ext] || 'png';

  const imageId = workbook.addImage({
    filename: imagePath,
    extension: excelExt,
  });

  // Anchor the image from B2 to R22 using twoCell positioning
  // This places the image exactly within the sketch box without
  // altering any row heights or column widths
  sheet.addImage(imageId, {
    tl: { col: 1, row: 1 } as any,  // B2 (0-indexed: col=1, row=1)
    br: { col: 17, row: 21 } as any, // R22 (0-indexed: col=17, row=21)
    editAs: 'oneCell', // Image moves with cells but doesn't resize them
  });
}

/**
 * Calculate contain-fit dimensions for a sketch image
 * to fit inside the Order Form sketch box (B2:R22)
 */
export function calculateSketchFit(imageWidth: number, imageHeight: number) {
  const boxWidth = 651;  // approx px width of B2:R22
  const boxHeight = 215; // approx px height of B2:R22
  const padding = 4;

  const availW = boxWidth - (padding * 2);
  const availH = boxHeight - (padding * 2);

  const scaleX = availW / imageWidth;
  const scaleY = availH / imageHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Never scale up

  const fitWidth = Math.round(imageWidth * scale);
  const fitHeight = Math.round(imageHeight * scale);

  const tooSmall = fitWidth < 200 || fitHeight < 80;

  return {
    fitWidth,
    fitHeight,
    scale,
    tooSmall,
    warning: tooSmall ? 'Sketch may be too small to read in the Order Form box. Consider adding a full-size sketch page.' : null,
  };
}
