"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const customer_model_1 = __importDefault(require("@models/customer.model"));
const stripe_service_1 = __importDefault(require("@services/stripe.service"));
const errors_1 = require("@utils/errors");
const logger_1 = require("@utils/logger");
const crypto_1 = __importDefault(require("crypto"));
const logger = (0, logger_1.createLogger)('AuthController');
class AuthController {
    async register(req, res, next) {
        try {
            const { email, password, firstName, lastName, phone, address, preferences } = req.body;
            const existingCustomer = await customer_model_1.default.findOne({ email: email.toLowerCase() });
            if (existingCustomer) {
                throw new errors_1.ConflictError('An account with this email already exists');
            }
            const customer = new customer_model_1.default({
                email: email.toLowerCase(),
                password,
                name: {
                    first: firstName,
                    last: lastName,
                },
                phone,
                address,
                preferences,
                emailVerificationToken: crypto_1.default.randomBytes(32).toString('hex'),
            });
            const stripeCustomer = await stripe_service_1.default.createCustomer(customer);
            customer.stripeCustomerId = stripeCustomer.id;
            await customer.save();
            const accessToken = customer.generateAuthToken();
            const refreshToken = customer.generateRefreshToken();
            customer.refreshTokens.push(refreshToken);
            await customer.save();
            logger.info(`New customer registered: ${customer.email}`);
            const response = {
                success: true,
                message: 'Registration successful. Please verify your email.',
                data: {
                    user: customer.toJSON(),
                    tokens: {
                        accessToken,
                        refreshToken,
                        expiresIn: 7 * 24 * 60 * 60,
                    },
                },
            };
            res.status(201).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const customer = await customer_model_1.default.findOne({
                email: email.toLowerCase()
            }).select('+password +loginAttempts +lockUntil');
            if (!customer) {
                throw new errors_1.AuthenticationError('Invalid email or password');
            }
            if (customer.isLocked()) {
                throw new errors_1.AuthenticationError('Account is locked due to multiple failed login attempts');
            }
            const isPasswordValid = await customer.comparePassword(password);
            if (!isPasswordValid) {
                await customer.incrementLoginAttempts();
                throw new errors_1.AuthenticationError('Invalid email or password');
            }
            if (!customer.isActive) {
                throw new errors_1.AuthenticationError('Your account has been deactivated');
            }
            await customer.resetLoginAttempts();
            const accessToken = customer.generateAuthToken();
            const refreshToken = customer.generateRefreshToken();
            await customer.save();
            logger.info(`Customer logged in: ${customer.email}`);
            const response = {
                success: true,
                message: 'Login successful',
                data: {
                    user: customer.toJSON(),
                    tokens: {
                        accessToken,
                        refreshToken,
                        expiresIn: 7 * 24 * 60 * 60,
                    },
                },
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            if (refreshToken) {
                const customer = await customer_model_1.default.findById(req.user._id).select('+refreshTokens');
                if (customer) {
                    customer.refreshTokens = customer.refreshTokens.filter((token) => token !== refreshToken);
                    await customer.save();
                }
            }
            logger.info(`Customer logged out: ${req.user.email}`);
            const response = {
                success: true,
                message: 'Logout successful',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async logoutAll(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const customer = await customer_model_1.default.findById(req.user._id).select('+refreshTokens');
            if (customer) {
                customer.refreshTokens = [];
                await customer.save();
            }
            logger.info(`Customer logged out from all devices: ${req.user.email}`);
            const response = {
                success: true,
                message: 'Logged out from all devices',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            const customer = await customer_model_1.default.findOne({ email: email.toLowerCase() });
            const response = {
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent',
            };
            if (!customer) {
                res.json(response);
                return;
            }
            const resetToken = customer.generatePasswordResetToken();
            await customer.save();
            logger.info(`Password reset requested for: ${customer.email}`);
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            const customer = await customer_model_1.default.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: Date.now() },
            });
            if (!customer) {
                throw new errors_1.ValidationError('Invalid or expired reset token');
            }
            customer.password = newPassword;
            customer.passwordResetToken = undefined;
            customer.passwordResetExpires = undefined;
            customer.refreshTokens = [];
            await customer.save();
            logger.info(`Password reset successful for: ${customer.email}`);
            const response = {
                success: true,
                message: 'Password reset successful. Please login with your new password.',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const customer = await customer_model_1.default.findById(req.user._id).select('+password');
            if (!customer) {
                throw new errors_1.AuthenticationError('User not found');
            }
            const isPasswordValid = await customer.comparePassword(currentPassword);
            if (!isPasswordValid) {
                throw new errors_1.ValidationError('Current password is incorrect');
            }
            customer.password = newPassword;
            await customer.save();
            logger.info(`Password changed for: ${customer.email}`);
            const response = {
                success: true,
                message: 'Password changed successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async verifyEmail(req, res, next) {
        try {
            const { token } = req.params;
            const customer = await customer_model_1.default.findOne({
                emailVerificationToken: token,
            });
            if (!customer) {
                throw new errors_1.ValidationError('Invalid verification token');
            }
            customer.emailVerified = true;
            customer.emailVerificationToken = undefined;
            await customer.save();
            logger.info(`Email verified for: ${customer.email}`);
            const response = {
                success: true,
                message: 'Email verified successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async resendVerificationEmail(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer) {
                throw new errors_1.AuthenticationError('User not found');
            }
            if (customer.emailVerified) {
                throw new errors_1.ValidationError('Email already verified');
            }
            customer.emailVerificationToken = crypto_1.default.randomBytes(32).toString('hex');
            await customer.save();
            logger.info(`Verification email resent to: ${customer.email}`);
            const response = {
                success: true,
                message: 'Verification email sent',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.default = new AuthController();
//# sourceMappingURL=auth.controller.js.map