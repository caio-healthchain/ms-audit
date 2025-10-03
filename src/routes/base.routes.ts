import { Router, Request, Response } from 'express';

const router = Router();

// Basic health endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Service is running',
    data: { status: 'healthy' },
    timestamp: new Date().toISOString(),
  });
});

export default router;
