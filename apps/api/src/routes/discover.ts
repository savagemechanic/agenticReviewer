import { Hono } from "hono";
import { db } from "../db.js";
import { products, discoveryRuns } from "@repo/db/schema";
import { eq } from "@repo/db";

export const discover = new Hono();

discover.post("/", async (c) => {
  // Create discovery run
  const [run] = await db
    .insert(discoveryRuns)
    .values({ source: "producthunt", status: "running" })
    .returning();

  try {
    // TODO: Replace with real ProductHunt API / scraper
    const discovered = [
      { name: "Example SaaS", url: "https://example.com", source: "producthunt" as const },
    ];

    const productIds: string[] = [];
    for (const item of discovered) {
      // Check if product already exists by URL
      const existing = await db.query.products.findFirst({
        where: eq(products.url, item.url),
      });
      if (!existing) {
        const [product] = await db
          .insert(products)
          .values({ name: item.name, url: item.url, source: item.source })
          .returning();
        productIds.push(product.id);
      }
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

    return c.json({ success: true, data: { productIds, runId: run.id } });
  } catch (error) {
    await db
      .update(discoveryRuns)
      .set({ status: "failed", error: String(error), completedAt: new Date() })
      .where(eq(discoveryRuns.id, run.id));
    return c.json({ success: false, error: String(error) }, 500);
  }
});
