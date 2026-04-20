import { prisma } from '../../shared/services/prisma';
import { emailQueue } from '../../jobs';
import { logger } from '../../shared/utils/logger';
import { smsService } from '../../shared/services/sms.service';

// â”€â”€ Campaign Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CAMPAIGN_TEMPLATES = {
  'new-lead-welcome': {
    name: 'New Lead Welcome Sequence',
    description: 'Automated welcome + appointment booking for new leads',
    triggerStatus: 'NEW',
    steps: [
      { step: 1, delayHours: 0,   type: 'EMAIL', subject: 'Welcome to WindowWorld Louisiana â€” Your Free Estimate', templateKey: 'welcome_email' },
      { step: 2, delayHours: 2,   type: 'SMS',   templateKey: 'welcome_sms' },
      { step: 3, delayHours: 24,  type: 'EMAIL', subject: 'Ready to schedule your free window assessment?', templateKey: 'appt_nudge_1' },
      { step: 4, delayHours: 72,  type: 'EMAIL', subject: 'Special offer for {firstName} â€” limited time', templateKey: 'offer_email' },
      { step: 5, delayHours: 144, type: 'SMS',   templateKey: 'final_nudge_sms' },
    ],
  },
  'proposal-sent-followup': {
    name: 'Proposal Follow-up Sequence',
    description: 'Follow-up touches after proposal is sent',
    triggerStatus: 'PROPOSAL_SENT',
    steps: [
      { step: 1, delayHours: 24,  type: 'EMAIL', subject: 'Did you have a chance to review your WindowWorld proposal?', templateKey: 'proposal_followup_1' },
      { step: 2, delayHours: 72,  type: 'SMS',   templateKey: 'proposal_sms_2' },
      { step: 3, delayHours: 120, type: 'EMAIL', subject: 'Questions about your window replacement project?', templateKey: 'proposal_followup_3' },
      { step: 4, delayHours: 168, type: 'EMAIL', subject: 'Final reminder â€” Your WindowWorld proposal expires soon', templateKey: 'proposal_expiry' },
    ],
  },
  'storm-lead-urgency': {
    name: 'Storm Damage Urgency Campaign',
    description: 'High-urgency follow-up for storm-damage leads',
    triggerStatus: 'NEW',
    steps: [
      { step: 1, delayHours: 0,  type: 'EMAIL', subject: 'âš¡ Storm damage assessment â€” we can help ASAP', templateKey: 'storm_welcome' },
      { step: 2, delayHours: 1,  type: 'SMS',   templateKey: 'storm_sms_1' },
      { step: 3, delayHours: 24, type: 'EMAIL', subject: 'Insurance claim windows? WindowWorld handles it', templateKey: 'storm_insurance' },
      { step: 4, delayHours: 48, type: 'SMS',   templateKey: 'storm_sms_2' },
    ],
  },
  'post-install-review': {
    name: 'Post-Installation Review Request',
    description: 'Request reviews and referrals after job completion',
    triggerStatus: 'INSTALLED',
    steps: [
      { step: 1, delayHours: 24,  type: 'EMAIL', subject: 'How are you enjoying your new windows?', templateKey: 'post_install_1' },
      { step: 2, delayHours: 72,  type: 'EMAIL', subject: 'Leave us a Google Review â€” takes 30 seconds!', templateKey: 'review_request' },
      { step: 3, delayHours: 336, type: 'EMAIL', subject: 'Know someone who needs new windows? Earn $100!', templateKey: 'referral_ask' },
    ],
  },
  'no-answer-sequence': {
    name: 'No-Answer Re-Engagement',
    description: 'Automated re-engagement when rep cannot reach lead',
    triggerStatus: null, // Triggered manually
    steps: [
      { step: 1, delayHours: 0,   type: 'SMS',   templateKey: 'no_answer_sms_1' },
      { step: 2, delayHours: 24,  type: 'EMAIL', subject: 'We tried reaching you about your window estimate ðŸ“‹', templateKey: 'no_answer_email_1' },
      { step: 3, delayHours: 72,  type: 'SMS',   templateKey: 'no_answer_sms_2' },
      { step: 4, delayHours: 120, type: 'EMAIL', subject: 'Last attempt â€” your free WindowWorld estimate is ready', templateKey: 'no_answer_final' },
    ],
  },
};

