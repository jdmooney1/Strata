// POST /api/risk/events/[id]/analyze — generate AI analysis for a risk event
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

let _client: Anthropic | null = null;
let _clientKey: string | null = null;

function getAnthropicClient(): Anthropic {
  const apiKey    = process.env.ANTHROPIC_API_KEY;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const currentKey = apiKey ?? authToken ?? null;

  if (!currentKey) {
    throw new Error("ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is not configured.");
  }

  if (!_client || _clientKey !== currentKey) {
    _client = apiKey
      ? new Anthropic({ apiKey })
      : new Anthropic({ authToken, apiKey: null });
    _clientKey = currentKey;
  }
  return _client;
}

const SYSTEM_PROMPT = `You are a conservative institutional real estate risk analyst at a Japanese investment firm. You analyse operational risk events and provide concise, actionable guidance to portfolio managers.

Rules:
- NEVER invent facts not present in the provided trigger data.
- NEVER make legal conclusions or legal recommendations.
- Keep language formal and institutional.
- Recommendations must be concrete and operational/practical only.`;

function buildUserPrompt(
  title: string,
  description: string,
  triggerData: unknown,
  asset: { name: string; country: string; city: string } | null
): string {
  const assetContext = asset
    ? `Asset: ${asset.name} (${asset.city}, ${asset.country})`
    : "Asset: Not specified";

  return `Risk Event: ${title}

${assetContext}

Description:
${description}

Trigger Data (raw facts that fired this rule):
${JSON.stringify(triggerData ?? {}, null, 2)}

Please provide a structured analysis in the following JSON format:

{
  "explanation": "2-3 sentence explanation of the risk in plain institutional English (formal)",
  "urgency": "1-2 sentence summary of urgency and business impact",
  "recommendations": [
    "First concrete operational action",
    "Second concrete operational action",
    "Third concrete operational action"
  ]
}`;
}

function buildJapaneseUserPrompt(
  title: string,
  description: string,
  triggerData: unknown,
  asset: { name: string; country: string; city: string } | null
): string {
  const assetContext = asset
    ? `物件：${asset.name}（${asset.country}・${asset.city}）`
    : "物件：未指定";

  return `リスクイベント：${title}

${assetContext}

説明：
${description}

トリガーデータ（ルールを発動させた実データ）：
${JSON.stringify(triggerData ?? {}, null, 2)}

以下のJSON形式で日本語による分析を提供してください（機関投資家向けの書き言葉・敬語を使用）：

{
  "explanation": "リスクの内容を2〜3文で説明（機関投資家向けの正式な表現）",
  "urgency": "緊急性とビジネスへの影響を1〜2文で要約",
  "recommendations": [
    "第1の具体的な対応策",
    "第2の具体的な対応策",
    "第3の具体的な対応策"
  ]
}`;
}

interface AnalysisResult {
  explanation: string;
  urgency: string;
  recommendations: string[];
}

function parseAnalysis(raw: string): AnalysisResult {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  try {
    return JSON.parse(jsonStr) as AnalysisResult;
  } catch {
    // Fallback: return the raw text as explanation
    return { explanation: raw.trim(), urgency: "", recommendations: [] };
  }
}

function formatAnalysis(parsed: AnalysisResult): string {
  const parts: string[] = [];
  if (parsed.explanation) parts.push(parsed.explanation);
  if (parsed.urgency)     parts.push(`\n${parsed.urgency}`);
  if (parsed.recommendations?.length) {
    parts.push(`\nRecommended Actions:\n${parsed.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`);
  }
  return parts.join("\n");
}

function formatAnalysisJa(parsed: AnalysisResult): string {
  const parts: string[] = [];
  if (parsed.explanation) parts.push(parsed.explanation);
  if (parsed.urgency)     parts.push(`\n${parsed.urgency}`);
  if (parsed.recommendations?.length) {
    parts.push(`\n推奨対応策：\n${parsed.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`);
  }
  return parts.join("\n");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await db.riskEvent.findUnique({
      where: { id },
      include: {
        asset: {
          select: { name: true, country: true, city: true },
        },
      },
    });

    if (!event) {
      return Response.json({ error: "Risk event not found" }, { status: 404 });
    }

    const client = getAnthropicClient();

    // Run English and Japanese analysis in parallel
    const [enResponse, jaResponse] = await Promise.all([
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildUserPrompt(
              event.title,
              event.description,
              event.triggerData,
              event.asset
            ),
          },
        ],
      }),
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildJapaneseUserPrompt(
              event.titleJa ?? event.title,
              event.descriptionJa ?? event.description,
              event.triggerData,
              event.asset
            ),
          },
        ],
      }),
    ]);

    const enContent = enResponse.content[0];
    const jaContent = jaResponse.content[0];

    if (enContent.type !== "text" || jaContent.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const enParsed = parseAnalysis(enContent.text);
    const jaParsed = parseAnalysis(jaContent.text);

    const aiAnalysis   = formatAnalysis(enParsed);
    const aiAnalysisJa = formatAnalysisJa(jaParsed);
    const aiAnalyzedAt = new Date();

    const updated = await db.riskEvent.update({
      where: { id },
      data: { aiAnalysis, aiAnalysisJa, aiAnalyzedAt },
    });

    return Response.json({
      event: updated,
      analysis: { en: enParsed, ja: jaParsed },
    });
  } catch (err) {
    console.error("[risk/events/[id]/analyze POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to analyze risk event" },
      { status: 500 }
    );
  }
}
