import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BeakerIcon, ArrowPathIcon, ShieldExclamationIcon, ChatBubbleBottomCenterTextIcon,
  SparklesIcon, MegaphoneIcon, ChartBarIcon, GlobeAltIcon, BuildingStorefrontIcon,
  CheckCircleIcon, PlayIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

const PRODUCT_TABS = ['all', 'windows', 'doors', 'siding', 'financing', 'storm'];
const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-700 text-slate-400 border-slate-600',
};

const PIPELINE_STEPS = [
  'Seeding competitors…',
  'Crawling competitor websites…',
  'Scraping public reviews (Google, BBB)…',
  'Analyzing public forum discussions…',
  'Processing social public posts…',
  'Building AI battlecards…',
  'Generating objection library…',
  'Creating messaging opportunities…',
  'Generating campaign angles…',
  'Research complete ✓',
];

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-brand-400" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
        {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function SentimentBar({ positive, negative }: { positive: number; negative: number }) {
  const total = positive + negative || 1;
  const posW = Math.round((positive / total) * 100);
  const negW = Math.round((negative / total) * 100);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
        <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${posW}%` }} />
        <div className="h-full bg-red-500 rounded-r-full" style={{ width: `${negW}%` }} />
      </div>
      <span className="text-[10px] text-emerald-400">{posW}% pos</span>
      <span className="text-[10px] text-red-400">{negW}% neg</span>
    </div>
  );
}

export function MarketIntelligencePage() {
  const [productFilter, setProductFilter] = useState('all');
  const [researchRunning, setResearchRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qc = useQueryClient();

  // Auto-seed social patterns + campaign angles on first load (fast, idempotent)
  useEffect(() => {
    (apiClient as any).intelligence.seedStatic()
      .then(() => {
        setSeeded(true);
        qc.invalidateQueries({ queryKey: ['social-patterns'] });
        qc.invalidateQueries({ queryKey: ['intelligence-dashboard'] });
      })
      .catch(() => setSeeded(true)); // Fail silently — user can still manually run
  }, []);

  // Auto-refetch every 30s when research is running; otherwise 5min stale
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['intelligence-dashboard'],
    queryFn: () => (apiClient as any).intelligence.getDashboard(),
    staleTime: researchRunning ? 0 : 5 * 60_000,
    refetchInterval: researchRunning ? 20_000 : false,
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['intelligence-opportunities', productFilter],
    queryFn: () => (apiClient as any).intelligence.getOpportunities(
      undefined,
      productFilter === 'all' ? undefined : productFilter
    ),
    staleTime: researchRunning ? 0 : 5 * 60_000,
    refetchInterval: researchRunning ? 30_000 : false,
  });

  const { data: clusters = [] } = useQuery({
    queryKey: ['intelligence-clusters', productFilter],
    queryFn: () => (apiClient as any).intelligence.getClusters(
      productFilter === 'all' ? undefined : productFilter
    ),
    staleTime: researchRunning ? 0 : 5 * 60_000,
    refetchInterval: researchRunning ? 30_000 : false,
  });

  const actMutation = useMutation({
    mutationFn: (id: string) => (apiClient as any).intelligence.actOnOpportunity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intelligence-opportunities'] }),
  });

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (stepRef.current) clearInterval(stepRef.current);
    pollRef.current = null;
    stepRef.current = null;
  };

  const runResearch = async () => {
    setResearchRunning(true);
    setPipelineStep(0);

    // Cycle through descriptive steps every ~25s to show progress
    stepRef.current = setInterval(() => {
      setPipelineStep(s => {
        if (s >= PIPELINE_STEPS.length - 2) return s;
        return s + 1;
      });
    }, 25_000);

    try {
      await (apiClient as any).intelligence.runResearch('Baton Rouge, Louisiana');
    } catch (e) {
      console.error('Research trigger failed:', e);
    }

    // Poll until data appears (up to 8 minutes)
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 20;
      try {
        const fresh = await (apiClient as any).intelligence.getDashboard();
        const hasData = fresh?.summary?.battlecardsGenerated > 0 ||
          fresh?.summary?.openOpportunities > 0 ||
          fresh?.summary?.reviewsAnalyzed > 0;

        if (hasData || elapsed >= 480) {
          // Refresh all panels
          qc.invalidateQueries({ queryKey: ['intelligence-dashboard'] });
          qc.invalidateQueries({ queryKey: ['intelligence-clusters'] });
          qc.invalidateQueries({ queryKey: ['intelligence-opportunities'] });
          setPipelineStep(PIPELINE_STEPS.length - 1);
          stopPolling();
          setTimeout(() => setResearchRunning(false), 3000);
        }
      } catch {}
    }, 20_000);
  };

  useEffect(() => () => stopPolling(), []);

  const sum = dashboard?.summary;
  const hasAnyData = sum && (
    sum.battlecardsGenerated > 0 || sum.reviewsAnalyzed > 0 ||
    sum.openOpportunities > 0 || sum.forumThreadsAnalyzed > 0
  );

  return (
    <div className="p-6 space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BeakerIcon className="h-5 w-5 text-brand-400" />
            Market Intelligence
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Public web research · Competitor analysis · Buyer intent · Social patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-600 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
            ✅ Lawful public data only
          </div>
          <button
            onClick={runResearch}
            disabled={researchRunning}
            className="btn-primary btn-sm flex items-center gap-2"
          >
            {researchRunning
              ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
              : <PlayIcon className="h-4 w-4" />}
            {researchRunning ? 'Research Running…' : 'Run Full Research'}
          </button>
        </div>
      </div>

      {/* Research Progress Banner */}
      {researchRunning && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card p-4 border-brand-500/30 bg-brand-600/10 space-y-3">
          <div className="flex items-center gap-3">
            <ArrowPathIcon className="h-5 w-5 text-brand-400 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-brand-300">
                {PIPELINE_STEPS[pipelineStep]}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                This pipeline takes 3–8 minutes. Data will appear automatically as each stage completes.
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              animate={{ width: `${Math.round((pipelineStep / (PIPELINE_STEPS.length - 1)) * 100)}%` }}
              transition={{ duration: 1.5 }}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['Competitor Sites', 'Public Reviews', 'Forums', 'Social Posts', 'Battlecards', 'Campaign Angles'].map((s, i) => (
              <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                pipelineStep > i
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : pipelineStep === i
                    ? 'bg-brand-600/30 text-brand-300 border-brand-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-600 border-slate-700'
              }`}>{s}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State — no data yet and not loading */}
      {!isLoading && !hasAnyData && !researchRunning && (
        <div className="card p-8 text-center space-y-4">
          <BeakerIcon className="h-12 w-12 text-slate-700 mx-auto" />
          <div>
            <div className="text-base font-semibold text-slate-300">No research data yet</div>
            <div className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Click <strong className="text-slate-300">"Run Full Research"</strong> to start the AI-powered market intelligence pipeline.
              It will crawl competitor websites, public reviews, forums, and social posts, then build battlecards and campaign angles automatically.
            </div>
          </div>
          <button onClick={runResearch} className="btn-primary mx-auto flex items-center gap-2">
            <PlayIcon className="h-4 w-4" />
            Run Full Research Now
          </button>
          <div className="text-xs text-slate-700">Takes 3–8 minutes · All public data · Fully automated</div>
        </div>
      )}

      {/* Stats */}
      {sum && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon={BuildingStorefrontIcon} label="Competitors Tracked" value={sum.competitorsTracked ?? 0} />
          <StatCard icon={ShieldExclamationIcon} label="Battlecards" value={sum.battlecardsGenerated ?? 0} />
          <StatCard icon={ChatBubbleBottomCenterTextIcon} label="Reviews Analyzed" value={sum.reviewsAnalyzed ?? 0}
            sub={sum.positiveReviews || sum.negativeReviews ? `${sum.positiveReviews ?? 0}✓ ${sum.negativeReviews ?? 0}✗` : undefined} />
          <StatCard icon={GlobeAltIcon} label="Forum Threads" value={sum.forumThreadsAnalyzed ?? 0} />
          <StatCard icon={MegaphoneIcon} label="Open Opportunities" value={sum.openOpportunities ?? 0} />
          <div className="card p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Review Sentiment</div>
            <SentimentBar positive={sum.positiveReviews ?? 0} negative={sum.negativeReviews ?? 0} />
          </div>
        </div>
      )}

      {/* Product filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRODUCT_TABS.map(t => (
          <button key={t} onClick={() => setProductFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${productFilter === t ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Clusters */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 text-brand-400" />
              Top Buyer Themes
            </div>
            <span className="text-[10px] text-slate-600">{clusters.length} clusters</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {clusters.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-6">
                {researchRunning ? 'Generating clusters…' : 'Run research to generate theme clusters'}
              </p>
            ) : clusters.slice(0, 12).map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{c.clusterName}</div>
                  <div className="text-[10px] text-slate-500">{c.productScope} · {c.themeType?.replace(/_/g, ' ')}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-1.5 rounded-full overflow-hidden bg-slate-700">
                    <div className={`h-full rounded-full ${(c.sentimentScore ?? 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.abs((c.sentimentScore ?? 0)) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{c.frequency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Messaging Opportunities */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-brand-400" />
              Messaging Opportunities
            </div>
            <span className="text-[10px] text-slate-600">{opportunities.length} open</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {opportunities.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-6">
                {researchRunning ? 'Discovering opportunities…' : 'Run research to discover messaging opportunities'}
              </p>
            ) : opportunities.map((o: any) => (
              <div key={o.id} className={`p-2.5 rounded-lg border ${PRIORITY_COLOR[o.priority] || PRIORITY_COLOR.low}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium line-clamp-2">{o.description}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] opacity-70 capitalize">{o.opportunityType?.replace(/_/g, ' ')}</span>
                      {o.channel && <span className="text-[10px] opacity-60">· {o.channel}</span>}
                      {o.productScope !== 'all' && <span className="text-[10px] opacity-60">· {o.productScope}</span>}
                    </div>
                    {o.recommendedMessage && (
                      <div className="text-[10px] mt-1 opacity-80 italic line-clamp-1">"{o.recommendedMessage}"</div>
                    )}
                  </div>
                  <button onClick={() => actMutation.mutate(o.id)}
                    className="flex-shrink-0 p-1 hover:text-emerald-400 transition-colors opacity-60 hover:opacity-100"
                    title="Mark as acted on">
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social Patterns & Objections */}
      <SocialObjectionSection productFilter={productFilter} researchRunning={researchRunning} />
    </div>
  );
}