// â”€â”€ Email Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const EMAIL_TEMPLATES: Record<string, (data: any) => { subject?: string; text: string; html: string }> = {
  welcome_email: (d) => ({
    text: `Hi ${d.firstName}!\n\nThank you for reaching out to WindowWorld Louisiana. We're the #1 window replacement company in Louisiana and we'd love to help you upgrade your home.\n\nYour free in-home estimate includes:\nâœ“ Full window inspection by a certified consultant\nâœ“ Detailed written proposal with no hidden fees\nâœ“ Energy efficiency analysis for your home\nâœ“ Financing options starting at just $0 down\n\nReply to this email or call us at (225) 555-0100 to schedule your free estimate.\n\nWarm regards,\n${d.repName}\nWindowWorld Louisiana`,
    html: buildEmailHtml(d, `
      <h2 style="color: #1e40af">Welcome to WindowWorld Louisiana, ${d.firstName}!</h2>
      <p>Thank you for reaching out. We're Louisiana's #1 replacement window company and we'd love to help you upgrade your home.</p>
      <h3 style="color: #334155; margin-top: 20px">Your free estimate includes:</h3>
      <ul style="padding-left: 20px; color: #475569">
        <li>Full window inspection by a certified consultant</li>
        <li>Detailed written proposal with no hidden fees</li>
        <li>Energy efficiency analysis</li>
        <li>Financing options starting at $0 down</li>
      </ul>
      <div style="margin-top: 28px; text-align: center">
        <a href="tel:2255550100" style="background: #1e40af; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700">ðŸ“ž Call to Schedule</a>
      </div>
    `),
  }),

  appt_nudge_1: (d) => ({
    text: `Hi ${d.firstName}, just following up on your window estimate request. Are you available for a free in-home assessment this week?\n\nWe have morning and afternoon slots available. Reply or call (225) 555-0100.\n\n${d.repName} | WindowWorld Louisiana`,
    html: buildEmailHtml(d, `
      <h2 style="color: #1e40af">Ready to schedule, ${d.firstName}?</h2>
      <p>We have free estimate appointments available this week. A certified WindowWorld consultant will come to your home â€” no obligation.</p>
      <p style="margin-top: 16px">The whole assessment takes about 45-60 minutes and you'll leave with a detailed proposal in hand.</p>
      <div style="margin-top: 24px; text-align: center">
        <a href="tel:2255550100" style="background: #1e40af; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700">Schedule My Free Estimate</a>
      </div>
    `),
  }),

  proposal_followup_1: (d) => ({
    text: `Hi ${d.firstName}, I wanted to follow up on the window replacement proposal I sent you. Have you had a chance to review it?\n\nI'm happy to answer any questions or go over the options together. Just reply or call me at any time.\n\n${d.repName} | WindowWorld Louisiana`,
    html: buildEmailHtml(d, `
      <h2 style="color: #1e40af">Following up on your proposal, ${d.firstName}</h2>
      <p>Your WindowWorld proposal is ready for your review. I wanted to check in and see if you had any questions about the pricing, product options, or the installation process.</p>
      <p style="margin-top: 16px; color: #475569"><strong>A few things to keep in mind:</strong></p>
      <ul style="color: #475569; padding-left: 20px">
        <li>Lifetime warranty on all frames and glass</li>
        <li>No-mess installation â€” we're typically done in one day</li>
        <li>Financing options available â€” as low as $0 down</li>
      </ul>
    `),
  }),

  storm_welcome: (d) => ({
    text: `Hi ${d.firstName}, we saw your storm damage inquiry and want to help ASAP. WindowWorld Louisiana specializes in post-storm window replacement and we work directly with insurance companies.\n\nCall us immediately at (225) 555-0100 or reply to schedule your emergency assessment.\n\n${d.repName} | WindowWorld Louisiana`,
    html: buildEmailHtml(d, `
      <h2 style="color: #dc2626">Storm Damage? We Can Help Fast, ${d.firstName}</h2>
      <p>We received your inquiry about storm-damaged windows and we want to help you get your home protected as quickly as possible.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0">
        <strong style="color: #dc2626">We offer:</strong>
        <ul style="color: #7f1d1d; padding-left: 20px; margin-top: 8px">
          <li>Emergency board-up and temporary protection</li>
          <li>Direct insurance claim assistance</li>
          <li>Impact-rated Series 6000 windows (hurricane rated)</li>
          <li>Fast-track installation scheduling</li>
        </ul>
      </div>
      <div style="text-align: center; margin-top: 20px">
        <a href="tel:2255550100" style="background: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700">ðŸ“ž Emergency Line: (225) 555-0100</a>
      </div>
    `),
  }),

  review_request: (d) => ({
    text: `Hi ${d.firstName}! We hope you're loving your new WindowWorld windows.\n\nWould you take 30 seconds to leave us a Google review? It helps our local team tremendously.\n\nhttps://g.page/windowworld-baton-rouge/review\n\nThank you so much!\n${d.repName} | WindowWorld Louisiana`,
    html: buildEmailHtml(d, `
      <h2 style="color: #1e40af">Loving your new windows, ${d.firstName}?</h2>
      <p>We hope your WindowWorld experience has been outstanding. If you're happy with your new windows and our service, would you take 30 seconds to leave us a Google review?</p>
      <p style="color: #475569; margin-top: 12px">It helps us serve more Louisiana homeowners and means a lot to our local team.</p>
      <div style="text-align: center; margin-top: 24px">
        <a href="https://g.page/windowworld-baton-rouge/review" style="background: #16a34a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700">â­ Leave a Google Review</a>
      </div>
    `),
  }),

  referral_ask: (d) => ({
    text: `Hi ${d.firstName}! Do you know anyone who's been thinking about window replacement? When you refer a friend and they sign a contract, we'll send you a $100 thank-you check.\n\nJust have them mention your name when they call.\n\nThank you for being a great customer!\n${d.repName} | WindowWorld Louisiana`,
    html: buildEmailHtml(d, `
      <h2 style="color: #1e40af">Know someone who needs new windows?</h2>
      <p>Our best leads come from happy customers like you, ${d.firstName}! When you refer a friend or neighbor and they sign a WindowWorld contract, we'll send you a <strong style="color: #16a34a">$100 check</strong> as a thank-you.</p>
      <p style="color: #475569; margin-top: 12px">Just have them mention your name when they call or submit an inquiry.</p>
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center">
        <div style="font-size: 32px; font-weight: 900; color: #16a34a">$100</div>
        <div style="color: #166534">per signed referral</div>
      </div>
    `),
  }),
};

