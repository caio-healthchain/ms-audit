import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ValidationResult {
  isValid: boolean;
  tipo: string;
  status: string;
  mensagem: string;
  detalhes: any;
}

export interface ProcedureValidationResult {
  procedimentoId: number;
  codigoTUSS: string;
  validacoes: {
    valor?: ValidationResult;
    porte?: ValidationResult;
    pacote?: ValidationResult;
  };
  totalPendencias: number;
  isValid: boolean;
}

export class ProcedureValidationService {
  /**
   * Valida o porte cirúrgico de um procedimento
   */
  async validatePorte(codigoTUSS: string, porteEncontrado?: string): Promise<ValidationResult> {
    try {
      // Buscar porte esperado na tabela tbdomPorte
      const porteEsperado = await prisma.$queryRaw<any[]>`
        SELECT porte, procedimento
        FROM "tbdomPorte"
        WHERE codigo = ${codigoTUSS}
        LIMIT 1
      `;

      if (!porteEsperado || porteEsperado.length === 0) {
        return {
          isValid: true,
          tipo: 'PORTE',
          status: 'NAO_ENCONTRADO',
          mensagem: `Porte não cadastrado para o código TUSS ${codigoTUSS}`,
          detalhes: {
            codigoTUSS,
            porteEncontrado: porteEncontrado || 'Não informado'
          }
        };
      }

      const porte = porteEsperado[0];
      const isValid = !porteEncontrado || porte.porte === porteEncontrado;

      return {
        isValid,
        tipo: 'PORTE',
        status: isValid ? 'CONFORME' : 'DIVERGENTE',
        mensagem: isValid
          ? 'Porte cirúrgico conforme'
          : `Porte divergente: Esperado ${porte.porte}, Encontrado ${porteEncontrado || 'Não informado'}`,
        detalhes: {
          codigoTUSS,
          porteEsperado: porte.porte,
          porteEncontrado: porteEncontrado || 'Não informado',
          procedimento: porte.procedimento
        }
      };
    } catch (error) {
      console.error('Erro ao validar porte:', error);
      throw error;
    }
  }

  /**
   * Valida o valor cobrado de um procedimento
   */
  async validateValor(
    operadoraId: string | null,
    codigoTUSS: string,
    valorCobrado: number
  ): Promise<ValidationResult> {
    try {
      let valorContratado: number | null = null;
      let fonte: string = '';
      let contratoNumero: string | null = null;

      // 1. Tentar buscar no contrato (se operadoraId fornecido)
      if (operadoraId) {
        const contrato = await prisma.$queryRaw<any[]>`
          SELECT c.numero, ci."valorContratado"
          FROM contrato c
          INNER JOIN contrato_itens ci ON ci."contratoId" = c.id
          WHERE c."operadoraId" = ${operadoraId}
            AND c.status = 'ATIVO'
            AND c."dataFim" >= NOW()
            AND ci."codigoTUSS" = ${codigoTUSS}
          LIMIT 1
        `;

        if (contrato && contrato.length > 0) {
          valorContratado = parseFloat(contrato[0].valorContratado);
          contratoNumero = contrato[0].numero;
          fonte = 'CONTRATO';
        }
      }

      // 2. Se não encontrou no contrato, buscar na CBHPM
      if (valorContratado === null) {
        const cbhpm = await prisma.$queryRaw<any[]>`
          SELECT "valor_referencia"
          FROM cbhpm_procedimentos
          WHERE codigo = ${codigoTUSS}
            AND (vigencia_fim IS NULL OR vigencia_fim >= NOW())
          LIMIT 1
        `;

        if (cbhpm && cbhpm.length > 0 && cbhpm[0].valor_referencia) {
          valorContratado = parseFloat(cbhpm[0].valor_referencia);
          fonte = 'CBHPM';
        }
      }

      // 3. Se não encontrou nem no contrato nem na CBHPM
      if (valorContratado === null) {
        return {
          isValid: true, // Sem referência, não há divergência
          tipo: 'VALOR',
          status: 'SEM_REFERENCIA',
          mensagem: `Sem valor de referência para o código ${codigoTUSS}`,
          detalhes: {
            codigoTUSS,
            valorCobrado: parseFloat(valorCobrado.toString()),
            fonte: 'GUIA'
          }
        };
      }

      // 4. Comparar valores
      const valorCobradoNum = parseFloat(valorCobrado.toString());
      const diferenca = valorCobradoNum - valorContratado;
      const percentualDiferenca = ((diferenca / valorContratado) * 100).toFixed(2);

      const isValid = Math.abs(diferenca) < 0.01; // Tolerância de 1 centavo

      return {
        isValid,
        tipo: 'VALOR',
        status: isValid ? 'CONFORME' : 'DIVERGENTE',
        mensagem: isValid
          ? `Valor conforme ${fonte.toLowerCase()}`
          : `Valor divergente: ${diferenca > 0 ? '+' : ''}R$ ${Math.abs(diferenca).toFixed(2)} (${percentualDiferenca}%)`,
        detalhes: {
          codigoTUSS,
          valorContratado,
          valorCobrado: valorCobradoNum,
          diferenca,
          percentualDiferenca: parseFloat(percentualDiferenca),
          fonte,
          contratoNumero
        }
      };
    } catch (error) {
      console.error('Erro ao validar valor:', error);
      throw error;
    }
  }

