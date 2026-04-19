import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

// ─── Types ────────────────────────────────────────────────────
export interface CampaignTemplate {
  key: string;
  name: string;
  description: string;
  triggerStatus: string | null;
  steps: Array<{
    step: number;
    delayHours: number;
    type: 'EMAIL' | 'SMS';
    subject?: string;
    templateKey: string;
  }>;
}

export interface CampaignEnrollment {
  id: string;
  leadId: string;
  campaignTemplateKey?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'UNSUBSCRIBED';
  currentStep: number;
  enrolledAt: string;
  completedAt?: string;
  unenrolledAt?: string;
  unenrollReason?: string;
  lead?: { id: string; firstName: string; lastName: string; status: string; email?: string };
  campaign?: { name: string; templateKey: string };
}

export interface PitchCoach {
  opener: string;
  pitchAngle: string;
  productRecommendation: string;
  objectionHandlers: Array<{ objection: string; response: string }>;
  voicemailScript: string;
  textScript: string;
  closingStrategy: string;
  urgencyFraming: string;
  financingAngle: string;
}

export interface LeadSummary {
  summary: string;
  nextBestAction: string;
  riskFlags: string[];
}

// ─── Query Keys ───────────────────────────────────────────────
export const automationKeys = {
  templates: ['automation', 'templates'] as const,
  enrollments: (filters: any) => ['automation', 'enrollments', filters] as const,
  pitchCoach: (leadId: string) => ['automation', 'pitch-coach', leadId] as const,
  leadSummary: (leadId: string) => ['automation', 'lead-summary', leadId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────

/** List available campaign templates */
export function useCampaignTemplates() {
  return useQuery({
    queryKey: automationKeys.templates,
    queryFn: async () => {
      const { data } = await apiClient.get('/campaigns/templates');
      return data.data as CampaignTemplate[];
    },
    staleTime: 5 * 60_000,
  });
}

/** List active campaign enrollments */
export function useCampaignEnrollments() {
  return useQuery({
    queryKey: automationKeys.enrollments({}),
    queryFn: async () => {
      const { data } = await apiClient.get('/campaigns');
      return data.data as CampaignEnrollment[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Enroll a lead in a campaign */
export function useEnrollLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, campaignTemplateKey }: { leadId: string; campaignTemplateKey: string }) => {
      const { data } = await apiClient.post('/campaigns/enroll', { leadId, campaignTemplateKey });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation', 'enrollments'] }),
  });
}

/** Unenroll a lead from all campaigns */
export function useUnenrollLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: string; reason?: string }) => {
      const { data } = await apiClient.post(`/campaigns/${leadId}/unenroll`, { reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation', 'enrollments'] }),
  });
}

/** Trigger campaign for status change */
export function useTriggerForStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { data } = await apiClient.post('/campaigns/trigger-for-status', { leadId, status });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation', 'enrollments'] }),
  });
}

/** Generate AI pitch coach for a lead */
export function usePitchCoach(leadId: string, enabled = true) {
  return useQuery({
    queryKey: automationKeys.pitchCoach(leadId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/ai/pitch-coach/${leadId}`);
      return data.data as PitchCoach;
    },
    enabled: !!leadId && enabled,
    staleTime: 10 * 60_000, // cache for 10 min
    retry: 1,
  });
}

/** Generate AI lead summary */
export function useLeadSummary(leadId: string, enabled = true) {
  return useQuery({
    queryKey: automationKeys.leadSummary(leadId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/ai/lead-summary/${leadId}`);
      return data.data as LeadSummary;
    },
    enabled: !!leadId && enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/** Trigger immediate AI score for a lead */
export function useScoreLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data } = await apiClient.post(`/ai/score-lead/${leadId}`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
