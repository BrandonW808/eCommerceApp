"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.FileUploadError = exports.DatabaseError = exports.ExternalServiceError = exports.PaymentError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT_ERROR');
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}
exports.RateLimitError = RateLimitError;
class PaymentError extends AppError {
    constructor(message, details) {
        super(message, 402, 'PAYMENT_ERROR', details);
    }
}
exports.PaymentError = PaymentError;
class ExternalServiceError extends AppError {
    constructor(service, message, details) {
        super(`${service}: ${message}`, 503, 'EXTERNAL_SERVICE_ERROR', details);
    }
}
exports.ExternalServiceError = ExternalServiceError;
class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, 500, 'DATABASE_ERROR', details);
    }
}
exports.DatabaseError = DatabaseError;
class FileUploadError extends AppError {
    constructor(message) {
        super(message, 400, 'FILE_UPLOAD_ERROR');
    }
}
exports.FileUploadError = FileUploadError;
exports.ErrorCodes = {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FIELD_FORMAT: 'INVALID_FIELD_FORMAT',
    INVALID_FIELD_VALUE: 'INVALID_FIELD_VALUE',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    CARD_DECLINED: 'CARD_DECLINED',
    INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
};
//# sourceMappingURL=errors.js.map