"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const multer_1 = __importDefault(require("multer"));
const customer_model_1 = __importDefault(require("@models/customer.model"));
const stripe_service_1 = __importDefault(require("@services/stripe.service"));
const storage_service_1 = __importStar(require("@services/storage.service"));
const errors_1 = require("@utils/errors");
const logger_1 = require("@utils/logger");
const index_1 = __importDefault(require("@config/index"));
const logger = (0, logger_1.createLogger)('CustomerController');
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: index_1.default.upload.maxFileSize,
    },
    fileFilter: (_req, file, cb) => {
        if (storage_service_1.StorageService.validateFileType(file.mimetype, index_1.default.upload.allowedFileTypes)) {
            cb(null, true);
        }
        else {
            cb(new errors_1.ValidationError(`Invalid file type. Allowed types: ${index_1.default.upload.allowedFileTypes.join(', ')}`));
        }
    },
}).single('profilePicture');
class CustomerController {
    async getProfile(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const customer = await customer_model_1.default.findById(req.user._id)
                .select('-password -refreshTokens')
                .lean();
            if (!customer) {
                throw new errors_1.NotFoundError('Customer');
            }
            const response = {
                success: true,
                data: customer,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const updates = req.body;
            delete updates.email;
            delete updates.password;
            delete updates.stripeCustomerId;
            delete updates.emailVerified;
            const customer = await customer_model_1.default.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('-password -refreshTokens');
            if (!customer) {
                throw new errors_1.NotFoundError('Customer');
            }
            if (updates.name || updates.phone || updates.address) {
                await stripe_service_1.default.updateCustomer(customer.stripeCustomerId, {
                    name: customer.fullName,
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
            const response = {
                success: true,
                message: 'Profile updated successfully',
                data: customer,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async uploadProfilePicture(req, res, next) {
        upload(req, res, async (err) => {
            try {
                if (err) {
                    throw err;
                }
                if (!req.user) {
                    throw new errors_1.AuthenticationError('User not authenticated');
                }
                if (!req.file) {
                    throw new errors_1.ValidationError('No file uploaded');
                }
                const customer = await customer_model_1.default.findById(req.user._id);
                if (customer?.profilePictureUrl) {
                    try {
                        const oldFilename = customer.profilePictureUrl.split('/').pop();
                        if (oldFilename) {
                            await storage_service_1.default.deleteFile(`profile-pictures/${oldFilename}`);
                        }
                    }
                    catch (deleteError) {
                        logger.error('Failed to delete old profile picture:', deleteError);
                    }
                }
                const fileInfo = await storage_service_1.default.uploadFile(req.file.buffer, req.file.originalname, {
                    folder: 'profile-pictures',
                    contentType: req.file.mimetype,
                    metadata: {
                        customerId: req.user._id.toString(),
                    },
                });
                await customer_model_1.default.findByIdAndUpdate(req.user._id, {
                    profilePictureUrl: fileInfo.url,
                });
                logger.info(`Profile picture uploaded for customer: ${req.user.email}`);
                const response = {
                    success: true,
                    message: 'Profile picture uploaded successfully',
                    data: { url: fileInfo.url },
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    }
    async deleteProfilePicture(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.profilePictureUrl) {
                throw new errors_1.NotFoundError('Profile picture');
            }
            const filename = customer.profilePictureUrl.split('/').pop();
            if (filename) {
                await storage_service_1.default.deleteFile(`profile-pictures/${filename}`);
            }
            customer.profilePictureUrl = undefined;
            await customer.save();
            logger.info(`Profile picture deleted for customer: ${customer.email}`);
            const response = {
                success: true,
                message: 'Profile picture deleted successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getAddresses(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const customer = await customer_model_1.default.findById(req.user._id)
                .select('address billingAddress shippingAddresses')
                .lean();
            if (!customer) {
                throw new errors_1.NotFoundError('Customer');
            }
            const response = {
                success: true,
                data: {
                    primary: customer.address,
                    billing: customer.billingAddress,
                    shipping: customer.shippingAddresses,
                },
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async addAddress(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { type, isDefault, ...addressData } = req.body;
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer) {
                throw new errors_1.NotFoundError('Customer');
            }
            if (type === 'billing') {
                customer.billingAddress = addressData;
            }
            else if (type === 'shipping') {
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
            const response = {
                success: true,
                message: 'Address added successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async updateAddress(req, res, next) {
        try {
            const response = {
                success: true,
                message: 'Address updated successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAddress(req, res, next) {
        try {
            const response = {
                success: true,
                message: 'Address deleted successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getPaymentMethods(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Customer');
            }
            const paymentMethods = await stripe_service_1.default.listPaymentMethods(customer.stripeCustomerId);
            const response = {
                success: true,
                data: paymentMethods,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async addPaymentMethod(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { paymentMethodId, setAsDefault } = req.body;
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Customer');
            }
            await stripe_service_1.default.attachPaymentMethod(paymentMethodId, customer.stripeCustomerId);
            if (setAsDefault) {
                await stripe_service_1.default.setDefaultPaymentMethod(customer.stripeCustomerId, paymentMethodId);
            }
            logger.info(`Payment method added for customer: ${customer.email}`);
            const response = {
                success: true,
                message: 'Payment method added successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async setDefaultPaymentMethod(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { paymentMethodId } = req.params;
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Customer');
            }
            await stripe_service_1.default.setDefaultPaymentMethod(customer.stripeCustomerId, paymentMethodId);
            logger.info(`Default payment method set for customer: ${customer.email}`);
            const response = {
                success: true,
                message: 'Default payment method updated',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async removePaymentMethod(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { paymentMethodId } = req.params;
            await stripe_service_1.default.detachPaymentMethod(paymentMethodId);
            logger.info(`Payment method removed for customer: ${req.user.email}`);
            const response = {
                success: true,
                message: 'Payment method removed successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoices(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { limit = 10, startingAfter } = req.query;
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || !customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Customer');
            }
            const result = await stripe_service_1.default.listInvoices(customer.stripeCustomerId, Number(limit), startingAfter);
            const response = {
                success: true,
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoice(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { invoiceId } = req.params;
            const invoice = await stripe_service_1.default.getInvoice(invoiceId);
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || invoice.customer !== customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Invoice');
            }
            const response = {
                success: true,
                data: invoice,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async downloadInvoice(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { invoiceId } = req.params;
            const invoice = await stripe_service_1.default.getInvoice(invoiceId);
            const customer = await customer_model_1.default.findById(req.user._id);
            if (!customer || invoice.customer !== customer.stripeCustomerId) {
                throw new errors_1.NotFoundError('Invoice');
            }
            if (!invoice.invoice_pdf) {
                throw new errors_1.NotFoundError('Invoice PDF');
            }
            res.redirect(invoice.invoice_pdf);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAccount(req, res, next) {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { password } = req.body;
            const customer = await customer_model_1.default.findById(req.user._id).select('+password');
            if (!customer) {
                throw new errors_1.NotFoundError('Customer');
            }
            const isPasswordValid = await customer.comparePassword(password);
            if (!isPasswordValid) {
                throw new errors_1.ValidationError('Invalid password');
            }
            customer.isDeleted = true;
            customer.deletedAt = new Date();
            customer.isActive = false;
            await customer.save();
            if (customer.stripeCustomerId) {
                await stripe_service_1.default.deleteCustomer(customer.stripeCustomerId);
            }
            logger.info(`Account deleted for customer: ${customer.email}`);
            const response = {
                success: true,
                message: 'Account deleted successfully',
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CustomerController = CustomerController;
exports.default = new CustomerController();
//# sourceMappingURL=customer.controller.js.map