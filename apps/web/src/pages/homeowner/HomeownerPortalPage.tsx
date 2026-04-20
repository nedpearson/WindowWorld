import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CheckCircleIcon, DocumentTextIcon, PhoneIcon, EnvelopeIcon,
  HomeIcon, ShieldCheckIcon, StarIcon, XMarkIcon,
  CalendarIcon, SparklesIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ─── Demo proposal (in prod: fetched by token/id, no auth) ─
const DEMO_PROPOSAL = {
  id: 'prop-abc123',
  customerName: 'Patricia Landry',
  address: '312 Sherwood Forest Blvd, Baton Rouge, LA 70815',
  createdDate: 'April 18, 2026',
  expiresDate: 'May 18, 2026',
  rep: { name: 'Jake Thibodaux', phone: '(225) 555-0103', email: 'jake@windowworldla.com', photo: null },
  series: 'Series 4000 — Premium Double-Pane',
  windows: [
    { room: 'Living Room – Front',  type: 'Double Hung', size: '35¾" × 47¾"', qty: 1 },
    { room: 'Living Room – Side',   type: 'Double Hung', size: '35⅞" × 47¾"', qty: 1 },
    { room: 'Kitchen',              type: 'Single Hung', size: '28" × 36"',    qty: 1 },
    { room: 'Master Bedroom – East',type: 'Double Hung', size: '35¾" × 47¾"', qty: 1 },
    { room: 'Master Bedroom – South',type:'Double Hung', size: '35¾" × 47¾"', qty: 1 },
    { room: 'Bedroom 2',            type: 'Double Hung', size: '27½" × 41"',   qty: 1 },
  ],
  subtotal: 8480,
  installFee: 720,
  total: 9200,
  monthlyPayment: 511,
  financingTerm: '18-month same-as-cash, 0% interest',
  warranty: ['Lifetime Limited Warranty on glass', 'Limited Lifetime on frames & hardware', '10-year warranty on installation workmanship'],
  features: ['Energy Star certified', 'Argon gas fill for superior insulation', 'Low-E glass coating', 'STC-30 sound reduction rating', 'Multi-point locking system'],
};

type Step = 'view' | 'accept' | 'done';

function AcceptModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
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
          By entering your name and accepting, you agree to the WindowWorld proposal totaling <strong className="text-slate-900">${DEMO_PROPOSAL.total.toLocaleString()}</strong> on the terms stated above.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type your full name as your digital signature</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Patricia Landry"
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
        <button onClick={onConfirm} disabled={!name.trim() || !agreed}
          className={clsx('w-full mt-6 py-3 rounded-xl text-sm font-bold transition-all',
            name.trim() && agreed
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
          ✓ Accept & Sign Proposal
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
  const p = DEMO_PROPOSAL;

  const handleAccept = () => { setShowModal(false); setStep('done'); };

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckSolid className="h-9 w-9 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Proposal Accepted! 🎉</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Thank you, {p.customerName.split(' ')[0]}! Jake will be in touch within 24 hours to schedule your install.
          </p>
          <div className="p-4 bg-blue-50 rounded-xl text-left space-y-2">
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">What Happens Next</div>
            {['Jake will call to schedule install date', 'Install crew arrives — 1 day typical duration', 'Walk-through + sign-off on completion', 'Final invoice with balance due'].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-blue-600">
                <div className="w-4 h-4 rounded-full bg-blue-200 text-blue-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i+1}</div>
                {step}
              </div>
            ))}
          </div>
          <a href={`tel:${p.rep.phone}`}
            className="mt-5 flex items-center gap-2 justify-center py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors">
            <PhoneIcon className="h-4 w-4" /> Call Jake: {p.rep.phone}
          </a>
        </motion.div>
      </div>
    );
  }

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
            <div className="text-[10px] text-slate-500">Expires {p.expiresDate}</div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="text-xs text-blue-200 uppercase tracking-widest mb-1">Window Replacement Proposal</div>
          <h1 className="text-xl font-bold mb-1">Hello, {p.customerName.split(' ')[0]} 👋</h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Here's your personalized proposal for {p.windows.length} windows at <span className="font-semibold text-white">{p.address.split(',')[0]}</span>.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 bg-blue-500/30 rounded-xl p-3 text-center">
              <div className="text-xl font-black">${p.total.toLocaleString()}</div>
              <div className="text-[10px] text-blue-200">Total Investment</div>
            </div>
            <div className="flex-1 bg-blue-500/30 rounded-xl p-3 text-center">
              <div className="text-xl font-black">${p.monthlyPayment}</div>
              <div className="text-[10px] text-blue-200">/mo, 18-mo 0%</div>
            </div>
          </div>
        </motion.div>

        {/* Product */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">{p.series}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {p.windows.map((w, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm text-slate-700 font-medium">{w.room}</div>
                  <div className="text-xs text-slate-400">{w.type} · {w.size}</div>
                </div>
                <div className="text-xs text-slate-500">× {w.qty}</div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-slate-50 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>Windows ({p.windows.length} units)</span><span>${p.subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-slate-600"><span>Installation</span><span>${p.installFee.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total</span><span>${p.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">What You're Getting</h2>
          <div className="space-y-2">
            {p.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckSolid className="h-4 w-4 text-blue-500 flex-shrink-0" />{f}
              </div>
            ))}
          </div>
        </div>

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
              {p.warranty.map((w, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <CheckSolid className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />{w}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rep card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
            {p.rep.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-800">{p.rep.name}</div>
            <div className="text-xs text-slate-500">Your WindowWorld Rep · Baton Rouge</div>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${p.rep.phone}`} className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
              <PhoneIcon className="h-4 w-4 text-blue-600" />
            </a>
            <a href={`mailto:${p.rep.email}`} className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
              <EnvelopeIcon className="h-4 w-4 text-blue-600" />
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="sticky bottom-5">
          <motion.button onClick={() => setShowModal(true)} whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-2xl shadow-blue-500/30 transition-colors flex items-center gap-2 justify-center">
            <CheckCircleIcon className="h-5 w-5" /> Accept This Proposal
          </motion.button>
          <p className="text-center text-[11px] text-slate-400 mt-2">No payment due now · Digital signature only</p>
        </div>
      </main>

      <AnimatePresence>
        {showModal && <AcceptModal onClose={() => setShowModal(false)} onConfirm={handleAccept} />}
      </AnimatePresence>
    </div>
  );
}
