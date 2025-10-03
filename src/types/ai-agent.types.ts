export interface AIAgentRequest {
  id?: string;
  patientId: string;
  query: string;
  context?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestType: 'diagnosis' | 'treatment' | 'analysis' | 'recommendation';
  metadata?: Record<string, any>;
}

export interface AIAgentResponse {
  id: string;
  requestId: string;
  response: string;
  confidence: number;
  sources?: string[];
  recommendations?: string[];
  followUpQuestions?: string[];
  processingTime: number;
  model: string;
  timestamp: Date;
}

export interface AIAgentCreateData {
  patientId: string;
  query: string;
  context?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requestType: 'diagnosis' | 'treatment' | 'analysis' | 'recommendation';
  metadata?: Record<string, any>;
}

export interface AIAgentUpdateData {
  query?: string;
  context?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requestType?: 'diagnosis' | 'treatment' | 'analysis' | 'recommendation';
  metadata?: Record<string, any>;
}

export interface AIAgentSearchFilters {
  patientId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requestType?: 'diagnosis' | 'treatment' | 'analysis' | 'recommendation';
  dateFrom?: Date;
  dateTo?: Date;
  confidence?: number;
  model?: string;
}

export interface AIModel {
  id: string;
  name: string;
  version: string;
  type: 'llm' | 'classification' | 'regression' | 'nlp';
  capabilities: string[];
  maxTokens: number;
  isActive: boolean;
}

export interface ProcessingMetrics {
  totalRequests: number;
  averageProcessingTime: number;
  successRate: number;
  averageConfidence: number;
  modelUsage: Record<string, number>;
}
