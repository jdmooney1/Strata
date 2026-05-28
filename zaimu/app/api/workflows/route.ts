// GET /api/workflows — list workflows
// POST /api/workflows — create workflow
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { WorkflowStatus, WorkflowType } from "@/app/generated/prisma";
import type { WorkflowCreateInput } from "@/lib/workflow-engine";

export const runtime = "nodejs";

const STATUS_ORDER: Record<WorkflowStatus, number> = {
  ACTIVE: 0,
  BLOCKED: 1,
  DRAFT: 2,
  ON_HOLD: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orgId    = searchParams.get("orgId")    ?? (await getOrgId());
    const assetId  = searchParams.get("assetId")  ?? undefined;
    const status   = searchParams.get("status")   as WorkflowStatus | null;
    const type     = searchParams.get("type")     as WorkflowType | null;
    const limit    = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 200);

    const where = {
      ...(orgId   ? { orgId }   : {}),
      ...(assetId ? { assetId } : {}),
      ...(status  ? { status }  : {}),
      ...(type    ? { workflowType: type } : {}),
    };

    const [workflows, total] = await Promise.all([
      db.workflow.findMany({
        where,
        include: {
          steps: {
            select: {
              id: true,
              name: true,
              status: true,
              stepOrder: true,
              dueDate: true,
              ownerId: true,
            },
            orderBy: { stepOrder: "asc" },
          },
        },
        orderBy: [{ targetDate: "asc" }],
        take: limit,
      }),
      db.workflow.count({ where }),
    ]);

    // Sort by status order first, then targetDate asc
    const sorted = [...workflows].sort((a, b) => {
      const aOrder = STATUS_ORDER[a.status] ?? 99;
      const bOrder = STATUS_ORDER[b.status] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aDate = a.targetDate?.getTime() ?? Infinity;
      const bDate = b.targetDate?.getTime() ?? Infinity;
      return aDate - bDate;
    });

    return Response.json({ workflows: sorted, total });
  } catch (err) {
    console.error("[workflows GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      assetId,
      workflowType,
      templateCode,
      title,
      titleJa,
      description,
      targetDate,
      linkedRiskEventIds,
      notes,
      createdById,
    } = body as {
      assetId: string;
      workflowType: WorkflowType;
      templateCode?: string;
      title: string;
      titleJa?: string;
      description?: string;
      targetDate?: string;
      linkedRiskEventIds?: string[];
      notes?: string;
      createdById?: string;
    };

    if (!assetId || !workflowType || !title) {
      return Response.json(
        { error: "assetId, workflowType, and title are required" },
        { status: 400 }
      );
    }

    let createWorkflow: (input: WorkflowCreateInput) => Promise<{ id: string }>;
    try {
      const engine = await import("@/lib/workflow-engine");
      createWorkflow = engine.createWorkflow;
    } catch {
      return Response.json(
        { error: "Workflow engine not available" },
        { status: 501 }
      );
    }

    const orgId = await getOrgId();

    const workflow = await createWorkflow({
      orgId,
      assetId,
      workflowType,
      templateCode,
      title,
      titleJa,
      description,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      linkedRiskEventIds,
      notes,
      createdById,
    });

    await createAuditLog({
      userId: createdById,
      action: "WORKFLOW_CREATE",
      entity: "Workflow",
      entityId: (workflow as { id: string }).id,
      after: { workflowType, title, assetId },
    });

    // Re-fetch with steps included
    const full = await db.workflow.findUnique({
      where: { id: (workflow as { id: string }).id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    return Response.json({ workflow: full }, { status: 201 });
  } catch (err) {
    console.error("[workflows POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create workflow" },
      { status: 500 }
    );
  }
}
