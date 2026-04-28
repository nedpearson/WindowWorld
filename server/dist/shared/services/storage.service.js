"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const logger_1 = require("../utils/logger");
const isS3Enabled = !!process.env.S3_BUCKET_NAME;
const s3Client = isS3Enabled ? new client_s3_1.S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT, // e.g., Cloudflare R2 endpoint
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
}) : null;
/**
 * Validate that the resolved file path stays within the allowed upload directory.
 * Prevents path traversal attacks when writing user-supplied filenames to disk.
 * (CodeQL: js/path-injection / network-data-written-to-file)
 */
function assertSafePath(resolvedPath, uploadDir) {
    const normalizedBase = path_1.default.resolve(uploadDir);
    const normalizedTarget = path_1.default.resolve(resolvedPath);
    if (!normalizedTarget.startsWith(normalizedBase + path_1.default.sep) && normalizedTarget !== normalizedBase) {
        throw new Error('Unsafe file path: path traversal detected.');
    }
}
class StorageService {
    /**
     * Uploads a file buffer to S3 or writes it locally if S3 is disabled.
     * Returns the public URL or presigned URL structure.
     */
    async upload(buffer, originalName, mimeType, isPublic = true) {
        // Generate a server-controlled key — never use originalName directly in the path
        // to prevent path traversal via crafted filenames (CodeQL: js/path-injection)
        const ext = path_1.default.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
        const safeExt = /^\.[a-zA-Z0-9]{1,8}$/.test(ext) ? ext : '';
        const key = `uploads/${crypto_1.default.randomUUID()}${safeExt}`;
        if (isS3Enabled && s3Client && process.env.S3_BUCKET_NAME) {
            try {
                await s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: key,
                    Body: buffer,
                    ContentType: mimeType,
                }));
                if (process.env.S3_PUBLIC_URL_PREFIX) {
                    return { url: `${process.env.S3_PUBLIC_URL_PREFIX}/${key}`, s3Key: key };
                }
                const command = new client_s3_1.GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key });
                const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 3600 * 24 * 7 });
                return { url, s3Key: key };
            }
            catch (err) {
                logger_1.logger.error(`Failed to upload to S3: ${String(err.message).slice(0, 200)}`);
                throw new Error('Cloud storage upload failed.');
            }
        }
        // Local Disk Fallback
        // SECURITY: use only the UUID-based key (server-controlled), never trust originalName for path
        const uploadDir = path_1.default.resolve(process.env.UPLOAD_DIR || './uploads');
        const fileName = path_1.default.basename(key); // strips any directory components
        const localPath = path_1.default.join(uploadDir, fileName);
        // Verify the resolved path stays within uploadDir (defence-in-depth)
        assertSafePath(localPath, uploadDir);
        try {
            await promises_1.default.mkdir(uploadDir, { recursive: true });
            await promises_1.default.writeFile(localPath, buffer);
            return { url: `/${key}` };
        }
        catch (err) {
            logger_1.logger.error(`Failed to write local file: ${String(err.message).slice(0, 200)}`);
            throw new Error('Local file upload failed.');
        }
    }
    /**
     * Deletes a file from S3 or local disk.
     */
    async delete(s3KeyOrUrl, localPath) {
        if (isS3Enabled && s3Client && process.env.S3_BUCKET_NAME && s3KeyOrUrl && !s3KeyOrUrl.startsWith('/')) {
            const key = s3KeyOrUrl.split('?')[0].split('/').pop();
            try {
                await s3Client.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: s3KeyOrUrl.includes('/') ? `uploads/${key}` : s3KeyOrUrl,
                }));
            }
            catch (err) {
                logger_1.logger.warn(`Failed to delete S3 object: ${String(err.message).slice(0, 200)}`);
            }
        }
        else if (localPath) {
            // Validate the local deletion path is within the upload dir
            const uploadDir = path_1.default.resolve(process.env.UPLOAD_DIR || './uploads');
            try {
                assertSafePath(localPath, uploadDir);
                await promises_1.default.unlink(localPath);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    logger_1.logger.warn(`Failed to delete local file: ${(0, logger_1.sanitizeForLog)(err.message)}`);
                }
            }
        }
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
//# sourceMappingURL=storage.service.js.map