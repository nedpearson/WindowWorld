import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

// ─── Types ────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP' | 'FIELD_TECH' | 'VIEWER';
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  territories?: Array<{ territory: { id: string; name: string } }>;
  _count?: { assignedLeads: number };
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  occurredAt: string;
  user?: { id: string; firstName: string; lastName: string; role: string };
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl?: string;
  role: string;
  closedDeals: number;
  revenue: number;
  totalLeads: number;
}

export interface OrgStats {
  totalLeads: number;
  activeLeads: number;
  totalProposals: number;
  sentProposals: number;
  totalInvoices: number;
  paidInvoices: number;
  activeUsers: number;
  totalRevenue: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminUser['role'];
  phone?: string;
}

// ─── Hooks ────────────────────────────────────────────────────

export function useAdminUsers(filters: { role?: string; search?: string; isActive?: boolean } = {}) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.role) params.set('role', filters.role);
      if (filters.search) params.set('search', filters.search);
      if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
      const { data } = await apiClient.get(`/admin/users?${params}`);
      return data.data as AdminUser[];
    },
    staleTime: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await apiClient.post('/admin/users', payload);
      return data.data as AdminUser;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<AdminUser> & { id: string }) => {
      const { data } = await apiClient.patch(`/admin/users/${id}`, payload);
      return data.data as AdminUser;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/admin/users/${id}/deactivate`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/admin/users/${id}/reactivate`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useAuditLog(filters: { entityType?: string; userId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'audit-log', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.userId) params.set('userId', filters.userId);
      params.set('limit', String(filters.limit || 50));
      const { data } = await apiClient.get(`/admin/audit-log?${params}`);
      return { items: data.data as AuditLog[], total: data.total as number };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useLeaderboard(period: 'week' | 'month' | 'quarter' = 'month') {
  return useQuery({
    queryKey: ['admin', 'leaderboard', period],
    queryFn: async () => {
      const { data } = await apiClient.get(`/admin/leaderboard?period=${period}`);
      return data.data as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });
}

export function useOrgStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/stats');
      return data.data as OrgStats;
    },
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });
}
