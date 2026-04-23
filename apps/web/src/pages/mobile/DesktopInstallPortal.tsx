import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowTopRightOnSquareIcon, DevicePhoneMobileIcon, ShareIcon,
  WifiIcon, CheckCircleIcon, BellAlertIcon, BoltIcon as BoltOutline,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

interface DesktopInstallPortalProps {
  user: { id?: string; firstName?: string; lastName?: string; email?: string } | null;
  accessToken: string | null;
  isOnline: boolean;
  stopCount: number;
  confirmedCount: number;
  pendingCount: number;
  isSyncing: boolean;
}

export function DesktopInstallPortal({
  user, accessToken, isOnline, stopCount, confirmedCount, pendingCount, isSyncing,
}: DesktopInstallPortalProps) {
  const [tick, setTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(220);

  // Refresh QR every 30 s to rotate the embedded timestamp
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Build the authenticated deep-link
  const origin = window.location.origin;
  const qrUrl = new URL('/field-install', origin);
  if (user?.id)      qrUrl.searchParams.set('uid', user.id);
  if (accessToken)   qrUrl.searchParams.set('token', accessToken);
  qrUrl.searchParams.set('ts', Math.floor(Date.now() / 30_000).toString());
  const qrString = qrUrl.toString();

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [qrString]);

  const userName   = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Field Rep';
  const initials   = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'WW';
  const timeStr    = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const STEPS = [
    { n: 1, icon: '📱', title: 'Open iPhone Camera', desc: 'Point it at the QR code below' },
    { n: 2, icon: '🔗', title: 'Tap the notification', desc: 'Opens in Safari automatically' },
    { n: 3, icon: '⬆️', title: 'Tap the Share button', desc: 'Bottom toolbar in Safari' },
    { n: 4, icon: '➕', title: '"Add to Home Screen"', desc: 'Then tap Add — you\'re done!' },
  ];

  const FEATURES = [
    { icon: '🗺️', label: 'Live Route Map' },
    { icon: '📸', label: 'Camera + AI' },
    { icon: '📏', label: 'Measurements' },
    { icon: '🤖', label: 'Pitch Coach' },
    { icon: '📝', label: 'Voice Notes' },
    { icon: '🔔', label: 'Push Alerts' },
    { icon: '⚡', label: 'Offline Sync' },
    { icon: '🎯', label: 'Lead Scores' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-500/20">
            WW
          </div>
          <div>
            <div className="text-sm font-bold text-white">WindowWorld Field Mode</div>
            <div className="text-[11px] text-slate-500">{dateStr} · {timeStr}</div>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-3">
          {isSyncing ? (
            <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-300">
              <ArrowPathIcon className="h-3 w-3 animate-spin" /> Syncing…
            </div>
          ) : isOnline ? (
            <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
              <WifiIcon className="h-3 w-3" /> Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400">
              Offline
            </div>
          )}
          {/* User chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700/50">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
              {initials}
            </div>
            <span className="text-[11px] font-medium text-slate-300">{userName}</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-5xl w-full grid grid-cols-[1fr_auto_1fr] gap-12 items-center">

          {/* ── LEFT: Info + stats ── */}
          <div className="space-y-8">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-300 text-xs font-semibold mb-4"
              >
                <BoltIcon className="h-3.5 w-3.5" />
                Field Mode — Desktop Portal
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="text-4xl font-black text-white leading-tight"
              >
                Install on<br />
                <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
                  your iPhone
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-slate-400 text-sm mt-3 leading-relaxed"
              >
                Scan the QR code with your iPhone camera to instantly open the app — pre-authenticated as <strong className="text-white">{userName}</strong>. No login required.
              </motion.p>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { label: "Today's Stops", value: stopCount, color: 'text-white' },
                { label: 'Confirmed', value: confirmedCount, color: 'text-emerald-400' },
                { label: 'Queued', value: pendingCount, color: pendingCount > 0 ? 'text-amber-400' : 'text-slate-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-center">
                  <div className={clsx('text-3xl font-black tabular-nums', color)}>{value}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{label}</div>
                </div>
              ))}
            </motion.div>

            {/* Feature grid */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            >
              <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">Everything on your iPhone</div>
              <div className="grid grid-cols-4 gap-2">
                {FEATURES.map(({ icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                    <span className="text-xl">{icon}</span>
                    <span className="text-[10px] text-slate-400 text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── CENTER: QR Code ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center gap-5"
          >
            {/* Glow ring */}
            <div className="relative">
              {/* Ambient glow */}
              <div className="absolute inset-0 rounded-3xl bg-brand-500/20 blur-2xl scale-110 pointer-events-none" />

              {/* QR card */}
              <motion.div
                key={tick}
                initial={{ opacity: 0.8, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative p-6 rounded-3xl bg-white shadow-2xl shadow-black/50"
              >
                <QRCodeSVG
                  value={qrString}
                  size={220}
                  level="M"
                  includeMargin={false}
                  imageSettings={{
                    src: `${origin}/icon-192.png`,
                    height: 44,
                    width: 44,
                    excavate: true,
                  }}
                />
                {/* Live badge */}
                <div className="absolute -top-3 -right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-lg shadow-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              </motion.div>
            </div>

            {/* Label */}
            <div className="text-center">
              <div className="text-sm font-bold text-white">Point iPhone camera here</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Updates every 30 seconds · Linked to your account</div>
            </div>

            {/* Copy link button */}
            <button
              onClick={copyLink}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border',
                copied
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              {copied ? '✓ Link Copied!' : 'Copy Install Link'}
            </button>

            {/* User badge on QR */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30">
              <CheckBadgeIcon className="h-4 w-4 text-brand-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-400">Signed in as <strong className="text-white">{userName}</strong></span>
            </div>
          </motion.div>

          {/* ── RIGHT: Install steps ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DevicePhoneMobileIcon className="h-5 w-5 text-brand-400" />
                <span className="text-sm font-bold text-white">Install Steps</span>
              </div>

              <div className="space-y-3">
                {STEPS.map(({ n, icon, title, desc }) => (
                  <motion.div
                    key={n}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + n * 0.08 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/40"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600/30 to-brand-700/30 border border-brand-500/20 flex items-center justify-center flex-shrink-0 text-xl">
                      {icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                    </div>
                    <div className="ml-auto w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-black text-slate-400 flex-shrink-0">
                      {n}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Safari note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <div>
                  <div className="text-xs font-semibold text-amber-300 mb-1">Must open in Safari</div>
                  <div className="text-[11px] text-amber-400/70 leading-relaxed">
                    "Add to Home Screen" is only available in Safari on iOS. If it opens in another browser, tap <strong className="text-amber-300">Open in Safari</strong> first.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* What you get */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 space-y-2"
            >
              <div className="text-xs font-semibold text-emerald-400">After installing you get:</div>
              {[
                'Full-screen app — no browser chrome',
                'Works offline — data saved locally',
                'Push notifications for new leads',
                'Stays logged in as your account',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-[11px] text-emerald-300/80">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center py-4 border-t border-slate-800/40">
        <p className="text-[11px] text-slate-700">
          QR code refreshes every 30 s · Token is bound to <strong className="text-slate-600">{userName}</strong>'s session
        </p>
      </div>
    </div>
  );
}
