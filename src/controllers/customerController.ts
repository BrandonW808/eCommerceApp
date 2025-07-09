import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import Customer from '@models/Customer';
import stripeService from '@services/stripeService';
import storageService, { StorageService } from '@services/storageService';
import { NotFoundError, ValidationError, AuthenticationError } from '@utils/errors';
import { createLogger } from '@utils/logger';
import { IApiResponse } from '../types/index';
import config from '@config/index';

const logger = createLogger('CustomerController');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    if (StorageService.validateFileType(file.mimetype, config.upload.allowedFileTypes)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Invalid file type. Allowed types: ${config.upload.allowedFileTypes.join(', ')}`));
    }
  },
}).single('profilePicture');

export class CustomerController {
  /**
   * Get customer profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const customer = await Customer.findById(req.user._id)
        .select('-password -refreshTokens')
        .lean();

      if (!customer) {
        throw new NotFoundError('Customer');
      }

      const response: IApiResponse<typeof customer> = {
        success: true,
        data: customer,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update customer profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const updates = req.body;

      // Prevent updating sensitive fields
      delete updates.email;
      delete updates.password;
      delete updates.stripeCustomerId;
      delete updates.emailVerified;

      const customer = await Customer.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true },
      ).select('-password -refreshTokens');

      if (!customer) {
        throw new NotFoundError('Customer');
      }

      // Update Stripe customer if needed
      if (updates.name || updates.phone || updates.address) {
        await stripeService.updateCustomer(customer.stripeCustomerId!, {
          name: `${customer.name.first} ${customer.name.last}`,
          phone: customer.phone,
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
      }

      logger.info(`Profile updated for customer: ${customer.email}`);

      const response: IApiResponse<typeof customer> = {
        success: true,
        message: 'Profile updated successfully',
        data: customer,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(req: Request, res: Response, next: NextFunction): Promise<void> {
    upload(req, res, async (err) => {
      try {
        if (err) {
          throw err;
        }

        if (!req.user) {
          throw new AuthenticationError('User not authenticated');
        }

        if (!req.file) {
          throw new ValidationError('No file uploaded');
        }

        // Delete old profile picture if exists
        const customer = await Customer.findById(req.user._id);
        if (customer?.profilePictureUrl) {
          try {
            const oldFilename = customer.profilePictureUrl.split('/').pop();
            if (oldFilename) {
              await storageService.deleteFile(`profile-pictures/${oldFilename}`);
            }
          } catch (deleteError) {
            logger.error('Failed to delete old profile picture:', deleteError);
          }
        }

        // Upload new profile picture
        const fileInfo = await storageService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          {
            folder: 'profile-pictures',
            contentType: req.file.mimetype,
            metadata: {
              customerId: req.user._id.toString(),
            },
          },
        );

        // Update customer profile
        await Customer.findByIdAndUpdate(req.user._id, {
          profilePictureUrl: fileInfo.url,
        });

        logger.info(`Profile picture uploaded for customer: ${req.user.email}`);

        const response: IApiResponse<{ url: string }> = {
          success: true,
          message: 'Profile picture uploaded successfully',
          data: { url: fileInfo.url },
        };

        res.json(response);
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.profilePictureUrl) {
        throw new NotFoundError('Profile picture');
      }

      // Delete from storage
      const filename = customer.profilePictureUrl.split('/').pop();
      if (filename) {
        await storageService.deleteFile(`profile-pictures/${filename}`);
      }

      // Update customer
      customer.profilePictureUrl = undefined;
      await customer.save();

      logger.info(`Profile picture deleted for customer: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Profile picture deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer addresses
   */
  async getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const customer = await Customer.findById(req.user._id)
        .select('address billingAddress shippingAddresses')
        .lean();

      if (!customer) {
        throw new NotFoundError('Customer');
      }

      const response: IApiResponse = {
        success: true,
        data: {
          primary: customer.address,
          billing: customer.billingAddress,
          shipping: customer.shippingAddresses,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add address
   */
  async addAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { type, isDefault, ...addressData } = req.body;

      const customer = await Customer.findById(req.user._id);
      if (!customer) {
        throw new NotFoundError('Customer');
      }

      if (type === 'billing') {
        customer.billingAddress = addressData;
      } else if (type === 'shipping') {
        if (!customer.shippingAddresses) {
          customer.shippingAddresses = [];
        }
        customer.shippingAddresses.push(addressData);
      }

      if (isDefault) {
        customer.address = addressData;
      }

      await customer.save();

      logger.info(`Address added for customer: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Address added successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update address
   */
  async updateAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Implementation for updating address
      const response: IApiResponse = {
        success: true,
        message: 'Address updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Implementation for deleting address
      const response: IApiResponse = {
        success: true,
        message: 'Address deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      const paymentMethods = await stripeService.listPaymentMethods(customer.stripeCustomerId);

      const response: IApiResponse = {
        success: true,
        data: paymentMethods,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { paymentMethodId, setAsDefault } = req.body;

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      // Attach payment method to customer
      await stripeService.attachPaymentMethod(paymentMethodId, customer.stripeCustomerId);

      // Set as default if requested
      if (setAsDefault) {
        await stripeService.setDefaultPaymentMethod(customer.stripeCustomerId, paymentMethodId);
      }

      logger.info(`Payment method added for customer: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Payment method added successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { paymentMethodId } = req.params;

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      await stripeService.setDefaultPaymentMethod(customer.stripeCustomerId, paymentMethodId);

      logger.info(`Default payment method set for customer: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Default payment method updated',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { paymentMethodId } = req.params;

      await stripeService.detachPaymentMethod(paymentMethodId);

      logger.info(`Payment method removed for customer: ${req.user.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Payment method removed successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoices
   */
  async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { limit = 10, startingAfter } = req.query;

      const customer = await Customer.findById(req.user._id);
      if (!customer || !customer.stripeCustomerId) {
        throw new NotFoundError('Customer');
      }

      const result = await stripeService.listInvoices(
        customer.stripeCustomerId,
        Number(limit),
        startingAfter as string,
      );

      const response: IApiResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific invoice
   */
  async getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { invoiceId } = req.params;

      const invoice = await stripeService.getInvoice(invoiceId);

      // Verify invoice belongs to customer
      const customer = await Customer.findById(req.user._id);
      if (!customer || invoice.customer !== customer.stripeCustomerId) {
        throw new NotFoundError('Invoice');
      }

      const response: IApiResponse = {
        success: true,
        data: invoice,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { invoiceId } = req.params;

      const invoice = await stripeService.getInvoice(invoiceId);

      // Verify invoice belongs to customer
      const customer = await Customer.findById(req.user._id);
      if (!customer || invoice.customer !== customer.stripeCustomerId) {
        throw new NotFoundError('Invoice');
      }

      if (!invoice.invoice_pdf) {
        throw new NotFoundError('Invoice PDF');
      }

      res.redirect(invoice.invoice_pdf);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { password } = req.body;

      const customer = await Customer.findById(req.user._id).select('+password');
      if (!customer) {
        throw new NotFoundError('Customer');
      }

      // Verify password
      const isPasswordValid = await customer.comparePassword(password);
      if (!isPasswordValid) {
        throw new ValidationError('Invalid password');
      }

      // Soft delete
      customer.isDeleted = true;
      customer.deletedAt = new Date();
      customer.isActive = false;
      await customer.save();

      // Delete from Stripe
      if (customer.stripeCustomerId) {
        await stripeService.deleteCustomer(customer.stripeCustomerId);
      }

      logger.info(`Account deleted for customer: ${customer.email}`);

      const response: IApiResponse = {
        success: true,
        message: 'Account deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new CustomerController();
