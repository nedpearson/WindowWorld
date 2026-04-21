import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  CameraIcon, PlusIcon, CheckCircleIcon, ExclamationCircleIcon,
  ArrowLeftIcon, ClipboardDocumentListIcon, HomeIcon,
  MapPinIcon, PhoneIcon, PencilIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { api } from '../../api/client';

// Window type options
const WINDOW_TYPES = ['DOUBLE_HUNG', 'SINGLE_HUNG', 'CASEMENT', 'AWNING', 'SLIDER', 'FIXED', 'BAY', 'BOW', 'GARDEN', 'EGRESS'];
const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'];

const COND_COLORS: Record<string, string> = {
  EXCELLENT: 'badge-green', GOOD: 'badge-blue', FAIR: 'badge-yellow', POOR: 'badge-red', CRITICAL: 'badge-red',
};

const MEAS_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  VERIFIED_ONSITE: { label: 'Verified Onsite', color: 'text-emerald-400', icon: CheckCircleIcon },
  REVIEWED: { label: 'Reviewed', color: 'text-blue-400', icon: CheckCircleIcon },
  ESTIMATED: { label: 'Estimated (AI)', color: 'text-amber-400', icon: ExclamationCircleIcon },
  APPROVED_FOR_ORDER: { label: 'Order Ready', color: 'text-emerald-400', icon: CheckCircleIcon },
};

// Demo inspection data
const DEMO_INSPECTION = {
  id: 'insp-1',
  status: 'IN_PROGRESS',
  scheduledFor: '2026-04-20T10:00:00',
  startedAt: '2026-04-20T10:08:00',
  lead: {
    id: '3', firstName: 'Robert', lastName: 'Comeaux',
    address: '4521 Greenwell Springs Rd', city: 'Baton Rouge', zip: '70806',
    phone: '(225) 555-1001',
  },
  property: {
    yearBuilt: 1982, propertyType: 'single-family',
    squareFootage: 1900, stories: 1,
  },
  inspectedBy: { firstName: 'Jake', lastName: 'Thibodaux' },
  notes: 'Homeowner confirmed all windows single pane original. Several showing fogging.',
  openings: [
    { id: 'o1', roomLabel: 'Living Room - Front', windowType: 'DOUBLE_HUNG', condition: 'POOR', sortOrder: 1, floor: 'Main', hasScreen: true, isEgress: false,
      measurement: { finalWidth: 35.75, finalHeight: 47.75, status: 'VERIFIED_ONSITE', isAiEstimated: false, measuredById: 'u1' },
    },
    { id: 'o2', roomLabel: 'Living Room - Side', windowType: 'DOUBLE_HUNG', condition: 'POOR', sortOrder: 2, floor: 'Main', hasScreen: true, isEgress: false,
      measurement: { finalWidth: 35.875, finalHeight: 47.75, status: 'VERIFIED_ONSITE', isAiEstimated: false, measuredById: 'u1' },
    },
    { id: 'o3', roomLabel: 'Kitchen', windowType: 'SINGLE_HUNG', condition: 'FAIR', sortOrder: 3, floor: 'Main', hasScreen: false, isEgress: false,
      measurement: { finalWidth: 28.0, finalHeight: 36.0, status: 'ESTIMATED', isAiEstimated: true, aiConfidenceScore: 0.78 },
    },
    { id: 'o4', roomLabel: 'Master Bedroom - E', windowType: 'DOUBLE_HUNG', condition: 'FAIR', sortOrder: 4, floor: 'Main', hasScreen: true, isEgress: true,
      measurement: null,
    },
    { id: 'o5', roomLabel: 'Master Bedroom - S', windowType: 'DOUBLE_HUNG', condition: 'POOR', sortOrder: 5, floor: 'Main', hasScreen: true, isEgress: false,
      measurement: null,
    },
    { id: 'o6', roomLabel: 'Bedroom 2', windowType: 'DOUBLE_HUNG', condition: 'FAIR', sortOrder: 6, floor: 'Main', hasScreen: true, isEgress: false,
      measurement: null,
    },
  ],
};

type DrawerMode = 'none' | 'add-opening' | 'measure-opening' | 'edit-opening';

