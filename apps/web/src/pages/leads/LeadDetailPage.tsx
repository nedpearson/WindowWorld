import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  PhoneIcon, EnvelopeIcon, MapPinIcon, CalendarIcon,
  DocumentTextIcon, ClipboardDocumentListIcon, UserIcon,
  PencilIcon, ArrowLeftIcon, BoltIcon, CloudIcon,
  ChatBubbleLeftIcon, ClockIcon, CheckCircleIcon,
  ExclamationCircleIcon, HomeIcon, CurrencyDollarIcon,
  ChevronDownIcon, PlusIcon, ChevronRightIcon,
  ArrowUpRightIcon, SparklesIcon, CalculatorIcon,
  ClipboardDocumentCheckIcon, LightBulbIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid, StarIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { PitchCoachPanel } from '../../components/ai/PitchCoachPanel';

const DEMO_LEAD = {
  id: '1',
  firstName: 'Michael', lastName: 'Trosclair',
  email: 'mtrosclair@hotmail.com', phone: '(225) 555-1003', phone2: null,
  address: '7824 Old Hammond Hwy', city: 'Baton Rouge', state: 'Louisiana', zip: '70809',
  parish: 'East Baton Rouge',
  lat: 30.4156, lng: -91.0634,
  status: 'VERBAL_COMMIT',
  source: 'web',
  leadScore: 91, urgencyScore: 88,
  closeProbability: 0.87,
  estimatedRevenue: 14800,
  isStormLead: true,
  tags: ['storm-2024', 'hurricane-ida-follow', 'vinyl-preferred'],
  lastContactedAt: '2026-04-15T14:30:00Z',
  nextFollowUpAt: '2026-04-20T10:00:00Z',
  createdAt: '2026-04-01',
  notes: 'Homeowner is motivated. Has had condensation on most windows for 2 years. Husband does construction so he wants quality. Wife handles finances.',
  assignedRep: { id: 'rep1', firstName: 'Jake', lastName: 'Thibodaux', phone: '(225) 555-0103' },
  contacts: [
    { id: 'c1', firstName: 'Michael', lastName: 'Trosclair', phone: '(225) 555-1003', email: 'mtrosclair@hotmail.com', isPrimary: true, isOwner: true, notes: 'Decision maker. Call after 5pm.' },
    { id: 'c2', firstName: 'Jennifer', lastName: 'Trosclair', phone: '(225) 555-1099', email: null, isPrimary: false, isSpouse: true, notes: 'Handles budgeting. Prefers text.' },
  ],
  property: {
    id: 'p1', address: '7824 Old Hammond Hwy', city: 'Baton Rouge', zip: '70809',
    yearBuilt: 1979, squareFootage: 2100, stories: 1, propertyType: 'single-family',
    estimatedValue: 245000, estimatedWindowCount: 12, windowCondition: 'POOR',
    openings: [
      { id: 'o1', roomLabel: 'Living Room - Front', windowType: 'DOUBLE_HUNG', condition: 'POOR', measurement: { finalWidth: 35.75, finalHeight: 47.75, status: 'VERIFIED_ONSITE' } },
      { id: 'o2', roomLabel: 'Living Room - Side', windowType: 'DOUBLE_HUNG', condition: 'POOR', measurement: { finalWidth: 35.875, finalHeight: 47.75, status: 'VERIFIED_ONSITE' } },
      { id: 'o3', roomLabel: 'Kitchen', windowType: 'SINGLE_HUNG', condition: 'FAIR', measurement: { finalWidth: 28.0, finalHeight: 36.0, status: 'ESTIMATED', isAiEstimated: true } },
      { id: 'o4', roomLabel: 'Master Bedroom - E', windowType: 'DOUBLE_HUNG', condition: 'FAIR', measurement: null },
      { id: 'o5', roomLabel: 'Master Bedroom - S', windowType: 'DOUBLE_HUNG', condition: 'POOR', measurement: null },
      { id: 'o6', roomLabel: 'Bedroom 2', windowType: 'DOUBLE_HUNG', condition: 'FAIR', measurement: null },
    ],
  },
  activities: [
    { id: 'a1', type: 'CALL', title: 'Initial outreach call', description: 'Called to introduce WindowWorld. Homeowner very interested — mentioned high energy bills and condensation on windows for 2 years.', outcome: 'interested', duration: 12, occurredAt: '2026-04-01T10:00:00Z' },
    { id: 'a2', type: 'TEXT', title: 'Follow-up text sent', description: 'Sent intro text with window savings calculator link.', occurredAt: '2026-04-03T09:15:00Z' },
    { id: 'a3', type: 'APPOINTMENT_SET', title: 'Appointment confirmed', description: 'Scheduled initial consultation for April 8 at 2pm.', occurredAt: '2026-04-05T14:30:00Z' },
    { id: 'a4', type: 'MEETING', title: 'In-home consultation', description: 'Met with Michael and Jennifer. Walked entire home. Identified all 9 windows for replacement. Both very engaged. Strong buying signals.', outcome: 'very-interested', duration: 90, occurredAt: '2026-04-08T14:00:00Z' },
    { id: 'a5', type: 'CALL', title: 'Proposal follow-up call', description: 'Reviewed proposal numbers. Michael asked about Series 4000 upgrade. Jennifer leaning toward financing option. Need final numbers.', duration: 22, occurredAt: '2026-04-12T16:00:00Z' },
    { id: 'a6', type: 'EMAIL', title: 'Revised proposal sent', description: 'Sent updated proposal with Series 4000 upgrade option and 18-month same-as-cash financing breakdown.', occurredAt: '2026-04-14T11:00:00Z' },
    { id: 'a7', type: 'CALL', title: 'Verbal commit confirmed', description: 'Michael confirmed they want to move forward with Series 4000 on 9 windows. Will sign at install scheduling call.', outcome: 'verbal-commit', duration: 18, occurredAt: '2026-04-15T14:30:00Z' },
  ],
  aiPitch: {
    recommendedPitchAngle: 'PREMIUM_VALUE',
    opener: 'Michael, given what you\'ve described about the condensation and your construction background — you know exactly what quality looks like. Let\'s talk about what\'s right for this home.',
    closingAsk: 'What would it take to get your install scheduled this week?',
    nextBestAction: 'Call to schedule signing and install date — this lead is at verbal commit.',
    estimatedCloseProbability: 0.87,
    financingPitch: 'At $82/month for 18 months same-as-cash, the energy savings often offset 40-60% of the payment.',
    urgencyDrivers: ['Series 4000 pricing locked for 30 days', 'Install slots filling for May'],
    confidenceScore: 0.91,
  },
};

