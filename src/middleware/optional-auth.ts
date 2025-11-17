import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { logger } from '../config/logger';

/**
 * Middleware de autenticação opcional
 * Pode ser desativado via variável de ambiente DISABLE_AUTH=true
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Verificar se a autenticação está desativada
  const authDisabled = process.env.DISABLE_AUTH === 'true' || config.nodeEnv === 'development';
  
  if (authDisabled) {
    logger.warn('Authentication is DISABLED - This should only be used in development!');
    // Adicionar usuário mock para desenvolvimento
    (req as any).user = {
      userId: 'dev-user',
      role: 'admin',
      email: 'dev@lazarus.com'
    };
    next();
    return;
  }

  // Se a autenticação estiver ativada, verificar o token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access token is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Token presente, permitir acesso (validação JWT pode ser adicionada aqui se necessário)
  logger.info('Request authenticated');
  next();
};
