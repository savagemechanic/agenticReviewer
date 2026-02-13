import { Hono } from "hono";
import { eq, desc, and, sql } from "@repo/db";
import { db } from "../db.js";
import * as schema from "@repo/db/schema";

const productsRoute = new Hono();

productsRoute.get("/", async (c) => {
  const status = c.req.query("status");
  const source = c.req.query("source");
  const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
  const offset = Number(c.req.query("offset")) || 0;

  const conditions = [];
  if (status) conditions.push(eq(schema.products.status, status));
  if (source) conditions.push(eq(schema.products.source, source));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.query.products.findMany({
      where,
      orderBy: desc(schema.products.discoveredAt),
      limit,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.products)
      .where(where ?? sql`true`),
  ]);

  return c.json({
    success: true,
    data: items,
    pagination: { total: countResult[0].count, limit, offset },
  });
});

productsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const product = await db.query.products.findFirst({
    where: eq(schema.products.id, id),
  });
  if (!product) return c.json({ success: false, error: "Not found" }, 404);

  const [productScreenshots, summary, productScore, productVideos] = await Promise.all([
    db.query.screenshots.findMany({ where: eq(schema.screenshots.productId, id) }),
    db.query.summaries.findFirst({ where: eq(schema.summaries.productId, id) }),
    db.query.scores.findFirst({ where: eq(schema.scores.productId, id) }),
    db.query.videos.findMany({ where: eq(schema.videos.productId, id) }),
  ]);

  return c.json({
    success: true,
    data: { ...product, screenshots: productScreenshots, summary, score: productScore, videos: productVideos },
  });
});

export { productsRoute as products };
