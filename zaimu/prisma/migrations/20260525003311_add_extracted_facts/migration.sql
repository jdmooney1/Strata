-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('CORPORATE', 'FAMILY_OFFICE', 'FUND', 'REIT', 'ASSET_MANAGER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PORTFOLIO_MANAGER', 'ANALYST', 'BOARD_MEMBER', 'EXTERNAL_ADVISER', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('OFFICE', 'RESIDENTIAL', 'RETAIL', 'LOGISTICS', 'HOTEL', 'MIXED_USE', 'INDUSTRIAL', 'INFRASTRUCTURE', 'LAND', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'UNDER_DD', 'UNDER_CONSTRUCTION', 'REFINANCING', 'DISPOSAL', 'DISPOSED');

-- CreateEnum
CREATE TYPE "CovenantStatus" AS ENUM ('COMPLIANT', 'WATCH', 'BREACH', 'WAIVED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('SENIOR', 'MEZZANINE', 'PREFERRED_EQUITY', 'BRIDGE', 'CONSTRUCTION', 'TERM', 'REVOLVING');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FIXED', 'FLOATING', 'HYBRID');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('CURRENT', 'WATCH', 'DEFAULT', 'REFINANCING', 'REPAID');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING', 'NOTICE_GIVEN', 'RENEWED', 'SURRENDERED');

-- CreateEnum
CREATE TYPE "CapexStatus" AS ENUM ('PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "PmReportStatus" AS ENUM ('PENDING', 'RECEIVED', 'REVIEWED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "CashFlowType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LOAN_AGREEMENT', 'LEASE_AGREEMENT', 'VALUATION_REPORT', 'PM_REPORT', 'INSURANCE_POLICY', 'TAX_DOCUMENT', 'CORPORATE_DOCUMENT', 'BOARD_RESOLUTION', 'CAPEX_QUOTE', 'INVOICE', 'FINANCIAL_STATEMENT', 'LENDER_STATEMENT', 'RENT_ROLL', 'LEGAL_OPINION', 'ENVIRONMENTAL_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'PROCESSING', 'EXTRACTED', 'REVIEWED', 'ARCHIVED', 'ERROR');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETE', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "FactCategory" AS ENUM ('DATE', 'PARTY', 'AMOUNT', 'LEASE_TERM', 'LOAN_TERM', 'COVENANT', 'OBLIGATION', 'EXPIRY', 'MISSING_INFO', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('MONTHLY_BOARD', 'QUARTERLY_REVIEW', 'ANNUAL_SUMMARY', 'REFINANCING_MEMO', 'RISK_SUMMARY', 'INVESTMENT_UPDATE', 'CASH_FLOW_FORECAST', 'COVENANT_REPORT', 'FX_EXPOSURE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('REPORTING', 'COMPLIANCE', 'COVENANT', 'REFINANCING', 'LEASE_MANAGEMENT', 'CAPEX', 'LEGAL', 'LENDER_COMMUNICATION', 'PM_REVIEW', 'FX_MANAGEMENT', 'BOARD_PREPARATION', 'DOCUMENT_COLLECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('COVENANT_BREACH', 'COVENANT_WATCH', 'LOAN_MATURITY', 'LEASE_EXPIRY', 'LEASE_BREAK', 'RENEWAL_WINDOW', 'REPORT_OVERDUE', 'CAPEX_OVERRUN', 'FX_THRESHOLD', 'OCCUPANCY_DROP', 'DOCUMENT_EXPIRY', 'OBLIGATION_DUE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('BOARD_DECISION', 'INVESTMENT_RATIONALE', 'COVENANT_DISCUSSION', 'REFINANCING_DECISION', 'OPERATIONAL_INCIDENT', 'LENDER_DISCUSSION', 'ASSUMPTION_CHANGE', 'RISK_ASSESSMENT', 'TENANT_DISCUSSION', 'LEGAL_ADVICE', 'TAX_POSITION', 'OTHER');

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "type" "OrgType" NOT NULL DEFAULT 'CORPORATE',
    "country" TEXT NOT NULL DEFAULT 'JP',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
    "language" TEXT NOT NULL DEFAULT 'ja',
    "avatar_url" TEXT,
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "description" TEXT,
    "target_aum" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "portfolio_id" TEXT,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "assetType" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "total_area" DECIMAL(12,2),
    "area_unit" TEXT DEFAULT 'sqm',
    "acquisition_date" TIMESTAMP(3),
    "acquisition_cost" DECIMAL(18,2),
    "acquisition_fx" DECIMAL(12,6),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "current_valuation" DECIMAL(18,2),
    "last_valuation_date" TIMESTAMP(3),
    "occupancy_rate" DECIMAL(5,2),
    "operational_score" INTEGER,
    "reporting_score" INTEGER,
    "covenant_status" "CovenantStatus" NOT NULL DEFAULT 'COMPLIANT',
    "refinancing_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ownership_entities" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_name_ja" TEXT,
    "entityType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "ownership_pct" DECIMAL(5,2) NOT NULL,
    "parent_entity" TEXT,
    "tax_id" TEXT,
    "incorporated_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ownership_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "lender_name" TEXT NOT NULL,
    "loan_type" "LoanType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "original_balance" DECIMAL(18,2) NOT NULL,
    "current_balance" DECIMAL(18,2) NOT NULL,
    "interest_rate" DECIMAL(6,4) NOT NULL,
    "rate_type" "RateType" NOT NULL,
    "margin" DECIMAL(6,4),
    "benchmark" TEXT,
    "origination_date" TIMESTAMP(3) NOT NULL,
    "maturity_date" TIMESTAMP(3) NOT NULL,
    "ltv" DECIMAL(5,2),
    "dscr" DECIMAL(6,4),
    "status" "LoanStatus" NOT NULL DEFAULT 'CURRENT',

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_covenants" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "covenant_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "threshold" TEXT NOT NULL,
    "current_value" TEXT,
    "status" "CovenantStatus" NOT NULL DEFAULT 'UNKNOWN',
    "test_freq" TEXT NOT NULL,
    "next_test_date" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "loan_covenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amortisation_schedules" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "principal" DECIMAL(18,2) NOT NULL,
    "interest" DECIMAL(18,2) NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "amortisation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "tenant_name" TEXT NOT NULL,
    "tenant_name_ja" TEXT,
    "floor" TEXT,
    "suite" TEXT,
    "area" DECIMAL(10,2),
    "area_unit" TEXT DEFAULT 'sqm',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "base_rent" DECIMAL(18,2) NOT NULL,
    "rent_frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "lease_start" TIMESTAMP(3) NOT NULL,
    "lease_end" TIMESTAMP(3) NOT NULL,
    "break_date" TIMESTAMP(3),
    "renewal_window" TIMESTAMP(3),
    "renewal_options" TEXT,
    "status" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "security_deposit" DECIMAL(18,2),
    "notes" TEXT,
    "document_id" TEXT,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capex_items" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "description_ja" TEXT,
    "budget" DECIMAL(18,2) NOT NULL,
    "spent" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "CapexStatus" NOT NULL DEFAULT 'PLANNED',
    "contractor" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "capex_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuations" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "valuation_date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL,
    "valuer" TEXT NOT NULL,
    "cap_rate" DECIMAL(6,4),
    "noi" DECIMAL(18,2),
    "document_id" TEXT,
    "notes" TEXT,

    CONSTRAINT "valuations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_reports" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "report_period" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "goi" DECIMAL(18,2),
    "noi" DECIMAL(18,2),
    "opex" DECIMAL(18,2),
    "occupancy" DECIMAL(5,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "pm_commentary" TEXT,
    "ai_summary" TEXT,
    "ai_risk_flags" JSONB,
    "document_id" TEXT,
    "status" "PmReportStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "pm_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flows" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "flow_type" "CashFlowType" NOT NULL,
    "actual" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "cash_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "quote_currency" TEXT NOT NULL,
    "rate" DECIMAL(16,8) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "rate_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "name" TEXT NOT NULL,
    "name_ja" TEXT,
    "doc_type" "DocumentType" NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "file_url" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "extracted_data" JSONB,
    "ai_summary" TEXT,
    "ai_summary_ja" TEXT,
    "ai_flags" JSONB,
    "tags" TEXT[],
    "expires_at" TIMESTAMP(3),
    "effective_date" TIMESTAMP(3),
    "parties" TEXT[],
    "notes" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_obligations" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "description_ja" TEXT,
    "due_date" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ObligationStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,

    CONSTRAINT "document_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_facts" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "category" "FactCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_ja" TEXT,
    "confidence" DOUBLE PRECISION,
    "source_text" TEXT,
    "page_ref" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_ja" TEXT,
    "report_type" "ReportType" NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "language" TEXT NOT NULL DEFAULT 'ja',
    "content" JSONB,
    "generated_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "pdf_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_assets" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "commentary" TEXT,
    "commentary_ja" TEXT,

    CONSTRAINT "report_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_approvals" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3),
    "comments" TEXT,

    CONSTRAINT "report_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "title" TEXT NOT NULL,
    "title_ja" TEXT,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "creator_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "tags" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT,
    "alert_type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "title_ja" TEXT,
    "message" TEXT NOT NULL,
    "message_ja" TEXT,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutional_memories" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "user_id" TEXT NOT NULL,
    "memory_type" "MemoryType" NOT NULL,
    "title" TEXT NOT NULL,
    "title_ja" TEXT,
    "content" TEXT NOT NULL,
    "content_ja" TEXT,
    "tags" TEXT[],
    "importance" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "period" TIMESTAMP(3),
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutional_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_org_id_base_currency_quote_currency_rate_date_key" ON "fx_rates"("org_id", "base_currency", "quote_currency", "rate_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_entities" ADD CONSTRAINT "ownership_entities_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_covenants" ADD CONSTRAINT "loan_covenants_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amortisation_schedules" ADD CONSTRAINT "amortisation_schedules_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capex_items" ADD CONSTRAINT "capex_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_reports" ADD CONSTRAINT "pm_reports_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_obligations" ADD CONSTRAINT "document_obligations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_facts" ADD CONSTRAINT "extracted_facts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_facts" ADD CONSTRAINT "extracted_facts_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_assets" ADD CONSTRAINT "report_assets_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_assets" ADD CONSTRAINT "report_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_approvals" ADD CONSTRAINT "report_approvals_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_approvals" ADD CONSTRAINT "report_approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_memories" ADD CONSTRAINT "institutional_memories_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_memories" ADD CONSTRAINT "institutional_memories_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_memories" ADD CONSTRAINT "institutional_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
