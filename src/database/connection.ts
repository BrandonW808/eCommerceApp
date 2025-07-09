import mongoose from 'mongoose';
import config from '@config/index';
import logger from '@utils/logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('Database connection already established');
      return;
    }

    const dbUri =
      config.env === 'test' && config.database.testUri
        ? config.database.testUri
        : config.database.uri;

    try {
      // Set mongoose options
      mongoose.set('strictQuery', true);

      // Event listeners
      mongoose.connection.on('connected', () => {
        logger.info(`MongoDB connected to ${mongoose.connection.host}`);
        this.isConnected = true;
      });

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      // Connect to MongoDB
      await mongoose.connect(dbUri, config.database.options);
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      this.isConnected = false;
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    if (!this.isConnected) {
      throw new Error('Database connection not established');
    }
    return mongoose.connection;
  }

  public isHealthy(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async ping(): Promise<boolean> {
    try {
      await mongoose.connection.db?.admin().ping();
      return true;
    } catch (error) {
      logger.error('Database ping failed:', error);
      return false;
    }
  }
}

export default DatabaseConnection.getInstance();
