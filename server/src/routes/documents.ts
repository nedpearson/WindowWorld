import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

export const documentRoutes = Router();
documentRoutes.use(requireAuth);

// Document registry (mirrors frontend config)
const DOCUMENTS: Record<string, { fileName: string; contentType: string }> = {
  'window_warranty': { fileName: 'AM-WWi-239_Window Warranty Rev 08.24 (1).pdf', contentType: 'application/pdf' },
  'lifetime_warranty': { fileName: 'WW All Inclusive Lifetime Warranty.pdf', contentType: 'application/pdf' },
  'lead_paint_disclosure': { fileName: 'Lead Base Paint Disclosure.pdf', contentType: 'application/pdf' },
  'finance_options': { fileName: 'Finance Options.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

// Serve a reference document by key
documentRoutes.get('/view/:key', (req, res) => {
  const doc = DOCUMENTS[req.params.key];
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Try reference-documents folder (project root)
  const projectRoot = path.resolve(__dirname2, '../../..');
  const filePath = path.join(projectRoot, 'reference-documents', doc.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Document file not found on server', path: filePath });
  }

  res.setHeader('Content-Type', doc.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
  fs.createReadStream(filePath).pipe(res);
});

// Download a reference document
documentRoutes.get('/download/:key', (req, res) => {
  const doc = DOCUMENTS[req.params.key];
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const projectRoot = path.resolve(__dirname2, '../../..');
  const filePath = path.join(projectRoot, 'reference-documents', doc.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Document file not found on server' });
  }

  res.setHeader('Content-Type', doc.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
  fs.createReadStream(filePath).pipe(res);
});

// List all available reference documents
documentRoutes.get('/list', (_req, res) => {
  const projectRoot = path.resolve(__dirname2, '../../..');
  const docs = Object.entries(DOCUMENTS).map(([key, doc]) => {
    const filePath = path.join(projectRoot, 'reference-documents', doc.fileName);
    const exists = fs.existsSync(filePath);
    const size = exists ? fs.statSync(filePath).size : 0;
    return { key, fileName: doc.fileName, contentType: doc.contentType, available: exists, fileSize: size };
  });
  res.json(docs);
});
