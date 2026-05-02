import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DevicePhoneMobileIcon, CreditCardIcon, SparklesIcon,
  CheckCircleIcon, ExclamationTriangleIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { post } from '../../api/client';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReferenceObject = 'iphone' | 'credit_card' | 'dollar_bill';
type RefMethod       = 'exif_distance' | 'virtual_card' | 'physical_placement';
type Step            = 'select' | 'guide' | 'capture' | 'analyzing' | 'result';

interface ReferenceObjectResult {
  estimatedWidth: number;
  estimatedHeight: number;
  confidence: number;
  referenceValid: boolean;
  referenceWarning: string | null;
  windowType: string;
  measurementNotes: string;
  aiAnalysisId: string;
}

interface Props {
  openingId: string;
  leadId: string;
  roomLabel: string;
  onMeasured: (width: number, height: number, confidence: number) => void;
}

// ─── Reference object data (exact ISO / manufacturer specs) ───────────────────

const REF_INFO = {
  iphone: {
    label:       'Phone Camera Mode',
    subtitle:    'No second phone needed',
    widthIn:     2.638,   // 67.0 mm exactly (iPhone 6)
    heightIn:    5.437,   // 138.1 mm exactly
    thicknessIn: 0.272,   // 6.9 mm
    widthMm:     67.0,
    heightMm:    138.1,
    desc:        'Best accuracy — uses your camera focal length + distance',
    badge:       'Recommended' as string | null,
    method:      'exif_distance' as RefMethod,
  },
  credit_card: {
    label:       'Virtual Credit Card',
    subtitle:    'Standard ISO/IEC 7810 ID-1',
    widthIn:     3.375,   // 85.60 mm exactly
    heightIn:    2.125,   // 53.98 mm exactly
    thicknessIn: 0.030,   // 0.76 mm
    widthMm:     85.60,
    heightMm:    53.98,
    desc:        'Hold card loosely in frame — no corner placement needed',
    badge:       null as string | null,
    method:      'virtual_card' as RefMethod,
  },
  dollar_bill: {
    label:       'Dollar Bill',
    subtitle:    'Use when no card available',
    widthIn:     6.141,   // 156.0 mm exactly
    heightIn:    2.614,   // 66.4 mm exactly
    thicknessIn: 0.109,
    widthMm:     156.0,
    heightMm:    66.4,
    desc:        'Place bill flat against lower portion of window',
    badge:       null as string | null,
    method:      'physical_placement' as RefMethod,
  },
} as const;

// ─── Image resize helper ──────────────────────────────────────────────────────

function resizeImageBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img    = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
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
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85).replace(/^data:image\/jpeg;base64,/, ''));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Instruction renderer ─────────────────────────────────────────────────────

