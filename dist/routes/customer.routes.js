"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("@middleware/auth.middleware");
const validation_middleware_1 = require("@middleware/validation.middleware");
const customer_controller_1 = __importDefault(require("@controllers/customer.controller"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/profile', customer_controller_1.default.getProfile);
router.put('/profile', [
    (0, express_validator_1.body)('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
    (0, express_validator_1.body)('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('any'),
    (0, express_validator_1.body)('dateOfBirth').optional().isISO8601(),
    (0, express_validator_1.body)('preferences.newsletter').optional().isBoolean(),
    (0, express_validator_1.body)('preferences.notifications.email').optional().isBoolean(),
    (0, express_validator_1.body)('preferences.notifications.push').optional().isBoolean(),
    (0, express_validator_1.body)('preferences.notifications.sms').optional().isBoolean(),
    (0, express_validator_1.body)('preferences.currency').optional().isIn(['USD', 'EUR', 'GBP']),
    (0, express_validator_1.body)('preferences.language').optional().isIn(['en', 'es', 'fr', 'de']),
], validation_middleware_1.validate, customer_controller_1.default.updateProfile);
router.post('/profile/picture', customer_controller_1.default.uploadProfilePicture);
router.delete('/profile/picture', customer_controller_1.default.deleteProfilePicture);
router.get('/addresses', customer_controller_1.default.getAddresses);
router.post('/addresses', [
    (0, express_validator_1.body)('type').isIn(['billing', 'shipping']),
    (0, express_validator_1.body)('line1').trim().notEmpty(),
    (0, express_validator_1.body)('city').trim().notEmpty(),
    (0, express_validator_1.body)('state').trim().notEmpty(),
    (0, express_validator_1.body)('postalCode').trim().notEmpty(),
    (0, express_validator_1.body)('country').isISO31661Alpha2(),
    (0, express_validator_1.body)('isDefault').optional().isBoolean(),
], validation_middleware_1.validate, customer_controller_1.default.addAddress);
router.put('/addresses/:addressId', [
    (0, express_validator_1.param)('addressId').isMongoId(),
    (0, express_validator_1.body)('line1').optional().trim().notEmpty(),
    (0, express_validator_1.body)('city').optional().trim().notEmpty(),
    (0, express_validator_1.body)('state').optional().trim().notEmpty(),
    (0, express_validator_1.body)('postalCode').optional().trim().notEmpty(),
    (0, express_validator_1.body)('country').optional().isISO31661Alpha2(),
    (0, express_validator_1.body)('isDefault').optional().isBoolean(),
], validation_middleware_1.validate, customer_controller_1.default.updateAddress);
router.delete('/addresses/:addressId', [(0, express_validator_1.param)('addressId').isMongoId()], validation_middleware_1.validate, customer_controller_1.default.deleteAddress);
router.get('/payment-methods', customer_controller_1.default.getPaymentMethods);
router.post('/payment-methods', [
    (0, express_validator_1.body)('paymentMethodId').notEmpty(),
    (0, express_validator_1.body)('setAsDefault').optional().isBoolean(),
], validation_middleware_1.validate, customer_controller_1.default.addPaymentMethod);
router.put('/payment-methods/:paymentMethodId/default', [(0, express_validator_1.param)('paymentMethodId').notEmpty()], validation_middleware_1.validate, customer_controller_1.default.setDefaultPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', [(0, express_validator_1.param)('paymentMethodId').notEmpty()], validation_middleware_1.validate, customer_controller_1.default.removePaymentMethod);
router.get('/invoices', customer_controller_1.default.getInvoices);
router.get('/invoices/:invoiceId', [(0, express_validator_1.param)('invoiceId').notEmpty()], validation_middleware_1.validate, customer_controller_1.default.getInvoice);
router.get('/invoices/:invoiceId/download', [(0, express_validator_1.param)('invoiceId').notEmpty()], validation_middleware_1.validate, customer_controller_1.default.downloadInvoice);
router.delete('/account', [
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required to delete account'),
    (0, express_validator_1.body)('confirmation')
        .equals('DELETE')
        .withMessage('Please type DELETE to confirm account deletion'),
], validation_middleware_1.validate, customer_controller_1.default.deleteAccount);
exports.default = router;
//# sourceMappingURL=customer.routes.js.map