function SocialObjectionSection({ productFilter, researchRunning }: { productFilter: string; researchRunning: boolean }) {
  const [socialTab, setSocialTab] = useState<'facebook' | 'instagram'>('facebook');

  // No level filter so we see ALL patterns (not just 'high')
  const { data: patterns = [] } = useQuery({
    queryKey: ['social-patterns', socialTab, productFilter],
    queryFn: () => (apiClient as any).intelligence.getSocialPatterns(
      socialTab,
      productFilter === 'all' ? undefined : productFilter,
      undefined  // removed 'high' filter — show all levels
    ),
    staleTime: researchRunning ? 0 : 10 * 60_000,
    refetchInterval: researchRunning ? 30_000 : false,
  });

  const { data: objections = [] } = useQuery({
    queryKey: ['objections', productFilter],
    queryFn: () => (apiClient as any).intelligence.getObjections(
      undefined,
      productFilter === 'all' ? undefined : productFilter
    ),
    staleTime: researchRunning ? 0 : 10 * 60_000,
    refetchInterval: researchRunning ? 30_000 : false,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Social Patterns */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-200">Social Creative Patterns</div>
          <div className="flex gap-1">
            {(['facebook', 'instagram'] as const).map(p => (
              <button key={p} onClick={() => setSocialTab(p)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize ${socialTab === p ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {patterns.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">
              {researchRunning ? 'Analyzing social patterns…' : 'Run research to populate social patterns'}
            </p>
          ) : patterns.map((p: any) => (
            <div key={p.id} className="p-2.5 rounded-lg bg-slate-800/50 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200 capitalize">{p.creativeTheme?.replace(/_/g, ' ')}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${p.recommendationLevel === 'high' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                  {p.recommendationLevel}
                </span>
                <span className="text-[10px] text-slate-600 ml-auto capitalize">{p.productFocus}</span>
              </div>
              {p.hookExample && <div className="text-[10px] text-slate-400 italic">"{p.hookExample.substring(0, 120)}"</div>}
              {p.performanceNotes && <div className="text-[10px] text-slate-600 line-clamp-2">{p.performanceNotes}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Objection Library */}
      <div className="card p-4">
        <div className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <ShieldExclamationIcon className="h-4 w-4 text-red-400" />
          Objection Library
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {objections.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">
              {researchRunning ? 'Building objection library…' : 'Run research to build the objection library'}
            </p>
          ) : objections.map((o: any) => (
            <details key={o.id} className="group rounded-lg bg-slate-800/50 cursor-pointer">
              <summary className="p-2.5 flex items-center justify-between list-none">
                <div>
                  <div className="text-xs font-medium text-slate-200">{o.objectionText?.substring(0, 80)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                    {o.objectionCategory?.replace(/_/g, ' ')} {o.productFocus ? `· ${o.productFocus}` : ''} · {o.frequency}x
                  </div>
                </div>
                <span className="text-slate-600 group-open:rotate-180 transition-transform text-xs">▾</span>
              </summary>
              <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-slate-700 pt-2">
                {o.responseScript && (
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase mb-0.5">Response</div>
                    <div className="text-[11px] text-slate-300">{o.responseScript}</div>
                  </div>
                )}
                {o.closeScript && (
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase mb-0.5">Close</div>
                    <div className="text-[11px] text-emerald-300">{o.closeScript}</div>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
