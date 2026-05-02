/**
 * useOfflineQueue — IndexedDB-backed offline action queue
 *
 * Stores actions when offline, replays them when reconnected.
 * Works with the BullMQ mobile-sync queue on the backend.
 *
 * BUG FIXES applied:
 *  1. Added missing action types: EXPENSE_SAVE, PROPERTY_SCAN_SAVE, OPENING_UPDATE, MEASUREMENT_VERIFY
 *  2. Added missing executeAction cases for all 4 new types
 *  3. PHOTO_UPLOAD: attempts re-upload via base64 if data is present; skips gracefully if only blob URL
 *  4. syncNowRef pattern: online listener always calls the latest syncNow via ref
 *  5. Dead status after 5 retries; clearFailed clears both failed + dead; deadCount exposed
 * 11. DB_VERSION bumped to 2; onupgradeneeded handles both fresh install and v1→v2 upgrade
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type QueuedActionType =
  | 'MEASUREMENT_SAVE'
  | 'MEASUREMENT_VERIFY'
  | 'PHOTO_UPLOAD'
  | 'NOTE_CREATE'
  | 'ACTIVITY_LOG'
  | 'LEAD_STATUS_UPDATE'
  | 'OPENING_CREATE'
  | 'OPENING_UPDATE'
  | 'INSPECTION_UPDATE'
  | 'APPOINTMENT_STATUS'
  | 'LEAD_CREATE'
  | 'EXPENSE_SAVE'
  | 'PROPERTY_SCAN_SAVE';

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: Record<string, any>;
  createdAt: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'dead' | 'done';
  error?: string;
}

const DB_NAME = 'ww-offline-queue';
const STORE_NAME = 'actions';
const DB_VERSION = 2; // bumped: adds 'type' index

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const oldVersion = e.oldVersion;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Fresh install: create store + all indexes
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('type', 'type'); // new in v2
      } else if (oldVersion < 2) {
        // Upgrade from v1: add the type index if missing
        const tx = (e.target as IDBOpenDBRequest).transaction!;
        const store = tx.objectStore(STORE_NAME);
        if (!store.indexNames.contains('type')) {
          store.createIndex('type', 'type');
        }
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
// Maps action types to fetch calls.
// NOTE: uses direct fetch + localStorage token — axios client is not available here.
async function executeAction(action: QueuedAction, token: string): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Device-Id': localStorage.getItem('ww_device_id') || 'unknown',
  };

  const base = '/api/v1';

  switch (action.type) {
    case 'MEASUREMENT_SAVE': {
      // If no real openingId (UUID), this was a standalone tape entry — skip DB sync.
      // The measurement was already shown to the user in-session; no persistent opening to attach to.
      const oid = action.payload.openingId;
      const hasRealOpeningId = oid && oid.length > 20 && !oid.includes(' ');
      if (!hasRealOpeningId) {
        console.info('[OfflineQueue] MEASUREMENT_SAVE skipped — no real openingId (standalone tape entry)');
        return; // treated as success, will be deleted from queue
      }
      const res = await fetch(`${base}/measurements`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }

    case 'MEASUREMENT_VERIFY': {
      const { openingId, finalWidth, finalHeight } = action.payload;
      const res = await fetch(
        `${base}/measurements/opening/${openingId}/verify`,
        { method: 'POST', headers, body: JSON.stringify({ finalWidth, finalHeight }) }
      );
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
      const res = await fetch(`${base}/openings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }

    case 'OPENING_UPDATE': {
      const { openingId, ...data } = action.payload;
      const res = await fetch(`${base}/openings/${openingId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
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
      const { inspectionId, action: subAction, ...rest } = action.payload;
      // If subAction is provided use nested route, otherwise PATCH base endpoint
      const url = subAction
        ? `${base}/inspections/${inspectionId}/${subAction}`
        : `${base}/inspections/${inspectionId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(rest),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }

    case 'EXPENSE_SAVE': {
      const res = await fetch(`${base}/job-expenses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }

    case 'PROPERTY_SCAN_SAVE': {
      // Large payload — only retry once (discard after 1 retry to avoid massive repeated uploads)
      if (action.retries > 1) {
        console.warn('[OfflineQueue] PROPERTY_SCAN_SAVE exceeded retries, discarding');
        return; // treated as success
      }
      const res = await fetch(`${base}/ai-analysis/property-scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }

    case 'PHOTO_UPLOAD': {
      const { base64, filename, mimeType, leadId, openingId, inspectionId, type: docType } = action.payload;

      if (!base64) {
        // Blob URL that didn't survive a page reload — can't recover, skip cleanly
        console.info('[OfflineQueue] PHOTO_UPLOAD: no base64 data (blob URL expired), skipping', action.id);
        return; // treated as success
      }

      const res = await fetch(`${base}/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          base64,
          filename,
          mimeType,
          leadId,
          openingId,
          inspectionId,
          type: docType || 'FIELD_PHOTO',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      break;
    }

    default: {
      // TypeScript exhaustiveness — this should never happen if all types are handled above
      const _exhaustive: never = action.type;
      throw new Error(`Unknown action type: ${_exhaustive}`);
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const syncInProgress = useRef(false);

  // BUG 4 fix: keep a stable ref to the latest syncNow so the online event
  // listener always calls the current version (not a stale closure)
  const syncNowRef = useRef<() => Promise<void>>(async () => {});

  // Load queue from IndexedDB on mount
  useEffect(() => {
    getAllActions().then((actions) => {
      setQueue(actions.filter((a) => a.status !== 'done'));
    });
  }, []);

  // BUG 4 fix: online/offline listeners use syncNowRef.current instead of syncNow directly
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Back online — syncing queued actions…');
      syncNowRef.current();
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
  }, []); // empty deps intentional — uses ref

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const newRetries = action.retries + 1;
      const updated: QueuedAction = {
        ...action,
        retries: newRetries,
        status: newRetries >= 5 ? 'dead' : 'failed',
        error: err.message,
      };
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
    // BUG 5 fix: max 5 retries (not 3); dead items are NOT auto-retried
    const toSync = pending.filter(
      (a) => a.status === 'pending' || (a.status === 'failed' && a.retries < 5)
    );
    let succeeded = 0;
    let failed = 0;

    for (const action of toSync) {
      try {
        await putAction({ ...action, status: 'syncing' });
        await executeAction(action, token);
        await deleteAction(action.id);
        succeeded++;
      } catch (err: any) {
        const newRetries = action.retries + 1;
        const updated: QueuedAction = {
          ...action,
          retries: newRetries,
          // BUG 5 fix: mark as 'dead' after 5 failures
          status: newRetries >= 5 ? 'dead' : 'failed',
          error: err.message,
        };
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

  // BUG 4 fix: keep the ref in sync with the latest syncNow
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  // BUG 5 fix: clearFailed clears both 'failed' AND 'dead' items
  const clearFailed = useCallback(async () => {
    const all = await getAllActions();
    await Promise.all(
      all
        .filter((a) => a.status === 'failed' || a.status === 'dead')
        .map((a) => deleteAction(a.id))
    );
    setQueue((prev) => prev.filter((a) => a.status !== 'failed' && a.status !== 'dead'));
  }, []);

  const pendingCount = queue.filter((a) => a.status === 'pending').length;
  const failedCount = queue.filter((a) => a.status === 'failed').length;
  const deadCount = queue.filter((a) => a.status === 'dead').length;

  return {
    queue,
    pendingCount,
    failedCount,
    deadCount,
    totalQueued: queue.length,
    isSyncing,
    isOnline,
    enqueue,
    syncNow,
    clearFailed,
  };
}
