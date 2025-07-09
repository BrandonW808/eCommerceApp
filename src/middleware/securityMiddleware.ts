import helmet from 'helmet';
import cors from 'cors';
import rateLimit, { Options } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import config from '@config/index';
import { Request, Response } from 'express';
import { RateLimitError } from '@utils/errors';

// Helmet configuration for security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'same-origin' },
  xssFilter: true,
});

// CORS configuration
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = Array.isArray(config.cors.origin)
      ? config.cors.origin
      : [config.cors.origin];

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
});

// Rate limiting configuration
export const createRateLimiter = (options?: Partial<Options>) => {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
    skipFailedRequests: config.rateLimit.skipFailedRequests,
    keyGenerator: (req: Request) => {
      // Use IP + user ID if authenticated
      return req.userId ? `${req.ip}-${req.userId}` : req.ip || 'unknown';
    },
    handler: (_req: Request, _res: Response) => {
      throw new RateLimitError('Too many requests, please try again later');
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
};

// MongoDB query sanitization
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Potential NoSQL injection attempt: ${key} in ${req.originalUrl}`);
  },
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later',
});

// API rate limiter
export const apiRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
});

// Payment rate limiter
export const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 payment requests per minute
  message: 'Too many payment requests, please slow down',
});
