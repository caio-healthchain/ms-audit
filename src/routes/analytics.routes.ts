import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const analyticsController = new AnalyticsController();

router.get('/savings', (req, res) => analyticsController.getSavings(req, res));
router.get('/audit-metrics', (req, res) => analyticsController.getAuditMetrics(req, res));
router.get('/corrections', (req, res) => analyticsController.getCorrectionAnalysis(req, res));
router.get('/billing', (req, res) => analyticsController.getBillingAnalysis(req, res));

export default router;
