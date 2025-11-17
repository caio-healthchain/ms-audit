import { Router } from 'express';
import { ProcedureController } from '../controllers/procedure.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();
const controller = new ProcedureController();

/**
 * @swagger
 * tags:
 *   name: Procedures
 *   description: Operações relacionadas a validação e aprovação de procedimentos
 */

// Rotas de validação
router.post(
  '/validate/:procedimentoId',
  asyncHandler(controller.validateProcedimento.bind(controller))
);
router.post(
  '/validate-guia/:guiaId',
  asyncHandler(controller.validateGuia.bind(controller))
);

// Rotas de aprovação/rejeição
router.post(
  '/:procedimentoId/approve',
  asyncHandler(controller.approveProcedimento.bind(controller))
);
router.post(
  '/:procedimentoId/reject',
  asyncHandler(controller.rejectProcedimento.bind(controller))
);

// Rotas de guia
router.post(
  '/guia/:guiaId/approve-all',
  asyncHandler(controller.approveGuiaInteira.bind(controller))
);
router.get('/guia/:guiaId/status', asyncHandler(controller.getGuiaStatus.bind(controller)));

export default router;
