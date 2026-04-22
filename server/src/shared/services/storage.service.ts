import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { logger, sanitizeForLog } from '../utils/logger';

const isS3Enabled = !!process.env.S3_BUCKET_NAME;

const s3Client = isS3Enabled ? new S3Client({
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
function assertSafePath(resolvedPath: string, uploadDir: string): void {
  const normalizedBase = path.resolve(uploadDir);
  const normalizedTarget = path.resolve(resolvedPath);
  if (!normalizedTarget.startsWith(normalizedBase + path.sep) && normalizedTarget !== normalizedBase) {
    throw new Error('Unsafe file path: path traversal detected.');
  }
}

export class StorageService {
  /**
   * Uploads a file buffer to S3 or writes it locally if S3 is disabled.
   * Returns the public URL or presigned URL structure.
   */
  async upload(buffer: Buffer, originalName: string, mimeType: string, isPublic = true): Promise<{ url: string; s3Key?: string }> {
    // Generate a server-controlled key — never use originalName directly in the path
    // to prevent path traversal via crafted filenames (CodeQL: js/path-injection)
    const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    const safeExt = /^\.[a-zA-Z0-9]{1,8}$/.test(ext) ? ext : '';
    const key = `uploads/${uuidv4()}${safeExt}`;

    if (isS3Enabled && s3Client && process.env.S3_BUCKET_NAME) {
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }));

        if (process.env.S3_PUBLIC_URL_PREFIX) {
          return { url: `${process.env.S3_PUBLIC_URL_PREFIX}/${key}`, s3Key: key };
        }

        const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 * 7 });
        return { url, s3Key: key };
      } catch (err: any) {
        logger.error(`Failed to upload to S3: ${String(err.message).slice(0, 200)}`);
        throw new Error('Cloud storage upload failed.');
      }
    }

    // Local Disk Fallback
    // SECURITY: use only the UUID-based key (server-controlled), never trust originalName for path
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const fileName = path.basename(key); // strips any directory components
    const localPath = path.join(uploadDir, fileName);

    // Verify the resolved path stays within uploadDir (defence-in-depth)
    assertSafePath(localPath, uploadDir);

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(localPath, buffer);
      return { url: `/${key}` };
    } catch (err: any) {
      logger.error(`Failed to write local file: ${String(err.message).slice(0, 200)}`);
      throw new Error('Local file upload failed.');
    }
  }

  /**
   * Deletes a file from S3 or local disk.
   */
  async delete(s3KeyOrUrl: string, localPath?: string): Promise<void> {
    if (isS3Enabled && s3Client && process.env.S3_BUCKET_NAME && s3KeyOrUrl && !s3KeyOrUrl.startsWith('/')) {
      const key = s3KeyOrUrl.split('?')[0].split('/').pop();
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3KeyOrUrl.includes('/') ? `uploads/${key}` : s3KeyOrUrl,
        }));
      } catch (err: any) {
        logger.warn(`Failed to delete S3 object: ${String(err.message).slice(0, 200)}`);
      }
    } else if (localPath) {
      // Validate the local deletion path is within the upload dir
      const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
      try {
        assertSafePath(localPath, uploadDir);
        await fs.unlink(localPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          logger.warn(`Failed to delete local file: ${sanitizeForLog(err.message)}`);
        }
      }
    }
  }
}

export const storageService = new StorageService();
