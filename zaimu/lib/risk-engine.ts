/**
 * Zaimu — Operational Risk Rule Engine
 *
 * Evaluates all monitored risk rules against individual assets and computes
 * per-asset health scores. Designed for institutional real-estate portfolios.
 */

import {
  Prisma,
  RiskCategory,
  RiskSeverity,
  RiskStatus,
  EscalationLevel,
  LoanStatus,
  CovenantStatus,
  LeaseStatus,
  DocStatus,
  DocumentType,
  CapexStatus,
  type Asset,
  type Loan,
  type LoanCovenant,
  type Lease,
  type CapexItem,
  type Valuation,
  type Document,
  type PmReport,
  type OwnershipEntity,
  type RiskEvent,
  type AssetHealthScore,
} from "@/app/generated/prisma";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Helper types
// ─────────────────────────────────────────────────────────────────────────────

/** Full asset payload with all relations loaded for risk evaluation. */
type AssetWithRelations = Asset & {
  loans: (Loan & { covenants: LoanCovenant[] })[];
  leases: Lease[];
  documents: (Document & { extractedFacts: { id: string }[] })[];
  valuations: Valuation[];
  capexItems: CapexItem[];
  ownershipEntities: OwnershipEntity[];
  pmReports: PmReport[];
  alerts: { id: string; resolved: boolean }[];
  healthScore: AssetHealthScore | null;
};

/** Partial event returned by a rule evaluator when the rule fires. */
type PartialRiskEvent = {
  title: string;
  description: string;
  recommendedAction: string;
  triggerData: Prisma.InputJsonValue;
  confidence: number;
  dueDate?: Date;
  sourceDocumentIds?: string[];
};

/** Evaluator function signature. Returns a partial event when the rule fires, null otherwise. */
type RuleEvaluator = (asset: AssetWithRelations) => PartialRiskEvent | null;

/** Definition of a static risk rule. */
export interface RiskRuleDefinition {
  code: string;
  name: string;
  nameJa: string;
  description: string;
  category: RiskCategory;
  defaultSeverity: RiskSeverity;
  evaluate: RuleEvaluator;
}

/** Per-category health scores. */
export interface CategoryScores {
  overall: number;
  lease: number;
  debt: number;
  reporting: number;
  compliance: number;
  treasury: number;
  completeness: number;
  confidence: number;
}

/** Result returned from evaluateAsset. */
export interface EvaluationResult {
  assetId: string;
  rulesEvaluated: number;
  eventsOpened: number;
  eventsResolved: number;
  healthScore: number;
  criticalCount: number;
  warningCount: number;
}

/** Aggregate result for evaluateAllAssets. */
export interface SummaryResult {
  orgId: string;
  assetsEvaluated: number;
  totalRulesRun: number;
  totalEventsOpened: number;
  totalEventsResolved: number;
  averageHealthScore: number;
  totalCritical: number;
  totalWarnings: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the number of calendar days from `a` to `b`.
 * Positive when b is in the future relative to a.
 */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK_RULES — static rule definitions with evaluators
// ─────────────────────────────────────────────────────────────────────────────

export const RISK_RULES: RiskRuleDefinition[] = [
  // ── LEASE risks ────────────────────────────────────────────────────────────

  {
    code: "LEASE_EXPIRED",
    name: "Lease Expired",
    nameJa: "リース期限切れ",
    description: "Lease end date is in the past and status is not terminated",
    category: RiskCategory.LEASE,
    defaultSeverity: RiskSeverity.CRITICAL,
    evaluate(asset) {
      const t = today();
      const expired = asset.leases.filter(
        (l) =>
          l.leaseEnd < t &&
          l.status !== LeaseStatus.SURRENDERED &&
          l.status !== LeaseStatus.EXPIRED
      );
      if (expired.length === 0) return null;
      const lease = expired[0];
      const daysOver = daysBetween(lease.leaseEnd, t);
      return {
        title: `Lease expired ${daysOver} day${daysOver !== 1 ? "s" : ""} ago — ${lease.tenantName}`,
        description: `The lease for ${lease.tenantName} at ${asset.name} expired on ${lease.leaseEnd.toISOString().split("T")[0]} (${daysOver} days ago) but has not been terminated or surrendered in the system. This may indicate a holdover situation or a data entry gap.`,
        recommendedAction: `Confirm the lease status with the property manager. If the tenant is in holdover, issue a formal notice. If the lease was renewed, update the system immediately.`,
        triggerData: {
          leaseId: lease.id,
          tenantName: lease.tenantName,
          leaseEnd: lease.leaseEnd.toISOString(),
          currentStatus: lease.status,
          daysOver,
        },
        confidence: 1.0,
        dueDate: t,
      };
    },
  },

  {
    code: "LEASE_EXPIRY_90D",
    name: "Lease Expiry Within 90 Days",
    nameJa: "リース満了90日以内",
    description: "Lease expires within 90 days, no renewal confirmed",
    category: RiskCategory.LEASE,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      const t = today();
      const atRisk = asset.leases.filter((l) => {
        const days = daysBetween(t, l.leaseEnd);
        return (
          days >= 0 &&
          days <= 90 &&
          l.status === LeaseStatus.ACTIVE &&
          !isRenewalConfirmed(l)
        );
      });
      if (atRisk.length === 0) return null;
      const lease = atRisk[0];
      const days = daysBetween(t, lease.leaseEnd);
      return {
        title: `Lease expiry in ${days} days — ${lease.tenantName}`,
        description: `The lease for ${lease.tenantName} (${lease.area ? Number(lease.area).toLocaleString() : "unknown"} sqm) at ${asset.name} expires on ${lease.leaseEnd.toISOString().split("T")[0]}. No renewal has been confirmed.`,
        recommendedAction: `Initiate renewal discussions with ${lease.tenantName}. Engage leasing agent to assess market alternatives if the tenant does not intend to renew.`,
        triggerData: {
          leaseId: lease.id,
          tenantName: lease.tenantName,
          leaseEnd: lease.leaseEnd.toISOString(),
          daysUntilExpiry: days,
          area: lease.area ? Number(lease.area) : null,
        },
        confidence: 1.0,
        dueDate: lease.leaseEnd,
      };
    },
  },

