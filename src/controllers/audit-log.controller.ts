import { Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';

export class AuditLogController {
  private auditLogService: AuditLogService;

  constructor() {
    this.auditLogService = new AuditLogService();
  }

  /**
   * GET /api/v1/audit-log/guia/:guiaId
   * Busca logs de auditoria de uma guia específica
   */
  async getLogsByGuia(req: Request, res: Response): Promise<void> {
    try {
      const { guiaId } = req.params;

      const result = await this.auditLogService.getLogsByGuia(guiaId);

      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar logs da guia:', error);
      res.status(500).json({
        error: 'Erro ao buscar logs da guia',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/v1/audit-log/economia/periodo
   * Consulta economia por período
   */
  async getEconomiaPorPeriodo(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim, operadoraId } = req.query;

      const dataInicioDate = dataInicio ? new Date(dataInicio as string) : undefined;
      const dataFimDate = dataFim ? new Date(dataFim as string) : undefined;

      const result = await this.auditLogService.getEconomiaPorPeriodo(
        dataInicioDate,
        dataFimDate,
        operadoraId as string
      );

      res.json(result);
    } catch (error) {
      console.error('Erro ao consultar economia por período:', error);
      res.status(500).json({
        error: 'Erro ao consultar economia por período',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/v1/audit-log/economia/operadora
   * Consulta economia por operadora
   */
  async getEconomiaPorOperadora(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      const dataInicioDate = dataInicio ? new Date(dataInicio as string) : undefined;
      const dataFimDate = dataFim ? new Date(dataFim as string) : undefined;

      const result = await this.auditLogService.getEconomiaPorOperadora(
        dataInicioDate,
        dataFimDate
      );

      res.json(result);
    } catch (error) {
      console.error('Erro ao consultar economia por operadora:', error);
      res.status(500).json({
        error: 'Erro ao consultar economia por operadora',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/v1/audit-log/economia/auditor
   * Consulta economia por auditor
   */
  async getEconomiaPorAuditor(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      const dataInicioDate = dataInicio ? new Date(dataInicio as string) : undefined;
      const dataFimDate = dataFim ? new Date(dataFim as string) : undefined;

      const result = await this.auditLogService.getEconomiaPorAuditor(
        dataInicioDate,
        dataFimDate
      );

      res.json(result);
    } catch (error) {
      console.error('Erro ao consultar economia por auditor:', error);
      res.status(500).json({
        error: 'Erro ao consultar economia por auditor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/v1/audit-log/economia/tipo-apontamento
   * Consulta economia por tipo de apontamento
   */
  async getEconomiaPorTipoApontamento(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      const dataInicioDate = dataInicio ? new Date(dataInicio as string) : undefined;
      const dataFimDate = dataFim ? new Date(dataFim as string) : undefined;

      const result = await this.auditLogService.getEconomiaPorTipoApontamento(
        dataInicioDate,
        dataFimDate
      );

      res.json(result);
    } catch (error) {
      console.error('Erro ao consultar economia por tipo de apontamento:', error);
      res.status(500).json({
        error: 'Erro ao consultar economia por tipo de apontamento',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/v1/audit-log/resumo
   * Obtém resumo geral de economia
   */
  async getResumoGeral(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      const dataInicioDate = dataInicio ? new Date(dataInicio as string) : undefined;
      const dataFimDate = dataFim ? new Date(dataFim as string) : undefined;

      const result = await this.auditLogService.getResumoGeral(
        dataInicioDate,
        dataFimDate
      );

      res.json(result);
    } catch (error) {
      console.error('Erro ao obter resumo geral:', error);
      res.status(500).json({
        error: 'Erro ao obter resumo geral',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
