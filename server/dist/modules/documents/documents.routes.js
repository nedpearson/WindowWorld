"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../../shared/middleware/auth");
const documents_service_1 = require("./documents.service");
const storage_service_1 = require("../../shared/services/storage.service");
// ─── Multer memory storage for Cloud Upload ───
const storage = multer_1.default.memoryStorage();
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            // Explicit rejection with a typed MulterError (v2 compatible)
            cb(new multer_1.default.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        }
    },
});
const router = (0, express_1.Router)();
exports.documentsRouter = router;
// GET /api/v1/documents – query by leadId/propertyId/openingId/inspectionId/type
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await documents_service_1.documentsService.list(req.query);
    res.json({ success: true, data });
});
// GET /api/v1/documents/:id
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await documents_service_1.documentsService.getById(req.params.id);
    res.json({ success: true, data });
});
// GET /api/v1/documents/:id/url — returns the document's view URL (pre-signed if S3, direct if local)
router.get('/:id/url', auth_1.auth.repOrAbove, async (req, res) => {
    const doc = await documents_service_1.documentsService.getById(req.params.id);
    // For local files, return the static path; for S3 the URL is already stored
    const url = doc.url;
    res.json({ success: true, data: { url, documentId: doc.id, filename: doc.originalName } });
});
// POST /api/v1/documents/:id/analyze-window — manually trigger AI window analysis on an existing document
router.post('/:id/analyze-window', auth_1.auth.repOrAbove, async (req, res) => {
    const result = await documents_service_1.documentsService.retriggerAiAnalysis(req.params.id);
    res.json({ success: true, data: result });
});
// POST /api/v1/documents/upload – multipart form upload
router.post('/upload', auth_1.auth.repOrAbove, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
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
}, async (req, res) => {
    const user = req.user;
    const file = req.file;
    if (!file) {
        res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
        return;
    }
    const { leadId, propertyId, openingId, inspectionId, type, notes } = req.body;
    const triggerAiAnalysis = req.body.triggerAiAnalysis === 'true';
    // Upload to Cloud (or local disk fallback)
    const { url } = await storage_service_1.storageService.upload(file.buffer, file.originalname, file.mimetype);
    const doc = await documents_service_1.documentsService.createFromUpload({
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
router.post('/:id/retrigger-ai', auth_1.auth.repOrAbove, async (req, res) => {
    const result = await documents_service_1.documentsService.retriggerAiAnalysis(req.params.id);
    res.json({ success: true, data: result });
});
// DELETE /api/v1/documents/:id
router.delete('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    await documents_service_1.documentsService.delete(req.params.id, user.id);
    res.json({ success: true, message: 'Document deleted' });
});
//# sourceMappingURL=documents.routes.js.map