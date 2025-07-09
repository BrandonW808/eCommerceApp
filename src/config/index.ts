import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define validation schema
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
  APP_NAME: Joi.string().default('eCommerce API'),
  APP_PORT: Joi.number().default(3000),
  APP_HOST: Joi.string().default('localhost'),
  APP_URL: Joi.string().uri().required(),
  API_PREFIX: Joi.string().default('/api/v1'),

  // Security
  JWT_SECRET: Joi.string().required().min(32).description('JWT secret key'),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required().min(32),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  BCRYPT_ROUNDS: Joi.number().default(12),

  // Database
  MONGODB_URI: Joi.string().required().description('Mongo DB url'),
  MONGODB_TEST_URI: Joi.string(),
  DB_POOL_SIZE: Joi.number().default(10),
  DB_TIMEOUT: Joi.number().default(30000),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('', null),
  REDIS_DB: Joi.number().default(0),
  CACHE_TTL: Joi.number().default(3600),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STRIPE_API_VERSION: Joi.string().default('2023-10-16'),

  // Google Cloud Storage
  GCS_PROJECT_ID: Joi.string().required(),
  GCS_BUCKET_NAME: Joi.string().required(),
  GCS_KEY_FILE: Joi.string().required(),
  GCS_PUBLIC_BUCKET: Joi.boolean().default(false),

  // Email
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().required(),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  EMAIL_FROM: Joi.string().email().required(),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_DIR: Joi.string().default('./logs'),
  LOG_MAX_FILES: Joi.string().default('14d'),
  LOG_MAX_SIZE: Joi.string().default('20m'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: Joi.boolean().default(false),
  RATE_LIMIT_SKIP_FAILED_REQUESTS: Joi.boolean().default(false),

  // CORS
  CORS_ORIGIN: Joi.string().default('*'),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // Monitoring
  SENTRY_DSN: Joi.string().allow('', null),
  NEW_RELIC_LICENSE_KEY: Joi.string().allow('', null),
  DATADOG_API_KEY: Joi.string().allow('', null),

  // Backup
  BACKUP_ENABLED: Joi.boolean().default(true),
  BACKUP_CRON: Joi.string().default('0 23 * * *'),
  BACKUP_RETENTION_DAYS: Joi.number().default(30),
  BACKUP_COLLECTIONS: Joi.string().default('customers,orders,products,invoices'),

  // File Upload
  MAX_FILE_SIZE: Joi.number().default(5 * 1024 * 1024), // 5MB
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/gif,image/webp'),
  UPLOAD_DIR: Joi.string().default('./uploads'),

  // Pagination
  DEFAULT_PAGE_SIZE: Joi.number().default(20),
  MAX_PAGE_SIZE: Joi.number().default(100),

  // Feature Flags
  FEATURE_STRIPE_PAYMENTS: Joi.boolean().default(true),
  FEATURE_EMAIL_NOTIFICATIONS: Joi.boolean().default(true),
  FEATURE_BACKUP_SERVICE: Joi.boolean().default(true),
  FEATURE_CACHE: Joi.boolean().default(true),
})
  .unknown()
  .required();

// Validate environment variables
const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export interface IConfig {
  env: string;
  app: {
    name: string;
    port: number;
    host: string;
    url: string;
    apiPrefix: string;
  };
  security: {
    jwt: {
      secret: string;
      expiresIn: string;
      refreshSecret: string;
      refreshExpiresIn: string;
    };
    bcryptRounds: number;
  };
  database: {
    uri: string;
    testUri: string;
    options: {
      maxPoolSize: number;
      serverSelectionTimeoutMS: number;
    };
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    apiVersion: string;
  };
  gcs: {
    projectId: string;
    bucketName: string;
    keyFile: string;
    publicBucket: boolean;
  };
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: string;
  };
  logging: {
    level: string;
    dir: string;
    maxFiles: string;
    maxSize: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  monitoring: {
    sentryDsn?: string;
    newRelicKey?: string;
    datadogKey?: string;
  };
  backup: {
    enabled: boolean;
    cron: string;
    retentionDays: number;
    collections: string[];
  };
  upload: {
    maxFileSize: number;
    allowedFileTypes: string[];
    uploadDir: string;
  };
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  features: {
    stripePayments: boolean;
    emailNotifications: boolean;
    backupService: boolean;
    cache: boolean;
  };
}

const config: IConfig = {
  env: envVars.NODE_ENV,
  app: {
    name: envVars.APP_NAME,
    port: envVars.APP_PORT,
    host: envVars.APP_HOST,
    url: envVars.APP_URL,
    apiPrefix: envVars.API_PREFIX,
  },
  security: {
    jwt: {
      secret: envVars.JWT_SECRET,
      expiresIn: envVars.JWT_EXPIRES_IN,
      refreshSecret: envVars.JWT_REFRESH_SECRET,
      refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
    },
    bcryptRounds: envVars.BCRYPT_ROUNDS,
  },
  database: {
    uri: envVars.MONGODB_URI,
    testUri: envVars.MONGODB_TEST_URI,
    options: {
      maxPoolSize: envVars.DB_POOL_SIZE,
      serverSelectionTimeoutMS: envVars.DB_TIMEOUT,
    },
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
    db: envVars.REDIS_DB,
    ttl: envVars.CACHE_TTL,
  },
  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
    apiVersion: envVars.STRIPE_API_VERSION,
  },
  gcs: {
    projectId: envVars.GCS_PROJECT_ID,
    bucketName: envVars.GCS_BUCKET_NAME,
    keyFile: envVars.GCS_KEY_FILE,
    publicBucket: envVars.GCS_PUBLIC_BUCKET,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      secure: envVars.SMTP_SECURE,
      auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  logging: {
    level: envVars.LOG_LEVEL,
    dir: envVars.LOG_DIR,
    maxFiles: envVars.LOG_MAX_FILES,
    maxSize: envVars.LOG_MAX_SIZE,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests: envVars.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
    skipFailedRequests: envVars.RATE_LIMIT_SKIP_FAILED_REQUESTS,
  },
  cors: {
    origin: envVars.CORS_ORIGIN.includes(',')
      ? envVars.CORS_ORIGIN.split(',').map((origin: string) => origin.trim())
      : envVars.CORS_ORIGIN,
    credentials: envVars.CORS_CREDENTIALS,
  },
  monitoring: {
    sentryDsn: envVars.SENTRY_DSN || undefined,
    newRelicKey: envVars.NEW_RELIC_LICENSE_KEY || undefined,
    datadogKey: envVars.DATADOG_API_KEY || undefined,
  },
  backup: {
    enabled: envVars.BACKUP_ENABLED,
    cron: envVars.BACKUP_CRON,
    retentionDays: envVars.BACKUP_RETENTION_DAYS,
    collections: envVars.BACKUP_COLLECTIONS.split(',').map((c: string) => c.trim()),
  },
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    allowedFileTypes: envVars.ALLOWED_FILE_TYPES.split(',').map((t: string) => t.trim()),
    uploadDir: envVars.UPLOAD_DIR,
  },
  pagination: {
    defaultPageSize: envVars.DEFAULT_PAGE_SIZE,
    maxPageSize: envVars.MAX_PAGE_SIZE,
  },
  features: {
    stripePayments: envVars.FEATURE_STRIPE_PAYMENTS,
    emailNotifications: envVars.FEATURE_EMAIL_NOTIFICATIONS,
    backupService: envVars.FEATURE_BACKUP_SERVICE,
    cache: envVars.FEATURE_CACHE,
  },
};

export default config;