// Helper: build branded HTML email wrapper
function buildEmailHtml(data: any, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#1e40af,#1e3a8a);padding:28px 36px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.5px">Window<span style="color:#93c5fd">World</span> <span style="font-size:12px;opacity:0.7">Louisiana</span></div>
    <div style="color:#bfdbfe;font-size:11px;margin-top:4px">Baton Rouge Â· Licensed &amp; Insured</div>
  </div>
  <div style="padding:36px">${body}</div>
  <div style="background:#1e293b;padding:20px 36px;text-align:center">
    <div style="color:#94a3b8;font-size:11px">WindowWorld Louisiana Â· (225) 555-0100 Â· Baton Rouge, LA</div>
    <div style="color:#475569;font-size:10px;margin-top:4px">You received this because you requested a window estimate. <a href="#" style="color:#60a5fa">Unsubscribe</a></div>
  </div>
</div>
</body></html>`;
}

// â”€â”€ SMS Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const SMS_TEMPLATES: Record<string, (data: any) => string> = {
  welcome_sms: (d) => `Hi ${d.firstName}! This is ${d.repName} from WindowWorld Louisiana. Thanks for your inquiry! Reply YES to confirm interest or call (225) 555-0100 to schedule your FREE estimate. We'll make it easy!`,
  final_nudge_sms: (d) => `${d.firstName}, last chance to grab your free WindowWorld estimate before your spot is released. Call/text back anytime. â€“ ${d.repName}`,
  proposal_sms_2: (d) => `Hi ${d.firstName}, just checking â€” did you get a chance to look at your WindowWorld proposal? Happy to answer questions. â€“ ${d.repName} (225) 555-0100`,
  storm_sms_1: (d) => `âš¡ ${d.firstName} â€” WindowWorld here. Storm damage windows? We're fast + work with insurance. Call NOW: (225) 555-0100. â€“ ${d.repName}`,
  storm_sms_2: (d) => `${d.firstName}, still here to help with your storm windows. Limited spring install slots. Call ${d.repName}: (225) 555-0100`,
  no_answer_sms_1: (d) => `Hi ${d.firstName}, this is ${d.repName} from WindowWorld LA. We tried calling about your window estimate â€” is there a better time to reach you?`,
  no_answer_sms_2: (d) => `${d.firstName} â€” ${d.repName} @ WindowWorld here. Your free estimate is ready. Just need 5 min of your time! Reply or call (225) 555-0100.`,
};

