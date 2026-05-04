import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon, CameraIcon,
  SparklesIcon, DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { api, post } from '../../api/client';
import { ReferenceObjectMeasure } from '../../components/field/ReferenceObjectMeasure';

const DEMO_OPENING = {
  id: 'o3',
  roomLabel: 'Kitchen',
  windowType: 'SINGLE_HUNG',
  condition: 'FAIR',
  floor: 'Main',
  hasScreen: false,
  isEgress: false,
  inspectionId: 'insp-1',
  notes: 'Some fogging between panes. Latch sticky but functional.',
  measurement: {
    finalWidth: 28.0,
    finalHeight: 36.0,
    status: 'ESTIMATED',
    isAiEstimated: true,
    aiConfidenceScore: 0.78 } };

const fractions = ['0', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];
const fracToDecimal = (f: string) => { if (f === '0') return 0; const [n, d] = f.split('/').map(Number); return n / d; };

export function MeasurementPage() {
  const { openingId } = useParams();
  const { enqueue, isOnline, pendingCount } = useOfflineQueue();

  const { data: openingResp, isLoading, error } = useQuery({
    queryKey: ['opening', openingId],
    queryFn: () => api.openings.getById(openingId!),
    enabled: !!openingId,
    staleTime: 60_000 });

  const opening: any = (openingResp as any)?.data || openingResp || {};

  const [widthInt, setWidthInt] = useState('');
  const [widthFrac, setWidthFrac] = useState('0');
  const [heightInt, setHeightInt] = useState('');
  const [heightFrac, setHeightFrac] = useState('0');
  const [saved, setSaved] = useState(false);

  // ── Quick Methods ──────────────────────────────────────────────────────────
  const [activeMethod, setActiveMethod] = useState<'ai' | 'ref' | 'tape'>('tape');

  // ── Photo attachment ───────────────────────────────────────────────────────
  const [attachedPhotoUrl, setAttachedPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const previewUrl = URL.createObjectURL(file);
    setAttachedPhotoUrl(previewUrl);
    setPhotoUploading(true);
    try {
      // Resize to max 1920px at 0.85 JPEG quality before upload (matches ReceiptCapture pattern)
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (ev) => { img.src = ev.target?.result as string; };
        reader.onerror = reject;
        img.onload = () => {
          const MAX = 1920;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85).replace(/^data:image\/jpeg;base64,/, ''));
        };
        img.onerror = reject;
        reader.readAsDataURL(file);
      });

      await post('/documents', {
        leadId:       opening?.leadId,
        openingId:    opening?.id,
        inspectionId: opening?.inspectionId,
        type:         'MEASUREMENT_PHOTO',
        base64,
        filename:     `measurement-${opening?.id}-${Date.now()}.jpg`,
      });
      toast.success('Photo attached to this opening.');
    } catch {
      toast.error('Photo upload failed — it will not be saved.');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Pre-fill from existing measurement once loaded (useEffect prevents setState-in-render)
  const existingMeas = opening?.measurement;
  const [prefilledFromApi, setPrefilledFromApi] = useState(false);
  useEffect(() => {
    if (existingMeas && !prefilledFromApi) {
      setWidthInt(String(Math.floor(existingMeas.finalWidth || 0)));
      setHeightInt(String(Math.floor(existingMeas.finalHeight || 0)));
      setPrefilledFromApi(true);
    }
  }, [existingMeas, prefilledFromApi]);

  if (isLoading) return (
    <div className="p-6 space-y-4 animate-pulse max-w-lg mx-auto">
      <div className="h-6 bg-slate-800 rounded w-32" />
      <div className="h-28 bg-slate-800 rounded-xl" />
      <div className="h-64 bg-slate-800 rounded-xl" />
    </div>
  );

  if (error || !opening?.id) return (
    <div className="p-6 text-center max-w-lg mx-auto">
      <p className="text-red-400 font-medium mb-2">Could not load opening.</p>
      <Link to="/leads" className="btn-secondary btn-sm">Back to Leads</Link>
    </div>
  );

  const finalWidth = parseFloat(widthInt || '0') + fracToDecimal(widthFrac);
  const finalHeight = parseFloat(heightInt || '0') + fracToDecimal(heightFrac);

  const handleSave = async () => {
    await enqueue('MEASUREMENT_SAVE', {
      openingId: opening.id,
      finalWidth,
      finalHeight,
      status: 'VERIFIED_ONSITE',
      isAiEstimated: false,
      measurementMethod: 'FIELD_TAPE',
      notes: existingMeas?.isAiEstimated
        ? `Field verified — replaced AI estimate of ${existingMeas.finalWidth}" × ${existingMeas.finalHeight}"`
        : 'Field verified measurement' });
    setSaved(true);
    toast.success(`Measurement saved: ${finalWidth.toFixed(3)}" × ${finalHeight.toFixed(3)}"`);
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/inspections/${opening.inspectionId || 'back'}`} className="btn-ghost btn-sm">
          <ArrowLeftIcon className="h-4 w-4" /> Inspection
        </Link>
        {!isOnline && <span className="badge badge-red text-[10px] ml-auto">Offline · {pendingCount} queued</span>}
      </div>

      {/* Opening info */}
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{opening.roomLabel}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{opening.windowType.replace(/_/g, ' ')} · {opening.floor} · {opening.condition}</p>
            {opening.notes && <p className="text-xs text-slate-600 mt-2 leading-relaxed">{opening.notes}</p>}
          </div>
          <span className="badge badge-yellow text-[10px]">{opening.condition}</span>
        </div>
      </div>

      {/* Current measurement */}
      {opening.measurement && (
        <div className={clsx(
          'flex items-start gap-3 p-4 rounded-xl border',
          opening.measurement.isAiEstimated
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-emerald-500/10 border-emerald-500/20'
        )}>
          {opening.measurement.isAiEstimated
            ? <ExclamationCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
            : <CheckCircleIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          }
          <div>
            <div className="flex items-center gap-2">
              <span className={clsx('text-sm font-semibold', opening.measurement.isAiEstimated ? 'text-amber-300' : 'text-emerald-300')}>
                {opening.measurement.isAiEstimated ? 'AI Estimate (UNVERIFIED)' : 'Verified Measurement'}
              </span>
              {opening.measurement.isAiEstimated && (
                <span className="text-[10px] text-amber-500">{Math.round((opening.measurement.aiConfidenceScore || 0) * 100)}% confidence</span>
              )}
            </div>
            <div className="font-mono text-lg text-white mt-1">
              {opening.measurement.finalWidth}" × {opening.measurement.finalHeight}"
            </div>
            {opening.measurement.isAiEstimated && (
              <p className="text-[11px] text-amber-400/80 mt-1">
                This AI estimate must be verified with a tape measure before placing an order.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Quick Methods toggle ── */}
      <div className="flex gap-2">
        {([
          { id: 'tape', label: 'Tape Measure', icon: <span className="text-sm">📏</span>, check: true },
          { id: 'ref',  label: 'Reference Object', icon: <DevicePhoneMobileIcon className="h-4 w-4" />, check: false },
          { id: 'ai',   label: 'AI Photo', icon: <SparklesIcon className="h-4 w-4" />, check: false },
        ] as Array<{ id: 'tape' | 'ref' | 'ai'; label: string; icon: React.ReactNode; check?: boolean }>).map(({ id, label, icon, check }) => (
          <button
            key={id}
            onClick={() => setActiveMethod(id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all',
              activeMethod === id
                ? 'bg-brand-600 border-brand-500 text-white'
                : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:text-slate-300',
            )}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
            {check && activeMethod === id && <span className="text-brand-200">✓</span>}
          </button>
        ))}
      </div>

      {/* ── Reference Object method ── */}
      {activeMethod === 'ref' && (
        <div className="card p-5">
          <ReferenceObjectMeasure
            openingId={opening.id}
            leadId={opening.leadId || ''}
            roomLabel={opening.roomLabel || ''}
            onMeasured={(w, h) => {
              setWidthInt(String(Math.floor(w)));
              setHeightInt(String(Math.floor(h)));
              setActiveMethod('tape');
              toast.success('AI estimate pre-filled — review and save when ready.');
            }}
          />
        </div>
      )}

      {/* ── Tape Measure entry ── */}
      {activeMethod === 'tape' && (
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-400" />
          <span className="text-sm font-semibold text-white">Enter Field Measurement</span>
        </div>

        {/* Width */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Width</label>
            <div className="text-xl font-bold font-mono text-white">{widthInt || '0'}-{widthFrac}"</div>
          </div>
          <input
            value={widthInt}
            onChange={(e) => setWidthInt(e.target.value)}
            type="number"
            step="1"
            min="1"
            placeholder="Whole inches"
            className="input font-mono text-center"
          />
          <div className="grid grid-cols-8 gap-1">
            {fractions.map((f) => (
              <button
                key={f}
                onClick={() => setWidthFrac(f)}
                className={clsx(
                  'py-2.5 rounded-lg text-xs font-mono transition-colors',
                  widthFrac === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-700/50" />

        {/* Height */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Height</label>
            <div className="text-xl font-bold font-mono text-white">{heightInt || '0'}-{heightFrac}"</div>
          </div>
          <input
            value={heightInt}
            onChange={(e) => setHeightInt(e.target.value)}
            type="number"
            step="1"
            min="1"
            placeholder="Whole inches"
            className="input font-mono text-center"
          />
          <div className="grid grid-cols-8 gap-1">
            {fractions.map((f) => (
              <button
                key={f}
                onClick={() => setHeightFrac(f)}
                className={clsx(
                  'py-2.5 rounded-lg text-xs font-mono transition-colors',
                  heightFrac === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Photo attach button (Feature C) ── */}
        <div className="pt-2 border-t border-slate-700/30">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors">
            {photoUploading
              ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
              : <CameraIcon className="h-4 w-4" />
            }
            <span>{photoUploading ? 'Uploading photo…' : 'Attach photo of this window'}</span>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoAttach}
            />
          </label>
          {attachedPhotoUrl && !photoUploading && (
            <div className="mt-2 flex items-center gap-2">
              <img src={attachedPhotoUrl} alt="Attached" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                Photo saved
              </div>
            </div>
          )}
        </div>
      </div>
      )}{/* end tape block */}

      {/* Final readout */}
      {activeMethod === 'tape' && (
      <div className="card p-5 text-center bg-slate-800/60">
        <div className="text-xs text-slate-500 mb-2">Final Dimensions</div>
        <div className="text-4xl font-bold font-mono text-white">
          {finalWidth.toFixed(3)}" × {finalHeight.toFixed(3)}"
        </div>
        <div className="text-xs text-slate-600 mt-2">Field measurement · VERIFIED_ONSITE status</div>
      </div>
      )}

      {/* Disclaimer */}
      {activeMethod === 'tape' && (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 text-xs text-slate-500">
        <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
        <span>
          Saving as <strong className="text-white">VERIFIED_ONSITE</strong>. A manager must approve before this measurement can be used to place a window order. Never order windows from AI estimates alone.
        </span>
      </div>
      )}

      {/* Actions */}
      {!saved ? (
        <button
          onClick={handleSave}
          disabled={!widthInt || !heightInt}
          className="btn-primary w-full"
        >
          <CheckCircleIcon className="h-5 w-5" />
          Save Verified Measurement
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/25"
        >
          <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-emerald-300">Measurement Saved!</div>
            <div className="text-xs text-emerald-500">{isOnline ? 'Synced to server' : 'Saved locally — will sync when online'}</div>
          </div>
          <Link to={`/inspections/${opening.inspectionId || 'back'}`} className="ml-auto btn-secondary btn-sm">← Back</Link>
        </motion.div>
      )}
    </div>
  );
}
