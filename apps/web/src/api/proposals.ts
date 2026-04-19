import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

// ─── Types ────────────────────────────────────────────────────
export interface Proposal {
  id: string;
  leadId: string;
  quoteId?: string;
  title: string;
  status: 'DRAFT' | 'READY' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'REVISED' | 'CONTRACTED' | 'ARCHIVED';
  pdfStatus?: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
  pdfUrl?: string;
  introMessage?: string;
  warrantyHighlights?: string[];
  validDays?: number;
  expiresAt?: string;
  sentAt?: string;
  firstViewedAt?: string;
  acceptedAt?: string;
  viewCount?: number;
  createdAt: string;
  lead?: {
    id: string; firstName: string; lastName: string;
    address?: string; city?: string; zip?: string; phone?: string;
    assignedRep?: { id: string; firstName: string; lastName: string; phone?: string; email?: string };
    contacts?: any[];
  };
  quote?: {
    id: string; grandTotal: number; subtotal?: number;
    discountPct?: number; discountAmount?: number; taxAmount?: number;
    totalWindows?: number; lineItems?: any[];
    financingOptionId?: string;
  };
  createdBy?: { id: string; firstName: string; lastName: string; phone?: string; email?: string };
}

export interface Invoice {
  id: string;
  proposalId?: string;
  leadId: string;
  organizationId: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF';
  grandTotal: number;
  depositAmount?: number;
  depositPaid?: boolean;
  dueDate?: string;
  paidAt?: string;
  pdfUrl?: string;
  notes?: string;
  createdAt: string;
  // Computed (enriched by service)
  totalPaid?: number;
  balance?: number;
  isOverdue?: boolean;
  daysOverdue?: number;
  completionPct?: number;
  payments?: Array<{ id: string; amount: number; method: string; paidAt: string; notes?: string }>;
  proposal?: { id: string; title: string };
  createdBy?: { id: string; firstName: string; lastName: string };
}

// ─── Query Keys ───────────────────────────────────────────────
export const proposalKeys = {
  all: ['proposals'] as const,
  list: (f: any) => [...proposalKeys.all, 'list', f] as const,
  detail: (id: string) => [...proposalKeys.all, 'detail', id] as const,
};

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (f: any) => [...invoiceKeys.all, 'list', f] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
};

// ─── Proposal Hooks ───────────────────────────────────────────
export function useProposals(filters: { leadId?: string; status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: proposalKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get('/proposals', { params: filters });
      return data as { data: Proposal[]; meta: { total: number; page: number; totalPages: number } };
    },
    staleTime: 30_000,
  });
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: proposalKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/proposals/${id}`);
      return data.data as Proposal;
    },
    enabled: !!id && id !== 'new',
    staleTime: 15_000,
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadId: string; quoteId?: string; title?: string; introMessage?: string; validDays?: number }) => {
      const { data } = await apiClient.post('/proposals', input);
      return data.data as Proposal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalKeys.all }),
  });
}

export function useGeneratePdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { data } = await apiClient.post(`/proposals/${proposalId}/generate-pdf`);
      return data;
    },
    onSuccess: (_, proposalId) => {
      qc.invalidateQueries({ queryKey: proposalKeys.detail(proposalId) });
    },
  });
}

export function useUpdateProposalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiClient.patch(`/proposals/${id}/status`, { status });
      return data.data as Proposal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalKeys.all }),
  });
}

export function useSendProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, channel }: { id: string; channel: 'email' | 'sms' | 'both' }) => {
      const { data } = await apiClient.post(`/proposals/${id}/send`, { channel });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalKeys.all }),
  });
}

// ─── Invoice Hooks ────────────────────────────────────────────
export function useInvoices(filters: { leadId?: string; status?: string; overdueOnly?: boolean; page?: number } = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get('/invoices', { params: filters });
      return data as { data: Invoice[]; meta: { total: number; page: number; totalPages: number } };
    },
    staleTime: 30_000,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/invoices/${id}`);
      return data.data as Invoice;
    },
    enabled: !!id,
  });
}

export function useCreateInvoiceFromProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { proposalId: string; leadId: string; dueDate?: string; depositPct?: number }) => {
      const { data } = await apiClient.post('/invoices/from-proposal', input);
      return data.data as Invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, amount, method, notes }: { invoiceId: string; amount: number; method: string; notes?: string }) => {
      const { data } = await apiClient.post(`/invoices/${invoiceId}/payments`, { amount, method, notes });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}
