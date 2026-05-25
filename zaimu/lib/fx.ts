// lib/fx.ts
// Fetch FX rates from Open Exchange Rates API and store in DB.

import { db } from "@/lib/db";

const BASE = "https://openexchangerates.org/api";
const CURRENCIES = ["JPY", "USD", "GBP", "AUD", "EUR", "SGD", "HKD", "CAD"];

interface OerLatestResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

export async function fetchAndStoreRates(orgId: string): Promise<void> {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId) throw new Error("OPEN_EXCHANGE_RATES_APP_ID is not set");

  const res = await fetch(`${BASE}/latest.json?app_id=${appId}&base=USD&symbols=${CURRENCIES.join(",")}`);
  if (!res.ok) throw new Error(`OER API error: ${res.status}`);

  const data: OerLatestResponse = await res.json();
  const rateDate = new Date(data.timestamp * 1000);
  rateDate.setHours(0, 0, 0, 0); // normalise to day

  // Upsert each pair
  const pairs: Array<{ base: string; quote: string; rate: number }> = [];
  for (const [quote, rate] of Object.entries(data.rates)) {
    if (quote === "USD") continue;
    pairs.push({ base: "USD", quote, rate });
    // Also store inverse for common use (e.g. USDJPY → JPYUSD)
    pairs.push({ base: quote, quote: "USD", rate: 1 / rate });
  }

  await Promise.all(
    pairs.map((p) =>
      db.fxRate.upsert({
        where: {
          orgId_baseCurrency_quoteCurrency_rateDate: {
            orgId,
            baseCurrency: p.base,
            quoteCurrency: p.quote,
            rateDate,
          },
        },
        update: { rate: p.rate, source: "OPEN_EXCHANGE_RATES" },
        create: {
          orgId,
          baseCurrency: p.base,
          quoteCurrency: p.quote,
          rate: p.rate,
          source: "OPEN_EXCHANGE_RATES",
          rateDate,
        },
      })
    )
  );
}

export async function getLatestRate(
  orgId: string,
  from: string,
  to: string
): Promise<{ rate: number; rateDate: Date; source: string } | null> {
  const record = await db.fxRate.findFirst({
    where: { orgId, baseCurrency: from, quoteCurrency: to },
    orderBy: { rateDate: "desc" },
  });
  if (!record) return null;
  return { rate: Number(record.rate), rateDate: record.rateDate, source: record.source };
}

// Hardcoded fallback rates (USD base) for when API is not configured
export const FALLBACK_RATES: Record<string, number> = {
  USDJPY: 155.40,
  USDGBP: 0.7930,
  USDAUD: 1.5280,
  USDEUR: 0.9210,
  USDSGD: 1.3410,
};

export function getFallbackRate(from: string, to: string): number | null {
  return FALLBACK_RATES[`${from}${to}`] ?? null;
}
