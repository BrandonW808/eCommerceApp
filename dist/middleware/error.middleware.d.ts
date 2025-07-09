import { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/errors';
export declare const errorConverter: (err: Error | AppError, _req: Request, _res: Response, next: NextFunction) => void;
export declare const errorHandler: (err: AppError, req: Request, res: Response, _next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=error.middleware.d.ts.map