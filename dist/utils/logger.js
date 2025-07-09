"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.stream = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("@config/index"));
const { combine, timestamp, errors, json, printf, colorize } = winston_1.default.format;
const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message}`;
    if (stack) {
        msg += `\n${stack}`;
    }
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
const logsDir = path_1.default.resolve(index_1.default.logging.dir);
const consoleTransport = new winston_1.default.transports.Console({
    level: index_1.default.env === 'development' ? 'debug' : 'info',
    format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), consoleFormat),
});
const errorFileTransport = new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: index_1.default.logging.maxFiles,
    maxSize: index_1.default.logging.maxSize,
    format: combine(timestamp(), errors({ stack: true }), json()),
});
const combinedFileTransport = new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: index_1.default.logging.maxFiles,
    maxSize: index_1.default.logging.maxSize,
    format: combine(timestamp(), errors({ stack: true }), json()),
});
const logger = winston_1.default.createLogger({
    level: index_1.default.logging.level,
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), json()),
    defaultMeta: { service: index_1.default.app.name },
    transports: [consoleTransport, errorFileTransport, combinedFileTransport],
    exitOnError: false,
});
exports.stream = {
    write: (message) => {
        logger.info(message.trim());
    },
};
const createLogger = (module) => {
    return logger.child({ module });
};
exports.createLogger = createLogger;
exports.default = logger;
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
//# sourceMappingURL=logger.js.map