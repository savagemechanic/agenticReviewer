import { USER_AGENT } from "@repo/shared";

interface DiscoveredProduct {
  name: string;
  url: string;
  description: string;
  source: "reddit";
}

interface RedditPost {
  data: {
    title: string;
    selftext: string;
    url: string;
    is_self: boolean;
    domain: string;
  };
}

interface RedditListing {
  data: {
    children: RedditPost[];
  };
}

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
    console.warn(`Reddit fetch failed for ${url}: ${res.status}`);
    return [];
  }

  const listing = (await res.json()) as RedditListing;
  const results: DiscoveredProduct[] = [];

  for (const post of listing.data.children) {
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

export async function discoverFromReddit(): Promise<DiscoveredProduct[]> {
  const results = await Promise.all(SUBREDDITS.map(fetchSubreddit));
  return results.flat().slice(0, 20);
}
