export declare class BackupService {
    private static instance;
    private cronJob;
    private constructor();
    static getInstance(): BackupService;
    initialize(): Promise<void>;
    performBackup(collections?: string[]): Promise<void>;
    private backupCollection;
    private deleteOldBackups;
    restoreFromBackup(collectionName: string, backupDate: string, clearExisting?: boolean): Promise<void>;
    stop(): void;
}
declare const _default: BackupService;
export default _default;
//# sourceMappingURL=backup.service.d.ts.map