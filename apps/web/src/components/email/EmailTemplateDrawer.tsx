import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  XMarkIcon, EnvelopeIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon,
  CheckCircleIcon, ChevronRightIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuthStore } from '../../store/auth.store';

// ─── Email template data ───────────────────────────────────
interface EmailTemplate {
  id: string;
  category: string;
  name: string;
  subject: string;
  body: string;
  tags: string[];
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  // Follow-Up
  {
    id: 'fu1', category: 'Follow-Up', name: 'Post-Appointment Thank You',
    subject: 'Thank You — WindowWorld Proposal Inside',
    body: `Hi {{firstName}},\n\nThank you so much for your time today! It was a pleasure meeting you and walking through your home.\n\nI've attached your personalized proposal for {{windowCount}} windows at your {{address}} address. You can also view it online here: {{proposalLink}}\n\nAs we discussed, your total investment is {{totalPrice}} — or just {{monthlyPayment}}/month on our {{financingTerm}} plan.\n\nPlease don't hesitate to call or text me with any questions. I'm here to help.\n\nWarm regards,\n{{repName}}\nWindowWorld Louisiana\n{{repPhone}}`,
    tags: ['appointment', 'proposal', 'follow-up'],
  },
  {
    id: 'fu2', category: 'Follow-Up', name: '2-Day Proposal Follow-Up',
    subject: 'Quick Check-In — Your WindowWorld Proposal',
    body: `Hi {{firstName}},\n\nI just wanted to follow up and make sure you had a chance to review your proposal. If you have any questions about the Series 4000 windows, financing options, or install timeline, I'm happy to walk through everything with you.\n\nA few things worth knowing:\n• Current pricing is locked for 30 days\n• Install slots for May are filling quickly\n• We can usually schedule within 2 weeks of accepting\n\nWould love to get your install on the calendar when you're ready.\n\n{{repName}} | {{repPhone}}`,
    tags: ['follow-up', 'urgency'],
  },
  {
    id: 'fu3', category: 'Follow-Up', name: '5-Day Final Follow-Up',
    subject: 'Last Check-In — {{firstName}}',
    body: `Hi {{firstName}},\n\nI wanted to reach out one more time about your WindowWorld proposal. I understand this is a big decision and I don't want to rush you.\n\nIf pricing is a concern, I'd love to explore our financing options together — many homeowners are surprised how affordable new windows can be on a monthly basis.\n\nIf the timing isn't right, I completely understand. Just know we're here when you're ready.\n\nThanks again for considering WindowWorld,\n{{repName}}\n{{repPhone}}`,
    tags: ['follow-up', 'nurture'],
  },
  // Proposal
  {
    id: 'pr1', category: 'Proposal', name: 'Proposal Delivery',
    subject: 'Your WindowWorld Proposal — {{address}}',
    body: `Dear {{firstName}},\n\nThank you for the opportunity to assess your windows at {{address}}.\n\nAttached is your customized proposal for {{windowCount}} replacement windows using our {{series}} product line. Here's a quick summary:\n\n• Windows: {{windowCount}} units\n• Series: {{series}}\n• Total: {{totalPrice}}\n• Financing: {{monthlyPayment}}/month ({{financingTerm}})\n\nYou can view and accept your proposal online: {{proposalLink}}\n\nThis proposal is valid for 30 days. If you have any questions, please don't hesitate to reach out.\n\n{{repName}}\nWindowWorld Louisiana`,
    tags: ['proposal', 'quote'],
  },
  {
    id: 'pr2', category: 'Proposal', name: 'Revised Proposal',
    subject: 'Updated Proposal — WindowWorld',
    body: `Hi {{firstName}},\n\nAs we discussed, I've updated your proposal to reflect the changes we talked about. The revised version with our {{series}} windows is ready for your review: {{proposalLink}}\n\nKey changes:\n• Updated window count and sizing\n• Adjusted financing breakdown\n\nPlease review and let me know if anything needs adjusting.\n\n{{repName}} | {{repPhone}}`,
    tags: ['proposal', 'revision'],
  },
  // Storm
  {
    id: 'st1', category: 'Storm', name: 'Storm Damage Outreach',
    subject: 'Storm Damage Window Assessment — Free Estimate',
    body: `Hello {{firstName}},\n\nI hope your family is safe following the recent storms in {{city}}. I'm {{repName}} with WindowWorld Louisiana, and I wanted to reach out specifically about any window damage you may have experienced.\n\nWe are currently offering:\n• Free storm damage assessments\n• Priority scheduling for affected homeowners\n• Insurance documentation assistance\n• Financing options designed for storm recovery\n\nIf you'd like a free in-home assessment, just reply to this email or call/text me directly.\n\n{{repName}}\nWindowWorld Louisiana\n{{repPhone}}`,
    tags: ['storm', 'outreach'],
  },
  {
    id: 'st2', category: 'Storm', name: 'Insurance Claim Support',
    subject: 'Window Insurance Claims — WindowWorld Can Help',
    body: `Hi {{firstName}},\n\nFollowing up on your storm damage assessment. We've helped dozens of homeowners in {{city}} navigate the insurance claim process for window replacements.\n\nWe can provide:\n• Detailed damage documentation for your adjuster\n• Line-item estimates matching insurance requirements\n• Direct coordination with your insurance company if needed\n\nPlease don't let the process feel overwhelming — we've done this many times and are here to help every step of the way.\n\n{{repName}} | {{repPhone}}`,
    tags: ['storm', 'insurance'],
  },
  // Financing
  {
    id: 'fin1', category: 'Financing', name: 'Financing Breakdown',
    subject: 'WindowWorld Financing Options — {{firstName}}',
    body: 'Hi {{firstName}},\\n\\nI wanted to break down the financing options we have available so you can choose what works best for your budget:\\n\\n🟢 18-Month Same-as-Cash (0% Interest)\\n   → ${{monthly18}}/month — no interest if paid in full within 18 months\\n\\n🔵 36-Month at 6.9%\\n   → ${{monthly36}}/month — great for budget flexibility\\n\\n🔵 60-Month at 9.9%\\n   → ${{monthly60}}/month — lowest monthly payment option\\n\\nFor context, new windows typically reduce energy bills by $35–45/month, which offsets a meaningful portion of your payment.\\n\\nWould love to get on a quick call to go over whichever option makes the most sense for you.\\n\\n{{repName}} | {{repPhone}}',
    tags: ['financing', 'payment'],
  },
  {
    id: 'fin2', category: 'Financing', name: 'Credit App Link',
    subject: 'Quick Credit Application — WindowWorld',
    body: `Hi {{firstName}},\n\nGreat news — our financing application takes about 5 minutes and won't affect your credit score during the pre-approval check.\n\nYou can apply here: [FINANCING LINK]\n\nOnce approved, we can lock in your pricing and get your install on the calendar right away. Pre-approvals come back typically within minutes.\n\nLet me know if you have any questions!\n\n{{repName}} | {{repPhone}}`,
    tags: ['financing', 'credit'],
  },
  // Post-Install
  {
    id: 'pi1', category: 'Post-Install', name: 'Install Thank You + Review Ask',
    subject: 'Thank You, {{firstName}}! Quick Favor?',
    body: `Hi {{firstName}},\n\nI hope you're loving your new {{series}} windows! It was a pleasure working with you on this project.\n\nIf you have a moment, a Google review would mean the world to our team. It only takes 2 minutes and helps other homeowners find trusted window replacement services:\n\n→ Leave a Review: [GOOGLE REVIEW LINK]\n\nAlso — if any friends, family, or neighbors mention they're thinking about new windows, please feel free to pass along my name. We offer a $100 Visa gift card for every referral that results in an install.\n\nThanks again for choosing WindowWorld!\n\n{{repName}}\nWindowWorld Louisiana\n{{repPhone}}`,
    tags: ['post-install', 'review', 'referral'],
  },
  {
    id: 'pi2', category: 'Post-Install', name: 'Warranty Registration',
    subject: 'Register Your WindowWorld Warranty',
    body: `Hi {{firstName}},\n\nCongratulations on your new WindowWorld windows! To activate your lifetime warranty, please complete a quick registration:\n\n→ Register Your Warranty: [WARRANTY LINK]\n\nThis ensures you're covered for:\n• Lifetime limited warranty on glass\n• Lifetime warranty on frames and hardware\n• 10-year installation workmanship warranty\n\nKeep this email for your records. If you ever have a warranty question, just reach out directly.\n\n{{repName}}\nWindowWorld Louisiana\n{{repPhone}}`,
    tags: ['post-install', 'warranty'],
  },
  // Nurture
  {
    id: 'nu1', category: 'Nurture', name: 'Energy Savings Check-In',
    subject: 'Have You Noticed Lower Energy Bills?',
    body: `Hi {{firstName}},\n\nJust checking in — Louisiana summers are here, and homeowners who replaced windows last year are seeing meaningful reductions in cooling costs.\n\nIf you're still considering window replacement, now is a great time to act before peak heat. Our install calendar fills up fast in summer.\n\nWould you like me to send over an updated proposal with current pricing?\n\n{{repName}} | {{repPhone}}`,
    tags: ['nurture', 'seasonal'],
  },
  {
    id: 'nu2', category: 'Nurture', name: 'Seasonal Price Lock',
    subject: 'Window Prices Are Rising — Lock In Now',
    body: `Hi {{firstName}},\n\nQuick heads up — manufacturer pricing on the Series 4000 and 6000 lines is increasing next quarter. If you're still considering your project, I wanted to give you the opportunity to lock in your current quote before the change takes effect.\n\nYour current proposal is valid through {{expiresDate}}. To lock in your pricing, simply accept the proposal online or give me a call.\n\n{{repName}}\n{{repPhone}}`,
    tags: ['nurture', 'urgency'],
  },
];

