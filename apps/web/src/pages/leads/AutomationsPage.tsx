import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BoltIcon as BoltOutline,
  PlayIcon,
  XMarkIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChevronDownIcon } from '@heroicons/react/24/outline';
import { BoltIcon, SparklesIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  useCampaignTemplates,
  useCampaignEnrollments,
  useEnrollLead,
  useUnenrollLead,
  type CampaignTemplate,
  type CampaignEnrollment } from '../../api/automations';
import { useAuthStore } from '../../store/auth.store';
import { isDemoMode } from '../../utils/isDemoMode';

// ─── Types ────────────────────────────────────────────────────
const TEMPLATE_COLORS: Record<string, string> = {
  'new-lead-welcome':      'from-blue-500 to-cyan-500',
  'proposal-sent-followup':'from-purple-500 to-violet-500',
  'storm-lead-urgency':    'from-amber-500 to-orange-500',
  'post-install-review':   'from-emerald-500 to-green-500',
  'no-answer-sequence':    'from-slate-500 to-slate-600' };
const TEMPLATE_ICONS: Record<string, string> = {
  'new-lead-welcome':      '👋',
  'proposal-sent-followup':'📋',
  'storm-lead-urgency':    '⚡',
  'post-install-review':   '⭐',
  'no-answer-sequence':    '📵' };

function formatDelay(hours: number): string {
  if (hours === 0) return 'Immediately';
  if (hours < 24) return `After ${hours}h`;
  const days = Math.round(hours / 24);
  return `Day ${days}`;
}

// ─── Static template definitions ────────────────────────────
const DEMO_TEMPLATES: CampaignTemplate[] = [
  { key: 'new-lead-welcome', name: 'New Lead Welcome Sequence', description: 'Automated welcome + appointment booking for new leads', triggerStatus: 'NEW', steps: [
    { step: 1, delayHours: 0, type: 'EMAIL', subject: 'Welcome — Your Free Estimate', templateKey: 'welcome_email' },
    { step: 2, delayHours: 2, type: 'SMS', templateKey: 'welcome_sms' },
    { step: 3, delayHours: 24, type: 'EMAIL', subject: 'Ready to schedule?', templateKey: 'appt_nudge_1' },
    { step: 4, delayHours: 72, type: 'EMAIL', subject: 'Special offer — limited time', templateKey: 'offer_email' },
    { step: 5, delayHours: 144, type: 'SMS', templateKey: 'final_nudge_sms' },
  ]},
  { key: 'proposal-sent-followup', name: 'Proposal Follow-up Sequence', description: 'Follow-up touches after proposal is sent', triggerStatus: 'PROPOSAL_SENT', steps: [
    { step: 1, delayHours: 24, type: 'EMAIL', subject: 'Did you review your proposal?', templateKey: 'proposal_followup_1' },
    { step: 2, delayHours: 72, type: 'SMS', templateKey: 'proposal_sms_2' },
    { step: 3, delayHours: 120, type: 'EMAIL', subject: 'Questions about your project?', templateKey: 'proposal_followup_3' },
    { step: 4, delayHours: 168, type: 'EMAIL', subject: 'Your proposal expires soon', templateKey: 'proposal_expiry' },
  ]},
  { key: 'storm-lead-urgency', name: 'Storm Damage Urgency', description: 'High-urgency follow-up for storm-damage leads', triggerStatus: 'NEW', steps: [
    { step: 1, delayHours: 0, type: 'EMAIL', subject: '⚡ Storm damage — we can help ASAP', templateKey: 'storm_welcome' },
    { step: 2, delayHours: 1, type: 'SMS', templateKey: 'storm_sms_1' },
    { step: 3, delayHours: 24, type: 'EMAIL', subject: 'Insurance claim windows?', templateKey: 'storm_insurance' },
    { step: 4, delayHours: 48, type: 'SMS', templateKey: 'storm_sms_2' },
  ]},
  { key: 'post-install-review', name: 'Post-Install Review Request', description: 'Request reviews and referrals after job completion', triggerStatus: 'INSTALLED', steps: [
    { step: 1, delayHours: 24, type: 'EMAIL', subject: 'How are your new windows?', templateKey: 'post_install_1' },
    { step: 2, delayHours: 72, type: 'EMAIL', subject: 'Leave us a Google Review!', templateKey: 'review_request' },
    { step: 3, delayHours: 336, type: 'EMAIL', subject: 'Know someone who needs windows?', templateKey: 'referral_ask' },
  ]},
  { key: 'no-answer-sequence', name: 'No-Answer Re-Engagement', description: 'Automated re-engagement when rep cannot reach lead', triggerStatus: null, steps: [
    { step: 1, delayHours: 0, type: 'SMS', templateKey: 'no_answer_sms_1' },
    { step: 2, delayHours: 24, type: 'EMAIL', subject: 'We tried reaching you', templateKey: 'no_answer_email_1' },
    { step: 3, delayHours: 72, type: 'SMS', templateKey: 'no_answer_sms_2' },
    { step: 4, delayHours: 120, type: 'EMAIL', subject: 'Last attempt — your estimate is ready', templateKey: 'no_answer_final' },
  ]},
];

