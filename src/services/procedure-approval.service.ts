import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ApprovalRequest {
  guiaId: number;
  procedimentoId: number;
  auditorId: string;
  observacoes?: string;
}

export interface ApprovalResult {
  success: boolean;
  procedimentoId: number;
  status: string;
  mensagem: string;
}

export class ProcedureApprovalService {
  /**
   * Aprova um procedimento
   */
  async approveProcedimento(request: ApprovalRequest): Promise<ApprovalResult> {
    try {
      const { guiaId, procedimentoId, auditorId, observacoes } = request;

      // Verificar se o procedimento existe
      const procedimento = await prisma.guia_procedimentos.findUnique({
        where: { id: procedimentoId }
      });

      if (!procedimento) {
        throw new Error('Procedimento não encontrado');
      }

      // Atualizar ou criar status do procedimento
      await prisma.procedimento_status.upsert({
        where: {
          guiaId_procedimentoId: {
            guiaId,
            procedimentoId
          }
        },
        create: {
          guiaId,
          procedimentoId,
          status: 'APROVADO',
          auditorId,
          observacoes
        },
        update: {
          status: 'APROVADO',
          auditorId,
          observacoes,
          updatedAt: new Date()
        }
      });

      // Atualizar validações para status CONFORME
      await prisma.auditoria_validacoes.updateMany({
        where: {
          guiaId,
          procedimentoId
        },
        data: {
          status: 'CONFORME',
          auditorId,
          dataValidacao: new Date()
        }
      });

      return {
        success: true,
        procedimentoId,
        status: 'APROVADO',
        mensagem: 'Procedimento aprovado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao aprovar procedimento:', error);
      throw error;
    }
  }

  /**
   * Rejeita um procedimento
   */
  async rejectProcedimento(request: ApprovalRequest): Promise<ApprovalResult> {
    try {
      const { guiaId, procedimentoId, auditorId, observacoes } = request;

      // Verificar se o procedimento existe
      const procedimento = await prisma.guia_procedimentos.findUnique({
        where: { id: procedimentoId }
      });

      if (!procedimento) {
        throw new Error('Procedimento não encontrado');
      }

      // Atualizar ou criar status do procedimento
      await prisma.procedimento_status.upsert({
        where: {
          guiaId_procedimentoId: {
            guiaId,
            procedimentoId
          }
        },
        create: {
          guiaId,
          procedimentoId,
          status: 'REJEITADO',
          auditorId,
          observacoes
        },
        update: {
          status: 'REJEITADO',
          auditorId,
          observacoes,
          updatedAt: new Date()
        }
      });

      // Atualizar validações para status DIVERGENTE
      await prisma.auditoria_validacoes.updateMany({
        where: {
          guiaId,
          procedimentoId
        },
        data: {
          status: 'DIVERGENTE',
          auditorId,
          dataValidacao: new Date(),
          observacoes
        }
      });

      return {
        success: true,
        procedimentoId,
        status: 'REJEITADO',
        mensagem: 'Procedimento rejeitado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao rejeitar procedimento:', error);
      throw error;
    }
  }

  /**
   * Aprova múltiplos procedimentos de uma vez
   */
  async approveBatch(requests: ApprovalRequest[]): Promise<ApprovalResult[]> {
    try {
      const results = await Promise.all(
        requests.map((request) => this.approveProcedimento(request))
      );
      return results;
    } catch (error) {
      console.error('Erro ao aprovar procedimentos em lote:', error);
      throw error;
    }
  }

  /**
   * Rejeita múltiplos procedimentos de uma vez
   */
  async rejectBatch(requests: ApprovalRequest[]): Promise<ApprovalResult[]> {
    try {
      const results = await Promise.all(
        requests.map((request) => this.rejectProcedimento(request))
      );
      return results;
    } catch (error) {
      console.error('Erro ao rejeitar procedimentos em lote:', error);
      throw error;
    }
  }

  /**
   * Aprova todos os procedimentos de uma guia
   */
  async approveGuiaInteira(guiaId: number, auditorId: string): Promise<any> {
    try {
      // Buscar todos os procedimentos da guia
      const procedimentos = await prisma.guia_procedimentos.findMany({
        where: { guiaId }
      });

      const requests: ApprovalRequest[] = procedimentos.map((proc) => ({
        guiaId,
        procedimentoId: proc.id,
        auditorId,
        observacoes: 'Aprovação em lote - Guia inteira'
      }));

      const results = await this.approveBatch(requests);

      return {
        success: true,
        guiaId,
        totalProcedimentos: procedimentos.length,
        aprovados: results.filter((r) => r.success).length,
        mensagem: 'Guia inteira aprovada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao aprovar guia inteira:', error);
      throw error;
    }
  }

  /**
   * Obtém o status dos procedimentos de uma guia
   */
  async getGuiaStatus(guiaId: number): Promise<any> {
    try {
      const [procedimentos, statusList] = await Promise.all([
        prisma.guia_procedimentos.findMany({
          where: { guiaId }
        }),
        prisma.procedimento_status.findMany({
          where: { guiaId }
        })
      ]);

      const statusMap = new Map(statusList.map((s) => [s.procedimentoId, s.status]));

      const procedimentosComStatus = procedimentos.map((proc) => ({
        ...proc,
        status: statusMap.get(proc.id) || 'PENDENTE'
      }));

      const totalProcedimentos = procedimentos.length;
      const aprovados = procedimentosComStatus.filter((p) => p.status === 'APROVADO').length;
      const rejeitados = procedimentosComStatus.filter((p) => p.status === 'REJEITADO').length;
      const pendentes = procedimentosComStatus.filter((p) => p.status === 'PENDENTE').length;

      return {
        guiaId,
        totalProcedimentos,
        aprovados,
        rejeitados,
        pendentes,
        procedimentos: procedimentosComStatus
      };
    } catch (error) {
      console.error('Erro ao obter status da guia:', error);
      throw error;
    }
  }
}
