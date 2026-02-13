import { Hono } from "hono";
import { z } from "zod";
import { eq } from "@repo/db";
import { db } from "../db.js";
import { products, summaries, scores, pageExtractions } from "@repo/db/schema";
import { scoreProduct } from "@repo/llm";

const schema = z.object({
  productId: z.string().uuid(),
  force: z.boolean().optional(),
});

export const score = new Hono();

score.post("/", async (c) => {
  const body = schema.parse(await c.req.json());

  const product = await db.query.products.findFirst({
    where: eq(products.id, body.productId),
  });
  if (!product) return c.json({ success: false, error: "Product not found" }, 404);

  // Duplicate check
  const existing = await db.query.scores.findFirst({
    where: eq(scores.productId, product.id),
  });
  if (existing && !body.force) {
    return c.json({ success: true, data: { productId: product.id, skipped: true } });
  }

  const summary = await db.query.summaries.findFirst({
    where: eq(summaries.productId, product.id),
  });
  if (!summary) return c.json({ success: false, error: "No summary found" }, 400);

  const extraction = await db.query.pageExtractions.findFirst({
    where: eq(pageExtractions.productId, product.id),
  });

  try {
    const result = await scoreProduct({
      productName: product.name,
      summary: summary.content,
      keyFeatures: (summary.keyFeatures as string[]) ?? [],
      pros: (summary.pros as string[]) ?? [],
      cons: (summary.cons as string[]) ?? [],
      loadTimeMs: extraction?.loadTimeMs ?? 0,
    });

    if (existing) {
      await db.delete(scores).where(eq(scores.productId, product.id));
    }

    await db.insert(scores).values({
      productId: product.id,
      overall: result.overall,
      uxScore: result.uxScore,
      performanceScore: result.performanceScore,
      featureScore: result.featureScore,
      valueScore: result.valueScore,
      reasoning: result.reasoning,
      model: result.model,
    });

    await db.update(products).set({ status: "scored", updatedAt: new Date() }).where(eq(products.id, product.id));

    return c.json({ success: true, data: { productId: product.id } });
  } catch (error) {
    await db
      .update(products)
      .set({ status: "summarized", updatedAt: new Date() })
      .where(eq(products.id, product.id));
    return c.json({ success: false, error: "LLM service unavailable" }, 503);
  }
});
