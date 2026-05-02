import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ─── API Client ──────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15s — field networks are slow; AI endpoints override per-call
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
    search: (q: string, limit = 8) => get<any>('/leads', { params: { search: q, limit } }),
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
    bulkImport: (payload: { leads: any[]; [key: string]: any }) => post('/leads/bulk-import', payload),
  },

  // Contacts
  contacts: {
    list: (params?: Record<string, any>) => get<any>('/contacts', { params }),
    listByLead: (leadId: string) => get<any>(`/contacts/lead/${leadId}`),
    getById: (id: string) => get<any>(`/contacts/${id}`),
    create: (data: any) => post('/contacts', data),
    update: (id: string, data: any) => patch(`/contacts/${id}`, data),
    delete: (id: string) => del(`/contacts/${id}`),
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
    todayRoute: () => get<any>('/appointments/route'),
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
    listByInspection: (inspectionId: string) => get<any>(`/openings?inspectionId=${inspectionId}`),
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
    verify: (openingId: string, data: any) => post(`/measurements/opening/${openingId}/verify`, data),
    approveForOrder: (openingId: string) => post(`/measurements/opening/${openingId}/approve-for-order`),
  },

  // Products
  products: {
    list: (params?: Record<string, any>) => get('/products', { params }),
    legacyCatalog: () => get<any>('/products/legacy'),
    getCategories: () => get<any>('/products/categories'),
    getSubcategories: (params?: Record<string, any>) => get('/products/subcategories', { params }),
    getSeries: (params?: Record<string, any>) => get('/products/series', { params }),
    getById: (id: string) => get(`/products/${id}`),
    create: (data: any) => post('/products', data),
    update: (id: string, data: any) => patch(`/products/${id}`, data),
    calculate: (data: any) => post('/products/calculate', data),
    getFinancingOptions: () => get<any>('/products/financing/options'),
    calculateFinancing: (data: any) => post('/products/financing/calculate', data),
  },

  // Quotes
  quotes: {
    list: (params?: Record<string, any>) => get('/quotes', { params }),
    getById: (id: string) => get(`/quotes/${id}`),
    getByLead: (leadId: string) => get(`/quotes/lead/${leadId}`),
    create: (data: any) => post('/quotes', data),
    build: (data: any) => post('/quotes/build', data),
    calculate: (data: any) => post('/quotes/calculate', data),
    update: (id: string, data: any) => patch(`/quotes/${id}`, data),
    delete: (id: string) => del(`/quotes/${id}`),
  },

  // Proposals
  proposals: {
    list: (params?: Record<string, any>) => get('/proposals', { params }),
    getById: (id: string) => get(`/proposals/${id}`),
    create: (data: any) => post('/proposals', data),
    update: (id: string, data: any) => patch(`/proposals/${id}`, data),
    send: (id: string, data: any) => post(`/proposals/${id}/send`, data),
    generatePdf: (id: string) => post(`/proposals/${id}/generate-pdf`),
    updateStatus: (id: string, status: string) => patch(`/proposals/${id}/status`, { status }),
    sign: (id: string, data: any) => post(`/proposals/${id}/sign`, data),
  },

  // Invoices
  invoices: {
    list: (params?: Record<string, any>) => get('/invoices', { params }),
    getById: (id: string) => get(`/invoices/${id}`),
    getAging: () => get<any>('/invoices/aging'),
    createFromProposal: (data: any) => post('/invoices/from-proposal', data),
    update: (id: string, data: any) => patch(`/invoices/${id}`, data),
    send: (id: string, data: any) => post(`/invoices/${id}/send`, data),
    recordPayment: (id: string, data: any) => post(`/invoices/${id}/payments`, data),
    generatePdf: (id: string) => post(`/invoices/${id}/generate-pdf`),
    installSchedule: () => get<any>('/invoices/install-schedule'),
    updateInstall: (id: string, data: { installDate?: string; crew?: string; installStatus?: string; notes?: string }) =>
      patch(`/invoices/${id}/install`, data),
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
    propertyScan: (data: {
      leadId: string;
      inspectionId: string;
      images: Array<{ base64: string; elevation: string }>;
      autoPopulateOpenings?: boolean;
    }) => post('/ai-analysis/property-scan', data, { timeout: 60000 } as AxiosRequestConfig),
    referenceObject: (data: {
      openingId?: string;
      leadId?: string;
      imageBase64: string;
      referenceObject: 'iphone' | 'credit_card' | 'dollar_bill';
    }) => post('/ai-analysis/reference-object', data, { timeout: 30000 } as AxiosRequestConfig),
  },


  // Analytics
  analytics: {
    dashboard: (params?: Record<string, any>) => get('/analytics/dashboard', { params }),
    pipeline: (params?: Record<string, any>) => get('/analytics/pipeline', { params }),
    repPerformance: (params?: Record<string, any>) => get('/analytics/rep-performance', { params }),
    leadSources: (params?: Record<string, any>) => get('/analytics/lead-sources', { params }),  // server has both /lead-sources and /sources
    revenue: (params?: Record<string, any>) => get('/analytics/revenue-trend', { params }),  // fixed: was /analytics/revenue, server has /analytics/revenue-trend
    map: (params?: Record<string, any>) => get('/analytics/map', { params }),
    weather: (params?: Record<string, any>) => get('/analytics/weather-correlation', { params }),
    summary: (days = 30) => get<any>('/analytics/summary', { params: { days } }),
    sources: (days = 30) => get<any>('/analytics/sources', { params: { days } }),
    revenueTrend: (days = 90) => get<any>('/analytics/revenue-trend', { params: { days } }),
    funnel: (days = 30) => get<any>('/analytics/funnel', { params: { days } }),
    commissions: () => get<any>('/analytics/commissions'),
    installedLeads: (limit = 60) => get<any>('/analytics/installed-leads', { params: { limit } }),
  },

  // Notifications
  notifications: {
    list: (limit = 50) => get<any>('/notifications', { params: { limit } }),
    markRead: (id: string) => patch(`/notifications/${id}/read`),
    markAllRead: () => post('/notifications/mark-all-read'),
  },

  // Campaigns
  campaigns: {
    list: (params?: Record<string, any>) => get('/campaigns', { params }),
    getTemplates: () => get<any>('/campaigns/templates'),
    enroll: (leadId: string, campaignTemplateKey: string) => post('/campaigns/enroll', { leadId, campaignTemplateKey }),
    triggerForStatus: (leadId: string, status: string) => post('/campaigns/trigger-for-status', { leadId, status }),
    unenroll: (leadId: string, reason?: string) => post(`/campaigns/${leadId}/unenroll`, { reason }),
    deployPlaybook: (playbookId: string, config: any) => post('/campaigns/deploy-playbook', { playbookId, config }),
  },

  // Users
  users: {
    list: (params?: Record<string, any>) => get('/users', { params }),
    getById: (id: string) => get(`/users/${id}`),
    me: () => get<any>('/users/me'),
    create: (data: any) => post('/users', data),
    update: (id: string, data: any) => patch(`/users/${id}`, data),
    updatePreferences: (prefs: Record<string, boolean>) =>
      patch('/users/me/preferences', prefs),
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



  // Automations
  automations: {
    list: () => get<any>('/automations'),
    getById: (id: string) => get<any>(`/automations/${id}`),
    create: (data: any) => post('/automations', data),
    update: (id: string, data: any) => patch(`/automations/${id}`, data),
    toggle: (id: string) => post(`/automations/${id}/toggle`),
    getRuns: (id: string, limit = 20) => get<any>(`/automations/${id}/runs`, { params: { limit } }),
  },

  // Teams / Organization
  teams: {
    me: () => get<any>('/teams/me'),
    update: (data: any) => patch('/teams/me', data),
    getCommissionTiers: () => get<any>('/teams/me/commission-tiers'),
    updateCommissionTiers: (tiers: any[]) => patch('/teams/me/commission-tiers', { tiers }),
  },

  // Lead Scores
  leadScores: {
    getByLead: (leadId: string) => get<any>(`/lead-scores/lead/${leadId}`),
    getLatest: (leadId: string) => get<any>(`/lead-scores/lead/${leadId}/latest`),
    override: (leadId: string, data: any) => post(`/lead-scores/lead/${leadId}/override`, data),
  },

  // Silo AI Intelligence Layer
  silo: {
    getMorningBrief: (repId: string) => get(`/silo/morning-brief/${repId}`),
    getAppointmentPrep: (appointmentId: string) => get(`/silo/appointment-prep/${appointmentId}`),
    getFollowUpEngine: () => get(`/silo/follow-up-engine`),
    getLiveAssist: (prompt: string) => post(`/silo/live-assist`, { prompt }),
    getProposalAnalysis: (proposalId: string) => get(`/silo/proposal-analysis/${proposalId}`)
  },

  // Job Expenses
  jobExpenses: {
    listByLead: (leadId: string) => get<any>(`/job-expenses/lead/${leadId}`),
    create: (data: Record<string, unknown>) => post<any>('/job-expenses', data),
    update: (id: string, data: Record<string, unknown>) => patch<any>(`/job-expenses/${id}`, data),
    verify: (id: string) => patch<any>(`/job-expenses/${id}/verify`, {}),
    delete: (id: string) => del<any>(`/job-expenses/${id}`),
    parseReceipt: (imageUrl: string, leadId: string) =>
      post<any>('/job-expenses/parse-receipt', { imageUrl, leadId }),
  },

  // ── Twilio Communications (calls + SMS) ──────────────────────────────
  communications: {
    /** Send an SMS to a lead */
    sendSms: (leadId: string, phone: string, message: string, opts?: { referenceId?: string; referenceType?: string }) =>
      post<any>(`/communications/leads/${leadId}/sms`, { phone, message, ...opts }),
    /** Initiate an outbound call to a lead */
    initiateCall: (leadId: string, phone: string) =>
      post<any>(`/communications/leads/${leadId}/call`, { phone }),
    /** Get call + SMS history for a lead */
    getHistory: (leadId: string, limit = 50) =>
      get<any>(`/communications/leads/${leadId}/history`, { params: { limit } }),
    /** Org-level comms stats (manager+) */
    getStats: () =>
      get<any>('/communications/stats'),
    /** Generate Twilio Voice browser token */
    getVoiceToken: () =>
      get<any>('/communications/token'),
  },

  // ── Google Calendar ───────────────────────────────────────────────────
  calendar: {
    /** Check if the current user has Google Calendar connected */
    getStatus: () => get<any>('/calendar/status'),
    /** Returns the URL the user should open to connect Google Calendar */
    getConnectUrl: () => {
      const token = useAuthStore.getState().accessToken;
      return `${BASE_URL}/calendar/connect?token=${token}`;
    },
    /** Disconnect Google Calendar */
    disconnect: () => post<any>('/calendar/disconnect', {}),
    /** Get busy blocks for a time window (for the appointment picker) */
    getBusy: (startAt: string, endAt: string, repId?: string) =>
      get<any>('/calendar/busy', { params: { startAt, endAt, repId } }),
    /** Check if a specific slot has a conflict before booking */
    checkConflict: (startAt: string, endAt: string, repId?: string) =>
      post<any>('/calendar/check-conflict', { startAt, endAt, repId }),
  },
};

// ─── Attach api namespaces directly onto the axios instance ──
// This allows: import apiClient from './client'; apiClient.leads.list()
Object.assign(apiClient, api);

export default apiClient as typeof apiClient & typeof api;
