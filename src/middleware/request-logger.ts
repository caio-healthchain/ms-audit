import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from './auth';

export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString(),
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (body: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Outgoing response:', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
    });

    return originalJson.call(this, body);
  };

  next();
};

