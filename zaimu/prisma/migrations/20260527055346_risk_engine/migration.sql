-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('LEASE', 'DEBT', 'REPORTING', 'COMPLIANCE', 'TREASURY');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('INFORMATIONAL', 'WARNING', 'CRITICAL', 'ESCALATED');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('NONE', 'ANALYST', 'SENIOR_ANALYST', 'FUND_MANAGER', 'BOARD');

-- CreateTable
CREATE TABLE "risk_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "description" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "default_severity" "RiskSeverity" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "parameters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_events" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "rule_id" TEXT,
    "rule_code" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "escalation_level" "EscalationLevel" NOT NULL DEFAULT 'NONE',
    "title" TEXT NOT NULL,
    "title_ja" TEXT,
    "description" TEXT NOT NULL,
    "description_ja" TEXT,
    "trigger_data" JSONB,
    "source_document_ids" TEXT[],
    "recommended_action" TEXT,
    "recommended_action_ja" TEXT,
    "confidence" DOUBLE PRECISION,
    "ai_analysis" TEXT,
    "ai_analysis_ja" TEXT,
    "ai_analyzed_at" TIMESTAMP(3),
    "first_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "suppressed_until" TIMESTAMP(3),
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "recurrence_count" INTEGER NOT NULL DEFAULT 0,
    "last_resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_escalations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "level" "EscalationLevel" NOT NULL,
    "escalated_by" TEXT,
    "escalated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "risk_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_health_scores" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "lease_score" DOUBLE PRECISION NOT NULL,
    "debt_score" DOUBLE PRECISION NOT NULL,
    "reporting_score" DOUBLE PRECISION NOT NULL,
    "compliance_score" DOUBLE PRECISION NOT NULL,
    "treasury_score" DOUBLE PRECISION NOT NULL,
    "completeness_score" DOUBLE PRECISION NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "open_critical" INTEGER NOT NULL DEFAULT 0,
    "open_warnings" INTEGER NOT NULL DEFAULT 0,
    "open_info" INTEGER NOT NULL DEFAULT 0,
    "open_escalated" INTEGER NOT NULL DEFAULT 0,
    "scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "risk_rules_code_key" ON "risk_rules"("code");

-- CreateIndex
CREATE INDEX "risk_events_org_id_status_idx" ON "risk_events"("org_id", "status");

-- CreateIndex
CREATE INDEX "risk_events_asset_id_status_idx" ON "risk_events"("asset_id", "status");

-- CreateIndex
CREATE INDEX "risk_events_severity_status_idx" ON "risk_events"("severity", "status");

-- CreateIndex
CREATE UNIQUE INDEX "risk_events_asset_id_rule_code_key" ON "risk_events"("asset_id", "rule_code");

-- CreateIndex
CREATE UNIQUE INDEX "asset_health_scores_asset_id_key" ON "asset_health_scores"("asset_id");

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "risk_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_escalations" ADD CONSTRAINT "risk_escalations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "risk_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_health_scores" ADD CONSTRAINT "asset_health_scores_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
