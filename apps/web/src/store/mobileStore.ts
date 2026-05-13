import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────
export interface FieldExtraction {
  id?: string;
  sourceType: 'recording' | 'note' | 'manual';
  sourceText?: string;
  targetTable: string;
  targetField: string;
  originalValue: string;
  normalizedValue: string;
  confidenceScore: number;
  requiresReview: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'conflict';
  openingNumber?: number;
  pricingImpact?: boolean;
  pricingImpactNote?: string;
}

export interface MobileRecording {
  id: string;
  localId: string;
  status: 'recording' | 'saved' | 'transcribing' | 'extracting_fields' | 'needs_review' | 'applied_to_form' | 'failed';
  transcript?: string;
  extractions: FieldExtraction[];
  createdAt: number;
  durationSeconds?: number;
  appointmentId?: string;
  openingId?: string;
  synced: boolean;
}

export interface MobileNote {
  id?: string;
  localId: string;
  noteText: string;
  extractions: FieldExtraction[];
  status: 'pending' | 'extracting' | 'needs_review' | 'applied' | 'saved_as_note';
  createdAt: number;
  appointmentId?: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
}

interface MobileState {
  // Active context
  activeAppointmentId: string | null;
  setActiveAppointment: (id: string | null) => void;

  // Recordings
  recordings: MobileRecording[];
  addRecording: (rec: Omit<MobileRecording, 'id'>) => string;
  updateRecording: (localId: string, updates: Partial<MobileRecording>) => void;
  setExtractions: (localId: string, extractions: FieldExtraction[]) => void;
  approveExtraction: (localId: string, idx: number) => void;
  rejectExtraction: (localId: string, idx: number) => void;
  editExtraction: (localId: string, idx: number, value: string) => void;

  // Text Notes
  notes: MobileNote[];
  addNote: (note: Omit<MobileNote, 'id'>) => string;
  updateNote: (localId: string, updates: Partial<MobileNote>) => void;

  // Sync Queue
  syncQueue: SyncQueueItem[];
  enqueue: (item: Omit<SyncQueueItem, 'id' | 'status' | 'createdAt'>) => void;
  markSynced: (id: string) => void;
  markFailed: (id: string) => void;
  pendingCount: () => number;

  // Offline Drafts
  drafts: Record<string, any>;
  saveDraft: (key: string, data: any) => void;
  getDraft: (key: string) => any;
  clearDraft: (key: string) => void;

  // Network status
  isOnline: boolean;
  setOnline: (v: boolean) => void;
  lastSyncAt: number | null;
  setLastSync: () => void;
}

export const useMobileStore = create<MobileState>()(
  persist(
    (set, get) => ({
      activeAppointmentId: null,
      setActiveAppointment: (id) => set({ activeAppointmentId: id }),

      // ── Recordings ──────────────────────────────────
      recordings: [],
      addRecording: (rec) => {
        const localId = `rec_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const newRec: MobileRecording = { ...rec, id: localId, localId };
        set(s => ({ recordings: [newRec, ...s.recordings] }));
        return localId;
      },
      updateRecording: (localId, updates) => {
        set(s => ({
          recordings: s.recordings.map(r => r.localId === localId ? { ...r, ...updates } : r)
        }));
      },
      setExtractions: (localId, extractions) => {
        set(s => ({
          recordings: s.recordings.map(r => r.localId === localId ? { ...r, extractions, status: 'needs_review' } : r)
        }));
      },
      approveExtraction: (localId, idx) => {
        set(s => ({
          recordings: s.recordings.map(r => {
            if (r.localId !== localId) return r;
            const exts = [...r.extractions];
            exts[idx] = { ...exts[idx], status: 'approved' };
            return { ...r, extractions: exts };
          })
        }));
      },
      rejectExtraction: (localId, idx) => {
        set(s => ({
          recordings: s.recordings.map(r => {
            if (r.localId !== localId) return r;
            const exts = [...r.extractions];
            exts[idx] = { ...exts[idx], status: 'rejected' };
            return { ...r, extractions: exts };
          })
        }));
      },
      editExtraction: (localId, idx, value) => {
        set(s => ({
          recordings: s.recordings.map(r => {
            if (r.localId !== localId) return r;
            const exts = [...r.extractions];
            exts[idx] = { ...exts[idx], normalizedValue: value, status: 'approved' };
            return { ...r, extractions: exts };
          })
        }));
      },

      // ── Notes ────────────────────────────────────────
      notes: [],
      addNote: (note) => {
        const localId = `note_${Date.now()}`;
        set(s => ({ notes: [{ ...note, localId }, ...s.notes] }));
        return localId;
      },
      updateNote: (localId, updates) => {
        set(s => ({
          notes: s.notes.map(n => n.localId === localId ? { ...n, ...updates } : n)
        }));
      },

      // ── Sync Queue ───────────────────────────────────
      syncQueue: [],
      enqueue: (item) => {
        const id = `sq_${Date.now()}`;
        set(s => ({ syncQueue: [...s.syncQueue, { ...item, id, status: 'pending', createdAt: Date.now() }] }));
      },
      markSynced: (id) => {
        set(s => ({ syncQueue: s.syncQueue.map(i => i.id === id ? { ...i, status: 'synced' } : i) }));
      },
      markFailed: (id) => {
        set(s => ({ syncQueue: s.syncQueue.map(i => i.id === id ? { ...i, status: 'failed' } : i) }));
      },
      pendingCount: () => get().syncQueue.filter(i => i.status === 'pending').length,

      // ── Drafts ───────────────────────────────────────
      drafts: {},
      saveDraft: (key, data) => set(s => ({ drafts: { ...s.drafts, [key]: { ...data, _savedAt: Date.now() } } })),
      getDraft: (key) => get().drafts[key],
      clearDraft: (key) => {
        const d = { ...get().drafts };
        delete d[key];
        set({ drafts: d });
      },

      // ── Network ──────────────────────────────────────
      isOnline: navigator.onLine,
      setOnline: (v) => set({ isOnline: v }),
      lastSyncAt: null,
      setLastSync: () => set({ lastSyncAt: Date.now() }),
    }),
    { name: 'wwa-mobile' }
  )
);
