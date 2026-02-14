import { z } from "zod";
import { USER_AGENT, type Result, ok, err, createLogger } from "@repo/shared";

const logger = createLogger("crawler:reddit");

interface DiscoveredProduct {
  name: string;
  url: string;
  description: string;
  source: "reddit";
}

const redditListingSchema = z.object({
  data: z.object({
    children: z.array(
      z.object({
        data: z.object({
          title: z.string(),
          selftext: z.string(),
          url: z.string(),
          is_self: z.boolean(),
          domain: z.string(),
        }),
      })
    ),
  }),
});

const SUBREDDITS = [
  "https://www.reddit.com/r/SaaS/new.json?limit=25",
  "https://www.reddit.com/r/startups/new.json?limit=25",
];

const SKIP_DOMAINS = new Set([
  "reddit.com",
  "i.redd.it",
  "v.redd.it",
  "imgur.com",
  "youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
]);

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s)>\]]+/g;
  return (text.match(urlRegex) ?? []).filter((url) => {
    try {
      const host = new URL(url).hostname.replace("www.", "");
      return !SKIP_DOMAINS.has(host);
    } catch {
      return false;
    }
  });
}

async function fetchSubreddit(url: string): Promise<DiscoveredProduct[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    logger.warn("Reddit fetch failed", { url, status: res.status });
    return [];
  }

  const json: unknown = await res.json();
  const parsed = redditListingSchema.safeParse(json);

  if (!parsed.success) {
    logger.warn("Invalid Reddit response", { url, error: parsed.error.message });
    return [];
  }

  const results: DiscoveredProduct[] = [];

  for (const post of parsed.data.data.children) {
    const { title, selftext, url: postUrl, is_self, domain } = post.data;

    // External link posts
    if (!is_self && !SKIP_DOMAINS.has(domain.replace("www.", ""))) {
      results.push({
        name: title.slice(0, 200),
        url: postUrl,
        description: selftext.slice(0, 500),
        source: "reddit",
      });
      continue;
    }

    // Self posts — extract URLs from body
    if (is_self && selftext) {
      const urls = extractUrls(selftext);
      if (urls.length > 0) {
        results.push({
          name: title.slice(0, 200),
          url: urls[0],
          description: selftext.slice(0, 500),
          source: "reddit",
        });
      }
    }
  }

  return results;
}

export async function discoverFromReddit(): Promise<Result<DiscoveredProduct[]>> {
  const results = await Promise.all(SUBREDDITS.map(fetchSubreddit));
  return ok(results.flat().slice(0, 20));
}
