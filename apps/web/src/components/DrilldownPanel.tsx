import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// ─── Types ─────────────────────────────────────────────────────
export interface DrilldownLayer {
  title: string;
  subtitle?: string;
  content: ReactNode;
}

interface DrilldownCtx {
  push: (layer: DrilldownLayer) => void;
  pop: () => void;
  close: () => void;
  replace: (layer: DrilldownLayer) => void;
}

// ─── Context ───────────────────────────────────────────────────
const Ctx = createContext<DrilldownCtx>({
  push: () => {}, pop: () => {}, close: () => {}, replace: () => {},
});

export function useDrilldown() { return useContext(Ctx); }

// ─── Provider + Panel ─────────────────────────────────────────
export function DrilldownProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DrilldownLayer[]>([]);

  const push    = useCallback((l: DrilldownLayer) => setStack(s => [...s, l]), []);
  const pop     = useCallback(() => setStack(s => s.slice(0, -1)), []);
  const close   = useCallback(() => setStack([]), []);
  const replace = useCallback((l: DrilldownLayer) => setStack(s => [...s.slice(0, -1), l]), []);

  const isOpen  = stack.length > 0;
  const current = stack[stack.length - 1];

  return (
    <Ctx.Provider value={{ push, pop, close, replace }}>
      {children}

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-slate-900 border-l border-slate-700/60 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 flex-shrink-0">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                {stack.map((layer, i) => (
                  <span key={i} className="flex items-center gap-1 min-w-0">
                    {i > 0 && <ChevronRightIcon className="h-3 w-3 text-slate-600 flex-shrink-0" />}
                    <button
                      onClick={() => setStack(s => s.slice(0, i + 1))}
                      className={`text-xs font-medium truncate transition-colors ${
                        i === stack.length - 1
                          ? 'text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {layer.title}
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {stack.length > 1 && (
                  <button onClick={pop}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                )}
                <button onClick={close}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sub-header */}
            {current?.subtitle && (
              <div className="px-5 py-2 bg-slate-800/40 border-b border-slate-800/60">
                <p className="text-xs text-slate-500">{current.subtitle}</p>
              </div>
            )}

            {/* Content — animated per layer */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stack.length}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.15 }}
                  className="p-5 space-y-4"
                >
                  {current?.content}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

// ─── Reusable drilldown row ────────────────────────────────────
export function DrillRow({
  label, value, sub, color = 'text-white', onClick, badge,
}: {
  label: string; value?: string | number; sub?: string;
  color?: string; onClick?: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-600/50 transition-all group text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          {label}
          {badge && <span className="px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 text-[10px] font-semibold">{badge}</span>}
        </div>
        {sub && <div className="text-[11px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-sm font-bold ${color}`}>{value}</span>
        {onClick && <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />}
      </div>
    </button>
  );
}

// ─── Section header ────────────────────────────────────────────
export function DrillSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─── Clickable stat card ───────────────────────────────────────
export function DrillCard({
  label, value, sub, icon: Icon, color, onClick,
}: {
  label: string; value: string; sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string; onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left card p-5 bg-gradient-to-br ${color ?? 'from-slate-800 to-slate-900'} cursor-pointer group relative overflow-hidden`}
    >
      {onClick && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRightIcon className="h-4 w-4 text-slate-400" />
        </div>
      )}
      {Icon && <div className="mb-3"><Icon className="h-5 w-5 text-slate-400" /></div>}
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      {sub && <div className="text-[11px] text-slate-600 mt-0.5">{sub}</div>}
      {onClick && <div className="text-[10px] text-brand-400/60 mt-2 font-medium">Click to drill down →</div>}
    </motion.button>
  );
}
