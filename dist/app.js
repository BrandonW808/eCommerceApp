"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const index_1 = __importDefault(require("@config/index"));
const logger_1 = __importStar(require("@utils/logger"));
const security_middleware_1 = require("@middleware/security.middleware");
const error_middleware_1 = require("@middleware/error.middleware");
const validation_middleware_1 = require("@middleware/validation.middleware");
const uuid_1 = require("uuid");
const auth_routes_1 = __importDefault(require("@routes/auth.routes"));
const customer_routes_1 = __importDefault(require("@routes/customer.routes"));
const payment_routes_1 = __importDefault(require("@routes/payment.routes"));
const webhook_routes_1 = __importDefault(require("@routes/webhook.routes"));
const health_routes_1 = __importDefault(require("@routes/health.routes"));
class App {
    app;
    constructor() {
        this.app = (0, express_1.default)();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddlewares() {
        this.app.use((req, _res, next) => {
            req.requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
            req.startTime = Date.now();
            next();
        });
        this.app.use(security_middleware_1.helmetMiddleware);
        this.app.use(security_middleware_1.corsMiddleware);
        this.app.use(security_middleware_1.mongoSanitizeMiddleware);
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use((0, compression_1.default)());
        this.app.use(validation_middleware_1.sanitizeInput);
        if (index_1.default.env === 'development') {
            this.app.use((0, morgan_1.default)('dev'));
        }
        else {
            this.app.use((0, morgan_1.default)(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms', { stream: logger_1.stream }));
        }
        this.app.use((req, res, next) => {
            if (req.path.startsWith('/webhooks')) {
                return next();
            }
            (0, security_middleware_1.apiRateLimiter)(req, res, next);
        });
        this.app.set('trust proxy', 1);
    }
    initializeRoutes() {
        const apiPrefix = index_1.default.app.apiPrefix;
        this.app.use('/', health_routes_1.default);
        this.app.use('/webhooks', webhook_routes_1.default);
        this.app.use(`${apiPrefix}/auth`, auth_routes_1.default);
        this.app.use(`${apiPrefix}/customers`, customer_routes_1.default);
        this.app.use(`${apiPrefix}/payments`, payment_routes_1.default);
        if (index_1.default.env !== 'production') {
            this.initializeSwagger();
        }
    }
    initializeSwagger() {
        logger_1.default.info('API documentation available at /api-docs');
    }
    initializeErrorHandling() {
        this.app.use(error_middleware_1.notFoundHandler);
        this.app.use(error_middleware_1.errorConverter);
        this.app.use(error_middleware_1.errorHandler);
    }
    getApp() {
        return this.app;
    }
    listen() {
        const server = this.app.listen(index_1.default.app.port, () => {
            logger_1.default.info(`
        ################################################
        🚀 Server listening on port: ${index_1.default.app.port} 🚀
        🔧 Environment: ${index_1.default.env}
        📍 URL: ${index_1.default.app.url}
        ################################################
      `);
        });
        const gracefulShutdown = async (signal) => {
            logger_1.default.info(`${signal} received, starting graceful shutdown...`);
            server.close(() => {
                logger_1.default.info('HTTP server closed');
            });
            process.exit(0);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
}
exports.App = App;
exports.default = App;
//# sourceMappingURL=app.js.map