const ACTIVITY_ICONS: Record<string, any> = {
  CALL: PhoneIcon,
  EMAIL: EnvelopeIcon,
  TEXT: ChatBubbleLeftIcon,
  MEETING: CalendarIcon,
  APPOINTMENT_SET: CalendarIcon,
  NOTE: ChatBubbleLeftIcon,
  TASK: CheckCircleIcon,
};

const ACTIVITY_COLORS: Record<string, string> = {
  CALL: 'bg-brand-500/15 text-brand-400',
  EMAIL: 'bg-purple-500/15 text-purple-400',
  TEXT: 'bg-emerald-500/15 text-emerald-400',
  MEETING: 'bg-amber-500/15 text-amber-400',
  APPOINTMENT_SET: 'bg-cyan-500/15 text-cyan-400',
  NOTE: 'bg-slate-600/30 text-slate-400',
};

const COND_COLORS: Record<string, string> = {
  EXCELLENT: 'badge-green', GOOD: 'badge-blue', FAIR: 'badge-yellow', POOR: 'badge-red', CRITICAL: 'badge-red',
};

const MEAS_STATUS_LABELS: Record<string, { label: string; class: string }> = {
  VERIFIED_ONSITE: { label: 'Verified', class: 'ai-verified-label' },
  ESTIMATED: { label: 'AI Est.', class: 'ai-estimated-label' },
  APPROVED_FOR_ORDER: { label: 'Order Ready', class: 'ai-verified-label' },
};

type Tab = 'overview' | 'openings' | 'activities' | 'ai-coach' | 'financing';

