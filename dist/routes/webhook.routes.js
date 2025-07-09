"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const stripe_service_1 = __importDefault(require("@services/stripe.service"));
const logger_1 = require("@utils/logger");
const errors_1 = require("@utils/errors");
const logger = (0, logger_1.createLogger)('WebhookRoutes');
const router = (0, express_1.Router)();
router.use('/stripe', express_2.default.raw({ type: 'application/json' }));
router.post('/stripe', async (req, res, next) => {
    try {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            throw new errors_1.PaymentError('Missing Stripe signature');
        }
        const event = stripe_service_1.default.verifyWebhookSignature(req.body, signature);
        logger.info(`Received Stripe webhook: ${event.type}`, {
            eventId: event.id,
            type: event.type,
        });
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;
            case 'charge.refunded':
                await handleChargeRefunded(event.data.object);
                break;
            case 'customer.updated':
                await handleCustomerUpdated(event.data.object);
                break;
            case 'payment_method.attached':
                await handlePaymentMethodAttached(event.data.object);
                break;
            case 'payment_method.detached':
                await handlePaymentMethodDetached(event.data.object);
                break;
            default:
                logger.warn(`Unhandled webhook event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        logger.error('Webhook processing error:', error);
        next(error);
    }
});
async function handlePaymentIntentSucceeded(paymentIntent) {
    logger.info('Payment succeeded:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
    });
}
async function handlePaymentIntentFailed(paymentIntent) {
    logger.warn('Payment failed:', {
        paymentIntentId: paymentIntent.id,
        error: paymentIntent.last_payment_error,
    });
}
async function handleSubscriptionCreated(subscription) {
    logger.info('Subscription created:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
    });
}
async function handleSubscriptionUpdated(subscription) {
    logger.info('Subscription updated:', {
        subscriptionId: subscription.id,
        status: subscription.status,
    });
}
async function handleSubscriptionDeleted(subscription) {
    logger.info('Subscription deleted:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
    });
}
async function handleInvoicePaymentSucceeded(invoice) {
    logger.info('Invoice payment succeeded:', {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
    });
}
async function handleInvoicePaymentFailed(invoice) {
    logger.warn('Invoice payment failed:', {
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
    });
}
async function handleChargeRefunded(charge) {
    logger.info('Charge refunded:', {
        chargeId: charge.id,
        amount: charge.amount_refunded,
    });
}
async function handleCustomerUpdated(customer) {
    logger.info('Customer updated:', {
        customerId: customer.id,
        email: customer.email,
    });
}
async function handlePaymentMethodAttached(paymentMethod) {
    logger.info('Payment method attached:', {
        paymentMethodId: paymentMethod.id,
        customerId: paymentMethod.customer,
        type: paymentMethod.type,
    });
}
async function handlePaymentMethodDetached(paymentMethod) {
    logger.info('Payment method detached:', {
        paymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
    });
}
exports.default = router;
//# sourceMappingURL=webhook.routes.js.map