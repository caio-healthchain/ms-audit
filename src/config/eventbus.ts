import { ServiceBusClient, ServiceBusSender, ServiceBusReceiver } from '@azure/service-bus';
import { config } from './config';
import { logger } from './logger';

export class EventBusService {
  private client: ServiceBusClient | null = null;
  private senders: Map<string, ServiceBusSender> = new Map();
  private receivers: Map<string, ServiceBusReceiver> = new Map();
  private isConnected: boolean = false;

  constructor() {
    if (config.eventBus.connectionString) {
      this.client = new ServiceBusClient(config.eventBus.connectionString);
    }
  }

  async connect(): Promise<void> {
    if (!this.client) {
      logger.warn('Event Bus connection string not provided, skipping initialization');
      return;
    }

    try {
      this.isConnected = true;
      logger.info('Event Bus (Azure Service Bus) connected successfully');
    } catch (error: unknown) {
      logger.error('Failed to connect to Event Bus:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Close all senders
      for (const [topic, sender] of this.senders) {
        await sender.close();
        logger.info(`Sender for topic ${topic} closed`);
      }
      this.senders.clear();

      // Close all receivers
      for (const [topic, receiver] of this.receivers) {
        await receiver.close();
        logger.info(`Receiver for topic ${topic} closed`);
      }
      this.receivers.clear();

      // Close client
      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      this.isConnected = false;
      logger.info('Event Bus disconnected successfully');
    } catch (error: unknown) {
      logger.error('Failed to disconnect from Event Bus:', error);
      throw error;
    }
  }

  async publishEvent(topic: string, message: any, properties?: Record<string, any>): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn('Event Bus not connected, skipping event publication');
      return;
    }

    try {
      let sender = this.senders.get(topic);
      if (!sender) {
        sender = this.client.createSender(topic);
        this.senders.set(topic, sender);
      }

      await sender.sendMessages({
        body: JSON.stringify({
          ...message,
          timestamp: new Date().toISOString(),
          version: 1,
        }),
        applicationProperties: {
          'content-type': 'application/json',
          'event-source': 'ms-ai-agent',
          ...properties,
        },
      });

      logger.info(`Event published to topic ${topic}:`, { message });
    } catch (error: unknown) {
      logger.error(`Failed to publish event to topic ${topic}:`, error);
      throw error;
    }
  }

  // Audit specific event publishers
  async publishAuditCreated(auditItem: any): Promise<void> {
    await this.publishEvent('audit-created', {
      eventType: 'AuditCreated',
      auditId: auditItem.id,
      data: auditItem,
    });
  }

  async publishAuditApproved(auditItem: any): Promise<void> {
    await this.publishEvent('audit-approved', {
      eventType: 'AuditApproved',
      auditId: auditItem.id,
      data: auditItem,
    });
  }

  async publishAuditRejected(auditItem: any): Promise<void> {
    await this.publishEvent('audit-rejected', {
      eventType: 'AuditRejected',
      auditId: auditItem.id,
      data: auditItem,
    });
  }

  async publishAuditUpdated(auditItem: any): Promise<void> {
    await this.publishEvent('audit-updated', {
      eventType: 'AuditUpdated',
      auditId: auditItem.id,
      data: auditItem,
    });
  }

  // AI Agent specific event publishers
  async publishAIRequestCreated(request: any): Promise<void> {
    await this.publishEvent(config.eventBus.queues.aiRequestCreated, {
      eventType: 'AIRequestCreated',
      requestId: request.id,
      data: request,
    });
  }

  async publishAIRequestProcessed(requestId: string, result: any): Promise<void> {
    await this.publishEvent(config.eventBus.queues.aiRequestProcessed, {
      eventType: 'AIRequestProcessed',
      requestId,
      result,
    });
  }

  async publishAIRequestCompleted(requestId: string, response: any): Promise<void> {
    await this.publishEvent(config.eventBus.queues.aiRequestCompleted, {
      eventType: 'AIRequestCompleted',
      requestId,
      response,
    });
  }

  async publishAIRequestFailed(requestId: string, error: any): Promise<void> {
    await this.publishEvent(config.eventBus.queues.aiRequestFailed, {
      eventType: 'AIRequestFailed',
      requestId,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    return this.isConnected;
  }
}

// Initialize Event Bus service
export const eventBusService = new EventBusService();

// Initialize Event Bus connection
export const initializeEventBus = async (): Promise<void> => {
  if (!config.eventBus.enabled) {
    logger.info('Event Bus is disabled, skipping initialization');
    return;
  }

  try {
    await eventBusService.connect();
    logger.info('Event Bus initialized successfully');
  } catch (error: unknown) {
    logger.error('Failed to initialize Event Bus:', error);
    // Don't throw error to allow service to start without Event Bus
    logger.warn('Service will continue without Event Bus functionality');
  }
};
