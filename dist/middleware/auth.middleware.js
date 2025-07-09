"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.optionalAuth = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const customer_model_1 = __importDefault(require("@models/customer.model"));
const index_1 = __importDefault(require("@config/index"));
const errors_1 = require("@utils/errors");
const logger_1 = require("@utils/logger");
const logger = (0, logger_1.createLogger)('AuthMiddleware');
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            throw new errors_1.AuthenticationError('No authentication token provided');
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, index_1.default.security.jwt.secret);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.AuthenticationError('Token has expired');
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errors_1.AuthenticationError('Invalid token');
            }
            throw error;
        }
        if (decoded.type !== 'access') {
            throw new errors_1.AuthenticationError('Invalid token type');
        }
        const user = await customer_model_1.default.findById(decoded.userId)
            .select('+loginAttempts +lockUntil')
            .lean();
        if (!user) {
            throw new errors_1.AuthenticationError('User not found');
        }
        if (!user.isActive || user.isDeleted) {
            throw new errors_1.AuthenticationError('Account is inactive or deleted');
        }
        if (user.lockUntil && user.lockUntil > new Date()) {
            throw new errors_1.AuthenticationError('Account is locked due to multiple failed login attempts');
        }
        if (!user.emailVerified && index_1.default.env === 'production') {
            throw new errors_1.AuthenticationError('Email not verified');
        }
        req.user = user;
        req.userId = user._id.toString();
        logger.debug(`User ${user.email} authenticated successfully`);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const authorize = (...allowedRoles) => {
    return (req, _res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.authorize = authorize;
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            return next();
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, index_1.default.security.jwt.secret);
            if (decoded.type === 'access') {
                const user = await customer_model_1.default.findById(decoded.userId).lean();
                if (user && user.isActive && !user.isDeleted) {
                    req.user = user;
                    req.userId = user._id.toString();
                }
            }
        }
        catch {
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.optionalAuth = optionalAuth;
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new errors_1.AuthenticationError('Refresh token is required');
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, index_1.default.security.jwt.refreshSecret);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.AuthenticationError('Refresh token has expired');
            }
            throw new errors_1.AuthenticationError('Invalid refresh token');
        }
        if (decoded.type !== 'refresh') {
            throw new errors_1.AuthenticationError('Invalid token type');
        }
        const user = await customer_model_1.default.findById(decoded.userId).select('+refreshTokens');
        if (!user) {
            throw new errors_1.AuthenticationError('User not found');
        }
        if (!user.refreshTokens.includes(refreshToken)) {
            throw new errors_1.AuthenticationError('Invalid refresh token');
        }
        if (!user.isActive || user.isDeleted) {
            throw new errors_1.AuthenticationError('Account is inactive');
        }
        const newAccessToken = user.generateAuthToken();
        const newRefreshToken = user.generateRefreshToken();
        user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
        user.refreshTokens.push(newRefreshToken);
        await user.save();
        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: 7 * 24 * 60 * 60,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshToken = refreshToken;
//# sourceMappingURL=auth.middleware.js.map