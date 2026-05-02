import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CameraIcon, SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ChevronDownIcon, ChevronUpIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { post } from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropertyScanResult {
  analysis: {
    totalWindowsDetected: number;
    windows: Array<{
      locationLabel: string;
      elevation: string;
      estimatedWidth: number;
      estimatedHeight: number;
      windowType: string;
      condition: string;
      confidence: number;
      issues: string[];
      notes: string;
    }>;
    propertyNotes: string;
    imageQualityWarnings: string[];
    aiAnalysisId: string;
  };
  populated?: number;
  unmatched?: number;
}

interface CapturedPhoto {
  elevation: 'front' | 'rear' | 'left' | 'right' | 'closeup';
  base64: string;
  previewUrl: string;
}

type Step = 'guide' | 'analyzing' | 'done' | 'error';

interface Props {
  leadId: string;
  inspectionId: string;
  onComplete: (result: PropertyScanResult) => void;
}

// ─── Image resize helper (canvas, max 1920px, 0.85 JPEG quality) ──────────────

function resizeImageBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    img.onload = () => {
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      // Strip the data URI prefix
      resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ''));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Confidence bar helper ────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>{pct}%</span>
    </div>
  );
}

// ─── Elevation slot config ────────────────────────────────────────────────────

const ELEVATIONS: Array<{ key: 'front' | 'rear' | 'left' | 'right'; label: string; emoji: string }> = [
  { key: 'front', label: 'Front', emoji: '🏠' },
  { key: 'rear',  label: 'Rear',  emoji: '🏡' },
  { key: 'left',  label: 'Left',  emoji: '◀️' },
  { key: 'right', label: 'Right', emoji: '▶️' },
];

