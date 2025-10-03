// Prisma generated types (PostgreSQL - Write Database)
export interface AIAgentModel {
  id: string;
  patientId: string;
  query: string;
  context?: string;
  priority: string;
  requestType: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB/Cosmos DB types (Read Database)
export interface AIAgentReadModel {
  _id: string;
  id: string;
  patientId: string;
  query: string;
  context?: string;
  priority: string;
  requestType: string;
  metadata?: any;
  response?: string;
  confidence?: number;
  sources?: string[];
  recommendations?: string[];
  followUpQuestions?: string[];
  processingTime?: number;
  model?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Event types for CQRS
export interface AIAgentCreatedEvent {
  type: 'ai-agent.created';
  data: AIAgentModel;
  timestamp: Date;
  version: number;
}

export interface AIAgentUpdatedEvent {
  type: 'ai-agent.updated';
  data: AIAgentModel;
  timestamp: Date;
  version: number;
}

export interface AIAgentDeletedEvent {
  type: 'ai-agent.deleted';
  data: { id: string };
  timestamp: Date;
  version: number;
}

export interface AIAgentProcessedEvent {
  type: 'ai-agent.processed';
  data: {
    id: string;
    response: string;
    confidence: number;
    processingTime: number;
    model: string;
  };
  timestamp: Date;
  version: number;
}
