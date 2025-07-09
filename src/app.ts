import express, { Application, Request, Response, NextFunction } from 'express';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import config from '@config/index';
import logger, { stream } from '@utils/logger';
import {
  helmetMiddleware,
  corsMiddleware,
  apiRateLimiter,
  mongoSanitizeMiddleware
} from '@middleware/securityMiddleware';
import { errorConverter, errorHandler, notFoundHandler } from '@middleware/errorMiddleware';
import { sanitizeInput } from '@middleware/validationMiddleware';
import { v4 as uuidv4 } from 'uuid';

// Import routes
import authRoutes from '@routes/authRoutes';
import customerRoutes from '@routes/customerRoutes';
import paymentRoutes from '@routes/paymentRoutes';
import webhookRoutes from '@routes/webhookRoutes';
import healthRoutes from '@routes/healthRoutes';

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Request ID middleware
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      req.requestId = req.headers['x-request-id'] as string || uuidv4();
      req.startTime = Date.now();
      next();
    });

    // Security middlewares
    this.app.use(helmetMiddleware);
    this.app.use(corsMiddleware);
    this.app.use(mongoSanitizeMiddleware);

    // Body parsing middlewares
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Input sanitization
    this.app.use(sanitizeInput);

    // HTTP request logging
    if (config.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(
        morgan(
          ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
          { stream },
        ),
      );
    }

    // API rate limiting (skip for webhooks)
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/webhooks')) {
        return next();
      }
      apiRateLimiter(req, res, next);
    });

    // Trust proxy
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    const apiPrefix = config.app.apiPrefix;

    // Health check routes (no prefix)
    this.app.use('/', healthRoutes);

    // Webhook routes (no rate limiting, special handling)
    this.app.use('/webhooks', webhookRoutes);

    // API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/customers`, customerRoutes);
    this.app.use(`${apiPrefix}/payments`, paymentRoutes);

    // API documentation
    if (config.env !== 'production') {
      this.initializeSwagger();
    }

    // Static files (if needed)
    // this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  }

  private initializeSwagger(): void {
    // TODO: Implement Swagger documentation
    logger.info('API documentation available at /api-docs');
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Error converter
    this.app.use(errorConverter);

    // Error handler
    this.app.use(errorHandler);
  }

  public getApp(): Application {
    return this.app;
  }

  public listen(): void {
    const server = this.app.listen(config.app.port, () => {
      logger.info(`
        ################################################
        🚀 Server listening on port: ${config.app.port} 🚀
        🔧 Environment: ${config.env}
        📍 URL: ${config.app.url}
        ################################################
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close database connections, redis, etc.
      // await databaseConnection.disconnect();
      // await redisClient.quit();

      process.exit(0);
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

export default App;
