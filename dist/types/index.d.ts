export interface IApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    metadata?: {
        timestamp: string;
        requestId?: string;
        version?: string;
    };
}
export interface IPaginationOptions {
    page: number;
    limit: number;
    sort?: string;
    order?: 'asc' | 'desc';
}
export interface IPaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        pages: number;
        limit: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export interface ITokenPayload {
    userId: string;
    email: string;
    type: 'access' | 'refresh';
}
export interface IAuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface IAddress {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}
export interface IInvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    tax?: number;
    discount?: number;
}
export interface IPaymentMethod {
    id: string;
    type: 'card' | 'bank_account' | 'paypal';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault: boolean;
}
export interface IWebhookEvent {
    id: string;
    type: string;
    data: unknown;
    timestamp: Date;
    processed: boolean;
}
export declare enum OrderStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    PAID = "paid",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SUCCEEDED = "succeeded",
    FAILED = "failed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export interface IErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        statusCode: number;
        details?: unknown;
    };
    metadata?: {
        timestamp: string;
        requestId?: string;
    };
}
export interface IHealthCheck {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    services: {
        database: boolean;
        redis?: boolean;
        stripe?: boolean;
        storage?: boolean;
    };
}
//# sourceMappingURL=index.d.ts.map