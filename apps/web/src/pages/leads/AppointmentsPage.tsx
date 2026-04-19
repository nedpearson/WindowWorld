import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CalendarIcon, MapPinIcon, PhoneIcon, ClockIcon,
  CheckCircleIcon, XMarkIcon, ArrowPathIcon,
  ChevronLeftIcon, ChevronRightIcon, PlusIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DEMO_APPOINTMENTS = [
  {
    id: 'a1', leadId: '3', leadName: 'Robert Comeaux',
    title: 'Initial Window Consultation', type: 'initial-consult',
    scheduledAt: '2026-04-20T10:00:00', duration: 90, status: 'CONFIRMED',
    address: '4521 Greenwell Springs Rd, Baton Rouge', phone: '(225) 555-1001',
    notes: 'Homeowner confirmed. Has 10 windows. Wife will be present.',
    assignee: 'Jake Thibodaux',
  },
  {
    id: 'a2', leadId: '6', leadName: 'Karen Guidry',
    title: 'Field Measurement', type: 'measurement',
    scheduledAt: '2026-04-20T13:30:00', duration: 60, status: 'CONFIRMED',
    address: '1134 Range Ave, Denham Springs', phone: '(225) 555-2001',
    notes: '6 openings. Homeowner believes some may be non-standard.',
    assignee: 'Chad Melancon',
  },
  {
    id: 'a3', leadId: '1', leadName: 'Michael Trosclair',
    title: 'Contract Signing + Install Scheduling', type: 'close',
    scheduledAt: '2026-04-21T15:00:00', duration: 45, status: 'SCHEDULED',
    address: '7824 Old Hammond Hwy, Baton Rouge', phone: '(225) 555-1003',
    notes: 'Verbal commit. Need to bring contract and financing forms.',
    assignee: 'Jake Thibodaux',
  },
  {
    id: 'a4', leadId: '4', leadName: 'Angela Mouton',
    title: 'Proposal Presentation', type: 'proposal',
    scheduledAt: '2026-04-22T11:00:00', duration: 60, status: 'SCHEDULED',
    address: '226 Tupelo Dr, Prairieville', phone: '(225) 555-2003',
    notes: 'Husband will be home. Bring Series 2000 and 4000 samples.',
    assignee: 'Danielle Arceneaux',
  },
  {
    id: 'a5', leadId: '7', leadName: 'Carol Chauvin',
    title: 'Initial Consultation', type: 'initial-consult',
    scheduledAt: '2026-04-23T14:00:00', duration: 90, status: 'CONFIRMED',
    address: '1245 Gause Blvd, Slidell', phone: '(985) 555-4002',
    notes: 'Referral from James Hebert. Very interested in Series 4000.',
    assignee: 'Danielle Arceneaux',
  },
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'badge-blue',
  CONFIRMED: 'badge-green',
  IN_PROGRESS: 'badge-yellow',
  COMPLETED: 'badge-slate',
  CANCELLED: 'badge-red',
  NO_SHOW: 'badge-red',
};

