import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MegaphoneIcon, MapPinIcon, FireIcon, HomeModernIcon, 
  ArrowPathRoundedSquareIcon, PlayIcon, CheckCircleIcon,
  XMarkIcon, UserGroupIcon, Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const PLAYBOOKS = [
  {
    id: 'geo-fencing',
    title: 'Radius Geo-Fencing ("Nosy Neighbor")',
    description: 'Target homes within a 1-mile radius of a recently completed 5-star install with Facebook/Instagram ads.',
    icon: MapPinIcon,
    color: 'from-blue-600/20 to-blue-800/10 border-blue-500/30 text-blue-400',
    stats: { active: 3, generated: 142 },
    inputs: ['Completed Job ID', 'Radius (Miles)', 'Ad Budget ($)'],
  },
  {
    id: 'thermal-audit',
    title: 'Entergy Bill Shock (Thermal Audit)',
    description: 'Run targeted campaigns in older zip codes offering a Free Thermal Leak Inspection to counter high summer AC bills.',
    icon: FireIcon,
    color: 'from-orange-600/20 to-orange-800/10 border-orange-500/30 text-orange-400',
    stats: { active: 1, generated: 89 },
    inputs: ['Zip Codes', 'Temperature Threshold (°F)', 'Campaign Duration'],
  },
  {
    id: 'real-estate',
    title: 'Real Estate Triggers (Pre & Post-Sale)',
    description: 'Automate direct mailers to homes sold in the last 60 days, and email local realtors about quick-turnaround inspection fixes.',
    icon: HomeModernIcon,
    color: 'from-emerald-600/20 to-emerald-800/10 border-emerald-500/30 text-emerald-400',
    stats: { active: 2, generated: 56 },
    inputs: ['Data Source (MLS API)', 'Trigger Types (Sold/Pending)'],
  },
  {
    id: 'hoa-age-out',
    title: 'HOA "Age-Out" Targeting',
    description: 'Target specific subdivisions built 20-30 years ago with failing builder-grade windows using a "Neighborhood Group Rate".',
    icon: UserGroupIcon,
    color: 'from-purple-600/20 to-purple-800/10 border-purple-500/30 text-purple-400',
    stats: { active: 4, generated: 210 },
    inputs: ['Subdivision Name', 'Year Built Range', 'Group Discount %'],
  },
  {
    id: 'reactivation',
    title: 'Dead Pipeline Reactivation',
    description: 'Run old lost leads through Silo AI to automate a 3-part SMS/Email sequence with new manufacturer incentives.',
    icon: ArrowPathRoundedSquareIcon,
    color: 'from-slate-600/20 to-slate-800/10 border-slate-500/30 text-slate-300',
    stats: { active: 0, generated: 0 },
    inputs: ['Lead Age (Months)', 'Lost Reason', 'New Incentive Offer'],
  }
];

export function MarketingPlaybooksPage() {
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const activePlaybook = PLAYBOOKS.find(p => p.id === selectedPlaybook);

  const handleActivate = () => {
    setActivating(true);
    setTimeout(() => {
      setActivating(false);
      toast.success(`${activePlaybook?.title} playbook activated successfully!`);
      setSelectedPlaybook(null);
    }, 1500);
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
              <div className={`p-2 rounded-lg bg-slate-900/50 border border-slate-700/50`}>
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
            <p className="text-sm text-slate-300 leading-relaxed min-h-[60px]">
              {playbook.description}
            </p>

            <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                <strong className="text-white">{playbook.stats.generated}</strong> leads generated
              </div>
              <button className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1 hover:text-white transition-colors">
                Configure <Cog6ToothIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Slide-over for activation */}
      <AnimatePresence>
        {selectedPlaybook && activePlaybook && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className={`p-6 border-b border-slate-800 bg-gradient-to-r ${activePlaybook.color} !border-0`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900/50 rounded-lg">
                      <activePlaybook.icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{activePlaybook.title}</h2>
                  </div>
                  <button onClick={() => setSelectedPlaybook(null)} className="text-slate-400 hover:text-white">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-sm text-slate-300">{activePlaybook.description}</p>
                
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configuration Parameters</h4>
                  
                  {activePlaybook.inputs.map((input, i) => (
                    <div key={i}>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{input}</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                        placeholder={`Enter ${input.toLowerCase()}...`}
                      />
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
