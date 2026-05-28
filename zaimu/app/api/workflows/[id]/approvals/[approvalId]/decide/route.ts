// POST /api/workflows/[id]/approvals/[approvalId]/decide — submit a reviewer's decision
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { ApprovalStatus } from "@/app/generated/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  try {
    const { id, approvalId } = await params;
    const body = await req.json();
    const { reviewerId, decision, note } = body as {
      reviewerId: string;
      decision: ApprovalStatus;
      note?: string;
    };

    if (!reviewerId || !decision) {
      return Response.json(
        { error: "reviewerId and decision are required" },
        { status: 400 }
      );
    }

    const approval = await db.workflowApproval.findFirst({
      where: { id: approvalId, workflowId: id },
    });

    if (!approval) {
      return Response.json({ error: "Approval not found" }, { status: 404 });
    }

    if (approval.status !== "PENDING") {
      return Response.json(
        { error: `Approval is already ${approval.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // 1. Create the ApprovalDecision record
    const approvalDecision = await db.approvalDecision.create({
      data: {
        approvalId,
        reviewerId,
        decision,
        decidedAt: new Date(),
        note: note ?? null,
      },
    });

    let updatedApproval;
    let updatedStep;

    if (decision === "REJECTED") {
      // 2a. Rejected: set approval REJECTED, set step BLOCKED
      [updatedApproval, updatedStep] = await db.$transaction([
        db.workflowApproval.update({
          where: { id: approvalId },
          data: {
            status: "REJECTED",
            completedAt: new Date(),
            rejectionNote: note ?? null,
          },
        }),
        db.workflowStep.update({
          where: { id: approval.workflowStepId },
          data: {
            status: "BLOCKED",
            blockedReason: `Approval rejected${note ? `: ${note}` : ""}`,
          },
        }),
      ]);
    } else if (decision === "APPROVED") {
      const isFinalReviewer = approval.currentIndex + 1 >= approval.reviewerIds.length;

      if (isFinalReviewer) {
        // 2b. Final reviewer approved: complete the approval and the step
        [updatedApproval, updatedStep] = await db.$transaction([
          db.workflowApproval.update({
            where: { id: approvalId },
            data: {
              status: "APPROVED",
              completedAt: new Date(),
            },
          }),
          db.workflowStep.update({
            where: { id: approval.workflowStepId },
            data: {
              status: "COMPLETE",
              completedAt: new Date(),
              completedBy: reviewerId,
            },
          }),
        ]);

        // Call workflow engine completeStep to advance workflow
        try {
          const engine = await import("@/lib/workflow-engine");
          await engine.completeStep(
            approval.workflowStepId,
            reviewerId,
            `Approved by final reviewer: ${note ?? ""}`
          );
        } catch {
          // Engine not available — step already marked COMPLETE above, continue gracefully
          console.warn("[approvals/decide] workflow engine not available for completeStep");
        }
      } else {
        // 2c. Not final reviewer: increment currentIndex
        [updatedApproval] = await db.$transaction([
          db.workflowApproval.update({
            where: { id: approvalId },
            data: {
              currentIndex: approval.currentIndex + 1,
            },
          }),
        ]);
        updatedStep = await db.workflowStep.findUnique({
          where: { id: approval.workflowStepId },
        });
      }
    } else {
      // ABSTAINED or other: just record the decision, no status change
      updatedApproval = await db.workflowApproval.findUnique({ where: { id: approvalId } });
      updatedStep = await db.workflowStep.findUnique({
        where: { id: approval.workflowStepId },
      });
    }

    await createAuditLog({
      userId: reviewerId,
      action: "WORKFLOW_APPROVAL_DECIDED",
      entity: "WorkflowApproval",
      entityId: approvalId,
      after: {
        decisionId: approvalDecision.id,
        reviewerId,
        decision,
        note,
        workflowId: id,
      },
    });

    return Response.json({
      decision: approvalDecision,
      approval: updatedApproval,
      step: updatedStep,
    });
  } catch (err) {
    console.error("[workflows/[id]/approvals/[approvalId]/decide POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to submit decision" },
      { status: 500 }
    );
  }
}
