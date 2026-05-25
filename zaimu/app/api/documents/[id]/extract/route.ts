import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getFileBuffer } from "@/lib/storage";
import { extractTextFromBuffer, extractFromText } from "@/lib/extract";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc)
      return Response.json({ error: "Document not found" }, { status: 404 });
    if (!doc.fileUrl)
      return Response.json({ error: "No file stored" }, { status: 400 });

    // Get storage key from notes metadata
    let storageKey = id; // fallback
    try {
      const meta = JSON.parse(doc.notes || "{}") as { storageKey?: string };
      if (meta.storageKey) storageKey = meta.storageKey;
    } catch {
      // keep fallback key
    }

    // Update status to PROCESSING
    await db.document.update({ where: { id }, data: { status: "PROCESSING" } });

    const buffer = await getFileBuffer(storageKey);
    const text = await extractTextFromBuffer(
      buffer,
      doc.mimeType || "application/pdf"
    );

    const result = await extractFromText(text, doc.docType);

    // Save extracted facts
    if (result.facts.length > 0) {
      await db.extractedFact.createMany({
        data: result.facts.map((f) => ({
          documentId: id,
          assetId: doc.assetId ?? undefined,
          // category is typed as FactCategory in the schema; the extraction
          // prompt constrains values to match, so the cast is safe.
          category: f.category as import("@/app/generated/prisma").FactCategory,
          label: f.label,
          value: f.value,
          valueJa: f.valueJa,
          confidence: f.confidence,
          sourceText: f.sourceText,
          pageRef: f.pageRef,
          flagged: f.flagged ?? false,
          flagReason: f.flagReason,
        })),
      });
    }

    // Update document with extraction results
    const updatedDoc = await db.document.update({
      where: { id },
      data: {
        status: "EXTRACTED",
        processedAt: new Date(),
        aiSummary: result.aiSummary,
        aiSummaryJa: result.aiSummaryJa,
        aiFlags: result.riskFlags as unknown as Parameters<
          typeof db.document.update
        >[0]["data"]["aiFlags"],
        extractedData: {
          factsCount: result.facts.length,
          missingInfo: result.missingInfo,
          riskFlags: result.riskFlags,
        } as unknown as Parameters<
          typeof db.document.update
        >[0]["data"]["extractedData"],
      },
      include: { extractedFacts: true },
    });

    return Response.json({
      document: updatedDoc,
      factsExtracted: result.facts.length,
      missingInfo: result.missingInfo,
      riskFlags: result.riskFlags,
    });
  } catch (err) {
    console.error("[extract]", err);
    await db.document
      .update({ where: { id }, data: { status: "ERROR" } })
      .catch(() => {});
    return Response.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
