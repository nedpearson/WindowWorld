import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon, CloudIcon,
  MapPinIcon, UserIcon, PhoneIcon, EnvelopeIcon,
  ChevronUpDownIcon, ArrowPathIcon, EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import { api } from '../../api/client';
import { useAuthStore, useAppStore } from '../../store/auth.store';
import clsx from 'clsx';

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
  NURTURE: 'badge-slate',
};

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

// ─── DEMO DATA (shown while API wires up) ─────────────────────
const DEMO_LEADS = [
  { id: '1', firstName: 'Michael', lastName: 'Trosclair', email: 'mtrosclair@hotmail.com', phone: '(225) 555-1003', address: '7824 Old Hammond Hwy', city: 'Baton Rouge', zip: '70809', parish: 'East Baton Rouge', status: 'VERBAL_COMMIT', leadScore: 91, urgencyScore: 88, isStormLead: true, estimatedRevenue: 14800, source: 'web', assignedRep: { firstName: 'Jake', lastName: 'Thibodaux' }, createdAt: '2026-04-01' },
  { id: '2', firstName: 'Patricia', lastName: 'Landry', email: 'patricia.landry@yahoo.com', phone: '(225) 555-1002', address: '312 Sherwood Forest Blvd', city: 'Baton Rouge', zip: '70815', parish: 'East Baton Rouge', status: 'PROPOSAL_SENT', leadScore: 85, urgencyScore: 68, isStormLead: false, estimatedRevenue: 9200, source: 'referral', assignedRep: { firstName: 'Jake', lastName: 'Thibodaux' }, createdAt: '2026-04-03' },
  { id: '3', firstName: 'Robert', lastName: 'Comeaux', email: 'rcomxeaux63@gmail.com', phone: '(225) 555-1001', address: '4521 Greenwell Springs Rd', city: 'Baton Rouge', zip: '70806', parish: 'East Baton Rouge', status: 'APPOINTMENT_SET', leadScore: 78, urgencyScore: 72, isStormLead: false, estimatedRevenue: 6500, source: 'door-knock', assignedRep: { firstName: 'Jake', lastName: 'Thibodaux' }, createdAt: '2026-04-05' },
  { id: '4', firstName: 'Angela', lastName: 'Mouton', email: 'amouton@gmail.com', phone: '(225) 555-2003', address: '226 Tupelo Dr', city: 'Prairieville', zip: '70769', parish: 'Ascension', status: 'MEASURING_COMPLETE', leadScore: 82, urgencyScore: 75, isStormLead: false, estimatedRevenue: 8900, source: 'referral', assignedRep: { firstName: 'Danielle', lastName: 'Arceneaux' }, createdAt: '2026-04-07' },
  { id: '5', firstName: 'Susan', lastName: 'Bourgeois', email: 'sbourgeois@att.net', phone: '(225) 555-1004', address: '2207 Jefferson Hwy', city: 'Baton Rouge', zip: '70809', parish: 'East Baton Rouge', status: 'NEW_LEAD', leadScore: 62, urgencyScore: 81, isStormLead: true, estimatedRevenue: 4200, source: 'storm-list', assignedRep: { firstName: 'Jake', lastName: 'Thibodaux' }, createdAt: '2026-04-10' },
  { id: '6', firstName: 'Karen', lastName: 'Guidry', email: 'karen.guidry@cox.net', phone: '(225) 555-2001', address: '1134 Range Ave', city: 'Denham Springs', zip: '70726', parish: 'Livingston', status: 'INSPECTION_COMPLETE', leadScore: 74, urgencyScore: 69, isStormLead: true, estimatedRevenue: 7800, source: 'neighborhood-canvass', assignedRep: { firstName: 'Danielle', lastName: 'Arceneaux' }, createdAt: '2026-04-08' },
  { id: '7', firstName: 'Carol', lastName: 'Chauvin', email: 'carolchauvin@gmail.com', phone: '(985) 555-4002', address: '1245 Gause Blvd', city: 'Slidell', zip: '70458', parish: 'St. Tammany', status: 'QUALIFIED', leadScore: 80, urgencyScore: 62, isStormLead: false, estimatedRevenue: 7400, source: 'referral', assignedRep: { firstName: 'Danielle', lastName: 'Arceneaux' }, createdAt: '2026-04-09' },
  { id: '8', firstName: 'James', lastName: 'Hebert', email: 'jhebert1959@gmail.com', phone: '(225) 555-1005', address: '5316 Perkins Rd', city: 'Baton Rouge', zip: '70808', parish: 'East Baton Rouge', status: 'SOLD', leadScore: 95, urgencyScore: 92, isStormLead: false, estimatedRevenue: 11600, source: 'referral', assignedRep: { firstName: 'Jake', lastName: 'Thibodaux' }, createdAt: '2026-03-15' },
  { id: '9', firstName: 'Louis', lastName: 'Badeaux', email: 'lbadeaux@cox.net', phone: '(504) 555-4001', address: '3312 Severn Ave', city: 'Metairie', zip: '70002', parish: 'Jefferson', status: 'ATTEMPTING_CONTACT', leadScore: 77, urgencyScore: 82, isStormLead: true, estimatedRevenue: 6800, source: 'storm-list', assignedRep: { firstName: 'Jake', lastName: 'Thibodaux' }, createdAt: '2026-04-12' },
  { id: '10', firstName: 'David', lastName: 'Trahan', email: 'dtrahan@bellsouth.net', phone: '(225) 555-2002', address: '8843 Burgess Ave', city: 'Denham Springs', zip: '70726', parish: 'Livingston', status: 'FOLLOW_UP', leadScore: 58, urgencyScore: 45, isStormLead: false, estimatedRevenue: 3600, source: 'web', assignedRep: { firstName: 'Danielle', lastName: 'Arceneaux' }, createdAt: '2026-04-04' },
  { id: '11', firstName: 'Brett', lastName: 'Fontenot', email: 'bfontenot@yahoo.com', phone: '(337) 555-3001', address: '4412 Johnston St', city: 'Lafayette', zip: '70503', parish: 'Lafayette', status: 'CONTACTED', leadScore: 65, urgencyScore: 55, isStormLead: false, estimatedRevenue: 5200, source: 'web', assignedRep: { firstName: 'Jake', lastName: 'Thibodaux' }, createdAt: '2026-04-11' },
  { id: '12', firstName: 'Monique', lastName: 'Robichaux', email: 'mrobichaux@cox.net', phone: '(225) 555-5002', address: '4319 Sullivan Rd', city: 'Central', zip: '70818', parish: 'East Baton Rouge', status: 'PAID', leadScore: 88, urgencyScore: 80, isStormLead: false, estimatedRevenue: 10400, source: 'referral', assignedRep: { firstName: 'Danielle', lastName: 'Arceneaux' }, createdAt: '2026-03-01' },
];

