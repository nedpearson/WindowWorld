import { useState, useEffect } from 'react';
import { QrCodeIcon, DevicePhoneMobileIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/auth.store';

// Lightweight QR code generator using Google Charts API
function QRCode({ value, size = 200 }: { value: string; size?: number }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=0f172a&color=818cf8&format=svg&qzone=2`;
  return (
    <img
      src={url}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded-lg"
    />
  );
}

interface MobileAccessQRProps {
  className?: string;
}

export function MobileAccessQR({ className = '' }: MobileAccessQRProps) {
  const { user, accessToken } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (user && accessToken) {
      // Build the deep-link URL for the mobile field app
      // Includes a short-lived token in the URL so the iPhone can auto-login
      const base = 'https://windowworld.bridgebox.ai/field-install';
      const params = new URLSearchParams({
        token: accessToken,
        uid: user.id,
        mode: 'qr',
      });
      setQrUrl(`${base}?${params.toString()}`);
    }
  }, [user, accessToken]);

  if (!user) return null;

  return (
    <>
      {/* ── Card ── */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900/40 via-slate-800/40 to-slate-900/60 border border-brand-700/30 p-5 cursor-pointer hover:border-brand-600/50 transition-all duration-200 group ${className}`}
        onClick={() => setShowModal(true)}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
            <DevicePhoneMobileIcon className="h-5 w-5 text-brand-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white">Mobile Field App</h3>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-brand-500/20 text-brand-400 rounded-full border border-brand-500/30">
                iPhone Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan QR to open the field app on your iPhone — measure, photograph, and sync jobs offline.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-brand-400">
                <QrCodeIcon className="h-3.5 w-3.5" />
                Tap to show QR code
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                Install as PWA
              </div>
            </div>
          </div>

          {/* Mini QR preview */}
          <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden group-hover:border-brand-700/50 transition-colors">
            <QrCodeIcon className="h-8 w-8 text-slate-600 group-hover:text-brand-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Dialog */}
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center gap-2 mb-2">
              <DevicePhoneMobileIcon className="h-5 w-5 text-brand-400" />
              <h2 className="text-base font-bold text-white">Open on iPhone</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Point your iPhone camera at this code to open the WindowWorld field app in Safari, then tap <strong className="text-slate-300">Add to Home Screen</strong> to install.
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                {qrUrl ? (
                  <QRCode value={qrUrl} size={200} />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* User info */}
            <div className="bg-slate-800/60 rounded-xl px-4 py-3 mb-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                    user.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                    user.role === 'SALES_MANAGER' ? 'bg-blue-500/20 text-blue-400' :
                    user.role === 'FIELD_MEASURE_TECH' ? 'bg-green-500/20 text-green-400' :
                    'bg-slate-600/40 text-slate-400'
                  }`}>
                    {user.role.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2 text-left mb-5">
              {[
                { step: '1', text: 'Open Camera app on your iPhone' },
                { step: '2', text: 'Point at QR code — tap the notification' },
                { step: '3', text: 'In Safari, tap Share → Add to Home Screen' },
                { step: '4', text: 'Open WindowWorld from your home screen' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-600/30 border border-brand-600/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-brand-400">{step}</span>
                  </div>
                  <p className="text-xs text-slate-400">{text}</p>
                </div>
              ))}
            </div>

            {/* Direct link button */}
            <a
              href={qrUrl || 'https://windowworld.bridgebox.ai/field-install'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Open Field App Directly
            </a>

            <p className="text-[10px] text-slate-600 mt-3">
              QR code contains your active session token and is valid until your access token expires.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
