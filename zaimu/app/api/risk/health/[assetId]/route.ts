// GET /api/risk/health/[assetId] — return AssetHealthScore, triggering evaluation if absent
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;

    let healthScore = await db.assetHealthScore.findUnique({
      where: { assetId },
    });

    if (!healthScore) {
      // No score on record — attempt a quick evaluation to generate one.
      // If the risk engine is not yet implemented, we return a 404 with a clear message.
      try {
        const { evaluateAsset } = await import("@/lib/risk-engine");
        // orgId is unknown here — evaluateAsset will resolve from DB
        await evaluateAsset(assetId, "");

        // Re-fetch after evaluation
        healthScore = await db.assetHealthScore.findUnique({
          where: { assetId },
        });
      } catch (importErr) {
        const message =
          importErr instanceof Error ? importErr.message : String(importErr);
        if (
          message.includes("Cannot find module") ||
          message.includes("MODULE_NOT_FOUND")
        ) {
          return Response.json(
            {
              error:
                "No health score found and risk engine is not yet available. Run a risk evaluation first.",
            },
            { status: 404 }
          );
        }
        throw importErr;
      }

      if (!healthScore) {
        return Response.json(
          { error: "Health score could not be generated for this asset." },
          { status: 404 }
        );
      }
    }

    return Response.json({ healthScore });
  } catch (err) {
    console.error("[risk/health/[assetId] GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch health score" },
      { status: 500 }
    );
  }
}
