import { PrismaClient, EntityType, AuditCategory, ValidationStatus } from '@prisma/client';
import { logger } from '../config/logger';
import {
  AuditItem,
  AuditType,
  AuditStatus,
  AuditPriority,
  CreateAuditRequest,
  AuditDecisionRequest,
  AuditSearchFilters,
  AuditStatistics,
  PendingAuditSummary,
} from '../types/audit.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/common.types';

const prisma = new PrismaClient();

export class AuditService {
  // CREATE
  async createAudit(data: CreateAuditRequest): Promise<ApiResponse<AuditItem>> {
    try {
      const created = await prisma.auditLog.create({
        data: {
          entityType: EntityType.SYSTEM,                             // enum do Prisma
          entityId: data.procedureId ?? data.patientId ?? 'unknown',
          entityName: data.description ?? null,
          action: 'CREATE',
          description: data.description ?? 'Audit item created',
          category: AuditCategory.VALIDATION,                        // enum do Prisma
          userId: data.requestedBy ?? 'system',
          userName: data.requestedBy ?? 'system',                    // obrigatório no schema
          userRole: 'SYSTEM',
          userEmail: null,
          oldData: undefined,                                        // não usar null aqui
          newData: {
            type: data.type,
            priority: data.priority,
            description: data.description,
            metadata: data.metadata ?? null,
          },
          ipAddress: '0.0.0.0',
          userAgent: 'ms-audit',
          sessionId: 'unknown',
          requestId: null,
          validationStatus: ValidationStatus.PENDING,                // enum do Prisma
          validatedBy: null,
          validatedAt: null,
          justification: null,
          rejectionReason: null,
          metadata: (data.metadata ?? null) as any,
          tags: [],
          patientId: data.patientId ?? null,
          procedureId: data.procedureId ?? null,
          billingId: null,
          riskLevel: 'LOW',
          impact: 'LOW',
          processed: false,
          processedAt: null,
        },
      });

      return {
        success: true,
        data: this.mapLogToAuditItem(created),
        message: 'Audit item created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      logger.error('Failed to create audit item:', error);
      throw error;
    }
  }

  // GET BY ID
  async getAuditById(id: string): Promise<ApiResponse<AuditItem>> {
    try {
      const log = await prisma.auditLog.findUnique({ where: { id } });
      if (!log) throw new Error('Audit item not found');

      return {
        success: true,
        data: this.mapLogToAuditItem(log),
        message: 'Audit item retrieved successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      logger.error('Failed to retrieve audit item:', error);
      throw error;
    }
  }

  // SEARCH + PAGINATION
  async searchAudits(
    filters: AuditSearchFilters = {} as any,
    pagination: PaginationParams = {} as any
  ): Promise<PaginatedResponse<AuditItem>> {
    try {
      const where: any = { entityType: EntityType.SYSTEM };

      if ((filters as any).status) {
        where.validationStatus = (filters as any).status;
      }
      if ((filters as any).type) {
        where.AND = where.AND || [];
        where.AND.push({ newData: { path: ['type'], equals: (filters as any).type } });
      }
      if ((filters as any).priority) {
        where.AND = where.AND || [];
        where.AND.push({ newData: { path: ['priority'], equals: (filters as any).priority } });
      }
      if ((filters as any).search) {
        where.OR = [
          { description: { contains: (filters as any).search, mode: 'insensitive' } },
          { entityName: { contains: (filters as any).search, mode: 'insensitive' } },
        ];
      }

      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 10;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      const items = logs.map((l) => this.mapLogToAuditItem(l));
      const totalPages = Math.ceil(total / limit);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error: unknown) {
      logger.error('Failed to search audits:', error);
      throw error;
    }
  }

  // APPROVE
  async approveAudit(id: string, decision: AuditDecisionRequest): Promise<ApiResponse<AuditItem>> {
    try {
      const existing = await prisma.auditLog.findUnique({ where: { id } });
      if (!existing) throw new Error('Audit item not found');

      const updated = await prisma.auditLog.update({
        where: { id },
        data: {
          validationStatus: ValidationStatus.APPROVED,
          validatedBy: decision.reviewedBy ?? existing.validatedBy,
          validatedAt: new Date(),
          justification: decision.notes ?? existing.justification,
          newData: {
            ...(existing.newData as any),
            status: 'APPROVED',
            reviewedBy: decision.reviewedBy ?? (existing as any).reviewedBy ?? null,
            reviewedAt: new Date().toISOString(),
            notes: decision.notes ?? (existing as any).notes ?? null,
          },
        },
      });

      return {
        success: true,
        data: this.mapLogToAuditItem(updated),
        message: 'Audit item approved successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      logger.error('Failed to approve audit item:', error);
      throw error;
    }
  }

  // REJECT
  async rejectAudit(id: string, decision: AuditDecisionRequest): Promise<ApiResponse<AuditItem>> {
    try {
      const existing = await prisma.auditLog.findUnique({ where: { id } });
      if (!existing) throw new Error('Audit item not found');

      const updated = await prisma.auditLog.update({
        where: { id },
        data: {
          validationStatus: ValidationStatus.REJECTED,
          validatedBy: decision.reviewedBy ?? existing.validatedBy,
          validatedAt: new Date(),
          rejectionReason: decision.notes ?? existing.rejectionReason,
          newData: {
            ...(existing.newData as any),
            status: 'REJECTED',
            reviewedBy: decision.reviewedBy ?? (existing as any).reviewedBy ?? null,
            reviewedAt: new Date().toISOString(),
            notes: decision.notes ?? (existing as any).notes ?? null,
          },
        },
      });

      return {
        success: true,
        data: this.mapLogToAuditItem(updated),
        message: 'Audit item rejected successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      logger.error('Failed to reject audit item:', error);
      throw error;
    }
  }

  // PENDING SUMMARY
  async getPendingAudits(): Promise<ApiResponse<PendingAuditSummary>> {
    try {
      const pendingLogs = await prisma.auditLog.findMany({
        where: { entityType: EntityType.SYSTEM, validationStatus: ValidationStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      const now = new Date();

      const summary: PendingAuditSummary = {
        totalPending: pendingLogs.length,
        urgentPending: pendingLogs.filter((l) => (l.newData as any)?.priority === AuditPriority.URGENT).length,
        oldestPending: pendingLogs[0]?.createdAt ?? now,
        byType: this.groupByType(pendingLogs),
        recentActivity: pendingLogs.slice(0, 10).map((l) => this.mapLogToAuditItem(l)),
      };

      return {
        success: true,
        data: summary,
        message: 'Pending audits retrieved successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      logger.error('Failed to get pending audits:', error);
      throw error;
    }
  }

  // STATS
  async getAuditStatistics(): Promise<ApiResponse<AuditStatistics>> {
    try {
      const allLogs = await prisma.auditLog.findMany({
        where: { entityType: EntityType.SYSTEM },
      });

      const stats: AuditStatistics = {
        total: allLogs.length,
        pending: allLogs.filter((log) => this.getStatusFromAuditLog(log) === AuditStatus.PENDING).length,
        inReview: allLogs.filter((log) => this.getStatusFromAuditLog(log) === AuditStatus.IN_REVIEW).length,
        approved: allLogs.filter((log) => this.getStatusFromAuditLog(log) === AuditStatus.APPROVED).length,
        rejected: allLogs.filter((log) => this.getStatusFromAuditLog(log) === AuditStatus.REJECTED).length,
        byType: this.groupByType(allLogs),
        byPriority: this.groupByPriority(allLogs),
        averageReviewTime: this.calculateAverageReviewTime(allLogs),
        pendingOlderThan24h: this.countOldPending(allLogs),
      };

      return {
        success: true,
        data: stats,
        message: 'Audit statistics retrieved successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      logger.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  // ===== Helpers =====
  private getStatusFromAuditLog(log: any): AuditStatus {
    const vs: ValidationStatus = (log.validationStatus as ValidationStatus) ?? ValidationStatus.PENDING;
    if (vs === ValidationStatus.APPROVED) return AuditStatus.APPROVED;
    if (vs === ValidationStatus.REJECTED) return AuditStatus.REJECTED;
    return AuditStatus.PENDING; // não há IN_REVIEW no schema; mantenho PENDING como default
  }

  private mapLogToAuditItem(log: any): AuditItem {
    return {
      id: log.id,
      patientId: log.patientId ?? 'unknown',
      patientName: 'Unknown',
      procedureId: log.procedureId ?? undefined,
      procedureName: undefined,
      procedureCode: undefined,
      type: ((log.newData as any)?.type) ?? AuditType.PROCEDURE_APPROVAL,
      status: this.getStatusFromAuditLog(log),
      priority: ((log.newData as any)?.priority) ?? AuditPriority.MEDIUM,
      description: ((log.newData as any)?.description) ?? log.description ?? '',
      requestedBy: log.userId,
      requestedAt: log.createdAt,
      reviewedBy: log.validatedBy ?? undefined,
      reviewedAt: log.validatedAt ?? undefined,
      notes: ((log.newData as any)?.notes) ?? log.justification ?? undefined,
      metadata: ((log.newData as any)?.metadata) ?? (log.metadata as any) ?? undefined,
      createdAt: log.createdAt,
      updatedAt: log.createdAt,
    };
  }

  private groupByType(logs: any[]): Record<AuditType, number> {
    const result = {} as Record<AuditType, number>;
    (Object.values(AuditType) as AuditType[]).forEach((t) => {
      result[t] = logs.filter((l) => (l.newData as any)?.type === t).length;
    });
    return result;
  }

  private groupByPriority(logs: any[]): Record<AuditPriority, number> {
    const result = {} as Record<AuditPriority, number>;
    (Object.values(AuditPriority) as AuditPriority[]).forEach((p) => {
      result[p] = logs.filter((l) => (l.newData as any)?.priority === p).length;
    });
    return result;
  }

  private calculateAverageReviewTime(logs: any[]): number {
    const reviewed = logs.filter((l) => (l.newData as any)?.reviewedAt);
    if (reviewed.length === 0) return 0;
    const totalMs = reviewed.reduce((sum, l) => {
      const created = new Date(l.createdAt).getTime();
      const rev = new Date((l.newData as any).reviewedAt).getTime();
      return sum + Math.max(0, rev - created);
    }, 0);
    return totalMs / reviewed.length / (1000 * 60 * 60);
    }

  private countOldPending(logs: any[]): number {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return logs.filter((l) => this.getStatusFromAuditLog(l) === AuditStatus.PENDING && new Date(l.createdAt) < cutoff).length;
  }
}
