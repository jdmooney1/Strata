// PATCH /api/workflows/[id]/steps/[stepId] — update step metadata
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { EscalationPath } from "@/app/generated/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id, stepId } = await params;
    const body = await req.json();
    const {
      notes,
      dueDate,
      ownerId,
      assigneeIds,
      escalationPath,
      linkedRiskEventId,
      updatedById,
    } = body as {
      notes?: string | null;
      dueDate?: string | null;
      ownerId?: string | null;
      assigneeIds?: string[];
      escalationPath?: EscalationPath;
      linkedRiskEventId?: string | null;
      updatedById?: string;
    };

    const existing = await db.workflowStep.findFirst({
      where: { id: stepId, workflowId: id },
    });

    if (!existing) {
      return Response.json({ error: "Step not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    if (assigneeIds !== undefined) updateData.assigneeIds = assigneeIds;
    if (escalationPath !== undefined) updateData.escalationPath = escalationPath;
    if (linkedRiskEventId !== undefined) updateData.linkedRiskEventId = linkedRiskEventId;

    const step = await db.workflowStep.update({
      where: { id: stepId },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: updatedById,
      action: "WORKFLOW_STEP_UPDATE",
      entity: "WorkflowStep",
      entityId: stepId,
      before: {
        notes: existing.notes,
        dueDate: existing.dueDate,
        ownerId: existing.ownerId,
        assigneeIds: existing.assigneeIds,
        escalationPath: existing.escalationPath,
        linkedRiskEventId: existing.linkedRiskEventId,
      },
      after: updateData,
    });

    return Response.json({ step });
  } catch (err) {
    console.error("[workflows/[id]/steps/[stepId] PATCH]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update step" },
      { status: 500 }
    );
  }
}
