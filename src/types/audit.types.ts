export interface AuditItem {
  id: string;
  patientId: string;
  patientName: string;
  procedureId?: string;
  procedureName?: string;
  procedureCode?: string;
  type: AuditType;
  status: AuditStatus;
  priority: AuditPriority;
  description: string;
  requestedBy: string;
  requestedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum AuditType {
  PROCEDURE_APPROVAL = 'PROCEDURE_APPROVAL',
  BILLING_REVIEW = 'BILLING_REVIEW',
  ACCOMMODATION_CHANGE = 'ACCOMMODATION_CHANGE',
  INSURANCE_VALIDATION = 'INSURANCE_VALIDATION',
  MEDICAL_NECESSITY = 'MEDICAL_NECESSITY',
  PORTE_CLASSIFICATION = 'PORTE_CLASSIFICATION'
}

export enum AuditStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_INFO = 'REQUIRES_INFO',
  CANCELLED = 'CANCELLED'
}

export enum AuditPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface CreateAuditRequest {
  patientId: string;
  procedureId?: string;
  type: AuditType;
  priority: AuditPriority;
  description: string;
  requestedBy: string;
  metadata?: Record<string, any>;
}

export interface UpdateAuditRequest {
  status?: AuditStatus;
  priority?: AuditPriority;
  description?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface AuditDecisionRequest {
  status: AuditStatus.APPROVED | AuditStatus.REJECTED;
  notes: string;
  reviewedBy: string;
}

export interface AuditSearchFilters {
  patientId?: string;
  procedureId?: string;
  type?: AuditType;
  status?: AuditStatus;
  priority?: AuditPriority;
  requestedBy?: string;
  reviewedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AuditStatistics {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  byType: Record<AuditType, number>;
  byPriority: Record<AuditPriority, number>;
  averageReviewTime: number; // em horas
  pendingOlderThan24h: number;
}

export interface PendingAuditSummary {
  totalPending: number;
  urgentPending: number;
  oldestPending: Date;
  byType: Record<AuditType, number>;
  recentActivity: AuditItem[];
}
