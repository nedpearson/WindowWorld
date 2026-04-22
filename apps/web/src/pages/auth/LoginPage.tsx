import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  EyeIcon,
  EyeSlashIcon,
  BoltIcon,
  FingerPrintIcon,
} from '@heroicons/react/24/outline';
import { useGoogleLogin } from '@react-oauth/google';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// ── WebAuthn / Face ID helpers ─────────────────────────────────────────────
const WEBAUTHN_KEY = 'ww_webauthn_cred';

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function registerBiometric(userId: string, email: string): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'WindowWorld', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!cred) return false;
    const stored = {
      id: bufferToBase64(cred.rawId),
      type: cred.type,
    };
    localStorage.setItem(WEBAUTHN_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

async function authenticateBiometric(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  const raw = localStorage.getItem(WEBAUTHN_KEY);
  if (!raw) return false;
  try {
    const stored = JSON.parse(raw);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        allowCredentials: [
          { type: 'public-key', id: base64ToBuffer(stored.id) },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rememberMe: true },
  });

  // Check if biometric credential exists on mount
  useEffect(() => {
    const hasCred = !!localStorage.getItem(WEBAUTHN_KEY);
    const supported = !!window.PublicKeyCredential;
    setHasBiometric(hasCred && supported);
  }, []);

  const handleLoginSuccess = (result: any, rememberMe = true) => {
    const { tokens, user } = result.data;
    setTokens(tokens.accessToken, tokens.refreshToken);
    setUser(user);

    // If "Remember Me" unchecked, clear persisted token on tab close
    if (!rememberMe) {
      sessionStorage.setItem('ww-session-only', '1');
    } else {
      sessionStorage.removeItem('ww-session-only');
    }

    navigate('/dashboard');
    toast.success(`Welcome back, ${user.firstName}! 👋`);
  };

  // ── Email / Password ────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await api.auth.login(data.email, data.password) as any;
      handleLoginSuccess(result, data.rememberMe);

      // Offer biometric enrolment after first email login if not yet registered
      if (!localStorage.getItem(WEBAUTHN_KEY) && window.PublicKeyCredential) {
        setTimeout(async () => {
          const enrolled = await registerBiometric(result.data.user.id, data.email);
          if (enrolled) {
            toast.success('Face ID / Fingerprint enabled for future logins!', { duration: 4000 });
            setHasBiometric(true);
          }
        }, 1200);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Face ID / Biometric ─────────────────────────────────────────────────
  const handleBiometric = async () => {
    setLoading(true);
    try {
      const ok = await authenticateBiometric();
      if (!ok) {
        toast.error('Biometric authentication failed. Please use email/password.');
        return;
      }
      // Biometric verified — use stored refresh token to silently re-authenticate
      const stored = useAuthStore.getState();
      if (stored.refreshToken) {
        const result = await (api.auth as any).refresh(stored.refreshToken) as any;
        if (result?.data?.accessToken) {
          setTokens(result.data.accessToken, stored.refreshToken);
          navigate('/dashboard');
          toast.success('Authenticated with Face ID ✓');
          return;
        }
      }
      toast.error('Session expired — please sign in with your password first.');
    } catch {
      toast.error('Biometric authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth (popup/implicit flow) ─────────────────────────────────
  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse: any) => {
      setGoogleLoading(true);
      try {
        const result = await api.auth.google(tokenResponse.access_token) as any;
        handleLoginSuccess(result, true);
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message || 'Google login failed';
        if (msg.includes('not configured')) {
          toast.error('Google Sign-In not configured. Use email login.');
        } else if (msg.includes('deactivated')) {
          toast.error('Your account is deactivated. Contact your administrator.');
        } else if (msg.includes('not found') || msg.includes('Invalid')) {
          toast.error('Google account not registered. Ask your admin to invite you, or use email login.');
        } else {
          toast.error(msg);
        }
        console.error('[Google Login]', msg);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (err) => {
      setGoogleLoading(false);
      if ((err as any)?.error === 'popup_closed_by_user') return; // silent
      console.error('[Google OAuth Error]', err);
      toast.error('Google Sign-In was cancelled or failed.');
    },
  });

  // ── Demo bypass ─────────────────────────────────────────────────────────
  const enterPreviewMode = () => {
    setTokens('preview-token', 'preview-refresh');
    setUser({
      id: 'preview',
      email: 'admin@windowworldla.com',
      firstName: 'Jake',
      lastName: 'Thibodaux',
      role: 'SALES_MANAGER',
      organizationId: 'org-1',
      isActive: true,
    } as any);
    navigate('/dashboard');
    toast.success('Preview mode — demo data only');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden">
      {/* ── Left column ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-glow">
              <span className="text-white font-black text-lg">WW</span>
            </div>
            <div>
              <div className="text-lg font-bold text-white">WindowWorld</div>
              <div className="text-xs text-slate-500">AI Sales Platform · Louisiana</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-8">Sign in to your sales operating system</p>

          {/* ── Google button ── */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => { setGoogleLoading(true); googleLogin(); }}
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/60 text-white text-sm font-medium transition-all duration-200 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? 'Signing in with Google…' : 'Continue with Google'}
            </button>
          </div>

          {/* ── Face ID button (shown only if enrolled) ── */}
          {hasBiometric && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleBiometric}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-brand-700/50 bg-brand-900/20 hover:bg-brand-800/30 text-brand-300 text-sm font-medium transition-all duration-200 hover:border-brand-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FingerPrintIcon className="h-5 w-5" />
                Sign in with Face ID / Touch ID
              </button>
            </div>
          )}

          {/* ── Divider ── */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-950 text-slate-500">Or sign in with email</span>
            </div>
          </div>

          {/* ── Email / Password form ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@windowworldla.com"
                className={`input ${errors.email ? 'input-error' : ''}`}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* ── Remember Me ── */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                {...register('rememberMe')}
                id="rememberMe"
                type="checkbox"
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-400 cursor-pointer select-none">
                Remember me on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary w-full btn-lg mt-2 relative overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>

            <button
              type="button"
              id="preview-mode-btn"
              onClick={enterPreviewMode}
              className="btn-secondary w-full mt-2"
            >
              ⚡ Preview Demo (No Backend)
            </button>
          </form>

          {/* ── Demo credentials ── */}
          <div className="mt-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <BoltIcon className="h-4 w-4 text-brand-400" />
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide">Demo Credentials</span>
            </div>
            <div className="space-y-1.5">
              {[
                ['Super Admin (Owner)', 'nedpearson@gmail.com', '1Pearson2'],
                ['Super Admin', 'admin@windowworldla.com', 'Demo@1234'],
                ['Sales Manager', 'manager@windowworldla.com', 'Demo@1234'],
                ['Sales Rep', 'rep1@windowworldla.com', 'Demo@1234'],
                ['Field Tech', 'tech@windowworldla.com', 'Demo@1234'],
              ].map(([role, email, pw]) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => onSubmit({ email, password: pw, rememberMe: true })}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-700/60 transition-colors text-left group"
                >
                  <span className="text-xs text-slate-400 group-hover:text-slate-300">{role}</span>
                  <span className="text-xs text-slate-600 font-mono group-hover:text-slate-400">{email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-2">Click any row to auto-fill and sign in</p>
          </div>
        </motion.div>
      </div>

      {/* ── Right column — visual panel ── */}
      <div className="hidden lg:flex w-2/5 bg-gradient-to-br from-brand-950 via-slate-900 to-slate-950 relative overflow-hidden flex-col items-center justify-center px-12">
        <div className="absolute inset-0 bg-grid-slate opacity-50" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-brand-600/20 rounded-full blur-[80px]" />

        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-600/15 border border-brand-600/25 text-brand-400 text-sm font-medium mb-6">
            <BoltIcon className="h-4 w-4" />
            AI-First Sales Platform
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">
            Close more windows.<br />
            <span className="text-gradient">Work smarter.</span>
          </h2>

          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Lead intelligence, AI window analysis, instant proposals, and field-ready mobile tools. Built for Louisiana.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { value: '47%', label: 'Faster proposals' },
              { value: '2.3×', label: 'Lead prioritization' },
              { value: '31%', label: 'Close rate lift' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Security badges */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <FingerPrintIcon className="h-3.5 w-3.5" />
              Face ID Ready
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              256-bit SSL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
