import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeftIcon, DocumentTextIcon, PaperAirplaneIcon,
  CheckCircleIcon, XMarkIcon, ArrowDownTrayIcon, ArrowPathIcon, EyeIcon, PhoneIcon, UserCircleIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { BoltIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useProposal, useGeneratePdf, useUpdateProposalStatus, useSendProposal, useCreateInvoiceFromProposal, type Proposal } from '../../api/proposals';
import { ProposalIntelligencePanel } from '../../components/ai/ProposalIntelligencePanel';

// ─── Summary helpers ──────────────────────────────────────────
function formatCurrency(n?: number) {
  if (n === undefined || n === null) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Demo fallback ────────────────────────────────────────────
const DEMO_PROPOSAL: Proposal = {
  id: 'p1', leadId: '3',
  title: 'Full Home Window Replacement — Robert Comeaux',
  status: 'SENT', pdfStatus: 'READY', validDays: 30, viewCount: 3,
  createdAt: '2026-04-18T12:00:00Z', sentAt: '2026-04-18T14:00:00Z',
  firstViewedAt: '2026-04-18T15:30:00Z',
  expiresAt: '2026-05-18T00:00:00Z',
  introMessage: `Thank you for the opportunity to provide this window replacement proposal for your home. WindowWorld of Louisiana has been serving Baton Rouge and the surrounding parishes for years, providing premium replacement windows backed by the industry's best warranty.

This proposal includes pricing for all identified window openings, your choice of product series, and all installation costs. Our installation teams are fully licensed and insured in Louisiana.

We are committed to completing your project with zero surprises — no hidden fees, no subcontractors, and no pressure.`,
  warrantyHighlights: [
    'Limited Lifetime Warranty on all window frames and glass',
    'Lifetime guarantee against seal failure and moisture intrusion',
    'Lifetime labor warranty on all window installation work',
    'Transferable warranty — adds value to your home',
    'Hurricane impact rating available (Series 6000) — meets LA building codes',
    'Energy Star® certified products qualify for federal tax credits',
  ],
  lead: {
    id: '3', firstName: 'Robert', lastName: 'Comeaux',
    address: '4521 Greenwell Springs Rd', city: 'Baton Rouge', zip: '70806',
    phone: '(225) 555-1001',
    assignedRep: { id: 'u1', firstName: 'Jake', lastName: 'Thibodaux', phone: '(225) 555-9000', email: 'jake@windowworldla.com' } },
  quote: {
    id: 'q1', grandTotal: 14750, subtotal: 15500,
    discountPct: 5, discountAmount: 750, taxAmount: 0, totalWindows: 10,
    lineItems: [
      { roomLabel: 'Living Room - Front', windowType: 'DOUBLE_HUNG', productName: 'Series 4000', widthInches: 30, heightInches: 54, quantity: 1, unitPrice: 1150, lineTotal: 1150, isAiEstimated: false },
      { roomLabel: 'Living Room - Side', windowType: 'DOUBLE_HUNG', productName: 'Series 4000', widthInches: 28, heightInches: 54, quantity: 1, unitPrice: 1100, lineTotal: 1100, isAiEstimated: false },
      { roomLabel: 'Kitchen', windowType: 'SINGLE_HUNG', productName: 'Series 2000', widthInches: 24, heightInches: 36, quantity: 2, unitPrice: 750, lineTotal: 1500, isAiEstimated: false },
      { roomLabel: 'Master Bedroom - E', windowType: 'DOUBLE_HUNG', productName: 'Series 4000', widthInches: 30, heightInches: 60, quantity: 1, unitPrice: 1200, lineTotal: 1200, isAiEstimated: false },
      { roomLabel: 'Master Bedroom - N', windowType: 'DOUBLE_HUNG', productName: 'Series 4000', widthInches: 30, heightInches: 60, quantity: 1, unitPrice: 1200, lineTotal: 1200, isAiEstimated: false },
      { roomLabel: 'Bedroom 2', windowType: 'DOUBLE_HUNG', productName: 'Series 4000', widthInches: 28, heightInches: 54, quantity: 2, unitPrice: 1100, lineTotal: 2200, isAiEstimated: false },
      { roomLabel: 'Bedroom 3', windowType: 'DOUBLE_HUNG', productName: 'Series 4000', widthInches: 28, heightInches: 48, quantity: 1, unitPrice: 1050, lineTotal: 1050, isAiEstimated: true },
      { roomLabel: 'Bathroom', windowType: 'SINGLE_HUNG', productName: 'Series 2000', widthInches: 24, heightInches: 36, quantity: 1, unitPrice: 750, lineTotal: 750, isAiEstimated: false },
      { roomLabel: 'Garage', windowType: 'AWNING', productName: 'Series 6000', widthInches: 36, heightInches: 24, quantity: 1, unitPrice: 1350, lineTotal: 1350, isAiEstimated: false },
    ] },
  createdBy: { id: 'u1', firstName: 'Jake', lastName: 'Thibodaux', phone: '(225) 555-9000', email: 'jake@windowworldla.com' } };

// ─── Timeline ─────────────────────────────────────────────────
function StatusTimeline({ proposal }: { proposal: Proposal }) {
  const steps = [
    { key: 'DRAFT',    label: 'Draft Created',   date: proposal.createdAt },
    { key: 'READY',    label: 'Marked Ready',    date: undefined },
    { key: 'SENT',     label: 'Sent to Customer',date: proposal.sentAt },
    { key: 'VIEWED',   label: 'Customer Viewed', date: proposal.firstViewedAt, sub: proposal.viewCount ? `${proposal.viewCount} view${proposal.viewCount > 1 ? 's' : ''}` : undefined },
    { key: 'ACCEPTED', label: 'Proposal Accepted',date: proposal.acceptedAt },
  ];

  const statusOrder = ['DRAFT','READY','SENT','VIEWED','ACCEPTED','DECLINED'];
  const currentIdx = statusOrder.indexOf(proposal.status as string);

  return (
    <div className="card p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Status Timeline</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const stepIdx = statusOrder.indexOf(step.key);
          const isPast = stepIdx < currentIdx || proposal.status === step.key;
          const isCurrent = proposal.status === step.key;
          const isFuture = stepIdx > currentIdx;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                isCurrent ? 'bg-brand-600 ring-2 ring-brand-500/30' :
                isPast ? 'bg-emerald-600' : 'bg-slate-800 border border-slate-700'
              )}>
                {isPast && !isCurrent
                  ? <CheckCircleIcon className="h-3 w-3 text-white" />
                  : isCurrent ? <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  : null}
              </div>
              <div className="flex-1">
                <div className={clsx('text-sm font-medium', isFuture ? 'text-slate-600' : 'text-white')}>{step.label}</div>
                {step.date && <div className="text-[11px] text-slate-500">{formatDate(step.date)}</div>}
                {step.sub && <div className="text-[11px] text-brand-400">{step.sub}</div>}
              </div>
            </div>
          );
        })}
        {proposal.status === 'DECLINED' && (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
              <XMarkIcon className="h-3 w-3 text-white" />
            </div>
            <div className="text-sm font-medium text-red-400">Declined</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Send Drawer ──────────────────────────────────────────────
function SendDrawer({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const [channel, setChannel] = useState<'email' | 'sms' | 'both'>('email');
  const sendMutation = useSendProposal();

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync({ id: proposal.id, channel });
      toast.success(`Proposal sent via ${channel}!`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send proposal');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-white mb-1">Send Proposal</h2>
        <p className="text-xs text-slate-500 mb-5">
          To: <strong className="text-slate-300">{proposal.lead?.firstName} {proposal.lead?.lastName}</strong> · {proposal.lead?.phone}
        </p>

        <div className="space-y-2 mb-5">
          {(['email', 'sms', 'both'] as const).map((c) => (
            <button key={c} onClick={() => setChannel(c)}
              className={clsx('w-full p-3 rounded-xl border text-left text-sm transition-colors',
                channel === c ? 'bg-brand-600/15 border-brand-500/40 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              )}>
              <span className="font-medium capitalize">{c === 'both' ? 'Both Email + SMS' : c}</span>
              <div className="text-[11px] opacity-60 mt-0.5">
                {c === 'email' ? 'Sends PDF link + proposal summary' :
                 c === 'sms' ? 'Sends short text with proposal link' :
                 'Maximum reach — email PDF + SMS reminder'}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={sendMutation.isPending}>Cancel</button>
          <button onClick={handleSend} disabled={sendMutation.isPending} className="btn-primary flex-1 flex items-center gap-2 justify-center">
            {sendMutation.isPending
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
              : <><PaperAirplaneIcon className="h-4 w-4" /> Send Now</>
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showSendDrawer, setShowSendDrawer] = useState(false);
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);

  const { data: apiProposal, isLoading } = useProposal(id || '');
  // isDemo = true when no real proposal exists in DB for this ID
  const isDemo = !apiProposal;
  const proposal = apiProposal || DEMO_PROPOSAL;

  const generatePdf = useGeneratePdf();
  const statusMutation = useUpdateProposalStatus();
  const createInvoice = useCreateInvoiceFromProposal();

  const handleGeneratePdf = async () => {
    if (isDemo) {
      toast.info('📄 Demo Mode — PDF would be generated and emailed to the customer. Connect a real proposal to enable this.', { duration: 5000 });
      return;
    }
    try {
      await generatePdf.mutateAsync(proposal.id);
      toast.success('PDF generation queued — will be ready shortly');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'PDF generation failed');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (isDemo) {
      toast.info('Demo Mode — status changes are disabled on preview proposals.');
      return;
    }
    try {
      await statusMutation.mutateAsync({ id: proposal.id, status });
      toast.success(`Proposal ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCreateInvoice = async () => {
    if (isDemo) {
      toast.info('📋 Demo Mode — Invoice WW-2025-1001 would be created for $14,750 with a 30% deposit of $4,425 due at signing. Connect a real proposal to enable this.', { duration: 6000 });
      setShowInvoiceConfirm(false);
      return;
    }
    try {
      await createInvoice.mutateAsync({
        proposalId: proposal.id,
        leadId: proposal.leadId,
        depositPct: 30,
      });
      toast.success('Invoice created successfully');
      navigate('/invoices');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    }
  };

  const lineItems = proposal.quote?.lineItems || [];
  const hasAiEstimated = lineItems.some((i: any) => i.isAiEstimated);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="card p-10 text-center text-slate-500">Loading proposal...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Demo mode banner */}
      {isDemo && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
          <BoltIcon className="h-4 w-4 flex-shrink-0" />
          <span><strong>Preview Mode</strong> — This is a sample proposal. Actions like Generate PDF and Create Invoice are simulated. Create a real proposal from a lead to fully activate them.</span>
        </div>
      )}
      <div className="flex items-start gap-4">
        <Link to="/proposals" className="btn-icon btn-ghost mt-0.5">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{proposal.title}</h1>
            <span className={clsx('text-[11px] px-2.5 py-0.5 rounded-full font-medium border', {
              'bg-slate-700 text-slate-300 border-slate-600': proposal.status === 'DRAFT',
              'bg-blue-500/15 text-blue-400 border-blue-500/25': proposal.status === 'READY',
              'bg-purple-500/15 text-purple-400 border-purple-500/25': proposal.status === 'SENT',
              'bg-cyan-500/15 text-cyan-400 border-cyan-500/25': proposal.status === 'VIEWED',
              'bg-emerald-500/15 text-emerald-400 border-emerald-500/25': proposal.status === 'ACCEPTED',
              'bg-red-500/15 text-red-400 border-red-500/25': proposal.status === 'DECLINED' })}>
              {proposal.status}
            </span>
            {proposal.viewCount ? (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <EyeIcon className="h-3.5 w-3.5" /> {proposal.viewCount} view{proposal.viewCount > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {proposal.quote?.totalWindows} windows · Valid {proposal.validDays} days · Expires {formatDate(proposal.expiresAt)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {proposal.pdfStatus === 'READY' && proposal.pdfUrl ? (
            <a href={proposal.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm flex items-center gap-2">
              <ArrowDownTrayIcon className="h-4 w-4" /> Download PDF
            </a>
          ) : (
            <button onClick={handleGeneratePdf} disabled={generatePdf.isPending || proposal.pdfStatus === 'GENERATING'}
              className="btn-secondary btn-sm flex items-center gap-2">
              {proposal.pdfStatus === 'GENERATING'
                ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Generating...</>
                : <><DocumentTextIcon className="h-4 w-4" /> Generate PDF</>}
            </button>
          )}
          {['DRAFT'].includes(proposal.status) && (
            <button onClick={() => handleStatusChange('READY')} className="btn-secondary btn-sm">Mark Ready</button>
          )}
          {['READY', 'SENT', 'VIEWED'].includes(proposal.status) && (
            <button onClick={() => setShowSendDrawer(true)} className="btn-sm bg-purple-600/20 text-purple-400 border border-purple-500/20 hover:bg-purple-600/30 flex items-center gap-2">
              <PaperAirplaneIcon className="h-4 w-4" />
              {proposal.status === 'SENT' ? 'Resend' : 'Send to Customer'}
            </button>
          )}
          {['SENT', 'VIEWED'].includes(proposal.status) && (
            <button onClick={() => handleStatusChange('ACCEPTED')}
              className="btn-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4" /> Mark Accepted
            </button>
          )}
          {proposal.status === 'ACCEPTED' && (
            <button onClick={() => setShowInvoiceConfirm(true)}
              className="btn-primary btn-sm flex items-center gap-2">
              <BanknotesIcon className="h-4 w-4" /> Create Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT — main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Customer + Rep cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Prepared For</div>
              {proposal.lead && (
                <>
                  <div className="text-base font-bold text-white">{proposal.lead.firstName} {proposal.lead.lastName}</div>
                  <div className="text-sm text-slate-400 mt-1">{proposal.lead.address}</div>
                  <div className="text-sm text-slate-400">{proposal.lead.city}, Louisiana {proposal.lead.zip}</div>
                  {proposal.lead.phone && (
                    <a href={`tel:${proposal.lead.phone}`} className="flex items-center gap-1.5 text-sm text-brand-400 mt-2 hover:text-brand-300">
                      <PhoneIcon className="h-3.5 w-3.5" /> {proposal.lead.phone}
                    </a>
                  )}
                  <Link to={`/leads/${proposal.lead.id}`} className="text-[11px] text-slate-600 hover:text-slate-400 underline mt-2 block">
                    Open Lead File →
                  </Link>
                </>
              )}
            </div>
            <div className="card p-4">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Sales Representative</div>
              <div className="text-base font-bold text-white">{proposal.createdBy?.firstName} {proposal.createdBy?.lastName}</div>
              {proposal.createdBy?.phone && (
                <a href={`tel:${proposal.createdBy.phone}`} className="flex items-center gap-1.5 text-sm text-slate-400 mt-1 hover:text-slate-200">
                  <PhoneIcon className="h-3.5 w-3.5" /> {proposal.createdBy.phone}
                </a>
              )}
              {proposal.createdBy?.email && (
                <a href={`mailto:${proposal.createdBy.email}`} className="text-sm text-slate-400 hover:text-slate-200 block mt-1">
                  {proposal.createdBy.email}
                </a>
              )}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <div className="text-[10px] text-slate-600 uppercase">Windows</div>
                  <div className="text-2xl font-bold text-brand-400">{proposal.quote?.totalWindows}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600 uppercase">Investment</div>
                  <div className="text-2xl font-bold text-brand-400">{formatCurrency(proposal.quote?.grandTotal)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Intro message */}
          {proposal.introMessage && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">A Message From Your Representative</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{proposal.introMessage}</p>
            </div>
          )}

          {/* Line items table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Window Replacement Specifications</h3>
              {hasAiEstimated && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <BoltIcon className="h-3 w-3" /> Contains AI estimates
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Location', 'Type', 'Series', 'Dimensions', 'Qty', 'Unit', 'Total', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {lineItems.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No line items configured</td></tr>
                  ) : lineItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-200">{item.roomLabel || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs capitalize">{item.windowType?.replace(/_/g, ' ') || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-300">{item.productName || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{item.widthInches}"×{item.heightInches}"</td>
                      <td className="px-4 py-2.5 text-slate-300 text-center">{item.quantity || 1}</td>
                      <td className="px-4 py-2.5 text-slate-300">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 font-semibold text-white">{formatCurrency(item.lineTotal)}</td>
                      <td className="px-4 py-2.5">
                        {item.isAiEstimated
                          ? <span className="text-[10px] text-amber-400 flex items-center gap-1"><BoltIcon className="h-3 w-3" />AI Est.</span>
                          : <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckBadgeIcon className="h-3 w-3" />Verified</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-slate-800 px-5 py-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span><span>{formatCurrency(proposal.quote?.subtotal || proposal.quote?.grandTotal)}</span>
                  </div>
                  {(proposal.quote?.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount ({proposal.quote?.discountPct}%)</span>
                      <span>−{formatCurrency(proposal.quote?.discountAmount)}</span>
                    </div>
                  )}
                  {(proposal.quote?.taxAmount || 0) > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Tax</span><span>{formatCurrency(proposal.quote?.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-700 pt-1.5 text-base font-bold text-white">
                    <span>Total Investment</span><span className="text-brand-400">{formatCurrency(proposal.quote?.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Financing callout */}
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wide mb-0.5">Financing Available</div>
                <div className="text-2xl font-bold text-emerald-300">
                  ~{formatCurrency(Math.round((proposal.quote?.grandTotal || 0) / 60))}/mo
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">Estimated · 60 months · Subject to credit approval</div>
              </div>
            </div>
          </div>

          {/* Warranty */}
          {proposal.warrantyHighlights && proposal.warrantyHighlights.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Your WindowWorld Warranty Package</h3>
              <ul className="space-y-2.5">
                {proposal.warrantyHighlights.map((w, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckBadgeIcon className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <div className="card p-4 border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-400 leading-relaxed">
              <strong>Proposal Terms:</strong> This proposal is valid for {proposal.validDays || 30} days.
              Pricing is subject to final field measurement verification.
              {hasAiEstimated && ' AI-estimated measurements are preliminary only — all must be verified by a licensed installer before ordering.'}
              {' '}Windows will not be ordered until the customer signs a purchase agreement. This proposal does not constitute a binding contract.
            </p>
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div className="space-y-4">
          <ProposalIntelligencePanel proposalId={proposal.id} />
          
          <StatusTimeline proposal={proposal} />

          {/* Quick actions */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actions</h3>
            <div className="space-y-2">
              {proposal.pdfStatus !== 'READY' && (
                <button onClick={handleGeneratePdf} disabled={generatePdf.isPending}
                  className="w-full btn-secondary btn-sm flex items-center gap-2 justify-center">
                  <DocumentTextIcon className="h-4 w-4" />
                  {proposal.pdfStatus === 'GENERATING' ? 'Generating PDF...' : 'Generate PDF'}
                </button>
              )}
              {proposal.pdfStatus === 'READY' && proposal.pdfUrl && (
                <a href={proposal.pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full btn-secondary btn-sm flex items-center gap-2 justify-center">
                  <ArrowDownTrayIcon className="h-4 w-4" /> Download PDF
                </a>
              )}
              {['READY', 'SENT', 'VIEWED'].includes(proposal.status) && (
                <button onClick={() => setShowSendDrawer(true)}
                  className="w-full btn-sm bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center gap-2 justify-center">
                  <PaperAirplaneIcon className="h-4 w-4" /> Send to Customer
                </button>
              )}
              {proposal.status === 'ACCEPTED' && (
                <button onClick={() => setShowInvoiceConfirm(true)}
                  className="w-full btn-primary btn-sm flex items-center gap-2 justify-center">
                  <BanknotesIcon className="h-4 w-4" /> Create Invoice
                </button>
              )}
              {['SENT', 'VIEWED'].includes(proposal.status) && (
                <>
                  <button onClick={() => handleStatusChange('ACCEPTED')}
                    className="w-full btn-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 flex items-center gap-2 justify-center">
                    <CheckCircleIcon className="h-4 w-4" /> Mark Accepted
                  </button>
                  <button onClick={() => handleStatusChange('DECLINED')}
                    className="w-full btn-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-2 justify-center">
                    <XMarkIcon className="h-4 w-4" /> Mark Declined
                  </button>
                </>
              )}
              <Link to={`/leads/${proposal.leadId}`}
                className="w-full btn-secondary btn-sm flex items-center gap-2 justify-center">
                <UserCircleIcon className="h-4 w-4" /> Open Lead File
              </Link>
            </div>
          </div>

          {/* Proposal meta */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Details</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Created', value: formatDate(proposal.createdAt) },
                { label: 'Sent', value: formatDate(proposal.sentAt) },
                { label: 'First Viewed', value: formatDate(proposal.firstViewedAt) },
                { label: 'Accepted', value: formatDate(proposal.acceptedAt) },
                { label: 'Expires', value: formatDate(proposal.expiresAt) },
                { label: 'View Count', value: proposal.viewCount?.toString() || '0' },
                { label: 'PDF Status', value: proposal.pdfStatus || 'None' },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="text-slate-300">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Send drawer modal */}
      <AnimatePresence>
        {showSendDrawer && (
          <SendDrawer proposal={proposal} onClose={() => setShowSendDrawer(false)} />
        )}
      </AnimatePresence>

      {/* Invoice confirm modal */}
      <AnimatePresence>
        {showInvoiceConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowInvoiceConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <BanknotesIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-white text-center mb-1">Create Invoice</h2>
              <p className="text-sm text-slate-400 text-center mb-5">
                Create an invoice for <strong className="text-white">{formatCurrency(proposal.quote?.grandTotal)}</strong>
                {' '}with 30% deposit ({formatCurrency(Math.round((proposal.quote?.grandTotal || 0) * 0.3))}) due at signing.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowInvoiceConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreateInvoice} disabled={createInvoice.isPending}
                  className="btn-primary flex-1 flex items-center gap-2 justify-center">
                  {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
