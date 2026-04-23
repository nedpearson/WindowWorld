import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  PhoneIcon, MapPinIcon, CameraIcon, PencilIcon,
  CloudArrowUpIcon, CheckCircleIcon, ExclamationCircleIcon,
  ArrowPathIcon, ChevronRightIcon, ChevronLeftIcon,
  WifiIcon, XMarkIcon, MicrophoneIcon, ListBulletIcon,
  ClipboardDocumentListIcon, ChatBubbleLeftIcon,
  ArrowDownTrayIcon, BellAlertIcon, SignalSlashIcon,
  QrCodeIcon, DevicePhoneMobileIcon, ShareIcon, ArrowTopRightOnSquareIcon,
  SparklesIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { BoltIcon, CloudIcon, SignalIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { QRCodeSVG } from 'qrcode.react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useAuthStore, useAppStore } from '../../store/auth.store';
import { usePWA } from '../../hooks/usePWA';
import { useVoiceNote } from '../../hooks/useVoiceNote';
import { haptic } from '../../utils/haptics';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { MapTab } from './tabs/MapTab';
import { PitchTab } from './tabs/PitchTab';
import { RouteTab } from './tabs/RouteTab';
import { NotesTab } from './tabs/NotesTab';
import { DesktopInstallPortal } from './DesktopInstallPortal';

// ─── Types ────────────────────────────────────────────────────
type FieldTab = 'map' | 'route' | 'capture' | 'measure' | 'pitch' | 'notes';
type MeasureStep = 'select-opening' | 'enter-width' | 'enter-height' | 'confirm';

// Normalise a raw appointment from the route API into the stop shape used by StopCard
function toStop(apt: any, order: number) {
  const lead = apt.lead || {};
  return {
    id: apt.id,
    order,
    status: (apt.status || 'scheduled').toLowerCase(),
    type: (apt.type || 'initial-consult').toLowerCase().replace(/_/g, '-'),
    lead: {
      id: lead.id,
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      phone: lead.phone || '',
      address: lead.address || '',
      city: lead.city || '',
      zip: lead.zip || '',
      score: lead.leadScore ?? 0,
      isStorm: lead.isStormLead ?? false },
    time: apt.scheduledAt
      ? new Date(apt.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '',
    duration: apt.duration || 60,
    notes: apt.notes || '',
    // keep the raw inspection list so MeasureTab can load openings
    inspections: apt.inspections || [] };
}

// Normalise an opening from the API for the MeasureTab list
function toOpeningTemplate(o: any) {
  return {
    id: o.id,
    label: o.roomLabel || o.openingId || 'Opening',
    floor: `Floor ${o.floorLevel ?? 1}`,
    type: (o.windowType || 'UNKNOWN').replace(/_/g, ' ') };
}

// ─── PWA Install Banner ───────────────────────────────────────
function InstallBanner({ onInstall, onDismiss, isIOS }: { onInstall: () => void; onDismiss: () => void; isIOS: boolean }) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="flex items-center gap-3 px-4 py-3 bg-brand-600/95 backdrop-blur-sm border-b border-brand-500/30 z-50"
    >
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <ArrowDownTrayIcon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white">Install WindowWorld</div>
        <div className="text-[10px] text-brand-200 leading-snug">
          {isIOS ? 'Tap Share → Add to Home Screen' : 'Add to home screen for offline access'}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isIOS && (
          <button
            onClick={() => { haptic.tap(); onInstall(); }}
            className="text-xs font-semibold text-white bg-white/20 px-3 py-1.5 rounded-lg active:bg-white/30 transition-colors"
          >
            Install
          </button>
        )}
        <button onClick={() => { haptic.tap(); onDismiss(); }} className="text-brand-200 active:text-white">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Update Banner ────────────────────────────────────────────
function UpdateBanner() {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/95 backdrop-blur-sm border-b border-amber-400/30"
    >
      <BellAlertIcon className="h-4 w-4 text-amber-900 flex-shrink-0" />
      <div className="flex-1 text-xs font-medium text-amber-900">
        Update available — reload for latest features
      </div>
      <button
        onClick={() => { haptic.tap(); window.location.reload(); }}
        className="text-[11px] font-bold text-amber-900 bg-amber-900/15 px-3 py-1.5 rounded-lg active:bg-amber-900/25"
      >
        Reload
      </button>
    </motion.div>
  );
}

