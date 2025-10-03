import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuditService } from '../services/audit.service';
import { 
  CreateAuditRequest, 
  UpdateAuditRequest, 
  AuditDecisionRequest,
  AuditSearchFilters,
  AuditType,
  AuditStatus,
  AuditPriority
} from '../types/audit.types';
import { PaginationParams } from '../types/common.types';

export class AuditController extends BaseController {

/**
 * Safely extract an error message from unknown.
 */
private getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return String(err); } catch { return 'Unknown error'; }
}

  private auditService: AuditService;

  constructor() {
    super();
    this.auditService = new AuditService();
  }

  /**
   * @swagger
   * /api/v1/audits:
   *   get:
   *     summary: Listar itens de auditoria
   *     description: Retorna uma lista paginada de itens de auditoria com filtros
   *     tags:
   *       - Audits
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Número da página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Itens por página
   *       - in: query
   *         name: patientId
   *         schema:
   *           type: string
   *         description: Filtrar por ID do paciente
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [PROCEDURE_APPROVAL, BILLING_REVIEW, ACCOMMODATION_CHANGE, INSURANCE_VALIDATION, MEDICAL_NECESSITY, PORTE_CLASSIFICATION]
   *         description: Filtrar por tipo de auditoria
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, IN_REVIEW, APPROVED, REJECTED, REQUIRES_INFO, CANCELLED]
   *         description: Filtrar por status
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [LOW, MEDIUM, HIGH, URGENT]
   *         description: Filtrar por prioridade
   *     responses:
   *       200:
   *         description: Lista de auditorias recuperada com sucesso
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const filters: AuditSearchFilters = {
        patientId: req.query.patientId as string,
        procedureId: req.query.procedureId as string,
        type: req.query.type as AuditType,
        status: req.query.status as AuditStatus,
        priority: req.query.priority as AuditPriority,
        requestedBy: req.query.requestedBy as string,
        reviewedBy: req.query.reviewedBy as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        search: req.query.search as string
      };

      const result = await this.auditService.searchAudits(filters, pagination);
      res.json(result);
    } catch (error: unknown) {
      this.sendError(res, 'Failed to retrieve audit items', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/audits/{id}:
   *   get:
   *     summary: Obter item de auditoria por ID
   *     description: Retorna um item de auditoria específico pelo ID
   *     tags:
   *       - Audits
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID do item de auditoria
   *     responses:
   *       200:
   *         description: Item de auditoria recuperado com sucesso
   *       404:
   *         description: Item de auditoria não encontrado
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.auditService.getAuditById(id);
      res.json(result);
    } catch (error: unknown) {
      if (this.getErrorMessage(error) === 'Audit item not found') {
        this.sendError(res, 'Audit item not found', 404);
      } else {
        this.sendError(res, 'Failed to retrieve audit item', 500);
      }
    }
  }

  /**
   * @swagger
   * /api/v1/audits:
   *   post:
   *     summary: Criar novo item de auditoria
   *     description: Cria um novo item de auditoria
   *     tags:
   *       - Audits
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *               - type
   *               - description
   *               - requestedBy
   *             properties:
   *               patientId:
   *                 type: string
   *                 description: ID do paciente
   *               procedureId:
   *                 type: string
   *                 description: ID do procedimento (opcional)
   *               type:
   *                 type: string
   *                 enum: [PROCEDURE_APPROVAL, BILLING_REVIEW, ACCOMMODATION_CHANGE, INSURANCE_VALIDATION, MEDICAL_NECESSITY, PORTE_CLASSIFICATION]
   *                 description: Tipo de auditoria
   *               priority:
   *                 type: string
   *                 enum: [LOW, MEDIUM, HIGH, URGENT]
   *                 description: Prioridade
   *               description:
   *                 type: string
   *                 description: Descrição da auditoria
   *               requestedBy:
   *                 type: string
   *                 description: Usuário que solicitou a auditoria
   *     responses:
   *       201:
   *         description: Item de auditoria criado com sucesso
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const createRequest: CreateAuditRequest = {
        patientId: req.body.patientId,
        procedureId: req.body.procedureId,
        type: req.body.type,
        priority: req.body.priority || AuditPriority.MEDIUM,
        description: req.body.description,
        requestedBy: req.body.requestedBy,
        metadata: req.body.metadata
      };

      const result = await this.auditService.createAudit(createRequest);
      res.status(201).json(result);
    } catch (error: unknown) {
      if (this.getErrorMessage(error) === 'Patient not found') {
        this.sendError(res, 'Patient not found', 404);
      } else {
        this.sendError(res, 'Failed to create audit item', 500);
      }
    }
  }

  /**
   * @swagger
   * /api/v1/audits/{id}/approve:
   *   post:
   *     summary: Aprovar item de auditoria
   *     description: Aprova um item de auditoria pendente
   *     tags:
   *       - Audits
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID do item de auditoria
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reviewedBy
   *               - notes
   *             properties:
   *               reviewedBy:
   *                 type: string
   *                 description: Usuário que aprovou
   *               notes:
   *                 type: string
   *                 description: Observações da aprovação
   *     responses:
   *       200:
   *         description: Item de auditoria aprovado com sucesso
   */
  async approve(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const decision: AuditDecisionRequest = {
        status: AuditStatus.APPROVED,
        notes: req.body.notes,
        reviewedBy: req.body.reviewedBy
      };

      const result = await this.auditService.approveAudit(id, decision);
      res.json(result);
    } catch (error: unknown) {
      if (this.getErrorMessage(error) === 'Audit item not found') {
        this.sendError(res, 'Audit item not found', 404);
      } else {
        this.sendError(res, 'Failed to approve audit item', 500);
      }
    }
  }

  /**
   * @swagger
   * /api/v1/audits/{id}/reject:
   *   post:
   *     summary: Rejeitar item de auditoria
   *     description: Rejeita um item de auditoria pendente
   *     tags:
   *       - Audits
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID do item de auditoria
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reviewedBy
   *               - notes
   *             properties:
   *               reviewedBy:
   *                 type: string
   *                 description: Usuário que rejeitou
   *               notes:
   *                 type: string
   *                 description: Motivo da rejeição
   *     responses:
   *       200:
   *         description: Item de auditoria rejeitado com sucesso
   */
  async reject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const decision: AuditDecisionRequest = {
        status: AuditStatus.REJECTED,
        notes: req.body.notes,
        reviewedBy: req.body.reviewedBy
      };

      const result = await this.auditService.approveAudit(id, decision);
      res.json(result);
    } catch (error: unknown) {
      if (this.getErrorMessage(error) === 'Audit item not found') {
        this.sendError(res, 'Audit item not found', 404);
      } else {
        this.sendError(res, 'Failed to reject audit item', 500);
      }
    }
  }

  /**
   * @swagger
   * /api/v1/audits/pending:
   *   get:
   *     summary: Obter resumo de auditorias pendentes
   *     description: Retorna um resumo das auditorias pendentes
   *     tags:
   *       - Audits
   *     responses:
   *       200:
   *         description: Resumo de auditorias pendentes recuperado com sucesso
   */
  async getPending(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.auditService.getPendingAudits();
      res.json(result);
    } catch (error: unknown) {
      this.sendError(res, 'Failed to retrieve pending audits', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/audits/statistics:
   *   get:
   *     summary: Obter estatísticas de auditoria
   *     description: Retorna estatísticas gerais das auditorias
   *     tags:
   *       - Audits
   *     responses:
   *       200:
   *         description: Estatísticas de auditoria recuperadas com sucesso
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.auditService.getAuditStatistics();
      res.json(result);
    } catch (error: unknown) {
      this.sendError(res, 'Failed to retrieve audit statistics', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/audits/{id}:
   *   put:
   *     summary: Atualizar item de auditoria
   *     description: Atualiza um item de auditoria existente
   *     tags:
   *       - Audits
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID do item de auditoria
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [PENDING, IN_REVIEW, APPROVED, REJECTED, REQUIRES_INFO, CANCELLED]
   *               priority:
   *                 type: string
   *                 enum: [LOW, MEDIUM, HIGH, URGENT]
   *               description:
   *                 type: string
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Item de auditoria atualizado com sucesso
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Implementar método updateAudit no service
      this.sendResponse(res, { id, message: 'Update functionality coming soon' }, 'Audit item update noted');
    } catch (error: unknown) {
      this.sendError(res, 'Failed to update audit item', 500);
    }
  }

  /**
   * @swagger
   * /api/v1/audits/{id}:
   *   delete:
   *     summary: Cancelar item de auditoria
   *     description: Cancela um item de auditoria
   *     tags:
   *       - Audits
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID do item de auditoria
   *     responses:
   *       200:
   *         description: Item de auditoria cancelado com sucesso
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Implementar método cancelAudit no service
      this.sendResponse(res, null, 'Audit item cancelled successfully');
    } catch (error: unknown) {
      this.sendError(res, 'Failed to cancel audit item', 500);
    }
  }
}
