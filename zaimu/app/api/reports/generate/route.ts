import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const REPORT_SYSTEM = `You are a conservative Japanese institutional real estate fund analyst. You generate board-ready monthly reports for senior management and board members at a Japanese investment firm.

Critical rules:
- Write in the language specified (ja for Japanese, en for English).
- Never invent or extrapolate data. Only report what is confirmed in the source data provided.
- If data is missing, explicitly say so with "情報なし / Information not available".
- Use formal institutional language. Avoid casual language, emojis, or marketing language.
- When reporting financial figures, always state the currency and date of the data.
- Flag risks clearly with appropriate urgency. Do not downplay material risks.
- Every assertion must be traceable to the input data provided.
- Structure the report exactly as requested.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      assetId?: string;
      orgId?: string;
      period?: string;
      language?: string;
      reportType?: string;
    };
    const {
      assetId,
      orgId,
      period = new Date().toISOString(),
      language = "ja",
      reportType = "MONTHLY_BOARD",
    } = body;

    if (!assetId || !orgId) {
      return Response.json(
        { error: "assetId and orgId are required" },
        { status: 400 }
      );
    }

    // Load all relevant data
    const [asset, loans, leases, documents, tasks, alerts] = await Promise.all([
      db.asset.findUnique({
        where: { id: assetId },
        include: {
          ownershipEntities: true,
          valuations: { orderBy: { valuationDate: "desc" }, take: 2 },
          capexItems: { where: { status: { notIn: ["COMPLETE", "CANCELLED"] } } },
        },
      }),
      db.loan.findMany({
        where: { assetId },
        include: { covenants: true },
      }),
      db.lease.findMany({ where: { assetId } }),
      db.document.findMany({
        where: { assetId },
        include: { extractedFacts: true },
        orderBy: { uploadedAt: "desc" },
        take: 10,
      }),
      db.task.findMany({
        where: { assetId, status: { notIn: ["COMPLETE", "CANCELLED"] } },
        take: 10,
      }),
      db.alert.findMany({
        where: { assetId, resolved: false },
      }),
    ]);

    if (!asset)
      return Response.json({ error: "Asset not found" }, { status: 404 });

    // Get latest FX rate for asset currency to JPY
    const fxRecord = await db.fxRate.findFirst({
      where: {
        orgId,
        baseCurrency: asset.currency,
        quoteCurrency: "JPY",
      },
      orderBy: { rateDate: "desc" },
    });

    // Build context object
    const ctx = {
      reportPeriod: period,
      reportType,
      language,
      asset: {
        name: asset.name,
        nameJa: asset.nameJa,
        type: asset.assetType,
        status: asset.status,
        country: asset.country,
        city: asset.city,
        address: asset.address,
        area: `${asset.totalArea} ${asset.areaUnit}`,
        acquisitionDate: asset.acquisitionDate,
        acquisitionCost: asset.acquisitionCost
          ? `${asset.acquisitionCost} ${asset.currency}`
          : "Not available",
        currentValuation: asset.currentValuation
          ? `${asset.currentValuation} ${asset.currency}`
          : "Not available",
        lastValuationDate: asset.lastValuationDate,
        occupancyRate: asset.occupancyRate
          ? `${asset.occupancyRate}%`
          : "Not available",
        covenantStatus: asset.covenantStatus,
        refinancingDate: asset.refinancingDate,
      },
      ownershipStructure: asset.ownershipEntities.map((e) => ({
        entity: e.entityName,
        type: e.entityType,
        jurisdiction: e.jurisdiction,
        ownershipPct: `${e.ownershipPct}%`,
      })),
      debt: loans.map((l) => ({
        lender: l.lenderName,
        type: l.loanType,
        currency: l.currency,
        currentBalance: l.currentBalance.toString(),
        interestRate: `${(Number(l.interestRate) * 100).toFixed(2)}%`,
        rateType: l.rateType,
        maturityDate: l.maturityDate,
        ltv: l.ltv ? `${l.ltv}%` : "N/A",
        dscr: l.dscr ? `${l.dscr}x` : "N/A",
        status: l.status,
        covenants: l.covenants.map((c) => ({
          type: c.covenantType,
          threshold: c.threshold,
          currentValue: c.currentValue,
          status: c.status,
          nextTestDate: c.nextTestDate,
        })),
      })),
      leases: leases.map((l) => ({
        tenant: l.tenantName,
        area: `${l.area} ${l.areaUnit}`,
        baseRent: `${l.baseRent} ${l.currency}`,
        leaseEnd: l.leaseEnd,
        breakDate: l.breakDate,
        status: l.status,
      })),
      documents: documents.map((d) => ({
        name: d.name,
        type: d.docType,
        summary: d.aiSummary,
        riskFlags: d.aiFlags,
        keyFacts: d.extractedFacts.map(
          (f) =>
            `${f.label}: ${f.value}${f.flagged ? " [FLAGGED: " + f.flagReason + "]" : ""}`
        ),
      })),
      fxRate: fxRecord
        ? {
            pair: `${asset.currency}/JPY`,
            rate: Number(fxRecord.rate),
            date: fxRecord.rateDate,
            source: fxRecord.source,
          }
        : null,
      openTasks: tasks.map((t) => ({
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
      })),
      activeAlerts: alerts.map((a) => ({
        type: a.alertType,
        severity: a.severity,
        message: a.message,
      })),
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey });

    const userPrompt = `Generate a ${reportType} board report for ${asset.name} for period ${period}.

Data context:
${JSON.stringify(ctx, null, 2)}

Return a JSON object with this structure:
{
  "title": "Report title in ${language}",
  "period": "${period}",
  "sections": [
    {
      "id": "executive_summary",
      "title": "section title",
      "content": "section content — formal institutional prose",
      "flags": ["any issues or risks to highlight"]
    }
  ],
  "requiredDecisions": ["list of decisions requiring board attention"],
  "nextActions": [{"action": "...", "owner": "...", "dueDate": "..."}],
  "dataGaps": ["list of information that was missing and could not be included"],
  "overallStatus": "GREEN|AMBER|RED",
  "overallStatusReason": "One sentence explanation"
}

Required sections: executive_summary, asset_performance, financial_position, debt_and_covenants, fx_exposure, key_risks, required_decisions, next_actions.

Language: ${language === "ja" ? "Write all content in formal Japanese (書き言葉). Section titles also in Japanese." : "Write in formal English."}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: REPORT_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const jsonMatch =
      responseText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
        null,
        responseText,
      ];
    const reportContent = JSON.parse(
      (jsonMatch[1] ?? responseText).trim()
    ) as Record<string, unknown>;

    // Save report to DB
    const report = await db.report.create({
      data: {
        orgId,
        title:
          (reportContent.title as string) || `${reportType} — ${period}`,
        titleJa: reportContent.title as string | undefined,
        reportType: reportType as Parameters<
          typeof db.report.create
        >[0]["data"]["reportType"],
        period: new Date(period),
        status: "REVIEW",
        language,
        content: reportContent as Parameters<
          typeof db.report.create
        >[0]["data"]["content"],
        generatedAt: new Date(),
      },
    });

    // Link asset to report
    await db.reportAsset.create({
      data: { reportId: report.id, assetId },
    });

    return Response.json({ report, content: reportContent }, { status: 201 });
  } catch (err) {
    console.error("[report/generate]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Report generation failed" },
      { status: 500 }
    );
  }
}
