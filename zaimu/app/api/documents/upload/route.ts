import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs"; // needed for fs operations

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetId = formData.get("assetId") as string | null;
    const orgId = formData.get("orgId") as string | null;
    const docType = (formData.get("docType") as string) || "OTHER";
    const name = formData.get("name") as string | null;

    if (!file)
      return Response.json({ error: "No file provided" }, { status: 400 });
    if (!orgId)
      return Response.json({ error: "orgId is required" }, { status: 400 });

    const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/csv"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        {
          error: `Unsupported file type: ${file.type}. Supported: PDF, text.`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { key, url, size } = await uploadFile(buffer, file.name, file.type);

    const doc = await db.document.create({
      data: {
        orgId,
        assetId: assetId || undefined,
        name: name || file.name,
        docType: docType as Parameters<typeof db.document.create>[0]["data"]["docType"],
        status: "PENDING",
        fileUrl: url,
        fileSize: size,
        mimeType: file.type,
        tags: [],
        parties: [],
        // store storage key in notes for retrieval
        notes: JSON.stringify({ storageKey: key }),
      },
    });

    await createAuditLog({ action: "DOCUMENT_UPLOAD", entity: "Document", entityId: doc.id, after: { name: doc.name, docType: doc.docType, orgId } });

    return Response.json({ document: doc }, { status: 201 });
  } catch (err) {
    console.error("[upload]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