export function InspectionPage() {
  const { id } = useParams();
  const { enqueue, pendingCount, isOnline } = useOfflineQueue();
  const [inspection, setInspection] = useState<any>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [newOpening, setNewOpening] = useState({ roomLabel: '', windowType: 'DOUBLE_HUNG', condition: 'FAIR', floor: 'Main', hasScreen: false, isEgress: false, notes: '' });
  const [measurementInput, setMeasurementInput] = useState({ width: '', widthFrac: '0', height: '', heightFrac: '0' });

  // Fetch real inspection from API
  const { data: inspData, isLoading, error } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => api.inspections.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  // Seed local state from API once loaded (mutations go through offline queue)
  useEffect(() => {
    const d = (inspData as any)?.data || inspData;
    if (d) setInspection(d);
  }, [inspData]);

  if (isLoading) return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-slate-800 rounded w-40" />
      <div className="h-40 bg-slate-800 rounded-xl" />
      <div className="h-64 bg-slate-800 rounded-xl" />
    </div>
  );

  if (error || !inspection) return (
    <div className="p-6 text-center">
      <p className="text-red-400 font-medium mb-2">Could not load inspection.</p>
      <p className="text-slate-600 text-sm mb-4">Make sure an inspection exists for this lead.</p>
      <Link to="/leads" className="btn-secondary btn-sm">Back to Leads</Link>
    </div>
  );

  const fractions = ['0', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];
  const fracToDecimal = (f: string) => { if (f === '0') return 0; const [n, d] = f.split('/').map(Number); return n / d; };

  const openings: any[] = inspection?.openings || [];
  const verifiedCount = openings.filter((o) => o.measurement?.status === 'VERIFIED_ONSITE').length;
  const aiCount = openings.filter((o) => (o.measurement as any)?.isAiEstimated).length;
  const unmeasuredCount = openings.filter((o) => !o.measurement).length;
  const readinessPct = openings.length > 0
    ? Math.round((verifiedCount / openings.length) * 100) : 0;

  const handleAddOpening = async () => {
    if (!newOpening.roomLabel.trim()) {
      toast.error('Room label is required');
      return;
    }
    const opening = {
      id: `o-${Date.now()}`,
      ...newOpening,
      sortOrder: openings.length + 1,
      measurement: null,
    };
    setInspection((prev) => ({ ...prev, openings: [...prev.openings, opening] }));
    await enqueue('OPENING_CREATE', { inspectionId: inspection.id, ...newOpening });
    toast.success(`Opening added: ${newOpening.roomLabel}`);
    setNewOpening({ roomLabel: '', windowType: 'DOUBLE_HUNG', condition: 'FAIR', floor: 'Main', hasScreen: false, isEgress: false, notes: '' });
    setDrawerMode('none');
  };

  const handleSaveMeasurement = async () => {
    const opening = openings.find((o) => o.id === selectedOpeningId);
    if (!opening) return;
    const finalWidth = parseFloat(measurementInput.width) + fracToDecimal(measurementInput.widthFrac);
    const finalHeight = parseFloat(measurementInput.height) + fracToDecimal(measurementInput.heightFrac);

    if (!measurementInput.width || !measurementInput.height) {
      toast.error('Enter both width and height');
      return;
    }

    const measurement = { finalWidth, finalHeight, status: 'VERIFIED_ONSITE', isAiEstimated: false } as any;
    setInspection((prev) => ({
      ...prev,
      openings: prev.openings.map((o) => o.id === selectedOpeningId ? { ...o, measurement } : o),
    }));

    await enqueue('MEASUREMENT_SAVE', {
      openingId: selectedOpeningId,
      finalWidth, finalHeight,
      status: 'VERIFIED_ONSITE',
      isAiEstimated: false,
      measurementMethod: 'FIELD_TAPE',
    });

    toast.success(`Measurement saved: ${finalWidth.toFixed(3)}" × ${finalHeight.toFixed(3)}"`);
    setDrawerMode('none');
    setSelectedOpeningId(null);
    setMeasurementInput({ width: '', widthFrac: '0', height: '', heightFrac: '0' });
  };

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link to={`/leads/${inspection.lead.id}`} className="btn-ghost btn-sm">
          <ArrowLeftIcon className="h-4 w-4" /> Lead
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-400">Inspection</span>
        {!isOnline && <span className="badge badge-red text-[10px] ml-auto">Offline · {pendingCount} queued</span>}
      </div>

      {/* Lead + inspection summary */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{inspection.lead.firstName} {inspection.lead.lastName}</h1>
              <span className={clsx('badge text-[10px]',
                inspection.status === 'IN_PROGRESS' ? 'badge-yellow' :
                inspection.status === 'COMPLETE' ? 'badge-green' : 'badge-blue'
              )}>
                {inspection.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5" />
              {inspection.lead.address}, {inspection.lead.city}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {inspection.property.yearBuilt} · {inspection.property.propertyType} · {inspection.property.squareFootage?.toLocaleString()} sq ft · {inspection.property.stories} story
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${inspection.lead.phone}`} className="btn-secondary btn-sm">
              <PhoneIcon className="h-4 w-4" /> Call
            </a>
            <Link to="/field" className="btn-primary btn-sm">
              Field Mode
            </Link>
          </div>
        </div>

        {/* Measurement readiness */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Measurement Progress</span>
            <span className="text-xs text-slate-400">{verifiedCount}/{openings.length} verified</span>
          </div>
          <div className="score-bar h-2">
            <div className="score-bar-fill bg-emerald-500 transition-all duration-500" style={{ width: `${readinessPct}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-emerald-400">{verifiedCount} verified</span>
            {aiCount > 0 && <span className="text-amber-400">{aiCount} AI-estimated (need verification)</span>}
            {unmeasuredCount > 0 && <span className="text-slate-600">{unmeasuredCount} unmeasured</span>}
          </div>
        </div>
      </div>

      {/* AI disclaimer */}
      {aiCount > 0 && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <ExclamationCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">AI Measurement Disclaimer</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              {aiCount} opening{aiCount > 1 ? 's have' : ' has'} AI-estimated dimensions from photo analysis.
              These <strong>must be verified onsite</strong> by a field technician and approved by a manager before placing any window order.
              AI estimates carry a confidence score — not a guarantee of accuracy.
            </p>
          </div>
        </div>
      )}

      {/* Openings table */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-white">{openings.length} Openings</span>
          </div>
          <button onClick={() => setDrawerMode('add-opening')} className="btn-primary btn-sm">
            <PlusIcon className="h-4 w-4" /> Add Opening
          </button>
        </div>

        <div className="divide-y divide-slate-700/30">
          {openings.map((opening) => {
            const meas = opening.measurement;
            const measStatus = meas?.status ? MEAS_STATUS[meas.status] : null;
            const StatusIcon = measStatus?.icon;

            return (
              <div key={opening.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{opening.roomLabel}</span>
                      <span className={`badge text-[10px] ${COND_COLORS[opening.condition] || 'badge-slate'}`}>{opening.condition}</span>
                      {opening.isEgress && <span className="badge badge-yellow text-[10px]">Egress</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span>{opening.windowType?.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{opening.floor}</span>
                      {opening.hasScreen && <span>· Screen</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {meas ? (
                      <div className="text-right">
                        <div className="font-mono text-sm text-white">{meas.finalWidth}" × {meas.finalHeight}"</div>
                        <div className={clsx('flex items-center gap-1 text-[10px] justify-end', measStatus?.color)}>
                          {StatusIcon && <StatusIcon className="h-3 w-3" />}
                          {measStatus?.label}
                          {(meas as any).isAiEstimated && (
                            <span className="text-amber-500 ml-1">AI {Math.round(((meas as any).aiConfidenceScore || 0) * 100)}%</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600">No measurement</div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedOpeningId(opening.id);
                        setDrawerMode('measure-opening');
                      }}
                      className="btn-secondary btn-sm"
                    >
                      {meas ? <PencilIcon className="h-4 w-4" /> : 'Measure'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspector notes */}
      {inspection.notes && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Inspector Notes</div>
          <p className="text-sm text-slate-300 leading-relaxed">{inspection.notes}</p>
        </div>
      )}

      {/* Complete button */}
      {inspection.status === 'IN_PROGRESS' && (
        <button
          onClick={async () => {
            await enqueue('INSPECTION_UPDATE', { inspectionId: inspection.id, action: 'complete' });
            setInspection((prev) => ({ ...prev, status: 'COMPLETE' }));
            toast.success('Inspection marked complete!');
          }}
          className="btn-success w-full"
        >
          <CheckCircleIcon className="h-5 w-5" />
          Complete Inspection
        </button>
      )}

      {/* ── Drawer ── */}
      <AnimatePresence>
        {drawerMode !== 'none' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end"
            onClick={() => setDrawerMode('none')}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-slate-900 rounded-t-2xl border-t border-slate-700 max-h-[85vh] overflow-y-auto"
            >
              {/* Drawer handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-slate-700" />
              </div>

              <div className="p-6 pb-10">
                {/* Add Opening drawer */}
                {drawerMode === 'add-opening' && (
                  <div className="space-y-4">
                    <h2 className="text-base font-semibold text-white">Add Opening</h2>

                    <div>
                      <label className="label">Room Label</label>
                      <input
                        value={newOpening.roomLabel}
                        onChange={(e) => setNewOpening((p) => ({ ...p, roomLabel: e.target.value }))}
                        placeholder="e.g. Living Room - Front"
                        className="input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Window Type</label>
                        <select value={newOpening.windowType} onChange={(e) => setNewOpening((p) => ({ ...p, windowType: e.target.value }))} className="select">
                          {WINDOW_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Condition</label>
                        <select value={newOpening.condition} onChange={(e) => setNewOpening((p) => ({ ...p, condition: e.target.value }))} className="select">
                          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Floor</label>
                        <select value={newOpening.floor} onChange={(e) => setNewOpening((p) => ({ ...p, floor: e.target.value }))} className="select">
                          {['Main', 'Upper', 'Basement', 'Garage'].map((f) => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2 pt-5">
                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                          <input type="checkbox" checked={newOpening.hasScreen} onChange={(e) => setNewOpening((p) => ({ ...p, hasScreen: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
                          Has Screen
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                          <input type="checkbox" checked={newOpening.isEgress} onChange={(e) => setNewOpening((p) => ({ ...p, isEgress: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
                          Egress Window
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="label">Notes</label>
                      <textarea value={newOpening.notes} onChange={(e) => setNewOpening((p) => ({ ...p, notes: e.target.value }))} className="textarea" rows={2} placeholder="Optional notes about this opening..." />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setDrawerMode('none')} className="btn-secondary flex-1">Cancel</button>
                      <button onClick={handleAddOpening} className="btn-primary flex-1">Add Opening</button>
                    </div>
                  </div>
                )}

                {/* Measure Opening drawer */}
                {drawerMode === 'measure-opening' && (() => {
                  const opening = openings.find((o) => o.id === selectedOpeningId);
                  if (!opening) return null;
                  const finalWidth = parseFloat(measurementInput.width || '0') + fracToDecimal(measurementInput.widthFrac);
                  const finalHeight = parseFloat(measurementInput.height || '0') + fracToDecimal(measurementInput.heightFrac);

                  return (
                    <div className="space-y-4">
                      <h2 className="text-base font-semibold text-white">Measure: {opening.roomLabel}</h2>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Width */}
                        <div className="space-y-3">
                          <label className="label">Width (W)</label>
                          <div className="bg-slate-800 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold font-mono text-white">{measurementInput.width || '0'}-{measurementInput.widthFrac}"</div>
                          </div>
                          <input value={measurementInput.width} onChange={(e) => setMeasurementInput((p) => ({ ...p, width: e.target.value }))} type="number" step="0.125" placeholder="Inches" className="input text-center font-mono" />
                          <div className="grid grid-cols-4 gap-1">
                            {fractions.map((f) => (
                              <button key={f} onClick={() => setMeasurementInput((p) => ({ ...p, widthFrac: f }))}
                                className={clsx('py-2 rounded-lg text-xs font-mono transition-colors',
                                  measurementInput.widthFrac === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 active:bg-slate-700'
                                )}>
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Height */}
                        <div className="space-y-3">
                          <label className="label">Height (H)</label>
                          <div className="bg-slate-800 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold font-mono text-white">{measurementInput.height || '0'}-{measurementInput.heightFrac}"</div>
                          </div>
                          <input value={measurementInput.height} onChange={(e) => setMeasurementInput((p) => ({ ...p, height: e.target.value }))} type="number" step="0.125" placeholder="Inches" className="input text-center font-mono" />
                          <div className="grid grid-cols-4 gap-1">
                            {fractions.map((f) => (
                              <button key={f} onClick={() => setMeasurementInput((p) => ({ ...p, heightFrac: f }))}
                                className={clsx('py-2 rounded-lg text-xs font-mono transition-colors',
                                  measurementInput.heightFrac === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 active:bg-slate-700'
                                )}>
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Final summary */}
                      <div className="bg-slate-800 rounded-xl p-4 text-center">
                        <div className="text-xs text-slate-500 mb-1">Final Measurement</div>
                        <div className="text-2xl font-bold font-mono text-white">
                          {finalWidth.toFixed(3)}" × {finalHeight.toFixed(3)}"
                        </div>
                      </div>

                      <p className="text-xs text-amber-400 flex items-center gap-1.5">
                        <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                        Will be saved as VERIFIED_ONSITE. Requires manager approval to be used for ordering.
                      </p>

                      <div className="flex gap-3">
                        <button onClick={() => setDrawerMode('none')} className="btn-secondary flex-1">Cancel</button>
                        <button onClick={handleSaveMeasurement} className="btn-primary flex-1">Save Measurement</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
