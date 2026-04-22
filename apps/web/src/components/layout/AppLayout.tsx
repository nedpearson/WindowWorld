import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuthStore, useAppStore } from '../../store/auth.store';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HomeIcon, UsersIcon, MapPinIcon, CalendarIcon, ChartBarIcon,
  DocumentTextIcon, BanknotesIcon, BeakerIcon, Cog6ToothIcon,
  XMarkIcon, BoltIcon, CloudIcon,
  ExclamationTriangleIcon, MagnifyingGlassIcon, BellIcon,
  ArrowRightOnRectangleIcon, BuildingStorefrontIcon, ClipboardDocumentListIcon, MapIcon, ShieldCheckIcon,
  UserGroupIcon, WrenchScrewdriverIcon, StarIcon, AcademicCapIcon,
  ArrowUpTrayIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { io, Socket } from 'socket.io-client';
import { useEffect} from 'react';
import { GlobalSearch } from '../search/GlobalSearch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';

function NotificationsDropdown({
  isOpen, onClose, notifications, unreadCount, onMarkAllRead
}: {
  isOpen: boolean; onClose: () => void;
  notifications: any[]; unreadCount: number;
  onMarkAllRead: () => void;
}) {
  if (!isOpen) return null;
  const displayNotifs = notifications.length ? notifications : [
    { title: 'No new notifications', desc: 'You are all caught up', time: 'Just now' }
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-12 right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden text-left">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 dark:text-white">
            Notifications {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-brand-500 text-white text-[9px] font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >Mark all read</button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {displayNotifs.map((n, i) => (
            <div key={i} className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-100 dark:border-slate-800/50 ${n.unread ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}>
              <div className="flex justify-between items-start">
                <span className={`text-sm font-medium ${n.unread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{n.title}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{n.time}</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
            </div>
          ))}
        </div>
        <div className="p-2 text-center border-t border-slate-100 dark:border-slate-800">
          <Link to="/settings" onClick={onClose} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">View Preferences</Link>
        </div>
      </div>
    </>
  );
}

const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',        path: '/dashboard',         icon: HomeIcon },
      { label: 'Analytics',        path: '/analytics',         icon: ChartBarIcon },
      { label: 'Rep Coaching',     path: '/coaching',          icon: AcademicCapIcon },
    ] },
  {
    label: 'Leads & Sales',
    items: [
      { label: 'Lead Intelligence', path: '/lead-intelligence', icon: BeakerIcon },
      { label: 'All Leads',         path: '/leads',             icon: UsersIcon },
      { label: 'Contacts',          path: '/contacts',          icon: UserGroupIcon },
      { label: 'CSV Import',        path: '/leads/import',      icon: ArrowUpTrayIcon },
      { label: 'Pipeline',          path: '/pipeline',          icon: BuildingStorefrontIcon },
      { label: 'Territory Map',     path: '/map',               icon: MapIcon },
      { label: 'Appointments',      path: '/appointments',      icon: CalendarIcon },
      { label: 'Automations',       path: '/automations',       icon: BoltIcon },
    ] },
  {
    label: 'Field Work',
    items: [
      { label: 'Field Mode',    path: '/field',        icon: MapPinIcon,              badge: 'MOBILE' },
      { label: 'Inspections',   path: '/inspections',  icon: ClipboardDocumentListIcon },
    ] },
  {
    label: 'Revenue',
    items: [
      { label: 'Quick Quote',        path: '/quick-quote',          icon: BoltIcon },
      { label: 'Product Catalog',    path: '/catalog',              icon: BuildingStorefrontIcon },
      { label: 'Proposals',          path: '/proposals',            icon: DocumentTextIcon },
      { label: 'Invoices',           path: '/invoices',             icon: BanknotesIcon },
      { label: 'Commissions',        path: '/commissions',          icon: CurrencyDollarIcon },
      { label: 'Install Schedule',   path: '/installs',             icon: WrenchScrewdriverIcon },
      { label: 'Reviews & Referrals',path: '/installs/post-install', icon: StarIcon },
    ] },
  {
    label: 'Admin',
    items: [
      { label: 'Admin Panel',  path: '/admin',    icon: ShieldCheckIcon },
      { label: 'Settings',     path: '/settings', icon: Cog6ToothIcon },
    ] },
];

function NavItem({ item, active }: { item: any; active: boolean }) {
  return (
    <Link
      to={item.path}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        active
          ? 'bg-brand-600/15 text-brand-400'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      )}
    >
      <item.icon className="h-4.5 w-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function AppLayout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const stormMode = useAppStore((s) => s.stormModeActive);
  const setStormMode = useAppStore((s) => s.setStormMode);
  const financingMode = useAppStore((s) => s.financingModeActive);
  const setFinancingMode = useAppStore((s) => s.setFinancingMode);
  const offlineMode = useAppStore((s) => s.offlineMode);
  const syncPending = useAppStore((s) => s.syncPending);
  const [, setMobileMenuOpen] = useState(false);
  const [, setNotificationsOpen] = useState(false);
  const [wsNotifications, setWsNotifications] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications from API on mount + every 5 min
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.notifications.list(30),
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000 });
  const apiNotifications: any[] = (notifData as any)?.data || [];
  const unreadCount: number = (notifData as any)?.unreadCount || 0;

  const { mutate: markAllRead } = useMutation({
    mutationFn: () => apiClient.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setWsNotifications([]);
    } });

  // Merge WebSocket real-time pushes with API notifications (WS first = newest)
  const notifications = [...wsNotifications, ...apiNotifications].slice(0, 25);
  const totalUnread = unreadCount + wsNotifications.length;

  useEffect(() => {
    const token = localStorage.getItem('ww_token');
    if (!token) return;

    const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'] });

    socket.on('notification', (data) => {
      setWsNotifications(prev => [data, ...prev].slice(0, 10));
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // Real-time lead score updates — AI scoring job completed on server
    socket.on('lead:scored', ({ leadId }: { leadId: string; totalScore: number }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-intelligence'] });
    });

    // Real-time pipeline updates — rep changed a lead status elsewhere
    socket.on('lead:status-changed', ({ leadId }: { leadId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    });

    return () => { socket.disconnect(); };
  }, [queryClient]);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-40 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-sm">WW</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">WindowWorld</div>
            <div className="text-[10px] text-slate-500 font-medium">Sales Platform</div>
          </div>
        </div>

        {/* Mode banners */}
        <div className="px-3 pt-3 flex flex-col gap-1.5">
          {stormMode && (
            <motion.button
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setStormMode(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-medium w-full"
            >
              <CloudIcon className="h-3.5 w-3.5" />
              <span>Storm Mode Active</span>
              <XMarkIcon className="h-3.5 w-3.5 ml-auto" />
            </motion.button>
          )}
          {financingMode && (
            <motion.button
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setFinancingMode(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600/15 border border-amber-500/25 text-amber-300 text-xs font-medium w-full"
            >
              <BanknotesIcon className="h-3.5 w-3.5" />
              <span>Financing Mode Active</span>
              <XMarkIcon className="h-3.5 w-3.5 ml-auto" />
            </motion.button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-3 pb-1.5">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem key={item.path} item={item} active={isActive(item.path)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Mode toggles */}
        <div className="px-3 pb-2 border-t border-slate-800 pt-3 space-y-1.5">
          <button
            onClick={() => setStormMode(!stormMode)}
            className={clsx(
              'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all',
              stormMode
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            )}
          >
            <CloudIcon className="h-4 w-4" />
            Storm Mode
            <div className={clsx(
              'ml-auto w-7 h-4 rounded-full transition-all',
              stormMode ? 'bg-purple-600' : 'bg-slate-700'
            )}>
              <div className={clsx(
                'w-3 h-3 bg-white rounded-full shadow transition-transform m-0.5',
                stormMode ? 'translate-x-3' : 'translate-x-0'
              )} />
            </div>
          </button>

          <button
            onClick={() => setFinancingMode(!financingMode)}
            className={clsx(
              'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all',
              financingMode
                ? 'bg-amber-600/15 text-amber-300 border border-amber-500/25'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            )}
          >
            <BanknotesIcon className="h-4 w-4" />
            Financing Mode
            <div className={clsx(
              'ml-auto w-7 h-4 rounded-full transition-all',
              financingMode ? 'bg-amber-500' : 'bg-slate-700'
            )}>
              <div className={clsx(
                'w-3 h-3 bg-white rounded-full shadow transition-transform m-0.5',
                financingMode ? 'translate-x-3' : 'translate-x-0'
              )} />
            </div>
          </button>
        </div>

        {/* User */}
        <div className="px-3 pb-4 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[10px] text-slate-500 truncate capitalize">
                {user?.role?.toLowerCase().replace(/_/g, ' ')}
              </div>
            </div>
            <button
              onClick={logout}
              className="text-slate-600 hover:text-slate-400 transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────── */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 z-30 flex items-center px-6 gap-4">
          {/* Search */}
          <button onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 text-sm hover:border-brand-500/40 hover:text-slate-300 transition-colors flex-1 max-w-sm">
            <MagnifyingGlassIcon className="h-4 w-4" />
            <span>Search leads, properties...</span>
            <span className="ml-auto text-[10px] bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-500">⌘K</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Offline indicator */}
            {offlineMode && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-medium">
                <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                Offline
                {syncPending > 0 && <span className="bg-amber-500 text-white px-1.5 rounded-full text-[9px]">{syncPending}</span>}
              </div>
            )}

            {/* AI indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium">
              <BoltSolid className="h-3 w-3" />
              AI Active
            </div>

            {/* Notifications */}
            <div className="relative">
              <Link
                to="/notifications"
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(false)}
              >
                <BellIcon className="h-5 w-5" />
                {totalUnread > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-brand-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
