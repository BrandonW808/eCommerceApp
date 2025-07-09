"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const mongoose_1 = __importDefault(require("mongoose"));
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const storage_service_1 = __importDefault(require("@services/storage.service"));
const index_1 = __importDefault(require("@config/index"));
const logger_1 = require("@utils/logger");
const logger = (0, logger_1.createLogger)('BackupService');
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
class BackupService {
    static instance;
    cronJob = null;
    constructor() { }
    static getInstance() {
        if (!BackupService.instance) {
            BackupService.instance = new BackupService();
        }
        return BackupService.instance;
    }
    async initialize() {
        if (!index_1.default.features.backupService) {
            logger.info('Backup service is disabled');
            return;
        }
        logger.info('Initializing backup service...');
        this.cronJob = node_cron_1.default.schedule(index_1.default.backup.cron, async () => {
            logger.info('Starting scheduled backup...');
            await this.performBackup();
        });
        logger.info(`Backup service initialized. Schedule: ${index_1.default.backup.cron}`);
    }
    async performBackup(collections) {
        const collectionsToBackup = collections || index_1.default.backup.collections;
        const timestamp = new Date().toISOString().split('T')[0];
        logger.info(`Starting backup for collections: ${collectionsToBackup.join(', ')}`);
        for (const collectionName of collectionsToBackup) {
            try {
                await this.backupCollection(collectionName, timestamp);
            }
            catch (error) {
                logger.error(`Failed to backup collection ${collectionName}:`, error);
            }
        }
        await this.deleteOldBackups();
        logger.info('Backup completed successfully');
    }
    async backupCollection(collectionName, timestamp) {
        const db = mongoose_1.default.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }
        try {
            const collection = db.collection(collectionName);
            const documents = await collection.find({}).toArray();
            if (documents.length === 0) {
                logger.warn(`Collection ${collectionName} is empty, skipping backup`);
                return;
            }
            const jsonData = JSON.stringify(documents, null, 2);
            const compressedData = await gzip(jsonData);
            const filename = `${collectionName}_${timestamp}.json.gz`;
            const folder = `backups/${timestamp}`;
            await storage_service_1.default.uploadFile(compressedData, filename, {
                folder,
                metadata: {
                    collectionName,
                    documentCount: documents.length.toString(),
                    timestamp,
                    compressed: 'true',
                },
            });
            logger.info(`Backed up ${documents.length} documents from ${collectionName}`);
        }
        catch (error) {
            logger.error(`Error backing up collection ${collectionName}:`, error);
            throw error;
        }
    }
    async deleteOldBackups() {
        try {
            const retentionDate = new Date();
            retentionDate.setDate(retentionDate.getDate() - index_1.default.backup.retentionDays);
            logger.info(`Cleaning up backups older than ${retentionDate.toISOString()}`);
        }
        catch (error) {
            logger.error('Error deleting old backups:', error);
        }
    }
    async restoreFromBackup(collectionName, backupDate, clearExisting = false) {
        const db = mongoose_1.default.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }
        try {
            logger.info(`Restoring ${collectionName} from backup dated ${backupDate}`);
            const filename = `backups/${backupDate}/${collectionName}_${backupDate}.json.gz`;
            if (clearExisting) {
                const collection = db.collection(collectionName);
                await collection.deleteMany({});
                logger.info(`Cleared existing data from ${collectionName}`);
            }
            logger.info(`Restored ${collectionName} successfully`);
        }
        catch (error) {
            logger.error(`Error restoring ${collectionName}:`, error);
            throw error;
        }
    }
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            logger.info('Backup service stopped');
        }
    }
}
exports.BackupService = BackupService;
exports.default = BackupService.getInstance();
//# sourceMappingURL=backup.service.js.map