// ─── Build demo enrollments from real lead data ───────────────
function buildDemoEnrollments(leads: any[]): CampaignEnrollment[] {
  if (!leads.length) return [];
  const L = (i: number) => leads[i % leads.length];
  return [
    { id: 'e1', leadId: L(0).id, status: 'ACTIVE',       currentStep: 2, enrolledAt: '2025-04-18T10:00:00Z', campaignTemplateKey: 'proposal-sent-followup', lead: { id: L(0).id, firstName: L(0).firstName, lastName: L(0).lastName, status: L(0).status }, campaign: { name: 'Proposal Follow-up Sequence', templateKey: 'proposal-sent-followup' } },
    { id: 'e2', leadId: L(1).id, status: 'COMPLETED',    currentStep: 5, enrolledAt: '2025-04-15T09:00:00Z', completedAt: '2025-04-18T09:00:00Z', campaignTemplateKey: 'new-lead-welcome', lead: { id: L(1).id, firstName: L(1).firstName, lastName: L(1).lastName, status: L(1).status }, campaign: { name: 'New Lead Welcome Sequence', templateKey: 'new-lead-welcome' } },
    { id: 'e3', leadId: L(2).id, status: 'ACTIVE',       currentStep: 1, enrolledAt: '2025-04-19T08:00:00Z', campaignTemplateKey: 'new-lead-welcome', lead: { id: L(2).id, firstName: L(2).firstName, lastName: L(2).lastName, status: L(2).status, email: L(2).email }, campaign: { name: 'New Lead Welcome Sequence', templateKey: 'new-lead-welcome' } },
    { id: 'e4', leadId: L(3).id, status: 'ACTIVE',       currentStep: 3, enrolledAt: '2025-04-17T14:00:00Z', campaignTemplateKey: 'storm-lead-urgency', lead: { id: L(3).id, firstName: L(3).firstName, lastName: L(3).lastName, status: L(3).status }, campaign: { name: 'Storm Damage Urgency', templateKey: 'storm-lead-urgency' } },
    { id: 'e5', leadId: L(4).id, status: 'ACTIVE',       currentStep: 2, enrolledAt: '2025-04-20T11:00:00Z', campaignTemplateKey: 'storm-lead-urgency', lead: { id: L(4).id, firstName: L(4).firstName, lastName: L(4).lastName, status: L(4).status }, campaign: { name: 'Storm Damage Urgency', templateKey: 'storm-lead-urgency' } },
    { id: 'e6', leadId: L(5).id, status: 'COMPLETED',    currentStep: 4, enrolledAt: '2025-04-10T09:00:00Z', completedAt: '2025-04-17T09:00:00Z', campaignTemplateKey: 'proposal-sent-followup', lead: { id: L(5).id, firstName: L(5).firstName, lastName: L(5).lastName, status: L(5).status }, campaign: { name: 'Proposal Follow-up Sequence', templateKey: 'proposal-sent-followup' } },
    { id: 'e7', leadId: L(6).id, status: 'PAUSED',       currentStep: 2, enrolledAt: '2025-04-12T08:00:00Z', campaignTemplateKey: 'no-answer-sequence', lead: { id: L(6).id, firstName: L(6).firstName, lastName: L(6).lastName, status: L(6).status }, campaign: { name: 'No-Answer Re-Engagement', templateKey: 'no-answer-sequence' } },
    { id: 'e8', leadId: L(7).id, status: 'UNSUBSCRIBED', currentStep: 1, enrolledAt: '2025-04-08T10:00:00Z', campaignTemplateKey: 'new-lead-welcome', lead: { id: L(7).id, firstName: L(7).firstName, lastName: L(7).lastName, status: L(7).status }, campaign: { name: 'New Lead Welcome Sequence', templateKey: 'new-lead-welcome' } },
  ];
}

