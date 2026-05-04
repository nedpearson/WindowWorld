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
  SparklesIcon, GlobeAltIcon, UserPlusIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
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
import { ReceiptCapture } from '../../components/field/ReceiptCapture';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// ─── Types ────────────────────────────────────────────────────
type FieldTab = 'map' | 'route' | 'capture' | 'measure' | 'pitch' | 'notes' | 'lead' | 'receipt';
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
function InstallBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="flex items-center gap-3 pl-4 pr-1 py-2 bg-brand-600/95 backdrop-blur-sm border-b border-brand-500/30 z-50"
    >
      {/* Clickable body — navigates to the full install guide */}
      <Link
        to="/field-install"
        onClick={() => haptic.tap()}
        className="flex items-center gap-3 flex-1 min-w-0 active:opacity-80"
      >
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <ArrowDownTrayIcon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white">Install WindowWorld</div>
          <div className="text-[10px] text-brand-200 leading-snug">
            Tap to add to home screen · works offline
          </div>
        </div>
        <div className="text-brand-300 text-[10px] font-semibold pr-1 flex-shrink-0">
          View →
        </div>
      </Link>

      {/* 44×44px dismiss — independent from the navigate action */}
      <button
        onClick={(e) => { e.preventDefault(); haptic.tap(); onDismiss(); }}
        className="flex items-center justify-center w-11 h-11 flex-shrink-0 text-brand-200 active:text-white transition-colors"
        aria-label="Dismiss install prompt"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </motion.div>
  );
}

// ─── Update Banner ────────────────────────────────────────────
function UpdateBanner({ onUpdate }: { onUpdate: () => void }) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/95 backdrop-blur-sm border-b border-amber-400/30"
    >
      <BellAlertIcon className="h-4 w-4 text-amber-900 flex-shrink-0" />
      <div className="flex-1 text-xs font-medium text-amber-900">
        New update available — tap to reload
      </div>
      <button
        onClick={() => { haptic.tap(); onUpdate(); }}
        className="text-[11px] font-bold text-amber-900 bg-amber-900/15 px-3 py-1.5 rounded-lg active:bg-amber-900/25"
      >
        Update Now
      </button>
    </motion.div>
  );
}

