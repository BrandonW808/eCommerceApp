import { Storage, Bucket, File } from '@google-cloud/storage';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '@config/index';
import { FileUploadError, ExternalServiceError } from '@utils/errors';
import { createLogger } from '@utils/logger';

const logger = createLogger('StorageService');

export interface IUploadOptions {
  folder?: string;
  public?: boolean;
  metadata?: Record<string, string>;
  resumable?: boolean;
  contentType?: string;
}

export interface IFileInfo {
  url: string;
  publicUrl?: string;
  bucket: string;
  name: string;
  size: number | string | undefined;
  contentType?: string;
  metadata?: {
    [key: string]: string | boolean | number | null;
  };
}

export class StorageService {
  private storage: Storage;
  private bucket: Bucket;
  private static instance: StorageService;

  private constructor() {
    this.storage = new Storage({
      projectId: config.gcs.projectId,
      keyFilename: path.resolve(config.gcs.keyFile),
    });

    this.bucket = this.storage.bucket(config.gcs.bucketName);
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload a file to Google Cloud Storage
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    options: IUploadOptions = {},
  ): Promise<IFileInfo> {
    try {
      const {
        folder = '',
        public: isPublic = config.gcs.publicBucket,
        metadata = {},
        resumable = false,
        contentType = 'application/octet-stream',
      } = options;

      // Generate unique filename
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext);
      const uniqueName = `${nameWithoutExt}-${uuidv4()}${ext}`;
      const filePath = folder ? `${folder}/${uniqueName}` : uniqueName;

      // Create file reference
      const file = this.bucket.file(filePath);

      // Upload file
      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            ...metadata,
            originalName: filename,
            uploadedAt: new Date().toISOString(),
          },
        },
        public: isPublic,
        resumable,
        validation: 'crc32c',
      });

      // Get file info
      const [fileMetadata] = await file.getMetadata();

      // Generate URLs
      let publicUrl: string | undefined;
      let signedUrl: string;

      if (isPublic) {
        publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;
        signedUrl = publicUrl;
      } else {
        [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      logger.info(`File uploaded successfully: ${filePath}`);

      return {
        url: signedUrl,
        publicUrl,
        bucket: this.bucket.name,
        name: filePath,
        size: fileMetadata.size,
        contentType: fileMetadata.contentType,
        metadata: fileMetadata.metadata,
      };
    } catch (error) {
      logger.error('Failed to upload file:', error);
      throw new ExternalServiceError('Storage', 'Failed to upload file', error);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string }>,
    options: IUploadOptions = {},
  ): Promise<IFileInfo[]> {
    try {
      const uploadPromises = files.map((file) =>
        this.uploadFile(file.buffer, file.filename, options),
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('Failed to upload multiple files:', error);
      throw new ExternalServiceError('Storage', 'Failed to upload files', error);
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const file = this.bucket.file(filename);
      await file.delete();
      logger.info(`File deleted successfully: ${filename}`);
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw new ExternalServiceError('Storage', 'Failed to delete file', error);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(filenames: string[]): Promise<void> {
    try {
      const deletePromises = filenames.map((filename) => this.deleteFile(filename));
      await Promise.all(deletePromises);
      logger.info(`Deleted ${filenames.length} files successfully`);
    } catch (error) {
      logger.error('Failed to delete multiple files:', error);
      throw new ExternalServiceError('Storage', 'Failed to delete files', error);
    }
  }

  /**
   * Get a signed URL for a private file
   */
  async getSignedUrl(
    filename: string,
    expiresIn: number = 7 * 24 * 60 * 60 * 1000, // 7 days
  ): Promise<string> {
    try {
      const file = this.bucket.file(filename);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn,
      });
      return url;
    } catch (error) {
      logger.error('Failed to get signed URL:', error);
      throw new ExternalServiceError('Storage', 'Failed to get file URL', error);
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      const file = this.bucket.file(filename);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      logger.error('Failed to check file existence:', error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filename: string): Promise<IFileInfo | null> {
    try {
      const file = this.bucket.file(filename);
      const [exists] = await file.exists();

      if (!exists) {
        return null;
      }

      const [metadata] = await file.getMetadata();
      const isPublic = metadata.metadata?.public === 'true';

      let url: string;
      let publicUrl: string | undefined;

      if (isPublic) {
        publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filename}`;
        url = publicUrl;
      } else {
        [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
      }

      return {
        url,
        publicUrl,
        bucket: this.bucket.name,
        name: filename,
        size: metadata.size,
        contentType: metadata.contentType,
        metadata: metadata.metadata,
      };
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw new ExternalServiceError('Storage', 'Failed to get file info', error);
    }
  }

  /**
   * Move/rename a file
   */
  async moveFile(oldPath: string, newPath: string): Promise<void> {
    try {
      const file = this.bucket.file(oldPath);
      await file.move(newPath);
      logger.info(`File moved from ${oldPath} to ${newPath}`);
    } catch (error) {
      logger.error('Failed to move file:', error);
      throw new ExternalServiceError('Storage', 'Failed to move file', error);
    }
  }

  /**
   * Copy a file
   */
  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const file = this.bucket.file(sourcePath);
      await file.copy(destinationPath);
      logger.info(`File copied from ${sourcePath} to ${destinationPath}`);
    } catch (error) {
      logger.error('Failed to copy file:', error);
      throw new ExternalServiceError('Storage', 'Failed to copy file', error);
    }
  }

  /**
   * Validate file type
   */
  static validateFileType(mimetype: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimetype);
  }

  /**
   * Validate file size
   */
  static validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }

  /**
   * Generate a unique filename
   */
  static generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    return `${nameWithoutExt}-${uuidv4()}${ext}`;
  }

  /**
   * Clean filename for safe storage
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .toLowerCase();
  }
}

export default StorageService.getInstance();
