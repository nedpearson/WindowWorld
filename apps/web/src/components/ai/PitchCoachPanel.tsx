import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronDownIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { usePitchCoach, useLeadSummary, useScoreLead } from '../../api/automations';

interface PitchCoachPanelProps {
  leadId: string;
  leadName?: string;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied to clipboard`));
}

// ─── Collapsible Section ──────────────────────────────────────
function Section({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/30 transition-colors">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
        <ChevronDownIcon className={clsx('h-4 w-4 text-slate-600 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Lead Summary ──────────────────────────────────────────
function LeadSummaryWidget({ leadId }: { leadId: string }) {
  const scoreLead = useScoreLead();
  const { data, isLoading, error } = useLeadSummary(leadId, true);

  const handleRescore = async () => {
    try {
      await scoreLead.mutateAsync(leadId);
      toast.success('AI lead scoring queued — refresh in ~30 seconds');
    } catch {
      toast.error('Failed to queue scoring');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        Generating AI summary...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-xs text-slate-600 py-2">
        {(error as any)?.response?.data?.message?.includes('OPENAI_API_KEY')
          ? 'OpenAI key required — set RESEND_API_KEY in Railway'
          : 'Could not generate summary'
        }
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300 leading-relaxed">{data.summary}</p>

      <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
        <div className="text-[10px] font-semibold text-brand-400 uppercase tracking-wide mb-1">Next Best Action</div>
        <p className="text-sm text-white font-medium">{data.nextBestAction}</p>
      </div>

      {data.riskFlags?.length > 0 && (
        <div className="space-y-1">
          {data.riskFlags.map((flag, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
              <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
              {flag}
            </div>
          ))}
        </div>
      )}

      <button onClick={handleRescore} disabled={scoreLead.isPending}
        className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
        <ArrowPathIcon className={clsx('h-3.5 w-3.5', scoreLead.isPending && 'animate-spin')} />
        Re-score with AI
      </button>
    </div>
  );
}

// ─── Main Pitch Coach Panel ───────────────────────────────────
export function PitchCoachPanel({ leadId, leadName }: PitchCoachPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, error, refetch } = usePitchCoach(leadId, enabled);

  const handleActivate = () => {
    setEnabled(true);
    toast.info('Generating AI pitch coach...', { duration: 2000 });
  };

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing pitch coach...');
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">AI Pitch Coach</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full border border-amber-500/20">GPT-4o</span>
        </div>
        {data && (
          <button onClick={handleRefresh} title="Refresh pitch coach"
            className="btn-icon btn-ghost h-7 w-7 text-slate-500 hover:text-slate-300">
            <ArrowPathIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Lead summary always shown */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">AI Lead Analysis</div>
        <LeadSummaryWidget leadId={leadId} />
      </div>

      {/* Pitch coach — gated behind generate button */}
      {!enabled && (
        <div className="p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
            <SparklesIcon className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Generate a personalized pitch script for <strong className="text-white">{leadName || 'this lead'}</strong>{' '}
            — opener, objection handlers, voicemail, and closing strategy.
          </p>
          <button onClick={handleActivate}
            className="btn-sm bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-2 mx-auto">
            <SparklesIcon className="h-4 w-4" /> Generate Pitch Coach
          </button>
        </div>
      )}

      {enabled && isLoading && (
        <div className="p-6 text-center">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Analyzing lead profile with GPT-4o...</p>
        </div>
      )}

      {enabled && error && (
        <div className="p-4 text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-400 mb-2">
            {(error as any)?.response?.data?.message || 'Failed to generate pitch coach'}
          </p>
          <button onClick={() => refetch()} className="btn-secondary btn-sm mx-auto">Try Again</button>
        </div>
      )}

      {enabled && data && (
        <div className="divide-y divide-slate-800/50">
          {/* Opener */}
          <Section label="Opening Script" defaultOpen>
            <div className="relative group">
              <p className="text-sm text-slate-300 leading-relaxed italic bg-slate-800/50 rounded-lg p-3 pr-8">
                "{data.opener}"
              </p>
              <button onClick={() => copyToClipboard(data.opener, 'Opener')}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity btn-icon btn-ghost h-6 w-6">
                <DocumentDuplicateIcon className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </Section>

          {/* Pitch angle + product */}
          <Section label="Strategy">
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/15">
                <div className="text-[10px] font-semibold text-brand-400 uppercase tracking-wide mb-1">Lead With</div>
                <p className="text-sm text-white">{data.pitchAngle}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/60">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Recommended Product</div>
                <p className="text-sm text-slate-300">{data.productRecommendation}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-1">Urgency Angle</div>
                <p className="text-sm text-slate-300">{data.urgencyFraming}</p>
              </div>
              {data.financingAngle && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/15">
                  <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide mb-1">Financing Angle</div>
                  <p className="text-sm text-slate-300">{data.financingAngle}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Objection handlers */}
          <Section label="Objection Handlers">
            <div className="space-y-3">
              {data.objectionHandlers?.map((h, i) => (
                <div key={i} className="relative group">
                  <div className="text-[11px] font-semibold text-red-400 mb-1">"{h.objection}"</div>
                  <p className="text-sm text-slate-300 leading-relaxed pr-6">{h.response}</p>
                  <button onClick={() => copyToClipboard(h.response, 'Response')}
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity btn-icon btn-ghost h-6 w-6">
                    <DocumentDuplicateIcon className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Voicemail + SMS */}
          <Section label="No-Answer Scripts">
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <PhoneIcon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Voicemail (20 sec)</span>
                </div>
                <div className="relative group">
                  <p className="text-sm text-slate-300 leading-relaxed italic bg-slate-800/50 rounded-lg p-3 pr-8">
                    "{data.voicemailScript}"
                  </p>
                  <button onClick={() => copyToClipboard(data.voicemailScript, 'Voicemail script')}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity btn-icon btn-ghost h-6 w-6">
                    <DocumentDuplicateIcon className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ChatBubbleLeftIcon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Text Message</span>
                </div>
                <div className="relative group">
                  <p className="text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3 pr-8 font-mono">{data.textScript}</p>
                  <button onClick={() => copyToClipboard(data.textScript, 'Text message')}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity btn-icon btn-ghost h-6 w-6">
                    <DocumentDuplicateIcon className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* Closing strategy */}
          <Section label="Closing Strategy">
            <p className="text-sm text-slate-300 leading-relaxed">{data.closingStrategy}</p>
          </Section>
        </div>
      )}
    </div>
  );
}
