import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from './config';
import { logger } from './logger';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });

    this.consumer = this.kafka.consumer({
      groupId: config.kafka.groupId,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      logger.info('Kafka connected successfully');
    } catch (error: unknown) {
      logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka disconnected successfully');
    } catch (error: unknown) {
      logger.error('Failed to disconnect from Kafka:', error);
      throw error;
    }
  }

  async publishEvent(topic: string, message: any, key?: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka is not connected');
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: key || null,
            value: JSON.stringify({
              ...message,
              timestamp: new Date().toISOString(),
              version: 1,
            }),
            headers: {
              'content-type': 'application/json',
              'event-source': 'ms-ai-agent',
            },
          },
        ],
      });

      logger.info(`Event published to topic ${topic}:`, { key, message });
    } catch (error: unknown) {
      logger.error(`Failed to publish event to topic ${topic}:`, error);
      throw error;
    }
  }

  async subscribe(topics: string[], messageHandler: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    try {
      await this.consumer.subscribe({ topics, fromBeginning: false });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          try {
            logger.info(`Received message from topic ${payload.topic}:`, {
              partition: payload.partition,
              // CORREÇÃO: Usar message.offset ao invés de payload.offset
              offset: payload.message.offset,
              key: payload.message.key?.toString(),
            });
            
            await messageHandler(payload);
          } catch (error: unknown) {
            logger.error('Error processing message:', error);
            // Implement dead letter queue or retry logic here
          }
        },
      });
      
      logger.info(`Subscribed to topics: ${topics.join(', ')}`);
    } catch (error: unknown) {
      logger.error('Failed to subscribe to topics:', error);
      throw error;
    }
  }

  // AI Agent specific event publishers
  async publishAIRequestCreated(request: any): Promise<void> {
    // CORREÇÃO: Usar o nome correto do tópico
    await this.publishEvent(config.kafka.topics.aiRequestCreated, {
      eventType: 'AIRequestCreated',
      requestId: request.id,
      data: request,
    }, request.id);
  }

  async publishAIRequestProcessed(requestId: string, result: any): Promise<void> {
    // CORREÇÃO: Usar o nome correto do tópico
    await this.publishEvent(config.kafka.topics.aiRequestProcessed, {
      eventType: 'AIRequestProcessed',
      requestId,
      result,
    }, requestId);
  }

  async publishAIRequestCompleted(requestId: string, response: any): Promise<void> {
    // CORREÇÃO: Usar o nome correto do tópico
    await this.publishEvent(config.kafka.topics.aiRequestCompleted, {
      eventType: 'AIRequestCompleted',
      requestId,
      response,
    }, requestId);
  }

  async publishAIRequestFailed(requestId: string, error: any): Promise<void> {
    // CORREÇÃO: Usar o nome correto do tópico
    await this.publishEvent(config.kafka.topics.aiRequestFailed, {
      eventType: 'AIRequestFailed',
      requestId,
      error: {
        message: error.message,
        stack: error.stack,
      },
    }, requestId);
  }

  private getChanges(oldData: any, newData: any): any {
    const changes: any = {};
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        };
      }
    }
    
    return changes;
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    return this.isConnected;
  }
}

// Initialize Kafka service
export const kafkaService = new KafkaService();

// Initialize Kafka connection
export const initializeKafka = async (): Promise<void> => {
  if (!config.kafka.enabled) {
    logger.info('Kafka is disabled, skipping initialization');
    return;
  }

  try {
    await kafkaService.connect();
    
    // CORREÇÃO: Definir tipo explícito para o array
    const topicsToSubscribe: string[] = [
      config.kafka.topics.aiRequestCreated,
      config.kafka.topics.aiRequestProcessed,
      config.kafka.topics.aiRequestCompleted,
      config.kafka.topics.aiRequestFailed,
    ];

    // Subscribe to relevant topics
    await kafkaService.subscribe(topicsToSubscribe, async (payload: EachMessagePayload) => {
      const message = JSON.parse(payload.message.value?.toString() || '{}');
      
      logger.info(`Processing ${message.eventType} event:`, {
        topic: payload.topic,
        requestId: message.requestId,
      });

      // Handle different event types
      switch (message.eventType) {
        case 'AIRequestCreated':
          // Handle AI request created
          break;
        case 'AIRequestProcessed':
          // Handle AI request processed
          break;
        case 'AIRequestCompleted':
          // Handle AI request completed
          break;
        case 'AIRequestFailed':
          // Handle AI request failed
          break;
        default:
          logger.warn(`Unknown event type: ${message.eventType}`);
      }
    });

    logger.info('Kafka initialized successfully');
  } catch (error: unknown) {
    logger.error('Failed to initialize Kafka:', error);
    throw error;
  }
};
