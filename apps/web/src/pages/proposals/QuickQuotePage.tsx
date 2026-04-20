import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BoltIcon, CalculatorIcon, ChatBubbleLeftIcon,
  ClipboardDocumentIcon, ArrowRightIcon, CheckCircleIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { SmsTemplateDrawer } from '../../components/sms/SmsTemplateDrawer';

// ─── Product series ────────────────────────────────────────
const SERIES = [
  { id: 'S2000', label: 'Series 2000', desc: 'Entry-level vinyl, single-pane replacement', basePerWindow: 380, earnmark: 'Builder & Rental Grade', color: 'border-slate-600 hover:border-slate-500' },
  { id: 'S3000', label: 'Series 3000', desc: 'Standard double-pane, Low-E glass', basePerWindow: 580, earnmark: 'Most Popular', color: 'border-brand-500/50 hover:border-brand-500', popular: true },
  { id: 'S4000', label: 'Series 4000', desc: 'Premium double-pane, argon fill, upgraded hardware', basePerWindow: 820, earnmark: 'Best Value', color: 'border-amber-500/30 hover:border-amber-500/60' },
  { id: 'S6000', label: 'Series 6000', desc: 'Triple-pane, Max-Energy, lifetime warranty', basePerWindow: 1140, earnmark: 'High-Performance', color: 'border-purple-500/30 hover:border-purple-500/60' },
];

const FINANCING_OPTS = [
  { label: '18-mo Same-as-Cash 0%', months: 18, rate: 0 },
  { label: '36 months @ 6.9%', months: 36, rate: 6.9 },
  { label: '60 months @ 9.9%', months: 60, rate: 9.9 },
];

