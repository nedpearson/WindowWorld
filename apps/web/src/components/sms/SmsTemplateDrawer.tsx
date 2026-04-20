import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  XMarkIcon, ChatBubbleLeftIcon, ClipboardDocumentIcon,
  PaperAirplaneIcon, ChevronDownIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ─── Template data ─────────────────────────────────────────
interface SmsTemplate {
  id: string;
  category: string;
  label: string;
  body: string;
  tags: string[];
}

const SMS_TEMPLATES: SmsTemplate[] = [
  // Follow-up
  { id: 't1', category: 'Follow-Up', label: 'Friendly check-in', tags: ['warm', 'soft'], body: `Hi {{firstName}}, this is {{repName}} from WindowWorld. Just checking in — did you have any questions about the windows we discussed? Happy to answer anytime. 😊` },
  { id: 't2', category: 'Follow-Up', label: 'Proposal reminder', tags: ['proposal', 'warm'], body: `Hi {{firstName}}, just a quick note — your WindowWorld proposal is still available for review. Let me know if you'd like to go over it together or have any questions. — {{repName}}` },
  { id: 't3', category: 'Follow-Up', label: 'Proposal expiring soon', tags: ['urgent', 'proposal'], body: `Hi {{firstName}}, heads up — your proposal pricing expires in {{daysLeft}} days. After that, material costs may change. Let me know how you'd like to proceed! — {{repName}}` },
  { id: 't4', category: 'Follow-Up', label: "Haven't heard from you", tags: ['re-engage'], body: `Hi {{firstName}}, I wanted to reach out one more time about your window estimate. If the timing isn't right, no worries at all — just let me know and I'll follow up later. — {{repName}}` },

  // Appointment
  { id: 't5', category: 'Appointment', label: "Confirm tomorrow's appt", tags: ['confirm'], body: `Hi {{firstName}}! Just confirming your free window estimate appointment tomorrow at {{time}}. I'll see you at {{address}}. Reply YES to confirm or call me to reschedule. — {{repName}}` },
  { id: 't6', category: 'Appointment', label: 'Day-of reminder', tags: ['remind'], body: `Good morning {{firstName}}! Looking forward to seeing you today at {{time}}. I'll have some product samples and a rough estimate ready. See you soon! — {{repName}}` },
  { id: 't7', category: 'Appointment', label: 'Running a few minutes late', tags: ['delay'], body: `Hi {{firstName}}, I'm on my way but running about 10-15 minutes behind schedule. I'll be there shortly — thank you for your patience! — {{repName}}` },
  { id: 't8', category: 'Appointment', label: 'Request to reschedule', tags: ['reschedule'], body: `Hi {{firstName}}, I need to reschedule our appointment. I'm sorry for the inconvenience! Would any of these times work: {{option1}} or {{option2}}? — {{repName}}` },

  // Storm Leads
  { id: 't9', category: 'Storm', label: 'Storm damage outreach', tags: ['storm', 'urgent'], body: `Hi {{firstName}}, this is {{repName}} from WindowWorld. We've been helping homeowners in your area with storm damage window replacement. We offer free inspections and help with insurance claims. Can I stop by this week?` },
  { id: 't10', category: 'Storm', label: 'Insurance assistance offer', tags: ['storm', 'insurance'], body: `Hi {{firstName}}! We work directly with insurance adjusters to make the claims process easier. If your windows were damaged, let us handle the paperwork. Free estimate — no obligation. — {{repName}} · WindowWorld` },

  // Post-Install
  { id: 't11', category: 'Post-Install', label: 'Review request', tags: ['review', 'referral'], body: `Hi {{firstName}}, thank you so much for choosing WindowWorld! We hope you're loving your new windows. Would you mind leaving us a quick Google review? It means the world to us: {{reviewLink}}` },
  { id: 't12', category: 'Post-Install', label: 'Referral ask', tags: ['referral'], body: `Hi {{firstName}}! Glad the install went smoothly. 😊 Do you know anyone else who might need windows? For every referral that books, we offer you a $100 thank-you gift card. Just reply with their name! — {{repName}}` },
  { id: 't13', category: 'Post-Install', label: '6-month check-in', tags: ['retention'], body: `Hi {{firstName}}, just checking in 6 months after your WindowWorld install! Everything working great? If you ever have questions or want to add more windows, give me a call. — {{repName}} (225) 555-0000` },

  // No Answer
  { id: 't14', category: 'No Answer', label: 'Missed call follow-up', tags: ['no-answer'], body: `Hi {{firstName}}, I just tried calling but missed you. This is {{repName}} from WindowWorld — I have some info about your free estimate ready. Available for a quick callback? I'm free until {{time}}.` },
  { id: 't15', category: 'No Answer', label: 'Last attempt', tags: ['no-answer', 'final'], body: `Hi {{firstName}}, this will be my last outreach so I don't bother you. If you'd like a free window estimate, I'm here whenever you're ready. No pressure — take care! — {{repName}} · WindowWorld` },

  // Financing
  { id: 't16', category: 'Financing', label: 'Monthly payment framing', tags: ['financing'], body: `Hi {{firstName}}, quick note — your quote works out to about ${{monthly}}/month on our 18-month same-as-cash plan. That's less than most car payments! Want me to send over the financing details? — {{repName}}` },
  { id: 't17', category: 'Financing', label: 'Same-as-cash reminder', tags: ['financing', 'urgent'], body: `Hi {{firstName}}, just a reminder — our 0% interest financing rates are locked for {{daysLeft}} more days. After that, rates adjust. Want to lock in before then? Happy to set it up quickly. — {{repName}}` },
];

