import mongoose from 'mongoose';
export declare class DatabaseConnection {
    private static instance;
    private isConnected;
    private constructor();
    static getInstance(): DatabaseConnection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getConnection(): mongoose.Connection;
    isHealthy(): boolean;
    ping(): Promise<boolean>;
}
declare const _default: DatabaseConnection;
export default _default;
//# sourceMappingURL=connection.d.ts.map