/**
 * useOfflineQueue — IndexedDB-backed offline action queue
 *
 * Stores actions when offline, replays them when reconnected.
 * Works with the BullMQ mobile-sync queue on the backend.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type QueuedActionType =
  | 'MEASUREMENT_SAVE'
  | 'PHOTO_UPLOAD'
  | 'NOTE_CREATE'
  | 'ACTIVITY_LOG'
  | 'LEAD_STATUS_UPDATE'
  | 'OPENING_CREATE'
  | 'INSPECTION_UPDATE'
  | 'APPOINTMENT_STATUS'
  | 'LEAD_CREATE';

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: Record<string, any>;
  createdAt: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'done';
  error?: string;
}

const DB_NAME = 'ww-offline-queue';
const STORE_NAME = 'actions';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllActions(): Promise<QueuedAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function putAction(action: QueuedAction): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(action);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteAction(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── API executor map ─────────────────────────────────────────
// Maps action types to fetch calls
async function executeAction(action: QueuedAction, token: string): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    // Key must match the key set in main.tsx: localStorage.setItem('ww_device_id', ...)
    'X-Device-Id': localStorage.getItem('ww_device_id') || 'unknown',
  };

  const base = '/api/v1';

  switch (action.type) {
    case 'MEASUREMENT_SAVE': {
      const res = await fetch(`${base}/measurements`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }
    case 'NOTE_CREATE': {
      const res = await fetch(`${base}/leads/${action.payload.leadId}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }
    case 'ACTIVITY_LOG': {
      const res = await fetch(`${base}/leads/${action.payload.leadId}/activities`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }
    case 'LEAD_STATUS_UPDATE': {
      const res = await fetch(`${base}/leads/${action.payload.leadId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: action.payload.status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }
    case 'OPENING_CREATE': {
      // Correct endpoint: POST /openings with inspectionId in the body (not a nested route)
      const res = await fetch(`${base}/openings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }
    case 'APPOINTMENT_STATUS': {
      const res = await fetch(`${base}/appointments/${action.payload.appointmentId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: action.payload.status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }
    case 'LEAD_CREATE': {
      const res = await fetch(`${base}/leads`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }
    case 'INSPECTION_UPDATE': {
      const res = await fetch(`${base}/inspections/${action.payload.inspectionId}/${action.payload.action}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }
    case 'PHOTO_UPLOAD': {
      // Photo uploads are handled via XHR with file data stored separately
      // Skip if no file data available offline
      console.warn('[OfflineQueue] Photo upload replay not supported for large blobs — skipping', action.id);
      break;
    }
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// ─── Hook ─────────────────────────────────────────────────────
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  // isOnline must be stateful — navigator.onLine is a snapshot and won't trigger re-renders
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const syncInProgress = useRef(false);

  // Load queue from IndexedDB on mount
  useEffect(() => {
    getAllActions().then((actions) => {
      setQueue(actions.filter((a) => a.status !== 'done'));
    });
  }, []);

  // Listen for online/offline events and update state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Back online — syncing queued actions…');
      syncNow();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline — actions will be queued and synced when reconnected');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const enqueue = useCallback(async (type: QueuedActionType, payload: Record<string, any>) => {
    const action: QueuedAction = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      createdAt: Date.now(),
      retries: 0,
      status: 'pending',
    };
    await putAction(action);
    setQueue((prev) => [...prev, action]);

    if (navigator.onLine) {
      // Try immediate sync if online
      await syncSingle(action);
    }

    return action.id;
  }, []);

  const syncSingle = async (action: QueuedAction) => {
    const token = (() => {
      try {
        const state = JSON.parse(localStorage.getItem('ww-auth') || '{}');
        return state?.state?.accessToken || '';
      } catch { return ''; }
    })();

    if (!token) return;

    try {
      await putAction({ ...action, status: 'syncing' });
      await executeAction(action, token);
      await deleteAction(action.id);
      setQueue((prev) => prev.filter((a) => a.id !== action.id));
    } catch (err: any) {
      const updated = { ...action, retries: action.retries + 1, status: 'failed' as const, error: err.message };
      await putAction(updated);
      setQueue((prev) => prev.map((a) => a.id === action.id ? updated : a));
    }
  };

  const syncNow = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    const token = (() => {
      try {
        const state = JSON.parse(localStorage.getItem('ww-auth') || '{}');
        return state?.state?.accessToken || '';
      } catch { return ''; }
    })();

    if (!token) {
      setIsSyncing(false);
      syncInProgress.current = false;
      return;
    }

    const pending = await getAllActions();
    const toSync = pending.filter((a) => a.status === 'pending' || (a.status === 'failed' && a.retries < 3));
    let succeeded = 0;
    let failed = 0;

    for (const action of toSync) {
      try {
        await putAction({ ...action, status: 'syncing' });
        await executeAction(action, token);
        await deleteAction(action.id);
        succeeded++;
      } catch (err: any) {
        const updated = { ...action, retries: action.retries + 1, status: 'failed' as const, error: err.message };
        await putAction(updated);
        failed++;
      }
    }

    const updated = await getAllActions();
    setQueue(updated.filter((a) => a.status !== 'done'));
    setIsSyncing(false);
    syncInProgress.current = false;

    if (succeeded > 0) toast.success(`Synced ${succeeded} queued action${succeeded > 1 ? 's' : ''}`);
    if (failed > 0) toast.error(`${failed} action${failed > 1 ? 's' : ''} failed to sync`);

    // Force PWA update check when user manually syncs
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.update();
      } catch (err) {
        console.warn('[OfflineQueue] Failed to check for app updates:', err);
      }
    }
  }, []);

  const clearFailed = useCallback(async () => {
    const all = await getAllActions();
    await Promise.all(all.filter((a) => a.status === 'failed').map((a) => deleteAction(a.id)));
    setQueue((prev) => prev.filter((a) => a.status !== 'failed'));
  }, []);

  const pendingCount = queue.filter((a) => a.status === 'pending').length;
  const failedCount = queue.filter((a) => a.status === 'failed').length;

  return {
    queue,
    pendingCount,
    failedCount,
    totalQueued: queue.length,
    isSyncing,
    isOnline,
    enqueue,
    syncNow,
    clearFailed,
  };
}
