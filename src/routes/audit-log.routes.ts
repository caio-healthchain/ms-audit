import { Router } from 'express';
import { AuditLogController } from '../controllers/audit-log.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();
const controller = new AuditLogController();

/**
 * @swagger
 * tags:
 *   name: AuditLog
 *   description: Operações relacionadas ao log de auditoria e economia gerada
 */

// Rotas de consulta de economia
router.get(
  '/economia/periodo',
  asyncHandler(controller.getEconomiaPorPeriodo.bind(controller))
);

router.get(
  '/economia/operadora',
  asyncHandler(controller.getEconomiaPorOperadora.bind(controller))
);

router.get(
  '/economia/auditor',
  asyncHandler(controller.getEconomiaPorAuditor.bind(controller))
);

router.get(
  '/economia/tipo-apontamento',
  asyncHandler(controller.getEconomiaPorTipoApontamento.bind(controller))
);

router.get(
  '/resumo',
  asyncHandler(controller.getResumoGeral.bind(controller))
);

export default router;
