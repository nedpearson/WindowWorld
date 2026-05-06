import { Link, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { BeakerIcon, MagnifyingGlassIcon, ShieldCheckIcon, BoltIcon, MegaphoneIcon } from '@heroicons/react/24/outline';

const tabs = [
  { name: 'Lead Intelligence', path: '/intelligence-hub/leads', icon: BeakerIcon },
  { name: 'Market Intelligence', path: '/intelligence-hub/market', icon: MagnifyingGlassIcon },
  { name: 'Battlecards', path: '/intelligence-hub/battlecards', icon: ShieldCheckIcon },
  { name: 'Intent Intelligence', path: '/intelligence-hub/intent', icon: BoltIcon },
  { name: 'Marketing Playbooks', path: '/intelligence-hub/playbooks', icon: MegaphoneIcon },
];

export function IntelligenceHubLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Tab Navigation Header */}
      <div className="bg-slate-900 border-b border-slate-800 shrink-0 sticky top-0 z-10 px-4 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400">
            <BeakerIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Intelligence Hub</h1>
            <p className="text-xs text-slate-400">Comprehensive AI insights and market data</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = location.pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-brand-500 text-brand-400 bg-brand-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600 hover:bg-slate-800/50 rounded-t-lg'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
