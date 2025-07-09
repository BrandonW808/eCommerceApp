"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const storage_1 = require("@google-cloud/storage");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const index_1 = __importDefault(require("@config/index"));
const errors_1 = require("@utils/errors");
const logger_1 = require("@utils/logger");
const logger = (0, logger_1.createLogger)('StorageService');
class StorageService {
    storage;
    bucket;
    static instance;
    constructor() {
        this.storage = new storage_1.Storage({
            projectId: index_1.default.gcs.projectId,
            keyFilename: path_1.default.resolve(index_1.default.gcs.keyFile),
        });
        this.bucket = this.storage.bucket(index_1.default.gcs.bucketName);
    }
    static getInstance() {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }
    async uploadFile(buffer, filename, options = {}) {
        try {
            const { folder = '', public: isPublic = index_1.default.gcs.publicBucket, metadata = {}, resumable = false, contentType = 'application/octet-stream', } = options;
            const ext = path_1.default.extname(filename);
            const nameWithoutExt = path_1.default.basename(filename, ext);
            const uniqueName = `${nameWithoutExt}-${(0, uuid_1.v4)()}${ext}`;
            const filePath = folder ? `${folder}/${uniqueName}` : uniqueName;
            const file = this.bucket.file(filePath);
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
            const [fileMetadata] = await file.getMetadata();
            let publicUrl;
            let signedUrl;
            if (isPublic) {
                publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;
                signedUrl = publicUrl;
            }
            else {
                [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
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
        }
        catch (error) {
            logger.error('Failed to upload file:', error);
            throw new errors_1.ExternalServiceError('Storage', 'Failed to upload file', error);
        }
    }
    async uploadMultipleFiles(files, options = {}) {
        try {
            const uploadPromises = files.map((file) => this.uploadFile(file.buffer, file.filename, options));
            return await Promise.all(uploadPromises);
        }
        catch (error) {
            logger.error('Failed to upload multiple files:', error);
            throw new errors_1.ExternalServiceError('Storage', 'Failed to upload files', error);
        }
    }
    async deleteFile(filename) {
        try {
            const file = this.bucket.file(filename);
            await file.delete();
            logger.info(`File deleted successfully: ${filename}`);
        }
        catch (error) {
            logger.error('Failed to delete file:', error);
            throw new errors_1.ExternalServiceError('Storage', 'Failed to delete file', error);
        }
    }
    async deleteMultipleFiles(filenames) {
        try {
            const deletePromises = filenames.map((filename) => this.deleteFile(filename));
            await Promise.all(deletePromises);
            logger.info(`Deleted ${filenames.length} files successfully`);
        }
        catch (error) {
            logger.error('Failed to delete multiple files:', error);
            throw new errors_1.ExternalServiceError('Storage', 'Failed to delete files', error);
        }
    }
    async getSignedUrl(filename, expiresIn = 7 * 24 * 60 * 60 * 1000) {
        try {
            const file = this.bucket.file(filename);
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + expiresIn,
            });
            return url;
        }
        catch (error) {
            logger.error('Failed to get signed URL:', error);
            throw new errors_1.ExternalServiceError('Storage', 'Failed to get file URL', error);
        }
    }
    async fileExists(filename) {
        try {
            const file = this.bucket.file(filename);
            const [exists] = await file.exists();
            return exists;
        }
        catch (error) {
            logger.error('Failed to check file existence:', error);
            return false;
        }
    }
    async getFileMetadata(filename) {
        try {
            const file = this.bucket.file(filename);
            const [exists] = await file.exists();
            if (!exists) {
                return null;
            }
            const [metadata] = await file.getMetadata();
            const isPublic = metadata.metadata?.public === 'true';
            let url;
            let publicUrl;
            if (isPublic) {
                publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filename}`;
                url = publicUrl;
            }
            else {
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
        }
        catch (error) {
            logger.error('Failed to get file metadata:', error);
            throw new errors_1.ExternalServiceError('Storage', 'Failed to get file info', error);
        }
    }
    async moveFile(oldPath, newPath) {
        try {
            const file = this.bucket.file(oldPath);
            await file.move(newPath);
            logger.info(`File moved from ${oldPath} to ${newPath}`);
        }
        catch (error) {
            logger.error('Failed to move file:', error);
            throw new errors_1.ExternalServiceError('Storage', 'Failed to move file', error);
        }
    }
    async copyFile(sourcePath, destinationPath) {
        try {
            const file = this.bucket.file(sourcePath);
            await file.copy(destinationPath);
            logger.info(`File copied from ${sourcePath} to ${destinationPath}`);
        }
        catch (error) {
            logger.error('Failed to copy file:', error);
            throw new errors_1.ExternalServiceError('Storage', 'Failed to copy file', error);
        }
    }
    static validateFileType(mimetype, allowedTypes) {
        return allowedTypes.includes(mimetype);
    }
    static validateFileSize(size, maxSize) {
        return size <= maxSize;
    }
    static generateUniqueFilename(originalName) {
        const ext = path_1.default.extname(originalName);
        const nameWithoutExt = path_1.default.basename(originalName, ext);
        return `${nameWithoutExt}-${(0, uuid_1.v4)()}${ext}`;
    }
    static sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_{2,}/g, '_')
            .toLowerCase();
    }
}
exports.StorageService = StorageService;
exports.default = StorageService.getInstance();
//# sourceMappingURL=storage.service.js.map