// ─── Offline Banner ───────────────────────────────────────────
function OfflineBanner({ pendingCount, failedCount, isSyncing, syncNow, clearFailed, isOnline }: any) {
  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  if (failedCount > 0 && isOnline) {
    return (
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: 'auto' }}
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium overflow-hidden bg-red-500/15 text-red-300 border-b border-red-500/20"
      >
        <ExclamationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
        {failedCount} sync error{failedCount > 1 ? 's' : ''} — actions could not be sent
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { haptic.tap(); syncNow(); }} className="underline font-semibold">Retry</button>
          <button onClick={() => { haptic.tap(); clearFailed(); }} className="underline font-semibold text-red-400">Clear</button>
        </div>
      </motion.div>
    );
  }

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
                  <ListBulletIcon className="h-4 w-4" /> Open Lead
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
function CaptureTab({ enqueue, stops = [], activeStopId }: { enqueue: (type: any, payload: any) => void, stops?: any[], activeStopId?: string | null }) {
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

  const resolvedStop = activeStopId ? stops.find(s => s.id === activeStopId) : null;
  const leadId = resolvedStop?.lead?.id ?? '';
  const inspectionId = resolvedStop?.inspectionId ?? '';

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    haptic.tap();

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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(base64);
    const blob = await res.blob();
    const compressedFile = new File([blob], file.name.replace(/\\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });

    setPendingFile(compressedFile);
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
        if (leadId) fd.append('leadId', leadId);
        if (inspectionId) fd.append('inspectionId', inspectionId);

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
        await enqueue('PHOTO_UPLOAD', { filename: pendingFile.name, label, size: pendingFile.size, mimeType: pendingFile.type, leadId, inspectionId });
        setCaptures(prev => prev.map(c => c.id === id ? { ...c, status: 'done' } : c));
        haptic.success();
        toast.success('Photo saved — uploads when back online');
      }
    } catch (err) {
      console.error('[CaptureTab] upload error:', err);
      setCaptures(prev => prev.map(c => c.id === id ? { ...c, status: 'error' } : c));
      // Fallback: push to offline queue so it retries
      await enqueue('PHOTO_UPLOAD', { filename: pendingFile?.name ?? 'photo.jpg', label, size: pendingFile?.size ?? 0, mimeType: pendingFile?.type ?? 'image/jpeg', leadId, inspectionId });
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
                  <img src={cap.url} alt={cap.label || 'Capture'} className="w-full h-full object-cover" />
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

// ─── New Lead Tab ─────────────────────────────────────────────
const LEAD_SOURCES = [
  'Door Knock', 'Referral', 'Storm Canvass', 'Phone Call',
  'Web Lead', 'Social Media', 'Yard Sign', 'Event / Home Show', 'Other',
];

function NewLeadTab({ enqueue }: { enqueue: (type: any, payload: any) => void }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    address: '', city: '', zip: '', source: '',
    notes: '', isStormLead: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const isValid = form.firstName.trim() && form.lastName.trim() && form.phone.trim();

  const handleSubmit = async () => {
    if (!isValid) return;
    haptic.impact();
    setSaving(true);
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      zip: form.zip.trim() || undefined,
      source: form.source || 'FIELD',
      notes: form.notes.trim() || undefined,
      isStormLead: form.isStormLead,
      status: 'NEW_LEAD',
    };

    try {
      if (navigator.onLine) {
        await (apiClient as any).leads.create(payload);
        haptic.success();
        toast.success(`Lead created: ${payload.firstName} ${payload.lastName}`);
      } else {
        await enqueue('LEAD_CREATE', payload);
        haptic.success();
        toast.success('Lead saved locally — syncs when online');
      }
      setSaved(true);
      setForm({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', zip: '', source: '', notes: '', isStormLead: false });
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('[NewLeadTab]', err);
      // If we're offline, or it's a TypeError (Network Error), queue it
      if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
        await enqueue('LEAD_CREATE', payload);
        toast.error('Saved to queue — will sync when connection is restored');
      } else {
        // Otherwise it's an API validation error (e.g. duplicate), show the real error
        toast.error(err?.response?.data?.error?.message || err.message || 'Failed to create lead');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Success banner */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30"
          >
            <CheckCircleIcon className="h-6 w-6 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-300">Lead Created!</div>
              <div className="text-xs text-emerald-600">Visible in the dashboard immediately.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New Lead — Field Entry</div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] text-slate-500">First Name *</label>
          <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
            placeholder="First" className="input" autoComplete="given-name" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-slate-500">Last Name *</label>
          <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
            placeholder="Last" className="input" autoComplete="family-name" />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="text-[11px] text-slate-500">Phone *</label>
        <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
          type="tel" placeholder="(555) 000-0000" className="input" autoComplete="tel" />
      </div>

      {/* Email */}
      <div className="space-y-1">
        <label className="text-[11px] text-slate-500">Email</label>
        <input value={form.email} onChange={(e) => set('email', e.target.value)}
          type="email" placeholder="homeowner@email.com" className="input" autoComplete="email" />
      </div>

      {/* Address */}
      <div className="space-y-1">
        <label className="text-[11px] text-slate-500">Street Address</label>
        <input value={form.address} onChange={(e) => set('address', e.target.value)}
          placeholder="123 Main St" className="input" autoComplete="street-address" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] text-slate-500">City</label>
          <input value={form.city} onChange={(e) => set('city', e.target.value)}
            placeholder="Baton Rouge" className="input" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-slate-500">ZIP</label>
          <input value={form.zip} onChange={(e) => set('zip', e.target.value)}
            placeholder="70801" className="input" maxLength={5} />
        </div>
      </div>

      {/* Source */}
      <div className="space-y-1">
        <label className="text-[11px] text-slate-500">Lead Source</label>
        <div className="grid grid-cols-3 gap-1.5">
          {LEAD_SOURCES.map((src) => (
            <button key={src} onClick={() => { haptic.selection(); set('source', src); }}
              className={clsx('py-2 px-2 rounded-xl text-xs font-medium transition-colors text-center leading-snug',
                form.source === src ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 active:bg-slate-700'
              )}>
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Storm toggle */}
      <button
        onClick={() => { haptic.tap(); set('isStormLead', !form.isStormLead); }}
        className={clsx(
          'w-full flex items-center justify-between p-3 rounded-xl border transition-colors',
          form.isStormLead
            ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
            : 'bg-slate-800/60 border-slate-700/40 text-slate-400'
        )}
      >
        <div className="flex items-center gap-2">
          <CloudArrowUpIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Storm Lead</span>
        </div>
        <div className={clsx(
          'w-10 h-5 rounded-full transition-colors relative',
          form.isStormLead ? 'bg-purple-600' : 'bg-slate-700'
        )}>
          <div className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
            form.isStormLead ? 'left-5' : 'left-0.5'
          )} />
        </div>
      </button>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-[11px] text-slate-500">Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
          placeholder="Damage details, window count, homeowner concerns…"
          rows={3} className="input resize-none" />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || saving}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 disabled:opacity-40"
      >
        {saving
          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
          : <><UserPlusIcon className="h-5 w-5" />Create Lead</>
        }
      </button>

      <p className="text-[10px] text-slate-600 text-center">
        * Required fields · Lead appears on dashboard immediately
      </p>
    </div>
  );
}

