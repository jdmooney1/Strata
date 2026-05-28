// POST /api/workflows/[id]/steps/[stepId]/complete — complete a step
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
    const body = await req.json().catch(() => ({}));
    const { completedBy, note } = body as {
      completedBy?: string;
      note?: string;
    };

    const step = await db.workflowStep.findFirst({
      where: { id: stepId, workflowId: id },
    });

    if (!step) {
      return Response.json({ error: "Step not found" }, { status: 404 });
    }

    let completeStep: (
      stepId: string,
      completedByOrOptions?: string | { completedBy?: string; note?: string },
      noteArg?: string
    ) => Promise<unknown>;
    try {
      const engine = await import("@/lib/workflow-engine");
      completeStep = engine.completeStep;
    } catch {
      return Response.json(
        { error: "Workflow engine not available" },
        { status: 501 }
      );
    }

    const result = await completeStep(stepId, { completedBy, note });

    await createAuditLog({
      userId: completedBy,
      action: "WORKFLOW_STEP_COMPLETE",
      entity: "WorkflowStep",
      entityId: stepId,
      before: { status: step.status },
      after: { status: "COMPLETE", completedBy, completionNote: note, completedAt: new Date() },
    });

    // Re-fetch workflow with updated steps
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    return Response.json({ result, workflow });
  } catch (err) {
    console.error("[workflows/[id]/steps/[stepId]/complete POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to complete step" },
      { status: 500 }
    );
  }
}
