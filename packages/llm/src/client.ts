import Anthropic from "@anthropic-ai/sdk";
import { type Result, ok, err } from "@repo/shared";
import { withRetry } from "./retry.js";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic(); // uses ANTHROPIC_API_KEY env var
  }
  return client;
}

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

export async function complete(
  prompt: string,
  options?: { maxTokens?: number; model?: string }
): Promise<Result<string>> {
  const anthropic = getClient();

  try {
    const raw = await withRetry(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await anthropic.messages.create(
            {
              model: options?.model ?? "claude-sonnet-4-5-20250929",
              max_tokens: options?.maxTokens ?? 4096,
              messages: [{ role: "user", content: prompt }],
            },
            { signal: controller.signal }
          );

          const block = response.content[0];
          if (block.type === "text") return block.text;
          throw new Error("Unexpected response type");
        } finally {
          clearTimeout(timeout);
        }
      },
      { maxAttempts: 3, baseDelayMs: 1000 }
    );

    return ok(stripMarkdownFences(raw));
  } catch (error: unknown) {
    return err(`LLM completion failed: ${String(error)}`);
  }
}
