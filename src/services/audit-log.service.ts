import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  guiaId: string;
  guiaNumero?: string | null;
  procedimentoSequencial?: number | null;
  codigoProcedimento: string;
  descricaoProcedimento?: string | null;
  numeroCarteira?: string | null;
  operadoraRegistroAns?: string | null;
  operadoraNome?: string | null;
  tipoApontamento: string;
  valorOriginal: number;
  quantidadeOriginal?: number;
  valorContratado?: number;
  quantidadeMaxima?: number;
  valorAprovado: number;
  quantidadeAprovada?: number;
  economiaValor?: number;
  decisao: 'APROVADO' | 'REJEITADO' | 'PARCIALMENTE_APROVADO';
  auditorId?: string;
  auditorNome?: string;
  auditorObservacoes?: string;
  xmlEntradaHash?: string;
  fonteValor?: string;
}

export interface EconomiaResumo {
  periodo: string;
  totalApontamentos: number;
  totalAprovados: number;
  totalRejeitados: number;
  valorTotalOriginal: number;
  valorTotalAprovado: number;
  economiaTotal: number;
  economiaMedia: number;
}

export class AuditLogService {
  /**
   * Registra uma entrada no log de auditoria
   */
  async registrarLog(entry: AuditLogEntry): Promise<any> {
    try {
      // Calcular economia se não foi fornecida
      const economia = entry.economiaValor !== undefined 
        ? entry.economiaValor 
        : entry.valorOriginal - entry.valorAprovado;

      const log = await prisma.$executeRaw`
        INSERT INTO procedimento_auditoria_log (
          guia_id,
          guia_numero,
          procedimento_sequencial,
          codigo_procedimento,
          descricao_procedimento,
          numero_carteira,
          operadora_registro_ans,
          operadora_nome,
          tipo_apontamento,
          valor_original,
          quantidade_original,
          valor_contratado,
          quantidade_maxima,
          valor_aprovado,
          quantidade_aprovada,
          economia_valor,
          decisao,
          auditor_id,
          auditor_nome,
          auditor_observacoes,
          xml_entrada_hash,
          fonte_valor,
          data_decisao
        ) VALUES (
          ${entry.guiaId},
          ${entry.guiaNumero || null},
          ${entry.procedimentoSequencial || null},
          ${entry.codigoProcedimento},
          ${entry.descricaoProcedimento || null},
          ${entry.numeroCarteira || null},
          ${entry.operadoraRegistroAns || null},
          ${entry.operadoraNome || null},
          ${entry.tipoApontamento},
          ${entry.valorOriginal},
          ${entry.quantidadeOriginal || null},
          ${entry.valorContratado || null},
          ${entry.quantidadeMaxima || null},
          ${entry.valorAprovado},
          ${entry.quantidadeAprovada || null},
          ${economia},
          ${entry.decisao},
          ${entry.auditorId || null},
          ${entry.auditorNome || null},
          ${entry.auditorObservacoes || null},
          ${entry.xmlEntradaHash || null},
          ${entry.fonteValor || null},
          NOW()
        )
      `;

      return {
        success: true,
        economia,
        mensagem: 'Log de auditoria registrado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
      throw error;
    }
  }

  /**
   * Registra múltiplas entradas de log em lote
   */
  async registrarLogBatch(entries: AuditLogEntry[]): Promise<any> {
    try {
      const results = await Promise.all(
        entries.map((entry) => this.registrarLog(entry))
      );

      const economiaTotal = results.reduce((sum, r) => sum + (r.economia || 0), 0);

      return {
        success: true,
        totalRegistros: results.length,
        economiaTotal,
        mensagem: `${results.length} logs de auditoria registrados com sucesso`
      };
    } catch (error) {
      console.error('Erro ao registrar logs em lote:', error);
      throw error;
    }
  }

  /**
   * Busca logs de auditoria de uma guia específica
   * @param guiaIdOrNumero - ID da guia ou número da guia (numeroGuiaPrestador)
   */
  async getLogsByGuia(guiaIdOrNumero: string): Promise<any[]> {
    try {
      // Buscar por guia_id OU guia_numero
      const result: any = await prisma.$queryRawUnsafe(`
        SELECT 
          id,
          created_at,
          guia_id,
          guia_numero,
          procedimento_sequencial,
          codigo_procedimento,
          descricao_procedimento,
          tipo_apontamento,
          valor_original,
          valor_contratado,
          valor_aprovado,
          economia_valor,
          quantidade_original,
          quantidade_maxima,
          quantidade_aprovada,
          decisao,
          auditor_id,
          auditor_nome,
          auditor_observacoes,
          data_decisao
        FROM procedimento_auditoria_log
        WHERE guia_id = '${guiaIdOrNumero}' OR guia_numero = '${guiaIdOrNumero}'
        ORDER BY data_decisao DESC
      `);

      return result.map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        guiaId: r.guia_id,
        guiaNumero: r.guia_numero,
        procedimentoSequencial: r.procedimento_sequencial,
        codigoProcedimento: r.codigo_procedimento,
        descricaoProcedimento: r.descricao_procedimento,
        tipoApontamento: r.tipo_apontamento,
        valorOriginal: parseFloat(r.valor_original || 0),
        valorContratado: parseFloat(r.valor_contratado || 0),
        valorAprovado: parseFloat(r.valor_aprovado || 0),
        economiaValor: parseFloat(r.economia_valor || 0),
        quantidadeOriginal: parseFloat(r.quantidade_original || 0),
        quantidadeMaxima: parseFloat(r.quantidade_maxima || 0),
        quantidadeAprovada: parseFloat(r.quantidade_aprovada || 0),
        decisao: r.decisao,
        auditorId: r.auditor_id,
        auditorNome: r.auditor_nome,
        auditorObservacoes: r.auditor_observacoes,
        dataDecisao: r.data_decisao
      }));
    } catch (error) {
      console.error('Erro ao buscar logs da guia:', error);
      throw error;
    }
  }

  /**
   * Consulta economia por período
   */
  async getEconomiaPorPeriodo(
    dataInicio?: Date,
    dataFim?: Date,
    operadoraId?: string
  ): Promise<EconomiaResumo[]> {
    try {
      const whereClause = [];
      
      if (dataInicio) {
        whereClause.push(`data_decisao >= '${dataInicio.toISOString()}'`);
      }
      
      if (dataFim) {
        whereClause.push(`data_decisao <= '${dataFim.toISOString()}'`);
      }
      
      if (operadoraId) {
        whereClause.push(`operadora_registro_ans = '${operadoraId}'`);
      }

      const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      const result: any = await prisma.$queryRawUnsafe(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', data_decisao), 'YYYY-MM') AS periodo,
          COUNT(*) AS total_apontamentos,
          COUNT(CASE WHEN decisao = 'APROVADO' THEN 1 END) AS total_aprovados,
          COUNT(CASE WHEN decisao = 'REJEITADO' THEN 1 END) AS total_rejeitados,
          SUM(valor_original) AS valor_total_original,
          SUM(valor_aprovado) AS valor_total_aprovado,
          SUM(economia_valor) AS economia_total,
          AVG(economia_valor) AS economia_media
        FROM procedimento_auditoria_log
        ${where}
        GROUP BY DATE_TRUNC('month', data_decisao)
        ORDER BY periodo DESC
      `);

      return result.map((r: any) => ({
        periodo: r.periodo,
        totalApontamentos: parseInt(r.total_apontamentos),
        totalAprovados: parseInt(r.total_aprovados),
        totalRejeitados: parseInt(r.total_rejeitados),
        valorTotalOriginal: parseFloat(r.valor_total_original || 0),
        valorTotalAprovado: parseFloat(r.valor_total_aprovado || 0),
        economiaTotal: parseFloat(r.economia_total || 0),
        economiaMedia: parseFloat(r.economia_media || 0)
      }));
    } catch (error) {
      console.error('Erro ao consultar economia por período:', error);
      throw error;
    }
  }

  /**
   * Consulta economia por operadora
   */
  async getEconomiaPorOperadora(
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<any[]> {
    try {
      const whereClause = [];
      
      if (dataInicio) {
        whereClause.push(`data_decisao >= '${dataInicio.toISOString()}'`);
      }
      
      if (dataFim) {
        whereClause.push(`data_decisao <= '${dataFim.toISOString()}'`);
      }

      const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      const result: any = await prisma.$queryRawUnsafe(`
        SELECT 
          operadora_registro_ans,
          operadora_nome,
          COUNT(*) AS total_apontamentos,
          COUNT(CASE WHEN decisao = 'APROVADO' THEN 1 END) AS total_aprovados,
          SUM(economia_valor) AS economia_total,
          AVG(economia_valor) AS economia_media,
          MAX(economia_valor) AS maior_economia
        FROM procedimento_auditoria_log
        ${where}
        GROUP BY operadora_registro_ans, operadora_nome
        ORDER BY economia_total DESC
      `);

      return result.map((r: any) => ({
        operadoraRegistroAns: r.operadora_registro_ans,
        operadoraNome: r.operadora_nome,
        totalApontamentos: parseInt(r.total_apontamentos),
        totalAprovados: parseInt(r.total_aprovados),
        economiaTotal: parseFloat(r.economia_total || 0),
        economiaMedia: parseFloat(r.economia_media || 0),
        maiorEconomia: parseFloat(r.maior_economia || 0)
      }));
    } catch (error) {
      console.error('Erro ao consultar economia por operadora:', error);
      throw error;
    }
  }

  /**
   * Consulta economia por auditor
   */
  async getEconomiaPorAuditor(
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<any[]> {
    try {
      const whereClause = ['decisao IN (\'APROVADO\', \'PARCIALMENTE_APROVADO\')', 'economia_valor > 0'];
      
      if (dataInicio) {
        whereClause.push(`data_decisao >= '${dataInicio.toISOString()}'`);
      }
      
      if (dataFim) {
        whereClause.push(`data_decisao <= '${dataFim.toISOString()}'`);
      }

      const where = `WHERE ${whereClause.join(' AND ')}`;

      const result: any = await prisma.$queryRawUnsafe(`
        SELECT 
          auditor_id,
          auditor_nome,
          COUNT(*) AS total_auditorias,
          COUNT(CASE WHEN decisao = 'APROVADO' THEN 1 END) AS total_aprovados,
          SUM(economia_valor) AS economia_total,
          AVG(economia_valor) AS economia_media,
          MAX(economia_valor) AS maior_economia,
          MIN(economia_valor) AS menor_economia
        FROM procedimento_auditoria_log
        ${where}
        GROUP BY auditor_id, auditor_nome
        ORDER BY economia_total DESC
      `);

      return result.map((r: any) => ({
        auditorId: r.auditor_id,
        auditorNome: r.auditor_nome,
        totalAuditorias: parseInt(r.total_auditorias),
        totalAprovados: parseInt(r.total_aprovados),
        economiaTotal: parseFloat(r.economia_total || 0),
        economiaMedia: parseFloat(r.economia_media || 0),
        maiorEconomia: parseFloat(r.maior_economia || 0),
        menorEconomia: parseFloat(r.menor_economia || 0)
      }));
    } catch (error) {
      console.error('Erro ao consultar economia por auditor:', error);
      throw error;
    }
  }

  /**
   * Consulta economia por tipo de apontamento
   */
  async getEconomiaPorTipoApontamento(
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<any[]> {
    try {
      const whereClause = [];
      
      if (dataInicio) {
        whereClause.push(`data_decisao >= '${dataInicio.toISOString()}'`);
      }
      
      if (dataFim) {
        whereClause.push(`data_decisao <= '${dataFim.toISOString()}'`);
      }

      const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      const result: any = await prisma.$queryRawUnsafe(`
        SELECT 
          tipo_apontamento,
          COUNT(*) AS total_apontamentos,
          COUNT(CASE WHEN decisao = 'APROVADO' THEN 1 END) AS total_aprovados,
          COUNT(CASE WHEN decisao = 'REJEITADO' THEN 1 END) AS total_rejeitados,
          SUM(economia_valor) AS economia_total,
          AVG(economia_valor) AS economia_media
        FROM procedimento_auditoria_log
        ${where}
        GROUP BY tipo_apontamento
        ORDER BY economia_total DESC
      `);

      return result.map((r: any) => ({
        tipoApontamento: r.tipo_apontamento,
        totalApontamentos: parseInt(r.total_apontamentos),
        totalAprovados: parseInt(r.total_aprovados),
        totalRejeitados: parseInt(r.total_rejeitados),
        economiaTotal: parseFloat(r.economia_total || 0),
        economiaMedia: parseFloat(r.economia_media || 0)
      }));
    } catch (error) {
      console.error('Erro ao consultar economia por tipo de apontamento:', error);
      throw error;
    }
  }

  /**
   * Obtém resumo geral de economia
   */
  async getResumoGeral(dataInicio?: Date, dataFim?: Date): Promise<any> {
    try {
      const whereClause = [];
      
      if (dataInicio) {
        whereClause.push(`data_decisao >= '${dataInicio.toISOString()}'`);
      }
      
      if (dataFim) {
        whereClause.push(`data_decisao <= '${dataFim.toISOString()}'`);
      }

      const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      const result: any = await prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) AS total_apontamentos,
          COUNT(CASE WHEN decisao = 'APROVADO' THEN 1 END) AS total_aprovados,
          COUNT(CASE WHEN decisao = 'REJEITADO' THEN 1 END) AS total_rejeitados,
          COUNT(CASE WHEN decisao = 'PARCIALMENTE_APROVADO' THEN 1 END) AS total_parcialmente_aprovados,
          SUM(valor_original) AS valor_total_original,
          SUM(valor_aprovado) AS valor_total_aprovado,
          SUM(economia_valor) AS economia_total,
          AVG(economia_valor) AS economia_media,
          MAX(economia_valor) AS maior_economia,
          MIN(economia_valor) AS menor_economia
        FROM procedimento_auditoria_log
        ${where}
      `);

      const row = result[0];

      return {
        totalApontamentos: parseInt(row.total_apontamentos || 0),
        totalAprovados: parseInt(row.total_aprovados || 0),
        totalRejeitados: parseInt(row.total_rejeitados || 0),
        totalParcialmenteAprovados: parseInt(row.total_parcialmente_aprovados || 0),
        valorTotalOriginal: parseFloat(row.valor_total_original || 0),
        valorTotalAprovado: parseFloat(row.valor_total_aprovado || 0),
        economiaTotal: parseFloat(row.economia_total || 0),
        economiaMedia: parseFloat(row.economia_media || 0),
        maiorEconomia: parseFloat(row.maior_economia || 0),
        menorEconomia: parseFloat(row.menor_economia || 0),
        percentualEconomia: row.valor_total_original > 0 
          ? ((parseFloat(row.economia_total || 0) / parseFloat(row.valor_total_original)) * 100).toFixed(2)
          : '0.00'
      };
    } catch (error) {
      console.error('Erro ao obter resumo geral:', error);
      throw error;
    }
  }
}
