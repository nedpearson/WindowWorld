import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import apiClient from '../../api/client';

export function SiloCommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrompt = async (promptText: string) => {
    setLoading(true);
    setResponse(null);
    try {
      const res: any = await apiClient.silo.getLiveAssist(promptText);
      setResponse(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      handlePrompt(input);
    }
  };

  const quickPrompts = [
    { label: "Price is too high", key: "price_high" },
    { label: "Need to think about it", key: "think_about_it" },
    { label: "Got another quote", key: "competitor_quote" },
    { label: "How does financing work?", key: "financing_ask" }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <SparklesIcon className="h-5 w-5 text-brand-400" />
              <input
                type="text"
                autoFocus
                placeholder="Ask Silo AI anything... (Try a quick prompt below)"
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              {!response && !loading && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Live Assist Quick Prompts</div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickPrompts.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => handlePrompt(p.key)}
                        className="text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-sm text-slate-300 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center p-8 space-x-2">
                  <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              )}

              {response && (
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="h-4 w-4 text-brand-400" />
                    <span className="text-sm font-semibold text-brand-400">Silo AI Tactic: {response.tactic}</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">"{response.script}"</p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">esc</span> to close
              </div>
              <div className="flex items-center gap-1.5">
                <SparklesIcon className="h-3 w-3" /> Powered by Silo AI
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
