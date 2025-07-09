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
    size: number;
    contentType?: string;
    metadata?: Record<string, string>;
}
export declare class StorageService {
    private storage;
    private bucket;
    private static instance;
    private constructor();
    static getInstance(): StorageService;
    uploadFile(buffer: Buffer, filename: string, options?: IUploadOptions): Promise<IFileInfo>;
    uploadMultipleFiles(files: Array<{
        buffer: Buffer;
        filename: string;
    }>, options?: IUploadOptions): Promise<IFileInfo[]>;
    deleteFile(filename: string): Promise<void>;
    deleteMultipleFiles(filenames: string[]): Promise<void>;
    getSignedUrl(filename: string, expiresIn?: number): Promise<string>;
    fileExists(filename: string): Promise<boolean>;
    getFileMetadata(filename: string): Promise<IFileInfo | null>;
    moveFile(oldPath: string, newPath: string): Promise<void>;
    copyFile(sourcePath: string, destinationPath: string): Promise<void>;
    static validateFileType(mimetype: string, allowedTypes: string[]): boolean;
    static validateFileSize(size: number, maxSize: number): boolean;
    static generateUniqueFilename(originalName: string): string;
    static sanitizeFilename(filename: string): string;
}
declare const _default: StorageService;
export default _default;
//# sourceMappingURL=storage.service.d.ts.map