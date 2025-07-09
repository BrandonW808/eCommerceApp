"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_controller_1 = __importDefault(require("@controllers/auth.controller"));
const validation_middleware_1 = require("@middleware/validation.middleware");
const auth_middleware_1 = require("@middleware/auth.middleware");
const security_middleware_1 = require("@middleware/security.middleware");
const router = (0, express_1.Router)();
const registerValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),
    (0, express_validator_1.body)('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
    (0, express_validator_1.body)('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters'),
    (0, express_validator_1.body)('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('address.line1').optional().trim(),
    (0, express_validator_1.body)('address.city').optional().trim(),
    (0, express_validator_1.body)('address.state').optional().trim(),
    (0, express_validator_1.body)('address.postalCode').optional().trim(),
    (0, express_validator_1.body)('address.country').optional().isISO31661Alpha2(),
];
const loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
];
const forgotPasswordValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
];
const resetPasswordValidation = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),
];
const changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character')
        .custom((value, { req }) => value !== req.body.currentPassword)
        .withMessage('New password must be different from current password'),
];
router.post('/register', security_middleware_1.authRateLimiter, registerValidation, validation_middleware_1.validate, auth_controller_1.default.register);
router.post('/login', security_middleware_1.authRateLimiter, loginValidation, validation_middleware_1.validate, auth_controller_1.default.login);
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.default.logout);
router.post('/logout-all', auth_middleware_1.authenticate, auth_controller_1.default.logoutAll);
router.post('/refresh-token', security_middleware_1.authRateLimiter, auth_middleware_1.refreshToken);
router.post('/forgot-password', security_middleware_1.authRateLimiter, forgotPasswordValidation, validation_middleware_1.validate, auth_controller_1.default.forgotPassword);
router.post('/reset-password', security_middleware_1.authRateLimiter, resetPasswordValidation, validation_middleware_1.validate, auth_controller_1.default.resetPassword);
router.post('/change-password', auth_middleware_1.authenticate, changePasswordValidation, validation_middleware_1.validate, auth_controller_1.default.changePassword);
router.get('/verify-email/:token', auth_controller_1.default.verifyEmail);
router.post('/resend-verification', auth_middleware_1.authenticate, security_middleware_1.authRateLimiter, auth_controller_1.default.resendVerificationEmail);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map