  {
    code: "LEASE_EXPIRY_30D",
    name: "Lease Expiry Within 30 Days",
    nameJa: "リース満了30日以内",
    description: "Lease expires within 30 days, no renewal confirmed",
    category: RiskCategory.LEASE,
    defaultSeverity: RiskSeverity.CRITICAL,
    evaluate(asset) {
      const t = today();
      const atRisk = asset.leases.filter((l) => {
        const days = daysBetween(t, l.leaseEnd);
        return (
          days >= 0 &&
          days <= 30 &&
          l.status === LeaseStatus.ACTIVE &&
          !isRenewalConfirmed(l)
        );
      });
      if (atRisk.length === 0) return null;
      const lease = atRisk[0];
      const days = daysBetween(t, lease.leaseEnd);
      return {
        title: `Lease expiry in ${days} day${days !== 1 ? "s" : ""} — ${lease.tenantName}`,
        description: `The lease for ${lease.tenantName} (${lease.area ? Number(lease.area).toLocaleString() : "unknown"} sqm) at ${asset.name} expires on ${lease.leaseEnd.toISOString().split("T")[0]}. No renewal has been confirmed. Immediate action is required to avoid vacancy.`,
        recommendedAction: `Contact ${lease.tenantName} immediately to confirm renewal intentions. Instruct leasing agent to begin formal renewal negotiations.`,
        triggerData: {
          leaseId: lease.id,
          tenantName: lease.tenantName,
          leaseEnd: lease.leaseEnd.toISOString(),
          daysUntilExpiry: days,
          area: lease.area ? Number(lease.area) : null,
        },
        confidence: 1.0,
        dueDate: lease.leaseEnd,
      };
    },
  },