const CATEGORIES = [...new Set(EMAIL_TEMPLATES.map(t => t.category))];

const MERGE_FIELDS = [
  '{{firstName}}', '{{repName}}', '{{repPhone}}', '{{address}}', '{{city}}',
  '{{series}}', '{{windowCount}}', '{{totalPrice}}', '{{monthlyPayment}}',
  '{{financingTerm}}', '{{proposalLink}}', '{{expiresDate}}',
];

interface EmailTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  contactEmail?: string;
  repName?: string;
  prefilledData?: Record<string, string>;
}

export function EmailTemplateDrawer({
  isOpen, onClose, contactName = 'Customer', contactEmail = '',
  repName = '', prefilledData = {},
}: EmailTemplateDrawerProps) {
  // Fall back to the authenticated user's full name when no repName is passed
  const authUser = useAuthStore((s) => s.user);
  const effectiveRepName = repName || (authUser
    ? `${authUser.firstName ?? ''} ${authUser.lastName ?? ''}`.trim()
    : '') || 'Your Rep';
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const firstName = contactName.split(' ')[0];

  const applyMerge = (text: string) =>
    text
      .replace(/{{firstName}}/g, firstName)
      .replace(/{{repName}}/g, effectiveRepName)
      .replace(/{{repPhone}}/g, prefilledData.repPhone || '(225) 555-0103')
      .replace(/{{address}}/g, prefilledData.address || '[Property Address]')
      .replace(/{{city}}/g, prefilledData.city || 'Baton Rouge')
      .replace(/{{series}}/g, prefilledData.series || 'Series 4000')
      .replace(/{{windowCount}}/g, prefilledData.windowCount || '[X]')
      .replace(/{{totalPrice}}/g, prefilledData.totalPrice || '[Total]')
      .replace(/{{monthlyPayment}}/g, prefilledData.monthlyPayment || '[$/mo]')
      .replace(/{{financingTerm}}/g, prefilledData.financingTerm || '18-month same-as-cash')
      .replace(/{{proposalLink}}/g, prefilledData.proposalLink || '[Proposal Link]')
      .replace(/{{expiresDate}}/g, prefilledData.expiresDate || '[Date]')
      .replace(/{{monthly18}}/g, prefilledData.monthly18 || '[$/mo]')
      .replace(/{{monthly36}}/g, prefilledData.monthly36 || '[$/mo]')
      .replace(/{{monthly60}}/g, prefilledData.monthly60 || '[$/mo]');

  const selectTemplate = (t: EmailTemplate) => {
    setSelectedTemplate(t);
    setEditedSubject(applyMerge(t.subject));
    setEditedBody(applyMerge(t.body));
    setCopied(false);
  };

  const insertField = (field: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart; const end = el.selectionEnd;
    const value = editedBody.substring(0, start) + field + editedBody.substring(end);
    setEditedBody(value);
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + field.length; el.focus(); }, 10);
  };

  const copyBody = () => {
    navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`);
    setCopied(true); setTimeout(() => setCopied(false), 2500);
    toast.success('Email copied to clipboard!');
  };

  const openMailClient = () => {
    const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`;
    window.open(mailto);
  };

  const filteredTemplates = EMAIL_TEMPLATES.filter(t => {
    const matchCat = !activeCategory || t.category === activeCategory;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.tags.some(tag => tag.includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-full max-w-3xl bg-slate-900 border-l border-slate-800 z-50 flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <EnvelopeIcon className="h-5 w-5 text-cyan-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Email Templates</div>
                  <div className="text-[11px] text-slate-500">
                    To: <span className="text-slate-400">{contactName}{contactEmail && ` (${contactEmail})`}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="btn-icon btn-ghost"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* ── Left: template list ── */}
              <div className="w-72 border-r border-slate-800 flex flex-col flex-shrink-0">
                {/* Search */}
                <div className="p-3 border-b border-slate-800">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search templates..."
                      className="w-full bg-slate-800 text-sm text-white placeholder:text-slate-600 rounded-lg pl-8 pr-3 py-2 outline-none border border-slate-700" />
                  </div>
                </div>

                {/* Category pills */}
                <div className="flex gap-1.5 px-3 py-2 flex-wrap border-b border-slate-800">
                  <button onClick={() => setActiveCategory(null)}
                    className={clsx('text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors',
                      !activeCategory ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'border-slate-700 text-slate-500 hover:border-slate-600')}>
                    All
                  </button>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setActiveCategory(c === activeCategory ? null : c)}
                      className={clsx('text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors',
                        activeCategory === c ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'border-slate-700 text-slate-500 hover:border-slate-600')}>
                      {c}
                    </button>
                  ))}
                </div>

                {/* Template list */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
                  {filteredTemplates.map(t => (
                    <button key={t.id} onClick={() => selectTemplate(t)}
                      className={clsx('w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors flex items-start gap-2.5',
                        selectedTemplate?.id === t.id && 'bg-cyan-500/8')}>
                      <ChevronRightIcon className={clsx('h-3.5 w-3.5 mt-0.5 flex-shrink-0 transition-transform',
                        selectedTemplate?.id === t.id ? 'text-cyan-400 rotate-90' : 'text-slate-600')} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{t.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Right: editor ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {!selectedTemplate ? (
                  <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                    ← Select a template to preview and edit
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {/* Subject */}
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Subject Line</label>
                        <input value={editedSubject} onChange={e => setEditedSubject(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/60" />
                      </div>

                      {/* Merge field chips */}
                      <div>
                        <div className="text-[10px] text-slate-600 mb-1.5 uppercase tracking-widest">Insert Merge Field</div>
                        <div className="flex flex-wrap gap-1.5">
                          {MERGE_FIELDS.slice(0, 8).map(f => (
                            <button key={f} onClick={() => insertField(f)}
                              className="text-[9px] border border-slate-700 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-400 px-2 py-1 rounded-lg font-mono transition-colors">
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Body */}
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Email Body</label>
                        <textarea ref={bodyRef} value={editedBody} onChange={e => setEditedBody(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-300 leading-relaxed outline-none focus:border-cyan-500/60 resize-none font-mono"
                          rows={16} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="border-t border-slate-800 p-4 flex gap-2">
                      <button onClick={copyBody}
                        className={clsx('btn-sm flex items-center gap-1.5 flex-1 justify-center',
                          copied ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'btn-secondary')}>
                        {copied ? <><CheckCircleIcon className="h-3.5 w-3.5" /> Copied!</> : <><ClipboardDocumentIcon className="h-3.5 w-3.5" /> Copy Email</>}
                      </button>
                      <button onClick={openMailClient}
                        className="btn-sm btn-primary flex items-center gap-1.5 flex-1 justify-center">
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /> Open Mail App
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
