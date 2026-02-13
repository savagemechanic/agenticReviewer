import { Hono } from "hono";
import { z } from "zod";
import { eq } from "@repo/db";
import { db } from "../db.js";
import { videos, publications, products } from "@repo/db/schema";

const schema = z.object({
  videoId: z.string().uuid(),
  platforms: z.array(z.enum(["youtube", "tiktok", "instagram"])).default(["youtube"]),
});

export const distribute = new Hono();

distribute.post("/", async (c) => {
  const body = schema.parse(await c.req.json());

  const video = await db.query.videos.findFirst({
    where: eq(videos.id, body.videoId),
  });
  if (!video) return c.json({ success: false, error: "Video not found" }, 404);
  if (video.status !== "approved") {
    return c.json({ success: false, error: "Video must be approved before distribution" }, 400);
  }

  const publicationIds: string[] = [];

  for (const platform of body.platforms) {
    const [pub] = await db
      .insert(publications)
      .values({
        videoId: video.id,
        platform,
        status: "pending",
      })
      .returning();
    publicationIds.push(pub.id);

    // TODO: Actual upload logic per platform
    // For now, mark as published stub
    await db
      .update(publications)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(publications.id, pub.id));
  }

  await db.update(videos).set({ status: "published", updatedAt: new Date() }).where(eq(videos.id, video.id));
  await db.update(products).set({ status: "published", updatedAt: new Date() }).where(eq(products.id, video.productId));

  return c.json({ success: true, data: { publicationIds } });
});
