import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CameraIcon, SparklesIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import apiClient, { post } from '../../api/client';

// ─── Constants ────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'MATERIALS', 'PERMITS', 'DISPOSAL', 'LABOR', 'TRAVEL', 'EQUIPMENT', 'OTHER',
] as const;

type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// ─── Zod schema ───────────────────────────────────────────────

const expenseSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be greater than 0'),
  vendor: z.string().max(255).optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  receiptDate: z.string().optional(),
  description: z.string().max(1000).optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// ─── Props ────────────────────────────────────────────────────

interface ReceiptCaptureProps {
  leadId: string;
  onExpenseSaved: () => void;
}

// ─── Confidence badge ─────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : pct >= 50 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-red-500/15 text-red-400 border-red-500/30';
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium', color)}>
      <SparklesIcon className="h-3 w-3" />
      AI Confidence: {pct}%
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────

export function ReceiptCapture({ leadId, onExpenseSaved }: ReceiptCaptureProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [parseError, setParseError] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: 'OTHER' },
  });

  // 1. Upload photo to /api/v1/documents
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file, file.name);
      fd.append('type', 'RECEIPT');
      fd.append('leadId', leadId);
      const res = await apiClient.documents.upload(fd) as { data?: { id: string; url: string } };
      if (!res?.data?.id) throw new Error('Upload failed: no document ID returned');
      return res.data;
    },
    onSuccess: (doc) => {
      setUploadedDocId(doc.id);
      setUploadedUrl(doc.url);
      // Auto-trigger AI parse
      parseMutation.mutate(doc.url);
    },
    onError: () => {
      toast.error('Photo upload failed — you can still enter expense details manually.');
      setShowForm(true);
    },
  });

  // 2. Parse receipt with AI
  const parseMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await post<{
        success: boolean;
        data?: {
          vendor: string | null;
          totalAmount: number | null;
          receiptDate: string | null;
          category: ExpenseCategory;
          confidence: number;
        };
      }>('/job-expenses/parse-receipt', { imageUrl, leadId });
      return res.data;
    },
    onSuccess: (data) => {
      if (data) {
        if (data.totalAmount) setValue('amount', data.totalAmount);
        if (data.vendor) setValue('vendor', data.vendor);
        if (data.category) setValue('category', data.category);
        if (data.receiptDate) {
          // Convert ISO to date-input format YYYY-MM-DD
          const d = new Date(data.receiptDate);
          if (!isNaN(d.getTime())) {
            setValue('receiptDate', d.toISOString().slice(0, 10));
          }
        }
        setAiConfidence(data.confidence);
        if (data.confidence === 0) setParseError(true);
      }
      setShowForm(true);
    },
    onError: () => {
      toast.error('AI parsing failed — please fill in the details manually.');
      setParseError(true);
      setShowForm(true);
    },
  });

  // 3. Save expense
  const saveMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      await post('/job-expenses', {
        leadId,
        amount: values.amount,
        category: values.category,
        vendor: values.vendor || undefined,
        description: values.description || undefined,
        receiptDate: values.receiptDate || undefined,
        documentId: uploadedDocId || undefined,
        aiConfidence: aiConfidence ?? undefined,
      });
    },
    onSuccess: () => {
      toast.success('Expense saved!');
      // Invalidate the list query so any parent JobCostSummary or standalone consumer refreshes
      queryClient.invalidateQueries({ queryKey: ['job-expenses', leadId] });
      reset();
      setPreview(null);
      setUploadedDocId(null);
      setUploadedUrl(null);
      setAiConfidence(null);
      setShowForm(false);
      setParseError(false);
      onExpenseSaved();
    },
    onError: () => {
      toast.error('Failed to save expense. Please try again.');
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setShowForm(false);
    setAiConfidence(null);
    setParseError(false);
    uploadMutation.mutate(file);
    // Clear input value so the same file can be re-selected if needed
    if (e.target) e.target.value = '';
  };

  const isLoading = uploadMutation.isPending || parseMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Camera trigger */}
      {!showForm && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 active:bg-emerald-500/10 disabled:opacity-50 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600/20 flex items-center justify-center">
              {isLoading
                ? <div className="w-7 h-7 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                : <CameraIcon className="h-7 w-7 text-emerald-400" />
              }
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-white">
                {isLoading ? (uploadMutation.isPending ? 'Uploading…' : 'AI is reading your receipt…') : 'Capture Receipt'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {isLoading ? 'Please wait…' : 'Opens rear camera · AI pre-fills the form'}
              </div>
            </div>
          </button>

          {/* Preview thumbnail */}
          {preview && (
            <div className="rounded-xl overflow-hidden border border-slate-700/50 aspect-video bg-slate-800 relative">
              <img src={preview} alt="Receipt preview" className="w-full h-full object-contain" />
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-2">
                  <SparklesIcon className="h-6 w-6 text-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-300 font-medium">AI is reading your receipt…</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Pre-filled expense form */}
      {showForm && (
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
          {/* AI confidence badge */}
          {aiConfidence !== null && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <ConfidenceBadge confidence={aiConfidence} />
              {parseError && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <ExclamationCircleIcon className="h-3.5 w-3.5" />
                  AI could not read receipt — please fill manually
                </span>
              )}
            </div>
          )}

          {aiConfidence !== null && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <ExclamationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
              Review AI values before saving
            </p>
          )}

          {/* Preview thumbnail (compact) */}
          {preview && (
            <div className="rounded-xl overflow-hidden border border-slate-700/30 h-24 bg-slate-800">
              <img src={preview} alt="Receipt" className="w-full h-full object-contain" />
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register('amount')}
                className="input pl-7"
              />
            </div>
            {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
          </div>

          {/* Vendor */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Vendor</label>
            <input
              type="text"
              placeholder="e.g. Home Depot, Lowe's"
              {...register('vendor')}
              className="input"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Category <span className="text-red-400">*</span>
            </label>
            <select {...register('category')} className="input">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Receipt Date</label>
            <input
              type="date"
              {...register('receiptDate')}
              className="input"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</label>
            <textarea
              rows={2}
              placeholder="Optional notes about this expense…"
              {...register('description')}
              className="input resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                reset();
                setPreview(null);
                setShowForm(false);
                setAiConfidence(null);
                setParseError(false);
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saveMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : <><CheckCircleIcon className="h-4 w-4" /> Save Expense</>
              }
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
