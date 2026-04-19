import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  DocumentTextIcon, EyeIcon, PaperAirplaneIcon, CheckCircleIcon,
  ClockIcon, ExclamationCircleIcon, XMarkIcon, ChevronRightIcon,
  MagnifyingGlassIcon, FunnelIcon, CalendarIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

const PROPOSALS = [
  { id: 'p1', status: 'ACCEPTED', lead: { id: '1', name: 'Michael Trosclair', address: '7824 Old Hammond Hwy', city: 'Baton Rouge' }, grandTotal: 8840, totalWindows: 9, sentAt: '2026-04-16T14:00:00', viewedAt: '2026-04-16T14:38:00', acceptedAt: '2026-04-17T09:00:00', series: 'Series 4000', rep: 'Jake T.', viewCount: 3 },
  { id: 'p2', status: 'SENT', lead: { id: '2', name: 'Patricia Landry', address: '312 Sherwood Forest Dr', city: 'Baton Rouge' }, grandTotal: 5330, totalWindows: 5, sentAt: '2026-04-17T10:00:00', viewedAt: '2026-04-18T08:00:00', acceptedAt: null, series: 'Series 4000', rep: 'Jake T.', viewCount: 2 },
  { id: 'p3', status: 'VIEWED', lead: { id: '4', name: 'Angela Mouton', address: '226 Tupelo Dr', city: 'Prairieville' }, grandTotal: 7450, totalWindows: 7, sentAt: '2026-04-15T09:00:00', viewedAt: '2026-04-16T11:00:00', acceptedAt: null, series: 'Series 6000', rep: 'Danielle A.', viewCount: 4 },
  { id: 'p4', status: 'DRAFT', lead: { id: '5', name: 'Carol Chauvin', address: '1245 Gause Blvd', city: 'Slidell' }, grandTotal: 4810, totalWindows: 4, sentAt: null, viewedAt: null, acceptedAt: null, series: 'Series 3000', rep: 'Jake T.', viewCount: 0 },
  { id: 'p5', status: 'DECLINED', lead: { id: '7', name: 'Robert Comeaux', address: '4521 Greenwell Springs Rd', city: 'Baton Rouge' }, grandTotal: 6200, totalWindows: 6, sentAt: '2026-04-10T10:00:00', viewedAt: '2026-04-11T09:00:00', acceptedAt: null, series: 'Series 4000', rep: 'Jake T.', viewCount: 1 },
  { id: 'p6', status: 'SENT', lead: { id: '8', name: 'Louis Badeaux', address: '7024 Read Blvd', city: 'New Orleans' }, grandTotal: 12650, totalWindows: 14, sentAt: '2026-04-18T09:00:00', viewedAt: null, acceptedAt: null, series: 'Series 6000', rep: 'Danielle A.', viewCount: 0 },
];

const STATUS_FLOW = ['DRAFT', 'READY', 'SENT', 'VIEWED', 'ACCEPTED', 'CONTRACTED', 'DECLINED', 'ARCHIVED'];

const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-400', badge: 'badge-slate', icon: DocumentTextIcon },
  READY: { label: 'Ready', color: 'text-blue-400', badge: 'badge-blue', icon: CheckCircleIcon },
  SENT: { label: 'Sent', color: 'text-cyan-400', badge: 'badge-blue', icon: PaperAirplaneIcon },
  VIEWED: { label: 'Viewed', color: 'text-purple-400', badge: 'badge-purple', icon: EyeIcon },
  ACCEPTED: { label: 'Accepted', color: 'text-emerald-400', badge: 'badge-green', icon: CheckCircleIcon },
  CONTRACTED: { label: 'Contracted', color: 'text-emerald-500', badge: 'badge-green', icon: CheckCircleIcon },
  DECLINED: { label: 'Declined', color: 'text-red-400', badge: 'badge-red', icon: XMarkIcon },
  REVISED: { label: 'Revision', color: 'text-amber-400', badge: 'badge-yellow', icon: PencilIcon },
  ARCHIVED: { label: 'Archived', color: 'text-slate-600', badge: 'badge-slate', icon: DocumentTextIcon },
};

function PencilIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}

