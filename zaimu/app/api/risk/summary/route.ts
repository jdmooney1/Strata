// GET /api/risk/summary — aggregate risk counts for the dashboard
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { RiskSeverity, RiskCategory, RiskStatus } from "@/app/generated/prisma";

export const runtime = "nodejs";

const OPEN_STATUSES: RiskStatus[] = ["OPEN", "ACKNOWLEDGED", "ESCALATED"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orgId = searchParams.get("orgId") ?? undefined;

    const baseWhere = {
      status: { in: OPEN_STATUSES },
      ...(orgId ? { orgId } : {}),
    };

    // Run all aggregations in parallel
    const [bySeverityGroups, byCategoryGroups, escalatedCount, assetsAtRisk, lastHealthScore] =
      await Promise.all([
        db.riskEvent.groupBy({
          by: ["severity"],
          where: baseWhere,
          _count: { _all: true },
        }),
        db.riskEvent.groupBy({
          by: ["category"],
          where: baseWhere,
          _count: { _all: true },
        }),
        // ESCALATED events are counted separately so they map cleanly to the UI
        db.riskEvent.count({
          where: {
            status: "ESCALATED",
            ...(orgId ? { orgId } : {}),
          },
        }),
        // Assets that have at least one open/escalated/acknowledged event
        db.riskEvent.findMany({
          where: { ...baseWhere, assetId: { not: null } },
          select: { assetId: true },
          distinct: ["assetId"],
        }),
        // Most recent health score update (as a proxy for last evaluated timestamp)
        db.assetHealthScore.findFirst({
          where: orgId ? { orgId } : {},
          orderBy: { scoredAt: "desc" },
          select: { scoredAt: true },
        }),
      ]);

    // Build bySeverity map — initialise all known severity values to 0
    const allSeverities: RiskSeverity[] = ["CRITICAL", "WARNING", "INFORMATIONAL", "ESCALATED"];
    const bySeverity: Record<string, number> = Object.fromEntries(
      allSeverities.map((s) => [s, 0])
    );
    for (const row of bySeverityGroups) {
      bySeverity[row.severity] = row._count._all;
    }
    // Escalated events may have any severity but status=ESCALATED —
    // surface the escalated count explicitly in its own bucket.
    bySeverity["ESCALATED"] = escalatedCount;

    // Build byCategory map — initialise all known category values to 0
    const allCategories: RiskCategory[] = ["LEASE", "DEBT", "REPORTING", "COMPLIANCE", "TREASURY"];
    const byCategory: Record<string, number> = Object.fromEntries(
      allCategories.map((c) => [c, 0])
    );
    for (const row of byCategoryGroups) {
      byCategory[row.category] = row._count._all;
    }

    const totalOpen = bySeverityGroups.reduce((sum, r) => sum + r._count._all, 0);

    return Response.json({
      totalOpen,
      bySeverity,
      byCategory,
      assetsAtRisk: assetsAtRisk.length,
      lastEvaluated: lastHealthScore?.scoredAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("[risk/summary GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch risk summary" },
      { status: 500 }
    );
  }
}
