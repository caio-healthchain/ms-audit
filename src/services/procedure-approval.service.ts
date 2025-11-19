import { PrismaClient } from '@prisma/client';
import { AuditLogService, AuditLogEntry } from './audit-log.service';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();

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

      // Buscar validações para registrar no log
      const validacoes = await prisma.auditoria_validacoes.findMany({
        where: {
          guiaId,
          procedimentoId
        }
      });

      // Buscar dados da guia
      const guia = await prisma.guia.findUnique({
        where: { id: guiaId }
      });

      // Registrar log de auditoria para cada validação aprovada
      if (validacoes.length > 0) {
        const logEntries: AuditLogEntry[] = validacoes.map((val: any) => ({
          guiaId: guiaId.toString(),
          guiaNumero: guia?.numeroGuiaPrestador,
          procedimentoSequencial: val.sequencialItem,
          codigoProcedimento: procedimento.codigoProcedimento || '',
          descricaoProcedimento: procedimento.descricaoProcedimento,
          numeroCarteira: guia?.numeroCarteira,
          operadoraRegistroAns: null,
          operadoraNome: null,
          tipoApontamento: val.tipoValidacao || 'VALOR_DIVERGENTE',
          valorOriginal: parseFloat(val.valorOriginal || procedimento.valorUnitario || 0),
          quantidadeOriginal: parseFloat(val.quantidadeOriginal || procedimento.quantidadeExecutada || 0),
          valorContratado: parseFloat(val.valorEsperado || 0),
          quantidadeMaxima: parseFloat(val.quantidadeMaxima || 0),
          valorAprovado: parseFloat(val.valorEsperado || val.valorOriginal || 0),
          quantidadeAprovada: parseFloat(val.quantidadeMaxima || val.quantidadeOriginal || 0),
          decisao: 'APROVADO',
          auditorId,
          auditorObservacoes: observacoes
        }));

        await auditLogService.registrarLogBatch(logEntries);
      }

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

      // Buscar validações para registrar no log
      const validacoes = await prisma.auditoria_validacoes.findMany({
        where: {
          guiaId,
          procedimentoId
        }
      });

      // Buscar dados da guia
      const guia = await prisma.guia.findUnique({
        where: { id: guiaId }
      });

      // Registrar log de auditoria para cada validação rejeitada
      if (validacoes.length > 0) {
        const logEntries: AuditLogEntry[] = validacoes.map((val: any) => ({
          guiaId: guiaId.toString(),
          guiaNumero: guia?.numeroGuiaPrestador,
          procedimentoSequencial: val.sequencialItem,
          codigoProcedimento: procedimento.codigoProcedimento || '',
          descricaoProcedimento: procedimento.descricaoProcedimento,
          numeroCarteira: guia?.numeroCarteira,
          operadoraRegistroAns: null,
          operadoraNome: null,
          tipoApontamento: val.tipoValidacao || 'VALOR_DIVERGENTE',
          valorOriginal: parseFloat(val.valorOriginal || procedimento.valorUnitario || 0),
          quantidadeOriginal: parseFloat(val.quantidadeOriginal || procedimento.quantidadeExecutada || 0),
          valorContratado: parseFloat(val.valorEsperado || 0),
          quantidadeMaxima: parseFloat(val.quantidadeMaxima || 0),
          valorAprovado: parseFloat(val.valorOriginal || 0), // Mantém valor original quando rejeitado
          quantidadeAprovada: parseFloat(val.quantidadeOriginal || 0),
          economiaValor: 0, // Sem economia quando rejeitado
          decisao: 'REJEITADO',
          auditorId,
          auditorObservacoes: observacoes
        }));

        await auditLogService.registrarLogBatch(logEntries);
      }

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
