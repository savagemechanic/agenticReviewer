import { type Result, ok } from "@repo/shared";
import { discoverFromProductHunt } from "./producthunt.js";
import { discoverFromReddit } from "./reddit.js";
import { discoverFromHackerNews } from "./hackernews.js";

interface DiscoveredProduct {
  name: string;
  url: string;
  description: string;
  source: string;
}

export async function runAllCrawlers(): Promise<Result<DiscoveredProduct[]>> {
  const [phResult, redditResult, hnResult] = await Promise.all([
    discoverFromProductHunt(),
    discoverFromReddit(),
    discoverFromHackerNews(),
  ]);

  const all: DiscoveredProduct[] = [];
  if (phResult.ok) all.push(...phResult.value);
  if (redditResult.ok) all.push(...redditResult.value);
  if (hnResult.ok) all.push(...hnResult.value);

  // Deduplicate by normalized URL
  const seen = new Set<string>();
  const results: DiscoveredProduct[] = [];

  for (const product of all) {
    const normalized = product.url.replace(/\/+$/, "").toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      results.push(product);
    }
  }

  return ok(results);
}
