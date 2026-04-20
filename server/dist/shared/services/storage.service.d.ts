export declare class StorageService {
    /**
     * Uploads a file buffer to S3 or writes it locally if S3 is disabled.
     * Returns the public URL or presigned URL structure.
     */
    upload(buffer: Buffer, originalName: string, mimeType: string, isPublic?: boolean): Promise<{
        url: string;
        s3Key?: string;
    }>;
    /**
     * Deletes a file from S3 or local disk.
     */
    delete(s3KeyOrUrl: string, localPath?: string): Promise<void>;
}
export declare const storageService: StorageService;
//# sourceMappingURL=storage.service.d.ts.map