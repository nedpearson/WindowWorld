import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BanknotesIcon, PlusIcon, MagnifyingGlassIcon,
  CheckCircleIcon, ExclamationTriangleIcon, ArrowDownTrayIcon, ChevronDownIcon,
  ChevronRightIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useInvoices, useRecordPayment, type Invoice } from '../../api/proposals';

// ─── Helpers ──────────────────────────────────────────────────
function formatCurrency(n?: number) {
  if (n === undefined || n === null) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES: Record<string, { badge: string; label: string; icon?: any }> = {
  DRAFT:       { badge: 'bg-slate-700 text-slate-400 border-slate-600',           label: 'Draft' },
  SENT:        { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',        label: 'Sent' },
  PARTIAL:     { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',     label: 'Partial' },
  PAID:        { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', label: 'Paid' },
  OVERDUE:     { badge: 'bg-red-500/15 text-red-400 border-red-500/25',           label: 'Overdue' },
  CANCELLED:   { badge: 'bg-slate-800 text-slate-500 border-slate-700',           label: 'Cancelled' },
  WRITTEN_OFF: { badge: 'bg-red-900/30 text-red-500 border-red-800',              label: 'Written Off' } };

const PAYMENT_METHODS = ['CASH', 'CHECK', 'CARD', 'BANK_TRANSFER', 'FINANCING', 'OTHER'];

// Demo fallback data
const DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv1', proposalId: 'p2', leadId: '1', organizationId: 'org1',
    invoiceNumber: 'INV-2026-001', status: 'SENT',
    grandTotal: 22400, depositAmount: 6720, depositPaid: true,
    dueDate: '2026-05-01T00:00:00Z', createdAt: '2026-04-18T09:15:00Z',
    totalPaid: 6720, balance: 15680, isOverdue: false, completionPct: 30,
    payments: [{ id: 'pmt1', amount: 6720, method: 'CHECK', paidAt: '2026-04-18T10:00:00Z', notes: '30% deposit at signing' }],
    proposal: { id: 'p2', title: 'Storm Replacement — Michael Trosclair' },
    createdBy: { id: 'u1', firstName: 'Jake', lastName: 'Thibodaux' } },
  {
    id: 'inv2', proposalId: 'p1', leadId: '3', organizationId: 'org1',
    invoiceNumber: 'INV-2026-002', status: 'DRAFT',
    grandTotal: 14750, depositAmount: 4425, depositPaid: false,
    dueDate: '2026-05-10T00:00:00Z', createdAt: '2026-04-19T08:00:00Z',
    totalPaid: 0, balance: 14750, isOverdue: false, completionPct: 0,
    payments: [],
    proposal: { id: 'p1', title: 'Full Home — Robert Comeaux' },
    createdBy: { id: 'u1', firstName: 'Jake', lastName: 'Thibodaux' } },
];

// ─── Payment Modal ────────────────────────────────────────────
function RecordPaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [amount, setAmount] = useState(String(Math.round(invoice.balance || 0)));
  const [method, setMethod] = useState('CHECK');
  const [notes, setNotes] = useState('');
  const recordPayment = useRecordPayment();

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (amt > (invoice.balance || 0) + 0.01) { toast.error('Amount exceeds remaining balance'); return; }
    try {
      await recordPayment.mutateAsync({ invoiceId: invoice.id, amount: amt, method, notes });
      toast.success(`Payment of ${formatCurrency(amt)} recorded`);
      onClose();
    } catch {
      toast.error('Failed to record payment');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-white mb-1">Record Payment</h2>
        <p className="text-xs text-slate-500 mb-5">Invoice {invoice.invoiceNumber} · Balance: {formatCurrency(invoice.balance)}</p>

        <div className="space-y-4 mb-5">
          {/* Quick amounts */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Amount</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {[invoice.depositAmount, invoice.balance, invoice.grandTotal].filter(Boolean).map((amt) => (
                <button key={amt} onClick={() => setAmount(String(Math.round(amt || 0)))}
                  className={clsx('text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                    amount === String(Math.round(amt || 0)) ? 'bg-brand-600/20 text-brand-400 border-brand-500/30' : 'bg-slate-800 text-slate-400 border-slate-700')}>
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01"
                className="input pl-7 font-mono" placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={clsx('py-2 px-2 rounded-lg text-xs font-medium transition-colors capitalize',
                    method === m ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700')}>
                  {m.replace('_', ' ').toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Check #, authorization code..." className="input" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={recordPayment.isPending}>Cancel</button>
          <button onClick={handleSubmit} disabled={recordPayment.isPending || !amount}
            className="btn-primary flex-1 flex items-center gap-2 justify-center">
            {recordPayment.isPending ? 'Saving...' : <><CheckCircleIcon className="h-4 w-4" /> Record Payment</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Invoice Row ──────────────────────────────────────────────
function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const [expanded, setExpanded] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const eff = invoice.isOverdue && invoice.status !== 'PAID' ? 'OVERDUE' : invoice.status;

  return (
    <>
      <tr className={clsx('hover:bg-slate-800/40 cursor-pointer transition-colors', invoice.isOverdue && 'bg-red-500/5')}
        onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3">
          <div className="text-sm font-mono font-medium text-white">{invoice.invoiceNumber}</div>
          <div className="text-[11px] text-slate-500">{formatDate(invoice.createdAt)}</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-slate-300 truncate max-w-[180px]">
            {invoice.proposal?.title || '—'}
          </div>
          {invoice.createdBy && (
            <div className="text-[11px] text-slate-600">by {invoice.createdBy.firstName}</div>
          )}
        </td>
        <td className="px-4 py-3 font-semibold text-white">{formatCurrency(invoice.grandTotal)}</td>
        <td className="px-4 py-3">
          <div className="text-sm text-slate-300">{formatCurrency(invoice.totalPaid)}</div>
          <div className="text-[11px] text-slate-600">{invoice.completionPct}% paid</div>
        </td>
        <td className="px-4 py-3 font-semibold text-amber-300">{formatCurrency(invoice.balance)}</td>
        <td className="px-4 py-3">
          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium border',
            STATUS_STYLES[eff]?.badge || 'bg-slate-800 text-slate-400')}>
            {STATUS_STYLES[eff]?.label || invoice.status}
          </span>
          {invoice.isOverdue && (
            <div className="text-[10px] text-red-400 mt-0.5">{invoice.daysOverdue}d overdue</div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-400">{formatDate(invoice.dueDate)}</td>
        <td className="px-4 py-3">
          <ChevronDownIcon className={clsx('h-4 w-4 text-slate-500 transition-transform', expanded && 'rotate-180')} />
        </td>
      </tr>

      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={8} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 bg-slate-800/20 border-b border-slate-800">
                  {/* Payment history */}
                  {(invoice.payments || []).length > 0 && (
                    <div className="pt-4 mb-4">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment History</div>
                      <div className="space-y-1.5">
                        {(invoice.payments || []).map((pmt) => (
                          <div key={pmt.id} className="flex items-center gap-3 text-xs">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                              <CheckCircleIcon className="h-3 w-3 text-emerald-400" />
                            </div>
                            <span className="text-emerald-400 font-semibold">{formatCurrency(pmt.amount)}</span>
                            <span className="text-slate-500">via {pmt.method.replace('_', ' ').toLowerCase()}</span>
                            <span className="text-slate-600">{formatDate(pmt.paidAt)}</span>
                            {pmt.notes && <span className="text-slate-600 italic">· {pmt.notes}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Payment Progress</span><span>{invoice.completionPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${invoice.completionPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-emerald-500 rounded-full" />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                      <button onClick={(e) => { e.stopPropagation(); setShowPayment(true); }}
                        className="btn-sm btn-primary flex items-center gap-2">
                        <CreditCardIcon className="h-3.5 w-3.5" /> Record Payment
                      </button>
                    )}
                    {invoice.pdfUrl && (
                      <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} className="btn-sm btn-secondary flex items-center gap-2">
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Download Invoice
                      </a>
                    )}
                    {invoice.proposalId && (
                      <Link to={`/proposals/${invoice.proposalId}`} onClick={(e) => e.stopPropagation()}
                        className="btn-sm btn-secondary flex items-center gap-2">
                        <ChevronRightIcon className="h-3.5 w-3.5" /> View Proposal
                      </Link>
                    )}
                    {invoice.leadId && (
                      <Link to={`/leads/${invoice.leadId}`} onClick={(e) => e.stopPropagation()}
                        className="btn-sm btn-ghost flex items-center gap-2">
                        <ChevronRightIcon className="h-3.5 w-3.5" /> View Lead
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>

      {/* Payment modal */}
      <AnimatePresence>
        {showPayment && (
          <RecordPaymentModal invoice={invoice} onClose={() => setShowPayment(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data: apiData, isLoading } = useInvoices({
    status: statusFilter || undefined,
    overdueOnly: overdueOnly || undefined });

  const invoices: Invoice[] = Array.isArray(apiData?.data) ? apiData.data : DEMO_INVOICES;

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return !q || inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.proposal?.title || '').toLowerCase().includes(q);
  });

  // Stats
  const totalOutstanding = invoices.reduce((s, inv) => s + (inv.balance || 0), 0);
  const totalCollected = invoices.reduce((s, inv) => s + (inv.totalPaid || 0), 0);
  const overdueCount = invoices.filter(inv => inv.isOverdue).length;
  const overdueAmount = invoices.filter(inv => inv.isOverdue).reduce((s, inv) => s + (inv.balance || 0), 0);

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading...' : `${invoices.length} invoices · ${formatCurrency(totalOutstanding)} outstanding`}
          </p>
        </div>
        <button onClick={() => toast.info('Create an invoice from an accepted proposal')}
          className="btn-primary flex items-center gap-2 btn-sm">
          <PlusIcon className="h-4 w-4" /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), sub: `${invoices.filter(i => !['PAID','CANCELLED'].includes(i.status)).length} open`, color: 'text-amber-400', filter: '' },
          { label: 'Collected', value: formatCurrency(totalCollected), sub: 'all time', color: 'text-emerald-400', filter: 'PAID' },
          { label: 'Overdue', value: formatCurrency(overdueAmount), sub: `${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}`, color: 'text-red-400', filter: 'OVERDUE' },
          { label: 'Paid in Full', value: invoices.filter(i => i.status === 'PAID').length.toString(), sub: 'invoices', color: 'text-cyan-400', filter: 'PAID' },
        ].map((s) => (
          <div key={s.label}
            onClick={() => s.filter && setStatusFilter(s.filter)}
            className={clsx('card p-4 transition-colors', s.filter && 'cursor-pointer hover:border-slate-600', s.label === 'Overdue' && overdueCount > 0 && 'border-red-500/20 bg-red-500/5')}>
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={clsx('text-xl font-bold', s.color)}>{s.value}</div>
            <div className="text-[11px] text-slate-600 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..." className="input pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['', 'DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx('btn-sm transition-colors', statusFilter === s ? 'btn-primary' : 'btn-secondary')}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={clsx('btn-sm flex items-center gap-1.5 transition-colors',
            overdueOnly ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'btn-secondary'
          )}>
          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
          Overdue Only
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Invoice #', 'Proposal', 'Total', 'Paid', 'Balance', 'Status', 'Due Date', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Loading invoices...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <BanknotesIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500">No invoices found</p>
                    <p className="text-xs text-slate-600 mt-1">Invoices are created from accepted proposals</p>
                  </td>
                </tr>
              ) : filtered.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