// ─── Offline Banner ───────────────────────────────────────────
function OfflineBanner({ pendingCount, isSyncing, syncNow, isOnline }: any) {
  if (isOnline && pendingCount === 0) return null;
  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 text-xs font-medium overflow-hidden',
        isOnline
          ? 'bg-amber-500/15 text-amber-300 border-b border-amber-500/20'
          : 'bg-red-500/15 text-red-300 border-b border-red-500/20'
      )}
    >
      {isOnline
        ? <><SignalIcon className="h-3.5 w-3.5 flex-shrink-0" />{pendingCount} action{pendingCount > 1 ? 's' : ''} queued for sync
          <button onClick={() => { haptic.tap(); syncNow(); }} className="ml-auto underline font-semibold">Sync now</button>
        </>
        : <><SignalSlashIcon className="h-3.5 w-3.5 flex-shrink-0" />Offline mode — changes saved locally
          <span className="ml-auto">{pendingCount} queued</span>
        </>
      }
    </motion.div>
  );
}

// ─── Stop Card ────────────────────────────────────────────────
function StopCard({ stop, isActive, onSelect }: any) {
  const typeColors: Record<string, string> = {
    'initial-consult': 'border-l-blue-500',
    'measurement': 'border-l-cyan-500',
    'close': 'border-l-emerald-500',
    'follow-up': 'border-l-amber-500' };

  return (
    <motion.div
      layout
      onClick={() => { haptic.selection(); onSelect(stop); }}
      className={clsx(
        'rounded-xl border-l-4 bg-slate-800/80 border border-slate-700/50 cursor-pointer transition-all active:scale-[0.98] active:bg-slate-800',
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
              <div className="text-xs text-slate-500 mt-0.5">{stop.time} · {stop.duration}min · {stop.lead.city}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-slate-500 capitalize">{stop.type.replace('-', ' ')}</span>
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium',
              stop.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' :
              stop.status === 'completed' ? 'bg-slate-700 text-slate-400' :
              'bg-blue-500/15 text-blue-400'
            )}>
              {stop.status}
            </span>
          </div>
        </div>

        <AnimatePresence>
          {isActive && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 pt-4 border-t border-slate-700/40 overflow-hidden">
              {stop.notes && <p className="text-xs text-slate-400 mb-4 leading-relaxed">{stop.notes}</p>}
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${stop.lead.phone}`} onClick={() => haptic.tap()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors">
                  <PhoneIcon className="h-4 w-4" /> Call
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.lead.address}, ${stop.lead.city}, LA ${stop.lead.zip}`)}`}
                  target="_blank" rel="noopener noreferrer" onClick={() => haptic.tap()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium active:bg-brand-700 transition-colors">
                  <MapPinIcon className="h-4 w-4" /> Navigate
                </a>
                <a href={`sms:${stop.lead.phone}`} onClick={() => haptic.tap()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors">
                  <ChatBubbleLeftIcon className="h-4 w-4" /> Text
                </a>
                <Link to={`/leads/${stop.lead.id}`} onClick={() => haptic.tap()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors">
                  <ListBulletIcon className="h-4 w-4" /> Lead File
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Room labels (self-contained — no external variable reference) ─
const ROOM_LABELS = [
  'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Kitchen', 'Bathroom', 'Dining Room', 'Office / Study',
  'Exterior – Front', 'Exterior – Back', 'Exterior – Side', 'Garage',
  'Damage / Defect', 'Frame Close-Up', 'Other',
];

// ─── Camera Capture ───────────────────────────────────────────
function CaptureTab({ enqueue }: { enqueue: (type: any, payload: any) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captures, setCaptures] = useState<Array<{
    id: string; url: string; label: string;
    status: 'pending' | 'uploading' | 'done' | 'error';
    aiResult?: string;
  }>>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    haptic.tap();
    setPendingFile(file);
    setSelectedLabel('');
    setShowLabelModal(true);
    if (e.target) e.target.value = '';
  };

  const confirmCapture = async () => {
    if (!pendingFile) return;
    haptic.impact();

    const blobUrl = URL.createObjectURL(pendingFile);
    const id = `photo-${Date.now()}`;
    const label = selectedLabel || 'Unlabeled';

    setCaptures(prev => [...prev, { id, url: blobUrl, label, status: 'uploading' }]);
    setShowLabelModal(false);
    setPendingFile(null);
    setSelectedLabel('');
    setIsUploading(true);

    try {
      if (navigator.onLine) {
        // Real upload to server
        const fd = new FormData();
        fd.append('file', pendingFile, pendingFile.name);
        fd.append('label', label);
        fd.append('type', 'PHOTO_EXTERIOR');          // required by server
        fd.append('triggerAiAnalysis', 'true');        // auto-queue AI analysis
        fd.append('notes', `Field capture — ${label}`);

        const uploadRes = await apiClient.documents.upload(fd) as any;
        const docId = uploadRes?.data?.id;

        let aiSummary = '';
        if (docId) {
          try {
            const aiRes = await apiClient.documents.analyzeWindow(docId) as any;
            aiSummary = aiRes?.data?.summary ?? aiRes?.summary ?? '';
          } catch { /* AI analysis is best-effort */ }
        }

        setCaptures(prev => prev.map(c =>
          c.id === id ? { ...c, status: 'done', aiResult: aiSummary } : c
        ));
        haptic.success();
        toast.success(aiSummary ? `Uploaded · AI: ${aiSummary.slice(0, 60)}…` : 'Photo uploaded ✓');
      } else {
        // Offline — queue it
        await enqueue('PHOTO_UPLOAD', { filename: pendingFile.name, label, size: pendingFile.size, mimeType: pendingFile.type });
        setCaptures(prev => prev.map(c => c.id === id ? { ...c, status: 'done' } : c));
        haptic.success();
        toast.success('Photo saved — uploads when back online');
      }
    } catch (err) {
      console.error('[CaptureTab] upload error:', err);
      setCaptures(prev => prev.map(c => c.id === id ? { ...c, status: 'error' } : c));
      // Fallback: push to offline queue so it retries
      await enqueue('PHOTO_UPLOAD', { filename: pendingFile?.name ?? 'photo.jpg', label, size: pendingFile?.size ?? 0, mimeType: pendingFile?.type ?? 'image/jpeg' });
      toast.error('Upload failed — saved to retry queue');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />

      {/* Camera button */}
      <button
        onClick={() => { haptic.tap(); fileInputRef.current?.click(); }}
        disabled={isUploading}
        className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-brand-500/40 bg-brand-500/5 active:bg-brand-500/10 disabled:opacity-50 transition-colors"
      >
        <div className="w-14 h-14 rounded-full bg-brand-600/20 flex items-center justify-center">
          {isUploading
            ? <div className="w-7 h-7 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
            : <CameraIcon className="h-7 w-7 text-brand-400" />
          }
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">{isUploading ? 'Uploading…' : 'Take Photo'}</div>
          <div className="text-xs text-slate-500 mt-0.5">Opens rear camera · AI analysis on upload</div>
        </div>
      </button>

      {/* AI note */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-xs text-slate-500">
        <BoltIcon className="h-4 w-4 text-brand-400 flex-shrink-0" />
        <span>AI will analyze photos for window type and condition. All estimates require field verification before ordering.</span>
      </div>

      {/* Photo grid */}
      {captures.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Session ({captures.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {captures.map((cap) => (
              <div key={cap.id} className="relative rounded-xl overflow-hidden aspect-square bg-slate-800">
                {cap.url.startsWith('blob:') && (
                  <img src={cap.url} alt={String(cap.label).replace(/[<>"'&]/g, '')} className="w-full h-full object-cover" />
                )}
                {/* Label strip */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <div className="text-[11px] text-white font-medium truncate">{cap.label}</div>
                  {cap.aiResult && (
                    <div className="text-[10px] text-brand-300 truncate mt-0.5">{cap.aiResult}</div>
                  )}
                </div>
                {/* Status badge */}
                <div className={clsx(
                  'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow',
                  cap.status === 'done'      ? 'bg-emerald-500' :
                  cap.status === 'uploading' ? 'bg-brand-500' :
                  cap.status === 'error'     ? 'bg-red-500' :
                  'bg-amber-500'
                )}>
                  {cap.status === 'uploading'
                    ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    : cap.status === 'done'
                    ? <CheckCircleIcon className="h-3.5 w-3.5 text-white" />
                    : cap.status === 'error'
                    ? <ExclamationCircleIcon className="h-3.5 w-3.5 text-white" />
                    : <CloudArrowUpIcon className="h-3.5 w-3.5 text-white" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Label modal */}
      <AnimatePresence>
        {showLabelModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end"
            onClick={() => setShowLabelModal(false)}
          >
            <motion.div
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-slate-900 rounded-t-2xl p-6 border-t border-slate-700"
              style={{ paddingBottom: 'calc(1.5rem + var(--sab, 0px))' }}
            >
              <div className="text-base font-semibold text-white mb-4">Where is this window?</div>
              <div className="grid grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto">
                {ROOM_LABELS.map((label) => (
                  <button key={label}
                    onClick={() => { haptic.selection(); setSelectedLabel(label); }}
                    className={clsx('py-2.5 px-3 rounded-xl text-sm text-left transition-colors',
                      selectedLabel === label ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>
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
                <button onClick={() => { haptic.tap(); setShowLabelModal(false); setPendingFile(null); }} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={confirmCapture} className="btn-primary flex-1">
                  Save &amp; Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Guided Measurement Tool ──────────────────────────────────
function MeasureTab({
  enqueue, stops, activeStopId
}: {
  enqueue: (type: any, payload: any) => void;
  stops: any[];
  activeStopId: string | null;
}) {
  const activeStop = stops.find((s) => s.id === activeStopId);
  const inspectionId: string | null = activeStop?.inspections?.[0]?.id ?? null;

  // Load real openings from the API for the active stop's inspection
  const { data: openingsResp, isLoading: openingsLoading } = useQuery({
    queryKey: ['field-openings', inspectionId],
    queryFn: () => apiClient.openings.listByInspection(inspectionId!),
    enabled: !!inspectionId,
    staleTime: 2 * 60 * 1000 });
  const OPENING_TEMPLATES = ((openingsResp as any)?.data ?? []).map(toOpeningTemplate);

  const [step, setStep] = useState<MeasureStep>('select-opening');
  const [selectedOpening, setSelectedOpening] = useState<{ id: string; label: string; floor: string; type: string } | null>(null);
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
    haptic.measureSaved();
    const dims = `${finalWidth.toFixed(3)}" W × ${finalHeight.toFixed(3)}" H`;
    setSaved((prev) => [...prev, { label: selectedOpening.label, width: finalWidth.toFixed(3), height: finalHeight.toFixed(3) }]);

    const payload = {
      openingId: selectedOpening.id,
      roomLabel: selectedOpening.label,
      finalWidth,
      finalHeight,
      status: 'REVIEWED',
      isAiEstimated: false,
      measurementMethod: 'FIELD_TAPE',
      notes: 'Field-measured via MobileFieldApp',
    };

    try {
      if (navigator.onLine) {
        // Direct API call — POST /api/v1/measurements
        await apiClient.measurements.create(payload);
        haptic.success();
        toast.success(`Saved: ${selectedOpening.label} — ${dims}`);
      } else {
        // Offline — queue for later sync
        await enqueue('MEASUREMENT_SAVE', payload);
        toast.success(`Saved locally: ${selectedOpening.label} — syncs when online`);
      }
    } catch (err: any) {
      console.error('[MeasureTab] save error:', err);
      // Fallback to queue on network error
      await enqueue('MEASUREMENT_SAVE', payload);
      toast.error('Saved to queue — will sync when connection is restored');
    }

    setStep('select-opening');
    setSelectedOpening(null);
    setWidthInt(''); setWidthFrac('0');
    setHeightInt(''); setHeightFrac('0');
  };

  const stepTo = (next: MeasureStep) => { haptic.tap(); setStep(next); };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">

        {step === 'select-opening' && (
          <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Opening to Measure</div>

            {/* No inspection selected — guide the rep */}
            {!inspectionId && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Select an appointment in the Route tab to load its inspection openings.
              </div>
            )}

            {/* Inspection selected but no openings yet */}
            {inspectionId && !openingsLoading && OPENING_TEMPLATES.length === 0 && (
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/30 text-xs text-slate-400">
                No openings found for this inspection. Ask your manager to create them first, or add them from the desktop Inspection page.
              </div>
            )}

            {openingsLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              </div>
            )}

            {OPENING_TEMPLATES.map((o) => {
              const isSaved = saved.find((s) => s.label === o.label);
              return (
                <button key={o.id} onClick={() => { haptic.selection(); setSelectedOpening(o); stepTo('enter-width'); }}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-slate-700/50 active:bg-slate-700 transition-colors">
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">{o.label}</div>
                    <div className="text-xs text-slate-500">{o.floor} · {o.type}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaved && <div className="text-[10px] text-emerald-400 font-mono">{isSaved.width}" × {isSaved.height}"</div>}
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
                <div className="text-xs font-semibold text-emerald-400">{saved.length}/{OPENING_TEMPLATES.length} measurements recorded</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">
                  {navigator.onLine ? 'Synced to server' : 'Saved locally — syncs when online'}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 'enter-width' && selectedOpening && (
          <motion.div key="width" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => stepTo('select-opening')} className="btn-icon btn-ghost"><ChevronLeftIcon className="h-5 w-5" /></button>
              <div>
                <div className="text-sm font-semibold text-white">{selectedOpening.label}</div>
                <div className="text-xs text-slate-500">Step 1 of 2 — Width (inches)</div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700/50">
              <div className="text-5xl font-bold text-white font-mono mb-1">
                {widthInt || '—'}<span className="text-slate-500 text-2xl">-{widthFrac}"</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Width (W)</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">Whole inches</div>
              <div className="grid grid-cols-5 gap-2">
                {['28','29','30','31','32','33','34','35','36','48'].map((n) => (
                  <button key={n} onClick={() => { haptic.selection(); setWidthInt(n); }}
                    className={clsx('py-3 rounded-xl text-sm font-mono font-semibold transition-colors',
                      widthInt === n ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>{n}</button>
                ))}
              </div>
              <input value={widthInt} onChange={(e) => setWidthInt(e.target.value)} type="number"
                placeholder="Custom..." className="input mt-2 text-center font-mono" />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">Fraction</div>
              <div className="grid grid-cols-4 gap-2">
                {fractions.map((f) => (
                  <button key={f} onClick={() => { haptic.selection(); setWidthFrac(f); }}
                    className={clsx('py-3 rounded-xl text-sm font-mono font-semibold transition-colors',
                      widthFrac === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>{f === '0' ? '0' : f}</button>
                ))}
              </div>
            </div>
            <button onClick={() => stepTo('enter-height')} disabled={!widthInt} className="btn-primary w-full">
              Next — Enter Height →
            </button>
          </motion.div>
        )}

        {step === 'enter-height' && selectedOpening && (
          <motion.div key="height" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => stepTo('enter-width')} className="btn-icon btn-ghost"><ChevronLeftIcon className="h-5 w-5" /></button>
              <div>
                <div className="text-sm font-semibold text-white">{selectedOpening.label}</div>
                <div className="text-xs text-slate-500">Step 2 of 2 — Height (inches)</div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700/50">
              <div className="text-3xl font-bold text-slate-600 font-mono mb-1">{widthInt}-{widthFrac}"</div>
              <div className="text-5xl font-bold text-white font-mono mb-1">
                {heightInt || '—'}<span className="text-slate-500 text-2xl">-{heightFrac}"</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Width × Height</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">Whole inches</div>
              <div className="grid grid-cols-5 gap-2">
                {['36','42','48','54','60','66','72','78','84','96'].map((n) => (
                  <button key={n} onClick={() => { haptic.selection(); setHeightInt(n); }}
                    className={clsx('py-3 rounded-xl text-sm font-mono font-semibold transition-colors',
                      heightInt === n ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>{n}</button>
                ))}
              </div>
              <input value={heightInt} onChange={(e) => setHeightInt(e.target.value)} type="number"
                placeholder="Custom..." className="input mt-2 text-center font-mono" />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">Fraction</div>
              <div className="grid grid-cols-4 gap-2">
                {fractions.map((f) => (
                  <button key={f} onClick={() => { haptic.selection(); setHeightFrac(f); }}
                    className={clsx('py-3 rounded-xl text-sm font-mono font-semibold transition-colors',
                      heightFrac === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                    )}>{f === '0' ? '0' : f}</button>
                ))}
              </div>
            </div>
            <button onClick={() => stepTo('confirm')} disabled={!heightInt} className="btn-primary w-full">
              Review & Save →
            </button>
          </motion.div>
        )}

        {step === 'confirm' && selectedOpening && (
          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => stepTo('enter-height')} className="btn-icon btn-ghost"><ChevronLeftIcon className="h-5 w-5" /></button>
              <div className="text-sm font-semibold text-white">Confirm Measurement</div>
            </div>
            <div className="card p-6 text-center bg-slate-800/80">
              <div className="text-xs text-slate-500 mb-4 uppercase tracking-wide">{selectedOpening.label}</div>
              <div className="text-4xl font-bold text-white font-mono">{finalWidth.toFixed(3)}"</div>
              <div className="text-slate-600 my-2 text-xl">×</div>
              <div className="text-4xl font-bold text-white font-mono">{finalHeight.toFixed(3)}"</div>
              <div className="text-xs text-slate-500 mt-4">Width × Height · Field Measurement</div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Saved as <strong>REVIEWED</strong> — manager approval required before placing any window order.</span>
            </div>
            <button onClick={handleSave} className="btn-primary w-full">
              <CheckCircleIcon className="h-5 w-5" /> Save Measurement
            </button>
            <button onClick={() => stepTo('enter-width')} className="btn-secondary w-full">Re-measure</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ─── Desktop QR Panel ────────────────────────────────────────
function DesktopQRPanel({
  user, isOnline, pendingCount, isSyncing, stopCount, confirmedCount, refreshToken
}: {
  user: any; isOnline: boolean; pendingCount: number; isSyncing: boolean;
  stopCount: number; confirmedCount: number; refreshToken: string | null;
}) {
  const [tick, setTick] = useState(0);
  const [copied, setCopied] = useState(false);

  // Live clock — updates the QR link timestamp every 30s to show "live"
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Build the deep-link — embed refreshToken (long-lived) so the phone can
  // call POST /auth/refresh and get a fresh access token on arrival.
  const baseUrl = window.location.origin;
  const qrUrl = new URL('/field-install', baseUrl);
  if (user?.id)     qrUrl.searchParams.set('uid', user.id);
  if (refreshToken) qrUrl.searchParams.set('token', refreshToken);
  qrUrl.searchParams.set('ts', Math.floor(Date.now() / 30_000).toString()); // rotates every 30s
  const qrString = qrUrl.toString();

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [qrString]);

  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Field Rep';
  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'WW';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="hidden md:flex flex-col w-80 min-h-screen bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/60 p-6 gap-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-500/20">
          WW
        </div>
        <div>
          <div className="text-sm font-bold text-white">Field Mode</div>
          <div className="text-[10px] text-slate-500">Desktop Console</div>
        </div>
      </div>

      {/* Rep identity */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{userName}</div>
          <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
        </div>
        <div className={clsx(
          'ml-auto w-2 h-2 rounded-full flex-shrink-0',
          isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400'
        )} />
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Stops', value: stopCount, color: 'text-white' },
          { label: 'Confirmed', value: confirmedCount, color: 'text-emerald-400' },
          { label: 'Queued', value: pendingCount, color: pendingCount > 0 ? 'text-amber-400' : 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30">
            <span className={clsx('text-xl font-bold tabular-nums', color)}>{value}</span>
            <span className="text-[9px] text-slate-600 mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <QrCodeIcon className="h-3.5 w-3.5" />
          Scan to Open on iPhone
        </div>

        {/* QR canvas */}
        <motion.div
          key={tick} // re-renders on each 30s tick to show "live" update
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative p-4 rounded-2xl bg-white shadow-2xl shadow-black/40"
        >
          <QRCodeSVG
            value={qrString}
            size={180}
            level="M"
            includeMargin={false}
            imageSettings={{
              src: `${baseUrl}/icon-192x192.png`,
              height: 36,
              width: 36,
              excavate: true,
            }}
          />
          {/* Live pulse indicator */}
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
        </motion.div>

        {/* Link action */}
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={copyLink}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl font-semibold transition-all',
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-700 hover:text-white'
            )}
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* iPhone install instructions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <DevicePhoneMobileIcon className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Install on iPhone</span>
        </div>

        <div className="space-y-2">
          {[
            { step: '1', icon: '📱', text: 'Scan QR code with iPhone Camera app' },
            { step: '2', icon: '🌐', text: 'Tap the link to open in Safari' },
            { step: '3', icon: '⬆️', text: <>Tap the <strong className="text-white">Share</strong> icon <span className="inline-flex items-baseline"><ShareIcon className="h-3 w-3 inline relative top-0.5" /></span> at the bottom</> },
            { step: '4', icon: '➕', text: <><strong className="text-white">"Add to Home Screen"</strong> → Add</> },
          ].map(({ step, icon, text }) => (
            <div key={step} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <div className="w-5 h-5 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-brand-400">{step}</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                <span className="mr-1.5">{icon}</span>{text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-500/8 border border-brand-500/20">
          <BoltIcon className="h-3.5 w-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-brand-300 leading-relaxed">
            QR code is linked to <strong>{userName}'s</strong> account. Scanning opens the app pre-authenticated — no login required.
          </p>
        </div>
      </div>

      {/* Sync status footer */}
      <div className="mt-auto flex items-center gap-2 text-[10px] text-slate-600">
        {isSyncing
          ? <><ArrowPathIcon className="h-3 w-3 animate-spin text-brand-400" /><span className="text-brand-400">Syncing…</span></>
          : isOnline
          ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span>Live • updates every 30s</span></>
          : <><div className="w-1.5 h-1.5 rounded-full bg-red-400" /><span>Offline</span></>
        }
        <span className="ml-auto">{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function MobileFieldApp() {
  const _navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FieldTab>('route');
  const [activeStop, setActiveStop] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const { enqueue, pendingCount, isSyncing, syncNow, isOnline, failedCount } = useOfflineQueue();
  const stormMode = useAppStore((s) => s.stormModeActive);
  const { isInstallable, isInstalled, isUpdateAvailable, isIOS, install, dismissInstall } = usePWA();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ─── Real today's route from the server ──────────
  const { data: routeData, isLoading: routeLoading, refetch: refetchRoute } = useQuery({
    queryKey: ['field-today-route'],
    queryFn: () => apiClient.appointments.todayRoute(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true });

  const rawRoute = (routeData as any)?.data;
  const TODAY_STOPS = (rawRoute?.appointments ?? []).map((apt: any, idx: number) => toStop(apt, idx + 1));
  const estimatedMiles = rawRoute?.estimatedMiles ?? 0;
  const confirmedCount = TODAY_STOPS.filter((s: any) => s.status === 'confirmed').length;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const TABS: Array<{ key: FieldTab; icon: any; label: string }> = [
    { key: 'map',     icon: GlobeAltIcon,              label: 'Map' },
    { key: 'route',   icon: MapPinIcon,                label: 'Route' },
    { key: 'capture', icon: CameraIcon,                label: 'Camera' },
    { key: 'measure', icon: ClipboardDocumentListIcon, label: 'Measure' },
    { key: 'pitch',   icon: SparklesIcon,              label: 'Pitch' },
    { key: 'notes',   icon: PencilIcon,                label: 'Notes' },
  ];

  const handleTabChange = (tab: FieldTab) => {
    haptic.selection();
    setActiveTab(tab);
  };

  // ─── Desktop: show QR install portal ───────────────
  if (isDesktop) {
    return (
      <DesktopInstallPortal
        user={user}
        refreshToken={refreshToken}
        isOnline={isOnline}
        stopCount={TODAY_STOPS.length}
        confirmedCount={confirmedCount}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-row">

      {/* ── Mobile app shell — centered, max-w-md ── */}
      <div
        className="flex-1 flex flex-col md:max-w-md md:border-x md:border-slate-800/50 relative mx-auto"
        style={{ paddingTop: 'var(--sat, 0px)' }}
      >
      {/* Banners */}
      <AnimatePresence>
        {isUpdateAvailable && <UpdateBanner key="update" />}
        {!isInstalled && (isInstallable || isIOS) && (
          <InstallBanner key="install" isIOS={isIOS} onInstall={install} onDismiss={dismissInstall} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex-shrink-0">
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
            <button
              onClick={() => { haptic.tap(); syncNow(); }}
              className={clsx(
                'flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg transition-colors',
                isSyncing ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25' :
                pendingCount > 0 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25' :
                isOnline ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                'bg-red-500/15 text-red-400 border border-red-500/25'
              )}
            >
              {isSyncing
                ? <ArrowPathIcon className="h-3 w-3 animate-spin" />
                : isOnline ? <WifiIcon className="h-3 w-3" /> : <XMarkIcon className="h-3 w-3" />
              }
              {isSyncing ? 'Syncing...' : pendingCount > 0 ? `${pendingCount} pending` : isOnline ? 'Synced' : 'Offline'}
            </button>

            {stormMode && (
              <div className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25">
                <CloudIcon className="h-3 w-3" /> Storm
              </div>
            )}

            {/* Quick link back to full desktop platform */}
            <Link
              to="/dashboard"
              className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-colors"
              title="Open desktop dashboard"
            >
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Desktop</span>
            </Link>
          </div>
        </div>

        <OfflineBanner pendingCount={pendingCount} isSyncing={isSyncing} syncNow={syncNow} isOnline={isOnline} />

        {activeTab === 'route' && (
          <div className="px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-brand-950/20">
            <div className="text-sm font-semibold text-white">
              {routeLoading ? 'Loading your route…' : `${greeting} — ${TODAY_STOPS.length} stop${TODAY_STOPS.length !== 1 ? 's' : ''} today`}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              {estimatedMiles > 0 && <span>~{estimatedMiles} mi estimated</span>}
              {estimatedMiles > 0 && <span>·</span>}
              <span>{confirmedCount} confirmed</span>
              {failedCount > 0 && (
                <span className="text-red-400 ml-auto flex items-center gap-1">
                  <ExclamationCircleIcon className="h-3 w-3" />
                  {failedCount} sync error{failedCount > 1 ? 's' : ''}
                </span>
              )}
              <button onClick={() => refetchRoute()} className="ml-auto text-brand-400 flex items-center gap-1">
                <ArrowPathIcon className="h-3 w-3" /> Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="p-4 pb-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
            >
              {activeTab === 'map' && (
                <MapTab
                  stops={TODAY_STOPS}
                  activeStopId={activeStop}
                  onSelectStop={(id) => { setActiveStop(id); handleTabChange('route'); }}
                />
              )}
              {activeTab === 'route' && (
                <RouteTab
                  stops={TODAY_STOPS}
                  activeStopId={activeStop}
                  onSelectStop={(id) => setActiveStop(id)}
                  estimatedMiles={estimatedMiles}
                  isLoading={routeLoading}
                  refetch={refetchRoute}
                  greeting={greeting}
                  userName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
                  stormMode={stormMode}
                  enqueue={enqueue}
                />
              )}
              {activeTab === 'capture' && <CaptureTab enqueue={enqueue} />}
              {activeTab === 'measure' && <MeasureTab enqueue={enqueue} stops={TODAY_STOPS} activeStopId={activeStop} />}
              {activeTab === 'pitch' && <PitchTab stops={TODAY_STOPS} activeStopId={activeStop} />}
              {activeTab === 'notes' && <NotesTab stops={TODAY_STOPS} activeStopId={activeStop} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav — safe area aware */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-md border-t border-slate-800"
        style={{ paddingBottom: 'var(--sab, 0px)' }}
      >
        <div className="flex">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => handleTabChange(key)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative',
                activeTab === key ? 'text-brand-400' : 'text-slate-600 active:text-slate-400'
              )}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {/* Active indicator */}
              {activeTab === key && (
                <motion.div layoutId="tabIndicator"
                  className="absolute top-0 inset-x-4 h-0.5 bg-brand-500 rounded-b-full" />
              )}
              {/* Pending badge */}
              {key === 'route' && pendingCount > 0 && (
                <span className="absolute top-2 right-[20%] w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          ))}
        </div>
      </div>
      {/* end mobile shell */}
      </div>
    </div>
  );
}
