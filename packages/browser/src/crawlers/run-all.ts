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
  const [phResult, redditResult, hnResult] = await Promise.allSettled([
    discoverFromProductHunt(),
    discoverFromReddit(),
    discoverFromHackerNews(),
  ]);

  const unwrap = (r: PromiseSettledResult<Result<DiscoveredProduct[]>>): Result<DiscoveredProduct[]> =>
    r.status === "fulfilled" ? r.value : { ok: false as const, error: String(r.reason) };

  const ph = unwrap(phResult);
  const reddit = unwrap(redditResult);
  const hn = unwrap(hnResult);

  const all: DiscoveredProduct[] = [];
  if (ph.ok) all.push(...ph.value);
  if (reddit.ok) all.push(...reddit.value);
  if (hn.ok) all.push(...hn.value);

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
