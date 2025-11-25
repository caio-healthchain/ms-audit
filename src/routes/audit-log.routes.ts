import { Router } from 'express';
import { AuditLogController } from '../controllers/audit-log.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();
const controller = new AuditLogController();

/**
 * @swagger
 * /api/v1/audit-log:
 *   post:
 *     tags: [AuditLog]
 *     summary: Registrar log de auditoria
 *     description: Cria uma nova entrada no log de auditoria após aprovação/rejeição
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guiaId
 *               - codigoProcedimento
 *               - tipoApontamento
 *               - valorOriginal
 *               - valorAprovado
 *               - decisao
 *             properties:
 *               guiaId:
 *                 type: string
 *               guiaNumero:
 *                 type: string
 *               procedimentoSequencial:
 *                 type: integer
 *               codigoProcedimento:
 *                 type: string
 *               descricaoProcedimento:
 *                 type: string
 *               tipoApontamento:
 *                 type: string
 *               valorOriginal:
 *                 type: number
 *               valorAprovado:
 *                 type: number
 *               economiaValor:
 *                 type: number
 *               decisao:
 *                 type: string
 *                 enum: [APROVADO, REJEITADO, PARCIALMENTE_APROVADO]
 *               auditorObservacoes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Log registrado com sucesso
 *       500:
 *         description: Erro ao registrar log
 */
router.post(
  '/',
  asyncHandler(controller.registrarLog.bind(controller))
);

/**
 * @swagger
 * tags:
 *   name: AuditLog
 *   description: Operações relacionadas ao log de auditoria e economia gerada
 */

/**
 * @swagger
 * /api/v1/audit-log/guia/{guiaId}:
 *   get:
 *     tags: [AuditLog]
 *     summary: Buscar logs de auditoria de uma guia
 *     description: Retorna o histórico completo de ações de auditoria (aprovações/rejeições) de uma guia específica
 *     parameters:
 *       - in: path
 *         name: guiaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da guia
 *     responses:
 *       200:
 *         description: Lista de logs de auditoria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   guiaId:
 *                     type: string
 *                   guiaNumero:
 *                     type: string
 *                   procedimentoSequencial:
 *                     type: integer
 *                   codigoProcedimento:
 *                     type: string
 *                   descricaoProcedimento:
 *                     type: string
 *                   tipoApontamento:
 *                     type: string
 *                     enum: [VALOR_DIVERGENTE, FORA_PACOTE, PORTE_DIVERGENTE, MATERIAL_INCLUSO, QUANTIDADE_EXCEDIDA]
 *                   valorOriginal:
 *                     type: number
 *                   valorContratado:
 *                     type: number
 *                   valorAprovado:
 *                     type: number
 *                   economiaValor:
 *                     type: number
 *                   decisao:
 *                     type: string
 *                     enum: [APROVADO, REJEITADO, PARCIALMENTE_APROVADO]
 *                   auditorId:
 *                     type: string
 *                   auditorNome:
 *                     type: string
 *                   auditorObservacoes:
 *                     type: string
 *                   dataDecisao:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Erro ao buscar logs
 */
router.get(
  '/guia/:guiaId',
  asyncHandler(controller.getLogsByGuia.bind(controller))
);

/**
 * @swagger
 * /api/v1/audit-log/economia/periodo:
 *   get:
 *     tags: [AuditLog]
 *     summary: Consultar economia por período
 *     description: Retorna a economia gerada agrupada por mês/período
 *     parameters:
 *       - in: query
 *         name: dataInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início do período (formato YYYY-MM-DD)
 *       - in: query
 *         name: dataFim
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim do período (formato YYYY-MM-DD)
 *       - in: query
 *         name: operadoraId
 *         schema:
 *           type: string
 *         description: Filtrar por operadora específica
 *     responses:
 *       200:
 *         description: Economia por período
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   periodo:
 *                     type: string
 *                   totalEconomia:
 *                     type: number
 *                   totalAcoes:
 *                     type: integer
 *       500:
 *         description: Erro ao consultar economia
 */
router.get(
  '/economia/periodo',
  asyncHandler(controller.getEconomiaPorPeriodo.bind(controller))
);

/**
 * @swagger
 * /api/v1/audit-log/economia/operadora:
 *   get:
 *     tags: [AuditLog]
 *     summary: Consultar economia por operadora
 *     description: Retorna a economia gerada agrupada por operadora
 *     parameters:
 *       - in: query
 *         name: dataInicio
 *         description: Data de início do período
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dataFim
 *         description: Data de fim do período
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Economia por operadora
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   operadoraId:
 *                     type: string
 *                   operadoraNome:
 *                     type: string
 *                   totalEconomia:
 *                     type: number
 *                   totalAcoes:
 *                     type: integer
 *       500:
 *         description: Erro ao consultar economia
 */
router.get(
  '/economia/operadora',
  asyncHandler(controller.getEconomiaPorOperadora.bind(controller))
);

/**
 * @swagger
 * /api/v1/audit-log/economia/auditor:
 *   get:
 *     tags: [AuditLog]
 *     summary: Consultar economia por auditor
 *     description: Retorna a economia gerada agrupada por auditor (ranking)
 *     parameters:
 *       - in: query
 *         name: dataInicio
 *         description: Data de início do período
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dataFim
 *         description: Data de fim do período
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Economia por auditor
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   auditorId:
 *                     type: string
 *                   auditorNome:
 *                     type: string
 *                   totalEconomia:
 *                     type: number
 *                   totalAcoes:
 *                     type: integer
 *       500:
 *         description: Erro ao consultar economia
 */
router.get(
  '/economia/auditor',
  asyncHandler(controller.getEconomiaPorAuditor.bind(controller))
);

/**
 * @swagger
 * /api/v1/audit-log/economia/tipo-apontamento:
 *   get:
 *     tags: [AuditLog]
 *     summary: Consultar economia por tipo de apontamento
 *     description: Retorna a economia gerada agrupada por tipo de apontamento
 *     parameters:
 *       - in: query
 *         name: dataInicio
 *         description: Data de início do período
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dataFim
 *         description: Data de fim do período
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Economia por tipo de apontamento
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tipoApontamento:
 *                     type: string
 *                   totalEconomia:
 *                     type: number
 *                   totalAcoes:
 *                     type: integer
 *       500:
 *         description: Erro ao consultar economia
 */
router.get(
  '/economia/tipo-apontamento',
  asyncHandler(controller.getEconomiaPorTipoApontamento.bind(controller))
);

/**
 * @swagger
 * /api/v1/audit-log/resumo:
 *   get:
 *     tags: [AuditLog]
 *     summary: Obter resumo geral de economia
 *     description: Retorna um resumo consolidado da economia gerada com totais e médias
 *     parameters:
 *       - in: query
 *         name: dataInicio
 *         description: Data de início do período
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dataFim
 *         description: Data de fim do período
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Resumo geral de economia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEconomia:
 *                   type: number
 *                   description: Economia total gerada
 *                 totalAcoes:
 *                   type: integer
 *                   description: Total de ações de auditoria
 *                 totalAprovados:
 *                   type: integer
 *                   description: Total de procedimentos aprovados
 *                 totalRejeitados:
 *                   type: integer
 *                   description: Total de procedimentos rejeitados
 *                 mediaEconomiaPorAcao:
 *                   type: number
 *                   description: Média de economia por ação
 *       500:
 *         description: Erro ao obter resumo
 */
router.get(
  '/resumo',
  asyncHandler(controller.getResumoGeral.bind(controller))
);

export default router;
