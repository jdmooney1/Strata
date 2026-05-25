import { NextRequest } from "next/server";
import { db } from "@/lib/db";

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
