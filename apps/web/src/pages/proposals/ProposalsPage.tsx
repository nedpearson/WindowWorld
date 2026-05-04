import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PlusIcon, MagnifyingGlassIcon,
  CheckCircleIcon, EyeIcon, PaperAirplaneIcon,
  ArrowDownTrayIcon, XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useProposals, useUpdateProposalStatus, type Proposal } from '../../api/proposals';
import { useAuthStore } from '../../store/auth.store';
import { isDemoMode } from '../../utils/isDemoMode';

// ─── Constants ────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { badge: string; label: string; icon?: any }> = {
  DRAFT:      { badge: 'bg-slate-700 text-slate-300 border-slate-600',          label: 'Draft' },
  READY:      { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',       label: 'Ready' },
  SENT:       { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/25', label: 'Sent' },
  VIEWED:     { badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',       label: 'Viewed' },
  ACCEPTED:   { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', label: 'Accepted' },
  DECLINED:   { badge: 'bg-red-500/15 text-red-400 border-red-500/25',          label: 'Declined' },
  REVISED:    { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',    label: 'Revised' },
  CONTRACTED: { badge: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30', label: 'Contracted' },
  ARCHIVED:   { badge: 'bg-slate-800 text-slate-500 border-slate-700',          label: 'Archived' } };

const PDF_STATUS: Record<string, string> = {
  PENDING:    'text-slate-500',
  GENERATING: 'text-amber-400 animate-pulse',
  READY:      'text-emerald-400',
  FAILED:     'text-red-400' };

function formatCurrency(n?: number) {
  if (!n) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Demo fallback data ───────────────────────────────────────
const DEMO_PROPOSALS: Proposal[] = [
  {
    id: 'p1', leadId: '3', title: 'Full Home Window Replacement — Robert Comeaux',
    status: 'SENT', pdfStatus: 'READY', validDays: 30, viewCount: 3,
    createdAt: '2026-04-18T12:00:00Z', sentAt: '2026-04-18T14:00:00Z', firstViewedAt: '2026-04-18T15:30:00Z',
    lead: { id: '3', firstName: 'Robert', lastName: 'Comeaux', address: '4521 Greenwell Springs Rd', city: 'Baton Rouge', zip: '70806', phone: '(225) 555-1001' },
    quote: { id: 'q1', grandTotal: 14750, subtotal: 15500, discountPct: 5, discountAmount: 750, totalWindows: 10 },
    createdBy: { id: 'u1', firstName: 'Jake', lastName: 'Thibodaux', phone: '(225) 555-9000', email: 'jake@windowworldla.com' } },
  {
    id: 'p2', leadId: '1', title: 'Storm Replacement — Michael Trosclair',
    status: 'ACCEPTED', pdfStatus: 'READY', validDays: 30, viewCount: 7,
    createdAt: '2026-04-17T10:00:00Z', sentAt: '2026-04-17T11:00:00Z', acceptedAt: '2026-04-18T09:15:00Z',
    lead: { id: '1', firstName: 'Michael', lastName: 'Trosclair', address: '7824 Old Hammond Hwy', city: 'Baton Rouge', zip: '70809', phone: '(225) 555-1003' },
    quote: { id: 'q2', grandTotal: 22400, totalWindows: 14 },
    createdBy: { id: 'u1', firstName: 'Jake', lastName: 'Thibodaux' } },
  {
    id: 'p3', leadId: '6', title: 'Series 4000 — Karen Guidry',
    status: 'DRAFT', pdfStatus: 'PENDING', validDays: 30, viewCount: 0,
    createdAt: '2026-04-19T08:00:00Z',
    lead: { id: '6', firstName: 'Karen', lastName: 'Guidry', address: '1134 Range Ave', city: 'Denham Springs', zip: '70726' },
    quote: { id: 'q3', grandTotal: 8200, totalWindows: 6 },
    createdBy: { id: 'u2', firstName: 'Chad', lastName: 'Melancon' } },
  {
    id: 'p4', leadId: '4', title: 'Master Suite Upgrade — Angela Mouton',
    status: 'VIEWED', pdfStatus: 'READY', validDays: 30, viewCount: 2,
    createdAt: '2026-04-16T14:00:00Z', sentAt: '2026-04-16T15:00:00Z', firstViewedAt: '2026-04-17T10:30:00Z',
    lead: { id: '4', firstName: 'Angela', lastName: 'Mouton', address: '226 Tupelo Dr', city: 'Prairieville', zip: '70769' },
    quote: { id: 'q4', grandTotal: 5900, totalWindows: 4 },
    createdBy: { id: 'u3', firstName: 'Danielle', lastName: 'Arceneaux' } },
];

// ─── Page Component ───────────────────────────────────────────
export function ProposalsPage() {
  const _navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: apiData, isLoading } = useProposals({ status: statusFilter || undefined });
  const statusMutation = useUpdateProposalStatus();

  const user = useAuthStore((s) => s.user);
  const noApiData = !Array.isArray(apiData?.data);
  const proposals: Proposal[] = (isDemoMode(user) && noApiData)
    ? DEMO_PROPOSALS
    : (Array.isArray(apiData?.data) ? apiData.data : []);

  const filtered = proposals.filter((p) => {
    const name = p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : '';
    const q = search.toLowerCase();
    return !q || p.title.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  // Group stats
  const totalValue = proposals.reduce((s, p) => s + (p.quote?.grandTotal || 0), 0);
  const acceptedValue = proposals.filter(p => p.status === 'ACCEPTED').reduce((s, p) => s + (p.quote?.grandTotal || 0), 0);
  const sentCount = proposals.filter(p => ['SENT', 'VIEWED'].includes(p.status)).length;

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await statusMutation.mutateAsync({ id, status });
      toast.success(`Proposal marked as ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Proposals</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading...' : `${proposals.length} proposals · ${formatCurrency(totalValue)} pipeline`}
          </p>
        </div>
        <Link to="/leads"
          onClick={() => toast.info('Select a lead to create a new proposal')}
          className="btn-primary flex items-center gap-2 btn-sm">
          <PlusIcon className="h-4 w-4" /> New Proposal
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Pipeline', value: formatCurrency(totalValue), sub: `${proposals.length} proposals`, color: 'text-brand-400' },
          { label: 'Accepted', value: formatCurrency(acceptedValue), sub: `${proposals.filter(p => p.status === 'ACCEPTED').length} won`, color: 'text-emerald-400' },
          { label: 'Out for Review', value: sentCount.toString(), sub: 'sent or viewed', color: 'text-purple-400' },
          { label: 'Avg Value', value: proposals.length ? formatCurrency(Math.round(totalValue / proposals.length)) : '—', sub: 'per proposal', color: 'text-cyan-400' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
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
            placeholder="Search proposals..." className="input pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['', 'DRAFT', 'READY', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx('btn-sm transition-colors', statusFilter === s ? 'btn-primary' : 'btn-secondary')}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Customer', 'Title', 'Value', 'Status', 'PDF', 'Views', 'Expiry', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Loading proposals...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No proposals found</td></tr>
              ) : filtered.map((p) => (
                <>
                  <tr key={p.id}
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">
                        {p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : '—'}
                      </div>
                      <div className="text-[11px] text-slate-500">{p.lead?.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300 max-w-[200px] truncate">{p.title}</div>
                      <div className="text-[11px] text-slate-600">{p.quote?.totalWindows} windows · by {p.createdBy?.firstName}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{formatCurrency(p.quote?.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium border',
                        STATUS_STYLES[p.status]?.badge || 'bg-slate-800 text-slate-400')}>
                        {STATUS_STYLES[p.status]?.label || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-[11px]', PDF_STATUS[p.pdfStatus || 'PENDING'])}>
                        {p.pdfStatus === 'READY' ? '✓ PDF' : p.pdfStatus === 'GENERATING' ? '⟳ Gen...' : p.pdfStatus === 'FAILED' ? '✗ Failed' : '– None'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{p.viewCount || 0}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{formatDate(p.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/proposals/${p.id}`} onClick={(e) => e.stopPropagation()}
                        className="btn-icon btn-ghost h-7 w-7">
                        <ChevronRightIcon className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {selectedId === p.id && (
                      <tr key={`detail-${p.id}`}>
                        <td colSpan={8} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 py-4 bg-slate-800/30 border-b border-slate-800 flex items-center gap-3 flex-wrap">
                              <Link to={`/proposals/${p.id}`} className="btn-primary btn-sm">
                                <EyeIcon className="h-4 w-4" /> View Full Proposal
                              </Link>
                              {p.status === 'DRAFT' && (
                                <button onClick={() => handleStatusChange(p.id, 'READY')}
                                  className="btn-secondary btn-sm">Mark Ready</button>
                              )}
                              {p.status === 'READY' && (
                                <button onClick={() => handleStatusChange(p.id, 'SENT')}
                                  className="btn-sm bg-purple-600/20 text-purple-400 border border-purple-500/20 hover:bg-purple-600/30">
                                  <PaperAirplaneIcon className="h-4 w-4" /> Send to Customer
                                </button>
                              )}
                              {['SENT', 'VIEWED'].includes(p.status) && (
                                <>
                                  <button onClick={() => handleStatusChange(p.id, 'ACCEPTED')}
                                    className="btn-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircleIcon className="h-4 w-4" /> Mark Accepted
                                  </button>
                                  <button onClick={() => handleStatusChange(p.id, 'DECLINED')}
                                    className="btn-sm bg-red-500/10 text-red-400 border border-red-500/20">
                                    <XMarkIcon className="h-4 w-4" /> Mark Declined
                                  </button>
                                </>
                              )}
                              {p.pdfStatus === 'READY' && p.pdfUrl && (
                                <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer"
                                  className="btn-secondary btn-sm">
                                  <ArrowDownTrayIcon className="h-4 w-4" /> Download PDF
                                </a>
                              )}
                              {p.lead && (
                                <Link to={`/leads/${p.lead.id}`} className="btn-secondary btn-sm ml-auto">
                                  Open Lead →
                                </Link>
                              )}
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
