import { Hono } from "hono";
import { eq, desc } from "@repo/db";
import { db } from "../db.js";
import * as schema from "@repo/db/schema";

const productsRoute = new Hono();

productsRoute.get("/", async (c) => {
  const items = await db.query.products.findMany({
    orderBy: desc(schema.products.discoveredAt),
    limit: 50,
  });
  return c.json({ success: true, data: items });
});

productsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const product = await db.query.products.findFirst({
    where: eq(schema.products.id, id),
  });
  if (!product) return c.json({ success: false, error: "Not found" }, 404);

  const productScreenshots = await db.query.screenshots.findMany({
    where: eq(schema.screenshots.productId, id),
  });
  const summary = await db.query.summaries.findFirst({
    where: eq(schema.summaries.productId, id),
  });
  const productScore = await db.query.scores.findFirst({
    where: eq(schema.scores.productId, id),
  });
  const productVideos = await db.query.videos.findMany({
    where: eq(schema.videos.productId, id),
  });

  return c.json({
    success: true,
    data: { ...product, screenshots: productScreenshots, summary, score: productScore, videos: productVideos },
  });
});

export { productsRoute as products };
