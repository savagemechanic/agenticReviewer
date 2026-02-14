import { type Result, ok, err } from "@repo/shared";
import { complete } from "./client.js";

export interface SummaryInput {
  productName: string;
  productUrl: string;
  pageTitle: string;
  headings: string[];
  bodyText: string;
  loadTimeMs: number;
}

export interface SummaryResult {
  content: string;
  targetAudience: string;
  keyFeatures: string[];
  pros: string[];
  cons: string[];
  model: string;
}

function parseJsonSafe(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    // Fallback: try extracting JSON from code blocks
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function summarizeProduct(input: SummaryInput): Promise<Result<SummaryResult>> {
  const model = "claude-sonnet-4-5-20250929";
  const truncatedBody = input.bodyText.slice(0, 8000);

  const prompt = `You are a B2B software reviewer. Analyze this product and provide a structured review.

Product: ${input.productName}
URL: ${input.productUrl}
Page Title: ${input.pageTitle}
Headings: ${input.headings.join(", ")}
Page Load Time: ${input.loadTimeMs}ms

Page Content (truncated):
${truncatedBody}

Respond in this exact JSON format (no markdown, just JSON):
{
  "content": "A 2-3 paragraph review of the product",
  "targetAudience": "Who this product is best for",
  "keyFeatures": ["feature1", "feature2"],
  "pros": ["pro1", "pro2"],
  "cons": ["con1", "con2"]
}`;

  const rawResult = await complete(prompt, { model });
  if (!rawResult.ok) {
    return rawResult;
  }

  const parsed = parseJsonSafe(rawResult.value);

  if (!parsed) {
    return err("Failed to parse LLM summary response as JSON");
  }

  return ok({
    content: String(parsed.content ?? ""),
    targetAudience: String(parsed.targetAudience ?? ""),
    keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures.map(String) : [],
    pros: Array.isArray(parsed.pros) ? parsed.pros.map(String) : [],
    cons: Array.isArray(parsed.cons) ? parsed.cons.map(String) : [],
    model,
  });
}
