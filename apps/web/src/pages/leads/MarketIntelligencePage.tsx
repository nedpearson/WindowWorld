import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BeakerIcon, ArrowPathIcon, ShieldExclamationIcon, ChatBubbleBottomCenterTextIcon,
  SparklesIcon, MegaphoneIcon, ChartBarIcon, GlobeAltIcon, BuildingStorefrontIcon,
  CheckCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

const PRODUCT_TABS = ['all', 'windows', 'doors', 'siding', 'financing', 'storm'];
const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-700 text-slate-400 border-slate-600',
};

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
  const qc = useQueryClient();

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['intelligence-dashboard'],
    queryFn: () => (apiClient as any).intelligence.getDashboard(),
    staleTime: 5 * 60_000,
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['intelligence-opportunities', productFilter],
    queryFn: () => (apiClient as any).intelligence.getOpportunities(undefined, productFilter === 'all' ? undefined : productFilter),
    staleTime: 5 * 60_000,
  });

  const { data: clusters = [] } = useQuery({
    queryKey: ['intelligence-clusters', productFilter],
    queryFn: () => (apiClient as any).intelligence.getClusters(productFilter === 'all' ? undefined : productFilter),
    staleTime: 5 * 60_000,
  });

  const actMutation = useMutation({
    mutationFn: (id: string) => (apiClient as any).intelligence.actOnOpportunity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intelligence-opportunities'] }),
  });

  const runResearch = async () => {
    setResearchRunning(true);
    try {
      await (apiClient as any).intelligence.runResearch('Baton Rouge, Louisiana');
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['intelligence-dashboard'] });
        qc.invalidateQueries({ queryKey: ['intelligence-clusters'] });
        qc.invalidateQueries({ queryKey: ['intelligence-opportunities'] });
        setResearchRunning(false);
      }, 5000);
    } catch { setResearchRunning(false); }
  };

  const sum = dashboard?.summary;

  if (isLoading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-500">
        <ArrowPathIcon className="h-5 w-5 animate-spin" />
        Loading market intelligence...
      </div>
    </div>
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
            {researchRunning ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
            {researchRunning ? 'Research Running…' : 'Run Full Research'}
          </button>
        </div>
      </div>

      {researchRunning && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card p-4 border-brand-500/30 bg-brand-600/10 flex items-center gap-3">
          <ArrowPathIcon className="h-5 w-5 text-brand-400 animate-spin" />
          <div>
            <div className="text-sm font-medium text-brand-300">Research pipeline running…</div>
            <div className="text-xs text-slate-500">Crawling competitor sites · Analyzing public reviews · Scanning public social · Building battlecards · This takes 3-5 minutes</div>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="card p-4 border-amber-500/30 bg-amber-600/10 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
          <div>
            <div className="text-sm font-medium text-amber-300">No data yet</div>
            <div className="text-xs text-slate-500">Click "Run Full Research" to start collecting market intelligence.</div>
          </div>
        </div>
      )}

      {/* Stats */}
      {sum && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard icon={BuildingStorefrontIcon} label="Competitors Tracked" value={sum.competitorsTracked} />
          <StatCard icon={ShieldExclamationIcon} label="Battlecards" value={sum.battlecardsGenerated} />
          <StatCard icon={ChatBubbleBottomCenterTextIcon} label="Reviews Analyzed" value={sum.reviewsAnalyzed}
            sub={`${sum.positiveReviews}✓ ${sum.negativeReviews}✗`} />
          <StatCard icon={GlobeAltIcon} label="Forum Threads" value={sum.forumThreadsAnalyzed} />
          <StatCard icon={MegaphoneIcon} label="Open Opportunities" value={sum.openOpportunities} />
          <div className="md:col-span-2 card p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Review Sentiment</div>
            <SentimentBar positive={sum.positiveReviews} negative={sum.negativeReviews} />
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
              <p className="text-sm text-slate-600 text-center py-6">Run research to generate theme clusters</p>
            ) : clusters.slice(0, 12).map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{c.clusterName}</div>
                  <div className="text-[10px] text-slate-500">{c.productScope} · {c.themeType.replace(/_/g, ' ')}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-16 h-1.5 rounded-full overflow-hidden bg-slate-700`}>
                    <div className={`h-full rounded-full ${c.sentimentScore > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.abs(c.sentimentScore) * 100}%` }} />
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
              <p className="text-sm text-slate-600 text-center py-6">Run research to discover messaging opportunities</p>
            ) : opportunities.map((o: any) => (
              <div key={o.id} className={`p-2.5 rounded-lg border ${PRIORITY_COLOR[o.priority] || PRIORITY_COLOR.low}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium line-clamp-2">{o.description}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] opacity-70 capitalize">{o.opportunityType.replace(/_/g, ' ')}</span>
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
      <SocialObjectionSection productFilter={productFilter} />
    </div>
  );
}

function SocialObjectionSection({ productFilter }: { productFilter: string }) {
  const [socialTab, setSocialTab] = useState<'facebook' | 'instagram'>('facebook');

  const { data: patterns = [] } = useQuery({
    queryKey: ['social-patterns', socialTab, productFilter],
    queryFn: () => (apiClient as any).intelligence.getSocialPatterns(socialTab, productFilter === 'all' ? undefined : productFilter, 'high'),
    staleTime: 10 * 60_000,
  });

  const { data: objections = [] } = useQuery({
    queryKey: ['objections', productFilter],
    queryFn: () => (apiClient as any).intelligence.getObjections(undefined, productFilter === 'all' ? undefined : productFilter),
    staleTime: 10 * 60_000,
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
            <p className="text-sm text-slate-600 text-center py-6">Run research to populate social patterns</p>
          ) : patterns.map((p: any) => (
            <div key={p.id} className="p-2.5 rounded-lg bg-slate-800/50 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200 capitalize">{p.creativeTheme.replace(/_/g, ' ')}</span>
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
            <p className="text-sm text-slate-600 text-center py-6">Run research to build the objection library</p>
          ) : objections.map((o: any) => (
            <details key={o.id} className="group rounded-lg bg-slate-800/50 cursor-pointer">
              <summary className="p-2.5 flex items-center justify-between list-none">
                <div>
                  <div className="text-xs font-medium text-slate-200">{o.objectionText.substring(0, 80)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                    {o.objectionCategory.replace(/_/g, ' ')} {o.productFocus ? `· ${o.productFocus}` : ''} · {o.frequency}x
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
