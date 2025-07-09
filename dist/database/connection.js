"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("@config/index"));
const logger_1 = __importDefault(require("@utils/logger"));
class DatabaseConnection {
    static instance;
    isConnected = false;
    constructor() { }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    async connect() {
        if (this.isConnected) {
            logger_1.default.warn('Database connection already established');
            return;
        }
        const dbUri = index_1.default.env === 'test' && index_1.default.database.testUri
            ? index_1.default.database.testUri
            : index_1.default.database.uri;
        try {
            mongoose_1.default.set('strictQuery', true);
            mongoose_1.default.connection.on('connected', () => {
                logger_1.default.info(`MongoDB connected to ${mongoose_1.default.connection.host}`);
                this.isConnected = true;
            });
            mongoose_1.default.connection.on('error', (error) => {
                logger_1.default.error('MongoDB connection error:', error);
            });
            mongoose_1.default.connection.on('disconnected', () => {
                logger_1.default.warn('MongoDB disconnected');
                this.isConnected = false;
            });
            process.on('SIGINT', async () => {
                await this.disconnect();
                process.exit(0);
            });
            await mongoose_1.default.connect(dbUri, index_1.default.database.options);
        }
        catch (error) {
            logger_1.default.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            await mongoose_1.default.connection.close();
            logger_1.default.info('MongoDB connection closed');
            this.isConnected = false;
        }
        catch (error) {
            logger_1.default.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }
    getConnection() {
        if (!this.isConnected) {
            throw new Error('Database connection not established');
        }
        return mongoose_1.default.connection;
    }
    isHealthy() {
        return this.isConnected && mongoose_1.default.connection.readyState === 1;
    }
    async ping() {
        try {
            await mongoose_1.default.connection.db?.admin().ping();
            return true;
        }
        catch (error) {
            logger_1.default.error('Database ping failed:', error);
            return false;
        }
    }
}
exports.DatabaseConnection = DatabaseConnection;
exports.default = DatabaseConnection.getInstance();
//# sourceMappingURL=connection.js.map