function RelativeTime({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span className="text-slate-600">—</span>;
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  const label = d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : 'Just now';
  return <span className="text-slate-500">{label}</span>;
}

export function ProposalsPage() {
  const [proposals, setProposals] = useState(PROPOSALS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = proposals.filter((p) => {
    const matchSearch = !search || p.lead.name.toLowerCase().includes(search.toLowerCase()) || p.lead.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const Pipeline = () => {
    const stages = STATUS_FLOW.slice(0, 6);
    const counts = stages.map((s) => proposals.filter((p) => p.status === s).length);
    const values = stages.map((s) => proposals.filter((p) => p.status === s).reduce((sum, p) => sum + p.grandTotal, 0));
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <BoltIcon className="h-4 w-4 text-brand-400" />
          <span className="text-sm font-semibold text-white">Proposal Pipeline</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {stages.map((s, i) => {
            const config = STATUS_CONFIG[s];
            const Icon = config.icon;
            return (
              <button key={s} onClick={() => setStatusFilter(s === statusFilter ? 'ALL' : s)}
                className={clsx('flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                  statusFilter === s ? 'border-brand-500/50 bg-brand-600/10' : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600')}>
                <Icon className={clsx('h-4 w-4', config.color)} />
                <div className="text-lg font-bold text-white">{counts[i]}</div>
                <div className="text-[10px] text-slate-500">{config.label}</div>
                <div className="text-[10px] text-slate-600">${values[i] > 0 ? (values[i] / 1000).toFixed(0) + 'K' : '—'}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Proposals</h1>
          <p className="text-slate-500 text-sm mt-0.5">{proposals.length} total · ${proposals.filter((p) => p.status === 'ACCEPTED').reduce((s, p) => s + p.grandTotal, 0).toLocaleString()} accepted</p>
        </div>
        <div className="flex gap-2">
          <Link to="/catalog" className="btn-secondary btn-sm">Product Catalog</Link>
          <Link to="/leads/1/quote" className="btn-primary btn-sm">
            <DocumentTextIcon className="h-4 w-4" /> New Quote
          </Link>
        </div>
      </div>

      <Pipeline />

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search proposals..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select w-40">
          <option value="ALL">All Statuses</option>
          {STATUS_FLOW.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
        </select>
      </div>

      {/* Proposals list */}
      <div className="space-y-2">
        {filtered.map((proposal) => {
          const config = STATUS_CONFIG[proposal.status] || STATUS_CONFIG['ARCHIVED'];
          const Icon = config.icon;

          return (
            <motion.div
              key={proposal.id}
              layout
              onClick={() => setSelectedId(selectedId === proposal.id ? null : proposal.id)}
              className="card p-4 cursor-pointer hover:border-slate-600/60 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    proposal.status === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-400' :
                    proposal.status === 'SENT' ? 'bg-cyan-500/15 text-cyan-400' :
                    proposal.status === 'VIEWED' ? 'bg-purple-500/15 text-purple-400' :
                    proposal.status === 'DECLINED' ? 'bg-red-500/15 text-red-400' :
                    'bg-slate-700 text-slate-400'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{proposal.lead.name}</span>
                      <span className={clsx('badge text-[10px]', config.badge)}>{config.label}</span>
                      {proposal.viewCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-purple-400">
                          <EyeIcon className="h-3 w-3" /> {proposal.viewCount} views
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{proposal.lead.city} · {proposal.series} · {proposal.rep}</div>
                  </div>
                </div>

                <div className="flex items-start gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-white">${proposal.grandTotal.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{proposal.totalWindows} windows</div>
                  </div>
                  <div className="text-right text-xs">
                    {proposal.sentAt && <div className="text-slate-500"><span className="text-slate-600">Sent </span><RelativeTime dateStr={proposal.sentAt} /></div>}
                    {proposal.acceptedAt && <div className="text-emerald-400 mt-0.5"><span className="text-emerald-600">Accepted </span><RelativeTime dateStr={proposal.acceptedAt} /></div>}
                  </div>
                  <ChevronRightIcon className={clsx('h-4 w-4 text-slate-600 transition-transform mt-1', selectedId === proposal.id && 'rotate-90')} />
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {selectedId === proposal.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-slate-700/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div><div className="text-xs text-slate-500">Total</div><div className="text-sm font-bold text-white">${proposal.grandTotal.toLocaleString()}</div></div>
                      <div><div className="text-xs text-slate-500">Windows</div><div className="text-sm font-bold text-white">{proposal.totalWindows}</div></div>
                      <div><div className="text-xs text-slate-500">Sent</div><div className="text-sm text-slate-300">{proposal.sentAt ? new Date(proposal.sentAt).toLocaleDateString() : '—'}</div></div>
                      <div><div className="text-xs text-slate-500">Views</div><div className="text-sm text-slate-300">{proposal.viewCount}</div></div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Link to={`/proposals/${proposal.id}`} className="btn-secondary btn-sm">View Full Proposal</Link>
                      {proposal.status === 'DRAFT' && <button className="btn-primary btn-sm" onClick={() => { toast.success('Proposal sent!'); setSelectedId(null); }}><PaperAirplaneIcon className="h-3.5 w-3.5" /> Send</button>}
                      {proposal.status === 'SENT' && <button className="btn-secondary btn-sm" onClick={() => toast.info('Reminder sent!')}>Send Reminder</button>}
                      {proposal.status === 'ACCEPTED' && <Link to="/invoices" className="btn-success btn-sm"><CheckCircleIcon className="h-3.5 w-3.5" /> Create Invoice</Link>}
                      {proposal.status === 'DECLINED' && <button className="btn-secondary btn-sm" onClick={() => toast.info('Revision queued')}>Revise &amp; Resend</button>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card p-10 text-center">
            <DocumentTextIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No proposals match your filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
