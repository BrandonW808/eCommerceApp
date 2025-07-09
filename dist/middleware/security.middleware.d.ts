import cors from 'cors';
export declare const helmetMiddleware: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
export declare const createRateLimiter: (options?: Partial<rateLimit.Options>) => import("express-rate-limit").RateLimitRequestHandler;
export declare const mongoSanitizeMiddleware: import("express").Handler;
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const paymentRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=security.middleware.d.ts.map