// ─── Guided Measurement Tool (AI-Enhanced) ───────────────────
import { PropertyScanCapture } from '../../components/field/PropertyScanCapture';
import { ReferenceObjectMeasure } from '../../components/field/ReferenceObjectMeasure';

type MeasureMethod = 'tape' | 'ref' | 'scan';

function MeasureTab({
  enqueue,
  stops,
  activeStopId,
}: {
  enqueue: (type: any, payload: any) => void;
  stops: any[];
  activeStopId: string | null;
}) {
  const [method, setMethod] = useState<MeasureMethod>('tape');
  const [step, setStep] = useState<MeasureStep>('select-opening');
  const [selectedOpening, setSelectedOpening] = useState<{ id: string; label: string; floor: string; type: string } | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [widthInt, setWidthInt] = useState('');
  const [widthFrac, setWidthFrac] = useState('0');
  const [heightInt, setHeightInt] = useState('');
  const [heightFrac, setHeightFrac] = useState('0');
  const [saved, setSaved] = useState<Array<{ label: string; width: string; height: string }>>([]);
  const [scanDone, setScanDone] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const fractions = ['0', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];

  const fracToDecimal = (f: string) => {
    if (f === '0') return 0;
    const [n, d] = f.split('/').map(Number);
    return n / d;
  };

  const finalWidth  = parseFloat(widthInt  || '0') + fracToDecimal(widthFrac);
  const finalHeight = parseFloat(heightInt || '0') + fracToDecimal(heightFrac);

  // Use explicitly selected stop, fall back to route's active stop, then null
  const resolvedStopId = selectedStopId ?? activeStopId ?? null;
  const resolvedStop   = stops.find((s: any) => s.id === resolvedStopId) ?? null;
  const measureLeadId       = resolvedStop?.lead?.id ?? '';
  const measureInspectionId = resolvedStop?.inspections?.[0]?.id ?? '';

  const handleSave = async () => {
    if (!selectedOpening) return;
    haptic.measureSaved();
    const dims = `${finalWidth.toFixed(3)}" W × ${finalHeight.toFixed(3)}" H`;
    setSaved((prev) => [...prev, { label: selectedOpening.label, width: finalWidth.toFixed(3), height: finalHeight.toFixed(3) }]);

    const payload = {
      roomLabel: selectedOpening.label,
      finalWidth,
      finalHeight,
      status: 'REVIEWED',
      isAiEstimated: false,
      measurementMethod: 'FIELD_TAPE',
      notes: measureLeadId
        ? 'Field-measured via MobileFieldApp — linked to stop'
        : 'Field-measured via MobileFieldApp — standalone',
      ...(measureLeadId && { leadId: measureLeadId }),
      ...(measureInspectionId && { inspectionId: measureInspectionId }),
      ...(selectedOpening?.id &&
        !selectedOpening.id.startsWith('ref-') &&
        !selectedOpening.id.startsWith('standalone') &&
        selectedOpening.id !== 'standalone' &&
        { openingId: selectedOpening.id }),
    };

    try {
      if (navigator.onLine) {
        await apiClient.measurements.create(payload);
        haptic.success();
        toast.success(`Saved: ${selectedOpening.label} — ${dims}`);
      } else {
        await enqueue('MEASUREMENT_SAVE', payload);
        toast.success(`Saved locally: ${selectedOpening.label} — syncs when online`);
      }
    } catch (err: any) {
      console.error('[MeasureTab] save error:', err);
      await enqueue('MEASUREMENT_SAVE', payload);
      toast.error('Saved to queue — will sync when connection is restored');
    }

    setStep('select-opening');
    setSelectedOpening(null);
    setCustomLabel('');
    setWidthInt(''); setWidthFrac('0');
    setHeightInt(''); setHeightFrac('0');
  };

  const stepTo = (next: MeasureStep) => { haptic.tap(); setStep(next); };

  const QUICK_ROOMS = [
    'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
    'Kitchen', 'Bathroom', 'Dining Room', 'Office',
    'Front Exterior', 'Back Exterior', 'Side Exterior', 'Garage',
  ];

  // Active stop context (for AI scan leadId/inspectionId) — kept for reference only
  // resolvedStop/measureLeadId/measureInspectionId are the authoritative values above

  return (
    <div className="space-y-4">

      {/* ── Assignment context indicator ────────────────────────── */}
      {resolvedStop ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
          Measuring for: <strong className="text-white ml-1">{resolvedStop.lead?.name ?? 'Stop'}</strong>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/30 text-xs text-slate-500">
          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
          Standalone — not linked to any stop
        </div>
      )}

      {/* ── Optional stop picker ────────────────────────────────── */}
      {stops.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedStopId ?? ''}
            onChange={(e) => {
              haptic.selection();
              setSelectedStopId(e.target.value || null);
            }}
            className="flex-1 text-xs bg-slate-800/60 border border-slate-700/40 rounded-xl text-slate-300 px-3 py-2.5 appearance-none focus:outline-none focus:border-brand-500/50 cursor-pointer"
          >
            <option value="">📍 No stop selected — standalone measure</option>
            {stops.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.order}. {s.lead?.name ?? 'Stop'} · {s.time ?? ''}
              </option>
            ))}
          </select>
          {selectedStopId && (
            <button
              onClick={() => { haptic.tap(); setSelectedStopId(null); }}
              className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-500 active:text-white transition-colors"
              title="Clear stop selection"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Method toggle ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: 'tape' as const, label: 'Tape', emoji: '📏' },
          { id: 'ref'  as const, label: 'Reference', emoji: '📱' },
          { id: 'scan' as const, label: 'AI Scan', emoji: '✨' },
        ] as const).map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => { haptic.selection(); setMethod(id); setScanDone(false); }}
            className={clsx(
              'flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-semibold transition-all active:scale-95',
              method === id
                ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-400',
            )}
          >
            <span className="text-lg">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ── AI Property Scan ───────────────────────────────────── */}
      {method === 'scan' && (
        <div className="space-y-3">
          {!scanDone ? (
            <>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
                <SparklesIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">HOVER Replacement — $0/month</div>
                  <div className="text-brand-400/80">Take 4 exterior photos. AI pre-fills measurements for every window detected. Optionally assign results to a route stop when done.</div>
                </div>
              </div>
              <PropertyScanCapture
                leadId={measureLeadId}
                inspectionId={measureInspectionId}
                onComplete={(result) => {
                  setScanDone(true);
                  setScanResult(result ?? null);
                  if (result?.analysis?.windows) {
                    const mapped = result.analysis.windows.map((w: any) => ({
                      label: w.locationLabel || `Unknown Window (${w.elevation})`,
                      width: String(w.estimatedWidth),
                      height: String(w.estimatedHeight),
                    }));
                    setSaved((prev) => [...prev, ...mapped]);
                  }
                  haptic.success();
                }}
              />
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                <CheckCircleIcon className="h-10 w-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">AI Scan Complete</p>
                <p className="text-xs text-emerald-400">Openings pre-filled with ESTIMATED measurements.</p>
                <p className="text-xs text-slate-500">Switch to Tape to verify each one before approving for order.</p>
                <button
                  onClick={() => { setMethod('tape'); setScanDone(false); setScanResult(null); }}
                  className="btn-secondary w-full mt-2 text-xs"
                >
                  Switch to Tape Verify →
                </button>
              </div>
              {/* Optional post-scan stop assignment */}
              {!measureLeadId && stops.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/30 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Assign Scan to a Stop (optional)</p>
                  <select
                    value={selectedStopId ?? ''}
                    onChange={(e) => { haptic.selection(); setSelectedStopId(e.target.value || null); }}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-300 px-3 py-2.5 appearance-none focus:outline-none"
                  >
                    <option value="">Keep as standalone — no stop linked</option>
                    {stops.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.order}. {s.lead?.name ?? 'Stop'}</option>
                    ))}
                  </select>
                  {selectedStopId && (
                    <button
                      onClick={() => {
                        haptic.tap();
                        toast.success('Scan assigned to stop — results linked to inspection.');
                        setScanDone(false);
                        setScanResult(null);
                        setMethod('tape');
                      }}
                      className="w-full btn-primary text-xs py-2.5"
                    >
                      Confirm Assignment →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Reference Object Measure ───────────────────────────── */}
      {method === 'ref' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 text-xs text-slate-400">
            <SparklesIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-brand-400" />
            <span>More accurate than HOVER for individual windows. Uses a known physical reference (iPhone, credit card, dollar bill) as a ruler.</span>
          </div>
          {!selectedOpening && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Room / Window Label</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Living Room, Front Left, Master Bedroom..."
                className="w-full text-sm bg-slate-800/60 border border-slate-700/40 rounded-xl text-white px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          )}
          <ReferenceObjectMeasure
            openingId={selectedOpening?.id ?? 'standalone'}
            leadId={measureLeadId}
            roomLabel={selectedOpening?.label ?? customLabel ?? ''}
            onMeasured={(w, h) => {
              setWidthInt(String(Math.floor(w)));
              setWidthFrac('0');
              setHeightInt(String(Math.floor(h)));
              setHeightFrac('0');
              setMethod('tape');
              if (!selectedOpening) {
                const label = customLabel.trim() || 'Field Measurement';
                setSelectedOpening({ id: `ref-${Date.now()}`, label, floor: 'Floor 1', type: 'WINDOW' });
              }
              setStep('confirm');
              haptic.success();
              toast.success('AI estimate ready — review and save.');
            }}
          />
        </div>
      )}

      {/* ── Tape Measure ──────────────────────────────────────── */}
      {method === 'tape' && (
      <AnimatePresence mode="wait">

        {step === 'select-opening' && (
          <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Select or Name Opening</div>

            {/* Quick-select room grid */}
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ROOMS.map((room) => {
                const isSaved = saved.find((s) => s.label === room);
                return (
                  <button key={room}
                    onClick={() => { haptic.selection(); setSelectedOpening({ id: room, label: room, floor: 'Floor 1', type: 'WINDOW' }); stepTo('enter-width'); }}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700/50 active:bg-slate-700 transition-colors text-left">
                    <span className="text-sm text-white truncate">{room}</span>
                    {isSaved
                      ? <CheckCircleIcon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      : <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                    }
                  </button>
                );
              })}
            </div>

            {/* Custom label */}
            <div className="space-y-2">
              <div className="text-xs text-slate-500">Custom room / opening label</div>
              <div className="flex gap-2">
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Hallway Window 3"
                  className="input flex-1"
                />
                <button
                  disabled={!customLabel.trim()}
                  onClick={() => { haptic.selection(); setSelectedOpening({ id: customLabel, label: customLabel, floor: 'Floor 1', type: 'WINDOW' }); stepTo('enter-width'); }}
                  className="btn-primary px-4 disabled:opacity-40"
                >
                  Go
                </button>
              </div>
            </div>

            {saved.length > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs font-semibold text-emerald-400">{saved.length} measurement{saved.length > 1 ? 's' : ''} recorded this session</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">
                  {navigator.onLine ? 'Synced to server' : 'Saved locally — syncs when online'}
                </div>
                <div className="mt-2 space-y-1">
                  {saved.map((s, i) => (
                    <div key={i} className="text-[11px] text-slate-400 font-mono">{s.label}: {s.width}" × {s.height}"</div>
                  ))}
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
              Review &amp; Save →
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
      )}
    </div>
  );
}

// ─── Desktop QR Panel ────────────────────────────────────────
function DesktopQRPanel({
  user, isOnline, pendingCount, isSyncing, stopCount, confirmedCount, accessToken
}: {
  user: any; isOnline: boolean; pendingCount: number; isSyncing: boolean;
  stopCount: number; confirmedCount: number; accessToken: string | null;
}) {
  const [tick, setTick] = useState(0);
  const [copied, setCopied] = useState(false);

  // Live clock — updates the QR link timestamp every 30s to show "live"
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Build the deep-link — embed accessToken (JWT) + mode=qr so FieldInstallPage
  // routes to /auth/qr-exchange which resolves identity from the JWT sub claim.
  const baseUrl = window.location.origin;
  const qrUrl = new URL('/field-install', baseUrl);
  if (user?.id)   qrUrl.searchParams.set('uid', user.id);
  if (accessToken) qrUrl.searchParams.set('token', accessToken);
  qrUrl.searchParams.set('mode', 'qr');
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
  const { enqueue, pendingCount, isSyncing, syncNow, isOnline, failedCount, deadCount, clearFailed } = useOfflineQueue();
  const stormMode = useAppStore((s) => s.stormModeActive);
  const { isInstallable, isInstalled, isUpdateAvailable, isIOS, install, dismissInstall, forceUpdate } = usePWA();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken && !!s.user);

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Identity guard: verify stored user matches current token ──
  // Guards against stale localStorage identity (e.g. previous Jake session).
  // Fires once on mount; corrects the store silently if the server disagrees.
  useEffect(() => {
    const { accessToken: token, user: storedUser } = useAuthStore.getState();
    if (!token) return;
    (apiClient as any).auth.me().then((res: any) => {
      const freshUser = res?.data ?? res; // server returns { success, data } — get() strips one level
      if (freshUser?.id && freshUser.id !== storedUser?.id) {
        useAuthStore.getState().setUser(freshUser);
      }
    }).catch(() => {
      // non-fatal — user may be offline; stored identity is used as-is
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Real today's route from the server ──────────
  const [routeDate, setRouteDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const { data: routeData, isLoading: routeLoading, refetch: refetchRoute } = useQuery({
    queryKey: ['field-route', routeDate],
    queryFn: () => apiClient.appointments.getRoute({ date: routeDate }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true });

  const rawRoute = (routeData as any)?.data;
  const TODAY_STOPS = (rawRoute?.appointments ?? []).map((apt: any, idx: number) => toStop(apt, idx + 1));
  const estimatedMiles = rawRoute?.estimatedMiles ?? 0;
  const confirmedCount = TODAY_STOPS.filter((s: any) => s.status === 'confirmed').length;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  // ─── Session expired — show recovery banner instead of silent redirect ─────
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <ExclamationCircleIcon className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-white font-semibold mb-2">Session expired</p>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Your session has timed out. Any offline work is safely queued and will sync after you log back in.
          </p>
          <a href="/login" className="btn-primary inline-block">Log In Again</a>
        </div>
      </div>
    );
  }

  const TABS: Array<{ key: FieldTab; icon: any; label: string }> = [
    { key: 'map',     icon: GlobeAltIcon,              label: 'Map' },
    { key: 'route',   icon: MapPinIcon,                label: 'Route' },
    { key: 'capture', icon: CameraIcon,                label: 'Camera' },
    { key: 'receipt', icon: CurrencyDollarIcon,        label: 'Receipt' },
    { key: 'measure', icon: ClipboardDocumentListIcon, label: 'Measure' },
    { key: 'lead',    icon: UserPlusIcon,              label: 'New Lead' },
    { key: 'pitch',   icon: SparklesIcon,              label: 'Silo AI' },
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
        accessToken={accessToken}
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
        {isUpdateAvailable && <UpdateBanner key="update" onUpdate={forceUpdate} />}
        {isInstallable && (
          <InstallBanner key="install" onDismiss={dismissInstall} />
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

            {/* Route refresh button */}
            <button
              onClick={() => { haptic.tap(); refetchRoute(); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 active:text-white active:bg-slate-700 transition-colors"
              title="Refresh today's route"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
            </button>

            {/* Failed sync badge — tap to retry */}
            {failedCount > 0 && !isSyncing && (
              <button
                onClick={() => { haptic.tap(); syncNow(); }}
                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 transition-colors active:bg-red-500/25"
                title={`${failedCount} sync error${failedCount > 1 ? 's' : ''} — tap to retry`}
              >
                <span className="font-bold">{failedCount}</span> err
              </button>
            )}

            {/* Dead action badge — tap to discard permanently */}
            {deadCount > 0 && !isSyncing && (
              <button
                onClick={() => { haptic.tap(); clearFailed(); }}
                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-rose-900/40 text-rose-400 border border-rose-800/40 transition-colors active:bg-rose-900/60"
                title={`${deadCount} permanently failed — tap to discard`}
              >
                ! <span className="font-bold">{deadCount}</span>
              </button>
            )}

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

        <OfflineBanner pendingCount={pendingCount} failedCount={failedCount} isSyncing={isSyncing} syncNow={syncNow} clearFailed={clearFailed} isOnline={isOnline} />

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
              {/* Each tab is isolated in its own ErrorBoundary so a single crash doesn't kill the whole app */}
              {activeTab === 'map' && (
                <ErrorBoundary fallback={
                  <div className="p-6 text-center">
                    <p className="text-red-400 font-medium mb-2">Map failed to load</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary text-xs">Reload</button>
                  </div>
                }>
                  <MapTab
                    stops={TODAY_STOPS}
                    activeStopId={activeStop}
                    onSelectStop={(id) => { setActiveStop(id); handleTabChange('route'); }}
                  />
                </ErrorBoundary>
              )}
              {activeTab === 'route' && (
                <ErrorBoundary fallback={
                  <div className="p-6 text-center">
                    <p className="text-red-400 font-medium mb-2">Route tab failed to load</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary text-xs">Reload</button>
                  </div>
                }>
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
                    routeDate={routeDate}
                    setRouteDate={setRouteDate}
                  />
                </ErrorBoundary>
              )}
              {activeTab === 'capture' && (
                <ErrorBoundary fallback={
                  <div className="p-6 text-center">
                    <p className="text-red-400 font-medium mb-2">Camera tab failed to load</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary text-xs">Reload</button>
                  </div>
                }>
                  <CaptureTab enqueue={enqueue} stops={TODAY_STOPS} activeStopId={activeStop} />
                </ErrorBoundary>
              )}
              {activeTab === 'receipt' && (
                <ErrorBoundary fallback={
                  <div className="p-6 text-center">
                    <p className="text-red-400 font-medium mb-2">Receipt tab failed to load</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary text-xs">Reload</button>
                  </div>
                }>
                  {activeStop
                    ? (() => {
                        const activeStopData = TODAY_STOPS.find((s: any) => s.id === activeStop);
                        const leadId = activeStopData?.lead?.id;
                        return leadId
                          ? (
                            <div className="space-y-3">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Receipt Capture · {activeStopData?.lead?.name}
                              </div>
                              <ReceiptCapture
                                leadId={leadId}
                                onExpenseSaved={() => toast.success('Expense saved to job!')}
                              />
                            </div>
                          )
                          : <p className="text-xs text-slate-500 text-center py-6">Select a stop on the Route tab first.</p>;
                      })()
                    : <p className="text-xs text-slate-500 text-center py-6">Select a stop on the Route tab to capture a receipt.</p>
                  }
                </ErrorBoundary>
              )}
              {activeTab === 'measure' && (
                <ErrorBoundary fallback={
                  <div className="p-6 text-center">
                    <p className="text-red-400 font-medium mb-2">Measure tab failed to load</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary text-xs">Reload</button>
                  </div>
                }>
                  <MeasureTab enqueue={enqueue} stops={TODAY_STOPS} activeStopId={activeStop} />
                </ErrorBoundary>
              )}
              {activeTab === 'lead' && (
                <ErrorBoundary fallback={
                  <div className="p-6 text-center">
                    <p className="text-red-400 font-medium mb-2">New Lead tab failed to load</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary text-xs">Reload</button>
                  </div>
                }>
                  <NewLeadTab enqueue={enqueue} />
                </ErrorBoundary>
              )}
              {activeTab === 'pitch' && (
                <ErrorBoundary fallback={
                  <div className="p-6 text-center">
                    <p className="text-red-400 font-medium mb-2">Pitch tab failed to load</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary text-xs">Reload</button>
                  </div>
                }>
                  <PitchTab stops={TODAY_STOPS} activeStopId={activeStop} />
                </ErrorBoundary>
              )}
              {activeTab === 'notes' && (
                <ErrorBoundary fallback={
                  <div className="p-6 text-center">
                    <p className="text-red-400 font-medium mb-2">Notes tab failed to load</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary text-xs">Reload</button>
                  </div>
                }>
                  <NotesTab stops={TODAY_STOPS} activeStopId={activeStop} />
                </ErrorBoundary>
              )}
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
