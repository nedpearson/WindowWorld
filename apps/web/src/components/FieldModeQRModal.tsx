import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  XMarkIcon, DevicePhoneMobileIcon, ArrowPathIcon,
  ArrowTopRightOnSquareIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useAuthStore } from '../store/auth.store';
import { Link } from 'react-router-dom';

// ─── Device detection ────────────────────────────────────────
function detectPlatform(): 'ios-safari' | 'ios-chrome' | 'android' | 'other' {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isChrome = /CriOS|Chrome/.test(ua) && !/Chromium/.test(ua);
  if (isIOS && isChrome) return 'ios-chrome';
  if (isIOS) return 'ios-safari';
  if (isAndroid) return 'android';
  return 'other';
}

// ─── Install steps by platform ───────────────────────────────
const STEPS_BY_PLATFORM = {
  'ios-safari': [
    { icon: '📷', text: 'This page is already open in Safari' },
    { icon: '⬆️', text: 'Tap the Share button in Safari\'s toolbar' },
    { icon: '➕', text: 'Tap "Add to Home Screen" → Add' },
    { icon: '✅', text: 'Open the WindowWorld app from your home screen' },
  ],
  'ios-chrome': [
    { icon: '🔗', text: 'Tap the share icon (⋯) in Chrome\'s toolbar' },
    { icon: '🌐', text: 'Tap "Open in Safari" to switch browsers' },
    { icon: '⬆️', text: 'Tap the Share button in Safari\'s toolbar' },
    { icon: '➕', text: 'Tap "Add to Home Screen" → Add' },
  ],
  'android': [
    { icon: '⋮', text: 'Tap the menu (⋮) in Chrome\'s top-right corner' },
    { icon: '➕', text: 'Tap "Add to Home screen" or "Install app"' },
    { icon: '✅', text: 'Tap Install on the confirmation dialog' },
    { icon: '🚀', text: 'Open WindowWorld from your home screen' },
  ],
  'other': [
    { icon: '📱', text: 'Open this link on your mobile phone' },
    { icon: '⬆️', text: 'Use your browser\'s "Add to Home Screen" option' },
    { icon: '➕', text: 'iOS: Share → Add to Home Screen' },
    { icon: '➕', text: 'Android: Menu (⋮) → Add to Home Screen' },
  ],
};

const PLATFORM_LABELS: Record<string, { title: string; sub: string; badge?: string }> = {
  'ios-safari': { title: 'Install on iPhone', sub: 'Scan or follow steps below', badge: 'Safari' },
  'ios-chrome': { title: 'Install on iPhone', sub: 'Switch to Safari to install', badge: 'Chrome → Safari' },
  'android':    { title: 'Install on Android', sub: 'Scan or follow steps below', badge: 'Chrome' },
  'other':      { title: 'Install on Mobile', sub: 'Scan the QR code with your phone', badge: undefined },
};

// ─── Modal ────────────────────────────────────────────────────
export function FieldModeQRModal({ onClose }: { onClose: () => void }) {
  const user         = useAuthStore(s => s.user);
  const refreshToken = useAuthStore(s => s.refreshToken);
  const [tick, setTick]     = useState(0);
  const [copied, setCopied] = useState(false);
  const [platform]          = useState(detectPlatform);
  const [activeTab, setActiveTab] = useState<'qr' | 'steps'>('qr');

  // Rotate QR every 30 s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  // Build authenticated deep-link with refreshToken
  const origin  = window.location.origin;
  const qrUrl   = new URL('/field-install', origin);
  if (user?.id)     qrUrl.searchParams.set('uid', user.id);
  if (refreshToken) qrUrl.searchParams.set('token', refreshToken);
  qrUrl.searchParams.set('ts', Math.floor(Date.now() / 30_000).toString());
  const qrString = qrUrl.toString();

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [qrString]);

  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'you';
  const steps    = STEPS_BY_PLATFORM[platform];
  const label    = PLATFORM_LABELS[platform];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal card */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700/60 shadow-2xl shadow-black/60 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-500/20">
                WW
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  {label.title}
                  {label.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400">
                      {label.badge}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">{label.sub}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-slate-800">
            {(['qr', 'steps'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={clsx(
                  'flex-1 py-2.5 text-xs font-semibold transition-colors',
                  activeTab === tab
                    ? 'text-brand-400 border-b-2 border-brand-500 -mb-px'
                    : 'text-slate-500 hover:text-slate-300'
                )}>
                {tab === 'qr' ? '📱 QR Code' : '📋 Steps'}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {activeTab === 'qr' && (
              <>
                {/* QR Code */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-brand-500/25 blur-xl pointer-events-none" />
                    <motion.div
                      key={tick}
                      initial={{ opacity: 0.85, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="relative p-5 rounded-2xl bg-white shadow-xl"
                    >
                      <QRCodeSVG
                        value={qrString}
                        size={200}
                        level="M"
                        includeMargin={false}
                        imageSettings={{
                          src: `${origin}/icon-192.png`,
                          height: 40,
                          width: 40,
                          excavate: true,
                        }}
                      />
                      <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-lg shadow-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </div>
                    </motion.div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700/50">
                    <CheckBadgeIcon className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-400">
                      Linked to <strong className="text-white">{userName}</strong>'s account
                    </span>
                  </div>

                  {/* Cross-platform note — helpful, not restrictive */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-500/8 border border-brand-500/20 text-xs text-brand-300 w-full">
                    <span className="flex-shrink-0">💡</span>
                    <span>
                      Works on <strong>iOS</strong> (Safari) and <strong>Android</strong> (Chrome).
                      Tap <em>Steps</em> above for browser-specific instructions.
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'steps' && (
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/30">
                    <span className="text-lg flex-shrink-0">{step.icon}</span>
                    <span className="text-xs text-slate-300 flex-1">{step.text}</span>
                    <span className="ml-auto w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 flex-shrink-0">
                      {i + 1}
                    </span>
                  </div>
                ))}

                {/* What you get after install */}
                <div className="pt-1">
                  <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">After installing</div>
                  {[
                    'Full-screen app — no browser UI',
                    'Works offline — data saved locally',
                    'Stays signed in as your account',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-[11px] text-emerald-300/80 py-0.5">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                  copied
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <Link
                to="/field"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors"
              >
                <DevicePhoneMobileIcon className="h-4 w-4" />
                Open App
              </Link>
            </div>

            <div className="text-center text-[10px] text-slate-700">
              QR refreshes every 30 s · No login required after scanning
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
