import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import config from '@config/index';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for console logging
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

// Create logs directory if it doesn't exist
const logsDir = path.resolve(config.logging.dir);

// Console transport
const consoleTransport = new winston.transports.Console({
  level: config.env === 'development' ? 'debug' : 'info',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    consoleFormat,
  ),
});

// File transport for errors
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: config.logging.maxFiles,
  maxSize: config.logging.maxSize,
  format: combine(timestamp(), errors({ stack: true }), json()),
});

// File transport for all logs
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: config.logging.maxFiles,
  maxSize: config.logging.maxSize,
  format: combine(timestamp(), errors({ stack: true }), json()),
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json(),
  ),
  defaultMeta: { service: config.app.name },
  transports: [consoleTransport, errorFileTransport, combinedFileTransport],
  exitOnError: false,
});

// Stream for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Child logger factory
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Export logger instance
export default logger;

// Log unhandled rejections and exceptions
process.on('unhandledRejection', (reason: Error | unknown) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
