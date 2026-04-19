import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UsersIcon, ChartBarIcon, BanknotesIcon, CalendarIcon,
  ArrowTrendingUpIcon, BoltIcon, CloudIcon, FireIcon,
  MapPinIcon, ClockIcon, ArrowUpIcon, ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid, StarIcon } from '@heroicons/react/24/solid';
import { api } from '../../api/client';
import { useAuthStore, useAppStore } from '../../store/auth.store';
import clsx from 'clsx';

const DEMO_STATS = {
  leadsTotal: 127,
  leadsNew: 14,
  leadsThisWeek: 28,
  appointmentsToday: 4,
  proposalsSent: 8,
  pipelineValue: 218400,
  closedThisMonth: 42600,
  closeRate: 0.34,
  avgTicket: 7820,
  stormLeads: 23,
};

const DEMO_BEST_LEADS = [
  { id: '1', name: 'Michael Trosclair', address: '7824 Old Hammond Hwy, BR', score: 91, urgency: 88, status: 'VERBAL_COMMIT', est: '$14,800', isStorm: true },
  { id: '2', name: 'Patricia Landry', address: '312 Sherwood Forest, BR', score: 85, urgency: 68, status: 'PROPOSAL_SENT', est: '$9,200', isStorm: false },
  { id: '3', name: 'Susan Bourgeois', address: '2207 Jefferson Hwy, BR', score: 62, urgency: 81, status: 'NEW_LEAD', est: '$4,200', isStorm: true },
  { id: '4', name: 'Angela Mouton', address: '226 Tupelo Dr, Prairieville', score: 82, urgency: 75, status: 'MEASURING_COMPLETE', est: '$8,900', isStorm: false },
  { id: '5', name: 'Carol Chauvin', address: '1245 Gause Blvd, Slidell', score: 80, urgency: 62, status: 'QUALIFIED', est: '$7,400', isStorm: false },
];

const DEMO_PIPELINE = [
  { stage: 'New Lead', count: 14, value: 58200 },
  { stage: 'Attempting Contact', count: 8, value: 31600 },
  { stage: 'Appointment Set', count: 7, value: 54300 },
  { stage: 'Proposal Sent', count: 8, value: 71400 },
  { stage: 'Verbal Commit', count: 3, value: 41200 },
];

const STATUS_COLORS: Record<string, string> = {
  NEW_LEAD: 'badge-slate',
  ATTEMPTING_CONTACT: 'badge-yellow',
  CONTACTED: 'badge-blue',
  QUALIFIED: 'badge-blue',
  APPOINTMENT_SET: 'badge-blue',
  INSPECTION_COMPLETE: 'badge-blue',
  MEASURING_COMPLETE: 'badge-blue',
  PROPOSAL_SENT: 'badge-blue',
  FOLLOW_UP: 'badge-yellow',
  VERBAL_COMMIT: 'badge-green',
  SOLD: 'badge-green',
  LOST: 'badge-red',
};

