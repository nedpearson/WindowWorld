import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircleIcon, ExclamationCircleIcon, DocumentTextIcon, ArrowLeftIcon,
  BoltIcon as BoltOutline } from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import apiClient from '../../api/client';

// ── Fallback demo data (shown while API loads) ──────────────────────────────
const DEMO_LEAD = {
  id: 'demo', firstName: 'Loading', lastName: '…',
  address: '', city: '', zip: '', phone: '' };

const DEMO_OPENINGS = [
  { id: 'o1', roomLabel: 'Living Room - Front', windowType: 'DOUBLE_HUNG', width: 35.75, height: 47.75, measureStatus: 'VERIFIED_ONSITE', isAiEstimated: false },
];

const SERIES_OPTIONS = [
  { id: 'SERIES_2000', name: 'Series 2000', basePrice: 189, sqFtRate: 0 },
  { id: 'SERIES_3000', name: 'Series 3000', basePrice: 239, sqFtRate: 0.22 },
  { id: 'SERIES_4000', name: 'Series 4000 ⭐', basePrice: 299, sqFtRate: 0.28 },
  { id: 'SERIES_6000', name: 'Series 6000 (Impact)', basePrice: 399, sqFtRate: 0.35 },
  { id: 'SERIES_CASEMENT', name: 'Casement', basePrice: 349, sqFtRate: 0.30 },
  { id: 'SERIES_PICTURE', name: 'Picture (Fixed)', basePrice: 189, sqFtRate: 0.18 },
];

const FINANCING_OPTS = [
  { id: 'NONE', label: 'No financing', months: 0, apr: 0 },
  { id: 'SAC_12', label: '12 Mo Same-As-Cash', months: 12, apr: 0 },
  { id: 'SAC_18', label: '18 Mo Same-As-Cash', months: 18, apr: 0 },
  { id: 'FIXED_60', label: '60 Mo @ 9.9% APR', months: 60, apr: 9.9 },
  { id: 'FIXED_120', label: '120 Mo @ 11.9% APR', months: 120, apr: 11.9 },
];

function calcWindowPrice(seriesId: string, w: number, h: number) {
  const series = SERIES_OPTIONS.find((s) => s.id === seriesId);
  if (!series) return 0;
  const sqFt = (w * h) / 144;
  return Math.max(series.basePrice + series.sqFtRate * sqFt * 144, series.basePrice);
}

