import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { logger } from '../config/logger';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  async getSavings(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'month', date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();

      logger.info(`[Analytics] Buscando savings (período: ${period})`);

      const savings = await this.analyticsService.getSavingsSummary(
        period as string,
        targetDate
      );

      res.json({
        success: true,
        data: savings,
        period,
        date: targetDate.toISOString().split('T')[0]
      });
    } catch (error) {
      logger.error('[Analytics] Erro ao buscar savings:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar savings'
      });
    }
  }

  async getAuditMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'month', date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();

      logger.info(`[Analytics] Buscando métricas de auditoria`);

      const metrics = await this.analyticsService.getAuditMetrics(
        period as string,
        targetDate
      );

      res.json({
        success: true,
        data: metrics,
        period,
        date: targetDate.toISOString().split('T')[0]
      });
    } catch (error) {
      logger.error('[Analytics] Erro ao buscar métricas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar métricas de auditoria'
      });
    }
  }

  async getCorrectionAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'month', date, type } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();

      logger.info(`[Analytics] Buscando análise de correções`);

      const analysis = await this.analyticsService.getCorrectionAnalysis(
        type as string,
        period as string,
        targetDate
      );

      res.json({
        success: true,
        data: analysis,
        period,
        date: targetDate.toISOString().split('T')[0]
      });
    } catch (error) {
      logger.error('[Analytics] Erro ao buscar análise de correções:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar análise de correções'
      });
    }
  }

  async getBillingAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'month', date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();

      logger.info(`[Analytics] Buscando análise de faturamento`);

      const billing = await this.analyticsService.getBillingAnalysis(
        period as string,
        targetDate
      );

      res.json({
        success: true,
        data: billing,
        period,
        date: targetDate.toISOString().split('T')[0]
      });
    } catch (error) {
      logger.error('[Analytics] Erro ao buscar análise de faturamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar análise de faturamento'
      });
    }
  }
}
