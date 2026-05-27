// lib/extract.ts
// Extract text from documents and run Claude AI analysis.

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
let _clientKey: string | null = null; // track which credential the client was built with

function getAnthropicClient(): Anthropic {
  const apiKey    = process.env.ANTHROPIC_API_KEY;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN; // Bearer OAuth token
  const currentKey = apiKey ?? authToken ?? null;

  if (!currentKey) {
    throw new Error("ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is not configured.");
  }

  // Re-create client if credential has changed (e.g. token refresh)
  if (!_client || _clientKey !== currentKey) {
    _client = apiKey
      ? new Anthropic({ apiKey })
      : new Anthropic({ authToken, apiKey: null });
    _clientKey = currentKey;
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
      "confidence": 0.0,
      "sourceText": "Brief quote max 80 chars",
      "pageRef": "Section reference if identifiable",
      "flagged": false,
      "flagReason": ""
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
    max_tokens: 16000,
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

  // Parse JSON from response — robustly handle markdown code fences
  const raw = content.text;
  let jsonStr: string;

  // 1. Greedy match: everything between the first ``` and last ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]+)\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  } else {
    // 2. Extract by finding the first { to the last }
    const start = raw.indexOf("{");
    const end   = raw.lastIndexOf("}");
    jsonStr = start !== -1 && end > start ? raw.slice(start, end + 1) : raw;
  }

  // Attempt strict parse first, then try partial recovery if truncated
  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(jsonStr) as ExtractionResult;
  } catch {
    // JSON may be truncated — try to salvage the facts array
    const factsMatch = jsonStr.match(/"facts"\s*:\s*(\[[\s\S]*)/);
    if (factsMatch) {
      let arr = factsMatch[1];

      // Strategy: truncation may happen inside a string value, so lastIndexOf("}")
      // may land inside a broken string. Instead, find the last *complete* object
      // boundary: the last occurrence of "}," (object end + comma before next item).
      // Then close the array after that last complete object.
      const lastCompleteObj = arr.lastIndexOf("},");
      if (lastCompleteObj !== -1) {
        arr = arr.slice(0, lastCompleteObj + 1) + "]";
      } else {
        // Only one object or no comma separators — fall back to last "}"
        const lastClose = arr.lastIndexOf("}");
        if (lastClose !== -1) arr = arr.slice(0, lastClose + 1) + "]";
      }

      // Iteratively strip last item until the array is valid JSON
      let facts: ExtractedFactData[] | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          facts = JSON.parse(arr) as ExtractedFactData[];
          break;
        } catch {
          // Remove the last element boundary and retry
          const cut = arr.lastIndexOf("},");
          if (cut === -1) break;
          arr = arr.slice(0, cut + 1) + "]";
        }
      }

      if (facts !== null) {
        // Try to salvage summary / metadata fields from the raw JSON too
        const summaryMatch = jsonStr.match(/"aiSummary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const summaryJaMatch = jsonStr.match(/"aiSummaryJa"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const aiSummary = summaryMatch ? summaryMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : "";
        const aiSummaryJa = summaryJaMatch ? summaryJaMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : "";
        parsed = { facts, aiSummary, aiSummaryJa, missingInfo: [], riskFlags: [] };
      } else {
        throw new Error(`Could not parse extraction response: ${jsonStr.slice(0, 200)}`);
      }
    } else {
      throw new Error(`Could not parse extraction response: ${jsonStr.slice(0, 200)}`);
    }
  }
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
