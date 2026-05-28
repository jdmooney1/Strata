// POST /api/workflows/[id]/analyze — trigger AI workflow analysis
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let analyzeWorkflowWithAI: (workflowId: string) => Promise<{ suggestions: string; analyzedAt: Date }>;
    try {
      const engine = await import("@/lib/workflow-engine");
      analyzeWorkflowWithAI = engine.analyzeWorkflowWithAI;
    } catch {
      return Response.json(
        { error: "Workflow engine not available" },
        { status: 501 }
      );
    }

    const result = await analyzeWorkflowWithAI(id);

    return Response.json(result);
  } catch (err) {
    console.error("[workflows/[id]/analyze POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to analyze workflow" },
      { status: 500 }
    );
  }
}
