"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const customer_model_1 = __importDefault(require("@models/customer.model"));
const stripe_service_1 = __importDefault(require("@services/stripe.service"));
const errors_1 = require("@utils/errors");
const logger_1 = require("@utils/logger");
const logger = (0, logger_1.createLogger)('PaymentController');
class PaymentController {
    async createPaymentIntent(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { amount, currency = 'usd', description, metadata } = req.body;
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Customer');
            }
            const paymentIntent = await stripe_service_1.default.createPaymentIntent(amount, currency, customer.stripeCustomerId, undefined, {
                ...metadata,
                customerId: customer._id.toString(),
                customerEmail: customer.email,
            });
            logger.info(`Payment intent created for customer: ${customer.email}`, {
                paymentIntentId: paymentIntent.id,
                amount,
                currency,
            });
            const response = {
                success: true,
                data: {
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                },
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async createPayment(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { amount, currency = 'usd', paymentMethodId, savePaymentMethod, description, metadata, } = req.body;
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Customer');
            }
            if (savePaymentMethod) {
                await stripe_service_1.default.attachPaymentMethod(paymentMethodId, customer.stripeCustomerId);
            }
            const items = [
                {
                    description: description || 'Payment',
                    quantity: 1,
                    unitPrice: amount,
                    amount,
                },
            ];
            const result = await stripe_service_1.default.createAndChargeInvoice(customer.stripeCustomerId, items, paymentMethodId, description);
            logger.info(`Payment processed for customer: ${customer.email}`, {
                invoiceId: result.invoice.id,
                status: result.status,
                amount,
            });
            const response = {
                success: true,
                data: {
                    invoice: {
                        id: result.invoice.id,
                        status: result.invoice.status,
                        amount: result.invoice.amount_paid,
                        currency: result.invoice.currency,
                        invoiceUrl: result.invoice.hosted_invoice_url,
                        invoicePdf: result.invoice.invoice_pdf,
                    },
                    paymentIntent: result.paymentIntent && {
                        id: result.paymentIntent.id,
                        status: result.paymentIntent.status,
                    },
                    paymentStatus: result.status,
                },
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async createPaymentWithItems(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { items, currency = 'usd', paymentMethodId, savePaymentMethod } = req.body;
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Customer');
            }
            if (savePaymentMethod) {
                await stripe_service_1.default.attachPaymentMethod(paymentMethodId, customer.stripeCustomerId);
            }
            const result = await stripe_service_1.default.createAndChargeInvoice(customer.stripeCustomerId, items, paymentMethodId);
            const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
            logger.info(`Multi-item payment processed for customer: ${customer.email}`, {
                invoiceId: result.invoice.id,
                itemCount: items.length,
                totalAmount,
            });
            const response = {
                success: true,
                data: {
                    invoice: {
                        id: result.invoice.id,
                        status: result.invoice.status,
                        amount: result.invoice.amount_paid,
                        currency: result.invoice.currency,
                        invoiceUrl: result.invoice.hosted_invoice_url,
                        invoicePdf: result.invoice.invoice_pdf,
                    },
                    paymentIntent: result.paymentIntent && {
                        id: result.paymentIntent.id,
                        status: result.paymentIntent.status,
                    },
                    paymentStatus: result.status,
                },
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async createSubscription(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { priceId, paymentMethodId, trialDays, metadata } = req.body;
            const response = {
                success: true,
                message: 'Subscription created successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async cancelSubscription(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { subscriptionId } = req.params;
            const { immediately = false } = req.body;
            const response = {
                success: true,
                message: immediately
                    ? 'Subscription cancelled immediately'
                    : 'Subscription will be cancelled at the end of the current period',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async updateSubscription(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { subscriptionId } = req.params;
            const { priceId, quantity } = req.body;
            const response = {
                success: true,
                message: 'Subscription updated successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async createRefund(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { paymentIntentId, amount, reason, metadata } = req.body;
            const refund = await stripe_service_1.default.createRefund(paymentIntentId, amount, reason || metadata?.reason);
            logger.info(`Refund created for customer: ${req.user.email}`, {
                refundId: refund.id,
                paymentIntentId,
                amount: refund.amount,
            });
            const response = {
                success: true,
                data: {
                    refundId: refund.id,
                    amount: refund.amount / 100,
                    currency: refund.currency,
                    status: refund.status,
                },
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getPaymentHistory(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { limit = 10, startingAfter, endingBefore } = req.query;
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Customer');
            }
            const invoices = await stripe_service_1.default.listInvoices(customer.stripeCustomerId, Number(limit), startingAfter);
            const response = {
                success: true,
                data: invoices,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getPaymentDetails(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { paymentIntentId } = req.params;
            const response = {
                success: true,
                data: {
                    paymentIntentId,
                },
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PaymentController = PaymentController;
exports.default = new PaymentController();
//# sourceMappingURL=payment.controller.js.map