// ═══════════════════════════════════════════════════════════════
// Sketch Pricing Review — Price breakdown from marker/opening data
// Shows per-opening pricing with clear story, options, and overrides
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { calculateClearStoryCharges } from '../utils/sketchSync';
import type { SketchMarkerData } from '../utils/sketchSync';

interface SketchPricingReviewProps {
  markers: SketchMarkerData[];
  openings: any[];
  onPriceOverride?: (openingNumber: number, field: string, value: number, reason: string) => void;
}

export function SketchPricingReview({ markers, openings, onPriceOverride }: SketchPricingReviewProps) {
  const [expandedOpening, setExpandedOpening] = useState<number | null>(null);
  const [overrideModal, setOverrideModal] = useState<{ openingNumber: number; field: string } | null>(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const clearStoryCharges = calculateClearStoryCharges(openings);
  const openingMarkers = markers.filter(m => m.markerNumber !== null && m.markerSymbol !== 'front_door' && m.markerSymbol !== 'note' && m.markerSymbol !== 'arrow');

  const totalBase = openings.reduce((s, o) => s + (o.basePrice || 0), 0);
  const totalOptions = openings.reduce((s, o) => s + (o.optionsPrice || 0), 0);
  const totalLabor = openings.reduce((s, o) => s + (o.laborPrice || 0), 0);
  const totalClearStory = clearStoryCharges.reduce((s, c) => s + c.charge, 0);
  const grandTotal = totalBase + totalOptions + totalLabor + totalClearStory;

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem' }}>💰 Pricing Review</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{openingMarkers.length} openings from sketch</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#22c55e' }}>${grandTotal.toFixed(2)}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>estimated total</div>
        </div>
      </div>

      {/* Per-opening breakdown */}
      {openingMarkers.map(marker => {
        const opening = openings.find(o => o.openingNumber === marker.markerNumber);
        if (!opening) return null;
        const csCharge = clearStoryCharges.find(c => c.openingNumber === opening.openingNumber);
        const openingTotal = (opening.basePrice || 0) + (opening.optionsPrice || 0) + (opening.laborPrice || 0) + (csCharge?.charge || 0);
        const isExpanded = expandedOpening === opening.openingNumber;
        const hasMissingPrice = opening.basePrice === 0 && opening.pricingStatus !== 'manual';
        const isSiding = (opening.exteriorType || '').toLowerCase() === 'siding' || (opening.exteriorType || '').toLowerCase() === 'wood';

        return (
          <div key={opening.openingNumber} style={{ borderBottom: '1px solid var(--border)' }}>
            {/* Summary row */}
            <div onClick={() => setExpandedOpening(isExpanded ? null : opening.openingNumber)}
              style={{ padding: '0.625rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.875rem' }}>#{opening.openingNumber}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {opening.roomLocation || opening.productCategory || 'Window'}
                </span>
                {opening.width > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{opening.width}×{opening.height}</span>}
                {hasMissingPrice && <span style={{ fontSize: '0.6rem', padding: '1px 4px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 3, fontWeight: 700 }}>NO PRICE</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: openingTotal > 0 ? 'var(--text-primary)' : '#ef4444' }}>
                  ${openingTotal.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ padding: '0 1rem 0.75rem', background: 'rgba(0,0,0,0.02)' }}>
                <PriceLine label="Base Product" amount={opening.basePrice || 0} note={opening.pricingStatus === 'manual' ? 'Manual entry' : `UI: ${opening.unitedInches || '-'}`} />
                <PriceLine label={`Glass: ${opening.glassPackage || 'LEE'}`} amount={opening.optionsPrice ? opening.optionsPrice * 0.3 : 0} />
                <PriceLine label="Foam Enhanced" amount={opening.foamEnhanced ? 15 : 0} note={opening.foamEnhanced ? 'Included' : 'Not selected'} />
                <PriceLine label={`Screen: ${opening.screenOption || '-'}`} amount={0} />
                {isSiding && <PriceLine label="Vinyl Trim + Header" amount={0} note="Review pricing" highlight />}
                {opening.oriel && <PriceLine label="Oriel Surcharge" amount={0} note="Verify with pricing sheet" highlight />}
                {csCharge && <PriceLine label={csCharge.label} amount={csCharge.charge} />}
                <PriceLine label="Labor" amount={opening.laborPrice || 0} />
                {opening.temperedGlass && opening.temperedGlass !== 'none' && <PriceLine label={`Tempered: ${opening.temperedGlass}`} amount={0} note="Verify pricing" />}

                {/* Override button */}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.375rem' }}>
                  <button onClick={() => { setOverrideModal({ openingNumber: opening.openingNumber, field: 'totalPrice' }); setOverrideValue(openingTotal.toString()); }}
                    style={{ padding: '0.3rem 0.625rem', borderRadius: 6, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    ✏️ Override Total
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Totals footer */}
      <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
          <span>Product Subtotal</span><span>${totalBase.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
          <span>Options</span><span>${totalOptions.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
          <span>Labor</span><span>${totalLabor.toFixed(2)}</span>
        </div>
        {totalClearStory > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem', color: '#f59e0b' }}>
            <span>Clear Story Charges</span><span>${totalClearStory.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', paddingTop: '0.375rem', borderTop: '2px solid var(--border)' }}>
          <span>ESTIMATED TOTAL</span><span style={{ color: '#22c55e' }}>${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Override Modal */}
      {overrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '1.25rem', maxWidth: 400, width: '100%' }}>
            <h4 style={{ margin: '0 0 0.75rem' }}>✏️ Price Override — #{overrideModal.openingNumber}</h4>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>New Price ($)</label>
            <input type="number" className="form-input" value={overrideValue} onChange={e => setOverrideValue(e.target.value)} autoFocus />
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>Reason (required)</label>
            <textarea className="form-input" rows={2} value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Why override?" />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={() => {
                if (overrideReason.trim()) {
                  onPriceOverride?.(overrideModal.openingNumber, overrideModal.field, parseFloat(overrideValue) || 0, overrideReason);
                  setOverrideModal(null);
                }
              }} className="btn btn-primary" disabled={!overrideReason.trim()}>Apply Override</button>
              <button onClick={() => setOverrideModal(null)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceLine({ label, amount, note, highlight }: { label: string; amount: number; note?: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0', fontSize: '0.75rem', color: highlight ? '#f59e0b' : 'var(--text-secondary)' }}>
      <div>
        {label}
        {note && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 4 }}>({note})</span>}
      </div>
      <span style={{ fontWeight: 600 }}>{amount > 0 ? `$${amount.toFixed(2)}` : '—'}</span>
    </div>
  );
}