function calcMonthly(amount: number, months: number, apr: number) {
  if (months === 0) return null;
  if (apr === 0) return amount / months;
  const r = apr / 100 / 12;
  return amount * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

interface LineItem {
  openingId: string;
  selected: boolean;
  roomLabel: string;
  windowType: string;
  width: number;
  height: number;
  seriesId: string;
  quantity: number;
  unitPrice: number;
  extraOptions: number; // additional $ per window from options
  lineTotal: number;
  isAiEstimated: boolean;
  aiConfidence?: number;
  measureStatus: string;
}

export function QuotePage() {
  const { leadId } = useParams<{ leadId: string }>();

  const [, setLead] = useState(DEMO_LEAD);
  const [rawOpenings, setRawOpenings] = useState(DEMO_OPENINGS);
  const [, setLoadingData] = useState(true);

  useEffect(() => {
    if (!leadId) { setLoadingData(false); return; }
    Promise.allSettled([
      (apiClient as any).leads.getById(leadId),
      (apiClient as any).openings.list({ leadId, limit: 100 }),
    ]).then(([leadRes, openingsRes]) => {
      if (leadRes.status === 'fulfilled') {
        const l = (leadRes.value as any)?.data ?? leadRes.value;
        setLead({ id: l.id, firstName: l.firstName, lastName: l.lastName,
          address: l.address ?? '', city: l.city ?? '', zip: l.zip ?? '', phone: l.phone ?? '' });
      }
      if (openingsRes.status === 'fulfilled') {
        const raw: any[] = (openingsRes.value as any)?.data ?? [];
        if (raw.length > 0) {
          setRawOpenings(raw.map((o: any) => ({
            id: o.id,
            roomLabel: o.roomLabel ?? o.label ?? 'Opening',
            windowType: o.windowType ?? 'DOUBLE_HUNG',
            width: o.roughWidth ?? o.width ?? 36,
            height: o.roughHeight ?? o.height ?? 48,
            measureStatus: o.measureStatus ?? 'ESTIMATED',
            isAiEstimated: o.isAiEstimated ?? o.measureSource === 'AI',
            aiConfidence: o.aiConfidence })));
        }
      }
    }).finally(() => setLoadingData(false));
  }, [leadId]);

  const [globalSeries, setGlobalSeries] = useState('SERIES_4000');
  const [discountPct, setDiscountPct] = useState(0);
  const [financingId, setFinancingId] = useState('NONE');
  const [showSendModal, setShowSendModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Re-init line items whenever openings load
  useEffect(() => {
    setLineItems(rawOpenings.map((o) => ({
      openingId: o.id,
      selected: true,
      roomLabel: o.roomLabel,
      windowType: o.windowType,
      width: o.width,
      height: o.height,
      seriesId: 'SERIES_4000',
      quantity: 1,
      unitPrice: calcWindowPrice('SERIES_4000', o.width, o.height),
      extraOptions: 75,
      lineTotal: calcWindowPrice('SERIES_4000', o.width, o.height) + 75,
      isAiEstimated: o.isAiEstimated,
      aiConfidence: (o as any).aiConfidence,
      measureStatus: o.measureStatus })));
  }, [rawOpenings]);

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((item) => {
      if (item.openingId !== id) return item;
      const next = { ...item, ...updates };
      if (updates.seriesId || updates.width || updates.height) {
        next.unitPrice = calcWindowPrice(next.seriesId, next.width, next.height);
      }
      next.lineTotal = (next.unitPrice + next.extraOptions) * next.quantity;
      return next;
    }));
  };

  const applyGlobalSeries = () => {
    setLineItems((prev) => prev.map((item) => {
      const unitPrice = calcWindowPrice(globalSeries, item.width, item.height);
      return { ...item, seriesId: globalSeries, unitPrice, lineTotal: (unitPrice + item.extraOptions) * item.quantity };
    }));
    toast.success('Applied series to all windows');
  };

  const selectedItems = lineItems.filter((l) => l.selected);
  const subtotal = selectedItems.reduce((s, l) => s + l.lineTotal, 0);
  const discountAmt = Math.round(subtotal * (discountPct / 100) * 100) / 100;
  const grandTotal = subtotal - discountAmt;
  const totalWindows = selectedItems.reduce((s, l) => s + l.quantity, 0);
  const aiWarningCount = selectedItems.filter((l) => l.isAiEstimated).length;

  const selectedFinancing = FINANCING_OPTS.find((f) => f.id === financingId)!;
  const monthly = calcMonthly(grandTotal, selectedFinancing.months, selectedFinancing.apr);

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/leads/${leadId || '1'}`} className="btn-ghost btn-sm">
          <ArrowLeftIcon className="h-4 w-4" /> Lead
        </Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-lg font-bold text-white">Build Quote</h1>
        <span className="text-slate-600 text-sm">— {DEMO_LEAD.firstName} {DEMO_LEAD.lastName}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left — Line items */}
        <div className="xl:col-span-2 space-y-4">
          {/* Global controls */}
          <div className="card p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="label">Apply Series to All Windows</label>
              <select value={globalSeries} onChange={(e) => setGlobalSeries(e.target.value)} className="select">
                {SERIES_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={applyGlobalSeries} className="btn-primary btn-sm">Apply to All</button>
            <div className="flex-1 min-w-[140px]">
              <label className="label">Discount %</label>
              <input
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.max(0, Math.min(25, parseFloat(e.target.value) || 0)))}
                type="number" min="0" max="25" step="0.5"
                className="input"
                placeholder="0"
              />
            </div>
          </div>

          {/* AI disclaimer */}
          {aiWarningCount > 0 && (
            <div className="flex items-start gap-2. p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ExclamationCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold text-amber-300">{aiWarningCount} window{aiWarningCount > 1 ? 's' : ''} use AI-estimated dimensions.</span>
                <span className="text-amber-400/80 ml-1">Prices are estimates only. These must be field-verified before placing an order. Do not include AI-estimated windows in a binding contract without onsite verification.</span>
              </div>
            </div>
          )}

          {/* Line items table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{lineItems.length} Window Openings</span>
              <span className="text-xs text-slate-500">{selectedItems.length} selected · ${subtotal.toLocaleString()}</span>
            </div>

            <div className="divide-y divide-slate-700/30">
              {lineItems.map((item) => (
                <div key={item.openingId} className={clsx('p-4 transition-colors', !item.selected && 'opacity-40')}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => updateLineItem(item.openingId, { selected: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-brand-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-200">{item.roomLabel}</span>
                        {item.isAiEstimated && (
                          <span className="ai-estimated-label">
                            <ExclamationCircleIcon className="h-3 w-3" />
                            AI Est. {Math.round((item.aiConfidence || 0) * 100)}%
                          </span>
                        )}
                        {item.measureStatus === 'VERIFIED_ONSITE' && (
                          <span className="ai-verified-label">
                            <CheckCircleIcon className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className="text-xs text-slate-500 font-mono">{item.width}" × {item.height}"</div>
                        <select
                          value={item.seriesId}
                          onChange={(e) => updateLineItem(item.openingId, { seriesId: e.target.value })}
                          className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        >
                          {SERIES_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.openingId, { quantity: parseInt(e.target.value) || 1 })}
                          type="number" min="1" max="10"
                          className="w-14 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-slate-300"
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-white">${item.lineTotal.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500">${(item.unitPrice + item.extraOptions).toFixed(0)}/ea</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Total + financing */}
        <div className="space-y-4">
          {/* Summary card */}
          <div className="card p-5 sticky top-20">
            <h2 className="text-sm font-semibold text-white mb-4">Quote Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>{totalWindows} windows × avg</span>
                <span className="text-white font-mono">
                  ${totalWindows > 0 ? (subtotal / totalWindows).toFixed(0) : 0}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="text-white font-mono">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount ({discountPct}%)</span>
                  <span className="font-mono">−${discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-slate-700/50 my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span className="text-white">Grand Total</span>
                <span className="text-white font-mono">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Financing */}
            <div className="mt-5">
              <label className="label">Financing Option</label>
              <select value={financingId} onChange={(e) => setFinancingId(e.target.value)} className="select">
                {FINANCING_OPTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              {monthly && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-2xl font-bold text-emerald-400">${monthly.toFixed(2)}<span className="text-sm text-emerald-600">/mo</span></div>
                  <div className="text-xs text-emerald-600">{selectedFinancing.label}</div>
                  {selectedFinancing.apr > 0 && (
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      Total: ${(monthly * selectedFinancing.months).toFixed(2)} including interest
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => { setSaved(true); toast.success('Quote saved!'); }}
                className="btn-primary w-full"
              >
                {saved ? <><CheckCircleIcon className="h-4 w-4" /> Quote Saved</> : 'Save Quote'}
              </button>

              {saved && (
                <button
                  onClick={() => setShowSendModal(true)}
                  className="btn-success w-full"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  Create &amp; Send Proposal
                </button>
              )}

              <Link to="/proposals" className="btn-secondary w-full text-center">
                View All Proposals
              </Link>
            </div>

            {/* Warranty blurb */}
            <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All WindowWorld products include a <strong className="text-slate-400">Limited Lifetime Warranty</strong> on frames, glass, and installation. Transferable to future owners.
              </p>
            </div>
          </div>

          {/* AI window disclaimer minimized card */}
          {aiWarningCount > 0 && (
            <div className="card p-3 border-amber-500/20">
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <ExclamationCircleIcon className="h-4 w-4" />
                <span>{aiWarningCount} window{aiWarningCount > 1 ? 's' : ''} include AI-estimated dims. Manager approval required before ordering.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send modal */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
            onClick={() => setShowSendModal(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-8 w-full max-w-md border border-slate-700"
            >
              <h2 className="text-lg font-bold text-white mb-2">Send Proposal</h2>
              <p className="text-sm text-slate-400 mb-6">Sending this quote as a formal proposal to {DEMO_LEAD.firstName} {DEMO_LEAD.lastName}.</p>
              <div className="space-y-3 mb-6">
                {[
                  ['Email', DEMO_LEAD.phone.replace('(225) 555-', '') + '@gmail.com'],
                  ['SMS', DEMO_LEAD.phone],
                  ['Both', 'Email + Text message'],
                ].map(([method, detail]) => (
                  <button key={method} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                    onClick={() => { toast.success(`Proposal sent via ${method}!`); setShowSendModal(false); }}>
                    <span className="text-sm font-medium text-white">{method}</span>
                    <span className="text-xs text-slate-500">{detail}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSendModal(false)} className="btn-secondary w-full">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
