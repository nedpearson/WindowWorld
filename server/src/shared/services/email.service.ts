import { logger, sanitizeForLog } from '../utils/logger';

/**
 * Email service — uses Resend when RESEND_API_KEY is set.
 * Falls back to structured console logging so the rest of the
 * app never has to care whether a real provider is configured.
 */

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;          // defaults to org default sender
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

export interface EmailResult {
  id?: string;
  provider: 'resend' | 'mock';
  success: boolean;
  error?: string;
}

// ─── Resend singleton (lazy) ──────────────────────────────────
let _resend: any = null;

function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const { Resend } = require('resend');
  _resend = new Resend(key);
  return _resend;
}

// ─── Default FROM address ────────────────────────────────────
function getFromAddress(from?: string): string {
  return from
    || process.env.EMAIL_FROM
    || 'WindowWorld Louisiana <noreply@windowworldla.com>';
}

// ─── Main send function ───────────────────────────────────────
export async function sendEmail(opts: SendEmailOptions): Promise<EmailResult> {
  const resend = getResend();

  if (!resend) {
    // No provider — log it and return mock success so jobs don't error
    logger.warn('[email] RESEND_API_KEY not set — email not sent (mock)', {
      to: opts.to,
      subject: opts.subject,
    });
    return { provider: 'mock', success: true };
  }

  try {
    const payload: any = {
      from: getFromAddress(opts.from),
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.text && { text: opts.text }),
      ...(opts.replyTo && { reply_to: opts.replyTo }),
      ...(opts.tags && { tags: opts.tags }),
    };

    // Attachments (Resend expects base64 content)
    if (opts.attachments?.length) {
      payload.attachments = opts.attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
      }));
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      logger.error('[email] Resend API error', { error, to: opts.to, subject: opts.subject });
      return { provider: 'resend', success: false, error: error.message };
    }

    logger.info(`[email] Sent via Resend: id=${data?.id} to=${Array.isArray(opts.to) ? opts.to.join(',') : opts.to}`);
    return { provider: 'resend', success: true, id: data?.id };

  } catch (err: any) {
    logger.error('[email] Resend send exception', { message: sanitizeForLog(err.message), to: opts.to });
    return { provider: 'resend', success: false, error: err.message };
  }
}

// ─── Convenience helpers ──────────────────────────────────────

