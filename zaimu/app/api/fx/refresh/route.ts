import { NextRequest } from "next/server";
import { fetchAndStoreRates, FALLBACK_RATES } from "@/lib/fx";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { orgId?: string };
    const { orgId } = body;
    if (!orgId)
      return Response.json({ error: "orgId required" }, { status: 400 });

    if (!process.env.OPEN_EXCHANGE_RATES_APP_ID) {
      return Response.json({
        warning:
          "OPEN_EXCHANGE_RATES_APP_ID not set — using fallback rates",
        fallbackRates: FALLBACK_RATES,
      });
    }

    await fetchAndStoreRates(orgId);
    return Response.json({ success: true, message: "FX rates refreshed" });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "FX refresh failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    fallbackRates: FALLBACK_RATES,
    note: "These are hardcoded fallback rates. Configure OPEN_EXCHANGE_RATES_APP_ID for live data.",
  });
}
