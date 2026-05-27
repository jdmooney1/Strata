// POST /api/risk/events/[id]/escalate — escalate a risk event
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { EscalationLevel } from "@/app/generated/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { level, note, userId } = body as {
      level: EscalationLevel;
      note?: string;
      userId?: string;
    };

    if (!level) {
      return Response.json({ error: "Escalation level is required" }, { status: 400 });
    }

    // Update the event status and escalation level, and create the escalation record atomically
    const [event, escalation] = await db.$transaction([
      db.riskEvent.update({
        where: { id },
        data: {
          status: "ESCALATED",
          escalationLevel: level,
        },
      }),
      db.riskEscalation.create({
        data: {
          eventId: id,
          level,
          escalatedBy: userId ?? null,
          note: note ?? null,
        },
      }),
    ]);

    await createAuditLog({
      userId,
      action: "RISK_EVENT_ESCALATE",
      entity: "RiskEvent",
      entityId: id,
      after: {
        status: "ESCALATED",
        escalationLevel: level,
        escalationId: escalation.id,
        ...(note ? { note } : {}),
      },
    });

    return Response.json({ event, escalation });
  } catch (err) {
    console.error("[risk/events/[id]/escalate POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to escalate risk event" },
      { status: 500 }
    );
  }
}
