import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "@repo/db";
import { db } from "../db.js";
import { videos, products } from "@repo/db/schema";

export const videosRoute = new Hono();

// GET / - list videos with optional status filter
videosRoute.get("/", async (c) => {
  const status = c.req.query("status");

  try {
    const query = db
      .select({
        id: videos.id,
        productId: videos.productId,
        productName: products.name,
        storageKey: videos.storageKey,
        durationSec: videos.durationSec,
        status: videos.status,
        format: videos.format,
        metadata: videos.metadata,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
      })
      .from(videos)
      .innerJoin(products, eq(videos.productId, products.id))
      .orderBy(desc(videos.createdAt));

    const result = status
      ? await query.where(eq(videos.status, status))
      : await query;

    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// POST /:id/approve - approve a video
videosRoute.post("/:id/approve", async (c) => {
  const id = c.req.param("id");

  try {
    const [video] = await db
      .update(videos)
      .set({
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(videos.id, id))
      .returning();

    if (!video) {
      return c.json({ success: false, error: "Video not found" }, 404);
    }

    return c.json({ success: true, data: video });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// POST /:id/reject - reject a video with optional reason
const rejectSchema = z
  .object({
    reason: z.string().optional(),
  })
  .optional();

videosRoute.post("/:id/reject", async (c) => {
  const id = c.req.param("id");

  try {
    const body = rejectSchema.parse(await c.req.json().catch(() => undefined));
    const reason = body?.reason;

    // Get current metadata to merge with reason
    const currentVideo = await db.query.videos.findFirst({
      where: eq(videos.id, id),
    });

    if (!currentVideo) {
      return c.json({ success: false, error: "Video not found" }, 404);
    }

    const currentMetadata = (currentVideo.metadata as Record<string, any>) || {};
    const updatedMetadata = reason
      ? { ...currentMetadata, rejectionReason: reason }
      : currentMetadata;

    const [video] = await db
      .update(videos)
      .set({
        status: "rejected",
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, id))
      .returning();

    return c.json({ success: true, data: video });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
