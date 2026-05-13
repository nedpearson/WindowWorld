import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { DrawableSketchCanvas, DrawableSketchHandle } from './DrawableSketch';
import '../styles/paper-form.css';

// ═══════════════════════════════════════════════════════════════
// TYPES — kept identical for backward compatibility
// ═══════════════════════════════════════════════════════════════
export interface OrderFormData {
  poNumber: string; accountNumber: string; orderDate: string;
  customerName: string; phone: string; phone2: string;
  address: string; city: string; state: string; zip: string;
  estimator: string; estimatorPhone: string; notes: string;
  openings: OpeningRow[]; sketchDataUrl: string;
  pageNumber: number; totalPages: number;
}

export interface OpeningRow {
  qty: number; model: string; vinylColor: string; intColor: string; extColor: string;
  width: string; height: string; legHeight: string; customRadius: string;
  windowNumber: string; hinge: string; glassOption: string; foamEnhanced: boolean;
  gridStyle: string; gridPattern: string; gridFull: boolean; gridSpec: boolean;
  typeFill: boolean; typeHalf: boolean; typeMine: boolean;
  tempFull: boolean; tempS: boolean; tempU: boolean;
  nailFin: boolean; fullScreen: boolean; oriel: boolean; hor: boolean;
  typeExt: string; typeInt: string; rmvInst: string; sill: boolean;
  // Legacy compat
  gridOptions: string; obsc: string; temp: string; floor: string;
}

const EMPTY_OPENING: OpeningRow = {
  qty: 0, model: '', vinylColor: '', intColor: '', extColor: '',
  width: '', height: '', legHeight: '', customRadius: '', windowNumber: '',
  hinge: '', glassOption: '', foamEnhanced: false,
  gridStyle: '', gridPattern: '', gridFull: false, gridSpec: false,
  typeFill: false, typeHalf: false, typeMine: false,
  tempFull: false, tempS: false, tempU: false,
  nailFin: false, fullScreen: false, oriel: false, hor: false,
  typeExt: '', typeInt: '', rmvInst: '', sill: false,
  gridOptions: '', obsc: '', temp: '', floor: '',
};

export function emptyFormData(): OrderFormData {
  return {
    poNumber: '', accountNumber: '', orderDate: '',
    customerName: '', phone: '', phone2: '',
    address: '', city: '', state: '', zip: '',
    estimator: '', estimatorPhone: '', notes: '',
    openings: Array.from({ length: 20 }, () => ({ ...EMPTY_OPENING })),
    sketchDataUrl: '', pageNumber: 1, totalPages: 1,
  };
}

// ═══════════════════════════════════════════════════════════════
export interface PaperOrderFormHandle {
  getFormData: () => OrderFormData;
  getFormElement: () => HTMLDivElement | null;
  getSketchDataUrl: () => string;
}

interface PaperOrderFormProps {
  initialData?: Partial<OrderFormData>;
  editable?: boolean;
  appointmentId?: string;
  onDataChange?: (data: OrderFormData) => void;
  onSketchChange?: (dataUrl: string) => void;
}

