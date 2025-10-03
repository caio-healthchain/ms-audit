import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { redisClient } from '../config/database';
import mongoose from 'mongoose';
import { config } from '../config/config';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: ms-patients
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ms-patients',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: config.nodeEnv,
    };

    res.status(200).json(health);
  } catch (error: unknown) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ms-patients',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with database connections
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health information
 *       503:
 *         description: Service or dependencies are unhealthy
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const checks = {
    service: 'healthy',
    postgres: 'unknown',
    mongodb: 'unknown',
    redis: 'unknown',
  };

  let overallStatus = 'healthy';

  try {
    // Check PostgreSQL
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'healthy';
    } catch (error: unknown) {
      checks.postgres = 'unhealthy';
      overallStatus = 'unhealthy';
    }

    // Check MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        checks.mongodb = 'healthy';
      } else {
        checks.mongodb = 'unhealthy';
        overallStatus = 'unhealthy';
      }
    } catch (error: unknown) {
      checks.mongodb = 'unhealthy';
      overallStatus = 'unhealthy';
    }

    // Check Redis
    try {
      if (redisClient.isOpen) {
        await redisClient.ping();
        checks.redis = 'healthy';
      } else {
        checks.redis = 'unhealthy';
        overallStatus = 'unhealthy';
      }
    } catch (error: unknown) {
      checks.redis = 'unhealthy';
      overallStatus = 'unhealthy';
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'ms-patients',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: config.nodeEnv,
      checks,
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error: unknown) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ms-patients',
      error: error instanceof Error ? error.message : 'Unknown error',
      checks,
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe for Kubernetes
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical dependencies are available
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe for Kubernetes
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;

