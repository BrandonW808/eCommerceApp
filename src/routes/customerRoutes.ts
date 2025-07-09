import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '@middleware/authMiddleware';
import { validate } from '@middleware/validationMiddleware';
import customerController from '@controllers/customerController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get customer profile
router.get('/profile', customerController.getProfile);

// Update customer profile
router.put(
  '/profile',
  [
    body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
    body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
    body('phone').optional().isMobilePhone('any'),
    body('dateOfBirth').optional().isISO8601(),
    body('preferences.newsletter').optional().isBoolean(),
    body('preferences.notifications.email').optional().isBoolean(),
    body('preferences.notifications.push').optional().isBoolean(),
    body('preferences.notifications.sms').optional().isBoolean(),
    body('preferences.currency').optional().isIn(['USD', 'EUR', 'GBP']),
    body('preferences.language').optional().isIn(['en', 'es', 'fr', 'de']),
  ],
  validate,
  customerController.updateProfile,
);

// Upload profile picture
router.post(
  '/profile/picture',
  customerController.uploadProfilePicture,
);

// Delete profile picture
router.delete(
  '/profile/picture',
  customerController.deleteProfilePicture,
);

// Get addresses
router.get('/addresses', customerController.getAddresses);

// Add address
router.post(
  '/addresses',
  [
    body('type').isIn(['billing', 'shipping']),
    body('line1').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('state').trim().notEmpty(),
    body('postalCode').trim().notEmpty(),
    body('country').isISO31661Alpha2(),
    body('isDefault').optional().isBoolean(),
  ],
  validate,
  customerController.addAddress,
);

// Update address
router.put(
  '/addresses/:addressId',
  [
    param('addressId').isMongoId(),
    body('line1').optional().trim().notEmpty(),
    body('city').optional().trim().notEmpty(),
    body('state').optional().trim().notEmpty(),
    body('postalCode').optional().trim().notEmpty(),
    body('country').optional().isISO31661Alpha2(),
    body('isDefault').optional().isBoolean(),
  ],
  validate,
  customerController.updateAddress,
);

// Delete address
router.delete(
  '/addresses/:addressId',
  [param('addressId').isMongoId()],
  validate,
  customerController.deleteAddress,
);

// Get payment methods
router.get('/payment-methods', customerController.getPaymentMethods);

// Add payment method
router.post(
  '/payment-methods',
  [
    body('paymentMethodId').notEmpty(),
    body('setAsDefault').optional().isBoolean(),
  ],
  validate,
  customerController.addPaymentMethod,
);

// Set default payment method
router.put(
  '/payment-methods/:paymentMethodId/default',
  [param('paymentMethodId').notEmpty()],
  validate,
  customerController.setDefaultPaymentMethod,
);

// Remove payment method
router.delete(
  '/payment-methods/:paymentMethodId',
  [param('paymentMethodId').notEmpty()],
  validate,
  customerController.removePaymentMethod,
);

// Get invoices
router.get('/invoices', customerController.getInvoices);

// Get specific invoice
router.get(
  '/invoices/:invoiceId',
  [param('invoiceId').notEmpty()],
  validate,
  customerController.getInvoice,
);

// Download invoice PDF
router.get(
  '/invoices/:invoiceId/download',
  [param('invoiceId').notEmpty()],
  validate,
  customerController.downloadInvoice,
);

// Delete account
router.delete(
  '/account',
  [
    body('password').notEmpty().withMessage('Password is required to delete account'),
    body('confirmation')
      .equals('DELETE')
      .withMessage('Please type DELETE to confirm account deletion'),
  ],
  validate,
  customerController.deleteAccount,
);

export default router;