const STATUS_FLOW = [
  { value: 'NEW_LEAD', label: 'New Lead' },
  { value: 'ATTEMPTING_CONTACT', label: 'Attempting Contact' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'APPOINTMENT_SET', label: 'Appt Set' },
  { value: 'INSPECTION_COMPLETE', label: 'Inspected' },
  { value: 'MEASURING_COMPLETE', label: 'Measured' },
  { value: 'PROPOSAL_SENT', label: 'Proposal Sent' },
  { value: 'FOLLOW_UP', label: 'Follow-Up' },
  { value: 'VERBAL_COMMIT', label: 'Verbal Commit' },
  { value: 'SOLD', label: 'Sold' },
];

const FINANCING_TERMS = [
  { months: 12, rate: 0, label: '12-mo Same-as-Cash' },
  { months: 18, rate: 0, label: '18-mo Same-as-Cash' },
  { months: 24, rate: 9.99, label: '24-mo (9.99% APR)' },
  { months: 60, rate: 12.99, label: '60-mo (12.99% APR)' },
  { months: 120, rate: 14.99, label: '10-yr (14.99% APR)' },
];

const OBJECTION_SCRIPTS: { objection: string; response: string; close: string }[] = [
  {
    objection: 'I need to think about it',
    response: "I completely understand — it's a big decision. Most homeowners tell me the same thing. What specific part are you still weighing? The investment, the timing, or the product itself?",
    close: "If I could show you that this pays for itself in energy savings within 8 years, would that make the decision easier?",
  },
  {
    objection: 'The price is too high',
    response: "I hear you — windows are a real investment. Let me show you two things: first, the monthly financing option that puts this at $82/month, and second, the average $400-600/year in utility savings that comes with double-pane vinyl.",
    close: "Would it make sense to look at what the windows actually cost per month versus what you're spending today on drafts and energy loss?",
  },
  {
    objection: 'I want to get more quotes',
    response: "That's smart — you should compare. Most competitors will show a lower sticker price but charge extra for installation, grilles, and warranty upgrades. Let me show you exactly what's included in ours so you can compare apples to apples.",
    close: "We're typically 10-15% higher than budget contractors but we come with a lifetime warranty and a crew that's been doing this for 20 years in Louisiana.",
  },
  {
    objection: 'My spouse isn\'t here',
    response: "No problem at all — I can leave the proposal and come back when it works for both of you. Or if it's easier, I can do a quick 10-minute video call with your spouse right now so they have the same information.",
    close: "When would be a good time for me to come back when you're both available?",
  },
  {
    objection: 'We\'re not ready right now',
    response: "I understand, there's never a perfect time. I'll tell you though — the current pricing on the Series 4000 is locked for the next 30 days, and our install calendar for May is filling up fast.",
    close: "If I could hold a spot for you and you could cancel with no penalty, would it be worth reserving?",
  },
];

