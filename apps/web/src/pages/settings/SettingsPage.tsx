import React, { useState } from 'react';
import { Cog6ToothIcon, BellIcon, ShieldCheckIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile & Security', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'billing', name: 'Billing & Subscriptions', icon: CreditCardIcon },
    { id: 'system', name: 'System Preferences', icon: Cog6ToothIcon },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Profile Information</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your account details and security preferences.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                  <input type="text" defaultValue={user?.firstName} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                  <input type="text" defaultValue={user?.lastName} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                  <input type="email" defaultValue={user?.email} disabled className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 shadow-sm sm:text-sm opacity-70 cursor-not-allowed" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm shadow-blue-500/20">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
               <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Notification Preferences</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Control how you receive alerts and updates.</p>
              </div>
              <div className="space-y-4">
                {['New Lead Assignment', 'Proposal Viewed', 'Contract Signed', 'System Updates'].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                    <div className="flex items-center gap-2">
                       <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Billing Overview</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your subscription and payment methods securely via Stripe.</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                   <h4 className="font-semibold text-slate-800 dark:text-white">Professional Plan</h4>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">$299/mo â€” Next billing date: May 15th</p>
                </div>
                <button className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 font-medium text-sm transition-colors shadow-sm">
                  Manage in Stripe
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'system' && (
            <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400">
              Only Organization Owners can modify system-wide preferences.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
