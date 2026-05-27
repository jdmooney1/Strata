// GET /api/risk/events — list risk events with optional filters
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { RiskStatus, RiskSeverity, RiskCategory } from "@/app/generated/prisma";

export const runtime = "nodejs";

const SEVERITY_ORDER: Record<string, number> = {
  ESCALATED: 0,
  CRITICAL: 1,
  WARNING: 2,
  INFORMATIONAL: 3,
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orgId    = searchParams.get("orgId")    ?? undefined;
    const assetId  = searchParams.get("assetId")  ?? undefined;
    const status   = searchParams.get("status")   as RiskStatus | null;
    const severity = searchParams.get("severity") as RiskSeverity | null;
    const category = searchParams.get("category") as RiskCategory | null;
    const limit    = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    const where = {
      ...(orgId    ? { orgId }    : {}),
      ...(assetId  ? { assetId }  : {}),
      ...(status   ? { status }   : {}),
      ...(severity ? { severity } : {}),
      ...(category ? { category } : {}),
    };

    const [events, total] = await Promise.all([
      db.riskEvent.findMany({
        where,
        include: {
          asset: {
            select: { id: true, name: true, country: true },
          },
        },
        orderBy: { firstDetectedAt: "desc" },
        take: limit,
      }),
      db.riskEvent.count({ where }),
    ]);

    // Apply severity ordering in JS:
    // ESCALATED (status) = 0, CRITICAL severity = 1, WARNING = 2, INFORMATIONAL = 3
    const sorted = [...events].sort((a, b) => {
      const aOrder =
        a.status === "ESCALATED"
          ? 0
          : (SEVERITY_ORDER[a.severity] ?? 4);
      const bOrder =
        b.status === "ESCALATED"
          ? 0
          : (SEVERITY_ORDER[b.severity] ?? 4);
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Within the same tier, most recent first
      return b.firstDetectedAt.getTime() - a.firstDetectedAt.getTime();
    });

    return Response.json({ events: sorted, total });
  } catch (err) {
    console.error("[risk/events GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch risk events" },
      { status: 500 }
    );
  }
}
