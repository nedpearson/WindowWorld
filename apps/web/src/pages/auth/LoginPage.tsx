import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, BoltIcon } from '@heroicons/react/24/outline';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await api.auth.login(data.email, data.password) as any;
      setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
      setUser(result.data.user);
      navigate('/dashboard');
      toast.success(`Welcome back, ${result.data.user.firstName}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    try {
      const result = await api.auth.google(credentialResponse.credential) as any;
      setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
      setUser(result.data.user);
      navigate('/dashboard');
      toast.success(`Welcome back, ${result.data.user.firstName}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Dev/Demo bypass — no backend required ──────────────────────
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
      {/* Left column */}
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

          <div className="mb-6 flex justify-center">
             <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  toast.error('Google Sign-In failed');
                }}
                theme="outline"
                size="large"
                width="100%"
                text="continue_with"
                shape="rectangular"
              />
          </div>
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-950 text-slate-500">Or sign in with email</span>
            </div>
          </div>

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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full btn-lg mt-2 relative overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
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

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <BoltIcon className="h-4 w-4 text-brand-400" />
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide">Demo Credentials</span>
            </div>
            <div className="space-y-1.5">
              {[
                ['Super Admin', 'admin@windowworldla.com'],
                ['Sales Manager', 'manager@windowworldla.com'],
                ['Sales Rep', 'rep1@windowworldla.com'],
                ['Field Tech', 'tech@windowworldla.com'],
              ].map(([role, email]) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => {
                    onSubmit({ email, password: 'Demo@1234' });
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-700/60 transition-colors text-left group"
                >
                  <span className="text-xs text-slate-400 group-hover:text-slate-300">{role}</span>
                  <span className="text-xs text-slate-600 font-mono group-hover:text-slate-400">{email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-2">Password: Demo@1234</p>
          </div>
        </motion.div>
      </div>

      {/* Right column — visual panel */}
      <div className="hidden lg:flex w-2/5 bg-gradient-to-br from-brand-950 via-slate-900 to-slate-950 relative overflow-hidden flex-col items-center justify-center px-12">
        {/* Grid bg */}
        <div className="absolute inset-0 bg-grid-slate opacity-50" />

        {/* Glow */}
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

          {/* Stats */}
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
        </div>
      </div>
    </div>
  );
}
