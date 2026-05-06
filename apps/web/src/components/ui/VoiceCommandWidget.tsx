import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicrophoneIcon, XMarkIcon, StopIcon } from '@heroicons/react/24/solid';
import { 
  CalendarDaysIcon, PencilSquareIcon, UserPlusIcon, MapPinIcon,
  PhoneArrowUpRightIcon, ClockIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { haptic } from '../../utils/haptics';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────

interface VoiceResult {
  success: boolean;
  intent: string;
  spokenResponse: string;
  parsedData: Record<string, any>;
  createdId?: string;
  navigateTo?: string;
}

type VoicePhase = 'idle' | 'listening' | 'processing' | 'result';

// Intent icon mapping
const INTENT_ICONS: Record<string, React.ElementType> = {
  create_appointment: CalendarDaysIcon,
  create_note: PencilSquareIcon,
  create_lead: UserPlusIcon,
  create_calendar_event: CalendarDaysIcon,
  search_lead: MagnifyingGlassIcon,
  get_schedule: ClockIcon,
  get_directions: MapPinIcon,
  log_activity: PhoneArrowUpRightIcon,
  add_follow_up: ClockIcon,
  update_lead_status: UserPlusIcon,
};

// ─── Main Component ───────────────────────────────────────────

export function VoiceCommandWidget() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // ─── Speech Recognition ─────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition is not supported in this browser. Use Chrome or Safari.');
      return;
    }

    haptic.impact();
    setPhase('listening');
    setTranscript('');
    setInterimText('');
    setResult(null);
    setError(null);

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + ' ';
        } else {
          interim = text;
        }
      }
      setTranscript(finalTranscript.trim());
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Silent — just stop
        setPhase('idle');
        return;
      }
      setError(event.error === 'not-allowed' ? 'Microphone access denied. Enable it in your browser settings.' : `Error: ${event.error}`);
      setPhase('idle');
    };

    recognition.onend = () => {
      // If we have a transcript, auto-process it
      if (finalTranscript.trim().length > 2) {
        setTranscript(finalTranscript.trim());
        processCommand(finalTranscript.trim());
      } else {
        setPhase('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    haptic.tap();
    recognitionRef.current?.stop();
    // onend handler will fire and process
  }, []);

  // ─── Process Command ────────────────────────────────────
  const processCommand = async (text: string) => {
    setPhase('processing');

    try {
      const res = await apiClient.post('/ai-analysis/voice-command', { transcript: text });
      const data = res.data?.data as VoiceResult;

      if (data) {
        setResult(data);
        setPhase('result');
        haptic.success();

        // Speak the response
        speakResponse(data.spokenResponse);

        // Auto-navigate after a delay if applicable
        if (data.navigateTo && data.success) {
          setTimeout(() => {
            if (data.navigateTo!.startsWith('http')) {
              window.open(data.navigateTo!, '_blank');
            } else {
              navigate(data.navigateTo!);
            }
          }, 2500);
        }
      } else {
        throw new Error('Invalid response');
      }
    } catch (err: any) {
      console.error('[VoiceCommand]', err);
      setError("Couldn't process your command. Please try again.");
      setPhase('idle');
      haptic.error();
    }
  };

  // ─── Text-to-Speech ─────────────────────────────────────
  const speakResponse = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    
    // Prefer a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => 
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Google') || v.name.includes('Natural')
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // ─── Cleanup ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ─── Quick Open with keyboard shortcut ──────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + S to toggle voice
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (isOpen && phase === 'listening') {
          stopListening();
        } else if (!isOpen) {
          setIsOpen(true);
          setTimeout(() => startListening(), 300);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, phase, startListening, stopListening]);

  const handleOpen = () => {
    haptic.impact();
    setIsOpen(true);
    setPhase('idle');
    setTranscript('');
    setInterimText('');
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    haptic.tap();
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setIsOpen(false);
    setPhase('idle');
  };

  const ResultIcon = result?.intent ? (INTENT_ICONS[result.intent] || MicrophoneIcon) : MicrophoneIcon;

  // ─── Example Commands ───────────────────────────────────
  const EXAMPLES = [
    'Schedule an appointment with John Smith tomorrow at 2 PM',
    'Add a note to Sarah Johnson: interested in siding',
    'Create a new lead: Mike Brown, 555-0123, Prairieville',
    'What\'s my schedule for today?',
    'Log a call with the Williams family',
    'Get directions to the next appointment',
  ];

  return (
    <>
      {/* ─── Siri-style floating mic button ─── */}
      <button
        onClick={handleOpen}
        className={clsx(
          "fixed bottom-6 left-6 z-[998] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all focus:outline-none",
          "bg-gradient-to-br from-violet-600 to-indigo-700 text-white",
          "hover:scale-110 hover:shadow-violet-500/40 active:scale-95",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        aria-label="Voice Command"
      >
        <MicrophoneIcon className="w-7 h-7" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" style={{ animationDuration: '3s' }} />
      </button>

      {/* ─── Voice Command Modal ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-t-3xl sm:rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* ─── Header ─── */}
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                    WindowWorld Voice
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* ─── Main Content Area ─── */}
              <div className="px-6 py-6 min-h-[280px] flex flex-col items-center justify-center">

                {/* Idle state — show the mic button and examples */}
                {phase === 'idle' && !error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center w-full"
                  >
                    <button
                      onClick={startListening}
                      className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-2xl shadow-violet-500/30 flex items-center justify-center mx-auto mb-6 hover:scale-105 active:scale-95 transition-transform focus:outline-none"
                    >
                      <MicrophoneIcon className="w-10 h-10" />
                    </button>
                    <p className="text-white font-semibold text-lg mb-1">Tap to speak</p>
                    <p className="text-slate-500 text-sm mb-6">
                      Say a command like "Hey WindowWorld..."
                    </p>
                    
                    {/* Example commands */}
                    <div className="space-y-2 text-left">
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Try saying:</p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setTranscript(ex);
                              processCommand(ex);
                            }}
                            className="w-full text-left flex items-start gap-2 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/30 transition-colors group"
                          >
                            <MicrophoneIcon className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0 group-hover:text-violet-400" />
                            <span className="text-xs text-slate-400 leading-snug group-hover:text-slate-300">"{ex}"</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Listening state — animated waveform */}
                {phase === 'listening' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center w-full"
                  >
                    {/* Waveform animation */}
                    <div className="relative w-28 h-28 mx-auto mb-6">
                      {/* Outer pulse rings */}
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-violet-500/20"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                        className="absolute inset-0 rounded-full bg-indigo-500/20"
                      />
                      {/* Center button */}
                      <button
                        onClick={stopListening}
                        className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-violet-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                      >
                        <StopIcon className="w-8 h-8" />
                      </button>
                    </div>

                    <p className="text-violet-400 font-semibold text-sm animate-pulse mb-2">Listening...</p>
                    
                    {/* Live transcript */}
                    <div className="min-h-[48px] px-4">
                      {transcript && (
                        <p className="text-white text-sm leading-relaxed">{transcript}</p>
                      )}
                      {interimText && (
                        <p className="text-slate-500 text-sm italic">{interimText}</p>
                      )}
                      {!transcript && !interimText && (
                        <p className="text-slate-600 text-sm">Speak your command...</p>
                      )}
                    </div>

                    {/* Waveform bars */}
                    <div className="flex items-center justify-center gap-1 mt-4">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: [4, 12 + Math.random() * 20, 4],
                          }}
                          transition={{
                            duration: 0.5 + Math.random() * 0.5,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            delay: i * 0.05,
                          }}
                          className="w-1 rounded-full bg-gradient-to-t from-violet-600 to-indigo-400"
                          style={{ minHeight: 4 }}
                        />
                      ))}
                    </div>

                    <button
                      onClick={stopListening}
                      className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                    >
                      Tap to stop & process
                    </button>
                  </motion.div>
                )}

                {/* Processing state */}
                {phase === 'processing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 mx-auto mb-6 relative">
                      <div className="w-full h-full rounded-full border-2 border-violet-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
                      <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" style={{ animationDuration: '0.7s', animationDirection: 'reverse' }} />
                    </div>
                    <p className="text-white font-semibold mb-1">Processing...</p>
                    <p className="text-sm text-slate-500">"{transcript}"</p>
                  </motion.div>
                )}

                {/* Result state */}
                {phase === 'result' && result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center w-full"
                  >
                    {/* Status icon */}
                    <div className={clsx(
                      "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                      result.success
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    )}>
                      <ResultIcon className="w-8 h-8" />
                    </div>

                    {/* Intent badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-semibold uppercase tracking-wider mb-3">
                      <div className={clsx("w-1.5 h-1.5 rounded-full", result.success ? "bg-emerald-400" : "bg-amber-400")} />
                      {result.intent.replace(/_/g, ' ')}
                    </div>

                    {/* Spoken response */}
                    <p className="text-white text-sm leading-relaxed mb-4 px-2">
                      {result.spokenResponse}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          setPhase('idle');
                          setResult(null);
                          setTranscript('');
                        }}
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 active:scale-[0.98] transition-all"
                      >
                        New Command
                      </button>
                      {result.navigateTo && result.success && (
                        <button
                          onClick={() => {
                            if (result.navigateTo!.startsWith('http')) {
                              window.open(result.navigateTo!, '_blank');
                            } else {
                              navigate(result.navigateTo!);
                            }
                            handleClose();
                          }}
                          className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 active:scale-[0.98] transition-all"
                        >
                          Go to →
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Error state */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-400 mx-auto mb-4 flex items-center justify-center">
                      <XMarkIcon className="w-8 h-8" />
                    </div>
                    <p className="text-red-400 text-sm font-medium mb-2">{error}</p>
                    <button
                      onClick={() => { setError(null); setPhase('idle'); }}
                      className="text-xs text-slate-500 hover:text-slate-400"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}
              </div>

              {/* ─── Footer / Shortcut hint ─── */}
              <div className="px-6 pb-4 flex items-center justify-center gap-2">
                <kbd className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  ⌘⇧S
                </kbd>
                <span className="text-[10px] text-slate-600">Quick voice command</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