export function QuickQuotePage() {
  const [windowCount, setWindowCount] = useState(8);
  const [seriesId, setSeriesId] = useState('S3000');
  const [finIdx, setFinIdx] = useState(0);
  const [smsOpen, setSmsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const series = SERIES.find(s => s.id === seriesId)!;
  const fin = FINANCING_OPTS[finIdx];

  const total = useMemo(() => windowCount * series.basePerWindow, [windowCount, seriesId]);

  const monthly = useMemo(() => {
    if (fin.rate === 0) return total / fin.months;
    const r = fin.rate / 100 / 12;
    return (total * r * Math.pow(1 + r, fin.months)) / (Math.pow(1 + r, fin.months) - 1);
  }, [total, fin]);

  const savings = useMemo(() => Math.round(total * 0.18), [total]);

  const pitchText = `Hi! Based on ${windowCount} windows with ${series.label}, your estimate is roughly $${total.toLocaleString()} — or just $${monthly.toFixed(0)}/month on our ${fin.label} plan. That's often offset by $${savings.toLocaleString()} in energy savings over 10 years. Let me know when you'd like a free in-home measurement!`;

  const copyPitch = () => {
    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    toast.success('Quote pitch copied! Paste into any message.');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 page-transition max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Quick Quote</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Fast ballpark estimate — perfect for pre-appointment phone calls</p>
        </div>
        <Link to="/proposals" className="btn-secondary btn-sm flex items-center gap-1.5">
          Full Proposal Builder <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-5">
          {/* Window count */}
          <div className="card p-5">
            <label className="label mb-3 flex items-center justify-between">
              <span>Number of Windows</span>
              <span className="text-2xl font-bold text-brand-400">{windowCount}</span>
            </label>
            <input type="range" min={1} max={30} value={windowCount}
              onChange={e => setWindowCount(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-500" />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1.5">
              <span>1</span>
              <span className="text-slate-500">Avg home: 8–14 windows</span>
              <span>30</span>
            </div>
            {/* Quick presets */}
            <div className="flex gap-2 mt-3">
              {[6, 8, 10, 12, 14, 18].map(n => (
                <button key={n} onClick={() => setWindowCount(n)}
                  className={clsx('btn-sm text-xs flex-1', windowCount === n ? 'btn-primary' : 'btn-secondary')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Series selection */}
          <div className="card p-5 space-y-2">
            <label className="label mb-2">Window Series</label>
            {SERIES.map(s => (
              <button key={s.id} onClick={() => setSeriesId(s.id)}
                className={clsx('w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left',
                  seriesId === s.id ? 'border-brand-500 bg-brand-500/8' : s.color + ' bg-transparent')}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{s.label}</span>
                    {s.popular && <span className="text-[9px] bg-brand-600/20 text-brand-400 border border-brand-500/30 px-1.5 py-0.5 rounded-full font-semibold">Most Popular</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.desc}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-white">${s.basePerWindow.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-600">per window</div>
                </div>
              </button>
            ))}
          </div>

          {/* Financing selection */}
          <div className="card p-5">
            <label className="label mb-3">Financing Option</label>
            <div className="space-y-2">
              {FINANCING_OPTS.map((f, i) => (
                <button key={i} onClick={() => setFinIdx(i)}
                  className={clsx('w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all',
                    finIdx === i ? 'bg-emerald-500/8 border-emerald-500/30 text-emerald-300' : 'border-slate-700 text-slate-400 hover:border-slate-600')}>
                  <span className="text-xs">{f.label}</span>
                  <span className={clsx('text-sm font-bold', finIdx === i ? 'text-emerald-400' : 'text-slate-400')}>
                    ${((f.rate === 0 ? total / f.months : (total * (f.rate / 100 / 12) * Math.pow(1 + f.rate / 100 / 12, f.months)) / (Math.pow(1 + f.rate / 100 / 12, f.months) - 1))).toFixed(0)}/mo
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Big total card */}
          <motion.div key={`${windowCount}-${seriesId}`} initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }} className="card p-6 text-center">
            <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Estimated Total</div>
            <motion.div key={total} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black text-white">
              ${total.toLocaleString()}
            </motion.div>
            <div className="text-sm text-slate-400 mt-2">
              {windowCount} × {series.label} installed
            </div>
            <div className="mt-4 p-3 bg-emerald-500/8 rounded-xl border border-emerald-500/15">
              <div className="text-3xl font-bold text-emerald-400">${monthly.toFixed(0)}<span className="text-sm text-emerald-600">/mo</span></div>
              <div className="text-xs text-slate-500 mt-0.5">{fin.label}</div>
            </div>
          </motion.div>

          {/* Insights */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-semibold text-white">Rep Talking Points</span>
            </div>
            {[
              { label: '10-Year Energy Savings Est.', value: `$${savings.toLocaleString()}`, color: 'text-emerald-400' },
              { label: 'Net Cost After Savings', value: `$${Math.max(0, total - savings).toLocaleString()}`, color: 'text-white' },
              { label: 'Monthly → Daily Cost', value: `$${(monthly / 30).toFixed(2)}/day`, color: 'text-brand-400' },
              { label: 'Install Time Est.', value: windowCount <= 8 ? '1 day' : windowCount <= 14 ? '1–2 days' : '2–3 days', color: 'text-slate-300' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-xs">
                <span className="text-slate-500">{item.label}</span>
                <span className={clsx('font-semibold', item.color)}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Pitch text */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Pre-built Pitch</span>
              <span className="text-[10px] text-slate-600">{pitchText.length} chars</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed bg-slate-800/60 rounded-xl p-3 mb-3">{pitchText}</p>
            <div className="flex gap-2">
              <button onClick={copyPitch}
                className={clsx('btn-sm flex items-center gap-1.5 flex-1 justify-center',
                  copied ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'btn-secondary')}>
                {copied ? <><CheckCircleIcon className="h-3.5 w-3.5" /> Copied!</> : <><ClipboardDocumentIcon className="h-3.5 w-3.5" /> Copy Pitch</>}
              </button>
              <button onClick={() => setSmsOpen(true)}
                className="btn-sm btn-primary flex items-center gap-1.5 flex-1 justify-center">
                <ChatBubbleLeftIcon className="h-3.5 w-3.5" /> Send via SMS
              </button>
            </div>
          </div>

          {/* Next step */}
          <Link to="/proposals" className="btn-primary w-full flex items-center gap-2 justify-center">
            Build Full Proposal <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <SmsTemplateDrawer isOpen={smsOpen} onClose={() => setSmsOpen(false)}
        contactName="Homeowner" repName="Your Rep" />
    </div>
  );
}
