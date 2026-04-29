import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CurrencyDollarIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';
import { ReceiptCapture } from '../field/ReceiptCapture';
import { get } from '../../api/client';

// ─── Types ────────────────────────────────────────────────────

type ExpenseCategory =
  | 'MATERIALS' | 'PERMITS' | 'DISPOSAL' | 'LABOR'
  | 'TRAVEL' | 'EQUIPMENT' | 'OTHER';

interface Expense {
  id: string;
  amount: string | number;
  category: ExpenseCategory;
  vendor: string | null;
  description: string | null;
  receiptDate: string | null;
  verifiedAt: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  document: { id: string; url: string | null; filename: string } | null;
}

interface Summary {
  totalExpenses: number;
  expensesByCategory: Record<ExpenseCategory, number>;
  estimatedValue: number | null;
  grossMargin: number | null;
  grossMarginPct: number | null;
  expenseCount: number;
  unverifiedCount: number;
}

interface ApiResponse {
  success: boolean;
  data: { expenses: Expense[]; summary: Summary };
}

// ─── Helpers ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  MATERIALS:  '#3b82f6',
  PERMITS:    '#a855f7',
  DISPOSAL:   '#f97316',
  LABOR:      '#10b981',
  TRAVEL:     '#f59e0b',
  EQUIPMENT:  '#06b6d4',
  OTHER:      '#64748b',
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MATERIALS: 'Materials',
  PERMITS:   'Permits',
  DISPOSAL:  'Disposal',
  LABOR:     'Labor',
  TRAVEL:    'Travel',
  EQUIPMENT: 'Equipment',
  OTHER:     'Other',
};

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MarginGauge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-500 text-sm">—</span>;
  const color = pct > 40 ? 'text-emerald-400' : pct > 20 ? 'text-amber-400' : 'text-red-400';
  return <span className={clsx('text-2xl font-bold', color)}>{pct.toFixed(1)}%</span>;
}

// ─── Main component ──────────────────────────────────────────

export function JobCostSummary({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['job-expenses', leadId],
    queryFn: () => get<ApiResponse>(`/job-expenses/lead/${leadId}`),
    refetchInterval: 5000,
    enabled: !!leadId,
  });

  const expenses: Expense[] = data?.data?.expenses ?? [];
  const summary: Summary | null = data?.data?.summary ?? null;

  // Build chart data — only include categories with > 0
  const chartData = summary
    ? (Object.entries(summary.expensesByCategory) as [ExpenseCategory, number][])
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({ name: CATEGORY_LABELS[key], value, key }))
    : [];

  if (isLoading) {
    return (
      <div className="card p-5 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-40" />
        <div className="h-24 bg-slate-800 rounded" />
        <div className="h-40 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Job Costing</h3>
            {summary && summary.unverifiedCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-400">
                <ExclamationCircleIcon className="h-3 w-3" />
                {summary.unverifiedCount} unverified
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add Expense
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Top KPIs */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Expenses',
                  value: fmt(summary.totalExpenses),
                  sub: `${summary.expenseCount} item${summary.expenseCount !== 1 ? 's' : ''}`,
                  color: 'text-white',
                },
                {
                  label: 'Est. Job Value',
                  value: summary.estimatedValue !== null ? fmt(summary.estimatedValue) : '—',
                  sub: 'from accepted quote',
                  color: 'text-emerald-400',
                },
                {
                  label: 'Gross Margin',
                  value: summary.grossMargin !== null ? fmt(summary.grossMargin) : '—',
                  sub: 'value minus expenses',
                  color: summary.grossMargin !== null && summary.grossMargin < 0 ? 'text-red-400' : 'text-emerald-400',
                },
                {
                  label: 'Margin %',
                  value: <MarginGauge pct={summary.grossMarginPct} />,
                  sub: 'gross margin',
                  color: '',
                },
              ].map(({ label, value, sub, color }) => (
                <div key={label}>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
                  <div className={clsx('text-xl font-bold mt-0.5', color)}>{value}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Bar chart breakdown */}
          {chartData.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">By Category</div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(148,163,184,0.1)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [fmt(v), 'Amount']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key as ExpenseCategory]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Expense list */}
          {expenses.length === 0 ? (
            <div className="text-center py-6">
              <CurrencyDollarIcon className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No expenses recorded for this job yet.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary btn-sm mt-3"
              >
                <PlusIcon className="h-4 w-4" /> Add First Expense
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expenses</div>
              {expenses.map((exp) => (
                <motion.div
                  key={exp.id}
                  layout
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/60 border border-slate-700/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Category dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[exp.category] }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">
                          {exp.vendor || CATEGORY_LABELS[exp.category]}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[exp.category]}20`,
                            color: CATEGORY_COLORS[exp.category],
                            borderColor: `${CATEGORY_COLORS[exp.category]}40`,
                          }}
                        >
                          {CATEGORY_LABELS[exp.category]}
                        </span>
                        {/* Unverified warning */}
                        {!exp.verifiedAt && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                            <ExclamationCircleIcon className="h-3 w-3" />
                            Unverified
                          </span>
                        )}
                        {/* Verified checkmark */}
                        {exp.verifiedAt && (
                          <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                            <CheckCircleIcon className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {fmtDate(exp.receiptDate || exp.createdAt)}
                        {exp.description && ` · ${exp.description.slice(0, 60)}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white flex-shrink-0 ml-3">
                    {fmt(Number(exp.amount))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-base font-semibold text-white">Add Expense</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-icon btn-ghost text-slate-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5">
                <ReceiptCapture
                  leadId={leadId}
                  onExpenseSaved={() => {
                    setShowAddModal(false);
                    queryClient.invalidateQueries({ queryKey: ['job-expenses', leadId] });
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
