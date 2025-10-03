-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PATIENT', 'PROCEDURE', 'BILLING', 'MATERIAL', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'REJECT', 'VALIDATE', 'EXPORT', 'IMPORT', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('DATA_CHANGE', 'ACCESS_CONTROL', 'VALIDATION', 'APPROVAL', 'SYSTEM_EVENT', 'SECURITY_EVENT', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW', 'ESCALATED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PendencyCategory" AS ENUM ('DATA_VALIDATION', 'APPROVAL_REQUIRED', 'COMPLIANCE_ISSUE', 'SECURITY_CONCERN', 'SYSTEM_ERROR', 'BUSINESS_RULE');

-- CreateEnum
CREATE TYPE "PendencyPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PendencyStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditRuleCategory" AS ENUM ('VALIDATION', 'SECURITY', 'COMPLIANCE', 'BUSINESS_RULE', 'DATA_QUALITY', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "ComplianceCategory" AS ENUM ('DATA_PRIVACY', 'SECURITY', 'REGULATORY', 'BUSINESS_POLICY', 'QUALITY_ASSURANCE', 'FINANCIAL');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'UNDER_REVIEW', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('AUDIT_SUMMARY', 'COMPLIANCE_REPORT', 'SECURITY_REPORT', 'ACTIVITY_REPORT', 'EXCEPTION_REPORT', 'CUSTOM_REPORT');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('OPERATIONAL', 'COMPLIANCE', 'SECURITY', 'FINANCIAL', 'QUALITY', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SCHEDULED');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "action" "AuditAction" NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "userEmail" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "changes" JSONB,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requestId" TEXT,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "justification" TEXT,
    "rejectionReason" TEXT,
    "metadata" JSONB,
    "tags" TEXT[],
    "patientId" TEXT,
    "procedureId" TEXT,
    "billingId" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "impact" "ImpactLevel" NOT NULL DEFAULT 'LOW',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_pendencies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "PendencyCategory" NOT NULL,
    "priority" "PendencyPriority" NOT NULL DEFAULT 'MEDIUM',
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "status" "PendencyStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "dueDate" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "attachments" TEXT[],
    "patientId" TEXT,
    "procedureId" TEXT,
    "billingId" TEXT,
    "auditLogId" TEXT,

    CONSTRAINT "validation_pendencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_rules" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AuditRuleCategory" NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "triggers" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "severity" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "audit_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_checks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ComplianceCategory" NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "status" "ComplianceStatus" NOT NULL,
    "score" DECIMAL(5,2),
    "maxScore" DECIMAL(5,2),
    "findings" JSONB NOT NULL,
    "recommendations" JSONB,
    "executedBy" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "patientId" TEXT,
    "procedureId" TEXT,
    "billingId" TEXT,

    CONSTRAINT "compliance_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_reports" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReportType" NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "filters" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "summary" JSONB,
    "metrics" JSONB,
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TEXT,

    CONSTRAINT "audit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_validationStatus_idx" ON "audit_logs"("validationStatus");

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "audit_logs_riskLevel_idx" ON "audit_logs"("riskLevel");

-- CreateIndex
CREATE INDEX "audit_logs_patientId_idx" ON "audit_logs"("patientId");

-- CreateIndex
CREATE INDEX "audit_logs_procedureId_idx" ON "audit_logs"("procedureId");

-- CreateIndex
CREATE INDEX "audit_logs_billingId_idx" ON "audit_logs"("billingId");

-- CreateIndex
CREATE INDEX "validation_pendencies_status_idx" ON "validation_pendencies"("status");

-- CreateIndex
CREATE INDEX "validation_pendencies_category_idx" ON "validation_pendencies"("category");

-- CreateIndex
CREATE INDEX "validation_pendencies_priority_idx" ON "validation_pendencies"("priority");

-- CreateIndex
CREATE INDEX "validation_pendencies_assignedTo_idx" ON "validation_pendencies"("assignedTo");

-- CreateIndex
CREATE INDEX "validation_pendencies_dueDate_idx" ON "validation_pendencies"("dueDate");

-- CreateIndex
CREATE INDEX "validation_pendencies_entityType_entityId_idx" ON "validation_pendencies"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "validation_pendencies_patientId_idx" ON "validation_pendencies"("patientId");

-- CreateIndex
CREATE INDEX "validation_pendencies_procedureId_idx" ON "validation_pendencies"("procedureId");

-- CreateIndex
CREATE INDEX "validation_pendencies_billingId_idx" ON "validation_pendencies"("billingId");

-- CreateIndex
CREATE UNIQUE INDEX "audit_rules_name_key" ON "audit_rules"("name");

-- CreateIndex
CREATE INDEX "audit_rules_entityType_idx" ON "audit_rules"("entityType");

-- CreateIndex
CREATE INDEX "audit_rules_category_idx" ON "audit_rules"("category");

-- CreateIndex
CREATE INDEX "audit_rules_isActive_idx" ON "audit_rules"("isActive");

-- CreateIndex
CREATE INDEX "audit_rules_priority_idx" ON "audit_rules"("priority");

-- CreateIndex
CREATE INDEX "compliance_checks_category_idx" ON "compliance_checks"("category");

-- CreateIndex
CREATE INDEX "compliance_checks_status_idx" ON "compliance_checks"("status");

-- CreateIndex
CREATE INDEX "compliance_checks_entityType_entityId_idx" ON "compliance_checks"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "compliance_checks_executedAt_idx" ON "compliance_checks"("executedAt");

-- CreateIndex
CREATE INDEX "compliance_checks_patientId_idx" ON "compliance_checks"("patientId");

-- CreateIndex
CREATE INDEX "compliance_checks_procedureId_idx" ON "compliance_checks"("procedureId");

-- CreateIndex
CREATE INDEX "compliance_checks_billingId_idx" ON "compliance_checks"("billingId");

-- CreateIndex
CREATE INDEX "audit_reports_type_idx" ON "audit_reports"("type");

-- CreateIndex
CREATE INDEX "audit_reports_category_idx" ON "audit_reports"("category");

-- CreateIndex
CREATE INDEX "audit_reports_status_idx" ON "audit_reports"("status");

-- CreateIndex
CREATE INDEX "audit_reports_periodStart_periodEnd_idx" ON "audit_reports"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "audit_reports_generatedBy_idx" ON "audit_reports"("generatedBy");
