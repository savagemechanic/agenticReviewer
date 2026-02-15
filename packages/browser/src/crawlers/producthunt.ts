import { z } from "zod";
import { type Result, ok, err, createLogger } from "@repo/shared";
import { getBrowser } from "../index.js";

const logger = createLogger("crawler:producthunt");

interface DiscoveredProduct {
  name: string;
  url: string;
  description: string;
  source: "producthunt";
}

const phGraphQLResponseSchema = z.object({
  data: z.object({
    posts: z.object({
      edges: z.array(
        z.object({
          node: z.object({
            name: z.string(),
            tagline: z.string(),
            website: z.string(),
            url: z.string(),
          }),
        })
      ),
    }),
  }),
});

async function discoverViaAPI(token: string): Promise<Result<DiscoveredProduct[]>> {
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
    return err(`ProductHunt API error: ${res.status} ${res.statusText}`);
  }

  const json: unknown = await res.json();
  const parsed = phGraphQLResponseSchema.safeParse(json);

  if (!parsed.success) {
    return err(`Invalid ProductHunt API response: ${parsed.error.message}`);
  }

  return ok(
    parsed.data.data.posts.edges.map(({ node }) => ({
      name: node.name,
      url: node.website || node.url,
      description: node.tagline,
      source: "producthunt" as const,
    }))
  );
}

async function discoverViaScraping(): Promise<Result<DiscoveredProduct[]>> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto("https://www.producthunt.com/topics/saas", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Try primary selector first, then fall back to broader selectors
    const selectors = [
      '[data-test="post-item"]',
      'a[href*="/posts/"]',
      'li[class*="post"]',
    ];

    let products: Array<{ name: string; url: string; description: string }> = [];

    for (const selector of selectors) {
      products = await page.$$eval(
        selector,
        (els) =>
          els.slice(0, 20).map((el) => {
            const nameEl = el.querySelector("h3, [data-test='post-name']") ?? el;
            const linkEl = el.closest("a[href*='/posts/']") ?? el.querySelector("a[href*='/posts/']");
            const descEl = el.querySelector(
              "[data-test='tagline'], .tagline, h3 + div, h3 + p"
            );
            return {
              name: nameEl?.textContent?.trim() ?? "",
              url: (linkEl as HTMLAnchorElement)?.href ?? linkEl?.getAttribute("href") ?? "",
              description: descEl?.textContent?.trim() ?? "",
            };
          })
      ).catch(() => []);

      if (products.filter((p) => p.name && p.url).length > 0) break;
    }

    const filtered = products
      .filter((p) => p.name && p.url)
      .map((p) => ({
        name: p.name,
        url: p.url.startsWith("http")
          ? p.url
          : `https://www.producthunt.com${p.url}`,
        description: p.description,
        source: "producthunt" as const,
      }));

    return ok(filtered);
  } catch (error) {
    // Return empty array with warning instead of erroring — PH blocking is expected
    logger.warn("ProductHunt scraping failed, returning empty results", { error: String(error) });
    return ok([]);
  } finally {
    await page.close();
  }
}

export async function discoverFromProductHunt(): Promise<Result<DiscoveredProduct[]>> {
  const token = process.env.PRODUCTHUNT_API_TOKEN;
  if (token) {
    return discoverViaAPI(token);
  }
  return discoverViaScraping();
}
