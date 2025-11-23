import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export interface XMLExportOptions {
  guiaId: number;
  incluirAprovados?: boolean;
  incluirRejeitados?: boolean;
  aplicarCorrecoes?: boolean;
}

export class XMLExportService {
  /**
   * Gera XML de saída corrigido baseado nas aprovações/rejeições
   */
  async gerarXMLSaida(options: XMLExportOptions): Promise<string> {
    try {
      const { guiaId, incluirAprovados = true, incluirRejeitados = false, aplicarCorrecoes = true } = options;

      // Buscar dados da guia
      const guia = await prisma.guia.findUnique({
        where: { id: guiaId }
      });

      // Buscar procedimentos da guia
      const procedimentos = await prisma.guia_procedimentos.findMany({
        where: { guiaId }
      });

      // Buscar status dos procedimentos
      const statusList = await prisma.procedimento_status.findMany({
        where: { guiaId }
      });

      if (!guia) {
        throw new Error('Guia não encontrada');
      }

      // Criar mapa de status
      const statusMap = new Map(statusList.map((s: any) => [s.procedimentoId, s.status]));

      // Filtrar procedimentos baseado no status
      const procedimentosFiltrados = procedimentos.filter((proc: any) => {
        const status = statusMap.get(proc.id) || 'PENDENTE';
        
        if (incluirAprovados && status === 'APROVADO') return true;
        if (incluirRejeitados && status === 'REJEITADO') return true;
        if (!incluirAprovados && !incluirRejeitados) return true; // Incluir todos se nenhum filtro
        
        return false;
      });

      // Construir XML
      const xml = this.construirXML(guia, procedimentosFiltrados, aplicarCorrecoes);

      return xml;
    } catch (error) {
      console.error('Erro ao gerar XML de saída:', error);
      throw error;
    }
  }

