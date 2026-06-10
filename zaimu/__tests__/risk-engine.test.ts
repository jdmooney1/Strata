import { describe, it, expect } from "vitest";
import { computeHealthScore, RISK_RULES } from "@/lib/risk-engine";
import type { RiskEvent, Asset, Loan, LoanCovenant, Lease } from "@/app/generated/prisma";

// ─── Minimal mock helpers ─────────────────────────────────────────────────────

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeEvent(
  category: RiskEvent["category"],
  severity: RiskEvent["severity"],
  status: RiskEvent["status"] = "OPEN"
): Pick<RiskEvent, "category" | "severity" | "status"> {
  return { category, severity, status };
}

// Minimal asset shape needed by computeHealthScore completeness section
const blankAsset = {
  valuations: [],
  documents: [],
  loans: [],
  leases: [],
  pmReports: [],
  ownershipEntities: [],
} as never;

// ─── computeHealthScore ───────────────────────────────────────────────────────

describe("computeHealthScore", () => {
  it("returns 100 across all categories when there are no active events", () => {
    const scores = computeHealthScore([], blankAsset);
    expect(scores.lease).toBe(100);
    expect(scores.debt).toBe(100);
    expect(scores.reporting).toBe(100);
    expect(scores.compliance).toBe(100);
    expect(scores.treasury).toBe(100);
  });

  it("reduces lease score by 20 for a CRITICAL lease event", () => {
    const events = [makeEvent("LEASE", "CRITICAL")];
    const scores = computeHealthScore(events, blankAsset);
    expect(scores.lease).toBe(80); // 100 - 20
  });

  it("reduces debt score by 8 for a WARNING debt event", () => {
    const events = [makeEvent("DEBT", "WARNING")];
    const scores = computeHealthScore(events, blankAsset);
    expect(scores.debt).toBe(92); // 100 - 8
  });

  it("clamps scores to 0 on multiple critical events", () => {
    const events = [
      makeEvent("LEASE", "CRITICAL"),
      makeEvent("LEASE", "CRITICAL"),
      makeEvent("LEASE", "CRITICAL"),
    ];
    const scores = computeHealthScore(events, blankAsset);
    expect(scores.lease).toBeGreaterThanOrEqual(0);
    expect(scores.lease).toBeLessThanOrEqual(100);
  });

  it("ignores RESOLVED events when calculating scores", () => {
    const events = [makeEvent("LEASE", "CRITICAL", "RESOLVED")];
    const scores = computeHealthScore(events, blankAsset);
    expect(scores.lease).toBe(100); // resolved events don't affect score
  });

  it("computes overall score as weighted average", () => {
    // One CRITICAL lease event: lease = 100 - 20 = 80, everything else 100
    // overall = 80*0.25 + 100*0.30 + 100*0.20 + 100*0.15 + 100*0.10 = 95
    const events = [makeEvent("LEASE", "CRITICAL")];
    const scores = computeHealthScore(events, blankAsset);
    expect(scores.overall).toBeCloseTo(95, 0);
  });
});

// ─── RISK_RULES evaluators ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeAsset(overrides: Record<string, any> = {}): never {
  return {
    leases: [],
    loans: [],
    valuations: [],
    documents: [],
    capexItems: [],
    ownershipEntities: [],
    pmReports: [],
    alerts: [],
    healthScore: null,
    ...overrides,
  } as never;
}

