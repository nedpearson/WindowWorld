import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User { id: string; email: string; name: string; role: string; }

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('wwa_token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('wwa_token');
        set({ user: null, token: null });
      },
    }),
    { name: 'wwa-auth' }
  )
);

interface DraftState {
  drafts: Record<string, any>;
  saveDraft: (key: string, data: any) => void;
  getDraft: (key: string) => any;
  removeDraft: (key: string) => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: {},
      saveDraft: (key, data) => set({ drafts: { ...get().drafts, [key]: { ...data, _savedAt: Date.now() } } }),
      getDraft: (key) => get().drafts[key],
      removeDraft: (key) => {
        const d = { ...get().drafts };
        delete d[key];
        set({ drafts: d });
      },
    }),
    { name: 'wwa-drafts' }
  )
);
