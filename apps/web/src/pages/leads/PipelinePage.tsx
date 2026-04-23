import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CloudIcon } from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import clsx from 'clsx';
import { api } from '../../api/client';

const STAGES = [
  { key: 'NEW_LEAD',             label: 'New Lead',           color: 'slate',   dot: 'bg-slate-500' },
  { key: 'ATTEMPTING_CONTACT',   label: 'Attempting Contact', color: 'yellow',  dot: 'bg-amber-500' },
  { key: 'CONTACTED',            label: 'Contacted',          color: 'blue',    dot: 'bg-blue-500' },
  { key: 'APPOINTMENT_SET',      label: 'Appt Set',           color: 'cyan',    dot: 'bg-cyan-500' },
  { key: 'INSPECTION_COMPLETE',  label: 'Inspected',          color: 'indigo',  dot: 'bg-indigo-500' },
  { key: 'MEASURING_COMPLETE',   label: 'Measured',           color: 'purple',  dot: 'bg-purple-500' },
  { key: 'PROPOSAL_SENT',        label: 'Proposal Sent',      color: 'violet',  dot: 'bg-violet-500' },
  { key: 'VERBAL_COMMIT',        label: 'Verbal Commit',      color: 'green',   dot: 'bg-emerald-500' },
];

const STAGE_HEADER_COLORS: Record<string, string> = {
  slate:  'border-slate-500/40   bg-slate-500/10   text-slate-300',
  yellow: 'border-amber-500/40  bg-amber-500/10  text-amber-300',
  blue:   'border-blue-500/40   bg-blue-500/10   text-blue-300',
  cyan:   'border-cyan-500/40   bg-cyan-500/10   text-cyan-300',
  indigo: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  purple: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  violet: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  green:  'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'};

// Map raw Prisma lead → card shape
function mapToCard(l: any) {
  return {
    id: l.id,
    name: `${l.firstName} ${l.lastName}`,
    address: `${l.city || ''} · ${l.zip || ''}`,
    score: l.leadScore || 0,
    urgency: l.urgencyScore || 0,
    est: l.estimatedValue || l.estimatedRevenue || 0,
    isStorm: l.isStormLead,
    assignee: l.assignedRep
      ? `${l.assignedRep.firstName} ${l.assignedRep.lastName[0]}.`
      : '—'};
}

