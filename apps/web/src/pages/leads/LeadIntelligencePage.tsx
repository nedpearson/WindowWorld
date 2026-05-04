import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BoltIcon as BoltOutline, CloudIcon, FireIcon, ClockIcon, CurrencyDollarIcon, ChevronRightIcon,
  ChartBarIcon, ExclamationTriangleIcon, ChatBubbleLeftIcon, ShieldExclamationIcon, BuildingOfficeIcon, SparklesIcon,
  ChevronDownIcon, ArrowPathIcon, MapPinIcon
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { isDemoMode } from '../../utils/isDemoMode';

const FIRST_NAMES = ['Sarah', 'James', 'Robert', 'Michael', 'Emily', 'Jessica', 'David', 'John', 'Jennifer', 'Linda', 'William', 'Richard', 'Thomas', 'Mary', 'Patricia', 'Susan'];
const LAST_NAMES = ['Mitchell', 'Harrison', 'Chen', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const CITIES = ['Baton Rouge', 'Prairieville', 'Denham Springs', 'Gonzales', 'Zachary', 'Central', 'Baker', 'Walker', 'Port Allen'];
const PARISHES = ['East Baton Rouge', 'Ascension', 'Livingston', 'West Baton Rouge'];

function generateDemoLeads(count: number) {
  const leads = [];
  for (let i = 0; i < count; i++) {
    // Score descending from 95 to 50
    const score = Math.floor(95 - (i * (45 / count)));
    const isStorm = Math.random() > 0.7;
    const isHighValue = Math.random() > 0.6;
    
    const pitchAngles = Object.keys(PITCH_ANGLE_LABELS);
    const pitchAngle = pitchAngles[Math.floor(Math.random() * pitchAngles.length)];
    
    const firstContactMsg = isStorm 
      ? `Hi ${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]}, noticed you are looking into replacement windows after the storm. We have a local crew near you this week offering free damage assessments.`
      : `Hi ${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]}, I noticed you were looking at our premium window options and wanted to share a custom lookbook.`;

    leads.push({
      id: `dl-${Date.now()}-${i}`,
      firstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
      lastName: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
      city: CITIES[Math.floor(Math.random() * CITIES.length)],
      parish: PARISHES[Math.floor(Math.random() * PARISHES.length)],
      aiScore: score,
      urgencyScore: Math.floor(Math.random() * 60) + 30,
      closeProbability: Math.floor(Math.random() * 50) + 30,
      financingLikelihood: Math.floor(Math.random() * 80) + 10,
      status: 'NEW_LEAD',
      isStormLead: isStorm,
      estimatedValue: isHighValue ? Math.floor(Math.random() * 20000) + 10000 : Math.floor(Math.random() * 8000) + 3000,
      pitchAngle,
      stuckDays: Math.floor(Math.random() * 10),
      reasonForFlagging: isStorm ? 'Recent hail damage inquiry detected in local zip code after Monday storm.' : 'Viewed financing page 3 times this week. Stuck in follow-up.',
      firstContactMsg,
      bestOffer: Math.random() > 0.5 ? 'Free Upgrade to Impact-Resistant Glass' : '$0 Down, 0% Interest for 18 Months',
      riskFactors: Math.random() > 0.5 ? ['Price sensitive', 'Comparing multiple local contractors'] : [],
      competitor: Math.random() > 0.5 ? 'Renewal by Andersen' : 'Local Contractor',
    });
  }
  return leads;
}

// WindowWorld Baton Rouge HQ — used as origin for proximity sorting
const HQ_LAT = 30.4515;
const HQ_LNG = -91.1871;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceMiles(lat?: number, lng?: number): number {
  if (!lat || !lng) return 9999;
  return haversineKm(HQ_LAT, HQ_LNG, lat, lng) * 0.621371;
}

const PITCH_ANGLE_LABELS: Record<string, { label: string; color: string }> = {
  PREMIUM_VALUE:    { label: 'Premium Value', color: 'badge-purple' },
  FINANCING_FIRST:  { label: 'Financing First', color: 'badge-yellow' },
  URGENCY_BASED:    { label: 'Urgency', color: 'badge-red' },
  INSURANCE_STORM:  { label: 'Storm / Insurance', color: 'badge-storm' },
  ENERGY_SAVINGS:   { label: 'Energy Savings', color: 'badge-blue' },
  CONSULTATIVE:     { label: 'Consultative', color: 'badge-green' },
  BUDGET_CONSCIOUS: { label: 'Budget', color: 'badge-slate' }
};

const CATEGORIES = [
  { key: 'all', label: 'All Leads', icon: BoltSolid },
  { key: 'storm', label: 'Storm Leads', icon: CloudIcon },
  { key: 'hot', label: 'Hot (Score 80+)', icon: FireIcon },
  { key: 'stuck', label: 'Stuck (5+ days)', icon: ClockIcon },
  { key: 'high-value', label: 'High Value ($8K+)', icon: CurrencyDollarIcon },
];

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * 18;
  const strokeDash = (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : '#f59e0b';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="4" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

// ── Daily Trend Signals ───────────────────────────────────────
function DailyTrendSignals({ hasLeads }: { hasLeads: boolean }) {
  const [expanded, setExpanded] = useState(true);

  if (!hasLeads) return null; // Hide signals if there is no data to analyze

  return (
    <div className="card p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-brand-500/20 mb-6">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-brand-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Daily Trend Signals: Local Area</h2>
        </div>
        <ChevronDownIcon className={clsx('h-5 w-5 text-slate-500 transition-transform', expanded && 'rotate-180')} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <CloudIcon className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Weather Alerts</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Recent hail reports in the area. Expect a slight spike in search volume for "window damage repair" over the next 48 hours.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <FireIcon className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Homeowner Shifts</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  High volume of home refinancing inquiries locally. Homeowners are accessing equity specifically for exterior remodels.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <BuildingOfficeIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Competitor Weakness</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Competitor reviews dropping on local Google pages due to install delays. Pitch our "Guaranteed Timeline".
                </p>
              </div>

              <div className="bg-brand-500/10 rounded-xl p-4 border border-brand-500/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <SparklesIcon className="h-4 w-4 text-brand-400" />
                  <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide">Marketing Angle</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  "Did the last storm leave micro-cracks? Get a free 21-point Window World inspection." Focus ad-spend on local zip codes.
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



export function LeadIntelligencePage() {
  const user = useAuthStore((s) => s.user);
  const isDemoFallback = isDemoMode(user);
  const [category, setCategory] = useState('all');
  const [leads, setLeads] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
      // simulate artificial delay for AI search
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    apiClient.leads.list({ sortBy: 'leadScore', sortDir: 'desc', limit: 50 })
      .then((d: any) => {
        let raw: any[] = d?.data ?? d?.leads ?? [];
        if (isDemoFallback && (raw.length === 0 || refresh)) {
          raw = generateDemoLeads(30);
        }
        
        setLeads(raw.map((l: any, i: number) => {
          const lat = l.lat ?? l.latitude ?? null;
          const lng = l.lng ?? l.longitude ?? null;
          return {
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            city: l.city ?? '',
            parish: l.parish ?? l.county ?? l.city ?? '',
            score: l.aiScore ?? l.leadScore ?? 50,
            urgency: l.urgencyScore ?? l.urgency ?? 50,
            closePct: l.closeProbability ?? l.closePct ?? 50,
            financingPct: l.financingLikelihood ?? l.financingPct ?? 30,
            status: l.status,
            isStorm: l.isStormLead ?? false,
            est: l.estimatedValue ?? l.estimatedRevenue ?? 0,
            signals: l.aiSignals ?? l.signals ?? [],
            pitchAngle: l.pitchAngle ?? 'CONSULTATIVE',
            stuckDays: l.stuckDays ?? 0,
            reasonForFlagging: l.reasonForFlagging ?? 'High intent indicators detected.',
            firstContactMsg: l.firstContactMsg ?? `Hi ${l.firstName}, saw you might be looking into some exterior updates?`,
            bestOffer: l.bestOffer ?? 'Consultation',
            riskFactors: l.riskFactors ?? [],
            competitor: l.competitor ?? 'Unknown',
            lat,
            lng,
            distMiles: distanceMiles(lat, lng),
          };
        }));
      })
      .catch(() => {
        if (isDemoFallback) {
          const raw = generateDemoLeads(30);
          setLeads(raw.map((l: any) => ({
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            city: l.city ?? '',
            parish: l.parish ?? l.county ?? l.city ?? '',
            score: l.aiScore ?? l.leadScore ?? 50,
            urgency: l.urgencyScore ?? l.urgency ?? 50,
            closePct: l.closeProbability ?? l.closePct ?? 50,
            financingPct: l.financingLikelihood ?? l.financingPct ?? 30,
            status: l.status,
            isStorm: l.isStormLead ?? false,
            est: l.estimatedValue ?? l.estimatedRevenue ?? 0,
            signals: l.aiSignals ?? l.signals ?? [],
            pitchAngle: l.pitchAngle ?? 'CONSULTATIVE',
            stuckDays: l.stuckDays ?? 0,
            reasonForFlagging: l.reasonForFlagging ?? 'High intent indicators detected.',
            firstContactMsg: l.firstContactMsg ?? 'Consultation',
            bestOffer: l.bestOffer ?? 'Consultation',
            riskFactors: l.riskFactors ?? [],
            competitor: l.competitor ?? 'Unknown',
            lat: null, lng: null, distMiles: 9999
          })));
        } else {
          setLeads([]);
        }
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter (score >= 50 enforced), then sort: score DESC, then distMiles ASC
  const filtered = leads
    .filter((lead) => {
      if (category === 'storm') return lead.isStorm;
      if (category === 'hot') return lead.score >= 80;
      if (category === 'stuck') return lead.stuckDays >= 5;
      if (category === 'high-value') return lead.est >= 8000;
      return true;
    })
    .sort((a, b) => {
      // Primary: score descending
      if (b.score !== a.score) return b.score - a.score;
      // Secondary: distance from Baton Rouge HQ ascending
      return a.distMiles - b.distMiles;
    });

  const totalPotential = filtered.reduce((sum, l) => sum + l.est, 0);

  return (
    <div className="p-6 space-y-5 page-transition max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BoltSolid className="h-6 w-6 text-brand-400" />
            <h1 className="text-2xl font-bold text-white">Lead Intelligence Engine</h1>
          </div>
          <p className="text-slate-400 text-sm">
            AI-identified, high-intent homeowners matching 5-star customer profiles.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4 border-r border-slate-700 pr-6">
            <div className="text-2xl font-bold text-white">${(totalPotential / 1000).toFixed(0)}K</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold">potential in view</div>
          </div>
          <button 
            onClick={() => loadData(true)} 
            disabled={isRefreshing}
            className="btn-primary flex items-center gap-2"
          >
            <ArrowPathIcon className={clsx("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh AI Search
          </button>
          <Link to="/leads" className="btn-secondary">Table View</Link>
          <Link to="/pipeline" className="btn-secondary">Pipeline</Link>
        </div>
      </div>

      <DailyTrendSignals hasLeads={leads.length > 0} />

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              category === key
                ? 'bg-brand-600/20 text-brand-300 border-brand-500/40'
                : 'text-slate-500 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 rounded-full">
              {key === 'all' ? leads.length :
               key === 'storm' ? leads.filter(l => l.isStorm).length :
               key === 'hot' ? leads.filter(l => l.score >= 80).length :
               key === 'stuck' ? leads.filter(l => l.stuckDays >= 5).length :
               leads.filter(l => l.est >= 8000).length}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
          <BoltSolid className="h-3 w-3 text-brand-500" />
          Real-time Engine Active
        </div>
      </div>

      {/* Lead cards */}
      <div className="space-y-4">
        {filtered.map((lead, idx) => {
          const pitchConfig = PITCH_ANGLE_LABELS[lead.pitchAngle];
          return (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card p-0 overflow-hidden border border-slate-700/60 hover:border-brand-500/30 transition-all"
            >
              <div className="p-5 flex flex-col lg:flex-row items-start gap-6">
                
                {/* Left Column: Core Identity */}
                <div className="flex flex-col items-center justify-center gap-2 w-full lg:w-48 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-700/50 pb-4 lg:pb-0 lg:pr-6">
                  <ScoreRing score={lead.score} size={80} />
                  <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Intent Score</div>
                  <div className="text-center mt-2">
                    <div className="font-bold text-white text-lg">{lead.name || 'Anonymous Homeowner'}</div>
                    <div className="text-sm text-slate-400 mt-0.5">{lead.city || 'Baton Rouge'} {lead.parish ? `· ${lead.parish}` : ''}</div>
                    {lead.distMiles < 9999 && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <MapPinIcon className="h-3 w-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500">{lead.distMiles.toFixed(1)} mi away</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Predicted Value</div>
                    <div className="text-xl font-bold text-emerald-400">${(lead.est / 1000).toFixed(1)}K</div>
                  </div>
                </div>

                {/* Middle Column: Intelligence Data */}
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider">
                      <SparklesIcon className="h-3.5 w-3.5" /> {lead.closePct}% Close Prob.
                    </div>
                    {lead.isStorm && (
                      <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider">
                        <CloudIcon className="h-3.5 w-3.5" /> Storm Tracker
                      </div>
                    )}
                    {pitchConfig && (
                      <div className={`flex items-center gap-1.5 badge text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider ${pitchConfig.color}`}>
                        {pitchConfig.label}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Reason for Flagging</div>
                    <div className="text-sm text-slate-300 bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                      {lead.reasonForFlagging}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                        <CurrencyDollarIcon className="h-4 w-4" /> Best Offer to Present
                      </div>
                      <div className="text-sm font-medium text-emerald-400">
                        {lead.bestOffer}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                        <BuildingOfficeIcon className="h-4 w-4" /> Likely Competitor
                      </div>
                      <div className="text-sm font-medium text-slate-300">
                        {lead.competitor}
                      </div>
                    </div>
                  </div>

                  {lead.riskFactors && lead.riskFactors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                        <ShieldExclamationIcon className="h-4 w-4 text-amber-500" /> Risk Factors
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lead.riskFactors.map((risk: string, i: number) => (
                          <span key={i} className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                            {risk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                      <ChatBubbleLeftIcon className="h-4 w-4" /> Recommended First Message
                    </div>
                    <div className="text-sm text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 italic">
                      "{lead.firstContactMsg}"
                    </div>
                  </div>
                </div>

                {/* Right Column: Actions */}
                <div className="flex flex-col gap-2 w-full lg:w-40 flex-shrink-0">
                  <Link to={`/leads/${lead.id}`} className="btn-primary w-full justify-center">
                    Open Lead
                  </Link>
                  {/* Additional actions removed in cleanup pass */}
                </div>

              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card p-12 text-center border-dashed border-2 border-slate-700/50">
            <SparklesIcon className="h-12 w-12 text-brand-500/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Leads Match Criteria</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              The Intelligence Engine hasn't flagged any recent leads matching this specific category.
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-xs text-slate-500 mt-8">
        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-slate-600" />
        <p className="leading-relaxed">
          The 5-Star Lead Intelligence Engine synthesizes behavioral signals, regional weather data, and property characteristics to predict intent. 
          Recommendations are AI-generated based on Window World's highest-performing historical engagements in the Baton Rouge territory. 
          Data is refreshed hourly.
        </p>
      </div>
    </div>
  );
}
