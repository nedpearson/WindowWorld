import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PhoneIcon, MapPinIcon, ChatBubbleLeftIcon, ListBulletIcon,
  CheckCircleIcon, XMarkIcon, ClockIcon, ArrowPathIcon,
  ChevronRightIcon, PlusIcon, StarIcon,
} from '@heroicons/react/24/outline';
import { CloudIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import apiClient from '../../../api/client';
import { toast } from 'sonner';
import { haptic } from '../../../utils/haptics';

// ─── Types ────────────────────────────────────────────────────
interface Stop {
  id: string; order: number; status: string; type: string;
  lead: { id: string; name: string; phone: string; address: string; city: string; zip: string; score: number; isStorm: boolean };
  time: string; duration: number; notes: string;
  inspections: any[];
}

interface RouteTabProps {
  stops: Stop[];
  activeStopId: string | null;
  onSelectStop: (id: string | null) => void;
  estimatedMiles: number;
  isLoading: boolean;
  refetch: () => void;
  greeting: string;
  userName: string;
  stormMode: boolean;
  enqueue: (type: any, payload: any) => void;
}

// ─── Status Badge ─────────────────────────────────────────────
const STATUS_CONFIG = {
  scheduled:    { label: 'Scheduled',    color: 'bg-blue-500/15 text-blue-400',    dot: 'bg-blue-400' },
  confirmed:    { label: 'Confirmed',    color: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400' },
  in_progress:  { label: 'In Progress',  color: 'bg-amber-500/15 text-amber-400',  dot: 'bg-amber-400 animate-pulse' },
  completed:    { label: 'Completed',    color: 'bg-slate-700 text-slate-400',      dot: 'bg-slate-500' },
  no_show:      { label: 'No Show',      color: 'bg-red-500/15 text-red-400',       dot: 'bg-red-400' },
  cancelled:    { label: 'Cancelled',    color: 'bg-red-500/15 text-red-400',       dot: 'bg-red-400 line-through' },
  rescheduled:  { label: 'Rescheduled',  color: 'bg-purple-500/15 text-purple-400', dot: 'bg-purple-400' },
} as const;

type AppointmentStatus = keyof typeof STATUS_CONFIG;

const TYPE_COLORS: Record<string, string> = {
  'initial-consult': 'border-l-blue-500',
  'measurement':     'border-l-cyan-500',
  'close':           'border-l-emerald-500',
  'follow-up':       'border-l-amber-500',
  'inspection':      'border-l-purple-500',
};

// ─── Status Picker ────────────────────────────────────────────
function StatusPicker({ currentStatus, onSelect, onClose }: {
  currentStatus: string;
  onSelect: (s: AppointmentStatus) => void;
  onClose: () => void;
}) {
  const statuses: AppointmentStatus[] = ['confirmed', 'in_progress', 'completed', 'no_show', 'cancelled', 'rescheduled'];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-slate-900 rounded-t-2xl p-6 border-t border-slate-700"
        style={{ paddingBottom: 'calc(1.5rem + var(--sab, 0px))' }}
      >
        <div className="text-sm font-semibold text-white mb-4">Update Appointment Status</div>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => { haptic.tap(); onSelect(s); }}
                className={clsx(
                  'flex items-center gap-2.5 p-3 rounded-xl border transition-all text-sm font-medium',
                  currentStatus === s
                    ? 'border-brand-500 bg-brand-500/15 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-300 active:bg-slate-700'
                )}
              >
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── StopCard ─────────────────────────────────────────────────
function StopCard({ stop, isActive, onSelect, onStatusUpdate }: {
  stop: Stop; isActive: boolean;
  onSelect: (stop: Stop) => void;
  onStatusUpdate: (stopId: string, status: AppointmentStatus) => void;
}) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusCfg = STATUS_CONFIG[stop.status as AppointmentStatus] ?? STATUS_CONFIG.scheduled;

  return (
    <>
      <motion.div
        layout
        onClick={() => { haptic.selection(); onSelect(stop); }}
        className={clsx(
          'rounded-xl border-l-4 bg-slate-800/80 border border-slate-700/50 cursor-pointer',
          'transition-all active:scale-[0.98] active:bg-slate-800',
          TYPE_COLORS[stop.type] || 'border-l-slate-500',
          isActive && 'ring-1 ring-brand-500/50 bg-slate-800',
          stop.status === 'completed' && 'opacity-60'
        )}
      >
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                stop.status === 'confirmed' ? 'bg-emerald-600 text-white' :
                stop.status === 'completed' ? 'bg-slate-600 text-slate-300' :
                stop.status === 'in_progress' ? 'bg-amber-500 text-white' :
                'bg-slate-700 text-slate-400'
              )}>
                {stop.status === 'completed' ? '✓' : stop.order}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">{stop.lead.name}</span>
                  {stop.lead.isStorm && <CloudIcon className="h-3.5 w-3.5 text-purple-400" />}
                  {stop.lead.score >= 70 && <StarIcon className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {stop.time} · {stop.duration}min · {stop.lead.city}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-slate-500 capitalize">{stop.type.replace(/-/g, ' ')}</span>
              <button
                onClick={e => { e.stopPropagation(); haptic.tap(); setShowStatusPicker(true); }}
                className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', statusCfg.color)}
              >
                {statusCfg.label}
              </button>
            </div>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-slate-700/40 overflow-hidden"
              >
                {stop.notes && (
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed bg-slate-700/30 rounded-lg px-3 py-2">
                    📋 {stop.notes}
                  </p>
                )}

                {/* Score bar */}
                {stop.lead.score > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">Lead Score</span>
                      <span className={clsx('text-[10px] font-bold',
                        stop.lead.score >= 70 ? 'text-emerald-400' :
                        stop.lead.score >= 40 ? 'text-amber-400' : 'text-slate-500'
                      )}>{stop.lead.score}/100</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all',
                          stop.lead.score >= 70 ? 'bg-emerald-500' :
                          stop.lead.score >= 40 ? 'bg-amber-500' : 'bg-slate-500'
                        )}
                        style={{ width: `${stop.lead.score}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                  <MapPinIcon className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                  {stop.lead.address}, {stop.lead.city} {stop.lead.zip}
                </div>

                {/* Action grid */}
                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:${stop.lead.phone}`}
                    onClick={e => { e.stopPropagation(); haptic.tap(); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors"
                  >
                    <PhoneIcon className="h-4 w-4" /> Call
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.lead.address}, ${stop.lead.city}, LA ${stop.lead.zip}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => { e.stopPropagation(); haptic.tap(); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium active:bg-brand-700 transition-colors"
                  >
                    <MapPinIcon className="h-4 w-4" /> Navigate
                  </a>
                  <a href={`sms:${stop.lead.phone}`}
                    onClick={e => { e.stopPropagation(); haptic.tap(); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors"
                  >
                    <ChatBubbleLeftIcon className="h-4 w-4" /> Text
                  </a>
                  <Link to={`/leads/${stop.lead.id}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium active:bg-slate-600 transition-colors"
                  >
                    <ListBulletIcon className="h-4 w-4" /> Lead File
                  </Link>
                </div>

                {/* Quick status actions */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={e => { e.stopPropagation(); onStatusUpdate(stop.id, 'in_progress'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold active:bg-amber-500/20 transition-colors"
                  >
                    <ClockIcon className="h-3.5 w-3.5" /> Start Visit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onStatusUpdate(stop.id, 'completed'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold active:bg-emerald-500/20 transition-colors"
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Complete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {showStatusPicker && (
          <StatusPicker
            currentStatus={stop.status}
            onSelect={s => { onStatusUpdate(stop.id, s); setShowStatusPicker(false); }}
            onClose={() => setShowStatusPicker(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── RouteTab ─────────────────────────────────────────────────
export function RouteTab({
  stops, activeStopId, onSelectStop,
  estimatedMiles, isLoading, refetch,
  greeting, userName, stormMode, enqueue,
}: RouteTabProps) {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ stopId, status }: { stopId: string; status: string }) =>
      apiClient.appointments.updateStatus(stopId, status.toUpperCase()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-today-route'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update — saved offline'),
  });

  const handleStatusUpdate = (stopId: string, status: AppointmentStatus) => {
    haptic.impact();
    updateStatus.mutate({ stopId, status });
    // Optimistic: also enqueue for offline
    enqueue('APPOINTMENT_STATUS', { appointmentId: stopId, status: status.toUpperCase() });
  };

  const completedCount = stops.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold text-white">
            {greeting}, {userName.split(' ')[0]}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {stops.length} stops · ~{estimatedMiles} mi
            {stormMode && <span className="ml-2 text-purple-400">⚡ Storm Mode</span>}
          </div>
        </div>
        <button
          onClick={() => { haptic.tap(); refetch(); }}
          disabled={isLoading}
          className="flex items-center gap-1 text-xs text-slate-500 active:text-white transition-colors py-1.5 px-2 rounded-lg hover:bg-slate-800"
        >
          <ArrowPathIcon className={clsx('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Progress bar */}
      {stops.length > 0 && (
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>{completedCount}/{stops.length} complete</span>
            <span>{Math.round((completedCount / stops.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / stops.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && stops.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
            <MapPinIcon className="h-8 w-8 text-slate-600" />
          </div>
          <div className="text-sm font-semibold text-slate-400">No appointments today</div>
          <div className="text-xs text-slate-600">Check back later or contact your manager</div>
          <Link to="/appointments"
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400 text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" /> View All Appointments
          </Link>
        </div>
      )}

      {/* Stop list */}
      <div className="space-y-3">
        {stops.map(stop => (
          <StopCard
            key={stop.id}
            stop={stop}
            isActive={activeStopId === stop.id}
            onSelect={s => onSelectStop(activeStopId === s.id ? null : s.id)}
            onStatusUpdate={handleStatusUpdate}
          />
        ))}
      </div>
    </div>
  );
}
