import { Link } from 'react-router-dom';
import { useDrilldown, DrillRow, DrillSection } from './DrilldownPanel';
import { PhoneIcon, CalendarIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import apiClient from '../api/client';
import { useState, useEffect } from 'react';

// ── helpers ──────────────────────────────────────────────────
function fmt(n: number) { return `$${n >= 1000 ? (n/1000).toFixed(0)+'K' : n.toLocaleString()}`; }
function ago(d: string) { const days = Math.round((Date.now()-new Date(d).getTime())/86400000); return days === 0 ? 'Today' : `${days}d ago`; }

const DEMO_ACTIVITIES = [
  { id: 'act1', type: 'CALL_OUTBOUND', notes: 'Spoke with lead, very interested.', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'act2', type: 'EMAIL_SENT', notes: 'Sent initial pricing guide.', createdAt: new Date(Date.now() - 86400000).toISOString() }
];

const DEMO_LEADS = [
  { id: 'dl1', firstName: 'Emily', lastName: 'Davis', status: 'PROPOSAL_SENT', city: 'Dallas', estimatedRevenue: 15000 },
  { id: 'dl2', firstName: 'Robert', lastName: 'Wilson', status: 'APPT_SET', city: 'Fort Worth', estimatedRevenue: 8500 },
  { id: 'dl3', firstName: 'Lisa', lastName: 'Taylor', status: 'LEAD', city: 'Arlington', estimatedRevenue: 12000 },
];

const DEMO_INVOICES = [
  { id: 'inv1', lead: { firstName: 'Mark', lastName: 'Cuban' }, grandTotal: 12500, updatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'inv2', lead: { firstName: 'Alice', lastName: 'Walton' }, grandTotal: 36000, updatedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];

// ── lead list layer ──────────────────────────────────────────
function LeadList({ leads, label }: { leads: any[]; label: string }) {
  const { push } = useDrilldown();
  if (!leads.length) return <p className="text-sm text-slate-500 py-4 text-center">No {label} leads</p>;
  return (
    <div className="space-y-2">
      {leads.map((l: any) => (
        <button key={l.id} onClick={() => push({ title: `${l.firstName} ${l.lastName}`, content: <LeadDetail lead={l} /> })}
          className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/30 group transition-all">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold text-white">{l.firstName} {l.lastName}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{l.status?.replace(/_/g,' ')} · {l.city}</div>
            </div>
            <div className="flex items-center gap-2">
              {l.estimatedRevenue && <span className="text-xs font-bold text-emerald-400">{fmt(l.estimatedRevenue)}</span>}
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── lead detail (deepest layer) ──────────────────────────────
function LeadDetail({ lead }: { lead: any }) {
  const { push } = useDrilldown();
  const [activities, setActivities] = useState<any[]>([]);
  useEffect(() => {
    apiClient.leads.getActivities(lead.id).then((r: any) => {
      const data = r?.data?.slice(0,5) ?? [];
      setActivities(data.length === 0 && lead.id.startsWith('l') ? DEMO_ACTIVITIES : data);
    }).catch(()=>{
      if (lead.id.startsWith('l')) setActivities(DEMO_ACTIVITIES);
    });
  }, [lead.id]);
  return (
    <div className="space-y-4">
      <DrillSection title="Contact">
        {lead.phone && <DrillRow label="Phone" value={lead.phone} onClick={() => window.location.href=`tel:${lead.phone}`} />}
        {lead.email && <DrillRow label="Email" value={lead.email} onClick={() => window.location.href=`mailto:${lead.email}`} />}
        <DrillRow label="Address" value={lead.address} />
      </DrillSection>
      <DrillSection title="Deal">
        <DrillRow label="Status" value={lead.status?.replace(/_/g,' ')} />
        <DrillRow label="Est. Value" value={lead.estimatedRevenue ? fmt(lead.estimatedRevenue) : '—'} color="text-emerald-400" />
        <DrillRow label="Lead Score" value={lead.leadScore ?? '—'} />
        <DrillRow label="Source" value={lead.source} />
      </DrillSection>
      {activities.length > 0 && (
        <DrillSection title="Recent Activity">
          {activities.map((a: any) => (
            <div key={a.id} className="p-2.5 rounded-lg bg-slate-800/50 text-xs text-slate-400">
              <span className="text-slate-300 font-medium">{a.type?.replace(/_/g,' ')}</span> · {ago(a.createdAt)}
              {a.notes && <p className="mt-1 text-slate-500 truncate">{a.notes}</p>}
            </div>
          ))}
        </DrillSection>
      )}
      <Link to={`/leads/${lead.id}`} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">
        Open Full Lead →
      </Link>
    </div>
  );
}

// ── PIPELINE drilldown ────────────────────────────────────────
export function usePipelineDrilldown() {
  const { push } = useDrilldown();
  return (stage: any, pipelineTotal: number) => push({
    title: stage.label ?? stage.stage,
    subtitle: `${stage.count} leads · ${fmt(stage.value ?? 0)}`,
    content: <PipelineStageDetail stage={stage} pipelineTotal={pipelineTotal} />,
  });
}

function PipelineStageDetail({ stage, pipelineTotal }: { stage: any; pipelineTotal: number }) {
  const { push } = useDrilldown();
  const pct = pipelineTotal > 0 ? Math.round((stage.value / pipelineTotal) * 100) : 0;
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const status = stage.status ?? stage.stage;
    if (!status) { setLoading(false); return; }
    apiClient.leads.list({ status, limit: 20 })
      .then((r: any) => {
        const data = r?.data ?? [];
        setLeads(data.length === 0 && stage.count > 0 ? DEMO_LEADS.filter(l => l.status === status || status === 'LEAD') : data);
      })
      .catch(() => {
        if (stage.count > 0) setLeads(DEMO_LEADS.filter(l => l.status === status || status === 'LEAD'));
      })
      .finally(() => setLoading(false));
  }, [stage]);
  return (
    <div className="space-y-4">
      <DrillSection title="Stage Summary">
        <DrillRow label="Leads" value={stage.count} />
        <DrillRow label="Value" value={fmt(stage.value ?? 0)} color="text-emerald-400" />
        <DrillRow label="% of Pipeline" value={`${pct}%`} />
        <DrillRow label="Avg Deal" value={stage.count > 0 ? fmt((stage.value ?? 0) / stage.count) : '—'} />
      </DrillSection>
      <DrillSection title={`Leads (${leads.length})`}>
        {loading ? <div className="h-8 bg-slate-800 animate-pulse rounded-lg" /> : <LeadList leads={leads} label={stage.label} />}
      </DrillSection>
      <Link to={`/pipeline?stage=${stage.status ?? stage.stage}`}
        className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">
        Open in Kanban →
      </Link>
    </div>
  );
}

// ── STATS drilldown ───────────────────────────────────────────
export function usePipelineValueDrilldown() {
  const { push } = useDrilldown();
  return (pipeline: any[], total: number) => push({
    title: 'Pipeline Value',
    subtitle: `${pipeline.reduce((s: number, st: any) => s + (st.count ?? 0), 0)} total leads`,
    content: (
      <div className="space-y-4">
        <DrillSection title="By Stage">
          {pipeline.map((st: any) => (
            <DrillRow key={st.label ?? st.stage} label={st.label ?? st.stage}
              value={fmt(st.value ?? 0)} sub={`${st.count} leads`} color="text-brand-300" />
          ))}
        </DrillSection>
        <Link to="/pipeline" className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">
          Open Kanban →
        </Link>
      </div>
    ),
  });
}

export function useRevenueDrilldown() {
  const { push } = useDrilldown();
  return (mtdRevenue: number, monthlyTarget: number, goalPct: number) => push({
    title: 'Closed This Month',
    subtitle: `${goalPct}% of monthly goal`,
    content: <RevenueDrillContent mtdRevenue={mtdRevenue} monthlyTarget={monthlyTarget} goalPct={goalPct} />,
  });
}

function RevenueDrillContent({ mtdRevenue, monthlyTarget, goalPct }: { mtdRevenue: number; monthlyTarget: number; goalPct: number }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  useEffect(() => {
    apiClient.invoices.list({ status: 'PAID', limit: 15 })
      .then((r: any) => {
        const data = r?.data ?? [];
        setInvoices(data.length === 0 && mtdRevenue > 0 ? DEMO_INVOICES : data);
      })
      .catch(() => {
        if (mtdRevenue > 0) setInvoices(DEMO_INVOICES);
      });
  }, [mtdRevenue]);
  return (
    <div className="space-y-4">
      <DrillSection title="Goal Progress">
        <DrillRow label="Closed MTD" value={fmt(mtdRevenue)} color="text-emerald-400" />
        <DrillRow label="Monthly Target" value={fmt(monthlyTarget)} />
        <DrillRow label="Remaining" value={fmt(Math.max(0, monthlyTarget - mtdRevenue))} color="text-amber-400" />
        <DrillRow label="Goal %" value={`${goalPct}%`} color={goalPct >= 100 ? 'text-emerald-400' : 'text-brand-300'} />
      </DrillSection>
      {invoices.length > 0 && (
        <DrillSection title="Paid Invoices">
          {invoices.map((inv: any) => (
            <DrillRow key={inv.id} label={`${inv.lead?.firstName ?? ''} ${inv.lead?.lastName ?? ''}`.trim() || 'Invoice'}
              value={fmt(inv.grandTotal ?? inv.total ?? 0)} sub={ago(inv.updatedAt ?? inv.createdAt)} color="text-emerald-400" />
          ))}
        </DrillSection>
      )}
      <Link to="/invoices" className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">
        All Invoices →
      </Link>
    </div>
  );
}

export function useProposalsDrilldown() {
  const { push } = useDrilldown();
  return (proposals: any[]) => push({
    title: 'Proposals Pending',
    subtitle: `${proposals.length} awaiting response`,
    content: <ProposalsDrillContent proposals={proposals} />,
  });
}

function ProposalsDrillContent({ proposals }: { proposals: any[] }) {
  const { push } = useDrilldown();
  return (
    <div className="space-y-4">
      <DrillSection title="At a Glance">
        <DrillRow label="Pending" value={proposals.length} />
        <DrillRow label="Total Value" value={fmt(proposals.reduce((s: number, p: any) => s + (p.quote?.grandTotal ?? 0), 0))} color="text-emerald-400" />
        <DrillRow label="Viewed" value={proposals.filter(p => p.status === 'VIEWED').length} color="text-cyan-400" />
        <DrillRow label="Avg Age" value={proposals.length
          ? `${Math.round(proposals.reduce((s, p) => s + (Date.now() - new Date(p.sentAt ?? p.createdAt).getTime()), 0) / proposals.length / 86400000)}d`
          : '—'} />
      </DrillSection>
      <DrillSection title={`Proposals (${proposals.length})`}>
        {proposals.map((p: any) => {
          const days = Math.round((Date.now() - new Date(p.sentAt ?? p.createdAt).getTime()) / 86400000);
          return (
            <button key={p.id}
              onClick={() => push({ title: `${p.lead?.firstName} ${p.lead?.lastName}`, subtitle: 'Proposal Detail',
                content: <ProposalDetail proposal={p} /> })}
              className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/30 group transition-all">
              <div className="flex justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{p.lead?.firstName} {p.lead?.lastName}</div>
                  <div className="text-[11px] text-slate-500">{days}d ago · {p.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400">{fmt(p.quote?.grandTotal ?? 0)}</span>
                  <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </DrillSection>
      <Link to="/proposals" className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">All Proposals →</Link>
    </div>
  );
}

function ProposalDetail({ proposal: p }: { proposal: any }) {
  return (
    <div className="space-y-4">
      <DrillSection title="Proposal Info">
        <DrillRow label="Status" value={p.status} />
        <DrillRow label="Value" value={fmt(p.quote?.grandTotal ?? 0)} color="text-emerald-400" />
        <DrillRow label="Sent" value={p.sentAt ? ago(p.sentAt) : '—'} />
        {p.viewCount && <DrillRow label="Views" value={p.viewCount} color="text-cyan-400" />}
        {p.expiresAt && <DrillRow label="Expires" value={ago(p.expiresAt)} color="text-amber-400" />}
      </DrillSection>
      {p.lead && (
        <DrillSection title="Lead">
          <DrillRow label="Name" value={`${p.lead.firstName} ${p.lead.lastName}`} />
          {p.lead.phone && <DrillRow label="Phone" value={p.lead.phone} onClick={() => window.location.href=`tel:${p.lead.phone}`} />}
        </DrillSection>
      )}
      <div className="flex gap-2">
        <Link to={`/proposals/${p.id}`} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">Open Proposal →</Link>
        {p.lead?.id && <Link to={`/leads/${p.lead.id}`} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">View Lead →</Link>}
      </div>
    </div>
  );
}

export function useApptsDrilldown() {
  const { push } = useDrilldown();
  return (appts: any[]) => push({
    title: "Today's Appointments",
    subtitle: `${appts.length} scheduled`,
    content: <ApptsDrillContent appts={appts} />,
  });
}

function ApptsDrillContent({ appts }: { appts: any[] }) {
  const { push } = useDrilldown();
  return (
    <div className="space-y-4">
      <DrillSection title="Summary">
        <DrillRow label="Total" value={appts.length} />
        <DrillRow label="Confirmed" value={appts.filter(a => a.status === 'CONFIRMED').length} color="text-emerald-400" />
        <DrillRow label="Pending" value={appts.filter(a => a.status === 'SCHEDULED').length} color="text-amber-400" />
      </DrillSection>
      <DrillSection title="Schedule">
        {appts.map((a: any) => (
          <button key={a.id}
            onClick={() => push({ title: a.lead ? `${a.lead.firstName} ${a.lead.lastName}` : a.title, subtitle: a.type,
              content: <ApptDetail appt={a} /> })}
            className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/30 group transition-all">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-white">
                  {a.lead ? `${a.lead.firstName} ${a.lead.lastName}` : a.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(a.scheduledAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} · {a.type}
                </div>
              </div>
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-300 mt-1 transition-colors" />
            </div>
          </button>
        ))}
      </DrillSection>
      <Link to="/appointments" className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">All Appointments →</Link>
    </div>
  );
}

function ApptDetail({ appt: a }: { appt: any }) {
  return (
    <div className="space-y-4">
      <DrillSection title="Appointment">
        <DrillRow label="Time" value={new Date(a.scheduledAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} />
        <DrillRow label="Type" value={a.type} />
        <DrillRow label="Status" value={a.status} />
        {a.address && <DrillRow label="Address" value={a.address}
          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(a.address)}`, '_blank')} />}
      </DrillSection>
      {a.lead && (
        <DrillSection title="Lead">
          <DrillRow label="Name" value={`${a.lead.firstName} ${a.lead.lastName}`} />
          {a.lead.phone && (
            <DrillRow label="Phone" value={a.lead.phone} onClick={() => window.location.href=`tel:${a.lead.phone}`}
              color="text-brand-300" />
          )}
          {a.lead.id && <Link to={`/leads/${a.lead.id}`} className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl mt-2">View Lead →</Link>}
        </DrillSection>
      )}
      <div className="flex gap-2">
        {a.lead?.phone && <a href={`tel:${a.lead.phone}`} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl"><PhoneIcon className="h-4 w-4" />Call</a>}
        <Link to={`/appointments/${a.id}`} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl"><CalendarIcon className="h-4 w-4" />Details</Link>
      </div>
    </div>
  );
}

export function useGoalDrilldown() {
  const { push } = useDrilldown();
  return (mtd: number, target: number, pct: number) => push({
    title: 'Monthly Goal',
    subtitle: `${pct}% complete`,
    content: (
      <div className="space-y-4">
        <DrillSection title="Revenue Goal">
          <DrillRow label="MTD Revenue" value={fmt(mtd)} color="text-emerald-400" />
          <DrillRow label="Target" value={fmt(target)} />
          <DrillRow label="Gap" value={fmt(Math.max(0, target - mtd))} color="text-amber-400" />
          <DrillRow label="Progress" value={`${pct}%`} color={pct >= 100 ? 'text-emerald-400' : 'text-brand-300'} />
        </DrillSection>
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
          <div className="text-xs text-slate-500 mb-2">{pct}% to goal</div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
        <Link to="/analytics" className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl">Full Analytics →</Link>
      </div>
    ),
  });
}

export function useQueueDrilldown() {
  const { push } = useDrilldown();
  return (lead: any) => push({
    title: `${lead.firstName} ${lead.lastName}`,
    subtitle: lead.status?.replace(/_/g, ' '),
    content: <LeadDetail lead={lead} />,
  });
}
