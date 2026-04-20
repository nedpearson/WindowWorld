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
    from?: string;
    replyTo?: string;
    tags?: Array<{
        name: string;
        value: string;
    }>;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
    }>;
}
export interface EmailResult {
    id?: string;
    provider: 'resend' | 'mock';
    success: boolean;
    error?: string;
}
export declare function sendEmail(opts: SendEmailOptions): Promise<EmailResult>;
/** Send a proposal to a customer */
export declare function sendProposalEmail(opts: {
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
}): Promise<EmailResult>;
/** Send appointment confirmation to customer */
export declare function sendAppointmentConfirmation(opts: {
    to: string;
    customerName: string;
    repName: string;
    repPhone?: string;
    appointmentDate: string;
    appointmentTime: string;
    address?: string;
    duration?: number;
}): Promise<EmailResult>;
/** Send invoice to customer */
export declare function sendInvoiceEmail(opts: {
    to: string;
    customerName: string;
    invoiceNumber: string;
    grandTotal: number;
    depositAmount?: number;
    dueDate?: string;
    pdfUrl?: string;
    repName?: string;
}): Promise<EmailResult>;
//# sourceMappingURL=email.service.d.ts.map