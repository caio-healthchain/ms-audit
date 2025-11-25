import { PrismaClient, AuditLogAction, Prisma } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface SavingsSummary {
  total_auditorias: number;
  total_correcoes: number;
  valor_original: number;
  valor_corrigido: number;
  saving_total: number;
  saving_percentual: number;
  por_tipo_correcao: Array<{
    tipo: string;
    quantidade: number;
    saving: number;
  }>;
}

export interface AuditMetrics {
  total_auditorias: number;
  auditorias_aprovadas: number;
  auditorias_rejeitadas: number;
  auditorias_pendentes: number;
  taxa_aprovacao: number;
  tempo_medio_auditoria: number;
  valor_total_auditado: number;
  por_auditor: Array<{
    auditor: string;
    total_auditorias: number;
    taxa_aprovacao: number;
  }>;
}

export interface CorrectionAnalysis {
  tipo_correcao: string;
  quantidade: number;
  valor_economizado: number;
  casos_mais_comuns: Array<{
    descricao: string;
    frequencia: number;
  }>;
}

export interface BillingAnalysis {
  contas_totais: number;
  contas_pagas: number;
  contas_pendentes: number;
  valor_total_faturado: number;
  valor_pago: number;
  valor_pendente: number;
  taxa_inadimplencia: number;
  ticket_medio: number;
}