function LeadCard({ lead, stageKey, onMove }: { lead: any; stageKey: string; onMove: (id: string, newStage: string) => void }) {
  const stageIdx = STAGES.findIndex((s) => s.key === stageKey);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 space-y-2.5 hover:border-slate-600/60 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Link to={`/leads/${lead.id}`} className="text-sm font-semibold text-slate-100 hover:text-brand-400 transition-colors">
              {lead.name}
            </Link>
            {lead.isStorm && <CloudIcon className="h-3.5 w-3.5 text-purple-400" />}
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">{lead.address}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-emerald-400">${(lead.est / 1000).toFixed(1)}K</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-slate-600 mb-0.5">
            <span>Score</span><span className="font-mono">{lead.score}</span>
          </div>
          <div className="score-bar">
            <div className="score-bar-fill" style={{
              width: `${lead.score}%`,
              background: lead.score >= 80 ? '#10b981' : lead.score >= 60 ? '#3b82f6' : '#f59e0b'}} />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-slate-600 mb-0.5">
            <span>Urgency</span><span className="font-mono">{lead.urgency}</span>
          </div>
          <div className="score-bar">
            <div className="score-bar-fill" style={{
              width: `${lead.urgency}%`,
              background: lead.urgency >= 80 ? '#ef4444' : lead.urgency >= 60 ? '#f59e0b' : '#64748b'}} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-600">{lead.assignee}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {stageIdx > 0 && (
            <button
              onClick={() => onMove(lead.id, STAGES[stageIdx - 1].key)}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600"
            >
              ← Back
            </button>
          )}
          {stageIdx < STAGES.length - 1 && (
            <button
              onClick={() => onMove(lead.id, STAGES[stageIdx + 1].key)}
              className="text-[10px] text-brand-400 hover:text-brand-300 px-1.5 py-0.5 rounded bg-brand-600/15 hover:bg-brand-600/25"
            >
              Advance →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function PipelinePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pipelineResp, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => api.leads.getPipeline(),
    staleTime: 30_000});

  // Optimistic card move: update UI immediately, sync status in background
  const { mutate: moveCard } = useMutation({
    mutationFn: ({ id, toStage }: { id: string; toStage: string; fromStage: string }) =>
      api.leads.updateStatus(id, toStage),
    onMutate: async ({ id, toStage, fromStage }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline'] });
      const previous = queryClient.getQueryData(['pipeline']);
      queryClient.setQueryData(['pipeline'], (old: any) => {
        if (!old?.data) return old;
        const lead = old.data[fromStage]?.find((l: any) => l.id === id);
        if (!lead) return old;
        return {
          ...old,
          data: {
            ...old.data,
            [fromStage]: (old.data[fromStage] || []).filter((l: any) => l.id !== id),
            [toStage]: [{ ...lead, status: toStage }, ...(old.data[toStage] || [])]}};
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['pipeline'], ctx?.previous);
      toast.error('Failed to advance lead — reverted');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['pipeline'] })});

  const rawPipeline: Record<string, any[]> = (pipelineResp as any)?.data || {};

  // Map all stages to card format
  const pipeline: Record<string, any[]> = {};
  STAGES.forEach(s => {
    pipeline[s.key] = (rawPipeline[s.key] || []).map(mapToCard);
  });

  const handleMove = (leadId: string, fromStage: string, toStage: string) => {
    moveCard({ id: leadId, toStage, fromStage });
    const toLabel = STAGES.find((s) => s.key === toStage)?.label;
    toast.success(`Moving to ${toLabel}…`);
  };

  const totalPipelineValue = Object.values(rawPipeline).flat()
    .reduce((sum, l) => sum + (l.estimatedValue || l.estimatedRevenue || 0), 0);
  const totalLeads = Object.values(rawPipeline).flat().length;

  return (
    <div className="h-screen flex flex-col page-transition">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Pipeline</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading…' : `${totalLeads} active leads · $${(totalPipelineValue / 1000).toFixed(0)}K total value`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-brand-400 bg-brand-500/10 px-3 py-1.5 rounded-lg">
            <BoltIcon className="h-3.5 w-3.5" />
            AI-scored · Click cards to advance stages
          </div>
          <Link to="/leads/new" className="btn-primary btn-sm">+ Add Lead</Link>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full" style={{ minWidth: `${STAGES.length * 220}px` }}>
          {STAGES.map((stage) => {
            const leads = pipeline[stage.key] || [];
            const stageValue = (rawPipeline[stage.key] || [])
              .reduce((sum: number, l: any) => sum + (l.estimatedValue || l.estimatedRevenue || 0), 0);
            const headerClass = STAGE_HEADER_COLORS[stage.color];

            return (
              <div key={stage.key} className="flex flex-col flex-shrink-0 w-52">
                {/* Stage header */}
                <button
                  onClick={() => navigate(`/leads?status=${stage.key}`)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl border mb-2 ${headerClass} hover:opacity-80 transition-opacity`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <span className="text-xs font-semibold truncate">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono opacity-70">{leads.length}</span>
                    {leads.length > 0 && (
                      <span className="text-[10px] opacity-50">${(stageValue / 1000).toFixed(0)}K</span>
                    )}
                  </div>
                </button>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pb-4 no-scrollbar">
                  {isLoading
                    ? [...Array(2)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
                      ))
                    : leads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          stageKey={stage.key}
                          onMove={(id, newStage) => handleMove(id, stage.key, newStage)}
                        />
                      ))}

                  {!isLoading && leads.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-700 text-xs">
                      <div className="text-2xl mb-2">·</div>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
