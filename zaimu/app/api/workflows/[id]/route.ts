// GET /api/workflows/[id] — full workflow detail
// PATCH /api/workflows/[id] — update workflow metadata
// DELETE /api/workflows/[id] — soft-cancel workflow
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true, country: true, currency: true } },
        template: { select: { id: true, code: true, name: true, estimatedDays: true } },
        steps: {
          include: {
            owner: { select: { id: true, name: true } },
            approvals: {
              include: {
                decisions: {
                  include: {
                    reviewer: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!workflow) {
      return Response.json({ error: "Workflow not found" }, { status: 404 });
    }

    return Response.json({ workflow });
  } catch (err) {
    console.error("[workflows/[id] GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, targetDate, notes, status, updatedById } = body as {
      title?: string;
      targetDate?: string | null;
      notes?: string | null;
      status?: string;
      updatedById?: string;
    };

    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Prevent updating status to COMPLETED via PATCH (use engine completion instead)
    if (status === "COMPLETED") {
      return Response.json(
        { error: "Use the workflow engine to complete a workflow" },
        { status: 400 }
      );
    }

    // Cannot modify a completed or cancelled workflow
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      return Response.json(
        { error: `Cannot update a ${existing.status.toLowerCase()} workflow` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (targetDate !== undefined)
      updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const workflow = await db.workflow.update({
      where: { id },
      data: updateData,
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
      },
    });

    await createAuditLog({
      userId: updatedById,
      action: "WORKFLOW_UPDATE",
      entity: "Workflow",
      entityId: id,
      before: { title: existing.title, status: existing.status, targetDate: existing.targetDate },
      after: updateData,
    });

    return Response.json({ workflow });
  } catch (err) {
    console.error("[workflows/[id] PATCH]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update workflow" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { cancelReason, cancelledById } = body as {
      cancelReason?: string;
      cancelledById?: string;
    };

    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (existing.status === "CANCELLED") {
      return Response.json({ error: "Workflow is already cancelled" }, { status: 400 });
    }

    if (existing.status === "COMPLETED") {
      return Response.json({ error: "Cannot cancel a completed workflow" }, { status: 400 });
    }

    const workflow = await db.workflow.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: cancelReason ?? null,
      },
    });

    await createAuditLog({
      userId: cancelledById,
      action: "WORKFLOW_CANCEL",
      entity: "Workflow",
      entityId: id,
      before: { status: existing.status },
      after: { status: "CANCELLED", cancelReason },
    });

    return Response.json({ workflow });
  } catch (err) {
    console.error("[workflows/[id] DELETE]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to cancel workflow" },
      { status: 500 }
    );
  }
}
