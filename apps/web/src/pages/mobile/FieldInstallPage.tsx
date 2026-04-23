import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon, DevicePhoneMobileIcon, BellAlertIcon,
  ArrowDownTrayIcon, WifiIcon, BoltIcon, XMarkIcon,
  ShareIcon, PlusCircleIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon as BoltSolid, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { useAuthStore } from '../../store/auth.store';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { usePWA } from '../../hooks/usePWA';
import axios from 'axios';
import apiClient from '../../api/client';

import { toast } from 'sonner';

// ─── Step type ────────────────────────────────────────────────
type SetupStep = 'welcome' | 'install' | 'notifications' | 'done';

// ─── Safe Safari Share arrow SVG ─────────────────────────────
function SafariShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Install Step ─────────────────────────────────────────────
function InstallStep({ isIOS, isInstallable, isInstalled, install, onNext }: {
  isIOS: boolean; isInstallable: boolean; isInstalled: boolean;
  install: () => Promise<boolean>; onNext: () => void;
}) {
  const [installing, setInstalling] = useState(false);
  const [showArrow, setShowArrow] = useState(false);

  useEffect(() => {
    if (isInstalled) onNext();
  }, [isInstalled, onNext]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowArrow(true);
      return;
    }
    setInstalling(true);
    const accepted = await install();
    setInstalling(false);
    if (accepted) onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 mx-auto flex items-center justify-center shadow-2xl shadow-brand-500/30 mb-4">
          <ArrowDownTrayIcon className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Add to Home Screen</h2>
        <p className="text-sm text-slate-400 mt-2">
          Install the WindowWorld app for instant access — works offline too.
        </p>
      </div>

      {/* iOS step-by-step */}
      {isIOS && (
        <div className="space-y-3">
          {[
            { n: 1, icon: <SafariShareIcon className="h-5 w-5 text-sky-400" />, text: <>Tap the <strong className="text-white">Share</strong> button below ↓</> },
            { n: 2, icon: <PlusCircleIcon className="h-5 w-5 text-brand-400" />, text: <><strong className="text-white">Add to Home Screen</strong></> },
            { n: 3, icon: <CheckCircleIcon className="h-5 w-5 text-emerald-400" />, text: <>Tap <strong className="text-white">Add</strong> in the top right</> },
          ].map(({ n, icon, text }) => (
            <div key={n} className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/40">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">{n}</div>
              <div className="w-6 flex-shrink-0">{icon}</div>
              <div className="text-sm text-slate-300">{text}</div>
            </div>
          ))}

          {/* Animated bouncing arrow pointing to Safari share bar */}
          <AnimatePresence>
            {showArrow && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex flex-col items-center gap-2 pt-4"
              >
                <div className="text-xs text-sky-400 font-semibold">Tap Share ↓ in Safari's toolbar</div>
                <div className="text-3xl">⬇️</div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowArrow((v) => !v)}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-sky-600/20"
          >
            <SafariShareIcon className="h-5 w-5" />
            Show me where to tap
          </button>
        </div>
      )}

      {/* Android / Desktop install */}
      {!isIOS && isInstallable && (
        <button
          onClick={handleInstall}
          disabled={installing}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold text-base transition-colors shadow-lg shadow-brand-600/30"
        >
          {installing
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <ArrowDownTrayIcon className="h-5 w-5" />
          }
          Install App
        </button>
      )}

      {/* Already installed or no install prompt */}
      {!isIOS && !isInstallable && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 w-full">
            <CheckBadgeIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-300">App may already be installed — check your home screen</span>
          </div>
        </div>
      )}

      <button onClick={onNext} className="text-xs text-slate-600 text-center hover:text-slate-400 transition-colors">
        Skip this step →
      </button>
    </motion.div>
  );
}

// ─── Notifications Step ───────────────────────────────────────
function NotificationsStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { subscribe, isSubscribed, isLoading, isSupported, permission, sendTest } = usePushNotifications();
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (isSubscribed) onNext();
  }, [isSubscribed, onNext]);

  const handleEnable = async () => {
    setTried(true);
    const ok = await subscribe();
    if (ok) {
      await sendTest();
      toast.success('🔔 Notifications enabled! A test was just sent.');
      setTimeout(onNext, 1200);
    }
  };

  const notifTypes = [
    { icon: '📅', text: 'New appointments assigned to you' },
    { icon: '🔥', text: 'Hot lead alerts — high score leads ready' },
    { icon: '💬', text: 'Homeowner replies & messages' },
    { icon: '✅', text: 'Proposal accepted / deal closed' },
    { icon: '⚡', text: 'Sync complete & upload confirmations' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 mx-auto flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-4">
          <BellAlertIcon className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Stay in the Loop</h2>
        <p className="text-sm text-slate-400 mt-2">
          Get instant alerts for appointments, hot leads, and deal updates — even when the app is closed.
        </p>
      </div>

      <div className="space-y-2">
        {notifTypes.map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <span className="text-sm text-slate-300">{text}</span>
          </div>
        ))}
      </div>

      {!isSupported && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <BellAlertIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          Push notifications require the app to be installed via Safari on iOS 16.4+. Install the app first, then re-open to enable.
        </div>
      )}

      {permission === 'denied' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          <XMarkIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          Notifications were blocked. Go to Settings → Safari → WindowWorld and allow notifications.
        </div>
      )}

      {isSupported && permission !== 'denied' && (
        <button
          onClick={handleEnable}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-bold text-base transition-colors shadow-lg shadow-amber-500/30"
        >
          {isLoading
            ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            : <BellAlertIcon className="h-5 w-5" />
          }
          Enable Notifications
        </button>
      )}

      <button onClick={onSkip} className="text-xs text-slate-600 text-center hover:text-slate-400 transition-colors">
        Maybe later →
      </button>
    </motion.div>
  );
}

