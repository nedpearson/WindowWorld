import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  PhoneIcon, MapPinIcon, CameraIcon, PencilIcon,
  CloudArrowUpIcon, CheckCircleIcon, ExclamationCircleIcon,
  ArrowPathIcon, ChevronRightIcon, ChevronLeftIcon,
  WifiIcon, XMarkIcon, BoltIcon as BoltOutline,
  MicrophoneIcon, ListBulletIcon, HomeIcon,
  ClipboardDocumentListIcon, ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon, CloudIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useAppStore } from '../../store/auth.store';

// ─── Types ────────────────────────────────────────────────────
type FieldTab = 'route' | 'capture' | 'measure' | 'notes';
type MeasureStep = 'select-opening' | 'enter-width' | 'enter-height' | 'confirm' | 'done';

// ─── Demo route data ──────────────────────────────────────────
const TODAY_STOPS = [
  {
    id: 'a1', order: 1, status: 'confirmed', type: 'initial-consult',
    lead: { id: '3', name: 'Robert Comeaux', phone: '(225) 555-1001', address: '4521 Greenwell Springs Rd', city: 'Baton Rouge', zip: '70806', score: 78, isStorm: false },
    time: '10:00 AM', duration: 90, notes: 'Walk entire home. Homeowner believes 10 windows need replacement.',
  },
  {
    id: 'a2', order: 2, status: 'confirmed', type: 'measurement',
    lead: { id: '6', name: 'Karen Guidry', phone: '(225) 555-2001', address: '1134 Range Ave', city: 'Denham Springs', zip: '70726', score: 74, isStorm: true },
    time: '1:30 PM', duration: 60, notes: '6 openings. She believes some are non-standard. Confirm dims carefully.',
  },
  {
    id: 'a3', order: 3, status: 'scheduled', type: 'close',
    lead: { id: '1', name: 'Michael Trosclair', phone: '(225) 555-1003', address: '7824 Old Hammond Hwy', city: 'Baton Rouge', zip: '70809', score: 91, isStorm: true },
    time: '3:45 PM', duration: 45, notes: 'Verbal commit. Bring contract + financing docs.',
  },
];

const OPENING_TEMPLATES = [
  { id: 'o1', label: 'Living Room - Front', floor: 'Main', type: 'Double Hung' },
  { id: 'o2', label: 'Living Room - Side', floor: 'Main', type: 'Double Hung' },
  { id: 'o3', label: 'Kitchen', floor: 'Main', type: 'Single Hung' },
  { id: 'o4', label: 'Master Bedroom - E', floor: 'Main', type: 'Double Hung' },
  { id: 'o5', label: 'Bedroom 2', floor: 'Main', type: 'Double Hung' },
  { id: 'o6', label: 'Bathroom', floor: 'Main', type: 'Single Hung' },
];

// ─── Subcomponents ────────────────────────────────────────────
function OfflineBanner({ pendingCount, isSyncing, syncNow, isOnline }: any) {
  if (isOnline && pendingCount === 0) return null;
  return (
    <div className={clsx(
      'flex items-center gap-2 px-4 py-2 text-xs font-medium',
      isOnline ? 'bg-amber-500/15 text-amber-300 border-b border-amber-500/20' : 'bg-red-500/15 text-red-300 border-b border-red-500/20'
    )}>
      {isOnline
        ? <><CloudArrowUpIcon className="h-4 w-4" />{pendingCount} action{pendingCount > 1 ? 's' : ''} pending sync<button onClick={syncNow} className="ml-auto underline">Sync now</button></>
        : <><WifiIcon className="h-4 w-4" />Offline mode — changes saved locally<span className="ml-auto">{pendingCount} queued</span></>
      }
    </div>
  );
}

