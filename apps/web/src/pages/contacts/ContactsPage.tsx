import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@headlessui/react';
import {
  MagnifyingGlassIcon, PhoneIcon, EnvelopeIcon,
  ChatBubbleLeftIcon, PlusIcon, UserIcon,
  HomeIcon, UsersIcon, StarIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { api } from '../../api/client';

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

// Map server contact (with nested `lead`) → our Contact interface
function mapContact(c: any): Contact {
  const isSpouse = c.isSpouse;
  const isManager = c.notes?.toLowerCase().includes('manager') || c.role === 'PROPERTY_MANAGER';
  let role: Contact['role'] = 'PRIMARY';
  if (isSpouse) role = 'SPOUSE';
  else if (isManager) role = 'PROPERTY_MANAGER';
  else if (c.isOwner === false) role = 'OTHER';

  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    role,
    phone: c.phone || undefined,
    email: c.email || undefined,
    notes: c.notes || undefined,
    leadId: c.leadId || '',
    leadName: c.lead ? `${c.lead.firstName || ''} ${c.lead.lastName || ''}`.trim() : 'Unknown Lead',
    leadStatus: c.lead?.status || 'UNKNOWN',
    leadValue: c.lead?.estimatedValue ? Number(c.lead.estimatedValue) : undefined,
    isPrimary: c.isPrimary ?? true,
    isStarred: false };
}

const ROLE_CONFIG: Record<string, { label: string; class: string }> = {
  PRIMARY:          { label: 'Primary',  class: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
  SPOUSE:           { label: 'Spouse',   class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  PROPERTY_MANAGER: { label: 'Manager',  class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  REFERRAL:         { label: 'Referral', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  OTHER:            { label: 'Other',    class: 'bg-slate-700 text-slate-400 border-slate-600' } };

const STATUS_LABELS: Record<string, string> = {
  NEW_LEAD: 'New Lead', ATTEMPTING_CONTACT: 'Contacting', CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified', APPOINTMENT_SET: 'Appt Set', MEASURING_COMPLETE: 'Measured',
  PROPOSAL_SENT: 'Proposal Sent', FOLLOW_UP: 'Follow-Up', VERBAL_COMMIT: 'Verbal Commit',
  SOLD: 'Sold' };

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
function AddContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'PRIMARY',
    leadId: '',
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-list-simple'],
    queryFn: () => api.leads.list({ limit: 500 }).then((r: any) => r.data || []),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.contacts.create(data),
    onSuccess: () => {
      toast.success('Contact added successfully');
      queryClient.invalidateQueries({ queryKey: ['contacts-list'] });
      setFormData({ firstName: '', lastName: '', email: '', phone: '', role: 'PRIMARY', leadId: '' });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add contact');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leadId) {
      toast.error('Please select a lead to attach this contact to.');
      return;
    }
    mutation.mutate({
      ...formData,
      isPrimary: formData.role === 'PRIMARY',
      isSpouse: formData.role === 'SPOUSE',
      isOwner: formData.role !== 'OTHER' && formData.role !== 'PROPERTY_MANAGER',
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-xl page-transition">
          <Dialog.Title className="text-lg font-bold text-white mb-4">Add New Contact</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">First Name</label>
                <input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="input w-full" placeholder="John" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Last Name</label>
                <input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="input w-full" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input w-full" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Phone</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input w-full" placeholder="(555) 123-4567" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input w-full">
                <option value="PRIMARY">Primary Decision Maker</option>
                <option value="SPOUSE">Spouse / Co-decision</option>
                <option value="PROPERTY_MANAGER">Property Manager</option>
                <option value="REFERRAL">Referral</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Attach to Lead *</label>
              <select required value={formData.leadId} onChange={e => setFormData({ ...formData, leadId: e.target.value })} className="input w-full">
                <option value="">-- Select a Lead --</option>
                {(leadsData || []).map((l: any) => (
                  <option key={l.id} value={l.id}>{l.firstName} {l.lastName} - {l.address || 'Unknown Address'}</option>
                ))}
              </select>
            </div>
            
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
                {mutation.isPending ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export function ContactsPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'status'>('name');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: () => api.contacts.list().then((r: any) => (r.data || []).map(mapContact)),
    staleTime: 60_000 });

  const contacts: Contact[] = (rawData || []).map((c: Contact) => ({
    ...c,
    isStarred: starredIds.has(c.id) }));

  const toggleStar = (id: string) => setStarredIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

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

  if (isLoading) return (
    <div className="p-6">
      <div className="animate-pulse space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-800 rounded-xl" />
        ))}
      </div>
    </div>
  );

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
        <button onClick={() => setIsAddModalOpen(true)}
          className="btn-primary btn-sm flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> Add Contact
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Primary Contacts', value: contacts.filter(c => c.role === 'PRIMARY').length, icon: UserIcon, color: 'text-brand-400', filter: 'PRIMARY' as const },
          { label: 'Spouses / Co-decision', value: contacts.filter(c => c.role === 'SPOUSE').length, icon: UsersIcon, color: 'text-purple-400', filter: 'SPOUSE' as const },
          { label: 'Starred', value: starred, icon: StarSolid, color: 'text-amber-400', filter: '' as const },
          { label: 'Total Pipeline', value: `$${(contacts.filter(c => c.isPrimary).reduce((s, c) => s + (c.leadValue || 0), 0) / 1000).toFixed(0)}K`, icon: HomeIcon, color: 'text-emerald-400', filter: '' as const },
        ].map((s) => (
          <div key={s.label}
            onClick={() => s.filter && setRoleFilter(s.filter)}
            className={clsx('card p-4 flex items-center gap-3', s.filter && 'cursor-pointer hover:border-slate-600 transition-colors')}>
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
          <ArrowsUpDownIcon className="h-3.5 w-3.5 text-slate-500" />
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

      <AddContactModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
