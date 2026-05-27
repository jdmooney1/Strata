// POST /api/workflows/[id]/start — start a workflow
import { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { startedById } = body as { startedById?: string };

    let startWorkflow: (workflowId: string) => Promise<unknown>;
    try {
      const engine = await import("@/lib/workflow-engine");
      startWorkflow = engine.startWorkflow;
    } catch {
      return Response.json(
        { error: "Workflow engine not available" },
        { status: 501 }
      );
    }

    const workflow = await startWorkflow(id);

    await createAuditLog({
      userId: startedById,
      action: "WORKFLOW_START",
      entity: "Workflow",
      entityId: id,
      after: { status: "ACTIVE", startedAt: new Date() },
    });

    return Response.json({ workflow });
  } catch (err) {
    console.error("[workflows/[id]/start POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to start workflow" },
      { status: 500 }
    );
  }
}
