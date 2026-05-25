import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

/** PATCH /api/alerts/[id]/resolve — mark an alert as resolved */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const alert = await db.alert.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    await createAuditLog({
      action: "ALERT_RESOLVE",
      entity: "Alert",
      entityId: id,
      after: { resolved: true, resolvedAt: alert.resolvedAt?.toISOString() },
    });

    return Response.json({ alert });
  } catch (err) {
    console.error("[alerts/resolve]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to resolve alert" },
      { status: 500 }
    );
  }
}
