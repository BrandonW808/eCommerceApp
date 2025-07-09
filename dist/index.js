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
require("module-alias/register");
const app_1 = __importDefault(require("./app"));
const connection_1 = __importDefault(require("@database/connection"));
const logger_1 = __importDefault(require("@utils/logger"));
const index_1 = __importDefault(require("@config/index"));
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.default.error('Unhandled Rejection:', reason);
    process.exit(1);
});
async function bootstrap() {
    try {
        logger_1.default.info('Connecting to database...');
        await connection_1.default.connect();
        logger_1.default.info('Database connected successfully');
        const app = new app_1.default();
        app.listen();
        if (index_1.default.features.backupService) {
            const { default: backupService } = await Promise.resolve().then(() => __importStar(require('@services/backup.service')));
            await backupService.initialize();
            logger_1.default.info('Backup service initialized');
        }
    }
    catch (error) {
        logger_1.default.error('Failed to start application:', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=index.js.map