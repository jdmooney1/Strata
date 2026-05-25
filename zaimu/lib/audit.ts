import { db } from "@/lib/db";

const SYSTEM_USER_ID = "user_admin_001"; // seed admin user — used as fallback when no real Clerk user

export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  before,
  after,
}: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: userId || SYSTEM_USER_ID,
        action,
        entity,
        entityId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        before: (before ?? undefined) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        after: (after ?? undefined) as any,
      },
    });
  } catch (err) {
    // Audit log failure must never break the main flow
    console.error("[audit]", err);
  }
}
