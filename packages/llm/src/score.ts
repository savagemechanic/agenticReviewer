import { type Result, ok, err } from "@repo/shared";
import { complete } from "./client.js";

export interface ScoreInput {
  productName: string;
  summary: string;
  keyFeatures: string[];
  pros: string[];
  cons: string[];
  loadTimeMs: number;
}

export interface ScoreResult {
  overall: number;
  uxScore: number;
  performanceScore: number;
  featureScore: number;
  valueScore: number;
  reasoning: string;
  model: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function parseJsonSafe(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
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

export async function scoreProduct(input: ScoreInput): Promise<Result<ScoreResult>> {
  const model = "claude-sonnet-4-5-20250929";
  const prompt = `You are a B2B software scoring engine. Score this product on a scale of 1-10 for each dimension.

Product: ${input.productName}
Summary: ${input.summary}
Key Features: ${input.keyFeatures.join(", ")}
Pros: ${input.pros.join(", ")}
Cons: ${input.cons.join(", ")}
Page Load Time: ${input.loadTimeMs}ms

Performance scoring guide:
- Under 1000ms load = 9-10
- 1000-2000ms = 7-8
- 2000-3000ms = 5-6
- Over 3000ms = 3-4

Respond in this exact JSON format (no markdown, just JSON):
{
  "overall": 7.5,
  "uxScore": 8.0,
  "performanceScore": 7.0,
  "featureScore": 8.0,
  "valueScore": 7.0,
  "reasoning": "Brief explanation of scores"
}`;

  const rawResult = await complete(prompt, { model });
  if (!rawResult.ok) {
    return rawResult;
  }

  const parsed = parseJsonSafe(rawResult.value);

  if (!parsed) {
    return err("Failed to parse LLM score response as JSON");
  }

  const uxScore = clamp(Number(parsed.uxScore) || 5, 1, 10);
  const performanceScore = clamp(Number(parsed.performanceScore) || 5, 1, 10);
  const featureScore = clamp(Number(parsed.featureScore) || 5, 1, 10);
  const valueScore = clamp(Number(parsed.valueScore) || 5, 1, 10);

  // Validate overall is roughly the average; if not, recalculate
  const avg = (uxScore + performanceScore + featureScore + valueScore) / 4;
  let overall = clamp(Number(parsed.overall) || avg, 1, 10);
  if (Math.abs(overall - avg) > 1.5) {
    overall = Math.round(avg * 10) / 10;
  }

  return ok({
    overall,
    uxScore,
    performanceScore,
    featureScore,
    valueScore,
    reasoning: String(parsed.reasoning ?? ""),
    model,
  });
}