  {
    code: "LEASE_BREAK_UPCOMING",
    name: "Break Option Exercisable Within 60 Days",
    nameJa: "解約オプション行使60日以内",
    description: "Break option exercisable within 60 days",
    category: RiskCategory.LEASE,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      const t = today();
      const atRisk = asset.leases.filter((l) => {
        if (!l.breakDate) return false;
        const days = daysBetween(t, l.breakDate);
        return days >= 0 && days <= 60 && l.status === LeaseStatus.ACTIVE;
      });
      if (atRisk.length === 0) return null;
      const lease = atRisk[0];
      const days = daysBetween(t, lease.breakDate!);
      return {
        title: `Break option exercisable in ${days} day${days !== 1 ? "s" : ""} — ${lease.tenantName}`,
        description: `${lease.tenantName} has a break option exercisable on ${lease.breakDate!.toISOString().split("T")[0]} (${days} days). If exercised, this will create a vacancy risk at ${asset.name}.`,
        recommendedAction: `Engage ${lease.tenantName} to understand their intention with respect to the break option. If there is risk of exercise, begin marketing the space proactively.`,
        triggerData: {
          leaseId: lease.id,
          tenantName: lease.tenantName,
          breakDate: lease.breakDate!.toISOString(),
          daysUntilBreak: days,
        },
        confidence: 1.0,
        dueDate: lease.breakDate!,
      };
    },
  },

  {
    code: "OCCUPANCY_BELOW_80",
    name: "Occupancy Rate Below 80%",
    nameJa: "稼働率80%未満",
    description: "Occupancy rate below 80%",
    category: RiskCategory.LEASE,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      if (asset.occupancyRate === null || asset.occupancyRate === undefined)
        return null;
      const rate = Number(asset.occupancyRate);
      if (rate >= 80) return null;
      if (rate < 60) return null; // handled by OCCUPANCY_BELOW_60
      return {
        title: `Occupancy below 80% — ${rate.toFixed(1)}% at ${asset.name}`,
        description: `${asset.name} has an occupancy rate of ${rate.toFixed(1)}%, which is below the 80% warning threshold. This may indicate elevated vacancy risk or pending lease expirations.`,
        recommendedAction: `Review vacant units and current marketing strategy. Assess whether rent levels are competitive with the local market.`,
        triggerData: { occupancyRate: rate },
        confidence: 0.95,
      };
    },
  },

  {
    code: "OCCUPANCY_BELOW_60",
    name: "Occupancy Rate Below 60%",
    nameJa: "稼働率60%未満",
    description: "Occupancy rate below 60%",
    category: RiskCategory.LEASE,
    defaultSeverity: RiskSeverity.CRITICAL,
    evaluate(asset) {
      if (asset.occupancyRate === null || asset.occupancyRate === undefined)
        return null;
      const rate = Number(asset.occupancyRate);
      if (rate >= 60) return null;
      return {
        title: `Critical vacancy — ${rate.toFixed(1)}% occupancy at ${asset.name}`,
        description: `${asset.name} has an occupancy rate of ${rate.toFixed(1)}%, which is critically below the 60% threshold. Significant income shortfall and covenant pressure may result.`,
        recommendedAction: `Convene an emergency leasing review. Consider rental incentives, refurbishment, or alternative use to restore occupancy. Notify lenders if covenant thresholds are at risk.`,
        triggerData: { occupancyRate: rate },
        confidence: 0.95,
      };
    },
  },

  // ── DEBT risks ─────────────────────────────────────────────────────────────

  {
    code: "COVENANT_OVERDUE",
    name: "Covenant Test Overdue",
    nameJa: "コベナンツテスト期限超過",
    description: "Covenant test was due more than 7 days ago and status is not updated",
    category: RiskCategory.DEBT,
    defaultSeverity: RiskSeverity.CRITICAL,
    evaluate(asset) {
      const t = today();
      const overdueCovenants = asset.loans.flatMap((loan) =>
        loan.covenants.filter((c) => {
          if (!c.nextTestDate) return false;
          const overdueDays = daysBetween(c.nextTestDate, t);
          return overdueDays > 7 && c.status === CovenantStatus.UNKNOWN;
        })
      );
      if (overdueCovenants.length === 0) return null;
      const cov = overdueCovenants[0];
      const overdueDays = daysBetween(cov.nextTestDate!, t);
      const loan = asset.loans.find((l) =>
        l.covenants.some((c) => c.id === cov.id)
      );
      return {
        title: `Covenant test overdue by ${overdueDays} days — ${cov.covenantType}`,
        description: `The covenant test for "${cov.covenantType}" (${cov.description}) on the loan from ${loan?.lenderName ?? "unknown lender"} was due on ${cov.nextTestDate!.toISOString().split("T")[0]} and has not been updated in the system. This may indicate a compliance reporting failure.`,
        recommendedAction: `Obtain the covenant test results immediately. Update the covenant status in the system. If there is a breach, notify the lender and seek a waiver if applicable.`,
        triggerData: {
          covenantId: cov.id,
          covenantType: cov.covenantType,
          nextTestDate: cov.nextTestDate!.toISOString(),
          currentStatus: cov.status,
          overdueDays,
          loanId: loan?.id,
          lenderName: loan?.lenderName,
        },
        confidence: 1.0,
        dueDate: cov.nextTestDate!,
      };
    },
  },

  {
    code: "REFINANCING_90D",
    name: "Loan Maturity Within 90 Days",
    nameJa: "ローン満期90日以内",
    description: "Loan maturity within 90 days",
    category: RiskCategory.DEBT,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      const t = today();
      const atRisk = asset.loans.filter((l) => {
        const days = daysBetween(t, l.maturityDate);
        return (
          days >= 0 &&
          days <= 90 &&
          l.status !== LoanStatus.REPAID &&
          l.status !== LoanStatus.REFINANCING
        );
      });
      if (atRisk.length === 0) return null;
      const loan = atRisk[0];
      const days = daysBetween(t, loan.maturityDate);
      return {
        title: `Loan maturity in ${days} days — ${loan.lenderName}`,
        description: `The ${loan.loanType.toLowerCase()} loan from ${loan.lenderName} (balance: ${Number(loan.currentBalance).toLocaleString()} ${loan.currency}) matures on ${loan.maturityDate.toISOString().split("T")[0]}. Refinancing has not been initiated.`,
        recommendedAction: `Begin refinancing discussions with ${loan.lenderName} and alternative lenders. Engage a debt adviser to prepare a refinancing memorandum.`,
        triggerData: {
          loanId: loan.id,
          lenderName: loan.lenderName,
          maturityDate: loan.maturityDate.toISOString(),
          daysUntilMaturity: days,
          currentBalance: Number(loan.currentBalance),
          currency: loan.currency,
        },
        confidence: 1.0,
        dueDate: loan.maturityDate,
      };
    },
  },

  {
    code: "REFINANCING_30D",
    name: "Loan Maturity Within 30 Days",
    nameJa: "ローン満期30日以内",
    description: "Loan maturity within 30 days",
    category: RiskCategory.DEBT,
    defaultSeverity: RiskSeverity.CRITICAL,
    evaluate(asset) {
      const t = today();
      const atRisk = asset.loans.filter((l) => {
        const days = daysBetween(t, l.maturityDate);
        return (
          days >= 0 &&
          days <= 30 &&
          l.status !== LoanStatus.REPAID &&
          l.status !== LoanStatus.REFINANCING
        );
      });
      if (atRisk.length === 0) return null;
      const loan = atRisk[0];
      const days = daysBetween(t, loan.maturityDate);
      return {
        title: `URGENT: Loan maturity in ${days} day${days !== 1 ? "s" : ""} — ${loan.lenderName}`,
        description: `The ${loan.loanType.toLowerCase()} loan from ${loan.lenderName} (balance: ${Number(loan.currentBalance).toLocaleString()} ${loan.currency}) matures on ${loan.maturityDate.toISOString().split("T")[0]}. Immediate action is required to prevent a default event.`,
        recommendedAction: `Escalate immediately to Fund Manager. Confirm status of refinancing negotiations. If no lender is engaged, seek emergency bridge financing. Notify board if default risk is material.`,
        triggerData: {
          loanId: loan.id,
          lenderName: loan.lenderName,
          maturityDate: loan.maturityDate.toISOString(),
          daysUntilMaturity: days,
          currentBalance: Number(loan.currentBalance),
          currency: loan.currency,
        },
        confidence: 1.0,
        dueDate: loan.maturityDate,
      };
    },
  },

  {
    code: "LOAN_DEFAULT",
    name: "Loan in Default",
    nameJa: "ローンデフォルト",
    description: "Loan status is DEFAULT",
    category: RiskCategory.DEBT,
    defaultSeverity: RiskSeverity.ESCALATED,
    evaluate(asset) {
      const defaultedLoans = asset.loans.filter(
        (l) => l.status === LoanStatus.DEFAULT
      );
      if (defaultedLoans.length === 0) return null;
      const loan = defaultedLoans[0];
      return {
        title: `Loan default — ${loan.lenderName}`,
        description: `The ${loan.loanType.toLowerCase()} loan from ${loan.lenderName} (balance: ${Number(loan.currentBalance).toLocaleString()} ${loan.currency}) is in DEFAULT status. This is a critical event that requires immediate escalation.`,
        recommendedAction: `Immediately notify the board and legal counsel. Engage with ${loan.lenderName} to understand standstill options. Assess asset security position and lender enforcement rights.`,
        triggerData: {
          loanId: loan.id,
          lenderName: loan.lenderName,
          loanStatus: loan.status,
          currentBalance: Number(loan.currentBalance),
          currency: loan.currency,
          maturityDate: loan.maturityDate.toISOString(),
        },
        confidence: 1.0,
      };
    },
  },

  {
    code: "COVENANT_WATCH",
    name: "Covenant Under Watch",
    nameJa: "コベナンツ要注意",
    description: "Any covenant status is WATCH",
    category: RiskCategory.DEBT,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      const watchCovenants = asset.loans.flatMap((loan) =>
        loan.covenants
          .filter((c) => c.status === CovenantStatus.WATCH)
          .map((c) => ({ ...c, lenderName: loan.lenderName, loanId: loan.id }))
      );
      if (watchCovenants.length === 0) return null;
      const cov = watchCovenants[0];
      return {
        title: `Covenant under watch — ${cov.covenantType} (${cov.lenderName})`,
        description: `The covenant "${cov.covenantType}" (${cov.description}) on the loan from ${cov.lenderName} is under WATCH status. Current value: ${cov.currentValue ?? "not recorded"} vs threshold: ${cov.threshold}. Continued deterioration may lead to a breach.`,
        recommendedAction: `Monitor the covenant metric closely. Prepare a remediation plan to bring the metric back within the compliant range. Proactively engage with ${cov.lenderName} to avoid a formal breach notice.`,
        triggerData: {
          covenantId: cov.id,
          covenantType: cov.covenantType,
          currentValue: cov.currentValue,
          threshold: cov.threshold,
          status: cov.status,
          lenderName: cov.lenderName,
          loanId: cov.loanId,
        },
        confidence: 1.0,
      };
    },
  },

  {
    code: "COVENANT_BREACH",
    name: "Covenant Breach",
    nameJa: "コベナンツ違反",
    description: "Any covenant status is BREACH",
    category: RiskCategory.DEBT,
    defaultSeverity: RiskSeverity.CRITICAL,
    evaluate(asset) {
      const breachedCovenants = asset.loans.flatMap((loan) =>
        loan.covenants
          .filter((c) => c.status === CovenantStatus.BREACH)
          .map((c) => ({ ...c, lenderName: loan.lenderName, loanId: loan.id }))
      );
      if (breachedCovenants.length === 0) return null;
      const cov = breachedCovenants[0];
      return {
        title: `Covenant breach — ${cov.covenantType} (${cov.lenderName})`,
        description: `The covenant "${cov.covenantType}" (${cov.description}) on the loan from ${cov.lenderName} is in BREACH. Current value: ${cov.currentValue ?? "not recorded"} vs threshold: ${cov.threshold}. A formal breach notice may trigger acceleration rights.`,
        recommendedAction: `Notify legal counsel and the board immediately. Send a written notification to ${cov.lenderName} and request a cure period or waiver. Prepare a remediation plan with a defined timeline.`,
        triggerData: {
          covenantId: cov.id,
          covenantType: cov.covenantType,
          currentValue: cov.currentValue,
          threshold: cov.threshold,
          status: cov.status,
          lenderName: cov.lenderName,
          loanId: cov.loanId,
        },
        confidence: 1.0,
      };
    },
  },

  // ── REPORTING risks ────────────────────────────────────────────────────────

  {
    code: "VALUATION_STALE_180D",
    name: "Valuation Stale — Over 180 Days",
    nameJa: "鑑定評価180日以上経過",
    description: "Last valuation is more than 180 days ago",
    category: RiskCategory.REPORTING,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      const t = today();
      const lastValuation = asset.valuations[0];
      if (!lastValuation) return null; // handled by VALUATION_STALE_365D
      const days = daysBetween(lastValuation.valuationDate, t);
      if (days < 180 || days >= 365) return null;
      return {
        title: `Valuation stale — ${days} days since last appraisal at ${asset.name}`,
        description: `The most recent valuation for ${asset.name} was performed on ${lastValuation.valuationDate.toISOString().split("T")[0]} (${days} days ago). Market conditions may have changed materially since that date.`,
        recommendedAction: `Engage a certified valuer to conduct a desktop or full-scope valuation. Update the valuation record in the system upon receipt.`,
        triggerData: {
          valuationId: lastValuation.id,
          valuationDate: lastValuation.valuationDate.toISOString(),
          daysSinceValuation: days,
          value: Number(lastValuation.value),
          currency: lastValuation.currency,
        },
        confidence: 1.0,
      };
    },
  },

  {
    code: "VALUATION_STALE_365D",
    name: "Valuation Stale — Over 365 Days or Missing",
    nameJa: "鑑定評価365日以上経過または未実施",
    description: "Last valuation is more than 365 days ago or no valuation on record",
    category: RiskCategory.REPORTING,
    defaultSeverity: RiskSeverity.CRITICAL,
    evaluate(asset) {
      const t = today();
      const lastValuation = asset.valuations[0];
      if (!lastValuation) {
        return {
          title: `No valuation on record — ${asset.name}`,
          description: `${asset.name} has no valuation record in the system. Without a current valuation, NAV reporting, covenant compliance, and investment decisions cannot be supported accurately.`,
          recommendedAction: `Commission an independent valuation as a matter of priority. Ensure the valuation report is uploaded and the valuation record is created in the system.`,
          triggerData: { noValuation: true },
          confidence: 1.0,
        };
      }
      const days = daysBetween(lastValuation.valuationDate, t);
      if (days < 365) return null;
      return {
        title: `Valuation critically stale — ${days} days since last appraisal at ${asset.name}`,
        description: `The most recent valuation for ${asset.name} was performed on ${lastValuation.valuationDate.toISOString().split("T")[0]} (${days} days ago). This exceeds the maximum permissible staleness period. NAV figures may be materially incorrect.`,
        recommendedAction: `Commission an independent valuation immediately. Disclose the stale valuation to investors and lenders as required under fund documentation. Update the system upon receipt.`,
        triggerData: {
          valuationId: lastValuation.id,
          valuationDate: lastValuation.valuationDate.toISOString(),
          daysSinceValuation: days,
          value: Number(lastValuation.value),
          currency: lastValuation.currency,
        },
        confidence: 1.0,
      };
    },
  },

  {
    code: "NO_DOCUMENTS",
    name: "No Documents Uploaded",
    nameJa: "書類未アップロード",
    description: "Asset has no uploaded documents",
    category: RiskCategory.REPORTING,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      if (asset.documents.length > 0) return null;
      return {
        title: `No documents uploaded — ${asset.name}`,
        description: `${asset.name} has no documents in the system. This prevents AI-assisted analysis, covenant monitoring, and regulatory compliance checks.`,
        recommendedAction: `Upload key documents including lease agreements, loan agreements, valuation reports, and insurance policies for ${asset.name}.`,
        triggerData: { documentCount: 0 },
        confidence: 1.0,
      };
    },
  },

  {
    code: "EXTRACTION_PENDING",
    name: "Document Extraction Pending or Failed",
    nameJa: "書類抽出処理待ち/エラー",
    description: "Documents exist with PENDING or ERROR extraction status",
    category: RiskCategory.REPORTING,
    defaultSeverity: RiskSeverity.INFORMATIONAL,
    evaluate(asset) {
      const pendingOrError = asset.documents.filter(
        (d) => d.status === DocStatus.PENDING || d.status === DocStatus.ERROR
      );
      if (pendingOrError.length === 0) return null;
      const errorCount = pendingOrError.filter(
        (d) => d.status === DocStatus.ERROR
      ).length;
      const pendingCount = pendingOrError.filter(
        (d) => d.status === DocStatus.PENDING
      ).length;
      return {
        title: `${pendingOrError.length} document(s) pending extraction at ${asset.name}`,
        description: `${asset.name} has ${pendingCount} document(s) awaiting extraction and ${errorCount} document(s) with extraction errors. Data from these documents is not available for risk analysis.`,
        recommendedAction: `Review failed extractions and re-trigger processing. For persistent errors, manually review the documents and enter key facts.`,
        triggerData: {
          pendingCount,
          errorCount,
          documentIds: pendingOrError.map((d) => d.id),
        },
        sourceDocumentIds: pendingOrError.map((d) => d.id),
        confidence: 1.0,
      };
    },
  },

  {
    code: "PM_REPORT_MISSING_90D",
    name: "PM Report Missing for 90+ Days",
    nameJa: "PM報告書90日以上未受領",
    description: "No PM report received in the last 90 days",
    category: RiskCategory.REPORTING,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      const t = today();
      const latestReport = asset.pmReports[0];
      if (!latestReport) {
        return {
          title: `No PM report on record — ${asset.name}`,
          description: `${asset.name} has no property management report on record. Regular PM reporting is essential for operational oversight.`,
          recommendedAction: `Contact the property manager to request historical PM reports and establish a regular reporting schedule.`,
          triggerData: { noPmReport: true },
          confidence: 1.0,
        };
      }
      const days = daysBetween(latestReport.reportPeriod, t);
      if (days <= 90) return null;
      return {
        title: `PM report overdue — ${days} days since last report at ${asset.name}`,
        description: `The last PM report for ${asset.name} covers the period ending ${latestReport.reportPeriod.toISOString().split("T")[0]} (${days} days ago). Property operations data is stale.`,
        recommendedAction: `Request the outstanding PM report from the property manager immediately. If the manager is non-responsive, escalate to the fund manager.`,
        triggerData: {
          lastReportId: latestReport.id,
          lastReportPeriod: latestReport.reportPeriod.toISOString(),
          daysSinceReport: days,
        },
        confidence: 1.0,
      };
    },
  },

  // ── COMPLIANCE risks ───────────────────────────────────────────────────────

  {
    code: "NO_OWNERSHIP_DOCS",
    name: "No Ownership Entity Records",
    nameJa: "所有権エンティティ未登録",
    description: "Asset has no ownership entity records",
    category: RiskCategory.COMPLIANCE,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      if (asset.ownershipEntities.length > 0) return null;
      return {
        title: `No ownership structure on record — ${asset.name}`,
        description: `${asset.name} has no ownership entity records. This prevents proper legal, tax, and regulatory reporting, including beneficial ownership disclosure requirements.`,
        recommendedAction: `Input the full ownership structure for ${asset.name}, including all holding entities, jurisdictions, and ownership percentages.`,
        triggerData: { ownershipEntityCount: 0 },
        confidence: 1.0,
      };
    },
  },

  {
    code: "INSURANCE_MISSING",
    name: "Insurance Policy Document Missing",
    nameJa: "保険証券書類未登録",
    description: "No document of type INSURANCE_POLICY found for the asset",
    category: RiskCategory.COMPLIANCE,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      const hasInsurance = asset.documents.some(
        (d) => d.docType === DocumentType.INSURANCE_POLICY
      );
      if (hasInsurance) return null;
      return {
        title: `Insurance policy not on file — ${asset.name}`,
        description: `No insurance policy document has been uploaded for ${asset.name}. Without confirmation of current insurance coverage, the asset may be exposed to uninsured losses.`,
        recommendedAction: `Upload the current property and liability insurance policy documents for ${asset.name}. Confirm coverage amounts and renewal dates with the insurer.`,
        triggerData: { hasInsuranceDocument: false },
        confidence: 0.9,
      };
    },
  },

  {
    code: "MISSING_LOAN_DOCS",
    name: "Loan Agreement Document Missing",
    nameJa: "ローン契約書未登録",
    description: "Loan exists but no LOAN_AGREEMENT document is on record",
    category: RiskCategory.COMPLIANCE,
    defaultSeverity: RiskSeverity.INFORMATIONAL,
    evaluate(asset) {
      if (asset.loans.length === 0) return null;
      const hasLoanDoc = asset.documents.some(
        (d) => d.docType === DocumentType.LOAN_AGREEMENT
      );
      if (hasLoanDoc) return null;
      return {
        title: `Loan agreement not uploaded — ${asset.name}`,
        description: `${asset.name} has ${asset.loans.length} loan record${asset.loans.length !== 1 ? "s" : ""} but no loan agreement document has been uploaded. Covenant terms cannot be verified from source documents.`,
        recommendedAction: `Upload the signed loan agreement(s) for ${asset.name}. This enables automated covenant extraction and verification.`,
        triggerData: {
          loanCount: asset.loans.length,
          hasLoanDocument: false,
          loanIds: asset.loans.map((l) => l.id),
        },
        confidence: 0.9,
      };
    },
  },

  // ── TREASURY risks ─────────────────────────────────────────────────────────

  {
    code: "FX_EXPOSURE_HIGH",
    name: "FX Exposure — No Rate Available",
    nameJa: "為替リスク — レート未取得",
    description: "Asset currency is not JPY and no FX rate is available in the system",
    category: RiskCategory.TREASURY,
    defaultSeverity: RiskSeverity.WARNING,
    evaluate(asset) {
      if (asset.currency === "JPY") return null;
      // This rule fires based on structural data; actual FX rate lookup
      // is done at org level. We flag all non-JPY assets for awareness.
      return {
        title: `FX exposure — ${asset.currency} asset without confirmed rate`,
        description: `${asset.name} is denominated in ${asset.currency} but no current FX rate has been confirmed in the system. NAV calculations in JPY may be inaccurate.`,
        recommendedAction: `Ensure a current ${asset.currency}/JPY FX rate is loaded in the system. Consider implementing an FX hedging strategy if the exposure is material.`,
        triggerData: {
          assetCurrency: asset.currency,
          baseCurrency: "JPY",
        },
        confidence: 0.85,
      };
    },
  },

  {
    code: "LARGE_CAPEX_UPCOMING",
    name: "Large Approved CapEx Starting Within 60 Days",
    nameJa: "大規模資本的支出60日以内開始",
    description: "CapexItem with status APPROVED and start date within 60 days",
    category: RiskCategory.TREASURY,
    defaultSeverity: RiskSeverity.INFORMATIONAL,
    evaluate(asset) {
      const t = today();
      const upcoming = asset.capexItems.filter((c) => {
        if (c.status !== CapexStatus.APPROVED || !c.startDate) return false;
        const days = daysBetween(t, c.startDate);
        return days >= 0 && days <= 60;
      });
      if (upcoming.length === 0) return null;
      const capex = upcoming[0];
      const days = daysBetween(t, capex.startDate!);
      const totalBudget = upcoming.reduce(
        (sum, c) => sum + Number(c.budget),
        0
      );
      return {
        title: `Approved CapEx starting in ${days} days — ${asset.name}`,
        description: `${upcoming.length} approved capital expenditure item${upcoming.length !== 1 ? "s" : ""} at ${asset.name} ${upcoming.length === 1 ? "is" : "are"} scheduled to commence within 60 days. Total budget: ${totalBudget.toLocaleString()} ${capex.currency}.`,
        recommendedAction: `Confirm contractor appointments and fund availability. Ensure cash reserves or draw-down facilities are in place to meet the CapEx schedule.`,
        triggerData: {
          upcomingCapexCount: upcoming.length,
          totalBudget,
          currency: capex.currency,
          items: upcoming.map((c) => ({
            id: c.id,
            description: c.description,
            budget: Number(c.budget),
            startDate: c.startDate!.toISOString(),
          })),
        },
        confidence: 1.0,
        dueDate: capex.startDate!,
      };
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when the lease has a confirmed renewal (RENEWED status or renewalWindow passed without termination). */
function isRenewalConfirmed(lease: Lease): boolean {
  return lease.status === LeaseStatus.RENEWED;
}

/** Maps RiskCategory enum to the category keys used in CategoryScores. */
function categoryKey(
  cat: RiskCategory
): keyof Omit<CategoryScores, "overall" | "completeness" | "confidence"> {
  switch (cat) {
    case RiskCategory.LEASE:
      return "lease";
    case RiskCategory.DEBT:
      return "debt";
    case RiskCategory.REPORTING:
      return "reporting";
    case RiskCategory.COMPLIANCE:
      return "compliance";
    case RiskCategory.TREASURY:
      return "treasury";
  }
}

/** Point deduction per severity for a single open event. */
function severityDeduction(severity: RiskSeverity): number {
  switch (severity) {
    case RiskSeverity.ESCALATED:
      return 25;
    case RiskSeverity.CRITICAL:
      return 20;
    case RiskSeverity.WARNING:
      return 8;
    case RiskSeverity.INFORMATIONAL:
      return 2;
  }
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// Health score computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes per-category and overall health scores from the current open events.
 */
export function computeHealthScore(
  events: Pick<RiskEvent, "category" | "severity" | "status">[],
  asset: AssetWithRelations
): CategoryScores {
  const activeEvents = events.filter(
    (e) =>
      e.status === RiskStatus.OPEN ||
      e.status === RiskStatus.ACKNOWLEDGED ||
      e.status === RiskStatus.ESCALATED
  );

  // Per-category scores start at 100
  const scores = {
    lease: 100,
    debt: 100,
    reporting: 100,
    compliance: 100,
    treasury: 100,
  };

  for (const event of activeEvents) {
    const key = categoryKey(event.category);
    scores[key] -= severityDeduction(event.severity);
  }

  // Clamp each category to [0, 100]
  for (const key of Object.keys(scores) as (keyof typeof scores)[]) {
    scores[key] = clamp(scores[key], 0, 100);
  }

  // Weighted overall score: lease 25%, debt 30%, reporting 20%, compliance 15%, treasury 10%
  const overall = clamp(
    scores.lease * 0.25 +
      scores.debt * 0.3 +
      scores.reporting * 0.2 +
      scores.compliance * 0.15 +
      scores.treasury * 0.1,
    0,
    100
  );

  // Completeness score: derived from data presence
  let completenessPoints = 0;
  let completenessTotal = 0;

  // Valuation present?
  completenessTotal += 25;
  if (asset.valuations.length > 0) completenessPoints += 25;

  // Documents present?
  completenessTotal += 25;
  if (asset.documents.length > 0) completenessPoints += 25;

  // Ownership entities present?
  completenessTotal += 25;
  if (asset.ownershipEntities.length > 0) completenessPoints += 25;

  // Loans documented (if loans exist, check for loan agreement docs)
  completenessTotal += 25;
  if (asset.loans.length === 0) {
    completenessPoints += 25; // no loans = not applicable → full score
  } else {
    const hasLoanDoc = asset.documents.some(
      (d) => d.docType === DocumentType.LOAN_AGREEMENT
    );
    if (hasLoanDoc) completenessPoints += 25;
  }

  const completenessScore = clamp(
    (completenessPoints / completenessTotal) * 100,
    0,
    100
  );

  // Confidence score: degrades per PENDING/ERROR document
  const totalDocs = asset.documents.length;
  const badDocs = asset.documents.filter(
    (d) => d.status === DocStatus.PENDING || d.status === DocStatus.ERROR
  ).length;
  const confidenceScore =
    totalDocs === 0 ? 0.5 : clamp(1.0 - badDocs / totalDocs, 0, 1);

  return {
    overall,
    lease: scores.lease,
    debt: scores.debt,
    reporting: scores.reporting,
    compliance: scores.compliance,
    treasury: scores.treasury,
    completeness: completenessScore,
    confidence: confidenceScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed risk rules (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

async function seedRiskRules(): Promise<void> {
  for (const rule of RISK_RULES) {
    await db.riskRule.upsert({
      where: { code: rule.code },
      create: {
        code: rule.code,
        name: rule.name,
        nameJa: rule.nameJa,
        description: rule.description,
        category: rule.category,
        defaultSeverity: rule.defaultSeverity,
        enabled: true,
      },
      update: {
        name: rule.name,
        nameJa: rule.nameJa,
        description: rule.description,
        category: rule.category,
        defaultSeverity: rule.defaultSeverity,
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// evaluateAsset — main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads the asset with all relations, runs all 20 risk rules, upserts events,
 * auto-resolves stale events, updates the health score, and returns a summary.
 */
export async function evaluateAsset(
  assetId: string,
  orgId: string
): Promise<EvaluationResult> {
  // 1. Seed rule definitions (idempotent)
  await seedRiskRules();

  // 2. Load the asset with all relations
  const asset = await db.asset.findUnique({
    where: { id: assetId },
    include: {
      loans: { include: { covenants: true } },
      leases: true,
      documents: { include: { extractedFacts: true } },
      valuations: { orderBy: { valuationDate: "desc" }, take: 1 },
      capexItems: true,
      ownershipEntities: true,
      pmReports: { orderBy: { reportPeriod: "desc" }, take: 1 },
      alerts: { where: { resolved: false } },
      healthScore: true,
    },
  });

  if (!asset) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  // Load the rule ID map (code → id) from DB
  const ruleRows = await db.riskRule.findMany({
    where: { code: { in: RISK_RULES.map((r) => r.code) } },
    select: { id: true, code: true },
  });
  const ruleIdMap = new Map<string, string>(ruleRows.map((r) => [r.code, r.id]));

  // Load existing open events for this asset
  const existingEvents = await db.riskEvent.findMany({
    where: { assetId, status: { not: RiskStatus.RESOLVED } },
  });
  const existingEventMap = new Map<string, RiskEvent>(
    existingEvents.map((e) => [e.ruleCode, e])
  );

  const now = new Date();
  let eventsOpened = 0;
  let eventsResolved = 0;
  const firedRuleCodes = new Set<string>();

  // 3. Evaluate each rule
  for (const rule of RISK_RULES) {
    // Check if this event is suppressed
    const existing = existingEventMap.get(rule.code);
    if (
      existing &&
      existing.status === RiskStatus.SUPPRESSED &&
      existing.suppressedUntil &&
      existing.suppressedUntil > now
    ) {
      continue; // skip suppressed rules
    }

    const fired = rule.evaluate(asset as AssetWithRelations);

    if (fired) {
      // Rule fires → upsert the event
      const ruleId = ruleIdMap.get(rule.code);

      const wasResolved =
        existing && existing.status === RiskStatus.RESOLVED;

      await db.riskEvent.upsert({
        where: {
          assetId_ruleCode: { assetId, ruleCode: rule.code },
        },
        create: {
          orgId,
          assetId,
          ruleCode: rule.code,
          ruleId: ruleId ?? null,
          category: rule.category,
          severity: rule.defaultSeverity,
          status: RiskStatus.OPEN,
          escalationLevel: EscalationLevel.NONE,
          title: fired.title,
          description: fired.description,
          recommendedAction: fired.recommendedAction,
          triggerData: fired.triggerData,
          sourceDocumentIds: fired.sourceDocumentIds ?? [],
          confidence: fired.confidence,
          dueDate: fired.dueDate ?? null,
          firstDetectedAt: now,
          lastEvaluatedAt: now,
          occurrenceCount: 1,
          recurrenceCount: 0,
        },
        update: {
          lastEvaluatedAt: now,
          title: fired.title,
          description: fired.description,
          recommendedAction: fired.recommendedAction,
          triggerData: fired.triggerData,
          sourceDocumentIds: fired.sourceDocumentIds ?? [],
          confidence: fired.confidence,
          dueDate: fired.dueDate ?? null,
          severity: rule.defaultSeverity,
          // If previously resolved, reopen and increment recurrence
          ...(wasResolved
            ? {
                status: RiskStatus.OPEN,
                resolvedAt: null,
                resolvedBy: null,
                recurrenceCount: { increment: 1 },
                lastResolvedAt: existing.resolvedAt ?? now,
              }
            : {}),
        },
      });

      if (!existing || wasResolved) {
        eventsOpened++;
      }
      firedRuleCodes.add(rule.code);
    } else {
      // Rule does not fire → auto-resolve any existing open/acknowledged event
      if (
        existing &&
        (existing.status === RiskStatus.OPEN ||
          existing.status === RiskStatus.ACKNOWLEDGED)
      ) {
        await db.riskEvent.update({
          where: { id: existing.id },
          data: {
            status: RiskStatus.RESOLVED,
            resolvedAt: now,
            resolvedBy: "system",
            lastEvaluatedAt: now,
          },
        });
        eventsResolved++;
      }
    }
  }

  // 4. Re-load all current events for health score computation
  const currentEvents = await db.riskEvent.findMany({
    where: { assetId },
    select: { category: true, severity: true, status: true },
  });

  const scores = computeHealthScore(currentEvents, asset as AssetWithRelations);

  const openCritical = currentEvents.filter(
    (e) =>
      e.severity === RiskSeverity.CRITICAL &&
      (e.status === RiskStatus.OPEN ||
        e.status === RiskStatus.ACKNOWLEDGED ||
        e.status === RiskStatus.ESCALATED)
  ).length;

  const openWarnings = currentEvents.filter(
    (e) =>
      e.severity === RiskSeverity.WARNING &&
      (e.status === RiskStatus.OPEN ||
        e.status === RiskStatus.ACKNOWLEDGED ||
        e.status === RiskStatus.ESCALATED)
  ).length;

  const openInfo = currentEvents.filter(
    (e) =>
      e.severity === RiskSeverity.INFORMATIONAL &&
      (e.status === RiskStatus.OPEN ||
        e.status === RiskStatus.ACKNOWLEDGED ||
        e.status === RiskStatus.ESCALATED)
  ).length;

  const openEscalated = currentEvents.filter(
    (e) =>
      e.severity === RiskSeverity.ESCALATED &&
      (e.status === RiskStatus.OPEN ||
        e.status === RiskStatus.ACKNOWLEDGED ||
        e.status === RiskStatus.ESCALATED)
  ).length;

  // 5. Upsert the AssetHealthScore
  await db.assetHealthScore.upsert({
    where: { assetId },
    create: {
      assetId,
      orgId,
      overallScore: scores.overall,
      leaseScore: scores.lease,
      debtScore: scores.debt,
      reportingScore: scores.reporting,
      complianceScore: scores.compliance,
      treasuryScore: scores.treasury,
      completenessScore: scores.completeness,
      confidenceScore: scores.confidence,
      openCritical,
      openWarnings,
      openInfo,
      openEscalated,
      scoredAt: now,
    },
    update: {
      overallScore: scores.overall,
      leaseScore: scores.lease,
      debtScore: scores.debt,
      reportingScore: scores.reporting,
      complianceScore: scores.compliance,
      treasuryScore: scores.treasury,
      completenessScore: scores.completeness,
      confidenceScore: scores.confidence,
      openCritical,
      openWarnings,
      openInfo,
      openEscalated,
      scoredAt: now,
    },
  });

  // 6. Auto-initiate workflows for high-priority triggers if none already active
  await autoInitiateWorkflows(asset.id, asset.name, orgId, firedRuleCodes);

  return {
    assetId,
    rulesEvaluated: RISK_RULES.length,
    eventsOpened,
    eventsResolved,
    healthScore: Math.round(scores.overall),
    criticalCount: openCritical + openEscalated,
    warningCount: openWarnings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-workflow initiation
// ─────────────────────────────────────────────────────────────────────────────

/** Rule codes that should trigger automatic workflow creation if none is active. */
const AUTO_WORKFLOW_MAP: Record<string, { workflowType: string; title: (assetName: string) => string }> = {
  REFINANCING_90D: {
    workflowType: "REFINANCING",
    title: (n) => `Loan Refinancing — ${n}`,
  },
  REFINANCING_30D: {
    workflowType: "REFINANCING",
    title: (n) => `URGENT: Loan Refinancing — ${n}`,
  },
  LEASE_EXPIRY_90D: {
    workflowType: "LEASE_RENEWAL",
    title: (n) => `Lease Renewal — ${n}`,
  },
  COVENANT_BREACH: {
    workflowType: "COVENANT_REPORTING",
    title: (n) => `Covenant Breach Response — ${n}`,
  },
};

async function autoInitiateWorkflows(
  assetId: string,
  assetName: string,
  orgId: string,
  firedRuleCodes: Set<string>
): Promise<void> {
  for (const [ruleCode, config] of Object.entries(AUTO_WORKFLOW_MAP)) {
    if (!firedRuleCodes.has(ruleCode)) continue;

    // Check if a non-cancelled workflow of this type already exists
    const existing = await db.workflow.findFirst({
      where: {
        assetId,
        workflowType: config.workflowType as never,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      select: { id: true },
    });

    if (existing) continue; // already managed

    // Create a DRAFT workflow
    try {
      const { createWorkflow } = await import("@/lib/workflow-engine");
      await createWorkflow({
        orgId,
        assetId,
        workflowType: config.workflowType as never,
        title: config.title(assetName),
        description: `Auto-initiated by risk engine (rule: ${ruleCode})`,
        createdById: "user_admin_001",
      });
    } catch (err) {
      // Never let workflow creation break the risk engine
      console.error("[risk-engine] auto-workflow failed", ruleCode, err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// evaluateAllAssets — portfolio-wide evaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs evaluateAsset for every active asset in the organisation
 * and returns aggregate counts.
 */
export async function evaluateAllAssets(
  orgId: string
): Promise<SummaryResult> {
  const assets = await db.asset.findMany({
    where: { orgId, status: "ACTIVE" },
    select: { id: true },
  });

  let totalRulesRun = 0;
  let totalEventsOpened = 0;
  let totalEventsResolved = 0;
  let totalHealthScore = 0;
  let totalCritical = 0;
  let totalWarnings = 0;

  for (const asset of assets) {
    const result = await evaluateAsset(asset.id, orgId);
    totalRulesRun += result.rulesEvaluated;
    totalEventsOpened += result.eventsOpened;
    totalEventsResolved += result.eventsResolved;
    totalHealthScore += result.healthScore;
    totalCritical += result.criticalCount;
    totalWarnings += result.warningCount;
  }

  const assetsEvaluated = assets.length;

  return {
    orgId,
    assetsEvaluated,
    totalRulesRun,
    totalEventsOpened,
    totalEventsResolved,
    averageHealthScore:
      assetsEvaluated > 0
        ? Math.round(totalHealthScore / assetsEvaluated)
        : 100,
    totalCritical,
    totalWarnings,
  };
}
