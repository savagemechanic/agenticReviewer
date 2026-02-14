import { z } from "zod";
import { type Result, ok, err } from "@repo/shared";

const hnItemSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  url: z.string().optional(),
  text: z.string().optional(),
  type: z.string(),
});

type HNItem = z.infer<typeof hnItemSchema>;

interface DiscoveredProduct {
  name: string;
  url: string;
  description: string;
  source: "hackernews";
}

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

async function fetchJSON<T>(url: string, schema: z.ZodType<T>): Promise<Result<T>> {
  const response = await fetch(url);
  if (!response.ok) {
    return err(`HN API error: ${response.status}`);
  }
  const json: unknown = await response.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return err(`Invalid HN response: ${parsed.error.message}`);
  }
  return ok(parsed.data);
}

export async function discoverFromHackerNews(): Promise<Result<DiscoveredProduct[]>> {
  const storyIdsResult = await fetchJSON(
    `${HN_API_BASE}/showstories.json`,
    z.array(z.number())
  );

  if (!storyIdsResult.ok) {
    return storyIdsResult;
  }

  const topIds = storyIdsResult.value.slice(0, 20);

  const itemResults = await Promise.all(
    topIds.map((id) => fetchJSON(`${HN_API_BASE}/item/${id}.json`, hnItemSchema))
  );

  const items: HNItem[] = [];
  for (const result of itemResults) {
    if (result.ok) {
      items.push(result.value);
    }
  }

  const products: DiscoveredProduct[] = items
    .filter((item): item is HNItem & { url: string } => {
      if (!item.url) return false;
      try {
        const url = new URL(item.url);
        return !url.hostname.includes("ycombinator.com");
      } catch {
        return false;
      }
    })
    .map((item) => ({
      name: item.title ?? "Untitled",
      url: item.url,
      description: item.text ?? item.title ?? "",
      source: "hackernews" as const,
    }));

  return ok(products);
}
