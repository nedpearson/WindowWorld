import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MegaphoneIcon, MapPinIcon, FireIcon, HomeModernIcon,
  ArrowPathRoundedSquareIcon, PlayIcon, CheckCircleIcon,
  XMarkIcon, UserGroupIcon, Cog6ToothIcon, BuildingOfficeIcon,
  WrenchScrewdriverIcon, PaintBrushIcon, HomeIcon, BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import apiClient from '../../api/client';

interface PlaybookInput {
  label: string;
  type: 'text' | 'select';
  placeholder?: string;
  options?: string[];
  hint?: string;
}

interface Playbook {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  stats: { active: number; generated: number };
  inputs: PlaybookInput[];
}

const PLAYBOOKS: Playbook[] = [
  {
    id: 'geo-fencing',
    title: 'Radius Geo-Fencing ("Nosy Neighbor")',
    description: 'Target homes within a 1-mile radius of a recently completed 5-star install with Facebook/Instagram ads.',
    icon: MapPinIcon,
    color: 'from-blue-600/20 to-blue-800/10 border-blue-500/30 text-blue-400',
    stats: { active: 3, generated: 142 },
    inputs: [
      { label: 'Completed Job ID', type: 'text', placeholder: 'e.g. JOB-2024-0142', hint: 'Must be a verified 5-star install' },
      { label: 'Radius', type: 'select', options: ['0.5 Miles', '1 Mile', '1.5 Miles', '2 Miles', '3 Miles', '5 Miles'] },
      { label: 'Ad Budget', type: 'select', options: ['$500', '$1,000', '$2,500', '$5,000', '$10,000'] },
      { label: 'Ad Platform', type: 'select', options: ['Facebook & Instagram', 'Facebook Only', 'Instagram Only'] },
    ],
  },
  {
    id: 'thermal-audit',
    title: 'Entergy Bill Shock (Thermal Audit)',
    description: 'Run targeted campaigns in older zip codes offering a Free Thermal Leak Inspection to counter high summer AC bills.',
    icon: FireIcon,
    color: 'from-orange-600/20 to-orange-800/10 border-orange-500/30 text-orange-400',
    stats: { active: 1, generated: 89 },
    inputs: [
      { label: 'Target Parish', type: 'select', options: ['East Baton Rouge', 'West Baton Rouge', 'Ascension', 'Livingston', 'St. Tammany', 'Jefferson', 'Orleans', 'All Parishes'] },
      { label: 'Temperature Trigger', type: 'select', options: ['85°F+', '90°F+', '95°F+', '100°F+'], hint: 'Campaign activates when forecast hits threshold' },
      { label: 'Campaign Duration', type: 'select', options: ['2 Weeks', '1 Month', '6 Weeks', '2 Months', '3 Months'] },
    ],
  },
  {
    id: 'real-estate',
    title: 'Real Estate Triggers (Pre & Post-Sale)',
    description: 'Automate direct mailers to homes sold in the last 60 days, and email local realtors about quick-turnaround inspection fixes.',
    icon: HomeModernIcon,
    color: 'from-emerald-600/20 to-emerald-800/10 border-emerald-500/30 text-emerald-400',
    stats: { active: 2, generated: 56 },
    inputs: [
      { label: 'MLS Region', type: 'select', options: ['Greater Baton Rouge MLS', 'New Orleans MLS', 'Both Regions'] },
      { label: 'Sale Trigger', type: 'select', options: ['Recently Sold — Last 30 Days', 'Recently Sold — Last 60 Days', 'Pending Only', 'Sold & Pending'] },
      { label: 'Outreach Method', type: 'select', options: ['Direct Mail to Homeowner', 'Email Listing Agent', 'Both'] },
    ],
  },
  {
    id: 'hoa-age-out',
    title: 'HOA "Age-Out" Targeting',
    description: 'Target specific subdivisions built 20-30 years ago with failing builder-grade windows using a "Neighborhood Group Rate".',
    icon: UserGroupIcon,
    color: 'from-purple-600/20 to-purple-800/10 border-purple-500/30 text-purple-400',
    stats: { active: 4, generated: 210 },
    inputs: [
      { label: 'Subdivision Name', type: 'text', placeholder: 'e.g. Shenandoah Estates' },
      { label: 'Year Built Range', type: 'select', options: ['1985–1995', '1990–2000', '1995–2005', '2000–2010'] },
      { label: 'Group Discount Offered', type: 'select', options: ['5% Off', '10% Off', '15% Off', '20% Off'] },
    ],
  },
  {
    id: 'reactivation',
    title: 'Dead Pipeline Reactivation',
    description: 'Run old lost leads through Silo AI to automate a 3-part SMS/Email sequence with new manufacturer incentives.',
    icon: ArrowPathRoundedSquareIcon,
    color: 'from-slate-600/20 to-slate-800/10 border-slate-500/30 text-slate-300',
    stats: { active: 0, generated: 0 },
    inputs: [
      { label: 'Lead Age', type: 'select', options: ['3+ Months Old', '6+ Months Old', '12+ Months Old', '24+ Months Old'] },
      { label: 'Original Lost Reason', type: 'select', options: ['Price Too High', 'Not Ready to Buy', 'Went with Competitor', 'No Response', 'All Reasons'] },
      { label: 'New Incentive Offer', type: 'select', options: ['Free Installation', '0% Financing — 18 Months', 'Manufacturer Rebate', 'Extended Warranty', 'Bundle Discount'] },
    ],
  },
  {
    id: 'commercial-multi-family',
    title: 'Multi-Family CapEx Turnaround',
    description: 'Target Baton Rouge apartment complex owners and property managers looking to increase property value and reduce maintenance overhead via bulk window replacements.',
    icon: BuildingOfficeIcon,
    color: 'from-teal-600/20 to-teal-800/10 border-teal-500/30 text-teal-400',
    stats: { active: 1, generated: 12 },
    inputs: [
      { label: 'Property Management Group', type: 'text', placeholder: 'e.g. Stirling Properties' },
      { label: 'Minimum Unit Count', type: 'select', options: ['10+ Units', '25+ Units', '50+ Units', '100+ Units'] },
      { label: 'CapEx ROI Template', type: 'select', options: ['Standard ROI Report', 'Energy Savings Focus', 'Property Value Increase', 'Insurance Reduction'] },
    ],
  },
  {
    id: 'contractor-referral',
    title: 'Contractor Referral Network',
    description: 'Partner with local GCs, roofers, and painters to generate warm referrals. Offer co-branded inspection reports and fast-turnaround installs that complement their project timelines.',
    icon: WrenchScrewdriverIcon,
    color: 'from-yellow-600/20 to-yellow-800/10 border-yellow-500/30 text-yellow-400',
    stats: { active: 0, generated: 0 },
    inputs: [
      { label: 'Contractor / Company Name', type: 'text', placeholder: 'e.g. Dupont Roofing LLC' },
      { label: 'Trade Type', type: 'select', options: ['General Contractor', 'Roofer', 'Painter', 'Plumber', 'HVAC', 'All Trades'] },
      { label: 'Referral Fee', type: 'select', options: ['3%', '5%', '7%', '10%'] },
      { label: 'Territory', type: 'select', options: ['East Baton Rouge', 'West Baton Rouge', 'Ascension', 'Livingston', 'St. Tammany', 'All Parishes'] },
    ],
  },
  {
    id: 'renovation-pipeline',
    title: 'Home Renovation Pipeline',
    description: 'Pull active building permit data to target homeowners mid-renovation. Windows are a natural upgrade during kitchen, bathroom, or addition projects — capture them before the budget closes.',
    icon: PaintBrushIcon,
    color: 'from-cyan-600/20 to-cyan-800/10 border-cyan-500/30 text-cyan-400',
    stats: { active: 0, generated: 0 },
    inputs: [
      { label: 'Target Parish', type: 'select', options: ['East Baton Rouge', 'West Baton Rouge', 'Ascension', 'Livingston', 'St. Tammany', 'Jefferson', 'Orleans', 'All Parishes'] },
      { label: 'Permit Type', type: 'select', options: ['Addition / Room Expansion', 'Kitchen or Bath Remodel', 'Full Reside', 'New Construction', 'All Permit Types'] },
      { label: 'Permit Pull Date Range', type: 'select', options: ['Last 30 Days', 'Last 60 Days', 'Last 90 Days', 'Last 6 Months'] },
    ],
  },
  {
    id: 'residential-agent',
    title: 'Residential Agent Pre-Listing Program',
    description: 'Equip residential real estate agents with a fast-turnaround window inspection and replacement program to increase listing appeal and pass home inspections without delaying closings.',
    icon: HomeIcon,
    color: 'from-rose-600/20 to-rose-800/10 border-rose-500/30 text-rose-400',
    stats: { active: 0, generated: 0 },
    inputs: [
      { label: 'Agent Name', type: 'text', placeholder: 'e.g. Jane Smith' },
      { label: 'Target Area', type: 'select', options: ['East Baton Rouge', 'West Baton Rouge', 'Ascension', 'Livingston', 'St. Tammany', 'Jefferson', 'All Parishes'] },
      { label: 'Turnaround Guarantee', type: 'select', options: ['3 Business Days', '5 Business Days', '7 Business Days', '10 Business Days'], hint: 'Shown on co-branded collateral sent to the agent' },
      { label: 'Referral Commission', type: 'select', options: ['3%', '5%', '7%', '10%'] },
    ],
  },
  {
    id: 'commercial-agent',
    title: 'Commercial Agent CapEx Partnership',
    description: 'Work with commercial real estate agents and property managers to spec bulk window replacements into CapEx budgets for retail, office, and mixed-use properties across the Baton Rouge metro.',
    icon: BuildingStorefrontIcon,
    color: 'from-indigo-600/20 to-indigo-800/10 border-indigo-500/30 text-indigo-400',
    stats: { active: 0, generated: 0 },
    inputs: [
      { label: 'Agent / Brokerage Name', type: 'text', placeholder: 'e.g. CBRE Baton Rouge' },
      { label: 'Property Type', type: 'select', options: ['Retail', 'Office', 'Mixed-Use', 'Industrial', 'Medical Office', 'All Commercial'] },
      { label: 'Minimum Square Footage', type: 'select', options: ['1,000+ sqft', '5,000+ sqft', '10,000+ sqft', '25,000+ sqft', '50,000+ sqft'] },
      { label: 'CapEx Budget Range', type: 'select', options: ['$10K – $50K', '$50K – $150K', '$150K – $500K', '$500K+'] },
    ],
  },
];

