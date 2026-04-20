import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  avatarUrl: string | null;
  phone?: string | null;
  googleId?: string | null;
  createdAt?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    brandColor: string | null;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'ww-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// App-level settings store
interface AppState {
  sidebarOpen: boolean;
  stormModeActive: boolean;
  financingModeActive: boolean;
  commandBarOpen: boolean;
  offlineMode: boolean;
  syncPending: number;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setStormMode: (active: boolean) => void;
  setFinancingMode: (active: boolean) => void;
  setCommandBarOpen: (open: boolean) => void;
  setOfflineMode: (offline: boolean) => void;
  setSyncPending: (count: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      stormModeActive: false,
      financingModeActive: false,
      commandBarOpen: false,
      offlineMode: false,
      syncPending: 0,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setStormMode: (active) => set({ stormModeActive: active }),
      setFinancingMode: (active) => set({ financingModeActive: active }),
      setCommandBarOpen: (open) => set({ commandBarOpen: open }),
      setOfflineMode: (offline) => set({ offlineMode: offline }),
      setSyncPending: (count) => set({ syncPending: count }),
    }),
    {
      name: 'ww-app',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        stormModeActive: state.stormModeActive,
        financingModeActive: state.financingModeActive,
      }),
    }
  )
);
