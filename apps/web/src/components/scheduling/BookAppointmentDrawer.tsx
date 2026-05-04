import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  XMarkIcon, CalendarIcon, ClockIcon, MapPinIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useCreateAppointment, useUpdateAppointment } from '../../api/appointments';
import type { Appointment, CreateAppointmentInput } from '../../api/appointments';

// ─── Types ────────────────────────────────────────────────────
interface BookAppointmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialTime?: string; // "HH:MM"
  leadId?: string;
  leadName?: string;
  leadAddress?: string;
  editAppointment?: Appointment; // If editing existing
}

const APPOINTMENT_TYPES = [
  { value: 'initial-consult', label: 'Initial Consultation', duration: 90, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { value: 'measurement', label: 'Field Measurement', duration: 60, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { value: 'proposal', label: 'Proposal Presentation', duration: 60, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { value: 'close', label: 'Contract Signing', duration: 45, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { value: 'follow-up', label: 'Follow-Up Visit', duration: 30, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { value: 'installation', label: 'Installation Check', duration: 120, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
];

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8; // 8 AM start
  const min = i % 2 === 0 ? '00' : '30';
  const h12 = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return { value: `${String(hour).padStart(2, '0')}:${min}`, label: `${h12}:${min} ${ampm}` };
});

function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Component ────────────────────────────────────────────────
export function BookAppointmentDrawer({
  isOpen, onClose, initialDate, initialTime, leadId, leadName, leadAddress, editAppointment }: BookAppointmentDrawerProps) {
  const isEditing = !!editAppointment;
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  // Fetch leads for the dropdown if we don't have a leadId yet
  const { data: leadsRes } = useQuery({
    queryKey: ['recent-leads-for-appointment'],
    queryFn: () => apiClient.leads.list({ limit: 50, sortDir: 'desc' }),
    enabled: isOpen && !leadId && !isEditing,
  });
  const leads = leadsRes?.data || [];

  // ─── Form State ───────────────────────────────────────────
  const [form, setForm] = useState({
    leadId: leadId || editAppointment?.leadId || '',
    type: editAppointment?.type || 'initial-consult',
    title: editAppointment?.title || '',
    date: editAppointment
      ? editAppointment.scheduledAt.split('T')[0]
      : formatISODate(initialDate || new Date()),
    time: editAppointment
      ? editAppointment.scheduledAt.split('T')[1]?.slice(0, 5) || '09:00'
      : initialTime || '09:00',
    duration: editAppointment?.duration || 90,
    address: editAppointment?.address || leadAddress || '',
    notes: editAppointment?.notes || '' });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill title when type changes
  useEffect(() => {
    if (!isEditing || !form.title) {
      const type = APPOINTMENT_TYPES.find((t) => t.value === form.type);
      if (type) {
        setForm((f) => ({
          ...f,
          title: leadName ? `${type.label} — ${leadName}` : type.label,
          duration: type.duration }));
      }
    }
  }, [form.type, leadName]);

  // Sync with initialDate/Time if they change from outside
  useEffect(() => {
    if (initialDate && !isEditing) {
      setForm((f) => ({ ...f, date: formatISODate(initialDate) }));
    }
  }, [initialDate]);

  useEffect(() => {
    if (initialTime && !isEditing) {
      setForm((f) => ({ ...f, time: initialTime }));
    }
  }, [initialTime]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.leadId && !isEditing) e.leadId = 'Lead ID is required';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.date) e.date = 'Date is required';
    if (!form.time) e.time = 'Time is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    const endTime = new Date(new Date(scheduledAt).getTime() + form.duration * 60 * 1000).toISOString();

    const payload: CreateAppointmentInput = {
      leadId: form.leadId,
      title: form.title,
      type: form.type,
      scheduledAt,
      endAt: endTime,
      duration: form.duration,
      address: form.address || undefined,
      notes: form.notes || undefined };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: editAppointment!.id, ...payload });
        toast.success('Appointment updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Appointment scheduled');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save appointment');
    }
  };

  const selectedType = APPOINTMENT_TYPES.find((t) => t.value === form.type);
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const endTime = (() => {
    try {
      const start = new Date(`${form.date}T${form.time}:00`);
      const end = new Date(start.getTime() + form.duration * 60 * 1000);
      return end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 z-50 flex flex-col shadow-2xl border-l border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {isEditing ? 'Edit Appointment' : 'Schedule Appointment'}
                </h2>
                {leadName && <p className="text-xs text-slate-500 mt-0.5">For: {leadName}</p>}
              </div>
              <button onClick={onClose} className="btn-icon btn-ghost">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Lead Selector (if not provided) */}
              {!leadId && !isEditing && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Lead
                  </label>
                  <select
                    value={form.leadId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const selectedLead = leads.find((l: any) => l.id === id);
                      setForm((f) => ({ 
                        ...f, 
                        leadId: id,
                        address: selectedLead?.address || f.address,
                        title: f.title && f.title.includes('—') && selectedLead 
                          ? `${f.title.split('—')[0].trim()} — ${selectedLead.firstName} ${selectedLead.lastName}` 
                          : f.title
                      }));
                    }}
                    className={clsx('input appearance-none', errors.leadId && 'border-red-500')}
                  >
                    <option value="">Select a Lead...</option>
                    {leads.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.firstName} {l.lastName} {l.address ? `— ${l.address}` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.leadId && <p className="text-xs text-red-400 mt-1">{errors.leadId}</p>}
                </div>
              )}

              {/* Appointment Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {APPOINTMENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setForm((f) => ({ ...f, type: type.value }))}
                      className={clsx(
                        'p-3 rounded-xl border text-left transition-all',
                        form.type === type.value
                          ? `${type.bg} ${type.color} border-current/30`
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      )}
                    >
                      <div className="text-sm font-medium leading-tight">{type.label}</div>
                      <div className="text-[11px] opacity-60 mt-1">{type.duration} min</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Appointment title..."
                  className={clsx('input', errors.title && 'border-red-500')}
                />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    <CalendarIcon className="h-3.5 w-3.5 inline mr-1" />Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    min={formatISODate(new Date())}
                    className={clsx('input', errors.date && 'border-red-500')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    <ClockIcon className="h-3.5 w-3.5 inline mr-1" />Start Time
                  </label>
                  <select
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="input appearance-none"
                  >
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duration — time preview bar */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Duration
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[30, 45, 60, 90, 120].map((d) => (
                    <button key={d} onClick={() => setForm((f) => ({ ...f, duration: d }))}
                      className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        form.duration === d ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      )}>
                      {d < 60 ? `${d}m` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}`}
                    </button>
                  ))}
                </div>
                {form.time && endTime && (
                  <p className="text-xs text-slate-500 mt-2">
                    Ends at <span className="text-slate-300 font-medium">{endTime}</span>
                    {' · '}{form.duration} minutes
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  <MapPinIcon className="h-3.5 w-3.5 inline mr-1" />Location (optional)
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Customer address..."
                  className="input"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  <DocumentTextIcon className="h-3.5 w-3.5 inline mr-1" />Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Pre-appointment notes, access instructions, homeowner preferences..."
                  className="textarea"
                  rows={3}
                />
              </div>

              {/* Summary card */}
              {form.date && form.time && form.title && (
                <div className={clsx('p-4 rounded-xl border', selectedType?.bg || 'bg-slate-800/50 border-slate-700')}>
                  <div className={clsx('text-xs font-semibold mb-1', selectedType?.color || 'text-slate-400')}>
                    Appointment Summary
                  </div>
                  <div className="text-sm font-semibold text-white">{form.title}</div>
                  <div className="text-xs text-slate-400 mt-1.5 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {new Date(form.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {TIME_SLOTS.find(s => s.value === form.time)?.label} — {endTime} ({form.duration} min)
                    </div>
                    {form.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {form.address}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 pb-8 border-t border-slate-800 flex-shrink-0">
              <button onClick={onClose} className="btn-secondary flex-1" disabled={isLoading}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary flex-1"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    {isEditing ? 'Update Appointment' : 'Schedule Appointment'}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
