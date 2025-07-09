import Stripe from 'stripe';
import config from '@config/index';
import { PaymentError, ExternalServiceError } from '@utils/errors';
import { createLogger } from '@utils/logger';
import { ICustomer } from '@models/Customer';
import { IInvoiceItem, PaymentStatus } from '../types/index';

const logger = createLogger('StripeService');

export class StripeService {
  private stripe: Stripe;
  private static instance: StripeService;

  private constructor() {
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: config.stripe.apiVersion as Stripe.LatestApiVersion,
      typescript: true,
    });
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(customer: ICustomer): Promise<Stripe.Customer> {
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
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw new ExternalServiceError('Stripe', 'Failed to create customer', error);
    }
  }

  /**
   * Update a Stripe customer
   */
  async updateCustomer(
    stripeCustomerId: string,
    updates: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(stripeCustomerId, updates);
      logger.info(`Stripe customer updated: ${customer.id}`);
      return customer;
    } catch (error) {
      logger.error('Failed to update Stripe customer:', error);
      throw new ExternalServiceError('Stripe', 'Failed to update customer', error);
    }
  }

  /**
   * Delete a Stripe customer
   */
  async deleteCustomer(stripeCustomerId: string): Promise<Stripe.DeletedCustomer> {
    try {
      const deleted = await this.stripe.customers.del(stripeCustomerId);
      logger.info(`Stripe customer deleted: ${stripeCustomerId}`);
      return deleted;
    } catch (error) {
      logger.error('Failed to delete Stripe customer:', error);
      throw new ExternalServiceError('Stripe', 'Failed to delete customer', error);
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      logger.info(`Payment method attached: ${paymentMethodId} to customer: ${customerId}`);
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to attach payment method:', error);
      throw new PaymentError('Failed to attach payment method', error);
    }
  }

  /**
   * Set default payment method for a customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      logger.info(`Default payment method set for customer: ${customerId}`);
      return customer;
    } catch (error) {
      logger.error('Failed to set default payment method:', error);
      throw new PaymentError('Failed to set default payment method', error);
    }
  }

  /**
   * List customer's payment methods
   */
  async listPaymentMethods(
    customerId: string,
    type: 'card' | 'bank_account' = 'card',
  ): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: type as Stripe.PaymentMethodListParams.Type,
      });
      return paymentMethods.data;
    } catch (error) {
      logger.error('Failed to list payment methods:', error);
      throw new ExternalServiceError('Stripe', 'Failed to list payment methods', error);
    }
  }

  /**
   * Detach a payment method
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      logger.info(`Payment method detached: ${paymentMethodId}`);
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to detach payment method:', error);
      throw new PaymentError('Failed to remove payment method', error);
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    customerId?: string,
    paymentMethodId?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const params: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
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
    } catch (error) {
      logger.error('Failed to create payment intent:', error);
      throw new PaymentError('Failed to create payment', error);
    }
  }

  /**
   * Create an invoice with items and charge immediately
   */
  async createAndChargeInvoice(
    customerId: string,
    items: IInvoiceItem[],
    paymentMethodId?: string,
    description?: string,
  ): Promise<{
    invoice: Stripe.Invoice;
    paymentIntent: Stripe.PaymentIntent | null;
    status: PaymentStatus;
  }> {
    try {
      // Create invoice items
      const invoiceItemPromises = items.map((item) =>
        this.stripe.invoiceItems.create({
          customer: customerId,
          amount: Math.round(item.amount * 100), // Convert to cents
          currency: 'usd',
          description: item.description,
          quantity: item.quantity,
          metadata: {
            unitPrice: item.unitPrice.toString(),
            tax: item.tax?.toString() || '0',
            discount: item.discount?.toString() || '0',
          },
        }),
      );

      await Promise.all(invoiceItemPromises);

      // Create the invoice
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

      // Finalize the invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id!);

      // Pay the invoice
      let paidInvoice: Stripe.Invoice;
      let paymentIntent: Stripe.PaymentIntent | null = null;
      let status: PaymentStatus = PaymentStatus.PENDING;

      try {
        const payParams: Stripe.InvoicePayParams = {
          off_session: true,
        };

        if (paymentMethodId) {
          payParams.payment_method = paymentMethodId;
        }

        paidInvoice = await this.stripe.invoices.pay(invoice.id!, payParams);

        if (paidInvoice.payments && paidInvoice.payments.data[0].payment.payment_intent) {
          paymentIntent = await this.stripe.paymentIntents.retrieve(
            paidInvoice.payments.data[0].payment.payment_intent as string,
          );
          status = this.mapPaymentIntentStatus(paymentIntent.status);
        }

        logger.info(`Invoice created and paid: ${paidInvoice.id}`);
      } catch (payError) {
        logger.error('Failed to pay invoice:', payError);
        paidInvoice = finalizedInvoice;
        status = PaymentStatus.FAILED;
      }

      return {
        invoice: paidInvoice,
        paymentIntent,
        status,
      };
    } catch (error) {
      logger.error('Failed to create and charge invoice:', error);
      throw new PaymentError('Failed to process payment', error);
    }
  }

  /**
   * Retrieve an invoice
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      logger.error('Failed to retrieve invoice:', error);
      throw new ExternalServiceError('Stripe', 'Failed to retrieve invoice', error);
    }
  }

  /**
   * List customer invoices
   */
  async listInvoices(
    customerId: string,
    limit: number = 10,
    startingAfter?: string,
  ): Promise<{
    invoices: Stripe.Invoice[];
    hasMore: boolean;
  }> {
    try {
      const params: Stripe.InvoiceListParams = {
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
    } catch (error) {
      logger.error('Failed to list invoices:', error);
      throw new ExternalServiceError('Stripe', 'Failed to list invoices', error);
    }
  }

  /**
   * Send invoice to customer email
   */
  async sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.sendInvoice(invoiceId);
      logger.info(`Invoice sent: ${invoiceId}`);
      return invoice;
    } catch (error) {
      logger.error('Failed to send invoice:', error);
      throw new ExternalServiceError('Stripe', 'Failed to send invoice', error);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        metadata: {
          reason: reason || 'Customer request',
        },
      };

      if (amount) {
        params.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(params);
      logger.info(`Refund created: ${refund.id} for payment: ${paymentIntentId}`);
      return refund;
    } catch (error) {
      logger.error('Failed to create refund:', error);
      throw new PaymentError('Failed to process refund', error);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
    } catch (error) {
      logger.error('Invalid webhook signature:', error);
      throw new PaymentError('Invalid webhook signature', error);
    }
  }

  /**
   * Map Stripe payment intent status to our status enum
   */
  private mapPaymentIntentStatus(
    status: Stripe.PaymentIntent.Status,
  ): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      requires_payment_method: PaymentStatus.PENDING,
      requires_confirmation: PaymentStatus.PENDING,
      requires_action: PaymentStatus.PENDING,
      processing: PaymentStatus.PROCESSING,
      requires_capture: PaymentStatus.PROCESSING,
      canceled: PaymentStatus.CANCELLED,
      succeeded: PaymentStatus.SUCCEEDED,
    };

    return statusMap[status] || PaymentStatus.FAILED;
  }
}

export default StripeService.getInstance();
