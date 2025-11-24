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

// Rotas de consulta
router.get('/guia/:guiaId', asyncHandler(controller.getByGuia.bind(controller)));
router.get('/procedimento/:procedimentoId', asyncHandler(controller.getByProcedimento.bind(controller)));

export default router;
