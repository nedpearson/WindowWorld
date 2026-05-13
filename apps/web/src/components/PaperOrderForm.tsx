import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import '../styles/paper-form.css';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface OrderFormData {
  poNumber: string;
  accountNumber: string;
  orderDate: string;
  customerName: string;
  phone: string;
  phone2: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  estimator: string;
  notes: string;
  openings: OpeningRow[];
  sketchDataUrl: string;
  pageNumber: number;
  totalPages: number;
}

export interface OpeningRow {
  qty: number;
  model: string;
  vinylColor: string;
  intColor: string;
  extColor: string;
  width: string;
  height: string;
  legHeight: string;
  customRadius: string;
  windowNumber: string;
  hinge: string;
  glassOption: string;
  foamEnhanced: boolean;
  gridOptions: string;
  obsc: string;
  temp: string;
  fullScreen: boolean;
  oriel: boolean;
  hor: boolean;
  typeExt: string;
  floor: string;
  typeInt: string;
  rmvInst: string;
  sill: boolean;
}

const EMPTY_OPENING: OpeningRow = {
  qty: 0, model: '', vinylColor: '', intColor: '', extColor: '',
  width: '', height: '', legHeight: '', customRadius: '', windowNumber: '',
  hinge: '', glassOption: '', foamEnhanced: false, gridOptions: '',
  obsc: '', temp: '', fullScreen: false, oriel: false, hor: false,
  typeExt: '', floor: '', typeInt: '', rmvInst: '', sill: false,
};

export function emptyFormData(): OrderFormData {
  return {
    poNumber: '', accountNumber: '', orderDate: '',
    customerName: '', phone: '', phone2: '',
    address: '', city: '', state: '', zip: '',
    estimator: '', notes: '',
    openings: Array.from({ length: 20 }, () => ({ ...EMPTY_OPENING })),
    sketchDataUrl: '',
    pageNumber: 1, totalPages: 1,
  };
}

// ═══════════════════════════════════════════════════════════════
// OPENING TABLE COLUMN DEFINITIONS — exact original form order
// ═══════════════════════════════════════════════════════════════

interface ColDef {
  key: keyof OpeningRow;
  label: string;
  className: string;
  vertical?: boolean;
  type: 'text' | 'check';
  width?: string;
}

const COLUMNS: ColDef[] = [
  { key: 'qty', label: 'QTY', className: 'pf-col-qty', type: 'text' },
  { key: 'model', label: 'MODEL', className: 'pf-col-model', type: 'text' },
  { key: 'vinylColor', label: 'VINYL\nCOLOR', className: 'pf-col-vinyl', type: 'text', vertical: true },
  { key: 'intColor', label: 'INT.\nCOLOR', className: 'pf-col-int', type: 'text', vertical: true },
  { key: 'extColor', label: 'EXT.\nCOLOR', className: 'pf-col-ext', type: 'text', vertical: true },
  { key: 'width', label: 'WIDTH', className: 'pf-col-width', type: 'text' },
  { key: 'height', label: 'HEIGHT', className: 'pf-col-height', type: 'text' },
  { key: 'legHeight', label: 'LEG\nHEIGHT', className: 'pf-col-leg', type: 'text', vertical: true },
  { key: 'customRadius', label: 'CUSTOM\nRADIUS', className: 'pf-col-radius', type: 'text', vertical: true },
  { key: 'windowNumber', label: 'WINDOW\nNUMBER', className: 'pf-col-winnum', type: 'text', vertical: true },
  { key: 'hinge', label: 'HINGE', className: 'pf-col-hinge', type: 'text', vertical: true },
  { key: 'glassOption', label: 'GLASS\nOPTION', className: 'pf-col-glass', type: 'text', vertical: true },
  { key: 'foamEnhanced', label: 'FOAM\nENHANCED', className: 'pf-col-foam', type: 'check', vertical: true },
  { key: 'gridOptions', label: 'GRID OPTIONS', className: 'pf-col-grid', type: 'text', vertical: true },
  { key: 'obsc', label: 'OBSC', className: 'pf-col-obsc', type: 'text', vertical: true },
  { key: 'temp', label: 'TEMP\nFull/Half/Full', className: 'pf-col-temp', type: 'text', vertical: true },
  { key: 'fullScreen', label: 'FULL\nSCREEN', className: 'pf-col-full', type: 'check', vertical: true },
  { key: 'oriel', label: 'ORIEL', className: 'pf-col-oriel', type: 'check', vertical: true },
  { key: 'hor', label: 'HOR\nR&R', className: 'pf-col-hor', type: 'check', vertical: true },
  { key: 'typeExt', label: 'TYPE\nEXT', className: 'pf-col-typeext', type: 'text', vertical: true },
  { key: 'floor', label: 'FLOOR\n#', className: 'pf-col-floor', type: 'text', vertical: true },
  { key: 'typeInt', label: 'TYPE\nINT', className: 'pf-col-typeint', type: 'text', vertical: true },
  { key: 'rmvInst', label: 'Remove/\nInstall', className: 'pf-col-rmvinst', type: 'text', vertical: true },
  { key: 'sill', label: 'SILL', className: 'pf-col-sill', type: 'check', vertical: true },
];

