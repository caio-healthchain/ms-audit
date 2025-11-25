import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AnalyticsService } from '../services/analytics.service';
import { logger } from '../config/logger';

const analyticsService = new AnalyticsService();

const TOOLS: Tool[] = [
  {
    name: 'get_savings_summary',
    description: 'Retorna resumo de economia (savings) com correções do sistema. Útil para "Quanto eu tive de saving com correções?"',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['day', 'week', 'month', 'quarter', 'year'],
          default: 'month',
        },
        date: {
          type: 'string',
          format: 'date',
        },
      },
    },
  },
  {
    name: 'get_audit_metrics',
    description: 'Retorna métricas gerais de auditoria (total, aprovadas, rejeitadas, taxa de aprovação)',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['day', 'week', 'month', 'quarter', 'year'],
          default: 'month',
        },
        date: {
          type: 'string',
          format: 'date',
        },
      },
    },
  },
  {
    name: 'get_correction_analysis',
    description: 'Análise detalhada de correções por tipo',
    inputSchema: {
      type: 'object',
      properties: {
        correctionType: {
          type: 'string',
        },
        period: {
          type: 'string',
          enum: ['day', 'week', 'month', 'quarter', 'year'],
          default: 'month',
        },
        date: {
          type: 'string',
          format: 'date',
        },
      },
    },
  },
  {
    name: 'get_billing_analysis',
    description: 'Análise de faturamento (contas pagas, pendentes, inadimplência)',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['day', 'week', 'month', 'quarter', 'year'],
          default: 'month',
        },
        date: {
          type: 'string',
          format: 'date',
        },
      },
    },
  },
];

class AuditMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'lazarus-audit-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`[MCP] Executando tool: ${name}`, { args });

      try {
        switch (name) {
          case 'get_savings_summary':
            return await this.handleGetSavings(args);
          case 'get_audit_metrics':
            return await this.handleGetMetrics(args);
          case 'get_correction_analysis':
            return await this.handleGetCorrections(args);
          case 'get_billing_analysis':
            return await this.handleGetBilling(args);
          default:
            throw new Error(`Tool desconhecida: ${name}`);
        }
      } catch (error) {
        logger.error(`[MCP] Erro ao executar tool ${name}:`, error);
        return {
          content: [{ type: 'text', text: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}` }],
          isError: true,
        };
      }
    });
  }

  private async handleGetSavings(args: any) {
    const period = args?.period || 'month';
    const date = args?.date ? new Date(args.date) : new Date();
    const savings = await analyticsService.getSavingsSummary(period, date);
    return { content: [{ type: 'text', text: JSON.stringify(savings, null, 2) }] };
  }

  private async handleGetMetrics(args: any) {
    const period = args?.period || 'month';
    const date = args?.date ? new Date(args.date) : new Date();
    const metrics = await analyticsService.getAuditMetrics(period, date);
    return { content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }] };
  }

  private async handleGetCorrections(args: any) {
    const period = args?.period || 'month';
    const date = args?.date ? new Date(args.date) : new Date();
    const corrections = await analyticsService.getCorrectionAnalysis(args?.correctionType, period, date);
    return { content: [{ type: 'text', text: JSON.stringify(corrections, null, 2) }] };
  }

  private async handleGetBilling(args: any) {
    const period = args?.period || 'month';
    const date = args?.date ? new Date(args.date) : new Date();
    const billing = await analyticsService.getBillingAnalysis(period, date);
    return { content: [{ type: 'text', text: JSON.stringify(billing, null, 2) }] };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('[MCP] Servidor MCP iniciado');
  }
}

if (require.main === module) {
  const mcpServer = new AuditMCPServer();
  mcpServer.run().catch((error) => {
    logger.error('[MCP] Erro ao iniciar:', error);
    process.exit(1);
  });
}

export { AuditMCPServer };
