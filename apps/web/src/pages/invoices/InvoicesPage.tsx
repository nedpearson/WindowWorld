import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CurrencyDollarIcon, CheckCircleIcon, ClockIcon, ExclamationCircleIcon,
  PaperAirplaneIcon, ChevronRightIcon, PlusIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const INVOICES = [
  { id: 'inv1', number: 'WW-2026-1001', status: 'PAID', lead: { id: '1', name: 'James Hebert', address: '7890 Plank Rd', city: 'Baton Rouge' }, grandTotal: 11600, totalPaid: 11600, balance: 0, depositPct: 50, dueDate: '2026-04-30', paidAt: '2026-04-14', isOverdue: false, daysOverdue: 0, method: 'CHECK', completionPct: 100 },
  { id: 'inv2', number: 'WW-2026-1002', status: 'PARTIAL', lead: { id: '1', name: 'Michael Trosclair', address: '7824 Old Hammond Hwy', city: 'Baton Rouge' }, grandTotal: 8840, totalPaid: 4420, balance: 4420, depositPct: 50, dueDate: '2026-05-10', paidAt: null, isOverdue: false, daysOverdue: 0, method: 'CASH', completionPct: 50 },
  { id: 'inv3', number: 'WW-2026-1003', status: 'SENT', lead: { id: '2', name: 'Patricia Landry', address: '312 Sherwood Forest Dr', city: 'Baton Rouge' }, grandTotal: 5330, totalPaid: 0, balance: 5330, depositPct: 0, dueDate: '2026-05-18', paidAt: null, isOverdue: false, daysOverdue: 0, method: null, completionPct: 0 },
  { id: 'inv4', number: 'WW-2026-1004', status: 'OVERDUE', lead: { id: '9', name: 'Brett Fontenot', address: '918 N. College Rd', city: 'Lafayette' }, grandTotal: 5200, totalPaid: 1000, balance: 4200, depositPct: 20, dueDate: '2026-03-31', paidAt: null, isOverdue: true, daysOverdue: 18, method: 'CREDIT_CARD', completionPct: 19 },
  { id: 'inv5', number: 'WW-2026-1005', status: 'DRAFT', lead: { id: '3', name: 'Robert Comeaux', address: '4521 Greenwell Springs Rd', city: 'Baton Rouge' }, grandTotal: 6500, totalPaid: 0, balance: 6500, depositPct: 50, dueDate: '2026-05-20', paidAt: null, isOverdue: false, daysOverdue: 0, method: null, completionPct: 0 },
];

