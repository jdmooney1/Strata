// PATCH /api/risk/events/[id]/acknowledge — mark a risk event as acknowledged
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { userId, note } = body as { userId?: string; note?: string };

    const now = new Date();

    const event = await db.riskEvent.update({
      where: { id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: now,
        acknowledgedBy: userId ?? null,
      },
    });

    await createAuditLog({
      userId,
      action: "RISK_EVENT_ACKNOWLEDGE",
      entity: "RiskEvent",
      entityId: id,
      after: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: now.toISOString(),
        acknowledgedBy: userId ?? null,
        ...(note ? { note } : {}),
      },
    });

    return Response.json({ event });
  } catch (err) {
    console.error("[risk/events/[id]/acknowledge PATCH]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to acknowledge risk event" },
      { status: 500 }
    );
  }
}
