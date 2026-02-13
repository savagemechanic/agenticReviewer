import { getBrowser } from "../index.js";

interface DiscoveredProduct {
  name: string;
  url: string;
  description: string;
  source: "producthunt";
}

interface PHGraphQLProduct {
  name: string;
  url: string;
  tagline: string;
  website: string;
}

async function discoverViaAPI(token: string): Promise<DiscoveredProduct[]> {
  const query = `{
    posts(order: NEWEST, first: 20, topic: "saas") {
      edges {
        node {
          name
          tagline
          website
          url
        }
      }
    }
  }`;

  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`ProductHunt API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    data: { posts: { edges: { node: PHGraphQLProduct }[] } };
  };

  return data.data.posts.edges.map(({ node }) => ({
    name: node.name,
    url: node.website || node.url,
    description: node.tagline,
    source: "producthunt" as const,
  }));
}

async function discoverViaScraping(): Promise<DiscoveredProduct[]> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto("https://www.producthunt.com/topics/saas", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const products = await page.$$eval(
      '[data-test="post-item"]',
      (els) =>
        els.slice(0, 20).map((el) => {
          const nameEl = el.querySelector("h3, [data-test='post-name']");
          const linkEl = el.querySelector("a[href*='/posts/']");
          const descEl = el.querySelector(
            "[data-test='tagline'], .tagline, h3 + div, h3 + p"
          );
          return {
            name: nameEl?.textContent?.trim() ?? "",
            url: linkEl?.getAttribute("href") ?? "",
            description: descEl?.textContent?.trim() ?? "",
          };
        })
    );

    return products
      .filter((p) => p.name && p.url)
      .map((p) => ({
        name: p.name,
        url: p.url.startsWith("http")
          ? p.url
          : `https://www.producthunt.com${p.url}`,
        description: p.description,
        source: "producthunt" as const,
      }));
  } finally {
    await page.close();
  }
}

export async function discoverFromProductHunt(): Promise<DiscoveredProduct[]> {
  const token = process.env.PRODUCTHUNT_API_TOKEN;
  if (token) {
    return discoverViaAPI(token);
  }
  return discoverViaScraping();
}