function StopCard({ stop, isActive, onSelect }: any) {
  const typeColors: Record<string, string> = {
    'initial-consult': 'border-l-brand-500',
    'measurement': 'border-l-cyan-500',
    'close': 'border-l-emerald-500',
    'follow-up': 'border-l-amber-500',
  };

  return (
    <motion.div
      layout
      onClick={() => onSelect(stop)}
      className={clsx(
        'rounded-xl border-l-4 bg-slate-800/80 border border-slate-700/50 cursor-pointer transition-all active:scale-[0.98]',
        typeColors[stop.type] || 'border-l-slate-500',
        isActive && 'ring-1 ring-brand-500/50 bg-slate-800'
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              stop.status === 'confirmed' ? 'bg-emerald-600 text-white' :
              stop.status === 'completed' ? 'bg-slate-600 text-slate-300' :
              'bg-slate-700 text-slate-400'
            )}>
              {stop.order}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">{stop.lead.name}</span>
                {stop.lead.isStorm && <CloudIcon className="h-3.5 w-3.5 text-purple-400" />}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{stop.time} · {stop.duration} min · {stop.lead.city}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-slate-500 capitalize">{stop.type.replace('-', ' ')}</span>
            <span className={clsx('badge text-[10px]',
              stop.status === 'confirmed' ? 'badge-green' : stop.status === 'completed' ? 'badge-slate' : 'badge-blue'
            )}>
              {stop.status}
            </span>
          </div>
        </div>

        {isActive && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-slate-700/40">
            {stop.notes && <p className="text-xs text-slate-400 mb-4 leading-relaxed">{stop.notes}</p>}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${stop.lead.phone}`}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors"
              >
                <PhoneIcon className="h-4 w-4" /> Call
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.lead.address}, ${stop.lead.city}, LA ${stop.lead.zip}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium active:bg-brand-700 transition-colors"
              >
                <MapPinIcon className="h-4 w-4" /> Navigate
              </a>
              <a
                href={`sms:${stop.lead.phone}`}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors"
              >
                <ChatBubbleLeftIcon className="h-4 w-4" /> Text
              </a>
              <Link
                to={`/leads/${stop.lead.id}`}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors"
              >
                <ListBulletIcon className="h-4 w-4" /> Lead
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Camera Capture ───────────────────────────────────────────
function CaptureTab({ enqueue }: { enqueue: (type: any, payload: any) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captures, setCaptures] = useState<Array<{ id: string; url: string; label: string; uploaded: boolean }>>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowLabelModal(true);
    if (e.target) e.target.value = '';
  };

  const confirmCapture = async () => {
    if (!pendingFile) return;
    const url = URL.createObjectURL(pendingFile);
    const id = `photo-${Date.now()}`;

    setCaptures((prev) => [...prev, { id, url, label: selectedLabel || 'Unlabeled', uploaded: false }]);
    setShowLabelModal(false);
    setPendingFile(null);
    setSelectedLabel('');

    // Queue upload
    await enqueue('PHOTO_UPLOAD', {
      filename: pendingFile.name,
      label: selectedLabel,
      size: pendingFile.size,
      mimeType: pendingFile.type,
    });

    toast.success(navigator.onLine ? 'Photo queued for upload' : 'Photo saved — will upload when online');

    // Mark as uploaded after delay (in prod: after actual upload confirm)
    setTimeout(() => {
      setCaptures((prev) => prev.map((c) => c.id === id ? { ...c, uploaded: true } : c));
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Camera trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-brand-500/40 bg-brand-500/5 active:bg-brand-500/10 transition-colors"
      >
        <div className="w-14 h-14 rounded-full bg-brand-600/20 flex items-center justify-center">
          <CameraIcon className="h-7 w-7 text-brand-400" />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">Take Photo</div>
          <div className="text-xs text-slate-500 mt-0.5">Tap to open camera · Photos label automatically</div>
        </div>
      </button>

      {/* AI notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-xs text-slate-500">
        <BoltIcon className="h-4 w-4 text-brand-400 flex-shrink-0" />
        <span>AI will analyze photos for window type and condition. All estimates require onsite verification before ordering.</span>
      </div>

      {/* Photo grid */}
      {captures.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Captured ({captures.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {captures.map((cap) => (
              <div key={cap.id} className="relative rounded-xl overflow-hidden aspect-square bg-slate-800">
                <img src={cap.url} alt={cap.label} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <div className="text-[11px] text-white font-medium truncate">{cap.label}</div>
                </div>
                <div className={clsx(
                  'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center',
                  cap.uploaded ? 'bg-emerald-500' : 'bg-amber-500'
                )}>
                  {cap.uploaded
                    ? <CheckCircleIcon className="h-3.5 w-3.5 text-white" />
                    : <CloudArrowUpIcon className="h-3.5 w-3.5 text-white" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Label Modal */}
      <AnimatePresence>
        {showLabelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end"
            onClick={() => setShowLabelModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-slate-900 rounded-t-2xl p-6 pb-10 border-t border-slate-700"
            >
              <div className="text-base font-semibold text-white mb-4">Label this photo</div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[...OPENING_TEMPLATES.map((o) => o.label), 'Exterior - Front', 'Exterior - Side', 'Damage', 'Other'].map((label) => (
                  <button
                    key={label}
                    onClick={() => setSelectedLabel(label)}
                    className={clsx(
                      'py-2.5 px-3 rounded-xl text-sm text-left transition-colors',
                      selectedLabel === label ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
                placeholder="Or type a custom label..."
                className="input mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowLabelModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={confirmCapture} className="btn-primary flex-1">Save Photo</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Guided Measurement Tool ──────────────────────────────────
function MeasureTab({ enqueue }: { enqueue: (type: any, payload: any) => void }) {
  const [step, setStep] = useState<MeasureStep>('select-opening');
  const [selectedOpening, setSelectedOpening] = useState<typeof OPENING_TEMPLATES[0] | null>(null);
  const [widthInt, setWidthInt] = useState('');
  const [widthFrac, setWidthFrac] = useState('0');
  const [heightInt, setHeightInt] = useState('');
  const [heightFrac, setHeightFrac] = useState('0');
  const [saved, setSaved] = useState<Array<{ label: string; width: string; height: string }>>([]);

  const fractions = ['0', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];

  const fracToDecimal = (f: string) => {
    if (f === '0') return 0;
    const [n, d] = f.split('/').map(Number);
    return n / d;
  };

  const finalWidth = parseFloat(widthInt || '0') + fracToDecimal(widthFrac);
  const finalHeight = parseFloat(heightInt || '0') + fracToDecimal(heightFrac);

  const handleSave = async () => {
    if (!selectedOpening) return;

    const label = `${finalWidth.toFixed(3)}" W × ${finalHeight.toFixed(3)}" H`;
    setSaved((prev) => [...prev, { label: selectedOpening.label, width: finalWidth.toFixed(3), height: finalHeight.toFixed(3) }]);

    await enqueue('MEASUREMENT_SAVE', {
      openingId: selectedOpening.id,
      roomLabel: selectedOpening.label,
      finalWidth,
      finalHeight,
      status: 'REVIEWED',
      isAiEstimated: false,
      measurementMethod: 'FIELD_TAPE',
      notes: 'Measured by field tech in MobileFieldApp',
    });

    toast.success(`Saved: ${selectedOpening.label} — ${label}`);
    setStep('select-opening');
    setSelectedOpening(null);
    setWidthInt(''); setWidthFrac('0');
    setHeightInt(''); setHeightFrac('0');
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* Step 1 — Select opening */}
        {step === 'select-opening' && (
          <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Opening to Measure</div>
            {OPENING_TEMPLATES.map((o) => {
              const isSaved = saved.find((s) => s.label === o.label);
              return (
                <button
                  key={o.id}
                  onClick={() => { setSelectedOpening(o); setStep('enter-width'); }}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-slate-700/50 active:bg-slate-700 transition-colors"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">{o.label}</div>
                    <div className="text-xs text-slate-500">{o.floor} · {o.type}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaved && (
                      <div className="text-[10px] text-emerald-400 font-mono">{isSaved.width}" × {isSaved.height}"</div>
                    )}
                    {isSaved
                      ? <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                      : <ChevronRightIcon className="h-4 w-4 text-slate-600" />
                    }
                  </div>
                </button>
              );
            })}

            {saved.length > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs font-semibold text-emerald-400">{saved.length}/{OPENING_TEMPLATES.length} measurements saved</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">
                  {navigator.onLine ? 'Synced to server' : 'Saved locally — will sync when online'}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2 — Width */}
        {step === 'enter-width' && selectedOpening && (
          <motion.div key="width" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('select-opening')} className="btn-icon btn-ghost">
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="text-sm font-semibold text-white">{selectedOpening.label}</div>
                <div className="text-xs text-slate-500">Step 1 of 2 — Width (inches)</div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700/50">
              <div className="text-5xl font-bold text-white font-mono mb-2">
                {widthInt || '0'}<span className="text-slate-500 text-2xl">-{widthFrac}"</span>
              </div>
              <div className="text-xs text-slate-500">Width (W)</div>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-2">Whole inches</div>
              <div className="grid grid-cols-5 gap-2">
                {['28','29','30','31','32','33','34','35','36','48'].map((n) => (
                  <button key={n} onClick={() => setWidthInt(n)}
                    className={clsx('py-3 rounded-xl text-sm font-mono font-semibold transition-colors',
                      widthInt === n ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>
                    {n}
                  </button>
                ))}
              </div>
              <input value={widthInt} onChange={(e) => setWidthInt(e.target.value)} type="number" placeholder="Custom..." className="input mt-2 text-center font-mono" />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-2">Fraction</div>
              <div className="grid grid-cols-4 gap-2">
                {fractions.map((f) => (
                  <button key={f} onClick={() => setWidthFrac(f)}
                    className={clsx('py-3 rounded-xl text-sm font-mono font-semibold transition-colors',
                      widthFrac === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>
                    {f === '0' ? '0' : f}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('enter-height')}
              disabled={!widthInt}
              className="btn-primary w-full"
            >
              Next — Enter Height →
            </button>
          </motion.div>
        )}

        {/* Step 3 — Height */}
        {step === 'enter-height' && selectedOpening && (
          <motion.div key="height" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('enter-width')} className="btn-icon btn-ghost">
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="text-sm font-semibold text-white">{selectedOpening.label}</div>
                <div className="text-xs text-slate-500">Step 2 of 2 — Height (inches)</div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700/50">
              <div className="text-3xl font-bold text-slate-500 font-mono mb-1">{widthInt}-{widthFrac}"</div>
              <div className="text-5xl font-bold text-white font-mono mb-2">
                {heightInt || '0'}<span className="text-slate-500 text-2xl">-{heightFrac}"</span>
              </div>
              <div className="text-xs text-slate-500">Width × Height</div>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-2">Whole inches</div>
              <div className="grid grid-cols-5 gap-2">
                {['36','42','48','54','60','66','72','78','84','96'].map((n) => (
                  <button key={n} onClick={() => setHeightInt(n)}
                    className={clsx('py-3 rounded-xl text-sm font-mono font-semibold transition-colors',
                      heightInt === n ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>
                    {n}
                  </button>
                ))}
              </div>
              <input value={heightInt} onChange={(e) => setHeightInt(e.target.value)} type="number" placeholder="Custom..." className="input mt-2 text-center font-mono" />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-2">Fraction</div>
              <div className="grid grid-cols-4 gap-2">
                {fractions.map((f) => (
                  <button key={f} onClick={() => setHeightFrac(f)}
                    className={clsx('py-3 rounded-xl text-sm font-mono font-semibold transition-colors',
                      heightFrac === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>
                    {f === '0' ? '0' : f}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('confirm')}
              disabled={!heightInt}
              className="btn-primary w-full"
            >
              Review & Save →
            </button>
          </motion.div>
        )}

        {/* Step 4 — Confirm */}
        {step === 'confirm' && selectedOpening && (
          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('enter-height')} className="btn-icon btn-ghost">
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div className="text-sm font-semibold text-white">Confirm Measurement</div>
            </div>

            <div className="card p-6 text-center bg-slate-800/80">
              <div className="text-xs text-slate-500 mb-4 uppercase tracking-wide">{selectedOpening.label}</div>
              <div className="text-4xl font-bold text-white font-mono">
                {finalWidth.toFixed(3)}"
              </div>
              <div className="text-slate-600 my-2">×</div>
              <div className="text-4xl font-bold text-white font-mono">
                {finalHeight.toFixed(3)}"
              </div>
              <div className="text-xs text-slate-500 mt-4">Width × Height · Field Measurement</div>
            </div>

            {/* AI disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 text-xs text-slate-500">
              <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
              <span>This measurement will be saved as <strong className="text-amber-400">REVIEWED</strong> — not yet approved for order. A manager must approve before placing any window order.</span>
            </div>

            <button onClick={handleSave} className="btn-primary w-full">
              <CheckCircleIcon className="h-5 w-5" />
              Save Measurement
            </button>

            <button onClick={() => { setStep('enter-width'); }} className="btn-secondary w-full">
              Re-measure
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────
function NotesTab({ enqueue }: { enqueue: (type: any, payload: any) => void }) {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState<Array<{ text: string; time: string }>>([]);

  const saveNote = async () => {
    if (!note.trim()) return;
    setIsSaving(true);
    await enqueue('NOTE_CREATE', {
      leadId: TODAY_STOPS[0]?.lead.id,
      content: note,
      source: 'MOBILE_FIELD_APP',
    });
    setSaved((prev) => [{ text: note, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }, ...prev]);
    setNote('');
    setIsSaving(false);
    toast.success('Note saved');
  };

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Notes</div>

      <div className="relative">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Type a field note, objection, or observation..."
          className="textarea min-h-[120px] pr-12"
          rows={4}
        />
        <button
          onClick={saveNote}
          disabled={!note.trim() || isSaving}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center disabled:opacity-50 active:bg-brand-700 transition-colors"
        >
          <CloudArrowUpIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Quick note templates */}
      <div>
        <div className="text-xs text-slate-600 mb-2">Quick templates</div>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            'Both homeowners present — full decision-maker access',
            'Only one homeowner present — follow up with spouse',
            'Homeowner requested callback in X days',
            'Quoted X windows — both liked Series 4000',
            'Price objection — financing discussed',
            'Competitor quote mentioned — need to follow up',
            'Dogs on property — gate code: ___',
          ].map((template) => (
            <button
              key={template}
              onClick={() => setNote(template)}
              className="text-left text-xs text-slate-400 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-colors"
            >
              {template}
            </button>
          ))}
        </div>
      </div>

      {/* Saved notes */}
      {saved.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saved this session</div>
          {saved.map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/30">
              <p className="text-sm text-slate-300">{s.text}</p>
              <div className="text-[10px] text-slate-600 mt-1">{s.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function MobileFieldApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FieldTab>('route');
  const [activeStop, setActiveStop] = useState<string | null>(null);
  const { enqueue, pendingCount, isSyncing, syncNow, isOnline, failedCount } = useOfflineQueue();
  const stormMode = useAppStore((s) => s.stormModeActive);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const TABS: Array<{ key: FieldTab; icon: any; label: string }> = [
    { key: 'route', icon: MapPinIcon, label: 'Route' },
    { key: 'capture', icon: CameraIcon, label: 'Camera' },
    { key: 'measure', icon: ClipboardDocumentListIcon, label: 'Measure' },
    { key: 'notes', icon: PencilIcon, label: 'Notes' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto relative">
      {/* Status bar area */}
      <div className="flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link to="/dashboard" className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black text-sm">
              WW
            </Link>
            <div>
              <div className="text-xs font-semibold text-white">Field Mode</div>
              <div className="text-[10px] text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync status */}
            <button
              onClick={() => syncNow()}
              className={clsx(
                'flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg transition-colors',
                pendingCount > 0
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                  : isOnline
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-red-500/15 text-red-400 border border-red-500/25'
              )}
            >
              {isSyncing
                ? <ArrowPathIcon className="h-3 w-3 animate-spin" />
                : isOnline
                  ? <WifiIcon className="h-3 w-3" />
                  : <XMarkIcon className="h-3 w-3" />
              }
              {pendingCount > 0 ? `${pendingCount} pending` : isOnline ? 'Synced' : 'Offline'}
            </button>

            {stormMode && (
              <div className="badge-storm text-[10px]">
                <CloudIcon className="h-3 w-3" />
                Storm
              </div>
            )}
          </div>
        </div>

        {/* Offline banner */}
        <OfflineBanner pendingCount={pendingCount} isSyncing={isSyncing} syncNow={syncNow} isOnline={isOnline} />

        {/* Daily greeting bar */}
        {activeTab === 'route' && (
          <div className="px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-brand-950/30">
            <div className="text-sm font-semibold text-white">{greeting} — {TODAY_STOPS.length} stops today</div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>~42 mi estimated</span>
              <span>·</span>
              <span>
                {TODAY_STOPS.filter((s) => s.status === 'confirmed').length} confirmed
              </span>
              {failedCount > 0 && (
                <span className="text-red-400 ml-auto">{failedCount} sync error{failedCount > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content area — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'route' && (
                <div className="space-y-3">
                  {TODAY_STOPS.map((stop) => (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      isActive={activeStop === stop.id}
                      onSelect={(s: any) => setActiveStop(activeStop === s.id ? null : s.id)}
                    />
                  ))}

                  {TODAY_STOPS.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                      <MapPinIcon className="h-10 w-10 mb-3" />
                      <p className="text-sm">No stops scheduled today</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'capture' && <CaptureTab enqueue={enqueue} />}
              {activeTab === 'measure' && <MeasureTab enqueue={enqueue} />}
              {activeTab === 'notes' && <NotesTab enqueue={enqueue} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav — fixed */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 flex-shrink-0">
        <div className="flex">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors',
                activeTab === key ? 'text-brand-400' : 'text-slate-600 active:text-slate-400'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {key === 'route' && pendingCount > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          ))}
        </div>
        {/* iPhone safe area padding */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}
