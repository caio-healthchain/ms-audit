import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();
const controller = new AuditController();

/**
 * @swagger
 * tags:
 *   name: Audits
 *   description: Operações relacionadas a auditorias médicas
 */

// Rotas principais de CRUD
router.get('/', asyncHandler(controller.list.bind(controller)));
router.get('/pending', asyncHandler(controller.getPending.bind(controller)));
router.get('/statistics', asyncHandler(controller.getStatistics.bind(controller)));
router.get('/:id', asyncHandler(controller.getById.bind(controller)));
router.post('/', asyncHandler(controller.create.bind(controller)));
router.put('/:id', asyncHandler(controller.update.bind(controller)));
router.delete('/:id', asyncHandler(controller.delete.bind(controller)));

// Rotas específicas de auditoria
router.post('/:id/approve', asyncHandler(controller.approve.bind(controller)));
router.post('/:id/reject', asyncHandler(controller.reject.bind(controller)));

export default router;
