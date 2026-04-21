import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CalendarIcon, ClipboardDocumentListIcon, UserGroupIcon,
  CheckCircleIcon, ClockIcon, MapPinIcon, PhoneIcon,
  PlusIcon, WrenchScrewdriverIcon, ExclamationTriangleIcon,
  ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';

// ─── Types ────────────────────────────────────────────────
type InstallStatus = 'NEEDS_SCHEDULING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETE' | 'ON_HOLD';

interface InstallJob {
  id: string;
  leadId: string;
  customerName: string;
  address: string;
  city: string;
  phone: string;
  windowCount: number;
  series: string;
  contractValue: number;
  contractDate: string;
  installDate?: string;
  crew?: string;
  status: InstallStatus;
  notes?: string;
  depositPaid: boolean;
  depositAmount?: number;
  estimatedDays: number;
}

// Crew members loaded from team users — CREWS list is a fallback default
const CREWS = ['Crew A — Martinez', 'Crew B — Thibodaux', 'Crew C — Williams', 'Crew D — Fontenot'];


const STATUS_CONFIG: Record<InstallStatus, { label: string; badge: string; icon: any; dot: string }> = {
  NEEDS_SCHEDULING: { label: 'Needs Scheduling', badge: 'bg-red-500/10 text-red-400 border-red-500/20',    icon: ExclamationTriangleIcon, dot: 'bg-red-400' },
  SCHEDULED:        { label: 'Scheduled',         badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',  icon: CalendarIcon,            dot: 'bg-blue-400' },
  IN_PROGRESS:      { label: 'In Progress',        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: WrenchScrewdriverIcon,  dot: 'bg-amber-400' },
  COMPLETE:         { label: 'Complete',           badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckSolid,      dot: 'bg-emerald-400' },
  ON_HOLD:          { label: 'On Hold',            badge: 'bg-slate-700 text-slate-400 border-slate-600',    icon: ClockIcon,               dot: 'bg-slate-400' },
};

// ─── Schedule Modal ────────────────────────────────────────
function ScheduleModal({ job, onClose, onSave }: { job: InstallJob; onClose: () => void; onSave: (id: string, date: string, crew: string) => void }) {
  const [date, setDate] = useState(job.installDate || '');
  const [crew, setCrew] = useState(job.crew || '');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-white mb-1">Schedule Install</h2>
        <p className="text-sm text-slate-400 mb-5">{job.customerName} · {job.windowCount} windows · {job.series}</p>

        <div className="space-y-4">
          <div>
            <label className="label">Install Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="label">Assign Crew</label>
            <select value={crew} onChange={e => setCrew(e.target.value)} className="select">
              <option value="">Select crew...</option>
              {CREWS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {!job.depositPaid && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">Deposit not yet received. Collect before scheduling install.</p>
            </div>
          )}
          <div className="p-3 bg-slate-800/50 rounded-xl text-xs text-slate-400 space-y-1">
            <div className="flex justify-between"><span>Contract Value</span><span className="text-white font-semibold">${job.contractValue.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Deposit Paid</span><span className={job.depositPaid ? 'text-emerald-400' : 'text-red-400'}>{job.depositPaid ? `$${job.depositAmount?.toLocaleString()}` : 'Not Paid'}</span></div>
            <div className="flex justify-between"><span>Est. Duration</span><span className="text-slate-300">{job.estimatedDays} day{job.estimatedDays > 1 ? 's' : ''}</span></div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => { onSave(job.id, date, crew); onClose(); }} disabled={!date || !crew}
            className="btn-primary flex-1 flex items-center gap-2 justify-center">
            <CalendarIcon className="h-4 w-4" /> Schedule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Job Card ──────────────────────────────────────────────
function JobCard({ job, onSchedule, onComplete }: {
  job: InstallJob;
  onSchedule: (job: InstallJob) => void;
  onComplete: (job: InstallJob) => void;
}) {
  const st = STATUS_CONFIG[job.status];
  const balance = job.contractValue - (job.depositAmount || 0);

  return (
    <div className={clsx('card p-5 border-l-4 transition-colors', {
      'border-l-red-500': job.status === 'NEEDS_SCHEDULING',
      'border-l-blue-500': job.status === 'SCHEDULED',
      'border-l-amber-500': job.status === 'IN_PROGRESS',
      'border-l-emerald-500': job.status === 'COMPLETE',
      'border-l-slate-600': job.status === 'ON_HOLD',
    })}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{job.customerName}</span>
            <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full border font-medium', st.badge)}>{st.label}</span>
            {!job.depositPaid && <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">No Deposit</span>}
          </div>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address + ', ' + job.city)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 mt-0.5">
            <MapPinIcon className="h-3 w-3" />{job.address}, {job.city}
          </a>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-white">${job.contractValue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500">Balance: ${balance.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs mb-3">
        <div>
          <div className="text-slate-600 mb-0.5">Windows</div>
          <div className="font-semibold text-slate-300">{job.windowCount} × {job.series}</div>
        </div>
        {job.installDate ? (
          <div>
            <div className="text-slate-600 mb-0.5">Install Date</div>
            <div className="font-semibold text-slate-300">{new Date(job.installDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
        ) : (
          <div>
            <div className="text-slate-600 mb-0.5">Install Date</div>
            <div className="font-semibold text-red-400">Not set</div>
          </div>
        )}
        <div>
          <div className="text-slate-600 mb-0.5">Crew</div>
          <div className="font-semibold text-slate-300">{job.crew ? job.crew.split(' — ')[1] : <span className="text-slate-600">Unassigned</span>}</div>
        </div>
      </div>

      {job.notes && <p className="text-[11px] text-slate-600 italic mb-3 leading-relaxed">{job.notes}</p>}

      <div className="flex gap-2 pt-3 border-t border-slate-800/50">
        <a href={`tel:${job.phone}`} className="btn-sm btn-secondary flex items-center gap-1.5 flex-1 justify-center text-xs">
          <PhoneIcon className="h-3.5 w-3.5" /> {job.phone}
        </a>
        {job.status === 'NEEDS_SCHEDULING' && (
          <button onClick={() => onSchedule(job)} className="btn-sm btn-primary flex items-center gap-1.5 flex-1 justify-center text-xs">
            <CalendarIcon className="h-3.5 w-3.5" /> Schedule Now
          </button>
        )}
        {job.status === 'IN_PROGRESS' && (
          <button onClick={() => onComplete(job)} className="btn-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 flex items-center gap-1.5 flex-1 justify-center text-xs">
            <CheckCircleIcon className="h-3.5 w-3.5" /> Mark Complete
          </button>
        )}
        <Link to={`/leads/${job.leadId}`} className="btn-sm btn-ghost text-xs px-2.5">
          Lead →
        </Link>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────
export function InstallSchedulePage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<InstallStatus | ''>('');
  const [scheduleJob, setScheduleJob] = useState<InstallJob | null>(null);

  // Load real contracted invoices from server
  const { data: scheduleResp, isLoading } = useQuery({
    queryKey: ['install-schedule'],
    queryFn: () => apiClient.invoices.installSchedule(),
    staleTime: 60_000,
  });
  const jobs: InstallJob[] = (scheduleResp as any)?.data ?? [];

  const { mutate: updateInstall } = useMutation({
    mutationFn: (vars: { id: string; payload: any }) =>
      apiClient.invoices.updateInstall(vars.id, vars.payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['install-schedule'] }),
    onError: () => toast.error('Failed to update — please try again'),
  });

  const handleSchedule = (id: string, date: string, crew: string) => {
    updateInstall(
      { id, payload: { installDate: date, crew, installStatus: 'SCHEDULED' } },
      { onSuccess: () => toast.success('Install scheduled!') }
    );
  };

  const handleComplete = (job: InstallJob) => {
    updateInstall(
      { id: job.id, payload: { installStatus: 'COMPLETE' } },
      { onSuccess: () => toast.success(`${job.customerName} marked complete!`) }
    );
  };

  const filtered = isLoading ? [] : jobs.filter(j => !statusFilter || j.status === statusFilter);

  const needsSched = jobs.filter(j => j.status === 'NEEDS_SCHEDULING').length;
  const scheduled  = jobs.filter(j => j.status === 'SCHEDULED').length;
  const inProgress = jobs.filter(j => j.status === 'IN_PROGRESS').length;
  const complete   = jobs.filter(j => j.status === 'COMPLETE').length;
  const totalValue = jobs.filter(j => j.status !== 'COMPLETE').reduce((s, j) => s + j.contractValue, 0);

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <WrenchScrewdriverIcon className="h-5 w-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Install Schedule</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Manage signed contracts and crew assignments</p>
        </div>
        <button onClick={() => toast.info('Contracts appear here automatically when proposals are accepted')}
          className="btn-primary btn-sm flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> Add Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Need Scheduling', value: needsSched, color: 'text-red-400', bg: 'bg-red-500/10', urgent: needsSched > 0 },
          { label: 'Scheduled', value: scheduled, color: 'text-blue-400', bg: 'bg-blue-500/10', urgent: false },
          { label: 'In Progress', value: inProgress, color: 'text-amber-400', bg: 'bg-amber-500/10', urgent: false },
          { label: 'Completed', value: complete, color: 'text-emerald-400', bg: 'bg-emerald-500/10', urgent: false },
          { label: 'Pipeline Value', value: `$${(totalValue / 1000).toFixed(0)}K`, color: 'text-white', bg: 'bg-slate-800', urgent: false },
        ].map(s => (
          <div key={s.label} className={clsx('card p-4', s.urgent && 'border-red-500/20')}>
            <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent alert */}
      {needsSched > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-500/8 border border-red-500/20 rounded-xl">
          <ExclamationTriangleIcon className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300 font-medium">{needsSched} signed contract{needsSched > 1 ? 's' : ''} awaiting install scheduling.</span>
          <button onClick={() => setStatusFilter('NEEDS_SCHEDULING')} className="ml-auto btn-sm bg-red-500/15 text-red-400 border border-red-500/20">
            Show Only These
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {(['', 'NEEDS_SCHEDULING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETE', 'ON_HOLD'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={clsx('btn-sm text-xs', statusFilter === s ? 'btn-primary' : 'btn-secondary')}>
            {s ? STATUS_CONFIG[s]?.label : `All Jobs (${jobs.length})`}
          </button>
        ))}
      </div>

      {/* Jobs grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-56 bg-slate-800/50 rounded-2xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-3 py-16 text-center">
            {jobs.length === 0 ? (
              <>
                <WrenchScrewdriverIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 font-medium text-sm">No contracted jobs yet</p>
                <p className="text-slate-600 text-xs mt-1">Jobs appear automatically when a proposal is accepted and an invoice is created.</p>
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                <p className="text-white font-medium text-sm">No jobs in this category</p>
              </>
            )}
          </div>
        ) : (
          filtered.map(j => <JobCard key={j.id} job={j} onSchedule={setScheduleJob} onComplete={handleComplete} />)
        )}
      </div>

      {/* Schedule modal */}
      <AnimatePresence>
        {scheduleJob && (
          <ScheduleModal job={scheduleJob} onClose={() => setScheduleJob(null)} onSave={handleSchedule} />
        )}
      </AnimatePresence>
    </div>
  );
}