export class AnalyticsService {
  /**
   * Retorna resumo de savings (economia) com correções
   */
  async getSavingsSummary(
    period: string = 'month',
    date: Date = new Date()
  ): Promise<SavingsSummary> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period, date);

      // Buscar todos os audit logs de UPDATE que representam correções
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'UPDATE',
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          oldValues: {
            not: Prisma.JsonNull
          },
          newValues: {
            not: Prisma.JsonNull
          }
        },
        select: {
          id: true,
          oldValues: true,
          newValues: true,
          entity: true,
          action: true
        }
      });

      let total_correcoes = 0;
      let valor_original = 0;
      let valor_corrigido = 0;
      const correcoes_por_tipo: Map<string, { quantidade: number; saving: number }> = new Map();

      auditLogs.forEach(log => {
        const oldVal = log.oldValues as any;
        const newVal = log.newValues as any;

        // Verificar se houve mudança em valores monetários
        if (oldVal?.totalPrice && newVal?.totalPrice) {
          const oldPrice = Number(oldVal.totalPrice);
          const newPrice = Number(newVal.totalPrice);

          if (oldPrice !== newPrice) {
            total_correcoes++;
            valor_original += oldPrice;
            valor_corrigido += newPrice;

            const tipo = this.getCorrectType(oldVal, newVal);
            const saving = oldPrice - newPrice;

            if (!correcoes_por_tipo.has(tipo)) {
              correcoes_por_tipo.set(tipo, { quantidade: 0, saving: 0 });
            }

            const current = correcoes_por_tipo.get(tipo)!;
            current.quantidade++;
            current.saving += saving;
          }
        } else if (oldVal?.unitPrice && newVal?.unitPrice) {
          const oldPrice = Number(oldVal.unitPrice);
          const newPrice = Number(newVal.unitPrice);

          if (oldPrice !== newPrice) {
            total_correcoes++;
            const quantity = newVal.quantity || 1;
            valor_original += oldPrice * quantity;
            valor_corrigido += newPrice * quantity;

            const tipo = 'Correção de Preço Unitário';
            const saving = (oldPrice - newPrice) * quantity;

            if (!correcoes_por_tipo.has(tipo)) {
              correcoes_por_tipo.set(tipo, { quantidade: 0, saving: 0 });
            }

            const current = correcoes_por_tipo.get(tipo)!;
            current.quantidade++;
            current.saving += saving;
          }
        }
      });

      const saving_total = valor_original - valor_corrigido;
      const saving_percentual = valor_original > 0 ? (saving_total / valor_original) * 100 : 0;

      const por_tipo_correcao = Array.from(correcoes_por_tipo.entries()).map(([tipo, data]) => ({
        tipo,
        quantidade: data.quantidade,
        saving: data.saving
      }));

      return {
        total_auditorias: auditLogs.length,
        total_correcoes,
        valor_original,
        valor_corrigido,
        saving_total,
        saving_percentual,
        por_tipo_correcao
      };
    } catch (error) {
      logger.error('[Analytics] Erro ao buscar savings:', error);
      throw error;
    }
  }

  /**
   * Retorna métricas gerais de auditoria
   */
  async getAuditMetrics(
    period: string = 'month',
    date: Date = new Date()
  ): Promise<AuditMetrics> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period, date);

      const total_auditorias = await prisma.auditLog.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Contar por ação
      const byAction = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        }
      });

      const auditorias_aprovadas = byAction.find(a => a.action === 'APPROVE')?._count.id || 0;
      const auditorias_rejeitadas = byAction.find(a => a.action === 'REJECT')?._count.id || 0;
      const auditorias_pendentes = total_auditorias - auditorias_aprovadas - auditorias_rejeitadas;

      const taxa_aprovacao = total_auditorias > 0 ? (auditorias_aprovadas / total_auditorias) * 100 : 0;

      // Calcular tempo médio (simulado - em produção seria baseado em timestamps)
      const tempo_medio_auditoria = 45; // minutos (placeholder)

      // Valor total auditado
      const billingItems = await prisma.billingItem.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          totalPrice: true
        }
      });

      const valor_total_auditado = billingItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);

      // Por auditor
      const byAuditor = await prisma.auditLog.groupBy({
        by: ['userName'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        }
      });

      const por_auditor = byAuditor.map(auditor => ({
        auditor: auditor.userName,
        total_auditorias: auditor._count.id,
        taxa_aprovacao: 0 // Seria calculado com mais detalhes em produção
      }));

      return {
        total_auditorias,
        auditorias_aprovadas,
        auditorias_rejeitadas,
        auditorias_pendentes,
        taxa_aprovacao,
        tempo_medio_auditoria,
        valor_total_auditado,
        por_auditor
      };
    } catch (error) {
      logger.error('[Analytics] Erro ao buscar métricas de auditoria:', error);
      throw error;
    }
  }

  /**
   * Análise detalhada de correções
   */
  async getCorrectionAnalysis(
    correctionType?: string,
    period: string = 'month',
    date: Date = new Date()
  ): Promise<CorrectionAnalysis[]> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period, date);

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'UPDATE',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          oldValues: true,
          newValues: true,
          changes: true
        }
      });

      const analysis: Map<string, {
        quantidade: number;
        valor_economizado: number;
        casos: Map<string, number>;
      }> = new Map();

      auditLogs.forEach(log => {
        const oldVal = log.oldValues as any;
        const newVal = log.newValues as any;

        if (oldVal && newVal) {
          const tipo = this.getCorrectType(oldVal, newVal);
          
          if (!analysis.has(tipo)) {
            analysis.set(tipo, {
              quantidade: 0,
              valor_economizado: 0,
              casos: new Map()
            });
          }

          const current = analysis.get(tipo)!;
          current.quantidade++;

          // Calcular economia
          if (oldVal.totalPrice && newVal.totalPrice) {
            const saving = Number(oldVal.totalPrice) - Number(newVal.totalPrice);
            current.valor_economizado += saving;
          }

          // Registrar caso
          const descricao = this.getChangeDescription(oldVal, newVal);
          current.casos.set(descricao, (current.casos.get(descricao) || 0) + 1);
        }
      });

      return Array.from(analysis.entries()).map(([tipo, data]) => ({
        tipo_correcao: tipo,
        quantidade: data.quantidade,
        valor_economizado: data.valor_economizado,
        casos_mais_comuns: Array.from(data.casos.entries())
          .map(([descricao, frequencia]) => ({ descricao, frequencia }))
          .sort((a, b) => b.frequencia - a.frequencia)
          .slice(0, 5)
      }));
    } catch (error) {
      logger.error('[Analytics] Erro ao buscar análise de correções:', error);
      throw error;
    }
  }

  /**
   * Análise de faturamento
   */
  async getBillingAnalysis(
    period: string = 'month',
    date: Date = new Date()
  ): Promise<BillingAnalysis> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period, date);

      const accounts = await prisma.billingAccount.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          totalAmount: true,
          paidAmount: true,
          remainingAmount: true,
          status: true
        }
      });

      const contas_totais = accounts.length;
      const contas_pagas = accounts.filter(a => a.status === 'PAID').length;
      const contas_pendentes = accounts.filter(a => a.status === 'PENDING').length;

      const valor_total_faturado = accounts.reduce((sum, a) => sum + Number(a.totalAmount), 0);
      const valor_pago = accounts.reduce((sum, a) => sum + Number(a.paidAmount), 0);
      const valor_pendente = accounts.reduce((sum, a) => sum + Number(a.remainingAmount), 0);

      const taxa_inadimplencia = contas_totais > 0 ? (contas_pendentes / contas_totais) * 100 : 0;
      const ticket_medio = contas_totais > 0 ? valor_total_faturado / contas_totais : 0;

      return {
        contas_totais,
        contas_pagas,
        contas_pendentes,
        valor_total_faturado,
        valor_pago,
        valor_pendente,
        taxa_inadimplencia,
        ticket_medio
      };
    } catch (error) {
      logger.error('[Analytics] Erro ao buscar análise de faturamento:', error);
      throw error;
    }
  }

  /**
   * Helpers
   */
  private getCorrectType(oldVal: any, newVal: any): string {
    if (oldVal.quantity !== newVal.quantity) {
      return 'Correção de Quantidade';
    }
    if (oldVal.unitPrice !== newVal.unitPrice) {
      return 'Correção de Preço Unitário';
    }
    if (oldVal.totalPrice !== newVal.totalPrice) {
      return 'Correção de Valor Total';
    }
    if (oldVal.discount !== newVal.discount) {
      return 'Correção de Desconto';
    }
    return 'Outra Correção';
  }

  private getChangeDescription(oldVal: any, newVal: any): string {
    const changes: string[] = [];
    
    if (oldVal.quantity !== newVal.quantity) {
      changes.push(`Qtd: ${oldVal.quantity} → ${newVal.quantity}`);
    }
    if (oldVal.unitPrice !== newVal.unitPrice) {
      changes.push(`Preço: R$ ${oldVal.unitPrice} → R$ ${newVal.unitPrice}`);
    }
    if (oldVal.description !== newVal.description) {
      changes.push(`Descrição alterada`);
    }

    return changes.join(', ') || 'Alteração geral';
  }

  private getPeriodDates(period: string, date: Date): { startDate: Date; endDate: Date } {
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    switch (period) {
      case 'day':
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        throw new Error(`Período inválido: ${period}`);
    }

    return { startDate, endDate };
  }
}
