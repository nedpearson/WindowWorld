/**
 * Voice Command Service — Siri-style AI Command Parser
 * 
 * Accepts raw speech transcripts and uses Claude AI to:
 * 1. Parse the user's intent (create appointment, add note, schedule event, etc.)
 * 2. Extract structured data (names, dates, times, descriptions)
 * 3. Execute the action against the CRM database
 * 4. Return a confirmation response for speech synthesis
 * 
 * All AI processing is handled by the global Claude provider via aiService.
 */

import { prisma } from '../../shared/services/prisma';
import { logger, sanitizeForLog } from '../../shared/utils/logger';
import { aiService } from './ai.service';

// ─── Types ────────────────────────────────────────────────────

export type VoiceIntent =
  | 'create_appointment'
  | 'create_note'
  | 'create_lead'
  | 'create_calendar_event'
  | 'start_recording'
  | 'search_lead'
  | 'update_lead_status'
  | 'get_schedule'
  | 'get_directions'
  | 'add_follow_up'
  | 'log_activity'
  | 'unknown';

export interface VoiceCommandResult {
  success: boolean;
  intent: VoiceIntent;
  /** Human-readable confirmation to speak back to the user */
  spokenResponse: string;
  /** Structured data that was parsed from the command */
  parsedData: Record<string, any>;
  /** ID of created entity, if applicable */
  createdId?: string;
  /** Any navigation hint for the frontend */
  navigateTo?: string;
}

// ─── Intent Classification Prompt ─────────────────────────────

const VOICE_INTENT_PROMPT = `You are an AI voice command parser for WindowWorld, a window/door/siding replacement CRM used by field sales reps.

You receive a raw speech transcript from a sales rep speaking into their phone. Your job is to:
1. Identify the user's INTENT
2. Extract ALL relevant structured data
3. Return a JSON response

AVAILABLE INTENTS:
- "create_appointment" — Schedule a new appointment with a homeowner
- "create_note" — Add a note to a lead or general note
- "create_lead" — Create a new lead/prospect
- "create_calendar_event" — Add a personal calendar event (non-lead related)
- "start_recording" — User wants to start a voice recording/memo
- "search_lead" — Search for an existing lead by name
- "update_lead_status" — Change a lead's status
- "get_schedule" — Ask about today's or upcoming schedule
- "get_directions" — Get directions to a lead's address
- "add_follow_up" — Schedule a follow-up reminder for a lead
- "log_activity" — Log a call, text, email, or visit activity
- "unknown" — Cannot determine intent

CURRENT DATE/TIME: {{CURRENT_DATETIME}}

Return ONLY valid JSON (no markdown fences):
{
  "intent": "one of the intents above",
  "confidence": 0.0-1.0,
  "data": {
    // For create_appointment:
    "leadName": "string or null",
    "date": "ISO date string",
    "time": "HH:mm format",
    "duration": number in minutes (default 60),
    "type": "initial-consult|measurement|close|follow-up",
    "notes": "string or null",
    
    // For create_note:
    "leadName": "string or null",
    "noteText": "the content of the note",
    
    // For create_lead:
    "firstName": "string",
    "lastName": "string",
    "phone": "string or null",
    "address": "string or null",
    "city": "string or null",
    "source": "string or null",
    "notes": "string or null",
    "isStormLead": boolean,
    
    // For create_calendar_event:
    "title": "event title",
    "date": "ISO date string",
    "time": "HH:mm",
    "duration": number in minutes,
    "description": "string or null",
    
    // For search_lead:
    "searchQuery": "name or partial name",
    
    // For update_lead_status:
    "leadName": "string",
    "newStatus": "NEW_LEAD|CONTACTED|APPOINTMENT_SET|SOLD|LOST|etc",
    
    // For get_schedule:
    "date": "ISO date or 'today' or 'tomorrow'",
    
    // For get_directions:
    "leadName": "string",
    
    // For add_follow_up:
    "leadName": "string",
    "followUpDate": "ISO date string",
    "reason": "string",
    
    // For log_activity:
    "leadName": "string",
    "activityType": "CALL|TEXT|EMAIL|VISIT|NOTE",
    "description": "what happened",
    "outcome": "string or null"
  },
  "spokenResponse": "A natural, concise confirmation to speak back to the user. Be brief and friendly."
}`;

