import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import stripeService from '@services/stripe.service';
import { createLogger } from '@utils/logger';
import { PaymentError } from '@utils/errors';

const logger = createLogger('WebhookRoutes');
const router = Router();

// Use raw body for Stripe webhook signature verification
router.use('/stripe', express.raw({ type: 'application/json' }));

router.post('/stripe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      throw new PaymentError('Missing Stripe signature');
    }

    // Verify webhook signature and parse event
    const event = stripeService.verifyWebhookSignature(req.body, signature);

    logger.info(`Received Stripe webhook: ${event.type}`, {
      eventId: event.id,
      type: event.type,
    });

    // Handle different event types
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

    // Acknowledge receipt of the webhook
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    next(error);
  }
});

// Event handlers
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  logger.info('Payment succeeded:', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  });

  // TODO: Update order status, send confirmation email, etc.
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  logger.warn('Payment failed:', {
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error,
  });

  // TODO: Update order status, notify customer, etc.
}

async function handleSubscriptionCreated(subscription: any) {
  logger.info('Subscription created:', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });

  // TODO: Update customer subscription status
}

async function handleSubscriptionUpdated(subscription: any) {
  logger.info('Subscription updated:', {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  // TODO: Update subscription in database
}

async function handleSubscriptionDeleted(subscription: any) {
  logger.info('Subscription deleted:', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  // TODO: Update customer subscription status
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  logger.info('Invoice payment succeeded:', {
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
  });

  // TODO: Update invoice status, send receipt, etc.
}

async function handleInvoicePaymentFailed(invoice: any) {
  logger.warn('Invoice payment failed:', {
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
  });

  // TODO: Notify customer, retry payment, etc.
}

async function handleChargeRefunded(charge: any) {
  logger.info('Charge refunded:', {
    chargeId: charge.id,
    amount: charge.amount_refunded,
  });

  // TODO: Update order status, send refund confirmation, etc.
}

async function handleCustomerUpdated(customer: any) {
  logger.info('Customer updated:', {
    customerId: customer.id,
    email: customer.email,
  });

  // TODO: Sync customer data with database
}

async function handlePaymentMethodAttached(paymentMethod: any) {
  logger.info('Payment method attached:', {
    paymentMethodId: paymentMethod.id,
    customerId: paymentMethod.customer,
    type: paymentMethod.type,
  });

  // TODO: Update customer payment methods
}

async function handlePaymentMethodDetached(paymentMethod: any) {
  logger.info('Payment method detached:', {
    paymentMethodId: paymentMethod.id,
    type: paymentMethod.type,
  });

  // TODO: Update customer payment methods
}

export default router;