const TYPE_COLORS: Record<string, string> = {
  'initial-consult': 'border-l-brand-500',
  'measurement': 'border-l-cyan-500',
  'proposal': 'border-l-purple-500',
  'close': 'border-l-emerald-500',
  'follow-up': 'border-l-amber-500',
  'installation': 'border-l-orange-500',
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function AppointmentsPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [view, setView] = useState<'calendar' | 'list' | 'route'>('list');
  const [selectedApt, setSelectedApt] = useState<string | null>(null);

  const getAptsForDate = (date: Date) => {
    return DEMO_APPOINTMENTS.filter((apt) => {
      const aptDate = new Date(apt.scheduledAt);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  // Build calendar grid
  const calYear = currentDate.getFullYear();
  const calMonth = currentDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays: Array<Date | null> = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(calYear, calMonth, i + 1)),
  ];

  const selectedAptData = DEMO_APPOINTMENTS.find((a) => a.id === selectedApt);

  const todayApts = getAptsForDate(today);
  const upcoming = DEMO_APPOINTMENTS.filter((a) => new Date(a.scheduledAt) >= today).sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Appointments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {todayApts.length} today · {upcoming.length} upcoming
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['list', 'calendar', 'route'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={clsx('btn-sm capitalize', view === v ? 'btn-primary' : 'btn-secondary')}>
              {v === 'route' ? '🗺 Route' : v === 'calendar' ? '📅 Calendar' : '📋 List'}
            </button>
          ))}
          <button onClick={() => toast.info('New appointment form coming in Phase 3')} className="btn-primary btn-sm">
            <PlusIcon className="h-4 w-4" /> Schedule
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-3">
                {/* Group by date */}
                {Object.entries(
                  upcoming.reduce<Record<string, typeof DEMO_APPOINTMENTS>>((acc, apt) => {
                    const dateKey = new Date(apt.scheduledAt).toDateString();
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(apt);
                    return acc;
                  }, {})
                ).map(([dateStr, apts]) => (
                  <div key={dateStr}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={clsx(
                        'text-xs font-semibold px-2 py-1 rounded-lg',
                        new Date(dateStr).toDateString() === today.toDateString()
                          ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                          : 'text-slate-500'
                      )}>
                        {new Date(dateStr).toDateString() === today.toDateString()
                          ? 'Today'
                          : new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 h-px bg-slate-800" />
                      <span className="text-xs text-slate-600">{apts.length} appt{apts.length > 1 ? 's' : ''}</span>
                    </div>

                    {apts.map((apt) => (
                      <motion.div
                        key={apt.id}
                        onClick={() => setSelectedApt(apt.id === selectedApt ? null : apt.id)}
                        className={clsx(
                          'card p-4 border-l-4 cursor-pointer transition-all mb-2',
                          TYPE_COLORS[apt.type] || 'border-l-slate-600',
                          apt.id === selectedApt ? 'border-y-brand-500/30 border-r-brand-500/30 bg-slate-800' : 'hover:bg-slate-800/50'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-semibold text-white">{apt.leadName}</span>
                              <span className={`badge text-[10px] ${STATUS_COLORS[apt.status]}`}>{apt.status}</span>
                              <span className="badge badge-slate text-[10px] capitalize">{apt.type.replace('-', ' ')}</span>
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">{apt.title}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" />{formatTime(apt.scheduledAt)} · {apt.duration} min</span>
                              <span className="flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5" />{apt.address.split(',')[1]?.trim()}</span>
                              <span className="text-slate-600">{apt.assignee}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0 ml-4">
                            <a href={`tel:${apt.phone}`} className="btn-icon btn-ghost"><PhoneIcon className="h-4 w-4" /></a>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(apt.address)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="btn-icon btn-ghost"
                            >
                              <MapPinIcon className="h-4 w-4" />
                            </a>
                          </div>
                        </div>

                        {/* Expanded notes */}
                        <AnimatePresence>
                          {apt.id === selectedApt && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-slate-700/50">
                                {apt.notes && <p className="text-sm text-slate-400 mb-3">{apt.notes}</p>}
                                <div className="flex gap-2">
                                  <Link to={`/leads/${apt.leadId}`} className="btn-primary btn-sm">Open Lead</Link>
                                  <button onClick={(e) => { e.stopPropagation(); toast.success('Marked complete!'); }} className="btn-success btn-sm">
                                    <CheckCircleIcon className="h-4 w-4" /> Complete
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); toast.info('Reschedule coming in Phase 3'); }} className="btn-secondary btn-sm">
                                    <ArrowPathIcon className="h-4 w-4" /> Reschedule
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Mini calendar */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCurrentDate(new Date(calYear, calMonth - 1, 1))} className="btn-icon btn-ghost">
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold text-white">{MONTH_NAMES[calMonth]} {calYear}</span>
                  <button onClick={() => setCurrentDate(new Date(calYear, calMonth + 1, 1))} className="btn-icon btn-ghost">
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0.5">
                  {DAYS_OF_WEEK.map((d) => (
                    <div key={d} className="text-[10px] text-slate-600 text-center py-1 font-medium uppercase">{d}</div>
                  ))}
                  {calDays.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} />;
                    const hasApts = getAptsForDate(date).length > 0;
                    const isToday = date.toDateString() === today.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentDate(date)}
                        className={clsx(
                          'flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs transition-all relative',
                          isToday ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        )}
                      >
                        {date.getDate()}
                        {hasApts && !isToday && (
                          <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-brand-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">This Week</div>
                  <div className="space-y-1.5">
                    {upcoming.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                        <span className="text-slate-400 truncate">{formatTime(apt.scheduledAt)} · {apt.leadName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ROUTE VIEW ── */}
          {view === 'route' && (
            <div className="space-y-4">
              <div className="card p-4 bg-gradient-to-br from-brand-950/30 to-slate-800/50 border-brand-600/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-white">Today's Optimized Route</span>
                  <span className="badge badge-blue text-[10px]">AI Optimized</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><div className="text-xl font-bold text-white">{todayApts.length}</div><div className="text-xs text-slate-500">Stops</div></div>
                  <div><div className="text-xl font-bold text-white">~42 mi</div><div className="text-xs text-slate-500">Est. Distance</div></div>
                  <div><div className="text-xl font-bold text-white">4.5 hr</div><div className="text-xs text-slate-500">Est. Time</div></div>
                </div>
              </div>

              <div className="space-y-3">
                {todayApts.map((apt, i) => (
                  <div key={apt.id} className="card p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-sm flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{apt.leadName}</div>
                        <div className="text-sm text-slate-400">{apt.title}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{formatTime(apt.scheduledAt)}</span>
                          <span>{apt.address}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`tel:${apt.phone}`} className="btn-secondary btn-sm"><PhoneIcon className="h-4 w-4" /></a>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(apt.address)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="btn-primary btn-sm"
                        >
                          Navigate
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                {todayApts.length === 0 && (
                  <div className="card p-8 text-center">
                    <CalendarIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500">No appointments scheduled for today</p>
                    <button onClick={() => toast.info('Scheduling coming in Phase 3')} className="btn-primary btn-sm mt-4">
                      Schedule an Appointment
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CALENDAR VIEW ── */}
          {view === 'calendar' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCurrentDate(new Date(calYear, calMonth - 1, 1))} className="btn-secondary btn-sm">
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <h2 className="text-base font-semibold text-white">{MONTH_NAMES[calMonth]} {calYear}</h2>
                <button onClick={() => setCurrentDate(new Date(calYear, calMonth + 1, 1))} className="btn-secondary btn-sm">
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="text-xs text-slate-600 font-semibold uppercase py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calDays.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} className="h-16" />;
                  const apts = getAptsForDate(date);
                  const isToday = date.toDateString() === today.toDateString();
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'h-16 p-1 rounded-lg border transition-colors',
                        isToday ? 'border-brand-500/50 bg-brand-600/10' : 'border-slate-800 hover:border-slate-700'
                      )}
                    >
                      <div className={clsx('text-xs font-medium mb-1', isToday ? 'text-brand-400' : 'text-slate-500')}>
                        {date.getDate()}
                      </div>
                      {apts.map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => setSelectedApt(apt.id)}
                          className="text-[9px] bg-brand-600/20 text-brand-300 rounded px-1 py-0.5 truncate cursor-pointer hover:bg-brand-600/30 mb-0.5"
                        >
                          {formatTime(apt.scheduledAt)} {apt.leadName.split(' ')[0]}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