  /**
   * Valida se o procedimento está no pacote contratual
   */
  async validatePacote(operadoraId: string | null, codigoTUSS: string): Promise<ValidationResult> {
    try {
      if (!operadoraId) {
        return {
          isValid: true,
          tipo: 'PACOTE',
          status: 'SEM_CONTRATO',
          mensagem: 'Operadora não informada',
          detalhes: null
        };
      }

      const contrato = await prisma.$queryRaw<any[]>`
        SELECT c.numero, ci."estaNoPacote", ci."requerAutorizacao"
        FROM contrato c
        LEFT JOIN contrato_itens ci ON ci."contratoId" = c.id AND ci."codigoTUSS" = ${codigoTUSS}
        WHERE c."operadoraId" = ${operadoraId}
          AND c.status = 'ATIVO'
          AND c."dataFim" >= NOW()
        LIMIT 1
      `;

      if (!contrato || contrato.length === 0) {
        return {
          isValid: false,
          tipo: 'PACOTE',
          status: 'ERRO',
          mensagem: 'Contrato não encontrado ou inativo',
          detalhes: null
        };
      }

      const item = contrato[0];

      if (!item.estaNoPacote && item.estaNoPacote !== false) {
        // Procedimento não está no contrato
        return {
          isValid: false,
          tipo: 'PACOTE',
          status: 'FORA_PACOTE',
          mensagem: `Procedimento ${codigoTUSS} NÃO incluído no pacote contratual - Possível glosa`,
          detalhes: {
            codigoTUSS,
            contratoNumero: item.numero,
            requerAutorizacao: true
          }
        };
      }

      const isValid = item.estaNoPacote === true;

      return {
        isValid,
        tipo: 'PACOTE',
        status: isValid ? 'NO_PACOTE' : 'FORA_PACOTE',
        mensagem: isValid
          ? 'Procedimento incluído no pacote contratual'
          : 'Procedimento NÃO incluído no pacote contratual - Possível glosa',
        detalhes: {
          codigoTUSS,
          estaNoPacote: item.estaNoPacote,
          requerAutorizacao: item.requerAutorizacao,
          contratoNumero: item.numero
        }
      };
    } catch (error) {
      console.error('Erro ao validar pacote:', error);
      throw error;
    }
  }

