import { Hono } from "hono";
import { z } from "zod";
import { eq } from "@repo/db";
import { db } from "../db.js";
import { storage } from "../storage.js";
import { products, screenshots, pageExtractions } from "@repo/db/schema";
import { takeScreenshot, extractPageData } from "@repo/browser";

const schema = z.object({ productId: z.string().uuid() });

export const process = new Hono();

process.post("/", async (c) => {
  const body = schema.parse(await c.req.json());

  const product = await db.query.products.findFirst({
    where: eq(products.id, body.productId),
  });
  if (!product) return c.json({ success: false, error: "Product not found" }, 404);

  await db.update(products).set({ status: "processing", updatedAt: new Date() }).where(eq(products.id, product.id));

  try {
    // Take screenshot
    const shot = await takeScreenshot(product.url);
    const key = `screenshots/${product.id}/hero.png`;
    const url = await storage.upload(key, shot.buffer, "image/png");

    await db.insert(screenshots).values({
      productId: product.id,
      url,
      pageUrl: product.url,
      type: "hero",
      width: shot.width,
      height: shot.height,
    });

    // Extract page data
    const extraction = await extractPageData(product.url);

    await db.insert(pageExtractions).values({
      productId: product.id,
      pageUrl: product.url,
      title: extraction.title,
      headings: extraction.headings,
      bodyText: extraction.bodyText,
      loadTimeMs: extraction.loadTimeMs,
    });

    await db.update(products).set({ status: "processed", updatedAt: new Date() }).where(eq(products.id, product.id));

    return c.json({ success: true, data: { productId: product.id } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
