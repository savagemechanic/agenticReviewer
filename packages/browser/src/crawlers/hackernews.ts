interface HNItem {
  id: number;
  title?: string;
  url?: string;
  text?: string;
  type: string;
}

interface DiscoveredProduct {
  name: string;
  url: string;
  description: string;
  source: string;
}

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HN API error: ${response.status}`);
  }
  return response.json();
}

export async function discoverFromHackerNews(): Promise<DiscoveredProduct[]> {
  // Fetch Show HN story IDs
  const storyIds = await fetchJSON<number[]>(`${HN_API_BASE}/showstories.json`);

  // Take first 20 IDs
  const topIds = storyIds.slice(0, 20);

  // Fetch item details for each ID
  const items = await Promise.all(
    topIds.map(id => fetchJSON<HNItem>(`${HN_API_BASE}/item/${id}.json`))
  );

  // Filter to items with external URLs (not ycombinator.com)
  const products: DiscoveredProduct[] = items
    .filter(item => {
      if (!item.url) return false;
      try {
        const url = new URL(item.url);
        return !url.hostname.includes("ycombinator.com");
      } catch {
        return false;
      }
    })
    .map(item => ({
      name: item.title || "Untitled",
      url: item.url!,
      description: item.text || item.title || "",
      source: "hackernews",
    }));

  return products;
}
