"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const joi_1 = __importDefault(require("joi"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const envVarsSchema = joi_1.default.object({
    NODE_ENV: joi_1.default.string().valid('production', 'development', 'test').required(),
    APP_NAME: joi_1.default.string().default('eCommerce API'),
    APP_PORT: joi_1.default.number().default(3000),
    APP_HOST: joi_1.default.string().default('localhost'),
    APP_URL: joi_1.default.string().uri().required(),
    API_PREFIX: joi_1.default.string().default('/api/v1'),
    JWT_SECRET: joi_1.default.string().required().min(32).description('JWT secret key'),
    JWT_EXPIRES_IN: joi_1.default.string().default('7d'),
    JWT_REFRESH_SECRET: joi_1.default.string().required().min(32),
    JWT_REFRESH_EXPIRES_IN: joi_1.default.string().default('30d'),
    BCRYPT_ROUNDS: joi_1.default.number().default(12),
    MONGODB_URI: joi_1.default.string().required().description('Mongo DB url'),
    MONGODB_TEST_URI: joi_1.default.string(),
    DB_POOL_SIZE: joi_1.default.number().default(10),
    DB_TIMEOUT: joi_1.default.number().default(30000),
    REDIS_HOST: joi_1.default.string().default('localhost'),
    REDIS_PORT: joi_1.default.number().default(6379),
    REDIS_PASSWORD: joi_1.default.string().allow('', null),
    REDIS_DB: joi_1.default.number().default(0),
    CACHE_TTL: joi_1.default.number().default(3600),
    STRIPE_SECRET_KEY: joi_1.default.string().required(),
    STRIPE_WEBHOOK_SECRET: joi_1.default.string().required(),
    STRIPE_API_VERSION: joi_1.default.string().default('2023-10-16'),
    GCS_PROJECT_ID: joi_1.default.string().required(),
    GCS_BUCKET_NAME: joi_1.default.string().required(),
    GCS_KEY_FILE: joi_1.default.string().required(),
    GCS_PUBLIC_BUCKET: joi_1.default.boolean().default(false),
    SMTP_HOST: joi_1.default.string().required(),
    SMTP_PORT: joi_1.default.number().required(),
    SMTP_SECURE: joi_1.default.boolean().default(false),
    SMTP_USER: joi_1.default.string().required(),
    SMTP_PASS: joi_1.default.string().required(),
    EMAIL_FROM: joi_1.default.string().email().required(),
    LOG_LEVEL: joi_1.default.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_DIR: joi_1.default.string().default('./logs'),
    LOG_MAX_FILES: joi_1.default.string().default('14d'),
    LOG_MAX_SIZE: joi_1.default.string().default('20m'),
    RATE_LIMIT_WINDOW_MS: joi_1.default.number().default(15 * 60 * 1000),
    RATE_LIMIT_MAX_REQUESTS: joi_1.default.number().default(100),
    RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: joi_1.default.boolean().default(false),
    RATE_LIMIT_SKIP_FAILED_REQUESTS: joi_1.default.boolean().default(false),
    CORS_ORIGIN: joi_1.default.string().default('*'),
    CORS_CREDENTIALS: joi_1.default.boolean().default(true),
    SENTRY_DSN: joi_1.default.string().allow('', null),
    NEW_RELIC_LICENSE_KEY: joi_1.default.string().allow('', null),
    DATADOG_API_KEY: joi_1.default.string().allow('', null),
    BACKUP_ENABLED: joi_1.default.boolean().default(true),
    BACKUP_CRON: joi_1.default.string().default('0 23 * * *'),
    BACKUP_RETENTION_DAYS: joi_1.default.number().default(30),
    BACKUP_COLLECTIONS: joi_1.default.string().default('customers,orders,products,invoices'),
    MAX_FILE_SIZE: joi_1.default.number().default(5 * 1024 * 1024),
    ALLOWED_FILE_TYPES: joi_1.default.string().default('image/jpeg,image/png,image/gif,image/webp'),
    UPLOAD_DIR: joi_1.default.string().default('./uploads'),
    DEFAULT_PAGE_SIZE: joi_1.default.number().default(20),
    MAX_PAGE_SIZE: joi_1.default.number().default(100),
    FEATURE_STRIPE_PAYMENTS: joi_1.default.boolean().default(true),
    FEATURE_EMAIL_NOTIFICATIONS: joi_1.default.boolean().default(true),
    FEATURE_BACKUP_SERVICE: joi_1.default.boolean().default(true),
    FEATURE_CACHE: joi_1.default.boolean().default(true),
})
    .unknown()
    .required();
const { error, value: envVars } = envVarsSchema.validate(process.env);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}
const config = {
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
            ? envVars.CORS_ORIGIN.split(',').map((origin) => origin.trim())
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
        collections: envVars.BACKUP_COLLECTIONS.split(',').map((c) => c.trim()),
    },
    upload: {
        maxFileSize: envVars.MAX_FILE_SIZE,
        allowedFileTypes: envVars.ALLOWED_FILE_TYPES.split(',').map((t) => t.trim()),
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
exports.default = config;
//# sourceMappingURL=index.js.map