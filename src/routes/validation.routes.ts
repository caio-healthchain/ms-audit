import { Router } from 'express';
import { ValidationController } from '../controllers/validation.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();
const controller = new ValidationController();

/**
 * @swagger
 * tags:
 *   name: Validations
 *   description: Operações relacionadas a validações de auditoria
 */

/**
 * @swagger
 * /api/v1/validations/guia/{guiaId}:
 *   get:
 *     tags: [Validations]
 *     summary: Obter validações de uma guia
 *     description: Retorna todas as validações associadas a uma guia específica
 *     parameters:
 *       - in: path
 *         name: guiaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da guia
 *     responses:
 *       200:
 *         description: Lista de validações da guia
 *       404:
 *         description: Guia não encontrada
 */
router.get('/guia/:guiaId', asyncHandler(controller.getByGuia.bind(controller)));

/**
 * @swagger
 * /api/v1/validations/procedimento/{procedimentoId}:
 *   get:
 *     tags: [Validations]
 *     summary: Obter validações de um procedimento
 *     description: Retorna todas as validações associadas a um procedimento específico
 *     parameters:
 *       - in: path
 *         name: procedimentoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do procedimento
 *     responses:
 *       200:
 *         description: Lista de validações do procedimento
 *       404:
 *         description: Procedimento não encontrado
 */
router.get('/procedimento/:procedimentoId', asyncHandler(controller.getByProcedimento.bind(controller)));

export default router;
