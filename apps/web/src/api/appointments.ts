import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import apiClient from './client';

export { keepPreviousData };

// ─── Types ────────────────────────────────────────────────────
export interface Appointment {
  id: string;
  leadId: string;
  title: string;
  type: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  scheduledAt: string;
  endAt?: string;
  duration?: number;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  outcome?: string;
  createdById: string;
  lead?: {
    id: string; firstName: string; lastName: string;
    phone?: string; address?: string; city?: string; zip?: string;
    assignedRep?: { id: string; firstName: string; lastName: string };
  };
  createdBy?: { id: string; firstName: string; lastName: string };
}

export interface CreateAppointmentInput {
  leadId: string;
  title: string;
  type: string;
  scheduledAt: string; // ISO
  endAt?: string;
  duration?: number;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

// ─── Query Keys ───────────────────────────────────────────────
export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (filters: Record<string, any>) => [...appointmentKeys.all, 'list', filters] as const,
  calendar: (start: string, end: string, repId?: string) => [...appointmentKeys.all, 'calendar', start, end, repId] as const,
  route: (repId?: string) => [...appointmentKeys.all, 'route', repId] as const,
  detail: (id: string) => [...appointmentKeys.all, 'detail', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────

/** List appointments with optional filters */
export function useAppointments(filters: {
  date?: string;
  week?: string;
  status?: string;
  leadId?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get('/appointments', { params: filters });
      return data as { data: Appointment[]; meta: { total: number; page: number; limit: number; totalPages: number } };
    },
    staleTime: 30_000,
  });
}

/** Calendar feed — all appointments in a date range */
export function useCalendarAppointments(start: string, end: string, repId?: string) {
  return useQuery({
    queryKey: appointmentKeys.calendar(start, end, repId),
    queryFn: async () => {
      const { data } = await apiClient.get('/appointments/calendar', {
        params: { start, end, repId },
      });
      return data.data as Appointment[];
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: !!start && !!end,
  });
}

/** Today's optimized route */
export function useTodayRoute(repId?: string) {
  return useQuery({
    queryKey: appointmentKeys.route(repId),
    queryFn: async () => {
      const { data } = await apiClient.get('/appointments/route', { params: { repId } });
      return data.data as { date: string; total: number; estimatedMiles: number; appointments: Appointment[] };
    },
    staleTime: 5 * 60_000,
  });
}

/** Get single appointment detail */
export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/appointments/${id}`);
      return data.data as Appointment;
    },
    enabled: !!id,
  });
}

/** Create appointment */
export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      const { data } = await apiClient.post('/appointments', input);
      return data.data as Appointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/** Update appointment */
export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateAppointmentInput> & { id: string }) => {
      const { data } = await apiClient.patch(`/appointments/${id}`, input);
      return data.data as Appointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/** Update appointment status */
export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, outcome }: { id: string; status: string; outcome?: string }) => {
      const { data } = await apiClient.patch(`/appointments/${id}/status`, { status, outcome });
      return data.data as Appointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}
