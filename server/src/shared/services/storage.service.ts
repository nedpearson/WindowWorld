import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

const isS3Enabled = !!process.env.S3_BUCKET_NAME;

const s3Client = isS3Enabled ? new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT, // e.g., Cloudflare R2 endpoint
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
}) : null;

export class StorageService {
  /**
   * Uploads a file buffer to S3 or writes it locally if S3 is disabled.
   * Returns the public URL or presigned URL structure.
   */
  async upload(buffer: Buffer, originalName: string, mimeType: string, isPublic = true): Promise<{ url: string; s3Key?: string }> {
    const ext = path.extname(originalName);
    const key = `uploads/${uuidv4()}${ext}`;

    if (isS3Enabled && s3Client && process.env.S3_BUCKET_NAME) {
      try {
        await s3Client.send(new PutObjectCommand({
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
        const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 * 7 }); // 7 days
        return { url, s3Key: key };
      } catch (err: any) {
        logger.error(`Failed to upload to S3: ${err.message}`);
        // Fallthrough to local upload if S3 crashes? Or throw
        throw new Error('Cloud storage upload failed.');
      }
    }

    // Local Disk Fallback
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const localPath = path.join(uploadDir, path.basename(key));
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(localPath, buffer);
      return { url: `/${key}` }; // local proxy will catch /uploads/...
    } catch (err: any) {
      logger.error(`Failed to write local file: ${err.message}`);
      throw new Error('Local file upload failed.');
    }
  }

  /**
   * Deletes a file from S3 or local disk.
   */
  async delete(s3KeyOrUrl: string, localPath?: string): Promise<void> {
    if (isS3Enabled && s3Client && process.env.S3_BUCKET_NAME && s3KeyOrUrl && !s3KeyOrUrl.startsWith('/')) {
      const key = s3KeyOrUrl.split('?')[0].split('/').pop(); // naive parse keys out of urls if needed
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3KeyOrUrl.includes('/') ? `uploads/${key}` : s3KeyOrUrl,
        }));
      } catch (err: any) {
        logger.warn(`Failed to delete S3 object: ${err.message}`);
      }
    } else if (localPath) {
      try {
        await fs.unlink(localPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          logger.warn(`Failed to delete local object at ${localPath}: ${err.message}`);
        }
      }
    }
  }
}

export const storageService = new StorageService();
