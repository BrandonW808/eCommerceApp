import { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/errors';
import logger from '@utils/logger';
import config from '@config/index';
import { IErrorResponse } from '../types/index';

export const errorConverter = (
  err: Error | AppError,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  let error = err;

  if (!(error instanceof AppError)) {
    const statusCode = 500;
    const message = error.message || 'Internal server error';
    error = new AppError(message, statusCode, 'INTERNAL_ERROR');
  }

  next(error);
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let { statusCode, message, code, details } = err;

  // Log error
  logger.error({
    message: err.message,
    statusCode,
    code,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    requestId: req.requestId,
  });

  // Don't leak error details in production
  if (config.env === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Something went wrong';
    code = 'INTERNAL_ERROR';
    details = undefined;
  }

  const response: IErrorResponse = {
    success: false,
    error: {
      code,
      message,
      statusCode,
      ...(config.env === 'development' && { details }),
      ...(config.env === 'development' && { stack: err.stack }),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: IErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  };

  res.status(404).json(response);
};
