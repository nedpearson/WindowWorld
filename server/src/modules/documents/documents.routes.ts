import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { documentsService } from './documents.service';
import { storageService } from '../../shared/services/storage.service';

// ─── Multer memory storage for Cloud Upload ───
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Explicit rejection with a typed MulterError (v2 compatible)
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
  },
});

const router = Router();

// GET /api/v1/documents – query by leadId/propertyId/openingId/inspectionId/type
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await documentsService.list(req.query as any);
  res.json({ success: true, data });
});

// GET /api/v1/documents/:id
router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await documentsService.getById((req.params.id as string));
  res.json({ success: true, data });
});

// GET /api/v1/documents/:id/url — returns the document's view URL (pre-signed if S3, direct if local)
router.get('/:id/url', auth.repOrAbove, async (req: Request, res: Response) => {
  const doc = await documentsService.getById(req.params.id as string);
  // For local files, return the static path; for S3 the URL is already stored
  const url = doc.url;
  res.json({ success: true, data: { url, documentId: doc.id, filename: doc.originalName } });
});

// POST /api/v1/documents/:id/analyze-window — manually trigger AI window analysis on an existing document
router.post('/:id/analyze-window', auth.repOrAbove, async (req: Request, res: Response) => {
  const result = await documentsService.retriggerAiAnalysis(req.params.id as string);
  res.json({ success: true, data: result });
});

// POST /api/v1/documents/upload – multipart form upload
router.post('/upload', auth.repOrAbove, (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 415;
      res.status(status).json({ success: false, error: { message: err.message, code: err.code } });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
    return;
  }

  const { leadId, propertyId, openingId, inspectionId, type, notes } = req.body;
  const triggerAiAnalysis = req.body.triggerAiAnalysis === 'true';

  // Upload to Cloud (or local disk fallback)
  const { url } = await storageService.upload(file.buffer, file.originalname, file.mimetype);

  const doc = await documentsService.createFromUpload({
    filename: file.originalname, // use original name here since unique ID is handled in StorageService
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url,
    localPath: undefined, // Cloud handles this now
    type: type || 'PHOTO_EXTERIOR',
    leadId, propertyId, openingId, inspectionId,
    uploadedById: user.id,
    triggerAiAnalysis: triggerAiAnalysis || ['PHOTO_EXTERIOR', 'PHOTO_INTERIOR'].includes(type),
    notes,
  });

  res.status(201).json({ success: true, data: doc });
});

// POST /api/v1/documents/:id/retrigger-ai — alias kept for backwards compatibility
router.post('/:id/retrigger-ai', auth.repOrAbove, async (req: Request, res: Response) => {
  const result = await documentsService.retriggerAiAnalysis((req.params.id as string));
  res.json({ success: true, data: result });
});

// DELETE /api/v1/documents/:id
router.delete('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await documentsService.delete((req.params.id as string), user.id);
  res.json({ success: true, message: 'Document deleted' });
});

export { router as documentsRouter };
