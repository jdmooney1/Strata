// lib/extract.ts
// Extract text from documents and run Claude AI analysis.

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured.");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

export interface ExtractedFactData {
  category: "DATE" | "PARTY" | "AMOUNT" | "LEASE_TERM" | "LOAN_TERM" | "COVENANT" | "OBLIGATION" | "EXPIRY" | "MISSING_INFO" | "OTHER";
  label: string;
  value: string;
  valueJa?: string;
  confidence?: number;
  sourceText?: string;
  pageRef?: string;
  flagged?: boolean;
  flagReason?: string;
}

// Keep backward-compatible alias
export type ExtractedFactInput = ExtractedFactData;

export interface ExtractionResult {
  facts: ExtractedFactData[];
  aiSummary: string;
  aiSummaryJa: string;
  missingInfo: string[];
  riskFlags: string[];
}

const EXTRACTION_SYSTEM_PROMPT = `You are a conservative institutional real estate analyst assistant working for a Japanese investment firm. Your role is to extract structured facts from real estate documents with precision.

Rules:
- Extract only what is explicitly stated. Never infer or guess values.
- If information is ambiguous or unclear, flag it.
- Identify missing information that should be present for this document type.
- Be conservative: if you are less than 70% confident in a value, mark it as flagged.
- For Japanese translations, use formal institutional language (敬語/書き言葉).
- Always cite the source text that supports each fact.`;

const EXTRACTION_USER_TEMPLATE = (docType: string, text: string) => `Document type: ${docType}

Document text:
---
${text.slice(0, 15000)}
---

Extract all material facts from this document. Return a JSON object with this exact structure:

{
  "facts": [
    {
      "category": "DATE|PARTY|AMOUNT|LEASE_TERM|LOAN_TERM|COVENANT|OBLIGATION|EXPIRY|MISSING_INFO|OTHER",
      "label": "Human-readable label (e.g. 'Lease Commencement Date')",
      "value": "The extracted value as a string",
      "valueJa": "Japanese translation of value (optional)",
      "confidence": 0.0-1.0,
      "sourceText": "The exact text excerpt this was taken from (max 200 chars)",
      "pageRef": "Page or section reference if identifiable",
      "flagged": false,
      "flagReason": "Why flagged, if applicable"
    }
  ],
  "aiSummary": "2-4 sentence institutional English summary of this document's key content",
  "aiSummaryJa": "2-4 sentence Japanese summary in formal institutional language",
  "missingInfo": ["List of information that should be in this document type but is absent"],
  "riskFlags": ["List of material risks or issues identified in this document"]
}

Focus on: dates, parties, monetary amounts, key terms, covenants, obligations, expiry dates, break clauses, renewal options, interest rates, LTV thresholds, DSCR thresholds.`;

export async function extractFromText(
  text: string,
  docType: string
): Promise<ExtractionResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: EXTRACTION_USER_TEMPLATE(docType, text),
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  // Parse JSON from response — handle markdown code blocks
  const jsonMatch = content.text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                    [null, content.text];
  const jsonStr = jsonMatch[1].trim();

  const parsed = JSON.parse(jsonStr) as ExtractionResult;
  return parsed;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Use the new PDFParse class API (pdf-parse v2+)
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
  const result = await parser.getText();
  return result.text;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    return extractTextFromPdf(buffer);
  }
  // For text files, decode directly
  if (mimeType.startsWith("text/")) {
    return buffer.toString("utf-8");
  }
  throw new Error(`Unsupported document type for extraction: ${mimeType}`);
}
