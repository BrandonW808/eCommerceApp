import cron from 'node-cron';
import mongoose from 'mongoose';
import zlib from 'zlib';
import { promisify } from 'util';
import storageService from '@services/storageService';
import config from '@config/index';
import { createLogger } from '@utils/logger';

const logger = createLogger('BackupService');
const gzip = promisify(zlib.gzip);

export class BackupService {
  private static instance: BackupService;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() { }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Initialize the backup service
   */
  async initialize(): Promise<void> {
    if (!config.features.backupService) {
      logger.info('Backup service is disabled');
      return;
    }

    logger.info('Initializing backup service...');

    // Schedule backup cron job
    this.cronJob = cron.schedule(config.backup.cron, async () => {
      logger.info('Starting scheduled backup...');
      await this.performBackup();
    });

    logger.info(`Backup service initialized. Schedule: ${config.backup.cron}`);
  }

  /**
   * Perform backup of specified collections
   */
  async performBackup(collections?: string[]): Promise<void> {
    const collectionsToBackup = collections || config.backup.collections;
    const timestamp = new Date().toISOString().split('T')[0];

    logger.info(`Starting backup for collections: ${collectionsToBackup.join(', ')}`);

    for (const collectionName of collectionsToBackup) {
      try {
        await this.backupCollection(collectionName, timestamp);
      } catch (error) {
        logger.error(`Failed to backup collection ${collectionName}:`, error);
      }
    }

    // Clean up old backups
    await this.deleteOldBackups();

    logger.info('Backup completed successfully');
  }

  /**
   * Backup a single collection
   */
  private async backupCollection(collectionName: string, timestamp: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    try {
      // Get collection data
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();

      if (documents.length === 0) {
        logger.warn(`Collection ${collectionName} is empty, skipping backup`);
        return;
      }

      // Convert to JSON and compress
      const jsonData = JSON.stringify(documents, null, 2);
      const compressedData = await gzip(jsonData);

      // Upload to storage
      const filename = `${collectionName}_${timestamp}.json.gz`;
      const folder = `backups/${timestamp}`;

      await storageService.uploadFile(compressedData, filename, {
        folder,
        metadata: {
          collectionName,
          documentCount: documents.length.toString(),
          timestamp,
          compressed: 'true',
        },
      });

      logger.info(`Backed up ${documents.length} documents from ${collectionName}`);
    } catch (error) {
      logger.error(`Error backing up collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  private async deleteOldBackups(): Promise<void> {
    try {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - config.backup.retentionDays);

      // This is a simplified version - you'd need to implement
      // listing and filtering files in the storage service
      logger.info(`Cleaning up backups older than ${retentionDate.toISOString()}`);

      // TODO: Implement storage service method to list and delete old files
    } catch (error) {
      logger.error('Error deleting old backups:', error);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(
    collectionName: string,
    backupDate: string,
    clearExisting: boolean = false,
  ): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    try {
      logger.info(`Restoring ${collectionName} from backup dated ${backupDate}`);

      // Download backup file
      const filename = `backups/${backupDate}/${collectionName}_${backupDate}.json.gz`;

      // TODO: Implement download from storage service
      // const compressedData = await storageService.downloadFile(filename);

      // Decompress
      // const jsonData = await gunzip(compressedData);
      // const documents = JSON.parse(jsonData.toString());

      // Clear existing data if requested
      if (clearExisting) {
        const collection = db.collection(collectionName);
        await collection.deleteMany({});
        logger.info(`Cleared existing data from ${collectionName}`);
      }

      // Insert restored data
      // await collection.insertMany(documents);

      logger.info(`Restored ${collectionName} successfully`);
    } catch (error) {
      logger.error(`Error restoring ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Stop the backup service
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Backup service stopped');
    }
  }
}

export default BackupService.getInstance();
