import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ProcedureValidationService } from '../services/procedure-validation.service';
import { ProcedureApprovalService } from '../services/procedure-approval.service';

export class ProcedureController extends BaseController {
  private validationService: ProcedureValidationService;
  private approvalService: ProcedureApprovalService;

  constructor() {
    super();
    this.validationService = new ProcedureValidationService();
    this.approvalService = new ProcedureApprovalService();
  }

  /**
   * @swagger
   * /api/v1/procedures/validate/{procedimentoId}:
   *   post:
   *     summary: Validar um procedimento
   *     description: Valida valor, porte e pacote de um procedimento
   *     tags:
   *       - Procedures
   *     parameters:
   *       - in: path
   *         name: procedimentoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID do procedimento
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - guiaId
   *               - operadoraId
   *             properties:
   *               guiaId:
   *                 type: integer
   *                 description: ID da guia
   *               operadoraId:
   *                 type: string
   *                 description: ID da operadora
   *     responses:
   *       200:
   *         description: Validação realizada com sucesso
   */
  async validateProcedimento(req: Request, res: Response): Promise<void> {
    try {
      const procedimentoId = parseInt(req.params.procedimentoId);
      const { guiaId, operadoraId } = req.body;

      if (!guiaId || !operadoraId) {
        this.sendError(res, 'guiaId e operadoraId são obrigatórios', 400);
        return;
      }

      const result = await this.validationService.validateProcedimento(
        guiaId,
        procedimentoId,
        operadoraId
      );

      res.json({
        success: true,
        message: 'Validação realizada com sucesso',
        data: result
      });
    } catch (error: any) {
      this.sendError(res, error.message || 'Erro ao validar procedimento', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/procedures/validate-guia/{guiaId}:
   *   post:
   *     summary: Validar todos os procedimentos de uma guia
   *     description: Valida todos os procedimentos de uma guia
   *     tags:
   *       - Procedures
   *     parameters:
   *       - in: path
   *         name: guiaId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID da guia
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - operadoraId
   *             properties:
   *               operadoraId:
   *                 type: string
   *                 description: ID da operadora
   *     responses:
   *       200:
   *         description: Validação realizada com sucesso
   */
  async validateGuia(req: Request, res: Response): Promise<void> {
    try {
      const guiaId = parseInt(req.params.guiaId);
      const { operadoraId } = req.body;

      if (!operadoraId) {
        this.sendError(res, 'operadoraId é obrigatório', 400);
        return;
      }

      const result = await this.validationService.validateGuia(guiaId, operadoraId);

      res.json({
        success: true,
        message: 'Validação da guia realizada com sucesso',
        data: result
      });
    } catch (error: any) {
      this.sendError(res, error.message || 'Erro ao validar guia', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/procedures/{procedimentoId}/approve:
   *   post:
   *     summary: Aprovar um procedimento
   *     description: Aprova um procedimento da guia
   *     tags:
   *       - Procedures
   *     parameters:
   *       - in: path
   *         name: procedimentoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID do procedimento
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - guiaId
   *               - auditorId
   *             properties:
   *               guiaId:
   *                 type: integer
   *                 description: ID da guia
   *               auditorId:
   *                 type: string
   *                 description: ID do auditor
   *               observacoes:
   *                 type: string
   *                 description: Observações da aprovação
   *     responses:
   *       200:
   *         description: Procedimento aprovado com sucesso
   */
  async approveProcedimento(req: Request, res: Response): Promise<void> {
    try {
      const procedimentoId = parseInt(req.params.procedimentoId);
      const { guiaId, auditorId, observacoes } = req.body;

      if (!guiaId || !auditorId) {
        this.sendError(res, 'guiaId e auditorId são obrigatórios', 400);
        return;
      }

      const result = await this.approvalService.approveProcedimento({
        guiaId,
        procedimentoId,
        auditorId,
        observacoes
      });

      res.json({
        success: true,
        message: 'Procedimento aprovado com sucesso',
        data: result
      });
    } catch (error: any) {
      this.sendError(res, error.message || 'Erro ao aprovar procedimento', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/procedures/{procedimentoId}/reject:
   *   post:
   *     summary: Rejeitar um procedimento
   *     description: Rejeita um procedimento da guia
   *     tags:
   *       - Procedures
   *     parameters:
   *       - in: path
   *         name: procedimentoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID do procedimento
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - guiaId
   *               - auditorId
   *             properties:
   *               guiaId:
   *                 type: integer
   *                 description: ID da guia
   *               auditorId:
   *                 type: string
   *                 description: ID do auditor
   *               observacoes:
   *                 type: string
   *                 description: Motivo da rejeição
   *     responses:
   *       200:
   *         description: Procedimento rejeitado com sucesso
   */
  async rejectProcedimento(req: Request, res: Response): Promise<void> {
    try {
      const procedimentoId = parseInt(req.params.procedimentoId);
      const { guiaId, auditorId, observacoes } = req.body;

      if (!guiaId || !auditorId) {
        this.sendError(res, 'guiaId e auditorId são obrigatórios', 400);
        return;
      }

      const result = await this.approvalService.rejectProcedimento({
        guiaId,
        procedimentoId,
        auditorId,
        observacoes
      });

      res.json({
        success: true,
        message: 'Procedimento rejeitado com sucesso',
        data: result
      });
    } catch (error: any) {
      this.sendError(res, error.message || 'Erro ao rejeitar procedimento', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/procedures/guia/{guiaId}/approve-all:
   *   post:
   *     summary: Aprovar todos os procedimentos de uma guia
   *     description: Aprova todos os procedimentos de uma guia de uma vez
   *     tags:
   *       - Procedures
   *     parameters:
   *       - in: path
   *         name: guiaId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID da guia
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - auditorId
   *             properties:
   *               auditorId:
   *                 type: string
   *                 description: ID do auditor
   *     responses:
   *       200:
   *         description: Guia inteira aprovada com sucesso
   */
  async approveGuiaInteira(req: Request, res: Response): Promise<void> {
    try {
      const guiaId = parseInt(req.params.guiaId);
      const { auditorId } = req.body;

      if (!auditorId) {
        this.sendError(res, 'auditorId é obrigatório', 400);
        return;
      }

      const result = await this.approvalService.approveGuiaInteira(guiaId, auditorId);

      res.json({
        success: true,
        message: 'Guia inteira aprovada com sucesso',
        data: result
      });
    } catch (error: any) {
      this.sendError(res, error.message || 'Erro ao aprovar guia inteira', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/procedures/guia/{guiaId}/status:
   *   get:
   *     summary: Obter status dos procedimentos de uma guia
   *     description: Retorna o status de todos os procedimentos de uma guia
   *     tags:
   *       - Procedures
   *     parameters:
   *       - in: path
   *         name: guiaId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID da guia
   *     responses:
   *       200:
   *         description: Status obtido com sucesso
   */
  async getGuiaStatus(req: Request, res: Response): Promise<void> {
    try {
      const guiaId = parseInt(req.params.guiaId);

      const result = await this.approvalService.getGuiaStatus(guiaId);

      res.json({
        success: true,
        message: 'Status da guia obtido com sucesso',
        data: result
      });
    } catch (error: any) {
      this.sendError(res, error.message || 'Erro ao obter status da guia', 500);
    }
  }
}
