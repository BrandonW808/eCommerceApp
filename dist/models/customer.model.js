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
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = __importDefault(require("@config/index"));
const customerSchema = new mongoose_1.Schema({
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
        select: false,
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
            validator: function (value) {
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
        of: mongoose_1.Schema.Types.Mixed,
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
}, {
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
});
customerSchema.index({ email: 1, isDeleted: 1 });
customerSchema.index({ stripeCustomerId: 1 });
customerSchema.index({ 'name.first': 'text', 'name.last': 'text', email: 'text' });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ isActive: 1, isDeleted: 1 });
customerSchema.virtual('fullName').get(function () {
    return `${this.name.first} ${this.name.last}`;
});
customerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcryptjs_1.default.genSalt(index_1.default.security.bcryptRounds);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
customerSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        const customer = await Customer.findById(this._id).select('+password');
        if (!customer || !customer.password) {
            return false;
        }
        return await bcryptjs_1.default.compare(candidatePassword, customer.password);
    }
    catch (error) {
        return false;
    }
};
customerSchema.methods.generateAuthToken = function () {
    const payload = {
        userId: this._id.toString(),
        email: this.email,
        type: 'access',
    };
    return jsonwebtoken_1.default.sign(payload, index_1.default.security.jwt.secret, {
        expiresIn: index_1.default.security.jwt.expiresIn,
    });
};
customerSchema.methods.generateRefreshToken = function () {
    const payload = {
        userId: this._id.toString(),
        email: this.email,
        type: 'refresh',
    };
    const token = jsonwebtoken_1.default.sign(payload, index_1.default.security.jwt.refreshSecret, {
        expiresIn: index_1.default.security.jwt.refreshExpiresIn,
    });
    this.refreshTokens.push(token);
    if (this.refreshTokens.length > 5) {
        this.refreshTokens.shift();
    }
    return token;
};
customerSchema.methods.generatePasswordResetToken = function () {
    const resetToken = jsonwebtoken_1.default.sign({ userId: this._id.toString(), purpose: 'password-reset' }, index_1.default.security.jwt.secret, { expiresIn: '1h' });
    this.passwordResetToken = resetToken;
    this.passwordResetExpires = new Date(Date.now() + 3600000);
    return resetToken;
};
customerSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > new Date());
};
customerSchema.methods.incrementLoginAttempts = async function () {
    if (this.lockUntil && this.lockUntil < new Date()) {
        await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 },
        });
        return;
    }
    const updates = { $inc: { loginAttempts: 1 } };
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000;
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
        updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
    }
    await this.updateOne(updates);
};
customerSchema.methods.resetLoginAttempts = async function () {
    await this.updateOne({
        $set: { loginAttempts: 0, lastLoginAt: new Date() },
        $unset: { lockUntil: 1 },
    });
};
const Customer = mongoose_1.default.model('Customer', customerSchema);
exports.default = Customer;
//# sourceMappingURL=customer.model.js.map