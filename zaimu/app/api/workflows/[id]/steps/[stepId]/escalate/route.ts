// POST /api/workflows/[id]/steps/[stepId]/escalate — escalate a step
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { EscalationPath } from "@/app/generated/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id, stepId } = await params;
    const body = await req.json();
    const { escalationPath, note, escalatedTo, escalatedById } = body as {
      escalationPath: EscalationPath;
      note?: string;
      escalatedTo?: string;
      escalatedById?: string;
    };

    if (!escalationPath) {
      return Response.json({ error: "escalationPath is required" }, { status: 400 });
    }

    const step = await db.workflowStep.findFirst({
      where: { id: stepId, workflowId: id },
    });

    if (!step) {
      return Response.json({ error: "Step not found" }, { status: 404 });
    }

    const updatedStep = await db.workflowStep.update({
      where: { id: stepId },
      data: {
        escalatedAt: new Date(),
        escalatedTo: escalatedTo ?? null,
        escalationNote: note ?? null,
        escalationPath,
      },
    });

    await createAuditLog({
      userId: escalatedById,
      action: "WORKFLOW_STEP_ESCALATED",
      entity: "WorkflowStep",
      entityId: stepId,
      before: {
        escalationPath: step.escalationPath,
        escalatedAt: step.escalatedAt,
        escalatedTo: step.escalatedTo,
      },
      after: {
        escalationPath,
        escalatedAt: updatedStep.escalatedAt,
        escalatedTo,
        escalationNote: note,
      },
    });

    return Response.json({ step: updatedStep });
  } catch (err) {
    console.error("[workflows/[id]/steps/[stepId]/escalate POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to escalate step" },
      { status: 500 }
    );
  }
}
