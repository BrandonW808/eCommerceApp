import 'module-alias/register';
import App from './app';
import databaseConnection from '@database/connection';
import logger from '@utils/logger';
import config from '@config/index';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

async function bootstrap() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await databaseConnection.connect();
    logger.info('Database connected successfully');

    // Initialize and start the application
    const app = new App();
    app.listen();

    // Initialize services
    if (config.features.backupService) {
      // Initialize backup service
      const { default: backupService } = await import('@services/backupService');
      await backupService.initialize();
      logger.info('Backup service initialized');
    }

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
