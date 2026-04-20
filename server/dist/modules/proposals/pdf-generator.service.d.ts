/**
 * PDF generation service for proposals.
 * Uses HTMLTemplate â†’ Puppeteer when available, falls back to text dump.
 */
export declare class PdfGeneratorService {
    private readonly outputDir;
    constructor();
    generate(proposal: any): Promise<string>;
    private buildHtml;
}
export declare const pdfGeneratorService: PdfGeneratorService;
//# sourceMappingURL=pdf-generator.service.d.ts.map