describe("RISK_RULES evaluators", () => {
  const leaseExpiry90Rule = RISK_RULES.find((r) => r.code === "LEASE_EXPIRY_90D")!;
  const leaseExpiry30Rule = RISK_RULES.find((r) => r.code === "LEASE_EXPIRY_30D")!;
  const refinancing90Rule = RISK_RULES.find((r) => r.code === "REFINANCING_90D")!;
  const covenantBreachRule = RISK_RULES.find((r) => r.code === "COVENANT_BREACH")!;
  const valuationStaleRule = RISK_RULES.find((r) => r.code === "VALUATION_STALE_180D")!;

  it("LEASE_EXPIRY_90D fires when an active lease expires within 90 days", () => {
    const asset = makeAsset({
      leases: [{
        status: "ACTIVE",
        leaseEnd: daysFromNow(45),
        tenantName: "Test Tenant",
        area: 1000,
        baseRent: 100000,
        currency: "USD",
      }],
    });
    expect(leaseExpiry90Rule.evaluate(asset)).not.toBeNull();
  });

  it("LEASE_EXPIRY_90D does not fire when lease expires beyond 90 days", () => {
    const asset = makeAsset({
      leases: [{
        status: "ACTIVE",
        leaseEnd: daysFromNow(120),
        tenantName: "Test Tenant",
        area: 1000,
        baseRent: 100000,
        currency: "USD",
      }],
    });
    expect(leaseExpiry90Rule.evaluate(asset)).toBeNull();
  });

  it("LEASE_EXPIRY_30D fires when an active lease expires within 30 days", () => {
    const asset = makeAsset({
      leases: [{
        status: "ACTIVE",
        leaseEnd: daysFromNow(15),
        tenantName: "Test Tenant",
        area: 1000,
        baseRent: 100000,
        currency: "USD",
      }],
    });
    expect(leaseExpiry30Rule.evaluate(asset)).not.toBeNull();
  });

  it("REFINANCING_90D fires when a loan matures within 90 days", () => {
    const asset = makeAsset({
      loans: [{
        status: "CURRENT",
        maturityDate: daysFromNow(60),
        lenderName: "Test Bank",
        currency: "USD",
        currentBalance: 5000000,
        loanType: "SENIOR",
        covenants: [],
      }],
    });
    expect(refinancing90Rule.evaluate(asset)).not.toBeNull();
  });

  it("REFINANCING_90D does not fire for a REPAID loan", () => {
    const asset = makeAsset({
      loans: [{
        status: "REPAID",
        maturityDate: daysFromNow(30),
        lenderName: "Test Bank",
        currency: "USD",
        currentBalance: 0,
        loanType: "SENIOR",
        covenants: [],
      }],
    });
    expect(refinancing90Rule.evaluate(asset)).toBeNull();
  });

  it("COVENANT_BREACH fires when a covenant is in BREACH status", () => {
    const asset = makeAsset({
      loans: [{
        status: "CURRENT",
        maturityDate: daysFromNow(365),
        lenderName: "Test Bank",
        currency: "USD",
        currentBalance: 5000000,
        loanType: "SENIOR",
        covenants: [{
          covenantType: "LTV",
          status: "BREACH",
          threshold: "<=60%",
          currentValue: "72%",
          testFreq: "SEMI_ANNUAL",
        }],
      }],
    });
    expect(covenantBreachRule.evaluate(asset)).not.toBeNull();
  });

  it("COVENANT_BREACH does not fire when all covenants are COMPLIANT", () => {
    const asset = makeAsset({
      loans: [{
        status: "CURRENT",
        maturityDate: daysFromNow(365),
        lenderName: "Test Bank",
        currency: "USD",
        currentBalance: 5000000,
        loanType: "SENIOR",
        covenants: [{
          covenantType: "LTV",
          status: "COMPLIANT",
          threshold: "<=60%",
          currentValue: "45%",
          testFreq: "SEMI_ANNUAL",
        }],
      }],
    });
    expect(covenantBreachRule.evaluate(asset)).toBeNull();
  });

  it("VALUATION_STALE_180D fires when the last valuation is over 180 days old", () => {
    const asset = makeAsset({
      valuations: [{ valuationDate: daysFromNow(-200) }],
    });
    expect(valuationStaleRule.evaluate(asset)).not.toBeNull();
  });

  it("VALUATION_STALE_180D does not fire when valuation is recent", () => {
    const asset = makeAsset({
      valuations: [{ valuationDate: daysFromNow(-90) }],
    });
    expect(valuationStaleRule.evaluate(asset)).toBeNull();
  });
});
