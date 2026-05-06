import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, XMarkIcon, PaperAirplaneIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

export function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{role: 'user' | 'ai', content: string}>>([
    { role: 'ai', content: "Hi! I'm your WindowWorld Copilot. I can help you analyze leads, draft emails, check inventory, or navigate the CRM. What can I do for you?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore(s => s.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Gather some context about where the user is
      const context = {
        currentPath: window.location.pathname,
        userRole: user?.role,
        userName: `${user?.firstName} ${user?.lastName}`,
      };

      const res = await apiClient.post('/ai-analysis/copilot', { message: userMessage, context });
      if (res.data?.data?.text) {
        setMessages(prev => [...prev, { role: 'ai', content: res.data.data.text }]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I ran into an error connecting to my brain. Please check your API keys and try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          "fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/30 flex items-center justify-center hover:scale-105 hover:bg-brand-400 transition-all focus:outline-none",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
      >
        <SparklesIcon className="w-7 h-7" />
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[1000] w-[380px] h-[600px] max-h-[85vh] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur-md border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <CommandLineIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Copilot AI</h3>
                  <p className="text-xs text-brand-400">Powered by Claude</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors focus:outline-none"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
              {messages.map((msg, i) => (
                <div key={i} className={clsx(
                  "flex max-w-[85%]",
                  msg.role === 'user' ? "ml-auto justify-end" : "mr-auto justify-start"
                )}>
                  <div className={clsx(
                    "p-3 rounded-2xl text-sm leading-relaxed prose prose-invert prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 max-w-full",
                    msg.role === 'user' 
                      ? "bg-brand-600 text-white rounded-br-none" 
                      : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none"
                  )}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex mr-auto max-w-[85%]">
                  <div className="p-4 rounded-2xl bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-slate-800 border-t border-slate-700">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Copilot..."
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
