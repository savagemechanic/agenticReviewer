import { Hono } from "hono";
import { sql } from "@repo/db";
import { db } from "../db.js";
import { products, discoveryRuns, videos } from "@repo/db/schema";

export const stats = new Hono();

stats.get("/", async (c) => {
  const [statusCounts, recentRuns, videoCounts] = await Promise.all([
    db
      .select({
        status: products.status,
        count: sql<number>`count(*)::int`,
      })
      .from(products)
      .groupBy(products.status),

    db
      .select()
      .from(discoveryRuns)
      .orderBy(sql`started_at DESC`)
      .limit(5),

    db
      .select({
        status: videos.status,
        count: sql<number>`count(*)::int`,
      })
      .from(videos)
      .groupBy(videos.status),
  ]);

  const productsByStatus = Object.fromEntries(
    statusCounts.map((r) => [r.status, r.count])
  );

  const videosByStatus = Object.fromEntries(
    videoCounts.map((r) => [r.status, r.count])
  );

  const totalProducts = statusCounts.reduce((sum, r) => sum + r.count, 0);

  return c.json({
    success: true,
    data: {
      totalProducts,
      productsByStatus,
      videosByStatus,
      recentDiscoveryRuns: recentRuns,
    },
  });
});
