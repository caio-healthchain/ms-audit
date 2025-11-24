import { Request, Response } from 'express';
import { prisma } from '../config/database';

export class ValidationController {
  /**
   * Buscar validações por guia
   */
  async getByGuia(req: Request, res: Response) {
    try {
      const { guiaId } = req.params;

      const validacoes = await prisma.auditoria_validacoes.findMany({
        where: {
          guiaId: parseInt(guiaId)
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: validacoes
      });
    } catch (error: any) {
      console.error('Erro ao buscar validações por guia:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar validações',
        error: error.message
      });
    }
  }

  /**
   * Buscar validações por procedimento
   */
  async getByProcedimento(req: Request, res: Response) {
    try {
      const { procedimentoId } = req.params;

      const validacoes = await prisma.auditoria_validacoes.findMany({
        where: {
          procedimentoId: parseInt(procedimentoId)
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: validacoes
      });
    } catch (error: any) {
      console.error('Erro ao buscar validações por procedimento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar validações',
        error: error.message
      });
    }
  }
}
