import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  MagnifyingGlassIcon, PhoneIcon, EnvelopeIcon,
  ChatBubbleLeftIcon, PlusIcon, UserIcon,
  HomeIcon, UsersIcon, StarIcon,
  FunnelIcon, ArrowUpDownIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role: 'PRIMARY' | 'SPOUSE' | 'PROPERTY_MANAGER' | 'REFERRAL' | 'OTHER';
  phone?: string;
  email?: string;
  notes?: string;
  leadId: string;
  leadName: string;
  leadStatus: string;
  leadValue?: number;
  isPrimary: boolean;
  isStarred?: boolean;
}

// ─── Demo data ────────────────────────────────────────────
const DEMO_CONTACTS: Contact[] = [
  { id: 'c1', firstName: 'Patricia', lastName: 'Landry', role: 'PRIMARY', phone: '(225) 555-2048', email: 'patricia.landry@gmail.com', leadId: '2', leadName: 'Patricia Landry', leadStatus: 'PROPOSAL_SENT', leadValue: 9200, isPrimary: true, isStarred: true, notes: 'Decision maker. Responds best to email. Works from home Tue/Thu.' },
  { id: 'c2', firstName: 'Gary', lastName: 'Landry', role: 'SPOUSE', phone: '(225) 555-2049', leadId: '2', leadName: 'Patricia Landry', leadStatus: 'PROPOSAL_SENT', isPrimary: false, notes: 'Handles finances. Must be in room for contract signing.' },
  { id: 'c3', firstName: 'Michael', lastName: 'Trosclair', role: 'PRIMARY', phone: '(225) 555-1003', email: 'michael.t@outlook.com', leadId: '1', leadName: 'Michael Trosclair', leadStatus: 'VERBAL_COMMIT', leadValue: 22400, isPrimary: true, isStarred: true },
  { id: 'c4', firstName: 'Jennifer', lastName: 'Trosclair', role: 'SPOUSE', phone: '(225) 555-1004', leadId: '1', leadName: 'Michael Trosclair', leadStatus: 'VERBAL_COMMIT', isPrimary: false, notes: 'Prefers monthly payment framing. Sits in on all calls.' },
  { id: 'c5', firstName: 'Robert', lastName: 'Comeaux', role: 'PRIMARY', phone: '(225) 555-0021', email: 'rcomeaux@yahoo.com', leadId: '3', leadName: 'Robert Comeaux', leadStatus: 'APPOINTMENT_SET', leadValue: 14750, isPrimary: true },
  { id: 'c6', firstName: 'Angela', lastName: 'Mouton', role: 'PRIMARY', phone: '(225) 555-4413', email: 'angela.mouton@gmail.com', leadId: '4', leadName: 'Angela Mouton', leadStatus: 'MEASURING_COMPLETE', leadValue: 5900, isPrimary: true },
  { id: 'c7', firstName: 'Karen', lastName: 'Guidry', role: 'PRIMARY', phone: '(225) 555-7723', leadId: '6', leadName: 'Karen Guidry', leadStatus: 'APPOINTMENT_SET', leadValue: 8200, isPrimary: true },
  { id: 'c8', firstName: 'Susan', lastName: 'Bourgeois', role: 'PRIMARY', phone: '(225) 555-3102', email: 's.bourgeois@gmail.com', leadId: '3b', leadName: 'Susan Bourgeois', leadStatus: 'NEW_LEAD', leadValue: 4200, isPrimary: true },
  { id: 'c9', firstName: 'James', lastName: 'Fontenot', role: 'PRIMARY', phone: '(225) 555-6671', leadId: '7', leadName: 'James Fontenot', leadStatus: 'QUALIFIED', leadValue: 8400, isPrimary: true, notes: 'Follow-up overdue 5 days. Best time: mornings.' },
  { id: 'c10', firstName: 'Carol', lastName: 'Chauvin', role: 'PRIMARY', phone: '(225) 555-5560', email: 'cchauvin@bellsouth.net', leadId: '6a', leadName: 'Carol Chauvin', leadStatus: 'FOLLOW_UP', leadValue: 7400, isPrimary: true },
  { id: 'c11', firstName: 'Tom', lastName: 'Bergeron', role: 'PRIMARY', phone: '(225) 555-8834', leadId: '5', leadName: 'Tom Bergeron', leadStatus: 'PROPOSAL_SENT', leadValue: 6800, isPrimary: true },
  { id: 'c12', firstName: 'Mark', lastName: 'Hebert', role: 'PRIMARY', phone: '(225) 555-9921', email: 'mark.hebert@icloud.com', leadId: '8', leadName: 'Mark Hebert', leadStatus: 'PROPOSAL_SENT', leadValue: 12100, isPrimary: true, isStarred: true },
];