const CATEGORIES = ['All', ...Array.from(new Set(SMS_TEMPLATES.map(t => t.category)))];

const MERGE_FIELDS = ['{{firstName}}', '{{repName}}', '{{time}}', '{{address}}', '{{daysLeft}}', '{{monthly}}', '{{reviewLink}}', '{{option1}}', '{{option2}}'];

// ─── Component ─────────────────────────────────────────────
interface SmsTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  contactPhone?: string;
  repName?: string;
  defaults?: Record<string, string>;
}

export function SmsTemplateDrawer({ isOpen, onClose, contactName, contactPhone, repName = 'Your Rep', defaults = {} }: SmsTemplateDrawerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<SmsTemplate | null>(null);
  const [edited, setEdited] = useState('');
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const fillMergeFields = (body: string) => {
    const first = contactName?.split(' ')[0] || 'there';
    return body
      .replace(/\{\{firstName\}\}/g, first)
      .replace(/\{\{repName\}\}/g, repName)
      .replace(/\{\{address\}\}/g, defaults.address || '[address]')
      .replace(/\{\{time\}\}/g, defaults.time || '[time]')
      .replace(/\{\{daysLeft\}\}/g, defaults.daysLeft || '[X]')
      .replace(/\{\{monthly\}\}/g, defaults.monthly || '[amount]')
      .replace(/\{\{reviewLink\}\}/g, defaults.reviewLink || 'g.page/windowworldla/review')
      .replace(/\{\{option1\}\}/g, defaults.option1 || 'Monday at 10am')
      .replace(/\{\{option2\}\}/g, defaults.option2 || 'Wednesday at 2pm');
  };

  const handleSelect = (tmpl: SmsTemplate) => {
    setSelected(tmpl);
    setEdited(fillMergeFields(tmpl.body));
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(edited).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard! Open your messages app and paste.');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleSend = () => {
    if (!contactPhone) { toast.error('No phone number on file'); return; }
    const encoded = encodeURIComponent(edited);
    window.open(`sms:${contactPhone}?body=${encoded}`, '_blank');
    toast.success('Opening SMS app with template pre-filled');
    onClose();
  };

  const filtered = SMS_TEMPLATES.filter(t => {
    if (category !== 'All' && t.category !== category) return false;
    if (search && !t.label.toLowerCase().includes(search.toLowerCase()) && !t.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedFiltered = CATEGORIES.filter(c => c !== 'All').reduce<Record<string, SmsTemplate[]>>((acc, cat) => {
    const items = filtered.filter(t => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

          {/* Drawer */}
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftIcon className="h-4 w-4 text-brand-400" />
                  <h2 className="text-sm font-bold text-white">SMS Templates</h2>
                </div>
                {contactName && (
                  <p className="text-xs text-slate-500 mt-0.5">To: {contactName}{contactPhone && <span className="text-slate-600"> · {contactPhone}</span>}</p>
                )}
              </div>
              <button onClick={onClose} className="btn-icon btn-ghost h-8 w-8"><XMarkIcon className="h-4 w-4" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Template list */}
              <div className="w-56 flex-shrink-0 border-r border-slate-800 flex flex-col">
                {/* Search */}
                <div className="p-3 border-b border-slate-800">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                      placeholder="Search templates..." />
                  </div>
                </div>
                {/* Category chips */}
                <div className="px-2 py-2 flex flex-wrap gap-1 border-b border-slate-800">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCategory(c)}
                      className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors',
                        category === c ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'text-slate-500 hover:text-slate-300')}>
                      {c}
                    </button>
                  ))}
                </div>
                {/* List */}
                <div className="flex-1 overflow-y-auto py-1">
                  {Object.entries(groupedFiltered).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="px-3 pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">{cat}</div>
                      {items.map(t => (
                        <button key={t.id} onClick={() => handleSelect(t)}
                          className={clsx('w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-800/60',
                            selected?.id === t.id ? 'bg-brand-600/10 text-brand-300 border-r-2 border-brand-500' : 'text-slate-400')}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className="px-3 py-6 text-center text-xs text-slate-600">No templates match</div>
                  )}
                </div>
              </div>

              {/* Preview & edit */}
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {selected ? (
                  <>
                    <div className="mb-2">
                      <div className="text-xs font-semibold text-white">{selected.label}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{selected.category} · {edited.length} chars</div>
                    </div>
                    <textarea ref={textRef} value={edited} onChange={e => setEdited(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 leading-relaxed resize-none focus:outline-none focus:border-brand-500 min-h-0"
                      placeholder="Edit message here..." />

                    {/* Merge field chips */}
                    <div className="mt-2">
                      <div className="text-[10px] text-slate-600 mb-1">Insert field:</div>
                      <div className="flex flex-wrap gap-1">
                        {MERGE_FIELDS.map(f => (
                          <button key={f} onClick={() => {
                            const el = textRef.current;
                            if (el) {
                              const pos = el.selectionStart;
                              setEdited(prev => prev.slice(0, pos) + f + prev.slice(pos));
                            } else {
                              setEdited(prev => prev + ' ' + f);
                            }
                          }} className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded hover:bg-slate-600 hover:text-slate-200 font-mono transition-colors">
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleCopy}
                        className={clsx('btn-sm flex items-center gap-1.5 flex-1 justify-center transition-all',
                          copied ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'btn-secondary')}>
                        {copied ? <><CheckCircleIcon className="h-3.5 w-3.5" /> Copied!</> : <><ClipboardDocumentIcon className="h-3.5 w-3.5" /> Copy</>}
                      </button>
                      <button onClick={handleSend} disabled={!contactPhone}
                        className="btn-sm btn-primary flex items-center gap-1.5 flex-1 justify-center">
                        <PaperAirplaneIcon className="h-3.5 w-3.5" />
                        {contactPhone ? 'Open SMS App' : 'No Phone #'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <ChatBubbleLeftIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Select a template to preview</p>
                      <p className="text-xs text-slate-700 mt-1">Merge fields auto-filled for {contactName || 'this contact'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
