import { Request, Response, NextFunction } from 'express';
export declare class CustomerController {
    getProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    uploadProfilePicture(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteProfilePicture(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAddresses(req: Request, res: Response, next: NextFunction): Promise<void>;
    addAddress(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateAddress(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPaymentMethods(req: Request, res: Response, next: NextFunction): Promise<void>;
    addPaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void>;
    setDefaultPaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void>;
    removePaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void>;
    getInvoices(req: Request, res: Response, next: NextFunction): Promise<void>;
    getInvoice(req: Request, res: Response, next: NextFunction): Promise<void>;
    downloadInvoice(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: CustomerController;
export default _default;
//# sourceMappingURL=customer.controller.d.ts.map