const ROLE_CONFIG: Record<string, { label: string; class: string }> = {
  PRIMARY:          { label: 'Primary',  class: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
  SPOUSE:           { label: 'Spouse',   class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  PROPERTY_MANAGER: { label: 'Manager',  class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  REFERRAL:         { label: 'Referral', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  OTHER:            { label: 'Other',    class: 'bg-slate-700 text-slate-400 border-slate-600' },
};

const STATUS_LABELS: Record<string, string> = {
  NEW_LEAD: 'New Lead', ATTEMPTING_CONTACT: 'Contacting', CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified', APPOINTMENT_SET: 'Appt Set', MEASURING_COMPLETE: 'Measured',
  PROPOSAL_SENT: 'Proposal Sent', FOLLOW_UP: 'Follow-Up', VERBAL_COMMIT: 'Verbal Commit',
  SOLD: 'Sold',
};

function ContactCard({ contact, onStar }: { contact: Contact; onStar: (id: string) => void }) {
  const roleCfg = ROLE_CONFIG[contact.role];
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="card p-4 hover:border-slate-700 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600/40 to-slate-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
          {contact.firstName[0]}{contact.lastName[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{contact.firstName} {contact.lastName}</span>
            <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full border font-medium', roleCfg.class)}>
              {roleCfg.label}
            </span>
          </div>

          {/* Lead link */}
          <Link to={`/leads/${contact.leadId}`}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-0.5 block truncate">
            ↗ {contact.leadName} · <span className="text-slate-500">{STATUS_LABELS[contact.leadStatus] || contact.leadStatus}</span>
            {contact.leadValue && <span className="text-emerald-400 ml-1">${contact.leadValue.toLocaleString()}</span>}
          </Link>

          {contact.notes && (
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">{contact.notes}</p>
          )}
        </div>

        <button onClick={() => onStar(contact.id)} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {contact.isStarred
            ? <StarSolid className="h-4 w-4 text-amber-400" />
            : <StarIcon className="h-4 w-4 text-slate-600" />}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/50">
        {contact.phone && (
          <>
            <a href={`tel:${contact.phone}`} className="btn-sm btn-primary flex items-center gap-1.5 flex-1 justify-center text-xs">
              <PhoneIcon className="h-3.5 w-3.5" /> {contact.phone}
            </a>
            <a href={`sms:${contact.phone}`} className="btn-sm btn-secondary flex items-center gap-1 px-2.5">
              <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
            </a>
          </>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="btn-sm btn-secondary flex items-center gap-1 px-2.5">
            <EnvelopeIcon className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function ContactsPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'status'>('name');
  const [contacts, setContacts] = useState<Contact[]>(DEMO_CONTACTS);

  const toggleStar = (id: string) => setContacts(prev => prev.map(c => c.id === id ? { ...c, isStarred: !c.isStarred } : c));

  const filtered = useMemo(() => {
    let list = contacts;
    const q = search.toLowerCase();
    if (q) list = list.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.leadName.toLowerCase().includes(q)
    );
    if (roleFilter) list = list.filter(c => c.role === roleFilter);
    list = [...list].sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      if (sortBy === 'name') return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
      if (sortBy === 'value') return (b.leadValue || 0) - (a.leadValue || 0);
      return 0;
    });
    return list;
  }, [contacts, search, roleFilter, sortBy]);

  const totalWithPhone = contacts.filter(c => c.phone).length;
  const starred = contacts.filter(c => c.isStarred).length;

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Contacts</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {contacts.length} contacts · {totalWithPhone} with phone · {starred} starred
          </p>
        </div>
        <button onClick={() => toast.info('Add contact from a Lead Detail page → Contacts section')}
          className="btn-primary btn-sm flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> Add Contact
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Primary Contacts', value: contacts.filter(c => c.role === 'PRIMARY').length, icon: UserIcon, color: 'text-brand-400' },
          { label: 'Spouses / Co-decision', value: contacts.filter(c => c.role === 'SPOUSE').length, icon: UsersIcon, color: 'text-purple-400' },
          { label: 'Starred', value: starred, icon: StarSolid, color: 'text-amber-400' },
          { label: 'Total Pipeline', value: `$${(contacts.filter(c => c.isPrimary).reduce((s, c) => s + (c.leadValue || 0), 0) / 1000).toFixed(0)}K`, icon: HomeIcon, color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <s.icon className={clsx('h-5 w-5 flex-shrink-0', s.color)} />
            <div>
              <div className={clsx('text-xl font-bold', s.color)}>{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, email..." className="input pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['', 'PRIMARY', 'SPOUSE', 'PROPERTY_MANAGER', 'REFERRAL'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={clsx('btn-sm text-xs', roleFilter === r ? 'btn-primary' : 'btn-secondary')}>
              {r ? ROLE_CONFIG[r]?.label : 'All Roles'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDownIcon className="h-3.5 w-3.5 text-slate-500" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300">
            <option value="name">Sort: Name</option>
            <option value="value">Sort: Value</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <UserIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium text-sm">No contacts found</p>
          <p className="text-slate-500 text-xs mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <ContactCard key={c.id} contact={c} onStar={toggleStar} />
          ))}
        </div>
      )}
    </div>
  );
}
