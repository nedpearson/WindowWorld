import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CheckCircleIcon, DocumentTextIcon, PhoneIcon, EnvelopeIcon, ShieldCheckIcon, XMarkIcon,
  ChevronDownIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function fetchPortalProposal(id: string) {
  const res = await fetch(`${API_BASE}/proposals/portal/${id}`);
  if (!res.ok) throw new Error('Proposal not found');
  const json = await res.json();
  return json.data;
}

async function acceptProposal(id: string, signerName: string) {
  const res = await fetch(`${API_BASE}/proposals/portal/${id}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signerName }) });
  if (!res.ok) throw new Error('Failed to accept proposal');
  return res.json();
}

type Step = 'view' | 'accept' | 'done';

function AcceptModal({ total, onClose, onConfirm }: { total: number; onClose: () => void; onConfirm: (name: string) => void }) {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Accept Proposal</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-400" /></button>
        </div>
        <p className="text-sm text-slate-600 mb-5">
          By entering your name and accepting, you agree to the WindowWorld proposal totaling <strong className="text-slate-900">${total.toLocaleString()}</strong> on the terms stated above.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type your full name as your digital signature</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={() => setAgreed(!agreed)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to the proposal terms, pricing, and WindowWorld's project timeline as described. I understand this initiates the install scheduling process.
            </span>
          </label>
        </div>
        <button onClick={() => onConfirm(name)} disabled={!name.trim() || !agreed}
          className={clsx('w-full mt-6 py-3 rounded-xl text-sm font-bold transition-all',
            name.trim() && agreed
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
          ✓ Accept &amp; Sign Proposal
        </button>
      </motion.div>
    </motion.div>
  );
}

export function HomeownerPortalPage() {
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState<Step>('view');
  const [showModal, setShowModal] = useState(false);
  const [expandWarranty, setExpandWarranty] = useState(false);

  const { data: proposal, isLoading, isError } = useQuery({
    queryKey: ['portal-proposal', id],
    queryFn: () => fetchPortalProposal(id!),
    enabled: !!id,
    retry: 1,
    staleTime: 5 * 60_000 });

  const handleAccept = async (signerName: string) => {
    try {
      await acceptProposal(id!, signerName);
      setShowModal(false);
      setStep('done');
      toast.success('Proposal accepted! Your rep will be in touch shortly.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  // ─── Map real API data → display fields ──────────────────
  const lead = proposal?.lead;
  const rep = proposal?.createdBy || lead?.assignedRep;
  const quote = proposal?.quote;
  const lineItems = quote?.lineItems || [];
  const warrantyItems: string[] = proposal?.warrantyHighlights || [
    'Limited Lifetime Warranty on all window frames and glass',
    'Lifetime guarantee against seal failure and moisture intrusion',
    'Lifetime labor warranty on all window installation work',
    'Transferable warranty — adds value to your home',
  ];
  const customerFirst = lead?.firstName || 'there';
  const customerName = lead ? `${lead.firstName} ${lead.lastName}` : 'Valued Customer';
  const address = [lead?.address, lead?.city].filter(Boolean).join(', ') || 'Your home';
  const total = Number(quote?.grandTotal || 0);
  const monthly = Math.round(total / 18);
  const expiresStr = proposal?.expiresAt
    ? new Date(proposal.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '30 days from receipt';
  const repName = rep ? `${rep.firstName} ${rep.lastName}` : 'Your Rep';
  const repPhone = rep?.phone || '';
  const repEmail = rep?.email || '';
  const repInitials = repName.split(' ').map((n: string) => n[0]).join('');

  // ─── Loading ───────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading your proposal...</p>
      </div>
    </div>
  );

  // ─── Error ─────────────────────────────────────────────
  if (isError || !proposal) return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <XMarkIcon className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Proposal Not Found</h1>
        <p className="text-sm text-slate-500">This proposal link may have expired or is no longer valid. Contact your WindowWorld representative.</p>
      </div>
    </div>
  );

  // ─── Success / Done ────────────────────────────────────
  if (step === 'done') return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-2xl">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckSolid className="h-9 w-9 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Proposal Accepted! 🎉</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Thank you, {customerFirst}! {repName.split(' ')[0]} will be in touch within 24 hours to schedule your install.
        </p>
        <div className="p-4 bg-blue-50 rounded-xl text-left space-y-2">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">What Happens Next</div>
          {['Rep calls to schedule install date', 'Install crew arrives — 1 day typical', 'Walk-through + sign-off on completion', 'Final invoice with balance due'].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-blue-600">
              <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i+1}</div>
              {s}
            </div>
          ))}
        </div>
        {repPhone && (
          <a href={`tel:${repPhone}`} className="mt-5 flex items-center gap-2 justify-center py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors">
            <PhoneIcon className="h-4 w-4" /> Call {repName.split(' ')[0]}: {repPhone}
          </a>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">WW</span>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">WindowWorld</div>
              <div className="text-[10px] text-slate-500">Louisiana · Baton Rouge</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Your Proposal</div>
            <div className="text-[10px] text-slate-500">Expires {expiresStr}</div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="text-xs text-blue-200 uppercase tracking-widest mb-1">Window Replacement Proposal</div>
          <h1 className="text-xl font-bold mb-1">Hello, {customerFirst} 👋</h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Here's your personalized proposal for {lineItems.length || 'your'} windows at <span className="font-semibold text-white">{address.split(',')[0]}</span>.
          </p>
          {total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 bg-blue-500/30 rounded-xl p-3 text-center">
                <div className="text-xl font-black">${total.toLocaleString()}</div>
                <div className="text-[10px] text-blue-200">Total Investment</div>
              </div>
              <div className="flex-1 bg-blue-500/30 rounded-xl p-3 text-center">
                <div className="text-xl font-black">${monthly}</div>
                <div className="text-[10px] text-blue-200">/mo, 18-mo 0%</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Line items / windows */}
        {lineItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-800">
                {proposal.title || 'Window Replacement Proposal'}
              </h2>
            </div>
            <div className="divide-y divide-slate-50">
              {lineItems.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm text-slate-700 font-medium">{item.description || item.productName || `Window ${i+1}`}</div>
                    <div className="text-xs text-slate-400">{item.type || item.series || ''}{item.dimensions ? ` · ${item.dimensions}` : ''}</div>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {item.quantity > 1 ? `×${item.quantity}` : ''} {item.unitPrice ? `$${Number(item.unitPrice).toLocaleString()}` : ''}
                  </div>
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="px-5 py-4 bg-slate-50 space-y-1.5 text-sm">
                {quote?.subtotal && (
                  <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${Number(quote.subtotal).toLocaleString()}</span></div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Total</span><span>${total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warranty */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button onClick={() => setExpandWarranty(!expandWarranty)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-800">Warranty Coverage</span>
            </div>
            <ChevronDownIcon className={clsx('h-4 w-4 text-slate-400 transition-transform', expandWarranty && 'rotate-180')} />
          </button>
          {expandWarranty && (
            <div className="px-5 pb-4 space-y-2">
              {warrantyItems.map((w: string, i: number) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <CheckSolid className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />{w}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What you're getting */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800">Why WindowWorld</h2>
          </div>
          <div className="space-y-2">
            {['Energy Star certified — may qualify for federal tax credit', 'No subcontractors — our crews, our standards', 'Clean, one-day installs — no mess left behind', 'Price-match guarantee if you find a lower quote'].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckSolid className="h-4 w-4 text-blue-500 flex-shrink-0" />{f}
              </div>
            ))}
          </div>
        </div>

        {/* Rep card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
            {repInitials}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-800">{repName}</div>
            <div className="text-xs text-slate-500">Your WindowWorld Rep · Baton Rouge</div>
          </div>
          <div className="flex gap-2">
            {repPhone && (
              <a href={`tel:${repPhone}`} className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                <PhoneIcon className="h-4 w-4 text-blue-600" />
              </a>
            )}
            {repEmail && (
              <a href={`mailto:${repEmail}`} className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                <EnvelopeIcon className="h-4 w-4 text-blue-600" />
              </a>
            )}
          </div>
        </div>

        {/* CTA */}
        {proposal.status !== 'ACCEPTED' && proposal.status !== 'CONTRACTED' ? (
          <div className="sticky bottom-5">
            <motion.button onClick={() => setShowModal(true)} whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-2xl shadow-blue-500/30 transition-colors flex items-center gap-2 justify-center">
              <CheckCircleIcon className="h-5 w-5" /> Accept This Proposal
            </motion.button>
            <p className="text-center text-[11px] text-slate-400 mt-2">No payment due now · Digital signature only</p>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 rounded-2xl text-center">
            <CheckSolid className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-sm font-semibold text-emerald-700">This proposal has been accepted</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showModal && <AcceptModal total={total} onClose={() => setShowModal(false)} onConfirm={handleAccept} />}
      </AnimatePresence>
    </div>
  );
}

