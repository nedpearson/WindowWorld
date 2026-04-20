"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
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
class StorageService {
    /**
     * Uploads a file buffer to S3 or writes it locally if S3 is disabled.
     * Returns the public URL or presigned URL structure.
     */
    async upload(buffer, originalName, mimeType, isPublic = true) {
        const ext = path_1.default.extname(originalName);
        const key = `uploads/${(0, uuid_1.v4)()}${ext}`;
        if (isS3Enabled && s3Client && process.env.S3_BUCKET_NAME) {
            try {
                await s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: key,
                    Body: buffer,
                    ContentType: mimeType,
                    // ACL: isPublic ? 'public-read' : 'private', // Not recommended for some S3 compatibles unless explicitly enabled
                }));
                // If there's a custom public CDN URL, use it
                if (process.env.S3_PUBLIC_URL_PREFIX) {
                    return { url: `${process.env.S3_PUBLIC_URL_PREFIX}/${key}`, s3Key: key };
                }
                // As a fallback (if no public URL prefix is given), generate a Presigned URL for demo purposes or use endpoint mapping
                // Cloudflare R2 public buckets usually have a custom URL configured instead.
                const command = new client_s3_1.GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key });
                const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 3600 * 24 * 7 }); // 7 days
                return { url, s3Key: key };
            }
            catch (err) {
                logger_1.logger.error(`Failed to upload to S3: ${err.message}`);
                // Fallthrough to local upload if S3 crashes? Or throw
                throw new Error('Cloud storage upload failed.');
            }
        }
        // Local Disk Fallback
        const uploadDir = path_1.default.resolve(process.env.UPLOAD_DIR || './uploads');
        const localPath = path_1.default.join(uploadDir, path_1.default.basename(key));
        try {
            await promises_1.default.mkdir(uploadDir, { recursive: true });
            await promises_1.default.writeFile(localPath, buffer);
            return { url: `/${key}` }; // local proxy will catch /uploads/...
        }
        catch (err) {
            logger_1.logger.error(`Failed to write local file: ${err.message}`);
            throw new Error('Local file upload failed.');
        }
    }
    /**
     * Deletes a file from S3 or local disk.
     */
    async delete(s3KeyOrUrl, localPath) {
        if (isS3Enabled && s3Client && process.env.S3_BUCKET_NAME && s3KeyOrUrl && !s3KeyOrUrl.startsWith('/')) {
            const key = s3KeyOrUrl.split('?')[0].split('/').pop(); // naive parse keys out of urls if needed
            try {
                await s3Client.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: s3KeyOrUrl.includes('/') ? `uploads/${key}` : s3KeyOrUrl,
                }));
            }
            catch (err) {
                logger_1.logger.warn(`Failed to delete S3 object: ${err.message}`);
            }
        }
        else if (localPath) {
            try {
                await promises_1.default.unlink(localPath);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    logger_1.logger.warn(`Failed to delete local object at ${localPath}: ${err.message}`);
                }
            }
        }
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
//# sourceMappingURL=storage.service.js.map