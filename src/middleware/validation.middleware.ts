import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '@utils/errors';

export const validate = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.type === 'field' ? (error as any).path : undefined,
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
    }));

    throw new ValidationError('Validation failed', errorMessages);
  }

  next();
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  // Recursively clean input
  const clean = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        // Remove any script tags and trim
        return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(clean);
    }

    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cleaned[key] = clean(obj[key]);
      }
    }
    return cleaned;
  };

  req.body = clean(req.body);
  req.query = clean(req.query);
  req.params = clean(req.params);

  next();
};
