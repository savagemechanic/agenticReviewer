import { Hono } from "hono";
import { z } from "zod";
import { eq } from "@repo/db";
import { db } from "../db.js";
import { storage } from "../storage.js";
import { products, screenshots, pageExtractions } from "@repo/db/schema";
import { takeScreenshot, extractPageData, measureTiming } from "@repo/browser";
import type { ScreenshotType } from "@repo/shared";

const schema = z.object({ productId: z.string().uuid() });

const PAGES_TO_CAPTURE: { type: ScreenshotType; suffix: string }[] = [
  { type: "hero", suffix: "" },
  { type: "pricing", suffix: "/pricing" },
  { type: "features", suffix: "/features" },
];

export const process = new Hono();

process.post("/", async (c) => {
  const body = schema.parse(await c.req.json());

  const product = await db.query.products.findFirst({
    where: eq(products.id, body.productId),
  });
  if (!product) return c.json({ success: false, error: "Product not found" }, 404);

  await db
    .update(products)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(products.id, product.id));

  try {
    const baseUrl = product.url.replace(/\/+$/, "");

    // Take screenshots of multiple pages
    for (const page of PAGES_TO_CAPTURE) {
      const pageUrl = `${baseUrl}${page.suffix}`;
      try {
        const shot = await takeScreenshot(pageUrl);
        const key = `screenshots/${product.id}/${page.type}.png`;
        const url = await storage.upload(key, shot.buffer, "image/png");

        await db.insert(screenshots).values({
          productId: product.id,
          url,
          pageUrl,
          type: page.type,
          width: shot.width,
          height: shot.height,
        });
      } catch (err) {
        // Skip pages that 404 or fail to load
        console.warn(`Failed to capture ${page.type} for ${pageUrl}: ${err}`);
      }
    }

    // Extract page data from homepage
    const extraction = await extractPageData(baseUrl);

    await db.insert(pageExtractions).values({
      productId: product.id,
      pageUrl: baseUrl,
      title: extraction.title,
      headings: extraction.headings,
      bodyText: extraction.bodyText,
      loadTimeMs: extraction.loadTimeMs,
    });

    // Measure performance timing
    const timing = await measureTiming(baseUrl);

    await db.insert(pageExtractions).values({
      productId: product.id,
      pageUrl: baseUrl,
      title: `__timing__`,
      headings: [],
      bodyText: JSON.stringify(timing),
      loadTimeMs: timing.load,
    });

    await db
      .update(products)
      .set({ status: "processed", updatedAt: new Date() })
      .where(eq(products.id, product.id));

    return c.json({ success: true, data: { productId: product.id, timing } });
  } catch (error) {
    await db
      .update(products)
      .set({ status: "discovered", updatedAt: new Date() })
      .where(eq(products.id, product.id));
    return c.json({ success: false, error: String(error) }, 500);
  }
});
