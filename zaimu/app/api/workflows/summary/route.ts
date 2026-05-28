// GET /api/workflows/summary — dashboard summary
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth";
import { WorkflowType } from "@/app/generated/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orgId = searchParams.get("orgId") ?? (await getOrgId());

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeCount,
      blockedCount,
      overdueStepsCount,
      pendingApprovalsCount,
      completedThisMonthCount,
      byTypeGroups,
    ] = await Promise.all([
      db.workflow.count({
        where: { orgId, status: "ACTIVE" },
      }),
      db.workflow.count({
        where: { orgId, status: "BLOCKED" },
      }),
      db.workflowStep.count({
        where: {
          workflow: { orgId },
          dueDate: { lt: now },
          status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        },
      }),
      db.workflowApproval.count({
        where: {
          workflowId: undefined,
          step: {
            workflow: { orgId },
          },
          status: "PENDING",
        },
      }),
      db.workflow.count({
        where: {
          orgId,
          status: "COMPLETED",
          completedAt: { gte: startOfMonth },
        },
      }),
      db.workflow.groupBy({
        by: ["workflowType"],
        where: { orgId, status: { in: ["ACTIVE", "BLOCKED", "DRAFT"] } },
        _count: { id: true },
      }),
    ]);

    // Build byType map from groupBy results
    const byType: Partial<Record<WorkflowType, number>> = {};
    for (const group of byTypeGroups) {
      byType[group.workflowType] = group._count.id;
    }

    return Response.json({
      activeWorkflows: activeCount,
      blockedWorkflows: blockedCount,
      overdueSteps: overdueStepsCount,
      pendingApprovals: pendingApprovalsCount,
      byType,
      completedThisMonth: completedThisMonthCount,
    });
  } catch (err) {
    console.error("[workflows/summary GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch workflow summary" },
      { status: 500 }
    );
  }
}
