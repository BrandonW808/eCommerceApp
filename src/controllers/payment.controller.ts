import { Request, Response, NextFunction } from 'express';
import Customer from '@models/customer.model';
import stripeService from '@services/stripe.service';
import { AuthenticationError, NotFoundError, PaymentError } from '@utils/errors';
import { createLogger } from '@utils/logger';
import { IApiResponse, IInvoiceItem } from '@types/index';

const logger = createLogger('PaymentController');

export class PaymentController {
  /**
   * Create payment intent
   */
  async createPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { amount, currency = 'usd', description, metadata } = req.body;

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      const paymentIntent = await stripeService.createPaymentIntent(
        amount,
        currency,
        customer.stripeCustomerId,
        undefined,
        {
          ...metadata,
          customerId: customer._id.toString(),
          customerEmail: customer.email,
        },
      );

      logger.info(`Payment intent created for customer: ${customer.email}`, {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      });

      const response: IApiResponse = {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create payment with invoice
   */
  async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const {
        amount,
        currency = 'usd',
        paymentMethodId,
        savePaymentMethod,
        description,
        metadata,
      } = req.body;

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      // Attach payment method if requested
      if (savePaymentMethod) {
        await stripeService.attachPaymentMethod(paymentMethodId, customer.stripeCustomerId);
      }

      // Create invoice item
      const items: IInvoiceItem[] = [
        {
          description: description || 'Payment',
          quantity: 1,
          unitPrice: amount,
          amount,
        },
      ];

      // Create and charge invoice
      const result = await stripeService.createAndChargeInvoice(
        customer.stripeCustomerId,
        items,
        paymentMethodId,
        description,
      );

      logger.info(`Payment processed for customer: ${customer.email}`, {
        invoiceId: result.invoice.id,
        status: result.status,
        amount,
      });

      const response: IApiResponse = {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create payment with multiple items
   */
  async createPaymentWithItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { items, currency = 'usd', paymentMethodId, savePaymentMethod } = req.body;

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      // Attach payment method if requested
      if (savePaymentMethod) {
        await stripeService.attachPaymentMethod(paymentMethodId, customer.stripeCustomerId);
      }

      // Create and charge invoice
      const result = await stripeService.createAndChargeInvoice(
        customer.stripeCustomerId,
        items,
        paymentMethodId,
      );

      const totalAmount = items.reduce((sum: number, item: IInvoiceItem) => sum + item.amount, 0);

      logger.info(`Multi-item payment processed for customer: ${customer.email}`, {
        invoiceId: result.invoice.id,
        itemCount: items.length,
        totalAmount,
      });

      const response: IApiResponse = {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { priceId, paymentMethodId, trialDays, metadata } = req.body;

      // Implementation for creating subscription
      const response: IApiResponse = {
        success: true,
        message: 'Subscription created successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { subscriptionId } = req.params;
      const { immediately = false } = req.body;

      // Implementation for canceling subscription
      const response: IApiResponse = {
        success: true,
        message: immediately
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at the end of the current period',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { subscriptionId } = req.params;
      const { priceId, quantity } = req.body;

      // Implementation for updating subscription
      const response: IApiResponse = {
        success: true,
        message: 'Subscription updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create refund
   */
  async createRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { paymentIntentId, amount, reason, metadata } = req.body;

      const refund = await stripeService.createRefund(
        paymentIntentId,
        amount,
        reason || metadata?.reason,
      );

      logger.info(`Refund created for customer: ${req.user.email}`, {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount,
      });

      const response: IApiResponse = {
        success: true,
        data: {
          refundId: refund.id,
          amount: refund.amount / 100, // Convert from cents
          currency: refund.currency,
          status: refund.status,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { limit = 10, startingAfter, endingBefore } = req.query;

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      const invoices = await stripeService.listInvoices(
        customer.stripeCustomerId,
        Number(limit),
        startingAfter as string,
      );

      const response: IApiResponse = {
        success: true,
        data: invoices,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { paymentIntentId } = req.params;

      // Implementation for getting payment details
      const response: IApiResponse = {
        success: true,
        data: {
          paymentIntentId,
          // Add payment details
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();
