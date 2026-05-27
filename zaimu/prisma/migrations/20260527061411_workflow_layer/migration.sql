-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('REFINANCING', 'LEASE_RENEWAL', 'VALUATION_UPDATE', 'MONTHLY_REPORTING', 'INSURANCE_RENEWAL', 'COVENANT_REPORTING', 'CAPEX_APPROVAL', 'ACQUISITION_ONBOARDING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETE', 'BLOCKED', 'SKIPPED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('ACTION', 'APPROVAL', 'DOCUMENT_UPLOAD', 'MILESTONE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ABSTAINED');

-- CreateEnum
CREATE TYPE "EscalationPath" AS ENUM ('STANDARD', 'EXPEDITED', 'BOARD', 'EXTERNAL');

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "description" TEXT,
    "workflow_type" "WorkflowType" NOT NULL,
    "asset_types" TEXT[],
    "jurisdictions" TEXT[],
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "estimated_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_template_steps" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "description" TEXT,
    "step_type" "StepType" NOT NULL,
    "due_days_from_start" INTEGER,
    "default_owner_role" TEXT,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approver_roles" TEXT[],
    "depends_on_orders" INTEGER[],
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "guidance_note" TEXT,

    CONSTRAINT "workflow_template_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "template_id" TEXT,
    "workflow_type" "WorkflowType" NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "title_ja" TEXT,
    "description" TEXT,
    "linked_risk_event_ids" TEXT[],
    "started_at" TIMESTAMP(3),
    "target_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "ai_suggestions" TEXT,
    "ai_analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "description" TEXT,
    "step_type" "StepType" NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "owner_id" TEXT,
    "assignee_ids" TEXT[],
    "due_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "completion_note" TEXT,
    "escalation_path" "EscalationPath" NOT NULL DEFAULT 'STANDARD',
    "escalated_at" TIMESTAMP(3),
    "escalated_to" TEXT,
    "escalation_note" TEXT,
    "depends_on_step_ids" TEXT[],
    "blocked_reason" TEXT,
    "linked_risk_event_id" TEXT,
    "document_ids" TEXT[],
    "guidance_note" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_approvals" (
    "id" TEXT NOT NULL,
    "workflow_step_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "reviewer_ids" TEXT[],
    "current_index" INTEGER NOT NULL DEFAULT 0,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "rejection_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_decisions" (
    "id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" "ApprovalStatus" NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_code_key" ON "workflow_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_template_steps_template_id_step_order_key" ON "workflow_template_steps"("template_id", "step_order");

-- CreateIndex
CREATE INDEX "workflows_org_id_status_idx" ON "workflows"("org_id", "status");

-- CreateIndex
CREATE INDEX "workflows_asset_id_status_idx" ON "workflows"("asset_id", "status");

-- CreateIndex
CREATE INDEX "workflow_steps_workflow_id_status_idx" ON "workflow_steps"("workflow_id", "status");

-- AddForeignKey
ALTER TABLE "workflow_template_steps" ADD CONSTRAINT "workflow_template_steps_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "workflow_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