// ═══════════════════════════════════════════════════════════════
// PAPER ORDER FORM COMPONENT
// ═══════════════════════════════════════════════════════════════

export interface PaperOrderFormHandle {
  getFormData: () => OrderFormData;
  getFormElement: () => HTMLDivElement | null;
  getSketchDataUrl: () => string;
}

interface PaperOrderFormProps {
  initialData?: Partial<OrderFormData>;
  editable?: boolean;
  onDataChange?: (data: OrderFormData) => void;
  onSketchChange?: (dataUrl: string) => void;
}

export const PaperOrderForm = forwardRef<PaperOrderFormHandle, PaperOrderFormProps>(
  ({ initialData, editable = true, onDataChange, onSketchChange }, ref) => {
    const formRef = useRef<HTMLDivElement>(null);
    const sketchRef = useRef<HTMLCanvasElement>(null);
    const [data, setData] = useState<OrderFormData>(() => ({
      ...emptyFormData(),
      ...initialData,
      openings: initialData?.openings
        ? [...initialData.openings, ...Array.from({ length: Math.max(0, 20 - (initialData.openings?.length || 0)) }, () => ({ ...EMPTY_OPENING }))]
          .slice(0, 20)
        : Array.from({ length: 20 }, () => ({ ...EMPTY_OPENING })),
    }));

    // Sketch state
    const sketchDrawing = useRef(false);
    const sketchCtx = useRef<CanvasRenderingContext2D | null>(null);

    const SKETCH_W = 560;
    const SKETCH_H = 180;

    // Init sketch
    useEffect(() => {
      const canvas = sketchRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      sketchCtx.current = ctx;

      // White fill
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, SKETCH_W, SKETCH_H);

      // Load existing sketch
      if (data.sketchDataUrl) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, SKETCH_W, SKETCH_H);
        img.src = data.sketchDataUrl;
      }
    }, []);

    // Sketch drawing handlers
    const getSketchPos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = sketchRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = SKETCH_W / rect.width;
      const scaleY = SKETCH_H / rect.height;
      if ('touches' in e) {
        const t = e.touches[0];
        return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
      }
      return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
    };

    const sketchStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (!editable) return;
      e.preventDefault();
      sketchDrawing.current = true;
      const ctx = sketchCtx.current!;
      const pos = getSketchPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    const sketchMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!sketchDrawing.current || !editable) return;
      e.preventDefault();
      const ctx = sketchCtx.current!;
      const pos = getSketchPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const sketchEnd = () => {
      if (!sketchDrawing.current) return;
      sketchDrawing.current = false;
      const dataUrl = sketchRef.current?.toDataURL('image/png') || '';
      setData(prev => ({ ...prev, sketchDataUrl: dataUrl }));
      onSketchChange?.(dataUrl);
    };

    // Update helpers
    const updateField = useCallback((field: keyof OrderFormData, value: any) => {
      setData(prev => {
        const next = { ...prev, [field]: value };
        onDataChange?.(next);
        return next;
      });
    }, [onDataChange]);

    const updateOpening = useCallback((rowIdx: number, field: keyof OpeningRow, value: any) => {
      setData(prev => {
        const openings = [...prev.openings];
        openings[rowIdx] = { ...openings[rowIdx], [field]: value };
        const next = { ...prev, openings };
        onDataChange?.(next);
        return next;
      });
    }, [onDataChange]);

    // Expose handle
    useImperativeHandle(ref, () => ({
      getFormData: () => data,
      getFormElement: () => formRef.current,
      getSketchDataUrl: () => sketchRef.current?.toDataURL('image/png') || '',
    }));

    return (
      <div ref={formRef} className={`paper-form ${editable ? 'edit-mode' : ''}`}>
        {/* ═══ TITLE ═══ */}
        <div className="pf-title">WINDOW AND PATIO DOOR ORDER FORM</div>

        {/* ═══ TOP: Sketch + Customer ═══ */}
        <div className="pf-top">
          {/* Sketch Box */}
          <div className="pf-sketch-box">
            <canvas
              ref={sketchRef}
              width={SKETCH_W}
              height={SKETCH_H}
              style={{ touchAction: 'none' }}
              onMouseDown={sketchStart}
              onMouseMove={sketchMove}
              onMouseUp={sketchEnd}
              onMouseLeave={sketchEnd}
              onTouchStart={sketchStart}
              onTouchMove={sketchMove}
              onTouchEnd={sketchEnd}
            />
          </div>

          {/* Customer Info Block */}
          <div className="pf-customer-block">
            {/* Row 1: PO# | ACCT# */}
            <div className="pf-field-row">
              <div className="pf-field pf-po">
                <span className="pf-field-label">PO#:</span>
                <input className="pf-field-value" value={data.poNumber}
                  onChange={e => updateField('poNumber', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
              <div className="pf-field pf-acct">
                <span className="pf-field-label">ACCT #:</span>
                <input className="pf-field-value" value={data.accountNumber}
                  onChange={e => updateField('accountNumber', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
            </div>

            {/* Row 2: ORDER DATE */}
            <div className="pf-field-row">
              <div className="pf-field pf-date" style={{ flex: 1 }}>
                <span className="pf-field-label">ORDER DATE:</span>
                <input className="pf-field-value" value={data.orderDate}
                  onChange={e => updateField('orderDate', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
            </div>

            {/* Row 3: Customer | Phone */}
            <div className="pf-field-row">
              <div className="pf-field pf-customer">
                <span className="pf-field-label">Customer:</span>
                <input className="pf-field-value" value={data.customerName}
                  onChange={e => updateField('customerName', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
              <div className="pf-field pf-phone">
                <span className="pf-field-label">Phone:</span>
                <input className="pf-field-value" value={data.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
            </div>

            {/* Row 4: Address | Phone2 */}
            <div className="pf-field-row">
              <div className="pf-field pf-address">
                <span className="pf-field-label">Address:</span>
                <input className="pf-field-value" value={data.address}
                  onChange={e => updateField('address', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
              <div className="pf-field pf-phone2">
                <span className="pf-field-label">Phone:</span>
                <input className="pf-field-value" value={data.phone2}
                  onChange={e => updateField('phone2', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
            </div>

            {/* Row 5: City | Zip */}
            <div className="pf-field-row">
              <div className="pf-field pf-city">
                <span className="pf-field-label">City:</span>
                <input className="pf-field-value" value={data.city}
                  onChange={e => updateField('city', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
              <div className="pf-field pf-zip">
                <span className="pf-field-label">Zip:</span>
                <input className="pf-field-value" value={data.zip}
                  onChange={e => updateField('zip', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
            </div>

            {/* Row 6: Estimator */}
            <div className="pf-field-row">
              <div className="pf-field pf-estimator">
                <span className="pf-field-label">Estimator:</span>
                <input className="pf-field-value" value={data.estimator}
                  onChange={e => updateField('estimator', e.target.value)}
                  readOnly={!editable} placeholder=" " />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ OPENING TABLE ═══ */}
        <div className="pf-table-wrapper">
          <table className="pf-opening-table">
            <thead>
              {/* MFG SIZE spanning row */}
              <tr>
                <th className="pf-col-rownum" rowSpan={2} style={{ verticalAlign: 'bottom' }}></th>
                {COLUMNS.map((col, i) => {
                  if (col.key === 'width') {
                    return <th key="mfg" colSpan={2} className="pf-mfg-span" style={{ border: '1px solid #000', fontSize: '5.5pt' }}>MFG SIZE</th>;
                  }
                  if (col.key === 'height') return null; // handled by colSpan above
                  return (
                    <th key={col.key} className={`${col.className} ${col.vertical ? 'pf-th-vert' : ''}`} rowSpan={2}>
                      {col.label.split('\n').map((line, li) => (
                        <span key={li}>{line}{li < col.label.split('\n').length - 1 && <br />}</span>
                      ))}
                    </th>
                  );
                })}
              </tr>
              <tr>
                <th className="pf-col-width" style={{ fontSize: '5pt' }}>WIDTH</th>
                <th className="pf-col-height" style={{ fontSize: '5pt' }}>HEIGHT</th>
              </tr>
            </thead>
            <tbody>
              {data.openings.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="pf-row-num">{rowIdx + 1}</td>
                  {COLUMNS.map(col => (
                    <td key={col.key} className={col.className}>
                      {col.type === 'check' ? (
                        <input
                          type="checkbox"
                          className="pf-check"
                          checked={!!row[col.key]}
                          onChange={e => editable && updateOpening(rowIdx, col.key, e.target.checked)}
                          disabled={!editable}
                        />
                      ) : (
                        <input
                          className="pf-cell-input"
                          value={row[col.key] as string || ''}
                          onChange={e => updateOpening(rowIdx, col.key, e.target.value)}
                          readOnly={!editable}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══ BOTTOM: Notes + Certification ═══ */}
        <div className="pf-bottom">
          {/* Notes */}
          <div className="pf-notes-box">
            <div className="pf-notes-label">NOTES:</div>
            <textarea
              className="pf-notes-content"
              value={data.notes}
              onChange={e => updateField('notes', e.target.value)}
              readOnly={!editable}
            />
          </div>

          {/* Certification */}
          <div className="pf-certification">
            <div className="pf-cert-text">
              I certify this salesperson has explained and identified each and every abbreviation,
              term, and drawing on this page to my full and complete understanding including how
              each and every window is removed, installed, trimmed, accessorized, and warranted.
            </div>
            <div className="pf-signature-row">
              <div className="pf-sig-field">
                <span>OWNER</span>
                <span className="pf-sig-line"></span>
              </div>
              <div className="pf-sig-field">
                <span>DATE</span>
                <span className="pf-sig-line-short"></span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="pf-footer">
          <div className="pf-copy-labels">
            <span>White Copy - Original</span>
            <span>Yellow Copy - Estimator</span>
            <span>Pink Copy - Customer</span>
          </div>
          <div className="pf-page-num">
            PAGE {data.pageNumber} OF {data.totalPages}
          </div>
        </div>
      </div>
    );
  }
);

PaperOrderForm.displayName = 'PaperOrderForm';
