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
   * Busca o valor contratual de um procedimento
   * Busca em qualquer contrato ativo, priorizando o mais recente
   */
  private async getValorContratual(
    codigoTUSS: string
  ): Promise<number | null> {
    try {
      // Buscar em qualquer contrato ativo, priorizando o mais recente
      const contratoItem = await prisma.$queryRaw`
        SELECT ci."valorContratado"
        FROM contrato_itens ci
        JOIN contrato c ON c.id::text = ci."contratoId"
        WHERE ci."codigoTUSS" = ${codigoTUSS}
        AND c.status = 'ATIVO'
        AND c."dataFim" >= NOW()
        ORDER BY c."dataFim" DESC
        LIMIT 1
      `;

      if (!contratoItem || (contratoItem as any[]).length === 0) {
        console.log(`Valor contratual não encontrado para TUSS ${codigoTUSS}`);
        return null;
      }

      return parseFloat((contratoItem as any[])[0].valorContratado.toString());
    } catch (error) {
      console.error('Erro ao buscar valor contratual:', error);
      return null;
    }
  }

  /**
   * Recalcula o valor total da guia com base nos valores aprovados
   */
  private async recalcularValorTotalGuia(guiaId: number): Promise<void> {
    try {
      // Buscar todos os procedimentos da guia
      const procedimentos = await prisma.guia_procedimentos.findMany({
        where: { guiaId }
      });

      // Calcular novo valor total dos procedimentos
      const valorTotalProcedimentos = procedimentos.reduce((total, proc) => {
        // Usar valorAprovado se existir, senão usar valorTotal original
        const valor = proc.valorAprovado !== null && proc.valorAprovado !== undefined
          ? proc.valorAprovado
          : (proc.valorTotal || 0);
        return total + parseFloat(valor.toString());
      }, 0);

      // Buscar guia para pegar outros valores
      const guia = await prisma.guia.findUnique({
        where: { id: guiaId }
      });

      if (!guia) {
        console.error(`Guia ${guiaId} não encontrada`);
        return;
      }

      // Calcular novo valor total geral
      const valorTotalGeral = 
        valorTotalProcedimentos +
        parseFloat(guia.valorTotalDiarias?.toString() || '0') +
        parseFloat(guia.valorTotalTaxasAlugueis?.toString() || '0') +
        parseFloat(guia.valorTotalMateriais?.toString() || '0') +
        parseFloat(guia.valorTotalMedicamentos?.toString() || '0') +
        parseFloat(guia.valorTotalOPME?.toString() || '0') +
        parseFloat(guia.valorTotalGasesMedicinais?.toString() || '0');

      // Atualizar guia
      await prisma.guia.update({
        where: { id: guiaId },
        data: {
          valorTotalProcedimentos,
          valorTotalGeral,
          updatedAt: new Date()
        }
      });

      console.log(`Valor total da guia ${guiaId} recalculado: R$ ${valorTotalGeral.toFixed(2)}`);
    } catch (error) {
      console.error('Erro ao recalcular valor total da guia:', error);
    }
  }

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

      // Buscar dados da guia para pegar operadoraId
      const guia = await prisma.guia.findUnique({
        where: { id: guiaId }
      });

      if (!guia) {
        throw new Error('Guia não encontrada');
      }

      // Buscar validações existentes
      const validacoes = await prisma.auditoria_validacoes.findMany({
        where: {
          guiaId,
          procedimentoId
        }
      });

      // Determinar valor aprovado
      let valorAprovado: number;
      let valorContratado: number | null = null;
      let economiaValor = 0;

      if (validacoes.length > 0) {
        // Se houver validações, usar o valorEsperado (valor contratual)
        const validacaoValor = validacoes.find(v => v.tipoValidacao === 'VALOR');
        if (validacaoValor && validacaoValor.valorEsperado) {
          valorContratado = parseFloat(validacaoValor.valorEsperado.toString());
          valorAprovado = valorContratado;
          
          const valorOriginal = parseFloat(procedimento.valorTotal?.toString() || '0');
          economiaValor = valorAprovado - valorOriginal;
        } else {
          // Se não houver validação de valor, usar o valor original
          valorAprovado = parseFloat(procedimento.valorTotal?.toString() || '0');
          valorContratado = valorAprovado;
        }
      } else {
        // Se não houver validações, tentar buscar valor contratual
        valorContratado = await this.getValorContratual(
          procedimento.codigoProcedimento || ''
        );

        if (valorContratado) {
          // Usar valor contratual como aprovado
          valorAprovado = valorContratado;
          const valorOriginal = parseFloat(procedimento.valorTotal?.toString() || '0');
          economiaValor = valorAprovado - valorOriginal;
        } else {
          // Se não encontrar valor contratual, usar valor original
          valorAprovado = parseFloat(procedimento.valorTotal?.toString() || '0');
          valorContratado = valorAprovado;
        }
      }

      // Atualizar campo valorAprovado no procedimento
      await prisma.guia_procedimentos.update({
        where: { id: procedimentoId },
        data: {
          valorAprovado,
          updatedAt: new Date()
        }
      });

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

      // Recalcular valor total da guia
      await this.recalcularValorTotalGuia(guiaId);

      // Registrar log de auditoria
      let logEntries: AuditLogEntry[];
      
      if (validacoes.length > 0) {
        // Se houver validações, criar um log para cada uma
        logEntries = validacoes.map((val: any) => ({
          guiaId: guiaId.toString(),
          guiaNumero: guia?.numeroGuiaPrestador,
          procedimentoSequencial: parseInt(procedimento.sequencialItem) || null,
          codigoProcedimento: procedimento.codigoProcedimento || '',
          descricaoProcedimento: procedimento.descricaoProcedimento,
          numeroCarteira: guia?.numeroCarteira,
          operadoraRegistroAns: null,
          operadoraNome: null,
          tipoApontamento: val.tipoValidacao || 'VALOR_DIVERGENTE',
          valorOriginal: parseFloat(val.valorEncontrado || procedimento.valorTotal || 0),
          quantidadeOriginal: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          valorContratado: parseFloat(val.valorEsperado || valorContratado || 0),
          quantidadeMaxima: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          valorAprovado: valorAprovado,
          quantidadeAprovada: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          economiaValor: parseFloat(val.diferenca?.toString() || economiaValor.toString() || '0'),
          decisao: 'APROVADO',
          auditorId,
          auditorObservacoes: observacoes
        }));
      } else {
        // Se não houver validações, criar um log genérico de aprovação
        const valorOriginal = parseFloat(procedimento.valorTotal?.toString() || '0');
        
        logEntries = [{
          guiaId: guiaId.toString(),
          guiaNumero: guia?.numeroGuiaPrestador,
          procedimentoSequencial: parseInt(procedimento.sequencialItem) || null,
          codigoProcedimento: procedimento.codigoProcedimento || '',
          descricaoProcedimento: procedimento.descricaoProcedimento,
          numeroCarteira: guia?.numeroCarteira,
          operadoraRegistroAns: null,
          operadoraNome: null,
          tipoApontamento: valorContratado && valorContratado !== valorOriginal 
            ? 'VALOR_DIVERGENTE' 
            : 'APROVACAO_SEM_PENDENCIA',
          valorOriginal: valorOriginal,
          quantidadeOriginal: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          valorContratado: valorContratado || valorOriginal,
          quantidadeMaxima: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          valorAprovado: valorAprovado,
          quantidadeAprovada: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          economiaValor: economiaValor,
          decisao: 'APROVADO',
          auditorId,
          auditorObservacoes: observacoes
        }];
      }

      await auditLogService.registrarLogBatch(logEntries);

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

      // Registrar log de auditoria
      let logEntries: AuditLogEntry[];
      
      if (validacoes.length > 0) {
        // Se houver validações, criar um log para cada uma
        logEntries = validacoes.map((val: any) => ({
          guiaId: guiaId.toString(),
          guiaNumero: guia?.numeroGuiaPrestador,
          procedimentoSequencial: parseInt(procedimento.sequencialItem) || null,
          codigoProcedimento: procedimento.codigoProcedimento || '',
          descricaoProcedimento: procedimento.descricaoProcedimento,
          numeroCarteira: guia?.numeroCarteira,
          operadoraRegistroAns: null,
          operadoraNome: null,
          tipoApontamento: val.tipoValidacao || 'VALOR_DIVERGENTE',
          valorOriginal: parseFloat(val.valorEncontrado || procedimento.valorTotal || 0),
          quantidadeOriginal: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          valorContratado: parseFloat(val.valorEsperado || 0),
          quantidadeMaxima: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          valorAprovado: parseFloat(val.valorEncontrado || 0), // Mantém valor original quando rejeitado
          quantidadeAprovada: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          economiaValor: 0, // Sem economia quando rejeitado
          decisao: 'REJEITADO',
          auditorId,
          auditorObservacoes: observacoes
        }));
      } else {
        // Se não houver validações, criar um log genérico de rejeição
        logEntries = [{
          guiaId: guiaId.toString(),
          guiaNumero: guia?.numeroGuiaPrestador,
          procedimentoSequencial: parseInt(procedimento.sequencialItem) || null,
          codigoProcedimento: procedimento.codigoProcedimento || '',
          descricaoProcedimento: procedimento.descricaoProcedimento,
          numeroCarteira: guia?.numeroCarteira,
          operadoraRegistroAns: null,
          operadoraNome: null,
          tipoApontamento: 'REJEICAO_SEM_PENDENCIA',
          valorOriginal: parseFloat(procedimento.valorTotal?.toString() || '0'),
          quantidadeOriginal: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          valorContratado: parseFloat(procedimento.valorTotal?.toString() || '0'),
          quantidadeMaxima: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          valorAprovado: parseFloat(procedimento.valorTotal?.toString() || '0'),
          quantidadeAprovada: parseInt(procedimento.quantidadeExecutada?.toString() || '1'),
          economiaValor: 0, // Sem economia quando rejeitado
          decisao: 'REJEITADO',
          auditorId,
          auditorObservacoes: observacoes
        }];
      }

      await auditLogService.registrarLogBatch(logEntries);

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
