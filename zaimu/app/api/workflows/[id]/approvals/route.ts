// POST /api/workflows/[id]/approvals — request approval for a step
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      workflowStepId,
      title,
      description,
      reviewerIds,
      dueDate,
      requestedById,
    } = body as {
      workflowStepId: string;
      title: string;
      description?: string;
      reviewerIds: string[];
      dueDate?: string;
      requestedById?: string;
    };

    if (!workflowStepId || !title || !reviewerIds?.length) {
      return Response.json(
        { error: "workflowStepId, title, and reviewerIds are required" },
        { status: 400 }
      );
    }

    const step = await db.workflowStep.findFirst({
      where: { id: workflowStepId, workflowId: id },
    });

    if (!step) {
      return Response.json({ error: "Step not found" }, { status: 404 });
    }

    const SYSTEM_USER_ID = "user_admin_001";

    // Create approval and update step status atomically
    const [approval] = await db.$transaction([
      db.workflowApproval.create({
        data: {
          workflowStepId,
          workflowId: id,
          title,
          description: description ?? null,
          requestedById: requestedById ?? SYSTEM_USER_ID,
          dueDate: dueDate ? new Date(dueDate) : null,
          reviewerIds,
          currentIndex: 0,
          status: "PENDING",
        },
      }),
      db.workflowStep.update({
        where: { id: workflowStepId },
        data: { status: "PENDING_APPROVAL" },
      }),
    ]);

    await createAuditLog({
      userId: requestedById,
      action: "WORKFLOW_APPROVAL_REQUESTED",
      entity: "WorkflowApproval",
      entityId: approval.id,
      after: {
        workflowStepId,
        workflowId: id,
        title,
        reviewerIds,
        dueDate,
      },
    });

    return Response.json({ approval }, { status: 201 });
  } catch (err) {
    console.error("[workflows/[id]/approvals POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to request approval" },
      { status: 500 }
    );
  }
}
