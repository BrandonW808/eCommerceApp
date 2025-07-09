import { Document, Model } from 'mongoose';
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
declare const Customer: CustomerModel;
export default Customer;
//# sourceMappingURL=customer.model.d.ts.map