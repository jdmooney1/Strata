// GET /api/risk/events/[id] — fetch a single risk event with full relations
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await db.riskEvent.findUnique({
      where: { id },
      include: {
        asset: {
          select: { id: true, name: true, country: true, city: true, assetType: true, currency: true },
        },
        rule: true,
        escalations: {
          orderBy: { escalatedAt: "desc" },
        },
      },
    });

    if (!event) {
      return Response.json({ error: "Risk event not found" }, { status: 404 });
    }

    return Response.json({ event });
  } catch (err) {
    console.error("[risk/events/[id] GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch risk event" },
      { status: 500 }
    );
  }
}
