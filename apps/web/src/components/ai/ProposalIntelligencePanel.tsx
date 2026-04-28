import { useQuery } from '@tanstack/react-query';
import { SparklesIcon, ExclamationTriangleIcon, ArrowUpCircleIcon, CurrencyDollarIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

export function ProposalIntelligencePanel({ proposalId }: { proposalId: string }) {
  const { data: intel, isLoading } = useQuery({
    queryKey: ['silo-proposal-intel', proposalId],
    queryFn: () => apiClient.silo.getProposalAnalysis(proposalId).then(res => res.data as any),
    enabled: !!proposalId
  });

  if (isLoading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="h-4 w-4 text-brand-400" />
          <div className="h-4 bg-slate-800 rounded w-24" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-800 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!intel) return null;

  return (
    <div className="card p-4 border-brand-500/20 shadow-lg shadow-brand-500/5 bg-gradient-to-br from-brand-900/10 to-slate-900">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-brand-500/20 p-1 rounded-lg">
          <SparklesIcon className="h-4 w-4 text-brand-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">Silo AI Radar</h3>
      </div>

      <div className="space-y-4">
        {/* Upsell Opportunity */}
        {intel.premiumUpgradeOpportunities && intel.premiumUpgradeOpportunities.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
              <ArrowUpCircleIcon className="h-3 w-3 text-emerald-400" /> Upsell Radar
            </div>
            <ul className="text-xs text-slate-300 space-y-1">
              {intel.premiumUpgradeOpportunities.map((u: string, i: number) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-emerald-400 mt-0.5">•</span> {u}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Financing Angle */}
        {intel.financingAngleOpportunities && (
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
              <BanknotesIcon className="h-3 w-3 text-brand-400" /> Financing Angle
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {intel.financingAngleOpportunities}
            </p>
          </div>
        )}

        {/* Risk Assessment */}
        {intel.objectionRisks && intel.objectionRisks.length > 0 && (
          <div className="pt-3 border-t border-slate-800/50">
            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
              <ExclamationTriangleIcon className="h-3 w-3 text-amber-400" /> Risk Assessment
            </div>
            <ul className="text-xs text-slate-300 space-y-1">
              {intel.objectionRisks.map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-amber-400 mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action */}
        <div className="pt-3 border-t border-slate-800/50">
          <div className="text-[10px] text-brand-400 uppercase font-semibold mb-1">Recommended Action</div>
          <div className="text-xs font-medium text-white">{intel.recommendedAction}</div>
        </div>
      </div>
    </div>
  );
}