export function LeadsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const stormMode = useAppStore((s) => s.stormModeActive);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [parishFilter, setParishFilter] = useState('');
  const [stormFilter, setStormFilter] = useState(stormMode);
  const [sortBy, setSortBy] = useState<'leadScore' | 'urgencyScore' | 'createdAt' | 'estimatedRevenue'>('leadScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filter leads from demo data
  const filtered = DEMO_LEADS.filter((l) => {
    if (search && !`${l.firstName} ${l.lastName} ${l.email} ${l.phone} ${l.address}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && l.status !== statusFilter) return false;
    if (parishFilter && l.parish !== parishFilter) return false;
    if (stormFilter && !l.isStormLead) return false;
    return true;
  }).sort((a, b) => {
    const aVal = a[sortBy] ?? 0;
    const bVal = b[sortBy] ?? 0;
    return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const stormCount = DEMO_LEADS.filter(l => l.isStormLead).length;

  return (
    <div className="p-6 space-y-4 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">All Leads</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {filtered.length} leads · {DEMO_LEADS.filter(l => !['SOLD','LOST','PAID'].includes(l.status)).length} active
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
          onClick={() => { setSearch(''); setStatusFilter(''); setParishFilter(''); setStormFilter(false); }}
          className="btn-ghost btn-sm"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Reset
        </button>
      </div>

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
                    ${lead.estimatedRevenue.toLocaleString()}
                  </span>
                </td>

                <td>
                  <span className="text-xs text-slate-400">
                    {lead.assignedRep.firstName} {lead.assignedRep.lastName[0]}.
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

        {filtered.length === 0 && (
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