  /**
   * Constrói o XML no formato TISS
   */
  private construirXML(guia: any, procedimentos: any[], aplicarCorrecoes: boolean): string {
    const dataAtual = new Date().toISOString().split('T')[0];
    const horaAtual = new Date().toTimeString().split(' ')[0];

    // Calcular valores totais
    const totais = this.calcularTotais(procedimentos, aplicarCorrecoes);

    let xml = `<?xml version="1.0" encoding="ISO-8859-1" ?>\n`;
    xml += `<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schemas http://www.ans.gov.br/padroes/tiss/schemas/tissV4_01_00.xsd">\n`;
    
    // Cabeçalho
    xml += `<ans:cabecalho>\n`;
    xml += `  <ans:identificacaoTransacao>\n`;
    xml += `    <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>\n`;
    xml += `    <ans:sequencialTransacao>${guia.sequencialTransacao || ''}</ans:sequencialTransacao>\n`;
    xml += `    <ans:dataRegistroTransacao>${dataAtual}</ans:dataRegistroTransacao>\n`;
    xml += `    <ans:horaRegistroTransacao>${horaAtual}</ans:horaRegistroTransacao>\n`;
    xml += `  </ans:identificacaoTransacao>\n`;
    xml += `  <ans:origem>\n`;
    xml += `    <ans:identificacaoPrestador>\n`;
    xml += `      <ans:codigoPrestadorNaOperadora>${guia.codigoPrestador || ''}</ans:codigoPrestadorNaOperadora>\n`;
    xml += `    </ans:identificacaoPrestador>\n`;
    xml += `  </ans:origem>\n`;
    xml += `  <ans:destino>\n`;
    xml += `    <ans:registroANS>${guia.operadoraRegistroAns || ''}</ans:registroANS>\n`;
    xml += `  </ans:destino>\n`;
    xml += `  <ans:Padrao>4.01.00</ans:Padrao>\n`;
    xml += `</ans:cabecalho>\n`;

    // Corpo da mensagem
    xml += `<ans:prestadorParaOperadora>\n`;
    xml += `  <ans:loteGuias>\n`;
    xml += `    <ans:numeroLote>${guia.numeroLote || ''}</ans:numeroLote>\n`;
    xml += `    <ans:guiasTISS>\n`;
    xml += `      <ans:guiaResumoInternacao>\n`;
    
    // Cabeçalho da guia
    xml += `        <ans:cabecalhoGuia>\n`;
    xml += `          <ans:registroANS>${guia.operadoraRegistroAns || ''}</ans:registroANS>\n`;
    xml += `          <ans:numeroGuiaPrestador>${guia.numeroGuia || ''}</ans:numeroGuiaPrestador>\n`;
    xml += `        </ans:cabecalhoGuia>\n`;

    // Dados de autorização
    if (guia.numeroGuiaSolicitacao) {
      xml += `        <ans:numeroGuiaSolicitacaoInternacao>${guia.numeroGuiaSolicitacao}</ans:numeroGuiaSolicitacaoInternacao>\n`;
    }
    
    xml += `        <ans:dadosAutorizacao>\n`;
    xml += `          <ans:numeroGuiaOperadora>${guia.numeroGuiaOperadora || ''}</ans:numeroGuiaOperadora>\n`;
    xml += `          <ans:dataAutorizacao>${guia.dataAutorizacao || ''}</ans:dataAutorizacao>\n`;
    xml += `          <ans:senha>${guia.senha || ''}</ans:senha>\n`;
    xml += `        </ans:dadosAutorizacao>\n`;

    // Dados do beneficiário
    xml += `        <ans:dadosBeneficiario>\n`;
    xml += `          <ans:numeroCarteira>${guia.numeroCarteira || ''}</ans:numeroCarteira>\n`;
    xml += `          <ans:atendimentoRN>${guia.atendimentoRN || 'N'}</ans:atendimentoRN>\n`;
    xml += `        </ans:dadosBeneficiario>\n`;

    // Dados do executante
    xml += `        <ans:dadosExecutante>\n`;
    xml += `          <ans:contratadoExecutante>\n`;
    xml += `            <ans:codigoPrestadorNaOperadora>${guia.codigoPrestador || ''}</ans:codigoPrestadorNaOperadora>\n`;
    xml += `          </ans:contratadoExecutante>\n`;
    xml += `          <ans:CNES>${guia.cnes || ''}</ans:CNES>\n`;
    xml += `        </ans:dadosExecutante>\n`;

    // Dados da internação
    xml += `        <ans:dadosInternacao>\n`;
    xml += `          <ans:caraterAtendimento>${guia.caraterAtendimento || '1'}</ans:caraterAtendimento>\n`;
    xml += `          <ans:tipoFaturamento>${guia.tipoFaturamento || '4'}</ans:tipoFaturamento>\n`;
    xml += `          <ans:dataInicioFaturamento>${guia.dataInicio || ''}</ans:dataInicioFaturamento>\n`;
    xml += `          <ans:horaInicioFaturamento>${guia.horaInicio || ''}</ans:horaInicioFaturamento>\n`;
    xml += `          <ans:dataFinalFaturamento>${guia.dataFim || ''}</ans:dataFinalFaturamento>\n`;
    xml += `          <ans:horaFinalFaturamento>${guia.horaFim || ''}</ans:horaFinalFaturamento>\n`;
    xml += `          <ans:tipoInternacao>${guia.tipoInternacao || '2'}</ans:tipoInternacao>\n`;
    xml += `          <ans:regimeInternacao>${guia.regimeInternacao || '1'}</ans:regimeInternacao>\n`;
    xml += `        </ans:dadosInternacao>\n`;

    // Dados de saída
    xml += `        <ans:dadosSaidaInternacao>\n`;
    xml += `          <ans:diagnostico>${guia.diagnostico || ''}</ans:diagnostico>\n`;
    xml += `          <ans:indicadorAcidente>${guia.indicadorAcidente || '2'}</ans:indicadorAcidente>\n`;
    xml += `          <ans:motivoEncerramento>${guia.motivoEncerramento || '12'}</ans:motivoEncerramento>\n`;
    xml += `        </ans:dadosSaidaInternacao>\n`;

    // Valor total
    xml += `        <ans:valorTotal>\n`;
    xml += `          <ans:valorDiarias>${totais.valorDiarias.toFixed(2)}</ans:valorDiarias>\n`;
    xml += `          <ans:valorTaxasAlugueis>${totais.valorTaxasAlugueis.toFixed(2)}</ans:valorTaxasAlugueis>\n`;
    xml += `          <ans:valorMateriais>${totais.valorMateriais.toFixed(2)}</ans:valorMateriais>\n`;
    xml += `          <ans:valorMedicamentos>${totais.valorMedicamentos.toFixed(2)}</ans:valorMedicamentos>\n`;
    xml += `          <ans:valorOPME>${totais.valorOPME.toFixed(2)}</ans:valorOPME>\n`;
    xml += `          <ans:valorGasesMedicinais>${totais.valorGasesMedicinais.toFixed(2)}</ans:valorGasesMedicinais>\n`;
    xml += `          <ans:valorTotalGeral>${totais.valorTotalGeral.toFixed(2)}</ans:valorTotalGeral>\n`;
    xml += `        </ans:valorTotal>\n`;

    // Outras despesas (procedimentos)
    xml += `        <ans:outrasDespesas>\n`;
    procedimentos.forEach((proc: any, index: number) => {
      xml += this.construirProcedimentoXML(proc, index + 1, aplicarCorrecoes);
    });
    xml += `        </ans:outrasDespesas>\n`;

    xml += `      </ans:guiaResumoInternacao>\n`;
    xml += `    </ans:guiasTISS>\n`;
    xml += `  </ans:loteGuias>\n`;
    xml += `</ans:prestadorParaOperadora>\n`;
    xml += `</ans:mensagemTISS>`;

    return xml;
  }

