// POST /api/workflows/[id]/steps/[stepId]/block — mark step as blocked
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id, stepId } = await params;
    const body = await req.json();
    const { reason, blockedById } = body as {
      reason: string;
      blockedById?: string;
    };

    if (!reason) {
      return Response.json({ error: "reason is required" }, { status: 400 });
    }

    const step = await db.workflowStep.findFirst({
      where: { id: stepId, workflowId: id },
    });

    if (!step) {
      return Response.json({ error: "Step not found" }, { status: 404 });
    }

    const workflow = await db.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return Response.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Update step and workflow status atomically
    const [updatedStep, updatedWorkflow] = await db.$transaction([
      db.workflowStep.update({
        where: { id: stepId },
        data: {
          status: "BLOCKED",
          blockedReason: reason,
        },
      }),
      ...(workflow.status !== "BLOCKED"
        ? [
            db.workflow.update({
              where: { id },
              data: { status: "BLOCKED" },
            }),
          ]
        : []),
    ]);

    await createAuditLog({
      userId: blockedById,
      action: "WORKFLOW_STEP_BLOCKED",
      entity: "WorkflowStep",
      entityId: stepId,
      before: { status: step.status },
      after: { status: "BLOCKED", blockedReason: reason },
    });

    return Response.json({ step: updatedStep, workflow: updatedWorkflow ?? workflow });
  } catch (err) {
    console.error("[workflows/[id]/steps/[stepId]/block POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to block step" },
      { status: 500 }
    );
  }
}
