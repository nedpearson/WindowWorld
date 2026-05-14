import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const TEMPLATE_PATH = path.resolve(__dirname2, '../templates/BTR_Window_Contract_Template.xlsx');

async function detect() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const s = wb.getWorksheet('Order Form');
  if (!s) { console.log('Not found'); return; }

  console.log('=== UPPER-LEFT (B2:R22) ===');
  for (let r = 2; r <= 22; r++) {
    const row = s.getRow(r);
    const cells: string[] = [];
    for (let c = 2; c <= 18; c++) {
      const cell = row.getCell(c);
      if (cell.value) cells.push(cell.address + '=' + String(cell.value).substring(0,30));
    }
    console.log('R' + r + (cells.length ? ': ' + cells.join(' | ') : ': [empty]'));
  }

  console.log('\n=== Col widths B-R ===');
  for (let c = 2; c <= 18; c++) {
    console.log(String.fromCharCode(64 + c) + ':', s.getColumn(c).width);
  }

  console.log('\n=== Row heights 2-22 ===');
  for (let r = 2; r <= 22; r++) {
    console.log('R' + r + ':', s.getRow(r).height);
  }

  // Check B2 border
  const b2 = s.getCell('B2');
  console.log('\nB2 border:', JSON.stringify(b2.border));
  const r2 = s.getCell('R2');
  console.log('R2 border:', JSON.stringify(r2.border));
  const b22 = s.getCell('B22');
  console.log('B22 border:', JSON.stringify(b22.border));
}

detect().catch(console.error);
