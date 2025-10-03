import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../config/logger';
import { JWTPayload } from '@/types';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    req.user = decoded;
    
    logger.info('User authenticated:', { userId: decoded.userId, role: decoded.role });
    next();
  } catch (error: unknown) {
    logger.error('Authentication failed:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token has expired',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      timestamp: new Date().toISOString(),
    });
  }
};

export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Basic permission check - can be extended based on your permission system
    logger.info(`Permission check for: ${permission}`);
    next();
  };
};
