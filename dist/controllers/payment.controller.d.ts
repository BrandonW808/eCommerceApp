import { Request, Response, NextFunction } from 'express';
export declare class PaymentController {
    createPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<void>;
    createPayment(req: Request, res: Response, next: NextFunction): Promise<void>;
    createPaymentWithItems(req: Request, res: Response, next: NextFunction): Promise<void>;
    createSubscription(req: Request, res: Response, next: NextFunction): Promise<void>;
    cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateSubscription(req: Request, res: Response, next: NextFunction): Promise<void>;
    createRefund(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPaymentDetails(req: Request, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: PaymentController;
export default _default;
//# sourceMappingURL=payment.controller.d.ts.map