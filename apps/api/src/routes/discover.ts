import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db.js";
import { products, discoveryRuns } from "@repo/db/schema";
import { eq, desc } from "@repo/db";
import { DISCOVERY_SOURCES, type DiscoverySource } from "@repo/shared";
import {
  discoverFromProductHunt,
  discoverFromReddit,
  runAllCrawlers,
} from "@repo/browser";

const schema = z
  .object({
    sources: z.array(z.enum(["producthunt", "reddit"])).optional(),
  })
  .optional();

export const discover = new Hono();

// GET / - list recent discovery runs
discover.get("/", async (c) => {
  try {
    const runs = await db
      .select()
      .from(discoveryRuns)
      .orderBy(desc(discoveryRuns.startedAt))
      .limit(20);

    return c.json({ success: true, data: runs });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

function isDiscoverySource(value: string): value is DiscoverySource {
  return (DISCOVERY_SOURCES as readonly string[]).includes(value);
}

discover.post("/", async (c) => {
  const body = schema.parse(await c.req.json().catch(() => undefined));
  const sources = body?.sources;

  // Create discovery run
  const [run] = await db
    .insert(discoveryRuns)
    .values({ source: sources?.join(",") ?? "all", status: "running" })
    .returning();

  try {
    let discovered: { name: string; url: string; description: string; source: string }[];

    if (sources) {
      const results = await Promise.all(
        sources.map((s) => {
          if (s === "producthunt") return discoverFromProductHunt();
          if (s === "reddit") return discoverFromReddit();
          return Promise.resolve({ ok: true as const, value: [] });
        })
      );
      discovered = results.flatMap((r) =>
        r.ok ? r.value.map((p) => ({ ...p, source: p.source as string })) : []
      );
    } else {
      const result = await runAllCrawlers();
      discovered = result.ok ? result.value.map((p) => ({ ...p, source: p.source as string })) : [];
    }

    const productIds: string[] = [];
    let duplicateCount = 0;

    for (const item of discovered) {
      const existing = await db.query.products.findFirst({
        where: eq(products.url, item.url),
      });
      if (existing) {
        duplicateCount++;
        continue;
      }

      const source = isDiscoverySource(item.source) ? item.source : "producthunt";

      const [product] = await db
        .insert(products)
        .values({
          name: item.name,
          url: item.url,
          description: item.description,
          source,
        })
        .returning();
      productIds.push(product.id);
    }

    await db
      .update(discoveryRuns)
      .set({
        status: "completed",
        productsFound: discovered.length,
        productsNew: productIds.length,
        completedAt: new Date(),
      })
      .where(eq(discoveryRuns.id, run.id));

    return c.json({
      success: true,
      data: {
        productIds,
        runId: run.id,
        stats: {
          found: discovered.length,
          new: productIds.length,
          duplicate: duplicateCount,
        },
      },
    });
  } catch (error) {
    await db
      .update(discoveryRuns)
      .set({ status: "failed", error: String(error), completedAt: new Date() })
      .where(eq(discoveryRuns.id, run.id));
    return c.json({ success: false, error: String(error) }, 500);
  }
});