// â”€â”€ Campaigns Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class CampaignsService {
  async list(organizationId: string) {
    return prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { leads: true } } } as any,
    });
  }

  async templates() {
    return Object.entries(CAMPAIGN_TEMPLATES).map(([key, t]) => ({
      id: key,
      ...t,
      stepCount: t.steps.length,
    }));
  }

  async enroll(leadId: string, campaignTemplateKey: string, enrolledById: string) {
    const template = (CAMPAIGN_TEMPLATES as any)[campaignTemplateKey];
    if (!template) throw new Error(`Campaign template not found: ${campaignTemplateKey}`);

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { contacts: { where: { isPrimary: true } } } });
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    // Check not already enrolled
    const existing = await (prisma as any).campaignEnrollment?.findFirst({
      where: { leadId, campaign: { templateKey: campaignTemplateKey }, status: 'ACTIVE' },
    });
    if (existing) return { enrolled: false, message: 'Lead already enrolled in this campaign' };

    // Find or create campaign record
    const lead_with_org = await prisma.lead.findUnique({ where: { id: leadId }, select: { organizationId: true } });
    let campaign = await prisma.campaign.findFirst({
      where: { templateKey: campaignTemplateKey, organizationId: lead_with_org!.organizationId } as any,
    });
    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: {
          name: template.name,
          description: template.description,
          templateKey: campaignTemplateKey,
          status: 'ACTIVE',
          organizationId: lead_with_org!.organizationId,
          createdById: enrolledById,
          stepCount: template.steps.length,
        } as any,
      });
    }

    const enrollment = await (prisma as any).campaignEnrollment?.create({
      data: {
        campaignId: campaign.id,
        leadId,
        currentStep: 1,
        status: 'ACTIVE',
        enrolledAt: new Date(),
        enrolledById,
      } as any,
    });

    // Schedule first step immediately
    await this.scheduleNextStep(leadId, campaignTemplateKey, 1, lead);

    logger.info(`Lead ${leadId} enrolled in campaign: ${campaignTemplateKey}`);
    return { enrolled: true, enrollmentId: enrollment.id };
  }

  async executeStep(params: { automationId: string; leadId: string; step: number }) {
    const { leadId, step } = params;

    // Find enrollment
    const enrollment = await (prisma as any).campaignEnrollment?.findFirst({
      where: { leadId, status: 'ACTIVE' },
      include: { campaign: true },
    });
    if (!enrollment) { logger.warn(`No active enrollment for lead ${leadId}`); return; }

    const templateKey = (enrollment?.campaign as any)?.templateKey;
    const template = (CAMPAIGN_TEMPLATES as any)[templateKey];
    if (!template) return;

    const stepConfig = template.steps.find((s: any) => s.step === step);
    if (!stepConfig) return;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { contacts: { where: { isPrimary: true } }, assignedRep: true } as any,
    });
    if (!lead) return;

    const repName = (lead as any).assignedRep ? `${(lead as any).assignedRep.firstName} ${(lead as any).assignedRep.lastName}` : 'Your WindowWorld Rep';
    const primaryContact = (lead.contacts as any[])[0];
    const templateData = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      repName,
      leadId,
    };

    if (stepConfig.type === 'EMAIL') {
      const emailTemplateKey = stepConfig.templateKey;
      const emailTemplate = EMAIL_TEMPLATES[emailTemplateKey];
      if (emailTemplate) {
        const rendered = emailTemplate(templateData);
        const toEmail = primaryContact?.email || (lead as any).email;
        if (toEmail) {
          await emailQueue.add('send-campaign-email', {
            to: toEmail,
            subject: rendered.subject || stepConfig.subject,
            html: rendered.html,
            text: rendered.text,
            leadId,
            type: 'campaign',
          });
          logger.info(`Campaign email queued: ${emailTemplateKey} â†’ ${toEmail}`);
        }
      }
    }

    if (stepConfig.type === 'SMS') {
      const smsTemplate = SMS_TEMPLATES[stepConfig.templateKey];
      if (smsTemplate) {
        const body = smsTemplate(templateData);
        // SMS dispatch via Twilio wrapper
        const phone = primaryContact?.phone || (lead as any).phone;
        if (phone) {
          await smsService.sendSms(phone, body);
        } else {
          logger.warn(`Could not send SMS for lead ${leadId} - no phone number`);
        }
      }
    }

    // Log activity
    await prisma.activity.create({
      data: {
        leadId,
        type: stepConfig.type === 'EMAIL' ? 'EMAIL' : 'SMS',
        title: `Campaign: ${template.name} â€” Step ${step}`,
        description: `${stepConfig.type} sent for campaign step ${step}`,
        userId: (enrollment as any)?.enrolledById,
      } as any,
    });

    // Advance step
    const nextStep = step + 1;
    const nextStepConfig = template.steps.find((s: any) => s.step === nextStep);

    if (nextStepConfig) {
      await (prisma as any).campaignEnrollment?.update({
        where: { id: enrollment.id },
        data: { currentStep: nextStep } as any,
      });
      await this.scheduleNextStep(leadId, templateKey, nextStep, lead);
    } else {
      // Campaign complete
      await (prisma as any).campaignEnrollment?.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', completedAt: new Date() } as any,
      });
      logger.info(`Campaign complete for lead ${leadId}: ${templateKey}`);
    }
  }

  private async scheduleNextStep(leadId: string, templateKey: string, step: number, lead: any) {
    const template = (CAMPAIGN_TEMPLATES as any)[templateKey];
    const stepConfig = template?.steps.find((s: any) => s.step === step);
    if (!stepConfig) return;

    const delayMs = stepConfig.delayHours * 60 * 60 * 1000;

    // Circular import-safe: dynamic import of automationQueue
    const { automationQueue: q } = await import('../../jobs');
    await q.add(`campaign-step-${step}`, {
      automationId: `${templateKey}-step-${step}`,
      leadId,
      step,
    }, {
      delay: delayMs,
    });
  }

  async unenroll(leadId: string, reason?: string) {
    await (prisma as any).campaignEnrollment?.updateMany({
      where: { leadId, status: 'ACTIVE' },
      data: { status: 'UNSUBSCRIBED', unenrolledAt: new Date(), unenrollReason: reason } as any,
    });
  }

  async triggerForStatus(leadId: string, status: string, enrolledById: string) {
    const matching = Object.entries(CAMPAIGN_TEMPLATES)
      .filter(([, t]) => t.triggerStatus === status)
      .map(([key]) => key);

    for (const key of matching) {
      try {
        await this.enroll(leadId, key, enrolledById);
      } catch (err: any) {
        logger.warn(`Auto-enroll campaign failed for ${leadId}/${key}: ${err.message}`);
      }
    }

    return { triggered: matching };
  }
}

export const campaignsService = new CampaignsService();
