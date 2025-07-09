import Stripe from 'stripe';
import { ICustomer } from '@models/Customer';
import { IInvoiceItem, PaymentStatus } from '../types/index';
export declare class StripeService {
    private stripe;
    private static instance;
    private constructor();
    static getInstance(): StripeService;
    createCustomer(customer: ICustomer): Promise<Stripe.Customer>;
    updateCustomer(stripeCustomerId: string, updates: Stripe.CustomerUpdateParams): Promise<Stripe.Customer>;
    deleteCustomer(stripeCustomerId: string): Promise<Stripe.DeletedCustomer>;
    attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod>;
    setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer>;
    listPaymentMethods(customerId: string, type?: 'card' | 'bank_account'): Promise<Stripe.PaymentMethod[]>;
    detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod>;
    createPaymentIntent(amount: number, currency?: string, customerId?: string, paymentMethodId?: string, metadata?: Record<string, string>): Promise<Stripe.PaymentIntent>;
    createAndChargeInvoice(customerId: string, items: IInvoiceItem[], paymentMethodId?: string, description?: string): Promise<{
        invoice: Stripe.Invoice;
        paymentIntent: Stripe.PaymentIntent | null;
        status: PaymentStatus;
    }>;
    getInvoice(invoiceId: string): Promise<Stripe.Invoice>;
    listInvoices(customerId: string, limit?: number, startingAfter?: string): Promise<{
        invoices: Stripe.Invoice[];
        hasMore: boolean;
    }>;
    sendInvoice(invoiceId: string): Promise<Stripe.Invoice>;
    createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<Stripe.Refund>;
    verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event;
    private mapPaymentIntentStatus;
}
declare const _default: StripeService;
export default _default;
//# sourceMappingURL=stripeService.d.ts.map