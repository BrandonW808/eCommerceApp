import { Router, Request, Response } from 'express';
import databaseConnection from '@database/connection';
import config from '@config/index';
import { IHealthCheck, IApiResponse } from '../types/index';
import { version } from '../version';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const healthCheck: IHealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: version || '1.0.0',
    uptime: process.uptime(),
    services: {
      database: false,
    },
  };

  try {
    // Check database
    healthCheck.services.database = databaseConnection.isHealthy();

    // Check Redis (if enabled)
    // if (config.features.cache) {
    //   healthCheck.services.redis = await redisClient.ping();
    // }

    // Check Stripe (if enabled)
    // if (config.features.stripePayments) {
    //   healthCheck.services.stripe = true; // Assume healthy if config is valid
    // }

    // Check Storage
    // healthCheck.services.storage = true; // Assume healthy if config is valid

    const response: IApiResponse<IHealthCheck> = {
      success: true,
      data: healthCheck,
    };

    res.json(response);
  } catch (error) {
    healthCheck.status = 'unhealthy';

    const response: IApiResponse<IHealthCheck> = {
      success: false,
      data: healthCheck,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'One or more services are unhealthy',
      },
    };

    res.status(503).json(response);
  }
});

router.get('/ping', (_req: Request, res: Response) => {
  res.json({ pong: true });
});

router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const isDatabaseReady = await databaseConnection.ping();

    if (isDatabaseReady) {
      res.json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'Database not ready' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, reason: 'Service not ready' });
  }
});

router.get('/metrics', (_req: Request, res: Response) => {
  // TODO: Implement Prometheus metrics
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  });
});

export default router;
