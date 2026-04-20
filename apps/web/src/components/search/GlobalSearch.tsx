import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon, XMarkIcon, UsersIcon, DocumentTextIcon,
  BanknotesIcon, CalendarIcon, ClockIcon, ArrowRightIcon,
  BoltIcon, HomeIcon, ChartBarIcon, PhoneIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ─── Search data ───────────────────────────────────────────
interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'proposal' | 'invoice' | 'page';
  title: string;
  subtitle: string;
  path: string;
  badge?: string;
  badgeColor?: string;
}

const SEARCH_INDEX: SearchResult[] = [
  // Leads
  { id: 'l1', type: 'lead', title: 'Michael Trosclair', subtitle: '7824 Old Hammond Hwy, Baton Rouge · VERBAL COMMIT · $14,800', path: '/leads/1', badge: 'Lead', badgeColor: 'text-blue-400' },
  { id: 'l2', type: 'lead', title: 'Patricia Landry', subtitle: '312 Sherwood Forest Blvd, Baton Rouge · PROPOSAL SENT · $9,200', path: '/leads/2', badge: 'Lead', badgeColor: 'text-blue-400' },
  { id: 'l3', type: 'lead', title: 'Robert Comeaux', subtitle: '4521 Greenwell Springs Rd, Baton Rouge · APPOINTMENT SET · $6,500', path: '/leads/3', badge: 'Lead', badgeColor: 'text-blue-400' },
  { id: 'l4', type: 'lead', title: 'Angela Mouton', subtitle: '226 Tupelo Dr, Prairieville · MEASURING COMPLETE · $8,900', path: '/leads/4', badge: 'Lead', badgeColor: 'text-blue-400' },
  { id: 'l5', type: 'lead', title: 'Karen Guidry', subtitle: '1134 Range Ave, Denham Springs · INSPECTION COMPLETE · $7,800', path: '/leads/6', badge: 'Lead', badgeColor: 'text-blue-400' },
  { id: 'l6', type: 'lead', title: 'Susan Bourgeois', subtitle: '2207 Jefferson Hwy, Baton Rouge · NEW LEAD · $4,200 · Storm', path: '/leads/5', badge: 'Storm', badgeColor: 'text-purple-400' },
  { id: 'l7', type: 'lead', title: 'Carol Chauvin', subtitle: '1245 Gause Blvd, Slidell · QUALIFIED · $7,400', path: '/leads/7', badge: 'Lead', badgeColor: 'text-blue-400' },
  { id: 'l8', type: 'lead', title: 'James Hebert', subtitle: '5316 Perkins Rd, Baton Rouge · SOLD · $11,600', path: '/leads/8', badge: 'Lead', badgeColor: 'text-blue-400' },
  // Contacts
  { id: 'c1', type: 'contact', title: 'Jennifer Trosclair', subtitle: '(225) 555-1099 · Spouse of Michael Trosclair', path: '/contacts', badge: 'Contact', badgeColor: 'text-purple-400' },
  { id: 'c2', type: 'contact', title: 'Gary Landry', subtitle: '(225) 555-2049 · Spouse of Patricia Landry', path: '/contacts', badge: 'Contact', badgeColor: 'text-purple-400' },
  // Proposals
  { id: 'p1', type: 'proposal', title: 'Full Home Window Replacement — Robert Comeaux', subtitle: '$14,750 · Series 3000 · SENT · Viewed 3×', path: '/proposals/p1', badge: 'Proposal', badgeColor: 'text-violet-400' },
  { id: 'p2', type: 'proposal', title: 'Storm Replacement — Michael Trosclair', subtitle: '$22,400 · Series 4000 · ACCEPTED', path: '/proposals/p2', badge: 'Proposal', badgeColor: 'text-emerald-400' },
  { id: 'p3', type: 'proposal', title: 'Series 4000 — Karen Guidry', subtitle: '$8,200 · DRAFT', path: '/proposals/p3', badge: 'Proposal', badgeColor: 'text-violet-400' },
  // Invoices
  { id: 'i1', type: 'invoice', title: 'INV-2024-041 — Angela Mouton', subtitle: '$5,900 · Deposit Paid · Balance $4,300', path: '/invoices', badge: 'Invoice', badgeColor: 'text-emerald-400' },
  { id: 'i2', type: 'invoice', title: 'INV-2024-038 — Robert Comeaux', subtitle: '$14,750 · OVERDUE 12 days', path: '/invoices', badge: 'Overdue', badgeColor: 'text-red-400' },
  // Pages
  { id: 'pg1', type: 'page', title: 'Dashboard', subtitle: 'Today\'s action queue and goal progress', path: '/dashboard', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg2', type: 'page', title: 'Appointments', subtitle: 'Upcoming schedule and route calendar', path: '/appointments', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg3', type: 'page', title: 'Analytics', subtitle: 'Revenue trends and rep performance', path: '/analytics', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg4', type: 'page', title: 'Install Schedule', subtitle: 'Crew assignments and install calendar', path: '/installs', badge: 'Page', badgeColor: 'text-slate-400' },
  { id: 'pg5', type: 'page', title: 'Quick Quote', subtitle: 'Fast ballpark estimate tool', path: '/quick-quote', badge: 'Page', badgeColor: 'text-slate-400' },
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

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length >= 1
    ? SEARCH_INDEX.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    setQuery('');
    setSelected(0);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      const items = results.length ? results : [];
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && items[selected]) { handleSelect(items[selected].path); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selected, handleSelect, onClose]);

  // Global ⌘K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }}
                className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none text-base"
                placeholder="Search leads, contacts, proposals..." />
              {query && (
                <button onClick={() => setQuery('')} className="text-slate-600 hover:text-slate-400">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
              <kbd className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-700">ESC</kbd>
            </div>

            {/* Results */}
            {query ? (
              <div className="max-h-80 overflow-y-auto">
                {results.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No results for "{query}"</div>
                ) : (
                  results.map((r, i) => {
                    const Icon = TYPE_ICONS[r.type] || HomeIcon;
                    return (
                      <button key={r.id} onClick={() => handleSelect(r.path)}
                        className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          selected === i ? 'bg-brand-600/15' : 'hover:bg-slate-800/50')}>
                        <div className={clsx('w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0')}>
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
                  })
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
