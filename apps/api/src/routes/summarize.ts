import { Hono } from "hono";
import { z } from "zod";
import { eq } from "@repo/db";
import { db } from "../db.js";
import { products, pageExtractions, summaries } from "@repo/db/schema";
import { summarizeProduct } from "@repo/llm";

const schema = z.object({ productId: z.string().uuid() });

export const summarize = new Hono();

summarize.post("/", async (c) => {
  const body = schema.parse(await c.req.json());

  const product = await db.query.products.findFirst({
    where: eq(products.id, body.productId),
  });
  if (!product) return c.json({ success: false, error: "Product not found" }, 404);

  const extraction = await db.query.pageExtractions.findFirst({
    where: eq(pageExtractions.productId, product.id),
  });
  if (!extraction) return c.json({ success: false, error: "No extraction found" }, 400);

  const result = await summarizeProduct({
    productName: product.name,
    productUrl: product.url,
    pageTitle: extraction.title ?? "",
    headings: (extraction.headings as string[]) ?? [],
    bodyText: extraction.bodyText ?? "",
    loadTimeMs: extraction.loadTimeMs ?? 0,
  });

  await db.insert(summaries).values({
    productId: product.id,
    content: result.content,
    targetAudience: result.targetAudience,
    keyFeatures: result.keyFeatures,
    pros: result.pros,
    cons: result.cons,
    model: result.model,
  });

  await db.update(products).set({ status: "summarized", updatedAt: new Date() }).where(eq(products.id, product.id));

  return c.json({ success: true, data: { productId: product.id } });
});