const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all';

export function MarketingPlaybooksPage() {
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const activePlaybook = PLAYBOOKS.find(p => p.id === selectedPlaybook);

  const handleActivate = async () => {
    if (!activePlaybook) return;
    setActivating(true);
    try {
      await apiClient.campaigns.deployPlaybook(activePlaybook.id, { timestamp: new Date().toISOString() });
      toast.success(`${activePlaybook.title} playbook activated successfully!`);
      setSelectedPlaybook(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to deploy playbook');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto page-transition">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MegaphoneIcon className="h-6 w-6 text-brand-400" />
          <h1 className="text-2xl font-bold text-white">Marketing Playbooks</h1>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl">
          Deploy hyper-targeted, high-converting marketing strategies tailored for the Louisiana market to feed the Lead Intelligence Engine.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PLAYBOOKS.map((playbook) => (
          <div
            key={playbook.id}
            className={`card p-5 border bg-gradient-to-br cursor-pointer transition-all hover:scale-[1.02] ${playbook.color}`}
            onClick={() => setSelectedPlaybook(playbook.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <playbook.icon className="h-6 w-6" />
              </div>
              {playbook.stats.active > 0 ? (
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {playbook.stats.active} Active
                </div>
              ) : (
                <div className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">
                  Inactive
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-white mb-2">{playbook.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed min-h-[60px]">{playbook.description}</p>

            <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between">
              {playbook.stats.generated > 0 ? (
                <Link
                  to={`/leads?source=${playbook.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-slate-400 hover:text-brand-400 transition-colors"
                >
                  <strong className="text-white">{playbook.stats.generated}</strong> leads generated →
                </Link>
              ) : (
                <div className="text-xs text-slate-400">
                  <strong className="text-white">0</strong> leads generated
                </div>
              )}
              <button className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1 hover:text-white transition-colors">
                Configure <Cog6ToothIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedPlaybook && activePlaybook && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPlaybook(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className={`p-6 bg-gradient-to-r ${activePlaybook.color} !border-0`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900/50 rounded-lg">
                      <activePlaybook.icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{activePlaybook.title}</h2>
                  </div>
                  <button onClick={() => setSelectedPlaybook(null)} className="text-slate-400 hover:text-white transition-colors">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <p className="text-sm text-slate-300">{activePlaybook.description}</p>

                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configuration Parameters</h4>

                  {activePlaybook.inputs.map((input, i) => (
                    <div key={i}>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{input.label}</label>

                      {input.type === 'select' ? (
                        <select className={inputClass} defaultValue="">
                          <option value="" disabled>Select {input.label.toLowerCase()}…</option>
                          {input.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className={inputClass}
                          placeholder={input.placeholder ?? `Enter ${input.label.toLowerCase()}…`}
                        />
                      )}

                      {input.hint && (
                        <p className="mt-1 text-[11px] text-slate-500 italic">{input.hint}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setSelectedPlaybook(null)}
                    className="flex-1 btn-secondary justify-center py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleActivate}
                    disabled={activating}
                    className="flex-1 btn-primary justify-center py-2.5 flex items-center gap-2"
                  >
                    {activating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-4 w-4" /> Deploy Playbook
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
