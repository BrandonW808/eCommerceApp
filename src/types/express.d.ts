import { ICustomer } from '@models/customer.model';

declare global {
  namespace Express {
    interface Request {
      user?: ICustomer;
      userId?: string;
      sessionId?: string;
      requestId?: string;
      startTime?: number;
      pagination?: {
        page: number;
        limit: number;
        skip: number;
      };
    }
  }
}

export {};