/** Send a proposal to a customer */
export async function sendProposalEmail(opts: {
  to: string;
  customerName: string;
  repName: string;
  repPhone?: string;
  repEmail?: string;
  proposalTitle: string;
  proposalId: string;
  windowCount: number;
  totalAmount: number;
  expiresAt?: string;
  pdfUrl?: string;
  appBaseUrl?: string;
}): Promise<EmailResult> {
  const {
    to, customerName, repName, repPhone, repEmail,
    proposalTitle, proposalId, windowCount, totalAmount,
    expiresAt, pdfUrl, appBaseUrl,
  } = opts;

  const viewUrl = appBaseUrl
    ? `${appBaseUrl}/proposals/${proposalId}`
    : `https://windowworld.bridgebox.ai/proposals/${proposalId}`;

  const formattedTotal = `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  const monthlyEst = `$${Math.round(totalAmount / 60).toLocaleString()}`;
  const expiryText = expiresAt
    ? `Valid until ${new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : 'Valid for 30 days';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your WindowWorld Proposal</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#1e3a8a);padding:40px 48px;text-align:left">
            <div style="font-size:24px;font-weight:900;color:white;letter-spacing:-0.5px">Window<span style="color:#93c5fd">World</span> <span style="font-size:14px;opacity:0.7">Louisiana</span></div>
            <div style="color:#bfdbfe;font-size:13px;margin-top:8px">Serving Baton Rouge &amp; All Louisiana Parishes</div>
            <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:16px;margin-top:24px">
              <div style="color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Your Proposal Is Ready</div>
              <div style="color:white;font-size:20px;font-weight:700;margin-top:4px">${proposalTitle}</div>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 48px">
            <p style="color:#374151;font-size:16px;margin:0 0 8px">Hi ${customerName},</p>
            <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 24px">
              Your personalized window replacement proposal is ready. ${repName} has put together a detailed quote covering all ${windowCount} window openings at your home.
            </p>

            <!-- Stats row -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td width="33%" style="text-align:center;padding:16px;background:#f8fafc;border-radius:8px" align="center">
                  <div style="font-size:28px;font-weight:900;color:#1e40af">${windowCount}</div>
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600">Windows</div>
                </td>
                <td width="4%"></td>
                <td width="29%" style="text-align:center;padding:16px;background:#f8fafc;border-radius:8px" align="center">
                  <div style="font-size:28px;font-weight:900;color:#1e40af">${formattedTotal}</div>
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600">Total</div>
                </td>
                <td width="4%"></td>
                <td width="30%" style="text-align:center;padding:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px" align="center">
                  <div style="font-size:28px;font-weight:900;color:#16a34a">${monthlyEst}/mo</div>
                  <div style="font-size:11px;color:#4ade80;text-transform:uppercase;font-weight:600">Est. Financing</div>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;margin:32px 0">
              <a href="${viewUrl}" style="background:#1e40af;color:white;padding:16px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">
                View Your Proposal →
              </a>
              ${pdfUrl ? `<br><a href="${pdfUrl}" style="color:#1e40af;font-size:13px;margin-top:12px;display:inline-block;text-decoration:underline">Download PDF version</a>` : ''}
            </div>

            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0 0 32px">${expiryText}</p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">

            <!-- Rep info -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:13px;color:#374151;font-weight:600">${repName}</div>
                  <div style="font-size:12px;color:#6b7280">WindowWorld Louisiana Sales Consultant</div>
                  ${repPhone ? `<div style="font-size:12px;color:#1e40af;margin-top:4px">${repPhone}</div>` : ''}
                  ${repEmail ? `<div style="font-size:12px;color:#1e40af">${repEmail}</div>` : ''}
                </td>
                <td align="right">
                  <div style="font-size:11px;color:#9ca3af">Questions? Reply to this email<br>or call your representative directly.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1e293b;padding:20px 48px;text-align:center">
            <div style="color:#94a3b8;font-size:11px">WindowWorld of Louisiana · Licensed &amp; Insured · Serving All Parishes</div>
            <div style="color:#64748b;font-size:10px;margin-top:4px">This email was sent by your WindowWorld sales representative.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${customerName},

Your WindowWorld proposal is ready: "${proposalTitle}"

- ${windowCount} windows
- Total: ${formattedTotal}
- Estimated financing: ${monthlyEst}/month

View proposal: ${viewUrl}
${pdfUrl ? `Download PDF: ${pdfUrl}` : ''}

${expiryText}

${repName}
WindowWorld Louisiana
${repPhone || ''}
`;

  return sendEmail({
    to,
    subject: `Your WindowWorld Proposal — ${proposalTitle}`,
    html,
    text,
    replyTo: repEmail,
    tags: [{ name: 'type', value: 'proposal' }],
  });
}

/** Send appointment confirmation to customer */
export async function sendAppointmentConfirmation(opts: {
  to: string;
  customerName: string;
  repName: string;
  repPhone?: string;
  appointmentDate: string;
  appointmentTime: string;
  address?: string;
  duration?: number;
}): Promise<EmailResult> {
  const { to, customerName, repName, repPhone, appointmentDate, appointmentTime, address, duration } = opts;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Appointment Confirmed</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#1e3a8a);padding:40px 48px">
            <div style="font-size:24px;font-weight:900;color:white">Window<span style="color:#93c5fd">World</span></div>
            <div style="color:white;font-size:20px;font-weight:700;margin-top:20px">✅ Appointment Confirmed</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px">
            <p style="color:#374151;font-size:16px;margin:0 0 20px">Hi ${customerName},</p>
            <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 28px">
              Your free WindowWorld estimate appointment is confirmed. Here are your details:
            </p>
            <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:28px">
              <tr><td style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Date</td><td style="font-size:14px;color:#1e293b;font-weight:600">${appointmentDate}</td></tr>
              <tr><td style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Time</td><td style="font-size:14px;color:#1e293b;font-weight:600">${appointmentTime}${duration ? ` (approx. ${duration} min)` : ''}</td></tr>
              ${address ? `<tr><td style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Location</td><td style="font-size:14px;color:#1e293b">${address}</td></tr>` : ''}
              <tr><td style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Consultant</td><td style="font-size:14px;color:#1e293b">${repName}${repPhone ? ` · ${repPhone}` : ''}</td></tr>
            </table>
            <p style="color:#6b7280;font-size:13px;line-height:1.7">
              We'll call you 30 minutes before arrival. If you need to reschedule, please call us at least 2 hours before your appointment.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#1e293b;padding:20px 48px;text-align:center">
            <div style="color:#94a3b8;font-size:11px">WindowWorld of Louisiana · Licensed &amp; Insured</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `Appointment Confirmed — WindowWorld Free Estimate ${appointmentDate}`,
    html,
    tags: [{ name: 'type', value: 'appointment_confirmation' }],
  });
}

/** Send invoice to customer */
export async function sendInvoiceEmail(opts: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  grandTotal: number;
  depositAmount?: number;
  dueDate?: string;
  pdfUrl?: string;
  repName?: string;
}): Promise<EmailResult> {
  const { to, customerName, invoiceNumber, grandTotal, depositAmount, dueDate, pdfUrl, repName } = opts;
  const formattedTotal = `$${grandTotal.toLocaleString()}`;
  const depositText = depositAmount ? `$${depositAmount.toLocaleString()} deposit due at signing` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Invoice ${invoiceNumber}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#1e3a8a);padding:40px 48px">
            <div style="font-size:24px;font-weight:900;color:white">Window<span style="color:#93c5fd">World</span></div>
            <div style="color:white;font-size:20px;font-weight:700;margin-top:20px">Invoice ${invoiceNumber}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px">
            <p style="color:#374151;font-size:16px;margin:0 0 20px">Hi ${customerName},</p>
            <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 28px">
              Your WindowWorld invoice is attached. Here's a summary:
            </p>
            <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:28px">
              <tr><td style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Invoice #</td><td style="font-size:15px;color:#1e293b;font-weight:700">${invoiceNumber}</td></tr>
              <tr><td style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Total</td><td style="font-size:20px;color:#1e40af;font-weight:900">${formattedTotal}</td></tr>
              ${depositText ? `<tr><td style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Deposit</td><td style="font-size:14px;color:#16a34a;font-weight:600">${depositText}</td></tr>` : ''}
              ${dueDate ? `<tr><td style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase">Due Date</td><td style="font-size:14px;color:#1e293b">${new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>` : ''}
            </table>
            ${pdfUrl ? `<div style="text-align:center;margin:28px 0"><a href="${pdfUrl}" style="background:#1e40af;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Download Invoice PDF</a></div>` : ''}
            <p style="color:#6b7280;font-size:13px">Questions? Contact ${repName || 'your representative'} or reply to this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#1e293b;padding:20px 48px;text-align:center">
            <div style="color:#94a3b8;font-size:11px">WindowWorld of Louisiana · Licensed &amp; Insured</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} — WindowWorld Louisiana`,
    html,
    tags: [{ name: 'type', value: 'invoice' }],
  });
}
