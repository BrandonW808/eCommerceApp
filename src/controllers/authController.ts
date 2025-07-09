import { Request, Response, NextFunction } from 'express';
import Customer from '@models/Customer';
import stripeService from '@services/stripeService';
import { AuthenticationError, ValidationError, ConflictError } from '@utils/errors';
import { createLogger } from '@utils/logger';
import { IApiResponse, IAuthTokens } from '../types/index';
import crypto from 'crypto';

const logger = createLogger('AuthController');

export class AuthController {
  /**
   * Register a new customer
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, phone, address, preferences } = req.body;

      // Check if customer already exists
      const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
      if (existingCustomer) {
        throw new ConflictError('An account with this email already exists');
      }

      // Create customer in database
      const customer = new Customer({
        email: email.toLowerCase(),
        password,
        name: {
          first: firstName,
          last: lastName,
        },
        phone,
        address,
        preferences,
        emailVerificationToken: crypto.randomBytes(32).toString('hex'),
      });

      // Create Stripe customer
      const stripeCustomer = await stripeService.createCustomer(customer);
      customer.stripeCustomerId = stripeCustomer.id;

      // Save customer
      await customer.save();

      // Generate tokens
      const accessToken = customer.generateAuthToken();
      const refreshToken = customer.generateRefreshToken();

      // Save refresh token
      customer.refreshTokens.push(refreshToken);
      await customer.save();

      logger.info(`New customer registered: ${customer.email}`);

      // TODO: Send verification email

      const response: IApiResponse<{
        user: typeof customer;
        tokens: IAuthTokens;
      }> = {
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
          user: customer.toJSON() as typeof customer,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
          },
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login customer
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find customer with password field
      const customer = await Customer.findOne({
        email: email.toLowerCase()
      }).select('+password +loginAttempts +lockUntil');

      if (!customer) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if account is locked
      if (customer.isLocked()) {
        throw new AuthenticationError('Account is locked due to multiple failed login attempts');
      }

      // Check password
      const isPasswordValid = await customer.comparePassword(password);

      if (!isPasswordValid) {
        await customer.incrementLoginAttempts();
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if email is verified (only in production)
      // if (!customer.emailVerified && config.env === 'production') {
      //   throw new AuthenticationError('Please verify your email before logging in');
      // }

      // Check if account is active
      if (!customer.isActive) {
        throw new AuthenticationError('Your account has been deactivated');
      }

      // Reset login attempts
      await customer.resetLoginAttempts();

      // Generate tokens
      const accessToken = customer.generateAuthToken();
      const refreshToken = customer.generateRefreshToken();

      // Save refresh token
      await customer.save();

      logger.info(`Customer logged in: ${customer.email}`);

      const response: IApiResponse<{
        user: typeof customer;
        tokens: IAuthTokens;
      }> = {
        success: true,
        message: 'Login successful',
        data: {
          user: customer.toJSON() as typeof customer,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 7 * 24 * 60 * 60,
          },
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout customer
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Remove refresh token
      if (refreshToken) {
        const customer = await Customer.findById(req.user._id).select('+refreshTokens');
        if (customer) {
          customer.refreshTokens = customer.refreshTokens.filter(
            (token) => token !== refreshToken,
          );
          await customer.save();
        }
      }

      logger.info(`Customer logged out: ${req.user.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Logout successful',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Clear all refresh tokens
      const customer = await Customer.findById(req.user._id).select('+refreshTokens');
      if (customer) {
        customer.refreshTokens = [];
        await customer.save();
      }

      logger.info(`Customer logged out from all devices: ${req.user.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Logged out from all devices',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      const customer = await Customer.findOne({ email: email.toLowerCase() });

      // Don't reveal if email exists or not for security
      const response: IApiResponse = {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      };

      if (!customer) {
        res.json(response);
        return;
      }

      // Generate reset token
      const resetToken = customer.generatePasswordResetToken();
      await customer.save();

      // TODO: Send password reset email

      logger.info(`Password reset requested for: ${customer.email}`);

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      const customer = await Customer.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!customer) {
        throw new ValidationError('Invalid or expired reset token');
      }

      // Update password
      customer.password = newPassword;
      customer.passwordResetToken = undefined;
      customer.passwordResetExpires = undefined;

      // Clear all refresh tokens for security
      customer.refreshTokens = [];

      await customer.save();

      logger.info(`Password reset successful for: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Password reset successful. Please login with your new password.',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const customer = await Customer.findById(req.user._id).select('+password');
      if (!customer) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isPasswordValid = await customer.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Update password
      customer.password = newPassword;
      await customer.save();

      logger.info(`Password changed for: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      const customer = await Customer.findOne({
        emailVerificationToken: token,
      });

      if (!customer) {
        throw new ValidationError('Invalid verification token');
      }

      customer.emailVerified = true;
      customer.emailVerificationToken = undefined;
      await customer.save();

      logger.info(`Email verified for: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Email verified successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const customer = await Customer.findById(req.user._id);
      if (!customer) {
        throw new AuthenticationError('User not found');
      }

      if (customer.emailVerified) {
        throw new ValidationError('Email already verified');
      }

      // Generate new verification token
      customer.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      await customer.save();

      // TODO: Send verification email

      logger.info(`Verification email resent to: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Verification email sent',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
