import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  StarIcon, ChatBubbleLeftIcon, PhoneIcon, EnvelopeIcon,
  ArrowTopRightOnSquareIcon, GiftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { api } from '../../api/client';

// ─── Types ────────────────────────────────────────────────
type ReviewStatus = 'PENDING' | 'SENT' | 'RECEIVED' | 'DECLINED';
type ReferralStatus = 'NOT_ASKED' | 'ASKED' | 'PROVIDED' | 'CONVERTED';

interface CompletedJob {
  id: string;
  leadId: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  completedDate: string;
  series: string;
  windowCount: number;
  contractValue: number;
  repName: string;
  reviewStatus: ReviewStatus;
  reviewRating?: number;
  referralStatus: ReferralStatus;
  referralCount?: number;
  referralValue?: number;
  daysPostInstall: number;
}


function mapLead(l: any, localStates: Record<string, Partial<CompletedJob>>): CompletedJob {
  const primary = l.contacts?.[0];
  const repName = l.assignedRep ? `${l.assignedRep.firstName} ${l.assignedRep.lastName}` : 'Unassigned';
  const days = Math.max(0, Math.floor((Date.now() - new Date(l.updatedAt || l.createdAt).getTime()) / 86_400_000));
  const contractValue = Number(l.quote?.grandTotal || l.quote?.total || l.estimatedValue || l.estimatedRevenue || 0);
  return {
    id:             l.id,
    leadId:         l.id,
    customerName:   primary ? `${primary.firstName} ${primary.lastName}` : `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Customer',
    phone:          primary?.phone || l.phone || '',
    email:          primary?.email || l.email,
    address:        l.address || '',
    city:           l.city || '',
    completedDate:  (l.updatedAt || l.createdAt || '').slice(0, 10),
    series:         l.quote?.series || l.productInterest || 'Windows',
    windowCount:    l.quote?.totalWindows || l.openingCount || 0,
    contractValue,
    repName,
    daysPostInstall: days,
    // local-override fields
    reviewStatus:   localStates[l.id]?.reviewStatus   ?? 'PENDING',
    reviewRating:   localStates[l.id]?.reviewRating,
    referralStatus: localStates[l.id]?.referralStatus ?? 'NOT_ASKED',
    referralCount:  localStates[l.id]?.referralCount,
    referralValue:  localStates[l.id]?.referralValue };
}




const REVIEW_STATUS: Record<ReviewStatus, { label: string; badge: string }> = {
  PENDING:  { label: 'Not Yet Sent',   badge: 'bg-slate-700 text-slate-400 border-slate-600' },
  SENT:     { label: 'Request Sent',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  RECEIVED: { label: 'Review Left ✓',  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  DECLINED: { label: 'Declined',       badge: 'bg-slate-700 text-slate-500 border-slate-600' } };

const REFERRAL_STATUS: Record<ReferralStatus, { label: string; badge: string }> = {
  NOT_ASKED:  { label: 'Not Asked',     badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  ASKED:      { label: 'Asked',          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  PROVIDED:   { label: 'Referral Given', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  CONVERTED:  { label: 'Converted ✓',   badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' } };

const GOOGLE_REVIEW_URL = 'https://g.page/windowworldla/review';

// ─── Request Modal ─────────────────────────────────────────
function ReviewRequestModal({ job, type, onClose, onSent }: {
  job: CompletedJob; type: 'REVIEW' | 'REFERRAL'; onClose: () => void; onSent: (id: string, type: 'REVIEW' | 'REFERRAL') => void;
}) {
  const firstName = job.customerName.split(' ')[0];
  const reviewMsg = `Hi ${firstName}! 😊 This is ${job.repName} from WindowWorld — hope you're loving your new windows! Would you take 2 minutes to leave us a Google review? It really helps our small team: ${GOOGLE_REVIEW_URL}\nThank you so much, ${firstName}! 🙏`;
  const referralMsg = `Hi ${firstName}! This is ${job.repName} from WindowWorld. We're so glad you love your new windows! Do you know anyone who might need windows? For every referral that books, we send you a $100 gift card. Just reply with their name and number! 🎁`;
  const msg = type === 'REVIEW' ? reviewMsg : referralMsg;
  const [edited, setEdited] = useState(msg);

  const sendSms = () => {
    window.open(`sms:${job.phone}?body=${encodeURIComponent(edited)}`, '_blank');
    onSent(job.id, type);
    onClose();
    toast.success(`${type === 'REVIEW' ? 'Review request' : 'Referral ask'} sent to ${job.customerName}`);
  };
  const sendEmail = () => {
    window.open(`mailto:${job.email}?subject=${encodeURIComponent(type === 'REVIEW' ? 'How are your new windows?' : 'Know someone who needs windows?')}&body=${encodeURIComponent(edited)}`, '_blank');
    onSent(job.id, type);
    onClose();
    toast.success(`Email opened for ${job.customerName}`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">
            {type === 'REVIEW' ? '⭐ Send Review Request' : '🎁 Send Referral Ask'}
          </h2>
          <button onClick={onClose} className="btn-icon btn-ghost h-7 w-7"><XMarkIcon className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-3">To: {job.customerName} · {job.phone}</p>
        <textarea value={edited} onChange={e => setEdited(e.target.value)} rows={6}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 leading-relaxed resize-none focus:outline-none focus:border-brand-500 mb-4" />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          {job.email && (
            <button onClick={sendEmail} className="btn-secondary flex-1 flex items-center gap-1.5 justify-center text-sm">
              <EnvelopeIcon className="h-3.5 w-3.5" /> Email
            </button>
          )}
          <button onClick={sendSms} className="btn-primary flex-1 flex items-center gap-1.5 justify-center text-sm">
            <ChatBubbleLeftIcon className="h-3.5 w-3.5" /> Text
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Job Row ───────────────────────────────────────────────
function JobRow({ job, onRequestReview, onRequestReferral }: {
  job: CompletedJob;
  onRequestReview: (job: CompletedJob) => void;
  onRequestReferral: (job: CompletedJob) => void;
}) {
  const rv = REVIEW_STATUS[job.reviewStatus];
  const rf = REFERRAL_STATUS[job.referralStatus];
  const urgentReview = job.reviewStatus === 'PENDING' && job.daysPostInstall >= 3;
  const urgentReferral = job.referralStatus === 'NOT_ASKED' && job.daysPostInstall >= 3;

  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-white">{job.customerName}</div>
        <div className="text-[11px] text-slate-500">{job.city} · {job.daysPostInstall}d post-install</div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">{job.windowCount} × {job.series}</td>
      <td className="px-4 py-3 font-semibold text-slate-200 text-xs">${job.contractValue.toLocaleString()}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full border font-medium', rv.badge)}>{rv.label}</span>
          {job.reviewRating && (
            <div className="flex">
              {Array.from({ length: job.reviewRating }).map((_, i) => (
                <StarSolid key={i} className="h-3 w-3 text-amber-400" />
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full border font-medium', rf.badge)}>{rf.label}</span>
        {job.referralCount && (
          <div className="text-[10px] text-cyan-400 mt-0.5">{job.referralCount} referral · ${job.referralValue?.toLocaleString()}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {job.reviewStatus === 'PENDING' && (
            <button onClick={() => onRequestReview(job)}
              className={clsx('btn-sm text-xs flex items-center gap-1', urgentReview ? 'btn-primary' : 'btn-secondary')}>
              <StarIcon className="h-3.5 w-3.5" /> Review
            </button>
          )}
          {job.referralStatus === 'NOT_ASKED' && (
            <button onClick={() => onRequestReferral(job)}
              className={clsx('btn-sm text-xs flex items-center gap-1', urgentReferral ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20' : 'btn-secondary')}>
              <GiftIcon className="h-3.5 w-3.5" /> Referral
            </button>
          )}
          <a href={`tel:${job.phone}`} className="btn-icon btn-ghost h-7 w-7 text-slate-600 hover:text-slate-300">
            <PhoneIcon className="h-3.5 w-3.5" />
          </a>
          <Link to={`/leads/${job.leadId}`} className="btn-icon btn-ghost h-7 w-7 text-slate-600 hover:text-slate-300">
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────
export function PostInstallPage() {
  // localStates: tracks review/referral actions on top of the server-fetched list
  const [localStates, setLocalStates] = useState<Record<string, Partial<CompletedJob>>>({});
  const [modalJob, setModalJob] = useState<CompletedJob | null>(null);
  const [modalType, setModalType] = useState<'REVIEW' | 'REFERRAL'>('REVIEW');
  const [filterRep, setFilterRep] = useState('');

  const { data: rawLeads, isLoading } = useQuery({
    queryKey: ['installed-leads'],
    queryFn: () => api.analytics.installedLeads(80).then((r: any) => r.data || []),
    staleTime: 120_000 });

  const jobs: CompletedJob[] = (rawLeads || []).map((l: any) => mapLead(l, localStates));

  const reps = Array.from(new Set(jobs.map(j => j.repName)));

  const handleSent = (id: string, type: 'REVIEW' | 'REFERRAL') => {
    setLocalStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...(type === 'REVIEW' ? { reviewStatus: 'SENT' as ReviewStatus } : { referralStatus: 'ASKED' as ReferralStatus }) } }));
  };

  const filtered = filterRep ? jobs.filter(j => j.repName === filterRep) : jobs;

  if (isLoading) return (
    <div className="p-6 h-[50vh] flex items-center justify-center">
      <div className="text-center text-slate-500 text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto mb-3"></div>
        Loading reviews...
      </div>
    </div>
  );

  const reviewsReceived = jobs.filter(j => j.reviewStatus === 'RECEIVED').length;
  const avgRating = jobs.filter(j => j.reviewRating).reduce((s, j) => s + (j.reviewRating || 0), 0) / (jobs.filter(j => j.reviewRating).length || 1);
  const referralsGiven = jobs.filter(j => j.referralStatus === 'PROVIDED' || j.referralStatus === 'CONVERTED').length;
  const referralRevenue = jobs.filter(j => j.referralValue).reduce((s, j) => s + (j.referralValue || 0), 0);
  const needsAction = jobs.filter(j => (j.reviewStatus === 'PENDING' || j.referralStatus === 'NOT_ASKED') && j.daysPostInstall >= 3).length;

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <StarIcon className="h-5 w-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Post-Install Reviews & Referrals</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Track customer satisfaction and turn installs into referrals</p>
        </div>
        <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"
          className="btn-secondary btn-sm flex items-center gap-1.5">
          <ArrowTopRightOnSquareIcon className="h-4 w-4" /> View Google Profile
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Reviews Received', value: reviewsReceived, sub: `avg ${avgRating.toFixed(1)}/5 ★`, color: 'text-amber-400', urgent: false },
          { label: 'Referrals Given', value: referralsGiven, sub: `$${(referralRevenue / 1000).toFixed(0)}K referral value`, color: 'text-cyan-400', urgent: false },
          { label: 'Need Review Req', value: jobs.filter(j => j.reviewStatus === 'PENDING').length, sub: 'not yet requested', color: 'text-slate-400', urgent: false },
          { label: 'Actions Needed', value: needsAction, sub: '3+ days post-install', color: 'text-red-400', urgent: needsAction > 0 },
        ].map(s => (
          <div key={s.label} className={clsx('card p-4', s.urgent && 'border-red-500/20')}>
            <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
            <div className="text-[11px] text-slate-600">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Action needed alert */}
      {needsAction > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
          <StarIcon className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-300 font-medium">
            {needsAction} completed job{needsAction > 1 ? 's are' : ' is'} past the 3-day mark without a review request or referral ask.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterRep('')} className={clsx('btn-sm', !filterRep ? 'btn-primary' : 'btn-secondary')}>All Reps</button>
        {reps.map(r => (
          <button key={r} onClick={() => setFilterRep(r)} className={clsx('btn-sm text-xs', filterRep === r ? 'btn-primary' : 'btn-secondary')}>{r.split(' ')[0]}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Customer', 'Product', 'Value', 'Review', 'Referral', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map(j => (
                <JobRow key={j.id} job={j}
                  onRequestReview={j => { setModalJob(j); setModalType('REVIEW'); }}
                  onRequestReferral={j => { setModalJob(j); setModalType('REFERRAL'); }} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalJob && (
          <ReviewRequestModal job={modalJob} type={modalType} onClose={() => setModalJob(null)} onSent={handleSent} />
        )}
      </AnimatePresence>
    </div>
  );
}
