import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BoltIcon, UserGroupIcon, ArrowTrendingUpIcon, MegaphoneIcon,
  DevicePhoneMobileIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

const SEGMENT_META: Record<string, { label: string; color: string; angle: string }> = {
  FINANCING_FIRST:    { label: 'Financing-First',    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',    angle: 'Lead with monthly payment framing' },
  STORM_CLAIMANT:     { label: 'Storm/Insurance',     color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', angle: 'Insurance claim support + free inspection' },
  COMPARISON_SHOPPER: { label: 'Comparison Shopper',  color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',  angle: 'Beat any written quote + proof' },
  ENERGY_SEEKER:      { label: 'Energy Efficiency',   color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', angle: 'ROI + payback period pitch' },
  AESTHETIC_DRIVEN:   { label: 'Aesthetic Driven',    color: 'bg-pink-500/20 text-pink-300 border-pink-500/30',    angle: 'Before/after visual proof' },
  TRUST_ANXIOUS:      { label: 'Trust Researcher',    color: 'bg-slate-600/40 text-slate-300 border-slate-600',    angle: '500+ reviews + BBB + references' },
  URGENT_REPLACER:    { label: 'Urgent Replacer',     color: 'bg-red-500/20 text-red-300 border-red-500/30',       angle: 'Fast scheduling + availability urgency' },
  PREMIUM_BUYER:      { label: 'Premium Buyer',       color: 'bg-violet-500/20 text-violet-300 border-violet-500/30', angle: 'Craftsmanship + lifetime value pitch' },
  BUDGET_CONSCIOUS:   { label: 'Budget Conscious',    color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', angle: 'Monthly payment + total cost of ownership' },
};

const URGENCY_COLOR: Record<string, string> = {
  HIGH: 'text-red-400', MEDIUM: 'text-amber-400', LOW: 'text-slate-500',
};

export function IntentDashboardPage() {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const { data: segmentData, isLoading } = useQuery({
    queryKey: ['anonymous-segments'],
    queryFn: () => (apiClient as any).intelligence.getAnonymousSegments(),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', activeSegment],
    queryFn: () => (apiClient as any).intelligence.getCampaigns(activeSegment || undefined),
    staleTime: 10 * 60_000,
    enabled: !!activeSegment,
  });

  const segments: any[] = segmentData?.segments || [];
  const recent: any[] = segmentData?.recent || [];

  const totalVisitors = segments.reduce((acc: number, s: any) => acc + s._count, 0);
  const highUrgency = segments.filter((s: any) => s.urgencyLevel === 'HIGH').reduce((a: number, s: any) => a + s._count, 0);

  // Group by segment
  const bySegment: Record<string, { count: number; urgencyBreakdown: Record<string, number> }> = {};
  for (const s of segments) {
    const seg = s.behaviorSegment || 'UNKNOWN';
    if (!bySegment[seg]) bySegment[seg] = { count: 0, urgencyBreakdown: {} };
    bySegment[seg].count += s._count;
    bySegment[seg].urgencyBreakdown[s.urgencyLevel] = s._count;
  }

  return (
    <div className="p-6 space-y-6 page-transition">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-brand-400" />
            Intent Intelligence
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            First-party behavior signals · Anonymous segments · Campaign angles
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
          🔒 First-party data only — no private tracking
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-2xl font-bold text-white">{totalVisitors}</div>
          <div className="text-xs text-slate-500">Anonymous Sessions</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-400">{highUrgency}</div>
          <div className="text-xs text-slate-500">High-Urgency Visitors</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-400">
            {segments.filter((s: any) => s.behaviorSegment === 'FINANCING_FIRST').reduce((a: number, s: any) => a + s._count, 0)}
          </div>
          <div className="text-xs text-slate-500">Financing Researchers</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-purple-400">
            {segments.filter((s: any) => s.behaviorSegment === 'STORM_CLAIMANT').reduce((a: number, s: any) => a + s._count, 0)}
          </div>
          <div className="text-xs text-slate-500">Storm/Insurance Visitors</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Segment breakdown */}
        <div className="space-y-4">
          <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <UserGroupIcon className="h-4 w-4 text-brand-400" />
            Visitor Segments
          </div>

          {isLoading ? (
            <div className="card p-6 text-center text-sm text-slate-500">Loading segments…</div>
          ) : Object.keys(bySegment).length === 0 ? (
            <div className="card p-6 text-center">
              <BoltIcon className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No intent signals tracked yet.</p>
              <p className="text-xs text-slate-700 mt-1">Signals are collected from your website visitors automatically.</p>
            </div>
          ) : (
            Object.entries(bySegment)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([seg, data]) => {
                const meta = SEGMENT_META[seg] || { label: seg, color: 'bg-slate-700 text-slate-300 border-slate-600', angle: '' };
                const pct = totalVisitors > 0 ? Math.round((data.count / totalVisitors) * 100) : 0;
                return (
                  <button key={seg} onClick={() => setActiveSegment(activeSegment === seg ? null : seg)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${activeSegment === seg ? 'bg-brand-600/15 border-brand-500/40' : 'card border-transparent hover:border-slate-700'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs font-bold text-white">{data.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">{pct}% of visitors</span>
                      <div className="flex items-center gap-1.5">
                        {Object.entries(data.urgencyBreakdown).map(([u, c]) => (
                          <span key={u} className={URGENCY_COLOR[u]}>{u[0]}: {c}</span>
                        ))}
                      </div>
                    </div>
                    {meta.angle && (
                      <div className="text-[10px] text-slate-600 mt-1 italic">→ {meta.angle}</div>
                    )}
                  </button>
                );
              })
          )}
        </div>

        {/* Campaign angles for selected segment */}
        <div className="lg:col-span-2 space-y-4">
          {activeSegment ? (
            <>
              <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <MegaphoneIcon className="h-4 w-4 text-brand-400" />
                Campaign Angles for {SEGMENT_META[activeSegment]?.label || activeSegment}
              </div>
              {campaigns.length === 0 ? (
                <div className="card p-6 text-center text-sm text-slate-500">
                  No campaign angles yet. Run full research to generate them.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c: any) => (
                    <div key={c.id} className="card p-4 space-y-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{c.headline}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${c.priority === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/30' : c.priority === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                          {c.priority}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize ml-auto">{c.channel}</span>
                      </div>
                      {c.bodyText && <p className="text-xs text-slate-400 leading-relaxed">{c.bodyText}</p>}
                      <div className="flex items-center gap-3 pt-1 flex-wrap">
                        {c.ctaText && (
                          <span className="text-[11px] font-semibold text-brand-400 border border-brand-500/30 rounded px-2 py-0.5">
                            CTA: {c.ctaText}
                          </span>
                        )}
                        {c.landingPagePath && (
                          <span className="text-[11px] text-slate-500">→ {c.landingPagePath}</span>
                        )}
                      </div>
                      {c.visualConcept && (
                        <div className="text-[10px] text-slate-600 italic border-l-2 border-slate-700 pl-2">
                          Visual: {c.visualConcept}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-4 w-4 text-brand-400" />
                Recent Anonymous Sessions
              </div>
              {recent.length === 0 ? (
                <div className="card p-6 text-center text-sm text-slate-500">No sessions yet. Signals are tracked automatically.</div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Products</th>
                        <th>Urgency</th>
                        <th>Signals</th>
                        <th>Last Seen</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((r: any) => {
                        const meta = SEGMENT_META[r.behaviorSegment || ''];
                        return (
                          <tr key={r.id}>
                            <td>
                              {meta ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                              ) : <span className="text-slate-600 text-xs">Unknown</span>}
                            </td>
                            <td className="text-xs text-slate-400">{r.productSignals?.join(', ') || '—'}</td>
                            <td className={`text-xs font-semibold ${URGENCY_COLOR[r.urgencyLevel]}`}>{r.urgencyLevel}</td>
                            <td className="text-xs text-slate-500">
                              {r.financingPageVisit && <span className="mr-1">💰</span>}
                              {r.quotePageVisit && <span className="mr-1">📋</span>}
                              <span className="text-slate-600">{r.pageViewCount}pv</span>
                            </td>
                            <td className="text-xs text-slate-600">
                              {new Date(r.lastSeen).toLocaleDateString()}
                            </td>
                            <td className="text-xs text-slate-600 capitalize">{r.sourceChannel || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Retargeting Angle Preview */}
      {recent.some((r: any) => r.retargetingAngles) && (
        <div className="card p-4">
          <div className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <MegaphoneIcon className="h-4 w-4 text-brand-400" />
            Auto-Generated Retargeting Angles (Sample)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recent.slice(0, 4).filter((r: any) => r.retargetingAngles).map((r: any) => {
              const angles = r.retargetingAngles as Record<string, string>;
              return (
                <div key={r.id} className="p-3 rounded-lg bg-slate-800/50 space-y-2">
                  <div className="text-[10px] text-slate-500 uppercase">{SEGMENT_META[r.behaviorSegment]?.label || r.behaviorSegment}</div>
                  {Object.entries(angles).map(([channel, copy]) => (
                    <div key={channel} className="flex items-start gap-2">
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {channel === 'facebook' ? <DevicePhoneMobileIcon className="h-3 w-3 text-blue-400" /> :
                          channel === 'instagram' ? <DevicePhoneMobileIcon className="h-3 w-3 text-pink-400" /> :
                            <EnvelopeIcon className="h-3 w-3 text-slate-500" />}
                        <span className="text-[10px] text-slate-600 capitalize">{channel}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{copy}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
