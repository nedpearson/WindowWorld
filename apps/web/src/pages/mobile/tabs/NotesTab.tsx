import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MicrophoneIcon, CloudArrowUpIcon, CheckCircleIcon,
  ClockIcon, PencilIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import apiClient from '../../../api/client';
import { useVoiceNote } from '../../../hooks/useVoiceNote';
import { haptic } from '../../../utils/haptics';
import { toast } from 'sonner';

// ─── Quick note templates ─────────────────────────────────────
const TEMPLATES = [
  'Both homeowners present — full decision-maker access',
  'Only one homeowner — follow up with spouse',
  'Price objection — financing discussed',
  'Competitor quote mentioned — need comparison',
  'Homeowner requested callback in ___ days',
  'Dogs on property — gate code: ___',
  'Confirmed X windows — Series ___',
  'No-show — left door hanger, called voicemail',
];

// ─── Activity type styles ─────────────────────────────────────
const ACTIVITY_TYPES = [
  { key: 'NOTE', label: '📝 Note', color: 'bg-slate-700 text-slate-300' },
  { key: 'CALL', label: '📞 Call', color: 'bg-blue-500/15 text-blue-400' },
  { key: 'DOOR_KNOCK', label: '🚪 Door Knock', color: 'bg-amber-500/15 text-amber-400' },
  { key: 'MEETING', label: '🤝 Meeting', color: 'bg-emerald-500/15 text-emerald-400' },
];

interface Stop {
  id: string; lead: { id: string; name: string };
}

interface NotesTabProps {
  stops: Stop[];
  activeStopId: string | null;
}

export function NotesTab({ stops, activeStopId }: NotesTabProps) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState('NOTE');
  const [isSaving, setIsSaving] = useState(false);

  const activeStop = stops.find(s => s.id === activeStopId) ?? stops[0] ?? null;
  const leadId = activeStop?.lead.id ?? null;

  // Load existing notes from server
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['lead-notes', leadId],
    queryFn: () => apiClient.leads.getNotes(leadId!),
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000,
  });
  const existingNotes: any[] = (notesData as any)?.data ?? [];

  // Voice note hook
  const {
    isListening, isSupported: voiceSupported,
    transcript, interimTranscript,
    start: startVoice, stop: stopVoice,
    error: voiceError, clear: clearVoice,
  } = useVoiceNote({ onResult: (text) => setNote(text) });

  useEffect(() => { if (transcript) setNote(transcript); }, [transcript]);

  // Save note mutation
  const saveNote = useMutation({
    mutationFn: async ({ text, type }: { text: string; type: string }) => {
      if (!leadId) throw new Error('No active lead');
      return apiClient.leads.logActivity(leadId, {
        type,
        notes: text,
        source: 'MOBILE_FIELD_APP',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', leadId] });
      setNote('');
      clearVoice();
      haptic.success();
      toast.success('Note saved to lead');
    },
    onError: () => toast.error('Failed to save — check connection'),
  });

  const handleSave = async (via: 'voice' | 'text' = 'text') => {
    const text = note.trim();
    if (!text) return;
    haptic.impact();
    setIsSaving(true);
    try {
      await saveNote.mutateAsync({ text, type: activityType });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Lead selector breadcrumb */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30">
        <PencilIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
        {activeStop ? (
          <>
            <span className="text-xs text-slate-400">Saving to:</span>
            <span className="text-xs font-semibold text-white">{activeStop.lead.name}</span>
          </>
        ) : (
          <span className="text-xs text-slate-500">Select a stop in Route tab to link notes</span>
        )}
      </div>

      {/* Activity type */}
      <div>
        <div className="text-[10px] text-slate-600 mb-2">Activity Type</div>
        <div className="flex gap-2 flex-wrap">
          {ACTIVITY_TYPES.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => { haptic.selection(); setActivityType(key); }}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                activityType === key
                  ? 'border-brand-500 bg-brand-500/20 text-white'
                  : `border-slate-700 ${color}`
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Voice input */}
      {voiceSupported && (
        <button
          onClick={() => {
            if (isListening) stopVoice();
            else { haptic.voice?.(true); startVoice(); }
          }}
          className={clsx(
            'w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed transition-all',
            isListening
              ? 'border-red-500/60 bg-red-500/10 text-red-400 animate-pulse'
              : 'border-slate-700 bg-slate-800/50 text-slate-400 active:bg-slate-800'
          )}
        >
          <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center',
            isListening ? 'bg-red-500/20' : 'bg-slate-700'
          )}>
            <MicrophoneIcon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">{isListening ? 'Listening…' : 'Voice Note'}</div>
            <div className="text-[11px] opacity-60">{isListening ? 'Tap to stop' : 'Tap to dictate'}</div>
          </div>
        </button>
      )}

      {/* Interim transcript */}
      {isListening && interimTranscript && (
        <div className="px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/30 text-sm text-slate-300 italic">
          "{interimTranscript}…"
        </div>
      )}

      {voiceError && <div className="text-xs text-red-400 px-1">{voiceError}</div>}

      {/* Text input */}
      <div className="relative">
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Type or dictate a field note, objection, or observation…"
          className="textarea min-h-[120px] pr-12"
          rows={4}
        />
        <button
          onClick={() => handleSave('text')}
          disabled={!note.trim() || isSaving || !leadId}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center disabled:opacity-40 active:bg-brand-700 transition-colors"
        >
          <CloudArrowUpIcon className="h-4 w-4" />
        </button>
      </div>

      {note.trim() && (
        <button onClick={() => handleSave(isListening ? 'voice' : 'text')}
          disabled={isSaving || !leadId}
          className="btn-primary w-full flex items-center justify-center gap-2">
          <CheckCircleIcon className="h-5 w-5" />
          {isSaving ? 'Saving…' : `Save ${activityType.replace('_', ' ')}`}
        </button>
      )}

      {!leadId && note.trim() && (
        <div className="text-xs text-amber-400 text-center">
          Select a stop in the Route tab to link this note to a lead
        </div>
      )}

      {/* Quick templates */}
      <div>
        <div className="text-[10px] text-slate-600 mb-2 uppercase tracking-wide">Quick Templates</div>
        <div className="grid grid-cols-1 gap-1.5">
          {TEMPLATES.map(template => (
            <button key={template}
              onClick={() => { haptic.tap(); setNote(template); }}
              className="text-left text-xs text-slate-400 px-3 py-2 rounded-lg bg-slate-800 active:bg-slate-700 transition-colors">
              {template}
            </button>
          ))}
        </div>
      </div>

      {/* Existing notes from server */}
      {leadId && (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <ClockIcon className="h-3 w-3" />
            {notesLoading ? 'Loading history…' : `${existingNotes.length} past activities`}
          </div>
          {notesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : (
            existingNotes.slice(0, 8).map((n: any) => (
              <div key={n.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/30">
                <p className="text-xs text-slate-300 leading-relaxed">{n.notes ?? n.content ?? '—'}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-600">
                    {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {n.type && (
                    <span className="text-[10px] text-brand-500">
                      {n.type.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
