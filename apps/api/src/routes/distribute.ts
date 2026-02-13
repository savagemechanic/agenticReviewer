import { Hono } from "hono";
import { z } from "zod";
import { eq } from "@repo/db";
import { db } from "../db.js";
import { videos, publications, products, summaries, scores } from "@repo/db/schema";
import { storage } from "../storage.js";
import { uploadToYouTube } from "@repo/distribution";
import { generateVideoMetadata } from "../utils/video-metadata.js";

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

  const product = await db.query.products.findFirst({
    where: eq(products.id, video.productId),
  });
  if (!product) return c.json({ success: false, error: "Product not found" }, 404);

  const summary = await db.query.summaries.findFirst({
    where: eq(summaries.productId, product.id),
  });
  const score = await db.query.scores.findFirst({
    where: eq(scores.productId, product.id),
  });

  const results: Array<{ platform: string; status: string; publicationId: string; reason?: string }> = [];

  for (const platform of body.platforms) {
    const [pub] = await db
      .insert(publications)
      .values({ videoId: video.id, platform, status: "pending" })
      .returning();

    if (platform === "youtube") {
      // Check YouTube credentials
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        await db
          .update(publications)
          .set({ status: "failed", error: "YouTube credentials not configured" })
          .where(eq(publications.id, pub.id));
        results.push({ platform, status: "failed", publicationId: pub.id, reason: "YouTube credentials not configured" });
        continue;
      }

      try {
        // Download video from MinIO
        const videoBuffer = await storage.download(video.storageKey);

        // Generate metadata
        const metadata = generateVideoMetadata({
          productName: product.name,
          summary: summary?.content ?? product.description ?? "",
          keyFeatures: (summary?.keyFeatures as string[]) ?? [],
          overall: score?.overall ?? 0,
          uxScore: score?.uxScore ?? 0,
          performanceScore: score?.performanceScore ?? 0,
          featureScore: score?.featureScore ?? 0,
          valueScore: score?.valueScore ?? 0,
        });

        await db.update(publications).set({ status: "uploading" }).where(eq(publications.id, pub.id));

        const result = await uploadToYouTube(
          { clientId, clientSecret, refreshToken },
          {
            buffer: videoBuffer,
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags,
          }
        );

        await db
          .update(publications)
          .set({
            status: "published",
            externalId: result.videoId,
            externalUrl: result.url,
            publishedAt: new Date(),
          })
          .where(eq(publications.id, pub.id));

        results.push({ platform, status: "published", publicationId: pub.id });
      } catch (error) {
        await db
          .update(publications)
          .set({ status: "failed", error: String(error) })
          .where(eq(publications.id, pub.id));
        results.push({ platform, status: "failed", publicationId: pub.id, reason: String(error) });
      }
    } else {
      // TikTok/Instagram not yet configured
      await db
        .update(publications)
        .set({ status: "failed", error: `${platform} distribution not configured` })
        .where(eq(publications.id, pub.id));
      results.push({ platform, status: "skipped", publicationId: pub.id, reason: "not configured" });
    }
  }

  // Update video/product status if any platform succeeded
  const anyPublished = results.some((r) => r.status === "published");
  if (anyPublished) {
    await db.update(videos).set({ status: "published", updatedAt: new Date() }).where(eq(videos.id, video.id));
    await db.update(products).set({ status: "published", updatedAt: new Date() }).where(eq(products.id, video.productId));
  }

  return c.json({ success: true, data: { results } });
});
