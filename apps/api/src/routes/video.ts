import { Hono } from "hono";
import { z } from "zod";
import { eq } from "@repo/db";
import { db } from "../db.js";
import { products, videos } from "@repo/db/schema";
import { env } from "../env.js";

const videoRendererResponseSchema = z.object({
  storageKey: z.string(),
  durationSec: z.number(),
});

const schema = z.object({
  productId: z.string().uuid(),
  format: z.enum(["youtube_long", "tiktok_short", "instagram_reel"]).default("youtube_long"),
});

export const videoRender = new Hono();

videoRender.post("/render", async (c) => {
  const body = schema.parse(await c.req.json());

  const product = await db.query.products.findFirst({
    where: eq(products.id, body.productId),
  });
  if (!product) return c.json({ success: false, error: "Product not found" }, 404);

  const [video] = await db
    .insert(videos)
    .values({
      productId: product.id,
      storageKey: "",
      durationSec: 0,
      status: "rendering",
      format: body.format,
    })
    .returning();

  try {
    // Call video renderer service
    const response = await fetch(`${env.VIDEO_RENDERER_URL}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.id, productId: product.id, format: body.format }),
    });

    if (!response.ok) {
      await db.update(videos).set({ status: "rejected", updatedAt: new Date() }).where(eq(videos.id, video.id));
      return c.json({ success: false, error: `Video renderer returned ${response.status}` }, 502);
    }

    const json: unknown = await response.json();
    const parsed = videoRendererResponseSchema.safeParse(json);
    if (!parsed.success) {
      await db.update(videos).set({ status: "rejected", updatedAt: new Date() }).where(eq(videos.id, video.id));
      return c.json({ success: false, error: "Invalid response from video renderer" }, 502);
    }

    const result = parsed.data;

    await db
      .update(videos)
      .set({ storageKey: result.storageKey, durationSec: result.durationSec, status: "rendered", updatedAt: new Date() })
      .where(eq(videos.id, video.id));

    await db.update(products).set({ status: "video_ready", updatedAt: new Date() }).where(eq(products.id, product.id));

    return c.json({ success: true, data: { videoId: video.id, productId: product.id } });
  } catch (error) {
    await db.update(videos).set({ status: "rejected", updatedAt: new Date() }).where(eq(videos.id, video.id));
    return c.json({ success: false, error: String(error) }, 500);
  }
});
