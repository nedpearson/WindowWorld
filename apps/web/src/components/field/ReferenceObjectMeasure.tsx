import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DevicePhoneMobileIcon, CreditCardIcon, SparklesIcon,
  CheckCircleIcon, ExclamationTriangleIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { post } from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReferenceObject = 'iphone' | 'credit_card' | 'dollar_bill';
type Step = 'select' | 'guide' | 'capture' | 'analyzing' | 'result';

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

// ─── Known reference dimensions ───────────────────────────────────────────────

const REF_INFO: Record<ReferenceObject, { label: string; widthIn: number; heightIn: number; desc: string }> = {
  iphone:      { label: 'My iPhone',    widthIn: 2.81, heightIn: 5.78, desc: 'Best accuracy' },
  credit_card: { label: 'Credit Card',  widthIn: 3.37, heightIn: 2.13, desc: 'Good for width reference' },
  dollar_bill: { label: 'Dollar Bill',  widthIn: 6.14, heightIn: 2.61, desc: 'Use when phone unavailable' },
};

// ─── Image resize helper (matches ReceiptCapture / PropertyScanCapture pattern) ─

function resizeImageBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
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

// ─── Visual diagram: window frame with reference object in corner ─────────────

function WindowDiagram({ refObject }: { refObject: ReferenceObject }) {
  const info = REF_INFO[refObject];
  return (
    <div className="flex items-center justify-center py-4">
      {/* Outer window frame */}
      <div className="relative w-48 h-64 border-4 border-slate-500 rounded-sm bg-slate-800/30">
        {/* Glass panes */}
        <div className="absolute inset-2 border border-slate-600/50 rounded-sm bg-slate-900/20" />
        <div className="absolute inset-x-2 top-2 bottom-[calc(50%+2px)] border border-slate-600/30 rounded-sm" />
        <div className="absolute inset-x-2 bottom-2 top-[calc(50%+2px)] border border-slate-600/30 rounded-sm" />

        {/* Reference object in bottom-left corner */}
        <div
          className="absolute bottom-2 left-2 bg-slate-200/90 rounded-[3px] flex items-center justify-center shadow-sm"
          style={{
            width: `${Math.round(info.widthIn * 14)}px`,
            height: `${Math.round(info.heightIn * 14)}px`,
            maxWidth: '52px',
            maxHeight: '72px',
          }}
        >
          {refObject === 'iphone' && <DevicePhoneMobileIcon className="h-5 w-5 text-slate-700" />}
          {refObject === 'credit_card' && <CreditCardIcon className="h-4 w-4 text-slate-700" />}
          {refObject === 'dollar_bill' && <span className="text-[8px] font-bold text-slate-700">$1</span>}
        </div>

        {/* Dimension arrows overlay */}
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
  const [step, setStep]                   = useState<Step>('select');
  const [selectedRef, setSelectedRef]     = useState<ReferenceObject | null>(null);
  const [result, setResult]               = useState<ReferenceObjectResult | null>(null);
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null);
  const cameraRef                         = useRef<HTMLInputElement>(null);

  const isOffline = !navigator.onLine;

  const analyzeMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      if (isOffline) throw new Error('offline');
      const res = await post<{ success: boolean; data: { analysis: ReferenceObjectResult } }>(
        '/ai-analysis/reference-object',
        { openingId, leadId, imageBase64, referenceObject: selectedRef },
      );
      return res.data.analysis;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep('result');
    },
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

  // ── STEP: Select reference object ─────────────────────────────────────────
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{info.label}</span>
                    {key === 'iphone' && (
                      <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {info.widthIn}&quot; wide × {info.heightIn}&quot; tall
                  </p>
                  <p className="text-xs text-slate-500">{info.desc}</p>
                </div>
              </button>
            ),
          )}
        </div>
      </div>
    );
  }

  // ── STEP: Guide / Instructions ────────────────────────────────────────────
  if (step === 'guide' && selectedRef) {
    const info = REF_INFO[selectedRef];
    const objectName = info.label.toLowerCase();

    const instructions = [
      `Hold your ${objectName} flat against the window frame`,
      `Position it in a corner so it touches both the sill and jamb`,
      `Step back so the entire window AND the ${objectName} fit in frame`,
      `Keep the phone level — avoid angling up or down`,
    ];

    return (
      <div className="space-y-5">
        {/* Header with back */}
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('select')} className="btn-ghost btn-sm">
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-white">Position your {objectName}</h2>
            <p className="text-xs text-slate-500">{info.widthIn}&quot; × {info.heightIn}&quot; reference</p>
          </div>
        </div>

        {/* Visual diagram */}
        <WindowDiagram refObject={selectedRef} />

        {/* Instructions */}
        <div className="space-y-2">
          {instructions.map((inst, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <div className="w-6 h-6 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
                {i + 1}
              </div>
              <span className="text-sm text-slate-300">{inst}</span>
            </div>
          ))}
        </div>

        {/* Offline notice */}
        {isOffline && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            You're offline. Photo will be analyzed when reconnected.
          </div>
        )}

        {/* Camera input */}
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
          Open Camera
        </button>
      </div>
    );
  }

  // ── STEP: Analyzing ────────────────────────────────────────────────────────
  if (step === 'analyzing') {
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
          <p className="text-xs text-slate-400 mt-1">Using {selectedRef && REF_INFO[selectedRef].label} as a ruler</p>
        </div>
      </div>
    );
  }

  // ── STEP: Result ───────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const pct = Math.round(result.confidence * 100);
    const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
    const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

    return (
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-white">Measurement Result</h2>
          <p className="text-xs text-slate-500 mt-0.5">{roomLabel}</p>
        </div>

        {/* Reference invalid warning */}
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

        {/* Dimensions card */}
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
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
          <span>
            AI-ESTIMATED via reference object · REVIEWED status · Verify with tape before ordering
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setStep('guide');
              setResult(null);
              setPreviewUrl(null);
            }}
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