function FinancingCalculator({ estimatedRevenue }: { estimatedRevenue: number }) {
  const [amount, setAmount] = useState(estimatedRevenue);
  const [selectedTerm, setSelectedTerm] = useState(FINANCING_TERMS[1]);

  const monthly = useMemo(() => {
    if (selectedTerm.rate === 0) return amount / selectedTerm.months;
    const r = selectedTerm.rate / 100 / 12;
    return (amount * r * Math.pow(1 + r, selectedTerm.months)) / (Math.pow(1 + r, selectedTerm.months) - 1);
  }, [amount, selectedTerm]);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <CalculatorIcon className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Financing Calculator</h3>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Loan Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
          <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
            className="input pl-7" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Term</label>
        <div className="grid grid-cols-1 gap-1.5">
          {FINANCING_TERMS.map((term) => (
            <button key={term.months} onClick={() => setSelectedTerm(term)}
              className={clsx('flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors',
                selectedTerm.months === term.months
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600')}>
              <span className="text-xs">{term.label}</span>
              <span className="font-semibold">
                ${((amount * (term.rate === 0 ? 1 : (term.rate/100/12 * Math.pow(1+term.rate/100/12, term.months)) / (Math.pow(1+term.rate/100/12, term.months)-1))) / (term.rate === 0 ? term.months : 1)).toFixed(0)}/mo
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 bg-emerald-500/8 rounded-xl border border-emerald-500/20 text-center">
        <div className="text-2xl font-bold text-emerald-400">${monthly.toFixed(0)}<span className="text-sm text-emerald-600">/mo</span></div>
        <div className="text-xs text-slate-400 mt-1">{selectedTerm.label}</div>
        <div className="text-xs text-slate-500 mt-2">
          Est. energy savings offset: <span className="text-emerald-400 font-medium">$35–45/mo</span>
        </div>
        <button onClick={() => toast.success('Financing breakdown copied to clipboard! Paste into proposal.')}
          className="btn-sm btn-primary mt-3 w-full">
          Copy Pitch to Clipboard
        </button>
      </div>
    </div>
  );
}

function ObjecionHandlers() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
        <LightBulbIcon className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Objection Handlers</h3>
        <span className="text-[10px] text-slate-500 ml-1">Tap to reveal script</span>
      </div>
      <div className="divide-y divide-slate-800/50">
        {OBJECTION_SCRIPTS.map((obj, i) => (
          <div key={i}>
            <button onClick={() => setActiveIdx(activeIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors text-left">
              <span className="text-sm font-medium text-slate-300">&ldquo;{obj.objection}&rdquo;</span>
              <ChevronDownIcon className={clsx('h-4 w-4 text-slate-500 transition-transform flex-shrink-0 ml-2', activeIdx === i && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {activeIdx === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-5 pb-4 space-y-3">
                    <div className="p-3 bg-brand-500/8 rounded-lg border border-brand-500/15">
                      <div className="text-[9px] font-semibold text-brand-400 uppercase tracking-wide mb-1.5">Response</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{obj.response}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/8 rounded-lg border border-emerald-500/15">
                      <div className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">Trial Close</div>
                      <p className="text-xs text-emerald-300 leading-relaxed italic">{obj.close}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeadDetailPage({ isNew = false }: { isNew?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [newNote, setNewNote] = useState('');
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const lead = DEMO_LEAD; // In prod: useQuery({ queryKey: ['lead', id], queryFn: () => api.leads.getById(id!) })
  const property = lead.property;
  const verifiedCount = property.openings.filter((o) => o.measurement?.status === 'VERIFIED_ONSITE').length;
  const aiEstCount = property.openings.filter((o) => o.measurement?.isAiEstimated).length;
  const unmeasuredCount = property.openings.filter((o) => !o.measurement).length;

  return (
    <div className="p-6 max-w-screen-xl page-transition">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/leads')} className="btn-ghost btn-sm">
          <ArrowLeftIcon className="h-4 w-4" />
          Leads
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-400">{lead.firstName} {lead.lastName}</span>
      </div>

      {/* Lead header */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg shadow-glow flex-shrink-0">
              {lead.firstName[0]}{lead.lastName[0]}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white">{lead.firstName} {lead.lastName}</h1>
                {lead.isStormLead && (
                  <span className="badge-storm text-xs">
                    <CloudIcon className="h-3.5 w-3.5" />
                    Storm Lead
                  </span>
                )}
                <span className="badge badge-green text-xs">{lead.status.replace(/_/g, ' ')}</span>
              </div>

              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400 transition-colors">
                  <PhoneIcon className="h-3.5 w-3.5" /> {lead.phone}
                </a>
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400 transition-colors">
                  <EnvelopeIcon className="h-3.5 w-3.5" /> {lead.email}
                </a>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPinIcon className="h-3.5 w-3.5" />
                  {lead.address}, {lead.city}, LA {lead.zip} · {lead.parish}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {lead.tags.map((tag) => (
                  <span key={tag} className="badge badge-slate text-[10px]">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{lead.leadScore}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Lead Score</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{lead.urgencyScore}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Urgency</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">${(lead.estimatedRevenue / 1000).toFixed(1)}K</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Est. Value</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{Math.round(lead.closeProbability * 100)}%</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Close Prob.</div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/50 flex-wrap">
          <a href={`tel:${lead.phone}`} className="btn-primary btn-sm flex items-center gap-1.5">
            <PhoneIcon className="h-4 w-4" /> Call
          </a>
          <a href={`sms:${lead.phone}`} className="btn-secondary btn-sm flex items-center gap-1.5">
            <ChatBubbleLeftIcon className="h-4 w-4" /> Text
          </a>
          <a href={`mailto:${lead.email}`} className="btn-secondary btn-sm flex items-center gap-1.5">
            <EnvelopeIcon className="h-4 w-4" /> Email
          </a>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lead.address + ', ' + lead.city + ', ' + lead.state)}`}
            target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm flex items-center gap-1.5">
            <MapPinIcon className="h-4 w-4" /> Navigate
          </a>
          <Link to="/appointments" className="btn-secondary btn-sm flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4" /> Schedule
          </Link>
          <button onClick={() => { setActiveTab('financing'); }} className="btn-secondary btn-sm flex items-center gap-1.5">
            <CurrencyDollarIcon className="h-4 w-4" /> Financing
          </button>
          <button onClick={() => setShowNoteBox(!showNoteBox)} className="btn-secondary btn-sm flex items-center gap-1.5">
            <ChatBubbleLeftIcon className="h-4 w-4" /> Note
          </button>
          
          {/* One-tap status advance */}
          <div className="ml-auto relative">
            <button onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="btn-sm bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5">
              <ArrowUpRightIcon className="h-3.5 w-3.5" /> Advance Stage
              <ChevronDownIcon className={clsx('h-3 w-3 transition-transform', showStatusMenu && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {showStatusMenu && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                  {STATUS_FLOW.map((status) => (
                    <button key={status.value} onClick={() => {
                      setShowStatusMenu(false);
                      toast.success(`Status updated to ${status.label}`);
                    }}
                      className={clsx('w-full text-left px-4 py-2 text-xs transition-colors hover:bg-slate-800',
                        lead.status === status.value ? 'text-brand-400 bg-brand-500/10 font-semibold' : 'text-slate-400')}>
                      {lead.status === status.value && '▸ '}{status.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Note input */}
        <AnimatePresence>
          {showNoteBox && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an internal note..."
                className="textarea min-h-[80px]"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => { toast.success('Note saved'); setNewNote(''); setShowNoteBox(false); }} className="btn-primary btn-sm">
                  Save Note
                </button>
                <button onClick={() => setShowNoteBox(false)} className="btn-ghost btn-sm">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 mb-5 overflow-x-auto">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'openings', label: `Openings (${property.openings.length})` },
          { id: 'activities', label: `Activity (${lead.activities.length})` },
          { id: 'financing', label: 'Financing' },
          { id: 'ai-coach', label: 'AI Coach' },
        ] as { id: Tab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Property */}
              <div className="lg:col-span-2 space-y-4">
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <HomeIcon className="h-4 w-4 text-slate-500" />
                      <h2 className="text-sm font-semibold text-white">Property</h2>
                    </div>
                    <Link to={`/inspections/${id}`} className="btn-secondary btn-sm">
                      <ClipboardDocumentListIcon className="h-4 w-4" /> Inspection
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Year Built', value: property.yearBuilt },
                      { label: 'Sq Ft', value: property.squareFootage?.toLocaleString() },
                      { label: 'Stories', value: property.stories },
                      { label: 'Type', value: property.propertyType },
                      { label: 'Windows', value: property.estimatedWindowCount },
                      { label: 'Est. Value', value: `$${(property.estimatedValue! / 1000).toFixed(0)}K` },
                      { label: 'Condition', value: property.windowCondition },
                      { label: 'Openings', value: property.openings.length },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
                        <div className="text-sm font-semibold text-slate-200 mt-0.5">{value ?? '—'}</div>
                      </div>
                    ))}
                  </div>

                  {/* Measurement readiness */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Measurement Readiness</span>
                      <span className="text-xs text-slate-400">{verifiedCount}/{property.openings.length} verified</span>
                    </div>
                    <div className="score-bar h-2">
                      <div className="score-bar-fill bg-emerald-500" style={{ width: `${(verifiedCount / property.openings.length) * 100}%` }} />
                    </div>
                    {aiEstCount > 0 && (
                      <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-3.5 w-3.5" />
                        {aiEstCount} AI-estimated measurement(s) — require human verification before ordering
                      </p>
                    )}
                  </div>
                </div>

                {/* Contacts */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-slate-500" />
                      <h2 className="text-sm font-semibold text-white">Contacts</h2>
                    </div>
                    <button className="btn-ghost btn-sm"><PlusIcon className="h-4 w-4" /></button>
                  </div>
                  <div className="space-y-3">
                    {lead.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-start justify-between py-2 border-b border-slate-700/30 last:border-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{contact.firstName} {contact.lastName}</span>
                            {contact.isPrimary && <span className="badge badge-blue text-[9px]">Primary</span>}
                            {contact.isSpouse && <span className="badge badge-slate text-[9px]">Spouse</span>}
                          </div>
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="text-xs text-brand-400 hover:text-brand-300">{contact.phone}</a>
                          )}
                          {contact.notes && <p className="text-xs text-slate-600 mt-0.5">{contact.notes}</p>}
                        </div>
                        <div className="flex gap-1">
                          <a href={`tel:${contact.phone}`} className="btn-icon btn-ghost text-slate-600"><PhoneIcon className="h-3.5 w-3.5" /></a>
                          <a href={`sms:${contact.phone}`} className="btn-icon btn-ghost text-slate-600"><ChatBubbleLeftIcon className="h-3.5 w-3.5" /></a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Lead notes */}
                {lead.notes && (
                  <div className="card p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rep Notes</div>
                    <p className="text-sm text-slate-300 leading-relaxed">{lead.notes}</p>
                  </div>
                )}

                {/* Order Readiness Checklist */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardDocumentCheckIcon className="h-4 w-4 text-brand-400" />
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Order Readiness</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'All openings measured', done: verifiedCount === property.openings.length },
                      { label: 'Proposal accepted', done: lead.status === 'VERBAL_COMMIT' || lead.status === 'SOLD' },
                      { label: 'Financing approved', done: false },
                      { label: 'Install date agreed', done: false },
                      { label: 'Contract signed', done: lead.status === 'SOLD' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className={clsx('w-4 h-4 rounded flex items-center justify-center flex-shrink-0',
                          item.done ? 'bg-emerald-500/20 text-emerald-400' : 'border border-slate-700')}>
                          {item.done && <CheckCircleIcon className="h-3 w-3" />}
                        </div>
                        <span className={clsx('text-xs', item.done ? 'text-emerald-300' : 'text-slate-500')}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {verifiedCount < property.openings.length && (
                    <div className="mt-3 pt-2 border-t border-slate-800">
                      <p className="text-[11px] text-amber-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-3.5 w-3.5" />
                        {property.openings.length - verifiedCount} opening(s) not yet measured
                      </p>
                    </div>
                  )}
                </div>

                {/* Key dates */}
                <div className="card p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Timeline</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Lead created</span>
                      <span className="text-slate-300">{new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Last contact</span>
                      <span className="text-slate-300">{new Date(lead.lastContactedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Source</span>
                      <span className="text-slate-300 capitalize">{lead.source.replace(/-/g, ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Financing Summary */}
                <div className="card p-4 bg-emerald-500/5 border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-2">
                    <CurrencyDollarIcon className="h-4 w-4 text-emerald-400" />
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">18-mo Same-as-Cash</div>
                  </div>
                  <div className="text-xl font-bold text-white">
                    ${Math.round(lead.estimatedRevenue / 18)}<span className="text-sm text-slate-400">/month</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">No interest if paid in full within 18 months</div>
                  <button onClick={() => setActiveTab('financing')} className="btn-sm btn-secondary mt-3 w-full text-xs">
                    Full Financing Calculator →
                  </button>
                </div>

                {/* Live AI Pitch Coach Panel */}
                <PitchCoachPanel
                  leadId={id || lead.id}
                  leadName={`${lead.firstName} ${lead.lastName}`}
                />
              </div>

            </div>
          )}

          {activeTab === 'openings' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">{property.openings.length} Window Openings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {verifiedCount} verified · {aiEstCount > 0 ? <span className="text-amber-400">{aiEstCount} AI-estimated (require verification)</span> : null} · {unmeasuredCount} unmeasured
                  </p>
                </div>
                <button className="btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Add Opening</button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Room</th>
                      <th>Type</th>
                      <th>Condition</th>
                      <th>Width</th>
                      <th>Height</th>
                      <th>Measurement</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {property.openings.map((opening, i) => {
                      const measStatus = opening.measurement?.status;
                      const measLabel = measStatus ? MEAS_STATUS_LABELS[measStatus] : null;
                      return (
                        <tr key={opening.id}>
                          <td className="text-slate-600 font-mono text-xs">{i + 1}</td>
                          <td className="font-medium text-slate-200">{opening.roomLabel}</td>
                          <td className="text-xs text-slate-400">{opening.windowType.replace(/_/g, ' ')}</td>
                          <td>
                            <span className={`badge text-[10px] ${COND_COLORS[opening.condition] || 'badge-slate'}`}>
                              {opening.condition}
                            </span>
                          </td>
                          <td className="font-mono text-xs text-slate-300">
                            {opening.measurement?.finalWidth ? `${opening.measurement.finalWidth}"` : '—'}
                          </td>
                          <td className="font-mono text-xs text-slate-300">
                            {opening.measurement?.finalHeight ? `${opening.measurement.finalHeight}"` : '—'}
                          </td>
                          <td>
                            {measLabel
                              ? <span className={measLabel.class}>{measLabel.label}</span>
                              : <span className="text-xs text-slate-600">No measurement</span>
                            }
                          </td>
                          <td>
                            <button className="btn-ghost btn-sm text-xs">Measure</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {aiEstCount > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <ExclamationCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">AI Measurement Disclaimer</p>
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      AI-estimated measurements are based on photo analysis and must be verified by a field technician before placing any window order. Never use AI estimates as order dimensions without onsite confirmation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Activity Timeline</h2>
                <div className="flex gap-2">
                  <button onClick={() => toast.info('Log call coming soon')} className="btn-secondary btn-sm">
                    <PhoneIcon className="h-4 w-4" /> Log Call
                  </button>
                  <button onClick={() => setShowNoteBox(true)} className="btn-secondary btn-sm">
                    <ChatBubbleLeftIcon className="h-4 w-4" /> Note
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-800" />
                <div className="space-y-4">
                  {lead.activities.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).map((activity) => {
                    const Icon = ACTIVITY_ICONS[activity.type] || ChatBubbleLeftIcon;
                    const colorClass = ACTIVITY_COLORS[activity.type] || 'bg-slate-700 text-slate-400';
                    return (
                      <div key={activity.id} className="flex gap-4 pl-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 pb-4 border-b border-slate-700/30 last:border-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-200">{activity.title}</span>
                            <span className="text-xs text-slate-600">
                              {new Date(activity.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-slate-400 leading-relaxed">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            {activity.outcome && (
                              <span className="text-xs text-emerald-400 capitalize">{activity.outcome}</span>
                            )}
                            {activity.duration && (
                              <span className="text-xs text-slate-600">{activity.duration} min</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <FinancingCalculator estimatedRevenue={lead.estimatedRevenue} />
              <div className="space-y-4">
                <div className="card p-5">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Financing Pitch Points</div>
                  <div className="space-y-3">
                    {[
                      { angle: 'Monthly framing', text: `At $${Math.round(lead.estimatedRevenue/18)}/mo, that's less than most car payments.` },
                      { angle: 'Energy payback', text: 'Double-pane vinyl typically saves $400–600/yr — offsets ~40% of payment.' },
                      { angle: 'Home value', text: 'Window replacement recoups 68–72% of cost at sale (Remodeling Magazine 2024).' },
                      { angle: 'Urgency', text: 'Same-as-cash rate locked for 30 days. Interest rates expected to rise Q3.' },
                    ].map((p) => (
                      <div key={p.angle} className="flex gap-3">
                        <div className="w-1 rounded-full bg-emerald-500/50 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-emerald-400">{p.angle}</div>
                          <p className="text-xs text-slate-400 mt-0.5">{p.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card p-5">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Jennifer Notes</div>
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    Jennifer handles budgeting. Prefers monthly framing. Lead notes indicate she's receptive to "same-as-cash" language. 
                    Avoid quoting lump sum unless she asks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-coach' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <PitchCoachPanel
                    leadId={id || lead.id}
                    leadName={`${lead.firstName} ${lead.lastName}`}
                  />
                </div>
                <ObjecionHandlers />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
