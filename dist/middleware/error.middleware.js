"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.errorConverter = void 0;
const errors_1 = require("@utils/errors");
const logger_1 = __importDefault(require("@utils/logger"));
const index_1 = __importDefault(require("@config/index"));
const errorConverter = (err, _req, _res, next) => {
    let error = err;
    if (!(error instanceof errors_1.AppError)) {
        const statusCode = 500;
        const message = error.message || 'Internal server error';
        error = new errors_1.AppError(message, statusCode, 'INTERNAL_ERROR');
    }
    next(error);
};
exports.errorConverter = errorConverter;
const errorHandler = (err, req, res, _next) => {
    let { statusCode, message, code, details } = err;
    logger_1.default.error({
        message: err.message,
        statusCode,
        code,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        requestId: req.requestId,
    });
    if (index_1.default.env === 'production' && !err.isOperational) {
        statusCode = 500;
        message = 'Something went wrong';
        code = 'INTERNAL_ERROR';
        details = undefined;
    }
    const response = {
        success: false,
        error: {
            code,
            message,
            statusCode,
            ...(index_1.default.env === 'development' && { details }),
            ...(index_1.default.env === 'development' && { stack: err.stack }),
        },
        metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
        },
    };
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    const response = {
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Cannot ${req.method} ${req.originalUrl}`,
            statusCode: 404,
        },
        metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
        },
    };
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=error.middleware.js.map