const AGING = [
  { label: 'Current', amount: 5330, count: 1, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { label: '1–30 Days', amount: 4200, count: 1, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  { label: '31–60 Days', amount: 0, count: 0, color: 'text-orange-400', bg: 'bg-orange-500/15' },
  { label: '60+ Days', amount: 0, count: 0, color: 'text-red-400', bg: 'bg-red-500/15' },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'Draft', badge: 'badge-slate' },
  SENT: { label: 'Sent', badge: 'badge-blue' },
  PARTIAL: { label: 'Partial', badge: 'badge-yellow' },
  PAID: { label: 'Paid', badge: 'badge-green' },
  OVERDUE: { label: 'Overdue', badge: 'badge-red' },
  VOID: { label: 'Void', badge: 'badge-slate' },
};

const PAYMENT_METHODS = ['CASH', 'CHECK', 'CREDIT_CARD', 'ACH', 'FINANCING'];

export function InvoicesPage() {
  const [invoices, setInvoices] = useState(INVOICES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CHECK');
  const [paymentRef, setPaymentRef] = useState('');

  const filtered = invoices.filter((inv) => {
    const matchSearch = !search || inv.lead.name.toLowerCase().includes(search.toLowerCase()) || inv.number.includes(search);
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalOutstanding = invoices.reduce((s, inv) => inv.status !== 'PAID' && inv.status !== 'VOID' ? s + inv.balance : s, 0);
  const totalOverdue = invoices.filter((inv) => inv.isOverdue).reduce((s, inv) => s + inv.balance, 0);
  const totalCollected = invoices.reduce((s, inv) => s + inv.totalPaid, 0);

  const handlePayment = (invoiceId: string) => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid payment amount'); return; }

    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== invoiceId) return inv;
      const newPaid = inv.totalPaid + amount;
      const newBalance = inv.grandTotal - newPaid;
      return {
        ...inv,
        totalPaid: newPaid,
        balance: newBalance,
        completionPct: Math.round((newPaid / inv.grandTotal) * 100),
        status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
        isOverdue: newBalance > 0 && inv.isOverdue,
        paidAt: newBalance <= 0 ? new Date().toISOString().split('T')[0] : null,
      };
    }));

    toast.success(`Payment of $${amount.toFixed(2)} recorded via ${paymentMethod}`);
    setShowPaymentModal(null);
    setPaymentAmount('');
    setPaymentRef('');
  };

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">{invoices.length} invoices · ${totalCollected.toLocaleString()} collected</p>
        </div>
        <Link to="/proposals" className="btn-secondary btn-sm">From Proposal</Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Outstanding', value: `$${totalOutstanding.toLocaleString()}`, sub: `${invoices.filter((i) => i.balance > 0 && i.status !== 'VOID').length} invoices`, color: 'text-white' },
          { label: 'Overdue', value: `$${totalOverdue.toLocaleString()}`, sub: `${invoices.filter((i) => i.isOverdue).length} past due`, color: totalOverdue > 0 ? 'text-red-400' : 'text-white' },
          { label: 'Collected (MTD)', value: `$${totalCollected.toLocaleString()}`, sub: `${invoices.filter((i) => i.status === 'PAID').length} paid`, color: 'text-emerald-400' },
          { label: 'Avg Invoice', value: `$${invoices.length > 0 ? (invoices.reduce((s, i) => s + i.grandTotal, 0) / invoices.length).toLocaleString() : 0}`, sub: 'per job', color: 'text-white' },
        ].map((kpi) => (
          <div key={kpi.label} className="stat-card">
            <div className="stat-label">{kpi.label}</div>
            <div className={clsx('stat-value', kpi.color)}>{kpi.value}</div>
            <div className="text-xs text-slate-500">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Aging buckets */}
      <div className="card p-4">
        <div className="text-sm font-semibold text-white mb-3">A/R Aging</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {AGING.map((bucket) => (
            <div key={bucket.label} className={clsx('p-3 rounded-xl flex flex-col gap-1', bucket.bg)}>
              <div className="text-xs text-slate-500">{bucket.label}</div>
              <div className={clsx('text-lg font-bold', bucket.color)}>${bucket.amount.toLocaleString()}</div>
              <div className="text-xs text-slate-600">{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, invoice #..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select w-36">
          <option value="ALL">All</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Invoice rows */}
      <div className="space-y-2">
        {filtered.map((inv) => {
          const config = STATUS_CONFIG[inv.status] || STATUS_CONFIG['DRAFT'];
          return (
            <motion.div key={inv.id} layout className="card overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                onClick={() => setSelectedId(selectedId === inv.id ? null : inv.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      inv.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-400' :
                      inv.status === 'OVERDUE' ? 'bg-red-500/15 text-red-400' :
                      inv.status === 'PARTIAL' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-slate-700 text-slate-400'
                    )}>
                      {inv.status === 'PAID' ? <CheckCircleIcon className="h-5 w-5" /> :
                       inv.status === 'OVERDUE' ? <ExclamationCircleIcon className="h-5 w-5" /> :
                       <CurrencyDollarIcon className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{inv.lead.name}</span>
                        <span className="text-xs text-slate-600 font-mono">{inv.number}</span>
                        <span className={clsx('badge text-[10px]', config.badge)}>{config.label}</span>
                        {inv.isOverdue && <span className="badge badge-red text-[10px]">{inv.daysOverdue}d overdue</span>}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{inv.lead.city} · Due {new Date(inv.dueDate).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-white">${inv.grandTotal.toLocaleString()}</div>
                      {inv.balance > 0 && <div className="text-xs text-red-400">Bal: ${inv.balance.toLocaleString()}</div>}
                      {inv.status === 'PAID' && <div className="text-xs text-emerald-400">Paid in full</div>}
                    </div>
                    <ChevronRightIcon className={clsx('h-4 w-4 text-slate-600 transition-transform mt-1', selectedId === inv.id && 'rotate-90')} />
                  </div>
                </div>

                {/* Progress bar */}
                {inv.status !== 'DRAFT' && (
                  <div className="mt-3 score-bar">
                    <div
                      className={clsx('score-bar-fill transition-all duration-700',
                        inv.completionPct >= 100 ? 'bg-emerald-500' : inv.isOverdue ? 'bg-red-500' : 'bg-brand-500'
                      )}
                      style={{ width: `${inv.completionPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Expanded detail */}
              {selectedId === inv.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="overflow-hidden border-t border-slate-700/50">
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><div className="text-xs text-slate-500">Invoice Total</div><div className="text-sm font-bold text-white">${inv.grandTotal.toLocaleString()}</div></div>
                      <div><div className="text-xs text-slate-500">Paid</div><div className="text-sm font-bold text-emerald-400">${inv.totalPaid.toLocaleString()}</div></div>
                      <div><div className="text-xs text-slate-500">Balance</div><div className={clsx('text-sm font-bold', inv.balance > 0 ? 'text-red-400' : 'text-slate-400')}>${inv.balance.toLocaleString()}</div></div>
                      <div><div className="text-xs text-slate-500">Collected</div><div className="text-sm font-bold text-white">{inv.completionPct}%</div></div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {inv.balance > 0 && (
                        <button className="btn-success btn-sm" onClick={() => { setShowPaymentModal(inv.id); setPaymentAmount(String(inv.balance)); }}>
                          <PlusIcon className="h-3.5 w-3.5" /> Record Payment
                        </button>
                      )}
                      {inv.status === 'DRAFT' && (
                        <button className="btn-primary btn-sm" onClick={() => toast.success('Invoice sent!')}>
                          <PaperAirplaneIcon className="h-3.5 w-3.5" /> Send Invoice
                        </button>
                      )}
                      {inv.isOverdue && (
                        <button className="btn-secondary btn-sm" onClick={() => toast.info('Payment reminder sent!')}>
                          <ClockIcon className="h-3.5 w-3.5" /> Send Reminder
                        </button>
                      )}
                      <Link to={`/leads/${inv.lead.id}`} className="btn-ghost btn-sm">View Lead</Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (() => {
        const inv = invoices.find((i) => i.id === showPaymentModal)!;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowPaymentModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-8 w-full max-w-md border border-slate-700"
            >
              <h2 className="text-lg font-bold text-white mb-1">Record Payment</h2>
              <p className="text-sm text-slate-400 mb-6">{inv.number} · {inv.lead.name} · Balance: ${inv.balance.toLocaleString()}</p>

              <div className="space-y-4">
                <div>
                  <label className="label">Amount ($)</label>
                  <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} type="number" step="0.01" className="input font-mono text-lg" placeholder="0.00" />
                  <div className="flex gap-2 mt-1">
                    {[inv.balance, inv.balance / 2, 1000].filter((a) => a > 0).map((a) => (
                      <button key={a} onClick={() => setPaymentAmount(a.toFixed(2))} className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors">
                        ${a.toFixed(0)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="select">
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Reference / Check #</label>
                  <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="input" placeholder="Check #, transaction ID, etc." />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPaymentModal(null)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={() => handlePayment(showPaymentModal)} className="btn-success flex-1">
                    <CheckCircleIcon className="h-4 w-4" /> Record Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}
