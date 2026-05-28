// GET /api/workflows/templates — list available workflow templates
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { WorkflowType } from "@/app/generated/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const workflowType = searchParams.get("workflowType") as WorkflowType | null;
    const assetType    = searchParams.get("assetType") ?? undefined;

    // Ensure system templates exist
    try {
      const engine = await import("@/lib/workflow-engine");
      if (engine.seedWorkflowTemplates) {
        await engine.seedWorkflowTemplates();
      }
    } catch {
      // Engine not available — proceed with whatever templates exist in DB
      console.warn("[workflows/templates] workflow engine not available for seeding");
    }

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (workflowType) {
      where.workflowType = workflowType;
    }

    if (assetType) {
      where.assetTypes = { has: assetType };
    }

    const templates = await db.workflowTemplate.findMany({
      where,
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return Response.json({ templates });
  } catch (err) {
    console.error("[workflows/templates GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
