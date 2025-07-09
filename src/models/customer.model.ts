import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '@config/index';
import { IAddress, IPaymentMethod } from '@types/index';

export interface ICustomer extends Document {
  _id: string;
  email: string;
  password: string;
  name: {
    first: string;
    last: string;
  };
  phone?: string;
  dateOfBirth?: Date;
  address?: IAddress;
  billingAddress?: IAddress;
  shippingAddresses?: IAddress[];
  stripeCustomerId?: string;
  paymentMethods?: IPaymentMethod[];
  profilePictureUrl?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  refreshTokens: string[];
  lastLoginAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  preferences: {
    newsletter: boolean;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    currency: string;
    language: string;
  };
  metadata?: Map<string, unknown>;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
  generatePasswordResetToken(): string;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  toJSON(): unknown;
}

export interface ICustomerMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
  generatePasswordResetToken(): string;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

type CustomerModel = Model<ICustomer, {}, ICustomerMethods>;

const customerSchema = new Schema<ICustomer, CustomerModel, ICustomerMethods>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password by default
    },
    name: {
      first: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
      },
      last: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
      },
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number'],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (value: Date) {
          return value < new Date();
        },
        message: 'Date of birth must be in the past',
      },
    },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    billingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    shippingAddresses: [
      {
        line1: String,
        line2: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
      },
    ],
    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paymentMethods: [
      {
        id: String,
        type: {
          type: String,
          enum: ['card', 'bank_account', 'paypal'],
        },
        last4: String,
        brand: String,
        expiryMonth: Number,
        expiryYear: Number,
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    profilePictureUrl: String,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    refreshTokens: {
      type: [String],
      select: false,
    },
    lastLoginAt: Date,
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    preferences: {
      newsletter: {
        type: Boolean,
        default: false,
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
      },
      currency: {
        type: String,
        default: 'USD',
      },
      language: {
        type: String,
        default: 'en',
      },
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        delete ret.password;
        delete ret.__v;
        delete ret.refreshTokens;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.twoFactorSecret;
        return ret;
      },
    },
  },
);

// Indexes
customerSchema.index({ email: 1, isDeleted: 1 });
customerSchema.index({ stripeCustomerId: 1 });
customerSchema.index({ 'name.first': 'text', 'name.last': 'text', email: 'text' });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ isActive: 1, isDeleted: 1 });

// Virtual for full name
customerSchema.virtual('fullName').get(function (this: ICustomer) {
  return `${this.name.first} ${this.name.last}`;
});

// Pre-save hook for password hashing
customerSchema.pre<ICustomer>('save', async function (next) {
  // Only hash the password if it's new or has been modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
customerSchema.methods.comparePassword = async function (
  this: ICustomer,
  candidatePassword: string,
): Promise<boolean> {
  try {
    // Need to explicitly select password field
    const customer = await Customer.findById(this._id).select('+password');
    if (!customer || !customer.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, customer.password);
  } catch (error) {
    return false;
  }
};

// Generate JWT token
customerSchema.methods.generateAuthToken = function (this: ICustomer): string {
  const payload = {
    userId: this._id.toString(),
    email: this.email,
    type: 'access',
  };

  return jwt.sign(payload, config.security.jwt.secret, {
    expiresIn: config.security.jwt.expiresIn,
  });
};

// Generate refresh token
customerSchema.methods.generateRefreshToken = function (this: ICustomer): string {
  const payload = {
    userId: this._id.toString(),
    email: this.email,
    type: 'refresh',
  };

  const token = jwt.sign(payload, config.security.jwt.refreshSecret, {
    expiresIn: config.security.jwt.refreshExpiresIn,
  });

  // Store the refresh token
  this.refreshTokens.push(token);
  if (this.refreshTokens.length > 5) {
    this.refreshTokens.shift(); // Keep only the last 5 refresh tokens
  }

  return token;
};

// Generate password reset token
customerSchema.methods.generatePasswordResetToken = function (this: ICustomer): string {
  const resetToken = jwt.sign(
    { userId: this._id.toString(), purpose: 'password-reset' },
    config.security.jwt.secret,
    { expiresIn: '1h' },
  );

  this.passwordResetToken = resetToken;
  this.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

  return resetToken;
};

// Check if account is locked
customerSchema.methods.isLocked = function (this: ICustomer): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Increment login attempts
customerSchema.methods.incrementLoginAttempts = async function (this: ICustomer): Promise<void> {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
    return;
  }

  // Otherwise we're incrementing attempts
  const updates: Partial<ICustomer> = { $inc: { loginAttempts: 1 } } as Partial<ICustomer>;

  // Lock the account after 5 attempts for 2 hours
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
  }

  await this.updateOne(updates);
};

// Reset login attempts
customerSchema.methods.resetLoginAttempts = async function (this: ICustomer): Promise<void> {
  await this.updateOne({
    $set: { loginAttempts: 0, lastLoginAt: new Date() },
    $unset: { lockUntil: 1 },
  });
};

const Customer = mongoose.model<ICustomer, CustomerModel>('Customer', customerSchema);

export default Customer;
