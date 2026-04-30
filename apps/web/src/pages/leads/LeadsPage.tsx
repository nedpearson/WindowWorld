import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusIcon, MagnifyingGlassIcon, CloudIcon,
  MapPinIcon,
  ChevronUpDownIcon, ArrowPathIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import { api } from '../../api/client';
import { useAppStore } from '../../store/auth.store';
import clsx from 'clsx';
import { FollowUpEngine } from '../../components/ai/FollowUpEngine';

// ─── Status config ────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  NEW_LEAD: 'badge-slate',
  ATTEMPTING_CONTACT: 'badge-yellow',
  CONTACTED: 'badge-blue',
  QUALIFIED: 'badge-blue',
  APPOINTMENT_SET: 'badge-blue',
  INSPECTION_COMPLETE: 'badge-blue',
  MEASURING_COMPLETE: 'badge-blue',
  PROPOSAL_SENT: 'badge-purple',
  FOLLOW_UP: 'badge-yellow',
  VERBAL_COMMIT: 'badge-green',
  SOLD: 'badge-green',
  AWAITING_VERIFICATION: 'badge-yellow',
  ORDER_READY: 'badge-green',
  ORDERED: 'badge-green',
  INSTALLED: 'badge-green',
  PAID: 'badge-green',
  LOST: 'badge-red',
  NURTURE: 'badge-slate' };

const ALL_STATUSES = [
  'NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED',
  'APPOINTMENT_SET', 'INSPECTION_COMPLETE', 'MEASURING_COMPLETE',
  'PROPOSAL_SENT', 'FOLLOW_UP', 'VERBAL_COMMIT', 'SOLD',
  'LOST', 'NURTURE',
];

const LOUISIANA_PARISHES = [
  'East Baton Rouge', 'West Baton Rouge', 'Livingston', 'Ascension',
  'Lafayette', 'Jefferson', 'St. Tammany', 'Caddo', 'Orleans',
  'St. Bernard', 'St. Martin', 'Iberia',
];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-brand-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400">{score}</span>
    </div>
  );
}

function leadAge(createdAt: string): { days: number; badge: string; color: string } {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days <= 3)  return { days, badge: `${days}d`, color: 'text-emerald-400' };
  if (days <= 10) return { days, badge: `${days}d`, color: 'text-amber-400' };
  return { days, badge: `${days}d`, color: 'text-red-400 font-semibold' };
}

