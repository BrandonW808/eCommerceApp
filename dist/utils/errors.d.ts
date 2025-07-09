export declare class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    details?: unknown;
    constructor(message: string, statusCode?: number, code?: string, details?: unknown);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class PaymentError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message: string, details?: unknown);
}
export declare class DatabaseError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class FileUploadError extends AppError {
    constructor(message: string);
}
export declare const ErrorCodes: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
    readonly EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly INVALID_FIELD_FORMAT: "INVALID_FIELD_FORMAT";
    readonly INVALID_FIELD_VALUE: "INVALID_FIELD_VALUE";
    readonly DUPLICATE_ENTRY: "DUPLICATE_ENTRY";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS";
    readonly CARD_DECLINED: "CARD_DECLINED";
    readonly INVALID_PAYMENT_METHOD: "INVALID_PAYMENT_METHOD";
    readonly FILE_TOO_LARGE: "FILE_TOO_LARGE";
    readonly INVALID_FILE_TYPE: "INVALID_FILE_TYPE";
    readonly FILE_UPLOAD_FAILED: "FILE_UPLOAD_FAILED";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
//# sourceMappingURL=errors.d.ts.map