// ─── Template Card ────────────────────────────────────────────
function TemplateCard({ template }: { template: CampaignTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const emailSteps = template.steps.filter((s) => s.type === 'EMAIL').length;
  const smsSteps = template.steps.filter((s) => s.type === 'SMS').length;
  const durationDays = Math.ceil((template.steps.at(-1)?.delayHours || 0) / 24);

  return (
    <div className="card overflow-hidden">
      {/* Gradient bar */}
      <div className={clsx('h-1 bg-gradient-to-r', TEMPLATE_COLORS[template.key] || 'from-slate-500 to-slate-600')} />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">{TEMPLATE_ICONS[template.key] || '📧'}</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">{template.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-4">
          <span className="flex items-center gap-1"><EnvelopeIcon className="h-3.5 w-3.5" /> {emailSteps} emails</span>
          <span className="flex items-center gap-1"><ChatBubbleLeftRightIcon className="h-3.5 w-3.5" /> {smsSteps} SMS</span>
          <span className="flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" /> {durationDays}d</span>
          {template.triggerStatus && (
            <span className="px-1.5 py-0.5 bg-brand-500/10 text-brand-400 rounded text-[10px] border border-brand-500/20">
              Auto: {template.triggerStatus}
            </span>
          )}
        </div>

        {/* Step preview toggle */}
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mb-3">
          <ChevronDownIcon className={clsx('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Hide' : 'View'} {template.steps.length} steps
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-1.5 mb-4">
                {template.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                      step.type === 'EMAIL' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400')}>
                      {step.type === 'EMAIL' ? '✉' : '💬'}
                    </div>
                    <span className="text-slate-500 w-20 flex-shrink-0">{formatDelay(step.delayHours)}</span>
                    <span className="text-slate-400 truncate">{step.subject || step.templateKey.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Enrollment Row ───────────────────────────────────────────
function EnrollmentRow({ enrollment }: { enrollment: CampaignEnrollment }) {
  const unenroll = useUnenrollLead();
  const template = DEMO_TEMPLATES.find((t) => t.key === enrollment.campaignTemplateKey);
  const totalSteps = template?.steps.length || 0;
  const pct = totalSteps ? Math.round((enrollment.currentStep / totalSteps) * 100) : 0;

  const statusBadge: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    COMPLETED: 'bg-slate-700 text-slate-400 border-slate-600',
    PAUSED: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    UNSUBSCRIBED: 'bg-red-500/15 text-red-400 border-red-500/25' };

  const handleUnenroll = async () => {
    try {
      await unenroll.mutateAsync({ leadId: enrollment.leadId, reason: 'manually stopped by rep' });
      toast.success('Lead unenrolled from campaign');
    } catch {
      toast.error('Failed to unenroll');
    }
  };

  return (
    <tr className="hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-3">
        <Link to={`/leads/${enrollment.leadId}`} className="text-sm font-medium text-white hover:text-brand-400 transition-colors">
          {enrollment.lead?.firstName} {enrollment.lead?.lastName}
        </Link>
        <div className="text-[11px] text-slate-500">{enrollment.lead?.status}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TEMPLATE_ICONS[enrollment.campaignTemplateKey || ''] || '📧'}</span>
          <div>
            <div className="text-sm text-slate-300">{enrollment.campaign?.name}</div>
            {enrollment.status === 'ACTIVE' && (
              <div className="text-[11px] text-slate-600">Step {enrollment.currentStep} of {totalSteps}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium border', statusBadge[enrollment.status] || '')}>
          {enrollment.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {enrollment.status === 'ACTIVE' && (
          <div className="w-24">
            <div className="flex justify-between text-[10px] text-slate-600 mb-1">
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                className={clsx('h-full rounded-full bg-gradient-to-r', TEMPLATE_COLORS[enrollment.campaignTemplateKey || ''] || 'from-slate-500 to-slate-400')}
              />
            </div>
          </div>
        )}
        {enrollment.status === 'COMPLETED' && (
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircleIcon className="h-3.5 w-3.5" /> Complete
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {new Date(enrollment.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-3">
        {enrollment.status === 'ACTIVE' && (
          <button onClick={handleUnenroll} disabled={unenroll.isPending}
            className="btn-icon btn-ghost h-7 w-7 text-slate-500 hover:text-red-400"
            title="Stop campaign for this lead">
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Enroll Modal ─────────────────────────────────────────────
function EnrollModal({ onClose }: { onClose: () => void }) {
  const [leadId, setLeadId] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const enroll = useEnrollLead();

  const handleEnroll = async () => {
    if (!leadId.trim() || !templateKey) { toast.error('Enter a Lead ID and select a campaign'); return; }
    try {
      await enroll.mutateAsync({ leadId: leadId.trim(), campaignTemplateKey: templateKey });
      toast.success('Lead enrolled in campaign!');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Enrollment failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-4">Enroll Lead in Campaign</h2>
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Lead ID</label>
            <input value={leadId} onChange={(e) => setLeadId(e.target.value)}
              placeholder="Paste lead ID from lead detail page..." className="input" />
            <p className="text-[11px] text-slate-600 mt-1">Open the lead, copy its ID from the URL, paste here</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Campaign</label>
            <div className="space-y-2">
              {DEMO_TEMPLATES.map((t) => (
                <button key={t.key} onClick={() => setTemplateKey(t.key)}
                  className={clsx('w-full p-3 rounded-xl border text-left transition-colors',
                    templateKey === t.key ? 'bg-brand-600/15 border-brand-500/40' : 'bg-slate-800 border-slate-700 hover:border-slate-600')}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TEMPLATE_ICONS[t.key]}</span>
                    <div>
                      <div className={clsx('text-sm font-medium', templateKey === t.key ? 'text-brand-400' : 'text-slate-300')}>{t.name}</div>
                      <div className="text-[11px] text-slate-500">{t.steps.length} steps</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={enroll.isPending}>Cancel</button>
          <button onClick={handleEnroll} disabled={enroll.isPending || !leadId || !templateKey}
            className="btn-primary flex-1 flex items-center gap-2 justify-center">
            {enroll.isPending ? 'Enrolling...' : <><PlayIcon className="h-4 w-4" /> Enroll Lead</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function AutomationsPage() {
  const [showEnroll, setShowEnroll] = useState(false);
  const [activeTab, setActiveTab] = useState<'enrollments' | 'templates'>('enrollments');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: apiTemplates } = useCampaignTemplates();
  const { data: apiEnrollments, isLoading } = useCampaignEnrollments();

  // Fetch real leads to populate enrollment demo data with correct IDs
  const { data: leadsData } = useQuery({
    queryKey: ['leads-list-for-automations'],
    queryFn: () => api.leads.list({ limit: 15 }).then((r: any) => r.data || []),
    staleTime: 5 * 60_000,
  });

  const user = useAuthStore((s) => s.user);
  const inDemoMode = isDemoMode(user);

  const templates = Array.isArray(apiTemplates) ? apiTemplates : (inDemoMode ? DEMO_TEMPLATES : []);
  const enrollments = useMemo(() => {
    if (Array.isArray(apiEnrollments) && apiEnrollments.length > 0) return apiEnrollments;
    if (!inDemoMode) return [];
    return buildDemoEnrollments(leadsData || []);
  }, [apiEnrollments, leadsData, inDemoMode]);

  const filtered = enrollments.filter((e) => !statusFilter || e.status === statusFilter);

  const activeCount = enrollments.filter((e) => e.status === 'ACTIVE').length;
  const completedCount = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const totalEmailsSent = enrollments.reduce((s, e) => s + (e.status === 'ACTIVE' ? e.currentStep : 0), 0);

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Automations Engine</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">AI-powered campaign sequences and follow-up automation</p>
        </div>
        <button onClick={() => setShowEnroll(true)} className="btn-primary flex items-center gap-2 btn-sm">
          <PlusIcon className="h-4 w-4" /> Enroll Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Campaigns', value: activeCount, icon: PlayIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Completed', value: completedCount, icon: CheckCircleIcon, color: 'text-slate-400', bg: 'bg-slate-700/50' },
          { label: 'Campaign Templates', value: templates.length, icon: BoltOutline, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Steps Executed', value: totalEmailsSent, icon: EnvelopeIcon, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
              <s.icon className={clsx('h-5 w-5', s.color)} />
            </div>
            <div>
              <div className={clsx('text-xl font-bold', s.color)}>{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Feature Banner */}
      <div className="card p-4 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <div className="flex items-start gap-3">
          <SparklesIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-300">AI Pitch Coach is Active</h3>
            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
              Open any lead's detail page and click <strong className="text-amber-400">AI Pitch Coach</strong> to get a personalized opener, objection handlers, voicemail script, and closing strategy powered by GPT-4o.
            </p>
          </div>
          <Link to="/leads" className="btn-sm bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex-shrink-0">
            Open Leads →
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {(['enrollments', 'templates'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx('px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              activeTab === tab ? 'text-white border-brand-500' : 'text-slate-500 border-transparent hover:text-slate-300')}>
            {tab === 'enrollments' ? `Active Enrollments (${enrollments.length})` : 'Campaign Templates'}
          </button>
        ))}
      </div>

      {/* Enrollments Tab */}
      {activeTab === 'enrollments' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-1.5">
            {['', 'ACTIVE', 'COMPLETED', 'PAUSED', 'UNSUBSCRIBED'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={clsx('btn-sm', statusFilter === s ? 'btn-primary' : 'btn-secondary')}>
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Lead', 'Campaign', 'Status', 'Progress', 'Enrolled', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading enrollments...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <UserGroupIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500">No enrollments {statusFilter ? `with status: ${statusFilter}` : 'yet'}</p>
                        <button onClick={() => setShowEnroll(true)} className="btn-primary btn-sm mt-3 mx-auto">
                          Enroll a Lead →
                        </button>
                      </td>
                    </tr>
                  ) : filtered.map((e) => (
                    <EnrollmentRow key={e.id} enrollment={e} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard key={template.key} template={template} />
          ))}
        </div>
      )}

      {/* Enroll modal */}
      <AnimatePresence>
        {showEnroll && <EnrollModal onClose={() => setShowEnroll(false)} />}
      </AnimatePresence>
    </div>
  );
}