export function LeadsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stormMode = useAppStore((s) => s.stormModeActive);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [parishFilter, setParishFilter] = useState('');
  const [stormFilter, setStormFilter] = useState(stormMode);
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') || '');
  const [sortBy, setSortBy] = useState<'leadScore' | 'urgencyScore' | 'createdAt' | 'estimatedRevenue'>('leadScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [, setShowFilters] = useState(false);

  // Real-time lead list from server — all filters passed as query params
  const { data: leadsResp, isLoading, isFetching } = useQuery({
    queryKey: ['leads', { search, statusFilter, parishFilter, stormFilter, sourceFilter, sortBy, sortDir, page }],
    queryFn: () => api.leads.list({
      search: search || undefined,
      status: statusFilter || undefined,
      parish: parishFilter || undefined,
      isStormLead: stormFilter || undefined,
      source: sourceFilter || undefined,
      sortBy,
      sortDir,
      page,
      limit: 50 }),
    placeholderData: (prev) => prev,
    staleTime: 30_000 });

  const leads: any[] = (leadsResp as any)?.data || [];
  const meta = (leadsResp as any)?.meta || { total: 0 };

  const filtered = leads; // server-side filtered
  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };
  const stormCount = meta.total; // shown in storm-mode badge

  return (
    <div className="p-6 space-y-4 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">All Leads</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {meta.total.toLocaleString()} leads
            {isFetching && <span className="ml-2 text-brand-400 text-xs">Refreshing…</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/map" className="btn-secondary btn-sm">
            <MapPinIcon className="h-4 w-4" />
            Map View
          </Link>
          <Link to="/pipeline" className="btn-secondary btn-sm">
            Pipeline
          </Link>
          <Link to="/leads/import" className="btn-secondary btn-sm flex items-center gap-1.5">
            <ArrowPathIcon className="h-4 w-4" /> Import CSV
          </Link>
          <Link to="/leads/new" className="btn-primary btn-sm">
            <PlusIcon className="h-4 w-4" />
            New Lead
          </Link>
        </div>
      </div>

      {/* Storm banner */}
      {stormCount > 0 && (
        <button
          onClick={() => setStormFilter(!stormFilter)}
          className={clsx(
            'flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg border text-sm font-medium transition-all',
            stormFilter
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
              : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:border-purple-500/30 hover:text-purple-300'
          )}
        >
          <CloudIcon className="h-4 w-4" />
          <span>{stormCount} storm-affected leads in territory</span>
          <span className={clsx('ml-auto text-xs px-2 py-0.5 rounded-full', stormFilter ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400')}>
            {stormFilter ? 'Showing storm leads only' : 'Show storm leads'}
          </span>
        </button>
      )}

      {/* Search + Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, address..."
            className="input pl-10"
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select w-44">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select value={parishFilter} onChange={(e) => setParishFilter(e.target.value)} className="select w-48">
          <option value="">All parishes</option>
          {LOUISIANA_PARISHES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <button
          onClick={() => { setSearch(''); setStatusFilter(''); setParishFilter(''); setStormFilter(false); setSourceFilter(''); }}
          className="btn-ghost btn-sm"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Reset
        </button>
      </div>

      {/* Follow Up Engine */}
      <FollowUpEngine />

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <th>Lead</th>
              <th>Parish / City</th>
              <th>Status</th>
              <th>
                <button onClick={() => toggleSort('leadScore')} className="flex items-center gap-1 hover:text-slate-300">
                  Lead Score <ChevronUpDownIcon className="h-3.5 w-3.5" />
                </button>
              </th>
              <th>
                <button onClick={() => toggleSort('urgencyScore')} className="flex items-center gap-1 hover:text-slate-300">
                  Urgency <ChevronUpDownIcon className="h-3.5 w-3.5" />
                </button>
              </th>
              <th>
                <button onClick={() => toggleSort('estimatedRevenue')} className="flex items-center gap-1 hover:text-slate-300">
                  Est. Value <ChevronUpDownIcon className="h-3.5 w-3.5" />
                </button>
              </th>
              <th>Rep</th>
              <th>Source</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, i) => (
              <motion.tr
                key={lead.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="cursor-pointer"
              >
                <td className="text-slate-600 text-xs font-mono pl-5">{i + 1}</td>

                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {lead.firstName[0]}{lead.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-100">
                          {lead.firstName} {lead.lastName}
                        </span>
                        {lead.isStormLead && (
                          <span className="badge-storm text-[9px] py-0">
                            <CloudIcon className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <span className={clsx('text-[9px] font-mono ml-0.5', leadAge(lead.createdAt).color)}>
                          {leadAge(lead.createdAt).badge}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[180px]">
                        {lead.address}
                      </div>
                    </div>
                  </div>
                </td>

                <td>
                  <div className="text-xs text-slate-300">{lead.parish}</div>
                  <div className="text-[11px] text-slate-600">{lead.city}, {lead.zip}</div>
                </td>

                <td>
                  <span className={`badge text-[10px] ${STATUS_COLOR[lead.status] || 'badge-slate'}`}>
                    {lead.status.replace(/_/g, ' ')}
                  </span>
                </td>

                <td><ScoreBar score={lead.leadScore} /></td>
                <td><ScoreBar score={lead.urgencyScore} /></td>

                <td>
                  <span className="text-sm font-semibold text-slate-200">
                    ${(lead.estimatedValue || lead.estimatedRevenue || 0).toLocaleString()}
                  </span>
                </td>

                <td>
                  <span className="text-xs text-slate-400">
                    {lead.assignedRep ? `${lead.assignedRep.firstName} ${lead.assignedRep.lastName[0]}.` : '—'}
                  </span>
                </td>

                <td>
                  <span className="text-xs text-slate-600 capitalize">{lead.source?.replace(/-/g, ' ')}</span>
                </td>

                <td>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="btn-icon text-slate-600 hover:text-slate-300"
                  >
                    <EllipsisHorizontalIcon className="h-4 w-4" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <tbody>{[...Array(6)].map((_, i) => (
            <tr key={i}>{[...Array(8)].map((_, j) => (
              <td key={j} className="px-4 py-3">
                <div className="h-4 bg-slate-800 rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
              </td>
            ))}</tr>
          ))}</tbody>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-500">No leads match your filters.</p>
            <button onClick={() => { setSearch(''); setStatusFilter(''); setParishFilter(''); setStormFilter(false); }} className="btn-ghost btn-sm mt-3">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{filtered.length} leads shown</span>
        <div className="flex items-center gap-1">
          <BoltIcon className="h-3 w-3 text-brand-500" />
          <span>Sorted by {sortBy.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}
