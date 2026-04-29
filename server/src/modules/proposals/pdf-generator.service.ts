import path from 'path';
import fs from 'fs';
import { logger, sanitizeForLog } from '../../shared/utils/logger';

/**
 * PDF generation service for proposals.
 * Uses HTMLTemplate â†’ Puppeteer when available, falls back to text dump.
 */
export class PdfGeneratorService {
  private readonly outputDir: string;

  constructor() {
    this.outputDir = process.env.PDF_OUTPUT_DIR || path.join(process.cwd(), 'pdfs');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generate(proposal: any): Promise<string> {
    const filename = `proposal-${proposal.id}-${Date.now()}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    const html = this.buildHtml(proposal);

    try {
      // Try puppeteer first
      const puppeteer = await import('puppeteer').catch(() => null);
      if (puppeteer) {
        const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({
          path: outputPath,
          format: 'Letter',
          margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
          printBackground: true,
        });
        await browser.close();
        logger.info(`PDF generated via Puppeteer: ${outputPath}`);
        return outputPath;
      }
    } catch (err: any) {
      logger.warn(`Puppeteer unavailable: ${sanitizeForLog(err.message)} â€” falling back to HTML file`);
    }

    // Fallback: save as HTML
    const htmlPath = outputPath.replace('.pdf', '.html');
    fs.writeFileSync(htmlPath, html);
    logger.info(`Proposal HTML written (PDF unavailable): ${htmlPath}`);
    return htmlPath;
  }

  private buildHtml(proposal: any): string {
    const lead = proposal.lead || {};
    const quote = proposal.quote || {};
    const lineItems: any[] = (quote.lineItems as any[]) || [];
    const rep = proposal.createdBy || {};
    const expiresAt = proposal.expiresAt ? new Date(proposal.expiresAt).toLocaleDateString() : 'N/A';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const lineItemRows = lineItems.map((item: any) => `
      <tr>
        <td>${item.roomLabel || 'â€”'}</td>
        <td>${item.windowType?.replace(/_/g, ' ') || 'â€”'}</td>
        <td>${item.productName || item.productSeriesId || 'â€”'}</td>
        <td style="font-family: monospace">${item.widthInches || '?'}" Ã— ${item.heightInches || '?'}"</td>
        <td style="text-align: center">${item.quantity || 1}</td>
        <td style="text-align: right">$${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="text-align: right; font-weight: 600">$${(item.lineTotal || 0).toFixed(2)}</td>
        ${item.isAiEstimated ? '<td style="color: #d97706; font-size: 10px">âš  AI Est.</td>' : '<td style="color: #10b981; font-size: 10px">âœ“ Verified</td>'}
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>WindowWorld Proposal â€” ${lead.firstName} ${lead.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; font-size: 11pt; line-height: 1.5; }
  .header { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 40px 48px; display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { font-size: 22pt; font-weight: 900; letter-spacing: -0.5px; }
  .logo span { color: #93c5fd; }
  .header-meta { text-align: right; font-size: 9pt; opacity: 0.85; }
  .content { padding: 40px 48px; }
  section { margin-bottom: 32px; }
  h2 { font-size: 14pt; font-weight: 700; color: #1e40af; border-bottom: 2px solid #dbeafe; padding-bottom: 6px; margin-bottom: 16px; }
  h3 { font-size: 11pt; font-weight: 600; color: #334155; margin-bottom: 8px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .info-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .info-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 2px; }
  .info-value { font-size: 11pt; color: #1e293b; }
  .intro-text { color: #475569; line-height: 1.7; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #1e40af; color: white; padding: 8px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  .totals-table { width: 360px; margin-left: auto; }
  .totals-table td { font-size: 10.5pt; }
  .grand-total td { font-size: 14pt; font-weight: 800; color: #1e40af; border-top: 2px solid #1e40af; }
  .financing-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; text-align: center; }
  .financing-box .amount { font-size: 28pt; font-weight: 900; color: #16a34a; }
  .financing-box .label { font-size: 9pt; color: #4ade80; }
  .warranty-list { list-style: none; }
  .warranty-list li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 10pt; color: #475569; }
  .warranty-list li::before { content: "âœ“"; color: #16a34a; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .disclaimer { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 14px 18px; font-size: 9pt; color: #92400e; line-height: 1.6; }
  .footer { background: #1e293b; color: #94a3b8; padding: 24px 48px; font-size: 8.5pt; display: flex; justify-content: space-between; align-items: center; margin-top: 0; }
  .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 7.5pt; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div>
    <div class="logo">Window<span>World</span> <span style="font-size: 12pt; opacity: 0.7">Louisiana</span></div>
    <div style="margin-top: 6px; font-size: 9.5pt; opacity: 0.8">Serving Baton Rouge &amp; All Louisiana Parishes</div>
    <div style="margin-top: 16px; font-size: 11pt; font-weight: 600">Home Window Replacement Proposal</div>
  </div>
  <div class="header-meta">
    <div><strong>Date:</strong> ${today}</div>
    <div><strong>Valid Until:</strong> ${expiresAt}</div>
    <div style="margin-top: 8px"><strong>Prepared by:</strong> ${rep.firstName || ''} ${rep.lastName || ''}</div>
    ${rep.phone ? `<div>${rep.phone}</div>` : ''}
    ${rep.email ? `<div>${rep.email}</div>` : ''}
  </div>
</div>

<!-- Content -->
<div class="content">

  <!-- Customer + Property -->
  <section>
    <div class="two-col">
      <div class="info-block">
        <div class="info-label">Prepared For</div>
        <div class="info-value" style="font-size: 14pt; font-weight: 700; margin-bottom: 4px">${lead.firstName || ''} ${lead.lastName || ''}</div>
        <div>${lead.address || ''}</div>
        <div>${lead.city || ''}, Louisiana ${lead.zip || ''}</div>
        ${lead.phone ? `<div style="margin-top: 8px; color: #64748b">${lead.phone}</div>` : ''}
      </div>
      <div class="info-block">
        <div class="info-label">Project Overview</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><div class="info-label">Windows</div><div class="info-value" style="font-size: 16pt; font-weight: 800; color: #1e40af">${quote.totalWindows || lineItems.length}</div></div>
          <div><div class="info-label">Investment</div><div class="info-value" style="font-size: 16pt; font-weight: 800; color: #1e40af">$${(quote.grandTotal || 0).toLocaleString()}</div></div>
        </div>
        ${quote.discountPct > 0 ? `<div style="margin-top: 8px" class="badge">Special Discount Applied: ${quote.discountPct}%</div>` : ''}
      </div>
    </div>
  </section>

  <!-- Intro -->
  <section>
    <h2>A Message From Your WindowWorld Representative</h2>
    <p class="intro-text">${proposal.introMessage || 'Thank you for the opportunity to provide this window replacement proposal for your home.'}</p>
  </section>

  <!-- Line Items -->
  <section>
    <h2>Window Replacement Specifications</h2>
    <table>
      <thead>
        <tr>
          <th>Location</th>
          <th>Type</th>
          <th>Product Series</th>
          <th>Dimensions</th>
          <th style="text-align: center">Qty</th>
          <th style="text-align: right">Unit Price</th>
          <th style="text-align: right">Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemRows || `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px">No line items configured</td></tr>`}
      </tbody>
    </table>
    
    ${lineItems.some((i: any) => i.isAiEstimated) ? `
    <div style="margin-top: 10px;" class="disclaimer">
      <strong>âš  AI-Estimated Dimensions Notice:</strong> One or more window measurements marked "AI Est." were generated from photo analysis. 
      These are estimates only. All AI-estimated measurements must be verified by a field technician before 
      placing any manufacturing order. WindowWorld will perform a final field verification before ordering.
    </div>` : ''}
  </section>

  <!-- Totals -->
  <section>
    <div class="two-col">
      <div>
        ${quote.financingOptionId ? `
        <div class="financing-box">
          <div style="font-size: 9pt; color: #166534; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px">Financing Available</div>
          <div class="amount">$${((quote.grandTotal || 0) / 60).toFixed(2)}</div>
          <div class="label">/month (est. 60 months)</div>
          <div style="margin-top: 8px; font-size: 8.5pt; color: #4ade80">Subject to credit approval. Ask your rep for all options.</div>
        </div>` : `
        <div class="info-block">
          <h3>Ask About Financing</h3>
          <p style="font-size: 10pt; color: #475569">Low monthly payments available. 12 &amp; 18-month same-as-cash options. Ask your representative for details.</p>
        </div>`}
      </div>
      <div>
        <table class="totals-table">
          <tr><td>Subtotal</td><td style="text-align: right">$${(quote.subtotal || quote.grandTotal || 0).toLocaleString()}</td></tr>
          ${quote.discountAmount > 0 ? `<tr><td style="color: #16a34a">Discount (${quote.discountPct}%)</td><td style="text-align: right; color: #16a34a">âˆ’$${(quote.discountAmount || 0).toFixed(2)}</td></tr>` : ''}
          ${quote.taxAmount > 0 ? `<tr><td>Tax</td><td style="text-align: right">$${(quote.taxAmount || 0).toFixed(2)}</td></tr>` : ''}
          <tr class="grand-total"><td><strong>Total Investment</strong></td><td style="text-align: right"><strong>$${(quote.grandTotal || 0).toLocaleString()}</strong></td></tr>
        </table>
      </div>
    </div>
  </section>

  <!-- Warranty -->
  <section>
    <h2>Your WindowWorld Warranty Package</h2>
    <ul class="warranty-list">
      ${(Array.isArray(proposal.warrantyHighlights) ? proposal.warrantyHighlights : defaultWarranty).map((w: string) => `<li>${w}</li>`).join('')}
    </ul>
  </section>

  <!-- Legal -->
  <section>
    <div class="disclaimer">
      <strong>Proposal Terms:</strong> This proposal is valid for ${proposal.validDays || 30} days from the date shown above. 
      Pricing is subject to final field measurement verification. AI-estimated measurements are preliminary only. 
      Windows will not be ordered until a licensed WindowWorld installer performs a final on-site measurement verification 
      and the customer signs a purchase agreement. This proposal does not constitute a binding contract. 
      Louisiana contractor license #: [LICENSE NUMBER]. All installations comply with current Louisiana building codes.
    </div>
  </section>
</div>

<!-- Footer -->
<div class="footer">
  <div>
    <div style="font-weight: 700; color: #e2e8f0">WindowWorld of Louisiana</div>
    <div>Baton Rouge, LA Â· Licensed &amp; Insured Â· Serving All Parishes</div>
  </div>
  <div style="text-align: right">
    <div>Questions? Contact: ${rep.phone || rep.email || 'your sales rep'}</div>
    <div style="margin-top: 4px; opacity: 0.6">Document generated ${today}</div>
  </div>
</div>

</body>
</html>`;
  }
}

const defaultWarranty = [
  'Limited Lifetime Warranty on all window frames and glass',
  'Lifetime guarantee against seal failure and moisture intrusion',
  'Lifetime labor warranty on all window installation work',
  'Transferable warranty â€” adds value to your home',
  'Hurricane impact rating available (Series 6000)',
  'Energy StarÂ® certified products',
];

export const pdfGeneratorService = new PdfGeneratorService();