export const PaperOrderForm = forwardRef<PaperOrderFormHandle, PaperOrderFormProps>(
  ({ initialData, editable = true, appointmentId = '', onDataChange, onSketchChange }, ref) => {
    const formRef = useRef<HTMLDivElement>(null);
    const sketchRef = useRef<DrawableSketchHandle>(null);
    const [data, setData] = useState<OrderFormData>(() => ({
      ...emptyFormData(), ...initialData,
      openings: initialData?.openings
        ? [...initialData.openings, ...Array.from({ length: Math.max(0, 20 - (initialData.openings?.length || 0)) }, () => ({ ...EMPTY_OPENING }))].slice(0, 20)
        : Array.from({ length: 20 }, () => ({ ...EMPTY_OPENING })),
    }));

    const updateField = useCallback((field: keyof OrderFormData, value: any) => { setData(prev => { const next = { ...prev, [field]: value }; onDataChange?.(next); return next; }); }, [onDataChange]);
    const updateOpening = useCallback((i: number, field: keyof OpeningRow, value: any) => { setData(prev => { const o = [...prev.openings]; o[i] = { ...o[i], [field]: value }; const next = { ...prev, openings: o }; onDataChange?.(next); return next; }); }, [onDataChange]);

    const handleSketchChange = useCallback((dataUrl: string) => {
      setData(prev => ({ ...prev, sketchDataUrl: dataUrl }));
      onSketchChange?.(dataUrl);
    }, [onSketchChange]);

    useImperativeHandle(ref, () => ({ getFormData: () => data, getFormElement: () => formRef.current, getSketchDataUrl: () => sketchRef.current?.getDataUrl() || '' }));

    // Helper: text input cell
    const TI = (row: number, key: keyof OpeningRow) => <input className="pf-cell-input" value={(data.openings[row][key] as string) || ''} onChange={e => updateOpening(row, key, e.target.value)} readOnly={!editable} />;
    // Helper: checkbox cell
    const CB = (row: number, key: keyof OpeningRow) => <input type="checkbox" className="pf-check" checked={!!data.openings[row][key]} onChange={e => editable && updateOpening(row, key, e.target.checked)} disabled={!editable} />;
    // Helper: info field
    const IF = (label: string, field: keyof OrderFormData) => (
      <div className="pf-info-box">
        <span className="pf-field-label">{label}</span>
        <input className="pf-field-value" value={(data[field] as string) || ''} onChange={e => updateField(field, e.target.value)} readOnly={!editable} />
      </div>
    );

    return (
      <div ref={formRef} className={`paper-form ${editable ? 'edit-mode' : ''}`}>
        {/* ═══ TITLE ═══ */}
        <div className="pf-title">WINDOW AND PATIO DOOR ORDER FORM</div>

        {/* ═══ TOP: Sketch + Customer Info ═══ */}
        <div className="pf-top">
          <div className="pf-sketch-box">
            {editable ? (
              <DrawableSketchCanvas
                ref={sketchRef}
                appointmentId={appointmentId}
                openings={data.openings.filter(o => o.qty > 0 || o.model).map((o, i) => ({ ...o, openingNumber: o.windowNumber || i + 1, roomLocation: '', productCategory: o.model }))}
                elevation="front"
                compact={true}
                onSketchChange={handleSketchChange}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', minHeight: '2in' }}>
                {data.sketchDataUrl && <img src={data.sketchDataUrl} alt="Sketch" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
              </div>
            )}
          </div>

          {/* Customer Info — individually bordered boxes matching portrait image */}
          <div className="pf-customer-block">
            {IF('PO#', 'poNumber')}
            {IF('ACCT #', 'accountNumber')}
            {IF('ORDER DATE:', 'orderDate')}

            {/* Grouped customer detail box */}
            <div className="pf-customer-detail-box">
              <div className="pf-cust-row">
                <div className="pf-cust-cell pf-cust-cell-divider" style={{ flex: 1 }}>
                  <span className="pf-cust-label">Customer:</span>
                  <input className="pf-cust-input" value={data.customerName} onChange={e => updateField('customerName', e.target.value)} readOnly={!editable} />
                </div>
                <div className="pf-cust-cell" style={{ flex: 0.6 }}>
                  <span className="pf-cust-label">Phone:</span>
                  <input className="pf-cust-input" value={data.phone} onChange={e => updateField('phone', e.target.value)} readOnly={!editable} />
                </div>
              </div>
              <div className="pf-cust-row">
                <div className="pf-cust-cell pf-cust-cell-divider" style={{ flex: 1 }}></div>
                <div className="pf-cust-cell" style={{ flex: 0.6 }}>
                  <span className="pf-cust-label">Phone:</span>
                  <input className="pf-cust-input" value={data.phone2} onChange={e => updateField('phone2', e.target.value)} readOnly={!editable} />
                </div>
              </div>
              <div className="pf-cust-row">
                <div className="pf-cust-cell" style={{ flex: 1 }}>
                  <span className="pf-cust-label">Address</span>
                  <input className="pf-cust-input" value={data.address} onChange={e => updateField('address', e.target.value)} readOnly={!editable} />
                </div>
              </div>
              <div className="pf-cust-row">
                <div className="pf-cust-cell" style={{ flex: 1 }}>
                  <span className="pf-cust-label">City</span>
                  <input className="pf-cust-input" value={data.city} onChange={e => updateField('city', e.target.value)} readOnly={!editable} style={{ borderBottom: '1px solid #000' }} />
                </div>
                <div className="pf-cust-cell" style={{ flex: 0.6 }}>
                  <span className="pf-cust-label">Zip</span>
                  <input className="pf-cust-input" value={data.zip} onChange={e => updateField('zip', e.target.value)} readOnly={!editable} style={{ borderBottom: '1px solid #000' }} />
                </div>
              </div>
            </div>

            {IF('Estimator:', 'estimator')}
            {IF('Phone:', 'estimatorPhone')}
          </div>
        </div>

        {/* ═══ OPENING TABLE — exact portrait column structure ═══ */}
        <div className="pf-table-wrapper">
          <table className="pf-opening-table">
            <thead>
              {/* Row 1: Group spanning headers */}
              <tr>
                <th className="pf-col-rownum" rowSpan={3}></th>
                <th className="pf-col-qty pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">QTY</span></th>
                <th className="pf-col-model pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">MODEL</span></th>
                <th className="pf-col-vinyl pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">VINYL COLOR</span></th>
                <th className="pf-col-int pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">INT COLOR</span></th>
                <th className="pf-col-ext pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">EXT COLOR</span></th>
                <th colSpan={3} className="pf-th-group" style={{ borderBottom: 'none' }}>MFG SIZE</th>
                <th className="pf-col-leg pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">LEG HEIGHT</span></th>
                <th className="pf-col-radius pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">CUSTOM RADIUS</span></th>
                <th className="pf-col-winnum pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">WINDOW NUMBER</span></th>
                <th className="pf-col-hinge pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">HINGE</span></th>
                <th className="pf-col-glass pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">GLASS OPTION</span></th>
                <th className="pf-col-foam pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">FOAM ENHANCED</span></th>
                <th colSpan={4} className="pf-th-group">GRID OPTIONS</th>
                <th colSpan={3} className="pf-th-group">TYPE</th>
                <th colSpan={3} className="pf-th-group">9&apos; TEMP</th>
                <th className="pf-col-nailfin pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">NAIL FIN</span></th>
                <th className="pf-col-full pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">FULL SCREEN</span></th>
                <th className="pf-col-oriel pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">ORIEL</span></th>
                <th className="pf-col-hor pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">HOR R&amp;R</span></th>
                <th className="pf-col-typeext pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">TYPE EXT</span></th>
                <th className="pf-col-typeint pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">TYPE INT</span></th>
                <th className="pf-col-rmvinst pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">TYPE Remove</span></th>
                <th className="pf-col-sill pf-th-vert" rowSpan={3}><span className="pf-th-vert-inner">SILL Repair</span></th>
              </tr>
              {/* Row 2: Sub-headers for MFG SIZE, GRID OPTIONS, TYPE, TEMP */}
              <tr>
                <th className="pf-col-width pf-th-sub" rowSpan={2}><span className="pf-th-vert-inner">WIDTH</span></th>
                <th className="pf-col-xsep pf-th-sub" rowSpan={2} style={{ fontSize: '5pt' }}>×</th>
                <th className="pf-col-height pf-th-sub" rowSpan={2}><span className="pf-th-vert-inner">HEIGHT</span></th>
                <th className="pf-col-grid-style pf-th-sub"><span className="pf-th-vert-inner">STYLE</span></th>
                <th className="pf-col-grid-pattern pf-th-sub"><span className="pf-th-vert-inner">PATTERN</span></th>
                <th className="pf-col-grid-full pf-th-sub"><span className="pf-th-vert-inner">FULL</span></th>
                <th className="pf-col-grid-spec pf-th-sub"><span className="pf-th-vert-inner">SPEC</span></th>
                <th className="pf-col-type-fill pf-th-sub"><span className="pf-th-vert-inner">FILL</span></th>
                <th className="pf-col-type-half pf-th-sub"><span className="pf-th-vert-inner">HALF</span></th>
                <th className="pf-col-type-mine pf-th-sub"><span className="pf-th-vert-inner">MINE</span></th>
                <th className="pf-col-temp-full pf-th-sub"><span className="pf-th-vert-inner">FULL LIT</span></th>
                <th className="pf-col-temp-s pf-th-sub"><span className="pf-th-vert-inner">S OTA</span></th>
                <th className="pf-col-temp-u pf-th-sub"><span className="pf-th-vert-inner">U OTA</span></th>
              </tr>
            </thead>
            <tbody>
              {data.openings.map((_, ri) => (
                <tr key={ri}>
                  <td className="pf-row-num">{ri + 1}</td>
                  {/* Core columns */}
                  <td>{TI(ri, 'qty')}</td>
                  <td>{TI(ri, 'model')}</td>
                  <td>{TI(ri, 'vinylColor')}</td>
                  <td>{TI(ri, 'intColor')}</td>
                  <td>{TI(ri, 'extColor')}</td>
                  {/* MFG SIZE: Width × Height */}
                  <td>{TI(ri, 'width')}</td>
                  <td className="pf-xsep-cell">×</td>
                  <td>{TI(ri, 'height')}</td>
                  <td>{TI(ri, 'legHeight')}</td>
                  <td>{TI(ri, 'customRadius')}</td>
                  <td>{TI(ri, 'windowNumber')}</td>
                  <td>{TI(ri, 'hinge')}</td>
                  <td>{TI(ri, 'glassOption')}</td>
                  <td>{CB(ri, 'foamEnhanced')}</td>
                  {/* GRID OPTIONS sub-columns */}
                  <td>{TI(ri, 'gridStyle')}</td>
                  <td>{TI(ri, 'gridPattern')}</td>
                  <td>{CB(ri, 'gridFull')}</td>
                  <td>{CB(ri, 'gridSpec')}</td>
                  {/* TYPE sub-columns */}
                  <td>{CB(ri, 'typeFill')}</td>
                  <td>{CB(ri, 'typeHalf')}</td>
                  <td>{CB(ri, 'typeMine')}</td>
                  {/* 9' TEMP sub-columns */}
                  <td>{CB(ri, 'tempFull')}</td>
                  <td>{CB(ri, 'tempS')}</td>
                  <td>{CB(ri, 'tempU')}</td>
                  {/* Remaining columns */}
                  <td>{CB(ri, 'nailFin')}</td>
                  <td>{CB(ri, 'fullScreen')}</td>
                  <td>{CB(ri, 'oriel')}</td>
                  <td>{CB(ri, 'hor')}</td>
                  <td>{TI(ri, 'typeExt')}</td>
                  <td>{TI(ri, 'typeInt')}</td>
                  <td>{TI(ri, 'rmvInst')}</td>
                  <td>{CB(ri, 'sill')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══ BOTTOM: Notes ═══ */}
        <div className="pf-bottom">
          <div className="pf-notes-box">
            <div className="pf-notes-label">NOTES:</div>
            <textarea className="pf-notes-content" value={data.notes} onChange={e => updateField('notes', e.target.value)} readOnly={!editable} />
          </div>

          {/* Certification text */}
          <div className="pf-cert-text">
            I certify the salesperson has explained and identified each and every abbreviation, term, and drawing on this page to my full satisfaction,
            and I have complete understanding how each and every window or entrance is measured, how it's constructed, accessorized, and warranted.
          </div>

          {/* Bottom info grid — 3-column repeated customer info for carbon copies */}
          <table className="pf-bottom-info-grid">
            <colgroup><col style={{ width: '22%' }} /><col style={{ width: '48%' }} /><col style={{ width: '30%' }} /></colgroup>
            <tbody>
              <tr>
                <td><span className="pf-bi-label">Estimator:</span></td>
                <td><span className="pf-bi-label">Customer:</span><input className="pf-bi-input" value={data.customerName} readOnly style={{ width: '70%' }} /></td>
                <td><span className="pf-bi-label">PO#</span></td>
              </tr>
              <tr>
                <td></td>
                <td><span className="pf-bi-label">Address</span></td>
                <td><span className="pf-bi-label">ACCT #</span></td>
              </tr>
              <tr>
                <td><span className="pf-bi-label">Phone:</span></td>
                <td>
                  <span className="pf-bi-label">Phone:</span><span className="pf-bi-line-short"></span>
                  <span className="pf-bi-label" style={{ marginLeft: '0.15in' }}>Phone:</span><span className="pf-bi-line-short"></span>
                </td>
                <td><span className="pf-bi-label">ORDER DATE:</span></td>
              </tr>
              <tr>
                <td></td>
                <td>
                  <span className="pf-bi-label">City</span><span className="pf-bi-line"></span>
                  <span className="pf-bi-label" style={{ marginLeft: '0.15in' }}>Zip</span><span className="pf-bi-line-short"></span>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* OWNER / DATE signature */}
          <div className="pf-signature-row">
            <div className="pf-sig-field"><span>OWNER</span><span className="pf-sig-line"></span></div>
            <div className="pf-sig-field"><span>DATE</span><span className="pf-sig-line-short"></span></div>
          </div>

          {/* Footer */}
          <div className="pf-footer">
            <div className="pf-footer-left">PAGE {data.pageNumber} OF <span className="pf-sig-line-short" style={{ minWidth: '0.5in' }}></span></div>
            <div className="pf-copy-labels">
              <span>White Copy - Original</span>
              <span>Yellow Copy - Estimator</span>
              <span>Pink Copy - Customer</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PaperOrderForm.displayName = 'PaperOrderForm';
