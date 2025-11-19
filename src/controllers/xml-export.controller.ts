import { Request, Response } from 'express';
import { XMLExportService } from '../services/xml-export.service';

export class XMLExportController {
  private xmlExportService: XMLExportService;

  constructor() {
    this.xmlExportService = new XMLExportService();
  }

  /**
   * POST /api/v1/xml/export/:guiaId
   * Gera XML de saída corrigido
   */
  async exportXML(req: Request, res: Response): Promise<void> {
    try {
      const { guiaId } = req.params;
      const { 
        incluirAprovados = true, 
        incluirRejeitados = false, 
        aplicarCorrecoes = true,
        salvarArquivo = false
      } = req.body;

      const xml = await this.xmlExportService.gerarXMLSaida({
        guiaId: parseInt(guiaId),
        incluirAprovados,
        incluirRejeitados,
        aplicarCorrecoes
      });

      // Gerar hash do XML
      const hash = this.xmlExportService.generateXMLHash(xml);

      // Salvar arquivo se solicitado
      let filepath;
      if (salvarArquivo) {
        filepath = await this.xmlExportService.salvarXML(parseInt(guiaId), xml);
      }

      res.json({
        success: true,
        guiaId: parseInt(guiaId),
        xml,
        hash,
        filepath,
        tamanho: xml.length,
        mensagem: 'XML gerado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao exportar XML:', error);
      res.status(500).json({
        error: 'Erro ao exportar XML',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/v1/xml/download/:guiaId
   * Faz download do XML corrigido
   */
  async downloadXML(req: Request, res: Response): Promise<void> {
    try {
      const { guiaId } = req.params;
      const { 
        incluirAprovados = true, 
        incluirRejeitados = false, 
        aplicarCorrecoes = true 
      } = req.query;

      const xml = await this.xmlExportService.gerarXMLSaida({
        guiaId: parseInt(guiaId),
        incluirAprovados: incluirAprovados === 'true',
        incluirRejeitados: incluirRejeitados === 'true',
        aplicarCorrecoes: aplicarCorrecoes === 'true'
      });

      // Configurar headers para download
      res.setHeader('Content-Type', 'application/xml; charset=ISO-8859-1');
      res.setHeader('Content-Disposition', `attachment; filename="guia_${guiaId}_corrigida.xml"`);
      res.send(xml);
    } catch (error) {
      console.error('Erro ao fazer download do XML:', error);
      res.status(500).json({
        error: 'Erro ao fazer download do XML',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