// ─── Service ──────────────────────────────────────────────────

export class VoiceCommandService {

  /**
   * Process a raw voice transcript and execute the parsed command
   */
  async processCommand(
    transcript: string,
    userId: string,
    orgId: string,
  ): Promise<VoiceCommandResult> {
    const startMs = Date.now();

    try {
      // 1. Parse intent with Claude
      const now = new Date();
      const prompt = VOICE_INTENT_PROMPT.replace('{{CURRENT_DATETIME}}', now.toISOString()) +
        `\n\nUSER TRANSCRIPT: "${transcript}"`;

      const raw = await aiService.generateText(prompt);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as {
        intent: VoiceIntent;
        confidence: number;
        data: Record<string, any>;
        spokenResponse: string;
      };

      logger.info(`[VoiceCommand] Intent: ${parsed.intent} (${parsed.confidence}) in ${Date.now() - startMs}ms`);

      // 2. Execute the action
      const result = await this.executeIntent(
        parsed.intent,
        parsed.data,
        userId,
        orgId,
        parsed.spokenResponse,
      );

      // 3. Log for audit trail
      await prisma.aiAnalysis.create({
        data: {
          leadId: result.createdId || null,
          analysisType: 'voice-command',
          provider: 'anthropic',
          model: 'claude-voice-parser',
          rawResponse: { transcript, ...parsed } as any,
          confidenceScore: parsed.confidence,
          status: result.success ? 'COMPLETED' : 'FAILED',
          processingMs: Date.now() - startMs,
        },
      });

      return result;

    } catch (error: any) {
      logger.error(`[VoiceCommand] Failed: ${sanitizeForLog(error.message)}`);
      return {
        success: false,
        intent: 'unknown',
        spokenResponse: "Sorry, I couldn't understand that command. Could you try again?",
        parsedData: { error: error.message, transcript },
      };
    }
  }

