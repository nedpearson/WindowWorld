import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ─── API Client ──────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add device ID for mobile sync
  const deviceId = localStorage.getItem('ww_device_id');
  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId;
  }

  return config;
});

// ─── Response Interceptor ────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Auto-refresh on 401
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return apiClient(original);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ─── Generic fetchers ────────────────────────────────────────
export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return apiClient.get<any, any>(url, config).then((r) => r.data);
}

export function post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  return apiClient.post<any, any>(url, data, config).then((r) => r.data);
}

export function patch<T>(url: string, data?: any): Promise<T> {
  return apiClient.patch<any, any>(url, data).then((r) => r.data);
}

export function put<T>(url: string, data?: any): Promise<T> {
  return apiClient.put<any, any>(url, data).then((r) => r.data);
}

export function del<T>(url: string): Promise<T> {
  return apiClient.delete<any, any>(url).then((r) => r.data);
}

// ─── Endpoints ───────────────────────────────────────────────
export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) => post('/auth/login', { email, password }),
    google: (idToken: string) => post('/auth/google', { idToken }),
    me: () => get('/auth/me'),
    logout: (refreshToken: string) => post('/auth/logout', { refreshToken }),
    refresh: (refreshToken: string) => post('/auth/refresh', { refreshToken }),
    changePassword: (currentPassword: string, newPassword: string) =>
      post('/auth/change-password', { currentPassword, newPassword }),
  },

  // Leads
  leads: {
    list: (params?: Record<string, any>) => get('/leads', { params }),
    getById: (id: string) => get(`/leads/${id}`),
    getMapData: (params?: Record<string, any>) => get('/leads/map', { params }),
    getBestToday: () => get('/leads/best-today'),
    getStormFollowUp: () => get('/leads/storm-follow-up'),
    getPipeline: (params?: Record<string, any>) => get('/leads/pipeline', { params }),
    create: (data: any) => post('/leads', data),
    update: (id: string, data: any) => patch(`/leads/${id}`, data),
    updateStatus: (id: string, status: string, reason?: string) =>
      patch(`/leads/${id}/status`, { status, reason }),
    assign: (id: string, repId: string) => patch(`/leads/${id}/assign`, { repId }),
    getActivities: (id: string) => get(`/leads/${id}/activities`),
    logActivity: (id: string, data: any) => post(`/leads/${id}/activities`, data),
    getNotes: (id: string) => get(`/leads/${id}/notes`),
    addNote: (id: string, data: any) => post(`/leads/${id}/notes`, data),
    getAiSummary: (id: string) => get(`/leads/${id}/ai-summary`),
    checkDuplicates: (id: string) => post(`/leads/${id}/duplicate-check`),
    delete: (id: string) => del(`/leads/${id}`),
  },

  // Properties
  properties: {
    list: (params?: Record<string, any>) => get('/properties', { params }),
    getById: (id: string) => get(`/properties/${id}`),
    create: (data: any) => post('/properties', data),
    update: (id: string, data: any) => patch(`/properties/${id}`, data),
  },

  // Appointments
  appointments: {
    list: (params?: Record<string, any>) => get('/appointments', { params }),
    getById: (id: string) => get(`/appointments/${id}`),
    create: (data: any) => post('/appointments', data),
    update: (id: string, data: any) => patch(`/appointments/${id}`, data),
    updateStatus: (id: string, status: string) =>
      patch(`/appointments/${id}/status`, { status }),
    getRoute: (params?: Record<string, any>) => get('/appointments/route', { params }),
  },

  // Inspections
  inspections: {
    list: (params?: Record<string, any>) => get('/inspections', { params }),
    getById: (id: string) => get(`/inspections/${id}`),
    create: (data: any) => post('/inspections', data),
    update: (id: string, data: any) => patch(`/inspections/${id}`, data),
    getAiSummary: (id: string) => get(`/inspections/${id}/ai-summary`),
  },

  // Openings
  openings: {
    list: (params?: Record<string, any>) => get('/openings', { params }),
    getById: (id: string) => get(`/openings/${id}`),
    create: (data: any) => post('/openings', data),
    update: (id: string, data: any) => patch(`/openings/${id}`, data),
    analyzePhoto: (id: string, data: FormData) =>
      apiClient.post(`/openings/${id}/analyze`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
  },

  // Measurements
  measurements: {
    getByOpeningId: (openingId: string) => get(`/measurements/opening/${openingId}`),
    create: (data: any) => post('/measurements', data),
    update: (id: string, data: any) => patch(`/measurements/${id}`, data),
    verify: (id: string, data: any) => patch(`/measurements/${id}/verify`, data),
    approveForOrder: (id: string) => patch(`/measurements/${id}/approve`),
    getHistory: (id: string) => get(`/measurements/${id}/history`),
  },

  // Products
  products: {
    list: (params?: Record<string, any>) => get('/products', { params }),
    getById: (id: string) => get(`/products/${id}`),
    create: (data: any) => post('/products', data),
    update: (id: string, data: any) => patch(`/products/${id}`, data),
    recommend: (openingData: any) => post('/products/recommend', openingData),
  },

  // Quotes
  quotes: {
    list: (params?: Record<string, any>) => get('/quotes', { params }),
    getById: (id: string) => get(`/quotes/${id}`),
    create: (data: any) => post('/quotes', data),
    update: (id: string, data: any) => patch(`/quotes/${id}`, data),
    approve: (id: string) => patch(`/quotes/${id}/approve`),
  },

  // Proposals
  proposals: {
    list: (params?: Record<string, any>) => get('/proposals', { params }),
    getById: (id: string) => get(`/proposals/${id}`),
    create: (data: any) => post('/proposals', data),
    update: (id: string, data: any) => patch(`/proposals/${id}`, data),
    send: (id: string, data: any) => post(`/proposals/${id}/send`, data),
    generatePdf: (id: string) => post(`/proposals/${id}/generate-pdf`),
    sign: (id: string, data: any) => post(`/proposals/${id}/sign`, data),
  },

  // Invoices
  invoices: {
    list: (params?: Record<string, any>) => get('/invoices', { params }),
    getById: (id: string) => get(`/invoices/${id}`),
    create: (data: any) => post('/invoices', data),
    update: (id: string, data: any) => patch(`/invoices/${id}`, data),
    send: (id: string, data: any) => post(`/invoices/${id}/send`, data),
    recordPayment: (id: string, data: any) => post(`/invoices/${id}/payments`, data),
    generatePdf: (id: string) => post(`/invoices/${id}/generate-pdf`),
  },

  // Documents
  documents: {
    upload: (data: FormData) =>
      apiClient.post('/documents/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    getSignedUrl: (id: string) => get(`/documents/${id}/url`),
    analyzeWindow: (id: string) => post(`/documents/${id}/analyze-window`),
    list: (params?: Record<string, any>) => get('/documents', { params }),
    delete: (id: string) => del(`/documents/${id}`),
  },

  // AI Analysis
  aiAnalysis: {
    getForLead: (leadId: string) => get(`/ai-analysis/lead/${leadId}`),
    getForInspection: (inspectionId: string) => get(`/ai-analysis/inspection/${inspectionId}`),
    submitOverride: (id: string, override: any) => patch(`/ai-analysis/${id}/override`, { override }),
    retry: (id: string) => post(`/ai-analysis/${id}/retry`),
  },

  // Analytics
  analytics: {
    dashboard: (params?: Record<string, any>) => get('/analytics/dashboard', { params }),
    pipeline: (params?: Record<string, any>) => get('/analytics/pipeline', { params }),
    repPerformance: (params?: Record<string, any>) => get('/analytics/rep-performance', { params }),
    leadSources: (params?: Record<string, any>) => get('/analytics/lead-sources', { params }),
    revenue: (params?: Record<string, any>) => get('/analytics/revenue', { params }),
    map: (params?: Record<string, any>) => get('/analytics/map', { params }),
    weather: (params?: Record<string, any>) => get('/analytics/weather-correlation', { params }),
  },

  // Notifications
  notifications: {
    list: (params?: Record<string, any>) => get('/notifications', { params }),
    markRead: (id: string) => patch(`/notifications/${id}/read`),
    markAllRead: () => patch('/notifications/read-all'),
  },

  // Campaigns
  campaigns: {
    list: (params?: Record<string, any>) => get('/campaigns', { params }),
    getById: (id: string) => get(`/campaigns/${id}`),
    create: (data: any) => post('/campaigns', data),
    activateStormMode: (data: any) => post('/campaigns/storm-mode', data),
  },

  // Users
  users: {
    list: (params?: Record<string, any>) => get('/users', { params }),
    getById: (id: string) => get(`/users/${id}`),
    create: (data: any) => post('/users', data),
    update: (id: string, data: any) => patch(`/users/${id}`, data),
    getLeaderboard: () => get('/users/leaderboard'),
  },

  // Territories
  territories: {
    list: (params?: Record<string, any>) => get('/territories', { params }),
    getById: (id: string) => get(`/territories/${id}`),
    create: (data: any) => post('/territories', data),
    update: (id: string, data: any) => patch(`/territories/${id}`, data),
  },

  // Admin
  admin: {
    getSettings: () => get('/admin/settings'),
    updateSettings: (data: any) => patch('/admin/settings', data),
    getAuditLog: (params?: Record<string, any>) => get('/admin/audit-log', { params }),
    getSyncStatus: () => get('/admin/sync-status'),
    getJobStatus: () => get('/admin/job-status'),
    getHealth: () => get('/admin/health'),
  },
};

export default apiClient;
