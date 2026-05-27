// POST /api/risk/evaluate — trigger the risk rule engine for an asset or entire org
import { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { assetId, orgId } = body as { assetId?: string; orgId?: string };

    // Dynamically import the risk engine — it may not exist in all environments.
    // If the module is absent, return a clear error rather than crashing.
    let result: unknown;
    try {
      const { evaluateAsset, evaluateAllAssets } = await import(
        "@/lib/risk-engine"
      );

      if (assetId) {
        result = await evaluateAsset(assetId, orgId ?? "");
      } else {
        result = await evaluateAllAssets(orgId ?? "");
      }
    } catch (importErr) {
      // The risk engine module doesn't exist yet — return a graceful error.
      const message =
        importErr instanceof Error ? importErr.message : String(importErr);
      if (message.includes("Cannot find module") || message.includes("MODULE_NOT_FOUND")) {
        return Response.json(
          { error: "Risk engine is not yet available. Implement @/lib/risk-engine to enable evaluation." },
          { status: 501 }
        );
      }
      throw importErr;
    }

    await createAuditLog({
      action: "RISK_EVALUATE",
      entity: assetId ? "Asset" : "Organisation",
      entityId: assetId ?? orgId ?? "all",
      after: { assetId: assetId ?? null, orgId: orgId ?? null, evaluatedAt: new Date().toISOString() },
    });

    return Response.json({ result, evaluatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[risk/evaluate POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to run risk evaluation" },
      { status: 500 }
    );
  }
}