  /**
   * Valida todos os aspectos de um procedimento
   */
  async validateProcedimento(
    guiaId: number,
    procedimentoId: number,
    operadoraId: string | null,
    porteEncontrado?: string
  ): Promise<ProcedureValidationResult> {
    try {
      // Buscar procedimento da guia
      const procedimento = await prisma.guia_procedimentos.findUnique({
        where: { id: procedimentoId }
      });

      if (!procedimento) {
        throw new Error('Procedimento não encontrado');
      }

      const codigoTUSS = procedimento.codigoProcedimento || '';
      const valorCobrado = procedimento.valorTotal || 0;

      // Executar validações em paralelo
      const [valorValidation, porteValidation, pacoteValidation] = await Promise.all([
        this.validateValor(operadoraId, codigoTUSS, valorCobrado),
        this.validatePorte(codigoTUSS, porteEncontrado),
        this.validatePacote(operadoraId, codigoTUSS)
      ]);

      const validacoes = {
        valor: valorValidation,
        porte: porteValidation,
        pacote: pacoteValidation
      };

      const pendencias = [valorValidation, porteValidation, pacoteValidation].filter(
        (v) => !v.isValid
      );

      const isValid = pendencias.length === 0;

      // Salvar validações no banco
      await this.saveValidations(guiaId, procedimentoId, validacoes);

      return {
        procedimentoId,
        codigoTUSS,
        validacoes,
        totalPendencias: pendencias.length,
        isValid
      };
    } catch (error) {
      console.error('Erro ao validar procedimento:', error);
      throw error;
    }
  }

  /**
   * Salva as validações no banco de dados
   */
  private async saveValidations(
    guiaId: number,
    procedimentoId: number,
    validacoes: any
  ): Promise<void> {
    try {
      const validacoesArray = Object.values(validacoes) as ValidationResult[];

      for (const validacao of validacoesArray) {
        // Mapear tipo para enum do Prisma
        let tipoValidacao: 'VALOR' | 'PORTE' | 'PACOTE';
        if (validacao.tipo === 'VALOR') tipoValidacao = 'VALOR';
        else if (validacao.tipo === 'PORTE') tipoValidacao = 'PORTE';
        else if (validacao.tipo === 'PACOTE') tipoValidacao = 'PACOTE';
        else continue;

        await prisma.auditoria_validacoes.upsert({
          where: {
            guiaId_procedimentoId_tipoValidacao: {
              guiaId,
              procedimentoId,
              tipoValidacao
            }
          },
          create: {
            guiaId,
            procedimentoId,
            tipoValidacao,
            status: validacao.status as any,
            mensagem: validacao.mensagem,
            valorEsperado: validacao.detalhes?.valorContratado?.toString(),
            valorEncontrado: validacao.detalhes?.valorCobrado?.toString(),
            diferenca: validacao.detalhes?.diferenca?.toString(),
            fonteValor: validacao.detalhes?.fonte || null,
            metadata: validacao.detalhes
          },
          update: {
            status: validacao.status as any,
            mensagem: validacao.mensagem,
            valorEsperado: validacao.detalhes?.valorContratado?.toString(),
            valorEncontrado: validacao.detalhes?.valorCobrado?.toString(),
            diferenca: validacao.detalhes?.diferenca?.toString(),
            fonteValor: validacao.detalhes?.fonte || null,
            metadata: validacao.detalhes,
            updatedAt: new Date()
          }
        });
      }

      console.log(`✅ Validações salvas para procedimento ${procedimentoId}`);
    } catch (error) {
      console.error('Erro ao salvar validações:', error);
      // Não lançar erro para não interromper o fluxo
    }
  }

  /**
   * Valida todos os procedimentos de uma guia
   */
  async validateGuia(guiaId: number, operadoraId: string | null): Promise<any> {
    try {
      const procedimentos = await prisma.guia_procedimentos.findMany({
        where: { guiaId }
      });

      if (procedimentos.length === 0) {
        return {
          success: false,
          message: 'Nenhum procedimento encontrado na guia'
        };
      }

      const results = [];
      let totalPendencias = 0;

      for (const proc of procedimentos) {
        const result = await this.validateProcedimento(
          guiaId,
          proc.id,
          operadoraId,
          undefined // TODO: Extrair porte do XML se disponível
        );

        results.push(result);
        totalPendencias += result.totalPendencias;
      }

      return {
        success: true,
        data: {
          guiaId,
          procedimentosValidados: results.length,
          totalPendencias,
          procedimentos: results
        }
      };
    } catch (error) {
      console.error('Erro ao validar guia:', error);
      throw error;
    }
  }
}

export default new ProcedureValidationService();
