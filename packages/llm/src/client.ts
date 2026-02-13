import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic(); // uses ANTHROPIC_API_KEY env var
  }
  return client;
}

export async function complete(prompt: string, options?: { maxTokens?: number; model?: string }): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: options?.model ?? "claude-sonnet-4-5-20250929",
    max_tokens: options?.maxTokens ?? 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  if (block.type === "text") return block.text;
  throw new Error("Unexpected response type");
}
