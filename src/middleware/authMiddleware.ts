import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Customer, { ICustomer } from '@models/Customer';
import config from '@config/index';
import { AuthenticationError, AuthorizationError } from '@utils/errors';
import { ITokenPayload } from '../types/index';
import { createLogger } from '@utils/logger';

const logger = createLogger('AuthMiddleware');

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    // Verify token
    let decoded: ITokenPayload;
    try {
      decoded = jwt.verify(token, config.security.jwt.secret) as ITokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw error;
    }

    // Check token type
    if (decoded.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Find user
    const user = await Customer.findById(decoded.userId)
      .select('+loginAttempts +lockUntil')
      .lean();

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Check if user is active
    if (!user.isActive || user.isDeleted) {
      throw new AuthenticationError('Account is inactive or deleted');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new AuthenticationError('Account is locked due to multiple failed login attempts');
    }

    // Check if email is verified
    if (!user.emailVerified && config.env === 'production') {
      throw new AuthenticationError('Email not verified');
    }

    // Attach user to request
    req.user = user as ICustomer;
    req.userId = user._id.toString();

    logger.debug(`User ${user.email} authenticated successfully`);
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // For now, we don't have roles implemented, but this is where you'd check them
      // if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      //   throw new AuthorizationError('Insufficient permissions');
      // }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return next();
    }

    // Try to verify token
    try {
      const decoded = jwt.verify(token, config.security.jwt.secret) as ITokenPayload;

      if (decoded.type === 'access') {
        const user = await Customer.findById(decoded.userId).lean();
        if (user && user.isActive && !user.isDeleted) {
          req.user = user as ICustomer;
          req.userId = user._id.toString();
        }
      }
    } catch {
      // Invalid token, but that's okay for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    // Verify refresh token
    let decoded: ITokenPayload;
    try {
      decoded = jwt.verify(refreshToken, config.security.jwt.refreshSecret) as ITokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Refresh token has expired');
      }
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check token type
    if (decoded.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    // Find user and check if refresh token exists
    const user = await Customer.findById(decoded.userId).select('+refreshTokens');

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check if user is active
    if (!user.isActive || user.isDeleted) {
      throw new AuthenticationError('Account is inactive');
    }

    // Generate new tokens
    const newAccessToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    // Remove old refresh token and save new one
    user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      },
    });
  } catch (error) {
    next(error);
  }
};
