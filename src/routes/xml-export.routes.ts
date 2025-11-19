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

/**
 * @swagger
 * /api/v1/xml/export/{guiaId}:
 *   post:
 *     tags: [XMLExport]
 *     summary: Gerar XML corrigido de uma guia
 *     description: Gera um arquivo XML TISS com os valores corrigidos após auditoria
 *     parameters:
 *       - in: path
 *         name: guiaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da guia
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               incluirAprovados:
 *                 type: boolean
 *                 default: true
 *                 description: Incluir procedimentos aprovados no XML
 *               aplicarCorrecoes:
 *                 type: boolean
 *                 default: true
 *                 description: Aplicar correções de valores no XML
 *     responses:
 *       200:
 *         description: XML gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 xmlPath:
 *                   type: string
 *                   description: Caminho do arquivo XML gerado
 *                 hash:
 *                   type: string
 *                   description: Hash SHA-256 do XML para rastreabilidade
 *                 totalProcedimentos:
 *                   type: integer
 *                 valorTotal:
 *                   type: number
 *       404:
 *         description: Guia não encontrada
 *       500:
 *         description: Erro ao gerar XML
 */
router.post(
  '/export/:guiaId',
  asyncHandler(controller.exportXML.bind(controller))
);

/**
 * @swagger
 * /api/v1/xml/download/{guiaId}:
 *   get:
 *     tags: [XMLExport]
 *     summary: Baixar XML corrigido de uma guia
 *     description: Faz o download direto do arquivo XML TISS corrigido
 *     parameters:
 *       - in: path
 *         name: guiaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da guia
 *     responses:
 *       200:
 *         description: Arquivo XML
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: XML não encontrado
 *       500:
 *         description: Erro ao baixar XML
 */
router.get(
  '/download/:guiaId',
  asyncHandler(controller.downloadXML.bind(controller))
);

export default router;
