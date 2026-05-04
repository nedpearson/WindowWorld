import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldExclamationIcon, ArrowPathIcon, BuildingStorefrontIcon,
  CheckBadgeIcon, XCircleIcon, ChatBubbleBottomCenterIcon,
  GlobeAltIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

const TERRITORY_COLOR: Record<string, string> = {
  local: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  regional: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  national: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

function StrengthList({ items, type }: { items: string[]; type: 'strength' | 'weakness' | 'gap' }) {
  const colors = {
    strength: 'text-emerald-400',
    weakness: 'text-red-400',
    gap: 'text-amber-400',
  };
  const icons = { strength: '✓', weakness: '✗', gap: '△' };
  return (
    <ul className="space-y-1">
      {(items || []).slice(0, 5).map((item: string, i: number) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
          <span className={`${colors[type]} font-bold flex-shrink-0 mt-0.5`}>{icons[type]}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function BattlecardPanel({ battlecard, onRefresh, refreshing }: { battlecard: any; onRefresh: () => void; refreshing: boolean }) {
  const [tab, setTab] = useState<'overview' | 'social' | 'talk_track' | 'objections'>('overview');
  const comp = battlecard.competitor;

  return (
    <motion.div key={battlecard.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
      className="card p-5 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm">{comp.name}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${TERRITORY_COLOR[comp.territory] || TERRITORY_COLOR.local}`}>
              {comp.territory}
            </span>
          </div>
          {comp.website && (
            <a href={comp.website} target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-slate-500 hover:text-brand-400 flex items-center gap-1 mt-0.5">
              <GlobeAltIcon className="h-3 w-3" /> {comp.website.replace(/https?:\/\//, '')}
            </a>
          )}
          {battlecard.lastUpdated && (
            <div className="text-[10px] text-slate-600 mt-0.5">
              Updated {new Date(battlecard.lastUpdated).toLocaleDateString()}
            </div>
          )}
        </div>
        <button onClick={onRefresh} disabled={refreshing}
          className="btn-ghost btn-sm flex items-center gap-1 text-xs flex-shrink-0"
          title="Refresh battlecard with AI">
          <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['overview', 'social', 'talk_track', 'objections'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-all ${tab === t ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto space-y-4">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {battlecard.positioning && (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Positioning</div>
                  <p className="text-xs text-slate-300">{battlecard.positioning}</p>
                </div>
              )}
              {battlecard.keyClaims?.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Key Claims</div>
                  <ul className="space-y-1">
                    {(battlecard.keyClaims as string[]).map((c, i) => (
                      <li key={i} className="text-xs text-slate-400 flex gap-2">
                        <span className="text-slate-600 flex-shrink-0">•</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3">
                {battlecard.reviewStrengths?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-emerald-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <CheckBadgeIcon className="h-3 w-3" /> What They Do Well
                    </div>
                    <StrengthList items={battlecard.reviewStrengths} type="strength" />
                  </div>
                )}
                {battlecard.reviewWeaknesses?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-red-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <XCircleIcon className="h-3 w-3" /> Where They Fail
                    </div>
                    <StrengthList items={battlecard.reviewWeaknesses} type="weakness" />
                  </div>
                )}
                {battlecard.messagingGaps?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-amber-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <ShieldExclamationIcon className="h-3 w-3" /> Messaging Gaps We Can Exploit
                    </div>
                    <StrengthList items={battlecard.messagingGaps} type="gap" />
                  </div>
                )}
              </div>
              {battlecard.ourCounterPitch && (
                <div className="p-3 rounded-lg bg-brand-600/10 border border-brand-500/20">
                  <div className="text-[10px] text-brand-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <SparklesIcon className="h-3 w-3" /> Our Counter-Pitch
                  </div>
                  <p className="text-xs text-brand-200">{battlecard.ourCounterPitch}</p>
                </div>
              )}
              {(battlecard.financingOffers || battlecard.warrantyNotes) && (
                <div className="grid grid-cols-2 gap-3">
                  {battlecard.financingOffers && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Their Financing</div>
                      <p className="text-[11px] text-slate-400">{battlecard.financingOffers}</p>
                    </div>
                  )}
                  {battlecard.warrantyNotes && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Their Warranty</div>
                      <p className="text-[11px] text-slate-400">{battlecard.warrantyNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'social' && (
            <motion.div key="social" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {battlecard.facebookNotes && (
                <div>
                  <div className="text-[10px] text-blue-400 uppercase tracking-wide mb-1">Facebook Intelligence</div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{battlecard.facebookNotes}</p>
                </div>
              )}
              {battlecard.instagramNotes && (
                <div>
                  <div className="text-[10px] text-pink-400 uppercase tracking-wide mb-1">Instagram Intelligence</div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{battlecard.instagramNotes}</p>
                </div>
              )}
              {!battlecard.facebookNotes && !battlecard.instagramNotes && (
                <p className="text-sm text-slate-600 text-center py-6">Refresh battlecard to generate social intelligence</p>
              )}
            </motion.div>
          )}

          {tab === 'talk_track' && (
            <motion.div key="talk_track" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {battlecard.talkTrack ? (
                <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <ChatBubbleBottomCenterIcon className="h-3 w-3" /> Rep Talk Track vs. {comp.name}
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{battlecard.talkTrack}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600 text-center py-6">Refresh battlecard to generate talk track</p>
              )}
            </motion.div>
          )}

          {tab === 'objections' && (
            <motion.div key="objections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {battlecard.objectionResponses?.length > 0 ? (
                (battlecard.objectionResponses as any[]).map((o: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-800/50 space-y-1.5">
                    <div className="text-xs font-semibold text-red-300">"{o.objection}"</div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Response: </span>
                      <span className="text-[11px] text-slate-300">{o.response}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-500 uppercase">Close: </span>
                      <span className="text-[11px] text-emerald-300">{o.close}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600 text-center py-6">Refresh battlecard to generate objection responses</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function BattlecardsPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [refreshingSlug, setRefreshingSlug] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['competitors'],
    queryFn: () => (apiClient as any).intelligence.getCompetitors(),
    staleTime: 5 * 60_000,
  });

  const { data: battlecards = [] } = useQuery({
    queryKey: ['battlecards'],
    queryFn: () => (apiClient as any).intelligence.getBattlecards(),
    staleTime: 5 * 60_000,
  });

  const seedMutation = useMutation({
    mutationFn: () => (apiClient as any).intelligence.seedCompetitors(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitors'] }),
  });

  const handleRefresh = async (slug: string) => {
    setRefreshingSlug(slug);
    try {
      await (apiClient as any).intelligence.refreshBattlecard(slug);
      qc.invalidateQueries({ queryKey: ['battlecards'] });
    } finally {
      setRefreshingSlug(null);
    }
  };

  const battlecardMap: Record<string, any> = {};
  for (const b of battlecards) battlecardMap[b.competitor?.slug] = b;

  const selected = selectedSlug ? battlecardMap[selectedSlug] : null;

  return (
    <div className="p-6 space-y-6 page-transition">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldExclamationIcon className="h-5 w-5 text-brand-400" />
            Competitor Battlecards
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Public intelligence · Talk tracks · Objection responses · Social analysis
          </p>
        </div>
        <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}
          className="btn-secondary btn-sm flex items-center gap-2">
          <BuildingStorefrontIcon className="h-4 w-4" />
          {seedMutation.isPending ? 'Seeding…' : 'Seed Competitors'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: competitor list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading competitors…</div>
          ) : competitors.length === 0 ? (
            <div className="card p-6 text-center">
              <BuildingStorefrontIcon className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No competitors yet. Click "Seed Competitors" to add known players.</p>
            </div>
          ) : (
            competitors.map((comp: any) => {
              const bc = battlecardMap[comp.slug];
              const isSelected = selectedSlug === comp.slug;
              return (
                <button key={comp.id} onClick={() => setSelectedSlug(isSelected ? null : comp.slug)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected ? 'bg-brand-600/15 border-brand-500/40' : 'card border-transparent hover:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-slate-200">{comp.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${TERRITORY_COLOR[comp.territory] || TERRITORY_COLOR.local}`}>
                          {comp.territory}
                        </span>
                        {bc ? (
                          <span className="text-[10px] text-emerald-400">✓ Battlecard ready</span>
                        ) : (
                          <span className="text-[10px] text-slate-600">No battlecard</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                      <div>{comp._count?.pages || 0} pages</div>
                      <div>{comp._count?.reviewInsights || 0} reviews</div>
                      <div>{comp._count?.socialPosts || 0} social</div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: battlecard detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <BattlecardPanel
              battlecard={selected}
              onRefresh={() => handleRefresh(selected.competitor.slug)}
              refreshing={refreshingSlug === selected.competitor?.slug}
            />
          ) : (
            <div className="card p-8 text-center h-full flex items-center justify-center">
              <div>
                <ShieldExclamationIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Select a competitor to view their battlecard</p>
                <p className="text-xs text-slate-700 mt-1">Run the full research pipeline to populate data</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
