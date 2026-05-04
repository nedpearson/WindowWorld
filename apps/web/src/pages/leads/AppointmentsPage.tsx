import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CalendarIcon, MapPinIcon, PhoneIcon, ClockIcon,
  CheckCircleIcon, XMarkIcon, ArrowPathIcon,
  ChevronLeftIcon, ChevronRightIcon, PlusIcon,
  ChatBubbleLeftIcon, UserCircleIcon,
  ListBulletIcon, Squares2X2Icon, MapIcon } from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { keepPreviousData } from '@tanstack/react-query';
import {
  useCalendarAppointments,
  useUpdateAppointmentStatus,
  type Appointment } from '../../api/appointments';
import { BookAppointmentDrawer } from '../../components/scheduling/BookAppointmentDrawer';
import { AppointmentPrepPanel } from '../../components/ai/AppointmentPrepPanel';


// ─── Constants ────────────────────────────────────────────────
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  SCHEDULED:   { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',     label: 'Scheduled' },
  CONFIRMED:   { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', label: 'Confirmed' },
  IN_PROGRESS: { badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25', label: 'In Progress' },
  COMPLETED:   { badge: 'bg-slate-600 text-slate-400 border-slate-500/25',     label: 'Completed' },
  CANCELLED:   { badge: 'bg-red-500/15 text-red-400 border-red-500/25',        label: 'Cancelled' },
  NO_SHOW:     { badge: 'bg-red-500/15 text-red-400 border-red-500/25',        label: 'No Show' } };

const TYPE_STRIPE: Record<string, string> = {
  'initial-consult': 'border-l-blue-500',
  'measurement':     'border-l-cyan-500',
  'proposal':        'border-l-purple-500',
  'close':           'border-l-emerald-500',
  'follow-up':       'border-l-amber-500',
  'installation':    'border-l-orange-500' };

const TYPE_DOT: Record<string, string> = {
  'initial-consult': 'bg-blue-500',
  'measurement':     'bg-cyan-500',
  'proposal':        'bg-purple-500',
  'close':           'bg-emerald-500',
  'follow-up':       'bg-amber-500',
  'installation':    'bg-orange-500' };

// ─── Helpers ──────────────────────────────────────────────────
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

// ─── Week View Hours ──────────────────────────────────────────
const WEEK_HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–7pm

function WeekView({ appointments, onClickSlot, onClickApt }: {
  appointments: Appointment[];
  onClickSlot: (date: Date, hour: number) => void;
  onClickApt: (apt: Appointment) => void;
}) {
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const today = new Date();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAptsForDayHour = (day: Date, hour: number) => {
    return appointments.filter((apt) => {
      const d = new Date(apt.scheduledAt);
      return isSameDay(d, day) && d.getHours() === hour;
    });
  };

  return (
    <div className="card overflow-hidden">
      {/* Week nav header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-icon btn-ghost">
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold text-white">
          {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} —{' '}
          {addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(getWeekStart(new Date()))} className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1 rounded-lg hover:bg-brand-500/10 transition-colors">
            Today
          </button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-icon btn-ghost">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Day headers */}
        <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', minWidth: '640px' }}>
          <div className="h-10 border-b border-slate-800" />
          {weekDays.map((day, i) => (
            <div key={i} className={clsx(
              'h-10 flex flex-col items-center justify-center border-b border-l border-slate-800',
              isSameDay(day, today) && 'bg-brand-600/10'
            )}>
              <div className={clsx('text-[10px] font-semibold uppercase', isSameDay(day, today) ? 'text-brand-400' : 'text-slate-500')}>
                {DAYS_OF_WEEK[day.getDay()]}
              </div>
              <div className={clsx('text-sm font-bold', isSameDay(day, today) ? 'text-brand-400' : 'text-white')}>
                {day.getDate()}
              </div>
            </div>
          ))}

          {/* Time rows */}
          {WEEK_HOURS.map((hour) => (
            <>
              {/* Time label */}
              <div key={`label-${hour}`} className="border-b border-slate-800/50 px-2 py-1 flex items-start">
                <span className="text-[10px] text-slate-600 font-mono">{hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}</span>
              </div>
              {weekDays.map((day, di) => {
                const apts = getAptsForDayHour(day, hour);
                return (
                  <div
                    key={`slot-${hour}-${di}`}
                    onClick={() => onClickSlot(day, hour)}
                    className={clsx(
                      'border-b border-l border-slate-800/50 min-h-[52px] p-0.5 cursor-pointer group transition-colors',
                      isSameDay(day, today) ? 'bg-brand-600/5 hover:bg-brand-600/10' : 'hover:bg-slate-800/40'
                    )}
                  >
                    {apts.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={(e) => { e.stopPropagation(); onClickApt(apt); }}
                        className={clsx(
                          'text-[10px] p-1.5 rounded-md mb-0.5 cursor-pointer border-l-2 leading-tight',
                          TYPE_STRIPE[apt.type] || 'border-l-slate-500',
                          apt.status === 'CANCELLED' ? 'opacity-40 bg-slate-800' : 'bg-slate-800 hover:bg-slate-700'
                        )}
                      >
                        <div className="font-semibold text-white truncate">
                          {apt.lead ? `${apt.lead.firstName} ${apt.lead.lastName}` : apt.title}
                        </div>
                        <div className="text-slate-500">{formatTime(apt.scheduledAt)}</div>
                      </div>
                    ))}
                    {/* Empty slot hover hint */}
                    {apts.length === 0 && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-slate-600 p-1">
                        + Schedule
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Month Calendar ───────────────────────────────────────────
function MonthCalendar({ appointments, onClickDay, selectedDate, onClickApt }: {
  appointments: Appointment[];
  onClickDay: (date: Date) => void;
  selectedDate?: Date;
  onClickApt: (apt: Appointment) => void;
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calDays: Array<Date | null> = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const getAptsForDate = (date: Date) =>
    appointments.filter((apt) => isSameDay(new Date(apt.scheduledAt), date));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="btn-icon btn-ghost">
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="btn-icon btn-ghost">
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-[10px] text-slate-600 text-center py-1 font-semibold uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {calDays.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="h-9" />;
          const apts = getAptsForDate(date);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button key={i} onClick={() => onClickDay(date)}
              className={clsx(
                'flex flex-col items-center h-9 w-full rounded-lg text-xs transition-all relative group',
                isToday ? 'bg-brand-600 text-white font-bold' :
                isSelected ? 'bg-slate-700 text-white' :
                'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              )}>
              <span className="mt-1.5">{date.getDate()}</span>
              {apts.length > 0 && !isToday && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {apts.slice(0, 3).map((apt) => (
                    <div key={apt.id} className={clsx('w-1 h-1 rounded-full', TYPE_DOT[apt.type] || 'bg-slate-500')} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mini upcoming list */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-2">Upcoming</div>
        <div className="space-y-1.5">
          {appointments
            .filter((a) => new Date(a.scheduledAt) >= today && a.status !== 'CANCELLED')
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .slice(0, 4)
            .map((apt) => (
              <button key={apt.id} onClick={() => onClickApt(apt)} className="w-full flex items-center gap-2 text-xs text-left hover:bg-slate-800/50 rounded-lg p-1 transition-colors">
                <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', TYPE_DOT[apt.type] || 'bg-slate-500')} />
                <span className="text-slate-400 truncate">
                  {formatTime(apt.scheduledAt)} · {apt.lead ? `${apt.lead.firstName} ${apt.lead.lastName}` : apt.title}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Detail Panel ─────────────────────────────────
function AptDetailPanel({ apt, onClose, onEdit }: {
  apt: Appointment;
  onClose: () => void;
  onEdit: () => void;
}) {
  const statusMutation = useUpdateAppointmentStatus();

  const handleStatusUpdate = async (status: string) => {
    try {
      await statusMutation.mutateAsync({ id: apt.id, status });
      toast.success(`Marked as ${status.toLowerCase()}`);
      onClose();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const typeInfo = {
    'initial-consult': 'Initial Consultation',
    'measurement': 'Field Measurement',
    'proposal': 'Proposal Presentation',
    'close': 'Contract Signing',
    'follow-up': 'Follow-Up',
    'installation': 'Installation Check' }[apt.type] || apt.type;

  const leadFullName = apt.lead ? `${apt.lead.firstName} ${apt.lead.lastName}` : 'Unknown Lead';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="card border-l-4 overflow-hidden"
      style={{ borderLeftColor: getComputedStyle(document.documentElement).getPropertyValue('--brand') || '#3b82f6' }}
    >
      <div className={clsx('border-l-4 p-5', TYPE_STRIPE[apt.type] || 'border-l-slate-600')}>
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-semibold text-white text-sm">{apt.title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{typeInfo}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full font-medium border',
              STATUS_STYLES[apt.status]?.badge || 'bg-slate-700 text-slate-400 border-slate-600'
            )}>
              {STATUS_STYLES[apt.status]?.label || apt.status}
            </span>
            <button onClick={onClose} className="btn-icon btn-ghost h-6 w-6">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2.5 text-slate-400">
            <UserCircleIcon className="h-4 w-4 flex-shrink-0" />
            <Link to={`/leads/${apt.leadId}`} className="text-brand-400 hover:text-brand-300 font-medium">
              {leadFullName}
            </Link>
          </div>
          <div className="flex items-center gap-2.5 text-slate-400">
            <ClockIcon className="h-4 w-4 flex-shrink-0" />
            <span>
              {new Date(apt.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}{formatTime(apt.scheduledAt)}
              {apt.duration && ` (${apt.duration} min)`}
            </span>
          </div>
          {apt.address && (
            <div className="flex items-center gap-2.5 text-slate-400">
              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{apt.address}</span>
            </div>
          )}
          {apt.lead?.phone && (
            <div className="flex items-center gap-2.5 text-slate-400">
              <PhoneIcon className="h-4 w-4 flex-shrink-0" />
              <a href={`tel:${apt.lead.phone}`} className="hover:text-slate-200 transition-colors">{apt.lead.phone}</a>
            </div>
          )}
          {apt.notes && (
            <div className="pt-2 pb-1 text-slate-400 text-xs leading-relaxed italic border-t border-slate-800 mt-2">
              {apt.notes}
            </div>
          )}
        </div>

        {/* Silo AI Prep Panel */}
        <AppointmentPrepPanel appointmentId={apt.id} />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
          {/* Navigation */}
          {apt.address && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(apt.address)}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-sm btn-secondary flex items-center gap-1.5"
            >
              <MapPinIcon className="h-3.5 w-3.5" /> Navigate
            </a>
          )}
          {apt.lead?.phone && (
            <a href={`tel:${apt.lead.phone}`} className="btn-sm btn-secondary flex items-center gap-1.5">
              <PhoneIcon className="h-3.5 w-3.5" /> Call
            </a>
          )}
          {apt.lead?.phone && (
            <a href={`sms:${apt.lead.phone}`} className="btn-sm btn-secondary flex items-center gap-1.5">
              <ChatBubbleLeftIcon className="h-3.5 w-3.5" /> Text
            </a>
          )}

          {/* Status updates */}
          {!['COMPLETED','CANCELLED'].includes(apt.status) && (
            <>
              <button
                onClick={() => handleStatusUpdate('CONFIRMED')}
                disabled={apt.status === 'CONFIRMED' || statusMutation.isPending}
                className="btn-sm btn-secondary flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" /> Confirm
              </button>
              <button
                onClick={() => handleStatusUpdate('COMPLETED')}
                disabled={statusMutation.isPending}
                className="btn-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 flex items-center gap-1.5"
              >
                <CheckCircleIcon className="h-3.5 w-3.5" /> Complete
              </button>
              <button
                onClick={() => handleStatusUpdate('CANCELLED')}
                disabled={statusMutation.isPending}
                className="btn-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5"
              >
                <XMarkIcon className="h-3.5 w-3.5" /> Cancel
              </button>
              <button onClick={onEdit} className="btn-sm btn-secondary flex items-center gap-1.5">
                <ArrowPathIcon className="h-3.5 w-3.5" /> Reschedule
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function AppointmentsPage() {
  const today = new Date();
  const [view, setView] = useState<'list' | 'week' | 'month' | 'route'>('list');
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  // Booking drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<Date | undefined>();
  const [drawerTime, setDrawerTime] = useState<string | undefined>();
  const [editTarget, setEditTarget] = useState<Appointment | undefined>();

  // Date range for API query — fetch 30 days forward  
  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);
  const rangeEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString();
  }, []);

  const { data: calApts = [], isLoading } = useCalendarAppointments(rangeStart, rangeEnd);

  // Stats — use start-of-today for accurate day comparison
  const todayStart = useMemo(() => { const d = new Date(today); d.setHours(0,0,0,0); return d; }, []);
  const todayApts = calApts.filter((a) => isSameDay(new Date(a.scheduledAt), today));
  const upcoming = calApts.filter((a) => new Date(a.scheduledAt) >= todayStart && a.status !== 'CANCELLED');
  const recent = calApts.filter((a) => new Date(a.scheduledAt) < todayStart && a.status !== 'CANCELLED');
  const confirmedToday = todayApts.filter((a) => a.status === 'CONFIRMED').length;

  // Grouped list by date
  const groupedByDate = useMemo(() => {
    const filtered = upcoming.sort((a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    const groups: Record<string, Appointment[]> = {};
    filtered.forEach((apt) => {
      const d = new Date(apt.scheduledAt);
      // Use local YYYY-MM-DD as key so it round-trips correctly without timezone shift
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(apt);
    });
    return groups;
  }, [upcoming]);

  const openBooking = (date?: Date, hour?: number) => {
    setEditTarget(undefined);
    setDrawerDate(date || today);
    setDrawerTime(hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : undefined);
    setDrawerOpen(true);
  };

  const openEdit = (apt: Appointment) => {
    setEditTarget(apt);
    setSelectedApt(null);
    setDrawerOpen(true);
  };

  const VIEWS = [
    { key: 'list', label: 'List', icon: ListBulletIcon },
    { key: 'week', label: 'Week', icon: CalendarIcon },
    { key: 'month', label: 'Month', icon: Squares2X2Icon },
    { key: 'route', label: 'Route', icon: MapIcon },
  ] as const;

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Appointments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading...' : `${todayApts.length} today · ${confirmedToday} confirmed · ${upcoming.length} upcoming`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 gap-0.5">
            {VIEWS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setView(key as any)}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  view === key ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                )}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          <button onClick={() => openBooking()} className="btn-primary flex items-center gap-2 btn-sm">
            <PlusIcon className="h-4 w-4" /> Schedule
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Today', value: todayApts.length, color: 'text-brand-400' },
          { label: 'Confirmed', value: calApts.filter(a => a.status === 'CONFIRMED').length, color: 'text-emerald-400' },
          { label: 'This Week', value: calApts.filter(a => {
              const d = new Date(a.scheduledAt);
              const ws = getWeekStart(today);
              return d >= ws && d <= addDays(ws, 7) && a.status !== 'CANCELLED';
            }).length, color: 'text-cyan-400' },
          { label: 'Upcoming', value: upcoming.length, color: 'text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {/* ─── LIST VIEW ─── */}
          {view === 'list' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4">
                {isLoading && (
                  <div className="card p-8 text-center text-slate-500">Loading appointments...</div>
                )}
                {!isLoading && Object.keys(groupedByDate).length === 0 && recent.length === 0 && (
                  <div className="card p-10 text-center">
                    <CalendarIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">No upcoming appointments</p>
                    <button onClick={() => openBooking()} className="btn-primary btn-sm">
                      <PlusIcon className="h-4 w-4" /> Schedule First Appointment
                    </button>
                  </div>
                )}
                {Object.entries(groupedByDate).map(([dateStr, apts]) => (
                  <div key={dateStr}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={clsx('text-xs font-semibold px-2 py-1 rounded-lg',
                        isSameDay(new Date(dateStr + 'T00:00:00'), today)
                          ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                          : 'text-slate-500'
                      )}>
                        {isSameDay(new Date(dateStr + 'T00:00:00'), today)
                          ? 'Today'
                          : new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 h-px bg-slate-800" />
                      <span className="text-xs text-slate-600">{apts.length} appt{apts.length > 1 ? 's' : ''}</span>
                    </div>

                    <div className="space-y-2">
                      {apts.map((apt) => (
                        <div key={apt.id}>
                          <motion.div
                            onClick={() => setSelectedApt(selectedApt?.id === apt.id ? null : apt)}
                            className={clsx(
                              'card p-4 border-l-4 cursor-pointer transition-all',
                              TYPE_STRIPE[apt.type] || 'border-l-slate-600',
                              apt.status === 'CANCELLED' && 'opacity-50',
                              selectedApt?.id === apt.id ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link
                                    to={`/leads/${apt.leadId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold text-white text-sm hover:text-brand-300 transition-colors"
                                  >
                                    {apt.lead ? `${apt.lead.firstName} ${apt.lead.lastName}` : apt.title}
                                  </Link>
                                  <span className={clsx(
                                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                                    STATUS_STYLES[apt.status]?.badge || 'bg-slate-700 text-slate-400'
                                  )}>
                                    {STATUS_STYLES[apt.status]?.label || apt.status}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 capitalize">
                                    {apt.type.replace(/-/g, ' ')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">{apt.title}{apt.lead?.city ? ` · ${apt.lead.city}` : ''}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{formatTime(apt.scheduledAt)}{apt.duration && ` · ${apt.duration}m`}</span>
                                  {apt.address && <span className="flex items-center gap-1 truncate"><MapPinIcon className="h-3 w-3 flex-shrink-0" /><span className="truncate">{apt.address.split(',')[0]}</span></span>}
                                  {apt.createdBy && <span className="text-slate-600">{apt.createdBy.firstName}</span>}
                                </div>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                {apt.lead?.phone && <a href={`tel:${apt.lead.phone}`} onClick={e => e.stopPropagation()} className="btn-icon btn-ghost h-7 w-7"><PhoneIcon className="h-3.5 w-3.5" /></a>}
                                {apt.address && (
                                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(apt.address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="btn-icon btn-ghost h-7 w-7">
                                    <MapPinIcon className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </motion.div>

                          {/* Expanded detail panel */}
                          <AnimatePresence>
                            {selectedApt?.id === apt.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="mt-1">
                                  <AptDetailPanel apt={apt} onClose={() => setSelectedApt(null)} onEdit={() => openEdit(apt)} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent (past 7 days) — collapsed section */}
              {recent.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs font-semibold text-slate-600 px-2 py-1">Recent (last 7 days)</div>
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-600">{recent.length} completed</span>
                  </div>
                  <div className="space-y-2">
                    {[...recent].reverse().slice(0, 5).map((apt) => (
                      <div key={apt.id}
                        className={clsx('card p-4 border-l-4 opacity-60', TYPE_STRIPE[apt.type] || 'border-l-slate-600')}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link to={`/leads/${apt.leadId}`}
                                className="text-sm font-semibold text-slate-300 hover:text-brand-300 transition-colors truncate">
                                {apt.lead ? `${apt.lead.firstName} ${apt.lead.lastName}` : apt.title}
                              </Link>
                              <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                                STATUS_STYLES[apt.status]?.badge || 'bg-slate-700 text-slate-400')}>
                                {STATUS_STYLES[apt.status]?.label || apt.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {apt.title} · {new Date(apt.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTime(apt.scheduledAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini calendar sidebar */}
              <div>
                <MonthCalendar
                  appointments={calApts}
                  onClickDay={(date) => { setSelectedDay(date); }}
                  selectedDate={selectedDay}
                  onClickApt={(apt) => setSelectedApt(apt)}
                />
                {/* Quick schedule for selected day */}
                <div className="card p-4 mt-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    Quick Schedule
                  </div>
                  <div className="text-xs text-slate-400 mb-3">
                    {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map((time) => {
                    const hasApt = calApts.some((a) => {
                      const d = new Date(a.scheduledAt);
                      return isSameDay(d, selectedDay) && `${String(d.getHours()).padStart(2, '0')}:00` === time && a.status !== 'CANCELLED';
                    });
                    const h = parseInt(time);
                    const label = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
                    return (
                      <button key={time} onClick={() => { if (!hasApt) openBooking(selectedDay, h); }}
                        disabled={hasApt}
                        className={clsx(
                          'w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-colors',
                          hasApt ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20 cursor-default' :
                          'text-slate-500 hover:bg-slate-800 hover:text-slate-300 border border-transparent'
                        )}>
                        <span className="font-mono">{label}</span>
                        {hasApt && <span className="ml-2 font-medium">Booked</span>}
                        {!hasApt && <span className="text-slate-700 ml-2">Available →</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── WEEK VIEW ─── */}
          {view === 'week' && (
            <WeekView
              appointments={calApts}
              onClickSlot={(date, hour) => openBooking(date, hour)}
              onClickApt={(apt) => setSelectedApt(apt)}
            />
          )}

          {/* ─── MONTH VIEW ─── */}
          {view === 'month' && (
            <div className="card p-5">
              <MonthCalendar
                appointments={calApts}
                onClickDay={setSelectedDay}
                selectedDate={selectedDay}
                onClickApt={(apt) => setSelectedApt(apt)}
              />
            </div>
          )}

          {/* ─── ROUTE VIEW ─── */}
          {view === 'route' && (
            <div className="space-y-4">
              <div className="card p-5 bg-gradient-to-br from-brand-950/30 to-slate-800/50 border-brand-600/20">
                <div className="flex items-center gap-2 mb-4">
                  <BoltIcon className="h-4 w-4 text-brand-400" />
                  <span className="text-sm font-semibold text-white">Today's Optimized Route</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 border border-brand-500/25">AI Optimized</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><div className="text-2xl font-bold text-white">{todayApts.length}</div><div className="text-xs text-slate-500">Stops</div></div>
                  <div><div className="text-2xl font-bold text-white">~{todayApts.length * 14} mi</div><div className="text-xs text-slate-500">Estimated</div></div>
                  <div><div className="text-2xl font-bold text-white">{Math.round(todayApts.reduce((s, a) => s + (a.duration || 60), 0) / 60 * 10) / 10}h</div><div className="text-xs text-slate-500">Drive + Appt</div></div>
                </div>
              </div>

              <div className="space-y-3">
                {todayApts.length === 0 && (
                  <div className="card p-10 text-center">
                    <MapPinIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">No stops scheduled for today</p>
                    <button onClick={() => openBooking(today)} className="btn-primary btn-sm">
                      <PlusIcon className="h-4 w-4" /> Add Today's Appointment
                    </button>
                  </div>
                )}
                {todayApts
                  .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                  .map((apt, i) => (
                    <div key={apt.id} className={clsx('card p-4 border-l-4', TYPE_STRIPE[apt.type] || 'border-l-slate-600')}>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm">
                            {apt.lead ? `${apt.lead.firstName} ${apt.lead.lastName}` : apt.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{apt.title}</div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{formatTime(apt.scheduledAt)}</span>
                            {apt.address && <span className="truncate">{apt.address}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {apt.lead?.phone && (
                            <a href={`tel:${apt.lead.phone}`} className="btn-secondary btn-sm">
                              <PhoneIcon className="h-4 w-4" />
                            </a>
                          )}
                          {apt.address && (
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(apt.address)}`}
                              target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
                              Navigate
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Book Appointment Drawer */}
      <BookAppointmentDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditTarget(undefined); }}
        initialDate={drawerDate}
        initialTime={drawerTime}
        editAppointment={editTarget}
      />
    </div>
  );
}
