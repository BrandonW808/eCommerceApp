import winston from 'winston';
declare const logger: winston.Logger;
export declare const stream: {
    write: (message: string) => void;
};
export declare const createLogger: (module: string) => winston.Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map