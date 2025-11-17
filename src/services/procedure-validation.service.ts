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
      const porteEsperado = await prisma.tbdomPorte.findUnique({
        where: { codigo: codigoTUSS }
      });

      if (!porteEsperado) {
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

      const isValid = !porteEncontrado || porteEsperado.porte === porteEncontrado;

      return {
        isValid,
        tipo: 'PORTE',
        status: isValid ? 'CONFORME' : 'DIVERGENTE',
        mensagem: isValid
          ? 'Porte cirúrgico conforme'
          : `Porte divergente: Esperado ${porteEsperado.porte}, Encontrado ${porteEncontrado}`,
        detalhes: {
          codigoTUSS,
          porteEsperado: porteEsperado.porte,
          porteEncontrado: porteEncontrado || 'Não informado'
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
    operadoraId: string,
    codigoTUSS: string,
    valorCobrado: number
  ): Promise<ValidationResult> {
    try {
      // Buscar contrato ativo da operadora
      const contrato = await prisma.contrato.findFirst({
        where: {
          operadoraId,
          status: 'ATIVO',
          dataFim: { gte: new Date() }
        },
        include: {
          itens: {
            where: { codigoTUSS }
          }
        }
      });

      if (!contrato) {
        return {
          isValid: false,
          tipo: 'VALOR',
          status: 'ERRO',
          mensagem: 'Contrato não encontrado ou inativo',
          detalhes: null
        };
      }

      const item = contrato.itens[0];

      if (!item) {
        return {
          isValid: false,
          tipo: 'VALOR',
          status: 'NAO_ENCONTRADO',
          mensagem: `Procedimento ${codigoTUSS} não encontrado no contrato`,
          detalhes: null
        };
      }

      const valorContratado = parseFloat(item.valorContratado.toString());
      const valorCobradoNum = parseFloat(valorCobrado.toString());
      const diferenca = valorCobradoNum - valorContratado;
      const percentualDiferenca = ((diferenca / valorContratado) * 100).toFixed(2);

      const isValid = Math.abs(diferenca) < 0.01; // Tolerância de 1 centavo

      return {
        isValid,
        tipo: 'VALOR',
        status: isValid ? 'CONFORME' : 'DIVERGENTE',
        mensagem: isValid
          ? 'Valor conforme contrato'
          : `Valor divergente: ${diferenca > 0 ? '+' : ''}R$ ${diferenca.toFixed(2)} (${percentualDiferenca}%)`,
        detalhes: {
          codigoTUSS,
          valorContratado,
          valorCobrado: valorCobradoNum,
          diferenca,
          percentualDiferenca: parseFloat(percentualDiferenca),
          contratoNumero: contrato.numero
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
  async validatePacote(operadoraId: string, codigoTUSS: string): Promise<ValidationResult> {
    try {
      const contrato = await prisma.contrato.findFirst({
        where: {
          operadoraId,
          status: 'ATIVO',
          dataFim: { gte: new Date() }
        },
        include: {
          itens: {
            where: { codigoTUSS }
          }
        }
      });

      if (!contrato) {
        return {
          isValid: false,
          tipo: 'PACOTE',
          status: 'ERRO',
          mensagem: 'Contrato não encontrado ou inativo',
          detalhes: null
        };
      }

      const item = contrato.itens[0];

      if (!item) {
        return {
          isValid: false,
          tipo: 'PACOTE',
          status: 'FORA_PACOTE',
          mensagem: `Procedimento ${codigoTUSS} NÃO incluído no pacote contratual - Possível glosa`,
          detalhes: {
            codigoTUSS,
            contratoNumero: contrato.numero,
            requerAutorizacao: true
          }
        };
      }

      const isValid = item.estaNoPacote;

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
          contratoNumero: contrato.numero,
          observacoes: item.observacoes
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
    operadoraId: string
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
        this.validatePorte(codigoTUSS),
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
        await prisma.auditoria_validacoes.upsert({
          where: {
            guiaId_procedimentoId_tipoValidacao: {
              guiaId,
              procedimentoId,
              tipoValidacao: validacao.tipo as any
            }
          },
          create: {
            guiaId,
            procedimentoId,
            tipoValidacao: validacao.tipo as any,
            status: validacao.status as any,
            mensagem: validacao.mensagem,
            valorEsperado: validacao.detalhes?.valorContratado,
            valorEncontrado: validacao.detalhes?.valorCobrado,
            diferenca: validacao.detalhes?.diferenca,
            porteEsperado: validacao.detalhes?.porteEsperado,
            porteEncontrado: validacao.detalhes?.porteEncontrado,
            metadata: validacao.detalhes
          },
          update: {
            status: validacao.status as any,
            mensagem: validacao.mensagem,
            valorEsperado: validacao.detalhes?.valorContratado,
            valorEncontrado: validacao.detalhes?.valorCobrado,
            diferenca: validacao.detalhes?.diferenca,
            porteEsperado: validacao.detalhes?.porteEsperado,
            porteEncontrado: validacao.detalhes?.porteEncontrado,
            metadata: validacao.detalhes,
            updatedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Erro ao salvar validações:', error);
      // Não lançar erro para não interromper o fluxo
    }
  }

  /**
   * Valida todos os procedimentos de uma guia
   */
  async validateGuia(guiaId: number, operadoraId: string): Promise<any> {
    try {
      const procedimentos = await prisma.guia_procedimentos.findMany({
        where: { guiaId }
      });

      const validacoes = await Promise.all(
        procedimentos.map((proc) =>
          this.validateProcedimento(guiaId, proc.id, operadoraId)
        )
      );

      const totalProcedimentos = validacoes.length;
      const procedimentosConformes = validacoes.filter((v) => v.isValid).length;
      const procedimentosPendentes = totalProcedimentos - procedimentosConformes;
      const pendencias = validacoes.filter((v) => !v.isValid);

      return {
        guiaId,
        totalProcedimentos,
        procedimentosConformes,
        procedimentosPendentes,
        percentualConformidade: ((procedimentosConformes / totalProcedimentos) * 100).toFixed(
          2
        ),
        validacoes,
        pendencias
      };
    } catch (error) {
      console.error('Erro ao validar guia:', error);
      throw error;
    }
  }
}
