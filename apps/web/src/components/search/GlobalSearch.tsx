import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon, XMarkIcon, UsersIcon, DocumentTextIcon,
  BanknotesIcon, CalendarIcon, ClockIcon, ArrowRightIcon,
  HomeIcon, ChartBarIcon, PhoneIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid } from '@heroicons/react/24/solid';
import { api } from '../../api/client';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────
interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'proposal' | 'invoice' | 'page';
  title: string;
  subtitle: string;
  path: string;
  badge?: string;
  badgeColor?: string;
}

// Static navigation pages always visible in quick actions
const PAGE_INDEX: SearchResult[] = [
  { id: 'pg1', type: 'page', title: 'Dashboard',        subtitle: "Today's action queue and goal progress", path: '/dashboard', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg2', type: 'page', title: 'Appointments',     subtitle: 'Upcoming schedule and route calendar',  path: '/appointments', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg3', type: 'page', title: 'Analytics',        subtitle: 'Revenue trends and rep performance',    path: '/analytics', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg4', type: 'page', title: 'Install Schedule', subtitle: 'Crew assignments and install calendar', path: '/installs', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg5', type: 'page', title: 'Quick Quote',      subtitle: 'Fast ballpark estimate tool',           path: '/quick-quote', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg6', type: 'page', title: 'All Proposals',   subtitle: 'View and manage proposals',            path: '/proposals', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg7', type: 'page', title: 'Invoices',         subtitle: 'Track payments and outstanding balances', path: '/invoices', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg8', type: 'page', title: 'Contacts',         subtitle: 'All homeowner contacts',               path: '/contacts', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg9', type: 'page', title: 'CSV Import',       subtitle: 'Bulk import leads from spreadsheet',   path: '/leads/import', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg10', type: 'page', title: 'Commissions',     subtitle: 'Rep commission tracker',               path: '/commissions', badge: 'Page', badgeColor: 'text-slate-400' },
];

const QUICK_ACTIONS = [
  { label: 'New Lead',         path: '/leads/new',    icon: UsersIcon,       color: 'text-blue-400' },
  { label: 'Quick Quote',      path: '/quick-quote',  icon: BoltSolid,       color: 'text-amber-400' },
  { label: 'Appointments',     path: '/appointments', icon: CalendarIcon,    color: 'text-cyan-400' },
  { label: 'All Proposals',    path: '/proposals',    icon: DocumentTextIcon,color: 'text-violet-400' },
  { label: 'Install Schedule', path: '/installs',     icon: ClockIcon,       color: 'text-orange-400' },
  { label: 'Analytics',        path: '/analytics',    icon: ChartBarIcon,    color: 'text-emerald-400' },
];

const TYPE_ICONS: Record<string, any> = {
  lead: UsersIcon, contact: PhoneIcon, proposal: DocumentTextIcon,
  invoice: BanknotesIcon, page: HomeIcon,
};

const STATUS_LABELS: Record<string, string> = {
  NEW_LEAD: 'New', ATTEMPTING_CONTACT: 'Contacting', CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified', APPOINTMENT_SET: 'Appt Set', MEASURING_COMPLETE: 'Measured',
  INSPECTION_COMPLETE: 'Inspected', PROPOSAL_SENT: 'Proposal Sent', FOLLOW_UP: 'Follow-Up',
  VERBAL_COMMIT: 'Verbal Commit', ORDER_SUBMITTED: 'Order In', IN_PRODUCTION: 'In Production',
  INSTALLED: 'Installed', SOLD: 'Sold', LOST: 'Lost',
};

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce: 220ms after last keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 220);
    return () => clearTimeout(t);
  }, [query]);

  // ─── Real API: search leads (name, phone, address, email)
  const { data: leadsData, isFetching: leadsLoading } = useQuery({
    queryKey: ['global-search-leads', debouncedQuery],
    queryFn: () => api.leads.search(debouncedQuery, 8),
    enabled: debouncedQuery.length >= 2,
    staleTime: 15_000,
  });

  // ─── Map API leads → SearchResult
  const leadResults: SearchResult[] = (leadsData?.data || []).map((l: any) => ({
    id: `lead-${l.id}`,
    type: 'lead' as const,
    title: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Unnamed Lead',
    subtitle: [
      l.address && `${l.address}, ${l.city || ''}`,
      STATUS_LABELS[l.status] || l.status,
      l.estimatedValue && `$${Number(l.estimatedValue).toLocaleString()}`,
    ].filter(Boolean).join(' · '),
    path: `/leads/${l.id}`,
    badge: l.isStormLead ? 'Storm' : 'Lead',
    badgeColor: l.isStormLead ? 'text-purple-400' : 'text-blue-400',
  }));

  // ─── Filter static pages matching query
  const pageResults: SearchResult[] = debouncedQuery.length >= 2
    ? PAGE_INDEX.filter(p =>
        p.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        p.subtitle.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    : [];

  const results: SearchResult[] = [...leadResults, ...pageResults].slice(0, 10);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    setQuery('');
    setDebouncedQuery('');
    setSelected(0);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery(''); setDebouncedQuery(''); setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[selected]) { handleSelect(results[selected].path); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selected, handleSelect, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const showLoading = leadsLoading && debouncedQuery.length >= 2;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />

          <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }} transition={{ duration: 0.15 }}
            className="fixed top-[12vh] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
              <MagnifyingGlassIcon className={clsx('h-5 w-5 flex-shrink-0', showLoading ? 'text-brand-400 animate-pulse' : 'text-slate-400')} />
              <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }}
                className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none text-base"
                placeholder="Search leads, contacts, pages..." />
              {query && (
                <button onClick={() => { setQuery(''); setDebouncedQuery(''); }} className="text-slate-600 hover:text-slate-400">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
              <kbd className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-700">ESC</kbd>
            </div>

            {/* Results */}
            {query ? (
              <div className="max-h-80 overflow-y-auto">
                {showLoading ? (
                  <div className="py-8 text-center">
                    <div className="text-xs text-slate-500 animate-pulse">Searching...</div>
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="text-sm text-slate-500">No results for "{query}"</div>
                    <div className="text-xs text-slate-700 mt-1">Try searching by name, address, or phone</div>
                  </div>
                ) : (
                  <>
                    {results.map((r, i) => {
                      const Icon = TYPE_ICONS[r.type] || HomeIcon;
                      return (
                        <button key={r.id} onClick={() => handleSelect(r.path)}
                          className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                            selected === i ? 'bg-brand-600/15' : 'hover:bg-slate-800/50')}>
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <Icon className={clsx('h-4 w-4', r.badgeColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{r.title}</div>
                            <div className="text-[11px] text-slate-500 truncate">{r.subtitle}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={clsx('text-[9px] font-medium', r.badgeColor)}>{r.badge}</span>
                            <ArrowRightIcon className="h-3 w-3 text-slate-700" />
                          </div>
                        </button>
                      );
                    })}
                    {leadResults.length > 0 && (
                      <button onClick={() => handleSelect(`/leads?search=${encodeURIComponent(query)}`)}
                        className="w-full px-4 py-2.5 text-xs text-brand-400 hover:text-brand-300 hover:bg-slate-800/30 transition-colors text-center border-t border-slate-800">
                        View all leads matching "{query}" →
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Quick actions */
              <div className="p-3">
                <div className="text-[10px] text-slate-600 uppercase tracking-widest px-2 mb-2 font-semibold">Quick Actions</div>
                <div className="grid grid-cols-2 gap-1">
                  {QUICK_ACTIONS.map((a) => (
                    <button key={a.path} onClick={() => handleSelect(a.path)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-left group">
                      <a.icon className={clsx('h-4 w-4', a.color)} />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{a.label}</span>
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-700 text-center mt-3">↑↓ navigate · Enter select · Esc close</div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
