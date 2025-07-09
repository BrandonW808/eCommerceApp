"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRateLimiter = exports.apiRateLimiter = exports.authRateLimiter = exports.mongoSanitizeMiddleware = exports.createRateLimiter = exports.corsMiddleware = exports.helmetMiddleware = void 0;
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const index_1 = __importDefault(require("@config/index"));
const errors_1 = require("@utils/errors");
exports.helmetMiddleware = (0, helmet_1.default)({
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
exports.corsMiddleware = (0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        const allowedOrigins = Array.isArray(index_1.default.cors.origin)
            ? index_1.default.cors.origin
            : [index_1.default.cors.origin];
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: index_1.default.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
});
const createRateLimiter = (options) => {
    return (0, express_rate_limit_1.default)({
        windowMs: index_1.default.rateLimit.windowMs,
        max: index_1.default.rateLimit.max,
        skipSuccessfulRequests: index_1.default.rateLimit.skipSuccessfulRequests,
        skipFailedRequests: index_1.default.rateLimit.skipFailedRequests,
        keyGenerator: (req) => {
            return req.userId ? `${req.ip}-${req.userId}` : req.ip || 'unknown';
        },
        handler: (_req, _res) => {
            throw new errors_1.RateLimitError('Too many requests, please try again later');
        },
        standardHeaders: true,
        legacyHeaders: false,
        ...options,
    });
};
exports.createRateLimiter = createRateLimiter;
exports.mongoSanitizeMiddleware = (0, express_mongo_sanitize_1.default)({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`Potential NoSQL injection attempt: ${key} in ${req.originalUrl}`);
    },
});
exports.authRateLimiter = (0, exports.createRateLimiter)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: 'Too many authentication attempts, please try again later',
});
exports.apiRateLimiter = (0, exports.createRateLimiter)({
    windowMs: index_1.default.rateLimit.windowMs,
    max: index_1.default.rateLimit.max,
});
exports.paymentRateLimiter = (0, exports.createRateLimiter)({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many payment requests, please slow down',
});
//# sourceMappingURL=security.middleware.js.map