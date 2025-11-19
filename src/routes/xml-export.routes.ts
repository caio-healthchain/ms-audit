import { Router } from 'express';
import { XMLExportController } from '../controllers/xml-export.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();
const controller = new XMLExportController();

/**
 * @swagger
 * tags:
 *   name: XMLExport
 *   description: Operações relacionadas à exportação de XML corrigido
 */

// Rotas de exportação de XML
router.post(
  '/export/:guiaId',
  asyncHandler(controller.exportXML.bind(controller))
);

router.get(
  '/download/:guiaId',
  asyncHandler(controller.downloadXML.bind(controller))
);

export default router;
