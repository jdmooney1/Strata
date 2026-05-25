import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      ownershipEntities: true,
      loans: { include: { covenants: true } },
      leases: true,
      capexItems: true,
      valuations: { orderBy: { valuationDate: "desc" }, take: 3 },
      documents: {
        include: { extractedFacts: true },
        orderBy: { uploadedAt: "desc" },
      },
      tasks: { where: { status: { notIn: ["COMPLETE", "CANCELLED"] } } },
      alerts: { where: { resolved: false } },
      pmReports: { orderBy: { reportPeriod: "desc" }, take: 6 },
    },
  });
  if (!asset) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ asset });
}

// ── PATCH /api/assets/[id] — update asset fields ─────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const before = await db.asset.findUnique({ where: { id } });
    if (!before) return Response.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as Partial<{
      name: string;
      nameJa: string;
      status: string;
      city: string;
      address: string;
      currentValuation: number;
      lastValuationDate: string;
      occupancyRate: number;
      covenantStatus: string;
      refinancingDate: string;
      operationalScore: number;
      reportingScore: number;
      notes: string;
    }>;

    const asset = await db.asset.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameJa !== undefined && { nameJa: body.nameJa }),
        ...(body.status !== undefined && {
          status: body.status as Parameters<typeof db.asset.update>[0]["data"]["status"],
        }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.currentValuation !== undefined && { currentValuation: body.currentValuation }),
        ...(body.lastValuationDate !== undefined && {
          lastValuationDate: new Date(body.lastValuationDate),
        }),
        ...(body.occupancyRate !== undefined && { occupancyRate: body.occupancyRate }),
        ...(body.covenantStatus !== undefined && {
          covenantStatus: body.covenantStatus as Parameters<typeof db.asset.update>[0]["data"]["covenantStatus"],
        }),
        ...(body.refinancingDate !== undefined && {
          refinancingDate: new Date(body.refinancingDate),
        }),
        ...(body.operationalScore !== undefined && { operationalScore: body.operationalScore }),
        ...(body.reportingScore !== undefined && { reportingScore: body.reportingScore }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    await createAuditLog({
      action: "ASSET_UPDATE",
      entity: "Asset",
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: body as Record<string, unknown>,
    });

    return Response.json({ asset });
  } catch (err) {
    console.error("[assets/PATCH]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
