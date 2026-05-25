import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

/** POST /api/memory — create an institutional memory record */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orgId: string;
      assetId?: string | null;
      memoryType: string;
      title: string;
      titleJa?: string;
      content: string;
      contentJa?: string;
      importance?: string;
      period?: string;
      tags?: string[];
    };

    const {
      orgId,
      assetId,
      memoryType,
      title,
      titleJa,
      content,
      contentJa,
      importance = "MEDIUM",
      period,
      tags = [],
    } = body;

    if (!orgId || !memoryType || !title || !content) {
      return Response.json(
        { error: "Required: orgId, memoryType, title, content" },
        { status: 400 }
      );
    }

    const memory = await db.institutionalMemory.create({
      data: {
        orgId,
        assetId: assetId || undefined,
        userId: "user_admin_001", // fallback to seed admin until Clerk is wired
        memoryType: memoryType as Parameters<typeof db.institutionalMemory.create>[0]["data"]["memoryType"],
        title,
        titleJa: titleJa || undefined,
        content,
        contentJa: contentJa || undefined,
        importance: importance as Parameters<typeof db.institutionalMemory.create>[0]["data"]["importance"],
        period: period ? new Date(period) : undefined,
        tags,
      },
    });

    await createAuditLog({
      action: "MEMORY_CREATE",
      entity: "InstitutionalMemory",
      entityId: memory.id,
      after: { memoryType, title, importance, orgId },
    });

    return Response.json({ memory }, { status: 201 });
  } catch (err) {
    console.error("[memory/POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create memory record" },
      { status: 500 }
    );
  }
}
