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
declare const config: IConfig;
export default config;
//# sourceMappingURL=index.d.ts.map