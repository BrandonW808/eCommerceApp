"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("@middleware/auth.middleware");
const validation_middleware_1 = require("@middleware/validation.middleware");
const security_middleware_1 = require("@middleware/security.middleware");
const payment_controller_1 = __importDefault(require("@controllers/payment.controller"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(security_middleware_1.paymentRateLimiter);
router.post('/intent', [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isIn(['usd', 'eur', 'gbp'])
        .withMessage('Invalid currency'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 }),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject(),
], validation_middleware_1.validate, payment_controller_1.default.createPaymentIntent);
router.post('/charge', [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isIn(['usd', 'eur', 'gbp']),
    (0, express_validator_1.body)('paymentMethodId')
        .notEmpty()
        .withMessage('Payment method is required'),
    (0, express_validator_1.body)('savePaymentMethod')
        .optional()
        .isBoolean(),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 }),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject(),
], validation_middleware_1.validate, payment_controller_1.default.createPayment);
router.post('/charge-with-items', [
    (0, express_validator_1.body)('items')
        .isArray({ min: 1 })
        .withMessage('At least one item is required'),
    (0, express_validator_1.body)('items.*.description')
        .trim()
        .notEmpty()
        .isLength({ max: 200 }),
    (0, express_validator_1.body)('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    (0, express_validator_1.body)('items.*.unitPrice')
        .isFloat({ min: 0.01 })
        .withMessage('Unit price must be greater than 0'),
    (0, express_validator_1.body)('items.*.amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isIn(['usd', 'eur', 'gbp']),
    (0, express_validator_1.body)('paymentMethodId')
        .notEmpty()
        .withMessage('Payment method is required'),
    (0, express_validator_1.body)('savePaymentMethod')
        .optional()
        .isBoolean(),
], validation_middleware_1.validate, payment_controller_1.default.createPaymentWithItems);
router.post('/subscription', [
    (0, express_validator_1.body)('priceId')
        .notEmpty()
        .withMessage('Price ID is required'),
    (0, express_validator_1.body)('paymentMethodId')
        .notEmpty()
        .withMessage('Payment method is required'),
    (0, express_validator_1.body)('trialDays')
        .optional()
        .isInt({ min: 1, max: 90 }),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject(),
], validation_middleware_1.validate, payment_controller_1.default.createSubscription);
router.delete('/subscription/:subscriptionId', [
    (0, express_validator_1.param)('subscriptionId').notEmpty(),
    (0, express_validator_1.body)('immediately')
        .optional()
        .isBoolean(),
], validation_middleware_1.validate, payment_controller_1.default.cancelSubscription);
router.put('/subscription/:subscriptionId', [
    (0, express_validator_1.param)('subscriptionId').notEmpty(),
    (0, express_validator_1.body)('priceId')
        .optional()
        .notEmpty(),
    (0, express_validator_1.body)('quantity')
        .optional()
        .isInt({ min: 1 }),
], validation_middleware_1.validate, payment_controller_1.default.updateSubscription);
router.post('/refund', [
    (0, express_validator_1.body)('paymentIntentId')
        .notEmpty()
        .withMessage('Payment intent ID is required'),
    (0, express_validator_1.body)('amount')
        .optional()
        .isFloat({ min: 0.01 }),
    (0, express_validator_1.body)('reason')
        .optional()
        .isIn(['duplicate', 'fraudulent', 'requested_by_customer', 'other'])
        .withMessage('Invalid refund reason'),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject(),
], validation_middleware_1.validate, payment_controller_1.default.createRefund);
router.get('/history', [
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('startingAfter')
        .optional()
        .notEmpty(),
    (0, express_validator_1.query)('endingBefore')
        .optional()
        .notEmpty(),
], validation_middleware_1.validate, payment_controller_1.default.getPaymentHistory);
router.get('/:paymentIntentId', [(0, express_validator_1.param)('paymentIntentId').notEmpty()], validation_middleware_1.validate, payment_controller_1.default.getPaymentDetails);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map