  /**
   * Constrói XML de um procedimento individual
   */
  private construirProcedimentoXML(procedimento: any, sequencial: number, aplicarCorrecoes: boolean): string {
    // Determinar valores a usar (aprovados ou originais)
    const valorUnitario = aplicarCorrecoes && procedimento.valorAprovado !== null && procedimento.valorAprovado !== undefined
      ? procedimento.valorAprovado 
      : procedimento.valorUnitario || 0;
    
    const quantidade = aplicarCorrecoes && procedimento.quantidadeAprovada
      ? procedimento.quantidadeAprovada
      : procedimento.quantidadeExecutada || 1;

    const valorTotal = valorUnitario * quantidade;

    let xml = `          <ans:despesa>\n`;
    xml += `            <ans:sequencialItem>${sequencial}</ans:sequencialItem>\n`;
    xml += `            <ans:codigoDespesa>${procedimento.codigoDespesa || '01'}</ans:codigoDespesa>\n`;
    xml += `            <ans:servicosExecutados>\n`;
    xml += `              <ans:dataExecucao>${procedimento.dataExecucao || ''}</ans:dataExecucao>\n`;
    xml += `              <ans:codigoTabela>${procedimento.codigoTabela || '18'}</ans:codigoTabela>\n`;
    xml += `              <ans:codigoProcedimento>${procedimento.codigoProcedimento || ''}</ans:codigoProcedimento>\n`;
    xml += `              <ans:quantidadeExecutada>${quantidade.toFixed(4)}</ans:quantidadeExecutada>\n`;
    xml += `              <ans:unidadeMedida>${procedimento.unidadeMedida || '036'}</ans:unidadeMedida>\n`;
    xml += `              <ans:reducaoAcrescimo>${procedimento.reducaoAcrescimo || '0.00'}</ans:reducaoAcrescimo>\n`;
    xml += `              <ans:valorUnitario>${valorUnitario.toFixed(2)}</ans:valorUnitario>\n`;
    xml += `              <ans:valorTotal>${valorTotal.toFixed(2)}</ans:valorTotal>\n`;
    xml += `              <ans:descricaoProcedimento>${this.escapeXML(procedimento.descricao || '')}</ans:descricaoProcedimento>\n`;
    xml += `            </ans:servicosExecutados>\n`;
    xml += `          </ans:despesa>\n`;

    return xml;
  }

  /**
   * Calcula totais dos procedimentos
   */
  private calcularTotais(procedimentos: any[], aplicarCorrecoes: boolean): any {
    const totais = {
      valorDiarias: 0,
      valorTaxasAlugueis: 0,
      valorMateriais: 0,
      valorMedicamentos: 0,
      valorOPME: 0,
      valorGasesMedicinais: 0,
      valorTotalGeral: 0
    };

    procedimentos.forEach((proc: any) => {
      const valorUnitario = aplicarCorrecoes && proc.valorAprovado !== null && proc.valorAprovado !== undefined
        ? proc.valorAprovado 
        : proc.valorUnitario || 0;
      
      const quantidade = aplicarCorrecoes && proc.quantidadeAprovada
        ? proc.quantidadeAprovada
        : proc.quantidadeExecutada || 1;

      const valorTotal = valorUnitario * quantidade;

      // Classificar por tipo de despesa
      const codigoDespesa = proc.codigoDespesa || '01';
      
      switch (codigoDespesa) {
        case '01': // Diárias
          totais.valorDiarias += valorTotal;
          break;
        case '02': // Taxas e aluguéis
          totais.valorTaxasAlugueis += valorTotal;
          break;
        case '03': // Materiais
          totais.valorMateriais += valorTotal;
          break;
        case '04': // Medicamentos
          totais.valorMedicamentos += valorTotal;
          break;
        case '05': // OPME
          totais.valorOPME += valorTotal;
          break;
        case '06': // Gases medicinais
          totais.valorGasesMedicinais += valorTotal;
          break;
        default:
          totais.valorTaxasAlugueis += valorTotal;
      }

      totais.valorTotalGeral += valorTotal;
    });

    return totais;
  }

  /**
   * Escapa caracteres especiais para XML
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Gera hash do XML para rastreabilidade
   */
  generateXMLHash(xml: string): string {
    return crypto.createHash('sha256').update(xml).digest('hex');
  }

  /**
   * Salva XML em arquivo
   */
  async salvarXML(guiaId: number, xml: string): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');

    const outputDir = '/tmp/xml_saida';
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `guia_${guiaId}_${Date.now()}.xml`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, xml, 'utf-8');

    return filepath;
  }
}
