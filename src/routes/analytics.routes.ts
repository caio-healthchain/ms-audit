import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Operações de analytics e métricas de auditoria
 */

/**
 * @swagger
 * /api/v1/analytics/savings:
 *   get:
 *     tags: [Analytics]
 *     summary: Obter economia com correções
 *     description: Retorna resumo de economia (savings) gerada pelas correções do sistema
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Período de análise
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de referência (formato YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Resumo de economia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_correcoes:
 *                       type: integer
 *                     valor_original:
 *                       type: number
 *                     valor_corrigido:
 *                       type: number
 *                     saving_total:
 *                       type: number
 *                     saving_percentual:
 *                       type: number
 */
router.get('/savings', (req, res) => analyticsController.getSavings(req, res));

/**
 * @swagger
 * /api/v1/analytics/audit-metrics:
 *   get:
 *     tags: [Analytics]
 *     summary: Obter métricas de auditoria
 *     description: Retorna métricas gerais de auditoria (total, aprovadas, rejeitadas, taxa de aprovação)
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Período de análise
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de referência (formato YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Métricas de auditoria
 */
router.get('/audit-metrics', (req, res) => analyticsController.getAuditMetrics(req, res));

/**
 * @swagger
 * /api/v1/analytics/corrections:
 *   get:
 *     tags: [Analytics]
 *     summary: Análise de correções
 *     description: Retorna análise detalhada de correções por tipo
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Tipo de correção
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Período de análise
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de referência (formato YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Análise de correções
 */
router.get('/corrections', (req, res) => analyticsController.getCorrectionAnalysis(req, res));

/**
 * @swagger
 * /api/v1/analytics/billing:
 *   get:
 *     tags: [Analytics]
 *     summary: Análise de faturamento
 *     description: Retorna análise de faturamento (contas pagas, pendentes, inadimplência)
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Período de análise
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de referência (formato YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Análise de faturamento
 */
router.get('/billing', (req, res) => analyticsController.getBillingAnalysis(req, res));

export default router;
