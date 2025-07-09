import { Router } from 'express';
import { body } from 'express-validator';
import authController from '@controllers/authController';
import { validate } from '@middleware/validationMiddleware';
import { authenticate, refreshToken } from '@middleware/authMiddleware';
import { authRateLimiter } from '@middleware/securityMiddleware';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('address.line1').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.postalCode').optional().trim(),
  body('address.country').optional().isISO31661Alpha2(),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password'),
];

// Routes
router.post(
  '/register',
  authRateLimiter,
  registerValidation,
  validate,
  authController.register,
);

router.post(
  '/login',
  authRateLimiter,
  loginValidation,
  validate,
  authController.login,
);

router.post(
  '/logout',
  authenticate,
  authController.logout,
);

router.post(
  '/logout-all',
  authenticate,
  authController.logoutAll,
);

router.post(
  '/refresh-token',
  authRateLimiter,
  refreshToken,
);

router.post(
  '/forgot-password',
  authRateLimiter,
  forgotPasswordValidation,
  validate,
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  authRateLimiter,
  resetPasswordValidation,
  validate,
  authController.resetPassword,
);

router.post(
  '/change-password',
  authenticate,
  changePasswordValidation,
  validate,
  authController.changePassword,
);

router.get(
  '/verify-email/:token',
  authController.verifyEmail,
);

router.post(
  '/resend-verification',
  authenticate,
  authRateLimiter,
  authController.resendVerificationEmail,
);

export default router;
