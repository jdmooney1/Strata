import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// ── GET /api/assets — list all assets for an org ────────────────────────────
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return Response.json({ error: "orgId query param required" }, { status: 400 });
  }

  const assets = await db.asset.findMany({
    where: { orgId },
    include: {
      loans: { select: { id: true, lenderName: true, currentBalance: true, currency: true, maturityDate: true, ltv: true, dscr: true, status: true } },
      leases: { select: { id: true, tenantName: true, area: true, leaseEnd: true, status: true } },
      alerts: { where: { resolved: false }, select: { id: true, severity: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json({ assets });
}

// ── POST /api/assets — create a new asset ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orgId: string;
      name: string;
      nameJa?: string;
      assetType: string;
      country: string;
      city: string;
      address?: string;
      currency?: string;
      portfolioId?: string;
      totalArea?: number;
      areaUnit?: string;
      acquisitionDate?: string;
      acquisitionCost?: number;
    };

    const {
      orgId,
      name,
      nameJa,
      assetType,
      country,
      city,
      address,
      currency = "USD",
      portfolioId,
      totalArea,
      areaUnit = "sqm",
      acquisitionDate,
      acquisitionCost,
    } = body;

    if (!orgId || !name || !assetType || !country || !city) {
      return Response.json(
        { error: "Required: orgId, name, assetType, country, city" },
        { status: 400 }
      );
    }

    const asset = await db.asset.create({
      data: {
        orgId,
        name,
        nameJa,
        assetType: assetType as Parameters<typeof db.asset.create>[0]["data"]["assetType"],
        country,
        city,
        address,
        currency,
        portfolioId: portfolioId || undefined,
        totalArea: totalArea ?? undefined,
        areaUnit,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined,
        acquisitionCost: acquisitionCost ?? undefined,
        status: "ACTIVE",
        covenantStatus: "COMPLIANT",
      },
    });

    await createAuditLog({
      action: "ASSET_CREATE",
      entity: "Asset",
      entityId: asset.id,
      after: { name, assetType, country, city, orgId },
    });

    return Response.json({ asset }, { status: 201 });
  } catch (err) {
    console.error("[assets/POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create asset" },
      { status: 500 }
    );
  }
}
