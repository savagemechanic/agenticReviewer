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

export async function summarizeProduct(input: SummaryInput): Promise<SummaryResult> {
  const model = "claude-sonnet-4-5-20250929";
  const prompt = `You are a B2B software reviewer. Analyze this product and provide a structured review.

Product: ${input.productName}
URL: ${input.productUrl}
Page Title: ${input.pageTitle}
Headings: ${input.headings.join(", ")}
Page Load Time: ${input.loadTimeMs}ms

Page Content (first 10000 chars):
${input.bodyText}

Respond in this exact JSON format (no markdown, just JSON):
{
  "content": "A 2-3 paragraph review of the product",
  "targetAudience": "Who this product is best for",
  "keyFeatures": ["feature1", "feature2", ...],
  "pros": ["pro1", "pro2", ...],
  "cons": ["con1", "con2", ...]
}`;

  const raw = await complete(prompt, { model });
  const parsed = JSON.parse(raw);
  return { ...parsed, model };
}