function InstructionList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((inst, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
          <div className="w-6 h-6 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
            {i + 1}
          </div>
          <span className="text-sm text-slate-300">{inst}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Window diagram (credit card + dollar bill) ───────────────────────────────

function WindowDiagramCard() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative w-48 h-64 border-4 border-slate-500 rounded-sm bg-slate-800/30">
        <div className="absolute inset-2 border border-slate-600/50 rounded-sm bg-slate-900/20" />
        <div className="absolute inset-x-2 top-2 bottom-[calc(50%+2px)] border border-slate-600/30 rounded-sm" />
        <div className="absolute inset-x-2 bottom-2 top-[calc(50%+2px)] border border-slate-600/30 rounded-sm" />
        {/* Card floating at bottom-center — NOT pressed into corner */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-200/90 rounded-[3px] flex items-center justify-center shadow-sm"
          style={{ width: 48, height: 30 }}
        >
          <CreditCardIcon className="h-4 w-4 text-slate-700" />
        </div>
        <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
          <span className="text-[10px] text-slate-500">← Width →</span>
        </div>
        <div className="absolute -right-10 top-0 bottom-0 flex items-center">
          <span className="text-[10px] text-slate-500 -rotate-90 whitespace-nowrap">↕ Height</span>
        </div>
      </div>
    </div>
  );
}

function WindowDiagramDollar() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative w-48 h-64 border-4 border-slate-500 rounded-sm bg-slate-800/30">
        <div className="absolute inset-2 border border-slate-600/50 rounded-sm bg-slate-900/20" />
        <div className="absolute inset-x-2 top-2 bottom-[calc(50%+2px)] border border-slate-600/30 rounded-sm" />
        <div className="absolute inset-x-2 bottom-2 top-[calc(50%+2px)] border border-slate-600/30 rounded-sm" />
        {/* Bill pressed into bottom-left corner */}
        <div
          className="absolute bottom-2 left-2 bg-slate-200/90 rounded-[3px] flex items-center justify-center shadow-sm"
          style={{ width: 52, height: 22 }}
        >
          <span className="text-[8px] font-bold text-slate-700">$1</span>
        </div>
        <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
          <span className="text-[10px] text-slate-500">← Width →</span>
        </div>
        <div className="absolute -right-10 top-0 bottom-0 flex items-center">
          <span className="text-[10px] text-slate-500 -rotate-90 whitespace-nowrap">↕ Height</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReferenceObjectMeasure({ openingId, leadId, roomLabel, onMeasured }: Props) {
  const [step, setStep]               = useState<Step>('select');
  const [selectedRef, setSelectedRef] = useState<ReferenceObject | null>(null);
  const [result, setResult]           = useState<ReferenceObjectResult | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [distanceFeet, setDistanceFeet] = useState<number>(6);
  const cameraRef                     = useRef<HTMLInputElement>(null);

  const isOffline = !navigator.onLine;

  const analyzeMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      if (isOffline) throw new Error('offline');
      const info = selectedRef ? REF_INFO[selectedRef] : null;
      const res = await post<{ success: boolean; data: { analysis: ReferenceObjectResult } }>(
        '/ai-analysis/reference-object',
        {
          openingId,
          leadId,
          imageBase64,
          referenceObject: selectedRef,
          distanceFeet: selectedRef === 'iphone' ? distanceFeet : undefined,
          referenceDimensions: info
            ? {
                widthIn:  info.widthIn,
                heightIn: info.heightIn,
                widthMm:  info.widthMm,
                heightMm: info.heightMm,
              }
            : undefined,
        },
      );
      return res.data.analysis;
    },
    onSuccess: (data) => { setResult(data); setStep('result'); },
    onError: (err: any) => {
      const msg = err?.message === 'offline'
        ? 'No internet — please reconnect to analyze.'
        : (err?.response?.data?.message || 'Analysis failed. Try retaking the photo.');
      toast.error(msg);
      setStep('guide');
    },
  });

  const handleFileCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPreviewUrl(URL.createObjectURL(file));
    setStep('analyzing');
    try {
      const base64 = await resizeImageBase64(file);
      analyzeMutation.mutate(base64);
    } catch {
      toast.error('Failed to process image — please try again.');
      setStep('guide');
    }
  }, [analyzeMutation]);

  // ── STEP: Select ─────────────────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-brand-400" />
            Reference-Object Measure
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            No tape measure? Use a known object as a ruler.
          </p>
          {roomLabel && (
            <p className="text-xs text-brand-400 mt-1">Opening: <strong>{roomLabel}</strong></p>
          )}
        </div>

        <div className="space-y-3">
          {(Object.entries(REF_INFO) as Array<[ReferenceObject, typeof REF_INFO[ReferenceObject]]>).map(
            ([key, info]) => (
              <button
                key={key}
                onClick={() => { setSelectedRef(key); setStep('guide'); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all text-left active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                  {key === 'iphone'      && <DevicePhoneMobileIcon className="h-6 w-6 text-slate-300" />}
                  {key === 'credit_card' && <CreditCardIcon className="h-6 w-6 text-slate-300" />}
                  {key === 'dollar_bill' && <span className="text-2xl">💵</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{info.label}</span>
                    {info.badge && (
                      <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                        {info.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{info.subtitle}</p>
                  <p className="text-xs text-slate-500">{info.desc}</p>
                </div>
              </button>
            ),
          )}
        </div>
      </div>
    );
  }

  // ── STEP: Guide ──────────────────────────────────────────────────────────────
  if (step === 'guide' && selectedRef) {
    const info       = REF_INFO[selectedRef];
    const refMethod  = info.method;

    const cameraButton = (
      <>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileCapture}
        />
        <button
          onClick={() => cameraRef.current?.click()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <span className="text-lg">📸</span>
          {refMethod === 'exif_distance' ? `Take Photo (${distanceFeet}ft standback)` : 'Open Camera'}
        </button>
      </>
    );

    // ── iPhone / Camera focal-length mode ────────────────────────────────────
    if (refMethod === 'exif_distance') {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('select')} className="btn-ghost btn-sm">
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-bold text-white">Phone Camera Mode</h2>
              <p className="text-xs text-slate-500">No second phone needed — just step back and shoot</p>
            </div>
          </div>

          {/* Distance selector */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                How far are you standing from the window?
              </h3>
              <p className="text-xs text-slate-500">
                Stand still after choosing — your exact distance is used in the calculation.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[3, 4, 5, 6, 8, 10, 12, 15].map((ft) => (
                <button
                  key={ft}
                  onClick={() => setDistanceFeet(ft)}
                  className={clsx(
                    'py-3 rounded-xl border text-sm font-bold transition-all active:scale-95',
                    distanceFeet === ft
                      ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/20'
                      : 'bg-slate-800/60 border-slate-700/40 text-slate-400',
                  )}
                >
                  {ft}ft
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
              <span>📐</span>
              <span>
                Selected: <strong className="text-white">{distanceFeet} feet</strong> from window.
                Your phone's camera focal length will be extracted from the photo automatically.
              </span>
            </div>
          </div>

          {/* Instructions */}
          <InstructionList items={[
            `Stand exactly ${distanceFeet} feet back from the window`,
            'Center the entire window in your frame — show full frame including sill and header',
            'Hold your phone level — do NOT angle up, down, or sideways',
            'Make sure the entire window frame is visible with some wall around it',
          ]} />

          {/* How it works */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 text-xs text-slate-400">
            <SparklesIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-brand-400" />
            <div>
              <p className="font-semibold text-slate-300 mb-0.5">How this works</p>
              <p>
                Your phone's camera focal length (stored in the photo) + your {distanceFeet}ft standback
                distance + the iPhone 6 sensor calibration (67.0mm × 138.1mm) lets AI calculate the
                real-world window size precisely — no second phone needed.
              </p>
            </div>
          </div>

          {isOffline && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
              You're offline. Photo will be analyzed when reconnected.
            </div>
          )}
          {cameraButton}
        </div>
      );
    }

    // ── Virtual credit card mode ─────────────────────────────────────────────
    if (refMethod === 'virtual_card') {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('select')} className="btn-ghost btn-sm">
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-bold text-white">Virtual Credit Card</h2>
              <p className="text-xs text-slate-500">
                {info.widthIn}&quot; × {info.heightIn}&quot; · ISO/IEC 7810 ID-1 standard
              </p>
            </div>
          </div>

          <WindowDiagramCard />

          <InstructionList items={[
            'Take your physical credit card out of your wallet',
            'Hold it in front of the lower portion of the window — no need to touch the glass',
            "Card can be at arm's length, just keep it visible in the lower third of the frame",
            'Keep card facing the camera, roughly parallel to the window surface',
            'Step back so both the full window AND the card are in frame',
          ]} />

          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 text-xs text-slate-400">
            <CreditCardIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-brand-400" />
            <div>
              <p className="font-semibold text-slate-300 mb-0.5">No corner placement needed</p>
              <p>
                AI detects the card's edges in your photo and uses the exact ISO standard
                dimensions (85.60mm × 53.98mm) to calculate window size. Just keep the card
                visible — no need to press it against the glass.
              </p>
            </div>
          </div>

          {isOffline && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
              You're offline. Photo will be analyzed when reconnected.
            </div>
          )}
          {cameraButton}
        </div>
      );
    }

    // ── Dollar bill — physical placement (unchanged flow) ────────────────────
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('select')} className="btn-ghost btn-sm">
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-white">Position your dollar bill</h2>
            <p className="text-xs text-slate-500">{info.widthIn}&quot; × {info.heightIn}&quot; reference</p>
          </div>
        </div>

        <WindowDiagramDollar />

        <InstructionList items={[
          'Hold your dollar bill flat against the lower corner of the window frame',
          'Position it so it touches both the sill and jamb',
          'Step back so the entire window AND the bill fit in frame',
          'Keep the phone level — avoid angling up or down',
        ]} />

        {isOffline && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            You're offline. Photo will be analyzed when reconnected.
          </div>
        )}
        {cameraButton}
      </div>
    );
  }

  // ── STEP: Analyzing ──────────────────────────────────────────────────────────
  if (step === 'analyzing') {
    const analyzingLabel = selectedRef === 'iphone'
      ? `Camera focal length + ${distanceFeet}ft standback calibration`
      : selectedRef === 'credit_card'
      ? 'Detecting ISO card (85.60mm × 53.98mm) in frame'
      : `Using ${selectedRef ? REF_INFO[selectedRef].label : ''} as ruler`;

    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center">
            <SparklesIcon className="h-10 w-10 text-brand-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/30 animate-ping" />
        </div>
        {previewUrl && (
          <div className="w-48 h-32 rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-60" />
          </div>
        )}
        <div>
          <p className="text-base font-bold text-white">Measuring with AI…</p>
          <p className="text-xs text-slate-400 mt-1">{analyzingLabel}</p>
        </div>
      </div>
    );
  }

  // ── STEP: Result ─────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const pct       = Math.round(result.confidence * 100);
    const barColor  = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
    const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

    const methodAttribution = selectedRef === 'iphone'
      ? `Camera calibration · ${distanceFeet}ft standback · iPhone 6 sensor reference`
      : selectedRef === 'credit_card'
      ? 'Virtual card detection · ISO/IEC 7810 ID-1 (85.60mm × 53.98mm)'
      : 'Physical dollar bill reference';

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Measurement Result</h2>
          <p className="text-xs text-slate-500 mt-0.5">{roomLabel}</p>
        </div>

        {!result.referenceValid && result.referenceWarning && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Reference placement issue</p>
              <p>{result.referenceWarning}</p>
              <p className="mt-1 text-amber-400">Results may be less accurate. Consider retaking.</p>
            </div>
          </div>
        )}

        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/40 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Width</p>
              <p className="text-3xl font-bold font-mono text-white">{result.estimatedWidth}&quot;</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Height</p>
              <p className="text-3xl font-bold font-mono text-white">{result.estimatedHeight}&quot;</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Confidence</span>
              <span className={`font-bold ${textColor}`}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {result.windowType && result.windowType !== 'UNKNOWN' && (
            <div className="text-xs text-slate-400">
              Window type: <span className="text-white font-medium">{result.windowType.replace(/_/g, ' ')}</span>
            </div>
          )}

          {/* Method attribution */}
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-700/40">
            Method: {methodAttribution}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
          <span>
            AI-ESTIMATED via reference object · REVIEWED status · Verify with tape before ordering
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('guide'); setResult(null); setPreviewUrl(null); }}
            className="btn-secondary flex-1"
          >
            Retake Photo
          </button>
          <button
            onClick={() => onMeasured(result.estimatedWidth, result.estimatedHeight, result.confidence)}
            className="btn-primary flex-1 flex items-center justify-center gap-1"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Accept &amp; Continue
          </button>
        </div>
      </div>
    );
  }

  return null;
}