  /**
   * Execute a parsed intent against the CRM
   */
  private async executeIntent(
    intent: VoiceIntent,
    data: Record<string, any>,
    userId: string,
    orgId: string,
    spokenResponse: string,
  ): Promise<VoiceCommandResult> {

    switch (intent) {

      // ─── Create Appointment ───────────────────────────────
      case 'create_appointment': {
        const lead = data.leadName
          ? await this.findLeadByName(data.leadName, orgId)
          : null;

        if (!lead && data.leadName) {
          return {
            success: false,
            intent,
            spokenResponse: `I couldn't find a lead named "${data.leadName}" in your CRM. Would you like to create a new lead first?`,
            parsedData: data,
          };
        }

        // Parse the appointment datetime
        const scheduledAt = this.parseDateTime(data.date, data.time);

        if (lead) {
          const apt = await prisma.appointment.create({
            data: {
              lead: { connect: { id: lead.id } },
              createdBy: { connect: { id: userId } },
              title: `${data.type === 'measurement' ? 'Measurement' : data.type === 'close' ? 'Closing' : data.type === 'follow-up' ? 'Follow-up' : 'Initial Consult'} — ${lead.firstName} ${lead.lastName}`,
              scheduledAt,
              duration: data.duration || 60,
              type: (data.type || 'INITIAL_CONSULT').toUpperCase().replace(/-/g, '_'),
              status: 'SCHEDULED',
              notes: data.notes || `Created via voice command`,
            },
          });

          return {
            success: true,
            intent,
            spokenResponse: spokenResponse || `Done! Appointment with ${lead.firstName} ${lead.lastName} scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
            parsedData: data,
            createdId: apt.id,
            navigateTo: `/leads/${lead.id}`,
          };
        }

        // No lead found but we can still create a calendar-style event
        return {
          success: false,
          intent,
          spokenResponse: "I need a lead name to create an appointment. Try saying something like 'Schedule an appointment with John Smith for tomorrow at 2 PM'.",
          parsedData: data,
        };
      }

      // ─── Create Note ──────────────────────────────────────
      case 'create_note': {
        const lead = data.leadName
          ? await this.findLeadByName(data.leadName, orgId)
          : null;

        if (lead) {
          await prisma.activity.create({
            data: {
              leadId: lead.id,
              userId,
              type: 'NOTE',
              description: data.noteText || data.notes || 'Voice note',
            },
          });

          return {
            success: true,
            intent,
            spokenResponse: spokenResponse || `Note added to ${lead.firstName} ${lead.lastName}'s record.`,
            parsedData: data,
            createdId: lead.id,
            navigateTo: `/leads/${lead.id}`,
          };
        }

        // General note (not lead-specific) — save as audit log
        await prisma.auditLog.create({
          data: {
            userId,
            entityType: 'VOICE_NOTE',
            entityId: 'general',
            action: 'CREATE',
            newValues: { text: data.noteText, source: 'voice-command' } as any,
          },
        });

        return {
          success: true,
          intent,
          spokenResponse: spokenResponse || "Got it, note saved.",
          parsedData: data,
        };
      }

      // ─── Create Lead ──────────────────────────────────────
      case 'create_lead': {
        const newLead = await prisma.lead.create({
          data: {
            organization: { connect: { id: orgId } },
            firstName: data.firstName || 'Unknown',
            lastName: data.lastName || '',
            phone: data.phone || '',
            address: data.address || undefined,
            city: data.city || undefined,
            source: data.source || 'VOICE',
            notes: data.notes || 'Created via voice command',
            isStormLead: data.isStormLead || false,
            status: 'NEW_LEAD',
            assignedRep: { connect: { id: userId } },
          },
        });

        return {
          success: true,
          intent,
          spokenResponse: spokenResponse || `New lead created: ${newLead.firstName} ${newLead.lastName}.`,
          parsedData: data,
          createdId: newLead.id,
          navigateTo: `/leads/${newLead.id}`,
        };
      }

      // ─── Create Calendar Event ────────────────────────────
      case 'create_calendar_event': {
        const eventDate = this.parseDateTime(data.date, data.time);

        // Store as an appointment without a lead (personal calendar block)
        // We need a dummy leadId — use a self-referencing pattern or audit log
        await prisma.auditLog.create({
          data: {
            userId,
            entityType: 'CALENDAR_EVENT',
            entityId: `cal-${Date.now()}`,
            action: 'CREATE',
            newValues: {
              title: data.title,
              scheduledAt: eventDate.toISOString(),
              duration: data.duration || 60,
              description: data.description,
              source: 'voice-command',
            } as any,
          },
        });

        return {
          success: true,
          intent,
          spokenResponse: spokenResponse || `Calendar event "${data.title}" added for ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
          parsedData: data,
        };
      }

      // ─── Search Lead ──────────────────────────────────────
      case 'search_lead': {
        const leads = await prisma.lead.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { firstName: { contains: data.searchQuery, mode: 'insensitive' } },
              { lastName: { contains: data.searchQuery, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, firstName: true, lastName: true, status: true, phone: true, city: true },
        });

        if (leads.length === 0) {
          return {
            success: true,
            intent,
            spokenResponse: `No leads found matching "${data.searchQuery}".`,
            parsedData: { ...data, results: [] },
          };
        }

        const names = leads.map(l => `${l.firstName} ${l.lastName}`).join(', ');
        return {
          success: true,
          intent,
          spokenResponse: spokenResponse || `Found ${leads.length} lead${leads.length > 1 ? 's' : ''}: ${names}.`,
          parsedData: { ...data, results: leads },
          navigateTo: leads.length === 1 ? `/leads/${leads[0].id}` : undefined,
        };
      }

      // ─── Update Lead Status ───────────────────────────────
      case 'update_lead_status': {
        const lead = data.leadName
          ? await this.findLeadByName(data.leadName, orgId)
          : null;

        if (!lead) {
          return {
            success: false,
            intent,
            spokenResponse: `I couldn't find a lead named "${data.leadName}".`,
            parsedData: data,
          };
        }

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: data.newStatus },
        });

        return {
          success: true,
          intent,
          spokenResponse: spokenResponse || `${lead.firstName} ${lead.lastName} has been updated to ${data.newStatus.replace(/_/g, ' ').toLowerCase()}.`,
          parsedData: data,
          createdId: lead.id,
          navigateTo: `/leads/${lead.id}`,
        };
      }

      // ─── Get Schedule ─────────────────────────────────────
      case 'get_schedule': {
        const targetDate = data.date === 'tomorrow'
          ? new Date(Date.now() + 86400000)
          : data.date === 'today' || !data.date
            ? new Date()
            : new Date(data.date);

        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const appointments = await prisma.appointment.findMany({
          where: {
            createdById: userId,
            scheduledAt: { gte: dayStart, lte: dayEnd },
          },
          include: { lead: { select: { firstName: true, lastName: true, city: true } } },
          orderBy: { scheduledAt: 'asc' },
        });

        if (appointments.length === 0) {
          return {
            success: true,
            intent,
            spokenResponse: `You have no appointments scheduled for ${targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
            parsedData: { ...data, appointments: [] },
          };
        }

        const summary = appointments.map(a => {
          const time = new Date(a.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          return `${time} with ${a.lead.firstName} ${a.lead.lastName} in ${a.lead.city || 'unknown'}`;
        }).join('. ');

        return {
          success: true,
          intent,
          spokenResponse: `You have ${appointments.length} appointment${appointments.length > 1 ? 's' : ''}: ${summary}.`,
          parsedData: { ...data, appointments },
          navigateTo: '/field',
        };
      }

      // ─── Log Activity ─────────────────────────────────────
      case 'log_activity': {
        const lead = data.leadName
          ? await this.findLeadByName(data.leadName, orgId)
          : null;

        if (!lead) {
          return {
            success: false,
            intent,
            spokenResponse: `I couldn't find a lead named "${data.leadName}" to log the activity.`,
            parsedData: data,
          };
        }

        // Map voice activity types to valid ActivityType enum values
        const activityTypeMap: Record<string, string> = {
          'CALL': 'CALL', 'TEXT': 'SMS', 'SMS': 'SMS', 'EMAIL': 'EMAIL',
          'VISIT': 'MEETING', 'MEETING': 'MEETING', 'NOTE': 'NOTE',
        };
        const actType = activityTypeMap[(data.activityType || 'NOTE').toUpperCase()] || 'NOTE';

        await prisma.activity.create({
          data: {
            leadId: lead.id,
            userId,
            type: actType as any,
            description: data.description || 'Logged via voice command',
            outcome: data.outcome || undefined,
          },
        });

        // Update last contacted
        await prisma.lead.update({
          where: { id: lead.id },
          data: { lastContactedAt: new Date() },
        });

        return {
          success: true,
          intent,
          spokenResponse: spokenResponse || `${data.activityType || 'Activity'} logged for ${lead.firstName} ${lead.lastName}.`,
          parsedData: data,
          createdId: lead.id,
          navigateTo: `/leads/${lead.id}`,
        };
      }

      // ─── Add Follow-Up ────────────────────────────────────
      case 'add_follow_up': {
        const lead = data.leadName
          ? await this.findLeadByName(data.leadName, orgId)
          : null;

        if (!lead) {
          return {
            success: false,
            intent,
            spokenResponse: `I couldn't find a lead named "${data.leadName}".`,
            parsedData: data,
          };
        }

        const followUpDate = data.followUpDate ? new Date(data.followUpDate) : new Date(Date.now() + 86400000);

        await prisma.activity.create({
          data: {
            leadId: lead.id,
            userId,
            type: 'NOTE',
            description: `Follow-up scheduled: ${data.reason || 'Voice command follow-up'}`,
            outcome: `Due: ${followUpDate.toLocaleDateString()}`,
          },
        });

        return {
          success: true,
          intent,
          spokenResponse: spokenResponse || `Follow-up reminder set for ${lead.firstName} ${lead.lastName} on ${followUpDate.toLocaleDateString()}.`,
          parsedData: data,
          createdId: lead.id,
          navigateTo: `/leads/${lead.id}`,
        };
      }

      // ─── Start Recording ──────────────────────────────────
      case 'start_recording':
        return {
          success: true,
          intent,
          spokenResponse: "Recording started. I'll save the transcript when you stop.",
          parsedData: data,
          navigateTo: '/field?tab=notes',
        };

      // ─── Get Directions ───────────────────────────────────
      case 'get_directions': {
        const lead = data.leadName
          ? await this.findLeadByName(data.leadName, orgId)
          : null;

        if (!lead || !lead.address) {
          return {
            success: false,
            intent,
            spokenResponse: `I couldn't find an address for "${data.leadName}".`,
            parsedData: data,
          };
        }

        const address = `${lead.address}, ${lead.city || ''}, LA ${lead.zip || ''}`;
        return {
          success: true,
          intent,
          spokenResponse: spokenResponse || `Opening directions to ${lead.firstName} ${lead.lastName}'s home.`,
          parsedData: { ...data, address, leadId: lead.id },
          navigateTo: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
        };
      }

      // ─── Unknown ──────────────────────────────────────────
      default:
        return {
          success: false,
          intent: 'unknown',
          spokenResponse: spokenResponse || "I'm not sure what you'd like me to do. Try saying something like 'Create an appointment with John Smith for tomorrow at 2 PM' or 'Add a note to Sarah Johnson'.",
          parsedData: data,
        };
    }
  }

  /**
   * Fuzzy-match a lead by first+last name within the organization
   */
  private async findLeadByName(name: string, orgId: string) {
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    // Try exact match first
    let lead = await prisma.lead.findFirst({
      where: {
        organizationId: orgId,
        firstName: { equals: firstName, mode: 'insensitive' },
        ...(lastName && { lastName: { equals: lastName, mode: 'insensitive' } }),
      },
      select: {
        id: true, firstName: true, lastName: true, phone: true,
        address: true, city: true, zip: true, status: true,
      },
    });

    if (lead) return lead;

    // Fallback: contains match
    lead = await prisma.lead.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          {
            firstName: { contains: firstName, mode: 'insensitive' },
            ...(lastName && { lastName: { contains: lastName, mode: 'insensitive' } }),
          },
          { lastName: { contains: name, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, firstName: true, lastName: true, phone: true,
        address: true, city: true, zip: true, status: true,
      },
    });

    return lead;
  }

  /**
   * Parse date and time strings into a Date object, handling relative dates
   */
  private parseDateTime(dateStr?: string, timeStr?: string): Date {
    const now = new Date();

    let date: Date;
    if (!dateStr || dateStr === 'today') {
      date = new Date(now);
    } else if (dateStr === 'tomorrow') {
      date = new Date(now.getTime() + 86400000);
    } else {
      date = new Date(dateStr);
      if (isNaN(date.getTime())) date = new Date(now);
    }

    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (!isNaN(hours)) date.setHours(hours, minutes || 0, 0, 0);
    }

    return date;
  }
}

export const voiceCommandService = new VoiceCommandService();