// ─── Done Step ────────────────────────────────────────────────
function DoneStep({ userName, onGo }: { userName: string; onGo: () => void }) {
  const features = [
    { icon: '📍', text: "Today's route & stops" },
    { icon: '📸', text: 'Camera + AI window analysis' },
    { icon: '📏', text: 'Guided measurement tool' },
    { icon: '🎙️', text: 'Voice notes — hands-free' },
    { icon: '⚡', text: 'Offline sync — always saved' },
    { icon: '🔔', text: 'Real-time push alerts' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col gap-6 items-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40"
      >
        <CheckBadgeIcon className="h-12 w-12 text-white" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-black text-white">You're all set, {userName.split(' ')[0]}!</h2>
        <p className="text-sm text-slate-400 mt-2">WindowWorld Field Mode is ready on your iPhone.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {features.map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
            <span className="text-base">{icon}</span>
            <span className="text-xs text-slate-300">{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onGo}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-base transition-all hover:shadow-lg hover:shadow-brand-600/30"
      >
        Open Field Mode
        <ArrowRightIcon className="h-5 w-5" />
      </button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function FieldInstallPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const setUser   = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const user      = useAuthStore((s) => s.user);

  const [step, setStep]     = useState<SetupStep>('welcome');
  const [authDone, setAuthDone] = useState(false);
  const [authError, setAuthError] = useState('');
  const hydrated = useRef(false);

  const { isIOS, isInstallable, isInstalled, install } = usePWA();

  // ── Auto-authenticate from QR token ──────────────────────
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    // QR URL contains ?token=<refreshToken>&uid=<userId>
    // We exchange the refresh token for a fresh access+refresh pair.
    const token = searchParams.get('token');
    const uid   = searchParams.get('uid');

    if (!token || !uid) {
      // No QR params — show a friendly error instead of bouncing to /login
      setAuthError('This link is missing authentication info. Go back to the desktop and scan the QR code again.');
      return;
    }

    // Exchange the QR refresh token for a fresh session
    const base = import.meta.env.VITE_API_URL || '/api/v1';
    axios.post(`${base}/auth/refresh`, { refreshToken: token }, { timeout: 10000 })
      .then((res: any) => {
        const { accessToken, refreshToken: newRefresh, user: userData } = res.data?.data ?? {};
        if (!accessToken || !userData?.id) throw new Error('Invalid refresh response');
        setUser(userData);
        setTokens(accessToken, newRefresh ?? token);
        setAuthDone(true);
      })
      .catch((err: any) => {
        console.error('[FieldInstall] Token refresh failed', err?.response?.data ?? err.message);
        setAuthError('This QR code has expired. Go back to the desktop and scan the QR code again — it refreshes every 30 seconds.');
      });
  }, [searchParams, setUser, setTokens]);

  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'there';

  const goToField = () => navigate('/field', { replace: true });

  // ── Loading state while authenticating ───────────────────
  if (!authDone && !authError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-xl">
          <span className="text-white font-black text-xl">WW</span>
        </div>
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <div className="text-sm text-slate-500">Signing you in…</div>
      </div>
    );
  }

  // ── Auth error state ──────────────────────────────────────
  if (authError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
          <XMarkIcon className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <div className="text-lg font-bold text-white mb-2">QR Code Expired</div>
          <div className="text-sm text-slate-400">{authError}</div>
        </div>
        <button onClick={() => navigate('/login')} className="text-brand-400 text-sm underline">
          Go to Login
        </button>
      </div>
    );
  }

  // ── Setup flow ────────────────────────────────────────────
  const steps: SetupStep[] = ['welcome', 'install', 'notifications', 'done'];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" style={{ paddingTop: 'var(--sat, 0px)' }}>
      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-400"
          animate={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ── Welcome ── */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 mx-auto flex items-center justify-center shadow-2xl shadow-brand-500/30 mb-4">
                  <BoltSolid className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-2xl font-black text-white">Welcome, {userName.split(' ')[0]}!</h1>
                <p className="text-sm text-slate-400 mt-2">
                  You're setting up <strong className="text-white">WindowWorld Field Mode</strong> on this iPhone. It takes about 30 seconds.
                </p>
              </div>

              {/* Account card */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/40">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{userName}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    <CheckCircleIcon className="h-3 w-3" /> Signed in via QR
                  </div>
                </div>
                <WifiIcon className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
              </div>

              <div className="space-y-2.5 text-sm text-slate-400">
                {[
                  { icon: <ArrowDownTrayIcon className="h-4 w-4 text-brand-400" />, text: 'Install app to home screen' },
                  { icon: <BellAlertIcon className="h-4 w-4 text-amber-400" />, text: 'Enable push notifications' },
                  { icon: <BoltIcon className="h-4 w-4 text-emerald-400" />, text: 'You\'re live with all features' },
                ].map(({ icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3 px-1">
                    {icon}
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('install')}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-base shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all"
              >
                Get Started
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </motion.div>
          )}

          {/* ── Install ── */}
          {step === 'install' && (
            <InstallStep
              key="install"
              isIOS={isIOS}
              isInstallable={isInstallable}
              isInstalled={isInstalled}
              install={install}
              onNext={() => setStep('notifications')}
            />
          )}

          {/* ── Notifications ── */}
          {step === 'notifications' && (
            <NotificationsStep
              key="notifications"
              onNext={() => setStep('done')}
              onSkip={() => setStep('done')}
            />
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <DoneStep key="done" userName={userName} onGo={goToField} />
          )}

        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 pb-8">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              i === stepIdx ? 'bg-brand-500 scale-125' : i < stepIdx ? 'bg-brand-500/40' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