const TIPS = [
  'Stand 20–30 feet back to fit the entire wall in frame',
  'Include the roofline and foundation in the shot',
  'Closeup photos optional — add them after the 4 elevations',
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function PropertyScanCapture({ leadId, inspectionId, onComplete }: Props) {
  const [step, setStep] = useState<Step>('guide');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [scanResult, setScanResult] = useState<PropertyScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // One hidden file input per elevation + one for closeup
  const frontRef  = useRef<HTMLInputElement>(null);
  const rearRef   = useRef<HTMLInputElement>(null);
  const leftRef   = useRef<HTMLInputElement>(null);
  const rightRef  = useRef<HTMLInputElement>(null);
  const closeupRef = useRef<HTMLInputElement>(null);

  const refMap: Record<string, React.RefObject<HTMLInputElement | null>> = {
    front: frontRef, rear: rearRef, left: leftRef, right: rightRef, closeup: closeupRef,
  };

  const isOffline = !navigator.onLine;

  const handlePhoto = useCallback(
    async (elevation: CapturedPhoto['elevation'], file: File) => {
      const previewUrl = URL.createObjectURL(file);
      try {
        const base64 = await resizeImageBase64(file);
        setPhotos((prev) => {
          // Replace if same elevation already exists (except closeup — allow multiples)
          if (elevation !== 'closeup') {
            return [
              ...prev.filter((p) => p.elevation !== elevation),
              { elevation, base64, previewUrl },
            ];
          }
          return [...prev, { elevation, base64, previewUrl }];
        });
      } catch {
        toast.error('Failed to process photo — please try again.');
      }
    },
    [],
  );

  const analysisMutation = useMutation({
    mutationFn: () => {
      if (isOffline) throw new Error('offline');
      const images = photos.map((p) => ({ base64: p.base64, elevation: p.elevation }));
      return post<{ success: boolean; data: PropertyScanResult }>('/ai-analysis/property-scan', {
        leadId,
        inspectionId,
        images,
        autoPopulateOpenings: true,
      });
    },
    onSuccess: (res) => {
      setScanResult(res.data);
      setStep('done');
    },
    onError: (err: any) => {
      const msg = err?.message === 'offline'
        ? 'No internet connection — photos saved locally. Reconnect to analyze.'
        : (err?.response?.data?.message || 'Analysis failed. Please try again.');
      setErrorMsg(msg);
      setStep('error');
    },
  });

  const handleAnalyze = () => {
    if (photos.length < 2) {
      toast.error('Add at least 2 photos before analyzing.');
      return;
    }
    setStep('analyzing');
    analysisMutation.mutate();
  };

  // ── STEP: Guide / Capture ────────────────────────────────────────────────
  if (step === 'guide') {
    const elevationPhotos = (key: string) => photos.filter((p) => p.elevation === key);
    const closeupPhotos   = photos.filter((p) => p.elevation === 'closeup');
    const totalPhotos     = photos.length;
    const atLimit         = totalPhotos >= 16; // leave 4 slots of safety margin under the 20-image GPT-4o limit

    return (
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-brand-400" />
            Property Photo Scan
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Take 4 exterior photos to get AI-estimated measurements for every window on the
            property. Field verification still required before ordering.
          </p>
        </div>

        {/* Offline warning */}
        {isOffline && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            You're offline. Photos will be stored locally and analyzed when you reconnect.
          </div>
        )}

        {/* 2×2 Elevation Grid */}
        <div className="grid grid-cols-2 gap-3">
          {ELEVATIONS.map(({ key, label, emoji }) => {
            const captured = elevationPhotos(key);
            const hasPic   = captured.length > 0;
            return (
              <div key={key}>
                <input
                  ref={refMap[key] as React.RefObject<HTMLInputElement>}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhoto(key, f);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => refMap[key].current?.click()}
                  className={`relative w-full aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                    hasPic
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-dashed border-slate-600 bg-slate-800/40'
                  }`}
                >
                  {hasPic ? (
                    <>
                      <img
                        src={captured[captured.length - 1].previewUrl}
                        alt={label}
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-60"
                      />
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <CheckCircleIcon className="h-7 w-7 text-emerald-400 drop-shadow" />
                        <span className="text-xs font-semibold text-emerald-300 drop-shadow">{label}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-xs text-slate-400 font-medium">{label}</span>
                      <CameraIcon className="h-4 w-4 text-slate-500 mt-0.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Tips strip */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 overflow-hidden">
          <button
            onClick={() => setShowTips((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <span className="font-medium">Photo Tips</span>
            {showTips ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
          {showTips && (
            <ul className="px-4 pb-3 space-y-2">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="text-brand-400 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add Closeup */}
        <div>
          <input
            ref={closeupRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhoto('closeup', f);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => closeupRef.current?.click()}
            disabled={atLimit}
            className="w-full py-2.5 rounded-xl border border-dashed border-slate-600 text-xs text-slate-400 hover:text-slate-300 hover:border-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CameraIcon className="h-4 w-4" />
            {closeupPhotos.length > 0
              ? `Add Another Closeup (${closeupPhotos.length} added)`
              : 'Add Closeup Photo (optional)'}
            {atLimit && ' — limit reached'}
          </button>
        </div>

        {/* Count */}
        {totalPhotos > 0 && (
          <p className="text-xs text-slate-500 text-center">
            {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''} ready
          </p>
        )}

        {/* Analyze CTA */}
        <button
          onClick={handleAnalyze}
          disabled={totalPhotos < 2}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={totalPhotos < 2 ? 'Add at least 2 photos' : undefined}
        >
          <SparklesIcon className="h-5 w-5" />
          Analyze with AI
          {totalPhotos < 2 && <span className="text-xs opacity-70">(add ≥2 photos)</span>}
        </button>
      </div>
    );
  }

  // ── STEP: Analyzing ────────────────────────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-900/95 p-6 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-brand-500/20 flex items-center justify-center">
            <SparklesIcon className="h-12 w-12 text-brand-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/40 animate-ping" />
        </div>
        <div>
          <p className="text-xl font-bold text-white">AI is scanning your photos…</p>
          <p className="text-sm text-slate-400 mt-2">Identifying and measuring every visible window</p>
          <p className="text-xs text-slate-500 mt-3">Typically 20–40 seconds</p>
        </div>
      </div>
    );
  }

  // ── STEP: Error ────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
          <ExclamationTriangleIcon className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-red-300">Scan Failed</p>
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
        <button
          onClick={() => {
            setStep('guide');
            setErrorMsg('');
          }}
          className="btn-secondary w-full"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── STEP: Done ─────────────────────────────────────────────────────────────
  if (step === 'done' && scanResult) {
    const { analysis, populated = 0, unmatched = 0 } = scanResult;
    return (
      <div className="space-y-5">
        {/* Success header */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircleIcon className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Scan Complete</p>
            <p className="text-xs text-emerald-300 mt-0.5">
              {analysis.totalWindowsDetected} windows detected across {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Quality warnings */}
        {analysis.imageQualityWarnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Photo Quality Warnings
            </div>
            <ul className="space-y-1">
              {analysis.imageQualityWarnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-300">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Window list */}
        <div className="space-y-2">
          {analysis.windows.map((win, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/40 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-white">{win.locationLabel}</span>
                  <span className="ml-2 text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wide">
                    {win.elevation}
                  </span>
                </div>
                <span className="text-[10px] bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                  {win.windowType.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="font-mono text-xl font-bold text-white">
                {win.estimatedWidth}&quot; × {win.estimatedHeight}&quot;
              </div>

              <ConfidenceBar value={win.confidence} />

              {win.issues.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {win.issues.map((issue, j) => (
                    <span
                      key={j}
                      className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary footer */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            <strong className="text-emerald-400">{populated}</strong> opening{populated !== 1 ? 's' : ''} pre-filled
          </span>
          {unmatched > 0 && (
            <span className="text-amber-400">
              {unmatched} unmatched — assign manually
            </span>
          )}
        </div>

        {/* AI disclaimer */}
        <p className="text-[11px] text-slate-500 italic text-center leading-relaxed">
          All measurements marked AI-ESTIMATED. Verify each with a tape measure
          before approving for order.
        </p>

        {/* CTA */}
        <button
          onClick={() => onComplete(scanResult)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="h-5 w-5" />
          Done — Review Openings
        </button>
      </div>
    );
  }

  return null;
}
