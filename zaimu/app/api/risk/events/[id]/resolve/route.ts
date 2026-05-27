// PATCH /api/risk/events/[id]/resolve — mark a risk event as resolved
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
        status: "RESOLVED",
        resolvedAt: now,
        resolvedBy: userId ?? null,
        lastResolvedAt: now,
      },
    });

    await createAuditLog({
      userId,
      action: "RISK_EVENT_RESOLVE",
      entity: "RiskEvent",
      entityId: id,
      after: {
        status: "RESOLVED",
        resolvedAt: now.toISOString(),
        resolvedBy: userId ?? null,
        ...(note ? { note } : {}),
      },
    });

    return Response.json({ event });
  } catch (err) {
    console.error("[risk/events/[id]/resolve PATCH]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to resolve risk event" },
      { status: 500 }
    );
  }
}