function StatCard({ label, value, subtext, icon: Icon, delta, color = 'blue' }: any) {
  const colors: Record<string, string> = {
    blue: 'from-brand-600/20 to-brand-800/10 border-brand-600/20',
    green: 'from-emerald-600/20 to-emerald-800/10 border-emerald-600/20',
    purple: 'from-purple-600/20 to-purple-800/10 border-purple-600/20',
    amber: 'from-amber-600/20 to-amber-800/10 border-amber-600/20',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-brand-400 bg-brand-500/15',
    green: 'text-emerald-400 bg-emerald-500/15',
    purple: 'text-purple-400 bg-purple-500/15',
    amber: 'text-amber-400 bg-amber-500/15',
  };

  return (
    <div className={`card p-5 bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta !== undefined && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium',
            delta >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {delta >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      {subtext && <div className="text-[11px] text-slate-600 mt-0.5">{subtext}</div>}
    </div>
  );
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="score-bar w-16">
      <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const stormMode = useAppStore((s) => s.stormModeActive);
  const financingMode = useAppStore((s) => s.financingModeActive);

  // In production, these would be real API calls:
  // const { data: dashData } = useQuery({ queryKey: ['analytics', 'dashboard'], queryFn: () => api.analytics.dashboard() });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl page-transition">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="text-gradient">{user?.firstName}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{today} · Baton Rouge Metro</p>
        </div>

        <div className="flex items-center gap-2">
          {stormMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
              <CloudIcon className="h-3.5 w-3.5" />
              Storm Opportunity Mode
            </div>
          )}
          <Link to="/field" className="btn-secondary btn-sm">
            <MapPinIcon className="h-4 w-4" />
            Field Mode
          </Link>
          <Link to="/leads/new" className="btn-primary btn-sm">
            + New Lead
          </Link>
        </div>
      </div>

      {/* Storm alert */}
      {stormMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="storm-banner"
        >
          <CloudIcon className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Storm Opportunity Mode Active</span>
            <span className="text-purple-400 ml-2">—</span>
            <span className="ml-2">23 storm-affected leads prioritized in East Baton Rouge and Livingston Parish</span>
          </div>
          <Link to="/leads?isStormLead=true" className="ml-auto btn btn-sm bg-purple-600 text-white hover:bg-purple-500">
            View Storm Leads
          </Link>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Leads"
          value={DEMO_STATS.leadsTotal}
          subtext={`+${DEMO_STATS.leadsNew} new today`}
          icon={UsersIcon}
          delta={12}
          color="blue"
        />
        <StatCard
          label="Pipeline Value"
          value={`$${(DEMO_STATS.pipelineValue / 1000).toFixed(0)}K`}
          subtext="Across all open stages"
          icon={ArrowTrendingUpIcon}
          delta={8}
          color="green"
        />
        <StatCard
          label="Closed This Month"
          value={`$${(DEMO_STATS.closedThisMonth / 1000).toFixed(0)}K`}
          subtext={`${(DEMO_STATS.closeRate * 100).toFixed(0)}% close rate`}
          icon={BanknotesIcon}
          delta={5}
          color="green"
        />
        <StatCard
          label="Appts Today"
          value={DEMO_STATS.appointmentsToday}
          subtext="Next at 10:00 AM"
          icon={CalendarIcon}
          color="amber"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best leads today */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BoltSolid className="h-4 w-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">Best Leads Today</h2>
                <span className="badge badge-blue ml-1">AI Ranked</span>
              </div>
              <Link to="/lead-intelligence" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                View intelligence →
              </Link>
            </div>

            <div className="divide-y divide-slate-700/30">
              {DEMO_BEST_LEADS.map((lead, i) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 text-center text-xs font-bold text-slate-600">#{i + 1}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{lead.name}</span>
                      {lead.isStorm && (
                        <span className="badge-storm text-[10px]">
                          <CloudIcon className="h-2.5 w-2.5" />
                          Storm
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{lead.address}</div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-300">{lead.est}</div>
                      <div className="text-[10px] text-slate-600">est. value</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-600 w-7">Lead</span>
                        <ScoreBar score={lead.score} />
                        <span className="text-[10px] text-slate-400 font-mono w-5">{lead.score}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-600 w-7">Urgn</span>
                        <ScoreBar score={lead.urgency} />
                        <span className="text-[10px] text-slate-400 font-mono w-5">{lead.urgency}</span>
                      </div>
                    </div>
                    <span className={`badge text-[10px] ${STATUS_COLORS[lead.status] || 'badge-slate'}`}>
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-700/30">
              <Link to="/leads" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                View all 127 leads →
              </Link>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Pipeline summary */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Pipeline</h2>
              <Link to="/pipeline" className="text-xs text-brand-400 hover:text-brand-300">View Kanban →</Link>
            </div>
            <div className="space-y-3">
              {DEMO_PIPELINE.map((stage) => {
                const pct = (stage.value / DEMO_STATS.pipelineValue) * 100;
                return (
                  <div key={stage.stage}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">{stage.count}</span>
                        <span className="text-xs text-slate-400">${(stage.value / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                    <div className="score-bar">
                      <div className="score-bar-fill bg-brand-500/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's appointments */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Today's Route</h2>
              <Link to="/appointments" className="text-xs text-brand-400 hover:text-brand-300">All →</Link>
            </div>
            <div className="space-y-3">
              {[
                { time: '10:00 AM', name: 'Robert Comeaux', type: 'Consultation', address: 'Baton Rouge', status: 'Confirmed' },
                { time: '1:30 PM', name: 'Karen Guidry', type: 'Measurement', address: 'Denham Springs', status: 'Confirmed' },
                { time: '3:45 PM', name: 'New lead TBD', type: 'Follow-up call', address: '—', status: 'Pending' },
              ].map((appt) => (
                <div key={appt.time} className="flex items-start gap-3">
                  <div className="text-xs font-mono text-slate-500 w-16 pt-0.5 flex-shrink-0">{appt.time}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-200">{appt.name}</div>
                    <div className="text-[11px] text-slate-500">{appt.type} · {appt.address}</div>
                  </div>
                  <span className={`badge text-[10px] ${appt.status === 'Confirmed' ? 'badge-green' : 'badge-yellow'}`}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI next actions */}
          <div className="ai-card">
            <div className="flex items-center gap-2 mb-3">
              <BoltSolid className="h-4 w-4 text-brand-400" />
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide">AI Recommendations</span>
            </div>
            <div className="space-y-2">
              {[
                'Follow up with Patricia Landry — proposal 3 days old, no response',
                'Michael Trosclair is at verbal commit — schedule sign/install today',
                'Susan Bourgeois is a storm lead — contact within 48h window',
              ].map((action, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-t border-slate-700/30 first:border-0 first:pt-0">
                  <div className="w-5 h-5 rounded-full bg-brand-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-brand-400">{i + 1}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{action}</p>
                </div>
              ))}
            </div>
            <div className="ai-confidence mt-3 pt-3 border-t border-slate-700/30">
              <BoltIcon className="h-3 w-3" />
              AI-generated · based on pipeline data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
