"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const index_1 = __importDefault(require("@config/index"));
const errors_1 = require("@utils/errors");
const logger_1 = require("@utils/logger");
const index_2 = require("../types/index");
const logger = (0, logger_1.createLogger)('StripeService');
class StripeService {
    stripe;
    static instance;
    constructor() {
        this.stripe = new stripe_1.default(index_1.default.stripe.secretKey, {
            apiVersion: index_1.default.stripe.apiVersion,
            typescript: true,
        });
    }
    static getInstance() {
        if (!StripeService.instance) {
            StripeService.instance = new StripeService();
        }
        return StripeService.instance;
    }
    async createCustomer(customer) {
        try {
            const stripeCustomer = await this.stripe.customers.create({
                email: customer.email,
                name: `${customer.name.first} ${customer.name.last}`,
                phone: customer.phone,
                metadata: {
                    customerId: customer._id.toString(),
                    source: 'api',
                },
                ...(customer.address && {
                    address: {
                        line1: customer.address.line1,
                        line2: customer.address.line2,
                        city: customer.address.city,
                        state: customer.address.state,
                        postal_code: customer.address.postalCode,
                        country: customer.address.country,
                    },
                }),
            });
            logger.info(`Stripe customer created: ${stripeCustomer.id}`);
            return stripeCustomer;
        }
        catch (error) {
            logger.error('Failed to create Stripe customer:', error);
            throw new errors_1.ExternalServiceError('Stripe', 'Failed to create customer', error);
        }
    }
    async updateCustomer(stripeCustomerId, updates) {
        try {
            const customer = await this.stripe.customers.update(stripeCustomerId, updates);
            logger.info(`Stripe customer updated: ${customer.id}`);
            return customer;
        }
        catch (error) {
            logger.error('Failed to update Stripe customer:', error);
            throw new errors_1.ExternalServiceError('Stripe', 'Failed to update customer', error);
        }
    }
    async deleteCustomer(stripeCustomerId) {
        try {
            const deleted = await this.stripe.customers.del(stripeCustomerId);
            logger.info(`Stripe customer deleted: ${stripeCustomerId}`);
            return deleted;
        }
        catch (error) {
            logger.error('Failed to delete Stripe customer:', error);
            throw new errors_1.ExternalServiceError('Stripe', 'Failed to delete customer', error);
        }
    }
    async attachPaymentMethod(paymentMethodId, customerId) {
        try {
            const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });
            logger.info(`Payment method attached: ${paymentMethodId} to customer: ${customerId}`);
            return paymentMethod;
        }
        catch (error) {
            logger.error('Failed to attach payment method:', error);
            throw new errors_1.PaymentError('Failed to attach payment method', error);
        }
    }
    async setDefaultPaymentMethod(customerId, paymentMethodId) {
        try {
            const customer = await this.stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
            logger.info(`Default payment method set for customer: ${customerId}`);
            return customer;
        }
        catch (error) {
            logger.error('Failed to set default payment method:', error);
            throw new errors_1.PaymentError('Failed to set default payment method', error);
        }
    }
    async listPaymentMethods(customerId, type = 'card') {
        try {
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customerId,
                type: type,
            });
            return paymentMethods.data;
        }
        catch (error) {
            logger.error('Failed to list payment methods:', error);
            throw new errors_1.ExternalServiceError('Stripe', 'Failed to list payment methods', error);
        }
    }
    async detachPaymentMethod(paymentMethodId) {
        try {
            const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
            logger.info(`Payment method detached: ${paymentMethodId}`);
            return paymentMethod;
        }
        catch (error) {
            logger.error('Failed to detach payment method:', error);
            throw new errors_1.PaymentError('Failed to remove payment method', error);
        }
    }
    async createPaymentIntent(amount, currency = 'usd', customerId, paymentMethodId, metadata) {
        try {
            const params = {
                amount: Math.round(amount * 100),
                currency,
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata,
            };
            if (customerId) {
                params.customer = customerId;
            }
            if (paymentMethodId) {
                params.payment_method = paymentMethodId;
                params.confirm = true;
                params.off_session = true;
            }
            const paymentIntent = await this.stripe.paymentIntents.create(params);
            logger.info(`Payment intent created: ${paymentIntent.id}`);
            return paymentIntent;
        }
        catch (error) {
            logger.error('Failed to create payment intent:', error);
            throw new errors_1.PaymentError('Failed to create payment', error);
        }
    }
    async createAndChargeInvoice(customerId, items, paymentMethodId, description) {
        try {
            const invoiceItemPromises = items.map((item) => this.stripe.invoiceItems.create({
                customer: customerId,
                amount: Math.round(item.amount * 100),
                currency: 'usd',
                description: item.description,
                quantity: item.quantity,
                metadata: {
                    unitPrice: item.unitPrice.toString(),
                    tax: item.tax?.toString() || '0',
                    discount: item.discount?.toString() || '0',
                },
            }));
            await Promise.all(invoiceItemPromises);
            const invoice = await this.stripe.invoices.create({
                customer: customerId,
                description,
                auto_advance: true,
                collection_method: 'charge_automatically',
                payment_settings: {
                    payment_method_options: {
                        card: {
                            request_three_d_secure: 'automatic',
                        },
                    },
                    payment_method_types: ['card'],
                },
                metadata: {
                    source: 'api',
                },
            });
            const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);
            let paidInvoice;
            let paymentIntent = null;
            let status = index_2.PaymentStatus.PENDING;
            try {
                const payParams = {
                    off_session: true,
                };
                if (paymentMethodId) {
                    payParams.payment_method = paymentMethodId;
                }
                paidInvoice = await this.stripe.invoices.pay(invoice.id, payParams);
                if (paidInvoice.payments && paidInvoice.payments.data[0].payment.payment_intent) {
                    paymentIntent = await this.stripe.paymentIntents.retrieve(paidInvoice.payments.data[0].payment.payment_intent);
                    status = this.mapPaymentIntentStatus(paymentIntent.status);
                }
                logger.info(`Invoice created and paid: ${paidInvoice.id}`);
            }
            catch (payError) {
                logger.error('Failed to pay invoice:', payError);
                paidInvoice = finalizedInvoice;
                status = index_2.PaymentStatus.FAILED;
            }
            return {
                invoice: paidInvoice,
                paymentIntent,
                status,
            };
        }
        catch (error) {
            logger.error('Failed to create and charge invoice:', error);
            throw new errors_1.PaymentError('Failed to process payment', error);
        }
    }
    async getInvoice(invoiceId) {
        try {
            const invoice = await this.stripe.invoices.retrieve(invoiceId);
            return invoice;
        }
        catch (error) {
            logger.error('Failed to retrieve invoice:', error);
            throw new errors_1.ExternalServiceError('Stripe', 'Failed to retrieve invoice', error);
        }
    }
    async listInvoices(customerId, limit = 10, startingAfter) {
        try {
            const params = {
                customer: customerId,
                limit,
            };
            if (startingAfter) {
                params.starting_after = startingAfter;
            }
            const invoices = await this.stripe.invoices.list(params);
            return {
                invoices: invoices.data,
                hasMore: invoices.has_more,
            };
        }
        catch (error) {
            logger.error('Failed to list invoices:', error);
            throw new errors_1.ExternalServiceError('Stripe', 'Failed to list invoices', error);
        }
    }
    async sendInvoice(invoiceId) {
        try {
            const invoice = await this.stripe.invoices.sendInvoice(invoiceId);
            logger.info(`Invoice sent: ${invoiceId}`);
            return invoice;
        }
        catch (error) {
            logger.error('Failed to send invoice:', error);
            throw new errors_1.ExternalServiceError('Stripe', 'Failed to send invoice', error);
        }
    }
    async createRefund(paymentIntentId, amount, reason) {
        try {
            const params = {
                payment_intent: paymentIntentId,
                metadata: {
                    reason: reason || 'Customer request',
                },
            };
            if (amount) {
                params.amount = Math.round(amount * 100);
            }
            const refund = await this.stripe.refunds.create(params);
            logger.info(`Refund created: ${refund.id} for payment: ${paymentIntentId}`);
            return refund;
        }
        catch (error) {
            logger.error('Failed to create refund:', error);
            throw new errors_1.PaymentError('Failed to process refund', error);
        }
    }
    verifyWebhookSignature(payload, signature) {
        try {
            return this.stripe.webhooks.constructEvent(payload, signature, index_1.default.stripe.webhookSecret);
        }
        catch (error) {
            logger.error('Invalid webhook signature:', error);
            throw new errors_1.PaymentError('Invalid webhook signature', error);
        }
    }
    mapPaymentIntentStatus(status) {
        const statusMap = {
            requires_payment_method: index_2.PaymentStatus.PENDING,
            requires_confirmation: index_2.PaymentStatus.PENDING,
            requires_action: index_2.PaymentStatus.PENDING,
            processing: index_2.PaymentStatus.PROCESSING,
            requires_capture: index_2.PaymentStatus.PROCESSING,
            canceled: index_2.PaymentStatus.CANCELLED,
            succeeded: index_2.PaymentStatus.SUCCEEDED,
        };
        return statusMap[status] || index_2.PaymentStatus.FAILED;
    }
}
exports.StripeService = StripeService;
exports.default = StripeService.getInstance();
//# sourceMappingURL=stripeService.js.map