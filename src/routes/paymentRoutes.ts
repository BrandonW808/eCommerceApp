import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '@middleware/authMiddleware';
import { validate } from '@middleware/validationMiddleware';
import { paymentRateLimiter } from '@middleware/securityMiddleware';
import paymentController from '@controllers/paymentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Apply payment rate limiter
router.use(paymentRateLimiter);

// Create payment intent
router.post(
  '/intent',
  [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('currency')
      .optional()
      .isIn(['usd', 'eur', 'gbp'])
      .withMessage('Invalid currency'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('metadata')
      .optional()
      .isObject(),
  ],
  validate,
  paymentController.createPaymentIntent,
);

// Create payment with invoice
router.post(
  '/charge',
  [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('currency')
      .optional()
      .isIn(['usd', 'eur', 'gbp']),
    body('paymentMethodId')
      .notEmpty()
      .withMessage('Payment method is required'),
    body('savePaymentMethod')
      .optional()
      .isBoolean(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('metadata')
      .optional()
      .isObject(),
  ],
  validate,
  paymentController.createPayment,
);

// Create payment with multiple items
router.post(
  '/charge-with-items',
  [
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.description')
      .trim()
      .notEmpty()
      .isLength({ max: 200 }),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    body('items.*.unitPrice')
      .isFloat({ min: 0.01 })
      .withMessage('Unit price must be greater than 0'),
    body('items.*.amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('currency')
      .optional()
      .isIn(['usd', 'eur', 'gbp']),
    body('paymentMethodId')
      .notEmpty()
      .withMessage('Payment method is required'),
    body('savePaymentMethod')
      .optional()
      .isBoolean(),
  ],
  validate,
  paymentController.createPaymentWithItems,
);

// Create subscription
router.post(
  '/subscription',
  [
    body('priceId')
      .notEmpty()
      .withMessage('Price ID is required'),
    body('paymentMethodId')
      .notEmpty()
      .withMessage('Payment method is required'),
    body('trialDays')
      .optional()
      .isInt({ min: 1, max: 90 }),
    body('metadata')
      .optional()
      .isObject(),
  ],
  validate,
  paymentController.createSubscription,
);

// Cancel subscription
router.delete(
  '/subscription/:subscriptionId',
  [
    param('subscriptionId').notEmpty(),
    body('immediately')
      .optional()
      .isBoolean(),
  ],
  validate,
  paymentController.cancelSubscription,
);

// Update subscription
router.put(
  '/subscription/:subscriptionId',
  [
    param('subscriptionId').notEmpty(),
    body('priceId')
      .optional()
      .notEmpty(),
    body('quantity')
      .optional()
      .isInt({ min: 1 }),
  ],
  validate,
  paymentController.updateSubscription,
);

// Create refund
router.post(
  '/refund',
  [
    body('paymentIntentId')
      .notEmpty()
      .withMessage('Payment intent ID is required'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 }),
    body('reason')
      .optional()
      .isIn(['duplicate', 'fraudulent', 'requested_by_customer', 'other'])
      .withMessage('Invalid refund reason'),
    body('metadata')
      .optional()
      .isObject(),
  ],
  validate,
  paymentController.createRefund,
);

// Get payment history
router.get(
  '/history',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('startingAfter')
      .optional()
      .notEmpty(),
    query('endingBefore')
      .optional()
      .notEmpty(),
  ],
  validate,
  paymentController.getPaymentHistory,
);

// Get payment details
router.get(
  '/:paymentIntentId',
  [param('paymentIntentId').notEmpty()],
  validate,
  paymentController.getPaymentDetails,
);

export default router;
