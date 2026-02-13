export { discoverFromProductHunt } from "./producthunt.js";
export { discoverFromReddit } from "./reddit.js";
export { discoverFromHackerNews } from "./hackernews.js";

interface DiscoveredProduct {
  name: string;
  url: string;
  description: string;
  source: string;
}

export async function runAllCrawlers(): Promise<DiscoveredProduct[]> {
  const [ph, reddit, hn] = await Promise.all([
    import("./producthunt.js").then((m) => m.discoverFromProductHunt()),
    import("./reddit.js").then((m) => m.discoverFromReddit()),
    import("./hackernews.js").then((m) => m.discoverFromHackerNews()),
  ]);

  // Deduplicate by normalized URL
  const seen = new Set<string>();
  const results: DiscoveredProduct[] = [];

  for (const product of [...ph, ...reddit, ...hn]) {
    const normalized = product.url.replace(/\/+$/, "").toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      results.push(product);
    }
  }

  return results;
}
